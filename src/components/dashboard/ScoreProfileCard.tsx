// CAMINHO: src/components/dashboard/ScoreProfileCard.tsx

import { ScoreProfileQuestion } from '@/lib/types';

export default function ScoreProfileCard({ questionData }: { questionData: ScoreProfileQuestion }) {
    // Se não houver respostas, não precisa calcular o total
    if (!questionData.answers || questionData.answers.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 h-full">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 truncate" title={questionData.question_text}>
                    {questionData.question_text}
                </h3>
                <p className="text-sm text-slate-500">Nenhuma resposta encontrada para este perfil.</p>
            </div>
        );
    }
    
    // Calcula o total apenas das respostas que serão exibidas
    const totalAnswers = questionData.answers.reduce((sum, answer) => sum + answer.lead_count, 0);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 h-full flex flex-col">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 truncate" title={questionData.question_text}>
                {questionData.question_text}
            </h3>
            
            {/* ================== INÍCIO DA CORREÇÃO ================== */}
            {/* Adicionado um container com altura máxima e scroll automático */}
            <div className="flex-1 space-y-3 overflow-y-auto pr-2">
                {/* Removido o limite de TOP 5, agora mostra todas as respostas */}
                {questionData.answers.map(answer => (
                    <div key={answer.answer_text} className="space-y-1">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600 dark:text-gray-300 truncate" title={answer.answer_text}>
                                {answer.answer_text}
                            </span>
                            <span className="font-semibold text-gray-800 dark:text-gray-200">
                                {answer.lead_count}
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                            <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ width: `${(answer.lead_count / totalAnswers) * 100}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
            {/* =================== FIM DA CORREÇÃO ==================== */}
        </div>
    );
}