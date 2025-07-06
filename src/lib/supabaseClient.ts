// Conteúdo para: src/lib/supabaseClient.ts

import { createClient } from '@supabase/supabase-js'

// As suas chaves de acesso ao Supabase.
// Lembre-se de usar a sua chave pública ANON aqui, e não a service_role.
const supabaseUrl = 'https://xqsrkvfvrqjzayrkbzsp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxc3JrdmZ2cnFqemF5cmtienNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MjIwNzUsImV4cCI6MjA2NjI5ODA3NX0.Bp-wpH5OvSiQ4QrY0OxJ2eHcC9y63rZEVyx2avDhFAk'

// Criamos a conexão com o banco de dados uma única vez e a exportamos
// para que qualquer parte da nossa aplicação possa usá-la.
export const db = createClient(supabaseUrl, supabaseKey)