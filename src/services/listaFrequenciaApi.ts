import { api } from '@/lib/api';
import type {
  ListaFrequenciaResponse,
  ListaFrequenciaTurmasResponse,
  TipoListaFrequencia,
} from '@/types/lista-frequencia';

/**
 * Lista de frequência por turma (status vazios).
 * GET /lista-frequencia/?class_id=<uuid>
 * Comportamento mantido: lista a turma e os estudantes com status null.
 */
export async function getListaFrequenciaPorTurma(
  classId: string,
  tipo?: TipoListaFrequencia
): Promise<ListaFrequenciaResponse> {
  const params: Record<string, string> = { class_id: classId };
  if (tipo) params.tipo = tipo;
  const response = await api.get<ListaFrequenciaResponse>('lista-frequencia/', { params });
  return response.data;
}

/**
 * Lista de frequência de avaliação já aplicada (status P/A conforme TestSession).
 * GET /lista-frequencia/?test_id=<id> [&class_id=<uuid>] [&grade_id=<uuid>] [&tipo=avaliacao|prova_fisica|frequencia_diaria]
 * - Todas as turmas: só test_id → resposta { turmas: [{ class_id, cabecalho, estudantes }, ...] }.
 * - Uma turma: test_id + class_id → resposta única { cabecalho, estudantes }.
 * - Filtrar por série: test_id + grade_id.
 */
export async function getListaFrequenciaPorAvaliacao(
  testId: string,
  classId?: string,
  options?: { grade_id?: string; tipo?: TipoListaFrequencia }
): Promise<ListaFrequenciaResponse> {
  const params: Record<string, string> = { test_id: testId };
  if (classId) params.class_id = classId;
  if (options?.grade_id) params.grade_id = options.grade_id;
  if (options?.tipo) params.tipo = options.tipo;
  const response = await api.get<ListaFrequenciaResponse>('lista-frequencia/', { params });
  return response.data;
}

/**
 * Todas as turmas da avaliação em uma única chamada.
 * GET /lista-frequencia/?test_id=<uuid> [&grade_id=<uuid_serie>] [&tipo=...]
 * Resposta: { turmas: [{ class_id, cabecalho, estudantes }, ...] }.
 * Retorna array no formato esperado pela página (um item por turma).
 */
export async function getListaFrequenciaPorAvaliacaoTodasTurmas(
  testId: string,
  options?: { grade_id?: string; tipo?: TipoListaFrequencia }
): Promise<ListaFrequenciaResponse[]> {
  const params: Record<string, string> = { test_id: testId };
  if (options?.grade_id) params.grade_id = options.grade_id;
  if (options?.tipo) params.tipo = options.tipo;
  const response = await api.get<ListaFrequenciaTurmasResponse>('lista-frequencia/', { params });
  const data = response.data;
  if (!data?.turmas || !Array.isArray(data.turmas)) return [];
  return data.turmas.map((t) => ({ cabecalho: t.cabecalho, estudantes: t.estudantes }));
}

/** @deprecated Use getListaFrequenciaPorTurma ou getListaFrequenciaPorAvaliacao. */
export async function getListaFrequencia(
  classId: string,
  tipo: TipoListaFrequencia = 'avaliacao'
): Promise<ListaFrequenciaResponse> {
  return getListaFrequenciaPorTurma(classId, tipo);
}
