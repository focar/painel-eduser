// src/app/dashboard-evolucao-canal/page.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { subDays, startOfDay, endOfDay, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FaSpinner, FaFilter, FaUsers, FaUserCheck, FaChevronDown, FaChevronRight, FaGlobe, FaBullseye, FaPercent } from 'react-icons/fa';
import toast from 'react-hot-toast';
import type { Launch } from "@/lib/types";

// --- Tipos de Dados ---
type KpiSet = { total_geral_inscricoes: number; total_geral_checkins: number; total_filtrado_inscricoes: number; total_filtrado_checkins: number; };
type ChartDataPoint = { name: string; Inscrições: number; 'Check-ins': number; };
type HourlyDetail = { hora: number; inscricoes: number; checkins: number; };
type TableRow = { dia: string; total_inscricoes: number; total_checkins: number; hourly_details: HourlyDetail[]; };
type AnalysisData = { kpis: KpiSet; overview_chart_data: ChartDataPoint[] | null; period_chart_data: any[] | null; table_data: TableRow[] | null; };
type Period = 'Hoje' | 'Ontem' | '7 Dias' | '14 Dias' | '30 Dias' | '45 Dias' | 'Todos';
type UtmOption = string;

// --- Componentes ---
const KpiCard = ({ title, value, subTitle, icon: Icon }: { title: string; value: string; subTitle: string; icon: React.ElementType; }) => (
    <div className="p-4 bg-white rounded-lg shadow-md flex items-center gap-4">
        <div className="bg-blue-100 p-3 rounded-full"><Icon className="text-blue-600 text-xl" /></div>
        <div>
            <p className="text-sm text-slate-500">{title}</p>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            <p className="text-xs text-slate-400">{subTitle}</p>
        </div>
    </div>
);

