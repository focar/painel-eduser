'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { FaSpinner } from 'react-icons/fa';

// --- Tipos de Dados ---
type Launch = {
  id: string;
  nome: string;
  status: string;
  data_inicio: string | null;
  // Adicionamos created_at para a ordenação secundária
  created_at: string | null; 
};

export default function LancamentosPage() {
  const supabase = createClient();
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLaunches = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.from('lancamentos').select('*').order('created_at', { ascending: false });
        if (error) throw error;

        // ================== INÍCIO DA CORREÇÃO DE ORDENAÇÃO ==================
        if (data) {
          // 1. Define a ordem de prioridade dos status
          const statusOrder: { [key: string]: number } = {
            'Em Andamento': 1,
            'Planejado': 2,
            'Concluído': 3,
            'Concluido': 3, // Garante que ambos os nomes funcionem
            'Cancelado': 4,
          };

          // 2. Ordena os dados com a lógica personalizada
          const sortedData = [...data].sort((a, b) => {
            const orderA = statusOrder[a.status] || 99; // Status desconhecidos vão para o fim
            const orderB = statusOrder[b.status] || 99;

            // Se o status for diferente, ordena pelo status
            if (orderA !== orderB) {
              return orderA - orderB;
            }

            // Se o status for o mesmo, ordena pela data de criação (mais recente primeiro)
            if (a.created_at && b.created_at) {
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
            return 0;
          });

          setLaunches(sortedData);
        } else {
            setLaunches([]);
        }
        // ================== FIM DA CORREÇÃO DE ORDENAÇÃO ====================
      } catch (err) {
        console.error("Erro ao buscar lançamentos:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLaunches();
  }, [supabase]);

  const statusColors: { [key: string]: string } = {
    "Planejado": "bg-blue-100 text-blue-800",
    "Em Andamento": "bg-green-100 text-green-800",
    "Em preparação": "bg-yellow-100 text-yellow-800",
    "Concluido": "bg-gray-100 text-gray-800",
    "Concluído": "bg-gray-100 text-gray-800",
    "Cancelado": "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-4 sm:mb-0">
          Gerenciador de Lançamentos
        </h1>
        <Link href="/lancamentos/criar" className="bg-slate-800 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-700 text-sm w-full sm:w-auto text-center">
          Criar Novo Lançamento
        </Link>
      </div>

      <div className="bg-white p-2 sm:p-6 rounded-lg shadow-md">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b-2 border-slate-200 hidden md:table-header-group">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 md:divide-y-0">
              {isLoading ? (
                <tr><td colSpan={3} className="p-4 text-center"><FaSpinner className="animate-spin text-blue-600 text-2xl mx-auto" /> Carregando...</td></tr>
              ) : launches.length === 0 ? (
                <tr><td colSpan={3} className="p-4 text-center text-slate-500">Nenhum lançamento encontrado.</td></tr>
              ) : (
                launches.map(launch => (
                  <tr key={launch.id} className="block md:table-row border rounded-lg shadow-sm mb-4 md:border-none md:shadow-none md:mb-0 md:border-b">
                    <td className="p-3 md:p-4 font-medium text-slate-800" data-label="Nome: ">
                      <span className="md:hidden text-xs font-bold uppercase text-slate-500">Nome: </span>
                      {launch.nome}
                    </td>
                    <td className="p-3 md:p-4" data-label="Status: ">
                      <span className="md:hidden text-xs font-bold uppercase text-slate-500">Status: </span>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[launch.status] || 'bg-gray-200'}`}>
                        {launch.status}
                      </span>
                    </td>
                    <td className="p-3 md:p-4" data-label="Ações: ">
                        <span className="md:hidden text-xs font-bold uppercase text-slate-500">Ações: </span>
                      <Link href={`/lancamentos/editar/${launch.id}`} className="text-blue-600 hover:text-blue-800 font-medium">Editar</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}