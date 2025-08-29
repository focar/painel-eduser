// =================================================================
// ARQUIVO: app/dashboard-analise-compradores/page.tsx
// VERSÃO FINAL: Funcionalidade de filtro interativo nos KPIs.
// DATA: 29 de Agosto de 2025
// CÓDIGO 100% CORRIGIDO
// =================================================================
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import toast, { Toaster } from 'react-hot-toast'; // Importação do Toaster adicionada
import { Database } from '@/types/database'; 
import { FaFileCsv, FaSpinner } from 'react-icons/fa';

// --- TIPAGEM DOS DADOS ---
type Launch = {
  id: string;
  nome: string;
  status: string | null;
};

type Kpis = {
  total_compradores: number;
  total_checkins: number;
  score_tier_i: number;
  score_tier_ii: number;
  score_tier_iii: number;
  score_tier_iv: number;
  score_tier_v: number;
  score_tier_vi: number;
  score_tier_vii: number;
  score_tier_viii: number;
};

type RespostaAgregada = {
  pergunta: string;
  respostas: Record<string, number>; 
};

type DashboardReturnType = {
  kpis: Kpis;
  respostas: RespostaAgregada[];
};

type ScoreTier = 
  | 'Nível I (90+)' | 'Nível II (80-89)' | 'Nível III (70-79)' | 'Nível IV (60-69)'
  | 'Nível V (50-59)' | 'Nível VI (40-49)' | 'Nível VII (30-39)' | 'Nível VIII (<30)';


// --- COMPONENTE DA PÁGINA ---
export default function AnaliseCompradoresPage() {
  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ));

  // --- ESTADOS (STATES) ---
  const [loading, setLoading] = useState(true);
  const [loadingRespostas, setLoadingRespostas] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [selectedLancamentoId, setSelectedLancamentoId] = useState<string | null>(null);
  
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [respostas, setRespostas] = useState<RespostaAgregada[]>([]);
  const [activeScoreFilter, setActiveScoreFilter] = useState<ScoreTier | 'todos'>('todos');
  
  // ======================= INÍCIO DA CORREÇÃO PRINCIPAL =======================
  // O tipo agora inclui 'buyers' como uma opção válida.
  const [activeBuyerFilter, setActiveBuyerFilter] = useState<'todos' | 'com_checkin' | 'buyers'>('com_checkin');
  // ======================== FIM DA CORREÇÃO PRINCIPAL =========================

