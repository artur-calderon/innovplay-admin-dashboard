import { api } from '@/lib/api';
import type {
  Competition,
  CompetitionFormData,
  CompetitionResult,
  CompetitionRanking,
  CompetitionEnrollmentStatus,
  CompetitionSession,
  CompetitionQuestion,
  CompetitionSubmitResponse,
  CompetitionResultsResponse,
  GenerateQuestionsParams,
  GenerateQuestionsResponse,
  CanStartResponse,
  CompetitionFilters,
  ApiResponse,
  EnrollmentResponse
} from '@/types/competition-types';

/**
 * Funções auxiliares para mapeamento de campos entre frontend e backend
 */

/**
 * Mapeia os novos valores de dificuldade para os valores que o backend espera
 */
function mapDifficultyToBackend(difficulty: string): string {
  const difficultyMap: Record<string, string> = {
    'Abaixo do Básico': 'facil',
    'Básico': 'facil',
    'Adequado': 'medio',
    'Avançado': 'dificil'
  };
  
  return difficultyMap[difficulty] || difficulty;
}

/**
 * Mapeia os valores de dificuldade do backend para os novos valores do frontend
 */
function mapDifficultyFromBackend(difficulty: string): string {
  const difficultyMap: Record<string, string> = {
    'facil': 'Básico',
    'medio': 'Adequado',
    'dificil': 'Avançado'
  };
  
  return difficultyMap[difficulty] || difficulty;
}

