// =================================================================
// ARQUIVO CORRIGIDO: app/api/process-csv-lote/route.ts
// A lógica permanece a mesma, apenas a forma de criar o cliente
// Supabase foi atualizada para a biblioteca correta.
// =================================================================

// MUDANÇA 1: Importamos o createClient padrão, que é usado para criar clientes de admin no backend.
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Função para converter um stream de ficheiro para Base64 (permanece igual)
async function fileToDataURL(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    return `data:${file.type};base64,${base64}`;
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const launchId = formData.get('launch_id') as string | null;

        if (!file) {
            return NextResponse.json({ message: 'Nenhum ficheiro enviado.' }, { status: 400 });
        }
        if (!launchId) {
            return NextResponse.json({ message: 'O ID do lançamento é obrigatório.' }, { status: 400 });
        }

        const csvContentAsDataURL = await fileToDataURL(file);

        // MUDANÇA 2: Criamos o cliente Supabase usando a chave de serviço (service_role).
        // Esta é a forma correta e moderna de criar um cliente com privilégios de admin no backend.
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY! // USAR A CHAVE DE SERVIÇO!
        );

        // Invocar a Edge Function (esta parte permanece igual)
        const { data, error } = await supabase.functions.invoke('process-csv-import-lote', {
            body: {
                csvContent: csvContentAsDataURL,
                launch_id: launchId,
            },
        });

        if (error) {
            const errorMessage = error.context?.message || error.message;
            throw new Error(`Erro ao invocar a Edge Function: ${errorMessage}`);
        }

        return NextResponse.json(data, { status: 200 });

    } catch (e: any) {
        console.error('Erro na API Route /api/process-csv-lote:', e);
        return NextResponse.json({ message: e.message || 'Ocorreu um erro inesperado.' }, { status: 500 });
    }
}