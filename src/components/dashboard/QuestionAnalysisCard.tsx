// CAMINHO: src/components/dashboard/QuestionAnalysisCard.tsx

import type { QuestionAnalysisData } from "@/lib/types";

type Props = {
  questionData: QuestionAnalysisData;
};

export default function QuestionAnalysisCard({ questionData }: Props) {
  // CORREÇÃO AQUI: Usa 'answer.lead_count'
  const totalRespostas = questionData.answers.reduce(
    (sum, answer) => sum + answer.lead_count,
    0
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 flex flex-col">
      <h3 className="text-md font-bold text-slate-800 dark:text-slate-100 mb-4 truncate">
        {questionData.question_text}
      </h3>
      
      <ul className="space-y-3 flex-grow">
        {/* CORREÇÃO AQUI: Usa 'b.lead_count' e 'a.lead_count' para ordenar */}
        {questionData.answers
          .sort((a, b) => b.lead_count - a.lead_count)
          .map((answer) => {
            // CORREÇÃO AQUI: Usa 'answer.lead_count' para o cálculo
            const percentual =
              totalRespostas > 0
                ? (answer.lead_count / totalRespostas) * 100
                : 0;

            return (
              <li key={answer.answer_text}>
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="text-slate-600 dark:text-slate-300 truncate pr-2">
                    {answer.answer_text}
                  </span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {/* CORREÇÃO AQUI: Exibe 'answer.lead_count' */}
                    {answer.lead_count}
                    <span className="text-slate-400 dark:text-slate-500 ml-2">
                      ({percentual.toFixed(1)}%)
                    </span>
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${percentual}%` }}
                  ></div>
                </div>
              </li>
            );
          })}
      </ul>
    </div>
  );
}