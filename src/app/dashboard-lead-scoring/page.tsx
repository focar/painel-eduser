'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import toast from 'react-hot-toast';
import { FaSpinner, FaFileCsv, FaFilter, FaUsers, FaUserCheck, FaGlobe, FaBullseye } from 'react-icons/fa';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

// --- Tipagens de Dados ---
type Launch = { id: string; nome: string; status: string; };

type RawLead = {
    score: number | null;
    check_in_at: string | null;
    created_at: string | null;
    utm_source: string | null;
    utm_medium: string | null;
    utm_content: string | null;
};

type TableData = {
    canal: string;
    inscricoes: number;
    check_ins: number;
    quente_mais_80: number;
    quente_morno: number;
    morno: number;
    morno_frio: number;
    frio_menos_35: number;
};

type ChartData = { name: string; value: number; fill: string; };
type DailyEvolutionData = { data: string; inscricoes: number; checkins: number; };

// --- Componentes de UI ---
const KpiCard = ({ title, value, icon: Icon, subTitle }: { title: string; value: string; icon: React.ElementType; subTitle?: string }) => (
    <div className="bg-white p-4 rounded-lg shadow-md flex items-center gap-4">
        <div className="bg-blue-100 p-3 rounded-full">
            <Icon className="text-blue-600 text-xl" />
        </div>
        <div>
            <p className="text-sm text-slate-500">{title}</p>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            {subTitle && <p className="text-xs text-slate-400">{subTitle}</p>}
        </div>
    </div>
);

