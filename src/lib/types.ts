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

// Adicione estes tipos ao seu ficheiro src/lib/types.ts

export interface ScoreBreakdown {
  quente?: number;
  quente_morno?: number;
  morno?: number;
  morno_frio?: number;
  frio?: number;
}

export interface AnswerBreakdownData {
  answer_text: string;
  total_leads: number;
  score_breakdown: ScoreBreakdown;
}

export interface QuestionBreakdownData {
  question_id: string;
  question_text: string;
  answers: AnswerBreakdownData[];
}

// Adicione estes tipos ao seu ficheiro src/lib/types.ts

export interface ScoreProfileAnswer {
  answer_text: string;
  lead_count: number;
}

export interface ScoreProfileQuestion {
  question_id: string;
  question_text: string;
  answers: ScoreProfileAnswer[];
}