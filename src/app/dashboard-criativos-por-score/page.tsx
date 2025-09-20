//dashboard-criativos-por-score/page.tsx
'use client';

import { useState, useEffect, useCallback, Fragment, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Launch } from "@/lib/types";
import { ChevronDown, ChevronRight, Users, UserCheck, Percent } from 'lucide-react';

// --- Tipos de Dados (Atualizados) ---
type ScoreDistribution = { [key: string]: number };

type TermData = {
    utm_term: string;
    total_inscricoes: number;
    total_checkins: number;
    score_distribution: ScoreDistribution;
};

// NOVO: Tipo de dado para Medium
type MediumData = {
    utm_medium: string;
    total_inscricoes: number;
    total_checkins: number;
    score_distribution: ScoreDistribution;
};

type CampaignData = {
    primary_grouping: string;
    total_inscricoes: number;
    total_checkins: number;
    score_distribution: ScoreDistribution;
    terms?: TermData[];
    mediums?: MediumData[]; // NOVO: Campo para mediums
};

type ApiResponse = {
    Pago?: CampaignData[];
    Orgânico?: CampaignData[];
    'Não Traqueado'?: CampaignData[];
};

const profileOrder = ['Quente', 'Quente-Morno', 'Morno', 'Morno-Frio', 'Frio'];
const profileStyles: { [key: string]: { text: string, bg: string } } = {
    'Quente': { text: 'text-red-800', bg: 'bg-red-100' },
    'Quente-Morno': { text: 'text-orange-800', bg: 'bg-orange-100' },
    'Morno': { text: 'text-amber-800', bg: 'bg-amber-100' },
    'Morno-Frio': { text: 'text-sky-800', bg: 'bg-sky-100' },
    'Frio': { text: 'text-blue-800', bg: 'bg-blue-100' },
};

// --- Componentes ---
const Spinner = () => <div className="flex justify-center items-center h-60"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600"></div></div>;

const KpiCard = ({ title, value, icon: Icon }: { title: string, value: string | number, icon: React.ElementType }) => (
    <div className="bg-white p-4 rounded-lg shadow-sm text-center">
        <Icon className="mx-auto text-blue-500 mb-2" size={24} />
        <p className="text-3xl font-bold text-slate-800">{value}</p>
        <h3 className="text-sm font-medium text-slate-500 mt-1">{title}</h3>
    </div>
);

const ScoreDistributionDisplay = ({ distribution }: { distribution: ScoreDistribution }) => (
    <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-200 rounded-md">
        {profileOrder.map(profile => {
            const count = distribution?.[profile] || 0;
            if (count === 0) return null;
            const style = profileStyles[profile];
            return (
                <div key={profile} className={`px-2 py-1 rounded-md text-xs font-semibold ${style.bg} ${style.text}`}>
                    {profile}: {count}
                </div>
            );
        })}
    </div>
);

