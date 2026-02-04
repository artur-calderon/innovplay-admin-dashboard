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

/** Escopo: quem recebe (individual, turma, escola, município). Hoje só persistido; Etapa 3 usará na listagem/inscrição. */
export type CompetitionScope = 'individual' | 'turma' | 'escola' | 'municipio';

/** Filtro de escopo: IDs conforme o tipo de escopo. */
export interface CompetitionScopeFilter {
  class_ids?: string[];
  school_ids?: string[];
  municipality_ids?: string[];
}

export interface Competition {
  id: string;
  name: string;
  subject_id: string;
  subject_name?: string;
  level: number;
  scope?: string;
  scope_filter?: CompetitionScopeFilter | null;
  status: CompetitionStatus;
  enrollment_start?: string;
  enrollment_end?: string;
  application?: string;
  question_mode?: string;
  question_rules?: string;
  reward_participation?: string | number;
  reward_ranking?: string | number;
  reward_config?: Record<string, unknown>;
  ranking_criterion?: string;
  visibility?: string;
  limit?: number;
  created_at?: string;
  updated_at?: string;
  question_ids?: string[];
}

export interface CompetitionFilters {
  status: string;
  subject_id: string;
  level: string;
}

export interface CreateCompetitionFormData {
  name: string;
  subject_id: string;
  level: CompetitionLevel;
  scope?: CompetitionScope | string;
  scope_filter?: CompetitionScopeFilter | null;
  enrollment_start: string;
  enrollment_end: string;
  application: string;
  question_mode?: string;
  question_rules?: string;
  reward_participation?: string | number;
  reward_ranking?: string | number;
  ranking_criterion?: string;
  visibility?: string;
  limit?: number;
}

/** Mesmos campos editáveis do create (só quando status === 'rascunho'). */
export type UpdateCompetitionFormData = Partial<CreateCompetitionFormData>;

/** Resposta do GET /competitions é array direto; não usar wrapper. */
