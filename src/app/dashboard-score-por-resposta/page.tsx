'use client';

import { useState, useEffect, useCallback } from "react";
import { createClient } from '@/utils/supabase/client';
import { QuestionAnalysisData, Launch } from "@/lib/types"; 
import QuestionAnalysisCard from "@/components/dashboard/QuestionAnalysisCard";
import { Users, UserCheck, Percent } from "lucide-react"; // Ícones para os KPIs

// --- Tipos de Dados ---
type KpiData = {
    total_inscricoes: number;
    total_checkins: number;
};

// --- Componentes ---
const Spinner = () => (
  <div className="flex justify-center items-center h-40">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

const KpiCard = ({ title, value, icon: Icon }: { title: string; value: string; icon: React.ElementType }) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md text-center flex flex-col justify-center h-full">
        <Icon className="mx-auto text-blue-500 mb-2" size={28} />
        <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">{title}</h3>
    </div>
);


export default function ScorePorRespostaPage() {
  const supabase = createClient();
  
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [selectedLaunch, setSelectedLaunch] = useState<string>('');
  const [analysisData, setAnalysisData] = useState<QuestionAnalysisData[]>([]);
  // Novo estado para os dados dos KPIs
  const [kpis, setKpis] = useState<KpiData>({ total_inscricoes: 0, total_checkins: 0 });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLaunches() {
      const { data, error } = await supabase
        .from('lancamentos')
        .select('id, nome, status') 
        .in('status', ['Em Andamento', 'Concluído']);

      if (error) {
        console.error("Erro ao buscar lançamentos:", error);
      } else if (data) {
        const sortedData = [...data].sort((a, b) => {
            if (a.status !== b.status) {
                return a.status === 'Em Andamento' ? -1 : 1;
            }
            return a.nome.localeCompare(b.nome);
        });
        
        setLaunches(sortedData as Launch[]);
        if (sortedData.length > 0) {
            // Define o lançamento "Em Andamento" como padrão, se existir
            const inProgressLaunch = sortedData.find(l => l.status === 'Em Andamento');
            setSelectedLaunch(inProgressLaunch ? inProgressLaunch.id : sortedData[0].id);
        } else {
            setLoading(false);
        }
      }
    }
    fetchLaunches();
  }, [supabase]);

  // Função atualizada para buscar tanto os dados de análise quanto os KPIs
  const fetchDataForLaunch = useCallback(async (launchId: string) => {
    if (!launchId) return;

    setLoading(true);
    setError(null);

    try {
      // Executa as duas chamadas em paralelo para mais performance
      const [analysisResult, kpiResult] = await Promise.all([
        supabase.rpc('get_answer_counts_for_launch', { p_launch_id: launchId }),
        supabase.rpc('get_kpis_for_launch', { p_launch_id: launchId })
      ]);

      const { data: analysisData, error: analysisError } = analysisResult;
      const { data: kpiData, error: kpiError } = kpiResult;

      if (analysisError) throw analysisError;
      if (kpiError) throw kpiError;
      
      setAnalysisData((analysisData as unknown as QuestionAnalysisData[]) || []);
      setKpis(kpiData || { total_inscricoes: 0, total_checkins: 0 });

    } catch (err: any) {
      console.error(err);
      setError("Não foi possível carregar os dados de análise.");
      setAnalysisData([]);
      setKpis({ total_inscricoes: 0, total_checkins: 0 });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (selectedLaunch) {
      fetchDataForLaunch(selectedLaunch);
    }
  }, [selectedLaunch, fetchDataForLaunch]);

  // Calcula a taxa de conversão
  const taxaDeConversao = kpis.total_inscricoes > 0 
    ? ((kpis.total_checkins / kpis.total_inscricoes) * 100).toFixed(1) + '%' 
    : '0.0%';

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-slate-900 min-h-screen">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">
          Análise de Respostas
        </h1>
        {launches.length > 0 && (
          <div className="w-full sm:w-72">
            <select
              id="launch-select"
              value={selectedLaunch}
              onChange={(e) => setSelectedLaunch(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
            >
              {launches.map((launch) => (
                <option key={launch.id} value={launch.id}>
                  {`${launch.nome} - ${launch.status}`}
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      {/* Seção de KPIs adicionada aqui */}
      {!loading && !error && (
        <section className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <KpiCard 
                title="Total de Inscrições"
                value={kpis.total_inscricoes.toLocaleString('pt-BR')}
                icon={Users}
            />
            <KpiCard 
                title="Total de Check-ins"
                value={kpis.total_checkins.toLocaleString('pt-BR')}
                icon={UserCheck}
            />
            <KpiCard 
                title="Taxa de Conversão"
                value={taxaDeConversao}
                icon={Percent}
            />
        </section>
      )}

      <main>
        {loading && <Spinner />}
        
        {!loading && error && (
          <div className="text-center py-10 px-4 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg"><p>{error}</p></div>
        )}

        {!loading && !error && (!analysisData || analysisData.length === 0) && (
          <div className="text-center py-10 px-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <p className="text-gray-600 dark:text-gray-400">Nenhuma pergunta ou resposta encontrada para a pesquisa deste lançamento.</p>
          </div>
        )}

        {!loading && !error && analysisData && analysisData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
            {analysisData.map((question) => (
              <QuestionAnalysisCard key={question.question_id} questionData={question} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
