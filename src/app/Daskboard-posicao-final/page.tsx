'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import toast from 'react-hot-toast';
import { FaSpinner } from 'react-icons/fa';

// --- Tipos de Dados ---
type Launch = { id: string; nome: string; status: string; };
type KpiData = { total_inscricoes: number; total_checkins: number; total_compradores: number; };
type TableRow = { utm_content: string; qtd_inscricoes: number; qtd_checkins: number; qtd_compradores: number; };
type DashboardData = { kpis: KpiData; tableData: TableRow[]; };

// --- Componentes ---
const KpiCard = ({ title, value, highlight = false }: { title: string, value: string | number, highlight?: boolean }) => (
    <div className={`p-4 rounded-lg shadow-md border text-center ${highlight ? "bg-green-100 border-green-200" : "bg-white"}`}>
        <p className={`text-sm font-medium ${highlight ? "text-green-700" : "text-slate-500"}`}>{title}</p>
        <p className={`text-2xl md:text-3xl font-bold mt-1 ${highlight ? "text-green-800" : "text-slate-800"}`}>{value}</p>
    </div>
);

// --- Página Principal ---
export default function PosicaoFinalPage() {
    const supabase = createClientComponentClient();
    
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunch, setSelectedLaunch] = useState<string>('');
    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [groupBy, setGroupBy] = useState('content');

    useEffect(() => {
        const fetchLaunches = async () => {
            const { data, error } = await supabase.from('lancamentos').select('id, nome, status');
            if (data) {
                const statusOrder: { [key: string]: number } = { 'Em Andamento': 1, 'Concluído': 2 };
                const filtered = data.filter(l => l.status === 'Em Andamento' || l.status === 'Concluído').sort((a,b) => statusOrder[a.status] - statusOrder[b.status]);
                setLaunches(filtered);
                if (filtered.length > 0) {
                    setSelectedLaunch(filtered[0].id);
                }
            } else {
                setIsLoading(false);
                if (error) console.error("Erro ao buscar lançamentos:", error);
            }
        };
        fetchLaunches();
    }, [supabase]);

    useEffect(() => {
        if (!selectedLaunch) return;
        
        const fetchDashboardData = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase.rpc('get_final_position_dashboard', { 
                    p_launch_id: selectedLaunch,
                    p_group_by: groupBy
                });
                if (error) throw error;
                setData(data);
            } catch (err: any) {
                toast.error("Erro ao carregar dados do dashboard.");
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, [selectedLaunch, groupBy, supabase]);

    // ### INÍCIO DA CORREÇÃO ###
    // A lógica de cálculo agora é mais segura e explícita
    const kpis = data?.kpis;
    const conversionRate = kpis && kpis.total_inscricoes > 0
        ? ((kpis.total_compradores ?? 0) / kpis.total_inscricoes * 100).toFixed(2) + '%'
        : '0.00%';
    // ### FIM DA CORREÇÃO ###
    
    return (
        <div className="space-y-6 p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Dashboard de Posição Final</h1>
                <div className="bg-white p-2 rounded-lg shadow-md w-full md:w-auto">
                    <select 
                        value={selectedLaunch} 
                        onChange={e => setSelectedLaunch(e.target.value)}
                        className="w-full px-3 py-2 border-none rounded-md focus:ring-0 bg-transparent"
                    >
                        {launches.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.status})</option>)}
                    </select>
                </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
                <label htmlFor="group-by-select" className="block text-sm font-medium text-slate-700">Analisar por:</label>
                <select 
                    id="group-by-select"
                    value={groupBy} 
                    onChange={e => setGroupBy(e.target.value)}
                    className="mt-1 block w-full sm:w-1/3 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                    <option value="content">UTM Content</option>
                    <option value="campaign">UTM Campaign</option>
                </select>
            </div>

            {isLoading && <div className="flex justify-center items-center p-10"><FaSpinner className="animate-spin text-blue-600 text-4xl" /></div>}

            {!isLoading && kpis && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        <KpiCard title="Total de Inscrições" value={kpis.total_inscricoes} />
                        <KpiCard title="Total de Check-ins" value={kpis.total_checkins} />
                        <KpiCard title="Total de Compradores" value={kpis.total_compradores} />
                        <KpiCard title="Conversão Final (Vendas)" value={conversionRate} highlight />
                    </div>

                    <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
                        <h2 className="text-lg font-semibold text-slate-700 mb-4">Performance por Canal ({groupBy === 'content' ? 'UTM Content' : 'UTM Campaign'})</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-slate-50 hidden md:table-header-group">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Canal</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Inscrições</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Check-ins</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Compradores</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Taxa de Conversão</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white">
                                    {data?.tableData?.map((row, index) => {
                                        const convRate = (row.qtd_inscricoes || 0) > 0 ? ((row.qtd_compradores || 0) / row.qtd_inscricoes * 100).toFixed(2) : '0.00';
                                        return (
                                            <tr key={index} className="block md:table-row border rounded-lg shadow-sm mb-4 md:border-b md:border-slate-200 md:shadow-none md:rounded-none">
                                                <td className="p-3 md:px-4 md:py-4 font-medium text-slate-800 max-w-full truncate" title={row.utm_content}><span className="md:hidden text-xs font-bold uppercase text-slate-500">Canal: </span>{row.utm_content}</td>
                                                <td className="p-3 md:px-4 md:py-4 text-sm text-slate-600"><span className="md:hidden font-bold">Inscrições: </span>{row.qtd_inscricoes}</td>
                                                <td className="p-3 md:px-4 md:py-4 text-sm text-slate-600"><span className="md:hidden font-bold">Check-ins: </span>{row.qtd_checkins}</td>
                                                <td className="p-3 md:px-4 md:py-4 text-sm text-slate-600 font-bold"><span className="md:hidden font-bold">Compradores: </span>{row.qtd_compradores}</td>
                                                <td className="p-3 md:px-4 md:py-4 text-sm font-semibold text-green-600"><span className="md:hidden font-bold">Taxa Conv.: </span>{convRate}%</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
            
            {!isLoading && !kpis && (
                <div className="text-center py-10 bg-white rounded-lg shadow-md"><p>Nenhum dado encontrado.</p></div>
            )}
        </div>
    );
}