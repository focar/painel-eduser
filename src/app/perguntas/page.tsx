// src/app/perguntas/page.tsx
'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { FaSpinner, FaPlus, FaTrash } from 'react-icons/fa';
import toast from 'react-hot-toast';

type Question = { id: string; texto: string; tipo: string | null; classe: string | null; pesquisas_perguntas: { count: number }[]; };
type FilterType = 'todos' | 'score' | 'perfil';

export default function PerguntasPage() {
  const supabase = createClient();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('score');

  const fetchQuestions = useCallback(async () => {
      setIsLoading(true);
      try {
        let query = supabase.from('perguntas').select(`id, texto, tipo, classe, pesquisas_perguntas(count)`).order('texto', { ascending: true });
        
        if (filter === 'score') {
          query = query.eq('classe', 'score');
        } else if (filter === 'perfil') {
          query = query.eq('classe', 'perfil');
        }

        const { data, error } = await query;
        if (error) throw error;
        setQuestions(data || []);
      } catch (err: any) { 
        console.error('Erro ao carregar perguntas:', err.message);
        toast.error('Não foi possível carregar as perguntas.');
      } 
      finally { setIsLoading(false); }
  }, [filter, supabase]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleDelete = async (questionId: string, questionText: string) => {
    if (window.confirm(`Tem a certeza de que quer excluir a pergunta: "${questionText}"? Esta ação não pode ser desfeita.`)) {
      try {
        // Primeiro, remove as associações na tabela pesquisas_perguntas
        const { error: deleteLinkError } = await supabase
          .from('pesquisas_perguntas')
          .delete()
          .eq('pergunta_id', questionId);
        
        if (deleteLinkError) throw deleteLinkError;

        // Depois, remove a pergunta da tabela principal
        const { error: deleteQuestionError } = await supabase
          .from('perguntas')
          .delete()
          .eq('id', questionId);

        if (deleteQuestionError) throw deleteQuestionError;

        toast.success('Pergunta excluída com sucesso!');
        // Recarrega a lista de perguntas
        fetchQuestions();
      } catch (err: any) {
        console.error('Erro ao excluir pergunta:', err);
        toast.error(`Erro: ${err.message}`);
      }
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-4 sm:mb-0">Banco de Perguntas</h1>
        <Link href="/perguntas/criar" className="inline-flex items-center bg-slate-800 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-700 text-sm">
          <FaPlus className="mr-2" /><span>Criar Nova Pergunta</span>
        </Link>
      </div>
      <div className="my-4 flex items-center gap-2">
          <button onClick={() => setFilter('todos')} className={`px-3 py-1 text-sm rounded-full transition-colors ${filter === 'todos' ? 'bg-blue-600 text-white font-semibold' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>Todos</button>
          <button onClick={() => setFilter('score')} className={`px-3 py-1 text-sm rounded-full transition-colors ${filter === 'score' ? 'bg-blue-600 text-white font-semibold' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>Score</button>
          <button onClick={() => setFilter('perfil')} className={`px-3 py-1 text-sm rounded-full transition-colors ${filter === 'perfil' ? 'bg-blue-600 text-white font-semibold' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>Perfil</button>
      </div>
      <div className="bg-white p-2 sm:p-6 rounded-lg shadow-md">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b-2 border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-3/5">Texto da Pergunta</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Classe (Uso)</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={3} className="p-4 text-center text-slate-500"><FaSpinner className="inline-flex animate-spin mr-2" /> Carregando...</td></tr>
              ) : questions.length === 0 ? (
                <tr><td colSpan={3} className="p-4 text-center text-slate-500">Nenhuma pergunta encontrada.</td></tr>
              ) : (
                questions.map(question => (
                  <tr key={question.id}>
                    <td className="p-4 font-medium text-slate-800">{question.texto}</td>
                    <td className="p-4 text-slate-600">
                        <span className={`px-2 py-1 text-xs capitalize rounded-full ${question.classe === 'perfil' ? 'bg-teal-100 text-teal-800' : 'bg-sky-100 text-sky-800'}`}>{question.classe}</span>
                    </td>
                    <td className="p-4 space-x-4">
                        <Link href={`/perguntas/editar/${question.id}`} className="text-blue-600 hover:text-blue-800 font-medium">Editar</Link>
                        {/* BOTÃO DE EXCLUIR ADICIONADO */}
                        <button onClick={() => handleDelete(question.id, question.texto)} className="text-red-600 hover:text-red-800 font-medium">Excluir</button>
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