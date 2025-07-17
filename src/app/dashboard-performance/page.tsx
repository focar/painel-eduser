'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { FaSyncAlt, FaSpinner } from 'react-icons/fa';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- Tipagens de Dados ---
type Launch = {
  id: string;
  nome: string;
  status: string;
};

type TableRow = {
  canal: string;
  inscricoes: number;
  check_ins: number;
};

type ChartRow = {
  name: string;
  value: number;
};

type DashboardData = {
  kpis: {
    total_inscricoes: number;
    total_checkins: number;
  };
  tableData: TableRow[];
  byContentChart: ChartRow[];
  byMediumChart: ChartRow[];
};

// --- Constantes ---
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1919', '#4F4FFF', '#4FFF4F'];
const TIME_ZONE = 'America/Sao_Paulo';


// --- Funções de Renderização para Gráficos ---

interface CustomizedLabelProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
}

const renderCustomizedLabel = (props: CustomizedLabelProps) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;

  if (cx === undefined || cy === undefined || midAngle === undefined || innerRadius === undefined || outerRadius === undefined || percent === undefined) {
    return null;
  }

  if ((percent * 100) <= 5) {
    return null;
  }

  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
  const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12px" fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};


// --- Componentes de UI ---
const KpiCard = ({ title, value, highlight = false }: { title: string, value: string | number, highlight?: boolean }) => (
    <div className={`p-4 rounded-lg shadow-md border text-center transition-all duration-300 ${highlight ? "bg-blue-50 border-blue-200" : "bg-white"}`}>
        <p className={`text-sm font-medium ${highlight ? "text-blue-700" : "text-slate-500"}`}>{title}</p>
        <p className={`text-2xl md:text-3xl font-bold mt-1 ${highlight ? "text-blue-800" : "text-slate-800"}`}>{value}</p>
    </div>
);

