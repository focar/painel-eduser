//middleware.ts

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const getSubdomain = (host: string) => {
  const parts = host.split('.');
  if (parts.length > 2 && parts[0] !== 'www') {
    return parts[0];
  }
  return null;
};

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

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

  const { data: { user } } = await supabase.auth.getUser();
  const host = request.headers.get('host') || '';
  const subdomain = getSubdomain(host);
  const { pathname } = request.nextUrl;
  
  // --- NOVA LÓGICA DE AMBIENTE ---
  // Define o seu domínio de produção.
  const PRODUCTION_DOMAIN = 'plugscore.com.br';

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('empresa, full_name, role') 
      .eq('id', user.id)
      .single();

    // A verificação de empresa SÓ ACONTECE no domínio de produção.
    // Isto permite que os testes em URLs de preview da Vercel funcionem sem bloqueios.
    if (host.endsWith(PRODUCTION_DOMAIN)) {
      if (profile && profile.role !== 'operacional') {
        if (profile.empresa !== subdomain) {
          console.log(`ACESSO NEGADO (Produção): Utilizador da empresa "${profile.empresa}" tentou aceder a "${subdomain}".`);
          return NextResponse.redirect(new URL('/login', request.url));
        }
      }
    }

    // O resto da sua lógica de utilizador autenticado permanece igual
    if (pathname === '/login') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    if (!profile?.full_name && pathname !== '/complete-profile') {
      return NextResponse.redirect(new URL('/complete-profile', request.url));
    }

  } else {
    // Lógica para utilizadores não autenticados permanece a mesma
    const publicRoutes = ['/login', '/auth/callback', '/signup', '/complete-profile'];
    if (!publicRoutes.includes(pathname)) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};


