/**
 * Types para a entidade Sessions
 * Corresponde à tabela: test_sessions
 * 
 * Esta tabela contém as sessões/tentativas dos alunos em uma avaliação
 */

export interface TestSessionEntity {
  // Campos principais da tabela test_sessions
  id: string;
  student_id: string;
  test_id: string;
  started_at: string;
  submitted_at: string;
  time_limit_minutes: number;
  status: SessionStatus; // ✅ Campo para controle de completude
  total_questions: number;
  answered_questions: number; // ✅ Campo para controle de completude
  correct_answers: number;
  score: number;
  grade: number;
  feedback: string;
  corrected_by: string;
  corrected_at: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  updated_at: string;
}

// Tipos auxiliares para Sessions
export interface SessionWithStudent extends TestSessionEntity {
  student_name: string;
  student_class: string;
  student_school: string;
  time_spent_minutes: number;
  completion_percentage: number; // ✅ Porcentagem de completude
}

export interface SessionStats {
  total_sessions: number;
  completed_sessions: number;
  pending_sessions: number;
  abandoned_sessions: number;
  average_completion_time: number;
  average_score: number;
  completion_rate: number; // ✅ Taxa de completude geral
  average_answered_questions: number; // ✅ Média de questões respondidas
}

export interface SessionFilters {
  student_id?: string;
  test_id?: string;
  status?: SessionStatus;
  date_range?: {
    start: string;
    end: string;
  };
  score_range?: {
    min: number;
    max: number;
  };
  completion_threshold?: number; // ✅ Filtro por nível de completude
}

export interface SessionTimeAnalysis {
  average_time_per_question: number;
  total_time_spent: number;
  time_distribution: {
    fast: number; // < 30 segundos por questão
    normal: number; // 30-120 segundos por questão
    slow: number; // > 120 segundos por questão
  };
  completion_timeline: Array<{
    time_interval: string;
    questions_answered: number;
  }>;
}

// ✅ ENUM para status das sessões
export enum SessionStatus {
  STARTED = 'started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SUBMITTED = 'submitted',
  ABANDONED = 'abandoned',
  TIMED_OUT = 'timed_out',
  PENDING_CORRECTION = 'pending_correction',
  CORRECTED = 'corrected'
}

// ✅ Interface para controle de completude específico das sessões
export interface SessionCompletionStatus {
  session_id: string;
  total_questions: number;
  answered_questions: number;
  completion_percentage: number;
  is_complete: boolean;
  is_fully_answered: boolean; // Todas as questões respondidas
  time_remaining: number; // Em minutos
  can_submit: boolean;
  minimum_completion_met: boolean; // Atingiu completude mínima (ex: 80%)
} 