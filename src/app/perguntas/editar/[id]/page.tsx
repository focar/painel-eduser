// src/app/perguntas/editar/[id]/page.tsx

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers'; // ✅ 1. Importar 'cookies'
import { notFound } from 'next/navigation';
import QuestionForm from '@/components/question/QuestionForm';
import { Question } from '@/types/question';

export default async function EditarPerguntaPage({ params }: { params: { id: string } }) {
  const cookieStore = cookies(); // ✅ 2. Obter a 'cookieStore'
  const supabase = createClient(cookieStore); // ✅ 3. Passar a 'cookieStore' como argumento

  // O resto do arquivo permanece igual...
  const { data, error } = await supabase
    .from('perguntas')
    .select('id, texto, tipo, classe, opcoes, created_at, modified_at')
    .eq('id', params.id)
    .single();

  if (error || !data) {
    console.error('Supabase error or no data found:', error?.message);
    notFound();
  }

  // ✅ ESTA É A LINHA MAIS IMPORTANTE AGORA
  //console.log("DADOS RECEBIDOS DO SUPABASE:", JSON.stringify(data, null, 2));

  const initialData: Question = {
    ...data,
    opcoes: data.opcoes || [{ texto: '', peso: 0 }],
  };

  return <QuestionForm initialData={initialData} />;
}