'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { showAlertModal } from '@/lib/modals';
import { FaSpinner } from 'react-icons/fa';

// --- Tipos de Dados ---
type Launch = { id: string; nome: string; status: string; }; // Adicionado 'status' ao tipo
type PageVariant = { id: string; name: string; slug: string | null; status: string | null; };
type FlowSetting = { utm_content: string; flow_type: string; };

export default function ControleInscricoesPage() {
    const supabase = createClient();
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunch, setSelectedLaunch] = useState<string>('');
    const [pageVariants, setPageVariants] = useState<PageVariant[]>([]);
    const [flowSettings, setFlowSettings] = useState<FlowSetting[]>([]);
    const [isLoading, setIsLoading] = useState({ pages: true, flows: true });

    // --- Hooks de Efeito ---
    useEffect(() => {
        const fetchLaunches = async () => {
            // ### INÍCIO DA CORREÇÃO ###
            // 1. A busca agora inclui o 'status'
            const { data, error } = await supabase.from("lancamentos").select("id, nome, status");
            
            if (error) {
                console.error("Erro ao buscar lançamentos:", error);
                setLaunches([]);
            } else if (data) {
                // 2. Filtra e ordena a lista para seguir o padrão
                const statusOrder: { [key: string]: number } = { 'Em Andamento': 1, 'Concluído': 2 };
                const filteredAndSorted = data
                    .filter(launch => launch.status === 'Em Andamento' || launch.status === 'Concluído')
                    .sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
                
                setLaunches(filteredAndSorted);
                if (filteredAndSorted.length > 0) {
                    setSelectedLaunch(filteredAndSorted[0].id);
                }
            }
            // ### FIM DA CORREÇÃO ###
        };
        fetchLaunches();
    }, [supabase]);

    const loadPagesForLaunch = useCallback(async (launchId: string) => {
        setIsLoading(prev => ({ ...prev, pages: true }));
        try {
            const { data, error } = await supabase.from('page_variants').select('id, name, slug, status').eq('launch_id', launchId).order('name');
            if (error) throw error;
            setPageVariants(data || []);
        } catch (err) {
            showAlertModal('Erro', 'Não foi possível carregar as páginas de captura.');
        } finally {
            setIsLoading(prev => ({ ...prev, pages: false }));
        }
    }, [supabase]);

    const loadChannelsForLaunch = useCallback(async (launchId: string) => {
        setIsLoading(prev => ({ ...prev, flows: true }));
        try {
            const { data: leads, error: leadsError } = await supabase.from('leads').select('utm_content').eq('launch_id', launchId).not('utm_content', 'is', null);
            if (leadsError) throw leadsError;

            const { data: settings, error: settingsError } = await supabase.from('campaign_settings').select('utm_content, flow_type').eq('launch_id', launchId);
            if (settingsError) throw settingsError;

            const uniqueChannels = [...new Set(leads.map(l => l.utm_content))];
            const settingsMap = new Map(settings.map(s => [s.utm_content, s.flow_type]));
            
        const channelFlows = uniqueChannels
            .filter((channel): channel is string => channel !== null && channel !== undefined) // <-- Adiciona este filtro
            .map(channel => ({
                utm_content: channel, // Agora 'channel' é garantidamente uma string
                flow_type: settingsMap.get(channel) || 'composto'
        }));

            setFlowSettings(channelFlows);
        } catch (err) {
            showAlertModal('Erro', 'Não foi possível carregar os fluxos de canal.');
        } finally {
            setIsLoading(prev => ({ ...prev, flows: false }));
        }
    }, [supabase]);

    useEffect(() => {
        if (!selectedLaunch) {
            setIsLoading({ pages: false, flows: false });
            setPageVariants([]);
            setFlowSettings([]);
            return;
        }
        loadPagesForLaunch(selectedLaunch);
        loadChannelsForLaunch(selectedLaunch);
    }, [selectedLaunch, loadPagesForLaunch, loadChannelsForLaunch]);

    const handleCreatePage = () => { alert('Funcionalidade "Criar Nova Página" a ser implementada.'); };
    const handleEditPage = (pageId: string) => { alert(`Editar página com ID: ${pageId}`); };
    const handleChangeFlow = (utmContent: string, currentFlow: string) => { alert(`Mudar fluxo de ${utmContent} de ${currentFlow}`); };

    return (
        <div className="space-y-8 p-4 md:p-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Configurador de Campanhas e Inscrições</h1>
                <div className="mt-4 bg-white p-4 rounded-lg shadow-md">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <label htmlFor="controle-launch-filter" className="font-medium text-slate-700 shrink-0">Selecione o Lançamento:</label>
                        <select id="controle-launch-filter" value={selectedLaunch} onChange={e => setSelectedLaunch(e.target.value)} className="block w-full sm:w-auto px-3 py-2 border border-slate-300 rounded-md text-sm">
                            <option value="">Selecione...</option>
                            {/* CORREÇÃO: Exibe nome e status no dropdown */}
                            {launches.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.status})</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Seção 1: Gerenciador de Páginas */}
            <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                    <h2 className="text-lg font-semibold text-slate-700">1. Páginas de Captura</h2>
                    <button onClick={handleCreatePage} disabled={!selectedLaunch} className="bg-slate-800 text-white font-bold py-2 px-3 rounded-lg hover:bg-slate-700 text-xs disabled:opacity-50 w-full sm:w-auto">
                        <i className="fas fa-plus mr-2"></i>Criar Nova Página
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="border-b-2 border-slate-200 hidden md:table-header-group">
                            <tr>
                                <th className="p-4 text-left text-xs font-semibold text-slate-500 uppercase">Nome da Página</th>
                                <th className="p-4 text-left text-xs font-semibold text-slate-500 uppercase">Link (Slug)</th>
                                <th className="p-4 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                                <th className="p-4 text-left text-xs font-semibold text-slate-500 uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 md:divide-y-0">
                            {isLoading.pages ? (
                                <tr><td colSpan={4} className="p-4 text-center"><FaSpinner className="animate-spin text-blue-600 text-2xl mx-auto" /></td></tr>
                            ) : pageVariants.length === 0 ? (
                                <tr><td colSpan={4} className="p-4 text-center text-slate-500">Nenhuma página criada para este lançamento.</td></tr>
                            ) : (
                                pageVariants.map(page => (
                                    <tr key={page.id} className="block md:table-row border rounded-lg mb-4 md:border-none md:mb-0 md:border-b">
                                        <td className="p-3 md:p-4 font-medium" data-label="Nome: "><span className="md:hidden font-bold text-slate-500">Nome: </span>{page.name}</td>
                                        <td className="p-3 md:p-4 font-mono" data-label="Link: "><span className="md:hidden font-bold text-slate-500">Link: </span>/{page.slug}</td>
                                        <td className="p-3 md:p-4" data-label="Status: "><span className="md:hidden font-bold text-slate-500">Status: </span><span className={`px-2 py-1 text-xs rounded-full ${page.status === 'ativo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{page.status}</span></td>
                                        <td className="p-3 md:p-4" data-label="Ações: "><span className="md:hidden font-bold text-slate-500">Ações: </span><button onClick={() => handleEditPage(page.id)} className="text-blue-600 font-medium">Editar</button></td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Seção 2: Gerenciador de Fluxos */}
            <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
                <h2 className="text-lg font-semibold text-slate-700 mb-4">2. Fluxos por Canal (Formulários)</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="border-b-2 border-slate-200 hidden md:table-header-group">
                            <tr>
                                <th className="p-4 text-left text-xs font-semibold text-slate-500 uppercase">Canal (UTM Content)</th>
                                <th className="p-4 text-left text-xs font-semibold text-slate-500 uppercase">Fluxo Atual</th>
                                <th className="p-4 text-left text-xs font-semibold text-slate-500 uppercase">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 md:divide-y-0">
                            {isLoading.flows ? (
                                <tr><td colSpan={3} className="p-4 text-center"><FaSpinner className="animate-spin text-blue-600 text-2xl mx-auto" /></td></tr>
                            ) : flowSettings.length === 0 ? (
                                <tr><td colSpan={3} className="p-4 text-center text-slate-500">Nenhum canal com tráfego para este lançamento.</td></tr>
                            ) : (
                                flowSettings.map(flow => (
                                    <tr key={flow.utm_content} className="block md:table-row border rounded-lg mb-4 md:border-none md:mb-0 md:border-b">
                                        <td className="p-3 md:p-4 font-medium" data-label="Canal: "><span className="md:hidden font-bold text-slate-500">Canal: </span>{flow.utm_content}</td>
                                        <td className="p-3 md:p-4 font-semibold" data-label="Fluxo Atual: "><span className="md:hidden font-bold text-slate-500">Fluxo Atual: </span>{flow.flow_type}</td>
                                        <td className="p-3 md:p-4"><button onClick={() => handleChangeFlow(flow.utm_content, flow.flow_type)} className="text-sm bg-slate-200 hover:bg-slate-300 py-1 px-3 rounded-full font-medium">Alterar</button></td>
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