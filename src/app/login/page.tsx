// src/app/login/page.tsx
'use client';

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared'; // Corrigido aqui
import { createClient } from '@/utils/supabase/client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.push('/auth/status');
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, router]);

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <div className="w-full max-w-sm p-8 bg-white rounded-lg shadow-md">
        <Auth
          supabaseClient={supabase}
          // CORREÇÃO: Trocado 'ThemeSopa' por 'ThemeSupa'
          appearance={{ theme: ThemeSupa }}
          providers={[]} 
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