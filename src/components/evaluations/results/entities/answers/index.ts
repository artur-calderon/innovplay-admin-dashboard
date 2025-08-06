/**
 * Entidade Answers - Exports
 * Corresponde à tabela: student_answers
 * 
 * Centraliza todas as exportações relacionadas à entidade Answers
 */

// Types
export type {
  StudentAnswerEntity,
  AnswerWithDetails,
  AnswerStats,
  QuestionAnalysis,
  AnswerFilters,
  StudentAnswerSummary,
  AnswerType
} from './types';

// Hooks
export { useAnswersData } from './useAnswersData'; 