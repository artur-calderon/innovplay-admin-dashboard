/**
 * Types para a entidade Results
 * Corresponde à tabela: evaluation_results
 * 
 * Esta tabela contém os resultados calculados das avaliações dos alunos
 */

export interface EvaluationResultEntity {
  // Campos principais da tabela evaluation_results
  id: string;
  test_id: string;
  student_id: string;
  session_id: string;
  correct_answers: number;
  total_questions: number;
  answered_questions: number; // ✅ Campo para controle de completude
  score_percentage: number;
  grade: number;
  proficiency: number;
  classification: ClassificationLevel;
  is_complete: boolean; // ✅ Campo para controle de completude
  calculated_at: string;
}

// Tipos auxiliares para Results
export interface ResultWithDetails extends EvaluationResultEntity {
  student_name: string;
  student_class: string;
  test_title: string;
  test_subject: string;
  time_spent: number;
  blank_answers: number;
  completion_percentage: number; // ✅ Porcentagem de completude
  submission_status: ResultStatus;
  last_updated: string;
}

export interface ResultsStats {
  total_results: number;
  complete_results: number; // ✅ Resultados completos
  incomplete_results: number; // ✅ Resultados incompletos
  pending_results: number;
  average_score: number;
  average_proficiency: number;
  completion_rate: number; // ✅ Taxa de completude geral
  average_answered_questions: number; // ✅ Média de questões respondidas
  quality_score: number; // ✅ Pontuação de qualidade baseada na completude
}

export interface ClassificationAnalysis {
  level: ClassificationLevel;
  count: number;
  percentage: number;
  average_score: number;
  average_proficiency: number;
  completion_rate: number; // ✅ Taxa de completude por nível
  quality_indicators: {
    fully_answered: number; // Resultados com todas as questões respondidas
    minimum_threshold_met: number; // Resultados com completude mínima
    high_quality: number; // Resultados de alta qualidade
  };
}

export interface ResultFilters {
  test_id?: string;
  student_id?: string;
  classification?: ClassificationLevel;
  completion_status?: 'complete' | 'incomplete' | 'partial'; // ✅ Filtro por completude
  score_range?: {
    min: number;
    max: number;
  };
  proficiency_range?: {
    min: number;
    max: number;
  };
  answered_questions_range?: { // ✅ Filtro por número de questões respondidas
    min: number;
    max: number;
  };
  completion_percentage_range?: { // ✅ Filtro por porcentagem de completude
    min: number;
    max: number;
  };
  date_range?: {
    start: string;
    end: string;
  };
}

export interface TrendAnalysis {
  period: string;
  total_results: number;
  average_score: number;
  average_proficiency: number;
  completion_rate: number; // ✅ Taxa de completude por período
  quality_trend: 'improving' | 'declining' | 'stable'; // ✅ Tendência da qualidade
  completion_trend: 'improving' | 'declining' | 'stable'; // ✅ Tendência da completude
}

export interface ComparisonData {
  current_period: {
    results: number;
    average_score: number;
    average_proficiency: number;
    completion_rate: number; // ✅ Taxa de completude atual
  };
  previous_period: {
    results: number;
    average_score: number;
    average_proficiency: number;
    completion_rate: number; // ✅ Taxa de completude anterior
  };
  improvement: {
    score_change: number;
    proficiency_change: number;
    completion_change: number; // ✅ Mudança na completude
    quality_change: number; // ✅ Mudança na qualidade
  };
}

// ✅ ENUM para níveis de classificação
export enum ClassificationLevel {
  ABAIXO_DO_BASICO = 'Abaixo do Básico',
  BASICO = 'Básico',
  ADEQUADO = 'Adequado',
  AVANCADO = 'Avançado'
}

// ✅ ENUM para status dos resultados
export enum ResultStatus {
  CALCULATED = 'calculated',
  PENDING_CALCULATION = 'pending_calculation',
  INCOMPLETE = 'incomplete',
  COMPLETE = 'complete',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  NEEDS_CORRECTION = 'needs_correction'
}

// ✅ Interface para controle de completude específico dos resultados
export interface ResultCompletionStatus {
  result_id: string;
  student_id: string;
  test_id: string;
  total_questions: number;
  answered_questions: number;
  completion_percentage: number;
  is_complete: boolean;
  is_fully_answered: boolean; // Todas as questões respondidas
  minimum_completion_met: boolean; // Atingiu completude mínima
  quality_score: number; // 0-100, baseado na completude e consistência
  completion_quality: 'high' | 'medium' | 'low';
  missing_questions: number;
  blank_answers: number;
  can_calculate_proficiency: boolean; // Se há dados suficientes para calcular proficiência
  reliability_score: number; // Confiabilidade do resultado baseada na completude
} 