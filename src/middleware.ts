import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Cria a resposta que será retornada no final
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Cria um cliente Supabase que funciona no lado do servidor
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

  // Pede ao Supabase para verificar se há um utilizador autenticado
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const publicRoutes = ['/login', '/signup']; // Páginas que não precisam de login

  // REGRA DE SEGURANÇA PRINCIPAL:
  // Se o utilizador NÃO estiver autenticado E estiver a tentar aceder a uma página que NÃO é pública...
  if (!user && !publicRoutes.includes(pathname)) {
    // ...redireciona-o para a página de login.
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Se o utilizador ESTIVER autenticado e tentar aceder à página de login/signup...
  if (user && publicRoutes.includes(pathname)) {
    // ...redireciona-o para a página principal.
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  // Se nenhuma regra for acionada, permite que o pedido continue
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

