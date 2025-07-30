'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { subDays, startOfDay, endOfDay, format, parseISO, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FaSpinner, FaFilter, FaUsers, FaUserCheck, FaChevronDown } from 'react-icons/fa';
import toast from 'react-hot-toast';

// --- Tipos de Dados ---
type Launch = { id: string; nome: string; status: string; };
type RawLead = {
    created_at: string | null;
    check_in_at: string | null;
    utm_source: string | null;
    utm_medium: string | null;
    utm_content: string | null;
};
type ChartDataPoint = { name: string; Inscrições: number; 'Check-ins': number; originalDate?: Date };
type Period = 'Hoje' | 'Ontem' | '7 Dias' | '14 Dias' | '30 Dias' | '45 Dias' | 'Todos';
type HourlyData = { hour: number; inscricoes: number; checkins: number; };
type DailyData = Record<string, HourlyData[]>;
type GroupedDataForTable = Record<string, DailyData>;

// --- Componentes ---
const KpiCard = ({ title, value, description }: { title: string; value: number; description: string; }) => (
    <div className="p-4 bg-white rounded-lg shadow-md">
        <h3 className="text-sm font-medium text-slate-500 truncate">{title}</h3>
        <p className="text-2xl font-bold text-slate-800 mt-1">{value.toLocaleString('pt-BR')}</p>
        <p className="text-xs text-slate-400">{description}</p>
    </div>
);

