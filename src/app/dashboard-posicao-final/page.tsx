'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import toast from 'react-hot-toast';
import { FaSpinner, FaUsers, FaCheckCircle, FaShoppingCart, FaPercentage } from 'react-icons/fa';

// --- Tipos de Dados ---
type Launch = { id: string; nome: string; status: string; };
type KpiData = { 
    total_inscricoes: number; 
    total_checkins: number; 
    total_compradores: number; 
};
type TableRow = { 
    canal: string; 
    qtd_inscricoes: number; 
    qtd_checkins: number; 
    qtd_compradores: number; 
};
type DashboardData = { 
    kpis: KpiData; 
    tableData: TableRow[]; 
};

// --- Componentes ---
const KpiCard = ({ title, value, icon, highlight = false }: { title: string, value: string | number, icon: React.ReactNode, highlight?: boolean }) => (
    <div className={`flex items-center p-4 rounded-lg shadow-md border ${highlight ? "bg-green-50 border-green-200" : "bg-white"}`}>
        <div className={`text-3xl mr-4 ${highlight ? "text-green-600" : "text-blue-500"}`}>{icon}</div>
        <div>
            <p className={`text-sm font-medium ${highlight ? "text-green-700" : "text-slate-500"}`}>{title}</p>
            <p className={`text-2xl font-bold mt-1 ${highlight ? "text-green-800" : "text-slate-800"}`}>{value}</p>
        </div>
    </div>
);

// --- Página Principal ---
export default function PosicaoFinalPage() {
    const supabase = createClientComponentClient();
    
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunch, setSelectedLaunch] = useState<string>('');
    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [groupBy, setGroupBy] = useState('source'); // Controla o agrupamento da tabela

    const loadData = useCallback(async (launchId: string) => {
        if (!launchId) return;
        setIsLoading(true);
        try {
            // Chamando a função SQL correta que retorna KPIs e a tabela detalhada
            const { data, error } = await supabase.rpc('get_final_position_dashboard', { 
                p_launch_id: launchId,
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
    }, [groupBy, supabase]);

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
        if (selectedLaunch) {
            loadData(selectedLaunch);
        }
    }, [selectedLaunch, loadData]);

    const kpis = data?.kpis;
    const conversionRate = kpis && kpis.total_inscricoes > 0
        ? ((kpis.total_compradores ?? 0) / kpis.total_inscricoes * 100).toFixed(2) + '%'
        : '0.00%';
    
    const getGroupByLabel = (value: string) => {
        const labels: Record<string, string> = {
            source: 'UTM Source',
            medium: 'UTM Medium',
            content: 'UTM Content',
            campaign: 'UTM Campaign',
            term: 'UTM Term'
        };
        return labels[value] || 'Canal';
    };

    return (
        <div className="space-y-6 p-4 md:p-6 bg-slate-50 min-h-screen">
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
            
            {isLoading && <div className="flex justify-center items-center p-10"><FaSpinner className="animate-spin text-blue-600 text-4xl" /></div>}

            {!isLoading && data && kpis && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        <KpiCard title="Total de Inscrições" value={kpis.total_inscricoes.toLocaleString('pt-BR')} icon={<FaUsers />} />
                        <KpiCard title="Total de Check-ins" value={kpis.total_checkins.toLocaleString('pt-BR')} icon={<FaCheckCircle />} />
                        <KpiCard title="Total de Compradores" value={kpis.total_compradores.toLocaleString('pt-BR')} icon={<FaShoppingCart />} />
                        <KpiCard title="Conversão Final (Vendas)" value={conversionRate} highlight icon={<FaPercentage />} />
                    </div>

                    <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                            <h2 className="text-lg font-semibold text-slate-700">Performance por Canal</h2>
                            <div>
                                <label htmlFor="group-by-select" className="sr-only">Analisar por:</label>
                                <select 
                                    id="group-by-select"
                                    value={groupBy} 
                                    onChange={e => setGroupBy(e.target.value)}
                                    className="block w-full md:w-auto pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                                >
                                    <option value="source">UTM Source</option>
                                    <option value="medium">UTM Medium</option>
                                    <option value="content">UTM Content</option>
                                    <option value="campaign">UTM Campaign</option>
                                    <option value="term">UTM Term</option>
                                </select>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{getGroupByLabel(groupBy)}</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Inscrições</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Check-ins</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Compradores</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Taxa de Conversão</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {data.tableData?.map((row, index) => {
                                        const convRate = (row.qtd_inscricoes || 0) > 0 ? ((row.qtd_compradores || 0) / row.qtd_inscricoes * 100).toFixed(2) : '0.00';
                                        return (
                                            <tr key={index}>
                                                <td className="px-4 py-4 font-medium text-slate-800 max-w-sm truncate" title={row.canal}>{row.canal || 'N/A'}</td>
                                                <td className="px-4 py-4 text-sm text-slate-600">{row.qtd_inscricoes.toLocaleString('pt-BR')}</td>
                                                <td className="px-4 py-4 text-sm text-slate-600">{row.qtd_checkins.toLocaleString('pt-BR')}</td>
                                                <td className="px-4 py-4 text-sm text-slate-600 font-bold">{row.qtd_compradores.toLocaleString('pt-BR')}</td>
                                                <td className="px-4 py-4 text-sm font-semibold text-green-600">{convRate}%</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
            
            {!isLoading && !data && (
                <div className="text-center py-10 bg-white rounded-lg shadow-md"><p>Nenhum dado encontrado.</p></div>
            )}
        </div>
    );
}
