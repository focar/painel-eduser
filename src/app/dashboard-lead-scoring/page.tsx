'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { FaSpinner, FaFileCsv } from 'react-icons/fa';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

// --- Tipos de Dados ---
type Launch = { id: string; nome: string; status: string; };

type TableData = {
    canal: string;
    inscricoes: number;
    check_ins: number;
    quente_mais_80: number;
    quente_morno: number;
    morno: number;
    morno_frio: number;
    frio_menos_35: number;
};

type ChartData = {
    name: string;
    value: number;
    fill: string; 
};

type DailyEvolutionData = {
    data: string;
    inscricoes: number;
    checkins: number;
};

type DashboardData = {
    tableData: TableData[];
    dailyEvolutionChart: DailyEvolutionData[];
};

// --- Componentes de UI ---

const PageHeader = ({ title, launches, selectedLaunch, onLaunchChange, isLoading }: { title: string; launches: Launch[]; selectedLaunch: string; onLaunchChange: (id: string) => void; isLoading: boolean; }) => (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">{title}</h1>
        <div className="bg-white p-2 rounded-lg shadow-md w-full md:w-auto">
            <select value={selectedLaunch} onChange={(e) => onLaunchChange(e.target.value)} disabled={isLoading} className="w-full px-3 py-2 border-none rounded-md focus:ring-0 bg-transparent text-slate-700 font-medium">
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
  if (cx === undefined || cy === undefined || midAngle === undefined || innerRadius === undefined || outerRadius === undefined || percent === undefined) return null;
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
  const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize="12px" fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const ScoreDistributionChart = ({ data }: { data: ChartData[] }) => {
  return (
    <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
      <h2 className="text-lg font-semibold text-slate-700 mb-4">Distribuição de Público por Score</h2>
      <div style={{ width: '100%', height: 350 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} labelLine={false} label={renderCustomizedLabel}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => `${value.toLocaleString('pt-BR')} leads`} />
            <Legend iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const DailyEvolutionChart = ({ data }: { data: DailyEvolutionData[] }) => (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Inscrições vs Check-ins por Dia</h2>
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="data" /><YAxis /><Tooltip /><Legend />
                <Line type="monotone" dataKey="inscricoes" stroke="#8884d8" strokeWidth={2} name="Inscrições" />
                <Line type="monotone" dataKey="checkins" stroke="#82ca9d" strokeWidth={2} name="Check-ins" />
            </LineChart>
        </ResponsiveContainer>
    </div>
);

// --- INÍCIO DA CORREÇÃO: CÓDIGO DA TABELA RESTAURADO ---
const ScoringTable = ({ data, groupBy, launchName }: { data: TableData[], groupBy: string, launchName: string }) => {
    const exportToCSV = () => {
        const headers = ["Canal", "Inscrições", "Check-ins", "Quente (>80)", "Quente-Morno", "Morno", "Morno-Frio", "Frio (<35)"];
        const csvRows = [
            headers.join(','),
            ...data.map(row => [
                `"${row.canal.replace(/"/g, '""')}"`,
                row.inscricoes, row.check_ins, row.quente_mais_80,
                row.quente_morno, row.morno, row.morno_frio, row.frio_menos_35
            ].join(','))
        ];
        const csvString = csvRows.join('\n');
        const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        const safeLaunchName = launchName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.setAttribute('download', `scoring_${safeLaunchName}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-700">Scoring por Canal ({groupBy === 'content' ? 'UTM Content' : 'UTM Campaign'})</h2>
                <button onClick={exportToCSV} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 transition-colors">
                    <FaFileCsv /> Exportar
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full hidden md:table">
                    <thead className="bg-slate-50">
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
                    <tbody className="bg-white divide-y divide-slate-200">
                        {data.map((row, index) => (
                            <tr key={row.canal + index}>
                                <td className="p-3 md:px-4 md:py-4 font-medium text-slate-900 md:max-w-xs truncate" title={row.canal}>{row.canal}</td>
                                <td className="p-3 md:px-4 md:py-4 md:text-center text-sm text-slate-600">{row.inscricoes}</td>
                                <td className="p-3 md:px-4 md:py-4 md:text-center text-sm text-slate-600">{row.check_ins}</td>
                                <td className="p-3 md:px-4 md:py-4 md:text-center text-sm text-green-600">{row.quente_mais_80}</td>
                                <td className="p-3 md:px-4 md:py-4 md:text-center text-sm text-lime-600">{row.quente_morno}</td>
                                <td className="p-3 md:px-4 md:py-4 md:text-center text-sm text-amber-600">{row.morno}</td>
                                <td className="p-3 md:px-4 md:py-4 md:text-center text-sm text-orange-600">{row.morno_frio}</td>
                                <td className="p-3 md:px-4 md:py-4 md:text-center text-sm text-red-600">{row.frio_menos_35}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 <div className="md:hidden space-y-4 mt-4">
                    {data.map((row, index) => (
                        <div key={row.canal + index} className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                            <div className="font-bold text-slate-800 truncate" title={row.canal}>{row.canal}</div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div><span className="font-medium text-slate-500">Inscrições:</span> <span className="font-semibold text-slate-700 float-right">{row.inscricoes}</span></div>
                                <div><span className="font-medium text-slate-500">Check-ins:</span> <span className="font-semibold text-slate-700 float-right">{row.check_ins}</span></div>
                                <div><span className="font-medium text-green-600">Quente:</span> <span className="font-semibold text-green-700 float-right">{row.quente_mais_80}</span></div>
                                <div><span className="font-medium text-lime-600">Q-Morno:</span> <span className="font-semibold text-lime-700 float-right">{row.quente_morno}</span></div>
                                <div><span className="font-medium text-amber-600">Morno:</span> <span className="font-semibold text-amber-700 float-right">{row.morno}</span></div>
                                <div><span className="font-medium text-orange-600">M-Frio:</span> <span className="font-semibold text-orange-700 float-right">{row.morno_frio}</span></div>
                                <div><span className="font-medium text-red-600">Frio:</span> <span className="font-semibold text-red-700 float-right">{row.frio_menos_35}</span></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
// --- FIM DA CORREÇÃO ---

// --- Componente Principal da Página ---
export default function LeadScoringPage() {
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
            console.error("Erro ao buscar dados do dashboard:", error as Error);
            setData(null);
        } finally {
            setIsLoading(false);
        }
    }, [groupBy, supabase]);

    useEffect(() => {
        const fetchLaunches = async () => {
            try {
                const { data: launchesData, error } = await supabase.from('lancamentos').select('id, nome, status').in('status', ['Em Andamento', 'Concluído']);
                if (error) throw error;
                if (launchesData && launchesData.length > 0) {
                    const statusOrder: { [key: string]: number } = { 'Em Andamento': 1, 'Concluído': 2 };
                    const sorted = [...launchesData].sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || a.nome.localeCompare(b.nome));
                    setLaunches(sorted);
                    setSelectedLaunch(sorted[0].id);
                } else {
                    setNoLaunchesFound(true);
                    setIsLoading(false);
                }
            } catch (error) {
                console.error("Erro ao buscar lançamentos:", error as Error);
                setNoLaunchesFound(true);
                setIsLoading(false);
            }
        };
        fetchLaunches();
    }, [supabase]);

    useEffect(() => {
        if (selectedLaunch) {
            loadDashboardData(selectedLaunch);
        }
    }, [selectedLaunch, loadDashboardData]);

    const scoreDistributionChartData = useMemo(() => {
        if (!data?.tableData) return [];
        const totals = data.tableData.reduce((acc, row) => {
            acc.quente_mais_80 += row.quente_mais_80 || 0;
            acc.quente_morno += row.quente_morno || 0;
            acc.morno += row.morno || 0;
            acc.morno_frio += row.morno_frio || 0;
            acc.frio_menos_35 += row.frio_menos_35 || 0;
            return acc;
        }, { quente_mais_80: 0, quente_morno: 0, morno: 0, morno_frio: 0, frio_menos_35: 0 });
        const chartData = [
            { name: 'Quente (>80)', value: totals.quente_mais_80, fill: '#16a34a' },
            { name: 'Quente-Morno (65-79)', value: totals.quente_morno, fill: '#65a30d' },
            { name: 'Morno (50-64)', value: totals.morno, fill: '#d97706' },
            { name: 'Morno-Frio (35-49)', value: totals.morno_frio, fill: '#ea580c' },
            { name: 'Frio (<35)', value: totals.frio_menos_35, fill: '#dc2626' },
        ];
        return chartData.filter(item => item.value > 0);
    }, [data?.tableData]);

    const renderContent = () => {
        if (isLoading) return <div className="flex justify-center items-center h-screen"><FaSpinner className="animate-spin text-blue-600 text-4xl" /></div>;
        if (!data || !data.tableData) return <div className="text-center py-10 bg-white rounded-lg shadow-md"><p className="text-slate-500">Nenhum dado encontrado.</p></div>;

        const totals = {
            inscricoes: data.tableData.reduce((acc, row) => acc + (row.inscricoes || 0), 0),
            check_ins: data.tableData.reduce((acc, row) => acc + (row.check_ins || 0), 0),
        };
        const totalConversionRate = totals.inscricoes > 0 ? (totals.check_ins / totals.inscricoes) * 100 : 0;

        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <KpiCard title="Total Inscrições" value={totals.inscricoes} />
                    <KpiCard title="Total Check-ins" value={totals.check_ins} />
                    <KpiCard title="Taxa de Check-in" value={totalConversionRate} format={(v) => `${v.toFixed(1)}%`} />
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {scoreDistributionChartData.length > 0 && (
                        <ScoreDistributionChart data={scoreDistributionChartData} />
                    )}
                    {data.dailyEvolutionChart && data.dailyEvolutionChart.length > 0 && (
                        <DailyEvolutionChart data={data.dailyEvolutionChart} />
                    )}
                </div>

                {data.tableData && data.tableData.length > 0 && <ScoringTable data={data.tableData} groupBy={groupBy} launchName={launches.find(l => l.id === selectedLaunch)?.nome || 'export'} />}
            </div>
        );
    };

    if (noLaunchesFound) return <div className="text-center py-10 bg-white rounded-lg shadow-md"><p className="text-slate-500">Nenhum lançamento válido foi encontrado.</p></div>;

    return (
        <div className="space-y-6 p-4 md:p-6 bg-slate-50 min-h-screen">
            <PageHeader title="Dashboard de Lead Scoring" launches={launches} selectedLaunch={selectedLaunch} onLaunchChange={setSelectedLaunch} isLoading={isLoading} />
            <div className="bg-white p-4 rounded-lg shadow-sm">
                <label htmlFor="group-by-select" className="block text-sm font-medium text-slate-700">Agrupar Tabela Por:</label>
                <select id="group-by-select" value={groupBy} onChange={e => setGroupBy(e.target.value)} disabled={isLoading} className="mt-1 block w-full sm:w-1-3 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                    <option value="content">UTM Content</option>
                    <option value="campaign">UTM Campaign</option>
                </select>
            </div>
            {renderContent()}
        </div>
    );
}
