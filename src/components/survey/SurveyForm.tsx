// Conteúdo para: src/components/survey/SurveyForm.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/supabaseClient';

type Question = { id: string; texto: string; };
type SurveyData = { id?: string; nome: string; categoria_pesquisa: string; status: string; };
type SurveyFormProps = { initialData?: SurveyData & { associated_question_ids: string[] } | null };

export default function SurveyForm({ initialData }: SurveyFormProps) {
  const router = useRouter();
  const [survey, setSurvey] = useState({
    nome: initialData?.nome || '',
    categoria_pesquisa: initialData?.categoria_pesquisa || '',
    status: initialData?.status || 'Ativo',
  });
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(
    new Set(initialData?.associated_question_ids || [])
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Busca todas as perguntas disponíveis quando o componente carrega
  useEffect(() => {
    const fetchQuestions = async () => {
      const { data } = await db.from('perguntas').select('id, texto').order('created_at', { ascending: false });
      if (data) setAllQuestions(data);
    };
    fetchQuestions();
  }, []);

  const handleCheckboxChange = (questionId: string) => {
    const newSelection = new Set(selectedQuestions);
    if (newSelection.has(questionId)) {
      newSelection.delete(questionId);
    } else {
      newSelection.add(questionId);
    }
    setSelectedQuestions(newSelection);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setSurvey({ ...survey, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!survey.nome || !survey.categoria_pesquisa) {
        alert("Nome e Categoria são obrigatórios.");
        return;
    }
    setIsSubmitting(true);

    try {
        // Passo 1: Salva ou atualiza a pesquisa na tabela 'pesquisas'
        const surveyToSave = {
            id: initialData?.id,
            ...survey,
            modified_at: new Date().toISOString()
        };
        const { data: savedSurvey, error: surveyError } = await db.from('pesquisas').upsert(surveyToSave).select().single();
        if (surveyError) throw surveyError;
        
        // Passo 2: Apaga as associações antigas na tabela 'pesquisas_perguntas'
        if (initialData?.id) {
            const { error: deleteError } = await db.from('pesquisas_perguntas').delete().eq('pesquisa_id', initialData.id);
            if (deleteError) throw deleteError;
        }

        // Passo 3: Insere as novas associações
        const questionsToLink = Array.from(selectedQuestions).map(questionId => ({
            pesquisa_id: savedSurvey.id,
            pergunta_id: questionId
        }));

        if (questionsToLink.length > 0) {
            const { error: linkError } = await db.from('pesquisas_perguntas').insert(questionsToLink);
            if (linkError) throw linkError;
        }

        alert('Pesquisa salva com sucesso!');
        router.push('/pesquisas');
        router.refresh();
    } catch (err: any) {
        console.error("Erro ao salvar pesquisa:", err);
        alert(`Erro: ${err.message}`);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">
          {initialData ? 'Editar Pesquisa' : 'Criar Nova Pesquisa'}
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>

   <div>
    <label htmlFor="nome" className="block text-sm font-medium text-slate-700">Nome da Pesquisa</label>
    <input 
        type="text" 
        id="nome" 
        value={survey.nome} 
        onChange={handleChange} 
        required 
        className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-slate-500 focus:border-slate-500 sm:text-sm"
    />
</div>

            <input type="text" id="nome" value={survey.nome} onChange={handleChange} required className="mt-1 w-full border-slate-300 rounded-md"/>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label htmlFor="categoria_pesquisa" className="block text-sm font-medium">Categoria</label>
              <select id="categoria_pesquisa" value={survey.categoria_pesquisa} onChange={handleChange} required className="mt-1 w-full border-slate-300 rounded-md">
                <option value="">Selecione...</option>
                <option value="Check-in">Check-in</option>
                <option value="Inscrição">Inscrição</option>
                <option value="Sorteio">Sorteio</option>
                <option value="Avaliacao">Avaliação</option>
              </select>
            </div>
            <div>
                <label htmlFor="status" className="block text-sm font-medium">Status</label>
                <select id="status" value={survey.status} onChange={handleChange} required className="mt-1 w-full border-slate-300 rounded-md">
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                </select>
            </div>
          </div>
          <div className="pt-4 border-t">
            <label className="block text-sm font-medium">Perguntas Associadas</label>
            <div className="mt-2 space-y-2 max-h-60 overflow-y-auto border p-4 rounded-md">
                {allQuestions.map(q => (
                    <div key={q.id} className="flex items-center">
                        <input 
                            id={`q-${q.id}`}
                            type="checkbox"
                            className="h-4 w-4 rounded"
                            checked={selectedQuestions.has(q.id)}
                            onChange={() => handleCheckboxChange(q.id)}
                        />
                        <label htmlFor={`q-${q.id}`} className="ml-3 text-sm text-slate-700">{q.texto}</label>
                    </div>
                ))}
            </div>
          </div>
          <div className="flex justify-end pt-4 gap-4">
            <button type="button" onClick={() => router.push('/pesquisas')} className="bg-gray-200 text-gray-800 font-bold py-2 px-6 rounded-lg">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="bg-slate-800 text-white font-bold py-2 px-6 rounded-lg disabled:opacity-50">
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}