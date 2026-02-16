import { api } from '@/lib/api';
import type {
  ListaFrequenciaResponse,
  TipoListaFrequencia,
} from '@/types/lista-frequencia';

/**
 * Busca a lista de frequência de uma turma.
 * GET /lista-frequencia/?class_id=<uuid>&tipo=avaliacao|prova_fisica|frequencia_diaria
 */
export async function getListaFrequencia(
  classId: string,
  tipo: TipoListaFrequencia = 'avaliacao'
): Promise<ListaFrequenciaResponse> {
  const response = await api.get<ListaFrequenciaResponse>('lista-frequencia/', {
    params: { class_id: classId, tipo },
  });
  return response.data;
}
