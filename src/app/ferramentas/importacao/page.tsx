'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import Papa from 'papaparse';
import { FaSpinner, FaUpload, FaTrash, FaClock, FaExclamationTriangle, FaCheckCircle, FaUserCheck, FaMagic, FaSave, FaFileCsv, FaBroom, FaCalculator } from 'react-icons/fa';

// --- Tipos ---
type Launch = { id: string; nome: string; status: string; };
type Question = { id: string; texto: string; tipo: string | null; classe: string | null; opcoes: { texto: string; peso: number; }[] | null; };
type ModalState = { isOpen: boolean; type: 'alert' | 'confirmation'; title: string; message: string; onConfirm?: () => void; };
type AnalysisResult = { pergunta_id: number; texto_pergunta: string; resposta_dada: string; indice_impacto: number; peso_proposto: number; };
type ImportType = 'CHECKIN' | 'INSCRICAO' | 'BUYERS' | 'PROFILE_ONLY';

// --- Componente Reutilizável ---
const LaunchSelector = ({ id, label, launches, selectedValue, onChange, disabled, isLoading, className = '' }: { id: string; label: string; launches: Launch[]; selectedValue: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; disabled: boolean; isLoading: boolean; className?: string; }) => ( <div className='space-y-2'> <label htmlFor={id} className="block text-base font-medium text-slate-700">{label}</label> <select id={id} value={selectedValue} onChange={onChange} disabled={disabled || isLoading} className={`w-full sm:w-1/2 px-3 py-2 text-base border border-slate-300 rounded-md disabled:bg-slate-100 ${className}`}> {isLoading ? <option>A carregar lançamentos...</option> : <option value="">Selecione um lançamento...</option>} {launches.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.status})</option>)} </select> </div> );

const supabase = createClient();

