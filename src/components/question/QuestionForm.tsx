// src/components/question/QuestionForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import toast from 'react-hot-toast';
import { FaPlus, FaTrash } from 'react-icons/fa';

// Tipos de Dados
export type Option = { texto: string; peso: number; };

// CORREÇÃO: O tipo foi definido explicitamente para corresponder à estrutura de dados do formulário,
// incluindo 'tipo' e 'classe' como strings.
type QuestionFormData = {
  id: string;
  created_at: string;
  modified_at: string;
  texto: string;
  tipo: string;
  classe: string;
  opcoes: Option[];
};

type QuestionFormProps = { initialData?: QuestionFormData; };

export default function QuestionForm({ initialData }: QuestionFormProps) {
  const supabase = createClient();
  const router = useRouter();

  const [formData, setFormData] = useState<QuestionFormData>(
    initialData || {
      id: '', 
      texto: '', 
      tipo: 'Múltipla Escolha', 
      classe: 'score', 
      opcoes: [{ texto: '', peso: 0 }], 
      created_at: new Date().toISOString(),
      modified_at: new Date().toISOString(),
    }
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleOptionChange = (index: number, field: keyof Option, value: string | number) => {
    const newOptions = [...formData.opcoes];
    const finalValue = field === 'peso' ? Number(value) || 0 : value;
    newOptions[index] = { ...newOptions[index], [field]: finalValue };
    setFormData(prev => ({ ...prev, opcoes: newOptions }));
  };

  const addOption = () => { setFormData(prev => ({ ...prev, opcoes: [...prev.opcoes, { texto: '', peso: 0 }] })); };
  const removeOption = (index: number) => {
    const newOptions = formData.opcoes.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, opcoes: newOptions }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.texto || !formData.tipo || !formData.classe) {
      toast.error("Texto, Tipo e Classe são obrigatórios.");
      return;
    }
    setIsSubmitting(true);
    try {
      const questionToSave = { 
        ...formData, 
        modified_at: new Date().toISOString() 
      };

      // Se não for um registro existente, o Supabase cuidará do ID.
      if (!initialData) {
        delete (questionToSave as any).id;
      }
      
      const { error } = await supabase.from('perguntas').upsert(questionToSave);
      if (error) throw error;

      toast.success('Pergunta salva com sucesso!');
      router.push('/perguntas');
      router.refresh();
    } catch (err: any) {
      console.error("Erro ao salvar pergunta:", err);
      toast.error(`Erro: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="bg-white p-6 md:p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">{initialData?.id ? 'Editar Pergunta' : 'Criar Nova Pergunta'}</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="texto" className="block text-sm font-medium text-slate-700">Texto da Pergunta</label>
            <input 
              type="text" id="texto" value={formData.texto} onChange={handleChange} required 
              autoComplete="off"
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-slate-500 focus:border-slate-500 sm:text-sm" 
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="tipo" className="block text-sm font-medium">Tipo (Formato)</label>
              <select id="tipo" value={formData.tipo ?? ''} onChange={handleChange} required className="mt-1 w-full border-slate-300 rounded-md">
                <option value="Múltipla Escolha">Múltipla Escolha</option>
                <option value="Texto">Texto</option>
                <option value="Número">Número</option>
              </select>
            </div>
            <div>
              <label htmlFor="classe" className="block text-sm font-medium">Classe (Uso)</label>
              <select id="classe" value={formData.classe ?? 'score'} onChange={handleChange} required className="mt-1 w-full border-slate-300 rounded-md">
                <option value="score">Score</option>
                <option value="perfil">Perfil</option>
              </select>
            </div>
          </div>
          <div className="pt-4 border-t">
            <label className="block text-sm font-medium">Opções de Resposta</label>
            <div className="mt-2 space-y-3">
              {formData.opcoes.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input type="text" placeholder="Texto da opção" value={option.texto} onChange={(e) => handleOptionChange(index, 'texto', e.target.value)} className="flex-grow px-3 py-2 border border-slate-300 rounded-md" />
                  <input type="number" placeholder="Peso" value={option.peso} onChange={(e) => handleOptionChange(index, 'peso', e.target.value)} className="w-24 px-3 py-2 border border-slate-300 rounded-md" />
                  <button type="button" onClick={() => removeOption(index)} className="p-2 text-red-500 hover:bg-red-100 rounded-full"><FaTrash /></button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addOption} className="mt-3 inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-slate-600 hover:bg-slate-700">
              <FaPlus className="mr-2" /> Adicionar Opção
            </button>
          </div>
          <div className="flex flex-col sm:flex-row justify-end pt-4 gap-4">
            <button type="button" onClick={() => router.push('/perguntas')} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-slate-800 text-white rounded-lg font-semibold disabled:opacity-50">
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
