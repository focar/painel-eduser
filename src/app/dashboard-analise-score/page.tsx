'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { FaSpinner, FaUsers, FaUserCheck, FaFilter } from 'react-icons/fa';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import { Pie, Cell, Tooltip, Legend } from 'recharts';

const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false });

// --- Tipos de Dados ---
type Launch = { id: string; nome: string; status: string; };
type ChartData = { name: string; value: number; };
type DashboardData = { quente: ChartData[]; quente_morno: ChartData[]; morno: ChartData[]; morno_frio: ChartData[]; frio: ChartData[]; };
type RawLeadData = { score: number | null; check_in_at: string | null; utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; utm_content: string | null; };

// --- Constantes e Funções Auxiliares ---
const COLOR_PALETTE = [
  '#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f', '#edc949',
  '#af7aa1', '#ff9da7', '#9c755f', '#bab0ab', '#d37295', '#fcbf49',
  '#8cb369', '#17becf', '#9467bd', '#8c564b', '#bcbd22', '#d62728'
];

const scoreCategoryConfig = [
    { key: 'quente', title: 'Quente (>80)' },
    { key: 'quente_morno', title: 'Quente-Morno (65-79)' },
    { key: 'morno', title: 'Morno (50-64)' },
    { key: 'morno_frio', title: 'Morno-Frio (35-49)' },
    { key: 'frio', title: 'Frio (1-34)' },
] as const;

const hashCode = (str: string): number => { let hash = 0; if (!str || str.length === 0) return hash; for (let i = 0; i < str.length; i++) { const char = str.charCodeAt(i); hash = ((hash << 5) - hash) + char; hash = hash & hash; } return Math.abs(hash); };
const getColorForString = (name: string): string => { const lowerCaseName = (name || 'N/A').toLowerCase(); const predefinedColors: { [key: string]: string } = { 'indefinido': '#BDBDBD', 'outros': '#757575', 'paid': '#d62728' }; if (predefinedColors[lowerCaseName]) return predefinedColors[lowerCaseName]; const index = hashCode(lowerCaseName) % COLOR_PALETTE.length; return COLOR_PALETTE[index]; };

// --- Componentes ---
const KpiCard = ({ title, value, description, icon }: { title: string; value: string; description: string; icon: React.ReactNode }) => (
    <div className="bg-slate-50 p-4 rounded-lg flex items-center gap-4">
        <div className="bg-blue-100 text-blue-600 p-3 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            <p className="text-sm text-slate-500">{title}</p>
            <p className="text-xs text-slate-400">{description}</p>
        </div>
    </div>
);