// --- NOVA FUNÇÃO AUXILIAR ---
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};

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
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [modal, setModal] = useState<ModalState>({ isOpen: false, type: 'alert', title: '', message: '' });
    const [buyerFile, setBuyerFile] = useState<File | null>(null);
    const [profileFile, setProfileFile] = useState<File | null>(null);
    const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
    const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
    const [buyersImportedForLaunch, setBuyersImportedForLaunch] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const buyerFileInputRef = useRef<HTMLInputElement>(null);
    const profileFileInputRef = useRef<HTMLInputElement>(null);
    const [isCalculatingMql, setIsCalculatingMql] = useState(false);
    const [isCalculatingScore, setIsCalculatingScore] = useState(false);

    const showAlertModal = (title: string, message: string) => setModal({ isOpen: true, type: 'alert', title, message });
    const showConfirmationModal = (title: string, message: string, onConfirm: () => void) => setModal({ isOpen: true, type: 'confirmation', title, message, onConfirm });
    const handleCloseModal = () => setModal({ isOpen: false, type: 'alert', title: '', message: '' });
    const handleConfirmModal = () => { if (modal.type === 'confirmation' && modal.onConfirm) { modal.onConfirm(); } handleCloseModal(); };
    const addLog = useCallback((message: string) => { setLog(prev => [`[${new Date().toLocaleTimeString('pt-BR')}] ${message}`, ...prev.slice(0, 200)]); }, []);

    useEffect(() => {
        const fetchData = async () => {
            setIsDataLoading(true);
            try {
                const [launchResult, questionResult] = await Promise.all([ supabase.from("lancamentos").select('id, nome, status'), supabase.from("perguntas").select('id, texto, tipo, classe, opcoes') ]);
                if (launchResult.error) throw launchResult.error;
                if (questionResult.error) throw questionResult.error;
                const sorted = (launchResult.data || []).filter(l => l.status === 'Em Andamento' || l.status === 'Concluído').sort((a, b) => { if (a.status === 'Em Andamento' && b.status !== 'Em Andamento') return -1; if (a.status !== 'Em Andamento' && b.status === 'Em Andamento') return 1; return b.nome.localeCompare(a.nome); });
                setLaunches(sorted as Launch[]);
                setQuestions((questionResult.data as Question[]) || []);
            } catch (err: unknown) { const error = err as Error; showAlertModal("Erro Crítico", "Não foi possível carregar os dados iniciais. " + error.message);
            } finally { setIsDataLoading(false); }
        };
        fetchData();
    }, []);

    const handleCalculateMql = async () => {
        if (!selectedLaunchForProfile) { showAlertModal("Atenção", "Selecione um lançamento na secção 'Importação Apenas de Respostas de Perfil' para recalcular o MQL Score."); return; }
        setIsCalculatingMql(true);
        addLog(`[RECALC MQL] Iniciando para o lançamento ID: ${selectedLaunchForProfile}...`);
        try {
            const { data, error } = await supabase.rpc('calcular_mql_score_lancamento', { p_launch_id: selectedLaunchForProfile });
            if (error) throw error;
            addLog(`[SUCESSO MQL] ${data}`);
            showAlertModal("Recálculo Concluído", data);
        } catch (err: any) {
            addLog(`[ERRO MQL] Falha no recálculo: ${err.message}`);
            showAlertModal("Erro no Recálculo", `Falha ao recalcular MQL Score: ${err.message}`);
        } finally {
            setIsCalculatingMql(false);
        }
    };

    const handleCalculateScore = async () => {
        if (!selectedLaunchForLeads) { showAlertModal("Atenção", "Selecione um lançamento na secção 'Importação Geral' para recalcular o Score Geral."); return; }
        setIsCalculatingScore(true);
        addLog(`[RECALC SCORE] Iniciando para o lançamento ID: ${selectedLaunchForLeads}...`);
        try {
            const { data, error } = await supabase.rpc('calcular_score_lancamento', { p_launch_id: selectedLaunchForLeads });
            if (error) throw error;
            addLog(`[SUCESSO SCORE] ${data}`);
            showAlertModal("Recálculo Concluído", data);
        } catch (err: any) {
            addLog(`[ERRO SCORE] Falha no recálculo: ${err.message}`);
            showAlertModal("Erro no Recálculo", `Falha ao recalcular Score Geral: ${err.message}`);
        } finally {
            setIsCalculatingScore(false);
        }
    };

    const invokeCsvProcessor = async (file: File, launch_id: string, import_type: ImportType) => {
        setIsProcessing(true);
        addLog(`[INFO] Iniciando importação do tipo: ${import_type}`);
        try {
            const csvContent = await fileToBase64(file);
            addLog('[INFO] Ficheiro lido e codificado. A enviar para o servidor para processamento...');
            const { data, error } = await supabase.functions.invoke('process-csv-import', { body: { csvContent, launch_id: launch_id, import_type } });
            if (error) { const errorBody = error.context ? await error.context.json() : { message: error.message }; throw new Error(errorBody.message || error.message); }
            if (data.status === 'error') throw new Error(data.message);
            addLog(`[SUCESSO] ${data.message || 'Operação bem-sucedida.'}`);
            if (data.details) {
                addLog(`--- INÍCIO DO RELATÓRIO DE PROCESSAMENTO ---`);
                addLog(`Total de Linhas no Ficheiro: ${data.details.totalRows ?? 'N/A'}`);
                addLog(`Total de Leads Válidos Processados: ${data.details.processedLeads ?? 'N/A'}`);
                if(data.details.mappedHeaders) addLog(`Colunas Mapeadas com Sucesso (${data.details.mappedHeaders.length}): ${data.details.mappedHeaders.join('; ') || 'Nenhuma'}`);
                if(data.details.unmappedHeaders) addLog(`COLUNAS NÃO MAPEADAS (${data.details.unmappedHeaders.length}): ${data.details.unmappedHeaders.join('; ') || 'Nenhuma'}`);
                addLog(`--- FIM DO RELATÓRIO ---`);
            }
            if (data.debug_log && Array.isArray(data.debug_log)) {
                data.debug_log.forEach((logLine: string) => addLog(logLine));
            }
            return data;
        } catch (err: any) {
            addLog(`[ERRO FATAL] ${err.message}`);
            throw err;
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleImport = async () => {
        if (!file || !selectedLaunchForLeads) { showAlertModal("Atenção", "Por favor, selecione um lançamento e um ficheiro CSV."); return; }
        try {
            const headers = await new Promise<string[]>((resolve) => { Papa.parse(file, { header: true, preview: 1, skipEmptyLines: true, complete: (res) => resolve(res.meta.fields || []) }); });
            const lowerCaseHeaders = headers.map(h => h.toLowerCase().trim());
            const hasQuestionColumns = questions.some(q => lowerCaseHeaders.includes(q.texto.toLowerCase().trim()));
            const hasCampaignColumn = lowerCaseHeaders.includes('utm_campaign');
            let importType: 'INSCRICAO' | 'CHECKIN' | 'INVALIDO' = 'INVALIDO';
            if (!hasCampaignColumn && hasQuestionColumns) importType = 'CHECKIN'; else if (hasCampaignColumn) importType = 'INSCRICAO';
            if (importType === 'INVALIDO') { showAlertModal("Erro de Formato", "Formato de ficheiro inválido. Verifique se o ficheiro contém 'utm_campaign' (para Inscrições) ou colunas de perguntas (para Check-in)."); return; }
            const result = await invokeCsvProcessor(file, selectedLaunchForLeads, importType);
            showAlertModal("Importação Concluída", result.message);
        } catch(e: any) {
            showAlertModal("Erro na Importação", `Ocorreu um erro. Mensagem: ${e.message}`);
        } finally { if (fileInputRef.current) fileInputRef.current.value = ''; setFile(null); }
    };
    
    const handleBuyerImport = async () => {
        if (!buyerFile || !selectedLaunchForBuyers) {
            showAlertModal("Atenção", "Por favor, selecione um lançamento e um ficheiro CSV para compradores.");
            return;
        }
        try {
            const result = await invokeCsvProcessor(buyerFile, selectedLaunchForBuyers, 'BUYERS');
            let summaryMessage = `${result.message}\n\n- ${result.details.updated_in_launch || 0} existentes marcados.\n- ${result.details.created_for_launch || 0} novos para o lançamento.\n- ${result.details.newly_created_leads || 0} novos no sistema.`;
            showAlertModal("Resumo da Importação", summaryMessage);
            setBuyersImportedForLaunch(selectedLaunchForBuyers);
        } catch(e: any) {
            showAlertModal("Erro na Importação de Compradores", `Ocorreu um erro. Mensagem: ${e.message}`);
        } finally {
            if (buyerFileInputRef.current) buyerFileInputRef.current.value = '';
            setBuyerFile(null);
        }
    };

    const handleProfileSurveyImport = async () => {
        if (!profileFile || !selectedLaunchForProfile) {
            showAlertModal("Atenção", "Por favor, selecione um lançamento e um ficheiro CSV.");
            return;
        }
        try {
            const result = await invokeCsvProcessor(profileFile, selectedLaunchForProfile, 'PROFILE_ONLY');
            showAlertModal("Importação Concluída", result.message);
        } catch(e: any) {
            showAlertModal("Erro na Importação de Perfil", `Ocorreu um erro. Mensagem: ${e.message}`);
        } finally {
            if (profileFileInputRef.current) profileFileInputRef.current.value = '';
            setProfileFile(null);
        }
    };

    const handleAnalyzeLaunch = async () => {
        if (!selectedLaunchForBuyers) { showAlertModal("Atenção", "Por favor, selecione um lançamento."); return; }
        setIsProcessing(true);
        addLog(`Iniciando análise da "Fórmula Mágica" para o lançamento...`);
        try {
            const { data, error } = await supabase.rpc('propor_novos_pesos_respostas', { p_launch_id: selectedLaunchForBuyers });
            if (error) throw error;
            if (!data || data.length === 0) {
                showAlertModal("Análise Concluída", "A análise foi executada, mas não encontrou dados suficientes para gerar propostas.");
                addLog("Análise não gerou propostas. Verifique se os leads responderam às pesquisas.");
                return;
            }
            addLog(`Análise concluída com sucesso. ${data.length} propostas de score geradas.`);
            setAnalysisResults(data);
            setIsAnalysisModalOpen(true);
        } catch (err: unknown) {
            const error = err as Error;
            addLog(`ERRO na análise do lançamento: ${error.message}`);
            showAlertModal("Erro na Análise", `Ocorreu um erro ao executar a "Fórmula Mágica". Mensagem: ${error.message}`);
        } finally { setIsProcessing(false); }
    };

    const handleUpdateWeights = async () => {
        setIsProcessing(true);
        addLog(`Iniciando atualização de pesos para ${analysisResults.length} respostas...`);
        let updatedCount = 0;
        try {
            for (const result of analysisResults) {
                const { error } = await supabase.rpc('atualizar_peso_resposta', { p_pergunta_id: result.pergunta_id, p_texto_resposta: result.resposta_dada, p_novo_peso: result.peso_proposto });
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
        setAnalysisResults(prevResults => prevResults.map(r => (r.pergunta_id === perguntaId && r.resposta_dada === respostaDada) ? { ...r, peso_proposto: pesoNumerico } : r ));
    };

    const handleClearLeads = async () => {
        if (!selectedLaunchForTesting) return;
        const launchName = launches.find(l => l.id === selectedLaunchForTesting)?.nome;
        showConfirmationModal("Confirmar Limpeza TOTAL", `Tem a certeza de que quer apagar TODOS os leads e respostas do lançamento "${launchName}"? Esta ação é irreversível.`,
            async () => {
                setIsProcessing(true);
                addLog(`Iniciando limpeza TOTAL de leads para o lançamento: ${launchName}...`);
                const { data, error } = await supabase.rpc('clear_leads_from_launch', { p_launch_id: selectedLaunchForTesting });
                if (error) { addLog(`ERRO ao limpar leads: ${error.message}`); showAlertModal("Erro", `Não foi possível limpar os leads. ${error.message}`);
                } else { addLog(`${data} leads foram apagados com sucesso.`); showAlertModal("Sucesso", `${data} leads do lançamento "${launchName}" foram apagados.`); }
                setIsProcessing(false);
            }
        );
    };

    const handleResetCheckinData = async () => {
        if (!selectedLaunchForTesting) return;
        const launchName = launches.find(l => l.id === selectedLaunchForTesting)?.nome;
        showConfirmationModal("Confirmar Reset de Check-ins", `Tem a certeza de que quer ZERAR os dados de CHECK-IN (scores e respostas) para todos os leads do lançamento "${launchName}"? As inscrições originais serão mantidas.`,
            async () => {
                setIsProcessing(true);
                addLog(`Iniciando reset dos dados de check-in para: ${launchName}...`);
                const { data, error } = await supabase.rpc('reset_checkin_data_for_launch', { p_launch_id: selectedLaunchForTesting });
                if (error) { addLog(`ERRO ao zerar dados de check-in: ${error.message}`); showAlertModal("Erro", `Não foi possível zerar os dados. ${error.message}`);
                } else { addLog(`${data} leads tiveram os seus dados de check-in zerados.`); showAlertModal("Sucesso", `Os dados de check-in de ${data} leads do lançamento "${launchName}" foram zerados.`); }
                setIsProcessing(false);
            }
        );
    };

    const handleRefreshDates = async () => {
        if (!selectedLaunchForTesting) return;
        const launchName = launches.find(l => l.id === selectedLaunchForTesting)?.nome;
        showConfirmationModal("Confirmar Atualização", `Tem a certeza de que quer atualizar as datas de todos os leads do lançamento "${launchName}" para os últimos 7 dias?`,
            async () => {
                setIsProcessing(true);
                addLog(`Iniciando atualização de datas para o lançamento: ${launchName}...`);
                const { data, error } = await supabase.rpc('refresh_lead_dates_for_launch', { p_launch_id: selectedLaunchForTesting });
                if (error) { addLog(`ERRO ao atualizar datas: ${error.message}`); showAlertModal("Erro", `Não foi possível atualizar as datas. ${error.message}`);
                } else { addLog(`${data} leads tiveram as suas datas atualizadas.`); showAlertModal("Sucesso", `As datas de ${data} leads do lançamento "${launchName}" foram atualizadas.`); }
                setIsProcessing(false);
            }
        );
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 p-6 md:p-10">
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-800">Módulo de Importação e Ferramentas</h1>

            {(isProcessing || isCalculatingMql || isCalculatingScore) && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md shadow-lg my-6" role="alert">
                    <p className="font-bold flex items-center"><FaSpinner className="animate-spin mr-3" /> Processamento em Andamento</p>
                    <p>A sua operação está a ser processada. Por favor, não feche ou atualize esta página.</p>
                </div>
            )}

            <div className="bg-white p-6 rounded-lg shadow-lg space-y-6">
                <h2 className="text-2xl font-bold text-slate-700 border-b pb-3">Importação Geral de Lançamento</h2>
                <LaunchSelector id="launch-select-leads" label="1. Selecione o Lançamento de Destino" launches={launches} selectedValue={selectedLaunchForLeads} onChange={e => setSelectedLaunchForLeads(e.target.value)} disabled={isProcessing || isCalculatingMql || isCalculatingScore} isLoading={isDataLoading} />
                <div>
                    <label htmlFor="file-upload" className="block text-base font-medium text-slate-700 mb-2">2. Selecione o Ficheiro CSV</label>
                    <input ref={fileInputRef} id="file-upload" type="file" accept=".csv" onChange={e => setFile(e.target.files?.[0] || null)} disabled={isProcessing || isCalculatingMql || isCalculatingScore} className="block w-full text-base text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-4">
                    <button
                        onClick={handleCalculateScore}
                        disabled={isProcessing || isCalculatingMql || isCalculatingScore || !selectedLaunchForLeads}
                        className="w-full sm:w-auto inline-flex items-center justify-center bg-purple-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-purple-700 disabled:opacity-50 text-base">
                        {isCalculatingScore ? <FaSpinner className="animate-spin mr-2" /> : <FaCalculator className="mr-2" />}
                        {isCalculatingScore ? 'A Calcular...' : 'Calcular Score'}
                    </button>
                    <button onClick={handleImport} disabled={isProcessing || isCalculatingMql || isCalculatingScore || !selectedLaunchForLeads || !file} className="w-full sm:w-auto inline-flex items-center justify-center bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-base">
                        {isProcessing ? <FaSpinner className="animate-spin mr-2" /> : <FaUpload className="mr-2" />}
                        {isProcessing ? 'A Processar...' : 'Importar Leads'}
                    </button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg space-y-6 border-t-4 border-teal-500">
                <h2 className="text-2xl font-bold text-slate-700">Importação Apenas de Respostas de Perfil</h2>
                <p className="text-base text-slate-600">Use esta ferramenta para carregar **apenas** as respostas de perguntas cadastradas como 'Perfil'. Respostas de 'Score' serão ignoradas.</p>
                <LaunchSelector id="launch-select-profile" label="1. Selecione o Lançamento" launches={launches} selectedValue={selectedLaunchForProfile} onChange={e => setSelectedLaunchForProfile(e.target.value)} disabled={isProcessing || isCalculatingMql || isCalculatingScore} isLoading={isDataLoading} />
                <div>
                    <label htmlFor="profile-file-upload" className="block text-base font-medium text-slate-700 mb-2">2. Selecione o Ficheiro CSV de Check-in</label>
                    <input ref={profileFileInputRef} id="profile-file-upload" type="file" accept=".csv" onChange={e => setProfileFile(e.target.files?.[0] || null)} disabled={isProcessing || isCalculatingMql || isCalculatingScore} className="block w-full text-base text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100" />
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-4">
                    <button
                        onClick={handleCalculateMql}
                        disabled={isProcessing || isCalculatingMql || isCalculatingScore || !selectedLaunchForProfile}
                        className="w-full sm:w-auto inline-flex items-center justify-center bg-sky-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-sky-700 disabled:opacity-50 text-base">
                        {isCalculatingMql ? <FaSpinner className="animate-spin mr-2" /> : <FaCalculator className="mr-2" />}
                        {isCalculatingMql ? 'A Calcular...' : 'Calcular MQL'}
                    </button>
                    <button onClick={handleProfileSurveyImport} disabled={isProcessing || isCalculatingMql || isCalculatingScore || !selectedLaunchForProfile || !profileFile} className="w-full sm:w-auto inline-flex items-center justify-center bg-teal-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-teal-700 disabled:opacity-50 text-base">
                        {isProcessing ? <FaSpinner className="animate-spin mr-2" /> : <FaFileCsv className="mr-2" />}
                        {isProcessing ? 'A Processar...' : 'Importar Apenas Respostas de Perfil'}
                    </button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg space-y-6 border-t-4 border-green-500">
                <h2 className="text-2xl font-bold text-slate-700">Importação de Compradores e Análise</h2>
                <p className="text-base text-slate-600">Após o fim do lançamento, importe a lista de compradores para marcar os leads e ativar a análise de scores.</p>
                <LaunchSelector id="launch-select-buyers" label="1. Selecione o Lançamento" launches={launches} selectedValue={selectedLaunchForBuyers} onChange={e => setSelectedLaunchForBuyers(e.target.value)} disabled={isProcessing || isCalculatingMql || isCalculatingScore} isLoading={isDataLoading}/>
                <div>
                    <label htmlFor="buyer-file-upload" className="block text-base font-medium text-slate-700 mb-2">2. Selecione o Ficheiro CSV de Compradores</label>
                    <input ref={buyerFileInputRef} id="buyer-file-upload" type="file" accept=".csv" onChange={e => setBuyerFile(e.target.files?.[0] || null)} disabled={isProcessing || isCalculatingMql || isCalculatingScore} className="block w-full text-base text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100" />
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-4">
                    <button onClick={handleBuyerImport} disabled={isProcessing || isCalculatingMql || isCalculatingScore || !selectedLaunchForBuyers || !buyerFile} className="w-full sm:w-auto inline-flex items-center justify-center bg-green-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-green-700 disabled:opacity-50 text-base">
                        {isProcessing ? <FaSpinner className="animate-spin mr-2" /> : <FaUserCheck className="mr-2" />}
                        {isProcessing ? 'A Processar...' : 'Importar Compradores'}
                    </button>
                    <button onClick={handleAnalyzeLaunch} disabled={isProcessing || isCalculatingMql || isCalculatingScore || !selectedLaunchForBuyers || buyersImportedForLaunch !== selectedLaunchForBuyers} className="w-full sm:w-auto inline-flex items-center justify-center bg-purple-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed" title={buyersImportedForLaunch !== selectedLaunchForBuyers ? "Importe os compradores para este lançamento primeiro" : "Analisar Lançamento"}>
                        {isProcessing ? <FaSpinner className="animate-spin mr-2" /> : <FaMagic className="mr-2" />}
                        {isProcessing ? 'A Analisar...' : 'Analisar e Propor Scores'}
                    </button>
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-lg space-y-6 border-t-4 border-amber-400">
                <h2 className="text-xl font-semibold text-slate-700">Ferramentas de Teste</h2>
                <p className="text-base text-slate-600">Use estas ferramentas para preparar o ambiente para testes. A ação será executada no lançamento selecionado abaixo.</p>
                <LaunchSelector
                    id="launch-select-testing" label="Selecione o Lançamento para a Ação" launches={launches}
                    selectedValue={selectedLaunchForTesting} onChange={e => setSelectedLaunchForTesting(e.target.value)}
                    disabled={isProcessing || isCalculatingMql || isCalculatingScore} isLoading={isDataLoading}/>
                <div className="flex flex-col sm:flex-row gap-4 pt-4 flex-wrap">
                    <button onClick={handleClearLeads} disabled={isProcessing || isCalculatingMql || isCalculatingScore || !selectedLaunchForTesting} className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-50">
                        {isProcessing ? <FaSpinner className="animate-spin mr-2" /> : <FaTrash className="mr-2" />}
                        {isProcessing ? 'A Apagar...' : 'Apagar Lançamento (Deleta TUDO)'}
                    </button>
                    <button onClick={handleResetCheckinData} disabled={isProcessing || isCalculatingMql || isCalculatingScore || !selectedLaunchForTesting} className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50">
                        {isProcessing ? <FaSpinner className="animate-spin mr-2" /> : <FaBroom className="mr-2" />}
                        {isProcessing ? 'A Zerar...' : 'Zerar Check-ins (Mantém Inscrições)'}
                    </button>
                    <button onClick={handleRefreshDates} disabled={isProcessing || isCalculatingMql || isCalculatingScore || !selectedLaunchForTesting} className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50">
                        {isProcessing ? <FaSpinner className="animate-spin mr-2" /> : <FaClock className="mr-2" />}
                        {isProcessing ? 'A Atualizar...' : 'Atualizar Datas para Teste'}
                    </button>
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold text-slate-700 mb-4">Log de Operações</h2>
                <pre className="bg-slate-900 text-white p-4 rounded-md h-96 overflow-y-auto font-mono text-sm">{log.join('\n')}</pre>
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
                    _                       <td className="px-4 py-3 text-sm text-slate-600">{result.indice_impacto}</td>
                                            <td className="px-4 py-3">
                                                <input type="number" value={result.peso_proposto} onChange={(e) => handleWeightChange(result.pergunta_id, result.resposta_dada, e.target.value)} className="w-20 px-2 py-1 border border-slate-300 rounded-md text-sm text-center" />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-6 flex justify-end gap-3 border-t pt-4">
                            <button onClick={() => setIsAnalysisModalOpen(false)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300" disabled={isProcessing}>Cancelar</button>
                            <button onClick={handleUpdateWeights} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700" disabled={isProcessing}>
                                {isProcessing ? <FaSpinner className="animate-spin mr-2" /> : <FaSave className="mr-2" />} Salvar Pesos
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