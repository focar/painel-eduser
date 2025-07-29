'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import toast from 'react-hot-toast';
import { FaSpinner, FaFilter, FaClock, FaChevronDown, FaChevronRight, FaUsers, FaUserCheck, FaGlobe, FaBullseye } from 'react-icons/fa';

// --- Tipagens de Dados ---
type Launch = { id: string; nome: string; status: string; };

type RawLead = {
    created_at: string | null;
    check_in_at: string | null;
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    utm_content: string | null;
    utm_term: string | null;
};

type HourDetail = {
    utm_value: string;
    inscricoes: number;
    checkins: number;
};

type HourlyRow = {
    hora: string;
    total_inscricoes: number;
    total_checkins: number;
    details: HourDetail[];
};

// --- Componente de KPI ---
const KpiCard = ({ title, value, icon: Icon, subTitle }: { title: string; value: string; icon: React.ElementType; subTitle?: string }) => (
    <div className="bg-white p-4 rounded-lg shadow-md flex items-center gap-4">
        <div className="bg-blue-100 p-3 rounded-full">
            <Icon className="text-blue-600 text-xl" />
        </div>
        <div>
            <p className="text-sm text-slate-500">{title}</p>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            {subTitle && <p className="text-xs text-slate-400">{subTitle}</p>}
        </div>
    </div>
);


