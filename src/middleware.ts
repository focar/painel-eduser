// Caminho do arquivo: src/middleware.ts

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/middleware' // Usa o auxiliar que já criamos

export async function middleware(request: NextRequest) {
  // Cria o cliente e a resposta usando nosso arquivo auxiliar
  const { supabase, response } = createClient(request)

  // Tenta obter a sessão do usuário (se ele está logado ou não)
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // REGRA 1: Se NÃO há um usuário logado (!session) E ele NÃO está na página de login,
  // então redirecionamos ele para a página de login.
  if (!session && request.nextUrl.pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // REGRA 2: Se HÁ um usuário logado (session) E ele está tentando acessar a página de login,
  // então redirecionamos ele para o dashboard principal, pois ele já está logado.
  if (session && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard-resumo', request.url))
  }

  // Se nenhuma das regras acima se aplicar, permite que o usuário continue para onde ia.
  return response
}

// Configuração que diz ao Next.js para rodar este middleware em TODAS as páginas,
// exceto arquivos internos e de imagem.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}