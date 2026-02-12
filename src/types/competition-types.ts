/**
 * Tipos para Competições (CRUD Admin).
 * Backend pode usar status em português: 'rascunho', 'aberta', etc.
 *
 * Níveis: 1 = Ed. Infantil, Anos Iniciais, EJA, Ed. Especial | 2 = Anos Finais, Ensino Médio
 * Escopo: define quem pode ver/inscrever (lógica aplicada na Etapa 3).
 */

export type CompetitionStatus =
  | 'draft'
  | 'rascunho'
  | 'scheduled'
  | 'aberta'
  | 'enrollment_open'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'cancelada';

/** Nível da competição: 1 ou 2 (validado no backend). */
export type CompetitionLevel = 1 | 2;

/** Opção de nível retornada por GET /competitions/level-options */
export interface CompetitionLevelOption {
  value: number;
  label: string;
}

/** reward_config na API: participation_coins e ranking_rewards. */
export interface RewardConfig {
  participation_coins?: number;
  ranking_rewards?: { position: number; coins: number }[];
}

/** Escopo: quem recebe (individual, turma, série, escola, estado, município). Etapa 3 usará na listagem/inscrição. */
export type CompetitionScope = 'individual' | 'turma' | 'serie' | 'escola' | 'estado' | 'municipio';

/** Filtro de escopo: IDs conforme o tipo de escopo (enviado na criação/edição da competição). */
export interface CompetitionScopeFilter {
  class_ids?: string[];
  school_ids?: string[];
  municipality_ids?: string[];
  grade_ids?: string[];
  state_ids?: string[];
}

/**
 * Regras de sorteio de questões (question_mode === 'auto_random').
 * Alinhado ao question_rules_validator e QuestionSelectionService no backend.
 */
/** Backend exige difficulty_filter como objeto JSON (ex.: { levels: string[] }). */
export interface QuestionRulesPayload {
  num_questions?: number;
  grade_filter?: { grade_ids?: string[] };
  grade_ids?: string[]; // legado
  difficulty_filter?: { levels?: string[] };
  difficulty_level?: string; // legado
  tags_filter?: string[];
  random_seed?: number;
  strategy?: string;
  allow_repeat?: boolean;
}

export interface Competition {
  id: string;
  name: string;
  description?: string;
  test_id?: string;
  subject_id: string;
  subject_name?: string;
  level: number;
  scope?: string;
  scope_filter?: CompetitionScopeFilter | null;
  status: CompetitionStatus;
  enrollment_start?: string;
  enrollment_end?: string;
  application?: string;
  expiration?: string;
  timezone?: string;
  question_mode?: string;
  /** Backend retorna objeto; no form usamos string (JSON). */
  question_rules?: string | Record<string, unknown>;
  reward_participation?: string | number;
  reward_ranking?: string | number;
  reward_config?: RewardConfig;
  ranking_criteria?: string;
  ranking_criterion?: string;
  ranking_tiebreaker?: string;
  ranking_visibility?: string;
  max_participants?: number | null;
  recurrence?: string;
  template_id?: string | null;
  visibility?: string;
  limit?: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  /** IDs de questões associadas diretamente à competição (modo manual ou legado). */
  question_ids?: string[];
  /** IDs de questões sorteadas a partir de test_id (modo auto_random). */
  selected_question_ids?: string[];
  enrolled_count?: number;
  available_slots?: number;
  is_enrollment_open?: boolean;
  is_application_open?: boolean;
  is_finished?: boolean;
  /** Presente em GET /competitions/available e GET /competitions/:id/details */
  is_enrolled?: boolean;
  /** Status da prova do aluno: not_started | in_progress | completed (opcional no backend). Backend pode enviar 'finalizada' ou 'concluída'. */
  attempt_status?: 'not_started' | 'in_progress' | 'completed' | 'finalizada' | 'finalizado' | 'concluída' | 'concluido';
  /** Data/hora em que o aluno iniciou a prova (para tempo decorrido). */
  attempt_started_at?: string;
  /** Data/hora em que o aluno finalizou a prova. Se presente, considera prova concluída mesmo sem attempt_status. */
  attempt_completed_at?: string;
}

export interface CompetitionFilters {
  status: string;
  subject_id: string;
  level: string;
  from_date?: string | null;
  to_date?: string | null;
  page?: number;
  page_size?: number;
}

export interface CreateCompetitionFormData {
  name: string;
  subject_id: string;
  level: CompetitionLevel;
  scope?: CompetitionScope | string;
  scope_filter?: CompetitionScopeFilter | null;
  enrollment_start: string;
  enrollment_end: string;
  application?: string;
  expiration?: string;
  question_mode?: string;
  question_rules?: string;
  reward_participation?: string | number;
  reward_ranking?: string | number;
  /** Enviado no payload; preenchido a partir de reward_participation e reward_ranking no submit. */
  reward_config?: RewardConfig;
  ranking_criterion?: string;
  visibility?: string;
  limit?: number;
}

/** Mesmos campos editáveis do create (só quando status === 'rascunho'). */
export type UpdateCompetitionFormData = Partial<CreateCompetitionFormData>;

/** Resposta do GET /competitions é array direto; não usar wrapper. */
