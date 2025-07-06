'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/supabaseClient';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- Tipos de Dados ---
type Launch = { id: string; nome: string; status: string; };
type KpiData = { total_inscricoes: number; total_checkins: number; taxa_checkin: number; };
type ChartData = { data: string; inscricoes: number; checkins: number; };
type TableData = {
    canal: string; inscricoes: number; check_ins: number; quente_mais_80: number;
    quente_morno: number; morno: number; morno_frio: number; frio_menos_35: number;
};
type DashboardData = { kpis: KpiData; chartData: ChartData[]; tableData: TableData[]; };

// --- Componentes ---
const PageHeader = ({ title, launches, selectedLaunch, onLaunchChange }: { title: string; launches: Launch[]; selectedLaunch: string; onLaunchChange: (id: string) => void; }) => (
    <div className="flex justify-between items-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">{title}</h1>
        <div className="bg-white p-2 rounded-lg shadow-md">
            <select value={selectedLaunch} onChange={(e) => onLaunchChange(e.target.value)} className="px-3 py-2 border-none rounded-md focus:ring-0 bg-transparent">
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
    <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Scoring por Canal ({groupBy === 'content' ? 'UTM Content' : 'UTM Campaign'})</h2>
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Canal</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Inscrições</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Check-ins</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-green-600 uppercase tracking-wider">Quente (&gt;80)</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-lime-600 uppercase tracking-wider">Quente-Morno</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-amber-600 uppercase tracking-wider">Morno</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-orange-600 uppercase tracking-wider">Morno-Frio</th>
                        {/* ✅ CORREÇÃO AQUI: Trocado '<' por '&lt;' */}
                        <th className="px-6 py-3 text-left text-xs font-medium text-red-600 uppercase tracking-wider">Frio (&lt;35)</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                    {data.map((row, index) => (
                        <tr key={row.canal + index} className="hover:bg-slate-50">
                            <td className="px-6 py-4 max-w-xs truncate text-sm font-medium text-slate-900" title={row.canal}>{row.canal}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{row.inscricoes}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{row.check_ins}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{row.quente_mais_80}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-lime-600">{row.quente_morno}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-amber-600">{row.morno}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600">{row.morno_frio}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{row.frio_menos_35}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

// --- Página Principal ---
export default function LeadScoringPage() {
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
            const { data, error } = await db.rpc('get_full_lead_scoring_dashboard', { 
                p_launch_id: launchId,
                p_group_by: groupBy 
            });
            if (error) throw error;
            setData(data);
        } catch (error) {
            const err = error as Error; // ✅ Tipagem Corrigida
            console.error("Erro ao buscar dados do dashboard:", err);
            setData(null);
        } finally {
            setIsLoading(false);
        }
    }, [groupBy]);

    useEffect(() => {
        const fetchLaunches = async () => {
            try {
                const { data: launchesData, error } = await db.rpc('get_launches_for_dropdown');
                if (error) throw error;
                if (launchesData && launchesData.length > 0) {
                    setLaunches(launchesData);
                    setSelectedLaunch(launchesData[0].id);
                } else {
                    setNoLaunchesFound(true);
                    setIsLoading(false);
                }
            } catch (error) {
                const err = error as Error; // ✅ Tipagem Corrigida
                console.error("Erro ao buscar lançamentos:", err);
                setNoLaunchesFound(true);
            }
        };
        fetchLaunches();
    }, []);

    useEffect(() => {
        if (selectedLaunch) {
            loadDashboardData(selectedLaunch);
        }
    }, [selectedLaunch, loadDashboardData]); 
    
    const renderContent = () => {
        if (isLoading) {
            return <div className="text-center py-10"><p>A carregar dados...</p></div>;
        }
        if (!data || !data.kpis) {
            return <div className="text-center py-10 bg-white rounded-lg shadow-md"><p className="text-slate-500">Nenhum dado encontrado para este lançamento.</p></div>;
        }
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <KpiCard title="Total Inscrições" value={data.kpis.total_inscricoes} />
                    <KpiCard title="Total Check-ins" value={data.kpis.total_checkins} />
                    <KpiCard title="Taxa de Check-in" value={data.kpis.taxa_checkin || 0} format={(v) => `${v.toFixed(1)}%`} />
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
            </div>
        );
    };

    if (noLaunchesFound) {
        return <div className="text-center py-10 bg-white rounded-lg shadow-md"><p className="text-slate-500">Nenhum lançamento válido foi encontrado.</p></div>;
    }

    return (
        <div className="space-y-6">
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