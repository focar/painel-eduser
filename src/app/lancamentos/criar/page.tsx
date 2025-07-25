'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import toast from 'react-hot-toast';
import { FaSpinner } from 'react-icons/fa';

// --- Tipos de Dados ---
type LaunchEvent = {
    id: number;
    nome: string;
    data_inicio: string;
    data_fim: string;
    is_custom: boolean;
};

type Survey = {
    id: string;
    nome: string;
};

// --- NOVO COMPONENTE: MODAL DE SELEÇÃO DE PESQUISA ---
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
                        {surveys.length === 0 && <p className="text-slate-500">Nenhuma pesquisa encontrada.</p>}
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

// --- Configurações de Eventos (REINTEGRADO) ---
const defaultEventNames = [
    "Planejamento", "Pré-lançamento", "Início da Captação", "CPL 1",
    "Live Aprofundamento CPL1", "CPL 2", "CPL 3", "Live Encerramento", "Carrinho Aberto"
];
const initialEventsState: LaunchEvent[] = [
    ...defaultEventNames.map((name, index) => ({
        id: Date.now() + index, nome: name, data_inicio: '',
        data_fim: '', is_custom: false,
    })),
    { id: Date.now() + defaultEventNames.length, nome: '', data_inicio: '', data_fim: '', is_custom: true },
    { id: Date.now() + defaultEventNames.length + 1, nome: '', data_inicio: '', data_fim: '', is_custom: true },
];
const eventColorMap: { [key: string]: string } = {
    'padrão': 'bg-white text-slate-800', 'planejamento': 'bg-[#af6813] text-white',
    'pré-lançamento': 'bg-[#fea43d] text-white', 'início da captação': 'bg-[#91258e] text-white',
    'cpl 1': 'bg-[#c563dc] text-white', 'live aprofundamento cpl1': 'bg-[#5d77ab] text-white',
    'cpl 2': 'bg-[#182777] text-white', 'cpl 3': 'bg-[#00aef1] text-white',
    'live encerramento': 'bg-[#01aa9c] text-white', 'carrinho aberto': 'bg-[#01a550] text-white',
    'custom_1': 'bg-[#ec98ca] text-white', 'custom_2': 'bg-[#ed008d] text-white',
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

    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [selectedSurveyId, setSelectedSurveyId] = useState<string>('');
    const [isSurveyModalOpen, setIsSurveyModalOpen] = useState(false);

    useEffect(() => {
        const fetchSurveys = async () => {
            const { data, error } = await supabase.from('pesquisas').select('id, nome');
            if (error) {
                toast.error('Não foi possível carregar as pesquisas.');
                console.error(error);
            } else {
                setSurveys(data || []);
            }
        };
        fetchSurveys();
    }, [supabase]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setLaunch(prev => ({ ...prev, [e.target.id]: e.target.value }));
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
                    associated_survey_ids: selectedSurveyId ? [selectedSurveyId] : [],
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
    
    const selectedSurvey = surveys.find(s => s.id === selectedSurveyId);
    let customEventIndex = 0;

    return (
        <>
            <SurveySelectionModal
                isOpen={isSurveyModalOpen}
                surveys={surveys}
                currentSurveyId={selectedSurveyId}
                onSelect={(surveyId) => {
                    setSelectedSurveyId(surveyId);
                    setIsSurveyModalOpen(false);
                }}
                onClose={() => setIsSurveyModalOpen(false)}
            />
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
                                <option>Planejado</option><option>Em Andamento</option>
                                <option>Concluído</option><option>Cancelado</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Pesquisa Atrelada (Opcional)</label>
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-md border">
                                <span className="text-slate-800 font-medium">{selectedSurvey ? selectedSurvey.nome : 'Nenhuma pesquisa atrelada'}</span>
                                <button type="button" onClick={() => setIsSurveyModalOpen(true)} className="bg-slate-200 text-slate-800 text-sm font-bold py-1 px-3 rounded-lg hover:bg-slate-300">
                                    {selectedSurvey ? 'Alterar' : 'Incluir'} Pesquisa
                                </button>
                            </div>
                        </div>
                        
                        {/* --- LÓGICA DE RENDERIZAÇÃO DE EVENTOS (REINTEGRADA) --- */}
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
                                        <input type="text" placeholder={`Evento Personalizado ${customEventIndex}`} value={event.nome} readOnly={!event.is_custom} onChange={(e) => handleEventChange(index, 'nome', e.target.value)} className={`w-full px-3 py-2 border border-slate-300 rounded-md font-semibold transition-colors ${colorClasses}`} />
                                        <div className="flex items-center gap-2">
                                            <label htmlFor={`start-date-${index}`} className="text-sm text-slate-600">Início:</label>
                                            <input type="date" id={`start-date-${index}`} value={event.data_inicio} onChange={(e) => handleEventChange(index, 'data_inicio', e.target.value)} className="px-3 py-2 border border-slate-300 rounded-md" required={!!event.nome} />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <label htmlFor={`end-date-${index}`} className="text-sm text-slate-600">Fim:</label>
                                            <input type="date" id={`end-date-${index}`} value={event.data_fim} min={event.data_inicio} onChange={(e) => handleEventChange(index, 'data_fim', e.target.value)} className="px-3 py-2 border border-slate-300 rounded-md" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {/* --- FIM DA LÓGICA DE RENDERIZAÇÃO --- */}

                        <div className="flex justify-end pt-4 gap-4 border-t border-slate-200 mt-6">
                            <button type="button" onClick={() => router.push('/lancamentos')} className="bg-gray-200 text-gray-800 font-bold py-2 px-6 rounded-lg hover:bg-gray-300">Cancelar</button>
                            <button type="submit" disabled={isSubmitting} className="bg-slate-800 text-white font-bold py-2 px-6 rounded-lg hover:bg-slate-700 disabled:opacity-50">
                                {isSubmitting ? 'Salvando...' : 'Salvar Lançamento'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}