// src/app/pesquisas/editar/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { notFound } from 'next/navigation';
import SurveyForm from '@/components/survey/SurveyForm'; // Assumindo que este componente existe
import { FaSpinner } from 'react-icons/fa';
import type { Tables } from '@/types/database';

// Tipos de Dados para esta página
type SurveyData = Tables<'pesquisas'> & {
    associated_question_ids: string[];
};
type Question = {
    id: string;
    texto: string;
};

export default function EditarPesquisaPage({ params }: { params: { id: string } }) {
    const supabase = createClient();
    
    const [initialData, setInitialData] = useState<SurveyData | null>(null);
    const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchInitialData = async (id: string) => {
            try {
                // Usamos Promise.all para buscar os dados da pesquisa e a lista de perguntas de score em paralelo
                const [surveyResult, questionsResult] = await Promise.all([
                    supabase
                        .from('pesquisas')
                        .select(`*, pesquisas_perguntas ( pergunta_id )`)
                        .eq('id', id)
                        .single(),
                    supabase
                        .from('perguntas')
                        .select('id, texto')
                        .eq('classe', 'score') // Filtra apenas perguntas de score
                        .order('texto')
                ]);

                const { data: surveyData, error: surveyError } = surveyResult;
                const { data: questionsData, error: questionsError } = questionsResult;

                if (surveyError || !surveyData) throw new Error("Pesquisa não encontrada ou erro ao buscar.");
                if (questionsError) throw new Error("Erro ao buscar a lista de perguntas de score.");
        
                const associated_ids = Array.isArray(surveyData.pesquisas_perguntas) 
                    ? surveyData.pesquisas_perguntas.map((pq: any) => pq.pergunta_id) 
                    : [];
                
                setInitialData({
                    ...surveyData,
                    associated_question_ids: associated_ids
                });

                setAvailableQuestions(questionsData || []);

            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData(params.id);
    }, [params.id, supabase]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <FaSpinner className="animate-spin text-4xl text-blue-600" />
            </div>
        );
    }

    if (error) {
        return <div className="text-center p-8 text-red-500">{error}</div>;
    }

    if (!initialData) {
        notFound();
    }

    return <SurveyForm initialData={initialData} availableQuestions={availableQuestions} />;
}