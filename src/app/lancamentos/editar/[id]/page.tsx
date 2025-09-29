// src/app/lancamentos/editar/[id]/page.tsx

export const runtime = 'nodejs';

// Importa a versão de SERVIDOR do createClient
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
export type PerfilLancamento = { id: number; nome_perfil: string; };

type PageProps = { params: { id: string }; };

// --- Componente da Página (Componente de Servidor) ---
export default async function EditarLancamentoPage({ params }: PageProps) {
    // A função createClient do servidor lida com os cookies internamente
    // Criamos uma única instância do Supabase aqui para ser usada por todas as funções
    const supabase = createClient();

    // Função interna para buscar os dados de um lançamento específico
    async function getLaunchById(id: string): Promise<LaunchData> {
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

    // Função interna para buscar todas as pesquisas disponíveis
    async function getAllSurveys(): Promise<Survey[]> {
        const { data, error } = await supabase.from('pesquisas').select('id, nome');
        if (error) return [];
        return data;
    }

    // Função interna para buscar todos os Perfis-Lançamento disponíveis
    async function getAllPerfisLancamento(): Promise<PerfilLancamento[]> {
        const { data, error } = await supabase.from('perfis_de_acesso').select('id, nome_perfil');
        if (error) return [];
        return data;
    }

    // Função interna para buscar os perfis já associados a este lançamento
    async function getAssignedPerfis(launchId: string): Promise<number[]> {
        const { data, error } = await supabase
            .from('lancamentos_perfis_acesso')
            .select('perfil_de_acesso_id')
            .eq('lancamento_id', launchId);
        
        if (error) return [];
        return data.map(item => item.perfil_de_acesso_id);
    }

    // Executa todas as buscas de dados necessárias
    const initialData = await getLaunchById(params.id);
    const allSurveys = await getAllSurveys();
    const allPerfis = await getAllPerfisLancamento();
    const assignedPerfilIds = await getAssignedPerfis(params.id);
    
    // Renderiza o componente de cliente com todos os dados
    return <EditForm 
        initialData={initialData} 
        allSurveys={allSurveys} 
        allPerfis={allPerfis} 
        initialAssignedPerfilIds={assignedPerfilIds} 
    />;
}
