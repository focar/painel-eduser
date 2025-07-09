'use client';

import React, { useState, useEffect, useCallback, ReactElement } from 'react';
// CORREÇÃO: Importa o cliente recomendado
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { FaSyncAlt, FaSpinner } from 'react-icons/fa';
import { toZonedTime } from 'date-fns-tz';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- Tipos de Dados ---
type Launch = { id: string; nome: string; status: string; };
type KpiData = { total_inscricoes: number; total_checkins: number; taxa_checkin: number; };
type TableData = {
    canal: string; inscricoes: number; check_ins: number; quente_mais_80: number;
    quente_morno: number; morno: number; morno_frio: number; frio_menos_35: number;
};
type DashboardData = { kpis: KpiData; chartData: { data: string; inscricoes: number; checkins: number; }[]; tableData: TableData[]; };

// --- Componentes ---
const PageHeader = ({ title, launches, selectedLaunch, onLaunchChange }: { title: string; launches: Launch[]; selectedLaunch: string; onLaunchChange: (id: string) => void; }) => (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">{title}</h1>
        <div className="bg-white p-2 rounded-lg shadow-md w-full md:w-auto">
            <select value={selectedLaunch} onChange={(e) => onLaunchChange(e.target.value)} className="w-full px-3 py-2 border-none rounded-md focus:ring-0 bg-transparent">
                {launches.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.status})</option>)}
            </select>
        </div>
    </div>
);

const KpiCard = ({ title, value, format = (v) => v }: { title: string; value: number; format?: (v: number) => string | number }) => (
    <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <h3 className="text-slate-500 text-sm font-medium uppercase">{title}</h3>
        <p className="text-3xl font-bold text-slate-800 mt-2">{format(value)}</p>
    </div>
);

