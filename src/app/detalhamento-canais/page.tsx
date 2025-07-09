'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
// CORREÇÃO: Importa o cliente recomendado
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { FaSpinner, FaChevronDown } from 'react-icons/fa';

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
type DashboardData = {
    kpis: Kpis;
    details: ChannelDetails[];
};

type GroupedDetails = Record<string, Record<string, ChannelDetails[]>>;

// --- Componentes ---
const StatCard = ({ title, value }: { title: string, value: string | number }) => (
    <div className="bg-white p-4 rounded-lg shadow-md text-center">
        <h3 className="text-md font-medium text-slate-500 uppercase">{title}</h3>
        <p className="text-2xl md:text-3xl font-bold text-slate-800 mt-2">{value}</p>
    </div>
);

// --- Página Principal ---
export default function DetalhamentoCanaisPage() {
    // CORREÇÃO: Usa o cliente correto
    const supabase = createClientComponentClient();
    
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunch, setSelectedLaunch] = useState<string>('');
    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    // Estado para controlar os itens abertos no accordion mobile
    const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

    const toggleItem = (key: string) => {
        setOpenItems(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const loadData = useCallback(async (launchId: string) => {
        if (!launchId) return;
        setIsLoading(true);
        try {
            // CORREÇÃO: Usa a variável 'supabase'
            const { data, error } = await supabase.rpc('get_channel_details', { p_launch_id: launchId });
            if (error) throw error;
            setData(data);
        } catch (error: unknown) {
            const err = error as Error;
            console.error("Erro ao carregar dados de detalhamento:", err.message);
            setData(null);
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        const fetchLaunches = async () => {
            try {
                // CORREÇÃO: Usa a variável 'supabase'
                const { data: launchesData, error } = await supabase.from('lancamentos').select('id, nome, status');
                if (error) throw error;
                if (launchesData && launchesData.length > 0) {
                    const statusOrder: { [key: string]: number } = { 'Em Andamento': 1, 'Concluído': 2 };
                    const filtered = launchesData.filter(l => l.status === 'Em Andamento' || l.status === 'Concluído').sort((a,b) => statusOrder[a.status] - statusOrder[b.status]);
                    setLaunches(filtered);
                    setSelectedLaunch(filtered[0].id);
                } else {
                    setIsLoading(false);
                }
            } catch (error: unknown) {
                const err = error as Error;
                console.error("Erro ao buscar lançamentos:", err.message);
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
            const source = item.source || 'N/A';
            const medium = item.medium || 'N/A';
            if (!groups[source]) groups[source] = {};
            if (!groups[source][medium]) groups[source][medium] = [];
            groups[source][medium].push(item);
        });
        return groups;
    }, [data]);

    return (
        <div className="space-y-6 p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Dashboard de Detalhamento dos Canais</h1>
                <div className="bg-white p-2 rounded-lg shadow-md w-full md:w-auto">
                    <select value={selectedLaunch} onChange={(e) => setSelectedLaunch(e.target.value)} className="w-full px-3 py-2 border-none rounded-md focus:ring-0 bg-transparent">
                        {launches.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.status})</option>)}
                    </select>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center p-10"><FaSpinner className="animate-spin text-blue-600 text-4xl" /></div>
            ) : !data || !data.kpis ? (
                <div className="text-center py-10 bg-white rounded-lg shadow-md"><p>Nenhum dado encontrado para este lançamento.</p></div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard title="Total Inscrições" value={data.kpis.total_inscriptions} />
                        <StatCard title="Total Check-ins" value={data.kpis.total_checkins} />
                        <StatCard title="Leads Avulsos" value={data.kpis.avulso_leads} />
                        <StatCard title="Taxa de Conversão" value={`${(data.kpis.conversion_rate || 0).toFixed(1)}%`} />
                    </div>

                    <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
                        <h2 className="text-lg font-semibold text-slate-700 mb-4">Detalhes por Hierarquia UTM</h2>
                        
                        {/* ### INÍCIO DA MUDANÇA PARA RESPONSIVIDADE ### */}
                        {/* Versão Desktop: Tabela tradicional */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Hierarquia UTM (Source > Medium > Content)</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Inscritos</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Check-ins</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Conversão</th>
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

                        {/* Versão Mobile: Lista "Sanfona" (Accordion) */}
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
                        {/* ### FIM DA MUDANÇA PARA RESPONSIVIDADE ### */}
                    </div>
                </div>
            )}
        </div>
    );
}