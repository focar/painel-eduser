// Conteúdo FINAL e CORRIGIDO para: src/app/perguntas/editar/[id]/page.tsx

"use client";

import { useState, useEffect } from "react";
import QuestionForm from "@/components/question/QuestionForm";
// CORREÇÃO: Importa o cliente recomendado
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function EditarPerguntaPage({
  params,
}: {
  params: { id: string };
}) {
  // CORREÇÃO: Cria a instância do cliente da forma correta
  const supabase = createClientComponentClient();
  const [initialData, setInitialData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuestion = async () => {
      if (!params.id) return;
      try {
        // CORREÇÃO: Usa a variável 'supabase' local
        const { data, error: dbError } = await supabase
          .from("perguntas")
          .select("*")
          .eq("id", params.id)
          .single();

        if (dbError || !data) {
          throw new Error("Pergunta não encontrada ou erro ao buscar.");
        }
        setInitialData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestion();
    // CORREÇÃO: Adicionado 'supabase' ao array de dependências do useEffect
  }, [params.id, supabase]);

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <i className="fas fa-spinner fa-spin"></i> Carregando pergunta...
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  return <QuestionForm initialData={initialData} />;
}
