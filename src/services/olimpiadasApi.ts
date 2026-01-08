import { api } from '@/lib/api';
import { Olimpiada, OlimpiadaFormData, OlimpiadaResult, OlimpiadaRanking } from '@/types/olimpiada-types';
import { Evaluation } from '@/types/evaluation-types';

/**
 * Serviço de API para Olimpíadas
 * Reutiliza endpoints de avaliação, diferenciando apenas pelo type: "OLIMPIADA"
 */
export class OlimpiadasApiService {
  /**
   * Criar nova olimpíada
   * Usa o mesmo endpoint de avaliação com type: "OLIMPIADA"
   */
  static async createOlimpiada(data: OlimpiadaFormData): Promise<Olimpiada> {
    try {
      const payload = {
        title: data.title,
        description: data.description || '',
        type: 'OLIMPIADA',
        model: data.model || 'PROVA',
        course: data.course,
        grade: data.grade,
        subjects: data.subjects.map(s => s.id),
        schools: data.schools,
        municipalities: data.municipalities,
        classes: data.classes, // Por enquanto usa classes como avaliações
        questions: data.questions,
        startDateTime: data.startDateTime,
        duration: typeof data.duration === 'string' ? parseInt(data.duration, 10) : data.duration,
        evaluation_mode: data.evaluation_mode || 'virtual',
        created_by: data.created_by,
      };

      const response = await api.post('/test', payload);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar olimpíada:', error);
      throw error;
    }
  }

  /**
   * Buscar lista de olimpíadas
   * Filtra por type: "OLIMPIADA"
   */
  static async getOlimpiadas(params?: {
    page?: number;
    per_page?: number;
    school_id?: string;
  }): Promise<{ data: Olimpiada[]; total?: number }> {
    try {
      const queryParams = new URLSearchParams({
        type: 'OLIMPIADA',
        ...(params?.page && { page: params.page.toString() }),
        ...(params?.per_page && { per_page: params.per_page.toString() }),
        ...(params?.school_id && { school_id: params.school_id }),
      });

      const response = await api.get(`/test?${queryParams.toString()}`);
      
      // Se a resposta for um array direto
      if (Array.isArray(response.data)) {
        return { data: response.data };
      }
      
      // Se a resposta tiver estrutura { data: [...], total: ... }
      return {
        data: response.data.data || response.data,
        total: response.data.total,
      };
    } catch (error) {
      console.error('Erro ao buscar olimpíadas:', error);
      throw error;
    }
  }

