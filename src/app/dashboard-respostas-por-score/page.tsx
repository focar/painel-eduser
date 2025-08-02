// CAMINHO: src/app/dashboard-respostas-por-score/page.tsx
'use client';

import { useState, useEffect, useCallback } from "react";
import { createClient } from '@/utils/supabase/client';
import { Launch, QuestionBreakdownData } from "@/lib/types";
import AnswerBreakdownCard from "@/components/dashboard/AnswerBreakdownCard";
import { FaSpinner } from "react-icons/fa";
// ADICIONADO: Ícones para os novos KPIs
import { Users, UserCheck, Percent } from "lucide-react"; 

// --- Tipos de Dados ---
type KpiData = {
    total_inscricoes: number;
    total_checkins: number;
};

// --- Componentes ---
const Spinner = () => (
    <div className="flex justify-center items-center h-40">
        <FaSpinner className="animate-spin text-blue-600 text-3xl mx-auto" />
    </div>
);

// ADICIONADO: Componente KpiCard para exibir os totais
const KpiCard = ({ title, value, icon: Icon }: { title: string; value: string; icon: React.ElementType }) => (
    <div className="bg-white p-4 rounded-lg shadow-md text-center flex flex-col justify-center h-full">
        <Icon className="mx-auto text-blue-500 mb-2" size={28} />
        <p className="text-3xl font-bold text-slate-800">{value}</p>
        <h3 className="text-sm font-medium text-slate-500 mt-1">{title}</h3>
    </div>
);


export default function AnaliseRespostasPorScorePage() {
    const supabase = createClient();
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunch, setSelectedLaunch] = useState<string>('');
    const [data, setData] = useState<QuestionBreakdownData[]>([]);
    // ADICIONADO: Estado para guardar os dados dos KPIs
    const [kpis, setKpis] = useState<KpiData>({ total_inscricoes: 0, total_checkins: 0 });
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
                const inProgress = sorted.find(l => l.status === 'Em Andamento');
                setSelectedLaunch(inProgress ? inProgress.id : sorted[0].id);
            } else {
                setLoading(false);
            }
        };
        fetchLaunches();
    }, [supabase]);

    // ATUALIZADO: Função agora busca os dados de breakdown e os KPIs em paralelo
    const fetchDataForLaunch = useCallback(async (launchId: string) => {
        if (!launchId) return;
        setLoading(true);
        setError(null);

        try {
            const [breakdownResult, kpiResult] = await Promise.all([
                supabase.rpc('get_answer_breakdown_by_score', { p_launch_id: launchId }),
                supabase.rpc('get_kpis_for_launch', { p_launch_id: launchId })
            ]);

            const { data: breakdownData, error: breakdownError } = breakdownResult;
            const { data: kpiData, error: kpiError } = kpiResult;

            if (breakdownError) throw breakdownError;
            if (kpiError) throw kpiError;
            
            setData((breakdownData as unknown as QuestionBreakdownData[]) || []);
            setKpis(kpiData || { total_inscricoes: 0, total_checkins: 0 });

        } catch (err: any) {
            console.error(err);
            setError("Erro ao carregar os dados de análise.");
            setData([]);
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

    // ADICIONADO: Cálculo da taxa de conversão para o KPI
    const taxaDeConversao = kpis.total_inscricoes > 0 
        ? ((kpis.total_checkins / kpis.total_inscricoes) * 100).toFixed(1) + '%' 
        : '0.0%';

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

            {/* ADICIONADO: Seção de KPIs */}
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
