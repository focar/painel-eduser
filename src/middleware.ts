//middleware.ts

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PRODUCTION_DOMAIN = 'plugscore.com.br';

const getSubdomain = (host: string) => {
  // Remove a porta, se existir (ex: localhost:3000)
  const hostWithoutPort = host.split(':')[0];
  const parts = hostWithoutPort.split('.');
  
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
  
  console.log(`--- [NOVO PEDIDO] ---`);
  console.log(`Host completo: ${host}`);
  console.log(`Subdomínio detetado: ${subdomain}`);
  console.log(`Caminho: ${pathname}`);

  // Se o acesso for pelo domínio de produção, mas sem subdomínio, redireciona para o padrão.
  if (host.endsWith(PRODUCTION_DOMAIN) && !subdomain) {
      const defaultSubdomain = process.env.NEXT_PUBLIC_DEFAULT_SUBDOMAIN || 'alicesalazar';
      const redirectUrl = `https://${defaultSubdomain}.${PRODUCTION_DOMAIN}${pathname}`;
      console.log(`Redirecionando do domínio principal para: ${redirectUrl}`);
      return NextResponse.redirect(redirectUrl);
  }
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    console.log(`Utilizador autenticado encontrado: ${user.id}`);
    const { data: profile } = await supabase
      .from('profiles')
      .select('empresa, full_name, role')
      .eq('id', user.id)
      .single();

    if (host.endsWith(PRODUCTION_DOMAIN)) {
      if (profile && profile.role !== 'operacional') {
        console.log(`Perfil do utilizador: empresa='${profile.empresa}', role='${profile.role}'`);
        if (profile.empresa !== subdomain) {
          console.log(`ACESSO NEGADO (Produção): Utilizador da empresa "${profile.empresa}" tentou aceder a "${subdomain}".`);
          const urlLoginCorreto = `https://${profile.empresa}.${PRODUCTION_DOMAIN}/login`;
          return NextResponse.redirect(urlLoginCorreto);
        }
      } else if (profile) {
        console.log(`Utilizador é '${profile.role}'. Acesso permitido a todos os subdomínios.`);
      } else {
        console.log(`AVISO: Utilizador autenticado mas sem perfil na base de dados.`);
      }
    }

    if (pathname === '/login') {
      return NextResponse.redirect(new URL('/', origin));
    }

  } else {
    console.log("Nenhum utilizador autenticado encontrado.");
    const publicRoutes = ['/login', '/auth/callback', '/signup', '/complete-profile'];
    if (!publicRoutes.includes(pathname)) {
      console.log(`Acesso a rota protegida negado. A redirecionar para /login.`);
      return NextResponse.redirect(new URL('/login', origin));
    }
  }

  console.log("Middleware concluído. A permitir que o pedido continue.");
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

