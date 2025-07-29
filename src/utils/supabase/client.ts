// Caminho: src/utils/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/supabase-types' // Importa seus tipos de DB

export const createClient = () =>
  createBrowserClient<Database>( // Adicionamos o <Database> aqui
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )