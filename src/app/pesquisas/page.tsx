'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// CORREÇÃO: Importa o novo cliente
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { showAlertModal, showConfirmationModal } from '@/lib/modals';

type Survey = {
    id: string;
    nome: string;
    categoria_pesquisa: string;
    status: string;
    pesquisas_perguntas: { count: number }[];
};

export default function PesquisasPage() {
    // CORREÇÃO: Cria a instância do cliente da forma correta
    const supabase = createClientComponentClient();
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const fetchSurveys = async () => {
        setIsLoading(true);
        // CORREÇÃO: Usa a variável 'supabase'
        const { data, error } = await supabase
            .from('pesquisas')
            .select(`id, nome, categoria_pesquisa, status, pesquisas_perguntas(count)`)
            .order('status', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) {
            showAlertModal('Erro ao carregar pesquisas', error.message);
        } else {
            setSurveys(data?.filter(s => s.status !== 'Inativo') || []);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchSurveys();
    }, []);
    
    const handleInactivate = async (surveyId: string, surveyName: string) => {
        showConfirmationModal(`Tem certeza que deseja inativar a pesquisa "${surveyName}"?`, async () => {
            try {
                // CORREÇÃO: Usa a variável 'supabase'
                const { error } = await supabase
                    .from('pesquisas')
                    .update({ status: 'Inativo' })
                    .eq('id', surveyId);

                if (error) throw error;
                showAlertModal('Sucesso', 'Pesquisa inativada com sucesso.');
                fetchSurveys();
            } catch (err: any) {
                showAlertModal('Erro ao inativar', err.message);
            }
        });
    };

    // O resto do seu JSX não muda...
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Gerenciador de Pesquisas</h1>
                <Link href="/pesquisas/criar" className="bg-slate-800 text-white font-bold py-2 px-4 rounded-lg">
                    <i className="fas fa-plus mr-2"></i>Criar Nova Pesquisa
                </Link>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="border-b-2 border-slate-200">
                            <tr>
                                <th className="p-4 text-left text-xs font-semibold text-slate-500 uppercase">Nome da Pesquisa</th>
                                <th className="p-4 text-left text-xs font-semibold text-slate-500 uppercase">Nº de Perguntas</th>
                                <th className="p-4 text-left text-xs font-semibold text-slate-500 uppercase">Categoria</th>
                                <th className="p-4 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                                <th className="p-4 text-left text-xs font-semibold text-slate-500 uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr><td colSpan={5} className="p-4 text-center"><i className="fas fa-spinner fa-spin"></i> Carregando...</td></tr>
                            ) : surveys.length === 0 ? (
                                <tr><td colSpan={5} className="p-4 text-center">Nenhuma pesquisa ativa encontrada.</td></tr>
                            ) : (
                                surveys.map(survey => {
                                    const questionCount = (survey.pesquisas_perguntas && survey.pesquisas_perguntas[0]?.count) || 0;
                                    const statusColor = survey.status === 'Ativo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';

                                    return (
                                        <tr key={survey.id}>
                                            <td className="p-4 font-medium">{survey.nome}</td>
                                            <td className="p-4">{questionCount}</td>
                                            <td className="p-4">{survey.categoria_pesquisa}</td>
                                            <td className="p-4"><span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor}`}>{survey.status}</span></td>
                                            <td className="p-4 space-x-4">
                                                <Link href={`/pesquisas/editar/${survey.id}`} className="text-blue-600 hover:text-blue-800 font-medium">Editar</Link>
                                                <button onClick={() => handleInactivate(survey.id, survey.nome)} className="text-orange-600 hover:text-orange-800 font-medium">Inativar</button>
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