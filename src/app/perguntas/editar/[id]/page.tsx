'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { notFound } from 'next/navigation';
import QuestionForm from '@/components/question/QuestionForm';
import { FaSpinner } from 'react-icons/fa';
import type { Tables } from '@/types/database';

type QuestionData = Tables<'perguntas'>;

// ================== INÍCIO DA CORREÇÃO ==================
// 1. Definimos o tipo 'Option' que o componente QuestionForm espera.
//    Este tipo deve corresponder à estrutura de cada objeto dentro do JSON 'opcoes'.
type Option = {
    texto: string;
    peso: number;
};
// ================== FIM DA CORREÇÃO ====================

export default function EditQuestionPage({ params }: { params: { id: string } }) {
    const supabase = createClient();
    
    const [initialData, setInitialData] = useState<QuestionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchQuestion = async () => {
            try {
                const { data, error } = await supabase
                    .from('perguntas')
                    .select('*')
                    .eq('id', params.id)
                    .single();

                if (error || !data) {
                    throw new Error('Pergunta não encontrada ou erro ao buscar.');
                }
                
                setInitialData(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchQuestion();
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

    // 2. Preparamos os dados para o formulário, convertendo 'opcoes' para o tipo correto.
    const formInitialData = {
        ...initialData,
        // Garantimos que 'opcoes' seja um array de 'Option' antes de passá-lo para o componente
        opcoes: (Array.isArray(initialData.opcoes) ? initialData.opcoes : []) as Option[],
    };

    // 3. Passamos os dados já formatados para o formulário.
    return <QuestionForm initialData={formInitialData} />;
}