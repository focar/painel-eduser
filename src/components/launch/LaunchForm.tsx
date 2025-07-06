// Conteúdo ATUALIZADO para: src/components/launch/LaunchForm.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/supabaseClient';

type LaunchData = { id?: string; nome: string; descricao: string | null; data_inicio: string; data_fim: string; status: string; };
type LaunchFormProps = { initialData?: LaunchData | null };

export default function LaunchForm({ initialData }: LaunchFormProps) {
  const router = useRouter();
  const [launch, setLaunch] = useState<LaunchData>({
    nome: '',
    descricao: '',
    data_inicio: '',
    data_fim: '',
    status: 'Em preparação',
    ...initialData,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setLaunch(prev => ({ ...prev, [id]: value }));

    // ### INÍCIO DA LÓGICA DE VALIDAÇÃO DE DATA ###
    if (id === 'data_inicio') {
        const endDateInput = document.getElementById('data_fim') as HTMLInputElement;
        if (endDateInput) {
            endDateInput.min = value; // A data de fim não pode ser antes da de início
        }
    }
    // ### FIM DA LÓGICA DE VALIDAÇÃO DE DATA ###
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await db.from('lancamentos').upsert({
        ...launch,
        modified_at: new Date().toISOString(),
      });
      if (error) throw error;
      
      alert('Lançamento salvo com sucesso!');
      router.push('/lancamentos');
      router.refresh();
    } catch (err: any) {
      console.error("Erro ao salvar lançamento:", err);
      alert(`Erro: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto"><div className="bg-white p-8 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">{initialData ? 'Editar Lançamento' : 'Criar Novo Lançamento'}</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="nome" className="block text-sm font-medium text-slate-700">Nome</label>
          <input type="text" id="nome" value={launch.nome} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md"/>
        </div>
        <div>
          <label htmlFor="descricao" className="block text-sm font-medium text-slate-700">Descrição</label>
          <textarea id="descricao" value={launch.descricao || ''} onChange={handleChange} rows={4} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md"></textarea>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="data_inicio" className="block text-sm font-medium text-slate-700">Data de Início</label>
            <input type="date" id="data_inicio" value={launch.data_inicio} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md" />
          </div>
          <div>
            <label htmlFor="data_fim" className="block text-sm font-medium text-slate-700">Data de Fim</label>
            <input type="date" id="data_fim" value={launch.data_fim} onChange={handleChange} required min={launch.data_inicio} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md" />
          </div>
        </div>
        {initialData && (
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-slate-700">Status</label>
            <select id="status" value={launch.status} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md">
              <option value="Em preparação">Em preparação</option>
              <option value="Planejado">Planejado</option>
              <option value="Em Andamento">Em Andamento</option>
              <option value="Concluido">Concluído</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>
        )}
        <div className="flex justify-end pt-4 gap-4">
          <button type="button" onClick={() => router.push('/lancamentos')} className="bg-gray-200 text-gray-800 font-bold py-2 px-6 rounded-lg">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="bg-slate-800 text-white font-bold py-2 px-6 rounded-lg disabled:opacity-50">{isSubmitting ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </form>
    </div></div>
  );
}