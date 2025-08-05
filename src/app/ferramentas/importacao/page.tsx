// ferramenta/importacao/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import Papa from 'papaparse';
import { FaSpinner, FaUpload, FaTrash, FaClock, FaExclamationTriangle, FaCheckCircle, FaUserCheck, FaMagic, FaSave, FaFileCsv } from 'react-icons/fa';
import toast from 'react-hot-toast';

// --- Tipos ---
type Launch = { id: string; nome: string; status: string; };
type Question = { id: string; texto: string; tipo: string | null; classe: string | null; opcoes: { texto: string; peso: number; }[] | null; };
type CsvRow = { [key: string]: string };
type ModalState = { isOpen: boolean; type: 'alert' | 'confirmation'; title: string; message: string; onConfirm?: () => void; };
type AnalysisResult = {
    pergunta_id: number;
    texto_pergunta: string;
    resposta_dada: string;
    indice_impacto: number;
    peso_proposto: number;
};
type LeadInsertData = {
    p_launch_id: string; p_email: string; p_nome: string | null; p_created_at: string; 
    p_utm_source: string | null; p_utm_medium: string | null; p_utm_campaign: string | null; 
    p_utm_term: string | null; p_utm_content: string | null;
};
type SurveyProcessData = { p_email: string; p_score: number; p_respostas: { [key: string]: string }; };

// --- Função Auxiliar ---
const findValueIgnoreCase = (obj: CsvRow, key: string): string | undefined => {
    const objKey = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
    return objKey ? obj[objKey] : undefined;
};

const BATCH_SIZE = 500;

// --- Componente Reutilizável ---
const LaunchSelector = ({ id, label, launches, selectedValue, onChange, disabled, isLoading, className = '' }: {
    id: string; label: string; launches: Launch[]; selectedValue: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    disabled: boolean; isLoading: boolean; className?: string;
}) => (
    <div className='space-y-2'>
        <label htmlFor={id} className="block text-sm font-medium text-slate-700">{label}</label>
        <select
            id={id} value={selectedValue} onChange={onChange} disabled={disabled || isLoading}
            className={`w-full sm:w-1/2 px-3 py-2 border border-slate-300 rounded-md disabled:bg-slate-100 ${className}`}
        >
            {isLoading ? <option>A carregar lançamentos...</option> : <option value="">Selecione um lançamento...</option>}
            {launches.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.status})</option>)}
        </select>
    </div>
);

const supabase = createClient();

