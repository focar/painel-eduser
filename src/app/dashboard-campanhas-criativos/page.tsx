// src/app/dashboard-campanhas-criativos/page.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import toast from 'react-hot-toast';
import { FaSpinner, FaFilter, FaChevronDown, FaGlobe, FaBullseye, FaUsers, FaUserCheck, FaPercent } from 'react-icons/fa';
import type { Launch } from "@/lib/types";

// --- Tipagens de Dados ---
type RawLead = {
    check_in_at: string | null;
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    utm_content: string | null;
    utm_term: string | null;
};
type CreativePerformance = {
    name: string;
    inscricoes: number;
    checkins: number;
    checkinRate: string;
};
type CampaignPerformance = {
    name: string;
    inscricoes: number;
    checkins: number;
    checkinRate: string;
    creatives: CreativePerformance[];
};
type UtmOption = string;

// Cliente Supabase inicializado fora do componente para estabilidade.
const supabase = createClient();

// --- Componentes ---
const KpiCard = ({ title, value, icon: Icon }: { title: string; value: string; icon: React.ElementType; }) => (
    <div className="bg-white p-4 rounded-lg shadow-md flex items-center gap-4">
        <div className="bg-blue-100 p-3 rounded-full"><Icon className="text-blue-600 text-2xl" /></div>
        <div>
            <p className="text-base text-slate-500">{title}</p>
            <p className="text-3xl font-bold text-slate-800">{value}</p>
        </div>
    </div>
);
const Spinner = () => <div className="flex justify-center items-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div></div>;

