// src/utils/supabase/server.ts

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// A função não recebe mais parâmetros. Ela mesma busca os cookies.
export const createClient = () => {
  // Esta linha busca o 'armazém' de cookies da requisição atual.
  const cookieStore = cookies();

  // O resto do código continua igual, mas agora usando o cookieStore que acabamos de buscar.
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // A função `set` pode dar erro em Server Components
            // mas o Supabase precisa dela de qualquer forma. Ignoramos o erro.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // A função `set` pode dar erro em Server Components
            // mas o Supabase precisa dela de qualquer forma. Ignoramos o erro.
          }
        },
      },
    }
  );
};