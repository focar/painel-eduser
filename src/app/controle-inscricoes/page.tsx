// Conteúdo FINAL para: src/app/controle-inscricoes/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/supabaseClient';
import { showAlertModal, showConfirmationModal } from '@/lib/modals';

// --- Tipos de Dados ---
type Launch = { id: string; nome: string; };
type PageVariant = { id: string; name: string; slug: string; status: string; };
type FlowSetting = { utm_content: string; flow_type: string; };

export default function ControleInscricoesPage() {
    // --- Estados do Componente ---
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunch, setSelectedLaunch] = useState<string>('');
    const [pageVariants, setPageVariants] = useState<PageVariant[]>([]);
    const [flowSettings, setFlowSettings] = useState<FlowSetting[]>([]);
    const [isLoading, setIsLoading] = useState({ pages: true, flows: true });

    // --- Hooks de Efeito ---
    useEffect(() => {
        const fetchLaunches = async () => {
            const { data } = await db.from("lancamentos").select("id, nome").order("created_at", { ascending: false });
            if (data) {
                setLaunches(data);
                if (data.length > 0) setSelectedLaunch(data[0].id);
            }
        };
        fetchLaunches();
    }, []);

    useEffect(() => {
        if (!selectedLaunch) {
            setIsLoading({ pages: false, flows: false });
            setPageVariants([]);
            setFlowSettings([]);
            return;
        }
        loadPagesForLaunch(selectedLaunch);
        loadChannelsForLaunch(selectedLaunch);
    }, [selectedLaunch]);

    // --- Funções de Busca de Dados ---
    const loadPagesForLaunch = async (launchId: string) => {
        setIsLoading(prev => ({ ...prev, pages: true }));
        try {
            const { data, error } = await db.from('page_variants').select('id, name, slug, status').eq('launch_id', launchId).order('name');
            if (error) throw error;
            setPageVariants(data || []);
        } catch (err) {
            showAlertModal('Erro', 'Não foi possível carregar as páginas de captura.');
        } finally {
            setIsLoading(prev => ({ ...prev, pages: false }));
        }
    };

    const loadChannelsForLaunch = async (launchId: string) => {
        setIsLoading(prev => ({ ...prev, flows: true }));
        try {
            const { data: leads, error: leadsError } = await db.from('leads').select('utm_content').eq('launch_id', launchId).not('utm_content', 'is', null);
            if (leadsError) throw leadsError;

            const { data: settings, error: settingsError } = await db.from('campaign_settings').select('utm_content, flow_type').eq('launch_id', launchId);
            if (settingsError) throw settingsError;

            const uniqueChannels = [...new Set(leads.map(l => l.utm_content))];
            const settingsMap = new Map(settings.map(s => [s.utm_content, s.flow_type]));
            
            const channelFlows = uniqueChannels.map(channel => ({
                utm_content: channel,
                flow_type: settingsMap.get(channel) || 'composto'
            }));
            setFlowSettings(channelFlows);
        } catch (err) {
            showAlertModal('Erro', 'Não foi possível carregar os fluxos de canal.');
        } finally {
            setIsLoading(prev => ({ ...prev, flows: false }));
        }
    };
    
    // --- Funções de Manipulação (ainda a serem implementadas) ---
    const handleCreatePage = () => { alert('Funcionalidade "Criar Nova Página" a ser implementada.'); };
    const handleEditPage = (pageId: string) => { alert(`Editar página com ID: ${pageId}`); };
    const handleChangeFlow = (utmContent: string, currentFlow: string) => { alert(`Mudar fluxo de ${utmContent} de ${currentFlow}`); };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Configurador de Campanhas e Inscrições</h1>
                <div className="mt-4 bg-white p-4 rounded-lg shadow-md">
                    <div className="flex items-center gap-2">
                        <label htmlFor="controle-launch-filter" className="font-medium text-slate-700">Selecione o Lançamento:</label>
                        <select id="controle-launch-filter" value={selectedLaunch} onChange={e => setSelectedLaunch(e.target.value)} className="block w-full sm:w-auto px-3 py-2 border border-slate-300 rounded-md text-sm">
                            <option value="">Selecione...</option>
                            {launches.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Seção 1: Gerenciador de Páginas */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-slate-700">1. Páginas de Captura (Conteúdo e Links)</h2>
                    <button onClick={handleCreatePage} disabled={!selectedLaunch} className="bg-slate-800 text-white font-bold py-2 px-3 rounded-lg hover:bg-slate-700 text-xs disabled:opacity-50">
                        <i className="fas fa-plus mr-2"></i>Criar Nova Página
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="border-b-2 border-slate-200">
                            <tr>
                                <th className="p-4 text-left text-xs font-semibold text-slate-500 uppercase">Nome da Página</th>
                                <th className="p-4 text-left text-xs font-semibold text-slate-500 uppercase">Link (Slug)</th>
                                <th className="p-4 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                                <th className="p-4 text-left text-xs font-semibold text-slate-500 uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading.pages ? (
                                <tr><td colSpan={4} className="p-4 text-center"><i className="fas fa-spinner fa-spin"></i> Carregando...</td></tr>
                            ) : pageVariants.length === 0 ? (
                                <tr><td colSpan={4} className="p-4 text-center text-slate-500">Nenhuma página criada para este lançamento.</td></tr>
                            ) : (
                                pageVariants.map(page => (
                                    <tr key={page.id}>
                                        <td className="p-4 font-medium">{page.name}</td>
                                        <td className="p-4 font-mono">/{page.slug}</td>
                                        <td className="p-4"><span className={`px-2 py-1 text-xs rounded-full ${page.status === 'ativo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{page.status}</span></td>
                                        <td className="p-4"><button onClick={() => handleEditPage(page.id)} className="text-blue-600 font-medium">Editar</button></td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Seção 2: Gerenciador de Fluxos */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-lg font-semibold text-slate-700 mb-4">2. Fluxos por Canal (Formulários)</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        {/* ... cabeçalho da tabela de fluxos ... */}

                        <thead className="border-b-2 border-slate-200">
        <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Canal (UTM Content)</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Fluxo Atual</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Ação</th>
        </tr>
    </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading.flows ? (
                                <tr><td colSpan={3} className="p-4 text-center"><i className="fas fa-spinner fa-spin"></i> Carregando...</td></tr>
                            ) : flowSettings.length === 0 ? (
                                <tr><td colSpan={3} className="p-4 text-center text-slate-500">Nenhum canal com tráfego para este lançamento.</td></tr>
                            ) : (
                                flowSettings.map(flow => (
                                    <tr key={flow.utm_content}>
                                        <td className="p-4 font-medium">{flow.utm_content}</td>
                                        <td className="p-4 font-semibold">{flow.flow_type}</td>
                                        <td className="p-4"><button onClick={() => handleChangeFlow(flow.utm_content, flow.flow_type)} className="text-sm bg-slate-200 py-1 px-3 rounded-full">Alterar</button></td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}