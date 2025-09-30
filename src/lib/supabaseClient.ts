// Conteúdo para: src/lib/supabaseClient.ts

import { createClient } from '@supabase/supabase-js'


// As suas chaves de acesso ao Supabase.
// Lembre-se de usar a sua chave pública ANON aqui, e não a service_role.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Criamos a conexão com o banco de dados uma única vez e a exportamos
// para que qualquer parte da nossa aplicação possa usá-la.
export const db = createClient(supabaseUrl, supabaseKey);