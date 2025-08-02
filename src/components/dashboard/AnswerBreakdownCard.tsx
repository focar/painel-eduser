// CAMINHO: src/components/dashboard/AnswerBreakdownCard.tsx
'use client';

import { useMemo } from 'react';
import { QuestionBreakdownData, ScoreCategory } from '@/lib/types';

// Define a ordem e as cores para cada categoria de score
const scoreCategories: { key: ScoreCategory; label: string; color: string }[] = [
    { key: 'quente', label: 'Quente', color: 'bg-red-500' },
    { key: 'quente_morno', label: 'Quente/Morno', color: 'bg-orange-500' },
    { key: 'morno', label: 'Morno', color: 'bg-yellow-500' },
    { key: 'morno_frio', label: 'Morno/Frio', color: 'bg-blue-400' },
    { key: 'frio', label: 'Frio', color: 'bg-blue-600' },
];

const AnswerBreakdownCard = ({ questionData }: { questionData: QuestionBreakdownData }) => {
    // Memoiza o total de respostas para evitar recálculos desnecessários
    const totalResponses = useMemo(() => {
        if (!questionData.answers) return 0;
        return questionData.answers.reduce((total, answer) => {
            if (!answer.scores) return total;
            const answerTotal = answer.scores.reduce((sum, score) => sum + score.count, 0);
            return total + answerTotal;
        }, 0);
    }, [questionData.answers]);

    // Não renderiza o card se não houver dados válidos
    if (!totalResponses || totalResponses === 0) {
        return (
             <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="font-bold text-slate-800 mb-4">{questionData.question_text}</h3>
                <p className="text-slate-500 text-sm">Nenhuma resposta encontrada para esta pergunta nos filtros selecionados.</p>
            </div>
        )
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="font-bold text-slate-800 mb-4">{questionData.question_text}</h3>
            <ul className="space-y-4">
                {questionData.answers?.map((answer, index) => {
                    // Calcula o total de respostas para esta resposta específica
                    const answerTotal = answer.scores?.reduce((sum, score) => sum + score.count, 0) || 0;
                    if (answerTotal === 0) return null; // Não mostra respostas sem contagem

                    const percentageOfTotal = (answerTotal / totalResponses) * 100;

                    return (
                        <li key={index} className="border-t border-slate-100 pt-4 first:border-t-0 first:pt-0">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-slate-600 font-medium">{answer.answer_text}</span>
                                <span className="text-slate-800 font-bold">
                                    {answerTotal.toLocaleString('pt-BR')} ({percentageOfTotal.toFixed(1)}%)
                                </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-5 flex overflow-hidden">
                                {scoreCategories.map(category => {
                                    const scoreInfo = answer.scores?.find(s => s.score_category === category.key);
                                    const scoreCount = scoreInfo?.count || 0;
                                    const widthPercentage = answerTotal > 0 ? (scoreCount / answerTotal) * 100 : 0;

                                    if (widthPercentage === 0) return null;

                                    return (
                                        <div
                                            key={category.key}
                                            className={`${category.color} h-full transition-all duration-500`}
                                            style={{ width: `${widthPercentage}%` }}
                                            title={`${category.label}: ${scoreCount}`}
                                        />
                                    );
                                })}
                            </div>
                        </li>
                    );
                })}
            </ul>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
                {scoreCategories.map(category => (
                    <div key={category.key} className="flex items-center text-xs">
                        <span className={`w-3 h-3 rounded-sm mr-2 ${category.color}`}></span>
                        <span className="text-slate-600">{category.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AnswerBreakdownCard;
