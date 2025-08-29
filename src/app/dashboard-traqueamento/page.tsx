'use client';

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Launch } from "@/lib/types";
import { FaSpinner, FaUsers, FaUserCheck, FaBullhorn, FaLeaf, FaQuestionCircle } from "react-icons/fa";
import { ArrowRight, Percent } from "lucide-react";
import toast, { Toaster } from 'react-hot-toast';
import dynamic from 'next/dynamic';

const supabase = createClient();

const TrafficDonutChart = dynamic(
    () => import('@/components/charts/TrafficDonutChart'),
    { 
        ssr: false,
        loading: () => <div className="w-full h-96 flex justify-center items-center"><FaSpinner className="animate-spin text-[#6ce5e8] text-3xl"/></div>
    }
);

type TrackingKpis = {
    total_leads: number;
    total_checkins: number;
    paid_leads: number;
    paid_checkins: number;
    organic_leads: number;
    organic_checkins: number;
    untracked_leads: number;
    untracked_checkins: number;
};

const KpiCard = ({ title, value, percentage, icon: Icon }: { title: string; value: string; percentage: string; icon: React.ElementType; }) => (
    <div className="bg-[#2a3a5a] p-6 rounded-lg shadow-lg">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm text-slate-300 font-medium uppercase tracking-wider">{title}</p>
                <p className="text-4xl font-bold text-[#6ce5e8] mt-1">{value}</p>
                <p className="text-sm font-semibold text-white mt-1">{percentage}</p>
            </div>
            <div className="bg-slate-700/50 p-3 rounded-full">
                <Icon className="text-[#6ce5e8]" size={24} />
            </div>
        </div>
    </div>
);

const TrafficCard = ({ title, leads, checkins, icon: Icon, onClick, rateColor, totalLeads }: { title: string; leads: number; checkins: number; icon: React.ElementType; onClick: () => void; rateColor: string; totalLeads: number; }) => {
    const leadPercentage = totalLeads > 0 ? ((leads / totalLeads) * 100).toFixed(1) : '0.0';
    return (
        <button onClick={onClick} className="bg-transparent border-2 border-slate-600 hover:border-slate-400 transition-all duration-300 p-6 rounded-lg shadow-lg text-left w-full group">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <Icon className={rateColor} size={32} />
                    <div>
                        <p className="text-xl font-bold text-white uppercase tracking-wider">{title}</p>
                        <p className="text-sm text-slate-300 mt-1">{leads.toLocaleString('pt-BR')} Leads • {checkins.toLocaleString('pt-BR')} Check-ins</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className={`text-2xl font-bold ${rateColor}`}>{leadPercentage}%</p>
                    <p className="text-xs text-slate-400">do Total de Leads</p>
                </div>
            </div>
            <div className="flex items-center justify-end text-sm text-slate-400 mt-4 group-hover:text-white transition-colors">
                Ver Detalhes <ArrowRight size={16} className="ml-2" />
            </div>
        </button>
    );
};

export default function TraqueamentoPage() {
    const router = useRouter();
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunch, setSelectedLaunch] = useState<string>('');
    const [kpis, setKpis] = useState<TrackingKpis | null>(null);
    const [isLoading, setIsLoading] = useState(true);

