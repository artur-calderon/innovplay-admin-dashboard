import { api } from '@/lib/api';
import type {
  Competition,
  CompetitionFilters,
  CreateCompetitionFormData,
  UpdateCompetitionFormData,
} from '@/types/competition-types';

/**
 * Serviço de API para Competições.
 * GET /competitions — retorna array direto (não { competitions: [...] })
 */

export async function getCompetitions(
  filters: Partial<CompetitionFilters>
): Promise<Competition[]> {
  const params: Record<string, string> = {};
  if (filters.status && filters.status !== 'all') params.status = filters.status;
  if (filters.subject_id && filters.subject_id !== 'all') params.subject_id = filters.subject_id;
  if (filters.level && filters.level !== 'all') params.level = filters.level;

  const { data } = await api.get<Competition[]>('/competitions', { params });
  return Array.isArray(data) ? data : [];
}

export async function getCompetition(id: string): Promise<Competition> {
  const { data } = await api.get<Competition>(`/competitions/${id}`);
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
  return data;
}

export async function cancelCompetition(id: string): Promise<Competition> {
  const { data } = await api.post<Competition>(`/competitions/${id}/cancel`);
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
