/**
 * Entidade Results - Exports
 * Corresponde à tabela: evaluation_results
 * 
 * Centraliza todas as exportações relacionadas à entidade Results
 */

// Types
export type {
  EvaluationResultEntity,
  ResultWithDetails,
  ResultsStats,
  ClassificationAnalysis,
  ResultFilters,
  TrendAnalysis,
  ComparisonData,
  ClassificationLevel,
  ResultStatus
} from './types';

// Hooks
export { useResultsData } from './useResultsData'; 