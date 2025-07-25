// CAMINHO: src/components/dashboard/AnswerBreakdownCard.tsx

import { QuestionBreakdownData } from '@/lib/types';

// ================== INÍCIO DA CORREÇÃO DAS CORES ==================
// Nova paleta de cores de "temperatura" para uma leitura mais intuitiva
const scoreCategories = [
    { key: 'quente', name: 'Quente (>80)', color: 'bg-red-500' },
    { key: 'quente_morno', name: 'Quente-Morno (65-79)', color: 'bg-orange-400' },
    { key: 'morno', name: 'Morno (50-64)', color: 'bg-amber-400' },
    { key: 'morno_frio', name: 'Morno-Frio (35-49)', color: 'bg-sky-400' },
    { key: 'frio', name: 'Frio (<35)', color: 'bg-blue-500' },
] as const;
// ================== FIM DA CORREÇÃO DAS CORES ==================

export default function AnswerBreakdownCard({ questionData }: { questionData: QuestionBreakdownData }) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                {questionData.question_text}
            </h3>
            <div className="space-y-4">
                {questionData.answers.map(answer => (
                    <div key={answer.answer_text}>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{answer.answer_text}</span>
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Total: {answer.total_leads}</span>
                        </div>
                        <div className="w-full flex h-4 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600">
                            {scoreCategories.map(category => {
                                // A lógica para encontrar a categoria correta e calcular a porcentagem
                                const sortedBreakdown = Object.entries(answer.score_breakdown)
                                    .map(([key, value]) => ({ key, value }))
                                    .sort((a, b) => {
                                        const orderA = scoreCategories.findIndex(sc => sc.key === a.key);
                                        const orderB = scoreCategories.findIndex(sc => sc.key === b.key);
                                        return orderA - orderB;
                                    });

                                const count = answer.score_breakdown[category.key as keyof typeof answer.score_breakdown] || 0;
                                if (count === 0) return null;
                                
                                const percentage = (count / answer.total_leads) * 100;
                                
                                return (
                                    <div
                                        key={category.key}
                                        className={`flex items-center justify-center ${category.color}`}
                                        style={{ width: `${percentage}%` }}
                                        title={`${category.name}: ${count} leads`}
                                    >
                                        <span className="text-white text-[10px] font-bold drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]">
                                          {percentage > 10 ? `${Math.round(percentage)}%` : ''}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}