// src/app/dashboard-profil-score/page.tsx (ou o caminho correto)
'use client';

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from '@/utils/supabase/client';
import { Launch } from "@/lib/types";
import { FaSpinner, FaFileCsv } from "react-icons/fa";
import toast, { Toaster } from 'react-hot-toast';
import { Users, UserCheck, Percent } from "lucide-react";

// --- Tipos de Dados ---
type AnswerProfile = { answer_text: string; lead_count: number; };
type ScoreProfileQuestion = { question_id: string; question_text: string; answers: AnswerProfile[]; };

const scoreCategories = [
    { key: 'quente', name: 'Quente (>=80)', color: 'text-red-500', bgColor: 'bg-red-50', borderColor: 'border-red-500' },
    { key: 'quente_morno', name: 'Quente-Morno (65-79)', color: 'text-orange-500', bgColor: 'bg-orange-50', borderColor: 'border-orange-500' },
    { key: 'morno', name: 'Morno (50-64)', color: 'text-amber-500', bgColor: 'bg-amber-50', borderColor: 'border-amber-500' },
    { key: 'morno_frio', name: 'Morno-Frio (35-49)', color: 'text-sky-500', bgColor: 'bg-sky-50', borderColor: 'border-sky-500' },
    { key: 'frio', name: 'Frio (1-34)', color: 'text-blue-500', bgColor: 'bg-blue-50', borderColor: 'border-blue-500' },
] as const;

const customQuestionOrder = [
    'Qual a sua idade?', 'Qual é a sua renda mensal?', 'Há quanto tempo você conhece a Professora Izabel?', 'Você já comprou cursos online?', 'Você é de onde?', 'Em qual rede social você conheceu a Professora Izabel?', 'Qual foi a forma de pagamento que você utilizou com mais frequência para se inscrever em cursos online?'
];

type ScoreCategoryKey = typeof scoreCategories[number]['key'];
type ScoreKpiData = Record<ScoreCategoryKey, number>;
type GeneralKpiData = { total_inscricoes: number; total_checkins: number; };

// --- Componentes ---
const Spinner = () => ( <div className="flex justify-center items-center h-40"><FaSpinner className="animate-spin text-blue-600 text-3xl mx-auto" /></div> );
const KpiCard = ({ title, value, icon: Icon }: { title: string; value: string; icon: React.ElementType }) => ( <div className="bg-white p-4 rounded-lg shadow-md text-center flex flex-col justify-center h-full"><Icon className="mx-auto text-blue-500 mb-2" size={28} /><p className="text-3xl font-bold text-slate-800">{value}</p><h3 className="text-sm font-medium text-slate-500 mt-1">{title}</h3></div> );
const ScoreProfileCard = ({ questionData }: { questionData: ScoreProfileQuestion }) => {
    const totalResponses = useMemo(() => questionData.answers?.reduce((sum, answer) => sum + answer.lead_count, 0) || 0, [questionData.answers]);
    if (!questionData.answers || totalResponses === 0) return null;
    return (
        <div className="bg-white p-6 rounded-lg shadow-md flex flex-col">
            <h3 className="font-bold text-slate-800 mb-4">{questionData.question_text}</h3>
            <ul className="space-y-3 flex-grow">{questionData.answers.sort((a, b) => b.lead_count - a.lead_count).map((answer, index) => {
                const percentage = totalResponses > 0 ? (answer.lead_count / totalResponses) * 100 : 0;
                return (<li key={index}><div className="flex justify-between items-center mb-1 text-sm"><span className="text-slate-600">{answer.answer_text}</span><span className="font-medium text-slate-700">{answer.lead_count.toLocaleString('pt-BR')}<span className="text-slate-400 ml-2">({percentage.toFixed(1)}%)</span></span></div><div className="w-full bg-slate-200 rounded-full h-2.5"><div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div></div></li>);
            })}</ul>
        </div>
    );
};

