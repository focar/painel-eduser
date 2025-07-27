'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { FaSpinner, FaFileCsv } from 'react-icons/fa';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

// --- Tipos de Dados ---
type Launch = { id: string; nome: string; status: string; };
type ChartData = { name: string; value: number; };
type DashboardData = {
    quente: ChartData[]; quente_morno: ChartData[]; morno: ChartData[];
    morno_frio: ChartData[]; frio: ChartData[];
};
type LeadExportData = {
    email: string; nome: string; telefone: string; score: number;
    utm_source: string; utm_medium: string; utm_campaign: string;
    utm_content: string; utm_term: string;
};

// --- Lógica de Cores Consistente ---
const hashCode = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return hash;
};

const getColorForString = (name: string): string => {
    const lowerCaseName = (name || 'N/A').toLowerCase();
    const predefinedColors: { [key: string]: string } = {
        'google': '#4285F4', 'meta': '#E1306C', 'facebook': '#1877F2',
        'instagram': '#D82D7E', 'organic': '#4CAF50', 'indefinido': '#BDBDBD',
        'n/a': '#BDBDBD', 'outros': '#757575'
    };
    if (predefinedColors[lowerCaseName]) return predefinedColors[lowerCaseName];
    const hash = hashCode(lowerCaseName);
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 55%)`;
};


// --- Componentes ---
const PageHeader = ({ title, launches, selectedLaunch, onLaunchChange, isLoading }: { 
    title: string; launches: Launch[]; selectedLaunch: string; 
    onLaunchChange: (id: string) => void; isLoading: boolean; 
}) => (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">{title}</h1>
        <div className="bg-white p-2 rounded-lg shadow-md w-full md:w-auto">
            <select value={selectedLaunch} onChange={(e) => onLaunchChange(e.target.value)} disabled={isLoading} className="w-full px-3 py-2 border-none rounded-md focus:ring-0 bg-transparent text-slate-700 font-medium">
                {launches.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.status})</option>)}
            </select>
        </div>
    </div>
);

const ScorePieChartCard = ({ title, data, launchId, launchName, categoryKey }: { 
    title: string; data: ChartData[]; launchId: string;
    launchName: string; categoryKey: keyof DashboardData;
}) => {
    const supabase = createClientComponentClient();
    const [isExporting, setIsExporting] = useState(false);

    // ================== LÓGICA "TOP N + OUTROS" ==================
    // ================== AQUI ESTÁ O AJUSTE ==================
    const TOP_N_ITEMS = 6; // Mostra os 5 principais + 1 fatia de "Outros"
    // ========================================================
    
    let processedData = data;
    // Garante que 'data' é um array antes de processar
    if (Array.isArray(data) && data.length > TOP_N_ITEMS) {
        const sortedData = [...data].sort((a, b) => b.value - a.value);
        
        const topItems = sortedData.slice(0, TOP_N_ITEMS - 1);
        const otherItems = sortedData.slice(TOP_N_ITEMS - 1);
        
        const otherSum = otherItems.reduce((acc, item) => acc + item.value, 0);

        if (otherSum > 0) {
            processedData = [
                ...topItems,
                { name: 'Outros', value: otherSum }
            ];
        } else {
            processedData = topItems;
        }
    }
    // ==============================================================

    const exportToCSV = async () => { /* ... seu código de exportação ... */ };
    const total = Array.isArray(data) ? data.reduce((acc, entry) => acc + entry.value, 0) : 0;

    return (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h2 className="text-lg font-semibold text-slate-700">{title}</h2>
                    <p className="text-sm text-slate-500">Total: {total.toLocaleString('pt-BR')} leads</p>
                </div>
                <button onClick={exportToCSV} disabled={isExporting} className="flex items-center gap-2 px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-semibold rounded-md hover:bg-slate-300 transition-colors disabled:opacity-50">
                    {isExporting ? <FaSpinner className="animate-spin" /> : <FaFileCsv />}
                    Exportar
                </button>
            </div>
            {processedData && processedData.length > 0 ? (
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie data={processedData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8">
                                {processedData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={getColorForString(entry.name)} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => `${value.toLocaleString('pt-BR')} leads`} />
                            <Legend
                                iconType="circle"
                                formatter={(value) => {
                                    const MAX_LENGTH = 25;
                                    if (value.length > MAX_LENGTH) {
                                        return `${value.substring(0, MAX_LENGTH)}...`;
                                    }
                                    return value;
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="flex items-center justify-center h-72 text-slate-500">Nenhum dado para esta categoria.</div>
            )}
        </div>
    );
};

// --- Página Principal ---
export default function AnaliseScorePage() {
    const supabase = createClientComponentClient();
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunch, setSelectedLaunch] = useState<string>('');
    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [noLaunchesFound, setNoLaunchesFound] = useState(false);

    const scoreCategories = [
        { key: 'quente', title: 'Quente (>80)' },
        { key: 'quente_morno', title: 'Quente-Morno (65-79)' },
        { key: 'morno', title: 'Morno (50-64)' },
        { key: 'morno_frio', title: 'Morno-Frio (35-49)' },
        { key: 'frio', title: 'Frio (<35)' },
    ] as const;

    const loadDashboardData = useCallback(async (launchId: string) => {
        if (!launchId) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_score_composition_dashboard', { p_launch_id: launchId });
            if (error) throw error;
            setData(data);
        } catch (error) {
            console.error("Erro ao buscar dados do dashboard:", error as Error);
            setData(null);
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        const fetchLaunches = async () => {
            try {
                const { data: launchesData, error } = await supabase.from('lancamentos').select('id, nome, status').in('status', ['Em Andamento', 'Concluído']);
                if (error) throw error;
                if (launchesData && launchesData.length > 0) {
                    const sorted = [...launchesData].sort((a, b) => {
                        if (a.status !== b.status) {
                            return a.status === 'Em Andamento' ? -1 : 1;
                        }
                        return a.nome.localeCompare(b.nome);
                    });
                    setLaunches(sorted);
                    if (!selectedLaunch) setSelectedLaunch(sorted[0].id);
                } else {
                    setNoLaunchesFound(true);
                    setIsLoading(false);
                }
            } catch (error) {
                console.error("Erro ao buscar lançamentos:", error as Error);
                setNoLaunchesFound(true);
            }
        };
        fetchLaunches();
    }, [supabase, selectedLaunch]);

    useEffect(() => {
        if (selectedLaunch) loadDashboardData(selectedLaunch);
    }, [selectedLaunch, loadDashboardData]);

    const renderContent = () => {
        if (isLoading) return <div className="text-center py-10"><FaSpinner className="animate-spin text-blue-600 text-3xl mx-auto" /></div>;
        if (!data) return <div className="text-center py-10 bg-white rounded-lg shadow-md"><p className="text-slate-500">Nenhum dado encontrado para este lançamento.</p></div>;
        
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {scoreCategories.map(category => (
                    <ScorePieChartCard
                        key={category.key}
                        title={category.title}
                        data={data[category.key]}
                        launchId={selectedLaunch}
                        launchName={launches.find(l => l.id === selectedLaunch)?.nome || 'export'}
                        categoryKey={category.key}
                    />
                ))}
            </div>
        );
    };

    if (noLaunchesFound) return <div className="text-center py-10 bg-white rounded-lg shadow-md"><p className="text-slate-500">Nenhum lançamento válido foi encontrado.</p></div>;

    return (
        <div className="space-y-6 p-4 md:p-6 bg-slate-50 min-h-screen">
            <PageHeader title="Análise de Score por Canal" launches={launches} selectedLaunch={selectedLaunch} onLaunchChange={setSelectedLaunch} isLoading={isLoading} />
            {renderContent()}
        </div>
    );
}