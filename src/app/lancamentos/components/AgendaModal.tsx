'use client';

import React, { useState } from 'react';
// ✅ O tipo agora inclui o campo opcional 'nome_personalizado'
import type { LaunchEvent } from '../types';

export default function AgendaModal({ isOpen, initialEvents, onSave, onClose }: {
    isOpen: boolean;
    initialEvents: LaunchEvent[];
    onSave: (events: LaunchEvent[]) => void;
    onClose: () => void;
}) {
    if (!isOpen) return null;

    const [events, setEvents] = useState<LaunchEvent[]>(initialEvents);
    let customEventIndex = 0;

    const handleEventChange = (index: number, field: keyof LaunchEvent, value: string) => {
        const newEvents = [...events];
        // ✅ Lógica corrigida para o campo de nome
        if (field === 'nome') {
            // Para eventos personalizados, alteramos 'nome_personalizado'
            if (newEvents[index].nome.toLowerCase().includes('evento personalisado')) {
                newEvents[index].nome_personalizado = value;
            }
        } else {
            // Para outros campos, o comportamento é normal
            (newEvents[index] as any)[field] = value;
        }
        setEvents(newEvents);
    };

    const handleSaveChanges = () => {
        onSave(events);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh]">
                <div className="p-6 border-b">
                    <h3 className="text-xl font-semibold text-slate-800">Configurar Agenda do Lançamento</h3>
                </div>
                <div className="p-6 overflow-y-auto">
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-slate-800">Marcos do Lançamento</h3>
                        {events.map((event, index) => {
                            const isCustom = event.nome.toLowerCase().includes('evento personalisado');
                            if (isCustom) customEventIndex++;

                            // ✅ Exibe o nome original ou "Captação"
                            let baseName = event.nome;
                            if (baseName.toLowerCase() === 'início da captação') {
                                baseName = 'Captação';
                            }
                            
                            return (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] items-center gap-4 p-3 bg-slate-50 rounded-md border">
                                    {/* Campo de Nome do Evento */}
                                    <input 
                                        type="text" 
                                        // O valor é o nome personalizado, ou o nome base se não houver
                                        value={isCustom ? (event.nome_personalizado || '') : baseName}
                                        placeholder={isCustom ? `Nome para ${event.nome}` : ''}
                                        readOnly={!isCustom}
                                        onChange={(e) => handleEventChange(index, 'nome', e.target.value)}
                                        className={`w-full px-3 py-2 border border-slate-300 rounded-md font-semibold ${!isCustom ? 'bg-slate-200 text-slate-500' : ''}`}
                                    />
                                    {/* Campos de Data */}
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm text-slate-600">Início:</label>
                                        <input type="date" value={event.data_inicio} onChange={(e) => handleEventChange(index, 'data_inicio', e.target.value)} className="px-3 py-2 border border-slate-300 rounded-md" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm text-slate-600">Fim:</label>
                                        <input type="date" value={event.data_fim || ''} min={event.data_inicio} onChange={(e) => handleEventChange(index, 'data_fim', e.target.value)} className="px-3 py-2 border border-slate-300 rounded-md" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="p-4 bg-slate-50 flex justify-end gap-3 rounded-b-lg border-t">
                    <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">Cancelar</button>
                    <button type="button" onClick={handleSaveChanges} className="bg-slate-800 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-700">Salvar Agenda</button>
                </div>
            </div>
        </div>
    );
}