const PieChartWithLegend = ({ title, data }: { title: string, data: ChartRow[] }) => {
    // Função para formatar (encurtar) o texto da legenda se for muito longo
    const formatLegendText = (value: string) => {
        const maxLength = 35; // Define o comprimento máximo do texto
        if (value.length > maxLength) {
            return `${value.substring(0, maxLength)}...`;
        }
        return value;
    };

    return (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold text-slate-700 mb-4">{title}</h2>
            {/* Aumenta a altura do container para dar mais espaço à legenda */}
            <div style={{ width: '100%', height: 400 }}>
                <ResponsiveContainer>
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="value"
                            nameKey="name"
                            // Reduz o cx para dar mais espaço horizontal à legenda
                            cx="35%"
                            cy="50%"
                            outerRadius={120} // Aumenta um pouco o raio do gráfico
                            fill="#8884d8"
                            labelLine={false}
                            label={renderCustomizedLabel}
                        >
                            {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR')} />
                        <Legend
                            layout="vertical"
                            verticalAlign="middle"
                            align="right"
                            iconSize={10}
                            // Aplica a função para encurtar o texto
                            formatter={formatLegendText}
                            // Define um estilo para a área da legenda
                            wrapperStyle={{
                                fontSize: "12px",
                                lineHeight: "1.5",
                                overflowY: "auto", // Permite scroll vertical se houver muitos itens
                                maxHeight: "350px",
                                paddingLeft: "10px"
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const ScoringTable = ({ data, groupBy }: { data: TableRow[], groupBy: string }) => (
    <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Detalhes por Canal ({groupBy === 'content' ? 'UTM Content' : 'UTM Campaign'})</h2>
        <div className="overflow-x-auto">
            <table className="min-w-full hidden md:table">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Canal</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Inscrições</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Check-ins</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Taxa de Check-in</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                    {data.map((row, index) => {
                        const conversionRate = row.inscricoes > 0 ? (row.check_ins / row.inscricoes * 100) : 0;
                        return (
                            <tr key={row.canal + index}>
                                <td className="px-4 py-4 whitespace-nowrap font-medium text-slate-800 max-w-xs truncate" title={row.canal}>{row.canal || 'N/A'}</td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">{row.inscricoes.toLocaleString('pt-BR')}</td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600">{row.check_ins.toLocaleString('pt-BR')}</td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500 font-semibold">{conversionRate.toFixed(1)}%</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <div className="md:hidden space-y-4">
                {data.map((row, index) => {
                    const conversionRate = row.inscricoes > 0 ? (row.check_ins / row.inscricoes * 100) : 0;
                    return (
                        <div key={row.canal + index} className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                            <div className="font-bold text-slate-800 truncate" title={row.canal}>{row.canal || 'N/A'}</div>
                            <div className="flex justify-between text-sm"><span className="font-medium text-slate-500">Inscrições:</span> <span className="font-semibold text-slate-700">{row.inscricoes.toLocaleString('pt-BR')}</span></div>
                            <div className="flex justify-between text-sm"><span className="font-medium text-slate-500">Check-ins:</span> <span className="font-semibold text-slate-700">{row.check_ins.toLocaleString('pt-BR')}</span></div>
                            <div className="flex justify-between text-sm"><span className="font-medium text-slate-500">Taxa de Check-in:</span> <span className="font-bold text-blue-600">{conversionRate.toFixed(1)}%</span></div>
                        </div>
                    )
                })}
            </div>
        </div>
    </div>
);

export default function PerformanceControlePage() {
    const supabase = createClientComponentClient();
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunch, setSelectedLaunch] = useState<string>('');
    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [groupBy, setGroupBy] = useState('content');
    const [period, setPeriod] = useState<'today' | 'yesterday' | '7days' | 'custom'>('today');
    const [customDate, setCustomDate] = useState({
        start: format(new Date(), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd'),
        startTime: '00:00',
        endTime: '23:59'
    });

    const loadDashboardData = useCallback(async () => {
        if (!selectedLaunch) return;
        setIsLoading(true);
        const now = toZonedTime(new Date(), TIME_ZONE);
        let startDateTime, endDateTime;
        switch (period) {
            case 'yesterday':
                const yesterday = subDays(now, 1);
                startDateTime = startOfDay(yesterday);
                endDateTime = endOfDay(yesterday);
                break;
            case '7days':
                startDateTime = startOfDay(subDays(now, 6));
                endDateTime = endOfDay(now);
                break;
            case 'custom':
                startDateTime = toZonedTime(`${customDate.start}T${customDate.startTime}:00`, TIME_ZONE);
                endDateTime = toZonedTime(`${customDate.end}T${customDate.endTime}:59`, TIME_ZONE);
                break;
            default:
                startDateTime = startOfDay(now);
                endDateTime = endOfDay(now);
        }
        try {
            const { data: result, error } = await supabase.rpc('get_full_performance_dashboard', {
                p_launch_id: selectedLaunch,
                p_start_datetime: startDateTime.toISOString(),
                p_end_datetime: endDateTime.toISOString(),
                p_group_by: groupBy
            });
            if (error) throw error;
            setData(result);
        } catch (error) {
            console.error("Erro ao carregar dados do dashboard:", error);
            setData(null);
        } finally {
            setIsLoading(false);
        }
    }, [selectedLaunch, period, customDate, groupBy, supabase]);

    useEffect(() => {
        const fetchLaunches = async () => {
            const { data: launchesData, error } = await supabase
                .from('lancamentos')
                .select('id, nome, status')
                .in('status', ['Em Andamento', 'Concluído']);
            if (error) {
                console.error("Erro ao buscar lançamentos:", error);
            } else if (launchesData) {
                const statusOrder: { [key: string]: number } = { 'Em Andamento': 1, 'Concluído': 2 };
                const sorted = [...launchesData].sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || a.nome.localeCompare(b.nome));
                setLaunches(sorted);
                if (sorted.length > 0 && !selectedLaunch) {
                    setSelectedLaunch(sorted[0].id);
                }
            }
        };
        fetchLaunches();
    }, [supabase, selectedLaunch]);

    useEffect(() => {
        if (selectedLaunch) {
            loadDashboardData();
        }
    }, [selectedLaunch, loadDashboardData]);

    const handleCustomDateChange = (field: string, value: string) => {
        setCustomDate(prev => ({ ...prev, [field]: value }));
    };

    const kpis = data?.kpis;
    const totalConversionRate = kpis && kpis.total_inscricoes > 0 ? (kpis.total_checkins / kpis.total_inscricoes) * 100 : 0;

    return (
        <div className="space-y-6 p-4 md:p-6 bg-slate-50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Dashboard de Performance</h1>
                <div className="bg-white p-2 rounded-lg shadow-md w-full md:w-auto">
                    <select
                        value={selectedLaunch}
                        onChange={(e) => setSelectedLaunch(e.target.value)}
                        className="w-full px-3 py-2 border-none rounded-md focus:ring-0 bg-transparent text-slate-700 font-medium"
                        disabled={isLoading}
                    >
                        {launches.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.status})</option>)}
                    </select>
                </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md flex flex-col gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                    <label className="font-medium text-slate-700 shrink-0">Período:</label>
                    {['today', 'yesterday', '7days', 'custom'].map(p => (
                        <button key={p} onClick={() => setPeriod(p as any)} disabled={isLoading} className={`py-2 px-4 rounded-md text-sm font-semibold transition-colors duration-200 disabled:opacity-50 ${period === p ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>
                            {p === 'today' ? 'Hoje' : p === 'yesterday' ? 'Ontem' : p === '7days' ? '7 dias' : 'Personalizado'}
                        </button>
                    ))}
                </div>
                {period === 'custom' && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-4 border-t border-slate-200">
                        <label className="text-sm font-medium text-slate-700">De:</label>
                        <input type="date" value={customDate.start} onChange={e => handleCustomDateChange('start', e.target.value)} disabled={isLoading} className="border-slate-300 rounded-md px-2 py-1 text-sm disabled:opacity-50" />
                        <input type="time" value={customDate.startTime} onChange={e => handleCustomDateChange('startTime', e.target.value)} disabled={isLoading} className="border-slate-300 rounded-md px-2 py-1 text-sm disabled:opacity-50" />
                        <label className="text-sm font-medium text-slate-700">Até:</label>
                        <input type="date" value={customDate.end} onChange={e => handleCustomDateChange('end', e.target.value)} disabled={isLoading} className="border-slate-300 rounded-md px-2 py-1 text-sm disabled:opacity-50" />
                        <input type="time" value={customDate.endTime} onChange={e => handleCustomDateChange('endTime', e.target.value)} disabled={isLoading} className="border-slate-300 rounded-md px-2 py-1 text-sm disabled:opacity-50" />
                    </div>
                )}
                <div className="pt-4 border-t border-slate-200">
                    <label htmlFor="group-by-select" className="block text-sm font-medium text-slate-700">Agrupar Tabela Por:</label>
                    <select id="group-by-select" value={groupBy} onChange={e => setGroupBy(e.target.value)} disabled={isLoading} className="mt-1 block w-full sm:w-1/3 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md disabled:opacity-50">
                        <option value="content">UTM Content</option>
                        <option value="campaign">UTM Campaign</option>
                    </select>
                </div>
            </div>
            {isLoading ? (
                <div className="flex justify-center items-center p-10"><FaSpinner className="animate-spin text-blue-600 text-4xl" /></div>
            ) : !data || !kpis || !data.tableData || data.tableData.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-lg shadow-md"><p className="text-slate-500">Nenhum dado de performance encontrado para a seleção.</p></div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <KpiCard title="Total de Inscrições" value={kpis.total_inscricoes.toLocaleString('pt-BR')} />
                        <KpiCard title="Total de Check-ins" value={kpis.total_checkins.toLocaleString('pt-BR')} />
                        <KpiCard title="Taxa de Check-in" value={`${totalConversionRate.toFixed(1)}%`} highlight />
                    </div>
                    {/* --- MUDANÇA AQUI --- */}
                    {/* A div agora usa grid-cols-1 para empilhar os gráficos em todas as telas, conforme solicitado. */}
                    <div className="grid grid-cols-1 gap-6">
                        {data.byContentChart && data.byContentChart.length > 0 &&
                            <PieChartWithLegend title={groupBy === 'content' ? "Inscrições por Conteúdo" : "Inscrições por Campanha"} data={data.byContentChart} />
                        }
                        {data.byMediumChart && data.byMediumChart.length > 0 &&
                            <PieChartWithLegend title="Inscrições por Mídia" data={data.byMediumChart} />
                        }
                    </div>
                    <ScoringTable data={data.tableData} groupBy={groupBy} />
                </div>
            )}
        </div>
    );
}
