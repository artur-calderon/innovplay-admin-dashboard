/**
 * Types para a entidade Questions
 * Corresponde à tabela: question
 * 
 * Esta tabela contém as questões que fazem parte de uma avaliação
 */

export interface QuestionEntity {
  // Campos principais da tabela question
  id: string;
  number: number;
  text: string;
  formatted_text: string;
  secondstatement: string;
  images: any[];
  subject_id: string;
  ide: string;
  description: string;
  command: string;
  subtitle: string;
  alternatives: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
  }>;
  skill: string;
  grade_level: string;
  education_stage_id: string;
  difficulty_level: string;
  correct_answer: string;
  formatted_solution: string;
  test_id: string;
  question_type: 'multipleChoice' | 'open' | 'trueFalse';
  value: number;
  topics: any[];
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_modified_by: string;
}

// Tipos auxiliares para Questions
export interface QuestionWithSkills extends QuestionEntity {
  skills: string[]; // Códigos das habilidades associadas
  difficulty: 'Fácil' | 'Médio' | 'Difícil';
  solution: string;
  subject: {
    id: string;
    name: string;
  };
  grade: {
    id: string;
    name: string;
  };
}

export interface QuestionStats {
  totalQuestions: number;
  byDifficulty: {
    facil: number;
    medio: number;
    dificil: number;
  };
  byType: {
    multipleChoice: number;
    open: number;
    trueFalse: number;
  };
  bySubject: Record<string, number>;
}

export interface QuestionFilters {
  subject?: string;
  difficulty?: string;
  questionType?: string;
  skill?: string;
}

export type QuestionType = 'multipleChoice' | 'open' | 'trueFalse';
export type DifficultyLevel = 'Fácil' | 'Médio' | 'Difícil'; 