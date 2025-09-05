'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { FaSpinner, FaTrash, FaClock, FaExclamationTriangle, FaCheckCircle, FaUserCheck, FaFileCsv, FaBroom, FaMagic, FaDownload, FaUserMinus } from 'react-icons/fa'; // Ícone adicionado
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Tipos ---
type Launch = { id: string; nome: string; status: string; };
type ScoreSuggestion = { pergunta_texto: string; resposta_texto: string; novo_peso_sugerido: number; justificativa: string; };
type ModalState = { isOpen: boolean; type: 'alert' | 'confirmation' | 'analysis'; title: string; message: string; onConfirm?: () => void; analysisData?: ScoreSuggestion[] };

// --- Componente Reutilizável ---
const LaunchSelector = ({ id, label, launches, selectedValue, onChange, disabled, isLoading, className = '' }: { id: string; label: string; launches: Launch[]; selectedValue: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; disabled: boolean; isLoading: boolean; className?: string; }) => (
    <div className='space-y-2'>
        <label htmlFor={id} className="block text-base font-medium text-slate-700">{label}</label>
        <select id={id} value={selectedValue} onChange={onChange} disabled={disabled || isLoading} className={`w-full sm:w-1/2 px-3 py-2 text-base border border-slate-300 rounded-md disabled:bg-slate-100 ${className}`}>
            {isLoading ? <option>A carregar lançamentos...</option> : <option value="">Selecione um lançamento...</option>}
            {launches.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.status})</option>)}
        </select>
    </div>
);

const supabase = createClient();

