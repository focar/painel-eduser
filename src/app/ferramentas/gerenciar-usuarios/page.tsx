// src/app/ferramentas/gerenciar-usuarios/page.tsx

import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import UserManagementForm from './UserManagementForm'; // Importa o nosso novo componente de cliente

// --- Tipos de Dados ---
export type UserProfile = {
  id: string;
  full_name: string | null;
  role: 'admin' | 'view';
  user_email?: string; 
};

export type PerfilLancamento = {
  id: number;
  nome_perfil: string;
};

// --- Componente de Servidor ---
export default async function GerenciarUsuariosPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. Verifica se o utilizador está logado e é admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return redirect('/login');
  }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') {
    return (
      <div className="p-8 text-center text-red-500">
        Acesso negado. Esta página é apenas para administradores.
      </div>
    );
  }

  // 2. Busca todos os dados necessários no servidor
  const { data: usersData, error: usersError } = await supabase.rpc('get_all_users_with_profiles');
  const { data: perfisData, error: perfisError } = await supabase.rpc('get_all_perfis_de_acesso');
  // Trata possíveis erros na busca de dados
  if (usersError || perfisError) {
    return (
      <div className="p-8 text-center text-red-500">
        Erro ao carregar os dados: {usersError?.message || perfisError?.message}
      </div>
    );
  }
  
  // Formata os dados para passar ao componente de cliente
  const formattedUsers = usersData.map((u: any) => ({
    id: u.user_id,
    full_name: u.full_name,
    role: u.user_role,
    user_email: u.user_email
  }));

  // 3. Renderiza o componente de cliente, passando os dados como props
  return <UserManagementForm initialUsers={formattedUsers} allPerfis={perfisData || []} />;
}
