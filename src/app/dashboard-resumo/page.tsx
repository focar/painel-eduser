// src/app/dashboard-resumo/page.tsx (VERSÃO FINAL E OTIMIZADA)
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '../../utils/supabase/client'; // Caminho relativo para evitar erros de build
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FaSpinner } from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast';

// --- Tipos de Dados ---
type Launch = { id: string; nome: string; status: string; };

type KpiData = {
    totalInscricoes: number;
    totalCheckins: number;
    trafegoPago: number;
    trafegoOrganico: number;
    trafegoNaoTraqueado: number;
};

type DailyData = {
    full_date: string;
    inscricoes: number;
    checkins: number;
    trfPago: number;
    trfOrganico: number;
    trfNaoTraqueado: number;
};

// --- Componentes ---
const LoadingSpinner = () => <div className="flex justify-center items-center h-64"><FaSpinner className="animate-spin text-blue-600 text-3xl" /></div>;
const KpiCard = ({ title, value, description }: { title: string; value: number; description: string; }) => (
    <div className="p-4 bg-slate-50 rounded-lg text-center h-full flex flex-col justify-center">
        <p className="text-3xl font-bold text-slate-800 mt-1">{value.toLocaleString('pt-BR')}</p>
        <h3 className="text-sm font-medium text-slate-500 truncate mt-1">{title}</h3>
        <p className="text-xs text-slate-400">{description}</p>
    </div>
);

