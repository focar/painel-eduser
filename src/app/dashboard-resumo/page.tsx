'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { FaSpinner } from 'react-icons/fa';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// --- Tipos de Dados ---
type Launch = { id: string; nome: string; status: string; };
type RawLead = {
    created_at: string | null;
    check_in_at: string | null;
    utm_source: string | null;
};
type DailyData = {
    full_date: string;
    short_date: string;
    inscricoes: number;
    checkins: number;
};

// --- Componentes ---
const KpiCard = ({ title, value }: { title: string, value: string | number }) => (
    <div className="bg-slate-50 p-4 rounded-lg text-center flex-1 border border-slate-200">
        <h3 className="text-sm font-medium text-slate-500 uppercase">{title}</h3>
        <p className="text-3xl font-bold text-slate-800 mt-2">{value}</p>
    </div>
);

const ChartCard = ({ title, children }: { title: string, children: React.ReactElement }) => (
    <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">{title}</h2>
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>{children}</ResponsiveContainer>
        </div>
    </div>
);

export default function ResumoDiarioPage() {
    const supabase = createClient();
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunch, setSelectedLaunch] = useState<string>('');
    const [rawLeads, setRawLeads] = useState<RawLead[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchInitialData = async () => {
            setIsLoading(true);
            const { data: launchesData } = await supabase
                .from('lancamentos')
                .select('id, nome, status')
                .in('status', ['Em Andamento', 'Concluído']);
            
            if (launchesData && launchesData.length > 0) {
                const statusOrder: { [key: string]: number } = { 'Em Andamento': 1, 'Concluído': 2 };
                const sorted = [...launchesData].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
                setLaunches(sorted);
                if (sorted[0]) {
                  setSelectedLaunch(sorted[0].id);
                }
            }
        };
        fetchInitialData();
    }, [supabase]);

    useEffect(() => {
        if (!selectedLaunch) {
            setIsLoading(false);
            return;
        }
        const loadAllLeads = async () => {
            setIsLoading(true);
            setRawLeads([]);
            let allLeads: RawLead[] = [];
            let page = 0;
            const pageSize = 1000;
            let keepFetching = true;
            while (keepFetching) {
                const from = page * pageSize;
                const to = from + pageSize - 1;
                const { data, error } = await supabase
                    .from('leads')
                    .select('created_at, check_in_at, utm_source')
                    .eq('launch_id', selectedLaunch)
                    .range(from, to);
                if (error) {
                    console.error("Erro ao buscar leads:", error);
                    keepFetching = false;
                    break;
                }
                if (data) allLeads.push(...data);
                if (!data || data.length < pageSize) keepFetching = false;
                else page++;
            }
            setRawLeads(allLeads);
            setIsLoading(false);
        };
        loadAllLeads();
    }, [selectedLaunch, supabase]);
    
    const kpis = useMemo(() => {
        if (rawLeads.length === 0) {
            return { totalGeral: 0, totalCheckins: 0, totalPago: 0, totalOrganico: 0, totalNaoTraqueado: 0 };
        }
        const untrackedSources = ['{:utm_source}', '{{site_source_name}}utm_', '{{site_source_name}}'];
        let totalPago = 0, totalOrganico = 0, totalNaoTraqueado = 0;
        rawLeads.forEach(lead => {
            const source = lead.utm_source?.toLowerCase() || '';
            if (source === 'organic') totalOrganico++;
            else if (untrackedSources.includes(source)) totalNaoTraqueado++;
            else totalPago++;
        });
        return {
            totalGeral: rawLeads.length,
            totalCheckins: rawLeads.filter(l => l.check_in_at).length,
            totalPago, totalOrganico, totalNaoTraqueado
        };
    }, [rawLeads]);

    const dailyData = useMemo(() => {
        if (rawLeads.length === 0) return [];
        const dailyTotals: Record<string, { inscricoes: number; checkins: number }> = {};
        rawLeads.forEach(lead => {
            if (lead.created_at) {
                const dayKey = lead.created_at.split('T')[0];
                if (!dailyTotals[dayKey]) dailyTotals[dayKey] = { inscricoes: 0, checkins: 0 };
                dailyTotals[dayKey].inscricoes++;
                if (lead.check_in_at) dailyTotals[dayKey].checkins++;
            }
        });
        return Object.keys(dailyTotals)
          .sort((a, b) => b.localeCompare(a))
          .map(dateStr => {
            const date = parseISO(dateStr);
            return {
              full_date: format(date, "dd/MM/yyyy", { locale: ptBR }),
              short_date: format(date, "dd/MM", { locale: ptBR }),
              inscricoes: dailyTotals[dateStr].inscricoes,
              checkins: dailyTotals[dateStr].checkins,
            };
        });
    }, [rawLeads]);

    const chartData = useMemo(() => [...dailyData].reverse(), [dailyData]);

    return (
      <div className="space-y-6 p-4 md:p-6 bg-slate-100 min-h-screen">
          <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Resumo Diário do Lançamento</h1>
              {launches.length > 0 && (
                <div className="bg-white p-2 rounded-lg shadow-md w-full md:w-auto">
                    <select value={selectedLaunch} onChange={(e) => setSelectedLaunch(e.target.value)} className="w-full px-3 py-2 border-none rounded-md focus:ring-0 bg-transparent" disabled={isLoading}>
                        {launches.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.status})</option>)}
                    </select>
                </div>
              )}
          </div>

          {isLoading ? (
              <div className="text-center py-10"><FaSpinner className="animate-spin text-blue-600 text-3xl mx-auto" /></div>
          ) : rawLeads.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-lg shadow-md"><p className="text-slate-500">Nenhum dado encontrado para este lançamento.</p></div>
          ) : (
              <div className="space-y-6">
                  
                  {/* --- BLOCO DE KPIs DIVIDIDO --- */}
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Bloco 1: KPIs Gerais */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                      <h2 className="text-lg font-semibold text-slate-700 mb-4 text-center lg:text-Center">Visão Geral</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <KpiCard title="Total Inscrições" value={kpis.totalGeral.toLocaleString('pt-BR')} />
                        <KpiCard title="Total Check-ins" value={kpis.totalCheckins.toLocaleString('pt-BR')} />
                      </div>
                    </div>

                    {/* Bloco 2: KPIs de Tráfego */}
                    <div className="lg:col-span-3 bg-white p-6 rounded-lg shadow-md">
                      <h2 className="text-lg font-semibold text-slate-700 mb-4 text-center lg:text-Center">Origem do Tráfego</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <KpiCard title="Tráfego Pago" value={kpis.totalPago.toLocaleString('pt-BR')} />
                        <KpiCard title="Tráfego Orgânico" value={kpis.totalOrganico.toLocaleString('pt-BR')} />
                        <KpiCard title="Não Traqueado" value={kpis.totalNaoTraqueado.toLocaleString('pt-BR')} />
                      </div>
                    </div>
                  </div>

                  {/* Tabela */}
                  <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
                    <h2 className="text-lg font-semibold text-slate-700 mb-4">Dados Detalhados por Dia</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Data</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Inscrições</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Check-ins</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                <tr className="bg-slate-100 font-bold">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">Totais Gerais</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right">{kpis.totalGeral.toLocaleString('pt-BR')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right">{kpis.totalCheckins.toLocaleString('pt-BR')}</td>
                                </tr>
                                {dailyData.map((item) => (
                                    <tr key={item.full_date}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{item.full_date}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right">{item.inscricoes.toLocaleString('pt-BR')}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right">{item.checkins.toLocaleString('pt-BR')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                  </div>
                  
                  {/* Gráficos */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <ChartCard title="Inscrições vs Check-ins (Barras)">
                          <BarChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="short_date" interval="preserveStartEnd" fontSize={12} />
                              <YAxis fontSize={12} />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="inscricoes" fill="#8884d8" name="Inscrições" />
                              <Bar dataKey="checkins" fill="#82ca9d" name="Check-ins" />
                          </BarChart>
                      </ChartCard>
                      <ChartCard title="Inscrições vs Check-ins (Linhas)">
                          <LineChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="short_date" interval="preserveStartEnd" fontSize={12} />
                              <YAxis fontSize={12} />
                              <Tooltip />
                              <Legend />
                              <Line type="monotone" dataKey="inscricoes" stroke="#8884d8" name="Inscrições" />
                              <Line type="monotone" dataKey="checkins" stroke="#82ca9d" name="Check-ins" />
                          </LineChart>
                      </ChartCard>
                  </div>
              </div>
          )}
      </div>
    );
}