//src\app\dashboard-avaliacao-compradores\page.tsx

'use client';

import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { createClient } from '@/utils/supabase/client'; 
import type { Launch } from "@/lib/types";
import { Users, BarChart2, TrendingUp, TrendingDown, ChevronsUpDown, ArrowDown, ArrowUp } from "lucide-react";

// --- Tipos de Dados (Simplificados para a versão final) ---
type AnswerComparison = {
    checkin_text: string | null;
    checkin_points: number;
    compra_text: string | null;
    compra_points: number;
    classe: string;
};

type ComparisonData = {
    lead_id: string;
    lead_email: string;
    score_checkin: number;
    score_comprador: number;
    score_diff: number; 
    answers_comparison: null | { [questionText: string]: AnswerComparison; };
};

type SortConfig = {
    key: 'lead_email' | 'score_checkin' | 'score_comprador' | 'score_diff';
    direction: 'ascending' | 'descending';
};

// --- Componentes (sem alteração) ---
const Spinner = () => <div className="flex justify-center items-center h-60"><div className="animate-spin rounded-full h-20 w-20 border-t-2 border-b-2 border-emerald-500"></div></div>;
const KpiCard = ({ title, value, icon: Icon, colorClass = 'text-emerald-500' }: { title: string; value: string; icon: React.ElementType, colorClass?: string }) => (
    <div className="bg-white p-4 rounded-lg shadow-md text-center flex flex-col justify-center h-full">
        <Icon className={`mx-auto ${colorClass} mb-2`} size={24} />
        <p className="text-3xl font-bold text-slate-800">{value}</p>
        <h3 className="text-sm font-medium text-slate-500 mt-1">{title}</h3>
    </div>
);
const ComparisonDetailCard = ({ lead }: { lead: ComparisonData }) => {
    if (!lead.answers_comparison || Object.keys(lead.answers_comparison).length === 0) {
        return <div className="p-6 bg-slate-50 border-t-2 border-emerald-200"><p className="text-slate-600 text-center italic">Este comprador não possui respostas detalhadas para análise.</p></div>;
    }
    const sortedAnswers = Object.entries(lead.answers_comparison).sort(([, a], [, b]) => {
        if (a.classe.toLowerCase() === 'score' && b.classe.toLowerCase() !== 'score') return -1;
        if (a.classe.toLowerCase() !== 'score' && b.classe.toLowerCase() === 'score') return 1;
        return 0;
    });
    return (
        <div className="p-6 bg-slate-50 border-t-2 border-emerald-200">
            <h3 className="text-base font-bold text-slate-800 mb-4">Análise Detalhada de Respostas</h3>
            <div className="space-y-5">
                {sortedAnswers.map(([question, data]) => {
                    const hasCheckinAnswer = data.checkin_text !== null && data.checkin_text !== '';
                    const hasPurchaseAnswer = data.compra_text !== null && data.compra_text !== '';
                    const areAnswersSame = data.checkin_text === data.compra_text;
                    const arePointsSame = data.checkin_points === data.compra_points;
                    return (
                        <div key={question} className="border-b border-slate-200 pb-4 last:border-b-0">
                            <div className="flex items-center gap-3 mb-3">
                                <p className="font-semibold text-slate-700">{question}</p>
                                <span className={`uppercase px-2 py-0.5 text-xs font-bold rounded-full ${data.classe.toLowerCase() === 'score' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'}`}>{data.classe}</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {hasCheckinAnswer ? <div className="p-3 bg-blue-50 rounded-md border border-blue-200"><p className="text-xs font-semibold text-blue-700 mb-1">RESPOSTA NO CHECK-IN</p><p className="text-slate-800">"{data.checkin_text}"</p><p className="mt-2 text-xs text-blue-600">Pontos: <strong>{data.checkin_points}</strong></p></div> : <div className="p-3 bg-gray-100 rounded-md border border-gray-200 flex items-center justify-center"><p className="text-sm text-gray-500 italic">Não respondido no check-in</p></div>}
                                {hasPurchaseAnswer ? (areAnswersSame ? <div className="p-3 bg-slate-100 rounded-md border border-slate-200"><p className="text-slate-800 font-medium">"{data.checkin_text}"</p><p className="text-xs text-slate-500 mt-1 italic">A resposta não mudou.</p><div className={`mt-2 text-xs text-slate-500 flex items-center gap-4 transition-colors duration-300 ${!arePointsSame ? 'p-2 bg-yellow-100 rounded-md' : ''}`}><span>Pontos Compra: <strong className={arePointsSame ? 'text-slate-800' : 'text-emerald-600 font-bold'}>{data.compra_points}</strong></span>{!arePointsSame && <span className="font-bold text-yellow-700">(Pontuação Mudou!)</span>}</div></div> : <div className="p-3 bg-emerald-50 rounded-md border border-emerald-200"><p className="text-xs font-semibold text-emerald-700 mb-1">RESPOSTA NA COMPRA</p><p className="text-slate-800">"{data.compra_text}"</p><p className="mt-2 text-xs text-emerald-600">Pontos: <strong>{data.compra_points}</strong></p></div>) : <div className="p-3 bg-gray-100 rounded-md border border-gray-200 flex items-center justify-center"><p className="text-sm text-gray-500 italic">Não respondido na pesquisa de comprador</p></div>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default function AvaliacaoCompradoresPage() {
    const supabase = createClient();
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunch, setSelectedLaunch] = useState<string>('');
    const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);
    const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'score_diff', direction: 'descending' });

    useEffect(() => {
        const fetchLaunches = async () => {
            const { data: launchesData, error } = await supabase.rpc('get_lancamentos_permitidos');
            if (error) { console.error("Erro ao buscar lançamentos:", error); setError("Não foi possível carregar os lançamentos."); setLaunches([]);
            } else if (launchesData) {
                const sorted = [...launchesData].sort((a: Launch, b: Launch) => {
                    if (a.status === 'Em Andamento' && b.status !== 'Em Andamento') return -1;
                    if (a.status !== 'Em Andamento' && b.status === 'Em Andamento') return 1;
                    return b.nome.localeCompare(a.nome);
                });
                setLaunches(sorted as Launch[]);
                const inProgress = sorted.find(l => l.status === 'Em Andamento');
                setSelectedLaunch(inProgress ? inProgress.id : 'all');
            }
        };
        fetchLaunches();
    }, [supabase]);

    const fetchData = useCallback(async (launchId: string) => {
        if (!launchId) return;
        setLoading(true); setError(null); setExpandedLeadId(null);
        const rpcLaunchId = launchId === 'all' ? null : launchId;
        try {
            const { data, error } = await supabase.rpc('get_buyer_comparison_final', { p_launch_id: rpcLaunchId });
            if (error) throw error;
            setComparisonData(data || []);
        } catch (err: any) {
            console.error(`Erro ao carregar dados comparativos:`, err);
            setError(`Não foi possível carregar os dados. (Detalhes: ${err.message})`);
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => { if (selectedLaunch) { fetchData(selectedLaunch); } }, [selectedLaunch, fetchData]);

    const sortedData = useMemo(() => {
        let sortableItems = [...comparisonData];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const valA = a[sortConfig.key]; const valB = b[sortConfig.key];
                if (typeof valA === 'string' && typeof valB === 'string') { return sortConfig.direction === 'ascending' ? valA.localeCompare(valB) : valB.localeCompare(valA); }
                if (typeof valA === 'number' && typeof valB === 'number') { return sortConfig.direction === 'ascending' ? valA - valB : valB - valA; }
                return 0;
            });
        }
        return sortableItems;
    }, [comparisonData, sortConfig]);

    const requestSort = (key: SortConfig['key']) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') { direction = 'descending'; }
        setSortConfig({ key, direction });
    };

    const kpis = useMemo(() => {
        if (!comparisonData || comparisonData.length === 0) { return { total: 0, mediaVariacao: 0, aumentaram: 0, diminuiu: 0 }; }
        const total = comparisonData.length;
        const somaVariacao = comparisonData.reduce((acc, lead) => acc + lead.score_diff, 0);
        const mediaVariacao = total > 0 ? somaVariacao / total : 0;
        const aumentaram = comparisonData.filter(lead => lead.score_diff > 0).length;
        const diminuiu = comparisonData.filter(lead => lead.score_diff < 0).length;
        return { total, mediaVariacao, aumentaram, diminuiu };
    }, [comparisonData]);
    
    const getSortIcon = (key: SortConfig['key']) => {
        if (!sortConfig || sortConfig.key !== key) { return <ChevronsUpDown size={14} className="ml-2 text-slate-400" />; }
        return sortConfig.direction === 'ascending' ? <ArrowUp size={14} className="ml-2" /> : <ArrowDown size={14} className="ml-2" />;
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-slate-100 min-h-screen">
            <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Avaliação de Compradores</h1>
                <div className="w-full sm:w-72">
                    <select id="launch-select" value={selectedLaunch} onChange={(e) => setSelectedLaunch(e.target.value)} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-3 text-base" disabled={loading}>
                        <option value="all">Visão Geral (Todos)</option>
                        {launches.map((launch) => (<option key={launch.id} value={launch.id}>{`${launch.nome} - ${launch.status}`}</option>))}
                    </select>
                </div>
            </header>

            <section className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard title="Total de Compradores Analisados" value={kpis.total.toLocaleString('pt-BR')} icon={Users} colorClass="text-emerald-500" />
                <KpiCard title="Variação Média de Score" value={kpis.mediaVariacao.toFixed(1)} icon={BarChart2} colorClass="text-sky-500" />
                <KpiCard title="Compradores que Aumentaram Score" value={kpis.aumentaram.toLocaleString('pt-BR')} icon={TrendingUp} colorClass="text-green-500" />
                <KpiCard title="Compradores que Diminuíram Score" value={kpis.diminuiu.toLocaleString('pt-BR')} icon={TrendingDown} colorClass="text-red-500" />
            </section>

            <main className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Detalhes dos Compradores</h2>
                {loading && <Spinner />}
                {!loading && error && <div className="text-center py-10 px-4 bg-red-100 text-red-700 rounded-lg"><p>{error}</p></div>}
                {!loading && !error && comparisonData.length === 0 && (<div className="text-center py-10"><p className="text-gray-600">Nenhum comprador foi encontrado para análise neste lançamento.</p></div>)}
                {!loading && !error && comparisonData.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                                <tr>
                                    <th className="px-4 py-3"><button onClick={() => requestSort('lead_email')} className="flex items-center">Email {getSortIcon('lead_email')}</button></th>
                                    <th className="px-4 py-3 text-center"><button onClick={() => requestSort('score_checkin')} className="flex items-center mx-auto">Score Check-in {getSortIcon('score_checkin')}</button></th>
                                    <th className="px-4 py-3 text-center"><button onClick={() => requestSort('score_comprador')} className="flex items-center mx-auto">Score Compra {getSortIcon('score_comprador')}</button></th>
                                    <th className="px-4 py-3 text-center"><button onClick={() => requestSort('score_diff')} className="flex items-center mx-auto">Variação {getSortIcon('score_diff')}</button></th>
                                    <th className="px-4 py-3 text-center">Ver Detalhes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedData.map((lead) => (
                                    <Fragment key={lead.lead_id}>
                                        <tr className="border-b border-slate-200 hover:bg-slate-50">
                                            <td className="px-4 py-3 font-medium text-slate-800">{lead.lead_email}</td>
                                            <td className="px-4 py-3 text-center text-slate-600">{lead.score_checkin}</td>
                                            <td className="px-4 py-3 text-center text-slate-600 font-bold">{lead.score_comprador}</td>
                                            <td className={`px-4 py-3 text-center font-bold ${lead.score_diff > 0 ? 'text-green-600' : lead.score_diff < 0 ? 'text-red-600' : 'text-slate-500'}`}>{lead.score_diff > 0 ? `+${lead.score_diff}` : lead.score_diff}</td>
                                            <td className="px-4 py-3 text-center"><button onClick={() => setExpandedLeadId(expandedLeadId === lead.lead_id ? null : lead.lead_id)} className="p-2 rounded-full hover:bg-emerald-100 text-emerald-600 transition-colors" title="Ver/Ocultar detalhes das respostas"><ChevronsUpDown size={18} /></button></td>
                                        </tr>
                                        {expandedLeadId === lead.lead_id && (<tr><td colSpan={5}><ComparisonDetailCard lead={lead} /></td></tr>)}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    );
}