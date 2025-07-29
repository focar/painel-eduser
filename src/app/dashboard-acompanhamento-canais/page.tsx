'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { FaFilter, FaSpinner, FaChartBar, FaUsers, FaCheckCircle } from 'react-icons/fa';

// --- Tipagens de Dados ---
type Launch = { id: string; nome: string; status: string; };

type UtmOptions = {
    source: { option: string }[];
    medium: { option: string }[];
    content: { option: string }[];
    campaign: { option: string }[];
    term: { option: string }[];
};

type ChannelData = {
    total_inscriptions: number;
    total_checkins: number;
    conversion_rate: number;
};

// --- Componente Principal ---
export default function AcompanhamentoCanaisPage() {
    const supabase = createClient();

    // --- Estados ---
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [selectedLaunch, setSelectedLaunch] = useState<string>('');
    
    const [filters, setFilters] = useState({
        source: '',
        medium: '',
        content: '',
        campaign: '',
        term: ''
    });

    const [options, setOptions] = useState<UtmOptions>({
        source: [],
        medium: [],
        content: [],
        campaign: [],
        term: []
    });

    const [results, setResults] = useState<ChannelData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isOptionsLoading, setIsOptionsLoading] = useState<Record<string, boolean>>({});

    // --- Funções de Carregamento de Dados ---

    useEffect(() => {
        const fetchLaunches = async () => {
            setIsLoading(true);
            const { data, error } = await supabase.from('lancamentos').select('id, nome, status').in('status', ['Em Andamento', 'Concluído']);
            if (error) {
                console.error("Erro ao buscar lançamentos:", error);
            } else {
                const statusOrder: { [key: string]: number } = { 'Em Andamento': 1, 'Concluído': 2 };
                const sorted = data.sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || a.nome.localeCompare(b.nome));
                setLaunches(sorted);
                if (sorted.length > 0) {
                    setSelectedLaunch(sorted[0].id);
                }
            }
            setIsLoading(false);
        };
        fetchLaunches();
    }, [supabase]);

    const fetchUtmOptions = useCallback(async (level: keyof UtmOptions, currentFilters: typeof filters) => {
        if (!selectedLaunch) return;
        setIsOptionsLoading(prev => ({ ...prev, [level]: true }));
        
        const { data, error } = await supabase.rpc('get_utm_options_for_level', {
            p_launch_id: selectedLaunch,
            p_level: level,
            p_filters: {
                source: currentFilters.source,
                medium: currentFilters.medium,
                content: currentFilters.content,
                campaign: currentFilters.campaign
            }
        });

        if (error) {
            console.error(`Erro ao buscar opções para ${level}:`, error);
            setOptions(prev => ({ ...prev, [level]: [] }));
        } else {
            setOptions(prev => ({ ...prev, [level]: data || [] }));
        }
        setIsOptionsLoading(prev => ({ ...prev, [level]: false }));
    }, [selectedLaunch, supabase]);
    
    useEffect(() => {
        if (selectedLaunch) {
            const initialFilters = { source: '', medium: '', content: '', campaign: '', term: '' };
            setFilters(initialFilters);
            setResults(null);
            fetchUtmOptions('source', initialFilters);
        }
    }, [selectedLaunch, fetchUtmOptions]);

    const handleFilterChange = (level: keyof UtmOptions, value: string) => {
        const newFilters = { ...filters, [level]: value };
        setFilters(newFilters);
        setResults(null);

        const nextLevelMap: Partial<Record<keyof UtmOptions, keyof UtmOptions>> = {
            source: 'medium',
            medium: 'content',
            content: 'campaign',
            campaign: 'term'
        };
        const nextLevel = nextLevelMap[level];

        const levels = ['source', 'medium', 'content', 'campaign', 'term'];
        const currentIndex = levels.indexOf(level);
        const newOptions = { ...options };
        for (let i = currentIndex + 1; i < levels.length; i++) {
            const key = levels[i] as keyof UtmOptions;
            newFilters[key] = '';
            newOptions[key] = [];
        }
        setOptions(newOptions);
        setFilters(newFilters);

        if (value && nextLevel) {
            fetchUtmOptions(nextLevel, newFilters);
        }
    };

    const handleSearch = useCallback(async () => {
        if (!selectedLaunch) return;
        setIsLoading(true);
        setResults(null);
        
        const { data, error } = await supabase.rpc('get_filtered_channel_data', {
            p_launch_id: selectedLaunch,
            p_filters: filters
        });

        if (error) {
            console.error("Erro ao buscar resultados:", error);
        } else {
            setResults(data && data.length > 0 ? data[0] : null);
        }
        setIsLoading(false);
    }, [selectedLaunch, filters, supabase]);
    
    // --- Renderização ---

    const renderFilterDropdown = (level: keyof UtmOptions, label: string, parentFilter: string | undefined) => {
        const isDisabled = !parentFilter && level !== 'source';

        // --- INÍCIO DA LÓGICA DE DESTAQUE ---
        // Determina se este é o próximo passo a ser preenchido pelo usuário
        let isNextStep = false;
        if (level === 'source' && !filters.source) {
            isNextStep = true;
        } else if (level === 'medium' && filters.source && !filters.medium) {
            isNextStep = true;
        } else if (level === 'content' && filters.medium && !filters.content) {
            isNextStep = true;
        } else if (level === 'campaign' && filters.content && !filters.campaign) {
            isNextStep = true;
        } else if (level === 'term' && filters.campaign && !filters.term) {
            isNextStep = true;
        }
        // --- FIM DA LÓGICA DE DESTAQUE ---

        // Classes dinâmicas para o select, incluindo o sombreamento
        const selectClasses = [
            'w-full', 'pl-3', 'pr-10', 'py-2', 'text-base', 'border-gray-300',
            'focus:outline-none', 'focus:ring-blue-500', 'focus:border-blue-500',
            'sm:text-sm', 'rounded-md', 'appearance-none',
            'disabled:bg-slate-200', 'disabled:cursor-not-allowed',
            'transition-all', 'duration-300'
        ];

        // Adiciona as classes de destaque se for o próximo passo
        if (isNextStep && !isDisabled) {
            selectClasses.push('shadow-lg', 'ring-2', 'ring-blue-400', 'border-transparent');
        }

        return (
            <div>
                <label htmlFor={level} className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                <div className="relative">
                    <select
                        id={level}
                        value={filters[level]}
                        onChange={(e) => handleFilterChange(level, e.target.value)}
                        disabled={isDisabled || isOptionsLoading[level]}
                        className={selectClasses.join(' ')}
                    >
                        <option value="">{isOptionsLoading[level] ? 'Carregando...' : `Selecione ${label}`}</option>
                        {options[level].map((opt, index) => <option key={`${opt.option}-${index}`} value={opt.option}>{opt.option || 'N/A'}</option>)}
                    </select>
                    {isOptionsLoading[level] && <FaSpinner className="animate-spin absolute right-3 top-1/2 -mt-2 text-slate-400" />}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 p-4 md:p-6 bg-slate-50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Acompanhamento de Canais</h1>
                <div className="bg-white p-2 rounded-lg shadow-md w-full md:w-auto">
                    <select value={selectedLaunch} onChange={(e) => setSelectedLaunch(e.target.value)} className="w-full px-3 py-2 border-none rounded-md focus:ring-0 bg-transparent text-slate-700 font-medium">
                        {launches.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.status})</option>)}
                    </select>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center gap-2 mb-4">
                    <FaFilter className="text-blue-600"/>
                    <h2 className="text-lg font-semibold text-slate-700">Filtros em Cascata</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {renderFilterDropdown('source', 'UTM Source', 'true')}
                    {renderFilterDropdown('medium', 'UTM Medium', filters.source)}
                    {renderFilterDropdown('content', 'UTM Content', filters.medium)}
                    {renderFilterDropdown('campaign', 'UTM Campaign', filters.content)}
                    {renderFilterDropdown('term', 'UTM Term', filters.campaign)}
                </div>
                <div className="mt-6 text-right">
                    <button 
                        onClick={handleSearch}
                        disabled={isLoading || !filters.source} // Habilita quando pelo menos a source é selecionada
                        className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
                    >
                        Pesquisar
                    </button>
                </div>
            </div>

            {isLoading && !results && (
                <div className="flex justify-center items-center p-10"><FaSpinner className="animate-spin text-blue-600 text-4xl" /></div>
            )}

            {results && (
                 <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-lg font-semibold text-slate-700 mb-4">Resultados da Pesquisa</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="flex items-center p-4 bg-slate-50 rounded-lg">
                            <FaUsers className="text-3xl text-blue-500 mr-4"/>
                            <div>
                                <p className="text-sm text-slate-500">Total de Inscrições</p>
                                <p className="text-2xl font-bold text-slate-800">{results.total_inscriptions.toLocaleString('pt-BR')}</p>
                            </div>
                        </div>
                        <div className="flex items-center p-4 bg-slate-50 rounded-lg">
                            <FaCheckCircle className="text-3xl text-green-500 mr-4"/>
                            <div>
                                <p className="text-sm text-slate-500">Total de Check-ins</p>
                                <p className="text-2xl font-bold text-slate-800">{results.total_checkins.toLocaleString('pt-BR')}</p>
                            </div>
                        </div>
                         <div className="flex items-center p-4 bg-slate-50 rounded-lg">
                            <FaChartBar className="text-3xl text-amber-500 mr-4"/>
                            <div>
                                <p className="text-sm text-slate-500">Taxa de Conversão</p>
                                <p className="text-2xl font-bold text-slate-800">{(results.conversion_rate || 0).toFixed(1)}%</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