const ScoreDistributionChart = ({ data }: { data: ChartData[] }) => {
    return (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold text-slate-700 mb-4">Distribuição por Score (Filtro)</h2>
            <div style={{ width: '100%', height: 350 }}>
                <ResponsiveContainer>
                    <PieChart>
                        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} labelLine={false}>
                            {data.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                        </Pie>
                        <Tooltip formatter={(value: number) => `${value.toLocaleString('pt-BR')} leads`} />
                        <Legend iconType="circle" />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const DailyEvolutionChart = ({ data }: { data: DailyEvolutionData[] }) => (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Evolução Diária (Filtro)</h2>
        <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="data" /><YAxis /><Tooltip /><Legend />
                <Line type="monotone" dataKey="inscricoes" stroke="#8884d8" strokeWidth={2} name="Inscrições" />
                <Line type="monotone" dataKey="checkins" stroke="#82ca9d" strokeWidth={2} name="Check-ins" />
            </LineChart>
        </ResponsiveContainer>
    </div>
);

const ScoringTable = ({ data, launchName }: { data: TableData[], launchName: string }) => {
    const exportToCSV = () => {
        const headers = ["Canal", "Inscrições", "Check-ins", "Quente (>80)", "Quente-Morno", "Morno", "Morno-Frio", "Frio (<35)"];
        const csvRows = [headers.join(','), ...data.map(row => [`"${row.canal.replace(/"/g, '""')}"`, row.inscricoes, row.check_ins, row.quente_mais_80, row.quente_morno, row.morno, row.morno_frio, row.frio_menos_35].join(','))];
        const csvString = csvRows.join('\n');
        const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `scoring_${launchName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-700">Scoring por Canal</h2>
                <button onClick={exportToCSV} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 transition-colors"><FaFileCsv /> Exportar</button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead className="bg-slate-50"><tr><th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Canal</th><th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Inscrições</th><th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Check-ins</th><th className="px-4 py-3 text-center text-xs font-medium text-blue-800 uppercase">Frio (&lt;35)</th><th className="px-4 py-3 text-center text-xs font-medium text-blue-400 uppercase">Morno-Frio</th><th className="px-4 py-3 text-center text-xs font-medium text-yellow-500 uppercase">Morno</th><th className="px-4 py-3 text-center text-xs font-medium text-orange-500 uppercase">Quente-Morno</th><th className="px-4 py-3 text-center text-xs font-medium text-red-600 uppercase">Quente (&gt;80)</th></tr></thead><tbody className="bg-white divide-y divide-slate-200">{data.map((row, index) => (<tr key={row.canal + index}><td className="p-3 md:px-4 md:py-4 font-medium text-slate-900 md:max-w-xs truncate" title={row.canal}>{row.canal}</td><td className="p-3 md:px-4 md:py-4 md:text-center text-sm text-slate-600">{row.inscricoes}</td><td className="p-3 md:px-4 md:py-4 md:text-center text-sm text-slate-600">{row.check_ins}</td><td className="p-3 md:px-4 md:py-4 md:text-center text-sm text-blue-800">{row.frio_menos_35}</td><td className="p-3 md:px-4 md:py-4 md:text-center text-sm text-blue-400">{row.morno_frio}</td><td className="p-3 md:px-4 md:py-4 md:text-center text-sm text-yellow-500">{row.morno}</td><td className="p-3 md:px-4 md:py-4 md:text-center text-sm text-orange-500">{row.quente_morno}</td><td className="p-3 md:px-4 md:py-4 md:text-center text-sm text-red-600">{row.quente_mais_80}</td></tr>))}</tbody>
                </table>
            </div>
        </div>
    );
};

// --- Componente Principal da Página ---
export default function LeadScoringPage() {
    const supabase = createClient();
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunch, setSelectedLaunch] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingData, setIsLoadingData] = useState(true);

    const [rawLeads, setRawLeads] = useState<RawLead[]>([]);
    const [selectedSource, setSelectedSource] = useState('all');
    const [selectedMedium, setSelectedMedium] = useState('all');
    const [selectedContent, setSelectedContent] = useState('all');

    useEffect(() => {
        const fetchLaunches = async () => {
            setIsLoading(true);
            const { data, error } = await supabase.from('lancamentos').select('id, nome, status').in('status', ['Em Andamento', 'Concluído']);
            if (data) {
                const sorted = [...data].sort((a, b) => (a.status === 'Em Andamento' ? -1 : 1) - (b.status === 'Em Andamento' ? -1 : 1) || a.nome.localeCompare(b.nome));
                setLaunches(sorted);
                if (sorted.length > 0) setSelectedLaunch(sorted[0].id);
            } else { toast.error("Erro ao buscar lançamentos."); }
            setIsLoading(false);
        };
        fetchLaunches();
    }, [supabase]);

    useEffect(() => {
        const loadRawData = async () => {
            if (!selectedLaunch) return;
            setIsLoadingData(true);
            setRawLeads([]);
            let allLeads: RawLead[] = [];
            let page = 0;
            const pageSize = 1000;
            let keepFetching = true;

            while (keepFetching) {
                const { data, error } = await supabase
                    .from('leads')
                    .select('score, check_in_at, created_at, utm_source, utm_medium, utm_content')
                    .eq('launch_id', selectedLaunch)
                    .range(page * pageSize, (page + 1) * pageSize - 1);

                if (error) { toast.error("Erro ao carregar dados dos leads."); keepFetching = false; break; }
                if (data) allLeads = [...allLeads, ...data];
                if (!data || data.length < pageSize) keepFetching = false; else page++;
            }
            setRawLeads(allLeads);
            setIsLoadingData(false);
        };
        loadRawData();
    }, [selectedLaunch, supabase]);

    const filterOptions = useMemo(() => {
        let leads = rawLeads;
        const sources = new Set<string>();
        const mediums = new Set<string>();
        const contents = new Set<string>();
        rawLeads.forEach(lead => { if(lead.utm_source) sources.add(lead.utm_source) });
        if (selectedSource !== 'all') leads = leads.filter(l => l.utm_source === selectedSource);
        leads.forEach(lead => { if(lead.utm_medium) mediums.add(lead.utm_medium) });
        if (selectedMedium !== 'all') leads = leads.filter(l => l.utm_medium === selectedMedium);
        leads.forEach(lead => { if(lead.utm_content) contents.add(lead.utm_content) });
        return { sources: Array.from(sources).sort(), mediums: Array.from(mediums).sort(), contents: Array.from(contents).sort() };
    }, [rawLeads, selectedSource, selectedMedium]);

    const filteredLeads = useMemo(() => {
        return rawLeads.filter(lead => 
            (selectedSource === 'all' || lead.utm_source === selectedSource) &&
            (selectedMedium === 'all' || lead.utm_medium === selectedMedium) &&
            (selectedContent === 'all' || lead.utm_content === selectedContent)
        );
    }, [rawLeads, selectedSource, selectedMedium, selectedContent]);

    const grandTotalKpis = useMemo(() => ({
        inscricoes: rawLeads.length,
        checkins: rawLeads.filter(l => l.check_in_at).length,
    }), [rawLeads]);

    const filteredKpis = useMemo(() => ({
        inscricoes: filteredLeads.length,
        checkins: filteredLeads.filter(l => l.check_in_at).length,
    }), [filteredLeads]);

    const scoreDistributionChartData = useMemo(() => {
        const totals = filteredLeads.reduce((acc, row) => {
            const score = row.score || 0;
            if (score > 80) acc.quente_mais_80++;
            else if (score >= 65) acc.quente_morno++;
            else if (score >= 50) acc.morno++;
            else if (score >= 35) acc.morno_frio++;
            else if (score > 0) acc.frio_menos_35++;
            return acc;
        }, { quente_mais_80: 0, quente_morno: 0, morno: 0, morno_frio: 0, frio_menos_35: 0 });
        const chartData = [
            { name: 'Quente (>80)', value: totals.quente_mais_80, fill: '#fa0606ff' },
            { name: 'Quente-Morno (65-79)', value: totals.quente_morno, fill: '#c1a519ff' },
            { name: 'Morno (50-64)', value: totals.morno, fill: '#45b615ff' },
            { name: 'Morno-Frio (35-49)', value: totals.morno_frio, fill: '#32abd3ff' },
            { name: 'Frio (<35)', value: totals.frio_menos_35, fill: '#4112e9ff' },
        ];
        return chartData.filter(item => item.value > 0);
    }, [filteredLeads]);
    
    const dailyEvolutionChartData = useMemo(() => {
        const grouped = filteredLeads
            .filter(lead => lead.created_at) // <-- CORREÇÃO APLICADA AQUI
            .reduce((acc, lead) => {
                const date = new Date(lead.created_at as string).toLocaleDateString('pt-BR');
                if (!acc[date]) acc[date] = { inscricoes: 0, checkins: 0 };
                acc[date].inscricoes++;
                if (lead.check_in_at) acc[date].checkins++;
                return acc;
            }, {} as Record<string, { inscricoes: number, checkins: number }>);
        return Object.entries(grouped).map(([data, values]) => ({ data, ...values })).sort((a,b) => new Date(a.data.split('/').reverse().join('-')).getTime() - new Date(b.data.split('/').reverse().join('-')).getTime());
    }, [filteredLeads]);

    const scoringTableData = useMemo(() => {
        let groupingKey: keyof RawLead = 'utm_source';
        if (selectedSource !== 'all') groupingKey = 'utm_medium';
        if (selectedMedium !== 'all') groupingKey = 'utm_content';

        const getScoreCategory = (score: number | null) => {
            const s = score || 0;
            if (s > 80) return 'quente_mais_80';
            if (s >= 65) return 'quente_morno';
            if (s >= 50) return 'morno';
            if (s >= 35) return 'morno_frio';
            return 'frio_menos_35';
        };

        const grouped = filteredLeads.reduce((acc, lead) => {
            const key = lead[groupingKey] || 'N/A';
            if (!acc[key]) {
                acc[key] = { inscricoes: 0, check_ins: 0, quente_mais_80: 0, quente_morno: 0, morno: 0, morno_frio: 0, frio_menos_35: 0 };
            }
            acc[key].inscricoes++;
            if (lead.check_in_at) acc[key].check_ins++;
            const scoreCategory = getScoreCategory(lead.score);
            (acc[key] as any)[scoreCategory]++;
            return acc;
        }, {} as Record<string, Omit<TableData, 'canal'>>);

        return Object.entries(grouped).map(([canal, data]) => ({ canal, ...data })).sort((a,b) => b.inscricoes - a.inscricoes);
    }, [filteredLeads, selectedSource, selectedMedium]);


    return (
        <div className="space-y-6 p-4 md:p-6 bg-slate-50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Dashboard de Lead Scoring</h1>
                <div className="bg-white p-2 rounded-lg shadow-md w-full md:w-auto">
                    <select value={selectedLaunch} onChange={e => setSelectedLaunch(e.target.value)} className="w-full px-3 py-2 border-none rounded-md focus:ring-0 bg-transparent" disabled={isLoading}>
                        {launches.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.status})</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard title="Total Geral Inscrições" value={grandTotalKpis.inscricoes.toLocaleString('pt-BR')} icon={FaGlobe} subTitle="Total do Lançamento" />
                <KpiCard title="Total Geral Check-ins" value={grandTotalKpis.checkins.toLocaleString('pt-BR')} icon={FaBullseye} subTitle="Total do Lançamento" />
                <KpiCard title="Inscrições (Filtro)" value={filteredKpis.inscricoes.toLocaleString('pt-BR')} icon={FaUsers} subTitle="Resultado do filtro atual" />
                <KpiCard title="Check-ins (Filtro)" value={filteredKpis.checkins.toLocaleString('pt-BR')} icon={FaUserCheck} subTitle="Resultado do filtro atual" />
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center gap-2 mb-4">
                    <FaFilter className="text-blue-600"/>
                    <h2 className="text-lg font-semibold text-slate-700">Filtros</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">UTM Source</label>
                        <select value={selectedSource} onChange={e => { setSelectedSource(e.target.value); setSelectedMedium('all'); setSelectedContent('all'); }} className="w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md">
                            <option value="all">Todos</option>
                            {filterOptions.sources.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">UTM Medium</label>
                        <select value={selectedMedium} onChange={e => { setSelectedMedium(e.target.value); setSelectedContent('all'); }} className="w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md">
                            <option value="all">Todos</option>
                            {filterOptions.mediums.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">UTM Content</label>
                        <select value={selectedContent} onChange={e => setSelectedContent(e.target.value)} className="w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md">
                            <option value="all">Todos</option>
                            {filterOptions.contents.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {isLoadingData ? (
                <div className="flex justify-center items-center p-10"><FaSpinner className="animate-spin text-blue-600 text-4xl" /></div>
            ) : (
                <div className="space-y-6">
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {scoreDistributionChartData.length > 0 && <ScoreDistributionChart data={scoreDistributionChartData} />}
                        {dailyEvolutionChartData.length > 0 && <DailyEvolutionChart data={dailyEvolutionChartData} />}
                    </div>
                    <ScoringTable data={scoringTableData} launchName={launches.find(l => l.id === selectedLaunch)?.nome || 'export'} />
                </div>
            )}
        </div>
    );
}