/**
 * Mapeia dados do formulário (frontend) para o formato do backend
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapFormDataToBackend(data: CompetitionFormData): any {
  // Converter dificuldades do novo formato para o formato do backend
  const backendDifficulties = (data.dificuldades && data.dificuldades.length > 0)
    ? data.dificuldades.map(diff => mapDifficultyToBackend(diff))
    : [];
  
  // NOTA: O backend tenta criar ClassTest quando recebe 'classes', mas ClassTest
  // tem foreign key para 'test', não para 'competition'. Por isso, vamos armazenar
  // as turmas apenas no campo JSON 'classes' da competição, sem criar ClassTest.
  // O backend já armazena isso no campo JSON (linha 99 do routes.py), mas também
  // tenta criar ClassTest (linhas 120-130), causando erro. Vamos enviar apenas
  // o campo JSON e comentar a criação de ClassTest no backend seria a solução ideal.
  const payload: any = {
    title: data.titulo,
    description: data.descricao,
    instrucoes: data.instrucoes,
    recompensas: data.recompensas,
    modo_selecao: data.modo_selecao,
    icone: data.icone,
    cor: data.cor,
    dificuldade: backendDifficulties.length > 0 ? backendDifficulties : undefined,
    duration: data.duracao,
    time_limit: data.dataInicio.toISOString(),
    end_time: data.dataFim.toISOString(),
    max_participantes: data.maxParticipantes,
    subject: data.disciplina_id,
    grade_id: data.serie_id,
    questions: data.questoes,
    quantidade_questoes: data.quantidade_questoes
  };
  
  // TEMPORÁRIO: Não enviar classes para evitar erro de foreign key
  // TODO: Corrigir backend para não criar ClassTest para competições
  // As turmas podem ser armazenadas apenas no campo JSON 'classes'
  // if (data.turmas && data.turmas.length > 0) {
  //   payload.classes = data.turmas;
  // }
  
  return payload;
}

/**
 * Mapeia dados do backend para o formato do frontend
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBackendToFrontend(backendData: any): Competition {
  // Converter dificuldades do backend para o novo formato
  let dificuldade: string | string[] | undefined = backendData.dificuldade;
  if (dificuldade) {
    if (Array.isArray(dificuldade)) {
      // Filtrar valores vazios e mapear
      const mapped = dificuldade
        .filter(diff => diff && typeof diff === 'string')
        .map(diff => mapDifficultyFromBackend(diff));
      dificuldade = mapped.length > 0 ? mapped : undefined;
    } else if (typeof dificuldade === 'string') {
      dificuldade = mapDifficultyFromBackend(dificuldade);
    }
  }
  
  return {
    ...backendData,
    // Mapear campos do backend para frontend
    titulo: backendData.title || backendData.titulo,
    disciplina_id: backendData.subject || backendData.disciplina_id,
    data_inicio: backendData.time_limit || backendData.data_inicio,
    data_fim: backendData.end_time || backendData.data_fim,
    duracao: backendData.duration || backendData.duracao,
    max_participantes: backendData.max_participantes,
    turmas: backendData.classes || backendData.turmas,
    questoes: backendData.questions || backendData.questoes,
    descricao: backendData.description || backendData.descricao,
    dificuldade: dificuldade,
    // Manter campos originais também para compatibilidade
    title: backendData.title,
    subject: backendData.subject,
    time_limit: backendData.time_limit,
    end_time: backendData.end_time,
    duration: backendData.duration,
    classes: backendData.classes,
    questions: backendData.questions,
    description: backendData.description
  };
}

/**
 * Extrai dados de uma resposta com wrapper {mensagem, data}
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractDataFromResponse<T>(response: any): T {
  // Se a resposta já é o tipo esperado, retornar direto
  if (response && !response.mensagem && !response.message && !response.data) {
    return response;
  }
  // Se tem wrapper, extrair de data
  if (response?.data) {
    return response.data;
  }
  // Fallback: retornar a resposta original
  return response;
}

/**
 * Mapeia CanStartResponse do backend para frontend
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCanStartResponse(backendResponse: any): CanStartResponse {
  return {
    pode_iniciar: backendResponse.pode_iniciar,
    can_start: backendResponse.pode_iniciar ?? backendResponse.can_start ?? false,
    motivo: backendResponse.motivo,
    reason: backendResponse.motivo || backendResponse.reason,
    starts_at: backendResponse.starts_at,
    competition_data: backendResponse.competition_data
  };
}

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
    // Mapear dados do frontend para o formato do backend
    const payload = mapFormDataToBackend(data);

    const response = await api.post<ApiResponse<{ id: string; title: string }>>('/competitions', payload);
    
    // Extrair dados do wrapper de resposta
    const responseData = extractDataFromResponse<{ id: string; title: string }>(response.data);
    
    // Buscar a competição criada para retornar dados completos
    if (responseData.id) {
      return this.getCompetitionById(responseData.id);
    }
    
    // Fallback: retornar dados mapeados
    return mapBackendToFrontend(responseData);
  }

  /**
   * Atualizar competição existente
   * @param competitionId ID da competição
   * @param data Dados atualizados
   * @returns Competição atualizada
   */
  static async updateCompetition(competitionId: string, data: Partial<CompetitionFormData>): Promise<Competition> {
    // Criar objeto completo para mapeamento
    const fullData = {
      titulo: data.titulo || '',
      disciplina_id: data.disciplina_id || '',
      dataInicio: data.dataInicio || new Date(),
      dataFim: data.dataFim || new Date(),
      duracao: data.duracao || 0,
      maxParticipantes: data.maxParticipantes || 0,
      recompensas: data.recompensas || { ouro: 0, prata: 0, bronze: 0, participacao: 0 },
      turmas: data.turmas || [],
      questoes: data.questoes || [],
      modo_selecao: data.modo_selecao || 'manual',
      quantidade_questoes: data.quantidade_questoes,
      dificuldades: data.dificuldades,
      serie_id: data.serie_id,
      descricao: data.descricao,
      instrucoes: data.instrucoes,
      icone: data.icone,
      cor: data.cor
    } as CompetitionFormData;

    // Mapear apenas campos que foram fornecidos
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = {};
    const mapped = mapFormDataToBackend(fullData);
    
    // Incluir apenas campos que foram fornecidos no data original
    if (data.titulo !== undefined) payload.title = mapped.title;
    if (data.descricao !== undefined) payload.description = mapped.description;
    if (data.instrucoes !== undefined) payload.instrucoes = mapped.instrucoes;
    if (data.recompensas !== undefined) payload.recompensas = mapped.recompensas;
    if (data.modo_selecao !== undefined) payload.modo_selecao = mapped.modo_selecao;
    if (data.icone !== undefined) payload.icone = mapped.icone;
    if (data.cor !== undefined) payload.cor = mapped.cor;
    if (data.dificuldades !== undefined) payload.dificuldade = mapped.dificuldade;
    if (data.duracao !== undefined) payload.duration = mapped.duration;
    if (data.dataInicio !== undefined) payload.time_limit = mapped.time_limit;
    if (data.dataFim !== undefined) payload.end_time = mapped.end_time;
    if (data.maxParticipantes !== undefined) payload.max_participantes = mapped.max_participantes;
    if (data.disciplina_id !== undefined) payload.subject = mapped.subject;
    if (data.serie_id !== undefined) payload.grade_id = mapped.grade_id;
    if (data.questoes !== undefined) payload.questions = mapped.questions;
    if (data.turmas !== undefined) payload.classes = mapped.classes;
    if (data.quantidade_questoes !== undefined) payload.quantidade_questoes = mapped.quantidade_questoes;

    const response = await api.put<ApiResponse<{ id: string }>>(`/competitions/${competitionId}`, payload);
    
    // Buscar a competição atualizada para retornar dados completos
    return this.getCompetitionById(competitionId);
  }

  /**
   * Excluir competição
   * @param competitionId ID da competição
   * @returns Sucesso da operação
   */
  static async deleteCompetition(competitionId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete<ApiResponse<null> | { mensagem: string }>(`/competitions/${competitionId}`);
    
    // Extrair mensagem do wrapper ou resposta direta
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mensagem = (response.data as any)?.mensagem || (response.data as any)?.message || 'Competição excluída com sucesso';
    
    return {
      success: true,
      message: mensagem
    };
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
          'Abaixo do Básico': ['abaixo do básico', 'abaixo do basico', 'below basic', 'abaixo'],
          'Básico': ['básico', 'basico', 'basic', 'fácil', 'facil', 'easy', 'baixa', 'low'],
          'Adequado': ['adequado', 'adequada', 'adequate', 'médio', 'medio', 'medium', 'média', 'normal', 'intermediário', 'intermediario'],
          'Avançado': ['avançado', 'avancado', 'advanced', 'difícil', 'dificil', 'hard', 'alta', 'high']
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
          if (!qDiff && params.dificuldades && params.dificuldades.length === 4) return true;
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
    try {
      // Mapear filtros do frontend para backend
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const backendFilters: any = {};
      if (filters?.status) backendFilters.status = filters.status;
      if (filters?.disciplina_id) backendFilters.subject_id = filters.disciplina_id;
      if (filters?.escola_id) backendFilters.school_id = filters.escola_id;
      if (filters?.municipio_id) backendFilters.municipio_id = filters.municipio_id;
      if (filters?.estado_id) backendFilters.estado_id = filters.estado_id;
      if (filters?.data_inicio_from) backendFilters.data_inicio_from = filters.data_inicio_from;
      if (filters?.data_inicio_to) backendFilters.data_inicio_to = filters.data_inicio_to;

      const response = await api.get<Competition[]>('/competitions/', { params: backendFilters });
      
      // Mapear cada competição do backend para frontend
      const competitions = Array.isArray(response.data) ? response.data : [];
      return competitions.map(mapBackendToFrontend);
    } catch (error: unknown) {
      // ✅ MELHORADO: Tratar erro 500 como "sem dados" para endpoints de listagem
      // Se o backend retornar 500 quando não há competições, retornar array vazio
      const axiosError = error as { response?: { status?: number; data?: { message?: string } } };
      if (axiosError.response?.status === 500) {
        const errorMessage = axiosError.response?.data?.message || '';
        // Se a mensagem sugerir que não há dados, retornar array vazio
        const isEmptyError = errorMessage.toLowerCase().includes('nenhum') || 
                           errorMessage.toLowerCase().includes('não encontrado') ||
                           errorMessage.toLowerCase().includes('empty') ||
                           errorMessage.toLowerCase().includes('no data') ||
                           errorMessage === '';
        
        if (isEmptyError) {
          console.warn('Backend retornou 500 para listagem de competições. Tratando como "sem dados".');
          return [];
        }
      }
      
      // Para outros erros, relançar
      throw error;
    }
  }

  /**
   * Obter detalhes de uma competição específica
   * @param competitionId ID da competição
   * @returns Detalhes da competição
   */
  static async getCompetitionById(competitionId: string): Promise<Competition> {
    const response = await api.get<Competition>(`/competitions/${competitionId}`);
    return mapBackendToFrontend(response.data);
  }

  /**
   * Finalizar competição manualmente
   * @param competitionId ID da competição
   * @returns Resultado da finalização
   */
  static async finalizeCompetition(competitionId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post<ApiResponse<null> | { mensagem: string }>(`/competitions/${competitionId}/finalize`);
    
    // Extrair mensagem do wrapper ou resposta direta
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mensagem = (response.data as any)?.mensagem || (response.data as any)?.message || 'Competição finalizada com sucesso';
    
    return {
      success: true,
      message: mensagem
    };
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
    // Mapear filtros
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const backendFilters: any = {};
    if (filters?.disciplina) backendFilters.disciplina = filters.disciplina;
    if (filters?.status) backendFilters.status = filters.status;

    const response = await api.get<Competition[]>('/competitions/available', { params: backendFilters });
    
    // Mapear cada competição do backend para frontend
    const competitions = Array.isArray(response.data) ? response.data : [];
    return competitions.map(mapBackendToFrontend);
  }

  /**
   * Verificar status de inscrição do aluno em uma competição
   * @param competitionId ID da competição
   * @returns Status da inscrição
   */
  static async getEnrollmentStatus(competitionId: string): Promise<CompetitionEnrollmentStatus> {
    const response = await api.get<{
      inscrito: boolean;
      status?: string | null;
      enrolled_at?: string;
      enrollment_id?: string;
      can_enroll?: boolean;
      reason?: string;
      has_started?: boolean;
      has_finished?: boolean;
      result?: CompetitionResult;
    }>(`/competitions/${competitionId}/enrollment-status`);
    
    const backendData = response.data;
    
    // Mapear campos do backend para frontend
    return {
      is_enrolled: backendData.inscrito ?? false,
      enrollment_id: backendData.enrollment_id,
      enrolled_at: backendData.enrolled_at,
      can_enroll: backendData.can_enroll ?? !backendData.inscrito,
      reason: backendData.reason,
      has_started: backendData.has_started,
      has_finished: backendData.has_finished,
      result: backendData.result
    };
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
    const response = await api.post<EnrollmentResponse>(`/competitions/${competitionId}/enroll`);
    
    // Extrair dados do wrapper
    const responseData = extractDataFromResponse<{ enrollment_id?: string }>(response.data);
    
    // Verificar se já estava inscrito (código 200) ou nova inscrição (código 201)
    const isSuccess = response.status === 200 || response.status === 201;
    
    return {
      success: isSuccess,
      message: response.data.mensagem || response.data.message || (isSuccess ? 'Inscrição realizada com sucesso' : 'Erro na inscrição'),
      enrollment_id: responseData.enrollment_id
    };
  }

  /**
   * Cancelar inscrição do aluno
   * @param competitionId ID da competição
   * @returns Resultado do cancelamento
   */
  static async cancelEnrollment(competitionId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete<ApiResponse<null> | { mensagem: string }>(`/competitions/${competitionId}/enroll`);
    
    // Extrair mensagem do wrapper ou resposta direta
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mensagem = (response.data as any)?.mensagem || (response.data as any)?.message || 'Inscrição cancelada com sucesso';
    
    return {
      success: true,
      message: mensagem
    };
  }

  /**
   * Verificar se o aluno pode iniciar a competição
   * @param competitionId ID da competição
   * @returns Dados de permissão para iniciar
   */
  static async canStartCompetition(competitionId: string): Promise<CanStartResponse> {
    const response = await api.get<CanStartResponse>(`/competitions/${competitionId}/can-start`);
    return mapCanStartResponse(response.data);
  }

  /**
   * Iniciar competição (criar sessão)
   * @param competitionId ID da competição
   * @returns Dados da sessão iniciada com questões
   */
  static async startCompetition(competitionId: string): Promise<CompetitionSession> {
    const response = await api.post<ApiResponse<{
      session_id: string;
      started_at: string;
      time_limit_minutes: number;
      questions: CompetitionQuestion[];
    }>>(`/competitions/${competitionId}/start`);
    
    // Extrair dados do wrapper
    const backendData = extractDataFromResponse<{
      session_id: string;
      started_at: string;
      time_limit_minutes: number;
      questions: CompetitionQuestion[];
    }>(response.data);
    
    // Calcular expires_at baseado em started_at e time_limit_minutes
    const startedAt = new Date(backendData.started_at);
    const expiresAt = new Date(startedAt.getTime() + backendData.time_limit_minutes * 60 * 1000);
    
    // Calcular remaining_time_minutes
    const now = new Date();
    const remainingMs = expiresAt.getTime() - now.getTime();
    const remainingMinutes = Math.max(0, Math.floor(remainingMs / (60 * 1000)));
    
    // Mapear questões do backend para frontend
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mappedQuestions = backendData.questions.map((q: any) => {
      // Backend pode retornar 'number' ou 'numero', 'text' ou 'texto', etc.
      const question: CompetitionQuestion = {
        id: q.id,
        numero: q.numero || q.number || 0,
        texto: q.texto || q.text || '',
        texto_formatado: q.texto_formatado || q.formatted_text,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        alternativas: (q.alternativas || q.alternatives || []).map((alt: any) => ({
          id: alt.id || alt.letra || '',
          letra: alt.letra || alt.id || '',
          texto: alt.texto || alt.text || '',
          is_correct: alt.is_correct
        })),
        disciplina: q.disciplina,
        habilidade: q.habilidade,
        codigo_habilidade: q.codigo_habilidade,
        dificuldade: q.dificuldade,
        valor: q.valor,
        imagem_url: q.imagem_url
      };
      return question;
    });
    
    // Mapear para CompetitionSession
    const session: CompetitionSession = {
      session_id: backendData.session_id,
      competition_id: competitionId,
      student_id: '', // Será preenchido pelo backend ou contexto
      started_at: backendData.started_at,
      expires_at: expiresAt.toISOString(),
      time_limit_minutes: backendData.time_limit_minutes,
      remaining_time_minutes: remainingMinutes,
      questions: mappedQuestions,
      total_questions: mappedQuestions.length,
      current_answers: {}
    };
    
    return session;
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
    const response = await api.post<ApiResponse<{
      result_id?: string;
      grade: number;
      proficiency?: number;
      classification?: string;
      correct_answers: number;
      total_questions: number;
      ranking_position?: number;
      total_participants?: number;
      coins_earned?: number;
      wrong_answers?: number;
      blank_answers?: number;
      time_spent?: number;
    }>>('/competitions/submit', {
      session_id: data.session_id,
      answers: data.answers
    });
    
    // Extrair dados do wrapper
    const backendData = extractDataFromResponse<{
      result_id?: string;
      grade: number;
      proficiency?: number;
      classification?: string;
      correct_answers: number;
      total_questions: number;
      ranking_position?: number;
      total_participants?: number;
      coins_earned?: number;
      wrong_answers?: number;
      blank_answers?: number;
      time_spent?: number;
    }>(response.data);
    
    // Calcular campos derivados
    const totalQuestions = backendData.total_questions;
    const correctAnswers = backendData.correct_answers;
    const wrongAnswers = backendData.wrong_answers || 0;
    const blankAnswers = backendData.blank_answers || (totalQuestions - correctAnswers - wrongAnswers);
    
    // Mapear para CompetitionSubmitResponse
    const result: CompetitionSubmitResponse = {
      success: true,
      score: backendData.grade,
      proficiencia: backendData.proficiency,
      ranking_position: backendData.ranking_position || 0,
      total_participants: backendData.total_participants || 0,
      coins_earned: backendData.coins_earned || 0,
      correct_answers: correctAnswers,
      wrong_answers: wrongAnswers,
      blank_answers: blankAnswers,
      total_questions: totalQuestions,
      time_spent: backendData.time_spent || data.time_spent,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      classificacao: (backendData.classification as any) || undefined
    };
    
    return result;
  }

  /**
   * Obter resultado individual do aluno em uma competição
   * @param competitionId ID da competição
   * @returns Resultado do aluno
   */
  static async getMyResult(competitionId: string): Promise<CompetitionResult | null> {
    try {
      const response = await api.get<ApiResponse<CompetitionResult> | { mensagem: string; data: null }>(`/competitions/${competitionId}/my-result`);
      
      // Se resposta tem wrapper e data é null, retornar null
      if (response.data && typeof response.data === 'object' && 'data' in response.data) {
        const wrapped = response.data as ApiResponse<CompetitionResult>;
        if (wrapped.data === null) {
          return null;
        }
        return wrapped.data;
      }
      
      // Se resposta é null, retornar null
      if (!response.data) {
        return null;
      }
      
      // Extrair dados do wrapper ou retornar direto
      return extractDataFromResponse<CompetitionResult>(response.data);
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
    // Mapear filtros do frontend para backend
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const backendFilters: any = {};
    if (filters?.escola_id) backendFilters.escola_id = filters.escola_id;
    if (filters?.turma_id) backendFilters.turma_id = filters.turma_id;
    if (filters?.serie_id) backendFilters.serie_id = filters.serie_id;
    if (filters?.municipio_id) backendFilters.municipio_id = filters.municipio_id;
    if (filters?.estado_id) backendFilters.estado_id = filters.estado_id;

    const response = await api.get<CompetitionResultsResponse>(`/competitions/${competitionId}/results`, { 
      params: backendFilters 
    });
    
    // A resposta pode vir no formato documentado (disciplinas/geral) ou no formato antigo
    // Retornar como está, pois o tipo suporta ambos
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

