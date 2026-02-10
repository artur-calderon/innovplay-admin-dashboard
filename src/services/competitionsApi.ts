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

/** Resposta de GET /competitions/allowed-scopes (escopos permitidos para o usuário logado). */
export interface AllowedCompetitionScopesResponse {
  allowed_scopes: string[];
}

/**
 * Serviço de API para Competições.
 * GET /competitions — retorna array direto (não { competitions: [...] })
 */

export async function getCompetitionLevelOptions(): Promise<CompetitionLevelOptionsResponse> {
  const { data } = await api.get<CompetitionLevelOptionsResponse>('/competitions/level-options');
  return data ?? { levels: [] };
}

/** Escopos de competição que o usuário logado pode usar (por role: admin, tec adm, diretor, coordenador, professor). */
export async function getAllowedCompetitionScopes(): Promise<string[]> {
  try {
    const { data } = await api.get<AllowedCompetitionScopesResponse>('/competitions/allowed-scopes');
    return Array.isArray(data?.allowed_scopes) ? data.allowed_scopes : ['individual'];
  } catch {
    return ['individual'];
  }
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

/** Aluno inscrito na competição (resposta de GET /competitions/:id/enrolled-students). */
export interface EnrolledStudent {
  id: string;
  name: string;
  class_id?: string;
  school_id?: string;
  grade_name?: string;
  class_name?: string;
  school_name?: string;
  enrolled_at?: string;
}

/** Lista de alunos inscritos na competição. Se o endpoint não existir (404) ou houver CORS/rede, retorna [] sem lançar. */
export async function getEnrolledStudentsForCompetition(
  id: string,
  options?: { limit?: number; offset?: number },
): Promise<EnrolledStudent[]> {
  const params: Record<string, number> = {};
  if (typeof options?.limit === 'number') params.limit = options.limit;
  if (typeof options?.offset === 'number') params.offset = options.offset;
  try {
    const { data } = await api.get<EnrolledStudent[]>(`/competitions/${id}/enrolled-students`, {
      params: Object.keys(params).length ? params : undefined,
    });
    return Array.isArray(data) ? data : [];
  } catch (error: unknown) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    const is404 = status === 404;
    const isNetworkOrCors = !(error as { response?: unknown }).response;
    if (is404 || isNetworkOrCors) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('[Competitions] GET /competitions/:id/enrolled-students indisponível (404 ou CORS), retornando lista vazia.');
      }
      return [];
    }
    throw error;
  }
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

/** Resposta de POST /competitions/:id/start — inicia a prova da competição para o aluno. */
export interface StartCompetitionResponse {
  test_id: string;
  session_id?: string;
  message?: string;
}

/** Resposta alternativa quando a sessão já foi iniciada (backend retorna test_session). */
interface StartCompetitionRawResponse {
  test_id?: string;
  message?: string;
  test_session?: {
    test_id?: string;
    id?: string;
    status?: string;
    started_at?: string;
    [key: string]: unknown;
  };
}

/** Iniciar prova da competição (aluno). Chama POST /competitions/:id/start e retorna test_id para redirecionar. */
export async function startCompetition(id: string): Promise<StartCompetitionResponse> {
  const { data } = await api.post<StartCompetitionRawResponse>(`/competitions/${id}/start`);
  const testId = data.test_id ?? data.test_session?.test_id;
  if (!testId) {
    throw new Error(data.message ?? 'Não foi possível obter a prova.');
  }
  return {
    test_id: testId,
    session_id: data.test_session?.id,
    message: data.message,
  };
}

/** Entrada do ranking da competição (GET /competitions/:id/ranking). */
export interface CompetitionRankingEntry {
  student_id: string;
  name: string;
  class_name?: string;
  school_name?: string;
  position: number;
  value: number; // nota, acertos ou tempo conforme ranking_criterion
  value_label?: string; // ex: "85%", "42 acertos", "15 min"
  coins_earned?: number;
  avatar_url?: string;
  /** Campos opcionais do backend (ranking oficial encerrado) */
  grade?: number | string;
  proficiency?: number | string;
  correct_answers?: number;
  total_questions?: number;
  score_percentage?: number;
  tempo_gasto?: number;
}

/** Formato alternativo do backend: array "ranking" com nomes em snake_case */
export interface CompetitionRankingBackendItem {
  position: number;
  student_id: string;
  student_name?: string;
  class_name?: string;
  school_name?: string;
  grade?: number | string;
  proficiency?: number | string;
  correct_answers?: number;
  total_questions?: number;
  moedas_ganhas?: number;
  score_percentage?: number;
  tempo_gasto?: number;
  [key: string]: unknown;
}

/** Resposta de GET /competitions/:id/ranking (backend pode enviar "ranking" ou "entries") */
export interface CompetitionRankingResponse {
  entries: CompetitionRankingEntry[];
  total: number;
  page?: number;
  page_size?: number;
  my_position?: number;
  my_coins_earned?: number;
}

