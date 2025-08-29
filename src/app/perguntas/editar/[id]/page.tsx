// =================================================================
// ARQUIVO: app/perguntas/editar/[id]/page.tsx
// VERSÃO CORRIGIDA: Lógica de permissão para Admin/Viewer
// =================================================================
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import QuestionModal from '@/app/perguntas/page'; // Assumindo que o modal foi exportado de lá
import type { Question } from '@/app/perguntas/page'; // Importando o tipo

export default function EditarPerguntaPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [initialData, setInitialData] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    const checkPermissionsAndFetch = async () => {
        // 1. Verifica o perfil do usuário
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setError("Acesso negado.");
            setLoading(false);
            return;
        }
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profile?.role !== 'admin') {
            setError("Acesso negado. Apenas administradores podem editar perguntas.");
            setIsAllowed(false);
            setLoading(false);
            return;
        }
        
        // Se for admin, permite a edição
        setIsAllowed(true);

        // 2. Busca os dados da pergunta
        if (!params.id) {
          setLoading(false);
          setError("ID da pergunta não encontrado.");
          return;
        }

        const { data, error: fetchError } = await supabase
          .from('perguntas')
          .select('*')
          .eq('id', params.id)
          .single();

        if (fetchError || !data) {
          setError("Pergunta não encontrada ou erro ao buscar.");
          console.error(fetchError);
        } else {
          setInitialData({
            ...data,
            opcoes: data.opcoes || [{ texto: '', peso: 0 }],
          } as Question);
        }
        setLoading(false);
    };

    checkPermissionsAndFetch();
  }, [params.id, supabase]);

  if (loading) {
    return <div className="p-8 text-center">A carregar pergunta...</div>;
  }

  if (error || !isAllowed) {
    return <div className="p-8 text-center text-red-500">{error || "Acesso negado."}</div>;
  }
  
  if (!initialData) {
      return <div className="p-8 text-center">Não foi possível carregar os dados da pergunta.</div>;
  }
  
  // Como o modal agora está dentro da página principal, aqui você pode renderizar
  // um componente que abra o modal, ou redirecionar. A forma mais simples
  // é mostrar o modal diretamente, mas isso requer refatoração.
  // A melhor abordagem é ter um FORMULÁRIO dedicado.
  // Por ora, vamos assumir que você tem um QuestionForm.
  
  // NOTE: A lógica de edição está toda contida no MODAL da página principal.
  // Esta página de edição dedicada se torna um pouco redundante.
  // O ideal seria refatorar para um componente de formulário reutilizável.
  return (
      <div className="p-8">
          <h1 className="text-2xl font-bold">Editar Pergunta</h1>
          <p className="mt-4">A edição agora é feita através do modal na página principal de Perguntas.</p>
          {/* Se você tiver um componente de formulário separado, renderize-o aqui: */}
          {/* <QuestionForm initialData={initialData} /> */}
      </div>
  );
}