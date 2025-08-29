// CAMINHO: src/app/lancamentos/editar/[id]/page.tsx

export const runtime = 'nodejs';

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
    // A coluna perfil_de_acesso_id foi removida daqui
};
export type Survey = { id: string; nome: string; };
export type PerfilLancamento = { id: number; nome_perfil: string; };

type PageProps = { params: { id: string }; };

// Função para buscar os dados de um lançamento específico no servidor
async function getLaunchById(id: string): Promise<LaunchData> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase
        .from('lancamentos')
        // A coluna perfil_de_acesso_id foi removida do select
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
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { data, error } = await supabase.from('pesquisas').select('id, nome');
    if (error) return [];
    return data;
}

// Função para buscar todos os Perfis-Lançamento disponíveis no servidor
async function getAllPerfisLancamento(): Promise<PerfilLancamento[]> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { data, error } = await supabase.from('perfis_de_acesso').select('id, nome_perfil');
    if (error) return [];
    return data;
}

// ================== NOVA FUNÇÃO ==================
// Função para buscar os perfis já associados a este lançamento
async function getAssignedPerfis(launchId: string): Promise<number[]> {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { data, error } = await supabase
        .from('lancamentos_perfis_acesso')
        .select('perfil_de_acesso_id')
        .eq('lancamento_id', launchId);
    
    if (error) return [];
    return data.map(item => item.perfil_de_acesso_id);
}
// ================================================

// --- Componente da Página (Componente de Servidor) ---
export default async function EditarLancamentoPage({ params }: PageProps) {
    const initialData = await getLaunchById(params.id);
    const allSurveys = await getAllSurveys();
    const allPerfis = await getAllPerfisLancamento();
    // ================== ADIÇÃO ==================
    // Busca os perfis já associados e passa para o formulário
    const assignedPerfilIds = await getAssignedPerfis(params.id);
    // ============================================
    
    return <EditForm 
        initialData={initialData} 
        allSurveys={allSurveys} 
        allPerfis={allPerfis} 
        initialAssignedPerfilIds={assignedPerfilIds} 
    />;
}
