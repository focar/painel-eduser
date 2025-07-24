// COPIE E COLE EM: src/components/dashboard/QuestionAnalysisCard.tsx

import { QuestionAnalysisData } from "@/lib/types";

interface QuestionAnalysisCardProps {
  questionData: QuestionAnalysisData;
}

export default function QuestionAnalysisCard({ questionData }: QuestionAnalysisCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
        {questionData.question_text}
      </h3>
      <div className="space-y-3">
        {questionData.answers && questionData.answers.length > 0 ? (
          questionData.answers.map((answer) => (
            <div key={answer.answer_text} className="flex justify-between items-center text-sm">
              <span className="text-gray-700 dark:text-gray-300">{answer.answer_text}</span>
              <span className="font-bold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded-full">
                {answer.lead_count}
              </span>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
            Nenhuma resposta encontrada para esta pergunta.
          </p>
        )}
      </div>
    </div>
  );
}