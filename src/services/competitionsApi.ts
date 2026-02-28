import { api } from '@/lib/api';
import type {
  Competition,
  CompetitionFilters,
  CreateCompetitionFormData,
  UpdateCompetitionFormData,
} from '@/types/competition-types';

/** Opções para contexto de município (tenant). Quando informado, o request envia X-City-ID para o backend. */
export interface CompetitionRequestOptions {
  cityId?: string;
}

function cityConfig(options?: CompetitionRequestOptions): { meta?: { cityId: string } } {
  return options?.cityId ? { meta: { cityId: options.cityId } } : {};
}

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
 *
 * Contexto de município (tenant): para admin/coordenador/diretor/tecadm que acessam
 * competições de um município, passar options: { cityId: '...' } para enviar X-City-ID.
 * Para aluno, o interceptor envia automaticamente o tenant_id do usuário em requests a /competitions.
 * URLs e contratos permanecem iguais; o backend resolve public vs schema do município.
 */

export async function getCompetitionLevelOptions(options?: CompetitionRequestOptions): Promise<CompetitionLevelOptionsResponse> {
  const { data } = await api.get<CompetitionLevelOptionsResponse>('/competitions/level-options', cityConfig(options));
  return data ?? { levels: [] };
}

/** Escopos de competição que o usuário logado pode usar (por role: admin, tec adm, diretor, coordenador, professor). */
export async function getAllowedCompetitionScopes(options?: CompetitionRequestOptions): Promise<string[]> {
  try {
    const { data } = await api.get<AllowedCompetitionScopesResponse>('/competitions/allowed-scopes', cityConfig(options));
    return Array.isArray(data?.allowed_scopes) ? data.allowed_scopes : ['individual'];
  } catch {
    return ['individual'];
  }
}

export async function getCompetitions(
  filters: Partial<CompetitionFilters>,
  options?: CompetitionRequestOptions
): Promise<Competition[]> {
  const params: Record<string, string | number> = {};
  if (filters.status && filters.status !== 'all') params.status = filters.status;
  if (filters.subject_id && filters.subject_id !== 'all') params.subject_id = filters.subject_id;
  if (filters.level && filters.level !== 'all') params.level = filters.level;
  if (filters.from_date) params.from_date = filters.from_date;
  if (filters.to_date) params.to_date = filters.to_date;
  if (filters.page != null) params.page = filters.page;
  if (filters.page_size != null) params.page_size = filters.page_size;

  const { data } = await api.get<Competition[]>('/competitions', { params, ...cityConfig(options) });
  return Array.isArray(data) ? data : [];
}

/** Lista de competições disponíveis para o aluno (inclui is_enrolled). */
export async function getAvailableCompetitions(options?: CompetitionRequestOptions): Promise<Competition[]> {
  const { data } = await api.get<Competition[]>('/competitions/available', cityConfig(options));
  if (process.env.NODE_ENV !== 'production') {
    console.log(
      '[Competitions] Resposta de GET /competitions/available:',
      JSON.stringify(data, null, 2),
    );
  }
  return Array.isArray(data) ? data : [];
}

/** Parâmetros para GET /competitions/my (competição do ponto de vista do aluno). */
export interface MyCompetitionsParams {
  status?: 'finished' | 'active' | 'upcoming' | 'all';
  subject_id?: string;
  level?: number;
}

/**
 * Lista de competições do aluno (histórico + ativas).
 * GET /competitions/my — usa o mesmo formato base de Competition de /available,
 * com campos adicionais de sessão/tentativa quando existirem.
 */
export async function getMyCompetitions(
  params?: MyCompetitionsParams,
  options?: CompetitionRequestOptions
): Promise<Competition[]> {
  const query: Record<string, string | number> = {};
  if (params?.status && params.status !== 'all') query.status = params.status;
  if (params?.subject_id) query.subject_id = params.subject_id;
  if (typeof params?.level === 'number') query.level = params.level;

  const { data } = await api.get<Competition[]>('/competitions/my', {
    params: Object.keys(query).length ? query : undefined,
    ...cityConfig(options),
  });
  return Array.isArray(data) ? data : [];
}

