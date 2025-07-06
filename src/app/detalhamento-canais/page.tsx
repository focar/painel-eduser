'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '@/lib/supabaseClient';
import { FaSpinner } from 'react-icons/fa';

// --- Tipos de Dados ---
type Launch = { id: string; nome: string; status: string; };
type Kpis = {
    total_inscriptions: number;
    total_checkins: number;
    avulso_leads: number;
    conversion_rate: number;
};
type ChannelDetails = {
    source: string;
    medium: string;
    content: string;
    inscritos: number;
    checkins: number;
};
type DashboardData = {
    kpis: Kpis;
    details: ChannelDetails[];
};

// --- Componentes ---
const StatCard = ({ title, value }: { title: string, value: string | number }) => (
    <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <h3 className="text-md font-medium text-slate-500 uppercase">{title}</h3>
        <p className="text-3xl font-bold text-slate-800 mt-2">{value}</p>
    </div>
);

// --- Página Principal ---
export default function DetalhamentoCanaisPage() {
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunch, setSelectedLaunch] = useState<string>('');
    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = useCallback(async (launchId: string) => {
        if (!launchId) return;
        setIsLoading(true);
        try {
            // Usando a função otimizada 'get_channel_details'
            const { data, error } = await db.rpc('get_channel_details', { p_launch_id: launchId });
            if (error) throw error;
            setData(data);
        } catch (error: unknown) { // ✅ Tipagem Corrigida
            const err = error as Error;
            console.error("Erro ao carregar dados de detalhamento:", err.message);
            setData(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const fetchLaunches = async () => {
            try {
                const { data: launchesData, error } = await db.rpc('get_launches_for_dropdown');
                if (error) throw error;
                if (launchesData && launchesData.length > 0) {
                    setLaunches(launchesData);
                    setSelectedLaunch(launchesData[0].id);
                } else {
                    setIsLoading(false);
                }
            } catch (error: unknown) { // ✅ Tipagem Corrigida
                const err = error as Error;
                console.error("Erro ao buscar lançamentos:", err.message);
            }
        };
        fetchLaunches();
    }, []);

    useEffect(() => {
        if (selectedLaunch) {
            loadData(selectedLaunch);
        }
    }, [selectedLaunch, loadData]);

    const groupedDetails = useMemo(() => {
        if (!data?.details) return {};
        const groups: Record<string, Record<string, ChannelDetails[]>> = {};
        data.details.forEach(item => {
            const source = item.source || 'N/A';
            const medium = item.medium || 'N/A';
            if (!groups[source]) {
                groups[source] = {};
            }
            if (!groups[source][medium]) {
                groups[source][medium] = [];
            }
            groups[source][medium].push(item);
        });
        return groups;
    }, [data]);
    
    // ✅ LÓGICA DE RENDERIZAÇÃO DA TABELA SIMPLIFICADA para evitar o erro de parsing
    const tableRows = Object.entries(groupedDetails).flatMap(([source, mediums]) => {
        const sourceRow = { type: 'source', content: source, key: source };
        const mediumRows = Object.entries(mediums).flatMap(([medium, contents]) => {
            const mediumRow = { type: 'medium', content: medium, key: `${source}-${medium}` };
            const contentRows = contents.map((item, index) => ({
                type: 'content',
                ...item,
                key: `${source}-${medium}-${index}`
            }));
            return [mediumRow, ...contentRows];
        });
        return [sourceRow, ...mediumRows];
    });

    return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Dashboard de Detalhamento dos Canais</h1>
                <div className="bg-white p-2 rounded-lg shadow-md">
                    <select value={selectedLaunch} onChange={(e) => setSelectedLaunch(e.target.value)} className="px-3 py-2 border-none rounded-md focus:ring-0 bg-transparent">
                        {launches.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.status})</option>)}
                    </select>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center p-10"><FaSpinner className="animate-spin text-blue-600 text-4xl" /></div>
            ) : !data || !data.kpis ? (
                <div className="text-center py-10 bg-white rounded-lg shadow-md"><p>Nenhum dado encontrado para este lançamento.</p></div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                        <StatCard title="Total Inscrições" value={data.kpis.total_inscriptions} />
                        <StatCard title="Total Check-ins" value={data.kpis.total_checkins} />
                        <StatCard title="Leads Avulsos" value={data.kpis.avulso_leads} />
                        <StatCard title="Taxa de Conversão" value={`${(data.kpis.conversion_rate || 0).toFixed(1)}%`} />
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-lg font-semibold text-slate-700 mb-4">Detalhes por Hierarquia UTM</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Hierarquia UTM (Source > Medium > Content)</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Inscritos</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Check-ins</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Conversão</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white">
                                    {tableRows.length === 0 ? (
                                        <tr><td colSpan={4} className="text-center py-5 text-slate-500">Nenhum dado UTM encontrado.</td></tr>
                                    ) : (
                                        tableRows.map(row => {
                                            if (row.type === 'source') {
                                                return (
                                                    <tr key={row.key} className="bg-slate-200">
                                                        <td className="px-6 py-3 font-bold text-slate-800" colSpan={4}>{row.content}</td>
                                                    </tr>
                                                );
                                            }
                                            if (row.type === 'medium') {
                                                return (
                                                    <tr key={row.key} className="bg-slate-50 hover:bg-slate-100">
                                                        <td className="pl-12 pr-6 py-3 font-semibold text-slate-700" colSpan={4}>{row.content}</td>
                                                    </tr>
                                                );
                                            }
                                            if (row.type === 'content') {
                                                const conversionRate = (row.inscritos || 0) > 0 ? ((row.checkins || 0) / row.inscritos * 100) : 0;
                                                return (
                                                    <tr key={row.key} className="border-b border-slate-200">
                                                        <td className="pl-20 pr-6 py-4 text-sm text-slate-600 max-w-sm truncate" title={row.content}>{row.content}</td>
                                                        <td className="px-6 py-4 text-sm text-slate-500">{row.inscritos}</td>
                                                        <td className="px-6 py-4 text-sm text-slate-500">{row.checkins}</td>
                                                        <td className="px-6 py-4 text-sm text-slate-500">{conversionRate.toFixed(1)}%</td>
                                                    </tr>
                                                );
                                            }
                                            return null;
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}