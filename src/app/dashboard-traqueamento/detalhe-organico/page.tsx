// src/app/dashboard-traqueamento/detalhe-organico/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { FaSpinner, FaChevronLeft, FaLeaf } from "react-icons/fa";
import toast, { Toaster } from 'react-hot-toast';
import dynamic from 'next/dynamic';

// A importação dinâmica continua aqui, mas não vamos usar o componente por enquanto.
const OrganicTrafficBarChart = dynamic(
    () => import('@/components/charts/OrganicTrafficBarChart'),
    {
        ssr: false,
        loading: () => <div className="w-full h-96 flex justify-center items-center bg-[#2a3a5a] rounded-lg"><FaSpinner className="animate-spin text-[#6ce5e8] text-3xl"/></div>
    }
);

// Tipos de Dados
type MediumData = {
    utm_medium: string;
    total_leads: number;
    total_checkins: number;
};

// Componente interno com a lógica da página
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
            console.error(err);
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

    return (
        <div className="bg-[#1e2b41] min-h-screen text-white p-4 sm:p-6 lg:p-8">
            <Toaster position="top-center" toastOptions={{ style: { background: '#2a3a5a', color: '#ffffff' }, error: { iconTheme: { primary: '#f43f5e', secondary: '#ffffff' } } }}/>
            
            <header className="flex items-center gap-4 mb-8">
                <button onClick={() => router.back()} className="text-slate-300 hover:text-white transition-colors p-2 rounded-full hover:bg-slate-700/50">
                    <FaChevronLeft size={20} />
                </button>
                <div>
                    <p className="text-sm text-slate-400 uppercase tracking-wider">Tráfego Orgânico</p>
                    <h1 className="text-3xl font-bold text-white">{launchName || 'Detalhes'}</h1>
                </div>
            </header>

            {isLoading ? (
                <div className="flex justify-center items-center h-96"> <FaSpinner className="animate-spin text-[#6ce5e8] text-5xl" /> </div>
            ) : (
                <main className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* Coluna da Esquerda: Totais e Tabela */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="bg-[#2a3a5a] p-6 rounded-lg shadow-lg flex items-center gap-4">
                            <FaLeaf className="text-green-400" size={32} />
                            <div>
                                <p className="text-lg text-slate-300">Total de Leads Orgânicos</p>
                                <p className="text-4xl font-bold text-[#6ce5e8]">{totalOrganicLeads.toLocaleString('pt-BR')}</p>
                            </div>
                        </div>
                        <div className="bg-[#2a3a5a] p-4 rounded-lg shadow-lg max-h-[60vh] overflow-y-auto">
                            <table className="w-full text-left">
                                <thead>
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
                    </div>

                    {/* Coluna da Direita: Gráfico de Barras */}
                    <div className="lg:col-span-2">
                        {/* --- ALTERAÇÃO PARA TESTE: O Gráfico está comentado --- */}
                        {/* <OrganicTrafficBarChart data={data} /> */}
                        
                        {/* --- E um aviso foi adicionado no lugar --- */}
                        <div className="w-full h-96 flex justify-center items-center bg-[#2a3a5a] rounded-lg">
                            <p className="text-slate-400">O gráfico está temporariamente desativado para teste.</p>
                        </div>
                    </div>
                </main>
            )}
        </div>
    );
}

// A página "Wrapper" com o Suspense continua igual.
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
