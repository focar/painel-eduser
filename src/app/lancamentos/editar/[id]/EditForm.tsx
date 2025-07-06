'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

// --- Tipos de Dados ---
// É uma boa prática mover estes tipos para um ficheiro central, como 'src/types.ts',
// mas por enquanto, vamos mantê-los aqui para simplicidade.
type LaunchData = {
    id: string;
    nome: string;
    descricao: string;
    data_inicio: string;
    data_fim: string;
    status: string;
};

type Survey = {
    id: string;
    nome: string;
};

// --- Componente Principal do Lado do Cliente ---
export default function EditForm({ initialData }: { initialData: LaunchData }) {
    const { id } = initialData;
    const [isSaving, setIsSaving] = useState(false);
    const [isAssociateModalOpen, setIsAssociateModalOpen] = useState(false);
    const router = useRouter();

    const handleSaveFlow = async (updatedData: Partial<LaunchData>, andThen: () => void) => {
        setIsSaving(true);
        try {
            const { error: updateError } = await db.from('lancamentos').update({ 
                nome: updatedData.nome, 
                descricao: updatedData.descricao, 
                data_inicio: updatedData.data_inicio, 
                data_fim: updatedData.data_fim, 
                status: updatedData.status 
            }).eq('id', id);
            if (updateError) throw updateError;
            
            toast.success("Lançamento atualizado com sucesso!");
            setTimeout(andThen, 200);

        } catch (error: unknown) {
            const err = error as Error;
            toast.error("Falha ao atualizar o lançamento: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = (data: Partial<LaunchData>) => {
        handleSaveFlow(data, () => router.push('/lancamentos'));
    };

    const handleSaveAndAssociate = (data: Partial<LaunchData>) => {
        handleSaveFlow(data, () => setIsAssociateModalOpen(true));
    };

    const handleAssociateSurvey = async (surveyId: string) => {
        try {
            const { error } = await db.rpc('associate_survey_to_launch', { p_launch_id: id, p_survey_id: surveyId });
            if (error) throw error;
            
            toast.success('Pesquisa associada com sucesso!');
            setIsAssociateModalOpen(false);
            router.push('/lancamentos');

        } catch (error: unknown) {
            const err = error as Error;
            toast.error('Falha ao associar a pesquisa: ' + err.message);
        }
    };
    
    return (
        <div className="space-y-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Editar Lançamento</h1>
            <LaunchForm 
                initialData={initialData}
                onSave={handleSave}
                onSaveAndAssociate={handleSaveAndAssociate}
                isSaving={isSaving}
            />
            <AssociateSurveyModal
                isOpen={isAssociateModalOpen}
                onClose={() => setIsAssociateModalOpen(false)}
                onAssociate={handleAssociateSurvey}
                launchId={id}
            />
        </div>
    );
}

// --- Componentes Aninhados (Modal e Formulário) ---

function AssociateSurveyModal({ isOpen, onClose, onAssociate, launchId }: {
    isOpen: boolean;
    onClose: () => void;
    onAssociate: (surveyId: string) => void;
    launchId: string;
}) {
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [selectedSurvey, setSelectedSurvey] = useState<string>('');
    const router = useRouter();

    useEffect(() => {
        if (isOpen) {
            const fetchSurveys = async () => {
                const { data, error } = await db.from('pesquisas').select('id, nome').order('nome');
                if (error) {
                    toast.error("Não foi possível carregar as pesquisas.");
                } else {
                    setSurveys(data || []);
                    if (data && data.length > 0) {
                        setSelectedSurvey(data[0].id);
                    }
                }
            };
            fetchSurveys();
        }
    }, [isOpen, launchId]);

    if (!isOpen) return null;

    const handleAssociate = () => {
        if (selectedSurvey) {
            onAssociate(selectedSurvey);
        }
    };

    const handleCreateNew = () => {
        router.push(`/pesquisas/criar?redirect_url=/lancamentos/editar/${launchId}`);
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-lg">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Associar Pesquisa</h3>
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">Selecione uma pesquisa para associar ou crie uma nova.</p>
                    <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-2">
                        {surveys.length > 0 ? surveys.map(survey => (
                            <label key={survey.id} className="flex items-center p-2 rounded-md hover:bg-slate-100 cursor-pointer">
                                <input type="radio" name="survey" value={survey.id} checked={selectedSurvey === survey.id} onChange={(e) => setSelectedSurvey(e.target.value)} className="h-4 w-4 text-blue-600"/>
                                <span className="ml-3 text-slate-700">{survey.nome}</span>
                            </label>
                        )) : <p className="text-center text-slate-500 p-4">Nenhuma pesquisa encontrada.</p>}
                    </div>
                </div>
                <div className="mt-6 flex justify-between items-center">
                    <button onClick={handleCreateNew} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold text-sm">Criar Nova Pesquisa</button>
                    <div className="space-x-3">
                        <button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 font-semibold">Cancelar</button>
                        <button onClick={handleAssociate} disabled={!selectedSurvey} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold disabled:opacity-50">Salvar Associação</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function LaunchForm({ initialData, onSave, onSaveAndAssociate, isSaving }: { 
    initialData: LaunchData, 
    onSave: (updatedData: Partial<LaunchData>) => void,
    onSaveAndAssociate: (updatedData: Partial<LaunchData>) => void,
    isSaving: boolean 
}) {
    const [formData, setFormData] = useState(initialData);
    const [dateError, setDateError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => { setFormData(initialData); }, [initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const newFormData = { ...formData, [name]: value };
        setFormData(newFormData);

        if (name === 'data_inicio' || name === 'data_fim') {
            const startDate = newFormData.data_inicio;
            const endDate = newFormData.data_fim;
            if (startDate && endDate && endDate < startDate) {
                setDateError('A data de fim não pode ser anterior à data de início.');
            } else { setDateError(null); }
        }
    };

    return (
        <div className="space-y-6 bg-white p-8 rounded-lg shadow-md">
            <div>
                <label htmlFor="nome" className="block text-sm font-medium text-slate-700">Nome do Lançamento</label>
                <input type="text" name="nome" id="nome" value={formData.nome || ''} onChange={handleChange} autoComplete="off" className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md" required />
            </div>
            <div>
                <label htmlFor="descricao" className="block text-sm font-medium text-slate-700">Descrição</label>
                <textarea name="descricao" id="descricao" rows={4} value={formData.descricao || ''} onChange={handleChange} autoComplete="off" className="mt-1 block w-full px-3 py-2 border rounded-md" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="data_inicio" className="block text-sm font-medium text-slate-700">Data de Início</label>
                    <input type="date" name="data_inicio" id="data_inicio" value={formData.data_inicio || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                    <label htmlFor="data_fim" className="block text-sm font-medium text-slate-700">Data de Fim</label>
                    <input type="date" name="data_fim" id="data_fim" value={formData.data_fim || ''} onChange={handleChange} min={formData.data_inicio || ''} className="mt-1 block w-full px-3 py-2 border rounded-md" />
                </div>
            </div>
            {dateError && <p className="text-sm text-red-600">{dateError}</p>}
            <div>
                <label htmlFor="status" className="block text-sm font-medium text-slate-700">Status</label>
                <select name="status" id="status" value={formData.status || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white rounded-md border border-slate-300">
                    <option value="Planejado">Planejado</option>
                    <option value="Em Andamento">Em Andamento</option>
                    <option value="Concluído">Concluído</option>
                    <option value="Cancelado">Cancelado</option>
                </select>
            </div>
            <div className="flex justify-end pt-4 space-x-4">
                <button type="button" onClick={() => router.push('/lancamentos')} className="px-6 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 font-semibold">Cancelar</button>
                <button type="button" onClick={() => onSave(formData)} disabled={isSaving || !!dateError} className="px-6 py-2 bg-slate-800 text-white rounded-md hover:bg-slate-700 font-semibold disabled:opacity-50">{isSaving ? 'A salvar...' : 'Salvar'}</button>
                <button type="button" onClick={() => onSaveAndAssociate(formData)} disabled={isSaving || !!dateError} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold disabled:opacity-50">{isSaving ? 'A salvar...' : 'Salvar e Associar Pesquisa'}</button>
            </div>
        </div>
    );
}