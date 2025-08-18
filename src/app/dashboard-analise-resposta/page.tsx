// =================================================================
// ARQUIVO: app/dashboard/analise-compradores/page.tsx
// Versão Definitiva: Utiliza o cliente Supabase correto para Next.js,
// que lê as chaves das variáveis de ambiente automaticamente.
// =================================================================
'use client';

import { useState, useEffect } from 'react';
// CORREÇÃO: Utiliza a biblioteca oficial do Supabase para Next.js
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// --- TIPAGENS ---
type Launch = {
  id: string;
  nome: string;
};

type DashboardStats = {
  total_compradores: number;
  total_checkins_compradores: number;
  score_tier_i: number;
  score_tier_ii: number;
  score_tier_iii: number;
  score_tier_iv: number;
  score_tier_v: number;
  score_tier_vi: number;
  score_tier_vii: number;
  score_tier_viii: number;
};

// --- COMPONENTE DA PÁGINA ---
export default function AnaliseCompradoresPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [selectedLaunchId, setSelectedLaunchId] = useState<string>('all');

  // Esta é a forma correta de inicializar o cliente Supabase num Client Component.
  // Ele irá usar automaticamente as suas variáveis de ambiente.
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function getLaunches() {
      const { data, error } = await supabase
        .from('lancamentos')
        .select('id, nome')
        .in('status', ['Em Andamento', 'Concluido'])
        .order('status', { ascending: true })
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Erro ao buscar lançamentos:", error);
      } else {
        setLaunches(data);
      }
    }
    getLaunches();
  }, [supabase]);

  useEffect(() => {
    async function getStats() {
      setLoading(true);
      
      const params = {
        p_launch_id: selectedLaunchId === 'all' ? null : selectedLaunchId
      };

      const { data, error } = await supabase.rpc('get_dashboard_compradores_stats', params);

      if (error) {
        console.error('Erro ao buscar estatísticas:', error);
        alert("Não foi possível carregar os dados do dashboard.");
      } else {
        setStats(data);
      }
      setLoading(false);
    }

    if (supabase) {
        getStats();
    }
  }, [selectedLaunchId, supabase]);

  const taxaCheckin = stats && stats.total_compradores > 0
    ? ((stats.total_checkins_compradores / stats.total_compradores) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-slate-900 min-h-screen">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Análise de Perfil de Compradores</h1>
          <p className="text-slate-400 mt-1">Filtre por lançamento para analisar os dados de compradores.</p>
        </div>
        <select 
          value={selectedLaunchId}
          onChange={(e) => setSelectedLaunchId(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full sm:w-auto p-2.5"
        >
          <option value="all">Todos os Lançamentos</option>
          {launches.map(launch => (
            <option key={launch.id} value={launch.id}>{launch.nome}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center text-slate-300">A carregar dados...</div>
      ) : !stats ? (
        <div className="text-center text-red-400">Não foi possível carregar os dados.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <KpiCard title="Total de Compradores" value={stats.total_compradores.toLocaleString('pt-BR')} icon={<IconPlaceholder>👥</IconPlaceholder>} />
            <KpiCard title="Check-ins de Compradores" value={stats.total_checkins_compradores.toLocaleString('pt-BR')} icon={<IconPlaceholder>✅</IconPlaceholder>} />
            <KpiCard title="Taxa de Check-in" value={`${taxaCheckin}%`} icon={<div className="text-xl font-bold text-indigo-400">%</div>} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-6">
            <ScoreCard title="Nível I (90+)" count={stats.score_tier_i} total={stats.total_checkins_compradores} color="bg-red-600" />
            <ScoreCard title="Nível II (80-89)" count={stats.score_tier_ii} total={stats.total_checkins_compradores} color="bg-red-500" />
            <ScoreCard title="Nível III (70-79)" count={stats.score_tier_iii} total={stats.total_checkins_compradores} color="bg-orange-500" />
            <ScoreCard title="Nível IV (60-69)" count={stats.score_tier_iv} total={stats.total_checkins_compradores} color="bg-amber-500" />
            <ScoreCard title="Nível V (50-59)" count={stats.score_tier_v} total={stats.total_checkins_compradores} color="bg-yellow-400" />
            <ScoreCard title="Nível VI (40-49)" count={stats.score_tier_vi} total={stats.total_checkins_compradores} color="bg-sky-400" />
            <ScoreCard title="Nível VII (30-39)" count={stats.score_tier_vii} total={stats.total_checkins_compradores} color="bg-blue-500" />
            <ScoreCard title="Nível VIII (<30)" count={stats.score_tier_viii} total={stats.total_checkins_compradores} color="bg-blue-600" />
          </div>
        </>
      )}
    </div>
  );
}

// --- COMPONENTES AUXILIARES (sem alterações) ---
function KpiCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-400">{title}</p>
        <p className="text-3xl font-bold text-slate-100 mt-1">{value}</p>
      </div>
      <div className="text-3xl text-slate-500">{icon}</div>
    </div>
  );
}
function ScoreCard({ title, count, total, color }: { title: string; count: number; total: number; color: string }) {
  const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
  return (
    <div className={`bg-slate-800 p-5 rounded-lg border border-slate-700 relative overflow-hidden`}>
      <div className={`absolute top-0 left-0 h-1 w-full ${color}`}></div>
      <p className="font-bold text-slate-300 mt-2">{title}</p>
      <p className="text-4xl font-bold text-slate-100 mt-2">{count.toLocaleString('pt-BR')}</p>
      <p className="text-sm text-slate-400 mt-1">{percentage}% do total</p>
    </div>
  );
}
function IconPlaceholder({ children }: { children: React.ReactNode }) {
    return <span role="img" aria-label="icon">{children}</span>;
}
