// COPIA E COLA ESTE CÓDIGO COMPLETO
// EM: src/app/dashboard-score-por-resposta/page.tsx

'use client';

import { useState, useEffect, useCallback } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "@/lib/database.types"; 
import { QuestionAnalysisData, Launch } from "@/lib/types"; 

import QuestionAnalysisCard from "@/components/dashboard/QuestionAnalysisCard";

const Spinner = () => (
  <div className="flex justify-center items-center h-40">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

export default function ScorePorRespostaPage() {
  const supabase = createClientComponentClient<Database>();
  
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [selectedLaunch, setSelectedLaunch] = useState<string>('');
  const [analysisData, setAnalysisData] = useState<QuestionAnalysisData[]>([]);
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
        setLaunches(data as Launch[]);
        if (data.length > 0) {
            setSelectedLaunch(data[0].id);
        } else {
            setLoading(false);
        }
      }
    }
    fetchLaunches();
  }, [supabase]);

  const fetchDataForLaunch = useCallback(async (launchId: string) => {
    if (!launchId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_answer_counts_for_launch', {
        p_launch_id: launchId,
      });

      if (rpcError) throw rpcError;
      
      // ================== AQUI ESTÁ A CORREÇÃO ==================
      // Nós garantimos ao TypeScript que 'data' tem o formato QuestionAnalysisData[]
      setAnalysisData((data as QuestionAnalysisData[]) || []);
      // ========================================================

    } catch (err: any) {
      console.error(err);
      setError("Não foi possível carregar os dados de análise.");
      setAnalysisData([]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (selectedLaunch) {
      fetchDataForLaunch(selectedLaunch);
    }
  }, [selectedLaunch, fetchDataForLaunch]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard: Análise de Respostas
        </h1>
        {launches.length > 0 && (
          <div className="w-full sm:w-64">
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