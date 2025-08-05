// src/app/perguntas/editar/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { notFound } from 'next/navigation';
import QuestionForm from '@/components/question/QuestionForm';
import { FaSpinner } from 'react-icons/fa';

// O tipo precisa corresponder exatamente ao que o QuestionForm espera
type QuestionFormData = {
  id: string;
  created_at: string;
  modified_at: string;
  texto: string;
  tipo: string;
  classe: string;
  opcoes: { texto: string; peso: number; }[];
};


export default function EditarPerguntaPage({ params }: { params: { id: string } }) {
    const supabase = createClient();
    
    const [initialData, setInitialData] = useState<QuestionFormData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchInitialData = async (id: string) => {
            try {
                // CORREÇÃO: O campo 'classe' foi adicionado à consulta select abaixo.
                // Isso garante que os dados buscados do banco de dados correspondam
                // ao formato esperado pelo componente QuestionForm.
                const { data, error } = await supabase
                    .from('perguntas')
                    .select('id, texto, tipo, classe, opcoes, created_at, modified_at')
                    .eq('id', id)
                    .single();

                if (error || !data) {
                    throw new Error("Pergunta não encontrada ou erro ao buscar.");
                }
                
                // Garantir que os dados correspondem ao tipo esperado pelo formulário
                setInitialData({
                    ...data,
                    // Garante que 'opcoes' seja sempre um array, mesmo que venha nulo do banco.
                    opcoes: data.opcoes || [{ texto: '', peso: 0 }] 
                });

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

    // Passa os dados completos para o formulário, incluindo a 'classe'.
    return <QuestionForm initialData={initialData} />;
}
