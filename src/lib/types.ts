// src/lib/types.ts

// =================================================================
// Tipos Gerais e de Entidades Principais
// =================================================================

/**
 * Representa um Lançamento, usado nos seletores de dashboard.
 * A versão com status específico é mantida por ser mais segura que uma string genérica.
 */
export type Launch = {
  id: string;
  nome: string;
  status: 'Em Andamento' | 'Concluído';
};

/**
 * Representa uma Pesquisa.
 */
export type Survey = {
    id: string;
    nome: string;
};

/**
 * Representa uma Pergunta, usada nos formulários de pesquisa.
 */
export type Question = {
  id: string;
  texto: string;
  tipo_pergunta: 'texto_curto' | 'texto_longo' | 'multipla_escolha' | 'escala';
};


// =================================================================
// Tipos para Análise de Score e Perfis
// =================================================================

/**
 * Categorias de score de lead.
 */
export type ScoreCategory = 'quente' | 'quente_morno' | 'morno' | 'morno_frio' | 'frio';

/**
 * Contagem de leads por categoria de score.
 */
export interface ScoreBreakdown {
  quente?: number;
  quente_morno?: number;
  morno?: number;
  morno_frio?: number;
  frio?: number;
}

/**
 * Representa uma resposta com a contagem de leads para cada categoria de score.
 */
export type AnswerWithScores = {
  answer_text: string;
  scores: {
    score_category: ScoreCategory;
    count: number;
  }[];
};

/**
 * Estrutura completa para a análise de breakdown de uma pergunta.
 */
export type QuestionBreakdownData = {
  question_id: string;
  question_text: string;
  answers: AnswerWithScores[];
};

/**
 * Representa uma resposta dentro da análise de perfil de score.
 */
export interface ScoreProfileAnswer {
  answer_text: string;
  lead_count: number;
}

/**
 * Estrutura para uma pergunta dentro da análise de perfil de score.
 */
export interface ScoreProfileQuestion {
  question_id: string;
  question_text: string;
  answers: ScoreProfileAnswer[];
}


// =================================================================
// Tipos para Análise de Respostas de Pesquisa
// =================================================================

/**
 * Representa uma resposta e a contagem de leads associada.
 */
export interface AnswerData {
  answer_text: string;
  lead_count: number;
}

/**
 * Estrutura para os dados de análise de uma única pergunta.
 */
export interface QuestionAnalysisData {
  question_id: string;
  question_text: string;
  answers: AnswerData[];
}
