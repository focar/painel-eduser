// Conteúdo ATUALIZADO para: src/app/perguntas/editar/[id]/page.tsx

'use client'; // Transformamos esta página em um Componente de Cliente

import { useState, useEffect } from 'react';
import QuestionForm from "@/components/question/QuestionForm";
import { db } from "@/lib/supabaseClient";

// A página agora recebe 'params' como qualquer componente de cliente
export default function EditarPerguntaPage({ params }: { params: { id: string } }) {
    const [initialData, setInitialData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Usamos o useEffect para buscar os dados no lado do cliente
    useEffect(() => {
        const fetchQuestion = async () => {
            if (!params.id) return;
            try {
                const { data, error } = await db.from('perguntas').select('*').eq('id', params.id).single();
                if (error || !data) {
                    throw new Error("Pergunta não encontrada.");
                }
                setInitialData(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchQuestion();
    }, [params.id]);

    if (isLoading) {
        return <div className="p-8 text-center"><i className="fas fa-spinner fa-spin"></i> Carregando pergunta...</div>;
    }

    if (error) {
        return <div className="p-8 text-center text-red-500">{error}</div>;
    }

    // Renderizamos o mesmo formulário, passando os dados que buscamos
    return <QuestionForm initialData={initialData} />;
}