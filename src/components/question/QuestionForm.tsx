// src/components/question/QuestionForm.tsx
// VERSÃO FINAL: Agora funciona para CRIAR e EDITAR.
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { createClient } from '@/utils/supabase/client';
import { FaSave, FaSpinner, FaTrash } from 'react-icons/fa';
import { Question } from '@/types/question'; 
import { useRouter } from 'next/navigation';

// A prop 'initialData' agora é OPCIONAL (note o '?').
type QuestionFormProps = {
  initialData?: Question;
};

// Define um estado inicial em branco para quando estamos criando uma nova pergunta.
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

  const isEditing = !!initialData; // Define se estamos no modo de edição.

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // --- CORREÇÃO ESTÁ AQUI ---
  // A função foi reescrita para ser mais explícita para o TypeScript.
  const handleOptionChange = (index: number, field: 'texto' | 'peso', value: string) => {
    // Criamos uma cópia do array de opções para não modificar o estado diretamente.
    const newOptions = [...formData.opcoes];
    
    // Verificamos qual campo está a ser alterado.
    if (field === 'peso') {
      // Se for 'peso', convertemos o valor para número.
      newOptions[index].peso = parseInt(value, 10) || 0;
    } else {
      // Se for 'texto', simplesmente atribuímos o valor.
      newOptions[index].texto = value;
    }
    
    // Atualizamos o estado com o novo array de opções.
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
      // MODO EDITAR: Usa o método update()
      const { error: updateError } = await supabase
        .from('perguntas')
        .update({
          texto: formData.texto,
          tipo: formData.tipo,
          classe: formData.classe,
          opcoes: formData.opcoes,
          modified_at: new Date().toISOString(),
        })
        .eq('id', formData.id!);
      error = updateError;
    } else {
      // MODO CRIAR: Usa o método insert()
      const { error: insertError } = await supabase
        .from('perguntas')
        .insert([
          {
            texto: formData.texto,
            tipo: formData.tipo,
            classe: formData.classe,
            opcoes: formData.opcoes,
          }
        ]);
      error = insertError;
    }

    setIsSaving(false);

    if (error) {
      setMessage({ type: 'error', text: `Erro ao salvar: ${error.message}` });
    } else {
      setMessage({ type: 'success', text: `Pergunta ${isEditing ? 'atualizada' : 'criada'} com sucesso!` });
      // router.push('/perguntas'); 
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-6">
        {isEditing ? 'Editar Pergunta' : 'Criar Nova Pergunta'}
      </h1>
      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-lg shadow-lg space-y-8">
        <div>
          <label htmlFor="texto" className="block text-base font-medium text-slate-700 mb-1">Texto da Pergunta</label>
          <textarea id="texto" name="texto" value={formData.texto} onChange={handleChange} rows={4} required className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="tipo" className="block text-base font-medium text-slate-700 mb-1">Tipo</label>
            <select id="tipo" name="tipo" value={formData.tipo} onChange={handleChange} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              <option value="multipla_escolha">Múltipla Escolha</option>
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
        {formData.tipo === 'multipla_escolha' && (
          <div className="space-y-4 border-t pt-6">
            <h3 className="text-lg font-medium text-slate-700">Opções de Resposta</h3>
            {formData.opcoes.map((option, index) => (
              <div key={index} className="flex items-center gap-2 flex-wrap">
                <input type="text" placeholder="Texto da opção" value={option.texto} onChange={(e) => handleOptionChange(index, 'texto', e.target.value)} className="flex-grow px-3 py-2 border border-slate-300 rounded-md" />
                <input type="number" placeholder="Peso" value={option.peso} onChange={(e) => handleOptionChange(index, 'peso', e.target.value)} className="w-24 px-3 py-2 border border-slate-300 rounded-md" />
                <button type="button" onClick={() => removeOption(index)} disabled={formData.opcoes.length <= 1} className="p-2 text-red-500 hover:text-red-700 disabled:opacity-50"><FaTrash /></button>
              </div>
            ))}
            <button type="button" onClick={addOption} className="text-sm font-medium text-blue-600 hover:text-blue-800 mt-2">+ Adicionar Opção</button>
          </div>
        )}
        <div className="flex items-center justify-end gap-4 border-t pt-6">
          {message && (<p className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{message.text}</p>)}
          <button type="submit" disabled={isSaving} className="inline-flex items-center bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-wait">
            {isSaving ? <FaSpinner className="animate-spin mr-2" /> : <FaSave className="mr-2" />}
            {isSaving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}
