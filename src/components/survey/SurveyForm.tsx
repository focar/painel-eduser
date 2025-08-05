// src/components/survey/SurveyForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import toast from 'react-hot-toast';
import type { Tables } from '@/types/database';

// Tipos de Dados
type Question = Pick<Tables<'perguntas'>, 'id' | 'texto'>;
type SurveyData = Tables<'pesquisas'>;

// As props do formulário agora esperam a lista de perguntas disponíveis
type SurveyFormProps = { 
    initialData?: SurveyData & { associated_question_ids: string[] } | null;
    availableQuestions: Question[]; 
};

export default function SurveyForm({ initialData, availableQuestions }: SurveyFormProps) {
    const supabase = createClient();
    const router = useRouter();
    
    const [survey, setSurvey] = useState({
        nome: initialData?.nome || '',
        categoria_pesquisa: initialData?.categoria_pesquisa || '',
        status: initialData?.status || 'Ativo',
    });
    
    const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(
        new Set(initialData?.associated_question_ids || [])
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    // O useEffect que buscava as perguntas foi removido.

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
            toast.error("Nome e Categoria são obrigatórios.");
            return;
        }
        setIsSubmitting(true);

        try {
            const surveyToSave = {
                id: initialData?.id,
                ...survey,
                modified_at: new Date().toISOString()
            };
            const { data: savedSurvey, error: surveyError } = await supabase.from('pesquisas').upsert(surveyToSave).select().single();
            if (surveyError) throw surveyError;
            
            if (initialData?.id) {
                const { error: deleteError } = await supabase.from('pesquisas_perguntas').delete().eq('pesquisa_id', initialData.id);
                if (deleteError) throw deleteError;
            }

            const questionsToLink = Array.from(selectedQuestions).map(questionId => ({
                pesquisa_id: savedSurvey.id,
                pergunta_id: questionId
            }));

            if (questionsToLink.length > 0) {
                const { error: linkError } = await supabase.from('pesquisas_perguntas').insert(questionsToLink);
                if (linkError) throw linkError;
            }

            toast.success('Pesquisa salva com sucesso!');
            router.push('/pesquisas');
            router.refresh();
        } catch (err: any) {
            console.error("Erro ao salvar pesquisa:", err);
            toast.error(`Erro: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-4 md:p-0">
            <div className="bg-white p-6 md:p-8 rounded-lg shadow-md">
                <h1 className="text-2xl font-bold text-slate-800 mb-6">
                    {initialData ? 'Editar Pesquisa' : 'Criar Nova Pesquisa'}
                </h1>
                <form onSubmit={handleSubmit} className="space-y-6">
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                        <label className="block text-sm font-medium">Perguntas Associadas (Apenas de Score)</label>
                        <div className="mt-2 space-y-2 max-h-60 overflow-y-auto border p-4 rounded-md">
                            {availableQuestions.length > 0 ? availableQuestions.map(q => (
                                <div key={q.id} className="flex items-center">
                                    <input 
                                        id={`q-${q.id}`}
                                        type="checkbox"
                                        className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                                        checked={selectedQuestions.has(q.id)}
                                        onChange={() => handleCheckboxChange(q.id)}
                                    />
                                    <label htmlFor={`q-${q.id}`} className="ml-3 text-sm text-slate-700">{q.texto}</label>
                                </div>
                            )) : <p className="text-sm text-slate-500">Nenhuma pergunta de score cadastrada.</p>}
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-end pt-4 gap-4">
                        <button type="button" onClick={() => router.push('/pesquisas')} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300">Cancelar</button>
                        <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-slate-800 text-white rounded-lg font-semibold disabled:opacity-50">
                            {isSubmitting ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}