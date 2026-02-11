import { api } from '@/lib/api';

export interface QuantidadeRespostasResponse {
  question_id: string;
  quantidade: number;
}

/**
 * Serviço de API para questões.
 * Endpoints requerem JWT. Roles: admin, professor, coordenador, diretor, tecadm.
 */
export class QuestionsApiService {
  /**
   * Busca a quantidade de respostas (StudentAnswer) para uma questão.
   * GET /questions/<question_id>/quantidade-respostas
   * 200: { question_id, quantidade }
   * 404: Questão não encontrada
   * 500: Erro interno
   */
  static async getQuantidadeRespostas(questionId: string): Promise<QuantidadeRespostasResponse> {
    try {
      const response = await api.get<QuantidadeRespostasResponse>(
        `/questions/${encodeURIComponent(questionId)}/quantidade-respostas`
      );
      return {
        question_id: response.data?.question_id ?? questionId,
        quantidade: response.data?.quantidade ?? 0,
      };
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        return { question_id: questionId, quantidade: 0 };
      }
      console.error(`Erro ao buscar quantidade de respostas da questão ${questionId}:`, error);
      return { question_id: questionId, quantidade: 0 };
    }
  }
}
