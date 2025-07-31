/**
 * Types para Controle de Completude Geral
 * 
 * Interfaces centralizadas para estatísticas e controle de completude
 * em todo o sistema de resultados
 */

import { SessionStatus } from '../entities/sessions/types';
import { ResultStatus, ClassificationLevel } from '../entities/results/types';

// ✅ Interface principal para estatísticas de completude
export interface CompletionStatus {
  // Identificação
  entity_type: 'test' | 'session' | 'answer' | 'result';
  entity_id: string;
  
  // Métricas básicas de completude
  total_items: number;
  completed_items: number;
  pending_items: number;
  incomplete_items: number;
  
  // Porcentagens
  completion_percentage: number;
  quality_percentage: number;
  reliability_percentage: number;
  
  // Status geral
  overall_status: CompletionStatusLevel;
  is_ready_for_analysis: boolean;
  meets_minimum_threshold: boolean;
  
  // Timestamps
  last_updated: string;
  completion_deadline?: string;
  
  // Detalhes específicos
  details: CompletionDetails;
}

// ✅ Níveis de completude
export enum CompletionStatusLevel {
  COMPLETE = 'complete',
  MOSTLY_COMPLETE = 'mostly_complete',
  PARTIALLY_COMPLETE = 'partially_complete',
  INCOMPLETE = 'incomplete',
  NOT_STARTED = 'not_started',
  INVALID = 'invalid'
}

// ✅ Detalhes específicos de completude
export interface CompletionDetails {
  // Questões/Itens
  total_questions?: number;
  answered_questions?: number;
  blank_answers?: number;
  skipped_questions?: number;
  
  // Tempo
  time_spent?: number; // Em minutos
  time_remaining?: number; // Em minutos
  average_time_per_item?: number; // Em segundos
  
  // Qualidade
  consistency_score?: number; // 0-100
  engagement_score?: number; // 0-100
  effort_indicators?: {
    too_fast_answers: number; // Respostas muito rápidas
    pattern_answers: number; // Respostas com padrão suspeito
    random_answers: number; // Respostas aparentemente aleatórias
  };
  
  // Problemas identificados
  issues?: CompletionIssue[];
  warnings?: string[];
  
  // Recomendações
  recommendations?: string[];
}

// ✅ Problemas de completude
export interface CompletionIssue {
  type: 'missing_data' | 'inconsistent_data' | 'low_quality' | 'timeout' | 'technical_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affected_items: string[]; // IDs dos itens afetados
  suggested_action: string;
  auto_fixable: boolean;
}

// ✅ Estatísticas de completude por avaliação
export interface EvaluationCompletionStats {
  test_id: string;
  test_title: string;
  
  // Participação
  total_students: number;
  started_students: number;
  completed_students: number;
  abandoned_students: number;
  
  // Completude das respostas
  total_possible_answers: number; // total_students * total_questions
  actual_answers: number;
  blank_answers: number;
  
  // Qualidade
  high_quality_submissions: number; // Submissões de alta qualidade
  medium_quality_submissions: number;
  low_quality_submissions: number;
  suspicious_submissions: number; // Submissões suspeitas
  
  // Taxas
  participation_rate: number; // % de alunos que iniciaram
  completion_rate: number; // % de alunos que completaram
  answer_completeness_rate: number; // % de respostas fornecidas
  quality_rate: number; // % de submissões de qualidade aceitável
  
  // Tempo
  average_completion_time: number; // Em minutos
  median_completion_time: number;
  time_distribution: {
    very_fast: number; // < 25% do tempo esperado
    fast: number; // 25-50% do tempo esperado
    normal: number; // 50-150% do tempo esperado
    slow: number; // > 150% do tempo esperado
  };
  
  // Status por classificação
  completion_by_level: Record<ClassificationLevel, {
    completed: number;
    abandoned: number;
    completion_rate: number;
    average_quality: number;
  }>;
  
  // Últimas atualizações
  last_calculated: string;
  data_freshness: 'real_time' | 'recent' | 'stale' | 'outdated';
}

// ✅ Resumo de completude do sistema
export interface SystemCompletionSummary {
  // Totais gerais
  total_evaluations: number;
  total_sessions: number;
  total_students: number;
  total_answers: number;
  
  // Status das avaliações
  evaluations_by_status: Record<string, number>;
  sessions_by_status: Record<SessionStatus, number>;
  results_by_status: Record<ResultStatus, number>;
  
  // Completude geral
  overall_completion_rate: number;
  overall_quality_score: number;
  data_integrity_score: number; // 0-100
  
  // Alertas e problemas
  active_issues: CompletionIssue[];
  pending_corrections: number;
  data_quality_alerts: number;
  
  // Recomendações do sistema
  system_health: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    category: 'data_quality' | 'performance' | 'completion' | 'integrity';
    message: string;
    action_required: boolean;
  }>;
  
  // Métricas de desempenho
  processing_performance: {
    average_calculation_time: number; // Em segundos
    data_freshness_score: number; // 0-100
    system_load: 'low' | 'medium' | 'high' | 'overloaded';
  };
  
  // Timestamps
  generated_at: string;
  next_update_scheduled: string;
}

// ✅ Configurações de completude
export interface CompletionThresholds {
  // Thresholds mínimos
  minimum_completion_percentage: number; // Ex: 80%
  minimum_quality_score: number; // Ex: 70
  minimum_answers_for_analysis: number; // Ex: 10 questões
  
  // Thresholds de qualidade
  high_quality_threshold: number; // Ex: 90%
  medium_quality_threshold: number; // Ex: 70%
  suspicious_activity_threshold: number; // Ex: 20%
  
  // Thresholds de tempo
  minimum_time_per_question: number; // Em segundos
  maximum_time_per_question: number; // Em segundos
  total_time_warning_threshold: number; // Em minutos
  
  // Configurações por contexto
  context_specific: {
    grade_adjustments: Record<string, number>; // Ajustes por série
    subject_adjustments: Record<string, number>; // Ajustes por disciplina
    special_needs_adjustments: Record<string, number>; // Ajustes para necessidades especiais
  };
} 