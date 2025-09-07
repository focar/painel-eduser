// src/app/dashboard-traqueamento/detalhe-organico/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { FaSpinner, FaChevronLeft, FaLeaf, FaChartBar, FaBullseye, FaCalendarDay } from "react-icons/fa";
import toast, { Toaster } from 'react-hot-toast';
import dynamic from 'next/dynamic';

const OrganicTrafficBarChart = dynamic(
    () => import('@/components/charts/OrganicTrafficBarChart'),
    {
        ssr: false,
        loading: () => <div className="w-full h-[35rem] flex justify-center items-center bg-[#2a3a5a] rounded-lg"><FaSpinner className="animate-spin text-[#6ce5e8] text-3xl"/></div>
    }
);

type MediumData = {
    utm_medium: string;
    total_leads: number;
};

// Função DetalheOrganicoContent ATUALIZADA

function DetalheOrganicoContent() {
    const supabase = createClient();
    const searchParams = useSearchParams();
    const router = useRouter();
    
    const launchId = searchParams.get('launchId');
    const launchName = searchParams.get('launchName');

    const [data, setData] = useState<MediumData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async (id: string) => {
        setIsLoading(true);
        try {
            const { data: result, error } = await supabase.rpc('get_organic_traffic_by_medium', { p_launch_id: id });
            if (error) throw error;
            setData(result || []);
        } catch (err: any) {
            toast.error("Falha ao carregar detalhes do tráfego orgânico.");
            console.error("Erro ao chamar RPC:", err.message);
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        if (launchId) {
            fetchData(launchId);
        } else {
            router.push('/dashboard-traqueamento');
        }
    }, [launchId, fetchData, router]);

    const totalOrganicLeads = useMemo(() => data.reduce((sum, item) => sum + item.total_leads, 0), [data]);
    const chartData = useMemo(() => data, [data]);

    const contentHeight = '35rem';

    return (
        <div className="bg-[#1e2b41] min-h-screen text-white p-4 sm:p-6 lg:p-8">
            <Toaster position="top-center" toastOptions={{ style: { background: '#2a3a5a', color: '#ffffff' }, error: { iconTheme: { primary: '#f43f5e', secondary: '#ffffff' } } }}/>
            
            {/* ✅ AJUSTE 1: Header com o botão 'Voltar' no início */}
            <header className="flex items-center gap-6 mb-8">
                <button 
                    onClick={() => router.back()} 
                    className="flex items-center gap-2 bg-[#2a3a5a] text-slate-200 font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-slate-700 hover:text-white transition-all duration-200 flex-shrink-0"
                >
                    <FaChevronLeft size={14} />
                    Voltar
                </button>
                <div>
                    <p className="text-sm text-slate-400 uppercase tracking-wider">Análise de Tráfego Orgânico</p>
                    <h1 className="text-3xl font-bold text-white">{launchName || 'Detalhes'}</h1>
                </div>
            </header>

            {isLoading ? (
                <div className="flex justify-center items-center h-96"> <FaSpinner className="animate-spin text-[#6ce5e8] text-5xl" /> </div>
            ) : (
                <>
                    {/* ✅ AJUSTE 2: Novo container flex para alinhar o card de total e a navegação */}
                    <div className="flex flex-wrap items-center justify-between gap-6 mb-8">
                        {/* Item da Esquerda: Card de Total */}
                        <div className="bg-[#2a3a5a] p-6 rounded-lg shadow-lg flex items-center gap-4 w-98">
                            <FaLeaf className="text-green-400" size={32} />
                            <div>
                                <p className="text-lg text-slate-300">Total de Leads Orgânicos</p>
                                <p className="text-5xl font-bold text-[#6ce5e8]">{totalOrganicLeads.toLocaleString('pt-BR')}</p>
                            </div>
                        </div>

                        {/* Item da Direita: Navegação */}
                        <nav className="flex flex-wrap items-center gap-4">
                            <button onClick={() => router.push(`/dashboard-traqueamento/detalhe-organico/score?launchId=${launchId}&launchName=${launchName}`)}
                                className="flex w-48 justify-center items-center gap-3 bg-[#2a3a5a]/80 border border-slate-600 text-slate-200 font-bold text-lg px-4 py-4 rounded-lg hover:bg-slate-700 hover:text-white transition-all duration-200">
                                <FaBullseye /> SCORE
                            </button>
                            <button onClick={() => router.push(`/dashboard-traqueamento/detalhe-organico/mql?launchId=${launchId}&launchName=${launchName}`)}
                                 className="flex w-48 justify-center items-center gap-3 bg-[#2a3a5a]/80 border border-slate-600 text-slate-200 font-bold text-lg px-4 py-4 rounded-lg hover:bg-slate-700 hover:text-white transition-all duration-200">
                                <FaChartBar /> MQL
                            </button>
                             <button onClick={() => router.push(`/dashboard-traqueamento/detalhe-organico/mov-diario?launchId=${launchId}&launchName=${launchName}`)} className="flex w-48 justify-center items-center gap-3 bg-[#2a3a5a]/80 border border-slate-600 text-slate-200 font-bold text-lg px-4 py-4 rounded-lg hover:bg-slate-700 hover:text-white transition-all duration-200">
                                <FaCalendarDay /> Mov. Diário
                            </button>
                        </nav>
                    </div>

                    <main className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                        {/* Coluna da Esquerda: Tabela */}
                        <div className="lg:col-span-2 bg-[#2a3a5a] p-4 rounded-lg shadow-lg overflow-y-auto" style={{ height: contentHeight }}>
                            <table className="w-full text-left">
                                <thead className="sticky top-0 bg-[#2a3a5a]">
                                    <tr className="border-b border-slate-600">
                                        <th className="p-3 text-sm font-semibold text-slate-300 uppercase">UTM Medium</th>
                                        <th className="p-3 text-sm font-semibold text-slate-300 uppercase text-right">Leads</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map(item => (
                                        <tr key={item.utm_medium} className="border-b border-slate-700 hover:bg-slate-700/50">
                                            <td className="p-3 font-medium">{item.utm_medium || '(not set)'}</td>
                                            <td className="p-3 text-right font-bold text-[#6ce5e8]">{item.total_leads.toLocaleString('pt-BR')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Coluna da Direita: Gráfico */}
                        <div className="lg:col-span-3">
                            <OrganicTrafficBarChart data={chartData} height={contentHeight} />
                        </div>
                    </main>
                </>
            )}
        </div>
    );
}

// O componente principal com Suspense permanece o mesmo
export default function DetalheOrganicoPage() {
    const fallbackUI = (
        <div className="bg-[#1e2b41] min-h-screen w-full flex justify-center items-center">
            <FaSpinner className="animate-spin text-[#6ce5e8] text-5xl" />
        </div>
    );

    return (
        <Suspense fallback={fallbackUI}>
            <DetalheOrganicoContent />
        </Suspense>
    );
}