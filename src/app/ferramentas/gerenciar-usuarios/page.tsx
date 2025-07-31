// src/app/ferramentas/gerenciar-usuarios/page.tsx (VERSÃO CORRIGIDA)
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { FaSpinner, FaEdit, FaSave } from 'react-icons/fa';
import { redirect } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

type UserProfile = {
  user_id: string;
  user_email: string;
  user_role: 'admin' | 'view';
  full_name: string | null;
};

export default function GerenciarUsuariosPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingUser, setEditingUser] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (!profile || profile.role !== 'admin') {
          redirect('/agenda');
          return;
        }
        const { data: usersData, error: usersError } = await supabase.rpc('get_all_users_with_profiles');
        if (usersError) setError('Falha ao buscar usuários: ' + usersError.message);
        else setUsers(usersData as unknown as UserProfile[]);
      }
      setLoading(false);
    };
    fetchUsers();
  }, [supabase]);

  const handleRoleChange = async (targetUserId: string, newRole: string) => {
    const originalUsers = [...users];
    setUsers(users.map(u => u.user_id === targetUserId ? { ...u, user_role: newRole as UserProfile['user_role'] } : u));
    
    const { error: rpcError } = await supabase.rpc('update_user_role', { target_user_id: targetUserId, new_role: newRole });
    if (rpcError) {
      toast.error('ERRO: Não foi possível atualizar o perfil.');
      setUsers(originalUsers);
    } else {
      toast.success('Perfil atualizado com sucesso!');
    }
  };

  const handleStartEditing = (user: UserProfile) => {
    setEditingUser({ id: user.user_id, name: user.full_name || '' });
  };

  const handleNameSave = async () => {
    if (!editingUser) return;

    const toastId = toast.loading('Salvando nome...');

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: editingUser.name })
      .eq('id', editingUser.id);

    if (error) {
      toast.error('Erro ao salvar o nome.', { id: toastId });
    } else {
      setUsers(users.map(u => u.user_id === editingUser.id ? { ...u, full_name: editingUser.name } : u));
      toast.success('Nome salvo com sucesso!', { id: toastId });
    }
    setEditingUser(null);
  };


  if (loading) return <div className="p-8 text-center"><FaSpinner className="animate-spin mx-auto text-2xl" /></div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <>
      <Toaster position="top-center" />
      <div className="p-4 md:p-8 space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Gerenciamento de Usuários</h1>
        <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome Completo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Perfil (Role)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.user_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {editingUser?.id === user.user_id ? (
                      <div className="flex items-center gap-2">
                        <input 
                          type="text"
                          value={editingUser.name}
                          onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                          className="p-1 border border-blue-400 rounded-md"
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                        />
                        <button onClick={handleNameSave} className="text-green-600 hover:text-green-800"><FaSave /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>{user.full_name || '--'}</span>
                        <button onClick={() => handleStartEditing(user)} className="text-gray-400 hover:text-blue-600"><FaEdit /></button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{user.user_email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <select
                      value={user.user_role}
                      onChange={(e) => handleRoleChange(user.user_id, e.target.value)}
                      className="p-2 border border-gray-300 rounded-md"
                    >
                      <option value="view">View</option> 
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}