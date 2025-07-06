'use client';

import React, { useState, useEffect, useCallback, ReactElement } from 'react'; // Adicionado ReactElement para clareza
import { db } from '@/lib/supabaseClient';
import { FaSyncAlt, FaSpinner } from 'react-icons/fa';
import { toZonedTime } from 'date-fns-tz';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- Tipos ---
type Launch = { id: string; nome: string; status: string; };
type TableRow = { canal: string; inscricoes: number; check_ins: number; };
type ChartRow = { name: string; value: number; };
type DashboardData = { 
    tableData: TableRow[] | null; 
    byContentChart: ChartRow[] | null; 
    byMediumChart: ChartRow[] | null; 
    conversionByChannelChart: any[] | null;
};

// --- Constantes e Componentes ---
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1919'];
const toISODateString = (date: Date) => date.toISOString().split('T')[0];

const KpiCard = ({ title, value, highlight = false }: { title: string, value: string | number, highlight?: boolean }) => {
    const cardClasses = highlight ? "bg-blue-50 border-blue-200" : "bg-white";
    const titleClasses = highlight ? "text-blue-700" : "text-slate-500";
    const valueClasses = highlight ? "text-blue-800" : "text-slate-800";
    return (
        <div className={`${cardClasses} p-4 rounded-lg shadow-md border`}>
            <p className={`text-sm font-medium ${titleClasses}`}>{title}</p>
            <p className={`text-3xl font-bold mt-1 ${valueClasses}`}>{value}</p>
        </div>
    );
};

// ✅ AQUI ESTÁ A CORREÇÃO: Trocamos React.ReactNode por React.ReactElement
const ChartCard = ({ title, children }: { title: string, children: ReactElement }) => (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">{title}</h2>
        <div style={{ width: '100%', height: 350 }}>
            {/* O ResponsiveContainer agora recebe um filho com o tipo correto */}
            <ResponsiveContainer>{children}</ResponsiveContainer>
        </div>
    </div>
);


