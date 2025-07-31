// src/app/login/page.tsx
'use client';

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createClient } from '@/utils/supabase/client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  // Este listener agora está alinhado com nosso novo fluxo.
  // Ele aguarda uma mudança no estado de autenticação (um login bem-sucedido)
  // e então redireciona para a nossa página central de status.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        // CORRIGIDO: Redireciona para a página de status, que cuidará do resto.
        router.push('/auth/status');
      }
    });

    // Limpa o listener quando o componente é desmontado para evitar vazamentos de memória.
    return () => subscription.unsubscribe();
  }, [supabase, router]);

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <div className="w-full max-w-sm p-8 bg-white rounded-lg shadow-md">
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSopa }}
          providers={[]} // Deixe vazio para usar apenas e-mail e senha
          localization={{
            variables: {
              sign_in: { 
                email_label: 'Seu e-mail', 
                password_label: 'Sua senha', 
                button_label: 'Entrar' 
              },
              sign_up: { 
                link_text: 'Não tem uma conta? Cadastre-se' 
              },
              forgotten_password: { 
                link_text: 'Esqueceu sua senha?' 
              },
            },
          }}
        />
      </div>
    </div>
  );
}