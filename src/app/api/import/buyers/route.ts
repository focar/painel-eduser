// Em: src/app/api/import/buyers/route.ts

import { db } from '@/lib/supabaseClient';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { launchId, buyerEmails } = await req.json();

    if (!launchId || !buyerEmails || !Array.isArray(buyerEmails) || buyerEmails.length === 0) {
      return NextResponse.json({ message: 'ID do Lançamento e uma lista de e-mails são obrigatórios.' }, { status: 400 });
    }

    // Atualiza apenas os leads que estão na lista de e-mails dos compradores
    const { count, error } = await db
      .from('leads')
      .update({ is_buyer: true })
      // ✅ CORREÇÃO: Usando 'launch_id' que é o nome correto da coluna no seu banco de dados.
      .eq('launch_id', launchId) 
      .in('email', buyerEmails);

    if (error) {
      // Se houver um erro no banco, lança a exceção para ser capturada pelo bloco catch
      throw error;
    }

    return NextResponse.json({ message: 'Compradores atualizados com sucesso', updatedCount: count ?? 0 }, { status: 200 });

  } catch (error: any) {
    console.error('Erro na API de Importação de Compradores:', error);
    return NextResponse.json({ message: error.message || 'Ocorreu um erro no servidor.' }, { status: 500 });
  }
}