export default function ImportacaoPage() {
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [selectedLaunchForLeads, setSelectedLaunchForLeads] = useState<string>('');
    const [selectedLaunchForBuyers, setSelectedLaunchForBuyers] = useState<string>('');
    const [selectedLaunchForProfile, setSelectedLaunchForProfile] = useState<string>('');
    const [selectedLaunchForTesting, setSelectedLaunchForTesting] = useState<string>('');
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [log, setLog] = useState<string[]>(['Aguardando uma operação...']);
    const [progress, setProgress] = useState(0);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [modal, setModal] = useState<ModalState>({ isOpen: false, type: 'alert', title: '', message: '' });
    const [buyerFile, setBuyerFile] = useState<File | null>(null);
    const [profileFile, setProfileFile] = useState<File | null>(null);
    const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
    const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
    const [buyersImportedForLaunch, setBuyersImportedForLaunch] = useState<string | null>(null);

    const showAlertModal = (title: string, message: string) => setModal({ isOpen: true, type: 'alert', title, message });
    const showConfirmationModal = (title: string, message: string, onConfirm: () => void) => setModal({ isOpen: true, type: 'confirmation', title, message, onConfirm });
    const handleCloseModal = () => setModal({ isOpen: false, type: 'alert', title: '', message: '' });

    const handleConfirmModal = () => {
        if (modal.type === 'confirmation' && modal.onConfirm) {
            modal.onConfirm();
        }
        handleCloseModal();
    };

    useEffect(() => {
        const fetchData = async () => {
            setIsDataLoading(true);
            try {
                const [launchResult, questionResult] = await Promise.all([
                    supabase.from("lancamentos").select('id, nome, status'),
                    supabase.from("perguntas").select('id, texto, tipo, classe, opcoes')
                ]);

                if (launchResult.error) throw launchResult.error;
                if (questionResult.error) throw questionResult.error;

                const sorted = (launchResult.data || [])
                    .filter(l => l.status === 'Em Andamento' || l.status === 'Concluído')
                    .sort((a, b) => {
                        if (a.status === 'Em Andamento' && b.status !== 'Em Andamento') return -1;
                        if (a.status !== 'Em Andamento' && b.status === 'Em Andamento') return 1;
                        return b.nome.localeCompare(a.nome);
                    });

                setLaunches(sorted);
                setQuestions((questionResult.data as Question[]) || []);

            } catch (err: unknown) {
                const error = err as Error;
                showAlertModal("Erro Crítico", "Não foi possível carregar os dados iniciais. " + error.message);
            } finally {
                setIsDataLoading(false);
            }
        };
        fetchData();
    }, []);

    const addLog = useCallback((message: string) => {
        setLog(prev => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev.slice(0, 200)]);
    }, []);

    const handleImport = () => {
        if (!file || !selectedLaunchForLeads) {
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
                    showAlertModal("Erro de Formato", "Não foi possível determinar o tipo do arquivo. Verifique se contém 'utm_campaign' e/ou colunas de perguntas.");
                    setIsProcessing(false);
                    return;
                }
                addLog(`Tipo de importação detetado: ${importType}`);

                const inscriptionDataMap = new Map<string, LeadInsertData>();
                const surveyDataMap = new Map<string, SurveyProcessData>();
                let invalidRowCount = 0;

                for (const row of rows) {
                    const email = findValueIgnoreCase(row, 'email')?.trim().toLowerCase();
                    if (!email) {
                        invalidRowCount++;
                        continue;
                    }

                    if ((importType === 'INSCRICAO' || importType === 'COMPOSTO') && !inscriptionDataMap.has(email)) {
                        inscriptionDataMap.set(email, {
                            p_launch_id: selectedLaunchForLeads, p_email: email, p_nome: findValueIgnoreCase(row, 'nome') || null,
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

                const inscriptionData: LeadInsertData[] = Array.from(inscriptionDataMap.values());
                const surveyData: SurveyProcessData[] = Array.from(surveyDataMap.values());

                if (invalidRowCount > 0) addLog(`AVISO: ${invalidRowCount} linhas foram ignoradas por não conterem um email válido.`);

                try {
                    if (importType === 'INSCRICAO' || importType === 'COMPOSTO') {
                        addLog(`Enviando ${inscriptionData.length} registos de inscrição em lotes...`);
                        for (let i = 0; i < inscriptionData.length; i += BATCH_SIZE) {
                            const batch = inscriptionData.slice(i, i + BATCH_SIZE);
                            const { error } = await supabase.rpc('bulk_insert_leads', { p_leads_data: batch });
                            if (error) throw new Error(`Falha ao inserir lote de leads: ${error.message}`);
                            const currentProgress = Math.round(((i + batch.length) / inscriptionData.length) * 50);
                            setProgress(currentProgress);
                            addLog(`Lote de inscrição ${i / BATCH_SIZE + 1}/${Math.ceil(inscriptionData.length / BATCH_SIZE)} processado.`);
                        }
                        addLog('Todos os lotes de inscrição processados.');
                    }

                    if (importType === 'CHECKIN' || importType === 'COMPOSTO') {
                        addLog(`Enviando ${surveyData.length} atualizações de score em lotes...`);
                        for (let i = 0; i < surveyData.length; i += BATCH_SIZE) {
                            const batch = surveyData.slice(i, i + BATCH_SIZE);
                            const { error } = await supabase.rpc('bulk_process_survey_results', { p_survey_data: batch, p_launch_id: selectedLaunchForLeads });
                            if (error) throw new Error(`Falha ao processar lote de respostas: ${error.message}`);
                            const baseProgress = (importType === 'COMPOSTO') ? 50 : 0;
                            const currentProgress = baseProgress + Math.round(((i + batch.length) / surveyData.length) * (100 - baseProgress - 10));
                            setProgress(currentProgress);
                            addLog(`Lote de respostas ${i / BATCH_SIZE + 1}/${Math.ceil(surveyData.length / BATCH_SIZE)} processado.`);
                        }
                        addLog('Todos os lotes de respostas e scores atualizados.');
                    }

                    setProgress(100);
                    addLog("Importação de leads concluída com sucesso!");

                    const summaryMessage = `Resumo da Importação:\n\n- Linhas encontradas: ${rows.length}\n- Leads para inscrição: ${inscriptionData.length}\n- Respostas processadas: ${surveyData.length}\n- Linhas inválidas: ${invalidRowCount}`;
                    showAlertModal("Importação Concluída", summaryMessage);

                } catch (err: unknown) {
                    const error = err as Error;
                    addLog(`ERRO na importação de leads: ${error.message}`);
                    showAlertModal("Erro na Importação", `Ocorreu um erro. Verifique o log. Mensagem: ${error.message}`);
                } finally {
                    setIsProcessing(false);
                }
            }
        });
    };
    
    const handleBuyerImport = async () => {
        if (!buyerFile || !selectedLaunchForBuyers) {
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
                const buyerEmails = (results.data as CsvRow[])
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

                let totalUpdated = 0;
                let totalCreatedForLaunch = 0;
                let totalNewlyCreated = 0;

                try {
                    addLog(`Iniciando processo para ${buyerEmails.length} compradores...`);
                    
                    const { error: resetError } = await supabase.rpc('reset_buyers_for_launch', { p_launch_id: selectedLaunchForBuyers });
                    if (resetError) throw new Error(`Falha ao resetar compradores: ${resetError.message}`);
                    addLog('Status de comprador resetado para todos os leads do lançamento.');

                    for (let i = 0; i < buyerEmails.length; i += BATCH_SIZE) {
                        const batch = buyerEmails.slice(i, i + BATCH_SIZE);

                        const { data, error } = await supabase.rpc('process_buyers_for_launch', {
                            p_launch_id: selectedLaunchForBuyers,
                            p_buyer_emails: batch
                        });

                        if (error) throw error;

                        totalUpdated += data.updated_in_launch || 0;
                        totalCreatedForLaunch += data.created_for_launch || 0;
                        totalNewlyCreated += data.newly_created_leads || 0;

                        const currentProgress = Math.round(((i + batch.length) / buyerEmails.length) * 100);
                        setProgress(currentProgress);
                        addLog(`Lote ${i / BATCH_SIZE + 1}/${Math.ceil(buyerEmails.length / BATCH_SIZE)} processado.`);
                    }

                    let summaryMessage = `Importação Concluída!\n\n`;
                    summaryMessage += `- ${totalUpdated} leads existentes foram marcados como compradores.\n`;
                    summaryMessage += `- ${totalCreatedForLaunch} novos registos de compradores foram criados para este lançamento.\n`;
                    summaryMessage += `- ${totalNewlyCreated} novos leads foram criados a partir do zero.`;

                    addLog(`Importação finalizada. Resumo: ${totalUpdated} atualizados, ${totalCreatedForLaunch} movidos, ${totalNewlyCreated} criados.`);
                    showAlertModal("Resumo da Importação", summaryMessage);
                    setBuyersImportedForLaunch(selectedLaunchForBuyers);

                } catch (err: unknown) {
                    const error = err as Error;
                    addLog(`ERRO na importação de compradores: ${error.message}`);
                    showAlertModal("Erro na Importação", `Ocorreu um erro. Verifique o log. Mensagem: ${error.message}`);
                } finally {
                    setIsProcessing(false);
                    setProgress(0);
                }
            }
        });
    };

    const handleProfileSurveyImport = () => {
        if (!profileFile || !selectedLaunchForProfile) {
            showAlertModal("Atenção", "Por favor, selecione um lançamento e um ficheiro CSV.");
            return;
        }
        setIsProcessing(true);
        setLog(['--- INICIANDO IMPORTAÇÃO APENAS DE PERFIL ---']);

        Papa.parse(profileFile, {
            header: true,
            skipEmptyLines: true,
            delimiter: ";",
            transformHeader: header => header.trim().replace(/["\n\r]/g, ''),
            complete: async (results) => {
                const rows = results.data as any[];
                addLog(`[INFO] Leitura do CSV concluída. ${rows.length} linhas encontradas.`);

                const emailColumnName = Object.keys(rows[0] || {}).find(h => h.toLowerCase().includes('email'));
                if (!emailColumnName) {
                    addLog("[ERRO FATAL] Coluna de 'email' não encontrada.");
                    showAlertModal("Erro de Formato", "Não foi possível encontrar uma coluna de 'email' no ficheiro.");
                    setIsProcessing(false);
                    return;
                }

                const payload = rows.map(row => ({
                    email: row[emailColumnName] ? String(row[emailColumnName]).trim().toLowerCase() : null,
                    respostas_raw: row,
                })).filter(item => item.email && item.email.includes('@'));

                if (payload.length === 0) {
                    addLog("[AVISO] Nenhuma linha com email válido foi encontrada.");
                    showAlertModal("Nenhum Dado Válido", "Nenhuma linha com um email válido foi encontrada.");
                    setIsProcessing(false);
                    return;
                }
                
                addLog(`[INFO] Enviando ${payload.length} registos para processamento (apenas perfil)...`);

                try {
                    const { data, error } = await supabase.rpc('process_profile_only_import', {
                        p_launch_id: selectedLaunchForProfile,
                        p_payload: payload,
                    });

                    if (error) throw error;

                    const updatedCount = data.leads_atualizados || 0;
                    const summaryMessage = `Importação Concluída!\n\n- ${updatedCount} leads tiveram as suas respostas de perfil atualizadas/inseridas.`;
                    showAlertModal("Importação Concluída", summaryMessage);
                    addLog(`[SUCESSO] Operação finalizada. ${updatedCount} perfis atualizados.`);

                } catch (err: any) {
                    addLog(`[ERRO GERAL] A operação falhou: ${err.message}`);
                    showAlertModal("Erro na Importação", `Ocorreu um erro. Verifique o log. Mensagem: ${err.message}`);
                } finally {
                    setIsProcessing(false);
                }
            }
        });
    };

    const handleAnalyzeLaunch = async () => {
        if (!selectedLaunchForBuyers) {
            showAlertModal("Atenção", "Por favor, selecione um lançamento.");
            return;
        }
        setIsProcessing(true);
        addLog(`Iniciando análise da "Fórmula Mágica" para o lançamento...`);
        try {
            const { data, error } = await supabase.rpc('propor_novos_pesos_respostas', { p_launch_id: selectedLaunchForBuyers });
            if (error) throw error;
            if (!data || data.length === 0) {
                showAlertModal("Análise Concluída", "A análise foi executada, mas não encontrou dados suficientes para gerar propostas.");
                addLog("Análise não gerou propostas. Verifique se os leads responderam às pesquisas.");
                setIsProcessing(false);
                return;
            }
            addLog(`Análise concluída com sucesso. ${data.length} propostas de score geradas.`);
            setAnalysisResults(data);
            setIsAnalysisModalOpen(true);
        } catch (err: unknown) {
            const error = err as Error;
            addLog(`ERRO na análise do lançamento: ${error.message}`);
            showAlertModal("Erro na Análise", `Ocorreu um erro ao executar a "Fórmula Mágica". Mensagem: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUpdateWeights = async () => {
        setIsProcessing(true);
        addLog(`Iniciando atualização de pesos para ${analysisResults.length} respostas...`);
        let updatedCount = 0;
        try {
            for (const result of analysisResults) {
                const { error } = await supabase.rpc('atualizar_peso_resposta', {
                    p_pergunta_id: result.pergunta_id,
                    p_texto_resposta: result.resposta_dada,
                    p_novo_peso: result.peso_proposto
                });
                if (error) throw new Error(`Falha ao atualizar a resposta "${result.resposta_dada}": ${error.message}`);
                updatedCount++;
            }
            addLog(`Atualização concluída! ${updatedCount} pesos foram atualizados com sucesso.`);
            showAlertModal("Sucesso", "Os pesos das respostas foram atualizados com sucesso no Banco de Perguntas!");
        } catch (err: unknown) {
            const error = err as Error;
            addLog(`ERRO ao atualizar pesos: ${error.message}`);
            showAlertModal("Erro na Atualização", `Ocorreu um erro. ${updatedCount} pesos foram atualizados antes da falha. Mensagem: ${error.message}`);
        } finally {
            setIsProcessing(false);
            setIsAnalysisModalOpen(false);
        }
    };

    const handleWeightChange = (perguntaId: number, respostaDada: string, novoPeso: string) => {
        const pesoNumerico = parseInt(novoPeso, 10);
        if (isNaN(pesoNumerico)) return;
        setAnalysisResults(prevResults =>
            prevResults.map(r =>
                (r.pergunta_id === perguntaId && r.resposta_dada === respostaDada)
                    ? { ...r, peso_proposto: pesoNumerico }
                    : r
            )
        );
    };

    const handleClearLeads = async () => {
        if (!selectedLaunchForTesting) return;
        const launchName = launches.find(l => l.id === selectedLaunchForTesting)?.nome;
        showConfirmationModal(
            "Confirmar Limpeza",
            `Tem a certeza de que quer apagar TODOS os leads e respostas do lançamento "${launchName}"? Esta ação é irreversível.`,
            async () => {
                setIsProcessing(true);
                addLog(`Iniciando limpeza de leads para o lançamento: ${launchName}...`);
                const { data, error } = await supabase.rpc('clear_leads_from_launch', { p_launch_id: selectedLaunchForTesting });
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
        if (!selectedLaunchForTesting) return;
        const launchName = launches.find(l => l.id === selectedLaunchForTesting)?.nome;
        showConfirmationModal(
            "Confirmar Atualização",
            `Tem a certeza de que quer atualizar as datas de todos os leads do lançamento "${launchName}" para os últimos 7 dias?`,
            async () => {
                setIsProcessing(true);
                addLog(`Iniciando atualização de datas para o lançamento: ${launchName}...`);
                const { data, error } = await supabase.rpc('refresh_lead_dates_for_launch', { p_launch_id: selectedLaunchForTesting });
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
        <div className="space-y-8 p-4 md:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Módulo de Importação e Ferramentas</h1>

            <div className="bg-white p-6 rounded-lg shadow-lg space-y-6">
                <h2 className="text-xl font-bold text-slate-700 border-b pb-2">Importação Geral de Lançamento</h2>
                <LaunchSelector
                    id="launch-select-leads" label="1. Selecione o Lançamento de Destino" launches={launches}
                    selectedValue={selectedLaunchForLeads} onChange={e => setSelectedLaunchForLeads(e.target.value)}
                    disabled={isProcessing} isLoading={isDataLoading} />
                <div>
                    <label htmlFor="file-upload" className="block text-sm font-medium text-slate-700 mb-1">2. Selecione o Ficheiro CSV (delimitado por &apos;;&apos;)</label>
                    <input id="file-upload" type="file" accept=".csv" onChange={e => setFile(e.target.files?.[0] || null)} disabled={isProcessing} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                </div>
                {isProcessing && progress > 0 && (
                    <div className="w-full bg-slate-200 rounded-full h-2.5"><div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div></div>
                )}
                <div className="text-right pt-4">
                    <button onClick={handleImport} disabled={isProcessing || isDataLoading || !selectedLaunchForLeads || !file} className="inline-flex items-center bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                        <FaUpload className="mr-2" />Importar Leads
                    </button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg space-y-6 border-t-4 border-teal-500">
                <h2 className="text-xl font-bold text-slate-700">Importação Apenas de Respostas de Perfil</h2>
                <p className="text-sm text-slate-500">Use esta ferramenta para carregar **apenas** as respostas de perguntas cadastradas como 'Perfil'. Respostas de 'Score' serão ignoradas.</p>
                <LaunchSelector
                    id="launch-select-profile" label="1. Selecione o Lançamento" launches={launches}
                    selectedValue={selectedLaunchForProfile} onChange={e => setSelectedLaunchForProfile(e.target.value)}
                    disabled={isProcessing} isLoading={isDataLoading} />
                <div>
                    <label htmlFor="profile-file-upload" className="block text-sm font-medium text-slate-700 mb-1">2. Selecione o Ficheiro CSV de Check-in</label>
                    <input id="profile-file-upload" type="file" accept=".csv" onChange={e => setProfileFile(e.target.files?.[0] || null)} disabled={isProcessing} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100" />
                </div>
                <div className="text-right pt-4">
                    <button onClick={handleProfileSurveyImport} disabled={isProcessing || isDataLoading || !selectedLaunchForProfile || !profileFile} className="inline-flex items-center bg-teal-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-teal-700 disabled:opacity-50">
                        <FaFileCsv className="mr-2" />Importar Apenas Respostas de Perfil
                    </button>
                </div>
            </div>

             <div className="bg-white p-6 rounded-lg shadow-lg space-y-6 border-t-4 border-green-500">
                <h2 className="text-xl font-bold text-slate-700">Importação de Compradores e Análise</h2>
                <p className="text-sm text-slate-500">Após o fim do lançamento, importe a lista de compradores para marcar os leads e ativar a análise de scores.</p>
                <LaunchSelector
                    id="launch-select-buyers" label="1. Selecione o Lançamento" launches={launches}
                    selectedValue={selectedLaunchForBuyers} onChange={e => setSelectedLaunchForBuyers(e.target.value)}
                    disabled={isProcessing} isLoading={isDataLoading}/>
                <div>
                    <label htmlFor="buyer-file-upload" className="block text-sm font-medium text-slate-700 mb-1">2. Selecione o Ficheiro CSV de Compradores</label>
                    <input id="buyer-file-upload" type="file" accept=".csv" onChange={e => setBuyerFile(e.target.files?.[0] || null)} disabled={isProcessing} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100" />
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-4">
                    <button onClick={handleBuyerImport} disabled={isProcessing || isDataLoading || !selectedLaunchForBuyers || !buyerFile} className="w-full sm:w-auto inline-flex items-center justify-center bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700 disabled:opacity-50">
                        <FaUserCheck className="mr-2" />Importar Compradores
                    </button>
                    <button
                        onClick={handleAnalyzeLaunch}
                        disabled={isProcessing || isDataLoading || !selectedLaunchForBuyers || buyersImportedForLaunch !== selectedLaunchForBuyers}
                        className="w-full sm:w-auto inline-flex items-center justify-center bg-purple-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={buyersImportedForLaunch !== selectedLaunchForBuyers ? "Importe os compradores para este lançamento primeiro" : "Analisar Lançamento"}>
                        <FaMagic className="mr-2" />Analisar e Propor Scores
                    </button>
                </div>
            </div>

             <div className="bg-white p-6 rounded-lg shadow-lg space-y-4 border-t-4 border-amber-400">
                <h2 className="text-lg font-semibold text-slate-700">Ferramentas de Teste</h2>
                <p className="text-sm text-slate-500">Use estas ferramentas para preparar o ambiente para testes. A ação será executada no lançamento selecionado abaixo.</p>
                <LaunchSelector
                    id="launch-select-testing" label="Selecione o Lançamento para a Ação" launches={launches}
                    selectedValue={selectedLaunchForTesting} onChange={e => setSelectedLaunchForTesting(e.target.value)}
                    disabled={isProcessing} isLoading={isDataLoading}/>
                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                    <button onClick={handleClearLeads} disabled={isProcessing || isDataLoading || !selectedLaunchForTesting} className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-50">
                        <FaTrash className="mr-2" /> Limpar Leads do Lançamento
                    </button>
                    <button onClick={handleRefreshDates} disabled={isProcessing || isDataLoading || !selectedLaunchForTesting} className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50">
                        <FaClock className="mr-2" /> Atualizar Datas para Teste
                    </button>
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-lg font-semibold text-slate-700 mb-4">Log de Operações</h2>
                <pre className="bg-slate-900 text-white text-xs p-4 rounded-md h-96 overflow-y-auto font-mono">{log.join('\n')}</pre>
            </div>

            {isAnalysisModalOpen && (
                <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4">
                    <div className="bg-slate-50 rounded-lg shadow-2xl p-4 sm:p-6 w-full max-w-4xl max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center border-b pb-3 mb-4">
                            <h3 className="text-2xl font-bold text-slate-800">Proposta de Novos Pesos</h3>
                            <button onClick={() => setIsAnalysisModalOpen(false)} className="text-slate-500 hover:text-slate-800 text-3xl leading-none">&times;</button>
                        </div>
                        <div className="overflow-y-auto flex-grow">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-100 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Pergunta</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Resposta</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Índice Impacto</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Peso Proposto</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {analysisResults.map((result) => (
                                        <tr key={`${result.pergunta_id}-${result.resposta_dada}`} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 text-sm text-slate-600">{result.texto_pergunta}</td>
                                            <td className="px-4 py-3 text-sm font-medium text-slate-800">{result.resposta_dada}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{result.indice_impacto}</td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    value={result.peso_proposto}
                                                    onChange={(e) => handleWeightChange(result.pergunta_id, result.resposta_dada, e.target.value)}
                                                    className="w-20 px-2 py-1 border border-slate-300 rounded-md text-sm text-center"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-6 flex justify-end gap-3 border-t pt-4">
                            <button onClick={() => setIsAnalysisModalOpen(false)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300" disabled={isProcessing}>Cancelar</button>
                            <button onClick={handleUpdateWeights} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700" disabled={isProcessing}>
                                {isProcessing ? <FaSpinner className="animate-spin mr-2" /> : <FaSave className="mr-2" />}
                                Salvar Pesos
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {modal.isOpen && (
                <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className={`text-xl font-bold ${modal.type === 'alert' ? 'text-blue-700' : 'text-amber-600'}`}>
                                {modal.type === 'alert' ? <FaCheckCircle className="inline mr-2" /> : <FaExclamationTriangle className="inline mr-2" />}
                                {modal.title}
                            </h3>
                            <button onClick={handleCloseModal} className="text-slate-500 hover:text-slate-800 text-2xl leading-none">&times;</button>
                        </div>
                        <p className="text-slate-700 mb-6 whitespace-pre-line">{modal.message}</p>
                        <div className="flex justify-end gap-3">
                            {modal.type === 'confirmation' && (<button onClick={handleCloseModal} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300">Cancelar</button>)}
                            <button onClick={handleConfirmModal} className={`px-4 py-2 rounded-md font-bold ${modal.type === 'alert' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'}`}>
                                {modal.type === 'alert' ? 'OK' : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}