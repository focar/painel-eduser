// src/app/dashboard-posicao-final/page.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import toast from 'react-hot-toast';
import { FaSpinner, FaUsers, FaCheckCircle, FaShoppingCart, FaGlobe, FaUserCheck, FaPercent, FaFilter } from 'react-icons/fa';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- Tipagens de Dados ---
type Launch = { id: string; nome: string; status: string; };

type RawLead = {
    check_in_at: string | null;
    is_buyer: boolean | null;
    utm_source: string | null;
    utm_medium: string | null;
    utm_content: string | null;
};

type TableRow = {
    canal: string;
    qtd_inscricoes: number;
    qtd_checkins: number;
    qtd_compradores: number;
};

type DonutChartData = { name: string; value: number; };

// Cliente Supabase inicializado fora do componente para estabilidade.
const supabase = createClient();

// --- Componentes ---
const KpiCard = ({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType; }) => (
    <div className="bg-white p-4 rounded-lg shadow-md flex items-center gap-4">
        <div className="bg-blue-100 p-3 rounded-full">
            <Icon className="text-blue-600 text-2xl" />
        </div>
        <div>
            <p className="text-base text-slate-500">{title}</p>
            <p className="text-3xl font-bold text-slate-800">{value}</p>
        </div>
    </div>
);

const DonutChartCard = ({ title, data }: { title: string; data: DonutChartData[] }) => {
    const COLORS = ['#4e79a7', '#f28e2c', '#e15759']; // Azul, Laranja, Cinza para Não Traqueadas

    const renderCustomizedDonutLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        if (!percent || percent < 0.05) return null;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
        const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));

        return (
            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontWeight="bold" fontSize={16}>
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    const hasData = data && data.length > 0 && data.some(item => item.value > 0);

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-slate-700 text-center mb-4">{title}</h3>
            <ResponsiveContainer width="100%" height={250}>
                {hasData ? (
                    <PieChart>
                        <Pie 
                            data={data} 
                            dataKey="value" 
                            nameKey="name" 
                            cx="50%" 
                            cy="50%" 
                            innerRadius={50} 
                            outerRadius={90} 
                            paddingAngle={5} 
                            labelLine={false}
                            label={renderCustomizedDonutLabel}
                        >
                            {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR')} />
                        <Legend />
                    </PieChart>
                ) : (
                    // CORREÇÃO: Layout do placeholder ajustado para não sobrepor.
                    <div className="flex flex-col items-center justify-center h-full text-slate-500">
                         <PieChart width={200} height={200}>
                            <Pie data={[{ value: 1 }]} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={90} fill="#E0E0E0" />
                         </PieChart>
                         <p className="font-semibold">DADOS NÃO ENCONTRADOS</p>
                    </div>
                )}
            </ResponsiveContainer>
        </div>
    );
};

