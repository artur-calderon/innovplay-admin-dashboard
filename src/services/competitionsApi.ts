import { api } from '@/lib/api';
import type {
  Competition,
  CompetitionFormData,
  CompetitionResult,
  CompetitionRanking,
  CompetitionEnrollmentStatus,
  CompetitionSession,
  CompetitionSubmitResponse,
  CompetitionResultsResponse,
  GenerateQuestionsParams,
  GenerateQuestionsResponse,
  CanStartResponse,
  CompetitionFilters
} from '@/types/competition-types';

/**
 * Serviço de API para gerenciamento de Competições
 * Centraliza todas as chamadas relacionadas ao sistema de competições
 */
export class CompetitionsApiService {
  
  // ========================================
  // ENDPOINTS ADMINISTRATIVOS
  // ========================================

  /**
   * Criar nova competição
   * @param data Dados do formulário de competição
   * @returns Competição criada
   */
  static async createCompetition(data: CompetitionFormData): Promise<Competition> {
    const payload: any = {
      titulo: data.titulo,
      disciplina_id: data.disciplina_id,
      data_inicio: data.dataInicio.toISOString(),
      data_fim: data.dataFim.toISOString(),
      duracao: data.duracao,
      max_participantes: data.maxParticipantes,
      recompensas: data.recompensas,
      turmas: data.turmas,
      questoes: data.questoes,
      modo_selecao: data.modo_selecao,
      quantidade_questoes: data.quantidade_questoes,
      dificuldade: data.dificuldades || data.dificuldade
    };

    // Adicionar campos opcionais se presentes
    if (data.descricao) payload.descricao = data.descricao;
    if (data.instrucoes) payload.instrucoes = data.instrucoes;
    if (data.icone) payload.icone = data.icone;
    if (data.cor) payload.cor = data.cor;
    if (data.serie_id) payload.serie_id = data.serie_id;

    const response = await api.post('/competitions/', payload);
    return response.data;
  }

  /**
   * Atualizar competição existente
   * @param competitionId ID da competição
   * @param data Dados atualizados
   * @returns Competição atualizada
   */
  static async updateCompetition(competitionId: string, data: Partial<CompetitionFormData>): Promise<Competition> {
    const payload: any = {};
    
    // Mapear campos do formulário para o formato da API
    if (data.titulo) payload.titulo = data.titulo;
    if (data.disciplina_id) payload.disciplina_id = data.disciplina_id;
    if (data.dataInicio) payload.data_inicio = data.dataInicio.toISOString();
    if (data.dataFim) payload.data_fim = data.dataFim.toISOString();
    if (data.duracao !== undefined) payload.duracao = data.duracao;
    if (data.maxParticipantes !== undefined) payload.max_participantes = data.maxParticipantes;
    if (data.recompensas) payload.recompensas = data.recompensas;
    if (data.turmas) payload.turmas = data.turmas;
    if (data.questoes) payload.questoes = data.questoes;
    if (data.modo_selecao) payload.modo_selecao = data.modo_selecao;
    if (data.quantidade_questoes !== undefined) payload.quantidade_questoes = data.quantidade_questoes;
    if (data.dificuldades) payload.dificuldade = data.dificuldades;
    if (data.descricao) payload.descricao = data.descricao;
    if (data.instrucoes) payload.instrucoes = data.instrucoes;
    if (data.icone) payload.icone = data.icone;
    if (data.cor) payload.cor = data.cor;
    if (data.serie_id) payload.serie_id = data.serie_id;

    const response = await api.put(`/competitions/${competitionId}`, payload);
    return response.data;
  }

