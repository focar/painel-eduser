'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { subDays, startOfDay, endOfDay, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FaSpinner, FaChevronDown } from 'react-icons/fa';

// --- Tipos de Dados ---
interface Kpis { total_geral_inscritos: number; total_geral_checkins: number; }
interface DetailedData { day: string; hour: number; utm_content: string | null; inscricoes: number; checkins: number; }
interface ApiResponse { kpis: Kpis; detailed_data: DetailedData[]; available_utm_contents: string[]; }
type GroupedDataByDay = Record<string, DetailedData[]>;
type GroupedDataByUtm = Record<string, GroupedDataByDay>;
type Launch = { id: string; nome: string; status: string; };
type ChartDataPoint = { name: string; Inscrições: number; 'Check-ins': number; };

// --- Componente Principal ---
export default function EvolucaoCanalPage() {
  const supabase = createClientComponentClient();
  const [selectedLaunchId, setSelectedLaunchId] = useState<string | null>(null);
  const [period, setPeriod] = useState<'Hoje' | 'Ontem' | '7 Dias' | '14 Dias' | '30 Dias' | '45 Dias' | 'Todos'>('Hoje');
  const [selectedUtm, setSelectedUtm] = useState<string>('Todos');
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [fullLaunchData, setFullLaunchData] = useState<DetailedData[]>([]);
  const [periodData, setPeriodData] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState({ main: true, full: true });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (key: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      newSet.has(key) ? newSet.delete(key) : newSet.add(key);
      return newSet;
    });
  };

  useEffect(() => {
    const fetchLaunches = async () => {
      setIsLoading({ main: true, full: true });
      const { data, error } = await supabase.from('lancamentos').select('id, nome, status');
      if (error) { console.error("Erro ao buscar lançamentos:", error); } 
      else if (data) {
        const statusOrder: { [key: string]: number } = { 'Em Andamento': 1, 'Concluído': 2 };
        const filteredAndSorted = data
          .filter(launch => launch.status === 'Em Andamento' || launch.status === 'Concluído')
          .sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
        setLaunches(filteredAndSorted);
        if (filteredAndSorted.length > 0) {
          setSelectedLaunchId(filteredAndSorted[0].id);
        } else {
          setIsLoading({ main: false, full: false });
        }
      }
    };
    fetchLaunches();
  }, [supabase]);

  useEffect(() => {
    if (!selectedLaunchId) return;
    
    const fetchAllData = async () => {
      setIsLoading({ main: true, full: true });
      const { data, error } = await supabase.rpc('get_dashboard_evolucao_canal', {
        p_launch_id: selectedLaunchId,
        p_start_datetime: new Date('2020-01-01T00:00:00Z').toISOString(),
        p_end_datetime: new Date().toISOString(),
      });
      if (error) {
        console.error('Erro ao buscar dados:', error);
        setPeriodData(null);
        setFullLaunchData([]);
      } else {
        setPeriodData(data);
        setFullLaunchData(data.detailed_data || []);
      }
      setIsLoading({ main: false, full: false });
    };

    fetchAllData();
    setSelectedUtm('Todos');
    setExpandedRows(new Set());
  }, [selectedLaunchId, supabase]);

  // --- Memos para processamento de dados ---
  const dataFilteredByPeriod = useMemo(() => {
    if (!periodData?.detailed_data) return [];
    if (period === 'Todos') return periodData.detailed_data;
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case 'Hoje': startDate = startOfDay(now); break;
      case 'Ontem': startDate = startOfDay(subDays(now, 1)); break;
      case '14 Dias': startDate = startOfDay(subDays(now, 13)); break;
      case '30 Dias': startDate = startOfDay(subDays(now, 29)); break;
      case '45 Dias': startDate = startOfDay(subDays(now, 44)); break;
      default: startDate = startOfDay(subDays(now, 6)); break;
    }
    return periodData.detailed_data.filter(d => parseISO(d.day) >= startDate);
  }, [periodData, period]);

  const dataFilteredByUtm = useMemo(() => {
    if (selectedUtm === 'Todos') return dataFilteredByPeriod;
    return dataFilteredByPeriod.filter(d => d.utm_content === selectedUtm);
  }, [dataFilteredByPeriod, selectedUtm]);
  
  const periodKpis = useMemo(() => {
    return dataFilteredByUtm.reduce((acc, curr) => ({
      inscricoes: acc.inscricoes + curr.inscricoes,
      checkins: acc.checkins + curr.checkins,
    }), { inscricoes: 0, checkins: 0 });
  }, [dataFilteredByUtm]);
  
  const fullLaunchChartData = useMemo((): ChartDataPoint[] => {
    if (!fullLaunchData || fullLaunchData.length === 0) return [];
    const dailyTotals: Record<string, { inscricoes: number; checkins: number }> = {};
    const dataToProcess = selectedUtm === 'Todos' ? fullLaunchData : fullLaunchData.filter(d => d.utm_content === selectedUtm);
    
    dataToProcess.forEach(item => {
        const day = item.day; if (!dailyTotals[day]) { dailyTotals[day] = { inscricoes: 0, checkins: 0 }; }
        dailyTotals[day].inscricoes += item.inscricoes; dailyTotals[day].checkins += item.checkins;
    });
    return Object.entries(dailyTotals).map(([day, totals]) => ({ name: format(parseISO(day), 'dd/MM', { locale: ptBR }), Inscrições: totals.inscricoes, 'Check-ins': totals.checkins, originalDate: parseISO(day) })).sort((a, b) => a.originalDate.getTime() - b.originalDate.getTime());
  }, [fullLaunchData, selectedUtm]);

  const periodHourlyChartData = useMemo((): ChartDataPoint[] => {
    if (!dataFilteredByUtm || dataFilteredByUtm.length === 0) return [];
    const hourlyTotals: Record<number, { inscricoes: number; checkins: number }> = {};
    dataFilteredByUtm.forEach(item => {
        if (!hourlyTotals[item.hour]) { hourlyTotals[item.hour] = { inscricoes: 0, checkins: 0 }; }
        hourlyTotals[item.hour].inscricoes += item.inscricoes; hourlyTotals[item.hour].checkins += item.checkins;
    });
    return Array.from({ length: 24 }, (_, i) => ({ name: `${i.toString().padStart(2, '0')}:00`, Inscrições: hourlyTotals[i]?.inscricoes || 0, 'Check-ins': hourlyTotals[i]?.checkins || 0, originalDate: new Date() }));
  }, [dataFilteredByUtm]);
  
  const groupedDataForTable = useMemo(() => {
    return dataFilteredByUtm.reduce((acc: GroupedDataByUtm, item) => {
        const utm = item.utm_content || 'Sem UTM'; const day = item.day;
        if (!acc[utm]) acc[utm] = {}; if (!acc[utm][day]) acc[utm][day] = [];
        acc[utm][day].push(item);
        return acc;
    }, {});
  }, [dataFilteredByUtm]);

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Evolução de Canal</h1>
      <div className="p-4 bg-white rounded-lg shadow-md"><div className="flex flex-col md:flex-row md:items-center gap-4"><div className="w-full md:w-auto"><label className="block text-sm font-medium text-gray-700">Lançamento</label><select value={selectedLaunchId || ''} onChange={(e) => setSelectedLaunchId(e.target.value)} className="mt-1 p-2 w-full border border-gray-300 rounded-md" disabled={!launches.length}>{launches.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.status})</option>)}</select></div><div className="w-full md:w-auto"><label className="block text-sm font-medium text-gray-700">Período</label><div className="flex flex-wrap items-center gap-2 mt-1">{['Hoje', 'Ontem', '7 Dias', '14 Dias', '30 Dias', '45 Dias', 'Todos'].map(p => (<button key={p} onClick={() => setPeriod(p as any)} className={`px-3 py-2 rounded-md text-sm font-semibold transition-colors ${period === p ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>{p}</button>))}</div></div></div></div>
      
      {isLoading.main || isLoading.full ? (<div className="flex justify-center items-center p-10"><FaSpinner className="animate-spin text-blue-600 text-4xl" /></div>) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"><div className="p-4 bg-white rounded-lg shadow"><h3 className="text-gray-500">Total Inscrições (Geral)</h3><p className="text-2xl font-bold">{periodData?.kpis?.total_geral_inscritos ?? 0}</p></div><div className="p-4 bg-white rounded-lg shadow"><h3 className="text-gray-500">Total Check-ins (Geral)</h3><p className="text-2xl font-bold">{periodData?.kpis?.total_geral_checkins ?? 0}</p></div><div className="p-4 bg-white rounded-lg shadow"><h3 className="text-gray-500">Inscrições no Período</h3><p className="text-2xl font-bold">{periodKpis.inscricoes}</p></div><div className="p-4 bg-white rounded-lg shadow"><h3 className="text-gray-500">Check-ins no Período</h3><p className="text-2xl font-bold">{periodKpis.checkins}</p></div></div>
          <div className="p-4 bg-white rounded-lg shadow-md"><label htmlFor="utm-filter" className="block text-sm font-medium text-gray-700">Filtrar por UTM Content</label><select id="utm-filter" value={selectedUtm} onChange={(e) => setSelectedUtm(e.target.value)} className="mt-1 p-2 w-full border border-gray-300 rounded-md"><option value="Todos">Todos os canais</option>{periodData?.available_utm_contents?.map(utm => <option key={utm} value={utm}>{utm}</option>)}</select></div>
          
          <div className="bg-white p-4 rounded-lg shadow"><h3 className="text-lg font-semibold text-gray-700 mb-4">Visão Geral do Lançamento (por Dia)</h3><div style={{height: '400px'}}><ResponsiveContainer width="100%" height="100%"><BarChart data={fullLaunchChartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="Inscrições" fill="#8884d8" /><Bar dataKey="Check-ins" fill="#82ca9d" /></BarChart></ResponsiveContainer></div></div>
          <div className="bg-white p-4 rounded-lg shadow"><h3 className="text-lg font-semibold text-gray-700 mb-4">Evolução no Período por Hora ({period})</h3><div style={{height: '400px'}}><ResponsiveContainer width="100%" height="100%"><LineChart data={periodHourlyChartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Line type="monotone" dataKey="Inscrições" stroke="#8884d8" strokeWidth={2} /><Line type="monotone" dataKey="Check-ins" stroke="#82ca9d" strokeWidth={2} /></LineChart></ResponsiveContainer></div></div>

          <div className="bg-white p-4 rounded-lg shadow overflow-x-auto"><h3 className="text-lg font-semibold text-gray-700 mb-4">Detalhes por Dia e Hora</h3>{dataFilteredByUtm.length === 0 ? (<p className="text-center text-gray-500 py-4">Nenhum dado encontrado.</p>) : (<div className="space-y-4">{Object.entries(groupedDataForTable).map(([utm, days]) => {const utmTotal = Object.values(days).flat().reduce((acc, curr) => ({inscricoes: acc.inscricoes + curr.inscricoes, checkins: acc.checkins + curr.checkins}), {inscricoes: 0, checkins: 0});return (<div key={utm} className="border rounded-lg"><h4 className="flex justify-between items-center font-bold bg-gray-200 p-2 text-slate-800 rounded-t-lg"><span>{utm}</span><span className="font-normal text-sm">Total: <strong>{utmTotal.inscricoes}</strong> Inscrições / <strong>{utmTotal.checkins}</strong> Check-ins</span></h4><table className="min-w-full"><tbody>{Object.entries(days).map(([day, hours]) => {const dailyTotal = hours.reduce((acc, curr) => ({inscricoes: acc.inscricoes + curr.inscricoes, checkins: acc.checkins + curr.checkins}), {inscricoes: 0, checkins: 0});const key = `${utm}-${day}`;const isExpanded = expandedRows.has(key);return (<React.Fragment key={key}><tr onClick={() => toggleRow(key)} className="cursor-pointer hover:bg-gray-50 border-t"><td className="px-4 py-3 font-medium flex items-center gap-2 w-1/3"><FaChevronDown className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} size={12} />{format(parseISO(day), 'dd/MM/yyyy', { locale: ptBR })}</td><td className="px-4 py-3 text-center w-1/3">{dailyTotal.inscricoes}</td><td className="px-4 py-3 text-center w-1/3">{dailyTotal.checkins}</td></tr>{isExpanded && (<tr><td colSpan={3} className="p-0"><div className="pl-10 pr-4 py-2 bg-gray-50"><table className="min-w-full text-sm"><thead><tr className="bg-gray-100"><th className="p-2 text-left font-medium text-gray-600 w-1/3">Hora</th><th className="p-2 text-center font-medium text-gray-600 w-1/3">Inscrições</th><th className="p-2 text-center font-medium text-gray-600 w-1/3">Check-ins</th></tr></thead><tbody className="divide-y divide-gray-200">{hours.sort((a,b) => a.hour - b.hour).map((item, index) => (<tr key={index}><td className="p-2">{`${item.hour.toString().padStart(2, '0')}:00`}</td><td className="p-2 text-center">{item.inscricoes}</td><td className="p-2 text-center">{item.checkins}</td></tr>))}</tbody></table></div></td></tr>)}</React.Fragment>);})}</tbody></table></div>);})}</div>)}</div>
        </div>
      )}
    </div>
  );
}