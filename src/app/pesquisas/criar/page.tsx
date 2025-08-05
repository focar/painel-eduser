// src/app/pesquisas/criar/page.tsx
import SurveyForm from "@/components/survey/SurveyForm";
import { createClient } from "@/utils/supabase/server";
import { cookies } from 'next/headers'; // 1. Importar a função 'cookies'
import { type Question } from "@/lib/types";

export default async function CriarPesquisaPage() {
    // 2. Obter o cookieStore
    const cookieStore = cookies();
    // 3. Passar o cookieStore para o createClient
    const supabase = createClient(cookieStore);

    // O restante do código permanece o mesmo...
    const { data: questions, error } = await supabase
        .from('perguntas')
        .select('id, texto, tipo_pergunta')
        .eq('tipo_pergunta', 'escala');

    if (error) {
        console.error("Erro ao buscar perguntas:", error);
        return <p>Ocorreu um erro ao carregar as perguntas. Tente novamente.</p>;
    }

    return <SurveyForm availableQuestions={questions as Question[]} />;
}
