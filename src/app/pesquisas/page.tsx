'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import toast from 'react-hot-toast';
import { FaSpinner, FaEye, FaEyeSlash } from 'react-icons/fa';
// 1. Importamos o tipo 'Tables' do arquivo gerado pelo Supabase.
import type { Tables } from '@/types/database';

// 2. Inferimos o tipo diretamente e adicionamos a propriedade 'count' que vem da query.
type Survey = Tables<'pesquisas'> & {
    pesquisas_perguntas: { count: number }[];
};

export default function PesquisasPage() {
    const supabase = createClient();
    const [allSurveys, setAllSurveys] = useState<Survey[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showInactive, setShowInactive] = useState(false);
    const router = useRouter();

    const fetchSurveys = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('pesquisas')
            .select(`id, nome, categoria_pesquisa, status, pesquisas_perguntas(count)`)
            .order('created_at', { ascending: false });

        if (error) {
            toast.error('Erro ao carregar pesquisas: ' + error.message);
        } else {
            // Com o tipo correto, o TypeScript aceita 'data' sem problemas.
            setAllSurveys(data as Survey[] || []);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchSurveys();
    }, []);
    
    const handleInactivate = async (surveyId: string, surveyName: string) => {
        const confirmed = confirm(`Tem certeza que deseja inativar a pesquisa "${surveyName}"?`);
        
        if (confirmed) {
            const toastId = toast.loading('Inativando pesquisa...');
            try {
                const { error } = await supabase
                    .from('pesquisas')
                    .update({ status: 'Inativo' })
                    .eq('id', surveyId);

                if (error) throw error;
                
                toast.success('Pesquisa inativada com sucesso.', { id: toastId });
                fetchSurveys(); 

            } catch (err: any) {
                toast.error('Erro ao inativar: ' + err.message, { id: toastId });
            }
        }
    };

    const surveysToDisplay = useMemo(() => {
        const filtered = showInactive ? allSurveys : allSurveys.filter(s => s.status !== 'Inativo');
        
        return filtered.sort((a, b) => {
            if (a.status === 'Ativo' && b.status !== 'Ativo') return -1;
            if (a.status !== 'Ativo' && b.status === 'Ativo') return 1;
            return 0;
        });
    }, [allSurveys, showInactive]);


    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Gerenciador de Pesquisas</h1>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setShowInactive(!showInactive)}
                        className="bg-white border border-slate-300 text-slate-600 font-bold py-2 px-4 rounded-lg hover:bg-slate-50 transition-colors inline-flex items-center gap-2"
                    >
                        {showInactive ? <FaEyeSlash /> : <FaEye />}
                        <span>{showInactive ? 'Ocultar Inativos' : 'Mostrar Inativos'}</span>
                    </button>
                    <Link href="/pesquisas/criar" className="bg-slate-800 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-900 transition-colors inline-flex items-center">
                        <span className="mr-2">+</span>Criar Nova Pesquisa
                    </Link>
                </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="border-b-2 border-slate-200">
                            <tr>
                                <th className="p-4 text-left text-xs font-semibold text-slate-500 uppercase">Nome da Pesquisa</th>
                                <th className="p-4 text-left text-xs font-semibold text-slate-500 uppercase">Nº de Perguntas</th>
                                <th className="p-4 text-left text-slate-500 uppercase">Categoria</th>
                                <th className="p-4 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                                <th className="p-4 text-left text-xs font-semibold text-slate-500 uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr><td colSpan={5} className="p-4 text-center text-slate-500"><FaSpinner className="animate-spin inline-block mr-2" /> Carregando...</td></tr>
                            ) : surveysToDisplay.length === 0 ? (
                                <tr><td colSpan={5} className="p-4 text-center text-slate-500">Nenhuma pesquisa encontrada.</td></tr>
                            ) : (
                                surveysToDisplay.map(survey => {
                                    const questionCount = (survey.pesquisas_perguntas && survey.pesquisas_perguntas[0]?.count) || 0;
                                    const statusColor = survey.status === 'Ativo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';

                                    return (
                                        <tr key={survey.id} className={`hover:bg-slate-50 ${survey.status === 'Inativo' ? 'opacity-60' : ''}`}>
                                            <td className="p-4 font-medium text-slate-800">{survey.nome}</td>
                                            <td className="p-4 text-slate-600">{questionCount}</td>
                                            <td className="p-4 text-slate-600">{survey.categoria_pesquisa}</td>
                                            <td className="p-4"><span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor}`}>{survey.status}</span></td>
                                            <td className="p-4 space-x-4">
                                                <Link href={`/pesquisas/editar/${survey.id}`} className="text-blue-600 hover:text-blue-800 font-medium">Editar</Link>
                                                {survey.status === 'Ativo' && (
                                                    <button onClick={() => handleInactivate(survey.id, survey.nome)} className="text-red-600 hover:text-red-800 font-medium">
                                                        Inativar
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}