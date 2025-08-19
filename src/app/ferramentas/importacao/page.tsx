'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { FaSpinner, FaTrash, FaClock, FaExclamationTriangle, FaCheckCircle, FaUserCheck, FaFileCsv, FaBroom, FaMagic } from 'react-icons/fa';

// --- Tipos ---
type Launch = { id: string; nome: string; status: string; };
type ModalState = { isOpen: boolean; type: 'alert' | 'confirmation'; title: string; message: string; onConfirm?: () => void; };

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
        if (!fileToUpload || !launchId) {
            showAlertModal("Atenção", "Por favor, selecione um lançamento e um ficheiro CSV.");
            return;
        }

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
            if (importType === 'INSCRICAO') {
                edgeFunctionName = 'processar-inscricao-csv';
            } else if (importType === 'CHECKIN_GERAL') {
                edgeFunctionName = 'processar-checkin-csv';
            } else if (importType === 'BUYERS') {
                showAlertModal("Atenção", "A importação de Compradores ainda não está implementada.");
                setIsProcessing(false);
                return;
            }

            addLog(`A invocar a Edge Function: ${edgeFunctionName}`);
            const { data, error: invokeError } = await supabase.functions.invoke(edgeFunctionName, { body: { launch_id: launchId, file_path: filePath } });
            if (invokeError) throw invokeError;
            
            addLog(`[SUCESSO] ${data.message}`);
            showAlertModal("Processamento Iniciado", `${data.message}\nO processamento continuará em segundo plano.`);

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

    // --- [NOVA FUNÇÃO] ---
    const handleRecalculateScores = () => {
        if (!selectedLaunchForLeads) {
            showAlertModal("Atenção", "Por favor, selecione um lançamento na seção de 'Importação Geral' para recalcular os scores.");
            return;
        }
        showConfirmationModal("Recalcular Scores", `Tem a certeza que deseja recalcular todos os scores para o lançamento selecionado? Esta ação pode demorar alguns segundos.`,
            async () => {
                setIsProcessing(true);
                addLog(`[AÇÃO] A recalcular todos os scores do lançamento ID: ${selectedLaunchForLeads}`);
                try {
                    const { data, error } = await supabase.functions.invoke('recalculate-scores', { body: { launch_id: selectedLaunchForLeads } });
                    if (error) throw error;
                    addLog(`[SUCESSO] ${data.message} | Leads atualizados: ${data.leads_atualizados}`);
                    showAlertModal("Sucesso", `${data.message}\nTotal de leads atualizados: ${data.leads_atualizados}`);
                } catch (error: any) {
                    addLog(`[ERRO] ${error.message}`);
                    showAlertModal("Erro", `Não foi possível recalcular os scores: ${error.message}`);
                } finally { setIsProcessing(false); }
            }
        );
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

    const handleRefreshDates = () => { showAlertModal("Info", "Função não implementada."); };
    const handleAnalyzeLaunch = () => { showAlertModal("Info", "Função não implementada."); };

    return (
        <div className="max-w-7xl mx-auto space-y-8 p-6 md:p-10">
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-800">Módulo de Importação e Ferramentas</h1>

            {isProcessing && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md shadow-lg my-6" role="alert">
                    <p className="font-bold flex items-center"><FaSpinner className="animate-spin mr-3" /> Processamento em Andamento</p>
                    <p>A sua operação está a ser processada. Por favor, não feche ou atualize esta página.</p>
                </div>
            )}

            {/* Seção de Importação Geral */}
            <div className="bg-white p-6 rounded-lg shadow-lg space-y-6">
                <h2 className="text-2xl font-bold text-slate-700 border-b pb-3">Importação Geral de Lançamento</h2>
                <LaunchSelector id="launch-select-leads" label="1. Selecione o Lançamento de Destino" launches={launches} selectedValue={selectedLaunchForLeads} onChange={e => setSelectedLaunchForLeads(e.target.value)} disabled={isProcessing} isLoading={isDataLoading} />
                <div>
                    <label htmlFor="file-upload" className="block text-base font-medium text-slate-700 mb-2">2. Selecione o Ficheiro CSV (Inscrições ou Check-ins)</label>
                    <input ref={fileInputRef} id="file-upload" type="file" accept=".csv" onChange={e => setFile(e.target.files?.[0] || null)} disabled={isProcessing} className="block w-full text-base text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                </div>
                {/* --- [BOTÕES ATUALIZADOS] --- */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-4 flex-wrap">
                    <button onClick={handleRecalculateScores} disabled={isProcessing || !selectedLaunchForLeads} className="w-full sm:w-auto inline-flex items-center justify-center bg-purple-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-purple-700 disabled:opacity-50 text-base">
                        <FaMagic className="mr-2" /> Recalcular Scores
                    </button>
                    <button onClick={() => file && selectedLaunchForLeads && handleFileUploadAndProcess(file, selectedLaunchForLeads, 'INSCRICAO')} disabled={isProcessing || !selectedLaunchForLeads || !file} className="w-full sm:w-auto inline-flex items-center justify-center bg-green-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-green-700 disabled:opacity-50 text-base">
                        <FaUserCheck className="mr-2" /> Importar Inscrições
                    </button>
                    <button onClick={() => file && selectedLaunchForLeads && handleFileUploadAndProcess(file, selectedLaunchForLeads, 'CHECKIN_GERAL')} disabled={isProcessing || !selectedLaunchForLeads || !file} className="w-full sm:w-auto inline-flex items-center justify-center bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-base">
                        <FaFileCsv className="mr-2" /> Importar Check-in (Completo)
                    </button>
                </div>
            </div>

            {/* Seção de Importação de Compradores RESTAURADA */}
            <div className="bg-white p-6 rounded-lg shadow-lg space-y-6 border-t-4 border-green-500">
                <h2 className="text-2xl font-bold text-slate-700">Importação de Compradores e Análise</h2>
                <p className="text-base text-slate-600">Importe a lista de compradores para marcar os leads e opcionalmente incluir respostas da pesquisa de comprador.</p>
                <LaunchSelector id="launch-select-buyers" label="1. Selecione o Lançamento" launches={launches} selectedValue={selectedLaunchForBuyers} onChange={e => setSelectedLaunchForBuyers(e.target.value)} disabled={isProcessing} isLoading={isDataLoading}/>
                <div>
                    <label htmlFor="buyer-file-upload" className="block text-base font-medium text-slate-700 mb-2">2. Selecione o Ficheiro CSV de Compradores</label>
                    <input ref={buyerFileInputRef} id="buyer-file-upload" type="file" accept=".csv" onChange={e => setBuyerFile(e.target.files?.[0] || null)} disabled={isProcessing} className="block w-full text-base text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100" />
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-4">
                    <button onClick={() => buyerFile && selectedLaunchForBuyers && handleFileUploadAndProcess(buyerFile, selectedLaunchForBuyers, 'BUYERS')} disabled={isProcessing || !selectedLaunchForBuyers || !buyerFile} className="w-full sm:w-auto inline-flex items-center justify-center bg-green-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-green-700 disabled:opacity-50 text-base">
                        <FaUserCheck className="mr-2" />
                        Importar Compradores e Respostas
                    </button>
                    <button onClick={handleAnalyzeLaunch} disabled={isProcessing || !selectedLaunchForBuyers} className="w-full sm:w-auto inline-flex items-center justify-center bg-purple-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-purple-700 disabled:opacity-50">
                        <FaMagic className="mr-2" />
                        Analisar e Propor Scores
                    </button>
                </div>
            </div>
            
            {/* Seção de Ferramentas de Teste */}
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
                    <button onClick={handleRefreshDates} disabled={isProcessing || !selectedLaunchForTesting} className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50">
                        <FaClock className="mr-2" /> Atualizar Datas para Teste
                    </button>
                </div>
            </div>
            
            {/* Seção de Log */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold text-slate-700 mb-4">Log de Operações</h2>
                <pre className="bg-slate-900 text-white p-4 rounded-md h-96 overflow-y-auto font-mono text-sm">{log.join('\n')}</pre>
            </div>

            {/* Modal de Alerta/Confirmação */}
            {modal.isOpen && (
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
