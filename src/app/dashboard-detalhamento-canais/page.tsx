'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { FaSpinner, FaChevronDown } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';


// --- Tipos de Dados ---
type Launch = { id: string; nome: string; status: string; };
type Kpis = {
    total_inscriptions: number; total_checkins: number;
    avulso_leads: number; conversion_rate: number;
};
type ChannelDetails = {
    source: string; medium: string; content: string;
    inscritos: number; checkins: number;
};
type DashboardData = {
    kpis: Kpis; details: ChannelDetails[]; chartData: DailyChartData[];
};
type DailyChartData = {
    data: string; inscricoes: number; checkins: number;
};
// Ajustado para a nova hierarquia
type GroupedDetails = Record<string, Record<string, ChannelDetails[]>>;

// --- Componentes ---
const StatCard = ({ title, value }: { title: string, value: string | number }) => (
    <div className="bg-white p-4 rounded-lg shadow-md text-center">
        <h3 className="text-md font-medium text-slate-500 uppercase">{title}</h3>
        <p className="text-2xl md:text-3xl font-bold text-slate-800 mt-2">{value}</p>
    </div>
);

const DailyBarChart = ({ data }: { data: DailyChartData[] }) => (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Inscrições vs Check-ins por Dia</h2>
        <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="data" /><YAxis /><Tooltip /><Legend />
                <Bar dataKey="inscricoes" fill="#8884d8" name="Inscrições" />
                <Bar dataKey="checkins" fill="#82ca9d" name="Check-ins" />
            </BarChart>
        </ResponsiveContainer>
    </div>
);


