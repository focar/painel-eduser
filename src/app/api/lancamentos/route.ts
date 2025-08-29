// /api/lancamentos/route.ts - VERSÃO NOVA E CORRETA

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const cookieStore = cookies();
  // Usando a biblioteca @supabase/ssr que já padronizamos
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );

  // Uma única chamada segura para a nossa função universal
  const { data: lancamentos, error } = await supabase.rpc('get_lancamentos_permitidos');

  if (error) {
    console.error('Erro ao buscar lançamentos permitidos via API:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(lancamentos);
}