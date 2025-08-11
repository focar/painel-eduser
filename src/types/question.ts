// src/types/question.ts
// Este arquivo define a estrutura de dados para uma "Pergunta".

export type Question = {
  // O ID é opcional porque uma nova pergunta ainda não tem ID.
  id?: string; 
  created_at: string;
  modified_at: string;
  texto: string;
  tipo: string;
  classe: string;
  opcoes: { 
    texto: string; 
    peso: number; 
  }[];
};
