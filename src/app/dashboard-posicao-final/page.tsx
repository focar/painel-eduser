'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import toast from 'react-hot-toast';
// CORREÇÃO: Adicionado o ícone FaUserCheck que também estava faltando.
import { FaSpinner, FaUsers, FaCheckCircle, FaShoppingCart, FaGlobe, FaBullseye, FaPercentage, FaUserCheck } from 'react-icons/fa';

// --- Tipagens de Dados ---
type Launch = { id: string; nome: string; status: string; };

type RawLead = {
    check_in_at: string | null;
    is_buyer: boolean | null;
    utm_source: string | null;
    utm_medium: string | null;
    utm_content: string | null;
};

type TableRow = {
    canal: string;
    qtd_inscricoes: number;
    qtd_checkins: number;
    qtd_compradores: number;
};

// --- Componentes ---
const KpiCard = ({ title, value, icon: Icon, subTitle, highlight = false }: { title: string; value: string | number; icon: React.ElementType; subTitle?: string; highlight?: boolean; }) => (
    <div className={`flex items-center p-4 rounded-lg shadow-md border ${highlight ? "bg-green-50 border-green-200" : "bg-white"}`}>
        <div className={`text-3xl mr-4 ${highlight ? "text-green-600" : "text-blue-500"}`}>{<Icon />}</div>
        <div>
            <p className={`text-sm font-medium ${highlight ? "text-green-700" : "text-slate-500"}`}>{title}</p>
            <p className={`text-2xl font-bold mt-1 ${highlight ? "text-green-800" : "text-slate-800"}`}>{value}</p>
            {subTitle && <p className="text-xs text-slate-400">{subTitle}</p>}
        </div>
    </div>
);

