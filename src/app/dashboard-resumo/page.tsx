'use client';

import { useState, useEffect, useMemo, useCallback, ReactElement } from 'react';
import { db } from '@/lib/supabaseClient';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- Tipos de Dados ---
type Launch = { id: string; nome: string; status: string; };
type DailyData = {
    full_date: string;
    short_date: string;
    inscricoes: number;
    checkins: number;
};

// --- Componente Reutilizável para os Gráficos ---
// ✅ AQUI ESTÁ A CORREÇÃO: Trocamos React.ReactNode por React.ReactElement
const ChartCard = ({ title, children }: { title: string, children: ReactElement }) => (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">{title}</h2>
        <div style={{ width: '100%', height: 300 }}><ResponsiveContainer>{children}</ResponsiveContainer></div>
    </div>
);

export default function ResumoDiarioPage() {
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
            const { data, error } = await db.rpc('get_daily_summary', { p_launch_id: launchId });
            if (error) throw error;
            setDailyData(data || []);
        } catch (error) {
            console.error("Erro ao buscar resumo diário:", error);
            setDailyData([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const fetchInitialData = async () => {
            setIsLoading(true);
            try {
                const { data: launchesData, error: launchesError } = await db.rpc('get_launches_for_dropdown');
                if (launchesError) throw launchesError;

                if (launchesData && launchesData.length > 0) {
                    setLaunches(launchesData);
                    setSelectedLaunch(launchesData[0].id);
                } else {
                    setIsLoading(false);
                }
            } catch (error) {
                console.error("Erro na busca inicial:", error);
                setIsLoading(false);
            }
        };
        fetchInitialData();
    }, []);

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
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Resumo Diário do Lançamento</h1>
                <div className="bg-white p-2 rounded-lg shadow-md">
                    <select value={selectedLaunch} onChange={handleLaunchChange} className="px-3 py-2 border-none rounded-md focus:ring-0 bg-transparent">
                        {launches.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.status})</option>)}
                    </select>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-10"><p>A carregar dados...</p></div>
            ) : dailyData.length === 0 ? (
                 <div className="text-center py-10 bg-white rounded-lg shadow-md"><p className="text-slate-500">Nenhum dado encontrado para este lançamento.</p></div>
            ) : (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-lg font-semibold text-slate-700 mb-4">Dados Detalhados por Dia</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Data</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Inscrições no Dia</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Check-ins no Dia</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    <tr className="bg-slate-100 font-bold">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">Totais Gerais</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{totals.inscricoes}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{totals.checkins}</td>
                                    </tr>
                                    {tableData.map((item) => (
                                        <tr key={item.full_date}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{item.full_date}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.inscricoes}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.checkins}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ChartCard title="Inscrições vs Check-ins (Barras)">
                            <BarChart data={dailyData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="short_date" interval="preserveStartEnd" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="inscricoes" fill="#8884d8" name="Inscrições" />
                                <Bar dataKey="checkins" fill="#82ca9d" name="Check-ins" />
                            </BarChart>
                        </ChartCard>
                        <ChartCard title="Inscrições vs Check-ins (Linhas)">
                            <LineChart data={dailyData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="short_date" interval="preserveStartEnd" />
                                <YAxis />
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