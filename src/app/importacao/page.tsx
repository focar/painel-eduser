'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/supabaseClient';
import Papa from 'papaparse';
import { FaSpinner, FaUpload, FaTrash, FaClock, FaExclamationTriangle, FaCheckCircle, FaUserCheck } from 'react-icons/fa';

// --- Tipos ---
type Launch = { id: string; nome: string; status: string; };
type Question = { id: string; texto: string; tipo: string; opcoes: { texto: string; peso: number; }[] | null; };
type CsvRow = { [key: string]: string };
type ModalState = { isOpen: boolean; type: 'alert' | 'confirmation'; title: string; message: string; onConfirm?: () => void; };

// --- Função Auxiliar ---
const findValueIgnoreCase = (obj: CsvRow, key: string): string | undefined => {
    const objKey = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
    return objKey ? obj[objKey] : undefined;
};

const BATCH_SIZE = 500;

export default function ImportacaoPage() {
    // --- Estados ---
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [selectedLaunch, setSelectedLaunch] = useState<string>('');
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [log, setLog] = useState<string[]>(['Aguardando uma operação...']);
    const [progress, setProgress] = useState(0);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [modal, setModal] = useState<ModalState>({ isOpen: false, type: 'alert', title: '', message: '' });
    const [buyerFile, setBuyerFile] = useState<File | null>(null);

    // --- Funções do Modal ---
    const showAlertModal = (title: string, message: string) => setModal({ isOpen: true, type: 'alert', title, message });
    const showConfirmationModal = (title: string, message: string, onConfirm: () => void) => setModal({ isOpen: true, type: 'confirmation', title, message, onConfirm });
    const handleCloseModal = () => setModal({ isOpen: false, type: 'alert', title: '', message: '' });
    const handleConfirmModal = () => {
        modal.onConfirm?.();
        handleCloseModal();
    };

    // --- Busca de Dados Iniciais ---
    useEffect(() => {
        const fetchData = async () => {
            setIsDataLoading(true);
            try {
                const [launchResult, questionResult] = await Promise.all([
                    db.rpc('get_launches_for_dropdown'),
                    db.from("perguntas").select('id, texto, tipo, opcoes')
                ]);

                if (launchResult.error) throw launchResult.error;
                if (questionResult.error) throw questionResult.error;

                const loadedLaunches = launchResult.data || [];
                setLaunches(loadedLaunches);
                setQuestions(questionResult.data || []);

                if (loadedLaunches.length > 0) setSelectedLaunch(loadedLaunches[0].id);

            } catch (err: any) {
                showAlertModal("Erro Crítico", "Não foi possível carregar os dados iniciais. " + err.message);
            } finally {
                setIsDataLoading(false);
            }
        };
        fetchData();
    }, []);
    
    const addLog = useCallback((message: string) => {
        setLog(prev => [...prev.slice(-200), `[${new Date().toLocaleTimeString()}] ${message}`]);
    }, []);

    const handleImport = () => {
        if (!file || !selectedLaunch) {
            showAlertModal("Atenção", "Por favor, selecione um lançamento e um ficheiro CSV para leads.");
            return;
        }
        setIsProcessing(true);
        setProgress(0);
        setLog(['Aguardando operação de importação de leads...']);
        
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            delimiter: ";",
            complete: async (results) => {
                const rows = results.data as CsvRow[];
                const headers = (results.meta.fields || []).map(h => h.toLowerCase().trim());
                
                addLog(`Leitura do CSV de leads concluída. ${rows.length} linhas encontradas.`);
                if (rows.length === 0) {
                    showAlertModal("Aviso", "O ficheiro CSV de leads está vazio ou em formato inválido.");
                    setIsProcessing(false);
                    return;
                }

                const questionsMap = new Map(questions.map(q => [q.texto.trim().toLowerCase(), q]));
                const questionHeadersInFile = headers.filter(h => questionsMap.has(h));
                const hasQuestionColumns = questionHeadersInFile.length > 0;
                const hasCampaignColumn = headers.includes('utm_campaign');

                let importType: 'INSCRICAO' | 'CHECKIN' | 'COMPOSTO' | 'INVALIDO' = 'INVALIDO';
                if (hasCampaignColumn && hasQuestionColumns) importType = 'COMPOSTO';
                else if (!hasCampaignColumn && hasQuestionColumns) importType = 'CHECKIN';
                else if (hasCampaignColumn && !hasQuestionColumns) importType = 'INSCRICAO';

                if (importType === 'INVALIDO') {
                    showAlertModal("Erro de Formato", "Não foi possível determinar o tipo do arquivo de leads.");
                    setIsProcessing(false);
                    return;
                }
                addLog(`Tipo de importação detetado: ${importType}`);

                const inscriptionDataMap = new Map<string, any>();
                const surveyDataMap = new Map<string, { p_email: string; p_score: number; p_respostas: { [key: string]: string } }>();
                let invalidRowCount = 0;

                for (const row of rows) {
                    const email = findValueIgnoreCase(row, 'email')?.trim().toLowerCase();
                    if (!email) {
                        invalidRowCount++;
                        continue;
                    }

                    if ((importType === 'INSCRICAO' || importType === 'COMPOSTO') && !inscriptionDataMap.has(email)) {
                        inscriptionDataMap.set(email, { 
                            p_launch_id: selectedLaunch, p_email: email, p_nome: findValueIgnoreCase(row, 'nome') || null, 
                            p_created_at: new Date().toISOString(),
                            p_utm_source: findValueIgnoreCase(row, 'utm_source') || null, p_utm_medium: findValueIgnoreCase(row, 'utm_medium') || null,
                            p_utm_campaign: findValueIgnoreCase(row, 'utm_campaign') || null, p_utm_term: findValueIgnoreCase(row, 'utm_term') || null,
                            p_utm_content: findValueIgnoreCase(row, 'utm_content') || null 
                        });
                    }

                    if ((importType === 'CHECKIN' || importType === 'COMPOSTO') && !surveyDataMap.has(email)) {
                        let finalScore = 0;
                        const respostas: { [key: string]: string } = {};
                        for (const qHeader of questionHeadersInFile) {
                            const question = questionsMap.get(qHeader);
                            const answer = findValueIgnoreCase(row, qHeader)?.trim();
                            if (question && answer) {
                                respostas[question.id] = answer;
                                const option = question.opcoes?.find(opt => opt.texto.trim().toLowerCase() === answer.toLowerCase());
                                if (option?.peso) finalScore += option.peso;
                            }
                        }
                        if (Object.keys(respostas).length > 0) {
                            surveyDataMap.set(email, { p_email: email, p_score: finalScore, p_respostas: respostas });
                        }
                    }
                }
                
                const inscriptionData = Array.from(inscriptionDataMap.values());
                const surveyData = Array.from(surveyDataMap.values());

                if (invalidRowCount > 0) addLog(`AVISO: ${invalidRowCount} linhas foram ignoradas por não conterem um email válido.`);
                
                try {
                    if (importType === 'INSCRICAO' || importType === 'COMPOSTO') {
                        addLog(`Enviando ${inscriptionData.length} registos de inscrição em lotes...`);
                        for (let i = 0; i < inscriptionData.length; i += BATCH_SIZE) {
                            const batch = inscriptionData.slice(i, i + BATCH_SIZE);
                            const { error } = await db.rpc('bulk_insert_leads', { p_leads_data: batch });
                            if (error) throw new Error(`Falha ao inserir lote de leads: ${error.message}`);
                            const currentProgress = Math.round(((i + batch.length) / inscriptionData.length) * 50);
                            setProgress(currentProgress);
                            addLog(`Lote de inscrição ${i / BATCH_SIZE + 1}/${Math.ceil(inscriptionData.length/BATCH_SIZE)} processado.`);
                        }
                        addLog('Todos os lotes de inscrição processados.');
                    }

                    if (importType === 'CHECKIN' || importType === 'COMPOSTO') {
                        addLog(`Enviando ${surveyData.length} atualizações de score em lotes...`);
                        for (let i = 0; i < surveyData.length; i += BATCH_SIZE) {
                            const batch = surveyData.slice(i, i + BATCH_SIZE);
                            const { error } = await db.rpc('bulk_process_survey_results', { p_survey_data: batch, p_launch_id: selectedLaunch });
                            if (error) throw new Error(`Falha ao processar lote de respostas: ${error.message}`);
                            const baseProgress = (importType === 'COMPOSTO') ? 50 : 0;
                            const currentProgress = baseProgress + Math.round(((i + batch.length) / surveyData.length) * (100 - baseProgress - 10));
                            setProgress(currentProgress);
                            addLog(`Lote de respostas ${i / BATCH_SIZE + 1}/${Math.ceil(surveyData.length/BATCH_SIZE)} processado.`);
                        }
                        addLog('Todos os lotes de respostas e scores atualizados.');
                    }

                    setProgress(100);
                    addLog("Importação de leads concluída com sucesso!");
                    
                    const summaryMessage = `Resumo da Importação:\n\n- Linhas encontradas: ${rows.length}\n- Leads para inscrição: ${inscriptionData.length}\n- Respostas processadas: ${surveyData.length}\n- Linhas inválidas: ${invalidRowCount}`;
                    showAlertModal("Importação Concluída", summaryMessage);
                
                } catch (error: any) {
                    addLog(`ERRO na importação de leads: ${error.message}`);
                    showAlertModal("Erro na Importação", `Ocorreu um erro. Verifique o log. Mensagem: ${error.message}`);
                } finally {
                    setIsProcessing(false);
                }
            }
        });
    };
    
    // ✅ FUNÇÃO ATUALIZADA PARA USAR A NOVA RPC DO BANCO DE DADOS
    const handleBuyerImport = () => {
        if (!buyerFile || !selectedLaunch) {
            showAlertModal("Atenção", "Por favor, selecione um lançamento e um ficheiro CSV para compradores.");
            return;
        }
        setIsProcessing(true);
        setProgress(0);
        setLog(['Aguardando operação de importação de compradores...']);

        Papa.parse(buyerFile, {
            header: true,
            skipEmptyLines: true,
            delimiter: ";",
            complete: async (results) => {
                const buyerEmails = results.data
                    .map((row: any) => {
                        const email = findValueIgnoreCase(row, 'email');
                        return email ? email.trim().toLowerCase() : null;
                    })
                    .filter(Boolean) as string[];

                addLog(`Leitura do CSV de compradores concluída. ${buyerEmails.length} e-mails encontrados e formatados.`);

                if (buyerEmails.length === 0) {
                    showAlertModal("Nenhum E-mail Válido", "A coluna 'email' não foi encontrada ou está vazia na planilha.");
                    setIsProcessing(false);
                    return;
                }
                
                let totalUpdatedCount = 0;
                try {
                    addLog(`Enviando ${buyerEmails.length} e-mails para marcar como compradores em lotes de ${BATCH_SIZE}...`);
                    for (let i = 0; i < buyerEmails.length; i += BATCH_SIZE) {
                        const batch = buyerEmails.slice(i, i + BATCH_SIZE);
                        
                        // Chamando a nova função RPC diretamente, em vez da API
                        const { data, error } = await db.rpc('mark_leads_as_buyers', {
                            p_launch_id: selectedLaunch,
                            p_buyer_emails: batch
                        });

                        if (error) throw error;
                        
                        totalUpdatedCount += data || 0;
                        const currentProgress = Math.round(((i + batch.length) / buyerEmails.length) * 100);
                        setProgress(currentProgress);
                        addLog(`Lote ${i / BATCH_SIZE + 1}/${Math.ceil(buyerEmails.length / BATCH_SIZE)} processado. ${data} compradores atualizados neste lote.`);
                    }

                    addLog(`Importação finalizada. Total de ${totalUpdatedCount} leads marcados como compradores.`);
                    showAlertModal("Importação de Compradores Concluída", `${totalUpdatedCount} leads foram atualizados com sucesso!`);

                } catch (error: any) {
                    addLog(`ERRO na importação de compradores: ${error.message}`);
                    showAlertModal("Erro na Importação", `Ocorreu um erro. Verifique o log. Mensagem: ${error.message}`);
                } finally {
                    setIsProcessing(false);
                    setProgress(0);
                }
            }
        });
    };

    const handleClearLeads = async () => {
        if (!selectedLaunch) {
            showAlertModal("Atenção", "Selecione um lançamento para limpar os leads.");
            return;
        }
        const launchName = launches.find(l => l.id === selectedLaunch)?.nome;
        
        showConfirmationModal(
            "Confirmar Limpeza",
            `Tem a certeza de que quer apagar TODOS os leads e respostas do lançamento "${launchName}"? Esta ação é irreversível.`,
            async () => {
                setIsProcessing(true);
                addLog(`Iniciando limpeza de leads para o lançamento: ${launchName}...`);
                const { data, error } = await db.rpc('clear_leads_from_launch', { p_launch_id: selectedLaunch });
                
                if (error) {
                    addLog(`ERRO ao limpar leads: ${error.message}`);
                    showAlertModal("Erro", `Não foi possível limpar os leads. ${error.message}`);
                } else {
                    addLog(`${data} leads foram apagados com sucesso.`);
                    showAlertModal("Sucesso", `${data} leads do lançamento "${launchName}" foram apagados.`);
                }
                setIsProcessing(false);
            }
        );
    };

    const handleRefreshDates = async () => {
        if (!selectedLaunch) {
            showAlertModal("Atenção", "Selecione um lançamento para atualizar as datas.");
            return;
        }
        const launchName = launches.find(l => l.id === selectedLaunch)?.nome;

        showConfirmationModal(
            "Confirmar Atualização",
            `Tem a certeza de que quer atualizar as datas de todos os leads do lançamento "${launchName}" para os últimos 7 dias?`,
            async () => {
                setIsProcessing(true);
                addLog(`Iniciando atualização de datas para o lançamento: ${launchName}...`);
                const { data, error } = await db.rpc('refresh_lead_dates_for_launch', { p_launch_id: selectedLaunch });

                if (error) {
                    addLog(`ERRO ao atualizar datas: ${error.message}`);
                    showAlertModal("Erro", `Não foi possível atualizar as datas. ${error.message}`);
                } else {
                    addLog(`${data} leads tiveram as suas datas atualizadas.`);
                    showAlertModal("Sucesso", `As datas de ${data} leads do lançamento "${launchName}" foram atualizadas.`);
                }
                setIsProcessing(false);
            }
        );
    };

    return (
        <div className="space-y-6 p-4 md:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Módulo de Importação e Ferramentas</h1>
            
            <div className="bg-white p-6 rounded-lg shadow-lg space-y-6">
                <h2 className="text-xl font-bold text-slate-700 border-b pb-2">Importação de Leads</h2>
                <div>
                    <label htmlFor="launch-select" className="block text-sm font-medium text-slate-700 mb-1">1. Selecione o Lançamento de Destino</label>
                    <select id="launch-select" value={selectedLaunch} onChange={e => setSelectedLaunch(e.target.value)} disabled={isDataLoading || isProcessing} className="w-full sm:w-1/2 px-3 py-2 border border-slate-300 rounded-md disabled:bg-slate-100">
                        {isDataLoading ? <option>A carregar lançamentos...</option> : <option value="">Selecione...</option>}
                        {launches.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.status})</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="file-upload" className="block text-sm font-medium text-slate-700 mb-1">2. Selecione o Ficheiro CSV de Leads (delimitado por ';')</label>
                    <input id="file-upload" type="file" accept=".csv" onChange={e => setFile(e.target.files?.[0] || null)} disabled={isProcessing} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                </div>
                <div className="text-right pt-4">
                    <button onClick={handleImport} disabled={isProcessing || !selectedLaunch || !file} className="inline-flex items-center bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                        {isProcessing ? <><FaSpinner className="animate-spin mr-2"/>Processando...</> : <><FaUpload className="mr-2"/>Importar Leads</>}
                    </button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg space-y-6 border-t-4 border-green-500">
                <h2 className="text-xl font-bold text-slate-700">Importação de Compradores</h2>
                <p className="text-sm text-slate-500">Use esta ferramenta para marcar os leads que efetuaram a compra. O ficheiro deve conter uma coluna chamada 'email'. A importação será feita no lançamento selecionado acima.</p>
                <div>
                    <label htmlFor="buyer-file-upload" className="block text-sm font-medium text-slate-700 mb-1">Selecione o Ficheiro CSV de Compradores</label>
                    <input id="buyer-file-upload" type="file" accept=".csv" onChange={e => setBuyerFile(e.target.files?.[0] || null)} disabled={isProcessing} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"/>
                </div>
                <div className="text-right pt-4">
                    <button onClick={handleBuyerImport} disabled={isProcessing || !selectedLaunch || !buyerFile} className="inline-flex items-center bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700 disabled:opacity-50">
                        {isProcessing ? <><FaSpinner className="animate-spin mr-2"/>Processando...</> : <><FaUserCheck className="mr-2"/>Importar Compradores</>}
                    </button>
                </div>
            </div>
            
            {isProcessing && (
                <div className="w-full bg-slate-200 rounded-full h-2.5">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
            )}

            <div className="bg-white p-6 rounded-lg shadow-lg space-y-4 border-t-4 border-amber-400">
                <h2 className="text-lg font-semibold text-slate-700">Ferramentas de Teste</h2>
                <p className="text-sm text-slate-500">Use estas ferramentas para preparar o ambiente para testes. A ação será executada no lançamento selecionado acima.</p>
                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                    <button onClick={handleClearLeads} disabled={isProcessing || !selectedLaunch} className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-50">
                        <FaTrash className="mr-2"/> Limpar Leads do Lançamento
                    </button>
                    <button onClick={handleRefreshDates} disabled={isProcessing || !selectedLaunch} className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50">
                        <FaClock className="mr-2"/> Atualizar Datas para Teste
                    </button>
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-lg font-semibold text-slate-700 mb-4">Log de Operações</h2>
                <pre className="bg-slate-900 text-white text-xs p-4 rounded-md h-96 overflow-y-auto font-mono">{log.join('\n')}</pre>
            </div>

            {modal.isOpen && (
                <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md">
                        <div className="flex items-start">
                            <div className="mr-4 text-3xl">
                                {modal.title.toLowerCase().includes('erro') || modal.title.toLowerCase().includes('atenção') || modal.title.toLowerCase().includes('certeza') ? <FaExclamationTriangle className="text-red-500"/> : <FaCheckCircle className="text-green-500"/>}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-slate-800">{modal.title}</h3>
                                <p className="text-slate-600 mt-2 whitespace-pre-wrap">{modal.message}</p>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end space-x-3">
                            {modal.type === 'confirmation' && (
                                <button onClick={handleCloseModal} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 font-semibold">Cancelar</button>
                            )}
                            <button onClick={modal.type === 'confirmation' ? handleConfirmModal : handleCloseModal} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold">
                                {modal.type === 'confirmation' ? 'Confirmar' : 'OK'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}