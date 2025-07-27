/**
 * Sistema de Resultados - Exports Principais
 * 
 * ✅ REFATORADO: Implementa estratégia "Tempo Real + Validação"
 * 
 * Este arquivo centraliza todas as exportações do sistema de resultados,
 * organizando por categorias para facilitar o uso.
 */

// ===== HOOKS PRINCIPAIS (REFATORADOS) =====

// Hook agregador principal (NOVO)
export { useAggregatedResults } from './hooks/useAggregatedResults';

// Hook para aluno individual
export { useStudentAggregatedResults } from './hooks/useStudentAggregatedResults';

// ===== HOOKS DAS ENTIDADES (REFATORADOS) =====

// Entidade Results
export { useResultsData } from './entities/results/useResultsData';
export type { UseResultsDataReturn } from './entities/results/useResultsData';

// Entidade Sessions
export { useSessionsData } from './entities/sessions/useSessionsData';
export type { UseSessionsDataReturn } from './entities/sessions/useSessionsData';

// Entidade Answers
export { useAnswersData } from './entities/answers/useAnswersData';
export type { UseAnswersDataReturn } from './entities/answers/useAnswersData';

// Entidade Test
export { useTestData } from './entities/test/useTestData';
export type { UseTestDataReturn } from './entities/test/useTestData';

// Entidade Questions
export { useQuestionsData } from './entities/questions/useQuestionsData';
export type { UseQuestionsDataReturn } from './entities/questions/useQuestionsData';

// ===== TIPOS PRINCIPAIS =====

// Tipos de completude
export type { 
  CompletionStatus, 
  CompletionStatusLevel,
  CompletionThresholds,
  EvaluationCompletionStats,
  SystemCompletionSummary
} from './types/completion';

// Tipos das entidades
export type {
  TestEntity,
  TestStats
} from './entities/test/types';

export type {
  TestSessionEntity,
  SessionWithStudent,
  SessionStats,
  SessionFilters,
  SessionTimeAnalysis,
  SessionStatus
} from './entities/sessions/types';

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
} from './entities/results/types';

export type {
  StudentAnswerEntity,
  AnswerWithDetails,
  AnswerStats,
  QuestionAnalysis,
  AnswerFilters,
  StudentAnswerSummary,
  AnswerType
} from './entities/answers/types';

export type {
  QuestionEntity,
  QuestionWithDetails,
  QuestionStats,
  QuestionFilters
} from './entities/questions/types';

// ===== UTILITÁRIOS DE VALIDAÇÃO =====

export {
  isEvaluationComplete,
  validateSessionCompletion,
  validateResultCompletion,
  validateAnswersConsistency,
  createCompletionStats,
  filterCompletedResults,
  generateCompletionStatus
} from './utils/completionValidation';

export type {
  CompletionValidationResult,
  SessionCompletionStatus,
  ResultCompletionStatus,
  AnswersCompletionStatus
} from './utils/completionValidation';

// ===== SISTEMA DE CACHE =====

export {
  validatedCache,
  CacheKeys,
  CacheDataType,
  useCacheEntry,
  useStudentResultsWithCache,
  useMultipleStudentsWithCache
} from './cache';

export type {
  CacheEntry,
  CacheConfig,
  CacheIntegrationOptions,
  CachedStudentResults
} from './cache';

// ===== COMPONENTES VISUAIS =====

// Componentes de resultados
export { ResultsTable } from './components/results/ResultsTable';
export type { ResultsTableProps } from './components/results/ResultsTable';

// Componentes principais
export { default as DetailedResultsView } from './DetailedResultsView';
export { default as StudentDetailedResults } from './StudentDetailedResults';

// ===== UTILITÁRIOS GERAIS =====

export {
  formatGrade,
  formatProficiency,
  formatTime,
  formatPercentage,
  getClassificationColor,
  getStatusColor
} from './utils/formatters';

export {
  calculateProficiency,
  getProficiencyLevel,
  getProficiencyTableInfo
} from './utils/proficiency';

// ===== CONSTANTES =====

export {
  DEFAULT_COMPLETION_THRESHOLDS,
  PROFICIENCY_TABLES,
  CLASSIFICATION_LEVELS,
  STATUS_COLORS
} from './constants';

// ===== TIPOS DE USO COMUM =====

// Tipos para uso direto em componentes
export type StudentResult = {
  id: string;
  name: string;
  class: string;
  grade: number;
  proficiency: number;
  classification: string;
  status: 'completed' | 'pending' | 'incomplete';
  completionPercentage: number;
  timeSpent: number;
};

export type EvaluationStats = {
  totalStudents: number;
  completedStudents: number;
  partialStudents: number;
  completionRate: number;
  averageGrade: number;
  averageProficiency: number;
  hasIncompleteStudents: boolean;
};

export type CompletionStatusInfo = {
  total: number;
  completed: number;
  partial: number;
  rate: number;
  message: string;
  recommendations: string[];
};

// ===== FUNÇÕES DE CONVENIÊNCIA =====

/**
 * Função de conveniência para obter dados de uma avaliação
 * com configurações padrão para "Tempo Real + Validação"
 */
export const useEvaluationData = (testId: string, options?: {
  showAll?: boolean;
  autoRefresh?: boolean;
}) => {
  return useAggregatedResults(testId, {
    enablePartialView: options?.showAll || false,
    autoRefresh: options?.autoRefresh || false,
    includePartialInStats: false // Por padrão, não incluir parciais nos cálculos
  });
};

/**
 * Função de conveniência para obter dados de um aluno específico
 * com verificação de completude
 */
export const useStudentData = (testId: string, studentId: string, options?: {
  includeAnswers?: boolean;
  autoLoadDetails?: boolean;
}) => {
  return useStudentAggregatedResults(testId, studentId, {
    includeAnswers: options?.includeAnswers || false,
    autoLoadDetails: options?.autoLoadDetails || true
  });
};

// ===== EXPORTAÇÕES LEGACY (para compatibilidade) =====

// Manter compatibilidade com código existente
export { useResultsData as useEvaluationResults } from './entities/results/useResultsData';
export { useSessionsData as useTestSessions } from './entities/sessions/useSessionsData';
export { useAnswersData as useStudentAnswers } from './entities/answers/useAnswersData';

// ===== DOCUMENTAÇÃO =====

/**
 * 📚 GUIA DE USO RÁPIDO
 * 
 * 1. Para dados agregados de uma avaliação:
 *    const { students, allStudents, completionStatus, stats } = useAggregatedResults(testId);
 * 
 * 2. Para dados de um aluno específico:
 *    const { data, completionLevel, canAnalyze } = useStudentAggregatedResults(testId, studentId);
 * 
 * 3. Para controle de visualização tempo real:
 *    const { showAll, setShowAll, students, allStudents } = useAggregatedResults(testId, {
 *      enablePartialView: true
 *    });
 * 
 * 4. Para validação de completude:
 *    const isComplete = isEvaluationComplete(totalQuestions, answeredQuestions);
 * 
 * 5. Para cache otimizado:
 *    const { data, isFromCache } = useStudentResultsWithCache(testId, studentId);
 */ 