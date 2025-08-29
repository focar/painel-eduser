// src/app/dashboard-analise-campanha/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import toast from 'react-hot-toast';
import { FaSpinner, FaFilter, FaClock, FaChevronDown, FaChevronRight, FaGlobe, FaBullseye, FaUsers, FaUserCheck, FaPercent } from 'react-icons/fa';
import type { Launch } from "@/lib/types";

// --- Tipagens de Dados ---
type KpiSet = { total_geral_inscricoes: number; total_geral_checkins: number; total_filtrado_inscricoes: number; total_filtrado_checkins: number; };
type HourDetail = { utm_value: string; inscricoes: number; checkins: number; checkin_rate: number | null; };
type HourlyRow = { creation_hour: string; total_inscricoes: number; total_checkins: number; checkin_rate: number | null; details: HourDetail[] | null; };
type AnalysisData = { kpis: KpiSet; hourly_data: HourlyRow[] | null; };
type UtmOption = string;

const KpiCard = ({ title, value, icon: Icon, subTitle }: { title: string; value: string; icon: React.ElementType; subTitle?: string }) => (
    <div className="bg-white p-4 rounded-lg shadow-md flex items-center gap-4">
        <div className="bg-blue-100 p-3 rounded-full"><Icon className="text-blue-600 text-2xl" /></div>
        <div>
            <p className="text-base text-slate-500">{title}</p>
            <p className="text-3xl font-bold text-slate-800">{value}</p>
            {subTitle && <p className="text-xs text-slate-400">{subTitle}</p>}
        </div>
    </div>
);
const Spinner = () => <div className="flex justify-center items-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div></div>;