/** Parâmetros para GET /competitions/:id/ranking */
export interface CompetitionRankingParams {
  limit?: number;
  page?: number;
  page_size?: number;
  class_id?: string;
  school_id?: string;
}

function mapBackendRankingToEntry(item: CompetitionRankingBackendItem, index: number): CompetitionRankingEntry {
  const position = item.position ?? index + 1;
  const value = typeof item.score_percentage === 'number' ? item.score_percentage
    : typeof item.grade === 'number' ? item.grade
    : (item.correct_answers ?? 0);
  const totalQ = item.total_questions;
  const valueLabel = typeof item.score_percentage === 'number'
    ? `${item.score_percentage}%`
    : item.total_questions != null && item.correct_answers != null
      ? `${item.correct_answers}/${item.total_questions} acertos`
      : undefined;
  return {
    student_id: item.student_id ?? '',
    name: (item.student_name as string) ?? '',
    class_name: item.class_name,
    school_name: item.school_name,
    position,
    value,
    value_label: valueLabel,
    coins_earned: item.moedas_ganhas,
    grade: item.grade,
    proficiency: item.proficiency,
    correct_answers: item.correct_answers,
    total_questions: totalQ,
    score_percentage: item.score_percentage,
    tempo_gasto: item.tempo_gasto,
  };
}

/** Buscar ranking da competição. Quando ranking_visibility === 'final' e competição não encerrada, o backend retorna 403. */
export async function getCompetitionRanking(
  id: string,
  params?: CompetitionRankingParams
): Promise<CompetitionRankingResponse> {
  const requestParams: Record<string, number | string | undefined> = { ...params } as Record<string, number | string | undefined>;
  if (requestParams.limit != null && requestParams.page_size == null) {
    requestParams.limit = requestParams.limit;
  }
  const { data } = await api.get<CompetitionRankingResponse & { ranking?: CompetitionRankingBackendItem[] }>(
    `/competitions/${id}/ranking`,
    { params: requestParams ?? undefined }
  );
  if (Array.isArray(data.ranking) && data.ranking.length >= 0) {
    const entries = data.ranking
      .map((item, i) => mapBackendRankingToEntry(item, i))
      .sort((a, b) => a.position - b.position);
    return {
      entries,
      total: entries.length,
      page: data.page ?? 1,
      page_size: data.page_size ?? entries.length,
      my_position: data.my_position,
      my_coins_earned: data.my_coins_earned,
    };
  }
  return data as CompetitionRankingResponse;
}

/** Resposta de GET /competitions/:id/my-ranking (aluno com resultado) */
export interface MyRankingResponse {
  position: number | null;
  total_participants: number;
  value?: number;
  grade?: number | string;
  proficiency?: number | string;
  correct_answers?: number;
  total_questions?: number;
  coins_earned?: number;
  message?: string;
}

/** Posição e moedas do aluno no ranking da competição. Quando não tem resultado: position null, total_participants 0. */
export async function getMyRanking(competitionId: string): Promise<MyRankingResponse> {
  const { data } = await api.get<MyRankingResponse>(`/competitions/${competitionId}/my-ranking`);
  return data ?? { position: null, total_participants: 0 };
}

/** Finalizar competição (gerar ranking e pagar recompensas). Só quando expiração já passou e status ainda aberta/em_andamento. */
export async function finalizeCompetition(competitionId: string): Promise<{ message?: string }> {
  const { data } = await api.post<{ message?: string }>(`/competitions/${competitionId}/finalize`);
  return data ?? {};
}

/** Dados de analytics da competição (espelho do backend) */
export interface CompetitionAnalytics {
  /** Taxa de inscrição (%) */
  enrollment_rate: number;
  /** Taxa de participação (%) */
  participation_rate: number;
  /** Detalhes de inscrição */
  enrollment: {
    eligible_students: number;
    enrolled_students: number;
    rate: number;
  };
  /** Detalhes de participação */
  participation: {
    enrolled_students: number;
    participated_students: number;
    rate: number;
  };
  /** Médias agregadas */
  averages: {
    grade: number | null;
    duration_minutes: number | null;
    correct_answers: number | null;
    proficiency: number | null;
  };
  /** Distribuição de notas em faixas */
  grade_distribution: {
    range: string;
    count: number;
  }[];
  /** Top 10 alunos no ranking da competição */
  top_10: CompetitionRankingEntry[];
}

/** Buscar analytics da competição (sem fallback; toda a lógica vem do backend) */
export async function getCompetitionAnalytics(competitionId: string): Promise<CompetitionAnalytics> {
  const { data } = await api.get<CompetitionAnalytics>(`/competitions/${competitionId}/analytics`);
  return data;
}
