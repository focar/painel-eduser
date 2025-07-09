'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
// CORREÇÃO: Importa o cliente recomendado
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { FaPlus, FaTrash, FaSpinner, FaSave } from 'react-icons/fa';
import toast from 'react-hot-toast';

// --- TIPOS ---
type Launch = { id: string; nome: string; status: string; };
type SupabaseQuestion = { id: string; texto: string; };
type MappingRule = { id: number; questionId: string; sheetColumnName: string; };

export default function MappingPage() {
    // CORREÇÃO: Usa o cliente correto
    const supabase = createClientComponentClient();
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunchId, setSelectedLaunchId] = useState<string>('');
    const [supabaseQuestions, setSupabaseQuestions] = useState<SupabaseQuestion[]>([]);
    const [mappingRules, setMappingRules] = useState<MappingRule[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const fetchInitialData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [launchRes, questionRes] = await Promise.all([
                supabase.from('lancamentos').select('id, nome, status'),
                supabase.from('perguntas').select('id, texto')
            ]);
            if (launchRes.error) throw launchRes.error;
            if (questionRes.error) throw questionRes.error;

            const statusOrder: { [key: string]: number } = { 'Em Andamento': 1, 'Em preparação': 2, 'Planejado': 3, 'Concluído': 4 };
            const sortedLaunches = (launchRes.data || []).sort((a,b) => (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99));
            
            setLaunches(sortedLaunches);
            setSupabaseQuestions(questionRes.data || []);
        } catch (error: any) {
            toast.error("Erro ao carregar dados iniciais: " + error.message);
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    const fetchMappingConfig = useCallback(async (launchId: string) => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.from('column_mappings').select('mapping_config').eq('launch_id', launchId).maybeSingle();
            if (error) throw error;
            if (data?.mapping_config) {
                const savedRules = Object.entries(data.mapping_config).map(([questionId, sheetColumnName], index) => ({
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
    }, [supabase]);

    useEffect(() => {
        if (!selectedLaunchId) {
            setMappingRules([]);
            return;
        }
        fetchMappingConfig(selectedLaunchId);
    }, [selectedLaunchId, fetchMappingConfig]);

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
            const { error } = await supabase.from('column_mappings').upsert(
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

    return (
        <div className="p-4 md:p-6 bg-slate-50 min-h-screen">
            <div className="max-w-4xl mx-auto space-y-6">
                <h1 className="text-2xl font-bold text-slate-800 mb-4">Configuração de Mapeamento de Colunas</h1>
                <p className="text-slate-600">Selecione um lançamento e crie as regras de "de-para" entre as suas perguntas e as colunas da planilha.</p>
                <div className="bg-white p-4 rounded-lg shadow-md flex flex-col sm:flex-row sm:items-center gap-4">
                    <label htmlFor="launch-selector" className="block text-sm font-medium text-slate-700 shrink-0">Lançamento para Configurar:</label>
                    <select id="launch-selector" value={selectedLaunchId} onChange={e => setSelectedLaunchId(e.target.value)} className="w-full sm:w-auto px-3 py-2 border border-slate-300 rounded-md text-slate-800 font-medium" disabled={isLoading}>
                        <option value="">-- Selecione um Lançamento --</option>
                        {launches.map(l => <option key={l.id} value={l.id}>{`${l.nome} (${l.status})`}</option>)}
                    </select>
                </div>

                {isLoading && !selectedLaunchId ? (
                    <div className="flex justify-center items-center p-10"><FaSpinner className="animate-spin text-blue-600 text-2xl" /></div>
                ) : selectedLaunchId && (
                    <div className="bg-white p-4 md:p-6 rounded-lg shadow-md space-y-4 animate-fade-in">
                        {mappingRules.map((rule, index) => (
                            <div key={rule.id} className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
                                <div className="w-full md:w-1/3">
                                    <label className="text-xs md:hidden mb-1 block">Pergunta</label>
                                    <select value={rule.questionId} onChange={(e) => updateRule(index, 'questionId', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md">
                                        <option value="">Selecione uma pergunta...</option>
                                        {supabaseQuestions.find(q => q.id === rule.questionId) && (<option value={rule.questionId} disabled>{supabaseQuestions.find(q => q.id === rule.questionId)?.texto}</option>)}
                                        {availableQuestions.map(q => (<option key={q.id} value={q.id}>{q.texto}</option>))}
                                    </select>
                                </div>
                                <div className="w-full md:w-2/3">
                                    <label className="text-xs md:hidden mb-1 block">Nome da Coluna na Planilha</label>
                                    <input type="text" placeholder="Cole o nome da coluna da planilha aqui" value={rule.sheetColumnName} onChange={(e) => updateRule(index, 'sheetColumnName', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md"/>
                                </div>
                                <button onClick={() => removeRule(rule.id)} className="text-red-500 hover:text-red-700 self-end md:self-center p-2"><FaTrash /></button>
                            </div>
                        ))}
                        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <button onClick={addRule} disabled={availableQuestions.length === 0} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 disabled:opacity-50"><FaPlus />Adicionar Regra</button>
                            <button onClick={handleSaveChanges} disabled={isSaving} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50">{isSaving ? <FaSpinner className="animate-spin" /> : <FaSave />}Salvar Mapeamento</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}