// --- Página Principal ---
export default function AnaliseCampanhasCriativosPage() {
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunch, setSelectedLaunch] = useState<string>('');
    const [loadingLaunches, setLoadingLaunches] = useState(true);
    const [loadingData, setLoadingData] = useState(true);
    const [rawLeads, setRawLeads] = useState<RawLead[]>([]);
    const [expandedCampaigns, setExpandedCampaigns] = useState<Record<string, boolean>>({});

    // CORREÇÃO: Estado dos filtros simplificado para apenas 2 UTMs.
    const [filters, setFilters] = useState({ campaign: 'all', term: 'all' });
    const [options, setOptions] = useState<{campaigns: UtmOption[], terms: UtmOption[]}>({ campaigns: [], terms: [] });

    const toggleCampaign = (campaignName: string) => setExpandedCampaigns(prev => ({ ...prev, [campaignName]: !prev[campaignName] }));

    useEffect(() => {
        const fetchLaunches = async () => {
            setLoadingLaunches(true);
            const { data, error } = await supabase.rpc('get_lancamentos_permitidos');
            if (data) {
                const sorted = [...data].sort((a, b) => (a.status === 'Em Andamento' ? -1 : 1) - (b.status === 'Em Andamento' ? -1 : 1) || b.nome.localeCompare(a.nome));
                setLaunches(sorted as Launch[]);
                const inProgress = sorted.find(l => l.status === 'Em Andamento');
                setSelectedLaunch(inProgress ? inProgress.id : (sorted[0] ? sorted[0].id : ''));
            } else if (error) { toast.error("Erro ao buscar lançamentos."); }
            setLoadingLaunches(false);
        };
        fetchLaunches();
    }, []);

    useEffect(() => {
        const loadRawData = async () => {
            if (!selectedLaunch) return;
            setLoadingData(true);
            setRawLeads([]);
            let allLeads: RawLead[] = [];
            let page = 0;
            const pageSize = 1000;
            while (true) {
                const { data, error } = await supabase
                    .from('leads')
                    .select('check_in_at, utm_source, utm_medium, utm_campaign, utm_content, utm_term')
                    .eq('launch_id', selectedLaunch)
                    .range(page * pageSize, (page + 1) * pageSize - 1);
                if (error) { toast.error("Erro ao carregar dados dos leads."); break; }
                if (data) allLeads.push(...data);
                if (!data || data.length < pageSize) break;
                page++;
            }
            setRawLeads(allLeads);
            setLoadingData(false);
        };
        loadRawData();
    }, [selectedLaunch]);

    const getCleanUtm = (value: string | null | undefined): string => {
        if (!value || value.trim() === '' || value.includes('{') || value.includes('{{')) {
            return 'Não Traqueadas';
        }
        return value;
    };

    const processedLeads = useMemo(() => rawLeads.map(lead => ({
        ...lead,
        utm_campaign: getCleanUtm(lead.utm_campaign),
        utm_term: getCleanUtm(lead.utm_term),
        utm_source: getCleanUtm(lead.utm_source), // Limpa o source para a lógica de tráfego pago
    })), [rawLeads]);

    const filteredLeads = useMemo(() => processedLeads.filter(lead =>
        (filters.campaign === 'all' || lead.utm_campaign === filters.campaign) &&
        (filters.term === 'all' || lead.utm_term === filters.term)
    ), [processedLeads, filters]);

    useEffect(() => {
        const paidLeads = processedLeads.filter(lead => !['google', 'bing', 'organic', 'referral', 'Não Traqueadas'].includes(lead.utm_source.toLowerCase()));
        
        const campaigns = [...new Set(paidLeads.map(l => l.utm_campaign))].sort((a, b) => a.localeCompare(b));
        
        const termLeads = paidLeads.filter(l => filters.campaign === 'all' || l.utm_campaign === filters.campaign);
        const terms = [...new Set(termLeads.map(l => l.utm_term))].sort((a, b) => a.localeCompare(b));
        
        setOptions({ campaigns, terms });
    }, [processedLeads, filters.campaign]);


    const kpis = useMemo(() => {
        const totalInscricoes = processedLeads.length;
        const totalCheckins = processedLeads.filter(l => l.check_in_at).length;
        const taxaCheckin = totalInscricoes > 0 ? ((totalCheckins / totalInscricoes) * 100).toFixed(1) + '%' : '0.0%';

        // CORREÇÃO: Garante que a verificação de tráfego pago não quebre com valores nulos.
        const isPaidTraffic = (lead: RawLead) => {
            const source = lead.utm_source || '';
            return !['google', 'bing', 'organic', 'referral', 'Não Traqueadas'].includes(source.toLowerCase());
        };
        const paidLeads = processedLeads.filter(isPaidTraffic);
        const inscricoesPago = paidLeads.length;
        const checkinsPago = paidLeads.filter(l => l.check_in_at).length;
        const taxaCheckinPago = inscricoesPago > 0 ? ((checkinsPago / inscricoesPago) * 100).toFixed(1) + '%' : '0.0%';

        return { totalInscricoes, totalCheckins, taxaCheckin, inscricoesPago, checkinsPago, taxaCheckinPago };
    }, [processedLeads]);

    const tableData = useMemo((): CampaignPerformance[] => {
        const isPaidTraffic = (lead: RawLead) => {
            const source = lead.utm_source || '';
            return !['google', 'bing', 'organic', 'referral', 'Não Traqueadas'].includes(source.toLowerCase());
        };
        const leadsToProcess = filteredLeads.filter(isPaidTraffic);

        const campaigns = leadsToProcess.reduce((acc, lead) => {
            const campaignName = lead.utm_campaign;
            if (!acc[campaignName]) {
                acc[campaignName] = [];
            }
            acc[campaignName].push(lead);
            return acc;
        }, {} as Record<string, RawLead[]>);

        return Object.entries(campaigns).map(([campaignName, leads]) => {
            const creatives = leads.reduce((acc, lead) => {
                const creativeName = lead.utm_term || 'Indefinido';
                if (!acc[creativeName]) {
                    acc[creativeName] = { name: creativeName, inscricoes: 0, checkins: 0 };
                }
                acc[creativeName].inscricoes++;
                if (lead.check_in_at) acc[creativeName].checkins++;
                return acc;
            }, {} as Record<string, Omit<CreativePerformance, 'checkinRate'>>);

            const campaignInscricoes = leads.length;
            const campaignCheckins = leads.filter(l => l.check_in_at).length;

            return {
                name: campaignName,
                inscricoes: campaignInscricoes,
                checkins: campaignCheckins,
                checkinRate: campaignInscricoes > 0 ? ((campaignCheckins / campaignInscricoes) * 100).toFixed(1) + '%' : '0.0%',
                creatives: Object.values(creatives).map(c => ({
                    ...c,
                    checkinRate: c.inscricoes > 0 ? ((c.checkins / c.inscricoes) * 100).toFixed(1) + '%' : '0.0%'
                })).sort((a,b) => a.name.localeCompare(b.name))
            };
        }).sort((a,b) => a.name.localeCompare(b.name));
    }, [processedLeads, filteredLeads]);

    const handleFilterChange = (level: keyof typeof filters, value: string) => {
        const newFilters = { ...filters, [level]: value };
        if (level === 'campaign') {
            newFilters.term = 'all';
        }
        setFilters(newFilters);
    };

    return (
        <div className="space-y-6 p-4 md:p-6 bg-slate-100 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold text-slate-800">Análise de Campanhas e Criativos</h1>
                <div className="bg-white p-2 rounded-lg shadow-md w-full md:w-auto">
                    <select value={selectedLaunch} onChange={e => setSelectedLaunch(e.target.value)} className="w-full px-3 py-2 border-none rounded-md focus:ring-0 bg-transparent text-base" disabled={loadingLaunches}>
                        {loadingLaunches ? <option>A carregar...</option> : 
                            launches.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.status})</option>)
                        }
                    </select>
                </div>
            </div>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-200 p-4 rounded-lg space-y-3 shadow-md">
                    <h3 className="font-bold text-center text-slate-600">Totais Gerais do Lançamento</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <KpiCard title="Total Inscrições" value={kpis.totalInscricoes.toLocaleString('pt-BR')} icon={FaGlobe} />
                        <KpiCard title="Total Check-ins" value={kpis.totalCheckins.toLocaleString('pt-BR')} icon={FaBullseye} />
                        <KpiCard title="Taxa Check-in" value={kpis.taxaCheckin} icon={FaPercent} />
                    </div>
                </div>
                <div className="bg-slate-200 p-4 rounded-lg space-y-3 shadow-md">
                   <h3 className="font-bold text-center text-slate-600">Performance do Tráfego Pago</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <KpiCard title="Inscrições Tr. Pago" value={kpis.inscricoesPago.toLocaleString('pt-BR')} icon={FaUsers} />
                        <KpiCard title="Check-ins Tr. Pago" value={kpis.checkinsPago.toLocaleString('pt-BR')} icon={FaUserCheck} />
                        <KpiCard title="Taxa Check-in" value={kpis.taxaCheckinPago} icon={FaPercent} />
                    </div>
                </div>
            </section>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center gap-2 mb-4">
                    <FaFilter className="text-blue-600"/> <h2 className="text-lg font-semibold text-slate-700">Filtros de Performance</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">UTM Campaign</label>
                        <select 
                            value={filters.campaign} 
                            onChange={e => handleFilterChange('campaign', e.target.value)} 
                            className="w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md">
                            <option value="all">Todas as Campanhas</option>
                            {options.campaigns.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">UTM Term (Criativo)</label>
                        <select 
                            value={filters.term} 
                            onChange={e => handleFilterChange('term', e.target.value)} 
                            className="w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md">
                            <option value="all">Todos os Criativos</option>
                            {options.terms.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold text-slate-700 mb-4">Detalhes por Campanha e Criativo</h2>
                {loadingData ? <Spinner /> : (
                    <div className="space-y-4">
                        {tableData.map((campaign) => (
                            <div key={campaign.name} className="border rounded-lg overflow-hidden">
                                <div onClick={() => toggleCampaign(campaign.name)} className="bg-slate-100 p-3 flex justify-between items-center cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <FaChevronDown className={`transition-transform duration-200 ${expandedCampaigns[campaign.name] ? 'rotate-180' : ''}`} />
                                        <span className="font-bold text-slate-800">{campaign.name}</span>
                                    </div>
                                    <div className="flex gap-6 text-sm font-semibold">
                                        <span>Inscrições: <span className="text-blue-600">{campaign.inscricoes.toLocaleString('pt-BR')}</span></span>
                                        <span>Check-ins: <span className="text-blue-600">{campaign.checkins.toLocaleString('pt-BR')}</span></span>
                                        <span>Taxa: <span className="text-blue-600">{campaign.checkinRate}</span></span>
                                    </div>
                                </div>
                                {expandedCampaigns[campaign.name] && (
                                    <div className="p-4">
                                        <table className="min-w-full text-sm">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="p-2 text-left font-medium text-slate-600">Criativo (UTM Term)</th>
                                                    <th className="p-2 text-right font-medium text-slate-600">Inscrições</th>
                                                    <th className="p-2 text-right font-medium text-slate-600">Check-ins</th>
                                                    <th className="p-2 text-right font-medium text-slate-600">Taxa de Check-in</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {campaign.creatives.map(creative => (
                                                    <tr key={creative.name}>
                                                        <td className="p-2 text-slate-700">{creative.name}</td>
                                                        <td className="p-2 text-right text-slate-600">{creative.inscricoes.toLocaleString('pt-BR')}</td>
                                                        <td className="p-2 text-right text-slate-600">{creative.checkins.toLocaleString('pt-BR')}</td>
                                                        <td className="p-2 text-right font-semibold text-blue-600">{creative.checkinRate}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