// --- Página Principal ---
export default function PosicaoFinalPage() {
    const supabase = createClient();
    
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunch, setSelectedLaunch] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingData, setIsLoadingData] = useState(true);

    const [rawLeads, setRawLeads] = useState<RawLead[]>([]);
    const [selectedSource, setSelectedSource] = useState('all');
    const [selectedMedium, setSelectedMedium] = useState('all');
    const [selectedContent, setSelectedContent] = useState('all');

    useEffect(() => {
        const fetchLaunches = async () => {
            setIsLoading(true);
            const { data, error } = await supabase.from('lancamentos').select('id, nome, status').in('status', ['Em Andamento', 'Concluído']);
            if (data) {
                const sorted = [...data].sort((a, b) => (a.status === 'Em Andamento' ? -1 : 1) - (b.status === 'Em Andamento' ? -1 : 1) || a.nome.localeCompare(b.nome));
                setLaunches(sorted);
                if (sorted.length > 0) setSelectedLaunch(sorted[0].id);
            } else { toast.error("Erro ao buscar lançamentos."); }
            setIsLoading(false);
        };
        fetchLaunches();
    }, [supabase]);

    useEffect(() => {
        const loadRawDataWithPagination = async () => {
            if (!selectedLaunch) return;
            setIsLoadingData(true);
            setRawLeads([]);
            let allLeads: RawLead[] = [];
            let page = 0;
            const pageSize = 1000;
            let keepFetching = true;

            while (keepFetching) {
                const { data, error } = await supabase
                    .from('leads')
                    .select('check_in_at, is_buyer, utm_source, utm_medium, utm_content')
                    .eq('launch_id', selectedLaunch)
                    .range(page * pageSize, (page + 1) * pageSize - 1);

                if (error) { toast.error("Erro ao carregar dados dos leads."); keepFetching = false; break; }
                if (data) allLeads = [...allLeads, ...data];
                if (!data || data.length < pageSize) keepFetching = false; else page++;
            }
            setRawLeads(allLeads);
            setIsLoadingData(false);
        };
        loadRawDataWithPagination();
    }, [selectedLaunch, supabase]);

    const filterOptions = useMemo(() => {
        let leads = rawLeads;
        const sources = new Set<string>();
        const mediums = new Set<string>();
        const contents = new Set<string>();
        rawLeads.forEach(lead => { if(lead.utm_source) sources.add(lead.utm_source) });
        if (selectedSource !== 'all') leads = leads.filter(l => l.utm_source === selectedSource);
        leads.forEach(lead => { if(lead.utm_medium) mediums.add(lead.utm_medium) });
        if (selectedMedium !== 'all') leads = leads.filter(l => l.utm_medium === selectedMedium);
        leads.forEach(lead => { if(lead.utm_content) contents.add(lead.utm_content) });
        return {
            sources: Array.from(sources).sort(),
            mediums: Array.from(mediums).sort(),
            contents: Array.from(contents).sort(),
        };
    }, [rawLeads, selectedSource, selectedMedium]);

    const filteredLeads = useMemo(() => {
        return rawLeads.filter(lead =>
            (selectedSource === 'all' || lead.utm_source === selectedSource) &&
            (selectedMedium === 'all' || lead.utm_medium === selectedMedium) &&
            (selectedContent === 'all' || lead.utm_content === selectedContent)
        );
    }, [rawLeads, selectedSource, selectedMedium, selectedContent]);

    const grandTotalKpis = useMemo(() => ({
        inscricoes: rawLeads.length,
        checkins: rawLeads.filter(l => l.check_in_at).length,
    }), [rawLeads]);

    const filteredKpis = useMemo(() => {
        const inscricoes = filteredLeads.length;
        const checkins = filteredLeads.filter(l => l.check_in_at).length;
        const compradores = filteredLeads.filter(l => l.is_buyer).length;
        const conversao = inscricoes > 0 ? (compradores / inscricoes * 100).toFixed(2) + '%' : '0.00%';
        return { inscricoes, checkins, compradores, conversao };
    }, [filteredLeads]);

    const tableData = useMemo((): TableRow[] => {
        let groupingKey: keyof RawLead = 'utm_source';
        if (selectedSource !== 'all') groupingKey = 'utm_medium';
        if (selectedMedium !== 'all') groupingKey = 'utm_content';

        const grouped = filteredLeads.reduce((acc, lead) => {
            const key = lead[groupingKey] || 'N/A';
            if (!acc[key]) acc[key] = { qtd_inscricoes: 0, qtd_checkins: 0, qtd_compradores: 0 };
            acc[key].qtd_inscricoes++;
            if (lead.check_in_at) acc[key].qtd_checkins++;
            if (lead.is_buyer) acc[key].qtd_compradores++;
            return acc;
        }, {} as Record<string, Omit<TableRow, 'canal'>>);
        
        return Object.entries(grouped)
            .map(([canal, data]) => ({ canal, ...data }))
            .sort((a, b) => b.qtd_compradores - a.qtd_compradores);
    }, [filteredLeads, selectedSource, selectedMedium]);

    return (
        <div className="space-y-6 p-4 md:p-6 bg-slate-50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Demonstrativo da Posição Final</h1>
                <div className="bg-white p-2 rounded-lg shadow-md w-full md:w-auto">
                    <select value={selectedLaunch} onChange={e => setSelectedLaunch(e.target.value)} className="w-full px-3 py-2 border-none rounded-md focus:ring-0 bg-transparent" disabled={isLoading}>
                        {launches.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.status})</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
                <KpiCard title="Geral Inscrições" value={grandTotalKpis.inscricoes.toLocaleString('pt-BR')} icon={FaGlobe} subTitle="Total do Lançamento" />
                <KpiCard title="Geral Check-ins" value={grandTotalKpis.checkins.toLocaleString('pt-BR')} icon={FaUserCheck} subTitle="Total do Lançamento" />
                <KpiCard title="Inscrições (Filtro)" value={filteredKpis.inscricoes.toLocaleString('pt-BR')} icon={FaUsers} subTitle="Resultado do filtro" />
                <KpiCard title="Check-ins (Filtro)" value={filteredKpis.checkins.toLocaleString('pt-BR')} icon={FaCheckCircle} subTitle="Resultado do filtro" />
                <KpiCard title="Compradores (Filtro)" value={filteredKpis.compradores.toLocaleString('pt-BR')} icon={FaShoppingCart} subTitle="Resultado do filtro" />
                <KpiCard title="Conversão (Filtro)" value={filteredKpis.conversao} icon={FaPercentage} highlight subTitle="Vendas / Inscrições" />
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-lg font-semibold text-slate-700">Filtros de Performance</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">UTM Source</label>
                        <select value={selectedSource} onChange={e => { setSelectedSource(e.target.value); setSelectedMedium('all'); setSelectedContent('all'); }} className="w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md">
                            <option value="all">Todos</option>
                            {filterOptions.sources.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">UTM Medium</label>
                        <select value={selectedMedium} onChange={e => { setSelectedMedium(e.target.value); setSelectedContent('all'); }} className="w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md">
                            <option value="all">Todos</option>
                            {filterOptions.mediums.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">UTM Content</label>
                        <select value={selectedContent} onChange={e => setSelectedContent(e.target.value)} className="w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md">
                            <option value="all">Todos</option>
                            {filterOptions.contents.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {isLoadingData ? (<div className="flex justify-center items-center p-10"><FaSpinner className="animate-spin text-blue-600 text-4xl" /></div>) : (
                <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
                    <h2 className="text-lg font-semibold text-slate-700 mb-4">Performance por Canal</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Canal</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Inscrições</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Check-ins</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Compradores</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Taxa de Conversão</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {tableData.map((row, index) => {
                                    const convRate = (row.qtd_inscricoes || 0) > 0 ? ((row.qtd_compradores || 0) / row.qtd_inscricoes * 100).toFixed(2) : '0.00';
                                    return (
                                        <tr key={index}>
                                            <td className="px-4 py-4 font-medium text-slate-800 max-w-sm truncate" title={row.canal}>{row.canal || 'N/A'}</td>
                                            <td className="px-4 py-4 text-sm text-slate-600">{row.qtd_inscricoes.toLocaleString('pt-BR')}</td>
                                            <td className="px-4 py-4 text-sm text-slate-600">{row.qtd_checkins.toLocaleString('pt-BR')}</td>
                                            <td className="px-4 py-4 text-sm text-slate-600 font-bold">{row.qtd_compradores.toLocaleString('pt-BR')}</td>
                                            <td className="px-4 py-4 text-sm font-semibold text-green-600">{convRate}%</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}