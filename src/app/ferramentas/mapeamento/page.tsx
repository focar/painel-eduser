'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/supabaseClient';
import { FaPlus, FaTrash, FaSpinner, FaSave } from 'react-icons/fa';
import toast from 'react-hot-toast';

// --- TIPOS ---
type Launch = { id: string; nome: string; status: string; };
type SupabaseQuestion = { id: string; texto: string; };
type MappingRule = { id: number; questionId: string; sheetColumnName: string; };

export default function MappingPage() {
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [selectedLaunchId, setSelectedLaunchId] = useState<string>('');
  const [supabaseQuestions, setSupabaseQuestions] = useState<SupabaseQuestion[]>([]);
  const [mappingRules, setMappingRules] = useState<MappingRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const [launchRes, questionRes] = await Promise.all([
          db.from('lancamentos').select('id, nome, status').in('status', ['Em Andamento', 'Em preparação', 'Planejado']),
          db.from('perguntas').select('id, texto')
        ]);
        if (launchRes.error) throw launchRes.error;
        if (questionRes.error) throw questionRes.error;
        setLaunches(launchRes.data || []);
        setSupabaseQuestions(questionRes.data || []);
      } catch (error: any) {
        toast.error("Erro ao carregar dados iniciais: " + error.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!selectedLaunchId) {
      setMappingRules([]);
      return;
    }
    const fetchMappingConfig = async () => {
      setIsLoading(true);
      try {
        // ✅ REVERTIDO para 'column_mappings'
        const { data, error } = await db.from('column_mappings').select('mapping_config').eq('launch_id', selectedLaunchId);
        if (error) throw error;
        const mappingData = data?.[0];
        if (mappingData?.mapping_config) {
          const savedRules = Object.entries(mappingData.mapping_config).map(([questionId, sheetColumnName], index) => ({
            id: index,
            questionId,
            sheetColumnName: sheetColumnName as string
          })).filter(rule => rule.questionId !== 'email' && rule.questionId !== 'nome');
          setMappingRules(savedRules);
        } else {
          setMappingRules([]);
        }
      } catch (error: any) {
        toast.error("Erro ao carregar mapeamento: " + error.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMappingConfig();
  }, [selectedLaunchId]);

  const availableQuestions = useMemo(() => {
    const usedQuestionIds = new Set(mappingRules.map(rule => rule.questionId));
    return supabaseQuestions.filter(q => !usedQuestionIds.has(q.id));
  }, [supabaseQuestions, mappingRules]);

  const addRule = () => {
    setMappingRules(prev => [...prev, { id: Date.now(), questionId: '', sheetColumnName: '' }]);
  };

  const updateRule = (index: number, field: 'questionId' | 'sheetColumnName', value: string) => {
    if (field === 'questionId' && value) {
      const isDuplicate = mappingRules.some((rule, i) => i !== index && rule.questionId === value);
      if (isDuplicate) {
        toast.error("Esta pergunta já foi mapeada. Por favor, escolha outra.");
        return;
      }
    }
    const newRules = [...mappingRules];
    newRules[index][field] = value;
    setMappingRules(newRules);
  };

  const removeRule = (ruleId: number) => {
    setMappingRules(prev => prev.filter(rule => rule.id !== ruleId));
  };
  
  const handleSaveChanges = async () => {
    if (!selectedLaunchId) {
        toast.error("Por favor, selecione um lançamento primeiro.");
        return;
    }
    setIsSaving(true);
    const mappingConfig: { [key: string]: string } = {};
    for (const rule of mappingRules) {
        if (rule.questionId && rule.sheetColumnName) {
             mappingConfig[rule.questionId] = rule.sheetColumnName.trim();
        }
    }
    mappingConfig['email'] = 'email';
    mappingConfig['nome'] = 'nome';
    try {
        // ✅ REVERTIDO para 'column_mappings'
        const { error } = await db.from('column_mappings').upsert(
            [{ launch_id: selectedLaunchId, mapping_config: mappingConfig }], 
            { onConflict: 'launch_id' }
        );
        if (error) throw error;
        toast.success("Mapeamento salvo com sucesso!");
    } catch (error: any) {
        toast.error("Falha ao salvar o mapeamento: " + error.message);
    } finally {
        setIsSaving(false);
    }
  };

  // O JSX do return permanece o mesmo
  return (
    <div className="p-6 bg-slate-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-slate-800 mb-4">Configuração de Mapeamento de Colunas</h1>
            <p className="text-slate-600 mb-6">Selecione um lançamento e crie as regras de "de-para" entre as suas perguntas e as colunas da planilha.</p>
            <div className="mb-6 bg-white p-4 rounded-lg shadow-md flex items-center gap-4">
                <label htmlFor="launch-selector" className="block text-sm font-medium text-slate-700">Lançamento para Configurar:</label>
                <select id="launch-selector" value={selectedLaunchId} onChange={e => setSelectedLaunchId(e.target.value)} className="px-3 py-2 border-none rounded-md focus:ring-0 bg-transparent text-slate-800 font-medium" disabled={isLoading}>
                    <option value="">-- Selecione um Lançamento --</option>
                    {launches.map(l => <option key={l.id} value={l.id}>{`${l.nome} (${l.status})`}</option>)}
                </select>
            </div>
            {isLoading && !selectedLaunchId ? (
                <div className="flex justify-center items-center p-10"><FaSpinner className="animate-spin text-blue-600 text-2xl" /></div>
            ) : selectedLaunchId && (
                <div className="bg-white p-6 rounded-lg shadow-md space-y-4 animate-fade-in">
                    {mappingRules.map((rule, index) => (
                    <div key={rule.id} className="flex items-center gap-4">
                        <div className="w-1/3">
                        <select value={rule.questionId} onChange={(e) => updateRule(index, 'questionId', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md">
                            <option value="">Selecione uma pergunta...</option>
                            {supabaseQuestions.find(q => q.id === rule.questionId) && (<option value={rule.questionId} disabled>{supabaseQuestions.find(q => q.id === rule.questionId)?.texto}</option>)}
                            {availableQuestions.map(q => (<option key={q.id} value={q.id}>{q.texto}</option>))}
                        </select>
                        </div>
                        <div className="w-2/3">
                        <input type="text" placeholder="Cole o nome da coluna da planilha aqui" value={rule.sheetColumnName} onChange={(e) => updateRule(index, 'sheetColumnName', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md"/>
                        </div>
                        <button onClick={() => removeRule(rule.id)} className="text-red-500 hover:text-red-700"><FaTrash /></button>
                    </div>
                    ))}
                    <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                        <button onClick={addRule} disabled={availableQuestions.length === 0} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 disabled:opacity-50"><FaPlus />Adicionar Regra</button>
                        <button onClick={handleSaveChanges} disabled={isSaving} className="flex items-center gap-2 px-6 py-2 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50">{isSaving ? <FaSpinner className="animate-spin" /> : <FaSave />}Salvar Mapeamento</button>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
}