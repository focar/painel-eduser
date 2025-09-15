// src/app/dashboard-traqueamento/detalhe-pago/score/page.tsx
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { FaSpinner, FaChevronLeft, FaThermometerFull, FaThermometerThreeQuarters, FaThermometerHalf, FaThermometerQuarter, FaThermometerEmpty } from 'react-icons/fa';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- Tipos e Configs (sem alteração) ---
type ScoreCategory = 'quente' | 'quente_morno' | 'morno' | 'morno_frio' | 'frio';
type BreakdownData = { name: string; value: number; };
type ScoreData = {
  totals: Record<ScoreCategory, number>;
  breakdowns: Record<ScoreCategory, BreakdownData[]>;
};
const SCORE_CONFIG: Record<ScoreCategory, { title: string; range: string; icon: React.ElementType; color: string }> = {
  quente: { title: "Quente", range: "(80+)", icon: FaThermometerFull, color: "text-red-500" },
  quente_morno: { title: "Quente-Morno", range: "(65-79)", icon: FaThermometerThreeQuarters, color: "text-orange-500" },
  morno: { title: "Morno", range: "(50-64)", icon: FaThermometerHalf, color: "text-yellow-500" },
  morno_frio: { title: "Morno-Frio", range: "(35-49)", icon: FaThermometerQuarter, color: "text-sky-500" },
  frio: { title: "Frio", range: "(1-34)", icon: FaThermometerEmpty, color: "text-blue-500" },
};
const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#da84d8', '#82ca9d', '#ffc658', '#a4de6c', '#d0ed57'];


// ✅ --- FUNÇÃO AUXILIAR PARA LIMITAR OS DADOS DO GRÁFICO (AGORA COM LIMITE 15) ---
function summarizeChartData(data: BreakdownData[] | undefined, limit = 15): BreakdownData[] {
    if (!data || data.length <= limit + 1) return data || [];
    const sortedData = [...data].sort((a, b) => b.value - a.value);
    const topItems = sortedData.slice(0, limit);
    const otherItems = sortedData.slice(limit);
    if (otherItems.length > 0) {
        const othersSum = otherItems.reduce((sum, item) => sum + item.value, 0);
        topItems.push({ name: 'Outros', value: othersSum });
    }
    return topItems;
}


// --- Componente do Gráfico de Rosca (ATUALIZADO) ---
const ScoreBreakdownChart = ({ title, data }: { title: string; data: BreakdownData[] | undefined }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-[#2a3a5a] p-6 rounded-lg shadow-lg flex flex-col items-center justify-center min-h-[450px]">
        <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
        <p className="text-slate-400">Nenhum dado para exibir.</p>
      </div>
    );
  }
  return (
    <div className="bg-[#2a3a5a] p-4 rounded-lg shadow-lg">
      <h3 className="text-xl font-bold text-white text-center mb-2">{title}</h3>
      {/* ✅ ALTURA DO GRÁFICO AUMENTADA PARA 400PX */}
      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value" nameKey="name">
            {data.map((entry, index) => (<Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />))}
          </Pie>
          <Tooltip contentStyle={{ backgroundColor: '#1e2b41', border: '1px solid #4a5b71' }} labelStyle={{ color: '#ffffff' }} />
          <Legend wrapperStyle={{ color: '#ffffff', paddingTop: '20px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// --- Componente Principal da Página ---
function ScorePageContent() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const launchId = searchParams.get('launchId');
  const launchName = searchParams.get('launchName');

  const [data, setData] = useState<ScoreData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const { data: result, error } = await supabase.rpc('get_paid_score_breakdown_by_content', { p_launch_id: id });
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
          <p className="text-sm text-slate-400 uppercase tracking-wider">Análise de Score - Tráfego Pago</p>
          <h1 className="text-3xl font-bold text-white">{launchName || 'Score'}</h1>
        </div>
      </header>

      {isLoading ? (
        <div className="flex justify-center items-center h-96"><FaSpinner className="animate-spin text-[#6ce5e8] text-5xl" /></div>
      ) : (
        <main>
          <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-10">
            {(Object.keys(SCORE_CONFIG) as ScoreCategory[]).map(key => {
              const config = SCORE_CONFIG[key];
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

          {/* ✅ LAYOUT ATUALIZADO PARA TORNAR OS CARDS RETANGULARES */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             {(Object.keys(SCORE_CONFIG) as ScoreCategory[]).map(key => (
                <ScoreBreakdownChart
                  key={key}
                  title={`${SCORE_CONFIG[key].title} ${SCORE_CONFIG[key].range}`}
                  data={summarizeChartData(data?.breakdowns?.[key])}
                />
            ))}
          </section>
        </main>
      )}
    </div>
  );
}

export default function ScorePage() {
    return (
        <Suspense fallback={<div className="bg-[#1e2b41] min-h-screen w-full flex justify-center items-center"><FaSpinner className="animate-spin text-[#6ce5e8] text-5xl" /></div>}>
            <ScorePageContent />
        </Suspense>
    );
}