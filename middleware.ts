import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request)

  // Atualiza a sessão do usuário. Essencial para manter o login ativo.
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Se o usuário não está logado e não está tentando acessar a página de login,
  // redireciona ele para a página de login.
  if (!session && request.nextUrl.pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Se o usuário já está logado e tenta acessar a página de login,
  // redireciona ele para o dashboard principal.
  if (session && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard-resumo', request.url))
  }

  return response
}

// Configuração para dizer quais rotas o middleware deve proteger.
export const config = {
  matcher: [
    /*
     * Corresponde a todas as rotas, exceto as que começam com:
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagem)
     * - favicon.ico (ícone do site)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}