// --- Página Principal ---
export default function AnaliseCampanhaPage() {
    const supabase = createClient();
    
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunch, setSelectedLaunch] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingData, setIsLoadingData] = useState(true);

    // Estados para os filtros
    const [rawLeads, setRawLeads] = useState<RawLead[]>([]);
    const [selectedSource, setSelectedSource] = useState('all');
    const [selectedMedium, setSelectedMedium] = useState('all');
    const [selectedCampaign, setSelectedCampaign] = useState('all');
    const [selectedContent, setSelectedContent] = useState('all');
    const [selectedTerm, setSelectedTerm] = useState('all');

    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

    const toggleRow = (hora: string) => {
        setExpandedRows(prev => ({ ...prev, [hora]: !prev[hora] }));
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
            } else if (error) {
                toast.error("Erro ao buscar lançamentos.");
                console.error(error);
            }
            setIsLoading(false);
        };
        fetchLaunches();
    }, [supabase]);

    // Carrega os dados brutos dos leads quando o lançamento muda
    useEffect(() => {
        const loadRawDataWithPagination = async () => {
            if (!selectedLaunch) return;
            setIsLoadingData(true);
            setRawLeads([]);

            // SOLUÇÃO DEFINITIVA: Implementa paginação para buscar todos os dados
            // O servidor tem um limite de 1000, então buscamos de 1000 em 1000.
            let allLeads: RawLead[] = [];
            let page = 0;
            const pageSize = 1000;
            let keepFetching = true;

            while (keepFetching) {
                const { data, error } = await supabase
                    .from('leads')
                    .select('created_at, check_in_at, utm_source, utm_medium, utm_campaign, utm_content, utm_term')
                    .eq('launch_id', selectedLaunch)
                    .range(page * pageSize, (page + 1) * pageSize - 1);

                if (error) {
                    toast.error("Erro ao carregar página de dados dos leads.");
                    console.error(error);
                    keepFetching = false; // Interrompe o loop em caso de erro
                    break;
                }

                if (data && data.length > 0) {
                    allLeads = [...allLeads, ...data];
                }

                // Se a página retornou menos dados que o tamanho da página, é a última.
                if (!data || data.length < pageSize) {
                    keepFetching = false;
                } else {
                    page++; // Prepara para buscar a próxima página
                }
            }
            
            setRawLeads(allLeads);
            setIsLoadingData(false);
        };

        loadRawDataWithPagination();
    }, [selectedLaunch, supabase]);

    // Filtros em cascata
    const filterOptions = useMemo(() => {
        let leads = rawLeads;
        const sources = new Set<string>();
        const mediums = new Set<string>();
        const campaigns = new Set<string>();
        const contents = new Set<string>();
        const terms = new Set<string>();

        rawLeads.forEach(lead => { if(lead.utm_source) sources.add(lead.utm_source) });
        
        if (selectedSource !== 'all') leads = leads.filter(l => l.utm_source === selectedSource);
        leads.forEach(lead => { if(lead.utm_medium) mediums.add(lead.utm_medium) });

        if (selectedMedium !== 'all') leads = leads.filter(l => l.utm_medium === selectedMedium);
        leads.forEach(lead => { if(lead.utm_campaign) campaigns.add(lead.utm_campaign) });

        if (selectedCampaign !== 'all') leads = leads.filter(l => l.utm_campaign === selectedCampaign);
        leads.forEach(lead => { if(lead.utm_content) contents.add(lead.utm_content) });

        if (selectedContent !== 'all') leads = leads.filter(l => l.utm_content === selectedContent);
        leads.forEach(lead => { if(lead.utm_term) terms.add(lead.utm_term) });

        return {
            sources: Array.from(sources).sort(),
            mediums: Array.from(mediums).sort(),
            campaigns: Array.from(campaigns).sort(),
            contents: Array.from(contents).sort(),
            terms: Array.from(terms).sort(),
        };
    }, [rawLeads, selectedSource, selectedMedium, selectedCampaign, selectedContent]);

    // Filtra os leads com base nas seleções
    const filteredLeads = useMemo(() => {
        return rawLeads.filter(lead => 
            (selectedSource === 'all' || lead.utm_source === selectedSource) &&
            (selectedMedium === 'all' || lead.utm_medium === selectedMedium) &&
            (selectedCampaign === 'all' || lead.utm_campaign === selectedCampaign) &&
            (selectedContent === 'all' || lead.utm_content === selectedContent) &&
            (selectedTerm === 'all' || lead.utm_term === selectedTerm)
        );
    }, [rawLeads, selectedSource, selectedMedium, selectedCampaign, selectedContent, selectedTerm]);

    // Calcula os KPIs TOTAIS (não mudam com os filtros)
    const grandTotalKpis = useMemo(() => {
        const totalInscricoes = rawLeads.length;
        const totalCheckins = rawLeads.filter(l => l.check_in_at).length;
        return { totalInscricoes, totalCheckins };
    }, [rawLeads]);

    // Calcula os KPIs FILTRADOS
    const filteredKpis = useMemo(() => {
        const totalInscricoes = filteredLeads.length;
        const totalCheckins = filteredLeads.filter(l => l.check_in_at).length;
        return { totalInscricoes, totalCheckins };
    }, [filteredLeads]);

    // Processa os dados para a tabela
    const hourlyData = useMemo((): HourlyRow[] => {
        const groupedByHour: Record<string, { inscricoes: RawLead[], checkins: RawLead[] }> = {};

        filteredLeads.forEach(lead => {
            const hour = new Date(lead.created_at).toISOString().slice(0, 13) + ":00:00";
            if (!groupedByHour[hour]) {
                groupedByHour[hour] = { inscricoes: [], checkins: [] };
            }
            groupedByHour[hour].inscricoes.push(lead);
            if (lead.check_in_at) {
                groupedByHour[hour].checkins.push(lead);
            }
        });

        return Object.entries(groupedByHour)
            .map(([hora, leads]) => {
                const detailsGrouped: Record<string, { inscricoes: number, checkins: number }> = {};
                
                leads.inscricoes.forEach(lead => {
                    const utmValue = lead['utm_source'] as string || 'N/A';
                    if (!detailsGrouped[utmValue]) {
                        detailsGrouped[utmValue] = { inscricoes: 0, checkins: 0 };
                    }
                    detailsGrouped[utmValue].inscricoes++;
                    if (lead.check_in_at) {
                        detailsGrouped[utmValue].checkins++;
                    }
                });

                const details: HourDetail[] = Object.entries(detailsGrouped)
                    .map(([utm_value, counts]) => ({ ...counts, utm_value }))
                    .sort((a, b) => b.inscricoes - a.inscricoes);

                return {
                    hora: `${new Date(hora).toLocaleDateString('pt-BR')} ${new Date(hora).toTimeString().slice(0, 5)}`,
                    total_inscricoes: leads.inscricoes.length,
                    total_checkins: leads.checkins.length,
                    details
                };
            })
            .sort((a, b) => new Date(b.hora.split(' ')[0].split('/').reverse().join('-') + 'T' + b.hora.split(' ')[1]).getTime() - new Date(a.hora.split(' ')[0].split('/').reverse().join('-') + 'T' + a.hora.split(' ')[1]).getTime());

    }, [filteredLeads]);

    
    return (
        <div className="space-y-6 p-4 md:p-6 bg-slate-50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Análise de Campanha por Hora</h1>
                <div className="bg-white p-2 rounded-lg shadow-md w-full md:w-auto">
                    <select value={selectedLaunch} onChange={e => setSelectedLaunch(e.target.value)} className="w-full px-3 py-2 border-none rounded-md focus:ring-0 bg-transparent" disabled={isLoading}>
                        {launches.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.status})</option>)}
                    </select>
                </div>
            </div>

            {/* --- KPIs --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard title="Total Geral Inscrições" value={grandTotalKpis.totalInscricoes.toLocaleString('pt-BR')} icon={FaGlobe} subTitle="Total do Lançamento" />
                <KpiCard title="Total Geral Check-ins" value={grandTotalKpis.totalCheckins.toLocaleString('pt-BR')} icon={FaBullseye} subTitle="Total do Lançamento" />
                <KpiCard title="Inscrições (Filtro)" value={filteredKpis.totalInscricoes.toLocaleString('pt-BR')} icon={FaUsers} subTitle="Resultado do filtro atual" />
                <KpiCard title="Check-ins (Filtro)" value={filteredKpis.totalCheckins.toLocaleString('pt-BR')} icon={FaUserCheck} subTitle="Resultado do filtro atual" />
            </div>

            {/* --- Filtros --- */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center gap-2 mb-4">
                    <FaFilter className="text-blue-600"/>
                    <h2 className="text-lg font-semibold text-slate-700">Filtros de Análise</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Source */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">UTM Source</label>
                        <select value={selectedSource} onChange={e => setSelectedSource(e.target.value)} className="w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md">
                            <option value="all">Todos</option>
                            {filterOptions.sources.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                    {/* Medium */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">UTM Medium</label>
                        <select value={selectedMedium} onChange={e => setSelectedMedium(e.target.value)} className="w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md">
                            <option value="all">Todos</option>
                            {filterOptions.mediums.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                     {/* Campaign */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">UTM Campaign</label>
                        <select value={selectedCampaign} onChange={e => setSelectedCampaign(e.target.value)} className="w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md">
                            <option value="all">Todos</option>
                            {filterOptions.campaigns.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                     {/* Content */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">UTM Content</label>
                        <select value={selectedContent} onChange={e => setSelectedContent(e.target.value)} className="w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md">
                            <option value="all">Todos</option>
                            {filterOptions.contents.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                    {/* Term */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">UTM Term</label>
                        <select value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)} className="w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md">
                            <option value="all">Todos</option>
                            {filterOptions.terms.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {isLoadingData ? (
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
                                {hourlyData.length === 0 && !isLoadingData && (
                                    <tr><td colSpan={4} className="text-center py-10 text-slate-500">Nenhum dado encontrado para esta seleção.</td></tr>
                                )}
                                {hourlyData.map((row) => (
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
                                                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 uppercase tracking-wider pl-12">UTM Source</th>
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