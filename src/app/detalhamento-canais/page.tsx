'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { FaSpinner, FaChevronDown } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';


// --- Tipos de Dados ---
type Launch = { id: string; nome: string; status: string; };
type Kpis = {
    total_inscriptions: number;
    total_checkins: number;
    avulso_leads: number;
    conversion_rate: number;
};
type ChannelDetails = {
    source: string;
    medium: string;
    content: string;
    inscritos: number;
    checkins: number;
};
type DailyChartData = {
    data: string;
    inscricoes: number;
    checkins: number;
};
type DashboardData = {
    kpis: Kpis;
    details: ChannelDetails[];
    chartData: DailyChartData[];
};
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
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis />
                <Tooltip />
                <Legend />
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
    const [trafficType, setTrafficType] = useState('paid'); // Estado para controlar o tipo de tráfego

    const toggleItem = (key: string) => {
        setOpenItems(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const loadData = useCallback(async (launchId: string) => {
        if (!launchId) return;
        setIsLoading(true);
        try {
            // Chama a nova função e passa o tipo de tráfego
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
    }, [supabase, trafficType]); // Adiciona trafficType como dependência

    useEffect(() => {
        const fetchLaunches = async () => {
            try {
                const { data: launchesData, error } = await supabase.from('lancamentos').select('id, nome, status');
                if (error) throw error;
                if (launchesData) {
                    const statusOrder: { [key: string]: number } = { 'Em Andamento': 1, 'Concluído': 2 };
                    const filtered = launchesData.filter(l => l.status === 'Em Andamento' || l.status === 'Concluído').sort((a,b) => statusOrder[a.status] - statusOrder[b.status]);
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
    }, [selectedLaunch, loadData]); // loadData já inclui trafficType, então recarrega ao mudar

    const groupedDetails = useMemo(() => {
        if (!data?.details) return {};
        const groups: GroupedDetails = {};
        data.details.forEach(item => {
            const source = item.source || 'N/A';
            const medium = item.medium || 'N/A';
            if (!groups[source]) groups[source] = {};
            if (!groups[source][medium]) groups[source][medium] = [];
            groups[source][medium].push(item);
        });
        return groups;
    }, [data]);

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

            {/* SELETOR DE TRÁFEGO PAGO VS ORGÂNICO */}
            <div className="bg-white p-4 rounded-lg shadow-sm flex justify-center">
                <div className="flex items-center gap-4 rounded-lg p-1 bg-slate-200">
                    <button 
                        onClick={() => setTrafficType('paid')}
                        disabled={isLoading}
                        className={`px-6 py-2 text-sm font-semibold rounded-md transition-colors ${trafficType === 'paid' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-300'}`}
                    >
                        Tráfego Pago
                    </button>
                    <button 
                        onClick={() => setTrafficType('organic')}
                        disabled={isLoading}
                        className={`px-6 py-2 text-sm font-semibold rounded-md transition-colors ${trafficType === 'organic' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-300'}`}
                    >
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
                        
                        {/* Tabela para Desktop */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-slate-50">
                                    <tr>
                                        {/* --- INÍCIO DA CORREÇÃO --- */}
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Hierarquia UTM (Source &gt; Medium &gt; Content)</th>
                                        {/* --- FIM DA CORREÇÃO --- */}
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Inscritos</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Check-ins</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tx Check in</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white">
                                    {Object.keys(groupedDetails).length === 0 ? (
                                        <tr><td colSpan={4} className="text-center py-5 text-slate-500">Nenhum dado UTM encontrado.</td></tr>
                                    ) : (
                                        Object.entries(groupedDetails).flatMap(([source, mediums]) => [
                                            <tr key={source} className="bg-slate-200"><td className="px-6 py-3 font-bold text-slate-800" colSpan={4}>{source}</td></tr>,
                                            ...Object.entries(mediums).flatMap(([medium, contents]) => [
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
                                        ])
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Lista para Mobile */}
                        <div className="md:hidden space-y-2">
                            {Object.entries(groupedDetails).map(([source, mediums]) => (
                                <div key={source} className="border rounded-lg overflow-hidden">
                                    <button onClick={() => toggleItem(source)} className="w-full flex justify-between items-center bg-slate-200 p-3 font-bold text-slate-800">
                                        <span>{source}</span>
                                        <FaChevronDown className={`transition-transform ${openItems[source] ? 'rotate-180' : ''}`} />
                                    </button>
                                    {openItems[source] && (
                                        <div className="bg-slate-50">
                                            {Object.entries(mediums).map(([medium, contents]) => (
                                                <div key={`${source}-${medium}`} className="border-t">
                                                    <button onClick={() => toggleItem(`${source}-${medium}`)} className="w-full flex justify-between items-center bg-slate-100 p-3 font-semibold text-slate-700 text-left">
                                                        <span>{medium}</span>
                                                        <FaChevronDown className={`transition-transform ${openItems[`${source}-${medium}`] ? 'rotate-180' : ''}`} />
                                                    </button>
                                                    {openItems[`${source}-${medium}`] && (
                                                        <div className="p-3 space-y-3">
                                                            {contents.map((item, index) => {
                                                                const conversionRate = (item.inscritos || 0) > 0 ? ((item.checkins || 0) / item.inscritos * 100) : 0;
                                                                return (
                                                                    <div key={`${source}-${medium}-${index}`} className="bg-white p-3 rounded shadow-sm border">
                                                                        <p className="font-semibold text-slate-800 truncate" title={item.content}>{item.content}</p>
                                                                        <div className="flex justify-between text-sm mt-2 text-slate-600">
                                                                            <span>Inscritos: <span className="font-bold">{item.inscritos}</span></span>
                                                                            <span>Check-ins: <span className="font-bold">{item.checkins}</span></span>
                                                                            <span>Conv.: <span className="font-bold">{conversionRate.toFixed(1)}%</span></span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* GRÁFICO DE BARRAS NO FINAL */}
                    {data.chartData && data.chartData.length > 0 && <DailyBarChart data={data.chartData} />}
                </div>
            )}
        </div>
    );
}