export default function AnaliseCampanhaPage() {
    const supabase = createClient();
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunch, setSelectedLaunch] = useState<string>('');
    const [loadingLaunches, setLoadingLaunches] = useState(true);
    const [loadingData, setLoadingData] = useState(true);
    const [data, setData] = useState<AnalysisData | null>(null);
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

    // Estados para os filtros
    const [filters, setFilters] = useState({ source: 'all', medium: 'all', campaign: 'all', content: 'all', term: 'all' });
    const [options, setOptions] = useState<{sources: UtmOption[], mediums: UtmOption[], campaigns: UtmOption[], contents: UtmOption[], terms: UtmOption[]}>({ sources: [], mediums: [], campaigns: [], contents: [], terms: [] });

    const toggleRow = (hora: string) => setExpandedRows(prev => ({ ...prev, [hora]: !prev[hora] }));

    // Busca inicial de lançamentos
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
                setSelectedLaunch(inProgress ? inProgress.id : (sorted[0] ? sorted[0].id : ''));
            } else if (error) { toast.error("Erro ao buscar lançamentos."); }
            setLoadingLaunches(false);
        };
        fetchLaunches();
    }, [supabase]);

    // Lógica de Filtros em Cascata
    useEffect(() => {
        if (!selectedLaunch) return;
        setFilters({ source: 'all', medium: 'all', campaign: 'all', content: 'all', term: 'all' });
        const fetchSources = async () => {
            const { data } = await supabase.rpc('get_utm_sources', { p_launch_id: selectedLaunch });
            setOptions({ sources: data?.map((d: { utm_source: string }) => d.utm_source) || [], mediums: [], campaigns: [], contents: [], terms: [] });
        };
        fetchSources();
    }, [selectedLaunch, supabase]);

    useEffect(() => {
        if (!selectedLaunch || filters.source === 'all') { setOptions(prev => ({...prev, mediums: [], campaigns: [], contents: [], terms: []})); return; }
        setFilters(prev => ({...prev, medium: 'all', campaign: 'all', content: 'all', term: 'all'}));
        const fetchMediums = async () => {
            const { data } = await supabase.rpc('get_utm_mediums', { p_launch_id: selectedLaunch, p_source: filters.source });
            setOptions(prev => ({ ...prev, mediums: data?.map((d: { utm_medium: string }) => d.utm_medium) || [], campaigns: [], contents: [], terms: [] }));
        };
        fetchMediums();
    }, [filters.source, selectedLaunch, supabase]);

    useEffect(() => {
        if (!selectedLaunch || filters.medium === 'all') { setOptions(prev => ({...prev, campaigns: [], contents: [], terms: []})); return; }
        setFilters(prev => ({...prev, campaign: 'all', content: 'all', term: 'all'}));
        const fetchCampaigns = async () => {
            const { data } = await supabase.rpc('get_utm_campaigns', { p_launch_id: selectedLaunch, p_source: filters.source, p_medium: filters.medium });
            setOptions(prev => ({ ...prev, campaigns: data?.map((d: { utm_campaign: string }) => d.utm_campaign) || [], contents: [], terms: [] }));
        };
        fetchCampaigns();
    }, [filters.medium, filters.source, selectedLaunch, supabase]);

    useEffect(() => {
        if (!selectedLaunch || filters.campaign === 'all') { setOptions(prev => ({...prev, contents: [], terms: []})); return; }
        setFilters(prev => ({...prev, content: 'all', term: 'all'}));
        const fetchContents = async () => {
             const { data } = await supabase.rpc('get_utm_contents', { p_launch_id: selectedLaunch, p_source: filters.source, p_medium: filters.medium, p_campaign: filters.campaign });
             setOptions(prev => ({ ...prev, contents: data?.map((d: { utm_content: string }) => d.utm_content) || [], terms: [] }));
        };
        fetchContents();
    }, [filters.campaign, filters.medium, filters.source, selectedLaunch, supabase]);

    useEffect(() => {
        if (!selectedLaunch || filters.content === 'all') { setOptions(prev => ({...prev, terms: []})); return; }
        setFilters(prev => ({...prev, term: 'all'}));
        const fetchTerms = async () => {
            const { data } = await supabase.rpc('get_utm_terms', { p_launch_id: selectedLaunch, p_source: filters.source, p_medium: filters.medium, p_campaign: filters.campaign, p_content: filters.content });
            setOptions(prev => ({ ...prev, terms: data?.map((d: { utm_term: string }) => d.utm_term) || [] }));
        };
        fetchTerms();
    }, [filters.content, filters.campaign, filters.medium, filters.source, selectedLaunch, supabase]);

    // Busca principal dos dados da análise
    const fetchData = useCallback(async () => {
        if (!selectedLaunch) return;
        setLoadingData(true);
        try {
            const { data, error } = await supabase.rpc('get_campaign_hourly_analysis', {
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
        finally { setLoadingData(false); }
    }, [selectedLaunch, filters, supabase]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const kpis = data?.kpis;
    // CORREÇÃO: Verificamos se 'kpis' existe antes de usá-lo para o cálculo.
    const taxaCheckinGeral = (kpis && kpis.total_geral_inscricoes > 0) ? (kpis.total_geral_checkins / kpis.total_geral_inscricoes * 100) : 0;
    const taxaCheckinFiltrado = (kpis && kpis.total_filtrado_inscricoes > 0) ? (kpis.total_filtrado_checkins / kpis.total_filtrado_inscricoes * 100) : 0;
    
    const handleFilterChange = (level: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [level]: value }));
    };

    const tableHeaders = ['Hora', 'Total Inscrições', 'Total Check-ins', 'Taxa de Check-in'];

    return (
        <div className="space-y-6 p-4 md:p-6 bg-slate-50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold text-slate-800">Análise de Campanha por Hora</h1>
                <div className="bg-white p-2 rounded-lg shadow-md w-full md:w-auto">
                    <select value={selectedLaunch} onChange={e => setSelectedLaunch(e.target.value)} className="w-full px-3 py-2 border-none rounded-md focus:ring-0 bg-transparent text-base" disabled={loadingLaunches}>
                        {loadingLaunches ? <option>A carregar...</option> : 
                            launches.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.status})</option>)
                        }
                    </select>
                </div>
            </div>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-200 p-4 rounded-lg space-y-3">
                    <h3 className="font-bold text-center text-slate-600">Totais do Lançamento</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <KpiCard title="Inscrições" value={(kpis?.total_geral_inscricoes ?? 0).toLocaleString('pt-BR')} icon={FaGlobe} />
                        <KpiCard title="Check-ins" value={(kpis?.total_geral_checkins ?? 0).toLocaleString('pt-BR')} icon={FaBullseye} />
                        <KpiCard title="Taxa Check-in" value={`${taxaCheckinGeral.toFixed(1)}%`} icon={FaPercent} />
                    </div>
                </div>
                <div className="bg-slate-200 p-4 rounded-lg space-y-3">
                     <h3 className="font-bold text-center text-slate-600">Totais do Filtro Atual</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <KpiCard title="Inscrições" value={(kpis?.total_filtrado_inscricoes ?? 0).toLocaleString('pt-BR')} icon={FaUsers} />
                        <KpiCard title="Check-ins" value={(kpis?.total_filtrado_checkins ?? 0).toLocaleString('pt-BR')} icon={FaUserCheck} />
                        <KpiCard title="Taxa Check-in" value={`${taxaCheckinFiltrado.toFixed(1)}%`} icon={FaPercent} />
                    </div>
                </div>
            </section>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center gap-2 mb-4">
                    <FaFilter className="text-blue-600"/> <h2 className="text-lg font-semibold text-slate-700">Filtros de Análise</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {Object.keys(filters).map((key, index) => (
                        <div key={key}>
                            <label className="block text-sm font-medium text-slate-700 mb-1 capitalize">{`UTM ${key}`}</label>
                            <select 
                                value={filters[key as keyof typeof filters]} 
                                onChange={e => handleFilterChange(key as keyof typeof filters, e.target.value)} 
                                className="w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md" 
                                disabled={index > 0 && filters[(Object.keys(filters)[index-1]) as keyof typeof filters] === 'all'}>
                                <option value="all">Todos</option>
                                {options[`${key}s` as keyof typeof options]?.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
                <div className="flex items-center gap-2 mb-4">
                    <FaClock className="text-blue-600"/>
                    <h2 className="text-xl font-semibold text-slate-700">Detalhes por Hora</h2>
                </div>
                {loadingData ? <Spinner /> : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-base">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="w-8"></th>
                                    {tableHeaders.map(h => <th key={h} className="px-4 py-3 text-left text-sm font-medium text-slate-500 uppercase tracking-wider">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {(!data?.hourly_data || data.hourly_data.length === 0) ? (
                                    <tr><td colSpan={tableHeaders.length + 1} className="text-center py-10 text-slate-500">Nenhum dado encontrado para esta seleção.</td></tr>
                                ) : (
                                    data.hourly_data.map((row) => (
                                        <React.Fragment key={row.creation_hour}>
                                            <tr className="border-b border-slate-200 hover:bg-slate-50 cursor-pointer" onClick={() => toggleRow(row.creation_hour)}>
                                                <td className="px-4 py-4 text-slate-500">{expandedRows[row.creation_hour] ? <FaChevronDown size={14} /> : <FaChevronRight size={14} />}</td>
                                                <td className="px-4 py-4 font-semibold text-slate-800">{new Date(row.creation_hour).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}h</td>
                                                <td className="px-4 py-4 text-slate-700">{row.total_inscricoes.toLocaleString('pt-BR')}</td>
                                                <td className="px-4 py-4 text-slate-700">{row.total_checkins.toLocaleString('pt-BR')}</td>
                                                <td className="px-4 py-4 font-bold text-blue-600">{(row.checkin_rate ?? 0).toFixed(1)}%</td>
                                            </tr>
                                            {expandedRows[row.creation_hour] && row.details && (
                                                <tr className="bg-slate-50"><td colSpan={tableHeaders.length + 1} className="p-0">
                                                    <div className="p-4">
                                                        <table className="min-w-full text-base">
                                                            <thead className="bg-slate-200">
                                                                <tr>
                                                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 uppercase tracking-wider pl-12">Detalhe (UTM)</th>
                                                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Inscrições</th>
                                                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Check-ins</th>
                                                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Taxa Check-in</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-300">
                                                                {row.details.map(detail => (
                                                                    <tr key={detail.utm_value}>
                                                                        <td className="px-4 py-3 text-slate-700 pl-12 truncate" title={detail.utm_value}>{detail.utm_value}</td>
                                                                        <td className="px-4 py-3 text-slate-600">{detail.inscricoes.toLocaleString('pt-BR')}</td>
                                                                        <td className="px-4 py-3 text-slate-600">{detail.checkins.toLocaleString('pt-BR')}</td>
                                                                        <td className="px-4 py-3 font-semibold text-blue-500">{(detail.checkin_rate ?? 0).toFixed(1)}%</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td></tr>
                                            )}
                                        </React.Fragment>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}