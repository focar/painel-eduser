// src/app/lancamentos/editar/[id]/page.tsx

// CORREÇÃO: Vamos usar o cliente recomendado para Componentes de Servidor
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import EditForm from './EditForm';

type LaunchData = {
    id: string;
    nome: string;
    descricao: string;
    data_inicio: string;
    data_fim: string;
    status: string;
};

type PageProps = {
    params: { id: string };
};

// A função agora é assíncrona para usar o cliente de servidor
async function getLaunchById(id: string) {
    // CORREÇÃO: Criação do cliente de servidor
    const supabase = createServerComponentClient({ cookies });

    const { data, error } = await supabase
        .from('lancamentos')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) {
        notFound();
    }
    
    // Formata as datas no servidor antes de passar para o cliente
    return { 
        ...data, 
        data_inicio: data.data_inicio ? data.data_inicio.split('T')[0] : '', 
        data_fim: data.data_fim ? data.data_fim.split('T')[0] : '' 
    };
}

export default async function EditarLancamentoPage({ params }: PageProps) {
    const initialData = await getLaunchById(params.id);
    // Passa os dados para o componente de cliente que contém o formulário
    return <EditForm initialData={initialData as LaunchData} />;
}