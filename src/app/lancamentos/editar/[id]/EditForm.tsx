// src/app/lancamentos/editar/[id]/EditForm.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { FaSpinner } from 'react-icons/fa';

// --- Tipos de Dados ---
type LaunchEvent = {
    id: number; // ID temporário
    nome: string;
    data_inicio: string;
    data_fim: string;
    is_custom: boolean;
};

type LaunchData = {
    id: string;
    nome: string;
    descricao: string;
    status: string;
    eventos: { nome: string; data_inicio: string; data_fim: string }[];
};

// --- Configurações de Eventos ---
const defaultEventNames = [
    "Planejamento", "Pré-lançamento", "Início da Captação",
    "Live 1", "Live 2", "Abertura do Carrinho", "Fechamento do Carrinho"
];

const eventColorMap: { [key: string]: string } = {
    'padrão': 'bg-white text-slate-800', 'planejamento': 'bg-gray-500 text-white',
    'pré-lançamento': 'bg-[#dabd62] text-white', 'início da captação': 'bg-blue-500 text-white',
    'live 1': 'bg-[#d864c3] text-white', 'live 2': 'bg-[#b983b6] text-white',
    'abertura do carrinho': 'bg-green-500 text-white', 'fechamento do carrinho': 'bg-[#e6567f] text-white',
};

const getEventColorClasses = (eventName: string): string => {
    const lowerCaseName = eventName.toLowerCase();
    return eventColorMap[lowerCaseName] || eventColorMap['padrão'];
};

// --- Componente Principal ---
export default function EditForm({ initialData }: { initialData: LaunchData }) {
    const supabase = createClientComponentClient();
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    
    const [formData, setFormData] = useState({
        nome: initialData.nome,
        descricao: initialData.descricao,
        status: initialData.status,
    });
    
    const [events, setEvents] = useState<LaunchEvent[]>([]);

    useEffect(() => {
        // Popula o formulário com os dados iniciais
        setFormData({
            nome: initialData.nome,
            descricao: initialData.descricao,
            status: initialData.status,
        });

        // Combina os eventos salvos com a lista padrão
        const existingEvents = new Map(initialData.eventos.map(e => [e.nome, e]));
        const combinedEvents: LaunchEvent[] = defaultEventNames.map((name, index) => {
            const existing = existingEvents.get(name);
            return {
                id: Date.now() + index,
                nome: name,
                data_inicio: existing?.data_inicio?.split('T')[0] || '',
                data_fim: existing?.data_fim?.split('T')[0] || '',
                is_custom: false,
            };
        });

        // Adiciona os eventos personalizados que foram salvos
        initialData.eventos.forEach((event, index) => {
            if (!defaultEventNames.includes(event.nome)) {
                combinedEvents.push({
                    id: Date.now() + defaultEventNames.length + index,
                    nome: event.nome,
                    data_inicio: event.data_inicio?.split('T')[0] || '',
                    data_fim: event.data_fim?.split('T')[0] || '',
                    is_custom: true,
                });
            }
        });
        
        // Garante que haja sempre dois campos personalizados em branco
        let customEventCount = combinedEvents.filter(e => e.is_custom).length;
        while (customEventCount < 2) {
            combinedEvents.push({ id: Date.now() + combinedEvents.length, nome: '', data_inicio: '', data_fim: '', is_custom: true });
            customEventCount++;
        }

        setEvents(combinedEvents);
    }, [initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleEventChange = (index: number, field: 'nome' | 'data_inicio' | 'data_fim', value: string) => {
        const newEvents = [...events];
        newEvents[index][field] = value;
        setEvents(newEvents);
    };

    const handleSave = async () => {
        if (!formData.nome) {
            toast.error('O nome do lançamento é obrigatório.');
            return;
        }

        const eventsWithDates = events.filter(event => event.nome && event.data_inicio);
        if (eventsWithDates.length === 0) {
            toast.error('Por favor, preencha a data de início de pelo menos um marco.');
            return;
        }
        
        setIsSaving(true);
        
        const allDates = eventsWithDates.flatMap(e => [e.data_inicio, e.data_fim]).filter(Boolean);
        const minDate = allDates.reduce((min, p) => p < min ? p : min, allDates[0]);
        const maxDate = allDates.reduce((max, p) => p > max ? p : max, allDates[0]);

        const formattedEvents = eventsWithDates.map(({ nome, data_inicio, data_fim }) => ({ 
            nome, 
            data_inicio, 
            data_fim: data_fim || data_inicio
        }));

        try {
            const { error } = await supabase
                .from('lancamentos')
                .update({
                    ...formData,
                    data_inicio: minDate,
                    data_fim: maxDate || minDate,
                    eventos: formattedEvents,
                })
                .eq('id', initialData.id);

            if (error) throw error;
            
            toast.success("Lançamento atualizado com sucesso!");
            router.push('/lancamentos');
            router.refresh();

        } catch (error: unknown) {
            const err = error as Error;
            toast.error("Falha ao atualizar o lançamento: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4">
            <div className="bg-white p-8 rounded-lg shadow-md">
                <h1 className="text-2xl font-bold text-slate-800 mb-6">Editar Lançamento</h1>
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
                    {/* Campos Principais */}
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
                    
                    {/* Gestão de Eventos */}
                    <div className="space-y-4 pt-4 border-t">
                        <h3 className="text-lg font-medium text-slate-800">Marcos do Lançamento</h3>
                        {events.map((event, index) => {
                            const colorClasses = getEventColorClasses(event.nome);
                            return (
                                <div key={event.id} className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] items-center gap-4 p-3 bg-slate-50 rounded-md border">
                                    <input type="text" placeholder="Nome do Evento Personalizado" value={event.nome} readOnly={!event.is_custom} onChange={(e) => handleEventChange(index, 'nome', e.target.value)} className={`w-full px-3 py-2 border border-slate-300 rounded-md font-semibold ${colorClasses}`} />
                                    <div className="flex items-center gap-2">
                                         <label className="text-sm text-slate-600">Início:</label>
                                         <input type="date" value={event.data_inicio} onChange={(e) => handleEventChange(index, 'data_inicio', e.target.value)} className="px-3 py-2 border border-slate-300 rounded-md" required={!!event.nome} />
                                    </div>
                                   <div className="flex items-center gap-2">
                                        <label className="text-sm text-slate-600">Fim:</label>
                                        <input type="date" value={event.data_fim} min={event.data_inicio} onChange={(e) => handleEventChange(index, 'data_fim', e.target.value)} className="px-3 py-2 border border-slate-300 rounded-md" />
                                   </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex justify-end pt-4 gap-4 border-t border-slate-200 mt-6">
                        <button type="button" onClick={() => router.push('/lancamentos')} className="bg-gray-200 text-gray-800 font-bold py-2 px-6 rounded-lg hover:bg-gray-300">Cancelar</button>
                        <button type="submit" disabled={isSaving} className="bg-slate-800 text-white font-bold py-2 px-6 rounded-lg hover:bg-slate-700 disabled:opacity-50">
                            {isSaving ? <FaSpinner className="animate-spin mx-auto" /> : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
