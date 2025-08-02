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
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setSession({ user, profile });
      } else {
        setSession({ user: null, profile: null });
      }
      setIsLoading(false);
    };
    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      const user = newSession?.user ?? null;
      let profile = null;
      if (user) {
        // Busca o perfil novamente quando o estado de auth muda
        supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
          setSession({ user, profile: data });
        });
      } else {
        setSession({ user: null, profile: null });
      }
    });

    return () => { authListener.subscription.unsubscribe(); };
  }, [supabase]);

  const value = { session, isLoading };
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) { throw new Error('useUser must be used within a UserProvider'); }
  return context;
};