// CÓDIGO CORRIGIDO
    useEffect(() => {
        const fetchLaunches = async () => {
           const { data: launchesData, error } = await supabase.rpc('get_lancamentos_permitidos');
           
           if (error) {
               toast.error("Falha ao carregar lançamentos.");
           } else if (launchesData) { // Usamos 'else if' para garantir que launchesData existe
               // A CORREÇÃO ESTÁ AQUI: usando a variável 'launchesData'
               const sorted = [...launchesData].sort((a, b) => {
                   if (a.status === 'Em Andamento' && b.status !== 'Em Andamento') return -1;
                   if (a.status !== 'Em Andamento' && b.status === 'Em Andamento') return 1;
                   return b.nome.localeCompare(a.nome);
               });

               setLaunches(sorted as Launch[]); // Adicionado 'as Launch[]'

               if (sorted.length > 0) {
                   const inProgress = sorted.find(l => l.status === 'Em Andamento');
                   setSelectedLaunch(inProgress ? inProgress.id : sorted[0].id);
               }
           }
        };
        fetchLaunches();
    }, []); // As dependências vazias estão corretas aqui

    const fetchDataForLaunch = useCallback(async (launchId: string) => {
        if (!launchId) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_tracking_kpis', { p_launch_id: launchId });
            if (error) throw error;
            setKpis(data[0] || null);
        } catch (err: any) {
            toast.error("Falha ao carregar os dados de traqueamento.");
            setKpis(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (selectedLaunch) {
            fetchDataForLaunch(selectedLaunch);
        }
    }, [selectedLaunch, fetchDataForLaunch]);

    const chartData = useMemo(() => {
        if (!kpis) return [];
        return [
            { name: 'Tráfego Pago', value: kpis.paid_leads, fill: '#3b82f6' },
            { name: 'Orgânico', value: kpis.organic_leads, fill: '#22c55e' },
            { name: 'Não Traqueado', value: kpis.untracked_leads, fill: '#a855f7' },
        ];
    }, [kpis]);

    const checkinRate = kpis && kpis.total_leads > 0 ? ((kpis.total_checkins / kpis.total_leads) * 100).toFixed(1) + '%' : '0.0%';
    const totalPercentageText = kpis ? `${kpis.total_checkins.toLocaleString('pt-BR')} de ${kpis.total_leads.toLocaleString('pt-BR')}` : '...';

    const handleNavigate = (type: 'organic' | 'paid' | 'untracked') => {
        if (!selectedLaunch) { toast.error("Por favor, selecione um lançamento primeiro."); return; }
        const launchName = launches.find(l => l.id === selectedLaunch)?.nome || '';
        const queryParams = new URLSearchParams({ launchId: selectedLaunch, launchName }).toString();
        
        switch (type) {
            case 'organic':
                router.push(`/dashboard-traqueamento/detalhe-organico?${queryParams}`);
                break;
            case 'paid':
                // ✅ Rota corrigida para a página de detalhes
                router.push(`/dashboard-traqueamento/detalhe-pago?${queryParams}`);
                break;
            case 'untracked':
                toast.success(`Navegando para Não Traqueado... (a implementar)`);
                // router.push(`/dashboard-traqueamento/detalhe-nao-traqueado?${queryParams}`);
                break;
        }
    };

    return (
        <div className="bg-[#1e2b41] min-h-screen text-white p-4 sm:p-6 lg:p-8">
            <Toaster position="top-center" toastOptions={{ style: { background: '#2a3a5a', color: '#ffffff' }, success: { iconTheme: { primary: '#6ce5e8', secondary: '#1e2b41' } }, error: { iconTheme: { primary: '#f43f5e', secondary: '#ffffff' } }, }}/>
            <header className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-white">Dashboard de Traqueamento</h1>
                <div className="bg-[#2a3a5a] p-2 rounded-lg shadow-md">
                    <select value={selectedLaunch} onChange={(e) => setSelectedLaunch(e.target.value)} disabled={isLoading} className="w-full sm:w-auto px-3 py-2 border-none rounded-md focus:ring-2 focus:ring-[#6ce5e8] bg-transparent text-white font-medium text-base appearance-none">
                        {launches.map(l => <option className="bg-[#2a3a5a] text-white" key={l.id} value={l.id}>{l.nome} ({l.status})</option>)}
                    </select>
                </div>
            </header>

            {isLoading ? (
                <div className="flex justify-center items-center h-96"> <FaSpinner className="animate-spin text-[#6ce5e8] text-5xl" /> </div>
            ) : (
                <main className="mt-8 space-y-8">
                    <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <KpiCard title="TOTAL DE LEADS" value={kpis?.total_leads.toLocaleString('pt-BR') || '0'} percentage="" icon={FaUsers} />
                        <KpiCard title="TOTAL DE CHECK-INS" value={kpis?.total_checkins.toLocaleString('pt-BR') || '0'} percentage={totalPercentageText} icon={FaUserCheck} />
                        <KpiCard title="TAXA DE CHECK-IN" value={checkinRate} percentage="" icon={Percent} />
                    </section>
                    
                    <section className="space-y-6">
                        <h2 className="text-2xl font-bold text-white border-b border-slate-600 pb-2">Análise por Origem de Tráfego</h2>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                            <div className="space-y-4 lg:col-span-1">
                                <TrafficCard title="TRÁFEGO PAGO" leads={kpis?.paid_leads || 0} checkins={kpis?.paid_checkins || 0} icon={FaBullhorn} onClick={() => handleNavigate('paid')} rateColor="text-[#3b82f6]" totalLeads={kpis?.total_leads || 0} />
                                <TrafficCard title="ORGÂNICO" leads={kpis?.organic_leads || 0} checkins={kpis?.organic_checkins || 0} icon={FaLeaf} onClick={() => handleNavigate('organic')} rateColor="text-[#22c55e]" totalLeads={kpis?.total_leads || 0} />
                                <TrafficCard title="NÃO TRAQUEADO" leads={kpis?.untracked_leads || 0} checkins={kpis?.untracked_checkins || 0} icon={FaQuestionCircle} onClick={() => handleNavigate('untracked')} rateColor="text-[#a855f7]" totalLeads={kpis?.total_leads || 0} />
                            </div>
                            <div className="lg:col-span-2">
                                <TrafficDonutChart data={chartData} />
                            </div>
                        </div>
                    </section>
                </main>
            )}
        </div>
    );
}