// --- Página Principal ---
export default function PerformanceControlePage() {
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunch, setSelectedLaunch] = useState<string>('');
    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [period, setPeriod] = useState<'today' | 'yesterday' | '7days' | 'custom'>('today');
    const [customStartDate, setCustomStartDate] = useState(toISODateString(new Date()));
    const [customEndDate, setCustomEndDate] = useState(toISODateString(new Date()));
    const [customStartTime, setCustomStartTime] = useState('00:00');
    const [customEndTime, setCustomEndTime] = useState('23:59');
    const [groupBy, setGroupBy] = useState('content');

    const loadDashboardData = useCallback(async () => {
        if (!selectedLaunch) return;
        setIsLoading(true);
        const timeZone = 'America/Sao_Paulo';
        let startDateTime, endDateTime;
        const now = toZonedTime(new Date(), timeZone);

        switch (period) {
            case 'yesterday':
                const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
                startDateTime = toZonedTime(new Date(yesterday.setHours(0, 0, 0, 0)), timeZone);
                endDateTime = toZonedTime(new Date(yesterday.setHours(23, 59, 59, 999)), timeZone);
                break;
            case '7days':
                const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(now.getDate() - 6);
                startDateTime = toZonedTime(new Date(sevenDaysAgo.setHours(0, 0, 0, 0)), timeZone);
                endDateTime = toZonedTime(new Date(now.setHours(23, 59, 59, 999)), timeZone);
                break;
            case 'custom':
                startDateTime = toZonedTime(`${customStartDate}T${customStartTime}:00`, timeZone);
                endDateTime = toZonedTime(`${customEndDate}T${customEndTime}:59`, timeZone);
                break;
            default:
                startDateTime = toZonedTime(new Date(now.setHours(0, 0, 0, 0)), timeZone);
                endDateTime = toZonedTime(new Date(now.setHours(23, 59, 59, 999)), timeZone);
        }

        try {
            const { data, error } = await db.rpc('get_full_performance_dashboard', {
                p_launch_id: selectedLaunch,
                p_start_datetime: startDateTime.toISOString(),
                p_end_datetime: endDateTime.toISOString(),
                p_group_by: groupBy
            });
            if (error) throw error;
            setData(data);
        } catch (error) {
            console.error("Erro ao buscar dados:", error);
            setData(null);
        } finally {
            setIsLoading(false);
        }
    }, [selectedLaunch, period, customStartDate, customEndDate, customStartTime, customEndTime, groupBy]);

    useEffect(() => {
        const fetchLaunches = async () => {
            const { data: launchesData, error } = await db.rpc('get_launches_for_dropdown');
            if (error) { console.error(error); }
            else if (launchesData && launchesData.length > 0) {
                setLaunches(launchesData);
                setSelectedLaunch(launchesData[0].id);
            }
        };
        fetchLaunches();
    }, []);

    useEffect(() => {
        if (selectedLaunch) {
            loadDashboardData();
        }
    }, [selectedLaunch, period, groupBy, loadDashboardData]);

    const totals = React.useMemo(() => {
        if (!data?.tableData) return { inscricoes: 0, check_ins: 0 };
        return data.tableData.reduce((acc, row) => ({
            inscricoes: acc.inscricoes + (row.inscricoes || 0),
            check_ins: acc.check_ins + (row.check_ins || 0),
        }), { inscricoes: 0, check_ins: 0 });
    }, [data]);
    
    const totalConversionRate = totals.inscricoes > 0 ? (totals.check_ins / totals.inscricoes) * 100 : 0;

    return (
        <div className="space-y-6">
            {/* Bloco de Cabeçalho e Filtros - Sempre visível */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Dashboard de Performance e Controle</h1>
                <div className="bg-white p-2 rounded-lg shadow-md">
                    <select value={selectedLaunch} onChange={(e) => setSelectedLaunch(e.target.value)} className="px-3 py-2 border-none rounded-md focus:ring-0 bg-transparent">
                        {launches.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.status})</option>)}
                    </select>
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-md flex flex-col gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                    <label className="font-medium text-slate-700">Período:</label>
                    <button onClick={() => setPeriod('today')} className={`py-2 px-4 rounded-md text-sm font-semibold ${period === 'today' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>Hoje</button>
                    <button onClick={() => setPeriod('yesterday')} className={`py-2 px-4 rounded-md text-sm font-semibold ${period === 'yesterday' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>Ontem</button>
                    <button onClick={() => setPeriod('7days')} className={`py-2 px-4 rounded-md text-sm font-semibold ${period === '7days' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>7 dias</button>
                    <button onClick={() => setPeriod('custom')} className={`py-2 px-4 rounded-md text-sm font-semibold ${period === 'custom' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>Personalizado</button>
                </div>
                {period === 'custom' && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-4 border-t border-slate-200">
                        <label className="text-sm font-medium text-slate-700">De:</label>
                        <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="border-slate-300 rounded-md px-2 py-1 text-sm" />
                        <input type="time" value={customStartTime} onChange={e => setCustomStartTime(e.target.value)} className="border-slate-300 rounded-md px-2 py-1 text-sm" />
                        <label className="text-sm font-medium text-slate-700">Até:</label>
                        <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="border-slate-300 rounded-md px-2 py-1 text-sm" />
                        <input type="time" value={customEndTime} onChange={e => setCustomEndTime(e.target.value)} className="border-slate-300 rounded-md px-2 py-1 text-sm" />
                        <button onClick={loadDashboardData} className="px-4 py-2 bg-slate-800 text-white rounded-md text-sm font-semibold flex items-center gap-2 hover:bg-slate-700"><FaSyncAlt /> Atualizar</button>
                    </div>
                )}
                 <div className="pt-4 border-t border-slate-200">
                    <label htmlFor="group-by-select" className="block text-sm font-medium text-slate-700">Agrupar Tabela Por:</label>
                    <select id="group-by-select" value={groupBy} onChange={e => setGroupBy(e.target.value)} className="mt-1 block w-full sm:w-1/3 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                        <option value="content">UTM Content</option>
                        <option value="campaign">UTM Campaign</option>
                    </select>
                </div>
            </div>
            
            {/* Bloco de Carregamento */}
            {isLoading && (
                <div className="flex justify-center items-center p-10"><FaSpinner className="animate-spin text-blue-600 text-4xl" /></div>
            )}
            
            {/* Bloco para quando não há dados */}
            {!isLoading && (!data || !data.tableData || data.tableData.length === 0) && (
                 <div className="text-center py-10 bg-white rounded-lg shadow-md"><p>Nenhum dado de performance encontrado para o período ou lançamento selecionado.</p></div>
            )}

            {/* Bloco Principal com os Dados do Dashboard */}
            {!isLoading && data && data.tableData && data.tableData.length > 0 && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <KpiCard title="Total de Inscrições" value={totals.inscricoes} />
                        <KpiCard title="Total de Check-ins" value={totals.check_ins} />
                        <KpiCard title="Taxa de Conversão (Check-in/Inscrito)" value={`${totalConversionRate.toFixed(2)}%`} highlight />
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-lg font-semibold text-slate-700 mb-4">Detalhes por Canal ({groupBy === 'content' ? 'UTM Content' : 'UTM Campaign'})</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Canal</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Inscrições</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Check-ins</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Taxa Conv.</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {data.tableData.map((row, index) => {
                                        const conversionRate = (row.inscricoes || 0) > 0 ? ((row.check_ins || 0) / row.inscricoes * 100) : 0;
                                        return (
                                            <tr key={row.canal + index} className="hover:bg-slate-50">
                                                <td className="px-6 py-4 max-w-xs truncate font-medium text-slate-800" title={row.canal}>{row.canal}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{row.inscricoes}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{row.check_ins}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-semibold">{conversionRate.toFixed(1)}%</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* A lógica condicional aqui garante que não passamos filhos inválidos */}
                        {data.byContentChart && data.byContentChart.length > 0 &&
                            <ChartCard title={groupBy === 'content' ? "Inscrições por Conteúdo" : "Inscrições por Campanha"}>
                                <PieChart>
                                    <Pie data={data.byContentChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>{(data.byContentChart).map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie>
                                    <Tooltip />
                                    <Legend wrapperStyle={{ maxHeight: '150px', overflowY: 'auto', top: '240px' }} />
                                </PieChart>
                            </ChartCard>
                        }
                        {data.byMediumChart && data.byMediumChart.length > 0 &&
                            <ChartCard title="Inscrições por Mídia">
                                <PieChart>
                                    <Pie data={data.byMediumChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>{(data.byMediumChart).map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie>
                                    <Tooltip />
                                    <Legend wrapperStyle={{ maxHeight: '150px', overflowY: 'auto', top: '240px' }} />
                                </PieChart>
                            </ChartCard>
                        }
                    </div>
                    
                    <div className="w-full">
                       <ChartCard title={`Inscrições vs. Check-ins por ${groupBy === 'content' ? 'Conteúdo' : 'Campanha'}`}>
                            <BarChart data={data.tableData} margin={{ top: 5, right: 30, left: 20, bottom: 50 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="canal" angle={-45} textAnchor="end" height={100} interval={0} tick={{ fontSize: 10 }} />
                                <YAxis />
                                <Tooltip />
                                <Legend verticalAlign="top" />
                                <Bar dataKey="inscricoes" name="Inscrições" fill="#8884d8" />
                                <Bar dataKey="check_ins" name="Check-ins" fill="#82ca9d" />
                            </BarChart>
                        </ChartCard>
                    </div>
                </div>
            )}
        </div>
    );
}