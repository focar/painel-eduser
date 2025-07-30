'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { notFound } from 'next/navigation';
import SurveyForm from '@/components/survey/SurveyForm';
import { FaSpinner } from 'react-icons/fa';
// 1. Importamos o tipo 'Tables' do arquivo gerado pelo Supabase.
import type { Tables } from '@/types/database';

// 2. Inferimos o tipo diretamente da tabela 'pesquisas'.
//    Agora, SurveyData é um espelho perfeito da sua tabela.
type SurveyData = Tables<'pesquisas'> & {
    associated_question_ids: string[];
};


export default function EditarPesquisaPage({ params }: { params: { id: string } }) {
    const supabase = createClient();
    
    const [initialData, setInitialData] = useState<SurveyData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const getSurveyById = async (id: string) => {
            try {
                const { data, error } = await supabase
                    .from('pesquisas')
                    .select(`
                        *,
                        pesquisas_perguntas ( pergunta_id )
                    `)
                    .eq('id', id)
                    .single();
                
                if (error || !data) {
                    throw new Error("Pesquisa não encontrada ou erro ao buscar.");
                }
        
                const associated_ids = Array.isArray(data.pesquisas_perguntas) 
                    ? data.pesquisas_perguntas.map((pq: any) => pq.pergunta_id) 
                    : [];
                
                // Agora os tipos são 100% compatíveis
                setInitialData({
                    ...data,
                    associated_question_ids: associated_ids
                });

            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        getSurveyById(params.id);
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

    return <SurveyForm initialData={initialData} />;
}