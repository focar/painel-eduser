// src/components/providers/UserProvider.tsx (COM DEBUG)
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { Tables } from '@/types/database';

type Profile = Tables<'profiles'>;
type UserSession = { user: User | null; profile: Profile | null };
type UserContextType = { session: UserSession; isLoading: boolean };

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const supabase = createClient();
  const [session, setSession] = useState<UserSession>({ user: null, profile: null });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      console.log("DEBUG: 1. UserProvider iniciou o fetch da sessão.");
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log("DEBUG: 2. Resultado da busca de usuário (auth.getUser):", { user, userError });

      if (user) {
        console.log("DEBUG: 3. Usuário encontrado. Buscando perfil na tabela 'profiles'...");
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        console.log("DEBUG: 4. Resultado da busca de perfil:", { profile, profileError });
        setSession({ user, profile });
      } else {
        console.log("DEBUG: 3. Nenhum usuário logado encontrado.");
        setSession({ user: null, profile: null });
      }
      
      console.log("DEBUG: 5. Fetch da sessão finalizado. isLoading será false.");
      setIsLoading(false);
    };

    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      console.log("DEBUG: Ocorreu uma mudança no estado de autenticação. Revalidando a sessão...");
      // Chama a função novamente para garantir que o estado está sincronizado
      fetchSession();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  const value = { session, isLoading };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser deve ser usado dentro de um UserProvider');
  }
  return context;
};