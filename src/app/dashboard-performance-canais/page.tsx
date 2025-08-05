// src/app/dashboard-performance-canais/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import toast from 'react-hot-toast';
import { FaSpinner, FaFilter, FaUsers, FaUserCheck, FaGlobe, FaBullseye, FaPercent } from 'react-icons/fa';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Launch } from "@/lib/types";

// --- Tipagens de Dados ---
type KpiSet = { total_geral_inscricoes: number; total_geral_checkins: number; total_filtrado_inscricoes: number; total_filtrado_checkins: number; };
type ChartRow = { name: string; value: number; };
type PerformanceData = { name: string; inscricoes: number; checkins: number; };
type AnalysisData = { kpis: KpiSet; pie_data_medium: ChartRow[] | null; pie_data_content: ChartRow[] | null; table_data: PerformanceData[] | null; };
type UtmOption = string;

// --- Constantes e Componentes ---
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1919', '#4F4FFF', '#8B8B8B'];

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (!percent || (percent * 100) < 3) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
  const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
  return <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="14px" fontWeight="bold">{`${(percent * 100).toFixed(0)}%`}</text>;
};

// CORREÇÃO: Fontes e ícone do KPI Card ajustados para o novo padrão.
const KpiCard = ({ title, value, subTitle, icon: Icon }: { title: string; value: string; subTitle: string; icon: React.ElementType; }) => (
    <div className="bg-white p-4 rounded-lg shadow-md flex items-center gap-4">
        <div className="bg-blue-100 p-3 rounded-full"><Icon className="text-blue-600 text-2xl" /></div>
        <div>
            <p className="text-base text-slate-500">{title}</p>
            <p className="text-3xl font-bold text-slate-800">{value}</p>
            {subTitle && <p className="text-xs text-slate-400">{subTitle}</p>}
        </div>
    </div>
);

const processPieData = (data: ChartRow[], maxSlices = 7): ChartRow[] => {
    if (!data || data.length === 0) return [];
    const sortedData = [...data].sort((a, b) => b.value - a.value);
    if (sortedData.length <= maxSlices) return sortedData;
    const topSlices = sortedData.slice(0, maxSlices);
    const otherSlices = sortedData.slice(maxSlices);
    const othersSum = otherSlices.reduce((acc, slice) => acc + slice.value, 0);
    return [...topSlices, { name: 'Outros', value: othersSum }];
};

const formatLegendText = (value: string) => {
    const maxLength = 30;
    if (value.length > maxLength) {
        return `${value.substring(0, maxLength)}...`;
    }
    return value;
};

