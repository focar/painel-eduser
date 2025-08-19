// =================================================================
// ARQUIVO ÚNICO: app/perguntas/page.tsx
// Versão Corrigida: Removida a dependência '@supabase/auth-helpers-nextjs'
// para garantir a compatibilidade e corrigida a lógica do modal.
// =================================================================
'use client';

import { useState, useEffect, useMemo, FormEvent } from 'react';
// CORREÇÃO: Usando o cliente Supabase padrão para evitar erros de dependência.
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- TIPAGENS ---
export interface Question {
  id?: string;
  texto: string;
  tipo: 'multipla_escolha' | 'verdadeiro_falso' | 'sim_nao' | 'texto_livre';
  classe: 'Score' | 'Perfil' | 'Nenhum';
  opcoes: { texto: string; peso: number }[];
  created_at: string;
  modified_at: string;
}

type FiltroClasse = 'Todos' | 'Score' | 'Perfil';

// --- COMPONENTE PRINCIPAL DA PÁGINA ---
export default function PerguntasPage() {
  const [perguntas, setPerguntas] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<FiltroClasse>('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [perguntaEditando, setPerguntaEditando] = useState<Question | null>(null);

  // IMPORTANTE: Substitua pelas suas variáveis de ambiente do Supabase
  // ou cole as chaves diretamente para testar.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'URL_DO_SEU_SUPABASE';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'CHAVE_ANON_DO_SEU_SUPABASE';
  // CORREÇÃO: Cliente Supabase criado uma única vez aqui.
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const fetchPerguntas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('perguntas')
      .select('*')
      .order('texto', { ascending: true });

    if (error) {
      console.error('Erro ao buscar perguntas:', error.message);
      alert('Não foi possível carregar as perguntas.');
    } else {
      setPerguntas(data as Question[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPerguntas();
  }, []);

  const perguntasFiltradas = useMemo(() => {
    if (filtro === 'Todos') {
      return perguntas;
    }
    return perguntas.filter(p => p.classe.toLowerCase() === filtro.toLowerCase());
  }, [perguntas, filtro]);

  const handleNovaPergunta = () => {
    setPerguntaEditando({
      texto: '',
      tipo: 'multipla_escolha',
      classe: 'Score',
      opcoes: [{ texto: '', peso: 0 }],
      created_at: new Date().toISOString(),
      modified_at: new Date().toISOString(),
    });
    setIsModalOpen(true);
  };

  const handleEditar = (pergunta: Question) => {
    setPerguntaEditando(JSON.parse(JSON.stringify(pergunta)));
    setIsModalOpen(true);
  };

  const handleDeletar = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta pergunta?')) {
      const { error } = await supabase.from('perguntas').delete().eq('id', id);
      if (error) {
        alert(`Erro ao excluir: ${error.message}`);
      } else {
        setPerguntas(perguntas.filter(p => p.id !== id));
      }
    }
  };

  const handleSave = () => {
      setIsModalOpen(false);
      fetchPerguntas();
  };

  if (loading) {
    return <div className="p-8 text-center">A carregar perguntas...</div>;
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Banco de Perguntas</h1>
        <button onClick={handleNovaPergunta} className="inline-flex items-center bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
          + Criar Nova Pergunta
        </button>
      </header>

      <div className="flex space-x-2 mb-4">
        {(['Todos', 'Score', 'Perfil'] as FiltroClasse[]).map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filtro === f ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Texto da Pergunta</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Classe (Uso)</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {perguntasFiltradas.map(pergunta => (
              <tr key={pergunta.id}>
                <td className="px-6 py-4 whitespace-normal text-sm font-medium text-gray-900">{pergunta.texto}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pergunta.tipo.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${pergunta.classe.toLowerCase() === 'score' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                    {pergunta.classe}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => handleEditar(pergunta)} className="text-blue-600 hover:text-blue-900 mr-4">Editar</button>
                  <button onClick={() => handleDeletar(pergunta.id!)} className="text-red-600 hover:text-red-900">Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <QuestionModal
          supabase={supabase}
          pergunta={perguntaEditando!}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}


// --- COMPONENTE DO MODAL (DENTRO DO MESMO ARQUIVO) ---
function QuestionModal({ supabase, pergunta, onClose, onSave }: { supabase: SupabaseClient, pergunta: Question; onClose: () => void; onSave: () => void; }) {
  const [formData, setFormData] = useState<Question>(pergunta);
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = !!formData.id;

  const handleTipoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const novoTipo = e.target.value as Question['tipo'];
    
    setFormData(currentState => {
      const newState = { ...currentState, tipo: novoTipo };
      if (novoTipo === 'sim_nao') {
        newState.opcoes = [{ texto: 'Sim', peso: 0 }, { texto: 'Não', peso: 0 }];
      } else if (novoTipo === 'verdadeiro_falso') {
        newState.opcoes = [{ texto: 'Verdadeiro', peso: 0 }, { texto: 'Falso', peso: 0 }];
      } else if (novoTipo === 'texto_livre') {
        newState.opcoes = [];
      } else if (currentState.tipo !== 'multipla_escolha') {
        newState.opcoes = [{ texto: '', peso: 0 }];
      }
      return newState;
    });
  };

  const handleOptionChange = (index: number, field: 'texto' | 'peso', value: string) => {
    const newOptions = [...formData.opcoes];
    newOptions[index] = { ...newOptions[index], [field]: field === 'peso' ? (parseInt(value, 10) || 0) : value };
    setFormData(prev => ({ ...prev, opcoes: newOptions }));
  };
  
  const addOption = () => setFormData(prev => ({ ...prev, opcoes: [...prev.opcoes, { texto: '', peso: 0 }]}));
  const removeOption = (index: number) => setFormData(prev => ({ ...prev, opcoes: prev.opcoes.filter((_, i) => i !== index) }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const dataToSave = {
      texto: formData.texto,
      tipo: formData.tipo,
      classe: formData.classe,
      opcoes: ['texto_livre'].includes(formData.tipo) ? [] : formData.opcoes,
      modified_at: new Date().toISOString(),
    };

    const { error } = isEditing
      ? await supabase.from('perguntas').update(dataToSave).eq('id', formData.id!)
      : await supabase.from('perguntas').insert([dataToSave]).select();

    setIsSaving(false);
    if (error) {
      alert(`Erro: ${error.message}`);
    } else {
      onSave();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <header className="p-4 border-b">
          <h2 className="text-xl font-bold">{isEditing ? 'Editar Pergunta' : 'Criar Nova Pergunta'}</h2>
        </header>
        <form onSubmit={handleSubmit} id="question-form" className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Texto da Pergunta</label>
            <textarea value={formData.texto} onChange={e => setFormData({...formData, texto: e.target.value})} required className="w-full p-2 border rounded-md" rows={3}></textarea>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select value={formData.tipo} onChange={handleTipoChange} className="w-full p-2 border bg-white rounded-md">
                <option value="multipla_escolha">Múltipla Escolha</option>
                <option value="verdadeiro_falso">Verdadeiro / Falso</option>
                <option value="sim_nao">Sim / Não</option>
                <option value="texto_livre">Texto Livre</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Classe</label>
              <select value={formData.classe} onChange={e => setFormData({...formData, classe: e.target.value as Question['classe']})} className="w-full p-2 border bg-white rounded-md">
                <option value="Score">Score</option>
                <option value="Perfil">Perfil</option>
              </select>
            </div>
          </div>

          {['multipla_escolha', 'verdadeiro_falso', 'sim_nao'].includes(formData.tipo) && (
            <div className="space-y-2 border-t pt-4">
              <h3 className="font-semibold">Opções de Resposta</h3>
              {formData.opcoes.map((opt, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input type="text" placeholder="Texto da opção" value={opt.texto} onChange={e => handleOptionChange(index, 'texto', e.target.value)} disabled={formData.tipo !== 'multipla_escolha'} className="flex-grow p-2 border rounded-md disabled:bg-gray-100" />
                  <input type="number" placeholder="Peso" value={opt.peso} onChange={e => handleOptionChange(index, 'peso', e.target.value)} className="w-24 p-2 border rounded-md" />
                  {formData.tipo === 'multipla_escolha' && <button type="button" onClick={() => removeOption(index)} disabled={formData.opcoes.length <= 1} className="p-2 text-red-500 hover:text-red-700 disabled:opacity-50">Excluir</button>}
                </div>
              ))}
              {formData.tipo === 'multipla_escolha' && <button type="button" onClick={addOption} className="text-sm font-medium text-blue-600 hover:text-blue-800 mt-2">+ Adicionar Opção</button>}
            </div>
          )}
        </form>
        <footer className="p-4 border-t flex justify-end gap-2">
          <button type="button" onClick={onClose} className="bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">Cancelar</button>
          <button type="submit" form="question-form" disabled={isSaving} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {isSaving ? 'A guardar...' : 'Guardar'}
          </button>
        </footer>
      </div>
    </div>
  );
}
