//\src\app\dashboard-traqueamento\detalhe-pago\page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { FaSpinner, FaChevronLeft, FaBullhorn, FaChartBar, FaBullseye, FaCalendarDay } from "react-icons/fa";
import toast, { Toaster } from 'react-hot-toast';
import dynamic from 'next/dynamic';

const OrganicTrafficBarChart = dynamic(
    () => import('@/components/charts/OrganicTrafficBarChart'),
    {
        ssr: false,
        loading: () => <div className="w-full h-[35rem] flex justify-center items-center bg-[#2a3a5a] rounded-lg"><FaSpinner className="animate-spin text-[#6ce5e8] text-3xl"/></div>
    }
);

type ContentData = {
    utm_content: string;
    total_leads: number;
};

function DetalhePagoContent() {
    const supabase = createClient();
    const searchParams = useSearchParams();
    const router = useRouter();
    
    const launchId = searchParams.get('launchId');
    const launchName = searchParams.get('launchName');

    const [data, setData] = useState<ContentData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async (id: string) => {
        setIsLoading(true);
        try {
            const { data: result, error } = await supabase.rpc('get_paid_traffic_by_content', { p_launch_id: id });
            if (error) throw error;
            setData(result || []);
        } catch (err: any) {
            toast.error("Falha ao carregar detalhes do tráfego pago.");
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

    const totalPaidLeads = useMemo(() => data.reduce((sum, item) => sum + item.total_leads, 0), [data]);
    const chartData = useMemo(() => data.map(item => ({
        utm_medium: item.utm_content,
        total_leads: item.total_leads,
        total_checkins: 0,
    })), [data]);

    const contentHeight = '35rem';

    return (
        <div className="bg-[#1e2b41] min-h-screen text-white p-4 sm:p-6 lg:p-8">
            <Toaster position="top-center" toastOptions={{ style: { background: '#2a3a5a', color: '#ffffff' }, error: { iconTheme: { primary: '#f43f5e', secondary: '#ffffff' } } }}/>
            
            <header className="flex items-center gap-6 mb-8">
                <button 
                    onClick={() => router.back()} 
                    className="flex-shrink-0 flex items-center gap-2 bg-[#2a3a5a] text-slate-200 font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-slate-700 hover:text-white transition-all duration-200"
                >
                    <FaChevronLeft size={14} />
                    Voltar
                </button>
                <div>
                    <p className="text-sm text-slate-400 uppercase tracking-wider">Análise de Tráfego Pago</p>
                    <h1 className="text-3xl font-bold text-white">{launchName || 'Detalhes'}</h1>
                </div>
            </header>

            {isLoading ? (
                <div className="flex justify-center items-center h-96"> <FaSpinner className="animate-spin text-[#6ce5e8] text-5xl" /> </div>
            ) : (
                <>
                    <div className="flex flex-wrap items-center justify-between gap-6 mb-8">
                        <div className="bg-[#2a3a5a] p-6 rounded-lg shadow-lg flex items-center gap-4 w-96">
                            <FaBullhorn className="text-yellow-400" size={32} />
                            <div>
                                <p className="text-lg text-slate-300">Total de Leads Pagos</p>
                                <p className="text-4xl font-bold text-[#6ce5e8]">{totalPaidLeads.toLocaleString('pt-BR')}</p>
                            </div>
                        </div>

                        <nav className="flex flex-wrap items-center gap-4">
                            <button onClick={() => router.push(`/dashboard-traqueamento/detalhe-pago/score?launchId=${launchId}&launchName=${launchName}`)} className="flex w-48 justify-center items-center gap-3 bg-[#2a3a5a]/80 border border-slate-600 text-slate-200 font-bold text-lg px-4 py-4 rounded-lg hover:bg-slate-700 hover:text-white transition-all duration-200">
                                <FaBullseye /> SCORE
                            </button>
                            <button onClick={() => router.push(`/dashboard-traqueamento/detalhe-pago/mql?launchId=${launchId}&launchName=${launchName}`)} className="flex w-48 justify-center items-center gap-3 bg-[#2a3a5a]/80 border border-slate-600 text-slate-200 font-bold text-lg px-4 py-4 rounded-lg hover:bg-slate-700 hover:text-white transition-all duration-200">
                                <FaChartBar /> MQL
                            </button>
                            <button onClick={() => router.push(`/dashboard-traqueamento/detalhe-pago/mov-diario?launchId=${launchId}&launchName=${launchName}`)} className="flex w-48 justify-center items-center gap-3 bg-[#2a3a5a]/80 border border-slate-600 text-slate-200 font-bold text-lg px-4 py-4 rounded-lg hover:bg-slate-700 hover:text-white transition-all duration-200">
                                <FaCalendarDay /> Mov. Diário
    </button>
                        </nav>
                    </div>

                    <main className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                        <div className="lg:col-span-2 bg-[#2a3a5a] p-4 rounded-lg shadow-lg overflow-y-auto" style={{ height: contentHeight }}>
                            <table className="w-full text-left">
                                <thead className="sticky top-0 bg-[#2a3a5a]">
                                    <tr className="border-b border-slate-600">
                                        <th className="p-3 text-sm font-semibold text-slate-300 uppercase">UTM Content</th>
                                        <th className="p-3 text-sm font-semibold text-slate-300 uppercase text-right">Leads</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map(item => (
                                        <tr key={item.utm_content} className="border-b border-slate-700 hover:bg-slate-700/50">
                                            <td className="p-3 font-medium">{item.utm_content || '(not set)'}</td>
                                            <td className="p-3 text-right font-bold text-[#6ce5e8]">{item.total_leads.toLocaleString('pt-BR')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="lg:col-span-3">
                            <OrganicTrafficBarChart data={chartData} height={contentHeight} />
                        </div>
                    </main>
                </>
            )}
        </div>
    );
}

export default function DetalhePagoPage() {
    return (
        <Suspense fallback={<div className="bg-[#1e2b41] min-h-screen w-full flex justify-center items-center"><FaSpinner className="animate-spin text-[#6ce5e8] text-5xl" /></div>}>
            <DetalhePagoContent />
        </Suspense>
    );
}