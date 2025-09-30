import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // --- INÍCIO DA DEPURAÇÃO ---
  console.log('--- NOVO PEDIDO NO MIDDLEWARE ---');
  console.log('Caminho do pedido:', request.nextUrl.pathname);
  console.log('Cookies recebidos:', request.cookies.getAll());
  // --- FIM DA DEPURAÇÃO ---

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
  
  // --- INÍCIO DA DEPURAÇÃO ---
  if (user) {
    console.log('Utilizador encontrado no middleware:', user.id);
  } else {
    console.log('Nenhum utilizador encontrado no middleware.');
  }
  // --- FIM DA DEPURAÇÃO ---

  const { pathname } = request.nextUrl;
  const publicRoutes = ['/login', '/auth/callback', '/signup', '/complete-profile'];

  if (!user && !publicRoutes.includes(pathname)) {
    console.log('Utilizador não autenticado a aceder a uma rota protegida. A redirecionar para /login.');
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user) {
    if (pathname === '/login') {
      console.log('Utilizador autenticado a aceder a /login. A redirecionar para /.');
      return NextResponse.redirect(new URL('/', request.url));
    }
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
    if (!profile?.full_name && !publicRoutes.includes(pathname)) {
      console.log('Utilizador sem perfil completo. A redirecionar para /complete-profile.');
      return NextResponse.redirect(new URL('/complete-profile', request.url));
    }
  }

  console.log('Middleware concluído. A permitir que o pedido continue.');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
