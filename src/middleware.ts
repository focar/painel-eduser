//src/middleware.ts


import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Cria a resposta UMA VEZ no início.
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        // A correção está aqui: agora apenas modificamos os cookies
        // do objeto 'response' que já existe, em vez de o recriar.
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // A sua lógica de autenticação e redirecionamento permanece a mesma.
  // Apenas a chamada a getUser() é suficiente para o Supabase
  // atualizar a sessão usando os handlers de cookie corrigidos.
  const { data: { user } } = await supabase.auth.getUser();
  
  const { pathname } = request.nextUrl;
  const publicRoutes = ['/login', '/auth/callback', '/signup', '/complete-profile'];

  if (!user && !publicRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user) {
    if (pathname === '/login') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
    if (!profile?.full_name && !publicRoutes.includes(pathname)) {
      return NextResponse.redirect(new URL('/complete-profile', request.url));
    }
  }

  // Retorna o objeto 'response' que foi sendo modificado.
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
