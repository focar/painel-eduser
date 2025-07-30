'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { FaSpinner } from 'react-icons/fa';
import { redirect } from 'next/navigation';

// Definindo o tipo para os nossos usuários
type UserProfile = {
  user_id: string;
  user_email: string;
  user_role: 'admin' | 'viewer';
  full_name: string | null;
};

export default function GerenciarUsuariosPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      // Primeiro, verifica se o usuário atual é admin
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError || profile.role !== 'admin') {
          // Se não for admin, redireciona para o dashboard
          redirect('/dashboard-resumo');
          return;
        }
        setCurrentUserRole(profile.role);

        // Se for admin, busca a lista de usuários
        const { data: usersData, error: usersError } = await supabase.rpc('get_all_users_with_profiles');
        
        if (usersError) {
          setError('Falha ao buscar usuários: ' + usersError.message);
        } else {
          setUsers(usersData as unknown as UserProfile[]);
        }
      }
      setLoading(false);
    };

    fetchUsers();
  }, [supabase]);

  const handleRoleChange = async (targetUserId: string, newRole: string) => {
    // Para otimismo, atualiza a UI primeiro
    const originalUsers = [...users];
    setUsers(users.map(u => u.user_id === targetUserId ? { ...u, user_role: newRole as 'admin' | 'viewer' } : u));
    
    // Chama a função segura no Supabase
    const { error: rpcError } = await supabase.rpc('update_user_role', {
      target_user_id: targetUserId,
      new_role: newRole,
    });

    if (rpcError) {
      alert('ERRO: Não foi possível atualizar o perfil. ' + rpcError.message);
      // Reverte a mudança na UI em caso de erro
      setUsers(originalUsers);
    }
  };

  if (loading) {
    return <div className="p-8 text-center"><FaSpinner className="animate-spin mx-auto text-2xl" /></div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Gerenciamento de Usuários</h1>
      <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Perfil (Role)</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.user_id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.user_email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <select
                    value={user.user_role}
                    onChange={(e) => handleRoleChange(user.user_id, e.target.value)}
                    className="p-2 border border-gray-300 rounded-md"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}