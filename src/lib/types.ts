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

export interface ScoreBreakdown {
  quente?: number;
  quente_morno?: number;
  morno?: number;
  morno_frio?: number;
  frio?: number;
}

// Definição de uma única resposta dentro do breakdown
export type AnswerWithScores = {
  answer_text: string;
  scores: {
    score_category: ScoreCategory;
    count: number;
  }[];
};

// Definição principal para os dados de uma pergunta
export type QuestionBreakdownData = {
  question_id: string;
  question_text: string;
  answers: AnswerWithScores[];
};

export interface ScoreProfileAnswer {
  answer_text: string;
  lead_count: number;
}

export interface ScoreProfileQuestion {
  question_id: string;
  question_text: string;
  answers: ScoreProfileAnswer[];
}

// ================== TIPO ADICIONADO AQUI ==================
export type Survey = {
    id: string;
    nome: string;
};

export type ScoreCategory = 'quente' | 'quente_morno' | 'morno' | 'morno_frio' | 'frio';
// =========================================================