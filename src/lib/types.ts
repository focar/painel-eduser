// COPIE E COLE EM: src/lib/types.ts

export interface AnswerData {
  answer_text: string;
  lead_count: number;
}

export interface QuestionAnalysisData {
  question_id: string;
  question_text: string;
  answers: AnswerData[];
}

export interface Launch {
  id: string;
  nome: string;
  status: string;
}