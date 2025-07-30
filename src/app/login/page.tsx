'use client';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createClient } from '@/utils/supabase/client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        // CORREÇÃO: Redireciona para a nova página de callback
        router.push('/auth/callback');
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, router]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{ width: '360px' }}>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={[]}
          localization={{
            variables: {
              sign_in: { email_label: 'Seu e-mail', password_label: 'Sua senha', button_label: 'Entrar' },
              sign_up: { link_text: 'Não tem uma conta? Cadastre-se' },
              forgotten_password: { link_text: 'Esqueceu sua senha?' },
            },
          }}
        />
      </div>
    </div>
  );
}