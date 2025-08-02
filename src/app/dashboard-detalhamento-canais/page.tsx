// src/app/dashboard-detalhamento-canais/page.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
// CORREÇÃO: Usando o caminho de importação padrão do seu projeto
import { createClient } from '@/utils/supabase/client';
import { FaSpinner, FaChevronDown, FaFileCsv } from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast';
import Papa from 'papaparse';

// --- Tipos de Dados ---
type Launch = { id: string; nome: string; status: string; };
type LeadComTrafego = {
  check_in_at: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_content: string | null;
  tipo_trafego: 'paid' | 'organic' | 'untracked';
  created_at: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  score: number | null;
};
type GroupedDetails = Record<string, Record<string, LeadComTrafego[]>>;
type TrafficType = 'paid' | 'organic' | 'untracked';
type KpiData = {
  totalGeralInscricoes: number;
  totalGeralCheckins: number;
  leadsSelecao: number;
  checkinsSelecao: number;
  taxaCheckinSelecao: number;
};


// --- Componentes de UI ---
const LoadingSpinner = () => <div className="flex justify-center items-center p-10"><FaSpinner className="animate-spin text-blue-600 text-4xl" /></div>;
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

  // --- Estados ---
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [selectedLaunch, setSelectedLaunch] = useState<string | null>(null);
  const [allLeads, setAllLeads] = useState<LeadComTrafego[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trafficType, setTrafficType] = useState<TrafficType>('paid');
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  // --- Busca de Lançamentos ---
  useEffect(() => {
    const fetchLaunches = async () => {
      const { data, error } = await supabase.from('lancamentos').select('id, nome, status').in('status', ['Em Andamento', 'Concluído', 'Planejado']);
      if (error) { toast.error("Erro ao carregar lançamentos."); return; }
      if (data && data.length > 0) {
        const statusOrder: { [key: string]: number } = { 'Em Andamento': 1, 'Planejado': 2, 'Concluído': 3 };
        const sortedLaunches = [...data].sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || a.nome.localeCompare(b.nome));
        setLaunches(sortedLaunches);
        const initialLaunchId = sortedLaunches.find(l => l.status === 'Em Andamento')?.id || sortedLaunches[0].id;
        setSelectedLaunch(initialLaunchId);
      }
    };
    fetchLaunches();
  }, [supabase]);

  // --- Busca de Leads com Proteção Contra Race Condition ---
  useEffect(() => {
    if (!selectedLaunch) return;

    let isActive = true;

    const loadAllLeadsForLaunch = async () => {
      setIsLoading(true);
      setAllLeads([]);
      
      let allFetchedLeads: LeadComTrafego[] = [];
      const pageSize = 1000;
      let page = 0;

      try {
        while (isActive) {
          const { data, error } = await supabase.rpc('get_leads_para_detalhamento', {
            launch_id_param: selectedLaunch,
            p_limit: pageSize,
            p_offset: page * pageSize
          });

          if (!isActive) return;
          if (error) throw error;

          if (data) {
            allFetchedLeads.push(...data);
          }

          if (!data || data.length < pageSize) {
            break;
          }
          page++;
        }
        if (isActive) {
          setAllLeads(allFetchedLeads);
        }
      } catch (err: any) {
        if (isActive) {
          toast.error(`Erro ao carregar leads: ${err.message}`);
          setError("Não foi possível carregar os dados dos leads.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadAllLeadsForLaunch();

    return () => {
      isActive = false;
    };
  }, [selectedLaunch, supabase]);

  // --- Cálculos com useMemo ---
  const { kpis, filteredLeads, groupedDetails } = useMemo(() => {
    if (!allLeads || allLeads.length === 0) {
      const emptyKpis: KpiData = { totalGeralInscricoes: 0, totalGeralCheckins: 0, leadsSelecao: 0, checkinsSelecao: 0, taxaCheckinSelecao: 0 };
      return { kpis: emptyKpis, filteredLeads: [], groupedDetails: {} };
    }
    const currentFilteredLeads = allLeads.filter(lead => lead.tipo_trafego === trafficType);
    const calculatedKpis: KpiData = {
      totalGeralInscricoes: allLeads.length,
      totalGeralCheckins: allLeads.filter(l => l.check_in_at).length,
      leadsSelecao: currentFilteredLeads.length,
      checkinsSelecao: currentFilteredLeads.filter(l => l.check_in_at).length,
      taxaCheckinSelecao: currentFilteredLeads.length > 0 ? (currentFilteredLeads.filter(l => l.check_in_at).length / currentFilteredLeads.length) * 100 : 0,
    };
    const currentGroupedDetails = currentFilteredLeads.reduce((acc: GroupedDetails, item) => {
      const source = item.utm_source || 'Indefinido';
      const medium = item.utm_medium || 'Indefinido';
      if (!acc[source]) acc[source] = {};
      if (!acc[source][medium]) acc[source][medium] = [];
      acc[source][medium].push(item);
      return acc;
    }, {});
    return { kpis: calculatedKpis, filteredLeads: currentFilteredLeads, groupedDetails: currentGroupedDetails };
  }, [allLeads, trafficType]);


  // --- Funções de Interação ---
  const toggleItem = (key: string) => setOpenItems(prev => ({ ...prev, [key]: !prev[key] }));

  const handleExport = useCallback(() => {
    if (filteredLeads.length === 0) {
      toast.error("Não há dados na seleção atual para exportar.");
      return;
    }

    const dataToExport = filteredLeads.map(lead => ({
      'Data Inscricao': new Date(lead.created_at).toLocaleDateString('pt-BR'),
      'Nome': lead.nome || 'N/A',
      'Email': lead.email || 'N/A',
      'Telefone': lead.telefone || 'N/A',
      'Score': lead.score ?? 'N/A',
      'UTM Source': lead.utm_source || 'N/A',
      'UTM Medium': lead.utm_medium || 'N/A',
      'UTM Content': lead.utm_content || 'N/A',
      'Tipo de Trafego': lead.tipo_trafego,
      'Fez Check-in': lead.check_in_at ? 'Sim' : 'Não',
      'Data Check-in': lead.check_in_at ? new Date(lead.check_in_at).toLocaleString('pt-BR') : 'N/A',
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const launchName = launches.find(l => l.id === selectedLaunch)?.nome || 'lancamento';
    link.setAttribute('download', `detalhe_canais_${launchName}_${trafficType}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Exportação iniciada!");
  }, [filteredLeads, selectedLaunch, trafficType, launches]);


  // --- Renderização ---
  if (error) return <div className="p-8 text-center text-red-500 bg-red-50 rounded-lg">{error}</div>;

  return (
    <>
      <Toaster position="top-center" />
      <div className="space-y-6 p-4 md:p-6 bg-slate-100 min-h-screen">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Detalhamento dos Canais</h1>
          <div className="bg-white p-2 rounded-lg shadow-md w-full md:w-auto">
            <select
              value={selectedLaunch || ''}
              onChange={(e) => setSelectedLaunch(e.target.value)}
              disabled={isLoading || launches.length === 0}
              className="w-full px-3 py-2 border-none rounded-md focus:ring-0 bg-transparent disabled:opacity-50"
            >
              {launches.length === 0 && !isLoading && <option>Nenhum lançamento</option>}
              {launches.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.status})</option>)}
            </select>
          </div>
        </header>
        {isLoading ? <LoadingSpinner /> : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-4 rounded-xl shadow-lg flex flex-col gap-4">
                <h2 className="text-lg font-semibold text-slate-700 text-center">Totais Gerais do Lançamento</h2>
                <div className="grid grid-cols-2 gap-4">
                  <KpiCard title="Total Inscrições" value={kpis.totalGeralInscricoes.toLocaleString('pt-BR')} />
                  <KpiCard title="Total Check-ins" value={kpis.totalGeralCheckins.toLocaleString('pt-BR')} />
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-lg flex flex-col gap-4">
                <h2 className="text-lg font-semibold text-slate-700 text-center">
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
                <button onClick={() => setTrafficType('paid')} disabled={isLoading} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${trafficType === 'paid' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-300'}`}>Tráfego Pago</button>
                <button onClick={() => setTrafficType('organic')} disabled={isLoading} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${trafficType === 'organic' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-300'}`}>Tráfego Orgânico</button>
                <button onClick={() => setTrafficType('untracked')} disabled={isLoading} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${trafficType === 'untracked' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-300'}`}>Não Traqueadas</button>
              </div>
              <button onClick={handleExport} disabled={isLoading || kpis.leadsSelecao === 0} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 text-sm inline-flex items-center gap-2 disabled:opacity-50">
                <FaFileCsv />
                Exportar Seleção para CSV
              </button>
            </div>
            <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold text-slate-700 mb-4">Detalhes por Hierarquia UTM</h2>
              {Object.keys(groupedDetails).length === 0 ? (
                <p className="text-center text-slate-500 py-8">Nenhum dado encontrado para a seleção de tráfego atual.</p>
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
                            <div className="pl-10 pr-4 pb-3 bg-slate-50/50">
                              <table className="min-w-full text-sm">
                                <thead className="bg-slate-100">
                                  <tr>
                                    <th className="p-2 text-left font-medium text-slate-600">UTM Content</th>
                                    <th className="p-2 text-center font-medium text-slate-600">Inscritos</th>
                                    <th className="p-2 text-center font-medium text-slate-600">Check-ins</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                  {Object.entries(contents.reduce((acc, lead) => {
                                      const content = lead.utm_content || 'Indefinido';
                                      if (!acc[content]) acc[content] = { inscritos: 0, checkins: 0 };
                                      acc[content].inscritos++;
                                      if (lead.check_in_at) acc[content].checkins++;
                                      return acc;
                                    }, {} as Record<string, {inscritos: number, checkins: number}>))
                                    .sort(([, a], [, b]) => b.inscritos - a.inscritos)
                                    .map(([content, totals]) => (
                                      <tr key={content}>
                                        <td className="p-2 text-slate-700 truncate" title={content}>{content}</td>
                                        <td className="p-2 text-center text-slate-600">{totals.inscritos}</td>
                                        <td className="p-2 text-center text-slate-600">{totals.checkins}
                                        </td>
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
          </>
        )}
      </div>
    </>
  );
}
