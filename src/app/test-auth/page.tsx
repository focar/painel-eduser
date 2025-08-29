// Conteúdo ATUALIZADO para: app/test-auth/page.tsx

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Esta função cria um cliente Supabase para Server Components
// usando a NOVA biblioteca @supabase/ssr
const createSupabaseServerClient = () => {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
};

export default async function TestAuthPage() {
  const supabase = createSupabaseServerClient();
  
  // A chamada à função de teste 'who_am_i' permanece a mesma
  const { data, error } = await supabase.rpc('who_am_i');

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>Teste de Autenticação (Versão Corrigida)</h1>
      <p>O objetivo aqui é verificar se a função `auth.uid()` está funcionando no backend.</p>
      <hr />
      <h2>Resultado da chamada RPC para `who_am_i()`:</h2>
      
      <pre style={{ backgroundColor: '#f0f0f0', padding: '1rem', border: '1px solid #ccc', borderRadius: '5px' }}>
        {data ? data : 'Resultado: NULL ou Vazio'}
      </pre>
      
      {error && <p style={{ color: 'red' }}>Erro: {error.message}</p>}

      <hr />
      <h3>Análise do Resultado:</h3>
      <p>
        <strong>Se você vir um código (UUID) acima:</strong> SUCESSO! 🚀 A autenticação foi corrigida.
      </p>
      <p>
        <strong>Se você ainda vir "Resultado: NULL ou Vazio":</strong> O problema persiste, mas agora sabemos que não é um conflito de bibliotecas.
      </p>
    </div>
  );
}