const ScoringTable = ({ data, groupBy }: { data: TableData[], groupBy: string }) => (
    <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Scoring por Canal ({groupBy === 'content' ? 'UTM Content' : 'UTM Campaign'})</h2>
        <div className="overflow-x-auto">
            <table className="min-w-full">
                {/* Cabeçalho visível apenas em telas médias ou maiores */}
                <thead className="bg-slate-50 hidden md:table-header-group">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Canal</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Inscrições</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Check-ins</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-green-600 uppercase">Quente (&gt;80)</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-lime-600 uppercase">Quente-Morno</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-amber-600 uppercase">Morno</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-orange-600 uppercase">Morno-Frio</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-red-600 uppercase">Frio (&lt;35)</th>
                    </tr>
                </thead>
                <tbody className="bg-white">
                    {/* Cada <tr> vira um card no mobile */}
                    {data.map((row, index) => (
                        <tr key={row.canal + index} className="block md:table-row border rounded-lg shadow-sm mb-4 md:border-none md:shadow-none md:mb-0 md:border-b">
                            <td className="p-3 md:px-4 md:py-4 font-medium text-slate-900 md:max-w-xs truncate" title={row.canal}>
                                <span className="md:hidden text-xs font-bold uppercase text-slate-500">Canal: </span>{row.canal}
                            </td>
                            <td className="p-3 md:px-4 md:py-4 md:text-center text-sm text-slate-600"><span className="md:hidden font-bold">Inscrições: </span>{row.inscricoes}</td>
                            <td className="p-3 md:px-4 md:py-4 md:text-center text-sm text-slate-600"><span className="md:hidden font-bold">Check-ins: </span>{row.check_ins}</td>
                            <td className="p-3 md:px-4 md:py-4 md:text-center text-sm text-green-600"><span className="md:hidden font-bold">Quente (&gt;80): </span>{row.quente_mais_80}</td>
                            <td className="p-3 md:px-4 md:py-4 md:text-center text-sm text-lime-600"><span className="md:hidden font-bold">Quente-Morno: </span>{row.quente_morno}</td>
                            <td className="p-3 md:px-4 md:py-4 md:text-center text-sm text-amber-600"><span className="md:hidden font-bold">Morno: </span>{row.morno}</td>
                            <td className="p-3 md:px-4 md:py-4 md:text-center text-sm text-orange-600"><span className="md:hidden font-bold">Morno-Frio: </span>{row.morno_frio}</td>
                            <td className="p-3 md:px-4 md:py-4 md:text-center text-sm text-red-600"><span className="md:hidden font-bold">Frio (&lt;35): </span>{row.frio_menos_35}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const ChartCard = ({ title, children }: { title: string, children: ReactElement }) => (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">{title}</h2>
        <div style={{ width: '100%', height: 350 }}><ResponsiveContainer>{children}</ResponsiveContainer></div>
    </div>
);

export default function LeadScoringPage() {
    // CORREÇÃO: Usa o cliente correto
    const supabase = createClientComponentClient();

    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunch, setSelectedLaunch] = useState<string>('');
    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [noLaunchesFound, setNoLaunchesFound] = useState(false);
    const [groupBy, setGroupBy] = useState('content');

    const loadDashboardData = useCallback(async (launchId: string) => {
        if (!launchId) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_full_lead_scoring_dashboard', { 
                p_launch_id: launchId,
                p_group_by: groupBy 
            });
            if (error) throw error;
            setData(data);
        } catch (error) {
            const err = error as Error;
            console.error("Erro ao buscar dados do dashboard:", err);
            setData(null);
        } finally {
            setIsLoading(false);
        }
    }, [groupBy, supabase]);

    useEffect(() => {
        const fetchLaunches = async () => {
            try {
                const { data: launchesData, error } = await supabase.from('lancamentos').select('id, nome, status');
                if (error) throw error;
                if (launchesData && launchesData.length > 0) {
                    const statusOrder: { [key: string]: number } = { 'Em Andamento': 1, 'Concluído': 2 };
                    const filtered = launchesData.filter(l => l.status === 'Em Andamento' || l.status === 'Concluído').sort((a,b) => statusOrder[a.status] - statusOrder[b.status]);
                    setLaunches(filtered);
                    setSelectedLaunch(filtered[0].id);
                } else {
                    setNoLaunchesFound(true);
                    setIsLoading(false);
                }
            } catch (error) {
                const err = error as Error;
                console.error("Erro ao buscar lançamentos:", err);
                setNoLaunchesFound(true);
            }
        };
        fetchLaunches();
    }, [supabase]);

    useEffect(() => {
        if (selectedLaunch) {
            loadDashboardData(selectedLaunch);
        }
    }, [selectedLaunch, loadDashboardData]); 
    
    const renderContent = () => {
        if (isLoading) {
            return <div className="text-center py-10"><FaSpinner className="animate-spin text-blue-600 text-3xl mx-auto" /></div>;
        }
        if (!data || !data.kpis) {
            return <div className="text-center py-10 bg-white rounded-lg shadow-md"><p className="text-slate-500">Nenhum dado encontrado para este lançamento.</p></div>;
        }
        
        const totals = {
            inscricoes: data.tableData?.reduce((acc, row) => acc + (row.inscricoes || 0), 0) || 0,
            check_ins: data.tableData?.reduce((acc, row) => acc + (row.check_ins || 0), 0) || 0,
        };
        const totalConversionRate = totals.inscricoes > 0 ? (totals.check_ins / totals.inscricoes) * 100 : 0;
        
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <KpiCard title="Total Inscrições" value={totals.inscricoes} />
                    <KpiCard title="Total Check-ins" value={totals.check_ins} />
                    <KpiCard title="Taxa de Check-in" value={totalConversionRate} format={(v) => `${v.toFixed(1)}%`} />
                </div>
                
                {data.tableData && data.tableData.length > 0 && <ScoringTable data={data.tableData} groupBy={groupBy} />}

                {data.chartData && data.chartData.length > 0 && (
                     <div className="bg-white p-6 rounded-lg shadow-md">
                         <h2 className="text-lg font-semibold text-slate-700 mb-4">Inscrições vs Check-ins por Dia</h2>
                         <ResponsiveContainer width="100%" height={300}>
                             <LineChart data={data.chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                 <CartesianGrid strokeDasharray="3 3" />
                                 <XAxis dataKey="data" />
                                 <YAxis />
                                 <Tooltip />
                                 <Legend />
                                 <Line type="monotone" dataKey="inscricoes" stroke="#8884d8" strokeWidth={2} name="Inscrições" />
                                 <Line type="monotone" dataKey="checkins" stroke="#82ca9d" strokeWidth={2} name="Check-ins" />
                             </LineChart>
                         </ResponsiveContainer>
                     </div>
                 )}
                 {/* Adicione aqui os outros gráficos se necessário */}
            </div>
        );
    };

    if (noLaunchesFound) {
        return <div className="text-center py-10 bg-white rounded-lg shadow-md"><p className="text-slate-500">Nenhum lançamento válido foi encontrado.</p></div>;
    }

    return (
        <div className="space-y-6 p-4 md:p-6">
            <PageHeader title="Dashboard de Lead Scoring" launches={launches} selectedLaunch={selectedLaunch} onLaunchChange={setSelectedLaunch} />
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
                <label htmlFor="group-by-select" className="block text-sm font-medium text-slate-700">Agrupar Tabela Por:</label>
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

            {renderContent()}
        </div>
    );
}