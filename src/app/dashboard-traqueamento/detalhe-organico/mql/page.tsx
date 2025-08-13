// src/app/dashboard-traqueamento/detalhe-organico/mql/page.tsx
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { FaSpinner, FaChevronLeft, FaAward, FaStar, FaRegStar, FaStarHalfAlt } from 'react-icons/fa';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- Tipos de Dados ---
type MqlCategory = 'A' | 'B' | 'C' | 'D';

type BreakdownData = {
  name: string; // utm_medium
  value: number; // lead_count
};

type MqlData = {
  totals: Record<MqlCategory, number>;
  breakdowns: Record<MqlCategory, BreakdownData[]>;
};

// --- Configuração das Categorias MQL ---
const MQL_CONFIG: Record<MqlCategory, { title: string; range: string; icon: React.ElementType; color: string }> = {
  A: { title: "Categoria A", range: "(20+)", icon: FaAward, color: "text-amber-400" },
  B: { title: "Categoria B", range: "(14-19)", icon: FaStar, color: "text-lime-400" },
  C: { title: "Categoria C", range: "(6-13)", icon: FaStarHalfAlt, color: "text-cyan-400" },
  D: { title: "Categoria D", range: "(1-5)", icon: FaRegStar, color: "text-slate-400" },
};

const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#da84d8'];

// --- Componente do Gráfico de Rosca (Reutilizado) ---
const MqlBreakdownChart = ({ title, data }: { title: string; data: BreakdownData[] | undefined }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-[#2a3a5a] p-6 rounded-lg shadow-lg flex flex-col items-center justify-center h-80">
        <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
        <p className="text-slate-400">Nenhum dado para exibir.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#2a3a5a] p-4 rounded-lg shadow-lg">
      <h3 className="text-xl font-bold text-white text-center mb-2">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value" nameKey="name">
            {data.map((entry, index) => (<Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />))}
          </Pie>
          <Tooltip contentStyle={{ backgroundColor: '#1e2b41', border: '1px solid #4a5b71' }} labelStyle={{ color: '#ffffff' }} />
          <Legend wrapperStyle={{ color: '#ffffff' }}/>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// --- Componente Principal da Página ---
function MqlPageContent() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const launchId = searchParams.get('launchId');
  const launchName = searchParams.get('launchName');

  const [data, setData] = useState<MqlData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const { data: result, error } = await supabase.rpc('get_organic_mql_breakdown_by_medium', { p_launch_id: id });
      if (error) throw error;
      setData(result);
    } catch (err) {
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

  return (
    <div className="bg-[#1e2b41] min-h-screen text-white p-4 sm:p-6 lg:p-8">
      <header className="flex items-center gap-6 mb-8">
        <button onClick={() => router.back()} className="flex items-center gap-2 bg-[#2a3a5a] text-slate-200 font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-slate-700">
          <FaChevronLeft size={14} /> Voltar
        </button>
        <div>
          <p className="text-sm text-slate-400 uppercase tracking-wider">Análise de MQL - Tráfego Orgânico</p>
          <h1 className="text-3xl font-bold text-white">{launchName || 'MQL'}</h1>
        </div>
      </header>

      {isLoading ? (
        <div className="flex justify-center items-center h-96"><FaSpinner className="animate-spin text-[#6ce5e8] text-5xl" /></div>
      ) : (
        <main>
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {(Object.keys(MQL_CONFIG) as MqlCategory[]).map(key => {
              const config = MQL_CONFIG[key];
              const total = data?.totals?.[key] ?? 0;
              return (
                <div key={key} className="bg-[#2a3a5a] p-5 rounded-lg shadow-lg flex items-center gap-4">
                  <config.icon className={`${config.color} text-4xl flex-shrink-0`} />
                  <div>
                    <h2 className="text-lg font-bold text-slate-200">{config.title}</h2>
                    <p className="text-3xl font-bold text-white">{total}</p>
                    <p className="text-sm text-slate-400">Total de Leads</p>
                  </div>
                </div>
              );
            })}
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
             {(Object.keys(MQL_CONFIG) as MqlCategory[]).map(key => (
                <MqlBreakdownChart
                  key={key}
                  title={`${MQL_CONFIG[key].title} ${MQL_CONFIG[key].range}`}
                  data={data?.breakdowns?.[key]}
                />
            ))}
          </section>
        </main>
      )}
    </div>
  );
}

export default function MqlPage() {
    return (
        <Suspense fallback={<div className="bg-[#1e2b41] min-h-screen w-full flex justify-center items-center"><FaSpinner className="animate-spin text-[#6ce5e8] text-5xl" /></div>}>
            <MqlPageContent />
        </Suspense>
    );
}