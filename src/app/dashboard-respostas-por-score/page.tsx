// CAMINHO: src/app/dashboard-respostas-por-score/page.tsx

'use client';

import { useState, useEffect, useCallback } from "react";
import { createClient } from '@/utils/supabase/client';
//import type { Database } from '@/types/database'; // <-- CORREÇÃO AQUI
import { Launch, QuestionBreakdownData } from "@/lib/types";
import AnswerBreakdownCard from "@/components/dashboard/AnswerBreakdownCard";
import { FaSpinner } from "react-icons/fa";

const Spinner = () => (
    <div className="flex justify-center items-center h-40">
        <FaSpinner className="animate-spin text-blue-600 text-3xl mx-auto" />
    </div>
);

export default function AnaliseRespostasPorScorePage() {
    const supabase = createClient();
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunch, setSelectedLaunch] = useState<string>('');
    const [data, setData] = useState<QuestionBreakdownData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLaunches = async () => {
            const { data: launchesData, error } = await supabase
                .from('lancamentos')
                .select('id, nome, status')
                .in('status', ['Em Andamento', 'Concluído']);

            if (error) {
                console.error("Erro ao buscar lançamentos:", error);
                setError("Não foi possível carregar os lançamentos.");
            } else if (launchesData && launchesData.length > 0) {
                const sorted = [...launchesData].sort((a, b) => {
                    if (a.status !== b.status) {
                        return a.status === 'Em Andamento' ? -1 : 1;
                    }
                    return a.nome.localeCompare(b.nome);
                });
                setLaunches(sorted);
                setSelectedLaunch(sorted[0].id);
            } else {
                setLoading(false);
            }
        };
        fetchLaunches();
    }, [supabase]);

    const fetchDataForLaunch = useCallback(async (launchId: string) => {
        if (!launchId) return;
        setLoading(true);
        setError(null);

        const { data: result, error: rpcError } = await supabase.rpc('get_answer_breakdown_by_score', { p_launch_id: launchId });
        
        if (rpcError) {
            console.error(rpcError);
            setError("Erro ao carregar os dados de análise.");
            setData([]);
        } else {
            setData((result as unknown as QuestionBreakdownData[]) || []);
        }
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        if (selectedLaunch) {
            fetchDataForLaunch(selectedLaunch);
        }
    }, [selectedLaunch, fetchDataForLaunch]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen">
            <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Análise de Respostas por Score</h1>
                {launches.length > 0 && (
                    <div className="bg-white p-2 rounded-lg shadow-md w-full md:w-auto">
                        <select value={selectedLaunch} onChange={(e) => setSelectedLaunch(e.target.value)} disabled={loading} className="w-full px-3 py-2 border-none rounded-md focus:ring-0 bg-transparent text-slate-700 font-medium">
                            {launches.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.status})</option>)}
                        </select>
                    </div>
                )}
            </header>
            <main>
                {loading && <Spinner />}
                {!loading && error && <div className="text-center py-10 text-red-600 bg-red-100 rounded-lg">{error}</div>}
                {!loading && !error && data.length === 0 && (
                    <div className="text-center py-10 bg-white rounded-lg shadow-md">
                        <p className="text-slate-500">Nenhum dado de resposta encontrado para este lançamento.</p>
                    </div>
                )}
                {!loading && !error && data.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {data.map(question => (
                            <AnswerBreakdownCard key={question.question_id} questionData={question} />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}