// CAMINHO: src/app/lancamentos/editar/[id]/page.tsx

// --- CORREÇÃO FINAL: Força o uso do runtime Node.js ---
// Esta linha pode resolver outros erros relacionados ao "Edge Runtime", mas não o erro de tipo.
export const runtime = 'nodejs';

// 1. Importe a função 'cookies'
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import EditForm from './EditForm';

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

// Define o tipo das props que a página recebe do Next.js
type PageProps = { params: { id: string }; };

// Função para buscar os dados de um lançamento específico no servidor
async function getLaunchById(id: string): Promise<LaunchData> {
    // 2. Obtenha a 'cookieStore'
    const cookieStore = cookies();
    // 3. Passe a 'cookieStore' como argumento para createClient
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase
        .from('lancamentos')
        .select('id, nome, descricao, status, eventos, associated_survey_ids')
        .eq('id', id)
        .single();

    if (error || !data) {
        notFound();
    }

    return {
        ...data,
        descricao: data.descricao || '',
        eventos: (data.eventos as LaunchEvent[]) || [],
        associated_survey_ids: data.associated_survey_ids || []
    };
}

// Função para buscar todas as pesquisas disponíveis no servidor
async function getAllSurveys(): Promise<Survey[]> {
    // 2. Obtenha a 'cookieStore'
    const cookieStore = cookies();
    // 3. Passe a 'cookieStore' como argumento para createClient
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase.from('pesquisas').select('id, nome');
    if (error) {
        console.error("Erro ao buscar pesquisas:", error);
        return [];
    }
    return data;
}

// --- Componente da Página (Componente de Servidor) ---
export default async function EditarLancamentoPage({ params }: PageProps) {
    const initialData = await getLaunchById(params.id);
    const allSurveys = await getAllSurveys();
    
    return <EditForm initialData={initialData} allSurveys={allSurveys} />;
}