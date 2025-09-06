'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Launch } from "@/lib/types";
import { ChevronsUpDown, ArrowUp, ArrowDown, ArrowRight, Users } from 'lucide-react'; // Ícone Users adicionado

// --- Tipos de Dados ---
type AggregatedJourneyData = {
    perfil_checkin: string;
    buyer_count: number;
};

type DetailedJourneyData = {
    email: string;
    score: number;
    perfil_checkin: string;
    score_comprador: number;
    perfil_compra: string;
};

type ApiResponse = {
    aggregated_data: AggregatedJourneyData[] | null;
    detailed_data: DetailedJourneyData[] | null;
};

type SortConfig = {
    key: keyof DetailedJourneyData;
    direction: 'ascending' | 'descending';
};

// --- Configuração de Estilos e Ordem dos Perfis ---
const profileOrder = ['Quente', 'Quente-Morno', 'Morno', 'Morno-Frio', 'Frio'];
const profileStyles: { [key: string]: { color: string, textColor: string, range: string, border: string } } = {
    'Quente': { color: '#fee2e2', textColor: '#b91c1c', range: '(>=80)', border: 'border-red-500' },
    'Quente-Morno': { color: '#ffedd5', textColor: '#c2410c', range: '(65-79)', border: 'border-orange-500' },
    'Morno': { color: '#fef9c3', textColor: '#a16207', range: '(50-64)', border: 'border-amber-500' },
    'Morno-Frio': { color: '#cffafe', textColor: '#0891b2', range: '(35-49)', border: 'border-sky-500' },
    'Frio': { color: '#dbeafe', textColor: '#1d4ed8', range: '(1-34)', border: 'border-blue-500' },
};


// --- Componentes ---
const Spinner = () => (
    <div className="flex justify-center items-center h-60">
        <div className="animate-spin rounded-full h-20 w-20 border-t-2 border-b-2 border-emerald-500"></div>
    </div>
);

const ProfileKpiCard = ({
    profile,
    count,
    percentage,
    onClick,
    isActive
}: {
    profile: string;
    count: number;
    percentage: string;
    onClick: () => void;
    isActive: boolean;
}) => {
    const style = profileStyles[profile] || { color: '#e5e7eb', textColor: '#374151', range: '', border: 'border-gray-300' };
    const borderClass = profile === 'Quente' ? 'border-2 border-red-200' : 'border border-gray-200';
    
    return (
        <button
            onClick={onClick}
            className={`p-3 rounded-lg shadow-sm text-center transition-all duration-200 w-full ${borderClass}
                ${isActive ? `ring-2 ring-offset-2 ${style.border}` : 'hover:shadow-lg hover:-translate-y-1'}`
            }
            style={{ backgroundColor: style.color }}
        >
            <p className="text-xs sm:text-sm font-semibold" style={{ color: style.textColor }}>{profile} {style.range}</p>
            <p className="text-3xl sm:text-4xl font-bold my-1" style={{ color: style.textColor }}>{count}</p>
            <p className="text-xs" style={{ color: style.textColor }}>({percentage}%)</p>
        </button>
    );
};