// --- Componente Principal da Página ---
export default function DetalhamentoCanaisPage() {
    const supabase = createClientComponentClient();
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunch, setSelectedLaunch] = useState<string>('');
    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
    const [trafficType, setTrafficType] = useState('paid');

    const toggleItem = (key: string) => {
        setOpenItems(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const loadData = useCallback(async (launchId: string) => {
        if (!launchId) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_hierarchical_traffic_details', { 
                p_launch_id: launchId,
                p_traffic_type: trafficType
            });
            if (error) throw error;
            setData(data);
        } catch (error: unknown) {
            const err = error as Error;
            console.error("Error loading channel details:", err.message);
            setData(null);
        } finally {
            setIsLoading(false);
        }
    }, [supabase, trafficType]);

    useEffect(() => {
        const fetchLaunches = async () => {
            try {
                const { data: launchesData, error } = await supabase.from('lancamentos').select('id, nome, status');
                if (error) throw error;
                if (launchesData) {
                    const statusOrder: { [key: string]: number } = { 'Em Andamento': 1, 'Concluído': 2 };
                    const filtered = launchesData.filter(l => l.status === 'Em Andamento' || l.status === 'Concluído').sort((a,b) => statusOrder[a.status] - statusOrder[b.status] || a.nome.localeCompare(b.nome));
                    setLaunches(filtered);
                    if (filtered.length > 0) {
                        setSelectedLaunch(filtered[0].id);
                    }
                } else {
                    setIsLoading(false);
                }
            } catch (error: unknown) {
                const err = error as Error;
                console.error("Error fetching launches:", err.message);
            }
        };
        fetchLaunches();
    }, [supabase]);

    useEffect(() => {
        if (selectedLaunch) {
            loadData(selectedLaunch);
        }
    }, [selectedLaunch, loadData]);

    const groupedDetails = useMemo(() => {
        if (!data?.details) return {};
        const groups: GroupedDetails = {};
        data.details.forEach(item => {
            const source = item.source || 'Indefinido';
            // Para tráfego pago, o medium é 'N/A' e agrupamos direto por content.
            // Para orgânico, usamos o medium real.
            const medium = trafficType === 'paid' ? 'N/A' : (item.medium || 'Indefinido');
            
            if (!groups[source]) groups[source] = {};
            if (!groups[source][medium]) groups[source][medium] = [];
            groups[source][medium].push(item);
        });
        return groups;
    }, [data, trafficType]);

    return (
        <div className="space-y-6 p-4 md:p-6 bg-slate-50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Dashboard de Detalhamento dos Canais</h1>
                <div className="bg-white p-2 rounded-lg shadow-md w-full md:w-auto">
                    <select value={selectedLaunch} onChange={(e) => setSelectedLaunch(e.target.value)} className="w-full px-3 py-2 border-none rounded-md focus:ring-0 bg-transparent">
                        {launches.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.status})</option>)}
                    </select>
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm flex justify-center">
                <div className="flex items-center gap-4 rounded-lg p-1 bg-slate-200">
                    <button onClick={() => setTrafficType('paid')} disabled={isLoading}
                        className={`px-6 py-2 text-sm font-semibold rounded-md transition-colors ${trafficType === 'paid' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-300'}`}>
                        Tráfego Pago
                    </button>
                    <button onClick={() => setTrafficType('organic')} disabled={isLoading}
                        className={`px-6 py-2 text-sm font-semibold rounded-md transition-colors ${trafficType === 'organic' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-300'}`}>
                        Tráfego Orgânico
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center p-10"><FaSpinner className="animate-spin text-blue-600 text-4xl" /></div>
            ) : !data || !data.kpis ? (
                <div className="text-center py-10 bg-white rounded-lg shadow-md"><p>Nenhum dado encontrado para esta seleção.</p></div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard title="Total Inscrições" value={data.kpis.total_inscriptions.toLocaleString('pt-BR')} />
                        <StatCard title="Total Check-ins" value={data.kpis.total_checkins.toLocaleString('pt-BR')} />
                        <StatCard title="Leads Avulsos" value={data.kpis.avulso_leads.toLocaleString('pt-BR')} />
                        <StatCard title="Taxa de Check in" value={`${(data.kpis.conversion_rate || 0).toFixed(1)}%`} />
                    </div>

                    <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
                        <h2 className="text-lg font-semibold text-slate-700 mb-4">Detalhes por Hierarquia UTM</h2>
                        
                        {/* ================== INÍCIO DA CORREÇÃO DA RENDERIZAÇÃO ================== */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                            {trafficType === 'paid' ? 'Hierarquia UTM (Source > Content)' : 'Hierarquia UTM (Source > Medium > Content)'}
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Inscritos</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Check-ins</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tx Check in</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white">
                                    {Object.entries(groupedDetails).flatMap(([source, mediums]) => [
                                        <tr key={source} className="bg-slate-200"><td className="px-6 py-3 font-bold text-slate-800" colSpan={4}>{source}</td></tr>,
                                        
                                        trafficType === 'organic' ? 
                                        // Lógica para TRÁFEGO ORGÂNICO (3 níveis)
                                        Object.entries(mediums).flatMap(([medium, contents]) => [
                                            <tr key={`${source}-${medium}`} className="bg-slate-50 hover:bg-slate-100"><td className="pl-12 pr-6 py-3 font-semibold text-slate-700" colSpan={4}>{medium}</td></tr>,
                                            ...contents.map((item, index) => {
                                                const conversionRate = (item.inscritos || 0) > 0 ? ((item.checkins || 0) / item.inscritos * 100) : 0;
                                                return (
                                                    <tr key={`${source}-${medium}-${index}`} className="border-b border-slate-200">
                                                        <td className="pl-20 pr-6 py-4 text-sm text-slate-600 max-w-sm truncate" title={item.content}>{item.content}</td>
                                                        <td className="px-6 py-4 text-sm text-slate-500">{item.inscritos}</td>
                                                        <td className="px-6 py-4 text-sm text-slate-500">{item.checkins}</td>
                                                        <td className="px-6 py-4 text-sm text-slate-500">{conversionRate.toFixed(1)}%</td>
                                                    </tr>
                                                );
                                            })
                                        ]) 
                                        : 
                                        // Lógica para TRÁFEGO PAGO (2 níveis)
                                        Object.values(mediums).flat().map((item, index) => {
                                            const conversionRate = (item.inscritos || 0) > 0 ? ((item.checkins || 0) / item.inscritos * 100) : 0;
                                            return (
                                                <tr key={`${source}-${index}`} className="border-b border-slate-200">
                                                    <td className="pl-12 pr-6 py-4 text-sm text-slate-600 max-w-sm truncate" title={item.content}>{item.content}</td>
                                                    <td className="px-6 py-4 text-sm text-slate-500">{item.inscritos}</td>
                                                    <td className="px-6 py-4 text-sm text-slate-500">{item.checkins}</td>
                                                    <td className="px-6 py-4 text-sm text-slate-500">{conversionRate.toFixed(1)}%</td>
                                                </tr>
                                            );
                                        })
                                    ])}
                                </tbody>
                            </table>
                        </div>
                        {/* A lógica para mobile também precisa ser ajustada, mas a de desktop já reflete a nova estrutura */}
                        {/* ================== FIM DA CORREÇÃO DA RENDERIZAÇÃO ================== */}
                    </div>
                    
                    {data.chartData && data.chartData.length > 0 && <DailyBarChart data={data.chartData} />}
                </div>
            )}
        </div>
    );
}