const ScorePieChartCard = ({ title, data, totalLeads }: {
    title: string; data: ChartData[]; totalLeads: number;
}) => {
    const TOP_N_ITEMS = 7;
    const processedData = useMemo(() => {
        if (!Array.isArray(data) || data.length === 0) return [];
        if (data.length <= TOP_N_ITEMS) return data;
        
        const sortedData = [...data].sort((a, b) => b.value - a.value);
        const topItems = sortedData.slice(0, TOP_N_ITEMS - 1);
        const otherItems = sortedData.slice(TOP_N_ITEMS - 1);
        const otherSum = otherItems.reduce((acc, item) => acc + item.value, 0);

        return otherSum > 0 ? [...topItems, { name: 'Outros', value: otherSum }] : topItems;
    }, [data]);

    return (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-md flex flex-col items-center">
            <div className="w-full flex justify-between items-start mb-2">
                <div>
                    <h2 className="text-lg font-semibold text-slate-700">{title}</h2>
                    <p className="text-sm text-slate-500">Total: {totalLeads.toLocaleString('pt-BR')} leads</p>
                </div>
            </div>
            {processedData.length > 0 ? (
                <PieChart width={350} height={320}>
                    <Pie data={processedData} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={80} innerRadius={45} labelLine={false}>
                        {processedData.map((entry, index) => (<Cell key={`cell-${index}`} fill={getColorForString(entry.name)} />))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value.toLocaleString('pt-BR')} leads`} />
                    <Legend iconType="circle" verticalAlign="bottom" wrapperStyle={{ paddingTop: '15px' }} formatter={(value) => value.length > 25 ? `${value.substring(0, 25)}...` : value} />
                </PieChart>
            ) : (<div className="flex items-center justify-center h-[320px] text-slate-500">Nenhum dado para exibir.</div>)}
        </div>
    );
};

// --- Página Principal ---
export default function AnaliseScorePage() {
    const supabase = createClient();
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunch, setSelectedLaunch] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [rawLeads, setRawLeads] = useState<RawLeadData[]>([]);
    const [selectedSource, setSelectedSource] = useState('all');
    const [selectedMedium, setSelectedMedium] = useState('all');
    const [selectedContent, setSelectedContent] = useState('all');

    useEffect(() => {
        const fetchLaunches = async () => {
            const { data, error } = await supabase.from('lancamentos').select('id, nome, status').in('status', ['Em Andamento', 'Concluído']);
            if (error) { toast.error("Erro ao buscar lançamentos"); }
            else if (data && data.length > 0) {
                const sorted = [...data].sort((a, b) => a.status === 'Em Andamento' ? -1 : 1);
                setLaunches(sorted);
                setSelectedLaunch(sorted[0].id);
            }
        };
        fetchLaunches();
    }, [supabase]);

    useEffect(() => {
        if (!selectedLaunch) return;
        const loadRawLeadDataWithPagination = async () => {
            setIsLoading(true);
            let allLeads: RawLeadData[] = [];
            let page = 0;
            const pageSize = 1000;
            let keepFetching = true;

            while (keepFetching) {
                const { data, error } = await supabase
                    .from('leads')
                    .select('score, check_in_at, utm_source, utm_medium, utm_campaign, utm_content')
                    .eq('launch_id', selectedLaunch)
                    .range(page * pageSize, (page + 1) * pageSize - 1);

                if (error) {
                    toast.error("Erro ao carregar dados dos leads.");
                    keepFetching = false;
                    break;
                }
                if (data) allLeads = [...allLeads, ...data];
                if (!data || data.length < pageSize) keepFetching = false;
                else page++;
            }
            setRawLeads(allLeads);
            setIsLoading(false);
        };
        loadRawLeadDataWithPagination();
    }, [selectedLaunch, supabase]);

    const filteredLeads = useMemo(() => {
        if (!Array.isArray(rawLeads)) return [];
        return rawLeads.filter(lead =>
            (selectedSource === 'all' || lead.utm_source === selectedSource) &&
            (selectedMedium === 'all' || lead.utm_medium === selectedMedium) &&
            (selectedContent === 'all' || lead.utm_content === selectedContent)
        );
    }, [rawLeads, selectedSource, selectedMedium, selectedContent]);
    
    const kpis = useMemo(() => {
        const totalGeral = rawLeads.length;
        const checkinGeral = rawLeads.filter(l => l.check_in_at !== null).length;
        const leadsSelecao = filteredLeads.length;
        const checkinSelecao = filteredLeads.filter(l => l.check_in_at !== null).length;
        return { totalGeral, checkinGeral, leadsSelecao, checkinSelecao };
    }, [rawLeads, filteredLeads]);

    const utmOptions = useMemo(() => {
        if (!Array.isArray(rawLeads)) return { sources: [], mediums: [], contents: [] };
        
        const sources = new Set<string>();
        rawLeads.forEach(l => l.utm_source && sources.add(l.utm_source));

        const sourceFiltered = (selectedSource === 'all') ? rawLeads : rawLeads.filter(l => l.utm_source === selectedSource);
        const mediums = new Set<string>();
        sourceFiltered.forEach(l => l.utm_medium && mediums.add(l.utm_medium));

        const mediumFiltered = (selectedMedium === 'all') ? sourceFiltered : sourceFiltered.filter(l => l.utm_medium === selectedMedium);
        const contents = new Set<string>();
        mediumFiltered.forEach(l => l.utm_content && contents.add(l.utm_content));
        
        return {
            sources: Array.from(sources).sort(),
            mediums: Array.from(mediums).sort(),
            contents: Array.from(contents).sort()
        };
    }, [rawLeads, selectedSource, selectedMedium]);

    const dashboardData = useMemo((): DashboardData => {
        const scoreConditions = {
            quente: (s: number | null) => s !== null && s > 80,
            quente_morno: (s: number | null) => s !== null && s >= 65 && s <= 79,
            morno: (s: number | null) => s !== null && s >= 50 && s <= 64,
            morno_frio: (s: number | null) => s !== null && s >= 35 && s <= 49,
            frio: (s: number | null) => s !== null && s > 0 && s < 35,
        };
        const result: DashboardData = { quente: [], quente_morno: [], morno: [], morno_frio: [], frio: [] };
        if (!Array.isArray(filteredLeads)) return result;

        Object.keys(scoreConditions).forEach(key => {
            const categoryKey = key as keyof typeof scoreConditions;
            const leadsInCategory = filteredLeads.filter(l => scoreConditions[categoryKey](l.score));
            const contentCounts = leadsInCategory.reduce((acc, lead) => {
                const content = lead.utm_content || 'Indefinido';
                acc[content] = (acc[content] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);
            result[categoryKey] = Object.entries(contentCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
        });
        return result;
    }, [filteredLeads]);
    
    return (
        <div className="space-y-6 p-4 md:p-6 bg-slate-50 min-h-screen">
            
            {/* ================== INÍCIO DA ALTERAÇÃO DE LAYOUT ================== */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Análise de Score por Canal</h1>
                <div className="bg-white p-2 rounded-lg shadow-md w-full md:w-auto">
                    <select value={selectedLaunch} onChange={e => setSelectedLaunch(e.target.value)} disabled={!launches.length} className="w-full px-3 py-2 border-none rounded-md focus:ring-0 bg-transparent">
                        {launches.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.status})</option>)}
                    </select>
                </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-md">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <KpiCard title="Total Geral Inscrições" value={kpis.totalGeral.toLocaleString('pt-BR')} description="Total do Lançamento" icon={<FaUsers size={20} />} />
                    <KpiCard title="Total Geral Check-ins" value={kpis.checkinGeral.toLocaleString('pt-BR')} description="Total do Lançamento" icon={<FaUserCheck size={20} />} />
                    <KpiCard title="Inscrições (Filtro)" value={kpis.leadsSelecao.toLocaleString('pt-BR')} description="Resultado do filtro atual" icon={<FaUsers size={20} />} />
                    <KpiCard title="Check-ins (Filtro)" value={kpis.checkinSelecao.toLocaleString('pt-BR')} description="Resultado do filtro atual" icon={<FaUserCheck size={20} />} />
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center gap-2 mb-4">
                    <FaFilter className="text-blue-600"/>
                    <h2 className="text-lg font-semibold text-slate-700">Filtros</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">UTM Source</label>
                        <select value={selectedSource} onChange={e => { setSelectedSource(e.target.value); setSelectedMedium('all'); setSelectedContent('all'); }} className="w-full p-2 border border-gray-300 rounded-md">
                            <option value="all">Todos</option>
                            {utmOptions.sources.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">UTM Medium</label>
                        <select value={selectedMedium} onChange={e => { setSelectedMedium(e.target.value); setSelectedContent('all'); }} className="w-full p-2 border border-gray-300 rounded-md">
                            <option value="all">Todos</option>
                            {utmOptions.mediums.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">UTM Content</label>
                        <select value={selectedContent} onChange={e => setSelectedContent(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md">
                            <option value="all">Todos</option>
                            {utmOptions.contents.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>
            </div>
            {/* ================== FIM DA ALTERAÇÃO DE LAYOUT ================== */}

            
            {isLoading ? (
                <div className="text-center py-10"><FaSpinner className="animate-spin text-blue-600 text-3xl mx-auto" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {scoreCategoryConfig.map((category) => {
                        const dataForChart = dashboardData[category.key as keyof DashboardData] || [];
                        const totalLeads = dataForChart.reduce((acc, item) => acc + item.value, 0);
                        
                        return (
                            <div key={category.key}>
                                <ScorePieChartCard title={category.title} data={dataForChart} totalLeads={totalLeads} />
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
}