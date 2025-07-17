'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { FaSpinner, FaFileCsv } from 'react-icons/fa';

// --- Tipagens de Dados ---
type Launch = { id: string; nome: string; status: string; };

type TableData = {
    canal: string;
    inscricoes: number;
    check_ins: number;
};

type DashboardData = {
    tableData: TableData[];
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

const ChannelTable = ({ data, launchName, utmName }: { data: TableData[], launchName: string, utmName: string }) => {
    
    const exportToCSV = () => {
        const headers = ["Canal", "Inscrições", "Check-ins", "Taxa de Check-in"];
        
        const csvRows = [
            headers.join(','),
            ...data.map(row => {
                const conversionRate = row.inscricoes > 0 ? (row.check_ins / row.inscricoes * 100).toFixed(1) + '%' : '0.0%';
                return [
                    `"${row.canal.replace(/"/g, '""')}"`,
                    row.inscricoes,
                    row.check_ins,
                    `"${conversionRate}"`
                ].join(',');
            })
        ];

        const csvString = csvRows.join('\n');
        const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        const safeLaunchName = launchName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.setAttribute('download', `acompanhamento_${utmName}_${safeLaunchName}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-700">Resultados Agrupados</h2>
                <button onClick={exportToCSV} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 transition-colors">
                    <FaFileCsv />
                    Exportar
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead className="bg-slate-50 hidden md:table-header-group">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Canal</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Inscrições</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Check-ins</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Taxa de Check-in</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {data.map((row, index) => {
                             const conversionRate = row.inscricoes > 0 ? (row.check_ins / row.inscricoes * 100) : 0;
                             return (
                                <tr key={row.canal + index} className="block md:table-row border-b">
                                    <td className="p-3 md:px-4 md:py-4 font-medium text-slate-900 md:max-w-xs truncate" title={row.canal}>
                                        <span className="md:hidden text-xs font-bold uppercase text-slate-500">Canal: </span>{row.canal}
                                    </td>
                                    <td className="p-3 md:px-4 md:py-4 md:text-center text-sm text-slate-600"><span className="md:hidden font-bold">Inscrições: </span>{row.inscricoes.toLocaleString('pt-BR')}</td>
                                    <td className="p-3 md:px-4 md:py-4 md:text-center text-sm text-slate-600"><span className="md:hidden font-bold">Check-ins: </span>{row.check_ins.toLocaleString('pt-BR')}</td>
                                    <td className="p-3 md:px-4 md:py-4 md:text-center text-sm font-semibold text-blue-600"><span className="md:hidden font-bold">Taxa de Check-in: </span>{conversionRate.toFixed(1)}%</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- Componente Principal da Página ---
export default function AcompanhamentoCanaisPage() {
    const supabase = createClientComponentClient();
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunch, setSelectedLaunch] = useState<string>('');
    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [noLaunchesFound, setNoLaunchesFound] = useState(false);
    const [groupByUtm, setGroupByUtm] = useState('utm_source');

    const utmOptions = [
        { value: 'utm_source', label: 'UTM Source' },
        { value: 'utm_medium', label: 'UTM Medium' },
        { value: 'utm_campaign', label: 'UTM Campaign' },
        { value: 'utm_content', label: 'UTM Content' },
        { value: 'utm_term', label: 'UTM Term' },
    ];

    const loadDashboardData = useCallback(async (launchId: string) => {
        if (!launchId) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_channel_tracking_dashboard', {
                p_launch_id: launchId,
                p_group_by_utm: groupByUtm
            });
            if (error) throw error;
            setData(data);
        } catch (error) {
            console.error("Erro ao buscar dados do dashboard:", error as Error);
            setData(null);
        } finally {
            setIsLoading(false);
        }
    }, [groupByUtm, supabase]);

    useEffect(() => {
        const fetchLaunches = async () => {
            try {
                const { data: launchesData, error } = await supabase.from('lancamentos').select('id, nome, status').in('status', ['Em Andamento', 'Concluído']);
                if (error) throw error;
                if (launchesData && launchesData.length > 0) {
                    const statusOrder: { [key: string]: number } = { 'Em Andamento': 1, 'Concluído': 2 };
                    const sorted = [...launchesData].sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || a.nome.localeCompare(b.nome));
                    setLaunches(sorted);
                    if (!selectedLaunch) {
                        setSelectedLaunch(sorted[0].id);
                    }
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
        if (selectedLaunch) {
            loadDashboardData(selectedLaunch);
        }
    }, [selectedLaunch, loadDashboardData]);

    const renderContent = () => {
        if (isLoading) {
            return <div className="text-center py-10"><FaSpinner className="animate-spin text-blue-600 text-3xl mx-auto" /></div>;
        }
        if (!data || !data.tableData || data.tableData.length === 0) {
            return <div className="text-center py-10 bg-white rounded-lg shadow-md"><p className="text-slate-500">Nenhum dado encontrado para esta seleção.</p></div>;
        }
        
        return (
             <ChannelTable 
                data={data.tableData}
                launchName={launches.find(l => l.id === selectedLaunch)?.nome || 'export'}
                utmName={groupByUtm}
            />
        );
    };

    if (noLaunchesFound) {
        return <div className="text-center py-10 bg-white rounded-lg shadow-md"><p className="text-slate-500">Nenhum lançamento válido foi encontrado.</p></div>;
    }

    return (
        <div className="space-y-6 p-4 md:p-6 bg-slate-50 min-h-screen">
            <PageHeader title="Acompanhamento de Canais" launches={launches} selectedLaunch={selectedLaunch} onLaunchChange={setSelectedLaunch} isLoading={isLoading} />
            <div className="bg-white p-4 rounded-lg shadow-sm">
                <label htmlFor="group-by-select" className="block text-sm font-medium text-slate-700">Agrupar Por:</label>
                <select
                    id="group-by-select"
                    value={groupByUtm}
                    onChange={e => setGroupByUtm(e.target.value)}
                    disabled={isLoading}
                    className="mt-1 block w-full sm:w-1/3 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                    {utmOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                </select>
            </div>
            {renderContent()}
        </div>
    );
}
