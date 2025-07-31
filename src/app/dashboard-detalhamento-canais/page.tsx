'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { FaSpinner, FaChevronDown, FaFileCsv } from 'react-icons/fa';
import toast from 'react-hot-toast';
import Papa from 'papaparse';

// --- Tipos de Dados ---
type Launch = { id: string; nome: string; status: string; };
type RawLead = {
    check_in_at: string | null;
    utm_source: string | null;
    utm_medium: string | null;
    utm_content: string | null;
};
type GroupedDetails = Record<string, Record<string, RawLead[]>>;
type TrafficType = 'paid' | 'organic' | 'untracked';

// --- Componentes ---
const KpiCard = ({ title, value, subTitle }: { title: string; value: string; subTitle?: string }) => (
    <div className="bg-slate-50 p-4 rounded-lg text-center flex flex-col justify-center h-full">
        <p className="text-3xl font-bold text-slate-800">{value}</p>
        <h3 className="text-sm font-medium text-slate-500 mt-1">{title}</h3>
        {subTitle && <p className="text-xs text-slate-400">{subTitle}</p>}
    </div>
);

// --- Página Principal ---
export default function DetalhamentoCanaisPage() {
    const supabase = createClient();
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunch, setSelectedLaunch] = useState<string>('');
    const [rawLeads, setRawLeads] = useState<RawLead[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
    const [trafficType, setTrafficType] = useState<TrafficType>('paid');

    const toggleItem = (key: string) => {
        setOpenItems(prev => ({ ...prev, [key]: !prev[key] }));
    };

    useEffect(() => {
        const fetchLaunches = async () => {
            const { data: launchesData } = await supabase.from('lancamentos').select('id, nome, status').in('status', ['Em Andamento', 'Concluído']);
            if (launchesData) {
                const statusOrder: { [key: string]: number } = { 'Em Andamento': 1, 'Concluído': 2 };
                const filtered = launchesData.sort((a,b) => statusOrder[a.status] - statusOrder[b.status] || a.nome.localeCompare(b.nome));
                setLaunches(filtered);
                if (filtered.length > 0) setSelectedLaunch(filtered[0].id);
            }
        };
        fetchLaunches();
    }, [supabase]);

    useEffect(() => {
        if (!selectedLaunch) return;
        const loadAllLeadsForLaunch = async () => {
            setIsLoading(true);
            let allLeads: RawLead[] = [];
            let page = 0;
            const pageSize = 1000;
            let keepFetching = true;
            while(keepFetching) {
                const { data, error } = await supabase
                    .from('leads')
                    .select('check_in_at, utm_source, utm_medium, utm_content')
                    .eq('launch_id', selectedLaunch)
                    .range(page * pageSize, (page + 1) * pageSize - 1);
                if (error) { toast.error("Erro ao carregar os leads."); keepFetching = false; break; }
                if (data) allLeads.push(...data);
                if (!data || data.length < pageSize) keepFetching = false;
                else page++;
            }
            setRawLeads(allLeads);
            setIsLoading(false);
        };
        loadAllLeadsForLaunch();
    }, [selectedLaunch, supabase]);

    const { paidLeads, organicLeads, untrackedLeads } = useMemo(() => {
        if (!Array.isArray(rawLeads)) return { paidLeads: [], organicLeads: [], untrackedLeads: [] };

        const untrackedSources = ['{:utm_source}', '{{site_source_name}}utm_', '{{site_source_name}}'];
        const organic: RawLead[] = [];
        const untracked: RawLead[] = [];
        const paid: RawLead[] = [];

        for (const lead of rawLeads) {
            const source = lead.utm_source?.toLowerCase() || '';
            if (source === 'organic') {
                organic.push(lead);
            } else if (untrackedSources.includes(source)) {
                untracked.push(lead);
            } else {
                paid.push(lead);
            }
        }
        return { paidLeads: paid, organicLeads: organic, untrackedLeads: untracked };
    }, [rawLeads]);

    const selectedLeads = useMemo(() => {
        switch(trafficType) {
            case 'paid': return paidLeads;
            case 'organic': return organicLeads;
            case 'untracked': return untrackedLeads;
            default: return [];
        }
    }, [trafficType, paidLeads, organicLeads, untrackedLeads]);
    
    const kpis = useMemo(() => {
        const totalGeralInscricoes = rawLeads.length;
        const totalGeralCheckins = rawLeads.filter(l => l.check_in_at).length;
        const leadsSelecao = selectedLeads.length;
        const checkinsSelecao = selectedLeads.filter(l => l.check_in_at).length;
        const taxaCheckinSelecao = leadsSelecao > 0 ? (checkinsSelecao / leadsSelecao) * 100 : 0;
        return { totalGeralInscricoes, totalGeralCheckins, leadsSelecao, checkinsSelecao, taxaCheckinSelecao };
    }, [rawLeads, selectedLeads]);

    const groupedDetails = useMemo(() => {
        if (!selectedLeads) return {};
        return selectedLeads.reduce((acc: GroupedDetails, item) => {
            const source = item.utm_source || 'Indefinido';
            const medium = item.utm_medium || 'Indefinido';
            if (!acc[source]) acc[source] = {};
            if (!acc[source][medium]) acc[source][medium] = [];
            acc[source][medium].push(item);
            return acc;
        }, {});
    }, [selectedLeads]);

    const handleExport = () => {
        if (!selectedLeads || selectedLeads.length === 0) {
            toast.error("Não há dados para exportar.");
            return;
        }
        const dataToExport = selectedLeads.map(lead => ({
            utm_source: lead.utm_source || 'N/A',
            utm_medium: lead.utm_medium || 'N/A',
            utm_content: lead.utm_content || 'N/A',
            check_in: lead.check_in_at ? 'Sim' : 'Não'
        }));
        const csv = Papa.unparse(dataToExport);
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        const launchName = launches.find(l => l.id === selectedLaunch)?.nome || 'export';
        link.setAttribute('href', url);
        link.setAttribute('download', `detalhes_${launchName}_${trafficType}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 p-4 md:p-6 bg-slate-50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Detalhamento dos Canais</h1>
                <div className="bg-white p-2 rounded-lg shadow-md w-full md:w-auto">
                    <select value={selectedLaunch} onChange={(e) => setSelectedLaunch(e.target.value)} className="w-full px-3 py-2 border-none rounded-md focus:ring-0 bg-transparent">
                        {launches.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.status})</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-xl shadow-lg flex flex-col gap-4">
                    <h2 className="text-lg font-semibold text-slate-700 mb-4 text-center lg:text-Center">Totais Gerais do Lançamento</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <KpiCard title="Total Inscrições" value={kpis.totalGeralInscricoes.toLocaleString('pt-BR')} />
                        <KpiCard title="Total Check-ins" value={kpis.totalGeralCheckins.toLocaleString('pt-BR')} />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-lg flex flex-col gap-4">
                     <h2 className="text-lg font-semibold text-slate-700 text-center lg:text-Center">
                        { trafficType === 'paid' && 'Performance do Tráfego Pago' }
                        { trafficType === 'organic' && 'Performance do Tráfego Orgânico' }
                        { trafficType === 'untracked' && 'Performance de Não Traqueados' }
                     </h2>
                    <div className="grid grid-cols-3 gap-4">
                        <KpiCard title="Inscrições na Seleção" value={kpis.leadsSelecao.toLocaleString('pt-BR')} />
                        <KpiCard title="Check-ins na Seleção" value={kpis.checkinsSelecao.toLocaleString('pt-BR')} />
                        <KpiCard title="Taxa de Check-in" value={`${kpis.taxaCheckinSelecao.toFixed(1)}%`} />
                    </div>
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2 rounded-lg p-1 bg-slate-200">
                    <button onClick={() => setTrafficType('paid')} disabled={isLoading} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${trafficType === 'paid' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-300'}`}>
                        Tráfego Pago
                    </button>
                    <button onClick={() => setTrafficType('organic')} disabled={isLoading} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${trafficType === 'organic' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-300'}`}>
                        Tráfego Orgânico
                    </button>
                    <button onClick={() => setTrafficType('untracked')} disabled={isLoading} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${trafficType === 'untracked' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-300'}`}>
                        Não Traqueadas
                    </button>
                </div>
                <button onClick={handleExport} disabled={isLoading || selectedLeads.length === 0} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 text-sm inline-flex items-center gap-2 disabled:opacity-50">
                    <FaFileCsv />
                    Exportar Seleção para CSV
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center p-10"><FaSpinner className="animate-spin text-blue-600 text-4xl" /></div>
            ) : (
                <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
                    <h2 className="text-lg font-semibold text-slate-700 mb-4">Detalhes por Hierarquia UTM</h2>
                    {Object.keys(groupedDetails).length === 0 ? (
                        <p className="text-center text-slate-500 py-8">Nenhum dado encontrado para a seleção de tráfego.</p>
                    ) : (
                        Object.entries(groupedDetails).map(([source, mediums]) => (
                            <div key={source} className="mb-4 border rounded-lg overflow-hidden">
                                <div className="bg-slate-100 px-4 py-3 font-bold text-slate-800">{source}</div>
                                {Object.entries(mediums).map(([medium, contents]) => {
                                    const mediumTotalInscritos = contents.length;
                                    const mediumTotalCheckins = contents.filter(c => c.check_in_at).length;
                                    const key = `${source}-${medium}`;
                                    const isExpanded = openItems[key] || false;
                                    return (
                                        <div key={key} className="border-t">
                                            <div onClick={() => toggleItem(key)} className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50">
                                                <div className="flex items-center gap-2 font-semibold text-slate-700">
                                                    <FaChevronDown className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} size={12} />
                                                    <span>{medium}</span>
                                                </div>
                                                <div className="text-sm text-slate-500">
                                                    <span>{mediumTotalInscritos} Inscritos</span> / <span>{mediumTotalCheckins} Check-ins</span>
                                                </div>
                                            </div>
                                            {isExpanded && (
                                                <div className="pl-10 pr-4 pb-3">
                                                    <table className="min-w-full text-sm">
                                                        <thead className="bg-slate-50">
                                                            <tr>
                                                                <th className="p-2 text-left font-medium text-slate-600">UTM Content</th>
                                                                <th className="p-2 text-center font-medium text-slate-600">Inscritos</th>
                                                                <th className="p-2 text-center font-medium text-slate-600">Check-ins</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {contents.reduce((acc, lead) => {
                                                                const content = lead.utm_content || 'Indefinido';
                                                                const found = acc.find(c => c.name === content);
                                                                if (found) {
                                                                    found.inscritos++;
                                                                    if (lead.check_in_at) found.checkins++;
                                                                } else {
                                                                    acc.push({ name: content, inscritos: 1, checkins: lead.check_in_at ? 1 : 0 });
                                                                }
                                                                return acc;
                                                            }, [] as {name: string, inscritos: number, checkins: number}[]).sort((a,b) => b.inscritos - a.inscritos).map((item, index) => (
                                                                <tr key={index}>
                                                                    <td className="p-2 text-slate-700 truncate" title={item.name}>{item.name}</td>
                                                                    <td className="p-2 text-center text-slate-600">{item.inscritos}</td>
                                                                    <td className="p-2 text-center text-slate-600">{item.checkins}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}