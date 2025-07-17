// src/app/lancamentos/editar/[id]/page.tsx

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import EditForm from './EditForm';

// --- Tipos de Dados ---
type LaunchEvent = {
    nome: string;
    data_inicio: string;
    data_fim: string;
};

type LaunchData = {
    id: string;
    nome: string;
    descricao: string;
    status: string;
    eventos: LaunchEvent[];
};

type PageProps = {
    params: { id: string };
};

async function getLaunchById(id: string): Promise<LaunchData> {
    const supabase = createServerComponentClient({ cookies });

    const { data, error } = await supabase
        .from('lancamentos')
        .select('id, nome, descricao, status, eventos') // Busca a nova estrutura
        .eq('id', id)
        .single();

    if (error || !data) {
        notFound();
    }
    
    return { 
        ...data, 
        eventos: data.eventos || [] // Garante que eventos seja sempre um array
    };
}

export default async function EditarLancamentoPage({ params }: PageProps) {
    const initialData = await getLaunchById(params.id);
    return <EditForm initialData={initialData} />;
}
