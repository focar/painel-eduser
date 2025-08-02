// src/app/dashboard-campanhas-criativos/page.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '../../utils/supabase/client';
import { FaSpinner, FaSearch } from 'react-icons/fa';
import { Users, UserCheck, DollarSign, Target, Percent } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// --- Tipos de Dados ---
type Launch = { id: string; nome: string; status: string; };
type CampaignFilterData = {
    campaign: string;
    terms: string[];
};
type PerformanceResult = {
    utm_campaign: string;
    utm_term: string;
    inscritos: number;
    checkins: number;
};
type KpiData = {
    totalInscricoes: number;
    totalCheckins: number;
    paidInscricoes: number;
    paidCheckins: number;
};

// --- Componentes ---
const LoadingSpinner = () => <div className="flex justify-center items-center p-10"><FaSpinner className="animate-spin text-blue-600 text-4xl" /></div>;
const KpiCard = ({ title, value, icon: Icon }: { title: string; value: string; icon: React.ElementType; }) => (
    <div className="bg-slate-50 p-4 rounded-lg text-center flex flex-col justify-center h-full">
        <Icon className="mx-auto text-blue-600 mb-2" size={24} />
        <p className="text-3xl font-bold text-slate-800">{value}</p>
        <h3 className="text-sm font-medium text-slate-500 mt-1">{title}</h3>
    </div>
);