export default function JornadaCompradorPage() {
    const supabase = createClient();
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunch, setSelectedLaunch] = useState<string>('');
    const [journeyData, setJourneyData] = useState<ApiResponse>({ aggregated_data: [], detailed_data: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'score_comprador', direction: 'descending' });
    const [activeProfileFilter, setActiveProfileFilter] = useState<string>('all');

    useEffect(() => {
        const fetchLaunches = async () => {
            const { data: launchesData, error } = await supabase.rpc('get_lancamentos_permitidos');
            if (error) {
                console.error("Erro ao buscar lançamentos:", error);
                setLaunches([]);
                setLoading(false);
            } else if (launchesData) {
                const sorted = [...launchesData].sort((a: Launch, b: Launch) => {
                    if (a.status === 'Em Andamento' && b.status !== 'Em Andamento') return -1;
                    if (a.status !== 'Em Andamento' && b.status === 'Em Andamento') return 1;
                    return b.nome.localeCompare(a.nome);
                });
                setLaunches(sorted as Launch[]);
                if (sorted.length > 0) {
                    const inProgress = sorted.find(l => l.status === 'Em Andamento');
                    setSelectedLaunch(inProgress ? inProgress.id : sorted[0].id);
                } else {
                    setLoading(false);
                }
            }
        };
        fetchLaunches();
    }, [supabase]);

    const fetchData = useCallback(async (launchId: string) => {
        if (!launchId) return;
        setLoading(true);
        setError(null);
        setActiveProfileFilter('all');
        const rpcLaunchId = launchId === 'all' ? null : launchId;

        try {
            const { data, error } = await supabase.rpc('get_buyer_profile_journey', { p_launch_id: rpcLaunchId });
            if (error) throw error;
            setJourneyData({
                aggregated_data: data.aggregated_data || [],
                detailed_data: data.detailed_data || []
            });
        } catch (err: any) {
            console.error(`Erro ao carregar jornada:`, err);
            setError(`Não foi possível carregar os dados. (Detalhes: ${err.message})`);
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        if (selectedLaunch) {
            fetchData(selectedLaunch);
        }
    }, [selectedLaunch, fetchData]);

    const filteredData = useMemo(() => {
        if (!journeyData.detailed_data) return [];
        if (activeProfileFilter === 'all') {
            return journeyData.detailed_data;
        }
        return journeyData.detailed_data.filter(lead => lead.perfil_checkin === activeProfileFilter);
    }, [journeyData.detailed_data, activeProfileFilter]);

    const sortedDetailedData = useMemo(() => {
        let sortableItems = [...filteredData];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const valA = a[sortConfig.key];
                const valB = b[sortConfig.key];
                
                if (sortConfig.key === 'perfil_checkin' || sortConfig.key === 'perfil_compra') {
                    const indexA = profileOrder.indexOf(valA as string);
                    const indexB = profileOrder.indexOf(valB as string);
                    return sortConfig.direction === 'ascending' ? indexA - indexB : indexB - indexA;
                }

                if (typeof valA === 'number' && typeof valB === 'number') {
                    return sortConfig.direction === 'ascending' ? valA - valB : valB - valA;
                }
                if (typeof valA === 'string' && typeof valB === 'string') {
                    return sortConfig.direction === 'ascending' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                }
                return 0;
            });
        }
        return sortableItems;
    }, [filteredData, sortConfig]);

    const requestSort = (key: SortConfig['key']) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: SortConfig['key']) => {
        if (!sortConfig || sortConfig.key !== key) {
            return <ChevronsUpDown size={14} className="ml-2 text-slate-400" />;
        }
        return sortConfig.direction === 'ascending' ? <ArrowUp size={14} className="ml-2" /> : <ArrowDown size={14} className="ml-2" />;
    };

    const { kpiData, totalBuyers } = useMemo(() => {
        const dataMap = new Map((journeyData.aggregated_data || []).map(item => [item.perfil_checkin, item.buyer_count]));
        const total = (journeyData.aggregated_data || []).reduce((sum, item) => sum + item.buyer_count, 0);
        
        const kpis = profileOrder.map(profile => {
            const count = dataMap.get(profile) || 0;
            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
            return { profile, count, percentage };
        });

        return { kpiData: kpis, totalBuyers: total };
    }, [journeyData.aggregated_data]);


    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-slate-100 min-h-screen">
            <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Jornada do Comprador</h1>
                <div className="w-full sm:w-72">
                    <select
                        id="launch-select"
                        value={selectedLaunch}
                        onChange={(e) => setSelectedLaunch(e.target.value)}
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-3 text-base"
                        disabled={loading}
                    >
                        <option value="all">Visão Geral (Todos)</option>
                        {launches.map((launch) => (<option key={launch.id} value={launch.id}>{`${launch.nome} - ${launch.status}`}</option>))}
                    </select>
                </div>
            </header>

            {loading && <Spinner />}
            {!loading && error && <div className="text-center py-10 px-4 bg-red-100 text-red-700 rounded-lg"><p>{error}</p></div>}
            
            {!loading && !error && (
                <div className="space-y-8">
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Origem dos Compradores (Perfil de Check-in)</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {kpiData.map(({ profile, count, percentage }) => (
                                <ProfileKpiCard
                                    key={profile}
                                    profile={profile}
                                    count={count}
                                    percentage={percentage}
                                    isActive={activeProfileFilter === profile}
                                    onClick={() => setActiveProfileFilter(profile)}
                                />
                            ))}
                            {/* BOTÃO DE LIMPAR FILTRO SUBSTITUÍDO POR KPI DE TOTAL GERAL */}
                            <button
                                onClick={() => setActiveProfileFilter('all')}
                                disabled={activeProfileFilter === 'all'}
                                className={`p-3 rounded-lg shadow-sm text-center transition-all duration-200 w-full border border-gray-200 bg-slate-100
                                    ${activeProfileFilter === 'all' ? 'ring-2 ring-offset-2 ring-blue-500 scale-105' : 'hover:shadow-lg hover:-translate-y-1'}`
                                }
                            >
                                <p className="text-xs sm:text-sm font-semibold text-slate-700">Total Geral</p>
                                <p className="text-3xl sm:text-4xl font-bold my-1 text-slate-800">{totalBuyers}</p>
                                <p className="text-xs text-slate-600">Compradores</p>
                            </button>
                        </div>
                    </div>
                    
                    <main className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">
                            Jornada Individual {activeProfileFilter !== 'all' && `(Filtrado por: ${activeProfileFilter})`}
                        </h2>
                        {!sortedDetailedData || sortedDetailedData.length === 0 ? (
                            <div className="text-center py-10"><p className="text-gray-600">Nenhum comprador encontrado para esta seleção.</p></div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                                        <tr>
                                            <th className="px-4 py-3"><button onClick={() => requestSort('email')} className="flex items-center">Email {getSortIcon('email')}</button></th>
                                            <th className="px-4 py-3 text-center"><button onClick={() => requestSort('perfil_checkin')} className="flex items-center mx-auto">Perfil (Check-in) {getSortIcon('perfil_checkin')}</button></th>
                                            <th className="px-4 py-3 text-center">Jornada</th>
                                            <th className="px-4 py-3 text-center"><button onClick={() => requestSort('perfil_compra')} className="flex items-center mx-auto">Perfil (Compra) {getSortIcon('perfil_compra')}</button></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedDetailedData.map((lead) => (
                                            <tr key={lead.email} className="border-b border-slate-200 hover:bg-slate-50">
                                                <td className="px-4 py-3 font-medium text-slate-800">{lead.email}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="font-semibold">{lead.perfil_checkin}</span>
                                                    <span className="text-xs text-slate-500 ml-2">({lead.score})</span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <ArrowRight className="mx-auto text-sky-500"/>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="font-bold text-emerald-700">{lead.perfil_compra}</span>
                                                    <span className="text-xs text-slate-500 ml-2">({lead.score_comprador})</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </main>
                </div>
            )}
        </div>
    );
}

