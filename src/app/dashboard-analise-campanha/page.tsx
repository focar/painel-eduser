'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import toast from 'react-hot-toast';
import { FaSpinner, FaFilter, FaClock, FaChevronDown, FaChevronRight } from 'react-icons/fa';

// --- Tipagens de Dados ---
type Launch = { id: string; nome: string; status: string; };

// Tipagem para os detalhes dentro de cada hora
type HourDetail = {
    utm_value: string;
    inscricoes: number;
    checkins: number;
};

// Tipagem para a linha principal da tabela (cada hora)
type HourlyRow = {
    hora: string;
    total_inscricoes: number;
    total_checkins: number;
    details: HourDetail[];
};

// --- Página Principal ---
export default function AnaliseCampanhaPage() {
    const supabase = createClientComponentClient();
    
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunch, setSelectedLaunch] = useState<string>('');
    const [utmType, setUtmType] = useState('source');
    const [data, setData] = useState<HourlyRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

    // Função para expandir/recolher uma linha
    const toggleRow = (hora: string) => {
        setExpandedRows(prev => ({
            ...prev,
            [hora]: !prev[hora]
        }));
    };

    // Carrega os lançamentos
    useEffect(() => {
        const fetchLaunches = async () => {
            setIsLoading(true);
            const { data, error } = await supabase.from('lancamentos').select('id, nome, status').in('status', ['Em Andamento', 'Concluído']);
            if (data) {
                const statusOrder: { [key: string]: number } = { 'Em Andamento': 1, 'Concluído': 2 };
                const sorted = data.sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || a.nome.localeCompare(b.nome));
                setLaunches(sorted);
                if (sorted.length > 0) setSelectedLaunch(sorted[0].id);
            } else if (error) console.error(error);
            setIsLoading(false);
        };
        fetchLaunches();
    }, [supabase]);

    // Carrega os dados da tabela
    const loadData = useCallback(async () => {
        if (!selectedLaunch || !utmType) return;
        setIsLoading(true);
        setData([]);
        setExpandedRows({});
        try {
            const { data, error } = await supabase.rpc('get_hourly_utm_breakdown', {
                p_launch_id: selectedLaunch,
                p_utm_type: utmType
            });
            if (error) throw error;
            setData(data || []);
        } catch (err: any) {
            toast.error("Erro ao carregar os dados da análise.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [selectedLaunch, utmType, supabase]);

    // Recarrega os dados quando o lançamento ou o tipo de UTM mudam
    useEffect(() => {
        loadData();
    }, [loadData]);
    
    return (
        <div className="space-y-6 p-4 md:p-6 bg-slate-50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Análise de Campanha por Hora</h1>
                <div className="bg-white p-2 rounded-lg shadow-md w-full md:w-auto">
                    <select value={selectedLaunch} onChange={e => setSelectedLaunch(e.target.value)} className="w-full px-3 py-2 border-none rounded-md focus:ring-0 bg-transparent">
                        {launches.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.status})</option>)}
                    </select>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center gap-2 mb-4">
                    <FaFilter className="text-blue-600"/>
                    <h2 className="text-lg font-semibold text-slate-700">Filtro de Análise</h2>
                </div>
                <div className="w-full md:w-1/3">
                    <label htmlFor="utm-type" className="block text-sm font-medium text-slate-700 mb-1">Analisar por</label>
                    <select id="utm-type" value={utmType} onChange={e => setUtmType(e.target.value)} className="w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                        <option value="source">UTM Source</option>
                        <option value="medium">UTM Medium</option>
                        <option value="content">UTM Content</option>
                        <option value="campaign">UTM Campaign</option>
                        <option value="term">UTM Term</option>
                    </select>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center p-10"><FaSpinner className="animate-spin text-blue-600 text-4xl" /></div>
            ) : (
                <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
                    <div className="flex items-center gap-2 mb-4">
                        <FaClock className="text-blue-600"/>
                        <h2 className="text-lg font-semibold text-slate-700">Detalhes por Hora (do mais recente para o mais antigo)</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="w-8"></th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Hora</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Total Inscrições</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Total Check-ins</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {data.length === 0 && !isLoading && (
                                    <tr><td colSpan={4} className="text-center py-10 text-slate-500">Nenhum dado encontrado para esta seleção.</td></tr>
                                )}
                                {data.map((row) => (
                                    <React.Fragment key={row.hora}>
                                        <tr className="border-b border-slate-200 hover:bg-slate-50 cursor-pointer" onClick={() => toggleRow(row.hora)}>
                                            <td className="px-4 py-4 text-slate-500">
                                                {expandedRows[row.hora] ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
                                            </td>
                                            <td className="px-4 py-4 font-medium text-slate-800">{row.hora}</td>
                                            <td className="px-4 py-4 text-sm text-slate-600">{row.total_inscricoes.toLocaleString('pt-BR')}</td>
                                            <td className="px-4 py-4 text-sm text-slate-600">{row.total_checkins.toLocaleString('pt-BR')}</td>
                                        </tr>
                                        {expandedRows[row.hora] && (
                                            <tr className="bg-slate-100">
                                                <td colSpan={4} className="p-0">
                                                    <div className="p-4">
                                                        <table className="min-w-full">
                                                            <thead className="bg-slate-200">
                                                                <tr>
                                                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 uppercase tracking-wider pl-12">{utmType}</th>
                                                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Inscrições</th>
                                                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Check-ins</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-300">
                                                                {row.details.map(detail => (
                                                                    <tr key={detail.utm_value}>
                                                                        <td className="px-4 py-3 text-sm text-slate-700 pl-12 truncate" title={detail.utm_value}>{detail.utm_value || 'N/A'}</td>
                                                                        <td className="px-4 py-3 text-sm text-slate-600">{detail.inscricoes.toLocaleString('pt-BR')}</td>
                                                                        <td className="px-4 py-3 text-sm text-slate-600">{detail.checkins.toLocaleString('pt-BR')}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
