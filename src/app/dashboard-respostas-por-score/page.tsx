// src/app/dashboard-respostas-por-score/page.tsx - VERSÃO COM CORES PERSONALIZADAS
'use client';

import { useState, useEffect, useCallback } from "react";
import { createClient } from '@/utils/supabase/client';
import type { Launch } from "@/lib/types";
import { Users, UserCheck, Percent, ShoppingCart } from "lucide-react";

// --- Tipos de Dados ---
type KpiData = { total_inscricoes: number; total_checkins: number; total_buyers: number; total_buyer_checkins: number; };
type AnswerBreakdown = { answer_text: string; total_leads: number; average_score: number; percentage: number; };
type QuestionBreakdownData = { question_id: string; question_text: string; answers: AnswerBreakdown[]; };
type ViewMode = 'all' | 'buyers';

// --- Componentes ---
const Spinner = () => ( <div className="flex justify-center items-center h-40"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div></div> );
const KpiCard = ({ title, value, icon: Icon }: { title: string; value: string; icon: React.ElementType }) => (
    <div className="bg-white p-4 rounded-lg shadow-md text-center flex flex-col justify-center h-full">
        <Icon className="mx-auto text-blue-500 mb-2" size={24} />
        <p className="text-3xl font-bold text-slate-800">{value}</p>
        <h3 className="text-sm font-medium text-slate-500 mt-1">{title}</h3>
    </div>
);
const AnswerBreakdownCard = ({ questionData }: { questionData: QuestionBreakdownData }) => {
    // AQUI ESTÁ A LÓGICA DE CORES ATUALIZADA
    const getScoreColor = (score: number) => {
        if (score >= 80) return 'bg-red-500';       // Vermelho (Muito Quente)
        if (score >= 60) return 'bg-orange-500';    // Laranja (Quente - Transição)
        if (score >= 40) return 'bg-yellow-500';    // Amarelo (Morno)
        if (score >= 20) return 'bg-green-500';     // Verde (Frio)
        return 'bg-blue-500';                      // Azul (Muito Frio)
    };
    return (
        <div className="bg-white p-6 rounded-lg shadow-md flex flex-col">
            <h3 className="font-bold text-slate-800 mb-4">{questionData.question_text}</h3>
            <ul className="space-y-3">
                {questionData.answers.map(answer => (
                    <li key={answer.answer_text}>
                        <div className="flex justify-between items-center mb-1 text-sm">
                            <span className="text-slate-600 break-words pr-2">{answer.answer_text}</span>
                            <span className="font-medium text-slate-700 flex-shrink-0">{answer.total_leads.toLocaleString('pt-BR')} ({answer.percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-4 flex items-center text-xs text-white font-bold">
                            <div className={`${getScoreColor(answer.average_score)} h-4 rounded-full flex items-center justify-center`} style={{ width: `${answer.average_score}%` }}>
                                {answer.average_score.toFixed(0)}
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default function AnaliseRespostasPorScorePage() {
    const supabase = createClient();
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunch, setSelectedLaunch] = useState<string>('');
    const [data, setData] = useState<QuestionBreakdownData[]>([]);
    const [kpis, setKpis] = useState<KpiData>({ total_inscricoes: 0, total_checkins: 0, total_buyers: 0, total_buyer_checkins: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('all');

    useEffect(() => {
        const fetchLaunches = async () => {
            const { data: launchesData, error } = await supabase.from('lancamentos').select('id, nome, status').in('status', ['Em Andamento', 'Concluído']);
            if (error) { setError("Não foi possível carregar os lançamentos."); } 
            else if (launchesData) {
                const sorted = [...launchesData].sort((a, b) => {
                    if (a.status === 'Em Andamento' && b.status !== 'Em Andamento') return -1;
                    if (a.status !== 'Em Andamento' && b.status === 'Em Andamento') return 1;
                    return b.nome.localeCompare(a.nome);
                });
                setLaunches(sorted as Launch[]);
                const inProgress = sorted.find(l => l.status === 'Em Andamento');
                setSelectedLaunch(inProgress ? inProgress.id : (sorted[0] ? sorted[0].id : 'all'));
            }
        };
        fetchLaunches();
    }, [supabase]);

    const fetchDataForLaunch = useCallback(async (launchId: string, mode: ViewMode) => {
        if (!launchId) return; setLoading(true); setError(null);
        try {
            const rpcLaunchId = launchId === 'all' ? null : launchId;
            const [breakdownResult, kpiResult] = await Promise.all([
                supabase.rpc('get_score_profile_analysis', { p_launch_id: rpcLaunchId, p_filter_by_buyers: mode === 'buyers' }),
                supabase.rpc('get_geral_and_buyer_kpis', { p_launch_id: rpcLaunchId })
            ]);
            if (kpiResult.error) throw { source: 'get_geral_and_buyer_kpis', error: kpiResult.error };
            if (breakdownResult.error) throw { source: 'get_score_profile_analysis', error: breakdownResult.error };
            setKpis(kpiResult.data || { total_inscricoes: 0, total_checkins: 0, total_buyers: 0, total_buyer_checkins: 0 });
            setData(breakdownResult.data || []);
        } catch (err: any) { setError(`Não foi possível carregar os dados. Verifique a função '${err.source}'.`); } 
        finally { setLoading(false); }
    }, [supabase]);

    useEffect(() => { if (selectedLaunch) { fetchDataForLaunch(selectedLaunch, viewMode); } }, [selectedLaunch, viewMode, fetchDataForLaunch]);
    
    const taxaCheckinGeral = (kpis?.total_inscricoes ?? 0) > 0 ? (((kpis?.total_checkins ?? 0) / (kpis?.total_inscricoes ?? 1)) * 100) : 0;
    const taxaConversaoCompradores = (kpis?.total_checkins ?? 0) > 0 ? (((kpis?.total_buyers ?? 0) / (kpis?.total_checkins ?? 1)) * 100) : 0;
    
    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-slate-100 min-h-screen">
            <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Análise de Respostas por Score</h1>
                <div className="w-full sm:w-72">
                    <select id="launch-select" value={selectedLaunch} onChange={(e) => setSelectedLaunch(e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" disabled={loading} >
                        <option value="all">Visão Geral (Todos)</option>
                        {launches.map((launch) => (<option key={launch.id} value={launch.id}>{`${launch.nome} - ${launch.status}`}</option>))}
                    </select>
                </div>
            </header>
            <section className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <button onClick={() => setViewMode('all')} className={`p-4 rounded-xl shadow-lg flex flex-col gap-4 transition-all duration-200 border-2 ${viewMode === 'all' ? 'bg-white border-blue-500' : 'bg-white border-transparent hover:border-blue-300'}`}>
                    <h2 className="text-lg font-semibold text-slate-700 text-center">Visão Geral do Lançamento</h2>
                    <div className="grid grid-cols-3 gap-4">
                        <KpiCard title="Total Inscrições" value={(kpis?.total_inscricoes ?? 0).toLocaleString('pt-BR')} icon={Users} />
                        <KpiCard title="Total Check-ins" value={(kpis?.total_checkins ?? 0).toLocaleString('pt-BR')} icon={UserCheck} />
                        <KpiCard title="Taxa de Check-in" value={`${taxaCheckinGeral.toFixed(1)}%`} icon={Percent} />
                    </div>
                </button>
                <button onClick={() => setViewMode('buyers')} className={`p-4 rounded-xl shadow-lg flex flex-col gap-4 transition-all duration-200 border-2 ${viewMode === 'buyers' ? 'bg-white border-blue-500' : 'bg-white border-transparent hover:border-blue-300'}`}>
                    <h2 className="text-lg font-semibold text-slate-700 text-center">Análise de Compradores</h2>
                    <div className="grid grid-cols-3 gap-4">
                        <KpiCard title="Total Compradores" value={(kpis?.total_buyers ?? 0).toLocaleString('pt-BR')} icon={ShoppingCart} />
                        <KpiCard title="Check-ins (Compradores)" value={(kpis?.total_buyer_checkins ?? 0).toLocaleString('pt-BR')} icon={UserCheck} />
                        <KpiCard title="Taxa de Conversão" value={`${taxaConversaoCompradores.toFixed(1)}%`} icon={Percent} />
                    </div>
                </button>
            </section>
            <main>
                {loading && <Spinner />}
                {!loading && error && <div className="text-center py-10 px-4 bg-red-100 text-red-700 rounded-lg"><p>{error}</p></div>}
                {!loading && !error && (!data || data.length === 0) && (<div className="text-center py-10 px-4 bg-white rounded-lg shadow-md"><p className="text-slate-500">Nenhum dado de resposta encontrado.</p></div>)}
                {!loading && !error && data && data.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
                        {data.map(question => (<AnswerBreakdownCard key={question.question_id} questionData={question} />))}
                    </div>
                )}
            </main>
        </div>
    );
}