// --- Página Principal ---
export default function PosicaoFinalPage() {
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
            const { data, error } = await supabase.rpc('get_lancamentos_permitidos');
            if (data) {
                const sorted = [...data].sort((a, b) => (a.status === 'Em Andamento' ? -1 : 1) - (b.status === 'Em Andamento' ? -1 : 1) || a.nome.localeCompare(b.nome));
                setLaunches(sorted);
                if (sorted.length > 0) setSelectedLaunch(sorted[0].id);
            } else { toast.error("Erro ao buscar lançamentos."); }
            setIsLoading(false);
        };
        fetchLaunches();
    }, []);

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
                    .select('check_in_at, is_buyer, utm_source, utm_medium, utm_content')
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
    }, [selectedLaunch]);

    const getCleanUtm = (value: string | null | undefined): string => {
        if (!value || value.trim() === '' || value.includes('{') || value.includes('{{')) {
            return 'Não Traqueadas';
        }
        return value;
    };

    const processedLeads = useMemo(() => {
        return rawLeads.map(lead => ({
            ...lead,
            utm_source: getCleanUtm(lead.utm_source),
            utm_medium: getCleanUtm(lead.utm_medium),
            utm_content: getCleanUtm(lead.utm_content),
        }));
    }, [rawLeads]);

    const filterOptions = useMemo(() => {
        let leads = processedLeads;
        const sources = new Set<string>();
        leads.forEach(lead => sources.add(lead.utm_source));

        if (selectedSource !== 'all') leads = leads.filter(l => l.utm_source === selectedSource);
        const mediums = new Set<string>();
        leads.forEach(lead => mediums.add(lead.utm_medium));

        if (selectedMedium !== 'all') leads = leads.filter(l => l.utm_medium === selectedMedium);
        const contents = new Set<string>();
        leads.forEach(lead => contents.add(lead.utm_content));
        
        return {
            sources: Array.from(sources).sort((a, b) => a.localeCompare(b)),
            mediums: Array.from(mediums).sort((a, b) => a.localeCompare(b)),
            contents: Array.from(contents).sort((a, b) => a.localeCompare(b)),
        };
    }, [processedLeads, selectedSource, selectedMedium]);

    const filteredLeads = useMemo(() => {
        return processedLeads.filter(lead =>
            (selectedSource === 'all' || lead.utm_source === selectedSource) &&
            (selectedMedium === 'all' || lead.utm_medium === selectedMedium) &&
            (selectedContent === 'all' || lead.utm_content === selectedContent)
        );
    }, [processedLeads, selectedSource, selectedMedium, selectedContent]);

    const kpis = useMemo(() => {
        const totalInscricoes = processedLeads.length;
        const totalCheckins = processedLeads.filter(l => l.check_in_at).length;
        const totalCompradores = processedLeads.filter(l => l.is_buyer).length;
        const taxaCheckin = totalInscricoes > 0 ? ((totalCheckins / totalInscricoes) * 100).toFixed(1) + '%' : '0.0%';
        const taxaCompradores = totalInscricoes > 0 ? ((totalCompradores / totalInscricoes) * 100).toFixed(1) + '%' : '0.0%';

        const inscricoesFiltro = filteredLeads.length;
        const checkinsFiltro = filteredLeads.filter(l => l.check_in_at).length;
        const compradoresFiltro = filteredLeads.filter(l => l.is_buyer).length;
        const conversaoFinalFiltro = checkinsFiltro > 0 ? ((compradoresFiltro / checkinsFiltro) * 100).toFixed(1) + '%' : '0.0%';

        return { totalInscricoes, totalCheckins, totalCompradores, taxaCheckin, taxaCompradores, inscricoesFiltro, checkinsFiltro, compradoresFiltro, conversaoFinalFiltro };
    }, [processedLeads, filteredLeads]);

    const tableData = useMemo((): TableRow[] => {
        let groupingKey: keyof RawLead = 'utm_source';
        if (selectedSource !== 'all') groupingKey = 'utm_medium';
        if (selectedMedium !== 'all') groupingKey = 'utm_content';

        const grouped = filteredLeads.reduce((acc, lead) => {
            const key = lead[groupingKey] as string;
            if (!acc[key]) acc[key] = { qtd_inscricoes: 0, qtd_checkins: 0, qtd_compradores: 0 };
            acc[key].qtd_inscricoes++;
            if (lead.check_in_at) acc[key].qtd_checkins++;
            if (lead.is_buyer) acc[key].qtd_compradores++;
            return acc;
        }, {} as Record<string, Omit<TableRow, 'canal'>>);
        
        return Object.entries(grouped)
            .map(([canal, data]) => ({ canal, ...data }))
            .sort((a, b) => b.qtd_compradores - a.qtd_compradores);
    }, [filteredLeads, selectedSource, selectedMedium]);

    // CORREÇÃO: Lógica dos gráficos agora depende de `filteredLeads` para se atualizar com os filtros.
    const { totalLeadsChartData, buyerLeadsChartData } = useMemo(() => {
        const getTrafficOrigin = (source: string) => {
            if (source === 'Não Traqueadas') return 'Não Traqueadas';
            if (['google', 'bing', 'organic', 'referral'].includes(source.toLowerCase())) return 'Orgânico';
            return 'Tráfego Pago';
        };

        const leadsByOrigin = filteredLeads.reduce((acc, lead) => {
            const origin = getTrafficOrigin(lead.utm_source);
            acc[origin] = (acc[origin] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const buyersByOrigin = filteredLeads.filter(l => l.is_buyer).reduce((acc, lead) => {
            const origin = getTrafficOrigin(lead.utm_source);
            acc[origin] = (acc[origin] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            totalLeadsChartData: Object.entries(leadsByOrigin).map(([name, value]) => ({ name, value })),
            buyerLeadsChartData: Object.entries(buyersByOrigin).map(([name, value]) => ({ name, value })),
        };
    }, [filteredLeads]);

    return (
        <div className="space-y-6 p-4 md:p-6 bg-slate-50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Posição Final Compradores</h1>
                <div className="bg-white p-2 rounded-lg shadow-md w-full md:w-auto">
                    <select value={selectedLaunch} onChange={e => setSelectedLaunch(e.target.value)} className="w-full px-3 py-2 border-none rounded-md focus:ring-0 bg-transparent" disabled={isLoading}>
                        {launches.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.status})</option>)}
                    </select>
                </div>
            </div>

            {isLoadingData ? (<div className="flex justify-center items-center p-10"><FaSpinner className="animate-spin text-blue-600 text-4xl" /></div>) : (
            <>
                <section className="space-y-6">
                    <div className="bg-slate-200 p-4 rounded-lg space-y-3">
                        <h3 className="font-bold text-center text-slate-600">Totais do Lançamento (Geral)</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            <KpiCard title="Total Inscrições" value={kpis.totalInscricoes.toLocaleString('pt-BR')} icon={FaGlobe}/>
                            <KpiCard title="Total Check-ins" value={kpis.totalCheckins.toLocaleString('pt-BR')} icon={FaUserCheck}/>
                            <KpiCard title="Taxa de Check-in" value={kpis.taxaCheckin} icon={FaPercent}/>
                            <KpiCard title="Total Compradores" value={kpis.totalCompradores.toLocaleString('pt-BR')} icon={FaShoppingCart}/>
                            <KpiCard title="Taxa de Compradores" value={kpis.taxaCompradores} icon={FaPercent}/>
                        </div>
                    </div>
                    <div className="bg-slate-200 p-4 rounded-lg space-y-3">
                        <h3 className="font-bold text-center text-slate-600">Performance do Lançamento (Filtro)</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            <KpiCard title="Inscrições no Filtro" value={kpis.inscricoesFiltro.toLocaleString('pt-BR')} icon={FaUsers}/>
                            <KpiCard title="Check-ins no Filtro" value={kpis.checkinsFiltro.toLocaleString('pt-BR')} icon={FaCheckCircle}/>
                            <KpiCard title="Compradores no Filtro" value={kpis.compradoresFiltro.toLocaleString('pt-BR')} icon={FaShoppingCart}/>
                            <KpiCard title="Conversão Final (Filtro)" value={kpis.conversaoFinalFiltro} icon={FaPercent}/>
                        </div>
                    </div>
                </section>

                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex items-center gap-2 mb-4">
                        <FaFilter className="text-blue-600" />
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <DonutChartCard title="Inscrições por Origem" data={totalLeadsChartData} />
                    <DonutChartCard title="Compradores por Origem" data={buyerLeadsChartData} />
                </div>

                <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
                    <h2 className="text-lg font-semibold text-slate-700 mb-4">Performance por Canal</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Canal</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Inscrições</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Check-ins</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Compradores</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Taxa de Conversão</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {tableData.map((row, index) => {
                                    const convRate = (row.qtd_checkins || 0) > 0 ? ((row.qtd_compradores || 0) / row.qtd_checkins * 100).toFixed(2) : '0.00';
                                    return (
                                        <tr key={index}>
                                            <td className="px-4 py-4 font-medium text-slate-800 max-w-sm truncate text-base" title={row.canal}>{row.canal || 'N/A'}</td>
                                            <td className="px-4 py-4 text-base text-slate-600">{row.qtd_inscricoes.toLocaleString('pt-BR')}</td>
                                            <td className="px-4 py-4 text-base text-slate-600">{row.qtd_checkins.toLocaleString('pt-BR')}</td>
                                            <td className="px-4 py-4 text-base text-slate-600 font-bold">{row.qtd_compradores.toLocaleString('pt-BR')}</td>
                                            <td className="px-4 py-4 text-base font-semibold text-green-600">{convRate}%</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </>
            )}
        </div>
    );
}
