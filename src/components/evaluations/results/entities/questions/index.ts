/**
 * Entidade Questions - Exports
 * Corresponde à tabela: question
 * 
 * Centraliza todas as exportações relacionadas à entidade Questions
 */

// Types
export type {
  QuestionEntity,
  QuestionWithSkills,
  QuestionStats,
  QuestionFilters,
  QuestionType,
  DifficultyLevel
} from './types';

// Hooks
export { useQuestionsData } from './useQuestionsData'; 