export default function ImportacaoPage() {
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunchForLeads, setSelectedLaunchForLeads] = useState<string>('');
    const [selectedLaunchForBuyers, setSelectedLaunchForBuyers] = useState<string>('');
    const [selectedLaunchForTesting, setSelectedLaunchForTesting] = useState<string>('');
    const [file, setFile] = useState<File | null>(null);
    const [buyerFile, setBuyerFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [log, setLog] = useState<string[]>(['Aguardando uma operação...']);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [modal, setModal] = useState<ModalState>({ isOpen: false, type: 'alert', title: '', message: '' });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const buyerFileInputRef = useRef<HTMLInputElement>(null);

    const showAlertModal = (title: string, message: string) => setModal({ isOpen: true, type: 'alert', title, message });
    const showConfirmationModal = (title: string, message: string, onConfirm: () => void) => setModal({ isOpen: true, type: 'confirmation', title, message, onConfirm });
    const handleCloseModal = () => setModal({ isOpen: false, type: 'alert', title: '', message: '' });
    const handleConfirmModal = () => { if (modal.type === 'confirmation' && modal.onConfirm) { modal.onConfirm(); } handleCloseModal(); };
    const addLog = useCallback((message: string) => { setLog(prev => [`[${new Date().toLocaleTimeString('pt-BR')}] ${message}`, ...prev.slice(0, 200)]); }, []);

    useEffect(() => {
        const fetchData = async () => {
            setIsDataLoading(true);
            try {
                const { data, error } = await supabase.from("lancamentos").select('id, nome, status');
                if (error) throw error;
                const sorted = (data || []).filter(l => l.status === 'Em Andamento' || l.status === 'Concluído').sort((a, b) => { if (a.status === 'Em Andamento' && b.status !== 'Em Andamento') return -1; if (a.status !== 'Em Andamento' && b.status === 'Em Andamento') return 1; return b.nome.localeCompare(a.nome); });
                setLaunches(sorted as Launch[]);
            } catch (err: unknown) { const error = err as Error; showAlertModal("Erro Crítico", "Não foi possível carregar os dados iniciais. " + error.message);
            } finally { setIsDataLoading(false); }
        };
        fetchData();
    }, []);

    const handleFileUploadAndProcess = async (fileToUpload: File, launchId: string, importType: 'INSCRICAO' | 'CHECKIN_GERAL' | 'BUYERS') => {
        setIsProcessing(true);
        addLog(`[UPLOAD] Iniciando upload para o Storage do tipo: ${importType}...`);
        try {
            const fileExt = fileToUpload.name.split('.').pop();
            const fileName = `${importType.toLowerCase()}-${Date.now()}.${fileExt}`;
            const folder = importType === 'BUYERS' ? 'buyers' : (importType === 'INSCRICAO' ? 'inscriptions' : 'checkins');
            const filePath = `${folder}/${fileName}`;

            const { error: uploadError } = await supabase.storage.from('importacoes-csv').upload(filePath, fileToUpload);
            if (uploadError) throw uploadError;
            addLog(`[UPLOAD] Sucesso! Ficheiro salvo em: ${filePath}`);
            addLog(`[PROCESSAMENTO] Enviando pedido para processamento em segundo plano...`);

            let edgeFunctionName = '';
            if (importType === 'INSCRICAO') edgeFunctionName = 'processar-inscricao-csv';
            else if (importType === 'CHECKIN_GERAL') edgeFunctionName = 'processar-checkin-csv';
            else if (importType === 'BUYERS') edgeFunctionName = 'processar-compradores-csv';
            
            addLog(`A invocar a Edge Function: ${edgeFunctionName}`);
            const { data, error: invokeError } = await supabase.functions.invoke(edgeFunctionName, { body: { launch_id: launchId, file_path: filePath } });
            if (invokeError) throw invokeError;
            
            const summaryTitle = "Processamento Concluído";
            let summaryMessage = '';

            if (importType === 'BUYERS') {
                const { totalLinhasArquivo, resultadoSql, linhasComErro } = data;
                const { message, atualizados, criados } = resultadoSql || { message: 'Nenhum registo válido processado.', atualizados: 0, criados: 0 };

                summaryMessage += `${message}\n\n`;
                summaryMessage += `----------------------------------------\n`;
                summaryMessage += `Total de Linhas no Arquivo: ${totalLinhasArquivo ?? 'N/A'}\n`;
                summaryMessage += `Registos Válidos Processados: ${(atualizados || 0) + (criados || 0)}\n`;
                summaryMessage += `   - Leads atualizados: ${atualizados || 0}\n`;
                summaryMessage += `   - Compradores novos (criados): ${criados || 0}\n`;
                summaryMessage += `Linhas Ignoradas (com erro): ${linhasComErro?.length || 0}\n`;

                if (linhasComErro && linhasComErro.length > 0) {
                    summaryMessage += `\n----------------------------------------\n`;
                    summaryMessage += `MOTIVO DOS ERROS (exemplos):\n`;
                    linhasComErro.slice(0, 5).forEach((erro: any, index: number) => {
                        const exemploLinha = Object.entries(erro.linha)
                            .filter(([, value]) => value !== null && String(value).trim() !== '')
                            .map(([key, value]) => `${key}: ${value}`)
                            .join('; ') || 'Dados não legíveis';
                        summaryMessage += `- Linha ${index + 1}: ${erro.motivo} (Ex: ${exemploLinha.substring(0, 50)}...)\n`;
                    });
                    if (linhasComErro.length > 5) {
                        summaryMessage += `...e mais ${linhasComErro.length - 5} outros erros.\n`;
                    }
                }
            } else {
                summaryMessage += `${data.message || 'Operação finalizada.'}\n\n----------------------------------------\n`;
                summaryMessage += `Registos recebidos: ${data.total_recebido ?? 'N/A'}\n`;
                summaryMessage += `Leads atualizados: ${data.atualizados ?? 'N/A'}\n`;
                summaryMessage += `Não encontrados: ${data.nao_encontrados ?? 'N/A'}\n`;
            }

            addLog(`[SUCESSO] ${summaryMessage.replace(/\n/g, ' ')}`);
            showAlertModal(summaryTitle, summaryMessage);

        } catch (error: any) {
            addLog(`[ERRO FATAL] ${error.message}`);
            showAlertModal("Erro na Importação", `Ocorreu um erro. Mensagem: ${error.message}`);
        } finally {
            setIsProcessing(false);
            if (importType === 'BUYERS') {
                if (buyerFileInputRef.current) buyerFileInputRef.current.value = '';
                setBuyerFile(null);
            } else {
                if (fileInputRef.current) fileInputRef.current.value = '';
                setFile(null);
            }
        }
    };

    const handleConfirmAndProcess = (importType: 'INSCRICAO' | 'CHECKIN_GERAL' | 'BUYERS') => {
        const fileToProcess = importType === 'BUYERS' ? buyerFile : file;
        const launchId = importType === 'BUYERS' ? selectedLaunchForBuyers : selectedLaunchForLeads;
        const processTypeName = importType === 'BUYERS' ? 'Compradores' : (importType === 'INSCRICAO' ? 'Inscrições' : 'Check-in (Completo)');
    
        if (!fileToProcess || !launchId) {
            showAlertModal("Atenção", "Por favor, selecione um lançamento e um ficheiro CSV para esta operação.");
            return;
        }
    
        const launchName = launches.find(l => l.id === launchId)?.nome || 'Lançamento Desconhecido';
        const fileName = fileToProcess.name;
    
        const title = `Confirmar Importação de ${processTypeName}`;
        const message = `Lançamento: ${launchName}\nFicheiro: ${fileName}\n\nTem a certeza que deseja iniciar a importação de "${processTypeName}"?`;
    
        showConfirmationModal(
            title,
            message,
            () => handleFileUploadAndProcess(fileToProcess!, launchId, importType)
        );
    };

    const handleRecalculateScores = () => {
        if (!selectedLaunchForLeads) { showAlertModal("Atenção", "Por favor, selecione um lançamento na seção de 'Importação Geral' para recalcular os scores."); return; }
        showConfirmationModal("Recalcular Scores", `Tem a certeza que deseja recalcular todos os scores para o lançamento selecionado? Esta ação pode demorar alguns segundos.`,
            async () => {
                setIsProcessing(true);
                addLog(`[AÇÃO] A recalcular todos os scores do lançamento ID: ${selectedLaunchForLeads}`);
                try {
                    const { data, error } = await supabase.functions.invoke('recalculate-scores', { body: { launch_id: selectedLaunchForLeads } });
                    if (error) throw error;
                    const summaryTitle = "Recálculo Concluído";
                    const summaryMessage = `${data.message || 'Operação finalizada.'}\n\n----------------------------------------\nTotal de leads atualizados: ${data.leads_atualizados ?? 'N/A'}`;
                    addLog(`[SUCESSO] ${summaryMessage.replace(/\n/g, ' ')}`);
                    showAlertModal(summaryTitle, summaryMessage);
                } catch (error: any) {
                    addLog(`[ERRO] ${error.message}`);
                    showAlertModal("Erro", `Não foi possível recalcular os scores: ${error.message}`);
                } finally { setIsProcessing(false); }
            }
        );
    };
    
    const handleAnalyzeLaunch = async () => {
        setIsProcessing(true);
        addLog(`[ANÁLISE COM IA] A preparar dados de TODA A BASE e a consultar a IA...`);
        try {
            const { data, error } = await supabase.functions.invoke('analyze-propose-scores-ia');
            if (error) throw error;
            
            if (data && data.length > 0) {
                addLog(`[SUCESSO] Análise da IA concluída. ${data.length} sugestões de pontuação geradas.`);
                setModal({ isOpen: true, type: 'analysis', title: 'Análise e Sugestões da IA (Global)', message: '', analysisData: data });
            } else {
                addLog('[INFO] Análise da IA concluída. Nenhuma sugestão gerada.');
                showAlertModal("Análise Concluída", "A IA analisou os dados, mas não gerou sugestões. Isto pode acontecer se houver poucos dados ou se a distribuição for muito equilibrada.");
            }
        } catch (error: any) {
            addLog(`[ERRO] ${error.message}`);
            showAlertModal("Erro na Análise com IA", `Não foi possível analisar os scores: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const exportAnalysisToPDF = (analysisData: ScoreSuggestion[], launchName: string) => {
        const doc = new jsPDF();
        doc.text(`Análise de Pesos com IA - ${launchName}`, 14, 16);
        
        const tableColumn = ["Pergunta", "Resposta", "Peso Sugerido", "Justificativa da IA"];
        const tableRows: (string|number)[][] = [];

        analysisData.forEach(item => {
            const rowData = [ item.pergunta_texto, item.resposta_texto, item.novo_peso_sugerido, item.justificativa ];
            tableRows.push(rowData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 20,
            theme: 'striped',
            headStyles: { fillColor: [76, 5, 255] },
        });

        doc.save(`analise_ia_pesos_${launchName.replace(/\s+/g, '_')}.pdf`);
    };

    const handleClearLeads = () => {
        if (!selectedLaunchForTesting) {
            showAlertModal("Atenção", "Selecione um lançamento para executar a ação.");
            return;
        }
        showConfirmationModal( "Apagar Lançamento", "Tem a certeza? Esta ação é IRREVERSÍVEL e irá apagar TODOS os leads e respostas associados a este lançamento.",
            async () => {
                setIsProcessing(true);
                addLog(`[AÇÃO] A apagar todos os dados do lançamento ID: ${selectedLaunchForTesting}`);
                try {
                    const { data, error } = await supabase.rpc('deletar_dados_lancamento', { p_launch_id: selectedLaunchForTesting });
                    if (error) throw error;
                    addLog(`[SUCESSO] ${data}`);
                    showAlertModal("Sucesso", data);
                } catch (error: any) {
                    addLog(`[ERRO] ${error.message}`);
                    showAlertModal("Erro", `Não foi possível apagar os dados: ${error.message}`);
                } finally { setIsProcessing(false); }
            }
        );
    };

    const handleResetCheckinData = () => {
        if (!selectedLaunchForTesting) {
            showAlertModal("Atenção", "Selecione um lançamento para executar a ação.");
            return;
        }
        showConfirmationModal( "Zerar Check-ins", "Tem a certeza? Esta ação irá apagar TODAS as respostas e zerar os scores dos leads deste lançamento, mas manterá as inscrições.",
            async () => {
                setIsProcessing(true);
                addLog(`[AÇÃO] A zerar dados de check-in do lançamento ID: ${selectedLaunchForTesting}`);
                try {
                    const { data, error } = await supabase.rpc('zerar_dados_checkin', { p_launch_id: selectedLaunchForTesting });
                    if (error) throw error;
                    addLog(`[SUCESSO] ${data}`);
                    showAlertModal("Sucesso", data);
                } catch (error: any) {
                    addLog(`[ERRO] ${error.message}`);
                    showAlertModal("Erro", `Não foi possível zerar os dados: ${error.message}`);
                } finally { setIsProcessing(false); }
            }
        );
    };

    // --- NOVA FUNÇÃO E HANDLER ---
    const handleResetBuyerData = () => {
        if (!selectedLaunchForTesting) {
            showAlertModal("Atenção", "Selecione um lançamento para executar a ação.");
            return;
        }
        showConfirmationModal(
            "Zerar Compradores",
            "Tem a certeza? Esta ação irá remover a marcação de 'comprador' e limpar TODAS as respostas e scores da pesquisa de comprador para este lançamento.",
            async () => {
                setIsProcessing(true);
                addLog(`[AÇÃO] A zerar dados de compradores do lançamento ID: ${selectedLaunchForTesting}`);
                try {
                    const { data, error } = await supabase.rpc('zerar_dados_compradores', { p_launch_id: selectedLaunchForTesting });
                    if (error) throw error;
                    addLog(`[SUCESSO] ${data}`);
                    showAlertModal("Sucesso", data);
                } catch (error: any) {
                    addLog(`[ERRO] ${error.message}`);
                    showAlertModal("Erro", `Não foi possível zerar os dados: ${error.message}`);
                } finally {
                    setIsProcessing(false);
                }
            }
        );
    };

    const handleRefreshDates = () => {
        if (!selectedLaunchForTesting) {
            showAlertModal("Atenção", "Selecione um lançamento na seção 'Ferramentas de Teste' para executar a ação.");
            return;
        }
        showConfirmationModal(
            "Atualizar Datas",
            `Tem a certeza que deseja atualizar as datas de criação e check-in de TODOS os leads do lançamento selecionado para os últimos 7 dias? Esta ação é útil para testes de dashboards.`,
            async () => {
                setIsProcessing(true);
                addLog(`[AÇÃO] A atualizar datas de teste para o lançamento ID: ${selectedLaunchForTesting}`);
                try {
                    const { data, error } = await supabase.rpc('refresh_launch_dates', {
                        p_launch_id: selectedLaunchForTesting
                    });
                    if (error) throw error;
                    addLog(`[SUCESSO] ${data}`);
                    showAlertModal("Sucesso", data);
                } catch (error: any) {
                    addLog(`[ERRO] ${error.message}`);
                    showAlertModal("Erro", `Não foi possível atualizar as datas: ${error.message}`);
                } finally {
                    setIsProcessing(false);
                }
            }
        );
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 p-6 md:p-10">
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-800">Módulo de Importação e Ferramentas</h1>

            {isProcessing && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md shadow-lg my-6" role="alert">
                    <p className="font-bold flex items-center"><FaSpinner className="animate-spin mr-3" /> Processamento em Andamento</p>
                    <p>A sua operação está a ser processada. Por favor, não feche ou atualize esta página.</p>
                </div>
            )}

            <div className="bg-white p-6 rounded-lg shadow-lg space-y-6">
                 <h2 className="text-2xl font-bold text-slate-700 border-b pb-3">Importação Geral de Lançamento</h2>
                 <LaunchSelector id="launch-select-leads" label="1. Selecione o Lançamento de Destino" launches={launches} selectedValue={selectedLaunchForLeads} onChange={e => setSelectedLaunchForLeads(e.target.value)} disabled={isProcessing} isLoading={isDataLoading} />
                 <div>
                     <label htmlFor="file-upload" className="block text-base font-medium text-slate-700 mb-2">2. Selecione o Ficheiro CSV (Inscrições ou Check-ins)</label>
                     <input ref={fileInputRef} id="file-upload" type="file" accept=".csv" onChange={e => setFile(e.target.files?.[0] || null)} disabled={isProcessing} className="block w-full text-base text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                 </div>
                 <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-4 flex-wrap">
                     <button onClick={handleRecalculateScores} disabled={isProcessing || !selectedLaunchForLeads} className="w-full sm:w-auto inline-flex items-center justify-center bg-purple-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-purple-700 disabled:opacity-50 text-base">
                         <FaMagic className="mr-2" /> Recalcular Scores
                     </button>
                     <button onClick={() => handleConfirmAndProcess('INSCRICAO')} disabled={isProcessing || !selectedLaunchForLeads || !file} className="w-full sm:w-auto inline-flex items-center justify-center bg-green-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-green-700 disabled:opacity-50 text-base">
                         <FaUserCheck className="mr-2" /> Importar Inscrições
                     </button>
                     <button onClick={() => handleConfirmAndProcess('CHECKIN_GERAL')} disabled={isProcessing || !selectedLaunchForLeads || !file} className="w-full sm:w-auto inline-flex items-center justify-center bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-base">
                         <FaFileCsv className="mr-2" /> Importar Check-in (Completo)
                     </button>
                 </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg space-y-6 border-t-4 border-green-500">
                 <h2 className="text-2xl font-bold text-slate-700">Importação de Compradores e Análise</h2>
                 <p className="text-base text-slate-600">Importe a lista de compradores para marcar os leads e opcionalmente incluir respostas da pesquisa de comprador.</p>
                 <LaunchSelector id="launch-select-buyers" label="1. Selecione o Lançamento (para importação)" launches={launches} selectedValue={selectedLaunchForBuyers} onChange={e => setSelectedLaunchForBuyers(e.target.value)} disabled={isProcessing} isLoading={isDataLoading}/>
                 <div>
                     <label htmlFor="buyer-file-upload" className="block text-base font-medium text-slate-700 mb-2">2. Selecione o Ficheiro CSV de Compradores</label>
                     <input ref={buyerFileInputRef} id="buyer-file-upload" type="file" accept=".csv" onChange={e => setBuyerFile(e.target.files?.[0] || null)} disabled={isProcessing} className="block w-full text-base text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100" />
                 </div>
                 <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-4">
                     <button onClick={() => handleConfirmAndProcess('BUYERS')} disabled={isProcessing || !selectedLaunchForBuyers || !buyerFile} className="w-full sm:w-auto inline-flex items-center justify-center bg-green-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-green-700 disabled:opacity-50 text-base">
                         <FaUserCheck className="mr-2" />
                         Importar Compradores e Respostas
                     </button>
                     <button onClick={handleAnalyzeLaunch} disabled={isProcessing} className="w-full sm:w-auto inline-flex items-center justify-center bg-purple-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-purple-700 disabled:opacity-50">
                         <FaMagic className="mr-2" />
                         Analisar (Base Completa)
                     </button>
                 </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg space-y-6 border-t-4 border-amber-400">
                <h2 className="text-xl font-semibold text-slate-700">Ferramentas de Teste</h2>
                <p className="text-base text-slate-600">Use estas ferramentas para preparar o ambiente para testes. A ação será executada no lançamento selecionado abaixo.</p>
                <LaunchSelector id="launch-select-testing" label="Selecione o Lançamento para a Ação" launches={launches} selectedValue={selectedLaunchForTesting} onChange={e => setSelectedLaunchForTesting(e.target.value)} disabled={isProcessing} isLoading={isDataLoading}/>
                <div className="flex flex-col sm:flex-row gap-4 pt-4 flex-wrap">
                    <button onClick={handleClearLeads} disabled={isProcessing || !selectedLaunchForTesting} className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-50">
                        <FaTrash className="mr-2" /> Apagar Lançamento (Deleta TUDO)
                    </button>
                    <button onClick={handleResetCheckinData} disabled={isProcessing || !selectedLaunchForTesting} className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50">
                        <FaBroom className="mr-2" /> Zerar Check-ins (Mantém Inscrições)
                    </button>
                    {/* NOVO BOTÃO ADICIONADO */}
                    <button onClick={handleResetBuyerData} disabled={isProcessing || !selectedLaunchForTesting} className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50">
                        <FaUserMinus className="mr-2" /> Zerar Compradores (Mantém Check-in)
                    </button>
                    <button onClick={handleRefreshDates} disabled={isProcessing || !selectedLaunchForTesting} className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50">
                        <FaClock className="mr-2" /> Atualizar Datas para Teste
                    </button>
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-lg">
                 <h2 className="text-xl font-semibold text-slate-700 mb-4">Log de Operações</h2>
                 <pre className="bg-slate-900 text-white p-4 rounded-md h-96 overflow-y-auto font-mono text-sm">{log.join('\n')}</pre>
            </div>

            {modal.isOpen && modal.type === 'analysis' && (
                 <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4">
                         <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl">
                                 <div className="flex justify-between items-center p-4 border-b">
                                     <h3 className="text-xl font-bold text-purple-700">
                                         <FaMagic className="inline mr-2" /> {modal.title}
                                     </h3>
                                     <button onClick={handleCloseModal} className="text-slate-500 hover:text-slate-800 text-2xl leading-none">&times;</button>
                                 </div>
                                 <div className="p-6 max-h-[70vh] overflow-y-auto">
                                 {modal.analysisData && modal.analysisData.length > 0 ? (
                                     <div className="space-y-4">
                                         <p className="text-slate-600">A IA analisou os dados de toda a base e gerou as seguintes sugestões de pontuação para as respostas. Pode usar estes insights para calibrar os pesos das suas perguntas de perfil.</p>
                                         <table className="min-w-full divide-y divide-gray-200">
                                             <thead className="bg-gray-50">
                                                 <tr>
                                                     <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pergunta / Resposta</th>
                                                     <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Peso Sugerido</th>
                                                     <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Justificativa da IA</th>
                                                 </tr>
                                             </thead>
                                             <tbody className="bg-white divide-y divide-gray-200">
                                                 {modal.analysisData.map((item, index) => (
                                                     <tr key={index}>
                                                         <td className="px-4 py-3 text-sm text-gray-700">
                                                             <span className="font-semibold">{item.pergunta_texto}</span><br/>
                                                             <span className="text-gray-500">{item.resposta_texto}</span>
                                                         </td>
                                                         <td className={`px-4 py-3 text-2xl text-center font-bold ${item.novo_peso_sugerido > 0 ? 'text-green-600' : item.novo_peso_sugerido < 0 ? 'text-red-600' : 'text-gray-500'}`}>{item.novo_peso_sugerido}</td>
                                                         <td className="px-4 py-3 text-sm text-gray-600 italic">{item.justificativa}</td>
                                                     </tr>
                                                 ))}
                                             </tbody>
                                         </table>
                                     </div>
                                 ) : (
                                     <p className="text-slate-700">{modal.message}</p>
                                 )}
                                 </div>
                                 <div className="flex justify-end gap-3 p-4 border-t">
                                         <button onClick={() => exportAnalysisToPDF(modal.analysisData || [], 'Base_Completa')} className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-bold">
                                             <FaDownload className="mr-2" /> Exportar PDF
                                         </button>
                                         <button onClick={handleCloseModal} className="px-4 py-2 rounded-md font-bold bg-blue-600 hover:bg-blue-700 text-white">
                                             Fechar
                                         </button>
                                 </div>
                             </div>
                 </div>
            )}
            
            {modal.isOpen && modal.type !== 'analysis' && (
                 <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4">
                         <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
                                 <div className="flex justify-between items-center mb-4">
                                     <h3 className={`text-xl font-bold ${modal.type === 'alert' ? 'text-blue-700' : 'text-amber-600'}`}>
                                         {modal.type === 'alert' ? <FaCheckCircle className="inline mr-2" /> : <FaExclamationTriangle className="inline mr-2" />} {modal.title}
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

