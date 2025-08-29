//\src\app\lancamentos\components\AgendaModal.tsx

'use client';

import React, { useState, useEffect } from 'react';
import type { LaunchEvent } from '../types'; // Criaremos este arquivo de tipos a seguir
import { eventColorMap, getEventColorClasses } from '../utils'; // E este de utilitários

export default function AgendaModal({ isOpen, initialEvents, onSave, onClose }: {
    isOpen: boolean;
    initialEvents: LaunchEvent[];
    onSave: (events: LaunchEvent[]) => void;
    onClose: () => void;
}) {
    if (!isOpen) return null;

    // Estado interno para editar os eventos sem afetar o formulário principal até salvar
    const [events, setEvents] = useState<LaunchEvent[]>(initialEvents);
    let customEventIndex = 0;

    const handleEventChange = (index: number, field: 'nome' | 'data_inicio' | 'data_fim', value: string) => {
        const newEvents = [...events];
        newEvents[index][field] = value;
        setEvents(newEvents);
    };

    const handleSaveChanges = () => {
        // Filtra eventos vazios antes de salvar
        const nonEmptyEvents = events.filter(e => e.nome.trim() !== '');
        onSave(nonEmptyEvents);
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
                            let colorClasses;
                            if (event.is_custom) {
                                customEventIndex++;
                                colorClasses = eventColorMap[`custom_${customEventIndex}` as keyof typeof eventColorMap] || eventColorMap['padrão'];
                            } else {
                                colorClasses = getEventColorClasses(event.nome);
                            }
                            return (
                                <div key={event.id} className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] items-center gap-4 p-3 bg-slate-50 rounded-md border">
                                    <input type="text" placeholder={`Evento Personalizado ${customEventIndex}`} value={event.nome} readOnly={!event.is_custom} onChange={(e) => handleEventChange(index, 'nome', e.target.value)} className={`w-full px-3 py-2 border border-slate-300 rounded-md font-semibold ${colorClasses}`} />
                                    <div className="flex items-center gap-2">
                                        <label htmlFor={`start-date-${index}`} className="text-sm text-slate-600">Início:</label>
                                        <input type="date" id={`start-date-${index}`} value={event.data_inicio} onChange={(e) => handleEventChange(index, 'data_inicio', e.target.value)} className="px-3 py-2 border border-slate-300 rounded-md" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label htmlFor={`end-date-${index}`} className="text-sm text-slate-600">Fim:</label>
                                        <input type="date" id={`end-date-${index}`} value={event.data_fim} min={event.data_inicio} onChange={(e) => handleEventChange(index, 'data_fim', e.target.value)} className="px-3 py-2 border border-slate-300 rounded-md" />
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