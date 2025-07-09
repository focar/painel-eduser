'use client';

import React, { useState, useEffect, useCallback, ReactElement } from 'react';
// CORREÇÃO: Importa o cliente recomendado
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { FaUsers, FaCheck, FaPercentage, FaSpinner } from 'react-icons/fa';

// --- Tipos de Dados ---
type Launch = { id: string; nome: string; status: string; };
type Kpis = {
    total_inscriptions: number;
    total_checkins: number;
};
type TableRow = {
    midia: string;
    dimension: string;
    inscritos: number;
    checkins: number;
};
type DashboardData = {
    kpis: Kpis;
    tableData: TableRow[] | null;
};

// --- Componentes ---
const StatCard = ({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) => (
    <div className="bg-white p-6 rounded-lg shadow-md flex items-center gap-4">
        <div className="bg-blue-100 p-3 rounded-full">{icon}</div>
        <div>
            <h3 className="text-md font-medium text-slate-500">{title}</h3>
            <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
        </div>
    </div>
);

// --- Página Principal ---
export default function AcompanhamentoCanaisPage() {
    // CORREÇÃO: Usa o cliente correto
    const supabase = createClientComponentClient();
    
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunch, setSelectedLaunch] = useState<string>('');
    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [groupBy, setGroupBy] = useState('content');

    const loadData = useCallback(async () => {
        if (!selectedLaunch) return;
        setIsLoading(true);
        try {
            // CORREÇÃO: Usa a variável 'supabase'
            const { data, error } = await supabase.rpc('get_channel_summary_data', { 
                p_launch_id: selectedLaunch,
                p_group_by: groupBy
            });
            if (error) throw error;
            setData(data);
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
            setData(null);
        } finally {
            setIsLoading(false);
        }
    }, [selectedLaunch, groupBy, supabase]);

    useEffect(() => {
        const fetchLaunches = async () => {
            // CORREÇÃO: Usa a variável 'supabase'
            const { data: launchesData, error } = await supabase.from('lancamentos').select('id, nome, status');
            if (error) {
                console.error("Erro ao buscar lançamentos:", error);
            } else if (launchesData && launchesData.length > 0) {
                const statusOrder: { [key: string]: number } = { 'Em Andamento': 1, 'Concluído': 2 };
                const filtered = launchesData.filter(l => l.status === 'Em Andamento' || l.status === 'Concluído').sort((a,b) => statusOrder[a.status] - statusOrder[b.status]);
                setLaunches(filtered);
                if (filtered.length > 0) {
                    setSelectedLaunch(filtered[0].id);
                }
            } else {
                setIsLoading(false);
            }
        };
        fetchLaunches();
    }, [supabase]);

    useEffect(() => {
        if (selectedLaunch) {
            loadData();
        }
    }, [selectedLaunch, groupBy, loadData]);

    const checkinsTotal = data?.kpis?.total_checkins ?? 0;
    const inscriptionsTotal = data?.kpis?.total_inscriptions ?? 0;
    const overallConversionRate = inscriptionsTotal > 0 ? ((checkinsTotal / inscriptionsTotal) * 100).toFixed(1) + '%' : '0.0%';

    return (
        <div className="space-y-6 p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Acompanhamento de Canais</h1>
                <div className="bg-white p-2 rounded-lg shadow-md w-full md:w-auto">
                    <select
                        value={selectedLaunch}
                        onChange={(e) => setSelectedLaunch(e.target.value)}
                        className="w-full px-3 py-2 border-none rounded-md focus:ring-0 bg-transparent"
                        disabled={launches.length === 0}
                    >
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
                    {/* KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <StatCard title="Total Inscrições" value={inscriptionsTotal} icon={<FaUsers className="text-blue-500" />} />
                        <StatCard title="Total Check-ins" value={checkinsTotal} icon={<FaCheck className="text-green-500" />} />
                        <StatCard title="Taxa de Check-in Geral" value={overallConversionRate} icon={<FaPercentage className="text-purple-500" />} />
                    </div>
                    
                    {/* Filtro */}
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <label htmlFor="group-by-select" className="block text-sm font-medium text-slate-700">Analisar por Dimensão Secundária:</label>
                        <select
                            id="group-by-select"
                            value={groupBy}
                            onChange={(e) => setGroupBy(e.target.value)}
                            className="mt-1 px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white w-full sm:w-1/3"
                        >
                            <option value="content">UTM Content</option>
                            <option value="campaign">UTM Campaign</option>
                        </select>
                    </div>

                    {/* Tabela de Dados */}
                    <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
                        <h2 className="text-lg font-semibold text-slate-700 mb-4">Performance por Mídia e {groupBy === 'content' ? 'Conteúdo' : 'Campanha'}</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-slate-50 hidden md:table-header-group">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Mídia (Medium)</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{groupBy === 'content' ? 'Content' : 'Campaign'}</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Inscritos</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Check-ins</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Taxa de Check-in</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white">
                                    {data.tableData && data.tableData.length > 0 ? data.tableData.map((item, index) => {
                                        const conversionRate = item.inscritos > 0 ? (item.checkins / item.inscritos) * 100 : 0;
                                        return (
                                            <tr key={`${item.midia}-${item.dimension}-${index}`} className="block md:table-row border rounded-lg shadow-sm mb-4 md:border-b md:border-slate-200 md:shadow-none md:rounded-none">
                                                <td className="p-3 md:px-4 md:py-4 font-medium text-slate-800"><span className="md:hidden text-xs font-bold uppercase text-slate-500">Mídia: </span>{item.midia || "Sem Mídia"}</td>
                                                <td className="p-3 md:px-4 md:py-4 text-sm text-slate-600 max-w-full md:max-w-sm truncate" title={item.dimension}><span className="md:hidden text-xs font-bold uppercase text-slate-500">{groupBy === 'content' ? 'Content' : 'Campaign'}: </span>{item.dimension || "Sem Conteúdo"}</td>
                                                <td className="p-3 md:px-4 md:py-4 text-sm text-slate-500"><span className="md:hidden font-bold">Inscritos: </span>{item.inscritos}</td>
                                                <td className="p-3 md:px-4 md:py-4 text-sm text-slate-500 font-bold"><span className="md:hidden font-bold">Check-ins: </span>{item.checkins}</td>
                                                <td className="p-3 md:px-4 md:py-4 text-sm font-semibold"><span className="md:hidden font-bold">Taxa de Check-in: </span>{conversionRate.toFixed(1)}%</td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={5} className="text-center p-10 text-slate-500">Nenhum dado de canal encontrado para este lançamento.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}