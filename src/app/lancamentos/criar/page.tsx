'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import toast from 'react-hot-toast';
import { FaPlus, FaTrash } from 'react-icons/fa';

// --- Tipos de Dados ---
type LaunchEvent = {
    id: number;
    nome: string;
    data_inicio: string;
    data_fim: string;
    is_custom: boolean;
};

// --- Configurações de Eventos ---
const defaultEventNames = [
    "Planejamento", "Pré-lançamento", "Início da Captação", "CPL 1",
    "Live Aprofundamento CPL1", "CPL 2", "CPL 3", "Live Encerramento", "Carrinho Aberto"
];

const initialEventsState: LaunchEvent[] = [
    ...defaultEventNames.map((name, index) => ({
        id: Date.now() + index,
        nome: name,
        data_inicio: '',
        data_fim: '',
        is_custom: false,
    })),
    { id: Date.now() + defaultEventNames.length, nome: '', data_inicio: '', data_fim: '', is_custom: true },
    { id: Date.now() + defaultEventNames.length + 1, nome: '', data_inicio: '', data_fim: '', is_custom: true },
];

// ATUALIZADO: Novo dicionário de cores
const eventColorMap: { [key: string]: string } = {
    'padrão': 'bg-white text-slate-800',
    'planejamento': 'bg-[#af6813] text-white',
    'pré-lançamento': 'bg-[#fea43d] text-white',
    'início da captação': 'bg-[#91258e] text-white',
    'cpl 1': 'bg-[#c563dc] text-white',
    'live aprofundamento cpl1': 'bg-[#5d77ab] text-white',
    'cpl 2': 'bg-[#182777] text-white',
    'cpl 3': 'bg-[#00aef1] text-white',
    'live encerramento': 'bg-[#01aa9c] text-white',
    'carrinho aberto': 'bg-[#01a550] text-white',
    'custom_1': 'bg-[#ec98ca] text-white',
    'custom_2': 'bg-[#ed008d] text-white',
};

const getEventColorClasses = (eventName: string): string => {
    const lowerCaseName = eventName.toLowerCase();
    return eventColorMap[lowerCaseName] || eventColorMap['padrão'];
};


export default function CriarLancamentoPage() {
    const supabase = createClientComponentClient();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [launch, setLaunch] = useState({
        nome: '',
        descricao: '',
        status: 'Planejado',
    });
    const [events, setEvents] = useState<LaunchEvent[]>(initialEventsState);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        setLaunch(prev => ({ ...prev, [id]: value }));
    };

    const handleEventChange = (index: number, field: 'nome' | 'data_inicio' | 'data_fim', value: string) => {
        const newEvents = [...events];
        const event = newEvents[index];
        
        if (field === 'data_fim' && value && event.data_inicio && value < event.data_inicio) {
            toast.error('A data de fim do evento não pode ser anterior à data de início.');
            return;
        }
        if (field === 'data_inicio' && value && event.data_fim && value > event.data_fim) {
            toast.error('A data de início do evento não pode ser posterior à data de fim.');
            return;
        }

        event[field] = value;
        setEvents(newEvents);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!launch.nome) {
            toast.error('O nome do lançamento é obrigatório.');
            return;
        }
        
        const eventsWithDates = events.filter(event => event.nome && event.data_inicio);
        if (eventsWithDates.length === 0) {
            toast.error('Por favor, preencha a data de início de pelo menos um marco.');
            return;
        }

        setIsSubmitting(true);
        
        const allDates = eventsWithDates.flatMap(e => [e.data_inicio, e.data_fim]).filter(Boolean);
        const minDate = allDates.reduce((min, p) => p < min ? p : min, allDates[0]);
        const maxDate = allDates.reduce((max, p) => p > max ? p : max, allDates[0]);

        const formattedEvents = eventsWithDates.map(({ nome, data_inicio, data_fim }) => ({ 
            nome, 
            data_inicio, 
            data_fim: data_fim || data_inicio
        }));

        try {
            const { error } = await supabase.from('lancamentos').insert([
                {
                    ...launch,
                    data_inicio: minDate,
                    data_fim: maxDate || minDate,
                    eventos: formattedEvents,
                    cor: null
                }
            ]);

            if (error) throw error;

            toast.success('Lançamento criado com sucesso!');
            router.push('/lancamentos');
            router.refresh();

        } catch (err: any) {
            console.error("Erro ao criar lançamento:", err);
            toast.error(`Erro: ${err.message || 'Não foi possível salvar o lançamento.'}`);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    let customEventIndex = 0;

    return (
        <div className="max-w-4xl mx-auto p-4">
            <div className="bg-white p-8 rounded-lg shadow-md">
                <h1 className="text-2xl font-bold text-slate-800 mb-6">Criar Novo Lançamento</h1>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="nome" className="block text-sm font-medium text-slate-700">Nome do Lançamento</label>
                        <input type="text" id="nome" value={launch.nome} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md" autoComplete="off" />
                    </div>
                    <div>
                        <label htmlFor="descricao" className="block text-sm font-medium text-slate-700">Descrição (Opcional)</label>
                        <textarea id="descricao" value={launch.descricao} onChange={handleChange} rows={4} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md" autoComplete="off" />
                    </div>
                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-slate-700">Status</label>
                        <select id="status" value={launch.status} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md bg-white">
                            <option>Planejado</option>
                            <option>Em Andamento</option>
                            <option>Concluído</option>
                            <option>Cancelado</option>
                        </select>
                    </div>
                    <div className="space-y-4 pt-4 border-t">
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
                                    <input 
                                        type="text" 
                                        placeholder={`Evento Personalizado ${customEventIndex}`}
                                        value={event.nome}
                                        readOnly={!event.is_custom}
                                        onChange={(e) => handleEventChange(index, 'nome', e.target.value)}
                                        className={`w-full px-3 py-2 border border-slate-300 rounded-md font-semibold transition-colors ${colorClasses}`}
                                    />
                                    <div className="flex items-center gap-2">
                                         <label htmlFor={`start-date-${index}`} className="text-sm text-slate-600">Início:</label>
                                         <input 
                                            type="date" 
                                            id={`start-date-${index}`}
                                            value={event.data_inicio}
                                            onChange={(e) => handleEventChange(index, 'data_inicio', e.target.value)}
                                            className="px-3 py-2 border border-slate-300 rounded-md"
                                            required={!!event.nome}
                                        />
                                    </div>
                                   <div className="flex items-center gap-2">
                                        <label htmlFor={`end-date-${index}`} className="text-sm text-slate-600">Fim:</label>
                                        <input 
                                            type="date" 
                                            id={`end-date-${index}`}
                                            value={event.data_fim}
                                            min={event.data_inicio}
                                            onChange={(e) => handleEventChange(index, 'data_fim', e.target.value)}
                                            className="px-3 py-2 border border-slate-300 rounded-md"
                                        />
                                   </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-end pt-4 gap-4 border-t border-slate-200 mt-6">
                        <button type="button" onClick={() => router.push('/lancamentos')} className="bg-gray-200 text-gray-800 font-bold py-2 px-6 rounded-lg hover:bg-gray-300">Cancelar</button>
                        <button type="submit" disabled={isSubmitting} className="bg-slate-800 text-white font-bold py-2 px-6 rounded-lg hover:bg-slate-700 disabled:opacity-50">
                            {isSubmitting ? 'Salvando...' : 'Salvar Lançamento'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
