// Conteúdo para: src/app/lancamentos/criar/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';

export default function CriarLancamentoPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [launch, setLaunch] = useState({
    nome: '',
    descricao: '',
    data_inicio: '',
    data_fim: '',
    status: 'Planejado', // Status padrão inicial
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setLaunch(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!launch.nome) {
      toast.error('O nome do lançamento é obrigatório.');
      return;
    }
    setIsSubmitting(true);

    try {
      const { error } = await db.from('lancamentos').insert([
        {
          nome: launch.nome,
          descricao: launch.descricao,
          data_inicio: launch.data_inicio || null,
          data_fim: launch.data_fim || null,
          status: launch.status,
        }
      ]);

      if (error) {
        throw error;
      }

      // 2. Notificação de sucesso com toast
      toast.success('Lançamento criado com sucesso!');
      
      // 3. Redirecionamento para a lista
      router.push('/lancamentos');

    } catch (err: any) {
      console.error("Erro ao criar lançamento:", err);
      toast.error(`Erro: ${err.message || 'Não foi possível salvar o lançamento.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">
          Criar Novo Lançamento
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Campo Nome */}
          <div>
            <label htmlFor="nome" className="block text-sm font-medium text-slate-700">
              Nome do Lançamento
            </label>
            <input
              type="text"
              id="nome"
              value={launch.nome}
              onChange={handleChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-slate-500 focus:border-slate-500"
              autoComplete="off" // 1. Autocomplete desligado
            />
          </div>

          {/* Campo Descrição */}
          <div>
            <label htmlFor="descricao" className="block text-sm font-medium text-slate-700">
              Descrição (Opcional)
            </label>
            <textarea
              id="descricao"
              value={launch.descricao}
              onChange={handleChange}
              rows={4}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-slate-500 focus:border-slate-500"
              autoComplete="off" // 1. Autocomplete desligado
            />
          </div>

          {/* Campos de Data e Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="data_inicio" className="block text-sm font-medium text-slate-700">
                Data de Início
              </label>
              <input
                type="date"
                id="data_inicio"
                value={launch.data_inicio}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-slate-500 focus:border-slate-500"
              />
            </div>
            <div>
              <label htmlFor="data_fim" className="block text-sm font-medium text-slate-700">
                Data de Fim
              </label>
              <input
                type="date"
                id="data_fim"
                value={launch.data_fim}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-slate-500 focus:border-slate-500"
              />
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-slate-700">
                Status
              </label>
              <select
                id="status"
                value={launch.status}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-slate-500 focus:border-slate-500 bg-white"
              >
                <option>Planejado</option>
                <option>Em Andamento</option>
                <option>Concluído</option>
                <option>Cancelado</option>
              </select>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end pt-4 gap-4 border-t border-slate-200 mt-6">
            <button
              type="button"
              onClick={() => router.push('/lancamentos')}
              className="bg-gray-200 text-gray-800 font-bold py-2 px-6 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-slate-800 text-white font-bold py-2 px-6 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar Lançamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}