//src/app/ferramentas/gerenciar-usuarios/UserManagementForm.tsx

'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client'; 
import toast, { Toaster } from 'react-hot-toast';
import { FaSpinner, FaEdit, FaSave, FaUserShield } from 'react-icons/fa';

// --- Tipos de Dados ---
// Estes tipos são importados da página principal
import type { UserProfile, PerfilLancamento } from './page';

// --- Props do Componente ---
type UserManagementFormProps = {
  initialUsers: UserProfile[];
  allPerfis: PerfilLancamento[];
};

// --- Componente de Cliente ---
export default function UserManagementForm({ initialUsers, allPerfis }: UserManagementFormProps) {
  const supabase = createClient();
  
  // --- Estados ---
  const [users, setUsers] = useState<UserProfile[]>(initialUsers);
  const [editingUserName, setEditingUserName] = useState<{ id: string; name: string } | null>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [currentUserForPermissions, setCurrentUserForPermissions] = useState<UserProfile | null>(null);
  const [userAssignedPerfis, setUserAssignedPerfis] = useState<Set<number>>(new Set());
  const [userRole, setUserRole] = useState<'admin' | 'view'>('view');

  const handleStartEditingName = (user: UserProfile) => {
    setEditingUserName({ id: user.id, name: user.full_name || '' });
  };

  const handleNameSave = async () => {
    if (!editingUserName) return;
    const toastId = toast.loading('Salvando nome...');
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: editingUserName.name })
      .eq('id', editingUserName.id);

    if (error) {
      toast.error('Erro ao salvar o nome.', { id: toastId });
    } else {
      setUsers(users.map(u => u.id === editingUserName.id ? { ...u, full_name: editingUserName.name } : u));
      toast.success('Nome salvo com sucesso!', { id: toastId });
    }
    setEditingUserName(null);
  };

  const openPermissionsModal = async (user: UserProfile) => {
    setCurrentUserForPermissions(user);
    setUserRole(user.role);
    const loadingToast = toast.loading('Carregando permissões...');
    try {
      const { data: assignedPerfisData, error: assignedPerfisError } = await supabase
        .from('usuarios_perfis_acesso')
        .select('perfil_de_acesso_id')
        .eq('profile_id', user.id);
      if (assignedPerfisError) throw assignedPerfisError;
      
      setUserAssignedPerfis(new Set(assignedPerfisData.map(p => p.perfil_de_acesso_id)));
      
      toast.dismiss(loadingToast);
      setShowPermissionsModal(true);
    } catch (err) {
      console.error("Erro ao abrir modal de permissões:", err);
      toast.error('Não foi possível carregar as permissões.', { id: loadingToast });
    }
  };

  const handleCheckboxChange = (perfilId: number) => {
    setUserAssignedPerfis(prev => {
      const newSet = new Set(prev);
      if (newSet.has(perfilId)) newSet.delete(perfilId);
      else newSet.add(perfilId);
      return newSet;
    });
  };

  const handlePermissionsSave = async () => {
    if (!currentUserForPermissions) return;
    const toastId = toast.loading('Salvando permissões...');
    try {
      await supabase.from('profiles').update({ role: userRole }).eq('id', currentUserForPermissions.id);
      await supabase.from('usuarios_perfis_acesso').delete().eq('profile_id', currentUserForPermissions.id);

      const perfisToInsert = Array.from(userAssignedPerfis).map(perfilId => ({
        profile_id: currentUserForPermissions.id,
        perfil_de_acesso_id: perfilId,
      }));

      if (perfisToInsert.length > 0) {
        await supabase.from('usuarios_perfis_acesso').insert(perfisToInsert);
      }

      setUsers(users.map(u => u.id === currentUserForPermissions.id ? { ...u, role: userRole } : u));
      toast.success('Permissões salvas com sucesso!', { id: toastId });
      setShowPermissionsModal(false);
      setCurrentUserForPermissions(null);
    } catch (err: any) {
      console.error("Erro ao salvar permissões:", err);
      toast.error(`Erro: ${err.message}`, { id: toastId });
    }
  };

  return (
    <>
      <Toaster position="top-center" />
      <div className="p-4 md:p-8 space-y-6 bg-gray-50 min-h-screen">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Gerenciamento de Utilizadores</h1>
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome Completo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Perfil (Role)</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {editingUserName?.id === user.id ? (
                      <div className="flex items-center gap-2">
                        <input type="text" value={editingUserName.name} onChange={(e) => setEditingUserName({ ...editingUserName, name: e.target.value })} className="p-1 border border-blue-400 rounded-md" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleNameSave()} />
                        <button onClick={handleNameSave} className="text-green-600 hover:text-green-800"><FaSave /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>{user.full_name || '--'}</span>
                        <button onClick={() => handleStartEditingName(user)} className="text-gray-400 hover:text-blue-600"><FaEdit /></button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{user.user_email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-semibold">{user.role === 'admin' ? 'Admin' : 'View'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <button onClick={() => openPermissionsModal(user)} className="flex items-center gap-2 mx-auto bg-blue-100 text-blue-700 hover:bg-blue-200 font-semibold py-2 px-3 rounded-lg transition-colors duration-200">
                      <FaUserShield />
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {showPermissionsModal && currentUserForPermissions && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg p-6 animate-fade-in-up">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Editar Permissões</h2>
            <p className="text-gray-600 mb-6">Utilizador: <span className="font-semibold">{currentUserForPermissions.full_name || currentUserForPermissions.user_email}</span></p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Perfil (Role)</label>
              <select value={userRole} onChange={(e) => setUserRole(e.target.value as 'admin' | 'view')} className="w-full p-2 border border-gray-300 rounded-md">
                <option value="view">View</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Perfis-Lançamento Permitidos</label>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3 space-y-2 bg-gray-50">
                {allPerfis.length > 0 ? allPerfis.map(perfil => (
                  <label key={perfil.id} className="flex items-center space-x-3 cursor-pointer">
                    <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" checked={userAssignedPerfis.has(perfil.id)} onChange={() => handleCheckboxChange(perfil.id)} />
                    <span className="text-gray-800">{perfil.nome_perfil}</span>
                  </label>
                )) : <p className="text-gray-500 text-sm">Nenhum Perfil-Lançamento foi criado ainda.</p>}
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowPermissionsModal(false)} className="bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300">
                Cancelar
              </button>
              <button onClick={handlePermissionsSave} className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700">
                Salvar Permissões
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
