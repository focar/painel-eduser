// src/components/question/QuestionForm.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { createClient } from '@/utils/supabase/client';
import { FaSave, FaSpinner, FaTrash, FaArrowLeft } from 'react-icons/fa'; // Adicionado FaArrowLeft
import { Question } from '@/types/question'; 
import { useRouter } from 'next/navigation';

type QuestionFormProps = {
  initialData?: Question;
};

const blankQuestion: Question = {
  texto: '',
  tipo: 'multipla_escolha',
  classe: 'Score',
  opcoes: [{ texto: '', peso: 0 }],
  created_at: new Date().toISOString(),
  modified_at: new Date().toISOString(),
};

export default function QuestionForm({ initialData }: QuestionFormProps) {
  const supabase = createClient();
  const router = useRouter();
  
  const [formData, setFormData] = useState<Question>(initialData || blankQuestion);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  // ✅ 1. Novo estado para controlar o sucesso do salvamento
  const [isSuccess, setIsSuccess] = useState(false);

  const isEditing = !!initialData;

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  // ... (funções handleChange, handleOptionChange, addOption, removeOption não mudam)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  const handleOptionChange = (index: number, field: 'texto' | 'peso', value: string) => {
    const newOptions = [...formData.opcoes];
    if (field === 'peso') {
      newOptions[index].peso = parseInt(value, 10) || 0;
    } else {
      newOptions[index].texto = value;
    }
    setFormData(prev => ({ ...prev, opcoes: newOptions }));
  };
  const addOption = () => {
    setFormData(prev => ({ ...prev, opcoes: [...prev.opcoes, { texto: '', peso: 0 }]}));
  };
  const removeOption = (index: number) => {
    if (formData.opcoes.length <= 1) return;
    const newOptions = formData.opcoes.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, opcoes: newOptions }));
  };
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    let error = null;

    if (isEditing) {
      const { error: updateError } = await supabase.from('perguntas').update({ ...formData, modified_at: new Date().toISOString() }).eq('id', formData.id!);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('perguntas').insert([ { texto: formData.texto, tipo: formData.tipo, classe: formData.classe, opcoes: formData.opcoes } ]);
      error = insertError;
    }

    setIsSaving(false);

    if (error) {
      setMessage({ type: 'error', text: `Erro ao salvar: ${error.message}` });
    } else {
      setMessage({ type: 'success', text: `Pergunta ${isEditing ? 'atualizada' : 'criada'} com sucesso!` });
      // ✅ 2. Ativa o estado de sucesso e REMOVE o setTimeout
      setIsSuccess(true);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-6">
        {isEditing ? 'Editar Pergunta' : 'Criar Nova Pergunta'}
      </h1>
      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-lg shadow-lg space-y-8">
        {/* ✅ 3. Adicionado <fieldset> para desabilitar o formulário após o sucesso */}
        <fieldset disabled={isSaving || isSuccess}>
          <div>
            <label htmlFor="texto" className="block text-base font-medium text-slate-700 mb-1">Texto da Pergunta</label>
            <textarea id="texto" name="texto" value={formData.texto} onChange={handleChange} rows={4} required className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="tipo" className="block text-base font-medium text-slate-700 mb-1">Tipo</label>
              <select id="tipo" name="tipo" value={formData.tipo} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                <option value="multipla_escolha">Múltipla Escolha</option>
                <option value="verdadeiro_falso">Verdadeiro / Falso</option>
                <option value="sim_nao">Sim / Não</option>
                <option value="texto_livre">Texto Livre</option>
              </select>
            </div>
            <div>
              <label htmlFor="classe" className="block text-base font-medium text-slate-700 mb-1">Classe</label>
              <select id="classe" name="classe" value={formData.classe} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                <option value="Score">Score</option>
                <option value="Perfil">Perfil</option>
                <option value="Nenhum">Nenhum</option>
              </select>
            </div>
          </div>
          
          {['multipla_escolha', 'verdadeiro_falso', 'sim_nao'].includes(formData.tipo) && (
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-medium text-slate-700">Opções de Resposta</h3>
              {formData.opcoes.map((option, index) => (
                <div key={index} className="flex items-center gap-2 flex-wrap">
                  <input type="text" placeholder="Texto da opção" value={option.texto} onChange={(e) => handleOptionChange(index, 'texto', e.target.value)} className="flex-grow px-3 py-2 border border-slate-300 rounded-md" />
                  <input type="number" placeholder="Peso" value={option.peso} onChange={(e) => handleOptionChange(index, 'peso', e.target.value)} className="w-24 px-3 py-2 border border-slate-300 rounded-md" />
                  <button type="button" onClick={() => removeOption(index)} disabled={formData.opcoes.length <= 1} className="p-2 text-red-500 hover:text-red-700 disabled:opacity-50"><FaTrash /></button>
                </div>
              ))}
              {formData.tipo === 'multipla_escolha' && (
                <button type="button" onClick={addOption} className="text-sm font-medium text-blue-600 hover:text-blue-800 mt-2">+ Adicionar Opção</button>
              )}
            </div>
          )}
        </fieldset>

        {/* ✅ 4. Lógica de botões atualizada */}
        <div className="flex items-center justify-end gap-4 border-t pt-6">
          {message && (<p className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{message.text}</p>)}
          
          {isSuccess ? (
            <button 
                type="button" 
                onClick={() => router.push('/perguntas')}
                className="inline-flex items-center bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700 transition-colors"
            >
                <FaArrowLeft className="mr-2" />
                Voltar para a Lista
            </button>
          ) : (
            <>
              <button 
                  type="button" 
                  onClick={() => router.push('/perguntas')}
                  className="inline-flex items-center bg-slate-200 text-slate-700 font-bold py-2 px-6 rounded-lg hover:bg-slate-300 transition-colors disabled:opacity-50"
                  disabled={isSaving}
              >
                  Cancelar
              </button>
              
              <button type="submit" disabled={isSaving} className="inline-flex items-center bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-wait">
                {isSaving ? <FaSpinner className="animate-spin mr-2" /> : <FaSave className="mr-2" />}
                {isSaving ? 'Salvando...' : 'Salvar'}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}