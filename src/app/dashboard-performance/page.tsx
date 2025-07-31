'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import toast from 'react-hot-toast';
import { FaSpinner, FaFilter, FaUsers, FaUserCheck, FaGlobe, FaBullseye } from 'react-icons/fa';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';


// --- Tipagens de Dados ---
type Launch = { id: string; nome: string; status: string; };

type RawLead = {
    check_in_at: string | null;
    utm_source: string | null;
    utm_medium: string | null;
    utm_content: string | null;
};

// Tipagem para os dados dos gráficos de pizza
type ChartRow = {
  name: string;
  value: number;
};

type PerformanceData = {
    name: string;
    inscricoes: number;
    checkins: number;
    taxa_checkin: number;
};

// --- Constantes ---
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1919', '#4F4FFF', '#4FFF4F', '#800080', '#A9A9A9'];

// --- Funções de Renderização e Componentes de UI ---

interface CustomizedLabelProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
}

const renderCustomizedLabel = (props: CustomizedLabelProps) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
  if (cx === undefined || cy === undefined || midAngle === undefined || innerRadius === undefined || outerRadius === undefined || percent === undefined) {
    return null;
  }
  // Não renderiza o label se a fatia for muito pequena
  if ((percent * 100) < 3) {
    return null;
  }
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
  const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12px" fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

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

const PieChartWithLegend = ({ title, data }: { title: string, data: ChartRow[] }) => {
    const formatLegendText = (value: string) => {
        const maxLength = 35;
        return value.length > maxLength ? `${value.substring(0, maxLength)}...` : value;
    };

    return (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold text-slate-700 mb-4">{title}</h2>
            <div style={{ width: '100%', height: 400 }}>
                <ResponsiveContainer>
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="value"
                            nameKey="name"
                            cx="40%" // Ajustado para dar mais espaço para a legenda
                            cy="50%"
                            outerRadius={120}
                            fill="#8884d8"
                            labelLine={false}
                            label={renderCustomizedLabel}
                        >
                            {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR')} />
                        <Legend
                            layout="vertical"
                            verticalAlign="middle"
                            align="right"
                            iconSize={10}
                            formatter={formatLegendText}
                            wrapperStyle={{
                                fontSize: "12px",
                                lineHeight: "1.5",
                                overflowY: "auto",
                                maxHeight: "350px",
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const PerformanceTable = ({ data }: { data: PerformanceData[] }) => (
    <div className="bg-white rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-slate-700 mb-4 p-4">Detalhes por Canal</h2>
        <div className="overflow-x-auto">
            <table className="min-w-full">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Canal</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Inscrições</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Check-ins</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Taxa de Check-in</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                    {data.length === 0 ? (
                        <tr><td colSpan={4} className="text-center py-10 text-slate-500">Nenhum dado encontrado para esta seleção.</td></tr>
                    ) : (
                        data.map((item) => (
                            <tr key={item.name}>
                                <td className="px-4 py-4 font-medium text-slate-800 truncate" title={item.name}>{item.name}</td>
                                <td className="px-4 py-4 text-sm text-slate-600">{item.inscricoes.toLocaleString('pt-BR')}</td>
                                <td className="px-4 py-4 text-sm text-slate-600">{item.checkins.toLocaleString('pt-BR')}</td>
                                <td className="px-4 py-4 text-sm text-slate-600">
                                    {/* CORREÇÃO: Ícone de % removido */}
                                    {item.taxa_checkin.toFixed(1)}%
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    </div>
);


// --- Página Principal ---
export default function PerformanceDashboardPage() {
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
                const statusOrder: { [key: string]: number } = { 'Em Andamento': 1, 'Concluído': 2 };
                const sorted = data.sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || a.nome.localeCompare(b.nome));
                setLaunches(sorted);
                if (sorted.length > 0) setSelectedLaunch(sorted[0].id);
            } else { toast.error("Erro ao buscar lançamentos."); }
            setIsLoading(false);
        };
        fetchLaunches();
    }, [supabase]);

    useEffect(() => {
        const loadRawDataWithPagination = async () => {
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
                    .select('check_in_at, utm_source, utm_medium, utm_content')
                    .eq('launch_id', selectedLaunch)
                    .range(page * pageSize, (page + 1) * pageSize - 1);

                if (error) { toast.error("Erro ao carregar dados dos leads."); keepFetching = false; break; }
                if (data) allLeads = [...allLeads, ...data];
                if (!data || data.length < pageSize) keepFetching = false; else page++;
            }
            setRawLeads(allLeads);
            setIsLoadingData(false);
        };
        loadRawDataWithPagination();
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
        return {
            sources: Array.from(sources).sort(),
            mediums: Array.from(mediums).sort(),
            contents: Array.from(contents).sort(),
        };
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
    
    const processPieData = (data: RawLead[], key: keyof RawLead): ChartRow[] => {
        const grouped = data.reduce((acc, lead) => {
            const groupKey = lead[key] || 'N/A';
            acc[groupKey] = (acc[groupKey] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const sortedData = Object.entries(grouped).sort(([, a], [, b]) => b - a);

        if (sortedData.length <= 10) {
            return sortedData.map(([name, value]) => ({ name, value }));
        }

        const top9 = sortedData.slice(0, 9);
        const othersValue = sortedData.slice(9).reduce((sum, [, value]) => sum + value, 0);
        const result = top9.map(([name, value]) => ({ name, value }));
        if (othersValue > 0) {
            result.push({ name: 'Outros', value: othersValue });
        }
        return result;
    }

    const pieDataByMedium = useMemo(() => processPieData(filteredLeads, 'utm_medium'), [filteredLeads]);
    const pieDataByContent = useMemo(() => processPieData(filteredLeads, 'utm_content'), [filteredLeads]);

    const tableData = useMemo((): PerformanceData[] => {
        let groupingKey: keyof RawLead = 'utm_source';
        if (selectedSource !== 'all') groupingKey = 'utm_medium';
        if (selectedMedium !== 'all') groupingKey = 'utm_content';

        const grouped = filteredLeads.reduce((acc, lead) => {
            const key = lead[groupingKey] || 'N/A';
            if (!acc[key]) acc[key] = { inscricoes: 0, checkins: 0 };
            acc[key].inscricoes++;
            if (lead.check_in_at) acc[key].checkins++;
            return acc;
        }, {} as Record<string, { inscricoes: number, checkins: number }>);

        return Object.entries(grouped).map(([name, data]) => ({
            name, ...data, taxa_checkin: data.inscricoes > 0 ? (data.checkins / data.inscricoes) * 100 : 0,
        })).sort((a, b) => b.inscricoes - a.inscricoes);
    }, [filteredLeads, selectedSource, selectedMedium]);

    return (
        <div className="space-y-6 p-4 md:p-6 bg-slate-50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Performance de Canais</h1>
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
                    <h2 className="text-lg font-semibold text-slate-700">Filtros de Performance</h2>
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
                    {/* CORREÇÃO: Layout alterado para empilhar os gráficos */}
                    <div className="grid grid-cols-1 gap-6">
                        <PieChartWithLegend title="Inscrições por Mídia" data={pieDataByMedium} />
                        <PieChartWithLegend title="Inscrições por Conteúdo" data={pieDataByContent} />
                    </div>
                    <PerformanceTable data={tableData} />
                </div>
            )}
        </div>
    );
}