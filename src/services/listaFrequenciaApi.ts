import { api } from '@/lib/api';
import type {
  ListaFrequenciaResponse,
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
 * GET /lista-frequencia/?test_id=<id> [&class_id=<uuid>]
 * - Uma turma: test_id basta. Cabeçalho usa Test.title em nome_prova_ano.
 * - Várias turmas: class_id obrigatório.
 * Erros: 404 "Avaliação não encontrada" | "Avaliação não está vinculada a nenhuma turma" | "Turma não está vinculada a esta avaliação"; 400 "Esta avaliação foi aplicada em mais de uma turma. Informe class_id."
 */
export async function getListaFrequenciaPorAvaliacao(
  testId: string,
  classId?: string
): Promise<ListaFrequenciaResponse> {
  const params: Record<string, string> = { test_id: testId };
  if (classId) params.class_id = classId;
  const response = await api.get<ListaFrequenciaResponse>('lista-frequencia/', { params });
  return response.data;
}

/** @deprecated Use getListaFrequenciaPorTurma ou getListaFrequenciaPorAvaliacao. */
export async function getListaFrequencia(
  classId: string,
  tipo: TipoListaFrequencia = 'avaliacao'
): Promise<ListaFrequenciaResponse> {
  return getListaFrequenciaPorTurma(classId, tipo);
}
