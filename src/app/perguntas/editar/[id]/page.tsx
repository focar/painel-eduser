// =================================================================
// ARQUIVO: app/perguntas/editar/[id]/page.tsx
// VERSÃO FINAL CORRIGIDA: Este arquivo agora importa e utiliza
// o componente QuestionForm, que foi restaurado.
// =================================================================
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

// --- [CORREÇÃO APLICADA AQUI] ---
// Importa o componente QuestionForm do seu local restaurado.
// Verifique se este caminho corresponde à sua estrutura de pastas.
import QuestionForm from '@/components/question/QuestionForm'; 

// A tipagem da Pergunta
export interface Question {
  id?: string;
  texto: string;
  tipo: 'multipla_escolha' | 'verdadeiro_falso' | 'sim_nao' | 'texto_livre';
  classe: 'Score' | 'Perfil' | 'Nenhum';
  opcoes: { texto: string; peso: number }[];
  created_at: string;
  modified_at: string;
}


export default function EditarPerguntaPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [initialData, setInitialData] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) {
      setLoading(false);
      setError("ID da pergunta não encontrado.");
      return;
    }

    const fetchPergunta = async () => {
      const { data, error } = await supabase
        .from('perguntas')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error || !data) {
        setError("Pergunta não encontrada ou erro ao buscar.");
        console.error(error);
      } else {
        // Garante que 'opcoes' seja sempre um array
        setInitialData({
          ...data,
          opcoes: data.opcoes || [{ texto: '', peso: 0 }],
        } as Question);
      }
      setLoading(false);
    };

    fetchPergunta();
  }, [params.id, supabase]);

  if (loading) {
    return <div className="p-8 text-center">A carregar pergunta...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  if (!initialData) {
    return <div className="p-8 text-center">Não foi possível carregar os dados da pergunta.</div>;
  }

  // Renderiza o formulário com os dados iniciais da pergunta carregada.
  return <QuestionForm initialData={initialData} />;
}
