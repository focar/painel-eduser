// =================================================================
// ARQUIVO: app/dashboard-analise-compradores/page.tsx
// VERSÃO FINAL CORRIGIDA: Remove a tipagem genérica redundante do RPC.
// =================================================================
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
// A importação deve corresponder ao nome do ficheiro que criámos
import { Database } from '@/types/database'; 

// --- TIPAGEM DOS DADOS ---
type Lancamento = {
  id: string;
  nome: string;
  status: string | null;
};

// Estes tipos vêm da nossa função SQL, o TypeScript irá inferi-los
// mas mantê-los aqui pode ajudar na clareza do código.
type Kpis = Database['public']['Functions']['get_analise_compradores_dashboard']['Returns']['kpis'];
type RespostaAgregada = Database['public']['Functions']['get_analise_compradores_dashboard']['Returns']['respostas'][number];

type ScoreTier = 
  | 'Nível I (90+)' | 'Nível II (80-89)' | 'Nível III (70-79)' | 'Nível IV (60-69)'
  | 'Nível V (50-59)' | 'Nível VI (40-49)' | 'Nível VII (30-39)' | 'Nível VIII (<30)';


// --- COMPONENTE DA PÁGINA ---
export default function AnaliseCompradoresPage() {
  const [supabase] = useState(() => createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ));

  // --- ESTADOS (STATES) ---
  const [loading, setLoading] = useState(true);
  const [loadingRespostas, setLoadingRespostas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [selectedLancamentoId, setSelectedLancamentoId] = useState<string | null>(null);
  
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [respostas, setRespostas] = useState<RespostaAgregada[]>([]);
  const [activeScoreFilter, setActiveScoreFilter] = useState<ScoreTier | 'todos'>('todos');

  // --- EFEITO PARA BUSCAR OS LANÇAMENTOS (RODA UMA VEZ) ---
  useEffect(() => {
    async function fetchLancamentos() {
      const { data, error } = await supabase.rpc('get_lancamentos_ordenados');
      
      if (error) {
        console.error('Erro ao buscar lançamentos:', error);
        setError('Não foi possível carregar a lista de lançamentos.');
        setLoading(false);
        return;
      }
      
      setLancamentos(data as Lancamento[] || []);
      if (data && data.length > 0) {
        setSelectedLancamentoId(data[0].id);
      } else {
        setLoading(false);
      }
    }
    fetchLancamentos();
  }, [supabase]);

  // --- EFEITO PARA BUSCAR DADOS DO DASHBOARD ---
  // Roda quando o lançamento ou o filtro de score mudam
  useEffect(() => {
    if (!selectedLancamentoId) return;

    async function getDashboardData() {
      if (activeScoreFilter === 'todos') {
          setLoading(true);
      } else {
          setLoadingRespostas(true);
      }
      setError(null);

      // --- CORREÇÃO APLICADA AQUI ---
      // Removemos o <DashboardData> pois o cliente Supabase já sabe o tipo de retorno
      const { data, error } = await supabase.rpc('get_analise_compradores_dashboard', {
        p_launch_id: selectedLancamentoId!,
        p_score_tier: activeScoreFilter,
      });

      if (error) {
        console.error('Erro ao chamar a função RPC:', error);
        setError('Não foi possível carregar os dados do dashboard.');
        setKpis(null);
        setRespostas([]);
      } else if (data) {
        if (activeScoreFilter === 'todos') {
            setKpis(data.kpis);
        }
        setRespostas(data.respostas);
      }

      setLoading(false);
      setLoadingRespostas(false);
    }
    getDashboardData();
  }, [selectedLancamentoId, activeScoreFilter, supabase]);

  const handleScoreFilterClick = useCallback((tier: ScoreTier) => {
    setActiveScoreFilter(prev => (prev === tier ? 'todos' : tier));
  }, []);
  
  const handleLancamentoChange = (lancamentoId: string) => {
    setActiveScoreFilter('todos');
    setSelectedLancamentoId(lancamentoId);
  };


  // --- RENDERIZAÇÃO ---
  const renderContent = () => {
    if (loading) {
      return <div className="text-center text-slate-300 my-4">A carregar dados...</div>;
    }
    if (error) {
      return <div className="text-center text-red-400 bg-red-900/20 p-4 rounded-lg my-4">{error}</div>;
    }
    if (!kpis || kpis.total_compradores === 0) {
      return <div className="text-center text-yellow-400 bg-slate-800 p-6 rounded-lg">Nenhum comprador encontrado para este lançamento.</div>;
    }
    
    const scoreCardsData = [
      { title: 'Nível I (90+)', count: kpis.score_tier_i },
      { title: 'Nível II (80-89)', count: kpis.score_tier_ii },
      { title: 'Nível III (70-79)', count: kpis.score_tier_iii },
      { title: 'Nível IV (60-69)', count: kpis.score_tier_iv },
      { title: 'Nível V (50-59)', count: kpis.score_tier_v },
      { title: 'Nível VI (40-49)', count: kpis.score_tier_vi },
      { title: 'Nível VII (30-39)', count: kpis.score_tier_vii },
      { title: 'Nível VIII (<30)', count: kpis.score_tier_viii },
    ];

    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <KpiCard title="Total de Compradores" value={kpis.total_compradores.toLocaleString('pt-BR')} icon={<span>👥</span>} />
          <KpiCard title="Check-ins de Compradores" value={kpis.total_checkins.toLocaleString('pt-BR')} icon={<span>✅</span>} />
          <KpiCard title="Taxa de Check-in" value={`${(kpis.total_compradores > 0 ? (kpis.total_checkins / kpis.total_compradores) * 100 : 0).toFixed(1)}%`} icon={<div className="text-xl font-bold text-indigo-400">%</div>} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-6 mb-8">
          {scoreCardsData.map(({ title, count }) => (
            <ScoreCard
              key={title}
              title={title as ScoreTier}
              count={count}
              total={kpis.total_compradores}
              color={getScoreColor(title as ScoreTier)}
              isActive={activeScoreFilter === title}
              onClick={() => handleScoreFilterClick(title as ScoreTier)}
            />
          ))}
        </div>
        <h2 className="text-2xl font-bold text-slate-100 mb-4 mt-10">Respostas dos Compradores</h2>
        <div className={`relative grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 ${loadingRespostas ? 'opacity-50' : ''}`}>
          {loadingRespostas && <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 z-10"><p>A filtrar respostas...</p></div>}
          {respostas.length > 0 ? (
            respostas.map(({ pergunta, respostas }) => (
              <RespostasGrafico key={pergunta} pergunta={pergunta} respostas={respostas} />
            ))
          ) : (
            <div className="col-span-full text-center text-slate-400 bg-slate-800 p-6 rounded-lg">
              Nenhuma resposta encontrada para o filtro selecionado.
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-slate-900 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Análise de Perfil de Compradores</h1>
          <p className="text-slate-400">Classificação de compradores por faixas de pontuação para análise e calibração.</p>
        </div>
        <select
          value={selectedLancamentoId || ''}
          onChange={(e) => handleLancamentoChange(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg p-2"
          disabled={lancamentos.length === 0}
        >
          {lancamentos.map(l => (
            <option key={l.id} value={l.id}>
              {l.nome} {l.status ? `(${l.status})` : ''}
            </option>
          ))}
        </select>
      </div>
      {renderContent()}
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

function ScoreCard({ title, count, total, color, isActive, onClick }: { title: ScoreTier; count: number; total: number; color: string; isActive: boolean; onClick: () => void; }) {
  const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
  const activeClasses = isActive ? 'ring-2 ring-offset-2 ring-offset-slate-900 ring-cyan-400' : 'border-slate-700';
  
  return (
    <div 
      className={`bg-slate-800 p-5 rounded-lg border relative overflow-hidden cursor-pointer transition-all duration-200 hover:border-slate-500 ${activeClasses}`}
      onClick={onClick}
    >
      <div className={`absolute top-0 left-0 h-1 w-full ${color}`}></div>
      <p className="font-bold text-slate-300 mt-2 text-sm">{title}</p>
      <p className="text-4xl font-bold text-slate-100 mt-2">{count.toLocaleString('pt-BR')}</p>
      <p className="text-sm text-slate-400 mt-1">{percentage}% do total</p>
    </div>
  );
}

function RespostasGrafico({ pergunta, respostas }: { pergunta: string; respostas: any }) {
    const totalRespostas = Object.values(respostas as {[key: string]: number}).reduce((sum, count) => sum + count, 0);
    const sortedRespostas = Object.entries(respostas as {[key: string]: number}).sort(([, countA], [, countB]) => countB - countA);

    return (
        <div className="bg-slate-800 p-5 rounded-lg border border-slate-700">
            <h3 className="text-md font-bold text-slate-200 mb-4">{pergunta}</h3>
            <div className="space-y-3">
                {sortedRespostas.map(([texto, count]) => (
                    <BarraResposta key={texto} texto={texto} count={count} total={totalRespostas} />
                ))}
            </div>
        </div>
    );
}

function BarraResposta({ texto, count, total }: { texto: string; count: number; total: number }) {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    return (
        <div>
            <div className="flex justify-between items-center text-sm mb-1">
                <span className="text-slate-300">{texto}</span>
                <span className="text-slate-400 font-semibold">{count.toLocaleString('pt-BR')} ({percentage.toFixed(1)}%)</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2.5">
                <div 
                    className="bg-cyan-500 h-2.5 rounded-full" 
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
}

function getScoreColor(tier: ScoreTier): string {
    const colors: Record<ScoreTier, string> = {
        'Nível I (90+)': "bg-red-600",
        'Nível II (80-89)': "bg-red-500",
        'Nível III (70-79)': "bg-orange-500",
        'Nível IV (60-69)': "bg-amber-500",
        'Nível V (50-59)': "bg-yellow-400",
        'Nível VI (40-49)': "bg-sky-400",
        'Nível VII (30-39)': "bg-blue-500",
        'Nível VIII (<30)': "bg-blue-600",
    };
    return colors[tier];
}