  /**
   * Excluir competição
   * @param competitionId ID da competição
   * @returns Sucesso da operação
   */
  static async deleteCompetition(competitionId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/competitions/${competitionId}`);
    return response.data;
  }

  /**
   * Gerar questões automáticas para uma competição
   * @param params Parâmetros de geração (disciplina, quantidade, dificuldade, série)
   * @returns Lista de IDs das questões geradas
   */
  static async generateAutoQuestions(params: GenerateQuestionsParams): Promise<GenerateQuestionsResponse> {
    try {
      // Tentar usar endpoint dedicado do backend primeiro
      const response = await api.post('/competitions/generate-questions', params);
      return response.data;
    } catch {
      // Fallback: buscar questões diretamente e fazer seleção no frontend
      console.log('Endpoint de geração não disponível, usando fallback...');
      return this.generateQuestionsFromBank(params);
    }
  }

  /**
   * Fallback: Buscar questões do banco e selecionar aleatoriamente
   * Usado quando o endpoint de geração automática não está disponível
   */
  private static async generateQuestionsFromBank(params: GenerateQuestionsParams): Promise<GenerateQuestionsResponse> {
    try {
      console.log('Buscando questões para disciplina:', params.disciplina_id);
      
      // Buscar questões filtradas por disciplina usando query string
      const response = await api.get(`/questions/?subject_id=${params.disciplina_id}`);
      
      console.log('Resposta da API:', response.data);

      let allQuestions: Array<{
        id: string;
        title?: string;
        titulo?: string;
        text?: string;
        difficulty?: string;
        difficulty_level?: string;
        dificuldade?: string;
        subject_id?: string;
        disciplina_id?: string;
        subject?: { id: string; name: string };
      }> = [];

      // Normalizar resposta da API
      if (Array.isArray(response.data)) {
        allQuestions = response.data;
      } else if (Array.isArray(response.data?.questions)) {
        allQuestions = response.data.questions;
      } else if (Array.isArray(response.data?.results)) {
        allQuestions = response.data.results;
      }

      console.log('Total de questões encontradas:', allQuestions.length);

      // Verificar se as questões vieram filtradas corretamente
      // Se não, filtrar manualmente
      let filteredQuestions = allQuestions.filter(q => {
        const qSubjectId = q.subject_id || q.disciplina_id || q.subject?.id;
        // Se não há subject_id na questão, considera como válida (já veio filtrada da API)
        if (!qSubjectId) return true;
        return qSubjectId === params.disciplina_id;
      });

      console.log('Questões após filtro de disciplina:', filteredQuestions.length);

      // Filtrar por dificuldade se especificado (suporta múltiplas dificuldades)
      if (params.dificuldades && params.dificuldades.length > 0 && filteredQuestions.length > 0) {
        const difficultyMap: Record<string, string[]> = {
          'facil': ['facil', 'fácil', 'easy', 'baixa', 'low', 'básico', 'basico'],
          'medio': ['medio', 'médio', 'medium', 'média', 'normal', 'intermediário', 'intermediario'],
          'dificil': ['dificil', 'difícil', 'hard', 'alta', 'high', 'avançado', 'avancado']
        };
        
        // Combinar todas as dificuldades válidas
        const allValidDifficulties: string[] = [];
        params.dificuldades.forEach(diff => {
          const mappedDiffs = difficultyMap[diff] || [];
          allValidDifficulties.push(...mappedDiffs);
        });
        
        const questionsWithDifficulty = filteredQuestions.filter(q => {
          const qDiff = (q.difficulty || q.difficulty_level || q.dificuldade || '').toLowerCase();
          // Se não tem dificuldade definida e todas as dificuldades estão selecionadas, incluir
          if (!qDiff && params.dificuldades && params.dificuldades.length === 3) return true;
          return allValidDifficulties.some(d => qDiff.includes(d));
        });

        console.log('Questões após filtro de dificuldade:', questionsWithDifficulty.length);

        // Só usar filtro de dificuldade se encontrou questões
        if (questionsWithDifficulty.length > 0) {
          filteredQuestions = questionsWithDifficulty;
        }
      }

      if (filteredQuestions.length === 0) {
        // Se não encontrou com filtro, tentar buscar todas as questões
        console.log('Nenhuma questão encontrada com filtro, tentando buscar todas...');
        const allResponse = await api.get('/questions/');
        
        let allQuestionsBackup: typeof allQuestions = [];
        if (Array.isArray(allResponse.data)) {
          allQuestionsBackup = allResponse.data;
        } else if (Array.isArray(allResponse.data?.questions)) {
          allQuestionsBackup = allResponse.data.questions;
        } else if (Array.isArray(allResponse.data?.results)) {
          allQuestionsBackup = allResponse.data.results;
        }

        // Filtrar por disciplina manualmente
        filteredQuestions = allQuestionsBackup.filter(q => {
          const qSubjectId = q.subject_id || q.disciplina_id || q.subject?.id;
          return qSubjectId === params.disciplina_id;
        });

        console.log('Questões após filtro manual:', filteredQuestions.length);

        if (filteredQuestions.length === 0) {
          throw new Error(`Nenhuma questão encontrada para a disciplina selecionada. Verifique se existem questões cadastradas.`);
        }
      }

      // Embaralhar array usando Fisher-Yates
      const shuffled = [...filteredQuestions];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      // Selecionar quantidade desejada
      const quantidade = Math.min(params.quantidade, shuffled.length);
      const selectedQuestions = shuffled.slice(0, quantidade);

      console.log('Questões selecionadas:', selectedQuestions.length);

      return {
        question_ids: selectedQuestions.map(q => q.id),
        total_generated: selectedQuestions.length,
        questions_preview: selectedQuestions.map(q => ({
          id: q.id,
          titulo: q.title || q.titulo || q.text?.substring(0, 50) || `Questão ${q.id}`,
          dificuldade: q.difficulty || q.difficulty_level || q.dificuldade || 'não especificada'
        }))
      };
    } catch (error) {
      console.error('Erro ao buscar questões do banco:', error);
      const errorMessage = error instanceof Error ? error.message : 'Não foi possível gerar questões automaticamente.';
      throw new Error(errorMessage);
    }
  }

  /**
   * Listar todas as competições (admin/professor)
   * @param filters Filtros opcionais
   * @returns Lista de competições
   */
  static async listAllCompetitions(filters?: CompetitionFilters): Promise<Competition[]> {
    const response = await api.get('/competitions/', { params: filters });
    return response.data;
  }

  /**
   * Obter detalhes de uma competição específica
   * @param competitionId ID da competição
   * @returns Detalhes da competição
   */
  static async getCompetitionById(competitionId: string): Promise<Competition> {
    const response = await api.get(`/competitions/${competitionId}`);
    return response.data;
  }

  /**
   * Finalizar competição manualmente
   * @param competitionId ID da competição
   * @returns Resultado da finalização
   */
  static async finalizeCompetition(competitionId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/competitions/${competitionId}/finalize`);
    return response.data;
  }

  /**
   * Obter estatísticas resumidas de todas as competições
   * @returns Estatísticas gerais
   */
  static async getCompetitionsStats(): Promise<{
    total: number;
    ativas: number;
    finalizadas: number;
    total_participantes: number;
    total_moedas_distribuidas: number;
  }> {
    const response = await api.get('/competitions/stats');
    return response.data;
  }

  // ========================================
  // ENDPOINTS PARA ALUNOS
  // ========================================

  /**
   * Listar competições disponíveis para o aluno
   * @param filters Filtros opcionais (disciplina, status)
   * @returns Lista de competições disponíveis
   */
  static async getAvailableCompetitions(filters?: {
    disciplina?: string;
    status?: string;
  }): Promise<Competition[]> {
    const response = await api.get('/competitions/available', { params: filters });
    return response.data;
  }

  /**
   * Verificar status de inscrição do aluno em uma competição
   * @param competitionId ID da competição
   * @returns Status da inscrição
   */
  static async getEnrollmentStatus(competitionId: string): Promise<CompetitionEnrollmentStatus> {
    const response = await api.get(`/competitions/${competitionId}/enrollment-status`);
    return response.data;
  }

  /**
   * Inscrever aluno em uma competição
   * @param competitionId ID da competição
   * @returns Resultado da inscrição
   */
  static async enrollInCompetition(competitionId: string): Promise<{
    success: boolean;
    message: string;
    enrollment_id?: string;
  }> {
    const response = await api.post(`/competitions/${competitionId}/enroll`);
    return response.data;
  }

  /**
   * Cancelar inscrição do aluno
   * @param competitionId ID da competição
   * @returns Resultado do cancelamento
   */
  static async cancelEnrollment(competitionId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/competitions/${competitionId}/enroll`);
    return response.data;
  }

  /**
   * Verificar se o aluno pode iniciar a competição
   * @param competitionId ID da competição
   * @returns Dados de permissão para iniciar
   */
  static async canStartCompetition(competitionId: string): Promise<CanStartResponse> {
    const response = await api.get(`/competitions/${competitionId}/can-start`);
    return response.data;
  }

  /**
   * Iniciar competição (criar sessão)
   * @param competitionId ID da competição
   * @returns Dados da sessão iniciada com questões
   */
  static async startCompetition(competitionId: string): Promise<CompetitionSession> {
    const response = await api.post(`/competitions/${competitionId}/start`);
    return response.data;
  }

  /**
   * Salvar resposta temporária (auto-save)
   * @param sessionId ID da sessão
   * @param questionId ID da questão
   * @param answer Resposta selecionada
   * @returns Confirmação de salvamento
   */
  static async saveAnswer(sessionId: string, questionId: string, answer: string): Promise<{ saved: boolean }> {
    const response = await api.post(`/competitions/sessions/${sessionId}/save-answer`, {
      question_id: questionId,
      answer
    });
    return response.data;
  }

  /**
   * Submeter respostas da competição
   * @param data Dados de submissão
   * @returns Resultado da competição (nota, ranking, moedas)
   */
  static async submitCompetition(data: {
    competition_id: string;
    session_id: string;
    answers: Array<{
      question_id: string;
      answer: string;
    }>;
    time_spent: number;
  }): Promise<CompetitionSubmitResponse> {
    const response = await api.post('/competitions/submit', data);
    return response.data;
  }

  /**
   * Obter resultado individual do aluno em uma competição
   * @param competitionId ID da competição
   * @returns Resultado do aluno
   */
  static async getMyResult(competitionId: string): Promise<CompetitionResult | null> {
    try {
      const response = await api.get(`/competitions/${competitionId}/my-result`);
      return response.data;
    } catch (error) {
      // Se não encontrar resultado, retorna null
      return null;
    }
  }

  // ========================================
  // ENDPOINTS DE RESULTADOS (ADMIN/PROFESSOR)
  // ========================================

  /**
   * Obter resultados completos da competição
   * @param competitionId ID da competição
   * @param filters Filtros opcionais (escola, turma)
   * @returns Resultados detalhados com ranking
   */
  static async getCompetitionResults(competitionId: string, filters?: {
    escola_id?: string;
    turma_id?: string;
    serie_id?: string;
    municipio_id?: string;
    estado_id?: string;
  }): Promise<CompetitionResultsResponse> {
    const response = await api.get(`/competitions/${competitionId}/results`, { params: filters });
    return response.data;
  }

  /**
   * Exportar resultados para Excel
   * @param competitionId ID da competição
   * @param filters Filtros aplicados
   * @returns Blob do arquivo Excel
   */
  static async exportResultsExcel(competitionId: string, filters?: {
    escola_id?: string;
    turma_id?: string;
  }): Promise<Blob> {
    const response = await api.get(`/competitions/${competitionId}/results/export/excel`, {
      params: filters,
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * Exportar resultados para PDF
   * @param competitionId ID da competição
   * @param filters Filtros aplicados
   * @returns Blob do arquivo PDF
   */
  static async exportResultsPdf(competitionId: string, filters?: {
    escola_id?: string;
    turma_id?: string;
  }): Promise<Blob> {
    const response = await api.get(`/competitions/${competitionId}/results/export/pdf`, {
      params: filters,
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * Obter ranking geral da competição
   * @param competitionId ID da competição
   * @param limit Limite de resultados (default: 100)
   * @returns Lista ordenada por ranking
   */
  static async getCompetitionRanking(competitionId: string, limit: number = 100): Promise<CompetitionRanking[]> {
    const response = await api.get(`/competitions/${competitionId}/ranking`, { params: { limit } });
    return response.data;
  }

  /**
   * Obter estatísticas por questão da competição
   * @param competitionId ID da competição
   * @returns Estatísticas de acertos por questão
   */
  static async getQuestionStats(competitionId: string): Promise<Array<{
    questao_numero: number;
    questao_id: string;
    percentual_acertos: number;
    total_respostas: number;
    habilidade?: string;
    codigo_habilidade?: string;
  }>> {
    const response = await api.get(`/competitions/${competitionId}/question-stats`);
    return response.data;
  }

  // ========================================
  // ENDPOINTS DE FILTROS
  // ========================================

  /**
   * Obter escolas participantes de uma competição
   * @param competitionId ID da competição
   * @returns Lista de escolas
   */
  static async getParticipatingSchools(competitionId: string): Promise<Array<{
    id: string;
    nome: string;
    total_participantes: number;
  }>> {
    const response = await api.get(`/competitions/${competitionId}/schools`);
    return response.data;
  }

  /**
   * Obter turmas participantes de uma competição
   * @param competitionId ID da competição
   * @param escolaId Filtrar por escola
   * @returns Lista de turmas
   */
  static async getParticipatingClasses(competitionId: string, escolaId?: string): Promise<Array<{
    id: string;
    nome: string;
    serie: string;
    total_participantes: number;
  }>> {
    const response = await api.get(`/competitions/${competitionId}/classes`, { 
      params: { escola_id: escolaId } 
    });
    return response.data;
  }

  // ========================================
  // ENDPOINTS DE MOEDAS (INNOV COINS)
  // ========================================

  /**
   * Distribuir moedas para os vencedores (após finalização)
   * @param competitionId ID da competição
   * @returns Resultado da distribuição
   */
  static async distributeRewards(competitionId: string): Promise<{
    success: boolean;
    distributed_to: Array<{
      aluno_id: string;
      nome: string;
      posicao: number;
      moedas: number;
    }>;
  }> {
    const response = await api.post(`/competitions/${competitionId}/distribute-rewards`);
    return response.data;
  }

  /**
   * Obter histórico de moedas ganhas em competições pelo aluno
   * @returns Histórico de premiações
   */
  static async getMyRewardsHistory(): Promise<Array<{
    competition_id: string;
    competition_titulo: string;
    posicao: number;
    moedas: number;
    data: string;
  }>> {
    const response = await api.get('/competitions/my-rewards');
    return response.data;
  }
}

