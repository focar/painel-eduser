"use client";

import { useState, useEffect } from "react";
import QuestionForm from "@/components/Question/QuestionForm";
// --- CORREÇÃO 1: Importa o novo cliente para o navegador ---
import { createClient } from '@/utils/supabase/client';

export default function EditarPerguntaPage({
  params,
}: {
  params: { id: string };
}) {
  // --- CORREÇÃO 2: Usa a nova forma de criar o cliente ---
  const supabase = createClient();
  const [initialData, setInitialData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuestion = async () => {
      if (!params.id) return;
      try {
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