import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  try {
    const { supabase, response } = createClient(request)
    const { data: { session } } = await supabase.auth.getSession()
    const { pathname } = request.nextUrl

    // CORREÇÃO: Adicionamos '/auth/callback' à lista de páginas públicas
    const publicPaths = ['/login', '/auth/callback'];
    if (!session && !publicPaths.includes(pathname)) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (session && pathname === '/login') {
      return NextResponse.redirect(new URL('/', request.url))
    }

    return response
  } catch (e) {
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    })
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}