// CÓDIGO CORRIGIDO PARA O USEEFFECT
  useEffect(() => {
    async function fetchLancamentos() {
      // 1. Fazemos a chamada normal, sem tipos aqui.
      const { data, error } = await supabase.rpc('get_lancamentos_permitidos');
      
      if (error) {
        toast.error('Erro ao buscar lançamentos.');
        console.error('Erro ao buscar lançamentos:', error);
        setError('Não foi possível carregar a lista de lançamentos.');
        setLoading(false);
        return;
      }
      
      if (data) {
        // 2. Aplicamos o tipo aqui, de forma explícita.
        const launchesData: Launch[] = data;
        
        setLaunches(launchesData);

        if (launchesData.length > 0) {
            const inProgress = launchesData.find(l => l.status === 'Em Andamento');
            setSelectedLancamentoId(inProgress ? inProgress.id : launchesData[0].id);
        } else {
            setLoading(false);
        }
      }
    }
    fetchLancamentos();
  }, [supabase]);

  // --- EFEITO PARA BUSCAR DADOS DO DASHBOARD (ATUALIZADO) ---
  useEffect(() => {
    if (!selectedLancamentoId) return;

    async function getDashboardData() {
      if (activeScoreFilter === 'todos') {
          setLoading(true);
      } else {
          setLoadingRespostas(true);
      }
      setError(null);

      // A chamada RPC agora envia o valor booleano correto
      const { data, error } = await supabase.rpc('get_compradores_dashboard_v2', {
        p_launch_id: selectedLancamentoId, 
        p_score_tier: activeScoreFilter,
        p_buyer_filter: activeBuyerFilter === 'com_checkin', 
      });

      if (error) {
        toast.error('Erro ao carregar dados do dashboard.');
        console.error('Erro ao chamar a função RPC:', error);
        setError('Não foi possível carregar os dados do dashboard.');
        setKpis(null);
        setRespostas([]);
      } else if (data) {
        const typedData = data as unknown as DashboardReturnType;
        setKpis(typedData.kpis);
        setRespostas(typedData.respostas);
      }

      setLoading(false);
      setLoadingRespostas(false);
    }
    getDashboardData();
  }, [selectedLancamentoId, activeScoreFilter, activeBuyerFilter, supabase]);

  const handleScoreFilterClick = useCallback((tier: ScoreTier) => {
    setActiveScoreFilter(prev => (prev === tier ? 'todos' : tier));
  }, []);
  
  const handleLancamentoChange = (lancamentoId: string) => {
    setActiveScoreFilter('todos');
    setActiveBuyerFilter('com_checkin'); 
    setSelectedLancamentoId(lancamentoId);
  };

  const handleExport = async () => {
    if (!selectedLancamentoId) {
        toast.error("Por favor, selecione um lançamento para exportar.");
        return;
    }
    setIsExporting(true);
    const exportToast = toast.loading('Exportando dados...');
    try {
        const { data: csvText, error } = await supabase.functions.invoke('export-buyers-csv', {
            body: { launch_id: selectedLancamentoId }
        });

        if (error) throw error;

        if (!csvText || typeof csvText !== 'string' || csvText.length < 10) {
            toast.success("Não há compradores com check-in para exportar.", { id: exportToast });
            setIsExporting(false);
            return;
        }

        const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        const launchName = launches.find(l => l.id === selectedLancamentoId)?.nome || 'lancamento';
        link.setAttribute("download", `export_compradores_${launchName.replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Exportação concluída!", { id: exportToast });

    } catch (err: any) {
        console.error("Erro na exportação:", err);
        toast.error(`Falha na exportação: ${err.message}`, { id: exportToast });
    } finally {
        setIsExporting(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return <div className="text-center my-4"><FaSpinner className="animate-spin text-3xl mx-auto" /></div>;
    }
    if (error) {
      return <div className="text-center text-red-500 bg-red-100 p-4 rounded-lg my-4">{error}</div>;
    }
    if (!kpis || kpis.total_compradores === 0) {
      return <div className="text-center text-yellow-500 bg-yellow-100 p-6 rounded-lg">Nenhum comprador encontrado para este lançamento.</div>;
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div 
            onClick={() => setActiveBuyerFilter('todos')} 
            className={`p-4 bg-white rounded-lg cursor-pointer transition-all duration-200 shadow-md ${
                activeBuyerFilter === 'todos' 
                ? 'ring-2 ring-blue-500'
                : 'opacity-70 hover:opacity-100'
            }`}
          >
            <KpiCard title="Total de Compradores" value={kpis.total_compradores.toLocaleString('pt-BR')} icon={<span>👥</span>} />
          </div>
          <div 
            onClick={() => setActiveBuyerFilter('com_checkin')}
            className={`p-4 bg-white rounded-lg cursor-pointer transition-all duration-200 shadow-md ${
                activeBuyerFilter === 'com_checkin' 
                ? 'ring-2 ring-blue-500'
                : 'opacity-70 hover:opacity-100'
            }`}
          >
            <KpiCard title="Check-ins de Compradores" value={kpis.total_checkins.toLocaleString('pt-BR')} icon={<span>✅</span>} />
          </div>
          <div className="p-4 bg-white rounded-lg shadow-md">
            <KpiCard title="Taxa de Check-in" value={`${(kpis.total_compradores > 0 ? (kpis.total_checkins / kpis.total_compradores) * 100 : 0).toFixed(1)}%`} icon={<div className="text-xl font-bold text-blue-500">%</div>} />
          </div>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="bg-green-600 text-white font-bold rounded-lg flex items-center justify-center text-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? <FaSpinner className="animate-spin" /> : <FaFileCsv />}
            <span className="ml-3">Exportar CSV</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-6 mb-8">
          {scoreCardsData.map(({ title, count }) => (
            <ScoreCard
              key={title}
              title={title as ScoreTier}
              count={count}
              total={activeBuyerFilter === 'com_checkin' ? kpis.total_checkins : kpis.total_compradores}
              color={getScoreColor(title as ScoreTier)}
              isActive={activeScoreFilter === title}
              onClick={() => handleScoreFilterClick(title as ScoreTier)}
            />
          ))}
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-4 mt-10">Respostas dos Compradores</h2>
        <div className={`relative grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 ${loadingRespostas ? 'opacity-50' : ''}`}>
          {loadingRespostas && <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10 rounded-lg"><FaSpinner className="animate-spin text-3xl" /></div>}
          {respostas.length > 0 ? (
            respostas.map(({ pergunta, respostas }) => (
              <RespostasGrafico key={pergunta} pergunta={pergunta} respostas={respostas} />
            ))
          ) : (
            <div className="col-span-full text-center text-slate-500 bg-white p-6 rounded-lg shadow-md">
              Nenhuma resposta encontrada para o filtro selecionado.
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-slate-50 min-h-screen">
      <Toaster position="top-center" />
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Análise de Perfil de Compradores</h1>
          <p className="text-slate-500">Classificação de compradores por faixas de pontuação para análise e calibração.</p>
        </div>
        <select
          value={selectedLancamentoId || ''}
          onChange={(e) => handleLancamentoChange(e.target.value)}
          className="bg-white border border-gray-300 text-slate-800 rounded-lg p-2 shadow-sm"
          disabled={launches.length === 0 || loading}
        >
          {launches.map(l => (
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

function KpiCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center h-full">
        <div className="text-3xl text-blue-500 mb-2">{icon}</div>
        <p className="text-3xl font-bold text-slate-800">{value}</p>
        <p className="text-sm font-medium text-slate-500 text-center">{title}</p>
    </div>
  );
}

function ScoreCard({ title, count, total, color, isActive, onClick }: { title: ScoreTier; count: number; total: number; color: string; isActive: boolean; onClick: () => void; }) {
  const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
  const activeClasses = isActive ? `ring-2 ring-offset-2 ring-offset-slate-50 ${color.replace('bg-', 'ring-')}` : 'border-gray-200';
  
  return (
    <div 
      className={`bg-white p-5 rounded-lg border relative overflow-hidden cursor-pointer transition-all duration-200 hover:border-gray-400 shadow-md ${activeClasses}`}
      onClick={onClick}
    >
      <div className={`absolute top-0 left-0 h-1 w-full ${color}`}></div>
      <p className="font-bold text-slate-600 mt-2 text-sm">{title}</p>
      <p className="text-4xl font-bold text-slate-800 mt-2">{count.toLocaleString('pt-BR')}</p>
      <p className="text-sm text-slate-500 mt-1">{percentage}% do total</p>
    </div>
  );
}

function RespostasGrafico({ pergunta, respostas }: { pergunta: string; respostas: Record<string, number> }) {
    const totalRespostas = Object.values(respostas).reduce((sum, count) => sum + count, 0);
    const sortedRespostas = Object.entries(respostas).sort(([, countA], [, countB]) => countB - countA);

    return (
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-md">
            <h3 className="text-md font-bold text-slate-800 mb-4">{pergunta}</h3>
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
                <span className="text-slate-600">{texto}</span>
                <span className="text-slate-500 font-semibold">{count.toLocaleString('pt-BR')} ({percentage.toFixed(1)}%)</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5">
                <div 
                    className="bg-blue-500 h-2.5 rounded-full" 
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