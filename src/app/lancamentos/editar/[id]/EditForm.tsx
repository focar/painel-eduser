'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { FaSpinner, FaCalendarAlt } from 'react-icons/fa';
import type { LaunchData, Survey } from './page'; 
import AgendaModal from '@/app/lancamentos/components/AgendaModal';
import type { LaunchEvent } from '../../types';

function SurveySelectionModal({ isOpen, surveys, currentSurveyId, onSelect, onClose }: {
    isOpen: boolean; surveys: Survey[]; currentSurveyId: string;
    onSelect: (surveyId: string) => void; onClose: () => void;
}) {
    if (!isOpen) return null;
    const [tempSelectedId, setTempSelectedId] = useState(currentSurveyId);
    const handleConfirm = () => onSelect(tempSelectedId);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                <div className="p-6 border-b"><h3 className="text-xl font-semibold text-slate-800">Selecionar Pesquisa</h3></div>
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    <div className="space-y-2">
                        {surveys.map(survey => (
                            <label key={survey.id} className="flex items-center p-3 rounded-md hover:bg-slate-50 border cursor-pointer">
                                <input type="radio" name="survey-selection" value={survey.id} checked={tempSelectedId === survey.id} onChange={() => setTempSelectedId(survey.id)} className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500" />
                                <span className="ml-3 text-slate-700">{survey.nome}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <div className="p-4 bg-slate-50 flex justify-end gap-3 rounded-b-lg">
                    <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">Cancelar</button>
                    <button type="button" onClick={handleConfirm} className="bg-slate-800 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-700">Confirmar</button>
                </div>
            </div>
        </div>
    );
}

const defaultEventNames = [
    "Planejamento", "Pré-lançamento", "Início da Captação", "CPL 1",
    "Live Aprofundamento CPL1", "CPL 2", "CPL 3", "Live Encerramento", "Carrinho Aberto"
];

export default function EditForm({ initialData, allSurveys }: { initialData: LaunchData, allSurveys: Survey[] }) {
    const supabase = createClient();
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<LaunchData>(initialData);
    
    const [events, setEvents] = useState<LaunchEvent[]>([]);
    const [surveys] = useState<Survey[]>(allSurveys);
    const [selectedSurveyId, setSelectedSurveyId] = useState<string>('');
    const [isSurveyModalOpen, setIsSurveyModalOpen] = useState(false);
    const [isAgendaModalOpen, setIsAgendaModalOpen] = useState(false);

    // ================== INÍCIO DA CORREÇÃO ==================
    // Toda a lógica de inicialização foi unificada neste useEffect.
    useEffect(() => {
        if (initialData) {
            // 1. Define os dados do formulário
            setFormData(initialData);

            // 2. Define a pesquisa selecionada
            if (initialData.associated_survey_ids && initialData.associated_survey_ids.length > 0) {
                setSelectedSurveyId(initialData.associated_survey_ids[0]);
            }

            // 3. Processa e combina os eventos para a agenda
            const existingEvents = new Map(initialData.eventos.map(e => [e.nome, e]));
            
            let combinedEvents: LaunchEvent[] = defaultEventNames.map((name, index) => {
                const existing = existingEvents.get(name);
                return {
                    id: Date.now() + index, nome: name,
                    data_inicio: existing?.data_inicio?.split('T')[0] || '',
                    data_fim: existing?.data_fim?.split('T')[0] || '',
                    is_custom: false,
                };
            });

            initialData.eventos.forEach((event, index) => {
                if (!defaultEventNames.includes(event.nome)) {
                    combinedEvents.push({
                        id: Date.now() + defaultEventNames.length + index, nome: event.nome,
                        data_inicio: event.data_inicio?.split('T')[0] || '',
                        data_fim: event.data_fim?.split('T')[0] || '',
                        is_custom: true,
                    });
                }
            });

            let customEventCount = combinedEvents.filter(e => e.is_custom).length;
            while (customEventCount < 2) {
                combinedEvents.push({ id: Date.now() + combinedEvents.length, nome: '', data_inicio: '', data_fim: '', is_custom: true });
                customEventCount++;
            }
            
            setEvents(combinedEvents);
        }
    }, [initialData]);
    // ================== FIM DA CORREÇÃO ==================

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const selectedSurvey = surveys.find(s => s.id === selectedSurveyId);
    const eventsWithDatesCount = events.filter(e => e.nome && e.data_inicio).length;

    return (
        <>
            <AgendaModal
                isOpen={isAgendaModalOpen}
                initialEvents={events}
                onClose={() => setIsAgendaModalOpen(false)}
                onSave={(updatedEvents) => {
                    setEvents(updatedEvents);
                    setIsAgendaModalOpen(false);
                }}
            />
            <SurveySelectionModal
                isOpen={isSurveyModalOpen}
                surveys={surveys}
                currentSurveyId={selectedSurveyId}
                onSelect={(surveyId) => { setSelectedSurveyId(surveyId); setIsSurveyModalOpen(false); }}
                onClose={() => setIsSurveyModalOpen(false)}
            />
            <div className="max-w-4xl mx-auto p-4">
                <div className="bg-white p-8 rounded-lg shadow-md">
                    <h1 className="text-2xl font-bold text-slate-800 mb-6">Editar Lançamento</h1>
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        if (!formData.nome) {
                            toast.error('O nome do lançamento é obrigatório.');
                            return;
                        }
                        setIsSaving(true);

                        let minDate = null;
                        let maxDate = null;
                        const eventsToSave = events.filter(event => event.nome && event.data_inicio);

                        if (eventsToSave.length > 0) {
                            const allDates = eventsToSave.flatMap(ev => [ev.data_inicio, ev.data_fim]).filter(Boolean) as string[];
                            minDate = allDates.reduce((min, p) => p < min ? p : min, allDates[0]);
                            maxDate = allDates.reduce((max, p) => p > max ? p : max, allDates[0]);
                        }

                        const formattedEvents = eventsToSave.map(({ id, is_custom, ...rest }) => ({ 
                            ...rest, data_fim: rest.data_fim || rest.data_inicio
                        }));

                        try {
                            const { error } = await supabase
                                .from('lancamentos')
                                .update({
                                    nome: formData.nome,
                                    descricao: formData.descricao,
                                    status: formData.status,
                                    data_inicio: minDate,
                                    data_fim: maxDate,
                                    eventos: formattedEvents,
                                    associated_survey_ids: selectedSurveyId ? [selectedSurveyId] : [],
                                })
                                .eq('id', initialData.id);

                            if (error) throw error;
                            toast.success("Lançamento atualizado com sucesso!");
                            router.push('/lancamentos');
                            router.refresh();
                        } catch (error: any) {
                            toast.error("Falha ao atualizar o lançamento: " + error.message);
                        } finally {
                            setIsSaving(false);
                        }
                    }} className="space-y-6">
                        <div>
                            <label htmlFor="nome" className="block text-sm font-medium text-slate-700">Nome do Lançamento</label>
                            <input type="text" name="nome" id="nome" value={formData.nome} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md" />
                        </div>
                        <div>
                            <label htmlFor="descricao" className="block text-sm font-medium text-slate-700">Descrição (Opcional)</label>
                            <textarea name="descricao" id="descricao" value={formData.descricao} onChange={handleChange} rows={4} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md" />
                        </div>
                        <div>
                            <label htmlFor="status" className="block text-sm font-medium text-slate-700">Status</label>
                            <select name="status" id="status" value={formData.status} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md bg-white">
                                <option>Planejado</option><option>Em Andamento</option><option>Concluído</option><option>Cancelado</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Pesquisa Atrelada</label>
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-md border">
                                <span className="text-slate-800 font-medium">{selectedSurvey ? selectedSurvey.nome : 'Nenhuma pesquisa atrelada'}</span>
                                <button type="button" onClick={() => setIsSurveyModalOpen(true)} className="bg-slate-200 text-slate-800 text-sm font-bold py-1 px-3 rounded-lg hover:bg-slate-300">
                                    {selectedSurvey ? 'Alterar' : 'Incluir'} Pesquisa
                                </button>
                            </div>
                        </div>
                        <div className="space-y-4 pt-4 border-t">
                             <label className="block text-sm font-medium text-slate-700">Agenda (Opcional)</label>
                             <div className="flex items-center justify-between p-3 bg-slate-50 rounded-md border">
                                <span className="text-slate-800 font-medium">
                                    {eventsWithDatesCount > 0 ? `${eventsWithDatesCount} marco(s) definido(s)` : 'Nenhum marco de agenda definido'}
                                </span>
                                <button type="button" onClick={() => setIsAgendaModalOpen(true)} className="bg-slate-200 text-slate-800 text-sm font-bold py-2 px-4 rounded-lg hover:bg-slate-300 inline-flex items-center gap-2">
                                    <FaCalendarAlt />
                                    {eventsWithDatesCount > 0 ? 'Editar Agenda' : 'Adicionar Agenda'}
                                </button>
                            </div>
                        </div>
                        <div className="flex justify-end pt-4 gap-4 border-t border-slate-200 mt-6">
                            <button type="button" onClick={() => router.push('/lancamentos')} className="bg-gray-200 text-gray-800 font-bold py-2 px-6 rounded-lg hover:bg-gray-300">Cancelar</button>
                            <button type="submit" disabled={isSaving} className="bg-slate-800 text-white font-bold py-2 px-6 rounded-lg hover:bg-slate-700 disabled:opacity-50">
                                {isSaving ? <FaSpinner className="animate-spin mx-auto" /> : 'Salvar Alterações'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}