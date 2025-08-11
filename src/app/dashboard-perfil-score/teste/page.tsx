// src/teste teste     teste
'use client';

import { useState, useEffect, useCallback } from "react";
import { createClient } from '@/utils/supabase/client';
import { Launch } from "@/lib/types";
import { FaSpinner, FaCalculator } from "react-icons/fa";
import toast, { Toaster } from 'react-hot-toast';
import { Users, UserCheck, Percent } from "lucide-react";

// --- Tipos de Dados ---
type GeneralKpiData = {
    total_inscricoes: number;
    total_checkins: number;
};

// --- Componentes ---
const Spinner = () => (
    <div className="flex justify-center items-center h-40">
        <FaSpinner className="animate-spin text-blue-600 text-3xl mx-auto" />
    </div>
);

const KpiCard = ({ title, value, icon: Icon }: { title: string; value:string; icon: React.ElementType }) => (
    <div className="bg-white p-4 rounded-lg shadow-md text-center flex flex-col justify-center h-full">
        <Icon className="mx-auto text-blue-500 mb-2" size={28} />
        <p className="text-3xl font-bold text-slate-800">{value}</p>
        <h3 className="text-sm font-medium text-slate-500 mt-1">{title}</h3>
    </div>
);

export default function AnaliseScorePage() {
    const supabase = createClient();
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunch, setSelectedLaunch] = useState<string>('');
    const [generalKpis, setGeneralKpis] = useState<GeneralKpiData>({ total_inscricoes: 0, total_checkins: 0 });
    const [loadingKpis, setLoadingKpis] = useState(true);
    const [isCalculating, setIsCalculating] = useState(false);

    // Efeito para buscar os lançamentos disponíveis
    useEffect(() => {
        const fetchLaunches = async () => {
            const { data: launchesData } = await supabase.from('lancamentos').select('id, nome, status').in('status', ['Em Andamento', 'Concluído']);
            if (launchesData) {
                const sorted = [...launchesData].sort((a, b) => (a.status === 'Em Andamento' ? -1 : 1) || a.nome.localeCompare(b.nome));
                setLaunches(sorted);
                if (sorted.length > 0) {
                    const inProgress = sorted.find(l => l.status === 'Em Andamento');
                    setSelectedLaunch(inProgress ? inProgress.id : sorted[0].id);
                }
            }
        };
        fetchLaunches();
    }, [supabase]);

    // Efeito para buscar os dados gerais dos KPIs
    const fetchGeneralKpis = useCallback(async (launchId: string) => {
        if (!launchId) return;
        setLoadingKpis(true);
        try {
            const { data, error } = await supabase.rpc('get_geral_and_buyer_kpis', { p_launch_id: launchId });
            if (error) {
                toast.error("Erro ao carregar os totais.");
                console.error(error);
            } else {
                 if (Array.isArray(data) && data.length > 0) {
                    setGeneralKpis(data[0]);
                }
            }
        } catch (error) {
            toast.error("Ocorreu uma falha ao buscar os dados de KPI.");
        } finally {
            setLoadingKpis(false);
        }
    }, [supabase]);

    useEffect(() => {
        if (selectedLaunch) {
            fetchGeneralKpis(selectedLaunch);
        }
    }, [selectedLaunch, fetchGeneralKpis]);

    // Função que chama o novo cálculo de SCORE GERAL
    const handleCalculateScore = async () => {
        if (!selectedLaunch) {
            toast.error("Por favor, selecione um lançamento para calcular.");
            return;
        }
        setIsCalculating(true);
        const calcToast = toast.loading("A calcular os Scores Gerais. Isto pode demorar...");
        try {
            // CHAMADA PARA A NOVA FUNÇÃO SQL
            const { data, error } = await supabase.rpc('calcular_score_lancamento', {
                p_launch_id: selectedLaunch
            });
            if (error) throw error;
            toast.success(data, { id: calcToast, duration: 6000 });
            
            // Recarrega os dados para refletir os novos scores (se houver KPIs para atualizar)
            await fetchGeneralKpis(selectedLaunch);

        } catch(err: any) {
            toast.error(`Falha no cálculo: ${err.message}`, { id: calcToast });
        } finally {
            setIsCalculating(false);
        }
    };
    
    const taxaDeCheckin = generalKpis.total_checkins > 0 
        ? ((generalKpis.total_checkins / generalKpis.total_checkins) * 100).toFixed(1) + '%' 
        : '0.0%';

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen space-y-6">
            <Toaster position="top-center" />
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                {/* TÍTULO DA PÁGINA ATUALIZADO */}
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Análise de Score Geral</h1>
                <div className="flex items-center gap-4">
                    <div className="bg-white p-2 rounded-lg shadow-md">
                        <select 
                            value={selectedLaunch} 
                            onChange={(e) => setSelectedLaunch(e.target.value)} 
                            disabled={loadingKpis || isCalculating} 
                            className="w-full px-3 py-2 border-none rounded-md focus:ring-0 bg-transparent text-slate-700 font-medium text-base"
                        >
                            {launches.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.status})</option>)}
                        </select>
                    </div>
                    {/* BOTÃO ATUALIZADO */}
                    <button 
                        onClick={handleCalculateScore} 
                        disabled={isCalculating || !selectedLaunch}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white font-semibold rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50"
                        title="Calcula e salva o Score Geral para todos os leads do lançamento selecionado."
                    >
                        {isCalculating ? <FaSpinner className="animate-spin" /> : <FaCalculator />}
                        Calcular Score Geral
                    </button>
                </div>
            </header>

            <section className="space-y-6">
                <div className="bg-slate-200 p-4 rounded-lg shadow-md">
                    <h3 className="font-bold text-center text-slate-600 mb-3">Totais do Lançamento</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <KpiCard 
                            title="Total de Inscrições"
                            value={loadingKpis ? '...' : generalKpis.total_inscricoes.toLocaleString('pt-BR')}
                            icon={Users}
                        />
                        <KpiCard 
                            title="Total de Check-ins"
                            value={loadingKpis ? '...' : generalKpis.total_checkins.toLocaleString('pt-BR')}
                            icon={UserCheck}
                        />
                        <KpiCard 
                            title="Taxa de Check-in"
                            value={loadingKpis ? '...' : taxaDeCheckin}
                            icon={Percent}
                        />
                    </div>
                </div>

                {/* Você pode adicionar aqui novas seções de KPIs para o Score Geral */}

            </section>

            <main>
                 <div className="text-center py-10 bg-white rounded-lg shadow-md">
                    <p className="text-slate-600 font-semibold">Análises de Score</p>
                    <p className="text-slate-400 text-sm mt-2">Esta área pode ser desenvolvida para mostrar gráficos e detalhamentos do Score Geral dos leads.</p>
                </div>
            </main>
        </div>
    );
}