export default function PerfilDeScorePage() {
    const supabase = createClient();
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunch, setSelectedLaunch] = useState<string>('');
    const [selectedScore, setSelectedScore] = useState<ScoreCategoryKey>('quente');
    const [data, setData] = useState<ScoreProfileQuestion[]>([]);
    const [scoreKpiData, setScoreKpiData] = useState<ScoreKpiData | null>(null);
    const [generalKpis, setGeneralKpis] = useState<GeneralKpiData>({ total_inscricoes: 0, total_checkins: 0 });
    const [loadingKpis, setLoadingKpis] = useState(true);
    const [loadingBreakdown, setLoadingBreakdown] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    // CÓDIGO CORRIGIDO
    useEffect(() => {
        const fetchLaunches = async () => {
            // A busca de lançamentos já está correta, usando a função RPC
            const { data: launchesData, error } = await supabase.rpc('get_lancamentos_permitidos');
            
            // Tratamento de erro caso a busca falhe
            if (error) {
                toast.error("Erro ao buscar lançamentos.");
                console.error(error);
                return; // Interrompe a execução se houver erro
            }

            // A correção está aqui: usamos 'launchesData' que agora existe
            if (launchesData) {
                const sorted = [...launchesData].sort((a, b) => {
                    if (a.status === 'Em Andamento' && b.status !== 'Em Andamento') return -1;
                    if (a.status !== 'Em Andamento' && b.status === 'Em Andamento') return 1;
                    return b.nome.localeCompare(a.nome);
                });

                setLaunches(sorted as Launch[]); // Adicionado 'as Launch[]' para consistência de tipo

                if (sorted.length > 0) {
                    const inProgress = sorted.find(l => l.status === 'Em Andamento');
                    setSelectedLaunch(inProgress ? inProgress.id : sorted[0].id);
                }
            }
        };
        fetchLaunches();
    }, [supabase]);

    const fetchInitialData = useCallback(async (launchId: string) => {
        if (!launchId) return;
        setLoadingKpis(true);
        try {
            const [scoreKpiResult, generalKpiResult] = await Promise.all([
                supabase.rpc('get_score_category_totals', { p_launch_id: launchId }),
                supabase.rpc('get_geral_and_buyer_kpis', { p_launch_id: launchId })
            ]);
            const { data: scoreKpis, error: scoreKpiError } = scoreKpiResult;
            const { data: generalKpisData, error: generalKpiError } = generalKpiResult;
            if (scoreKpiError || generalKpiError) {
                toast.error("Erro ao carregar os totais.");
                console.error({ scoreKpiError, generalKpiError });
            } else {
                const finalScoreData = Array.isArray(scoreKpis) ? scoreKpis[0] : scoreKpis;
                const finalGeneralData = Array.isArray(generalKpisData) ? generalKpisData[0] : generalKpisData;
                setScoreKpiData(finalScoreData || null);
                setGeneralKpis(finalGeneralData || { total_inscricoes: 0, total_checkins: 0 });
                if (finalScoreData) {
                    const firstNonZeroCategory = scoreCategories.find(cat => finalScoreData[cat.key] > 0);
                    if (firstNonZeroCategory) {
                        setSelectedScore(firstNonZeroCategory.key);
                    }
                }
            }
        } catch (error) {
            toast.error("Ocorreu uma falha ao buscar os dados de KPI.");
        } finally {
            setLoadingKpis(false);
        }
    }, [supabase]);

    const fetchBreakdownData = useCallback(async (launchId: string, scoreCategory: ScoreCategoryKey) => {
        if (!launchId) return;
        setLoadingBreakdown(true);
        try {
            const { data: breakdownResult, error: breakdownError } = await supabase.rpc('get_score_profile_by_answers', { p_launch_id: launchId, p_score_category: scoreCategory });
            if (breakdownError) {
                toast.error("Erro ao carregar dados de análise.");
                console.error(breakdownError);
                setData([]);
            } else {
                setData((breakdownResult as unknown as ScoreProfileQuestion[]) || []);
            }
        } catch (error) {
            toast.error("Ocorreu uma falha ao buscar os detalhes do perfil.");
            setData([]);
        } finally {
            setLoadingBreakdown(false);
        }
    }, [supabase]);
    
    useEffect(() => { if (selectedLaunch) { fetchInitialData(selectedLaunch); } }, [selectedLaunch, fetchInitialData]);
    useEffect(() => { if (selectedLaunch && selectedScore) { fetchBreakdownData(selectedLaunch, selectedScore); } }, [selectedLaunch, selectedScore, fetchBreakdownData]);

    const handleExport = async () => {
        if (!selectedLaunch || !selectedScore) { toast.error("Selecione um lançamento e um perfil de score para exportar."); return; }
        setIsExporting(true);
        const exportToast = toast.loading("A preparar a exportação completa...");
        try {
            const { data: csvText, error } = await supabase.rpc('exportar_perfil_csv', {
                p_launch_id: selectedLaunch,
                p_score_category: selectedScore,
                p_score_type: 'score'
            });
            if (error) throw error;
            if (!csvText) { toast.success("Não há leads para exportar neste perfil de score.", { id: exportToast }); return; }
            const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            const launchName = launches.find(l => l.id === selectedLaunch)?.nome || 'lancamento';
            link.setAttribute("download", `export_completo_${launchName}_${selectedScore}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("Exportação completa concluída!", { id: exportToast });
        } catch (err: any) {
            console.error("Erro na exportação:", err);
            toast.error(`Falha na exportação: ${err.message}`, { id: exportToast });
        } finally {
            setIsExporting(false);
        }
    };
    
    const taxaDeCheckin = generalKpis.total_inscricoes > 0 ? ((generalKpis.total_checkins / generalKpis.total_inscricoes) * 100).toFixed(1) + '%' : '0.0%';

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen space-y-6">
            <Toaster position="top-center" />
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Perfil de Score por Respostas</h1>
                <div className="flex items-center gap-4">
                    <div className="bg-white p-2 rounded-lg shadow-md">
                        <select value={selectedLaunch} onChange={(e) => setSelectedLaunch(e.target.value)} disabled={loadingKpis} className="w-full px-3 py-2 border-none rounded-md focus:ring-0 bg-transparent text-slate-700 font-medium">
                            {launches.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.status})</option>)}
                        </select>
                    </div>
                </div>
            </header>

            <section className="space-y-6">
                <div className="bg-slate-200 p-4 rounded-lg shadow-md">
                    <h3 className="font-bold text-center text-slate-600 mb-3">Totais do Lançamento</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <KpiCard title="Total de Inscrições" value={loadingKpis ? '...' : generalKpis.total_inscricoes.toLocaleString('pt-BR')} icon={Users} />
                        <KpiCard title="Total de Check-ins" value={loadingKpis ? '...' : generalKpis.total_checkins.toLocaleString('pt-BR')} icon={UserCheck} />
                        <KpiCard title="Taxa de Check-in" value={loadingKpis ? '...' : taxaDeCheckin} icon={Percent} />
                    </div>
                </div>

                <div className="bg-slate-200 p-4 rounded-lg shadow-md">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-grow grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                            {scoreCategories.map(cat => {
                                const totalLeadsCategoria = scoreKpiData?.[cat.key] ?? 0;
                                const percentage = generalKpis.total_checkins > 0 ? (totalLeadsCategoria / generalKpis.total_checkins) * 100 : 0;
                                return (
                                <button key={cat.key} onClick={() => setSelectedScore(cat.key)} className={`p-4 rounded-lg shadow-md text-center transition-all duration-200 border-2 flex flex-col justify-center min-h-[140px] ${selectedScore === cat.key ? `${cat.bgColor} ${cat.borderColor}` : 'bg-white border-transparent hover:border-slate-300'}`}>
                                    <p className="text-base font-medium text-slate-600">{cat.name}</p>
                                    <p className={`text-3xl font-bold ${cat.color} mt-1`}>{loadingKpis ? '...' : totalLeadsCategoria.toLocaleString('pt-BR')}</p>
                                    <p className="text-lg font-bold text-slate-800 mt-2">({percentage.toFixed(1)}%)</p>
                                </button>
                                );
                            })}
                        </div>
                        <div className="flex-shrink-0">
                            <button onClick={handleExport} disabled={isExporting || loadingKpis || loadingBreakdown} className="w-full h-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 text-base">{isExporting ? <FaSpinner className="animate-spin" /> : <FaFileCsv />}Exportar Leads</button>
                        </div>
                    </div>
                </div>
            </section>

            <main>
                {loadingBreakdown ? <Spinner /> : (
                    data && data.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {data
                                .slice()
                                .sort((a, b) => {
                                    const indexA = customQuestionOrder.indexOf(a.question_text);
                                    const indexB = customQuestionOrder.indexOf(b.question_text);
                                    if (indexA === -1) return 1;
                                    if (indexB === -1) return -1;
                                    return indexA - indexB;
                                })
                                .map(question => (
                                    <ScoreProfileCard key={question.question_id} questionData={question} />
                                ))
                            }
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-white rounded-lg shadow-md">
                            <p className="text-slate-500">Nenhum dado encontrado para este perfil de score.</p>
                        </div>
                    )
                )}
            </main>
        </div>
    );
}
