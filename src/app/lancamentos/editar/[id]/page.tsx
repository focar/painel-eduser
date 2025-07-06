// src/app/lancamentos/editar/[id]/page.tsx

import { db } from '@/lib/supabaseClient';
import { notFound } from 'next/navigation';
import EditForm from './EditForm'; // Importa o nosso componente de cliente

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

async function getLaunchById(id: string) {
    const { data, error } = await db
        .from('lancamentos')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) {
        notFound();
    }
    
    return { 
        ...data, 
        data_inicio: data.data_inicio ? data.data_inicio.split('T')[0] : '', 
        data_fim: data.data_fim ? data.data_fim.split('T')[0] : '' 
    };
}

export default async function EditarLancamentoPage({ params }: PageProps) {
    const initialData = await getLaunchById(params.id);
    return <EditForm initialData={initialData as LaunchData} />;
}