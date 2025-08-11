// src/app/perguntas/editar/[id]/page.tsx
// Este é um Componente de SERVIDOR. A sua única responsabilidade
// é buscar os dados da pergunta e entregar para o componente de formulário.

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import QuestionForm from '@/components/question/QuestionForm'; // Importa o formulário
import { Question } from '@/types/question'; // Importa o tipo

// A página de edição é um componente assíncrono
export default async function EditarPerguntaPage({ params }: { params: { id: string } }) {
  const supabase = createServerComponentClient({ cookies });

  // Busca os dados da pergunta específica usando o ID da URL.
  const { data, error } = await supabase
    .from('perguntas')
    .select('id, texto, tipo, classe, opcoes, created_at, modified_at')
    .eq('id', params.id)
    .single(); // .single() busca um único resultado

  // Se a pergunta não for encontrada, exibe a página de erro 404 do Next.js.
  if (error || !data) {
    console.error('Erro ao buscar pergunta ou não encontrada:', error?.message);
    notFound();
  }

  // Prepara os dados iniciais, garantindo que 'opcoes' seja sempre um array.
  const initialData: Question = {
    ...data,
    opcoes: data.opcoes || [{ texto: '', peso: 0 }],
  };

  // Renderiza o formulário (QuestionForm) e passa os dados para ele.
  // Esta é a linha que causava o erro. Agora vai funcionar.
  return <QuestionForm initialData={initialData} />;
}