export async function getCompetition(id: string, options?: CompetitionRequestOptions): Promise<Competition> {
  const { data } = await api.get<Competition>(`/competitions/${id}`, cityConfig(options));
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
  options?: { limit?: number; offset?: number } & CompetitionRequestOptions,
): Promise<EnrolledStudent[]> {
  const params: Record<string, number> = {};
  if (typeof options?.limit === 'number') params.limit = options.limit;
  if (typeof options?.offset === 'number') params.offset = options.offset;
  try {
    const { data } = await api.get<EnrolledStudent[]>(`/competitions/${id}/enrolled-students`, {
      params: Object.keys(params).length ? params : undefined,
      ...cityConfig(options),
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
  options?: { class_id?: string; school_id?: string; limit?: number; offset?: number } & CompetitionRequestOptions,
): Promise<EligibleStudent[]> {
  const params: Record<string, string | number> = {};
  if (options?.class_id) params.class_id = options.class_id;
  else if (options?.school_id) params.school_id = options.school_id;
  if (typeof options?.limit === 'number') params.limit = options.limit;
  if (typeof options?.offset === 'number') params.offset = options.offset;

  try {
    const { data } = await api.get<EligibleStudent[]>(`/competitions/${id}/eligible-students`, {
      params: Object.keys(params).length ? params : undefined,
      ...cityConfig(options),
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
export async function getCompetitionDetails(id: string, options?: CompetitionRequestOptions): Promise<Competition> {
  const { data } = await api.get<Competition>(`/competitions/${id}/details`, cityConfig(options));
  return data;
}

export async function createCompetition(
  payload: CreateCompetitionFormData,
  options?: CompetitionRequestOptions
): Promise<Competition> {
  const { data } = await api.post<Competition>('/competitions', payload, cityConfig(options));
  return data;
}

export async function updateCompetition(
  id: string,
  payload: UpdateCompetitionFormData,
  options?: CompetitionRequestOptions
): Promise<Competition> {
  const { data } = await api.put<Competition>(`/competitions/${id}`, payload, cityConfig(options));
  return data;
}

export async function deleteCompetition(id: string, options?: CompetitionRequestOptions): Promise<void> {
  await api.delete(`/competitions/${id}`, cityConfig(options));
}

export async function publishCompetition(id: string, options?: CompetitionRequestOptions): Promise<Competition> {
  const { data } = await api.post<Competition>(`/competitions/${id}/publish`, undefined, cityConfig(options));
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
  body?: { reason?: string },
  options?: CompetitionRequestOptions
): Promise<Competition> {
  const { data } = await api.post<Competition>(`/competitions/${id}/cancel`, body ?? {}, cityConfig(options));
  return data;
}

export async function addCompetitionQuestions(
  id: string,
  questionIds: string[],
  options?: CompetitionRequestOptions
): Promise<unknown> {
  const { data } = await api.post<unknown>(`/competitions/${id}/questions`, {
    question_ids: questionIds,
  }, cityConfig(options));
  return data;
}

/** Inscrição do estudante na competição. */
export async function enrollCompetition(id: string, options?: CompetitionRequestOptions): Promise<unknown> {
  const { data } = await api.post<unknown>(`/competitions/${id}/enroll`, undefined, cityConfig(options));
  return data;
}

/** Cancelar inscrição do estudante na competição. */
export async function unenrollCompetition(id: string, options?: CompetitionRequestOptions): Promise<unknown> {
  const { data } = await api.delete<unknown>(`/competitions/${id}/unenroll`, cityConfig(options));
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
export async function startCompetition(id: string, options?: CompetitionRequestOptions): Promise<StartCompetitionResponse> {
  const { data } = await api.post<StartCompetitionRawResponse>(`/competitions/${id}/start`, undefined, cityConfig(options));
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
  params?: CompetitionRankingParams,
  options?: CompetitionRequestOptions
): Promise<CompetitionRankingResponse> {
  const requestParams: Record<string, number | string | undefined> = { ...params } as Record<string, number | string | undefined>;
  if (requestParams.limit != null && requestParams.page_size == null) {
    requestParams.limit = requestParams.limit;
  }
  const { data } = await api.get<CompetitionRankingResponse & { ranking?: CompetitionRankingBackendItem[] }>(
    `/competitions/${id}/ranking`,
    { params: requestParams ?? undefined, ...cityConfig(options) }
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

export interface CompetitionRankingByScopeParams extends CompetitionRankingParams {
  scope: 'global' | 'state' | 'municipality' | 'school';
  state?: string;
  city_id?: string;
  school_id?: string;
}

/**
 * Ranking da competição filtrado por escopo.
 * GET /competitions/:id/ranking-by-scope?scope=...
 */
export async function getCompetitionRankingByScope(
  id: string,
  params: CompetitionRankingByScopeParams,
  options?: CompetitionRequestOptions
): Promise<CompetitionRankingResponse> {
  const { data } = await api.get<CompetitionRankingResponse & { ranking?: CompetitionRankingBackendItem[] }>(
    `/competitions/${id}/ranking-by-scope`,
    { params: params as Record<string, string | number>, ...cityConfig(options) },
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
export async function getMyRanking(competitionId: string, options?: CompetitionRequestOptions): Promise<MyRankingResponse> {
  const { data } = await api.get<MyRankingResponse>(`/competitions/${competitionId}/my-ranking`, cityConfig(options));
  return data ?? { position: null, total_participants: 0 };
}

/** Sessão de prova do aluno em uma competição (GET /competitions/:id/my-session). */
export interface CompetitionTestSession {
  id?: string;
  test_id?: string;
  status?: string;
  started_at?: string;
  submitted_at?: string;
  score?: number;
  grade?: number | string;
  [key: string]: unknown;
}

interface MyCompetitionSessionResponse {
  test_session: CompetitionTestSession | null;
}

/** Buscar sessão de prova do aluno para uma competição específica. */
export async function getMyCompetitionSession(
  competitionId: string,
  options?: CompetitionRequestOptions
): Promise<CompetitionTestSession | null> {
  const { data } = await api.get<MyCompetitionSessionResponse>(`/competitions/${competitionId}/my-session`, cityConfig(options));
  if (!data || !data.test_session) return null;
  return data.test_session;
}

/** Finalizar competição (gerar ranking e pagar recompensas). Só quando expiração já passou e status ainda aberta/em_andamento. */
export async function finalizeCompetition(competitionId: string, options?: CompetitionRequestOptions): Promise<{ message?: string }> {
  const { data } = await api.post<{ message?: string }>(`/competitions/${competitionId}/finalize`, undefined, cityConfig(options));
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
export async function getCompetitionAnalytics(competitionId: string, options?: CompetitionRequestOptions): Promise<CompetitionAnalytics> {
  const { data } = await api.get<CompetitionAnalytics>(`/competitions/${competitionId}/analytics`, cityConfig(options));
  return data;
}