export default function EvolucaoCanalPage() {
    const supabase = createClient();
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunchId, setSelectedLaunchId] = useState<string>('');
    const [period, setPeriod] = useState<Period>('Hoje');
    const [data, setData] = useState<AnalysisData | null>(null);
    const [loadingLaunches, setLoadingLaunches] = useState(true);
    const [loadingData, setLoadingData] = useState(true);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    
    const [filters, setFilters] = useState({ source: 'all', medium: 'all', campaign: 'all', content: 'all', term: 'all' });
    const [options, setOptions] = useState<{sources: UtmOption[], mediums: UtmOption[], campaigns: UtmOption[], contents: UtmOption[], terms: UtmOption[]}>({ sources: [], mediums: [], campaigns: [], contents: [], terms: [] });

    const toggleRow = (key: string) => setExpandedRows(prev => {
        const newSet = new Set(prev);
        newSet.has(key) ? newSet.delete(key) : newSet.add(key);
        return newSet;
    });

    useEffect(() => {
        const fetchLaunches = async () => {
            setLoadingLaunches(true);
            const { data, error } = await supabase.rpc('get_lancamentos_permitidos');
            if (data) {
                const sorted = [...data].sort((a, b) => {
                    if (a.status === 'Em Andamento' && b.status !== 'Em Andamento') return -1;
                    if (a.status !== 'Em Andamento' && b.status === 'Em Andamento') return 1;
                    return b.nome.localeCompare(a.nome);
                });
                setLaunches(sorted as Launch[]);
                const inProgress = sorted.find(l => l.status === 'Em Andamento');
                setSelectedLaunchId(inProgress ? inProgress.id : (sorted[0] ? sorted[0].id : ''));
            } else if (error) { toast.error("Erro ao buscar lançamentos."); }
            setLoadingLaunches(false);
        };
        fetchLaunches();
    }, [supabase]);

    const resetAndFetchSources = useCallback(async () => {
        if (!selectedLaunchId) return;
        setFilters({ source: 'all', medium: 'all', campaign: 'all', content: 'all', term: 'all' });
        const { data } = await supabase.rpc('get_utm_sources', { p_launch_id: selectedLaunchId });
        // CORREÇÃO: Adicionada a tipagem para o parâmetro 'd'
        setOptions({ sources: data?.map((d: { utm_source: string }) => d.utm_source) || [], mediums: [], campaigns: [], contents: [], terms: [] });
    }, [selectedLaunchId, supabase]);

    useEffect(() => { resetAndFetchSources(); }, [resetAndFetchSources]);
    
    useEffect(() => {
        if (!selectedLaunchId || filters.source === 'all') { setOptions(prev => ({ ...prev, mediums: [], campaigns: [], contents: [], terms: [] })); return; }
        setFilters(prev => ({ ...prev, medium: 'all', campaign: 'all', content: 'all', term: 'all' }));
        const fetchMediums = async () => {
            const { data } = await supabase.rpc('get_utm_mediums', { p_launch_id: selectedLaunchId, p_source: filters.source });
            // CORREÇÃO: Adicionada a tipagem para o parâmetro 'd'
            setOptions(prev => ({ ...prev, mediums: data?.map((d: { utm_medium: string }) => d.utm_medium) || [], campaigns: [], contents: [], terms: [] }));
        };
        fetchMediums();
    }, [filters.source, selectedLaunchId, supabase]);

    useEffect(() => {
        if (!selectedLaunchId || filters.medium === 'all') { setOptions(prev => ({ ...prev, campaigns: [], contents: [], terms: [] })); return; }
        setFilters(prev => ({ ...prev, campaign: 'all', content: 'all', term: 'all' }));
        const fetchCampaigns = async () => {
            const { data } = await supabase.rpc('get_utm_campaigns', { p_launch_id: selectedLaunchId, p_source: filters.source, p_medium: filters.medium });
            // CORREÇÃO: Adicionada a tipagem para o parâmetro 'd'
            setOptions(prev => ({ ...prev, campaigns: data?.map((d: { utm_campaign: string }) => d.utm_campaign) || [], contents: [], terms: [] }));
        };
        fetchCampaigns();
    }, [filters.medium, filters.source, selectedLaunchId, supabase]);

    useEffect(() => {
        if (!selectedLaunchId || filters.campaign === 'all') { setOptions(prev => ({ ...prev, contents: [], terms: [] })); return; }
        setFilters(prev => ({ ...prev, content: 'all', term: 'all' }));
        const fetchContents = async () => {
             const { data } = await supabase.rpc('get_utm_contents', { p_launch_id: selectedLaunchId, p_source: filters.source, p_medium: filters.medium, p_campaign: filters.campaign });
             // CORREÇÃO: Adicionada a tipagem para o parâmetro 'd'
             setOptions(prev => ({ ...prev, contents: data?.map((d: { utm_content: string }) => d.utm_content) || [], terms: [] }));
        };
        fetchContents();
    }, [filters.campaign, filters.medium, filters.source, selectedLaunchId, supabase]);

    useEffect(() => {
        if (!selectedLaunchId || filters.content === 'all') { setOptions(prev => ({ ...prev, terms: [] })); return; }
        setFilters(prev => ({ ...prev, term: 'all' }));
        const fetchTerms = async () => {
            const { data } = await supabase.rpc('get_utm_terms', { p_launch_id: selectedLaunchId, p_source: filters.source, p_medium: filters.medium, p_campaign: filters.campaign, p_content: filters.content });
            // CORREÇÃO: Adicionada a tipagem para o parâmetro 'd'
            setOptions(prev => ({ ...prev, terms: data?.map((d: { utm_term: string }) => d.utm_term) || [] }));
        };
        fetchTerms();
    }, [filters.content, filters.campaign, filters.medium, filters.source, selectedLaunchId, supabase]);

    const fetchData = useCallback(async () => {
        if (!selectedLaunchId) return;
        setLoadingData(true);
        try {
            const now = new Date();
            let startDate: Date, endDate: Date = endOfDay(now);
            switch (period) {
                case 'Hoje': startDate = startOfDay(now); break;
                case 'Ontem': startDate = startOfDay(subDays(now, 1)); endDate = endOfDay(subDays(now, 1)); break;
                case '7 Dias': startDate = startOfDay(subDays(now, 6)); break;
                case '14 Dias': startDate = startOfDay(subDays(now, 13)); break;
                case '30 Dias': startDate = startOfDay(subDays(now, 29)); break;
                case '45 Dias': startDate = startOfDay(subDays(now, 44)); break;
                case 'Todos': startDate = new Date(2000, 0, 1); break;
            }
            const { data: result, error } = await supabase.rpc('get_evolution_dashboard_data', {
                p_launch_id: selectedLaunchId, p_start_date: startDate.toISOString(), p_end_date: endDate.toISOString(),
                p_utm_source: filters.source === 'all' ? null : filters.source,
                p_utm_medium: filters.medium === 'all' ? null : filters.medium,
                p_utm_campaign: filters.campaign === 'all' ? null : filters.campaign,
                p_utm_content: filters.content === 'all' ? null : filters.content,
                p_utm_term: filters.term === 'all' ? null : filters.term,
            });
            if (error) throw error;
            setData(result);
        } catch (err: any) { toast.error(`Erro ao carregar dados: ${err.message}`); } 
        finally { setLoadingData(false); }
    }, [selectedLaunchId, period, filters, supabase]);

    useEffect(() => { fetchData(); }, [fetchData]);
    
    const kpis = data?.kpis;
    // CORREÇÃO: Verificação adicionada para garantir que 'kpis' não seja undefined
    const taxaCheckinGeral = (kpis && kpis.total_geral_inscricoes > 0) ? ((kpis.total_geral_checkins / kpis.total_geral_inscricoes) * 100) : 0;
    const taxaCheckinFiltrado = (kpis && kpis.total_filtrado_inscricoes > 0) ? ((kpis.total_filtrado_checkins / kpis.total_filtrado_inscricoes) * 100) : 0;

    const handleFilterChange = (level: keyof typeof filters, value: string) => setFilters(prev => ({ ...prev, [level]: value }));
    
    return (
        <div className="p-4 md:p-6 space-y-6 bg-slate-50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Evolução de Canal</h1>
                <div className="bg-white p-2 rounded-lg shadow-md w-full md:w-auto">
                    <select value={selectedLaunchId || ''} onChange={(e) => setSelectedLaunchId(e.target.value)} className="w-full px-3 py-2 border-none rounded-md focus:ring-0 bg-transparent" disabled={loadingLaunches}>
                        {launches.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.status})</option>)}
                    </select>
                </div>
            </div>
            
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-lg shadow-md space-y-3">
                    <h3 className="font-bold text-center text-slate-600">Totais do Lançamento</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <KpiCard title="Inscrições" value={(kpis?.total_geral_inscricoes ?? 0).toLocaleString('pt-BR')} subTitle="Total no lançamento" icon={FaGlobe}/>
                        <KpiCard title="Check-ins" value={(kpis?.total_geral_checkins ?? 0).toLocaleString('pt-BR')} subTitle="Total no lançamento" icon={FaBullseye}/>
                        <KpiCard title="Taxa Check-in" value={`${taxaCheckinGeral.toFixed(1)}%`} subTitle="Inscrições x Check-ins" icon={FaPercent}/>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-md space-y-3">
                    <h3 className="font-bold text-center text-slate-600">Totais do Filtro</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <KpiCard title="Inscrições" value={(kpis?.total_filtrado_inscricoes ?? 0).toLocaleString('pt-BR')} subTitle="Resultado do filtro" icon={FaUsers}/>
                        <KpiCard title="Check-ins" value={(kpis?.total_filtrado_checkins ?? 0).toLocaleString('pt-BR')} subTitle="Resultado do filtro" icon={FaUserCheck}/>
                        <KpiCard title="Taxa Check-in" value={`${taxaCheckinFiltrado.toFixed(1)}%`} subTitle="Filtro x Check-ins" icon={FaPercent}/>
                    </div>
                </div>
            </section>
            
            <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
                <div className="flex items-center gap-2"><FaFilter className="text-blue-600"/><h2 className="text-lg font-semibold text-slate-700">Filtros</h2></div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Período</label>
                        <div className="flex flex-wrap items-center gap-2">
                            {(['Hoje', 'Ontem', '7 Dias', '14 Dias', '30 Dias', '45 Dias', 'Todos'] as Period[]).map(p => (
                                <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-2 rounded-md text-sm font-semibold transition-colors ${period === p ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>{p}</button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full pt-4 border-t mt-4">
                        {Object.keys(filters).map((key, index) => (
                            <div key={key}>
                                <label className="block text-sm font-medium text-slate-700 mb-1 capitalize">{`UTM ${key}`}</label>
                                <select 
                                    value={filters[key as keyof typeof filters]} 
                                    onChange={e => handleFilterChange(key as keyof typeof filters, e.target.value)} 
                                    className="w-full p-2 text-base border-gray-300 rounded-md" 
                                    disabled={loadingData || (index > 0 && filters[(Object.keys(filters)[index-1]) as keyof typeof filters] === 'all')}>
                                    <option value="all">Todos</option>
                                    {/* CORREÇÃO: Removido o tipo explícito 'any' */}
                                    {options[`${key}s` as keyof typeof options]?.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {loadingData ? <div className="text-center py-10"><FaSpinner className="animate-spin text-blue-600 text-3xl mx-auto" /></div> : (
                <div className="space-y-6">
                    <div className="bg-white p-4 rounded-lg shadow"><h3 className="text-lg font-semibold text-gray-700 mb-4">Visão Geral do Lançamento (por Dia)</h3><div style={{height: '400px'}}><ResponsiveContainer width="100%" height="100%"><BarChart data={data?.overview_chart_data || []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="Inscrições" fill="#4e79a7" /><Bar dataKey="Check-ins" fill="#59a14f" /></BarChart></ResponsiveContainer></div></div>
                    <div className="bg-white p-4 rounded-lg shadow"><h3 className="text-lg font-semibold text-gray-700 mb-4">Evolução no Período por Hora ({period})</h3><div style={{height: '400px'}}><ResponsiveContainer width="100%" height="100%"><LineChart data={data?.period_chart_data || []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Line type="monotone" dataKey="Inscrições" stroke="#4e79a7" strokeWidth={2} /><Line type="monotone" dataKey="Check-ins" stroke="#59a14f" strokeWidth={2} /></LineChart></ResponsiveContainer></div></div>
                    <div className="bg-white p-4 rounded-lg shadow overflow-x-auto"><h3 className="text-lg font-semibold text-gray-700 mb-4">Detalhes por Dia e Hora</h3>
                        <table className="min-w-full">
                            <thead className="bg-slate-100"><tr><th className="w-8"></th><th className="p-2 text-left">Data</th><th className="p-2 text-left">Inscrições</th><th className="p-2 text-left">Check-ins</th><th className="p-2 text-left">Taxa de Check-in</th></tr></thead>
                            <tbody>
                            {(data?.table_data ?? []).map(row => {
                                const dayKey = format(parseISO(row.dia), 'yyyy-MM-dd');
                                const isExpanded = expandedRows.has(dayKey);
                                const dailyCheckinRate = row.total_inscricoes > 0 ? (row.total_checkins / row.total_inscricoes) * 100 : 0;
                                return (<React.Fragment key={dayKey}><tr onClick={() => toggleRow(dayKey)} className="cursor-pointer hover:bg-slate-50 border-t">
                                    <td className="p-3 text-slate-500"><FaChevronDown className={`transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`} size={12} /></td>
                                    <td className="p-3 font-medium">{format(parseISO(row.dia), 'dd/MM/yyyy', {locale: ptBR})}</td>
                                    <td className="p-3">{row.total_inscricoes.toLocaleString('pt-BR')}</td>
                                    <td className="p-3">{row.total_checkins.toLocaleString('pt-BR')}</td>
                                    <td className="p-3 font-semibold text-blue-600">{dailyCheckinRate.toFixed(1)}%</td>
                                </tr>
                                {isExpanded && <tr><td colSpan={5} className="p-0 bg-slate-50"><div className="pl-10 pr-4 py-2"><table className="min-w-full text-sm">
                                    <thead><tr className="bg-slate-200"><th className="p-2 text-left">Hora</th><th className="p-2 text-left">Inscrições</th><th className="p-2 text-left">Check-ins</th></tr></thead>
                                    <tbody>{row.hourly_details?.map(item => (<tr key={item.hora}><td className="p-2">{`${item.hora.toString().padStart(2, '0')}:00`}</td><td className="p-2">{item.inscricoes}</td><td className="p-2">{item.checkins}</td></tr>))}</tbody>
                                </table></div></td></tr>}
                                </React.Fragment>)
                            })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
