// =================================================================
// ARQUIVO NOVO: app/api/process-csv-lote/route.ts
// Rota de API segura que serve como intermediária entre o frontend
// e a Edge Function da Supabase.
// =================================================================

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Função para converter um stream de ficheiro para Base64
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

    // A sua Edge Function espera um Data URL (base64)
    const csvContentAsDataURL = await fileToDataURL(file);

    // Criar um cliente Supabase com privilégios de serviço para chamar a Edge Function
    // NOTA: É mais seguro usar um cliente de serviço aqui para não expor a service_role_key no browser.
    // As variáveis de ambiente devem estar configuradas no seu projeto Vercel/Next.js.
    const supabase = createRouteHandlerClient({ cookies }, {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY, // USAR A CHAVE DE SERVIÇO!
    });

    // Invocar a Edge Function
    const { data, error } = await supabase.functions.invoke('process-csv-import-lote', {
      body: {
        csvContent: csvContentAsDataURL,
        launch_id: launchId,
      },
    });

    if (error) {
      // Tenta extrair uma mensagem de erro mais útil do corpo do erro, se disponível
      const errorMessage = error.context?.message || error.message;
      throw new Error(`Erro ao invocar a Edge Function: ${errorMessage}`);
    }

    // Retorna a resposta da Edge Function diretamente para o frontend
    return NextResponse.json(data, { status: 200 });

  } catch (e: any) {
    console.error('Erro na API Route /api/process-csv-lote:', e);
    return NextResponse.json({ message: e.message || 'Ocorreu um erro inesperado.' }, { status: 500 });
  }
}
