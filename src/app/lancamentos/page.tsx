// Conteúdo para: src/app/lancamentos/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/supabaseClient';
import Link from 'next/link';

// --- Tipos de Dados ---
type Launch = {
  id: string;
  nome: string;
  status: string;
  data_inicio: string;
};

export default function LancamentosPage() {
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLaunches = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await db.from('lancamentos').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        setLaunches(data || []);
      } catch (err) {
        console.error("Erro ao buscar lançamentos:", err);
        // Evitar alert() em aplicações React. O tratamento de erro deve ser feito na UI.
      } finally {
        setIsLoading(false);
      }
    };
    fetchLaunches();
  }, []);

  // Cores para cada status, para a estilização da tag.
  const statusColors: { [key: string]: string } = {
    "Planejado": "bg-blue-100 text-blue-800",
    "Em Andamento": "bg-green-100 text-green-800",
    "Concluido": "bg-gray-100 text-gray-800",
    "Concluído": "bg-gray-100 text-gray-800", // Variação comum
    "Cancelado": "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-4 sm:mb-0">
          Gerenciador de Lançamentos
        </h1>
        <Link href="/lancamentos/criar" className="bg-slate-800 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-700 text-sm w-full sm:w-auto text-center">
          <i className="fas fa-plus md:mr-2"></i>
          <span className="hidden md:inline">Criar Novo Lançamento</span>
        </Link>
      </div>

      <div className="bg-white p-2 sm:p-6 rounded-lg shadow-md">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b-2 border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={3} className="p-4 text-center"><i className="fas fa-spinner fa-spin"></i> Carregando...</td></tr>
              ) : launches.length === 0 ? (
                <tr><td colSpan={3} className="p-4 text-center text-slate-500">Nenhum lançamento encontrado.</td></tr>
              ) : (
                launches.map(launch => {
                  // REMOVIDA a função getDisplayStatus. Usamos o status real do banco.
                  const displayStatus = launch.status;
                  return (
                    <tr key={launch.id}>
                      <td className="p-4 font-medium text-slate-800">{launch.nome}</td>
                      <td className="p-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[displayStatus] || 'bg-gray-200'}`}>
                          {displayStatus}
                        </span>
                      </td>
                      <td className="p-4 space-x-4">
                        <Link href={`/lancamentos/editar/${launch.id}`} className="text-blue-600 hover:text-blue-800 font-medium">Editar</Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