export default function CampanhasCriativosPage() {
    const supabase = createClient();

    // --- Estados ---
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunchId, setSelectedLaunchId] = useState<string | null>(null);
    const [kpis, setKpis] = useState<KpiData>({ totalInscricoes: 0, totalCheckins: 0, paidInscricoes: 0, paidCheckins: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);

    // Filtros
    const [campaignFilters, setCampaignFilters] = useState<CampaignFilterData[]>([]);
    const [selectedCampaign, setSelectedCampaign] = useState<string>('');
    const [selectedTerm, setSelectedTerm] = useState<string>('');

    // Resultados
    const [performanceData, setPerformanceData] = useState<PerformanceResult[]>([]);

    // --- Busca de Dados Iniciais ---
    useEffect(() => {
        const fetchLaunches = async () => {
            setIsLoading(true);
            const { data, error } = await supabase.from('lancamentos').select('id, nome, status').in('status', ['Em Andamento', 'Concluído', 'Planejado']);
            if (error) { toast.error('Falha ao carregar lançamentos.'); return; }
            if (data && data.length > 0) {
                const statusOrder: { [key: string]: number } = { 'Em Andamento': 1, 'Planejado': 2, 'Concluído': 3 };
                const sorted = data.sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || a.nome.localeCompare(b.nome));
                setLaunches(sorted);
                const inProgress = sorted.find(l => l.status === 'Em Andamento');
                setSelectedLaunchId(inProgress ? inProgress.id : sorted[0].id);
            } else {
                setIsLoading(false);
            }
        };
        fetchLaunches();
    }, [supabase]);

    // --- Busca de Dados para os Filtros e KPIs quando o lançamento muda ---
    useEffect(() => {
        if (!selectedLaunchId) return;

        let isActive = true;
        const fetchFilterData = async () => {
            setIsLoading(true);
            setCampaignFilters([]);
            setPerformanceData([]);
            setSelectedCampaign('');
            setSelectedTerm('');

            const { data: filterData, error: filterError } = await supabase.rpc('get_filtros_campanha', { launch_id_param: selectedLaunchId });
            const { data: kpiData, error: kpiError } = await supabase.rpc('get_kpis_campanha', { launch_id_param: selectedLaunchId });

            if (!isActive) return;

            if (filterError || kpiError) {
                toast.error('Falha ao carregar dados do lançamento.');
            } else {
                setCampaignFilters(filterData || []);
                setKpis(kpiData || { totalInscricoes: 0, totalCheckins: 0, paidInscricoes: 0, paidCheckins: 0 });
            }
            setIsLoading(false);
        };

        fetchFilterData();

        return () => { isActive = false; };
    }, [selectedLaunchId, supabase]);

    // --- Lógica de Filtros em Cascata ---
    const availableTerms = useMemo(() => {
        if (!selectedCampaign) {
            const allTerms = new Set<string>();
            campaignFilters.forEach(cf => cf.terms?.forEach(term => allTerms.add(term)));
            return Array.from(allTerms).sort();
        }
        const campaign = campaignFilters.find(cf => cf.campaign === selectedCampaign);
        return campaign?.terms?.sort() || [];
    }, [selectedCampaign, campaignFilters]);

    // --- Função de Pesquisa ---
    const handleSearch = useCallback(async () => {
        if (!selectedLaunchId) return;
        setIsSearching(true);
        setPerformanceData([]);

        const { data, error } = await supabase.rpc('get_performance_campanha', {
            launch_id_param: selectedLaunchId,
            campaign_filter: selectedCampaign,
            term_filter: selectedTerm
        });

        if (error) {
            toast.error('Erro ao realizar a pesquisa.');
        } else {
            setPerformanceData(data || []);
        }
        setIsSearching(false);
    }, [selectedLaunchId, selectedCampaign, selectedTerm, supabase]);

    const taxaCheckinPago = kpis.paidInscricoes > 0 ? (kpis.paidCheckins / kpis.paidInscricoes) * 100 : 0;

    return (
        <>
            <Toaster position="top-center" />
            <div className="p-4 md:p-8 space-y-6 bg-slate-100 min-h-screen">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center">
                    <h1 className="text-3xl font-bold text-gray-900 mb-4 md:mb-0">Análise de Campanhas e Criativos</h1>
                    <select value={selectedLaunchId || ''} onChange={(e) => setSelectedLaunchId(e.target.value)} disabled={isLoading} className="w-full md:w-72 bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 disabled:opacity-50">
                        {launches.map((launch) => (<option key={launch.id} value={launch.id}> {launch.nome} ({launch.status}) </option>))}
                    </select>
                </header>

                {isLoading ? <LoadingSpinner /> : (
                    <main className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white p-4 rounded-xl shadow-lg flex flex-col gap-4">
                                <h2 className="text-lg font-semibold text-slate-700 text-center">Totais Gerais do Lançamento</h2>
                                <div className="grid grid-cols-2 gap-4">
                                    <KpiCard title="Total Inscrições" value={kpis.totalInscricoes.toLocaleString('pt-BR')} icon={Users} />
                                    <KpiCard title="Total Check-ins" value={kpis.totalCheckins.toLocaleString('pt-BR')} icon={UserCheck} />
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-lg flex flex-col gap-4">
                                <h2 className="text-lg font-semibold text-slate-700 text-center">Performance do Tráfego Pago</h2>
                                <div className="grid grid-cols-3 gap-4">
                                    <KpiCard title="Inscrições Pagas" value={kpis.paidInscricoes.toLocaleString('pt-BR')} icon={DollarSign} />
                                    <KpiCard title="Check-ins Pagos" value={kpis.paidCheckins.toLocaleString('pt-BR')} icon={Target} />
                                    <KpiCard title="Taxa de Check-in" value={`${taxaCheckinPago.toFixed(1)}%`} icon={Percent} />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
                            <h2 className="text-lg font-semibold text-slate-700">Filtros de Performance</h2>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                                <div className="flex flex-col md:col-span-2">
                                    <label htmlFor="campaign" className="text-sm font-medium text-slate-600 mb-1">UTM Campaign</label>
                                    <select id="campaign" value={selectedCampaign} onChange={e => { setSelectedCampaign(e.target.value); setSelectedTerm(''); }} className="bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3">
                                        <option value="">Todas as Campanhas</option>
                                        {campaignFilters.map(cf => <option key={cf.campaign} value={cf.campaign}>{cf.campaign}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col md:col-span-2">
                                    <label htmlFor="term" className="text-sm font-medium text-slate-600 mb-1">UTM Term (Criativo)</label>
                                    <select id="term" value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)} className="bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3">
                                        <option value="">Todos os Criativos</option>
                                        {availableTerms.map(term => <option key={term} value={term}>{term}</option>)}
                                    </select>
                                </div>
                                <button onClick={handleSearch} disabled={isSearching} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50 md:col-span-1">
                                    {isSearching ? <FaSpinner className="animate-spin" /> : <FaSearch />}
                                    <span>{isSearching ? 'Pesquisando...' : 'Pesquisar'}</span>
                                </button>
                            </div>
                        </div>

                        {(performanceData.length > 0) && (
                             <div className="bg-white p-6 rounded-lg shadow-md">
                                <h2 className="text-lg font-semibold text-slate-700 mb-4">Resultados da Pesquisa</h2>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-slate-50 text-slate-600 font-medium">
                                            <tr>
                                                <th className="px-4 py-3 text-left">UTM Campaign</th>
                                                <th className="px-4 py-3 text-left">UTM Term (Criativo)</th>
                                                <th className="px-4 py-3 text-right">Inscritos</th>
                                                <th className="px-4 py-3 text-right">Check-ins</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {(() => {
                                                let lastCampaign = '';
                                                return performanceData.map((row, index) => {
                                                    const showCampaign = row.utm_campaign !== lastCampaign;
                                                    lastCampaign = row.utm_campaign;
                                                    return (
                                                        <tr key={index}>
                                                            <td className={`px-4 py-4 ${showCampaign ? 'font-bold' : ''}`}>
                                                                {showCampaign ? row.utm_campaign : ''}
                                                            </td>
                                                            <td className="px-4 py-4">{row.utm_term}</td>
                                                            <td className="px-4 py-4 text-right">{row.inscritos.toLocaleString('pt-BR')}</td>
                                                            <td className="px-4 py-4 text-right">{row.checkins.toLocaleString('pt-BR')}</td>
                                                        </tr>
                                                    );
                                                });
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </main>
                )}
            </div>
        </>
    );
}
