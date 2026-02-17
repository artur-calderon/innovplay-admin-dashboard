import { api } from '@/lib/api';
import type {
  Competition,
  CompetitionLevel,
  CompetitionScope,
  RewardConfig,
} from '@/types/competition-types';

export type CompetitionTemplateRecurrence = 'weekly' | 'biweekly' | 'monthly';

export interface CompetitionTemplate {
  id: string;
  name: string;
  subject_id: string;
  subject_name?: string;
  level: CompetitionLevel;
  recurrence: CompetitionTemplateRecurrence;
  /** Para estes torneios, backend usará escopo global */
  scope: CompetitionScope | 'global';
  /** Modo de seleção de questões; inicialmente fixo em auto_random */
  question_mode?: string;
  /** Configuração opcional de recompensas; se vazio, backend usa padrão */
  reward_config?: RewardConfig | null;
  /** Indica se o template está ativo para gerar novas edições */
  active: boolean;
  /** Lista de competições já geradas a partir deste template */
  competitions?: (Competition & { edition_number?: number })[];
  created_at?: string;
  updated_at?: string;
}

export interface CompetitionTemplateFilters {
  active?: boolean;
}

export type CreateCompetitionTemplatePayload = Omit<
  CompetitionTemplate,
  'id' | 'competitions' | 'created_at' | 'updated_at'
>;

export type UpdateCompetitionTemplatePayload = Partial<CreateCompetitionTemplatePayload>;

/** Lista de templates de competições. GET /competition-templates */
export async function getCompetitionTemplates(
  filters?: CompetitionTemplateFilters,
): Promise<CompetitionTemplate[]> {
  const params: Record<string, string | number | boolean> = {};
  if (typeof filters?.active === 'boolean') {
    params.active = filters.active;
  }

  const { data } = await api.get<CompetitionTemplate[]>('/competition-templates', {
    params: Object.keys(params).length ? params : undefined,
  });

  return Array.isArray(data) ? data : [];
}

/** Detalhes de um template específico. GET /competition-templates/:id */
export async function getCompetitionTemplateById(id: string): Promise<CompetitionTemplate> {
  const { data } = await api.get<CompetitionTemplate>(`/competition-templates/${id}`);
  return data;
}

/** Criar novo template de competição. POST /competition-templates */
export async function createCompetitionTemplate(
  payload: CreateCompetitionTemplatePayload,
): Promise<CompetitionTemplate> {
  const { data } = await api.post<CompetitionTemplate>('/competition-templates', payload);
  return data;
}

/** Atualizar template de competição. PATCH /competition-templates/:id */
export async function updateCompetitionTemplate(
  id: string,
  payload: UpdateCompetitionTemplatePayload,
): Promise<CompetitionTemplate> {
  const { data } = await api.patch<CompetitionTemplate>(`/competition-templates/${id}`, payload);
  return data;
}

/** Ativar template. POST /competition-templates/:id/activate */
export async function activateCompetitionTemplate(id: string): Promise<CompetitionTemplate> {
  const { data } = await api.post<CompetitionTemplate>(`/competition-templates/${id}/activate`);
  return data;
}

/** Desativar template. POST /competition-templates/:id/deactivate */
export async function deactivateCompetitionTemplate(id: string): Promise<CompetitionTemplate> {
  const { data } = await api.post<CompetitionTemplate>(`/competition-templates/${id}/deactivate`);
  return data;
}

