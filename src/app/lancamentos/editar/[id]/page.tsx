// CAMINHO: src/app/lancamentos/editar/[id]/page.tsx

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import EditForm from './EditForm'; // Importa o formulário do ficheiro ao lado

// --- Tipos de Dados ---
type LaunchEvent = { nome: string; data_inicio: string; data_fim: string; };
export type LaunchData = {
    id: string;
    nome: string;
    descricao: string;
    status: string;
    eventos: LaunchEvent[];
    associated_survey_ids: string[];
};
export type Survey = { id: string; nome: string; };
type PageProps = { params: { id: string }; };

// Função para buscar o lançamento por ID
async function getLaunchById(id: string): Promise<LaunchData> {
    const supabase = createServerComponentClient({ cookies });
    const { data, error } = await supabase
        .from('lancamentos')
        .select('id, nome, descricao, status, eventos, associated_survey_ids')
        .eq('id', id)
        .single();
    if (error || !data) notFound();
    return { 
        ...data, 
        eventos: data.eventos || [],
        associated_survey_ids: data.associated_survey_ids || []
    };
}

// Função para buscar TODAS as pesquisas disponíveis
async function getAllSurveys(): Promise<Survey[]> {
    const supabase = createServerComponentClient({ cookies });
    const { data, error } = await supabase.from('pesquisas').select('id, nome');
    if (error) {
        console.error("Erro ao buscar pesquisas:", error);
        return [];
    }
    return data;
}

// Componente da Página Principal que busca os dados no servidor
export default async function EditarLancamentoPage({ params }: PageProps) {
    const initialData = await getLaunchById(params.id);
    const allSurveys = await getAllSurveys();
    
    // Passa os dados para o formulário no cliente
    return <EditForm initialData={initialData} allSurveys={allSurveys} />;
}