const PieChartWithLegend = ({ title, data }: { title: string, data: ChartRow[] }) => (
    <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">{title}</h2>
        <div style={{ width: '100%', height: 450 }}>
            <ResponsiveContainer>
                <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                    <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={130} labelLine={false} label={renderCustomizedLabel}>
                        {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR')} itemStyle={{ fontSize: '14px' }} />
                    <Legend iconSize={12} wrapperStyle={{ fontSize: "14px", lineHeight: "1.8" }} formatter={formatLegendText} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    </div>
);

const PerformanceTable = ({ data }: { data: PerformanceData[] }) => (
    <div className="bg-white rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-slate-700 p-4">Detalhes por Canal</h2>
        <div className="overflow-x-auto">
            <table className="min-w-full text-base">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-500 uppercase tracking-wider">Canal</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-500 uppercase tracking-wider">Inscrições</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-500 uppercase tracking-wider">Check-ins</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-500 uppercase tracking-wider">Taxa de Check-in</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                    {data.length === 0 ? (
                        <tr><td colSpan={4} className="text-center py-10 text-slate-500">Nenhum dado encontrado para esta seleção.</td></tr>
                    ) : (
                        data.map((item) => {
                            const taxa_checkin = item.inscricoes > 0 ? (item.checkins / item.inscricoes) * 100 : 0;
                            return (
                                <tr key={item.name}>
                                    <td className="px-4 py-4 font-medium text-slate-800 truncate" title={item.name}>{item.name}</td>
                                    <td className="px-4 py-4 text-slate-600">{item.inscricoes.toLocaleString('pt-BR')}</td>
                                    <td className="px-4 py-4 text-slate-600">{item.checkins.toLocaleString('pt-BR')}</td>
                                    <td className="px-4 py-4 font-semibold text-blue-600">{taxa_checkin.toFixed(1)}%</td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    </div>
);

export default function PerformanceDashboardPage() {
    const supabase = createClient();
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunch, setSelectedLaunch] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<AnalysisData | null>(null);
    
    const [filters, setFilters] = useState({ source: 'all', medium: 'all', campaign: 'all', content: 'all', term: 'all' });
    const [options, setOptions] = useState<{sources: UtmOption[], mediums: UtmOption[], campaigns: UtmOption[], contents: UtmOption[], terms: UtmOption[]}>({ sources: [], mediums: [], campaigns: [], contents: [], terms: [] });

    useEffect(() => {
        const fetchLaunches = async () => {
            setLoading(true);
            const { data, error } = await supabase.from('lancamentos').select('id, nome, status').in('status', ['Em Andamento', 'Concluído']);
            if (data) {
                const sorted = [...data].sort((a, b) => {
                    if (a.status === 'Em Andamento' && b.status !== 'Em Andamento') return -1;
                    if (a.status !== 'Em Andamento' && b.status === 'Em Andamento') return 1;
                    return b.nome.localeCompare(a.nome);
                });
                setLaunches(sorted as Launch[]);
                const inProgress = sorted.find(l => l.status === 'Em Andamento');
                setSelectedLaunch(inProgress ? inProgress.id : (sorted[0] ? sorted[0].id : ''));
            } else { toast.error("Erro ao buscar lançamentos."); }
            setLoading(false);
        };
        fetchLaunches();
    }, [supabase]);

    const resetAndFetchSources = useCallback(async () => {
        if (!selectedLaunch) return;
        setFilters({ source: 'all', medium: 'all', campaign: 'all', content: 'all', term: 'all' });
        const { data } = await supabase.rpc('get_utm_sources', { p_launch_id: selectedLaunch });
        setOptions({ sources: data?.map((d: { utm_source: string }) => d.utm_source) || [], mediums: [], campaigns: [], contents: [], terms: [] });
    }, [selectedLaunch, supabase]);

    useEffect(() => { resetAndFetchSources(); }, [resetAndFetchSources]);

    useEffect(() => {
        if (!selectedLaunch || filters.source === 'all') { setOptions(prev => ({ ...prev, mediums: [], campaigns: [], contents: [], terms: [] })); return; }
        setFilters(prev => ({ ...prev, medium: 'all', campaign: 'all', content: 'all', term: 'all' }));
        const fetchMediums = async () => {
            const { data } = await supabase.rpc('get_utm_mediums', { p_launch_id: selectedLaunch, p_source: filters.source });
            setOptions(prev => ({ ...prev, mediums: data?.map((d: { utm_medium: string }) => d.utm_medium) || [], campaigns: [], contents: [], terms: [] }));
        };
        fetchMediums();
    }, [filters.source, selectedLaunch, supabase]);

    useEffect(() => {
        if (!selectedLaunch || filters.medium === 'all') { setOptions(prev => ({ ...prev, campaigns: [], contents: [], terms: [] })); return; }
        setFilters(prev => ({ ...prev, campaign: 'all', content: 'all', term: 'all' }));
        const fetchCampaigns = async () => {
            const { data } = await supabase.rpc('get_utm_campaigns', { p_launch_id: selectedLaunch, p_source: filters.source, p_medium: filters.medium });
            setOptions(prev => ({ ...prev, campaigns: data?.map((d: { utm_campaign: string }) => d.utm_campaign) || [], contents: [], terms: [] }));
        };
        fetchCampaigns();
    }, [filters.medium, filters.source, selectedLaunch, supabase]);

    useEffect(() => {
        if (!selectedLaunch || filters.campaign === 'all') { setOptions(prev => ({ ...prev, contents: [], terms: [] })); return; }
        setFilters(prev => ({ ...prev, content: 'all', term: 'all' }));
        const fetchContents = async () => {
             const { data } = await supabase.rpc('get_utm_contents', { p_launch_id: selectedLaunch, p_source: filters.source, p_medium: filters.medium, p_campaign: filters.campaign });
             setOptions(prev => ({ ...prev, contents: data?.map((d: { utm_content: string }) => d.utm_content) || [], terms: [] }));
        };
        fetchContents();
    }, [filters.campaign, filters.medium, filters.source, selectedLaunch, supabase]);

    useEffect(() => {
        if (!selectedLaunch || filters.content === 'all') { setOptions(prev => ({ ...prev, terms: [] })); return; }
        setFilters(prev => ({ ...prev, term: 'all' }));
        const fetchTerms = async () => {
            const { data } = await supabase.rpc('get_utm_terms', { p_launch_id: selectedLaunch, p_source: filters.source, p_medium: filters.medium, p_campaign: filters.campaign, p_content: filters.content });
            setOptions(prev => ({ ...prev, terms: data?.map((d: { utm_term: string }) => d.utm_term) || [] }));
        };
        fetchTerms();
    }, [filters.content, filters.campaign, filters.medium, filters.source, selectedLaunch, supabase]);

    const fetchData = useCallback(async () => {
        if (!selectedLaunch) return;
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_performance_canais_data', {
                p_launch_id: selectedLaunch,
                p_utm_source: filters.source === 'all' ? null : filters.source,
                p_utm_medium: filters.medium === 'all' ? null : filters.medium,
                p_utm_campaign: filters.campaign === 'all' ? null : filters.campaign,
                p_utm_content: filters.content === 'all' ? null : filters.content,
                p_utm_term: filters.term === 'all' ? null : filters.term,
            });
            if (error) throw error;
            setData(data);
        } catch (err: any) { toast.error(`Erro ao carregar dados: ${err.message}`); } 
        finally { setLoading(false); }
    }, [selectedLaunch, filters, supabase]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const kpis = data?.kpis;
    const taxaCheckinGeral = (kpis && kpis.total_geral_inscricoes > 0) ? ((kpis.total_geral_checkins / kpis.total_geral_inscricoes) * 100) : 0;
    const taxaCheckinFiltrado = (kpis && kpis.total_filtrado_inscricoes > 0) ? ((kpis.total_filtrado_checkins / kpis.total_filtrado_inscricoes) * 100) : 0;
    
    const handleFilterChange = (level: keyof typeof filters, value: string) => setFilters(prev => ({ ...prev, [level]: value }));

    const processedMediumData = processPieData(data?.pie_data_medium || []);
    const processedContentData = processPieData(data?.pie_data_content || []);

    return (
        <div className="space-y-6 p-4 md:p-6 bg-slate-50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Performance de Canais</h1>
                <div className="bg-white p-2 rounded-lg shadow-md w-full md:w-auto">
                    <select value={selectedLaunch} onChange={e => setSelectedLaunch(e.target.value)} className="w-full px-3 py-2 border-none rounded-md focus:ring-0 bg-transparent" disabled={loading}>
                        {launches.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.status})</option>)}
                    </select>
                </div>
            </div>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-200 p-4 rounded-lg space-y-3">
                    <h3 className="font-bold text-center text-slate-600">Totais do Lançamento</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <KpiCard title="Inscrições" value={(kpis?.total_geral_inscricoes ?? 0).toLocaleString('pt-BR')} subTitle="Total no lançamento" icon={FaGlobe}/>
                        <KpiCard title="Check-ins" value={(kpis?.total_geral_checkins ?? 0).toLocaleString('pt-BR')} subTitle="Total no lançamento" icon={FaBullseye}/>
                        <KpiCard title="Taxa Check-in" value={`${taxaCheckinGeral.toFixed(1)}%`} subTitle="Inscrições x Check-ins" icon={FaPercent}/>
                    </div>
                </div>
                <div className="bg-slate-200 p-4 rounded-lg space-y-3">
                    <h3 className="font-bold text-center text-slate-600">Totais da Seleção</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <KpiCard title="Inscrições" value={(kpis?.total_filtrado_inscricoes ?? 0).toLocaleString('pt-BR')} subTitle="Resultado do filtro" icon={FaUsers}/>
                        <KpiCard title="Check-ins" value={(kpis?.total_filtrado_checkins ?? 0).toLocaleString('pt-BR')} subTitle="Resultado do filtro" icon={FaUserCheck}/>
                        <KpiCard title="Taxa Check-in" value={`${taxaCheckinFiltrado.toFixed(1)}%`} subTitle="Filtro x Check-ins" icon={FaPercent}/>
                    </div>
                </div>
            </section>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center gap-2 mb-4"><FaFilter className="text-blue-600"/><h2 className="text-lg font-semibold text-slate-700">Filtros de Performance</h2></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {Object.keys(filters).map((key, index) => (
                        <div key={key}>
                            <label className="block text-sm font-medium text-slate-700 mb-1 capitalize">{`UTM ${key}`}</label>
                            <select 
                                value={filters[key as keyof typeof filters]} 
                                onChange={e => handleFilterChange(key as keyof typeof filters, e.target.value)} 
                                className="w-full p-2 text-base border-gray-300 rounded-md" 
                                disabled={loading || (index > 0 && filters[(Object.keys(filters)[index-1]) as keyof typeof filters] === 'all')}>
                                <option value="all">Todos</option>
                                {options[`${key}s` as keyof typeof options]?.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                    ))}
                </div>
            </div>

            {loading ? <div className="text-center py-10"><FaSpinner className="animate-spin text-blue-600 text-3xl mx-auto" /></div> : (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <PieChartWithLegend title="Inscrições por Mídia (UTM Medium)" data={processedMediumData} />
                        <PieChartWithLegend title="Inscrições por Conteúdo (UTM Content)" data={processedContentData} />
                    </div>
                    <PerformanceTable data={data?.table_data || []} />
                </div>
            )}
        </div>
    );
}
