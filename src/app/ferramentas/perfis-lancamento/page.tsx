'use client';

import { useState, useEffect, useCallback } from 'react';
// Corrigindo o import para usar o seu ficheiro de cliente Supabase, como no seu projeto
import { createClient } from '@/utils/supabase/client'; 
import toast, { Toaster } from 'react-hot-toast';
// Corrigindo o import para usar a biblioteca de ícones, como no seu projeto
import { FaSpinner, FaPlus, FaEdit, FaTrash } from 'react-icons/fa';

// --- COMPONENTE PRINCIPAL ---
export default function GestaoPerfisLancamentoPage() {
  // A configuração do Supabase é removida daqui, pois já vem do import
  const supabase = createClient();

  // --- ESTADOS ---
  const [perfis, setPerfis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPerfil, setCurrentPerfil] = useState<{ id: number | null; nome_perfil: string; descricao: string }>({ id: null, nome_perfil: '', descricao: '' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [perfilToDelete, setPerfilToDelete] = useState<any | null>(null);

  // --- FUNÇÕES DE DADOS (CRUD) ---
  const fetchPerfis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.from('perfis_de_acesso').select('*').order('nome_perfil', { ascending: true });
      if (error) throw error;
      setPerfis(data);
    } catch (err: any) {
      console.error("Erro ao buscar perfis:", err);
      setError("Não foi possível carregar os perfis. Verifique as permissões de RLS para a tabela 'perfis_de_acesso'.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchPerfis();
  }, [fetchPerfis]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPerfil.nome_perfil) {
      toast.error("O nome do perfil é obrigatório.");
      return;
    }
    const toastId = toast.loading(isEditing ? 'Salvando alterações...' : 'Criando perfil...');
    try {
      let error;
      if (isEditing) {
        const { error: updateError } = await supabase.from('perfis_de_acesso').update({ nome_perfil: currentPerfil.nome_perfil, descricao: currentPerfil.descricao }).eq('id', currentPerfil.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('perfis_de_acesso').insert({ nome_perfil: currentPerfil.nome_perfil, descricao: currentPerfil.descricao });
        error = insertError;
      }
      if (error) throw error;
      toast.success('Perfil salvo com sucesso!', { id: toastId });
      closeModal();
      fetchPerfis();
    } catch (err: any) {
      console.error("Erro ao salvar perfil:", err);
      toast.error(`Erro ao salvar perfil: ${err.message}`, { id: toastId });
    }
  };

  const handleDelete = async () => {
    if (!perfilToDelete) return;
    const toastId = toast.loading('Excluindo perfil...');
    try {
      const { error } = await supabase.from('perfis_de_acesso').delete().eq('id', perfilToDelete.id);
      if (error) throw error;
      toast.success('Perfil excluído com sucesso!', { id: toastId });
      closeDeleteConfirm();
      fetchPerfis();
    } catch (err: any) {
      console.error("Erro ao excluir perfil:", err);
      toast.error(`Erro ao excluir perfil: ${err.message}`, { id: toastId });
    }
  };

  // --- FUNÇÕES DE UI ---
  const openModalToCreate = () => { setIsEditing(false); setCurrentPerfil({ id: null, nome_perfil: '', descricao: '' }); setShowModal(true); };
  const openModalToEdit = (perfil: any) => { setIsEditing(true); setCurrentPerfil(perfil); setShowModal(true); };
  const closeModal = () => { setShowModal(false); };
  const openDeleteConfirm = (perfil: any) => { setPerfilToDelete(perfil); setShowDeleteConfirm(true); };
  const closeDeleteConfirm = () => { setPerfilToDelete(null); setShowDeleteConfirm(false); };

  // --- RENDERIZAÇÃO ---
  if (loading) return <div className="p-8 text-center"><FaSpinner className="animate-spin mx-auto text-2xl text-blue-600" /></div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <>
      <Toaster position="top-center" />
      <div className="p-4 md:p-8 space-y-6 bg-gray-50 min-h-screen">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Gestão de Perfis-Lançamento</h1>
          <button onClick={openModalToCreate} className="flex items-center justify-center bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700">
            <FaPlus className="mr-2" /> Novo Perfil
          </button>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome do Perfil</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {perfis.length > 0 ? perfis.map((perfil) => (
                <tr key={perfil.id}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-800">{perfil.nome_perfil}</td>
                  <td className="px-6 py-4 text-gray-600">{perfil.descricao}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center justify-center space-x-2">
                      <button onClick={() => openModalToEdit(perfil)} className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full"><FaEdit /></button>
                      <button onClick={() => openDeleteConfirm(perfil)} className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-full"><FaTrash /></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={3} className="text-center p-8 text-gray-500">Nenhum Perfil-Lançamento foi criado. Crie o primeiro!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">{isEditing ? 'Editar Perfil' : 'Criar Novo Perfil'}</h2>
            <form onSubmit={handleSave}>
              <div className="mb-4">
                <label htmlFor="nome_perfil" className="block text-sm font-medium text-gray-700 mb-1">Nome do Perfil</label>
                <input type="text" id="nome_perfil" value={currentPerfil.nome_perfil} onChange={(e) => setCurrentPerfil({ ...currentPerfil, nome_perfil: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
              </div>
              <div className="mb-6">
                <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea id="descricao" rows={3} value={currentPerfil.descricao} onChange={(e) => setCurrentPerfil({ ...currentPerfil, descricao: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md"></textarea>
              </div>
              <div className="flex justify-end space-x-3">
                <button type="button" onClick={closeModal} className="bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300">Cancelar</button>
                <button type="submit" className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700">{isEditing ? 'Salvar Alterações' : 'Criar Perfil'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm p-6 text-center">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Confirmar Exclusão</h3>
            <p className="text-gray-600 mb-6">Você tem certeza que deseja excluir o perfil <span className="font-semibold">"{perfilToDelete?.nome_perfil}"</span>? Esta ação não pode ser desfeita.</p>
            <div className="flex justify-center space-x-3">
              <button onClick={closeDeleteConfirm} className="bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300">Cancelar</button>
              <button onClick={handleDelete} className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
