//middleware.ts

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Cria a resposta que será usada para gerir os cookies.
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Cria um cliente Supabase que funciona no lado do servidor.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) { response.cookies.set({ name, value, ...options }); },
        remove(name: string, options: CookieOptions) { response.cookies.set({ name, value: '', ...options }); },
      },
    }
  );

  // Obtém a informação do utilizador a partir dos cookies.
  const { data: { user } } = await supabase.auth.getUser();
  
  const { pathname } = request.nextUrl;
  const publicRoutes = ['/login', '/auth/callback', '/signup', '/complete-profile'];

  // --- LÓGICA DE SEGURANÇA SIMPLIFICADA ---

  // 1. Se o utilizador NÃO estiver autenticado e tentar aceder a uma página protegida...
  if (!user && !publicRoutes.includes(pathname)) {
    // ...redireciona-o para a página de login.
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. Se o utilizador ESTIVER autenticado...
  if (user) {
    // ...e tentar aceder à página de login, redireciona-o para a página principal.
    if (pathname === '/login') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    // (Opcional) Mantém a verificação para garantir que o perfil está completo.
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
    if (!profile?.full_name && pathname !== '/complete-profile') {
      return NextResponse.redirect(new URL('/complete-profile', request.url));
    }
  }

  // Para todos os outros casos, permite que o pedido continue normalmente.
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

