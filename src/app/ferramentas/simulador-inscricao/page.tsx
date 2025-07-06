'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import { FaSpinner, FaPlus, FaTasks } from 'react-icons/fa';

// --- URLs DOS SEUS WEB APPS ---
const INSCRICAO_SHEET_API_URL = "https://script.google.com/macros/s/AKfycbwHxYWQLrB8_-NKsNaPWRWvbR4ZnpHs91KjkcUuWLulBXVmjs2td2rWaaNFQMR6pidzcA/exec";
const CHECKIN_SHEET_API_URL = "https://script.google.com/macros/s/AKfycbzzjJiDDrASt2S11VFOSjAkhDas3C-CpDKh_Qq4P7nClUVcRgLpRY5prcm-Ln8IgdRH/exec";

// --- TIPOS DE DADOS ---
type Launch = { id: string; nome: string; };
type Question = { id: string; texto: string; opcoes: { texto: string; peso: number }[] | null; };
type Survey = { id: string; nome: string; perguntas: Question[] };
type Answers = { [key: string]: string };

const initialLeadData = { nome: '', email: '' };
const initialUtmData = { utm_source: '', utm_medium: '', utm_campaign: '', utm_content: '', utm_term: '' };

// --- COMPONENTE DO FORMULÁRIO DE INSCRIÇÃO ---
function FormularioInscricao({ setIsLoading, isLoading, activeLaunches }) {
    const [formData, setFormData] = useState({ ...initialLeadData, ...initialUtmData });
    const [selectedLaunchId, setSelectedLaunchId] = useState<string>('');

    useEffect(() => {
        const savedUtms = localStorage.getItem('simulador_utms');
        if (savedUtms) setFormData(prev => ({ ...prev, ...JSON.parse(savedUtms) }));
    }, []);

    useEffect(() => {
        const { nome, email, ...utmsToSave } = formData;
        localStorage.setItem('simulador_utms', JSON.stringify(utmsToSave));
    }, [formData]);

    useEffect(() => {
        if (selectedLaunchId) {
            const selected = activeLaunches.find(l => l.id === selectedLaunchId);
            if (selected) setFormData(prev => ({ ...prev, utm_campaign: selected.nome }));
        }
    }, [selectedLaunchId, activeLaunches]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.email) { toast.error("O campo e-mail é obrigatório."); return; }
        setIsLoading(true);
        try {
            const launchName = activeLaunches.find(l => l.id === selectedLaunchId)?.nome || '';
            const payload = { ...formData, launch_name: launchName };

            // ✅ MÉTODO DE ENVIO ATUALIZADO PARA MELHOR DEPURACÃO
            const response = await fetch(INSCRICAO_SHEET_API_URL, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // Necessário para o Apps Script
                mode: 'cors', // Permite ler a resposta
            });

            const result = await response.json();
            if (result.status === 'success') {
                toast.success("Inscrição enviada com sucesso!");
                setFormData(prev => ({ ...prev, ...initialLeadData }));
                setSelectedLaunchId('');
            } else {
                throw new Error(result.message || "Ocorreu um erro no script do Google.");
            }
        } catch (error: any) {
            console.error("Erro detalhado ao enviar inscrição:", error);
            toast.error(`Falha ao enviar: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-6 bg-white rounded-lg shadow-md space-y-6 mt-4">
            {/* O resto do JSX do formulário permanece o mesmo */}
            <h3 className="text-lg font-semibold text-slate-700">Preencher Dados da Inscrição</h3>
            <div>
                <label htmlFor="launch-reference-inscricao" className="block text-sm font-medium text-slate-700">Lançamento de Referência</label>
                <select id="launch-reference-inscricao" value={selectedLaunchId} onChange={e => setSelectedLaunchId(e.target.value)} className="mt-1 w-full p-2 border border-slate-300 rounded-md bg-white">
                    <option value="">Nenhum (preenchimento manual)</option>
                    {activeLaunches.map(launch => <option key={launch.id} value={launch.id}>{launch.nome}</option>)}
                </select>
            </div>
            <fieldset>
                 <legend className="text-md font-semibold text-slate-600">Dados do Lead</legend>
                 <div className="mt-2 grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-4">
                     <div>
                         <label htmlFor="nome-inscricao" className="block text-sm font-medium text-slate-600">Nome</label>
                         <input type="text" name="nome" id="nome-inscricao" value={formData.nome} onChange={handleChange} autoComplete="off" className="mt-1 w-full p-2 border rounded-md" />
                     </div>
                     <div>
                         <label htmlFor="email-inscricao" className="block text-sm font-medium text-slate-600">E-mail</label>
                         <input type="email" name="email" id="email-inscricao" value={formData.email} onChange={handleChange} autoComplete="off" required className="mt-1 w-full p-2 border rounded-md" />
                     </div>
                 </div>
            </fieldset>
            <fieldset>
                <legend className="text-md font-semibold text-slate-600">Parâmetros UTM</legend>
                <div className="mt-2 grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-4">
                    <div>
                        <label htmlFor="utm_campaign" className="block text-sm font-medium text-slate-600">UTM Campaign</label>
                        <input type="text" name="utm_campaign" id="utm_campaign" value={formData.utm_campaign} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" />
                    </div>
                    <div>
                        <label htmlFor="utm_source" className="block text-sm font-medium text-slate-600">UTM Source</label>
                        <input type="text" name="utm_source" id="utm_source" value={formData.utm_source} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" />
                    </div>
                    <div>
                        <label htmlFor="utm_medium" className="block text-sm font-medium text-slate-600">UTM Medium</label>
                        <input type="text" name="utm_medium" id="utm_medium" value={formData.utm_medium} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" />
                    </div>
                    <div>
                        <label htmlFor="utm_content" className="block text-sm font-medium text-slate-600">UTM Content</label>
                        <input type="text" name="utm_content" id="utm_content" value={formData.utm_content} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" />
                    </div>
                    <div className="sm:col-span-2">
                        <label htmlFor="utm_term" className="block text-sm font-medium text-slate-600">UTM Term</label>
                        <input type="text" name="utm_term" id="utm_term" value={formData.utm_term} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md" />
                    </div>
                </div>
            </fieldset>
            <div className="text-right pt-4 border-t">
                <button type="submit" disabled={isLoading} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    {isLoading ? <FaSpinner className="animate-spin" /> : 'Adicionar Inscrição'}
                </button>
            </div>
        </form>
    );
}

// --- COMPONENTE DO FORMULÁRIO DE CHECK-IN ---
function FormularioCheckin({ setIsLoading, isLoading, activeLaunches }) {
    // A lógica deste formulário permanece a mesma por agora
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
    const [answers, setAnswers] = useState<Answers>({});
    const [formData, setFormData] = useState(initialLeadData);
    const [selectedLaunchId, setSelectedLaunchId] = useState<string>('');

    useEffect(() => {
        const fetchInitialData = async () => {
            const { data, error } = await db.from('pesquisas').select(`id, nome, perguntas ( id, texto, opcoes )`).eq('status', 'Ativo');
            if (error) { toast.error("Não foi possível carregar as pesquisas."); }
            else if (data) { setSurveys(data as Survey[]); }
        };
        fetchInitialData();
    }, []);

    const handleSurveySelect = (surveyId: string) => {
        const survey = surveys.find(s => s.id === surveyId) || null;
        setSelectedSurvey(survey);
        setAnswers({});
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.email) { toast.error("O campo e-mail é obrigatório."); return; }
        setIsLoading(true);
        const launchName = activeLaunches.find(l => l.id === selectedLaunchId)?.nome || '';
        const payload = { ...formData, respostas: answers, launch_name: launchName };
        try {
            // ✅ MÉTODO DE ENVIO ATUALIZADO PARA MELHOR DEPURACÃO
            const response = await fetch(CHECKIN_SHEET_API_URL, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                mode: 'cors',
            });
            const result = await response.json();
            if (result.status === 'success') {
                toast.success("Simulação de Check-in enviada!");
                setFormData(initialLeadData);
                setAnswers({});
                setSelectedSurvey(null);
                setSelectedLaunchId('');
            } else {
                throw new Error(result.message || "Ocorreu um erro no script do Google.");
            }
        } catch (error: any) {
            console.error("Erro detalhado ao enviar check-in:", error);
            toast.error(`Falha ao enviar: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-6 bg-white rounded-lg shadow-md space-y-4 mt-4">
            {/* O resto do JSX do formulário permanece o mesmo */}
            <h3 className="text-lg font-semibold text-slate-700">Preencher Dados do Check-in</h3>
            <div>
                <label htmlFor="launch-reference-checkin" className="block text-sm font-medium text-slate-700">Lançamento de Referência</label>
                <select id="launch-reference-checkin" value={selectedLaunchId} onChange={e => setSelectedLaunchId(e.target.value)} required className="mt-1 w-full p-2 border border-slate-300 rounded-md bg-white">
                    <option value="">Selecione um lançamento...</option>
                    {activeLaunches.map(launch => <option key={launch.id} value={launch.id}>{launch.nome}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="nome-checkin" className="block text-sm font-medium text-slate-600">Nome</label>
                <input type="text" name="nome" id="nome-checkin" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="mt-1 w-full p-2 border rounded-md" />
            </div>
            <div>
                <label htmlFor="email-checkin" className="block text-sm font-medium text-slate-600">E-mail</label>
                <input type="email" name="email" id="email-checkin" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required className="mt-1 w-full p-2 border rounded-md" />
            </div>
            <div className="pt-4 border-t">
                <label htmlFor="survey" className="block text-sm font-medium text-slate-600">Selecione uma Pesquisa</label>
                <select id="survey" onChange={e => handleSurveySelect(e.target.value)} value={selectedSurvey?.id || ''} className="mt-1 w-full p-2 border rounded-md bg-white">
                    <option value="">-- Escolha uma pesquisa --</option>
                    {surveys.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
            </div>
            {selectedSurvey && (
                <div className="space-y-4 pt-4">
                    {selectedSurvey.perguntas.map(q => (
                        <div key={q.id}>
                            <label htmlFor={q.id} className="block text-sm font-medium text-slate-600">{q.texto}</label>
                            {q.opcoes && q.opcoes.length > 0 ? (
                                <select id={q.id} onChange={(e) => setAnswers(prev => ({ ...prev, [q.texto]: e.target.value }))} className="mt-1 w-full p-2 border rounded-md bg-white">
                                    <option value="">Selecione uma resposta...</option>
                                    {q.opcoes.map(opt => <option key={opt.texto} value={opt.texto}>{opt.texto}</option>)}
                                </select>
                            ) : (
                                <input placeholder="Digite a resposta aqui..." type="text" id={q.id} onChange={(e) => setAnswers(prev => ({ ...prev, [q.texto]: e.target.value }))} className="mt-1 w-full p-2 border rounded-md" />
                            )}
                        </div>
                    ))}
                    <div className="text-right pt-4 border-t">
                        <button type="submit" disabled={isLoading} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50">
                            {isLoading ? <FaSpinner className="animate-spin" /> : 'Adicionar Check-in'}
                        </button>
                    </div>
                </div>
            )}
        </form>
    );
}

// --- PÁGINA PRINCIPAL ---
export default function SimuladorPage() {
    const [mode, setMode] = useState<'inscricao' | 'checkin' | null>('inscricao');
    const [isLoading, setIsLoading] = useState(false);
    const [activeLaunches, setActiveLaunches] = useState<Launch[]>([]);

    useEffect(() => {
        db.from('lancamentos').select('id, nome').eq('status', 'Em Andamento')
          .order('created_at', { ascending: false })
          .then(({ data }) => {
            if (data) setActiveLaunches(data);
          });
    }, []);

    return (
        <div className="space-y-6 max-w-2xl">
            <h1 className="text-3xl font-bold text-slate-800">Simulador de Inscrição e Check-in</h1>
            <p className="text-sm text-slate-500">Escolha qual tipo de ação você deseja simular.</p>
            <div className="flex space-x-4">
                <button onClick={() => setMode('inscricao')} className={`flex items-center font-bold py-2 px-4 rounded-lg transition-colors ${mode === 'inscricao' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>
                    <FaPlus className="mr-2" /> Simular Inscrição
                </button>
                <button onClick={() => setMode('checkin')} className={`flex items-center font-bold py-2 px-4 rounded-lg transition-colors ${mode === 'checkin' ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>
                    <FaTasks className="mr-2" /> Simular Check-in
                </button>
            </div>
            
            {mode === 'inscricao' && <FormularioInscricao setIsLoading={setIsLoading} isLoading={isLoading} activeLaunches={activeLaunches} />}
            {mode === 'checkin' && <FormularioCheckin setIsLoading={setIsLoading} isLoading={isLoading} activeLaunches={activeLaunches} />}
        </div>
    );
}