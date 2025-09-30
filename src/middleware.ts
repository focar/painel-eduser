//middleware.ts

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Domínio de produção onde a regra de subdomínio se aplica
const PRODUCTION_DOMAIN = 'plugscore.com.br';

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: { headers: request.headers },
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
    const { pathname, host } = request.nextUrl;

    const publicRoutes = ['/login', '/signup', '/auth/callback', '/complete-profile'];

    // --- LÓGICA DE SUBDOMÍNIO ---
    const isProduction = host.endsWith(PRODUCTION_DOMAIN);
    let subdomain: string | null = null;
    if (isProduction) {
        subdomain = host.replace(`.${PRODUCTION_DOMAIN}`, '').replace('www.', '');
        if (subdomain === PRODUCTION_DOMAIN) {
            subdomain = null; // É o domínio principal, não um subdomínio
        }
    }

    // Se estiver no domínio principal em produção, redireciona para o portal padrão
    if (isProduction && !subdomain && !publicRoutes.includes(pathname)) {
        const defaultSubdomain = process.env.NEXT_PUBLIC_DEFAULT_SUBDOMAIN || 'edsonburger';
        const url = new URL(`https://${defaultSubdomain}.${PRODUCTION_DOMAIN}`);
        return NextResponse.redirect(url);
    }
    
    // --- LÓGICA DE AUTENTICAÇÃO E SEGURANÇA ---
    if (!user && !publicRoutes.includes(pathname)) {
        console.log(`Acesso a rota protegida negado. Redirecionando para /login.`);
        const url = new URL('/login', request.url);
        return NextResponse.redirect(url);
    }

    if (user) {
        if (publicRoutes.includes(pathname)) {
            return NextResponse.redirect(new URL('/', request.url));
        }

        const { data: profile } = await supabase.from('profiles').select('empresa, full_name, role').eq('id', user.id).single();

        // Se o perfil não for encontrado, desloga o usuário por segurança
        if (!profile) {
             await supabase.auth.signOut();
             return NextResponse.redirect(new URL('/login', request.url));
        }

        if (!profile.full_name) {
            return NextResponse.redirect(new URL('/complete-profile', request.url));
        }
        
        // Aplica a regra de segurança APENAS em produção
        if (isProduction) {
            // A verificação só acontece se o perfil existir E a role NÃO FOR 'operacional'
            if (profile.role !== 'operacional') {
                if (profile.empresa !== subdomain) {
                    console.log(`ACESSO NEGADO (Produção): Utilizador da empresa "${profile.empresa}" tentou aceder a "${subdomain}".`);
                    await supabase.auth.signOut();
                    return NextResponse.redirect(new URL('/login', request.url));
                }
            }
        }
    }

    return response;
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

