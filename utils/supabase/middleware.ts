import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export const createClient = (request: NextRequest) => {
  // Cria um NextResponse para poder ler e escrever cookies
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Cria um cliente Supabase que funciona no lado do servidor (Server-Side)
  // Ele usa os cookies do request e response para gerenciar a sessão do usuário
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // Se um cookie for definido, adiciona-o aos headers do 'response'
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          // Se um cookie for removido, adiciona-o aos headers do 'response'
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Retorna o cliente Supabase e o objeto de resposta para serem usados no middleware principal
  return { supabase, response }
}