  /**
   * Buscar olimpíada por ID
   * Usa o mesmo endpoint de avaliação
   */
  static async getOlimpiada(id: string): Promise<Olimpiada> {
    try {
      const response = await api.get(`/test/${id}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar olimpíada:', error);
      throw error;
    }
  }

  /**
   * Atualizar olimpíada
   * Usa o mesmo endpoint de avaliação
   */
  static async updateOlimpiada(id: string, data: Partial<OlimpiadaFormData>): Promise<Olimpiada> {
    try {
      const payload: Record<string, unknown> = {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        type: 'OLIMPIADA',
        ...(data.model && { model: data.model }),
        ...(data.course && { course: data.course }),
        ...(data.grade && { grade: data.grade }),
        ...(data.subjects && { subjects: data.subjects.map(s => s.id) }),
        ...(data.schools && { schools: data.schools }),
        ...(data.municipalities && { municipalities: data.municipalities }),
        ...(data.classes && { classes: data.classes }),
        ...(data.questions && { questions: data.questions }),
        ...(data.startDateTime && { startDateTime: data.startDateTime }),
        ...(data.duration && { 
          duration: typeof data.duration === 'string' ? parseInt(data.duration, 10) : data.duration 
        }),
        ...(data.evaluation_mode && { evaluation_mode: data.evaluation_mode }),
      };

      const response = await api.put(`/test/${id}`, payload);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar olimpíada:', error);
      throw error;
    }
  }

  /**
   * Deletar olimpíada
   * Usa o mesmo endpoint de avaliação
   */
  static async deleteOlimpiada(id: string): Promise<void> {
    try {
      await api.delete(`/test/${id}`);
    } catch (error) {
      console.error('Erro ao deletar olimpíada:', error);
      throw error;
    }
  }

  /**
   * Aplicar/enviar olimpíada para alunos
   * Usa o mesmo endpoint de avaliação
   */
  static async applyOlimpiada(id: string): Promise<void> {
    try {
      await api.post(`/test/${id}/apply`, {});
    } catch (error) {
      console.error('Erro ao aplicar olimpíada:', error);
      throw error;
    }
  }

  /**
   * Buscar resultados da olimpíada
   * Reutiliza endpoint de resultados de avaliação
   */
  static async getOlimpiadaResults(olimpiadaId: string): Promise<{
    results: OlimpiadaResult[];
    ranking: OlimpiadaRanking[];
    totalStudents: number;
    completedStudents: number;
    averageScore: number;
  }> {
    try {
      const response = await api.get('/test-sessions/results', {
        params: { test_id: olimpiadaId },
      });

      // Transformar dados do backend para formato de olimpíada
      const results: OlimpiadaResult[] = (response.data?.results || response.data || []).map(
        (item: unknown) => ({
          id: (item as { id?: string }).id || '',
          olimpiada_id: olimpiadaId,
          student_id: (item as { student_id?: string }).student_id || '',
          student_name: (item as { student_name?: string; nome?: string }).student_name || 
                       (item as { nome?: string }).nome || '',
          score: (item as { score?: number; nota?: number }).score || 
                (item as { nota?: number }).nota || 0,
          proficiency: (item as { proficiency?: number; proficiencia?: number }).proficiency || 
                       (item as { proficiencia?: number }).proficiencia || 0,
          classification: (item as { classification?: string; classificacao?: string }).classification || 
                          (item as { classificacao?: string }).classificacao || '',
          correct_answers: (item as { correct_answers?: number; acertos?: number }).correct_answers || 
                          (item as { acertos?: number }).acertos || 0,
          total_questions: (item as { total_questions?: number; total_questoes?: number }).total_questions || 
                          (item as { total_questoes?: number }).total_questoes || 0,
          completed_at: (item as { completed_at?: string; submitted_at?: string }).completed_at || 
                        (item as { submitted_at?: string }).submitted_at || new Date().toISOString(),
        })
      );

      // Criar ranking ordenado por score
      const ranking: OlimpiadaRanking[] = results
        .map((result, index) => ({
          position: index + 1,
          student_id: result.student_id,
          student_name: result.student_name,
          score: result.score,
          proficiency: result.proficiency,
          classification: result.classification,
          correct_answers: result.correct_answers,
          total_questions: result.total_questions,
        }))
        .sort((a, b) => b.score - a.score)
        .map((item, index) => ({ ...item, position: index + 1 }));

      return {
        results,
        ranking,
        totalStudents: response.data?.total_students || results.length,
        completedStudents: results.length,
        averageScore: results.length > 0
          ? results.reduce((sum, r) => sum + r.score, 0) / results.length
          : 0,
      };
    } catch (error) {
      console.error('Erro ao buscar resultados da olimpíada:', error);
      throw error;
    }
  }

  /**
   * Buscar olimpíadas do aluno
   * Filtra avaliações do tipo OLIMPIADA para o aluno logado
   */
  static async getStudentOlimpiadas(): Promise<Olimpiada[]> {
    try {
      const response = await api.get('/test/my-class/tests');
      const allTests = Array.isArray(response.data) ? response.data : [];
      
      // Filtrar apenas olimpíadas
      return allTests.filter((test: Evaluation) => test.type === 'OLIMPIADA');
    } catch (error) {
      console.error('Erro ao buscar olimpíadas do aluno:', error);
      throw error;
    }
  }
}
