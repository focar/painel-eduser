'use client';

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from '@/utils/supabase/client';
import { Launch } from "@/lib/types";
import { Users, UserCheck, Percent, ShoppingCart } from "lucide-react";

// --- Tipos de Dados ---
type AnswerData = {
    answer_text: string;
    lead_count: number;
};

type QuestionAnalysisData = {
    question_id: string;
    question_text: string;
    answers: AnswerData[];
};

type KpiData = {
    total_inscricoes: number;
    total_checkins: number;
    total_buyers: number;
    total_buyer_checkins: number;
};

type ViewMode = 'all' | 'buyers';

// --- Componentes ---
const Spinner = () => (
    <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
    </div>
);

const KpiCard = ({ title, value, icon: Icon }: { title: string; value: string; icon: React.ElementType }) => (
    <div className="bg-slate-50 p-4 rounded-lg text-center flex flex-col justify-center h-full">
        <Icon className="mx-auto text-blue-500 mb-2" size={24} />
        <p className="text-3xl font-bold text-slate-800">{value}</p>
        <h3 className="text-sm font-medium text-slate-500 mt-1">{title}</h3>
    </div>
);

const QuestionAnalysisCard = ({ questionData }: { questionData: QuestionAnalysisData }) => {
    const totalResponses = useMemo(() => {
        return questionData.answers?.reduce((sum, answer) => sum + answer.lead_count, 0) || 0;
    }, [questionData.answers]);

    // Renderiza o card mesmo sem respostas, para mostrar a pergunta
    if (!questionData) {
        return null;
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="font-bold text-slate-800 mb-4">{questionData.question_text}</h3>
            {(!questionData.answers || totalResponses === 0) ? (
                <p className="text-sm text-slate-500">Nenhuma resposta encontrada para esta pergunta nos filtros selecionados.</p>
            ) : (
                <ul className="space-y-3">
                    {questionData.answers
                        .sort((a, b) => b.lead_count - a.lead_count)
                        .map((answer, index) => {
                        const percentage = totalResponses > 0 ? (answer.lead_count / totalResponses) * 100 : 0;
                        return (
                            <li key={index}>
                                <div className="flex justify-between items-center mb-1 text-sm">
                                    <span className="text-slate-600">{answer.answer_text}</span>
                                    <span className="font-medium text-slate-700">
                                        {answer.lead_count.toLocaleString('pt-BR')} ({percentage.toFixed(1)}%)
                                    </span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2.5">
                                    <div
                                        className="bg-blue-500 h-2.5 rounded-full"
                                        style={{ width: `${percentage}%` }}
                                    ></div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};


export default function AnaliseRespostasPage() {
    const supabase = createClient();

    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunch, setSelectedLaunch] = useState<string>('');
    const [analysisData, setAnalysisData] = useState<QuestionAnalysisData[]>([]);
    const [kpis, setKpis] = useState<KpiData>({ total_inscricoes: 0, total_checkins: 0, total_buyers: 0, total_buyer_checkins: 0 });
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('all');

    useEffect(() => {
        async function fetchLaunches() {
            const { data, error } = await supabase
                .from('lancamentos')
                .select('id, nome, status')
                .in('status', ['Em Andamento', 'Concluído']);

            if (error) {
                console.error("Erro ao buscar lançamentos:", error);
                setSelectedLaunch('all'); 
            } else if (data) {
                const sortedData = [...data].sort((a, b) => {
                    if (a.status === 'Em Andamento' && b.status !== 'Em Andamento') return -1;
                    if (a.status !== 'Em Andamento' && b.status === 'Em Andamento') return 1;
                    if (a.status === 'Concluído' && b.status === 'Concluído') return b.nome.localeCompare(a.nome);
                    return a.nome.localeCompare(b.nome);
                });

                setLaunches(sortedData as Launch[]);
                const inProgressLaunch = sortedData.find(l => l.status === 'Em Andamento');
                setSelectedLaunch(inProgressLaunch ? inProgressLaunch.id : (sortedData[0] ? sortedData[0].id : 'all'));
            }
        }
        fetchLaunches();
    }, [supabase]);

    const fetchDataForLaunch = useCallback(async (launchId: string, mode: ViewMode) => {
        const rpcLaunchId = launchId === 'all' ? null : launchId;

        setLoading(true);
        setError(null);
        
        let isActive = true;

        try {
            const kpiPromise = supabase.rpc('get_geral_and_buyer_kpis', { p_launch_id: rpcLaunchId });
            // CORREÇÃO: Voltando a usar a função original e correta para esta página
            const analysisPromise = supabase.rpc('get_answer_analysis', { 
                p_launch_id: rpcLaunchId,
                p_filter_by_buyers: mode === 'buyers'
            });

            const [analysisResult, kpiResult] = await Promise.all([analysisPromise, kpiPromise]);

            if (!isActive) return;

            if (kpiResult.error) throw { source: 'get_geral_and_buyer_kpis', error: kpiResult.error };
            if (analysisResult.error) throw { source: 'get_answer_analysis', error: analysisResult.error };

            setAnalysisData((analysisResult.data as unknown as QuestionAnalysisData[]) || []);
            setKpis(kpiResult.data || { total_inscricoes: 0, total_checkins: 0, total_buyers: 0, total_buyer_checkins: 0 });

        } catch (err: any) {
            console.error(`Erro ao carregar dados da função '${err.source}':`, err.error);
            if(isActive) {
                setError(`Não foi possível carregar os dados. Verifique se a função '${err.source}' existe e está correta. (Detalhes: ${err.error.message})`);
            }
        } finally {
            if(isActive) setLoading(false);
        }
        
        return () => { isActive = false; };

    }, [supabase]);

    useEffect(() => {
        if (selectedLaunch) {
            fetchDataForLaunch(selectedLaunch, viewMode);
        }
    }, [selectedLaunch, viewMode, fetchDataForLaunch]);

    const taxaCheckinGeral = kpis.total_inscricoes > 0 ? ((kpis.total_checkins / kpis.total_inscricoes) * 100) : 0;
    const taxaConversaoCompradores = kpis.total_inscricoes > 0 ? ((kpis.total_buyers / kpis.total_inscricoes) * 100) : 0;

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-slate-100 min-h-screen">
            <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Análise de Respostas sem Score</h1>
                <div className="w-full sm:w-72">
                    <select
                        id="launch-select"
                        value={selectedLaunch}
                        onChange={(e) => setSelectedLaunch(e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        disabled={!selectedLaunch}
                    >
                        <option value="all">Visão Geral (Todos)</option>
                        {launches.map((launch) => (
                            <option key={launch.id} value={launch.id}>{`${launch.nome} - ${launch.status}`}</option>
                        ))}
                    </select>
                </div>
            </header>

            <section className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <button
                    onClick={() => setViewMode('all')}
                    className={`p-4 rounded-xl shadow-lg flex flex-col gap-4 transition-all duration-200 border-2 ${viewMode === 'all' ? 'bg-white border-blue-500' : 'bg-white border-transparent hover:border-blue-300'}`}
                >
                    <h2 className="text-lg font-semibold text-slate-700 text-center">Visão Geral do Lançamento</h2>
                    <div className="grid grid-cols-3 gap-4">
                        <KpiCard title="Total Inscrições" value={kpis.total_inscricoes.toLocaleString('pt-BR')} icon={Users} />
                        <KpiCard title="Total Check-ins" value={kpis.total_checkins.toLocaleString('pt-BR')} icon={UserCheck} />
                        <KpiCard title="Taxa de Check-in" value={`${taxaCheckinGeral.toFixed(1)}%`} icon={Percent} />
                    </div>
                </button>
                
                <button
                    onClick={() => setViewMode('buyers')}
                    className={`p-4 rounded-xl shadow-lg flex flex-col gap-4 transition-all duration-200 border-2 ${viewMode === 'buyers' ? 'bg-white border-blue-500' : 'bg-white border-transparent hover:border-blue-300'}`}
                >
                    <h2 className="text-lg font-semibold text-slate-700 text-center">Análise de Compradores</h2>
                    <div className="grid grid-cols-3 gap-4">
                        <KpiCard title="Total Compradores" value={kpis.total_buyers.toLocaleString('pt-BR')} icon={ShoppingCart} />
                        <KpiCard title="Check-ins (Compradores)" value={kpis.total_buyer_checkins.toLocaleString('pt-BR')} icon={UserCheck} />
                        <KpiCard title="Taxa de Conversão" value={`${taxaConversaoCompradores.toFixed(1)}%`} icon={Percent} />
                    </div>
                </button>
            </section>

            <main>
                {loading && <Spinner />}
                {!loading && error && (
                    <div className="text-center py-10 px-4 bg-red-100 text-red-700 rounded-lg"><p>{error}</p></div>
                )}
                {!loading && !error && (!analysisData || analysisData.length === 0) && (
                    <div className="text-center py-10 px-4 bg-white rounded-lg shadow-md">
                        <p className="text-gray-600">Nenhuma pergunta ou resposta encontrada para os filtros selecionados.</p>
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
