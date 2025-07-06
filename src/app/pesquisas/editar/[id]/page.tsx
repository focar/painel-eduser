// Conteúdo CORRIGIDO para: src/app/pesquisas/editar/[id]/page.tsx

import SurveyForm from "@/components/survey/SurveyForm";
import { db } from "@/lib/supabaseClient";

async function getSurveyById(id: string) {
    const { data, error } = await db
        .from('pesquisas')
        .select(`
            id,
            nome,
            categoria_pesquisa,
            status,
            pesquisas_perguntas ( pergunta_id )
        `)
        .eq('id', id)
        .single();
    
    if (error) {
        console.error("Erro ao buscar pesquisa:", error);
        return null;
    }

    // ### INÍCIO DA CORREÇÃO ###
    // Verificamos se pesquisas_perguntas existe e é um array antes de usar o .map()
    const associated_ids = Array.isArray(data.pesquisas_perguntas) 
        ? data.pesquisas_perguntas.map(pq => pq.pergunta_id) 
        : [];
    // ### FIM DA CORREÇÃO ###

    // Formata os dados para o nosso componente de formulário
    return {
        ...data,
        associated_question_ids: associated_ids
    };
}

export default async function EditarPesquisaPage({ params }: { params: { id: string } }) {
    // Usamos um bloco try...catch para lidar com possíveis erros durante a busca de dados
    try {
        const surveyData = await getSurveyById(params.id);

        if (!surveyData) {
            return <div className="text-center p-8">Pesquisa não encontrada.</div>;
        }

        return <SurveyForm initialData={surveyData} />;
    } catch (error: any) {
        return (
            <div className="text-center p-8">
                <h1 className="text-2xl font-bold text-red-500">Erro ao Carregar</h1>
                <p className="mt-2 text-slate-600">{error.message}</p>
            </div>
        );
    }
}