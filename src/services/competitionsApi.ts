import { api } from '@/lib/api';
import type {
  Competition,
  CompetitionFilters,
  CreateCompetitionFormData,
  UpdateCompetitionFormData,
} from '@/types/competition-types';

/** Resposta de GET /competitions/level-options */
export interface CompetitionLevelOptionsResponse {
  levels: { value: number; label: string }[];
}

/**
 * Serviço de API para Competições.
 * GET /competitions — retorna array direto (não { competitions: [...] })
 */

export async function getCompetitionLevelOptions(): Promise<CompetitionLevelOptionsResponse> {
  const { data } = await api.get<CompetitionLevelOptionsResponse>('/competitions/level-options');
  return data ?? { levels: [] };
}

export async function getCompetitions(
  filters: Partial<CompetitionFilters>
): Promise<Competition[]> {
  const params: Record<string, string | number> = {};
  if (filters.status && filters.status !== 'all') params.status = filters.status;
  if (filters.subject_id && filters.subject_id !== 'all') params.subject_id = filters.subject_id;
  if (filters.level && filters.level !== 'all') params.level = filters.level;
  if (filters.from_date) params.from_date = filters.from_date;
  if (filters.to_date) params.to_date = filters.to_date;
  if (filters.page != null) params.page = filters.page;
  if (filters.page_size != null) params.page_size = filters.page_size;

  const { data } = await api.get<Competition[]>('/competitions', { params });
  return Array.isArray(data) ? data : [];
}

/** Lista de competições disponíveis para o aluno (inclui is_enrolled). */
export async function getAvailableCompetitions(): Promise<Competition[]> {
  const { data } = await api.get<Competition[]>('/competitions/available');
  if (process.env.NODE_ENV !== 'production') {
    console.log(
      '[Competitions] Resposta de GET /competitions/available:',
      JSON.stringify(data, null, 2),
    );
  }
  return Array.isArray(data) ? data : [];
}

export async function getCompetition(id: string): Promise<Competition> {
  const { data } = await api.get<Competition>(`/competitions/${id}`);
  return data;
}

export interface EligibleStudent {
  id: string;
  name: string;
  class_id?: string;
  school_id?: string;
  grade_name?: string;
  class_name?: string;
  school_name?: string;
}

/** Lista de alunos elegíveis para uma competição específica. */
export async function getEligibleStudentsForCompetition(
  id: string,
  options?: { class_id?: string; school_id?: string; limit?: number; offset?: number },
): Promise<EligibleStudent[]> {
  const params: Record<string, string | number> = {};
  if (options?.class_id) params.class_id = options.class_id;
  else if (options?.school_id) params.school_id = options.school_id;
  if (typeof options?.limit === 'number') params.limit = options.limit;
  if (typeof options?.offset === 'number') params.offset = options.offset;

  try {
    const { data } = await api.get<EligibleStudent[]>(`/competitions/${id}/eligible-students`, {
      params: Object.keys(params).length ? params : undefined,
    });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      // Não propaga erro bruto para não quebrar a tela; log somente em dev.
      // eslint-disable-next-line no-console
      console.error('[Competitions] Erro em GET /competitions/:id/eligible-students', error);
    }
    throw error;
  }
}

/** Detalhes da competição (mesmo formato de /available, com is_enrolled, available_slots, etc.). */
export async function getCompetitionDetails(id: string): Promise<Competition> {
  const { data } = await api.get<Competition>(`/competitions/${id}/details`);
  return data;
}

export async function createCompetition(
  payload: CreateCompetitionFormData
): Promise<Competition> {
  const { data } = await api.post<Competition>('/competitions', payload);
  return data;
}

export async function updateCompetition(
  id: string,
  payload: UpdateCompetitionFormData
): Promise<Competition> {
  const { data } = await api.put<Competition>(`/competitions/${id}`, payload);
  return data;
}

export async function deleteCompetition(id: string): Promise<void> {
  await api.delete(`/competitions/${id}`);
}

export async function publishCompetition(id: string): Promise<Competition> {
  const { data } = await api.post<Competition>(`/competitions/${id}/publish`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(
      '[Competitions] Resposta de POST /competitions/%s/publish:',
      id,
      JSON.stringify(data, null, 2),
    );
  }
  return data;
}

export async function cancelCompetition(
  id: string,
  body?: { reason?: string }
): Promise<Competition> {
  const { data } = await api.post<Competition>(`/competitions/${id}/cancel`, body ?? {});
  return data;
}

export async function addCompetitionQuestions(
  id: string,
  questionIds: string[]
): Promise<unknown> {
  const { data } = await api.post<unknown>(`/competitions/${id}/questions`, {
    question_ids: questionIds,
  });
  return data;
}

/** Inscrição do estudante na competição. */
export async function enrollCompetition(id: string): Promise<unknown> {
  const { data } = await api.post<unknown>(`/competitions/${id}/enroll`);
  return data;
}

/** Cancelar inscrição do estudante na competição. */
export async function unenrollCompetition(id: string): Promise<unknown> {
  const { data } = await api.delete<unknown>(`/competitions/${id}/unenroll`);
  return data;
}
