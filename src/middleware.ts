//middleware.ts

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Domínio final de produção. Tudo o que não for isto, é considerado teste.
const PRODUCTION_DOMAIN = 'plugscore.com.br';

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

  const host = request.headers.get('host') || '';
  const subdomain = getSubdomain(host);
  const { pathname, origin } = request.nextUrl;
  
  // Se o acesso for pelo domínio de produção, mas sem subdomínio, redireciona para o padrão.
  if (host.endsWith(PRODUCTION_DOMAIN) && !subdomain) {
      const defaultSubdomain = process.env.NEXT_PUBLIC_DEFAULT_SUBDOMAIN || 'alicesalazar';
      return NextResponse.redirect(`https://${defaultSubdomain}.${PRODUCTION_DOMAIN}${pathname}`);
  }
  
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('empresa, full_name, role')
      .eq('id', user.id)
      .single();

    // A lógica de segurança só se aplica no domínio de produção
    if (host.endsWith(PRODUCTION_DOMAIN)) {
      if (profile && profile.role !== 'operacional') {
        if (profile.empresa !== subdomain) {
          console.log(`ACESSO NEGADO (Produção): Utilizador da empresa "${profile.empresa}" tentou aceder a "${subdomain}".`);
          const urlLoginCorreto = `https://${profile.empresa}.${PRODUCTION_DOMAIN}/login`;
          return NextResponse.redirect(urlLoginCorreto);
        }
      }
    }

    if (pathname === '/login') {
      return NextResponse.redirect(new URL('/', origin));
    }
    if (!profile?.full_name && pathname !== '/complete-profile') {
      return NextResponse.redirect(new URL('/complete-profile', origin));
    }

  } else {
    const publicRoutes = ['/login', '/auth/callback', '/signup', '/complete-profile'];
    if (!publicRoutes.includes(pathname)) {
      return NextResponse.redirect(new URL('/login', origin));
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

