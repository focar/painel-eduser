'use client';

import { useState, useEffect, useMemo, useCallback, ReactElement } from 'react';
// CORREÇÃO: Importa o cliente recomendado e remove a importação antiga do 'db'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FaSpinner } from 'react-icons/fa';

// --- Tipos de Dados ---
type Launch = { id: string; nome: string; status: string; };
type DailyData = {
    full_date: string;
    short_date: string;
    inscricoes: number;
    checkins: number;
};

const ChartCard = ({ title, children }: { title: string, children: ReactElement }) => (
    <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">{title}</h2>
        <div style={{ width: '100%', height: 300 }}><ResponsiveContainer>{children}</ResponsiveContainer></div>
    </div>
);

export default function ResumoDiarioPage() {
    // CORREÇÃO: Cria a instância do cliente da forma correta
    const supabase = createClientComponentClient();

    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunch, setSelectedLaunch] = useState<string>('');
    const [dailyData, setDailyData] = useState<DailyData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadDashboardData = useCallback(async (launchId: string) => {
        if (!launchId) {
            setDailyData([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            // CORREÇÃO: Usa a nova variável 'supabase'
            const { data, error } = await supabase.rpc('get_daily_summary', { p_launch_id: launchId });
            if (error) throw error;
            setDailyData(data || []);
        } catch (error) {
            console.error("Erro ao buscar resumo diário:", error);
            setDailyData([]);
        } finally {
            setIsLoading(false);
        }
    }, [supabase]); // Adicionado supabase como dependência

    useEffect(() => {
        const fetchInitialData = async () => {
            setIsLoading(true);
            try {
                // CORREÇÃO: Usa a nova variável 'supabase'
                const { data: launchesData, error: launchesError } = await supabase.from('lancamentos').select('id, nome, status');
                if (launchesError) throw launchesError;

                if (launchesData && launchesData.length > 0) {
                    const statusOrder: { [key: string]: number } = { 'Em Andamento': 1, 'Concluído': 2 };
                    const filteredAndSorted = launchesData
                        .filter(launch => launch.status === 'Em Andamento' || launch.status === 'Concluído')
                        .sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
                    
                    setLaunches(filteredAndSorted);
                    if (filteredAndSorted.length > 0) {
                        setSelectedLaunch(filteredAndSorted[0].id);
                    }
                } else {
                    setIsLoading(false);
                }
            } catch (error) {
                console.error("Erro na busca inicial:", error);
                setIsLoading(false);
            }
        };
        fetchInitialData();
    }, [supabase]);

    useEffect(() => {
        if (selectedLaunch) {
            loadDashboardData(selectedLaunch);
        }
    }, [selectedLaunch, loadDashboardData]);

    const handleLaunchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedLaunch(e.target.value);
    };

    const tableData = useMemo(() => [...dailyData].reverse(), [dailyData]);
    const totals = useMemo(() => dailyData.reduce((acc, item) => {
        acc.inscricoes += item.inscricoes;
        acc.checkins += item.checkins;
        return acc;
    }, { inscricoes: 0, checkins: 0 }), [dailyData]);

    return (
        <div className="space-y-6 p-4 md:p-6">
            {/* ### INÍCIO DAS MUDANÇAS PARA RESPONSIVIDADE ### */}
            <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Resumo Diário do Lançamento</h1>
                <div className="bg-white p-2 rounded-lg shadow-md w-full md:w-auto">
                    <select value={selectedLaunch} onChange={handleLaunchChange} className="w-full px-3 py-2 border-none rounded-md focus:ring-0 bg-transparent">
                        {launches.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.status})</option>)}
                    </select>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-10"><FaSpinner className="animate-spin text-blue-600 text-3xl mx-auto" /></div>
            ) : dailyData.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-lg shadow-md"><p className="text-slate-500">Nenhum dado encontrado para este lançamento.</p></div>
            ) : (
                <div className="space-y-6">
                    <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
                        <h2 className="text-lg font-semibold text-slate-700 mb-4">Dados Detalhados por Dia</h2>
                        {/* Tabela Responsiva: vira "cards" no mobile */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-slate-50 hidden md:table-header-group">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Data</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Inscrições no Dia</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Check-ins no Dia</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white">
                                    {/* Linha de Totais */}
                                    <tr className="flex flex-col md:table-row mb-4 p-4 border rounded-lg shadow-sm md:p-0 md:border-none md:shadow-none bg-slate-100 font-bold">
                                        <td className="px-6 py-2 md:py-4 whitespace-nowrap text-sm text-slate-900"><span className="md:hidden font-normal text-slate-500">Item: </span>Totais Gerais</td>
                                        <td className="px-6 py-2 md:py-4 whitespace-nowrap text-sm text-slate-900"><span className="md:hidden font-normal text-slate-500">Inscrições: </span>{totals.inscricoes}</td>
                                        <td className="px-6 py-2 md:py-4 whitespace-nowrap text-sm text-slate-900"><span className="md:hidden font-normal text-slate-500">Check-ins: </span>{totals.checkins}</td>
                                    </tr>
                                    {/* Linhas de Dados */}
                                    {tableData.map((item) => (
                                        <tr key={item.full_date} className="flex flex-col md:table-row mb-2 p-4 border rounded-lg md:p-0 md:border-b md:border-slate-200 md:rounded-none">
                                            <td className="px-6 py-2 md:py-4 whitespace-nowrap text-sm font-medium text-slate-900"><span className="md:hidden font-normal text-slate-500">Data: </span>{item.full_date}</td>
                                            <td className="px-6 py-2 md:py-4 whitespace-nowrap text-sm text-slate-500"><span className="md:hidden font-normal text-slate-500">Inscrições: </span>{item.inscricoes}</td>
                                            <td className="px-6 py-2 md:py-4 whitespace-nowrap text-sm text-slate-500"><span className="md:hidden font-normal text-slate-500">Check-ins: </span>{item.checkins}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {/* ### FIM DAS MUDANÇAS PARA RESPONSIVIDADE ### */}
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ChartCard title="Inscrições vs Check-ins (Barras)">
                            <BarChart data={dailyData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="short_date" interval="preserveStartEnd" fontSize={12} />
                                <YAxis fontSize={12} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="inscricoes" fill="#8884d8" name="Inscrições" />
                                <Bar dataKey="checkins" fill="#82ca9d" name="Check-ins" />
                            </BarChart>
                        </ChartCard>
                        <ChartCard title="Inscrições vs Check-ins (Linhas)">
                            <LineChart data={dailyData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="short_date" interval="preserveStartEnd" fontSize={12} />
                                <YAxis fontSize={12} />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="inscricoes" stroke="#8884d8" name="Inscrições" />
                                <Line type="monotone" dataKey="checkins" stroke="#82ca9d" name="Check-ins" />
                            </LineChart>
                        </ChartCard>
                    </div>
                </div>
            )}
        </div>
    );
}