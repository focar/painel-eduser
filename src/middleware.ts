//middleware.ts

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Função para extrair o subdomínio do hostname
const getSubdomain = (host: string) => {
  const parts = host.split('.');
  // Funciona para localhost (ex: 'empresa.localhost') e domínios de produção (ex: 'empresa.plugscore.com.br')
  if (parts.length > 2 && parts[0] !== 'www') {
    return parts[0];
  }
  return null; // Retorna null para o domínio principal (www.plugscore.com.br)
};


export async function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  const host = request.headers.get('host') || '';
  const subdomain = getSubdomain(host);

  // Adiciona o subdomínio aos headers para que possa ser lido nas páginas
  headers.set('x-subdomain', subdomain || 'main'); 
  
  // --- LOGS DE DEPURAÇÃO IMPORTANTES ---
  console.log(`--- MIDDLEWARE ---`);
  console.log(`Host: ${host}`);
  console.log(`Subdomínio detetado: ${subdomain}`);
  
  let response = NextResponse.next({
    request: {
      headers: headers, // Usa os novos headers com o subdomínio
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
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;
  const publicRoutes = ['/login', '/auth/callback', '/signup', '/complete-profile'];

  // Se não houver subdomínio E o utilizador não estiver na página de login, redireciona para o login
  // Isto força todos os acessos ao domínio principal a passarem pelo login
  if (!subdomain && !user && !publicRoutes.includes(pathname)) {
      console.log('Acesso ao domínio principal sem sessão. A redirecionar para o login.');
      return NextResponse.redirect(new URL('/login', request.url));
  }

  // Lógica de proteção de rotas (permanece igual, mas agora funciona no contexto do subdomínio)
  if (!user && !publicRoutes.includes(pathname)) {
    console.log(`Utilizador não autenticado em "${subdomain}". A redirecionar para /login.`);
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user) {
    if (pathname === '/login') {
      console.log(`Utilizador autenticado em "${subdomain}". A redirecionar para a página principal.`);
      return NextResponse.redirect(new URL('/', request.url));
    }
    // A lógica de perfil completo permanece a mesma
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
    if (!profile?.full_name && !publicRoutes.includes(pathname)) {
      return NextResponse.redirect(new URL('/complete-profile', request.url));
    }
  }

  console.log(`Middleware concluído para "${subdomain}".`);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