export default function CriativosPorScorePage() {
    const supabase = createClient();
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunch, setSelectedLaunch] = useState<string>('');
    const [trafficType, setTrafficType] = useState<'Pago' | 'Orgânico' | 'Não Traqueado'>('Pago');
    const [data, setData] = useState<ApiResponse>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedRows, setExpandedRows] = useState<{ [key: string]: boolean }>({});

    useEffect(() => {
        const fetchLaunches = async () => {
            const { data: launchesData, error } = await supabase.rpc('get_lancamentos_permitidos');
            if (error) { console.error(error); return; }
            const sorted = [...(launchesData || [])].sort((a: Launch, b: Launch) => {
                if (a.status === 'Em Andamento' && b.status !== 'Em Andamento') return -1;
                if (a.status !== 'Em Andamento' && b.status === 'Em Andamento') return 1;
                return b.nome.localeCompare(a.nome);
            });
            setLaunches(sorted as Launch[]);
            if (sorted.length > 0) {
                const inProgress = sorted.find(l => l.status === 'Em Andamento');
                setSelectedLaunch(inProgress ? inProgress.id : sorted[0].id);
            }
        };
        fetchLaunches();
    }, [supabase]);

    const fetchData = useCallback(async (launchId: string) => {
        if (!launchId) return;
        setLoading(true);
        setError(null);
        setExpandedRows({});
        try {
            const { data: result, error: rpcError } = await supabase.rpc('get_campaign_score_analysis', { p_launch_id: launchId });
            if (rpcError) throw rpcError;
            setData(result || {});
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        if (selectedLaunch) {
            fetchData(selectedLaunch);
        }
    }, [selectedLaunch, fetchData]);

    const toggleRow = (id: string) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const generalKpis = useMemo(() => {
        const allCampaigns = Object.values(data).flat();
        const total_inscricoes = allCampaigns.reduce((sum, camp) => sum + (camp?.total_inscricoes || 0), 0);
        const total_checkins = allCampaigns.reduce((sum, camp) => sum + (camp?.total_checkins || 0), 0);
        const taxa_checkin = total_inscricoes > 0 ? `${((total_checkins / total_inscricoes) * 100).toFixed(1)}%` : '0.0%';
        return { total_inscricoes, total_checkins, taxa_checkin };
    }, [data]);
    
    const selectionKpis = useMemo(() => {
        const currentCampaigns = data[trafficType] || [];
        const total_inscricoes = currentCampaigns.reduce((sum, camp) => sum + camp.total_inscricoes, 0);
        const total_checkins = currentCampaigns.reduce((sum, camp) => sum + camp.total_checkins, 0);
        const taxa_checkin = total_inscricoes > 0 ? `${((total_checkins / total_inscricoes) * 100).toFixed(1)}%` : '0.0%';
        return { total_inscricoes, total_checkins, taxa_checkin };
    }, [data, trafficType]);

    const currentData = data[trafficType] || [];
    const trafficKeyName = trafficType === 'Pago' ? 'Campanha' : 'Origem';
    // ATUALIZADO: Nome da coluna do sub-nível agora é dinâmico
    const subLevelKeyName = trafficType === 'Pago' ? 'Termo' : trafficType === 'Orgânico' ? 'Medium' : 'Origem';

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-slate-100 min-h-screen">
            <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Análise de Criativos por Score</h1>
                <select value={selectedLaunch} onChange={e => setSelectedLaunch(e.target.value)} className="w-full sm:w-72 p-3 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500">
                    {launches.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.status})</option>)}
                </select>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-slate-200 p-4 rounded-lg">
                    <h3 className="font-bold text-center text-slate-600 mb-3">Totais do Lançamento</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <KpiCard title="Inscrições" value={generalKpis.total_inscricoes.toLocaleString('pt-BR')} icon={Users} />
                        <KpiCard title="Check-ins" value={generalKpis.total_checkins.toLocaleString('pt-BR')} icon={UserCheck} />
                        <KpiCard title="Taxa de Check-in" value={generalKpis.taxa_checkin} icon={Percent} />
                    </div>
                </div>
                <div className="bg-slate-200 p-4 rounded-lg">
                    <h3 className="font-bold text-center text-slate-600 mb-3">Totais da Seleção ({trafficType})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <KpiCard title="Inscrições" value={selectionKpis.total_inscricoes.toLocaleString('pt-BR')} icon={Users} />
                        <KpiCard title="Check-ins" value={selectionKpis.total_checkins.toLocaleString('pt-BR')} icon={UserCheck} />
                        <KpiCard title="Taxa de Check-in" value={selectionKpis.taxa_checkin} icon={Percent} />
                    </div>
                </div>
            </div>

            <div className="mb-6 bg-white p-2 rounded-lg shadow-md flex items-center justify-center space-x-2">
                {(['Pago', 'Orgânico', 'Não Traqueado'] as const).map(type => (
                    <button
                        key={type}
                        onClick={() => { setTrafficType(type) }}
                        className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${trafficType === type ? 'bg-blue-600 text-white shadow-lg' : 'bg-transparent text-slate-600 hover:bg-slate-200'}`}
                    >
                        {type}
                    </button>
                ))}
            </div>
            
            <main className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
                {loading ? <Spinner /> : error ? <p className="text-red-500 text-center">Erro: {error}</p> : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                                <tr>
                                    <th className="px-4 py-3">{trafficKeyName}</th>
                                    <th className="px-4 py-3 text-center">Inscrições</th>
                                    <th className="px-4 py-3 text-center">Check-ins</th>
                                    <th className="px-4 py-3 text-center">Taxa de Check-in</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentData.length === 0 ? (
                                    <tr><td colSpan={4} className="text-center p-8 text-slate-500">Nenhum dado encontrado para este tipo de tráfego.</td></tr>
                                ) : currentData.map(campaign => (
                                    <Fragment key={campaign.primary_grouping}>
                                        <tr onClick={() => toggleRow(campaign.primary_grouping)} className="border-b border-slate-200 hover:bg-slate-100 cursor-pointer">
                                            <td className="px-4 py-3 font-semibold text-slate-800 flex items-center">
                                                {expandedRows[campaign.primary_grouping] ? <ChevronDown size={16} className="mr-2"/> : <ChevronRight size={16} className="mr-2"/>}
                                                {campaign.primary_grouping}
                                            </td>
                                            <td className="px-4 py-3 text-center">{campaign.total_inscricoes}</td>
                                            <td className="px-4 py-3 text-center">{campaign.total_checkins}</td>
                                            <td className="px-4 py-3 text-center font-medium">
                                                {campaign.total_inscricoes > 0 ? ((campaign.total_checkins / campaign.total_inscricoes) * 100).toFixed(1) + '%' : '0.0%'}
                                            </td>
                                        </tr>
                                        
                                        {expandedRows[campaign.primary_grouping] && (
                                            <tr>
                                                <td colSpan={4} className="p-0 bg-slate-100">
                                                    <div className="p-4">
                                                        {/* LÓGICA DE EXPANSÃO ATUALIZADA */}
                                                        {trafficType === 'Pago' && campaign.terms && campaign.terms.length > 0 ? (
                                                            <>
                                                                <h4 className="font-semibold mb-2 text-sm text-slate-600">Detalhes por Termo (utm_term):</h4>
                                                                {/* Sub-tabela de Termos */}
                                                                <table className="w-full bg-white rounded-lg shadow">
                                                                    <thead className="bg-slate-200 text-slate-600 text-xs uppercase">
                                                                        <tr>
                                                                            <th className="px-3 py-2">{subLevelKeyName}</th>
                                                                            <th className="px-3 py-2 text-center">Inscrições</th>
                                                                            <th className="px-3 py-2 text-center">Check-ins</th>
                                                                            <th className="px-3 py-2 text-center">Tx. Check-in</th>
                                                                            <th className="px-3 py-2 w-[50%]">Distribuição de Score</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {campaign.terms.map(term => {
                                                                            const checkinRate = term.total_inscricoes > 0 ? ((term.total_checkins / term.total_inscricoes) * 100).toFixed(1) + '%' : '0.0%';
                                                                            return (
                                                                                <tr key={term.utm_term} className="border-b border-slate-200 last:border-b-0">
                                                                                    <td className="px-3 py-2 font-medium">{term.utm_term || '(não definido)'}</td>
                                                                                    <td className="px-3 py-2 text-center">{term.total_inscricoes}</td>
                                                                                    <td className="px-3 py-2 text-center">{term.total_checkins}</td>
                                                                                    <td className="px-3 py-2 text-center">{checkinRate}</td>
                                                                                    <td className="px-3 py-2"><ScoreDistributionDisplay distribution={term.score_distribution} /></td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </>
                                                        ) : trafficType === 'Orgânico' && campaign.mediums && campaign.mediums.length > 0 ? (
                                                          <>
                                                              <h4 className="font-semibold mb-2 text-sm text-slate-600">Detalhes por Medium (utm_medium):</h4>
                                                              {/* NOVA Sub-tabela de Mediums */}
                                                              <table className="w-full bg-white rounded-lg shadow">
                                                                  <thead className="bg-slate-200 text-slate-600 text-xs uppercase">
                                                                      <tr>
                                                                          <th className="px-3 py-2">{subLevelKeyName}</th>
                                                                          <th className="px-3 py-2 text-center">Inscrições</th>
                                                                          <th className="px-3 py-2 text-center">Check-ins</th>
                                                                          <th className="px-3 py-2 text-center">Tx. Check-in</th>
                                                                          <th className="px-3 py-2 w-[50%]">Distribuição de Score</th>
                                                                      </tr>
                                                                  </thead>
                                                                  <tbody>
                                                                      {campaign.mediums.map(medium => {
                                                                          const checkinRate = medium.total_inscricoes > 0 ? ((medium.total_checkins / medium.total_inscricoes) * 100).toFixed(1) + '%' : '0.0%';
                                                                          return (
                                                                              <tr key={medium.utm_medium} className="border-b border-slate-200 last:border-b-0">
                                                                                  <td className="px-3 py-2 font-medium">{medium.utm_medium || '(não definido)'}</td>
                                                                                  <td className="px-3 py-2 text-center">{medium.total_inscricoes}</td>
                                                                                  <td className="px-3 py-2 text-center">{medium.total_checkins}</td>
                                                                                  <td className="px-3 py-2 text-center">{checkinRate}</td>
                                                                                  <td className="px-3 py-2"><ScoreDistributionDisplay distribution={medium.score_distribution} /></td>
                                                                              </tr>
                                                                          );
                                                                      })}
                                                                  </tbody>
                                                              </table>
                                                          </>
                                                        ) : (
                                                            <>
                                                                <h4 className="font-semibold mb-2 text-sm text-slate-600">Detalhes da Origem:</h4>
                                                                {/* Tabela genérica para casos sem sub-nível */}
                                                                <table className="w-full bg-white rounded-lg shadow">
                                                                    <thead className="bg-slate-200 text-slate-600 text-xs uppercase">
                                                                        <tr>
                                                                            <th className="px-3 py-2">{trafficKeyName}</th>
                                                                            <th className="px-3 py-2 text-center">Inscrições</th>
                                                                            <th className="px-3 py-2 text-center">Check-ins</th>
                                                                            <th className="px-3 py-2 text-center">Tx. Check-in</th>
                                                                            <th className="px-3 py-2 w-[50%]">Distribuição de Score</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        <tr className="border-b border-slate-200 last:border-b-0">
                                                                            <td className="px-3 py-2 font-medium">{campaign.primary_grouping}</td>
                                                                            <td className="px-3 py-2 text-center">{campaign.total_inscricoes}</td>
                                                                            <td className="px-3 py-2 text-center">{campaign.total_checkins}</td>
                                                                            <td className="px-3 py-2 text-center">{campaign.total_inscricoes > 0 ? ((campaign.total_checkins / campaign.total_inscricoes) * 100).toFixed(1) + '%' : '0.0%'}</td>
                                                                            <td className="px-3 py-2"><ScoreDistributionDisplay distribution={campaign.score_distribution} /></td>
                                                                        </tr>
                                                                    </tbody>
                                                                </table>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    );
}