export default function ResumoDiarioPage() {
    const supabase = createClient();
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunchId, setSelectedLaunchId] = useState<string | null>(null);
    const [kpis, setKpis] = useState<KpiData>({ totalInscricoes: 0, totalCheckins: 0, trafegoPago: 0, trafegoOrganico: 0, trafegoNaoTraqueado: 0 });
    const [dailyData, setDailyData] = useState<DailyData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Busca inicial de lançamentos
    useEffect(() => {
        const fetchLaunches = async () => {
            const { data, error } = await supabase.from('lancamentos').select('id, nome, status').in('status', ['Em Andamento', 'Concluído', 'Planejado']);
            if (error) { toast.error('Falha ao carregar lançamentos.'); setError('Falha ao carregar lançamentos.'); console.error(error); return; }
            if (data && data.length > 0) {
                const statusOrder: { [key: string]: number } = { 'Em Andamento': 1, 'Planejado': 2, 'Concluído': 3 };
                const sorted = data.sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || a.nome.localeCompare(b.nome));
                setLaunches(sorted);
                const inProgress = sorted.find(l => l.status === 'Em Andamento');
                setSelectedLaunchId(inProgress ? inProgress.id : sorted[0].id);
            }
        };
        fetchLaunches();
    }, [supabase]);

    // Busca TODOS os dados do dashboard com uma ÚNICA chamada à nova função RPC
    useEffect(() => {
        if (!selectedLaunchId) return;

        let isActive = true;

        const fetchDashboardData = async () => {
            setIsLoading(true);
            setError(null);
            
            const { data, error } = await supabase.rpc('get_resumo_diario_dashboard', {
                launch_id_param: selectedLaunchId
            });

            if (!isActive) return;

            if (error) {
                toast.error('Erro ao carregar dados do resumo.');
                setError("Erro ao carregar dados do resumo.");
                console.error(error);
                setIsLoading(false);
                return;
            }

            if (data) {
                setKpis(data.kpis || { totalInscricoes: 0, totalCheckins: 0, trafegoPago: 0, trafegoOrganico: 0, trafegoNaoTraqueado: 0 });
                setDailyData(data.dailyData || []);
            }
            setIsLoading(false);
        };

        fetchDashboardData();

        return () => {
            isActive = false;
        };
    }, [selectedLaunchId, supabase]);

    // Prepara os dados para os gráficos
    const chartData = useMemo(() => {
        if (!dailyData) return [];
        return [...dailyData]
            .map(day => ({
                ...day,
                short_date: new Date(day.full_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
            }))
            .reverse();
    }, [dailyData]);

    if (error) return <div className="p-8 text-center text-red-500 bg-red-50 rounded-lg">{error}</div>;

    return (
        <>
            <Toaster position="top-center" />
            <div className="p-4 md:p-8 space-y-6 bg-slate-100 min-h-screen">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center">
                    <h1 className="text-3xl font-bold text-gray-900 mb-4 md:mb-0">Resumo Diário do Lançamento</h1>
                    <select value={selectedLaunchId || ''} onChange={(e) => setSelectedLaunchId(e.target.value)} disabled={isLoading} className="w-full md:w-72 bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 disabled:opacity-50">
                        {launches.map((launch) => (<option key={launch.id} value={launch.id}> {launch.nome} ({launch.status}) </option>))}
                    </select>
                </header>

                {isLoading ? <LoadingSpinner /> : (
                    <main className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                            <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                                <h2 className="text-lg font-semibold text-slate-700 mb-4">Visão Geral</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <KpiCard title="TOTAL INSCRIÇÕES" value={kpis.totalInscricoes} description="Total do Lançamento" />
                                    <KpiCard title="TOTAL CHECK-INS" value={kpis.totalCheckins} description="Total do Lançamento" />
                                </div>
                            </div>
                            <div className="lg:col-span-3 bg-white p-6 rounded-lg shadow-md">
                                <h2 className="text-lg font-semibold text-slate-700 mb-4">Origem do Tráfego</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <KpiCard title="TRÁFEGO PAGO" value={kpis.trafegoPago} description="Todas as outras fontes" />
                                    <KpiCard title="TRÁFEGO ORGÂNICO" value={kpis.trafegoOrganico} description="utm_source = organic" />
                                    <KpiCard title="NÃO TRAQUEADO" value={kpis.trafegoNaoTraqueado} description="Fonte vazia ou placeholders" />
                                </div>
                            </div>
                        </div>

                        {dailyData.length > 0 && (
                            <>
                                <div className="bg-white p-6 rounded-lg shadow-md">
                                    <h2 className="text-lg font-semibold text-slate-700 mb-4">Dados Detalhados por Dia</h2>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full text-sm">
                                            <thead className="bg-slate-50 text-slate-600 font-medium">
                                                <tr>
                                                    <th className="px-4 py-3 text-left">DATA</th>
                                                    <th className="px-4 py-3 text-right">LEADS</th>
                                                    <th className="px-4 py-3 text-right">CHECK-IN</th>
                                                    <th className="px-4 py-3 text-right">TRF PAGO</th>
                                                    <th className="px-4 py-3 text-right">TRF ORGÂNICO</th>
                                                    <th className="px-4 py-3 text-right">NÃO TRAQ.</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200">
                                                {dailyData.map(day => (
                                                    <tr key={day.full_date}>
                                                        <td className="px-4 py-4">{new Date(day.full_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</td>
                                                        <td className="px-4 py-4 text-right">{day.inscricoes.toLocaleString('pt-BR')}</td>
                                                        <td className="px-4 py-4 text-right">{day.checkins.toLocaleString('pt-BR')}</td>
                                                        <td className="px-4 py-4 text-right">{day.trfPago.toLocaleString('pt-BR')}</td>
                                                        <td className="px-4 py-4 text-right">{day.trfOrganico.toLocaleString('pt-BR')}</td>
                                                        <td className="px-4 py-4 text-right">{day.trfNaoTraqueado.toLocaleString('pt-BR')}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="bg-white p-6 rounded-lg shadow-md">
                                        <h2 className="text-lg font-semibold text-slate-700 mb-4">Evolução Diária de Inscritos</h2>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={chartData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="short_date" />
                                                <YAxis allowDecimals={false} />
                                                <Tooltip />
                                                <Legend />
                                                <Bar dataKey="inscricoes" fill="#4f46e5" name="Inscrições" />
                                                <Bar dataKey="checkins" fill="#22c55e" name="Check-ins" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="bg-white p-6 rounded-lg shadow-md">
                                        <h2 className="text-lg font-semibold text-slate-700 mb-4">Evolução Diária de Tráfego</h2>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <LineChart data={chartData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="short_date" />
                                                <YAxis allowDecimals={false} />
                                                <Tooltip />
                                                <Legend />
                                                <Line type="monotone" dataKey="trfPago" stroke="#3b82f6" name="Pago" strokeWidth={2} />
                                                <Line type="monotone" dataKey="trfOrganico" stroke="#16a34a" name="Orgânico" strokeWidth={2} />
                                                <Line type="monotone" dataKey="trfNaoTraqueado" stroke="#ef4444" name="Não Traqueado" strokeWidth={2} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </>
                        )}
                    </main>
                )}
            </div>
        </>
    );
}
