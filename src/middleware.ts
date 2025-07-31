// Cole este código em: src/middleware.ts
// Este é o único arquivo de middleware que você precisa.
// Ele já contém a criação do cliente e a lógica de proteção de rotas.

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Cria um cliente Supabase para ser usado no middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Atualiza a sessão do usuário. Essencial para Server Components e para manter o login.
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // --- LÓGICA DE PROTEÇÃO DE ROTAS ---

  // Rotas públicas que podem ser acessadas sem login
  const publicRoutes = ['/login', '/auth/callback'];

  // Se o usuário não estiver logado E tentar acessar uma rota protegida...
  if (!user && !publicRoutes.includes(pathname)) {
    // ...redireciona para a página de login.
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Se o usuário JÁ ESTIVER logado E tentar acessar a página de login...
  if (user && pathname === '/login') {
    // ...redireciona para a página principal da aplicação (ex: /agenda ou /dashboard-resumo).
    // Ajuste a URL '/agenda' para a sua página principal se for diferente.
    return NextResponse.redirect(new URL('/agenda', request.url))
  }

  // Para todas as outras requisições, permite que continuem normalmente.
  return response
}

// Configuração do Matcher: Define quais rotas passarão pelo middleware.
export const config = {
  matcher: [
    /*
     * Corresponde a todas as rotas, exceto as pastas internas do Next.js e arquivos estáticos.
     * Isso otimiza a performance, evitando que o middleware rode em requisições de imagens, etc.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}