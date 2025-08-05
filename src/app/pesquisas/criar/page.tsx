// src/app/pesquisas/criar/page.tsx
import SurveyForm from "@/components/survey/SurveyForm";
import { createClient } from "@/utils/supabase/server";
import { cookies } from 'next/headers';
import { type Question } from "@/lib/types";

export default async function CriarPesquisaPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // CORREÇÃO: A consulta foi ajustada para usar a coluna 'classe' em vez de 'tipo_pergunta'.
    // Agora estamos buscando apenas as perguntas cuja classe é 'score', como a UI sugere.
    const { data: questions, error } = await supabase
        .from('perguntas')
        .select('id, texto, tipo, classe') // Selecionando as colunas corretas
        .eq('classe', 'score');           // Filtrando pela coluna 'classe'

    if (error) {
        console.error("Erro ao buscar perguntas:", error);
        // Esta mensagem de erro não deve mais aparecer após a correção.
        return <p>Ocorreu um erro ao carregar as perguntas. Tente novamente.</p>;
    }

    // O 'as Question[]' agora funcionará porque vamos corrigir o tipo no próximo passo.
    return <SurveyForm availableQuestions={questions as Question[]} />;
}
