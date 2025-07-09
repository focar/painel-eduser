'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
// CORREÇÃO: Importa o novo cliente e remove a importação antiga do 'db'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { showAlertModal } from '@/lib/modals';

type Question = {
  id: string;
  texto: string;
  tipo: string;
  pesquisas_perguntas: { count: number }[];
};

export default function PerguntasPage() {
  // CORREÇÃO: Cria a instância do cliente da forma correta
  const supabase = createClientComponentClient();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      // CORREÇÃO: Usa a nova variável 'supabase' em vez de 'db'
      const { data, error } = await supabase
        .from('perguntas')
        .select(`id, texto, tipo, pesquisas_perguntas(count)`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setQuestions(data || []);
    } catch (err: any) {
      showAlertModal('Erro ao carregar perguntas', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-4 sm:mb-0">
          Banco de Perguntas
        </h1>
        <Link href="/perguntas/criar" className="bg-slate-800 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-700 text-sm">
          <i className="fas fa-plus md:mr-2"></i>
          <span className="hidden md:inline">Criar Nova Pergunta</span>
        </Link>
      </div>

      <div className="bg-white p-2 sm:p-6 rounded-lg shadow-md">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b-2 border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-3/5">Texto da Pergunta</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Vezes Usada</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={4} className="p-4 text-center"><i className="fas fa-spinner fa-spin"></i> Carregando...</td></tr>
              ) : questions.length === 0 ? (
                <tr><td colSpan={4} className="p-4 text-center">Nenhuma pergunta encontrada.</td></tr>
              ) : (
                questions.map(question => {
                  const usageCount = (question.pesquisas_perguntas && question.pesquisas_perguntas[0]?.count) || 0;
                  return (
                    <tr key={question.id}>
                      <td className="p-4 font-medium text-slate-800">{question.texto}</td>
                      <td className="p-4 text-slate-600">{question.tipo}</td>
                      <td className="p-4 text-center font-semibold">{usageCount}</td>
                      <td className="p-4 space-x-4">
                        <Link href={`/perguntas/editar/${question.id}`} className="text-blue-600 hover:text-blue-800 font-medium">Editar</Link>
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