// --- Página Principal ---
export default function EvolucaoCanalPage() {
    const supabase = createClient();
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunchId, setSelectedLaunchId] = useState<string | null>(null);
    const [period, setPeriod] = useState<Period>('Hoje');
    const [rawLeads, setRawLeads] = useState<RawLead[]>([]);
    
    const [selectedSource, setSelectedSource] = useState('Todos');
    const [selectedMedium, setSelectedMedium] = useState('Todos');
    const [selectedContent, setSelectedContent] = useState('Todos');

    const [isLoading, setIsLoading] = useState({ launches: true, data: true });
    // RESTAURADO: Estado para controlar as linhas expansíveis da tabela
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    // RESTAURADO: Função para abrir/fechar as linhas da tabela
    const toggleRow = (key: string) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            newSet.has(key) ? newSet.delete(key) : newSet.add(key);
            return newSet;
        });
    };

    useEffect(() => {
        const fetchLaunches = async () => {
            setIsLoading(prev => ({ ...prev, launches: true }));
            const { data } = await supabase.from('lancamentos').select('id, nome, status').in('status', ['Em Andamento', 'Concluído']);
            if (data) {
                const statusOrder: { [key: string]: number } = { 'Em Andamento': 1, 'Concluído': 2 };
                const sorted = data.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
                setLaunches(sorted);
                if (sorted.length > 0) setSelectedLaunchId(sorted[0].id);
            }
            setIsLoading(prev => ({ ...prev, launches: false }));
        };
        fetchLaunches();
    }, [supabase]);

    useEffect(() => {
        if (!selectedLaunchId) return;
        const loadAllLeadsForLaunch = async () => {
            setIsLoading(prev => ({ ...prev, data: true }));
            let allLeads: RawLead[] = [];
            let page = 0;
            const pageSize = 1000;
            let keepFetching = true;

            while (keepFetching) {
                const { data, error } = await supabase
                    .from('leads')
                    .select('created_at, check_in_at, utm_source, utm_medium, utm_content')
                    .eq('launch_id', selectedLaunchId)
                    .range(page * pageSize, (page + 1) * pageSize - 1);

                if (error) { toast.error("Erro ao carregar dados dos leads."); keepFetching = false; break; }
                if (data) allLeads = [...allLeads, ...data];
                if (!data || data.length < pageSize) keepFetching = false;
                else page++;
            }
            setRawLeads(allLeads);
            setIsLoading(prev => ({ ...prev, data: false }));
        };
        loadAllLeadsForLaunch();
    }, [selectedLaunchId, supabase]);

    const leadsInPeriod = useMemo(() => {
        if (period === 'Todos') return rawLeads;
        if (!Array.isArray(rawLeads)) return [];
        const now = new Date();
        let interval;
        switch (period) {
            case 'Hoje': interval = { start: startOfDay(now), end: endOfDay(now) }; break;
            case 'Ontem': interval = { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) }; break;
            case '7 Dias': interval = { start: startOfDay(subDays(now, 6)), end: endOfDay(now) }; break;
            case '14 Dias': interval = { start: startOfDay(subDays(now, 13)), end: endOfDay(now) }; break;
            case '30 Dias': interval = { start: startOfDay(subDays(now, 29)), end: endOfDay(now) }; break;
            case '45 Dias': interval = { start: startOfDay(subDays(now, 44)), end: endOfDay(now) }; break;
            default: return [];
        }
        return rawLeads.filter(lead => lead.created_at && isWithinInterval(parseISO(lead.created_at), interval));
    }, [rawLeads, period]);
    
    const utmOptions = useMemo(() => {
        const sources = new Set<string>();
        const mediums = new Set<string>();
        const contents = new Set<string>();
        leadsInPeriod.forEach(l => l.utm_source && sources.add(l.utm_source));
        const leadsForMediums = selectedSource === 'Todos' ? leadsInPeriod : leadsInPeriod.filter(l => l.utm_source === selectedSource);
        leadsForMediums.forEach(l => l.utm_medium && mediums.add(l.utm_medium));
        const leadsForContents = selectedMedium === 'Todos' ? leadsForMediums : leadsForMediums.filter(l => l.utm_medium === selectedMedium);
        leadsForContents.forEach(l => l.utm_content && contents.add(l.utm_content));
        return {
            sources: Array.from(sources).sort(),
            mediums: Array.from(mediums).sort(),
            contents: Array.from(contents).sort()
        };
    }, [leadsInPeriod, selectedSource, selectedMedium]);

    const filteredLeadsInPeriod = useMemo(() => {
        return leadsInPeriod.filter(lead =>
            (selectedSource === 'Todos' || lead.utm_source === selectedSource) &&
            (selectedMedium === 'Todos' || lead.utm_medium === selectedMedium) &&
            (selectedContent === 'Todos' || lead.utm_content === selectedContent)
        );
    }, [leadsInPeriod, selectedSource, selectedMedium, selectedContent]);

    const kpis = useMemo(() => ({
        totalGeralInscritos: rawLeads.length,
        totalGeralCheckins: rawLeads.filter(l => l.check_in_at !== null).length,
        periodoInscritos: filteredLeadsInPeriod.length,
        periodoCheckins: filteredLeadsInPeriod.filter(l => l.check_in_at !== null).length,
    }), [rawLeads, filteredLeadsInPeriod]);

    const fullLaunchChartData = useMemo((): ChartDataPoint[] => {
        if (!rawLeads || rawLeads.length === 0) return [];
        const dailyTotals: Record<string, { inscricoes: number; checkins: number }> = {};
        rawLeads.forEach(item => {
            if (item.created_at) {
                const day = format(parseISO(item.created_at), 'yyyy-MM-dd');
                if (!dailyTotals[day]) dailyTotals[day] = { inscricoes: 0, checkins: 0 };
                dailyTotals[day].inscricoes++;
                if (item.check_in_at) dailyTotals[day].checkins++;
            }
        });
        return Object.entries(dailyTotals).map(([day, totals]) => ({ name: format(parseISO(day), 'dd/MM', { locale: ptBR }), Inscrições: totals.inscricoes, 'Check-ins': totals.checkins, originalDate: parseISO(day) })).sort((a, b) => a.originalDate.getTime() - b.originalDate.getTime());
    }, [rawLeads]);

    // RESTAURADO: Memo para o gráfico de linha por hora
    const periodHourlyChartData = useMemo((): ChartDataPoint[] => {
        if (!filteredLeadsInPeriod || filteredLeadsInPeriod.length === 0) return [];
        const hourlyTotals: Record<number, { inscricoes: number; checkins: number }> = {};
        filteredLeadsInPeriod.forEach(item => {
            if (item.created_at) {
                const hour = parseISO(item.created_at).getHours();
                if (!hourlyTotals[hour]) hourlyTotals[hour] = { inscricoes: 0, checkins: 0 };
                hourlyTotals[hour].inscricoes++;
                if (item.check_in_at) hourlyTotals[hour].checkins++;
            }
        });
        return Array.from({ length: 24 }, (_, i) => ({ name: `${i.toString().padStart(2, '0')}:00`, Inscrições: hourlyTotals[i]?.inscricoes || 0, 'Check-ins': hourlyTotals[i]?.checkins || 0 }));
    }, [filteredLeadsInPeriod]);

    // RESTAURADO: Memo para a tabela detalhada
    const groupedDataForTable = useMemo(() => {
        return filteredLeadsInPeriod.reduce((acc: GroupedDataForTable, item) => {
            if (!item.created_at) return acc;
            const utm = item.utm_content || 'Sem UTM';
            const day = format(parseISO(item.created_at), 'yyyy-MM-dd');
            const hour = parseISO(item.created_at).getHours();
            if (!acc[utm]) acc[utm] = {};
            if (!acc[utm][day]) acc[utm][day] = [];
            const hourEntry = acc[utm][day].find(h => h.hour === hour);
            if (hourEntry) {
                hourEntry.inscricoes++;
                if (item.check_in_at) hourEntry.checkins++;
            } else {
                acc[utm][day].push({ hour, inscricoes: 1, checkins: item.check_in_at ? 1 : 0 });
            }
            return acc;
        }, {});
    }, [filteredLeadsInPeriod]);

    return (
        <div className="p-4 md:p-6 space-y-6 bg-slate-50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Evolução de Canal</h1>
                <div className="bg-white p-2 rounded-lg shadow-md w-full md:w-auto">
                    <select value={selectedLaunchId || ''} onChange={(e) => { setSelectedLaunchId(e.target.value); setPeriod('Hoje'); }} className="w-full px-3 py-2 border-none rounded-md focus:ring-0 bg-transparent" disabled={isLoading.launches}>
                        {launches.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.status})</option>)}
                    </select>
                </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard title="Total Inscrições (Geral)" value={kpis.totalGeralInscritos} description="Total do Lançamento" />
                <KpiCard title="Total Check-ins (Geral)" value={kpis.totalGeralCheckins} description="Total do Lançamento" />
                <KpiCard title="Inscrições no Período" value={kpis.periodoInscritos} description={`Filtro: ${period}`} />
                <KpiCard title="Check-ins no Período" value={kpis.periodoCheckins} description={`Filtro: ${period}`} />
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center gap-2 mb-4">
                    <FaFilter className="text-blue-600"/>
                    <h2 className="text-lg font-semibold text-slate-700">Filtros</h2>
                </div>
                <div className="flex flex-col gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
                        <div className="flex flex-wrap items-center gap-2">
                            {(['Hoje', 'Ontem', '7 Dias', '14 Dias', '30 Dias', '45 Dias', 'Todos'] as Period[]).map(p => (
                                <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-2 rounded-md text-sm font-semibold transition-colors ${period === p ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">UTM Source</label>
                            <select value={selectedSource} onChange={e => { setSelectedSource(e.target.value); setSelectedMedium('Todos'); setSelectedContent('Todos'); }} className="w-full p-2 border border-gray-300 rounded-md">
                                <option value="Todos">Todos</option>
                                {utmOptions.sources.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">UTM Medium</label>
                            <select value={selectedMedium} onChange={e => { setSelectedMedium(e.target.value); setSelectedContent('Todos'); }} className="w-full p-2 border border-gray-300 rounded-md">
                                <option value="Todos">Todos</option>
                                {utmOptions.mediums.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">UTM Content</label>
                            <select value={selectedContent} onChange={e => setSelectedContent(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md">
                                <option value="Todos">Todos</option>
                                {utmOptions.contents.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {isLoading.data ? (
                <div className="text-center py-10"><FaSpinner className="animate-spin text-blue-600 text-3xl mx-auto" /></div>
            ) : (
                <div className="space-y-6">
                    {/* RESTAURADO: Gráficos e Tabelas */}
                    <div className="bg-white p-4 rounded-lg shadow"><h3 className="text-lg font-semibold text-gray-700 mb-4">Visão Geral do Lançamento (por Dia)</h3><div style={{height: '400px'}}><ResponsiveContainer width="100%" height="100%"><BarChart data={fullLaunchChartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="Inscrições" fill="#4e79a7" /><Bar dataKey="Check-ins" fill="#59a14f" /></BarChart></ResponsiveContainer></div></div>
                    <div className="bg-white p-4 rounded-lg shadow"><h3 className="text-lg font-semibold text-gray-700 mb-4">Evolução no Período por Hora ({period})</h3><div style={{height: '400px'}}><ResponsiveContainer width="100%" height="100%"><LineChart data={periodHourlyChartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Line type="monotone" dataKey="Inscrições" stroke="#4e79a7" strokeWidth={2} /><Line type="monotone" dataKey="Check-ins" stroke="#59a14f" strokeWidth={2} /></LineChart></ResponsiveContainer></div></div>
                    <div className="bg-white p-4 rounded-lg shadow overflow-x-auto"><h3 className="text-lg font-semibold text-gray-700 mb-4">Detalhes por Dia e Hora</h3>{filteredLeadsInPeriod.length === 0 ? (<p className="text-center text-gray-500 py-4">Nenhum dado encontrado para o filtro selecionado.</p>) : (<div className="space-y-4">{Object.entries(groupedDataForTable).map(([utm, days]) => {const utmTotal = Object.values(days).flat().reduce((acc, curr) => ({inscricoes: acc.inscricoes + curr.inscricoes, checkins: acc.checkins + curr.checkins}), {inscricoes: 0, checkins: 0});return (<div key={utm} className="border rounded-lg"><h4 className="flex justify-between items-center font-bold bg-gray-200 p-2 text-slate-800 rounded-t-lg"><span>{utm}</span><span className="font-normal text-sm">Total: <strong>{utmTotal.inscricoes}</strong> Inscrições / <strong>{utmTotal.checkins}</strong> Check-ins</span></h4><table className="min-w-full"><tbody>{Object.entries(days).sort(([dayA], [dayB]) => new Date(dayB).getTime() - new Date(dayA).getTime()).map(([day, hours]) => {const dailyTotal = hours.reduce((acc, curr) => ({inscricoes: acc.inscricoes + curr.inscricoes, checkins: acc.checkins + curr.checkins}), {inscricoes: 0, checkins: 0});const key = `${utm}-${day}`;const isExpanded = expandedRows.has(key);return (<React.Fragment key={key}><tr onClick={() => toggleRow(key)} className="cursor-pointer hover:bg-gray-50 border-t"><td className="px-4 py-3 font-medium flex items-center gap-2 w-1/3"><FaChevronDown className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} size={12} />{format(parseISO(day), 'dd/MM/yyyy', { locale: ptBR })}</td><td className="px-4 py-3 text-center w-1/3">{dailyTotal.inscricoes}</td><td className="px-4 py-3 text-center w-1/3">{dailyTotal.checkins}</td></tr>{isExpanded && (<tr><td colSpan={3} className="p-0"><div className="pl-10 pr-4 py-2 bg-gray-50"><table className="min-w-full text-sm"><thead><tr className="bg-gray-100"><th className="p-2 text-left font-medium text-gray-600 w-1/3">Hora</th><th className="p-2 text-center font-medium text-gray-600 w-1/3">Inscrições</th><th className="p-2 text-center font-medium text-gray-600 w-1/3">Check-ins</th></tr></thead><tbody className="divide-y divide-gray-200">{hours.sort((a,b) => b.hour - a.hour).map((item, index) => (<tr key={index}><td className="p-2">{`${item.hour.toString().padStart(2, '0')}:00`}</td><td className="p-2 text-center">{item.inscricoes}</td><td className="p-2 text-center">{item.checkins}</td></tr>))}</tbody></table></div></td></tr>)}</React.Fragment>);})}</tbody></table></div>);})}</div>)}</div>
                </div>
            )}
        </div>
    );
}