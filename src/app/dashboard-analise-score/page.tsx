// COPIE ESTE CÓDIGO INTEIRO E COLE NO SEU ARQUIVO

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
    quente: ChartData[];
    quente_morno: ChartData[];
    morno: ChartData[];
    morno_frio: ChartData[];
    frio: ChartData[];
};
type LeadExportData = {
    email: string;
    nome: string;
    telefone: string;
    score: number;
    utm_source: string;
    utm_medium: string;
    utm_campaign: string;
    utm_content: string;
    utm_term: string;
};

// --- Mapa de Cores Consistentes para as Fontes de Tráfego ---
const SOURCE_COLOR_MAP: { [key: string]: string } = {
    'google': '#4285F4',
    'meta': '#E1306C',
    'facebook': '#1877F2',
    'instagram': '#E1306C',
    'organic': '#4CAF50',
    'tiktok': '#000000',
    'youtube': '#FF0000',
    'N/A': '#BDBDBD'
};
const FALLBACK_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];


// --- Componentes ---

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

const ScorePieChartCard = ({ title, data, launchId, launchName, categoryKey }: { 
    title: string; 
    data: ChartData[]; 
    launchId: string;
    launchName: string; 
    categoryKey: keyof DashboardData;
}) => {
    const supabase = createClientComponentClient();
    const [isExporting, setIsExporting] = useState(false);

    // ================== INÍCIO DA CORREÇÃO ==================
    // 1. Criamos uma função segura para renderizar a etiqueta do gráfico.
    const renderCustomizedLabel = ({ percent }: { percent?: number }) => {
        // Se a propriedade 'percent' não existir ou for 0, não exibe nada para evitar o erro.
        if (!percent) {
            return null;
        }
        return `${(percent * 100).toFixed(0)}%`;
    };
    // ================== FIM DA CORREÇÃO ==================

    const exportToCSV = async () => {
        if (!launchId) return;
        setIsExporting(true);
        toast.loading('A preparar a sua exportação...');

        try {
            const scoreRanges = {
                quente: { gte: 80, lt: Infinity },
                quente_morno: { gte: 65, lt: 80 },
                morno: { gte: 50, lt: 65 },
                morno_frio: { gte: 35, lt: 50 },
                frio: { gte: 0, lt: 35 },
            };
            const range = scoreRanges[categoryKey];

            let query = supabase
                .from('leads')
                .select('email, nome, telefone, score, utm_source, utm_medium, utm_campaign, utm_content, utm_term')
                .eq('launch_id', launchId)
                .gte('score', range.gte);
            
            if (range.lt !== Infinity) {
                query = query.lt('score', range.lt);
            }

            const { data: leads, error } = await query;

            if (error) throw error;
            if (!leads || leads.length === 0) {
                toast.dismiss();
                toast.error('Nenhum lead para exportar nesta categoria.');
                return;
            }

            const headers = ["email", "nome", "telefone", "score", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
            const csvRows = [
                headers.join(','),
                ...leads.map((row: LeadExportData) => headers.map(header => `"${(row[header as keyof LeadExportData] || '').toString().replace(/"/g, '""')}"`).join(','))
            ];
            
            const csvString = csvRows.join('\n');
            const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            const safeLaunchName = launchName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            link.setAttribute('download', `leads_${safeTitle}_${safeLaunchName}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.dismiss();
            toast.success('Exportação concluída!');

        } catch (err: any) {
            toast.dismiss();
            toast.error('Falha na exportação: ' + err.message);
            console.error(err);
        } finally {
            setIsExporting(false);
        }
    };

    const total = data.reduce((acc, entry) => acc + entry.value, 0);

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
            {data.length > 0 ? (
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <PieChart>
                            {/* 2. Usamos a função segura na propriedade 'label' */}
                            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" labelLine={false} label={renderCustomizedLabel}>
                                {/* Lógica de cor atualizada */}
                                {data.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={SOURCE_COLOR_MAP[(entry.name || 'N/A').toLowerCase()] || FALLBACK_COLORS[index % FALLBACK_COLORS.length]} 
                                    />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => `${value.toLocaleString('pt-BR')} leads`} />
                            <Legend iconType="circle" />
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
                    const sorted = [...launchesData].sort((a, b) => a.nome.localeCompare(b.nome));
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