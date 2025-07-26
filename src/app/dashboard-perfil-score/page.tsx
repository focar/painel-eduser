'use client';

import { useState, useEffect, useCallback } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/lib/supabase-types"; // <-- CORREÇÃO AQUI
import { Launch, ScoreProfileQuestion } from "@/lib/types";
import ScoreProfileCard from "@/components/dashboard/ScoreProfileCard";
import { FaSpinner, FaFileCsv } from "react-icons/fa";
import toast from 'react-hot-toast';

const scoreCategories = [
    { key: 'quente', name: 'Quente (>80)', color: 'text-red-500', bgColor: 'bg-red-50', borderColor: 'border-red-500' },
    { key: 'quente_morno', name: 'Quente-Morno (65-79)', color: 'text-orange-500', bgColor: 'bg-orange-50', borderColor: 'border-orange-500' },
    { key: 'morno', name: 'Morno (50-64)', color: 'text-amber-500', bgColor: 'bg-amber-50', borderColor: 'border-amber-500' },
    { key: 'morno_frio', name: 'Morno-Frio (35-49)', color: 'text-sky-500', bgColor: 'bg-sky-50', borderColor: 'border-sky-500' },
    { key: 'frio', name: 'Frio (<35)', color: 'text-blue-500', bgColor: 'bg-blue-50', borderColor: 'border-blue-500' },
] as const;

type ScoreCategoryKey = typeof scoreCategories[number]['key'];
type KpiData = Record<ScoreCategoryKey, number>;

const Spinner = () => (
    <div className="flex justify-center items-center h-40">
        <FaSpinner className="animate-spin text-blue-600 text-3xl mx-auto" />
    </div>
);

// Este componente não é mais necessário, a lógica estará integrada na página.
// const KpiCard = ...

export default function PerfilDeScorePage() {
    const supabase = createClientComponentClient<Database>();
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunch, setSelectedLaunch] = useState<string>('');
    const [selectedScore, setSelectedScore] = useState<ScoreCategoryKey>('quente');
    const [data, setData] = useState<ScoreProfileQuestion[]>([]);
    const [kpiData, setKpiData] = useState<KpiData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        const fetchLaunches = async () => {
            const { data: launchesData } = await supabase.from('lancamentos').select('id, nome, status').in('status', ['Em Andamento', 'Concluído']);
            if (launchesData) {
                const sorted = [...launchesData].sort((a, b) => (a.status === 'Em Andamento' ? -1 : 1) || a.nome.localeCompare(b.nome));
                setLaunches(sorted);
                if (sorted.length > 0) setSelectedLaunch(sorted[0].id);
            }
        };
        fetchLaunches();
    }, [supabase]);

    const fetchData = useCallback(async (launchId: string) => {
        if (!launchId) return;
        setLoading(true);

        const { data: kpiResult, error: kpiError } = await supabase.rpc('get_score_category_totals', { p_launch_id: launchId });
        
        if (kpiError) {
            toast.error("Erro ao carregar os totais.");
            console.error(kpiError);
            setKpiData(null);
        } else {
            setKpiData(kpiResult);
        }

        const { data: breakdownResult, error: breakdownError } = await supabase.rpc('get_score_profile_by_answers', { 
            p_launch_id: launchId,
            p_score_category: selectedScore
        });
        
        if (breakdownError) {
            toast.error("Erro ao carregar dados de análise.");
            console.error(breakdownError);
            setData([]);
        } else {
            setData((breakdownResult as unknown as ScoreProfileQuestion[]) || []);
        }
        setLoading(false);
    }, [supabase, selectedScore]); // Adicionado selectedScore como dependência

    useEffect(() => {
        if (selectedLaunch) {
            fetchData(selectedLaunch);
        }
    }, [selectedLaunch, fetchData]);

    // Atualiza apenas os dados dos cards quando o score selecionado muda
    useEffect(() => {
        const fetchBreakdownOnly = async () => {
            if (!selectedLaunch) return;
            // Mostra um loading mais subtil para a troca de tabs
            setLoading(true); 
            const { data: breakdownResult, error: breakdownError } = await supabase.rpc('get_score_profile_by_answers', { 
                p_launch_id: selectedLaunch,
                p_score_category: selectedScore
            });
            if (breakdownError) {
                toast.error("Erro ao carregar dados de análise.");
                setData([]);
            } else {
                setData((breakdownResult as unknown as ScoreProfileQuestion[]) || []);
            }
            setLoading(false);
        };
        fetchBreakdownOnly();
    }, [selectedScore, selectedLaunch, supabase]);


    const handleExport = async () => {
        toast.success('Funcionalidade de exportação a ser implementada!');
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Perfil de Score por Respostas</h1>
                <div className="flex gap-4">
                    <div className="bg-white p-2 rounded-lg shadow-md">
                        <select value={selectedLaunch} onChange={(e) => setSelectedLaunch(e.target.value)} disabled={loading} className="w-full px-3 py-2 border-none rounded-md focus:ring-0 bg-transparent text-slate-700 font-medium">
                            {launches.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.status})</option>)}
                        </select>
                    </div>
                    {/* O Dropdown de Score foi removido e substituído pelos KPIs interativos */}
                </div>
            </header>

            {/* ================== NOVA SEÇÃO DE KPIS INTERATIVOS ================== */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-grow grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                    {!kpiData && loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="bg-white p-4 rounded-lg shadow-md h-20 animate-pulse"></div>
                        ))
                    ) : (
                        scoreCategories.map(cat => (
                            <button
                                key={cat.key}
                                onClick={() => setSelectedScore(cat.key)}
                                className={`p-4 rounded-lg shadow-md text-center transition-all duration-200 border-2 ${
                                    selectedScore === cat.key
                                        ? `${cat.bgColor} ${cat.borderColor}`
                                        : 'bg-white border-transparent hover:border-slate-300'
                                }`}
                            >
                                <p className="text-sm text-slate-500">{cat.name}</p>
                                <p className={`text-2xl font-bold ${cat.color}`}>
                                    {kpiData ? kpiData[cat.key].toLocaleString('pt-BR') : <FaSpinner className="animate-spin mx-auto mt-1" />}
                                </p>
                            </button>
                        ))
                    )}
                </div>
                <div className="flex-shrink-0">
                    <button onClick={handleExport} disabled={isExporting || loading} className="w-full h-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 text-base">
                        {isExporting ? <FaSpinner className="animate-spin" /> : <FaFileCsv />}
                        Exportar Leads
                    </button>
                </div>
            </div>
            {/* =================================================================== */}

            <main>
                {loading ? <Spinner /> : (
                    data.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {data.map(question => (
                                <ScoreProfileCard key={question.question_id} questionData={question} />
                            ))}
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