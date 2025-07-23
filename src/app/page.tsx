'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { FaSpinner } from 'react-icons/fa';
import { addDays } from 'date-fns';

// --- Tipos de Dados ---
type CalendarEvent = {
    title: string;
    start: string;
    end?: string;
    backgroundColor: string;
    borderColor: string;
    allDay: true;
    extendedProps: {
        launchName: string;
        eventName: string;
    }
};

type LaunchEventData = {
    nome: string;
    data_inicio: string;
    data_fim: string;
};

// --- Dicionário de Cores ---
const eventColorMap: { [key: string]: string } = {
    'padrão': '#71717a',
    'planejamento': '#af6813',
    'pré-lançamento': '#fea43d',
    'início da captação': '#91258e',
    'cpl 1': '#c563dc',
    'live aprofundamento cpl1': '#5d77ab',
    'cpl 2': '#182777',
    'cpl 3': '#00aef1',
    'live encerramento': '#01aa9c',
    'carrinho aberto': '#01a550',
    'evento personalisado 1': '#ec98ca',
    'evento personalisado 2': '#ed008d',
};

const getEventColor = (eventName: string): string => {
    const lowerCaseName = eventName.toLowerCase();
    // Procura por correspondência exata primeiro
    if (eventColorMap[lowerCaseName]) {
        return eventColorMap[lowerCaseName];
    }
    // Procura por palavras-chave se não houver correspondência exata
    for (const key in eventColorMap) {
        if (lowerCaseName.includes(key)) {
            return eventColorMap[key];
        }
    }
    return eventColorMap['padrão'];
};

// --- Componente Principal ---
export default function HomePage() {
    const supabase = createClientComponentClient();
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchCalendarEvents = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data: launches, error } = await supabase
                .from('lancamentos')
                .select('id, nome, eventos');

            if (error) throw error;

            if (launches) {
                const formattedEvents: CalendarEvent[] = [];
                
                launches.forEach(launch => {
                    if (launch.eventos && Array.isArray(launch.eventos)) {
                        (launch.eventos as LaunchEventData[]).forEach(event => {
                            if (event.nome && event.data_inicio) {
                                const eventColor = getEventColor(event.nome);
                                const endDate = event.data_fim ? addDays(new Date(event.data_fim), 1).toISOString().split('T')[0] : undefined;

                                formattedEvents.push({
                                    title: `${launch.nome}: ${event.nome}`,
                                    start: event.data_inicio,
                                    end: endDate,
                                    backgroundColor: eventColor,
                                    borderColor: eventColor,
                                    allDay: true,
                                    extendedProps: { launchName: launch.nome, eventName: event.nome }
                                });
                            }
                        });
                    }
                });
                setEvents(formattedEvents);
            }
        } catch (err: any) {
            console.error("Erro ao buscar eventos do calendário:", err);
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchCalendarEvents();
    }, [fetchCalendarEvents]);

    return (
        <div className="p-4 md:p-6 bg-white rounded-lg shadow-md">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-6">Agenda de Lançamentos</h1>
            
            {isLoading ? (
                <div className="flex justify-center items-center h-96"><FaSpinner className="animate-spin text-blue-600 text-4xl" /></div>
            ) : (
                <>
                    <FullCalendar
                        plugins={[dayGridPlugin, interactionPlugin]}
                        initialView="dayGridMonth"
                        locale={ptBrLocale}
                        events={events}
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'dayGridMonth,dayGridWeek'
                        }}
                        height="auto"
                        eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false }}
                    />
                    <div className="mt-6 pt-4 border-t">
                        <h3 className="text-lg font-semibold text-slate-700 mb-3">Legenda</h3>
                        <div className="flex flex-wrap gap-x-6 gap-y-3">
                            {Object.entries(eventColorMap).filter(([name]) => name !== 'padrão').map(([name, color]) => (
                                <div key={name} className="flex items-center gap-2">
                                    <span className="w-4 h-4 rounded-full" style={{ backgroundColor: color }}></span>
                                    <span className="text-sm capitalize text-slate-600">{name.replace(/cpl (\d)/, 'CPL $1')}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
