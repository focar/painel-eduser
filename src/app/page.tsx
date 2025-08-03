'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { FaSpinner } from 'react-icons/fa';
import { addDays } from 'date-fns';

// --- Tipos de Dados ---
type LaunchEvent = {
    nome: string;
    data_inicio: string;
    data_fim: string;
};

type Launch = {
    id: string;
    nome: string;
    status: string;
    eventos: LaunchEvent[] | null;
};

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

// --- Dicionário de Cores ---
const eventColorMap: { [key: string]: string } = {
    'padrão': '#a1a1aa', // Cor cinzenta para eventos passados
    'planejamento': '#af6813', 'pré-lançamento': '#fea43d',
    'início da captação': '#91258e', 'cpl 1': '#c563dc', 'live aprofundamento cpl1': '#5d77ab',
    'cpl 2': '#182777', 'cpl 3': '#00aef1', 'live encerramento': '#01aa9c',
    'carrinho aberto': '#01a550', 'evento personalisado 1': '#ec98ca', 'evento personalisado 2': '#ed008d',
};

const getEventColor = (eventName: string): string => {
    const lowerCaseName = eventName.toLowerCase();
    if (eventColorMap[lowerCaseName]) return eventColorMap[lowerCaseName];
    for (const key in eventColorMap) {
        if (lowerCaseName.includes(key)) return eventColorMap[key];
    }
    return eventColorMap['padrão'];
};


// --- Componente Principal ---
export default function HomePage() {
    const supabase = createClient();
    const [allLaunches, setAllLaunches] = useState<Launch[]>([]);
    const [selectedLaunchId, setSelectedLaunchId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLaunches = async () => {
            setIsLoading(true);
            try {
                const { data: launches, error } = await supabase
                    .from('lancamentos')
                    .select('id, nome, status, eventos');

                if (error) throw error;

                if (launches) {
                    const statusOrder: { [key: string]: number } = {
                        'Em Andamento': 1, 'Planejado': 2, 'Concluído': 3,
                    };

                    const correctlyTypedLaunches = launches.map(launch => ({
                        ...launch,
                        eventos: (launch.eventos as LaunchEvent[]) || null,
                    }));

                    const sortedLaunches = [...correctlyTypedLaunches].sort((a, b) => {
                        const orderA = statusOrder[a.status] || 99;
                        const orderB = statusOrder[b.status] || 99;
                        return orderA - orderB;
                    });
                    
                    setAllLaunches(sortedLaunches);

                    const inProgressLaunch = sortedLaunches.find(l => l.status === 'Em Andamento');
                    if (inProgressLaunch) {
                        setSelectedLaunchId(inProgressLaunch.id);
                    } else if (sortedLaunches.length > 0) {
                        setSelectedLaunchId(sortedLaunches[0].id);
                    }
                }
            } catch (err: any) {
                console.error("Erro ao buscar lançamentos:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLaunches();
    }, [supabase]);

    const filteredEvents = useMemo((): CalendarEvent[] => {
        if (!selectedLaunchId || allLaunches.length === 0) return [];
        
        const selectedLaunch = allLaunches.find(launch => launch.id === selectedLaunchId);
        if (!selectedLaunch || !selectedLaunch.eventos) return [];
        
        // ================== INÍCIO DA MELHORIA ==================
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Zera a hora para comparar apenas a data

        const formattedEvents: CalendarEvent[] = [];

        selectedLaunch.eventos.forEach(event => {
            if (event.nome && event.data_inicio) {
                
                // Trata as datas como locais para evitar problemas de fuso horário com a data de hoje
                const startDateParts = event.data_inicio.split('-').map(Number);
                const startDate = new Date(startDateParts[0], startDateParts[1] - 1, startDateParts[2]);

                const endDateString = event.data_fim || event.data_inicio;
                const endDateParts = endDateString.split('-').map(Number);
                const endDate = new Date(endDateParts[0], endDateParts[1] - 1, endDateParts[2]);

                let currentDate = startDate;

                // Itera por cada dia do evento, do início ao fim
                while (currentDate <= endDate) {
                    const eventHasPassed = currentDate < today;
                    
                    const eventColor = eventHasPassed 
                        ? eventColorMap['padrão'] 
                        : getEventColor(event.nome);
                    
                    const dateString = currentDate.toISOString().split('T')[0];

                    // Cria um evento de um único dia para cada dia do intervalo
                    formattedEvents.push({
                        title: event.nome,
                        start: dateString,
                        backgroundColor: eventColor,
                        borderColor: eventColor,
                        allDay: true,
                        extendedProps: { 
                            launchName: selectedLaunch.nome, 
                            eventName: event.nome 
                        }
                    });

                    // Avança para o dia seguinte
                    currentDate = addDays(currentDate, 1);
                }
            }
        });
        // ================== FIM DA MELHORIA ====================
        return formattedEvents;
    }, [selectedLaunchId, allLaunches]);

    return (
        <div className="p-4 md:p-6 bg-white rounded-lg shadow-md">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Agenda de Lançamentos</h1>
                
                <div className="w-full sm:w-auto">
                    <label htmlFor="launch-select" className="sr-only">Selecionar Lançamento</label>
                    <select 
                        id="launch-select"
                        value={selectedLaunchId}
                        onChange={e => setSelectedLaunchId(e.target.value)}
                        disabled={isLoading}
                        className="w-full sm:w-64 px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100"
                    >
                        {isLoading ? (
                            <option>Carregando...</option>
                        ) : (
                            allLaunches.map(launch => (
                                <option key={launch.id} value={launch.id}>
                                    {launch.nome} ({launch.status})
                                </option>
                            ))
                        )}
                    </select>
                </div>
            </div>
            
            {isLoading ? (
                <div className="flex justify-center items-center h-96"><FaSpinner className="animate-spin text-blue-600 text-4xl" /></div>
            ) : (
                <>
                    <FullCalendar
                        plugins={[dayGridPlugin, interactionPlugin]}
                        initialView="dayGridMonth"
                        locale={ptBrLocale}
                        events={filteredEvents}
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
                            {Object.entries(eventColorMap).map(([name, color]) => (
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
