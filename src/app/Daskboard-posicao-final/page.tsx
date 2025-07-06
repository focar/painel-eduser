'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import { FaSpinner } from 'react-icons/fa';

// --- Tipos de Dados ---
type Launch = { id: string; nome: string; status: string; };
type KPI = { total_inscricoes: number; total_checkins: number; total_compradores: number; };
// ✅ Tipo da linha da tabela atualizado
type TableRow = { utm_content: string; qtd_inscricoes: number; qtd_checkins: number; qtd_compradores: number; };
type DashboardData = { kpis: KPI; tableData: TableRow[]; };

// --- Componentes ---
const KpiCard = ({ title, value, subValue, highlight = false }: { title: string, value: string | number, subValue?: string, highlight?: boolean }) => {
    const cardClasses = highlight ? "bg-green-100 border-green-200" : "bg-white";
    const titleClasses = highlight ? "text-green-700" : "text-slate-500";
    const valueClasses = highlight ? "text-green-800" : "text-slate-800";
    return (
        <div className={`${cardClasses} p-4 rounded-lg shadow-md border`}>
            <p className={`text-sm font-medium ${titleClasses}`}>{title}</p>
            <p className={`text-3xl font-bold mt-1 ${valueClasses}`}>{value}</p>
            {subValue && <p className="text-xs text-slate-400 mt-1">{subValue}</p>}
        </div>
    );
}

// --- Página Principal ---
export default function PosicaoFinalPage() {
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunch, setSelectedLaunch] = useState<string>('');
    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [groupBy, setGroupBy] = useState('content');

    // Busca os lançamentos para o dropdown
    useEffect(() => {
        const fetchLaunches = async () => {
            const { data, error } = await db.rpc('get_launches_for_dropdown');
            if (data && data.length > 0) {
                setLaunches(data);
                setSelectedLaunch(data[0].id);
            } else {
                setIsLoading(false);
                if (error) console.error("Erro ao buscar lançamentos:", error);
            }
        };
        fetchLaunches();
    }, []);

    // Busca os dados do dashboard quando um lançamento ou filtro muda
    useEffect(() => {
        if (!selectedLaunch) return;
        
        const fetchDashboardData = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await db.rpc('get_final_position_dashboard', { 
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
    }, [selectedLaunch, groupBy]);

    const kpis = data?.kpis;
    const conversionRate = (kpis?.total_inscricoes ?? 0) > 0 ? ((kpis?.total_compradores ?? 0) / kpis!.total_inscricoes * 100).toFixed(2) + '%' : '0.00%';

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-800">Dashboard de Posição Final</h1>
                <div className="bg-white p-2 rounded-lg shadow-md">
                    <select 
                        value={selectedLaunch} 
                        onChange={e => setSelectedLaunch(e.target.value)}
                        className="px-3 py-2 border-none rounded-md focus:ring-0 bg-transparent"
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

            {!isLoading && data && data.kpis && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        <KpiCard title="Total de Inscrições" value={kpis.total_inscricoes} />
                        <KpiCard title="Total de Check-ins" value={kpis.total_checkins} />
                        <KpiCard title="Total de Compradores" value={kpis.total_compradores} />
                        <KpiCard title="Conversão Final (Vendas)" value={conversionRate} highlight />
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-lg font-semibold text-slate-700 mb-4">Performance por Canal ({groupBy === 'content' ? 'UTM Content' : 'UTM Campaign'})</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Canal</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Inscrições</th>
                                        {/* ✅ NOVA COLUNA ADICIONADA */}
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Check-ins</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Compradores</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Taxa de Conversão</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {data.tableData?.map((row, index) => {
                                        const convRate = (row.qtd_inscricoes || 0) > 0 ? ((row.qtd_compradores || 0) / row.qtd_inscricoes * 100).toFixed(2) : '0.00';
                                        return (
                                        <tr key={index} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 max-w-sm truncate font-medium text-slate-800" title={row.utm_content}>{row.utm_content}</td>
                                            <td className="px-6 py-4 text-sm text-slate-500">{row.qtd_inscricoes}</td>
                                            {/* ✅ NOVA CÉLULA ADICIONADA */}
                                            <td className="px-6 py-4 text-sm text-slate-500">{row.qtd_checkins}</td>
                                            <td className="px-6 py-4 text-sm text-slate-500 font-bold">{row.qtd_compradores}</td>
                                            <td className="px-6 py-4 text-sm font-semibold text-green-600">{convRate}%</td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
            
            {!isLoading && (!data || !data.kpis) && (
                <div className="text-center py-10 bg-white rounded-lg shadow-md"><p>Nenhum dado encontrado.</p></div>
            )}
        </div>
    );
}