'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FaSpinner } from 'react-icons/fa';

// --- Tipos de Dados ---
interface Kpis {
  total_geral_inscritos: number;
  total_geral_checkins: number;
}
interface DetailedData {
  day: string;
  hour: number;
  utm_content: string | null;
  inscricoes: number;
  checkins: number;
}
interface ApiResponse {
  kpis: Kpis;
  detailed_data: DetailedData[];
  available_utm_contents: string[];
}
type GroupedData = Record<string, Record<string, DetailedData[]>>;

type Launch = {id: string, nome: string, status: string};

export default function EvolucaoCanalPage() {
  const supabase = createClientComponentClient();

  const [selectedLaunchId, setSelectedLaunchId] = useState<string | null>(null);
  const [period, setPeriod] = useState<'Hoje' | 'Ontem' | '7 Dias' | 'Todos'>('7 Dias');
  const [selectedUtm, setSelectedUtm] = useState<string>('Todos');
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch da lista de Lançamentos
  useEffect(() => {
    const fetchLaunches = async () => {
      const { data, error } = await supabase.from('lancamentos').select('id, nome, status');
      
      if (error) {
        console.error("Erro ao buscar lançamentos:", error);
        setLaunches([]);
      } else if (data) {
        // ### INÍCIO DA CORREÇÃO ###
        const statusOrder: { [key: string]: number } = {
          'Em Andamento': 1,
          'Concluído': 2,
        };

        const filteredAndSorted = data
          .filter(launch => launch.status === 'Em Andamento' || launch.status === 'Concluído')
          .sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
        
        setLaunches(filteredAndSorted);
        
        if (filteredAndSorted.length > 0) {
          setSelectedLaunchId(filteredAndSorted[0].id);
        }
        // ### FIM DA CORREÇÃO ###
      }
    };
    fetchLaunches();
  }, [supabase]);

  // Fetch principal dos dados do dashboard
  useEffect(() => {
    if (!selectedLaunchId) {
        setIsLoading(false);
        return;
    };
    const fetchData = async () => {
      setIsLoading(true);
      const now = new Date();
      let startDate, endDate;
      switch (period) {
        case 'Hoje':
          startDate = startOfDay(now);
          endDate = endOfDay(now);
          break;
        case 'Ontem':
          startDate = startOfDay(subDays(now, 1));
          endDate = endOfDay(subDays(now, 1));
          break;
        case '7 Dias':
          startDate = startOfDay(subDays(now, 6));
          endDate = endOfDay(now);
          break;
        case 'Todos':
        default:
          startDate = new Date('2020-01-01T00:00:00Z');
          endDate = endOfDay(now);
      }
      
      const { data, error } = await supabase.rpc('get_dashboard_evolucao_canal', {
        p_launch_id: selectedLaunchId,
        p_start_datetime: startDate.toISOString(),
        p_end_datetime: endDate.toISOString(),
      });

      if (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
        setApiResponse(null);
      } else {
        setApiResponse(data);
      }
      setIsLoading(false);
    };
    fetchData();
    setSelectedUtm('Todos');
  }, [selectedLaunchId, period, supabase]);

  const filteredDetailedData = useMemo(() => {
    if (!apiResponse) return [];
    if (selectedUtm === 'Todos') return apiResponse.detailed_data;
    return apiResponse.detailed_data.filter(d => d.utm_content === selectedUtm);
  }, [apiResponse, selectedUtm]);

  const periodKpis = useMemo(() => {
    return filteredDetailedData.reduce(
      (acc, curr) => {
        acc.inscricoes += curr.inscricoes;
        acc.checkins += curr.checkins;
        return acc;
      }, { inscricoes: 0, checkins: 0 }
    );
  }, [filteredDetailedData]);

  const groupedDataForTable = useMemo<GroupedData>(() => {
    if (selectedUtm !== 'Todos') return {};
    return filteredDetailedData.reduce((acc: GroupedData, item) => {
      const utm = item.utm_content || 'Sem UTM';
      const day = item.day;
      if (!acc[utm]) acc[utm] = {};
      if (!acc[utm][day]) acc[utm][day] = [];
      acc[utm][day].push(item);
      return acc;
    }, {});
  }, [filteredDetailedData, selectedUtm]);
  
  const chartData = useMemo(() => {
    const hourlyTotals: Record<number, { inscricoes: number; checkins: number }> = {};
    filteredDetailedData.forEach(item => {
        if (!hourlyTotals[item.hour]) hourlyTotals[item.hour] = { inscricoes: 0, checkins: 0 };
        hourlyTotals[item.hour].inscricoes += item.inscricoes;
        hourlyTotals[item.hour].checkins += item.checkins;
    });
    return Array.from({ length: 24 }, (_, i) => ({
        name: `${i.toString().padStart(2, '0')}:00`,
        Inscrições: hourlyTotals[i]?.inscricoes || 0,
        'Check-ins': hourlyTotals[i]?.checkins || 0,
    }));
  }, [filteredDetailedData]);

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800">Evolução de Canal</h1>

      {/* Filtros Principais */}
      <div className="p-4 bg-white rounded-lg shadow-md">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Lançamento</label>
            <select 
              value={selectedLaunchId || ''} 
              onChange={(e) => setSelectedLaunchId(e.target.value)} 
              className="mt-1 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              disabled={!launches.length}
            >
              {launches.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.status})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Período</label>
            <div className="flex items-center space-x-2 mt-1">
              {['Hoje', 'Ontem', '7 Dias', 'Todos'].map(p => (
                <button 
                  key={p} 
                  onClick={() => setPeriod(p as any)} 
                  className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${period === p ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center p-10">
            <FaSpinner className="animate-spin text-blue-600 text-4xl" />
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-lg shadow"><h3 className="text-gray-500">Total Inscrições (Geral)</h3><p className="text-2xl font-bold">{apiResponse?.kpis?.total_geral_inscritos ?? 0}</p></div>
            <div className="p-4 bg-white rounded-lg shadow"><h3 className="text-gray-500">Total Check-ins (Geral)</h3><p className="text-2xl font-bold">{apiResponse?.kpis?.total_geral_checkins ?? 0}</p></div>
            <div className="p-4 bg-white rounded-lg shadow"><h3 className="text-gray-500">Inscrições no Período</h3><p className="text-2xl font-bold">{periodKpis.inscricoes}</p></div>
            <div className="p-4 bg-white rounded-lg shadow"><h3 className="text-gray-500">Check-ins no Período</h3><p className="text-2xl font-bold">{periodKpis.checkins}</p></div>
          </div>

          {/* Filtro Secundário */}
          <div className="p-4 bg-white rounded-lg shadow-md">
            <label htmlFor="utm-filter" className="block text-sm font-medium text-gray-700">Filtrar por UTM Content</label>
            <select id="utm-filter" value={selectedUtm} onChange={(e) => setSelectedUtm(e.target.value)} className="mt-1 p-2 border border-gray-300 rounded-md w-full md:w-auto">
              <option value="Todos">Todos os canais</option>
              {apiResponse?.available_utm_contents?.map(utm => <option key={utm} value={utm}>{utm}</option>)}
            </select>
          </div>
          
          <div className="space-y-8">
            {/* Tabela de Dados Detalhada */}
            <div className="bg-white p-4 rounded-lg shadow overflow-x-auto">
              {filteredDetailedData.length === 0 ? (
                <p className="text-center text-gray-500 py-4">Nenhum dado encontrado para os filtros selecionados.</p>
              ) : selectedUtm !== 'Todos' ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Dia</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hora</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Inscrições</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Check-ins</th></tr></thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredDetailedData.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 whitespace-nowrap">{new Date(item.day).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{`${item.hour.toString().padStart(2, '0')}:00`}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{item.inscricoes}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{item.checkins}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedDataForTable).map(([utm, days]) => (
                    <div key={utm}>
                      <h3 className="font-bold bg-gray-100 p-2 rounded-t-lg">{utm}</h3>
                      {Object.entries(days).map(([day, hours]) => (
                        <div key={day} className="pl-4 border-l border-r border-b">
                          <h4 className="font-semibold p-2 bg-gray-50">{new Date(day).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</h4>
                          <table className="min-w-full text-sm">
                            <thead className="sr-only sm:not-sr-only">
                              <tr className="bg-gray-100">
                                <th className="p-2 text-left font-medium text-gray-600 w-1/3">Hora</th>
                                <th className="p-2 text-left font-medium text-gray-600 w-1/3">Inscrições</th>
                                <th className="p-2 text-left font-medium text-gray-600 w-1/3">Check-ins</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {hours.map((item, index) => (
                                <tr key={index}>
                                  <td className="p-2" data-label="Hora">{`${item.hour.toString().padStart(2, '0')}:00`}</td>
                                  <td className="p-2" data-label="Inscrições">{item.inscricoes}</td>
                                  <td className="p-2" data-label="Check-ins">{item.checkins}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Gráfico de Barras */}
            <div className="bg-white p-4 rounded-lg shadow" style={{height: '400px'}}>
               <ResponsiveContainer>
                  <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Inscrições" fill="#8884d8" />
                      <Bar dataKey="Check-ins" fill="#82ca9d" />
                  </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}