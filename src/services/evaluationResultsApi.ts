import { api, apiWithRetry, apiWithTimeout } from '@/lib/api';
import { EvaluationResultsData, StudentProficiency, ResultsFilters, calculateProficiency, RelatorioCompleto } from '@/types/evaluation-results';

// ===== INTERFACES PARA BACKEND REAL =====

// ✅ NOVO: Interfaces para a nova estrutura de resposta em cascata
interface FiltrosAplicados {
  estado: string;
  municipio: string;
  escola: string | null;
  serie: string | null;
  turma: string | null;
  avaliacao: string;
}

interface EstatisticasGerais {
  tipo: 'municipio' | 'escola' | 'serie' | 'turma' | 'avaliacao';
  nome: string;
  estado: string;
  municipio?: string;
  escola?: string;
  serie?: string;
  total_escolas?: number;
  total_series?: number;
  total_turmas?: number;
  total_avaliacoes: number;
  total_alunos: number;
  alunos_participantes: number;
  alunos_pendentes: number;
  alunos_ausentes: number;
  media_nota_geral: number;
  media_proficiencia_geral: number;
  distribuicao_classificacao_geral: {
    abaixo_do_basico: number;
    basico: number;
    adequado: number;
    avancado: number;
  };
}

interface OpcoesProximosFiltros {
  avaliacoes?: Array<{ id: string; titulo: string }>;
  escolas?: Array<{ id: string; name: string }>;
  series?: Array<{ id: string; name: string }>;
  turmas?: Array<{ id: string; name: string }>;
  maximo_alcancado?: boolean;
}

// ✅ NOVO: Interfaces para tabela detalhada
interface TabelaDetalhada {
  disciplinas: Array<{
    id: string;
    nome: string;
    questoes: Array<{
      numero: number;
      habilidade: string;
      codigo_habilidade: string;
      question_id: string;
    }>;
    alunos: Array<{
      id: string;
      nome: string;
      escola: string;
      serie: string;
      turma: string;
      respostas_por_questao: Array<{
        questao: number;
        acertou: boolean;
        respondeu: boolean;
        resposta: string;
      }>;
      total_acertos: number;
      total_erros: number;
      total_respondidas: number;
      total_questoes_disciplina: number;
      nivel_proficiencia: string;
      nota: number;
      proficiencia: number;
    }>;
  }>;
}

// ✅ NOVO: Interface para ranking
export interface RankingItem {
  posicao: number;
  aluno_id: string;
  nome: string;
  escola: string;
  serie: string;
  turma: string;
  nota_geral: number;
  proficiencia_geral: number;
  classificacao_geral: string;
  total_acertos: number;
  total_questoes: number;
}

export interface NovaRespostaAPI {
  nivel_granularidade: 'municipio' | 'escola' | 'serie' | 'turma' | 'avaliacao';
  filtros_aplicados: FiltrosAplicados;
  estatisticas_gerais: EstatisticasGerais;
  resultados_por_disciplina: Array<{
    disciplina: string;
    total_avaliacoes: number;
    total_alunos: number;
    alunos_participantes: number;
    alunos_pendentes: number;
    alunos_ausentes: number;
    media_nota: number;
    media_proficiencia: number;
    distribuicao_classificacao: {
      abaixo_do_basico: number;
      basico: number;
      adequado: number;
      avancado: number;
    };
  }>;
  resultados_detalhados: {
    avaliacoes: EvaluationResult[];
    paginacao: {
      page: number;
      per_page: number;
      total: number;
      total_pages: number;
    };
  };
  tabela_detalhada?: TabelaDetalhada;
  ranking?: RankingItem[];
  opcoes_proximos_filtros: OpcoesProximosFiltros;
}

// ✅ NOVO: Interfaces para avaliação por disciplina
interface AvaliacaoPorDisciplina {
  id: string;
  titulo: string;
  disciplina_principal: string;
  curso: string;
  tipo_calculo: string;
}

interface EstatisticasPorDisciplina {
  disciplina: string;
  total_alunos: number;
  alunos_participantes: number;
  alunos_pendentes: number;
  alunos_ausentes: number;
  media_nota: number;
  media_proficiencia: number;
  distribuicao_classificacao: {
    abaixo_do_basico: number;
    basico: number;
    adequado: number;
    avancado: number;
  };
}

interface ResultadosGeraisEDisciplinas {
  avaliacao: AvaliacaoPorDisciplina;
  resultados: {
    estatisticas_gerais: {
      total_alunos: number;
      alunos_participantes: number;
      alunos_pendentes: number;
      alunos_ausentes: number;
      media_nota_geral: number;
      media_proficiencia_geral: number;
      distribuicao_classificacao_geral: {
        abaixo_do_basico: number;
        basico: number;
        adequado: number;
        avancado: number;
      };
    };
    estatisticas_por_disciplina: Record<string, EstatisticasPorDisciplina>;
  };
}

interface ResultadosAlunoPorDisciplina {
  avaliacao: AvaliacaoPorDisciplina;
  aluno: {
    id: string;
    nome: string;
    turma: string;
  };
  resultados: {
    resultados_gerais: {
      proficiencia: number;
      nota: number;
      nivel: string;
      media: number;
      total_acertos: number;
      total_questoes: number;
    };
    resultados_por_disciplina: Record<string, {
      proficiencia: number;
      nota: number;
      nivel: string;
      media: number;
      total_acertos: number;
      total_questoes: number;
    }>;
  };
}

interface DisciplinasAvaliacao {
  avaliacao: AvaliacaoPorDisciplina;
  disciplinas: Array<{
    nome: string;
    total_questoes: number;
    question_ids: string[];
  }>;
  total_disciplinas: number;
}

interface ComparativoDisciplinas {
  avaliacao: AvaliacaoPorDisciplina;
  comparativo_disciplinas: Array<{
    disciplina: string;
    media_nota: number;
    media_proficiencia: number;
    total_alunos: number;
    alunos_participantes: number;
    distribuicao_classificacao: {
      abaixo_do_basico: number;
      basico: number;
      adequado: number;
      avancado: number;
    };
  }>;
  resumo: {
    melhor_disciplina: string;
    pior_disciplina: string;
    diferenca_maior_menor: number;
  };
}

interface BackendEvaluationResult {
  id: string;
  session_id: string;
  test_id: string;
  test_title: string;
  student_id: string;
  student_name: string;
  class_id: string;
  class_name: string;
  school_id: string;
  school_name: string;
  subject_id: string;
  subject_name: string;
  grade_id: string;
  grade_name: string;
  course_id: string;
  course_name: string;
  started_at: string;
  submitted_at: string;
  status: 'completed' | 'pending' | 'in_progress';
  score: number;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  blank_answers: number;
  time_spent: number; // em segundos
  answers: Array<{
    question_id: string;
    question_number: number;
    answer: string;
    is_correct: boolean;
    points_earned: number;
    max_points: number;
  }>;
}

interface BackendStudentResult {
  id: string;
  name: string;
  class: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  blank_answers: number;
  percentage: number;
  proficiency_score: number;
  proficiency_level: string;
  time_spent: number;
  status: 'completed' | 'pending' | 'absent';
  submitted_at: string;
}

interface BackendSubmissionResult {
  session_id: string;
  test_id: string;
  student_id: string;
  status: 'completed' | 'pending';
  score: number;
  percentage: number;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  blank_answers: number;
  time_spent: number;
  submitted_at: string;
  answers: Array<{
    question_id: string;
    answer: string;
    is_correct: boolean;
    points_earned: number;
    max_points: number;
  }>;
}

interface StudentResult {
  id: string;
  nome: string;
  turma: string;
  nota: number;
  grade: string;
  total_score?: number;
  proficiencia: number;
  proficiency?: number;
  classificacao: 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado';
  classification?: string;
  correct_answers?: number;
  questoes_respondidas: number;
  acertos: number;
  erros: number;
  em_branco: number;
  tempo_gasto: number;
  status: 'concluida' | 'pendente';
}

// ===== INTERFACES PARA API DE RESULTADOS =====

interface EvaluationResult {
  id: string;
  titulo: string;
  disciplina: string;
  curso?: string;
  serie?: string;
  turma?: string;
  escola?: string;
  municipio?: string;
  estado?: string;
  data_aplicacao: string;
  status: 'finalized' | 'in_progress' | 'pending' | 'concluida' | 'em_andamento' | 'pendente' | string;
  total_alunos: number;
  alunos_participantes: number;
  alunos_pendentes: number;
  alunos_ausentes: number;
  media_nota: number;
  media_proficiencia: number;
  distribuicao_classificacao: {
    abaixo_do_basico: number;
    basico: number;
    adequado: number;
    avancado: number;
  };
}

interface StudentResult {
  id: string;
  nome: string;
  turma: string;
  nota: number;
  proficiencia: number;
  classificacao: 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado';
  questoes_respondidas: number;
  acertos: number;
  erros: number;
  em_branco: number;
  tempo_gasto: number;
  status: 'concluida' | 'pendente';
}

interface StudentDetailedResult {
  test_id: string;
  student_id: string;
  student_db_id: string;
  student_name?: string; // ✅ Adicionado para exibir o nome do aluno
  total_questions: number;
  answered_questions: number;
  correct_answers: number;
  score_percentage: number;
  total_score: number;
  max_possible_score: number;
  grade: number;
  proficiencia: number;
  classificacao: 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado';
  calculated_at: string;
  status?: 'concluida' | 'nao_respondida';
  answers: Array<{
    question_id: string;
    question_number: number;
    question_text: string;
    question_type: 'multipleChoice' | 'open' | 'trueFalse';
    question_value: number;
    student_answer: string;
    answered_at: string;
    is_correct: boolean;
    score: number;
    feedback: string | null;
    corrected_by: string | null;
    corrected_at: string | null;
  }>;
}

interface DetailedReport {
  avaliacao: {
    id: string;
    titulo: string;
    disciplina: string;
    total_questoes: number;
  };
  questoes: Array<{
    id: string;
    numero: number;
    texto: string;
    habilidade: string;
    codigo_habilidade: string;
    tipo: 'multipleChoice' | 'open' | 'trueFalse';
    dificuldade: 'Fácil' | 'Médio' | 'Difícil';
    porcentagem_acertos: number;
    porcentagem_erros: number;
  }>;
  alunos: Array<{
    id: string;
    nome: string;
    turma: string;
    respostas: Array<{
      questao_id: string;
      questao_numero: number;
      resposta_correta: boolean;
      resposta_em_branco: boolean;
      tempo_gasto: number;
    }>;
    total_acertos: number;
    total_erros: number;
    total_em_branco: number;
    nota_final: number;
    proficiencia: number;
    classificacao: 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado';
    status: 'concluida' | 'nao_respondida';
  }>;
}

// ===== SERVIÇO PRINCIPAL =====

export class EvaluationResultsApiService {

  // ✅ NOVO: Buscar turma e série de um aluno (TEMPORARIAMENTE DESABILITADO)
  // static async getStudentClass(studentId: string): Promise<{
  //   grade: string;
  //   class: string;
  // } | null> {
  //   try {
  //     const response = await api.get(`/students/${studentId}/class`);
  //     return response.data;
  //   } catch (error) {
      //     // Erro ao buscar turma e série do aluno
  //     return null;
  //   }
  // }

  // ✅ NOVO: Buscar avaliações de um aluno específico
  static async getStudentEvaluations(studentId: string): Promise<Array<{
    id: string;
    titulo: string;
    data_aplicacao: string;
    disciplina: string;
    serie: string;
    escola: string;
    turma?: string;
  }>> {
    try {
      const response = await api.get(`/evaluation-results/student/${studentId}/evaluations`);
      return response.data || [];
    } catch (error) {
      // Erro ao buscar avaliações do aluno
      return [];
    }
  }

  // ✅ NOVO: Buscar avaliações por escola
  static async getEvaluationsBySchool(schoolId: string): Promise<Array<{
    id: string;
    titulo: string;
    disciplina: string;
    status: string;
    data_aplicacao: string;
  }> | null> {
    try {
      const response = await api.get(`/test?school_id=${schoolId}`);

      // ✅ CORREÇÃO: Extrair o array data da resposta
      const evaluationsData = response.data.data || response.data;

      if (!Array.isArray(evaluationsData)) {
        // ERRO: evaluationsData não é um array
        return [];
      }

      // ✅ CORREÇÃO: Mapear os campos corretos do backend
      const mappedEvaluations = evaluationsData.map((evaluation: Record<string, unknown>) => ({
        id: String(evaluation.id || ''),
        titulo: String(evaluation.title || evaluation.titulo || 'Sem título'),
        disciplina: String((evaluation.subject as Record<string, unknown>)?.name || evaluation.disciplina || 'Sem disciplina'),
        status: String(evaluation.status || 'desconhecido'),
        data_aplicacao: String(evaluation.createdAt || evaluation.data_aplicacao || new Date().toISOString())
      }));

      return mappedEvaluations;
    } catch (error) {
              // ERRO ao buscar avaliações da escola
      return [];
    }
  }



  static async getEvaluationsList(
    page: number = 1,
    perPage: number = 10,
    filters: {
      estado?: string;
      municipio?: string;
      escola?: string;
      serie?: string;
      turma?: string;
      avaliacao?: string;
    } = {}
  ): Promise<NovaRespostaAPI | null> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
      });

      // ✅ NOVO: Ordem hierárquica dos filtros - Estado e Município obrigatórios, outros podem ser "all"
      if (filters.estado && filters.estado !== 'all') {
        params.append('estado', filters.estado);
      }
      if (filters.municipio && filters.municipio !== 'all') {
        params.append('municipio', filters.municipio);
      }
      // ✅ NOVO: Avaliação, Escola, Série e Turma: não enviar quando forem "all"
      if (filters.avaliacao && filters.avaliacao !== 'all') {
        params.append('avaliacao', filters.avaliacao);
      }
      if (filters.escola && filters.escola !== 'all') {
        params.append('escola', filters.escola);
      }
      if (filters.serie && filters.serie !== 'all') {
        params.append('serie', filters.serie);
      }
      if (filters.turma && filters.turma !== 'all') {
        params.append('turma', filters.turma);
      }

      const response = await api.get(`/evaluation-results/avaliacoes?${params}`);

      // ✅ LOG: Mostrar o que está sendo retornado do backend
              // Log removido - resposta da API

      return response.data;
    } catch (error: any) {
              // Erro ao buscar avaliações
      
      // ✅ NOVO: Tratamento específico de erros da API
      if (error.response?.status === 400) {
        const errorMessage = error.response.data?.error || 'Erro de validação';
                  // Erro 400 - Validação
        
        // Log específico para diferentes tipos de erro 400
        if (errorMessage.includes('Estado')) {
          // Estado é obrigatório e não pode ser "all"
        } else if (errorMessage.includes('Município')) {
                      // Município é obrigatório
        } else if (errorMessage.includes('filtros válidos')) {
                      // É necessário aplicar pelo menos 2 filtros válidos (excluindo "all")
        }
      } else if (error.response?.status === 403) {
        const errorMessage = error.response.data?.error || 'Acesso negado';
                  // Erro 403 - Permissão
        
        if (errorMessage.includes('município')) {
                      // Acesso negado a este município
        }
      } else if (error.response?.status === 404) {
                  // Erro 404 - Endpoint não encontrado
      } else if (error.response?.status >= 500) {
                  // Erro 500+ - Erro interno do servidor
      }
      
      // Retornar null para manter compatibilidade, mas com logs detalhados
      return null;
    }
  }

  // Buscar avaliação específica por ID
  static async getEvaluationById(evaluationId: string): Promise<EvaluationResult | null> {
    return apiWithTimeout(async () => {
      const response = await api.get(`/evaluation-results/avaliacoes/${evaluationId}`);
      return response.data;
    }, 20000); // 20s para dados básicos
  }

  // ✅ NOVO: Buscar avaliação (rota de teste) que retorna subjects_info processado
  static async getTestEvaluationById<T = { subjects_info?: Array<{ id?: string; name?: string }> }>(evaluationId: string): Promise<T | null> {
    try {
      // Tentar primeiro o endpoint /test/{id} (CORRIGIDO: endpoint correto)
      const response = await api.get(`/test/${evaluationId}`);
              // Sucesso com /test/{id}
      return response.data as T;
    } catch (error) {
              // Falha ao buscar /test/{id}, tentando /test/{id}/details
      try {
        // Tentar o endpoint /test/{id}/details como alternativa
        const response = await api.get(`/test/${evaluationId}/details`);
                  // Sucesso com /test/{id}/details
        return response.data as T;
      } catch (error2) {
                  // Falha ao buscar /test/{id}/details, usando fallback /evaluation-results/avaliacoes
        try {
          // Fallback para o endpoint antigo
          const fallback = await api.get(`/evaluation-results/avaliacoes/${evaluationId}`);
                      // Usando fallback /evaluation-results/avaliacoes
          return fallback.data as T;
        } catch {
                      // Todos os endpoints falharam para buscar subjects_info
          return null;
        }
      }
    }
  }

  // Verificar e atualizar status da avaliação
  static async checkEvaluationStatus(evaluationId: string): Promise<{
    success: boolean;
    message: string;
    status?: string;
  }> {
    try {
      const response = await api.post(`/evaluation-results/avaliacoes/${evaluationId}/verificar-status`);
      return response.data;
    } catch (error) {
              // Erro ao verificar status da avaliação
      return {
        success: false,
        message: 'Erro ao verificar status da avaliação'
      };
    }
  }

  // Obter resumo de status da avaliação
  static async getEvaluationStatusSummary(evaluationId: string): Promise<{
    total_alunos: number;
    alunos_participantes: number;
    alunos_ausentes: number;
    alunos_pendentes: number;
    participation_rate: number;
    completion_rate: number;
    average_score: number;
    average_proficiency: number;
    overall_status: string;
  } | null> {
    try {
      const response = await api.get(`/evaluation-results/avaliacoes/${evaluationId}/status-resumo`);
      return response.data;
    } catch (error) {
              // Erro ao obter resumo de status da avaliação
      return null;
    }
  }

  // ✅ NOVA: Obter opções de filtros para uma avaliação específica
  static async getFilterOptionsForEvaluation(evaluationId: string): Promise<{
    subjects: string[];
    grades: Array<{ id: string; name: string }>;
    classes: string[];
    levels: string[];
  } | null> {
    try {
      const response = await api.get(`/evaluation-results/opcoes-filtros/${evaluationId}`);
      return response.data;
    } catch (error) {
              // Erro ao obter opções de filtros da avaliação
      return null;
    }
  }

  // Buscar alunos de uma avaliação específica
  static async getStudentsByEvaluation(evaluationId: string): Promise<StudentResult[]> {
    return apiWithTimeout(async () => {
      const response = await api.get(`/evaluation-results/alunos?avaliacao_id=${evaluationId}`);
      return response.data.data || [];
    }, 25000); // 25s para lista de alunos
  }

  // ✅ NOVO: Método para buscar dados corretos usando o endpoint específico
  static async getCorrectStudentResults(evaluationId: string): Promise<{
    alunos: Array<{
      id: string;
      nome: string;
      turma: string;
      acertos: number;
      erros: number;
      em_branco: number;
      nota: number;
      proficiencia: number;
      classificacao: 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado';
      status: 'concluida' | 'pendente';
      respostas: Array<{
        questao: number;
        resposta: string;
        correta: boolean;
        em_branco: boolean;
      }>;
    }>;
    questoes: Array<{
      numero: number;
      porcentagem_acertos: number;
    }>;
  } | null> {
    return apiWithTimeout(async () => {
      // ✅ Usar o endpoint específico que retorna os dados corretos
      const response = await api.get(`/evaluation-results/alunos?avaliacao_id=${evaluationId}`);

              // Dados corretos recebidos do endpoint

      return response.data;
    }, 25000); // 25s para lista de alunos
  }

  // Buscar resultados detalhados de um aluno específico
  static async getStudentDetailedResults(testId: string, studentId: string, includeAnswers: boolean = false): Promise<StudentDetailedResult | null> {
    try {
      const params = includeAnswers ? { include_answers: 'true' } : {};
      const response = await api.get(`/evaluation-results/${testId}/student/${studentId}/results`, { params });
      return response.data;
    } catch (error: unknown) {
      // Se o erro contém dados da resposta (aluno não respondeu), retornar os dados
      const errorResponse = error as { response?: { data?: Record<string, unknown> } };
      const errorData = errorResponse?.response?.data;
      if (errorData && errorData.test_id) {
        return {
          test_id: String(errorData.test_id),
          student_id: String(errorData.student_id),
          student_db_id: String(errorData.student_db_id),
          total_questions: Number(errorData.total_questions),
          answered_questions: Number(errorData.answered_questions),
          correct_answers: Number(errorData.correct_answers),
          score_percentage: Number(errorData.score_percentage),
          total_score: Number(errorData.total_score),
          max_possible_score: Number(errorData.max_possible_score),
          grade: Number(errorData.grade) || 0,
          proficiencia: Number(errorData.proficiencia) || 0,
          classificacao: (String(errorData.classificacao) as 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado') || 'Abaixo do Básico',
          calculated_at: String(errorData.calculated_at) || new Date().toISOString(),
          status: (String(errorData.status) as 'concluida' | 'nao_respondida'),
          answers: []
        };
      }

      return null;
    }
  }

  // Buscar relatório detalhado de uma avaliação
  static async getDetailedReport(evaluationId: string): Promise<DetailedReport | null> {
    return apiWithRetry(async () => {
      const response = await api.get(`/evaluation-results/relatorio-detalhado/${evaluationId}`);
      return response.data;
    }, 2, 2000, 90000); // 2 retries, 2s delay, max 90s timeout
  }

  // Buscar resultados das sessões de teste
  static async getEvaluations(filters: ResultsFilters = {}, page = 1, perPage = 10): Promise<{
    results: EvaluationResultsData[];
    total: number;
    page: number;
    totalPages: number;
    isBackendConnected: boolean;
  }> {
    try {
      // Construir parâmetros para a API
      const params: any = {
        page,
        per_page: perPage
      };

      if (filters.course) params.course = filters.course;
      if (filters.subject) params.subject = filters.subject;
      if (filters.class) params.class_id = filters.class;
      if (filters.school) params.school_id = filters.school;
      if (filters.status && filters.status.length > 0) params.status = filters.status.join(',');
      if (filters.dateRange?.start) params.start_date = filters.dateRange.start;
      if (filters.dateRange?.end) params.end_date = filters.dateRange.end;

      // Buscar sessões de teste completadas
      const response = await api.get('/test-sessions/results', { params });

      if (!response.data || !Array.isArray(response.data.sessions)) {
        throw new Error('Resposta da API não possui estrutura esperada');
      }

      // Transformar dados da API para o formato esperado
      const sessions: BackendEvaluationResult[] = response.data.sessions;
      const results = await this.transformSessionsToResults(sessions);

      return {
        results,
        total: response.data.total || results.length,
        page: response.data.page || page,
        totalPages: response.data.total_pages || Math.ceil(results.length / perPage),
        isBackendConnected: true
      };
    } catch (error) {
              // Erro ao buscar avaliações
      return {
        results: [],
        total: 0,
        page,
        totalPages: 0,
        isBackendConnected: false
      };
    }
  }

  // Transformar sessões em resultados agrupados
  private static async transformSessionsToResults(sessions: BackendEvaluationResult[]): Promise<EvaluationResultsData[]> {
    // Agrupar sessões por teste
    const groupedByTest = sessions.reduce((acc, session) => {
      if (!acc[session.test_id]) {
        acc[session.test_id] = [];
      }
      acc[session.test_id].push(session);
      return acc;
    }, {} as Record<string, BackendEvaluationResult[]>);

    const results: EvaluationResultsData[] = [];

    for (const [testId, testSessions] of Object.entries(groupedByTest)) {
      const firstSession = testSessions[0];

      // Calcular estatísticas agregadas
      const completedSessions = testSessions.filter(s => s.status === 'completed');
      const totalStudents = testSessions.length;
      const completedStudents = completedSessions.length;
      const averageScore = completedSessions.length > 0
        ? completedSessions.reduce((sum, s) => sum + s.score, 0) / completedSessions.length
        : 0;

      // Calcular distribuição por proficiência
      const distribution = {
        abaixo_do_basico: 0,
        basico: 0,
        adequado: 0,
        avancado: 0
      };

      const studentsData: StudentProficiency[] = completedSessions.map(session => {
        // Calcular proficiência usando a função oficial
        const proficiencyResult = calculateProficiency(
          session.score,
          session.total_questions,
          firstSession.grade_name,
          firstSession.subject_name,
          firstSession.course_name
        );

        // Incrementar distribuição
        distribution[proficiencyResult.proficiencyLevel]++;

        return {
          studentId: session.student_id,
          studentName: session.student_name,
          studentClass: session.class_name,
          rawScore: session.score,
          proficiencyScore: proficiencyResult.proficiencyScore,
          proficiencyLevel: proficiencyResult.proficiencyLevel,
          classification: proficiencyResult.classification,
          answeredQuestions: session.total_questions - session.blank_answers,
          correctAnswers: session.correct_answers,
          wrongAnswers: session.wrong_answers,
          blankAnswers: session.blank_answers,
          timeSpent: Math.floor(session.time_spent / 60), // converter para minutos
          status: session.status === 'completed' ? 'completed' : 'pending'
        };
      });

      const averageProficiency = studentsData.length > 0
        ? studentsData.reduce((sum, s) => sum + s.proficiencyScore, 0) / studentsData.length
        : 0;

      const result: EvaluationResultsData = {
        id: testId,
        evaluationId: testId,
        evaluationTitle: firstSession.test_title,
        subject: firstSession.subject_name,
        subjectId: firstSession.subject_id,
        course: firstSession.course_name,
        courseId: firstSession.course_id,
        grade: firstSession.grade_name,
        gradeId: firstSession.grade_id,
        school: firstSession.school_name,
        schoolId: firstSession.school_id,
        municipality: "São Paulo", // TODO: buscar do backend
        municipalityId: "sp-capital",
        appliedAt: firstSession.started_at,
        correctedAt: completedSessions.length > 0 ? completedSessions[0].submitted_at : undefined,
        status: completedStudents === totalStudents ? 'completed' :
          completedStudents > 0 ? 'in_progress' : 'pending',
        totalStudents,
        completedStudents,
        pendingStudents: totalStudents - completedStudents,
        absentStudents: 0, // TODO: implementar lógica de ausentes
        averageRawScore: averageScore,
        averageProficiency,
        distributionByLevel: distribution,
        classesPerformance: [],
        studentsData
      };

      results.push(result);
    }

    return results;
  }

  // Buscar alunos de uma avaliação específica
  static async getStudents(evaluationId: string, filters: ResultsFilters = {}): Promise<StudentProficiency[]> {
    try {
      const params: any = { test_id: evaluationId };
      if (filters.class) params.class_id = filters.class;
      if (filters.proficiencyRange) {
        params.proficiency_min = filters.proficiencyRange[0];
        params.proficiency_max = filters.proficiencyRange[1];
      }
      if (filters.scoreRange) {
        params.score_min = filters.scoreRange[0];
        params.score_max = filters.scoreRange[1];
      }

      const response = await api.get('/test-sessions/students', { params });

      if (!response.data || !Array.isArray(response.data.students)) {
        return [];
      }

      const students: BackendStudentResult[] = response.data.students;

      return students.map(student => ({
        studentId: student.id,
        studentName: student.name,
        studentClass: student.class,
        rawScore: student.score,
        proficiencyScore: student.proficiency_score,
        proficiencyLevel: this.mapProficiencyLevel(student.proficiency_level),
        classification: student.proficiency_level,
        answeredQuestions: student.total_questions - student.blank_answers,
        correctAnswers: student.correct_answers,
        wrongAnswers: student.wrong_answers,
        blankAnswers: student.blank_answers,
        timeSpent: Math.floor(student.time_spent / 60),
        status: student.status === 'completed' ? 'completed' : 'pending'
      }));
    } catch (error) {
              // Erro ao buscar alunos
      return [];
    }
  }

  // Recalcular avaliação
  static async recalculateEvaluation(evaluationId: string): Promise<{
    success: boolean;
    message: string;
    dados_atualizados: any;
  }> {
    try {
      // ✅ CORRIGIDO: Usar a rota correta da API do backend
      const response = await api.post('/evaluation-results/avaliacoes/calcular', {
        avaliacao_id: evaluationId
      });

      return {
        success: true,
        message: 'Avaliação recalculada com sucesso!',
        dados_atualizados: response.data
      };
    } catch (error: any) {
              // Erro ao recalcular avaliação
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao recalcular avaliação',
        dados_atualizados: null
      };
    }
  }

  // Buscar avaliações enviadas para correção
  static async getSubmissionsForCorrection(evaluationId: string): Promise<BackendSubmissionResult[]> {
    // ✅ CORRIGIDO: Usar a rota correta da API do backend
    const response = await api.get(`/evaluation-results/admin/submitted-evaluations`, {
      params: {
        test_id: evaluationId,
        status: 'pending'
      }
    });
    return response.data.data || [];
  }

  // Corrigir submissão
  static async correctSubmission(sessionId: string, corrections: any): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // ✅ CORRIGIDO: Usar a rota correta da API do backend
      const response = await api.patch(`/evaluation-results/admin/evaluations/${sessionId}/correct`, corrections);

      return {
        success: true,
        message: 'Correção aplicada com sucesso!'
      };
    } catch (error: any) {
              // Erro ao corrigir submissão
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao aplicar correção'
      };
    }
  }

  // Mapear nível de proficiência
  private static mapProficiencyLevel(level: string): 'abaixo_do_basico' | 'basico' | 'adequado' | 'avancado' {
    const normalized = level.toLowerCase().replace(/\s+/g, '_');

    if (normalized.includes('abaixo') || normalized.includes('below')) {
      return 'abaixo_do_basico';
    }
    if (normalized.includes('basico') || normalized.includes('basic')) {
      return 'basico';
    }
    if (normalized.includes('adequado') || normalized.includes('adequate')) {
      return 'adequado';
    }
    if (normalized.includes('avancado') || normalized.includes('advanced')) {
      return 'avancado';
    }

    return 'basico';
  }

  // ✅ NOVO: Buscar estados
  static async getStates(): Promise<Array<{
    id: string;
    name: string;
    uf: string;
  }>> {
    try {
      const response = await api.get('/city/states');
      return response.data || [];
    } catch (error) {
              // Erro ao buscar estados
      return [];
    }
  }

  // ✅ NOVO: Buscar municípios por estado
  static async getMunicipalitiesByState(state: string): Promise<Array<{
    id: string;
    name: string;
    state: string;
    created_at: string;
  }>> {
    try {
      const response = await api.get(`/city/municipalities/state/${state}`);
      return response.data || [];
    } catch (error) {
              // Erro ao buscar municípios
      return [];
    }
  }

  // ✅ NOVO: Buscar escolas por município
  static async getSchoolsByCity(cityId: string): Promise<Array<{
    id: string;
    name: string;
    city: {
      id: string;
      name: string;
      state: string;
    };
    students_count: number;
    classes_count: number;
  }>> {
    try {
      const response = await api.get(`/school/city/${cityId}`);
      return response.data || [];
    } catch (error) {
              // Erro ao buscar escolas
      return [];
    }
  }

  // ✅ NOVO: Buscar séries
  static async getGrades(): Promise<Array<{
    id: string;
    name: string;
    education_stage_id: string;
    education_stage: {
      id: string;
      name: string;
    };
  }>> {
    try {
      const response = await api.get('/grades');
      return response.data || [];
    } catch (error) {
              // Erro ao buscar séries
      return [];
    }
  }

  // ✅ NOVO: Buscar turmas por escola
  static async getClassesBySchool(schoolId: string): Promise<Array<{
    id: string;
    name: string;
    school: {
      id: string;
      name: string;
    };
    grade: {
      id: string;
      name: string;
    };
  }>> {
    try {
      const response = await api.get(`/classes/school/${schoolId}`);
      return response.data || [];
    } catch (error) {
              // Erro ao buscar turmas
      return [];
    }
  }

  // ✅ NOVO: Buscar turmas filtradas
  static async getFilteredClasses(filters: {
    municipality_id?: string;
    school_id?: string;
    grade_id?: string;
  }): Promise<Array<{
    id: string;
    name: string;
    school: {
      id: string;
      name: string;
    };
    grade: {
      id: string;
      name: string;
    };
  }>> {
    try {
      const params = new URLSearchParams();
      if (filters.municipality_id) params.append('municipality_id', filters.municipality_id);
      if (filters.school_id) params.append('school_id', filters.school_id);
      if (filters.grade_id) params.append('grade_id', filters.grade_id);

      const response = await api.get(`/classes/filtered?${params}`);
      return response.data || [];
    } catch (error) {
              // Erro ao buscar turmas filtradas
      return [];
    }
  }

  // ✅ NOVO: Buscar etapas educacionais
  static async getEducationStages(): Promise<Array<{
    id: string;
    name: string;
  }>> {
    try {
      const response = await api.get('/courses');
      return response.data || [];
    } catch (error) {
              // Erro ao buscar etapas educacionais
      return [];
    }
  }

  // Buscar opções de filtros (mantido para compatibilidade)
  static async getFilterOptions(): Promise<{
    courses: string[];
    subjects: string[];
    classes: string[];
    schools: string[];
  }> {
    try {
      const [coursesRes, subjectsRes, classesRes, schoolsRes] = await Promise.all([
        api.get('/courses').catch(() => ({ data: [] })),
        api.get('/subjects').catch(() => ({ data: [] })),
        api.get('/classes').catch(() => ({ data: [] })),
        api.get('/schools').catch(() => ({ data: [] }))
      ]);

      return {
        courses: Array.isArray(coursesRes.data) ? coursesRes.data.map((c: any) => c.name || c.nome) : [],
        subjects: Array.isArray(subjectsRes.data) ? subjectsRes.data.map((s: any) => s.name || s.nome) : [],
        classes: Array.isArray(classesRes.data) ? classesRes.data.map((c: any) => c.name || c.nome) : [],
        schools: Array.isArray(schoolsRes.data) ? schoolsRes.data.map((s: any) => s.name || s.nome) : []
      };

    } catch (error) {
              // Erro ao buscar opções de filtros
      return {
        courses: [],
        subjects: [],
        classes: [],
        schools: []
      };
    }
  }

  // Simular cálculo de proficiência (mantido para compatibilidade)
  // ✅ REMOVIDO: Função mockada de cálculo de proficiência
  // Os cálculos reais devem vir da API

  // ✅ NOVO: Finalizar avaliação
  static async finalizeEvaluation(testId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const response = await api.patch(`/evaluation-results/avaliacoes/${testId}/finalizar`);
      return {
        success: true,
        message: 'Avaliação finalizada com sucesso!'
      };
    } catch (error: any) {
              // Erro ao finalizar avaliação
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao finalizar avaliação'
      };
    }
  }

  // ✅ NOVO: Calcular notas de teste
  static async calculateTestScores(testId: string, studentIds?: string[]): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    try {
      const payload = studentIds ? { student_ids: studentIds } : {};
      const response = await api.post(`/evaluation-results/${testId}/calculate-scores`, payload);
      return {
        success: true,
        message: 'Notas calculadas com sucesso!',
        data: response.data
      };
    } catch (error: any) {
              // Erro ao calcular notas
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao calcular notas'
      };
    }
  }

  // ✅ NOVO: Correção manual
  static async manualCorrection(testId: string, correctionData: {
    student_id: string;
    question_id: string;
    score: number;
    feedback?: string;
    is_correct: boolean;
  }): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const response = await api.post(`/evaluation-results/${testId}/manual-correction`, correctionData);
      return {
        success: true,
        message: 'Correção manual aplicada com sucesso!'
      };
    } catch (error: any) {
              // Erro ao aplicar correção manual
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao aplicar correção manual'
      };
    }
  }

  // ✅ NOVO: Buscar estatísticas gerais
  // REMOVIDO: método antigo duplicado getGeneralStats (use a versão com filtros abaixo)

  // ✅ NOVO: Buscar resultados de aluno específico
  static async getStudentResults(testId: string, studentId: string): Promise<StudentDetailedResult | null> {
    try {
      // ✅ CORRIGIDO: Usar timeout específico para dados de aluno
      return apiWithTimeout(async () => {
        // ✅ CORRIGIDO: Buscar dados básicos primeiro
        const basicResponse = await api.get(`/evaluation-results/${testId}/student/${studentId}/results`);

        // ✅ CORRIGIDO: Buscar respostas detalhadas separadamente
        let detailedAnswers = [];

        try {
          const answersResponse = await api.get(`/evaluation-results/${testId}/student/${studentId}/answers`);
          detailedAnswers = answersResponse.data.answers || answersResponse.data || [];
        } catch (answersError: any) {
          // Se não conseguir buscar respostas detalhadas, continuar com dados básicos
        }

        // ✅ CORRIGIDO: Combinar dados básicos com respostas detalhadas
        const combinedData = {
          ...basicResponse.data,
          answers: detailedAnswers
        };

        return combinedData;
      }, 45000); // 45s para dados completos
    } catch (error: any) {
              // Erro ao buscar resultados do aluno
      throw error;
    }
  }

  // ✅ NOVO: Correção em lote
  static async batchCorrection(testId: string, corrections: any[]): Promise<{
    success: boolean;
    message: string;
    processed: number;
    errors: number;
  }> {
    try {
      const response = await api.post(`/evaluation-results/${testId}/batch-correction`, {
        corrections: corrections
      });
      return {
        success: true,
        message: 'Correção em lote aplicada com sucesso!',
        processed: response.data.processed || 0,
        errors: response.data.errors || 0
      };
    } catch (error: any) {
              // Erro ao aplicar correção em lote
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao aplicar correção em lote',
        processed: 0,
        errors: 0
      };
    }
  }

  // ✅ NOVO: Buscar correções pendentes
  static async getPendingCorrections(testId: string): Promise<BackendSubmissionResult[]> {
    const response = await api.get(`/evaluation-results/${testId}/pending-corrections`);
    return response.data.data || [];
  }

  // ✅ NOVO: Finalizar correção
  static async finishCorrection(evaluationId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const response = await api.patch(`/evaluation-results/admin/evaluations/${evaluationId}/finish`);
      return {
        success: true,
        message: 'Correção finalizada com sucesso!'
      };
    } catch (error: any) {
              // Erro ao finalizar correção
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao finalizar correção'
      };
    }
  }

  // ✅ NOVO: Buscar dados das questões com códigos reais de habilidades
  static async getEvaluationSkills(testId: string): Promise<Array<{
    id: string;
    number: number;
    text: string;
    formattedText: string;
    alternatives?: Array<{
      id: string;
      text: string;
      isCorrect: boolean;
    }>;
    skills: string[]; // ✅ Códigos reais como "LP5L1.2"
    difficulty: 'Fácil' | 'Médio' | 'Difícil';
    solution: string;
    type: 'multipleChoice' | 'open' | 'trueFalse';
    value: number;
    subject: {
      id: string;
      name: string;
    };
    grade: {
      id: string;
      name: string;
    };
  }>> {
    return apiWithRetry(async () => {
      const response = await api.get(`/questions?test_id=${testId}`);
      return response.data;
    }, 2, 2000, 90000);
  }

  // ✅ NOVO: Buscar disciplinas para obter IDs
  static async getSubjects(): Promise<Array<{
    id: string;
    name: string;
    code?: string;
  }>> {
    return apiWithRetry(async () => {
      const response = await api.get('/subjects');
      return response.data;
    }, 2, 2000, 90000);
  }

  // ✅ ATUALIZADO: Buscar skills por disciplina usando ID
  static async getSkillsBySubject(subjectName: string): Promise<Array<{
    id: string;
    code: string; // ✅ Código real como "LP5L1.2"
    description: string;
  }>> {
    return apiWithRetry(async () => {
      // Primeiro, buscar todas as disciplinas
      const subjectsResponse = await api.get('/subjects');
      const subjects = subjectsResponse.data;

      // Encontrar a disciplina pelo nome
      const subject = subjects.find((s: any) =>
        s.name.toLowerCase() === subjectName.toLowerCase() ||
        s.name.toLowerCase().includes(subjectName.toLowerCase()) ||
        subjectName.toLowerCase().includes(s.name.toLowerCase())
      );

      if (!subject) {
        // Disciplina não encontrada
        return [];
      }

              // Disciplina encontrada

      // Buscar skills usando o ID da disciplina
      const skillsResponse = await api.get(`/skills/subject/${subject.id}`);
      return skillsResponse.data;
    }, 2, 2000, 90000);
  }

  // ✅ NOVO: Buscar skills por avaliação (resolve o problema das disciplinas)
  static async getSkillsByEvaluation(testId: string): Promise<Array<{
    id: string | null;
    code: string; // ✅ Código real como "LP5L1.2" ou UUID se não cadastrada
    description: string;
    subject_id: string;
    grade_id: string;
    source: 'database' | 'question'; // ✅ Indica se vem do banco ou da questão
  }>> {
    return apiWithRetry(async () => {
      const response = await api.get(`/skills/evaluation/${testId}`);
      return response.data;
    }, 2, 2000, 90000);
  }

  // ===== NOVAS ROTAS DE FILTROS PROGRESSIVOS =====

  // ✅ MIGRADO: Buscar estados usando nova API unificada com fallback
  static async getFilterStates(): Promise<Array<{
    id: string;
    nome: string;
  }>> {
    try {
      // Fallback: manter endpoint específico pois estados são dados mestres
      const response = await api.get('/evaluation-results/opcoes-filtros/estados');
      return response.data.estados || [];
    } catch (error) {
              // Erro ao buscar estados para filtros
      return [];
    }
  }

  // ✅ MIGRADO: Buscar municípios usando nova API unificada com fallback
  static async getFilterMunicipalities(stateId: string): Promise<Array<{
    id: string;
    nome: string;
  }>> {
    try {
      // Fallback: manter endpoint específico pois municípios são dados mestres
      const response = await api.get(`/evaluation-results/opcoes-filtros/municipios/${stateId}`);
      return response.data.municipios || [];
    } catch (error) {
              // Erro ao buscar municípios para filtros
      return [];
    }
  }

  // ✅ NOVO: Buscar escolas de um município específico
  static async getFilterSchools(municipalityId: string): Promise<Array<{
    id: string;
    nome: string;
  }>> {
    try {
      const response = await api.get(`/evaluation-results/opcoes-filtros/escolas/${municipalityId}`);
      return response.data.escolas || [];
    } catch (error) {
              // Erro ao buscar escolas para filtros
      return [];
    }
  }

  // ✅ NOVO: Buscar séries baseado nos filtros aplicados
  static async getFilterGrades(filters: {
    estado: string;
    municipio?: string;
    escola?: string;
  }): Promise<Array<{
    id: string;
    nome: string;
  }>> {
    try {
      const params = new URLSearchParams();
      params.append('estado', filters.estado);
      if (filters.municipio) params.append('municipio', filters.municipio);
      if (filters.escola) params.append('escola', filters.escola);

      const response = await api.get(`/evaluation-results/opcoes-filtros/series?${params}`);
      return response.data.series || [];
    } catch (error) {
              // Erro ao buscar séries para filtros
      return [];
    }
  }

  // ✅ NOVO: Buscar turmas baseado nos filtros aplicados
  static async getFilterClasses(filters: {
    estado: string;
    municipio?: string;
    escola?: string;
    serie?: string;
  }): Promise<Array<{
    id: string;
    nome: string;
  }>> {
    try {
      const params = new URLSearchParams();
      params.append('estado', filters.estado);
      if (filters.municipio) params.append('municipio', filters.municipio);
      if (filters.escola) params.append('escola', filters.escola);
      if (filters.serie) params.append('serie', filters.serie);

      const response = await api.get(`/evaluation-results/opcoes-filtros/turmas?${params}`);
      return response.data.turmas || [];
    } catch (error) {
              // Erro ao buscar turmas para filtros
      return [];
    }
  }

  // ✅ NOVO: Buscar avaliações baseado nos filtros aplicados
  static async getFilterEvaluations(filters: {
    estado: string;
    municipio: string;
  }): Promise<Array<{
    id: string;
    titulo: string;
  }>> {
    try {
      const params = new URLSearchParams();
      params.append('estado', filters.estado);
      params.append('municipio', filters.municipio);

      const url = `/evaluation-results/opcoes-filtros/avaliacoes?${params}`;
      console.log('🔍 LOG - Requisição para avaliações:');
      console.log('📡 URL:', url);
      console.log('🔧 Filtros enviados:', filters);

      // ✅ MIGRADO: Tentar usar nova API unificada primeiro
      try {
        console.log('🚀 Tentando nova API unificada...');
        const unifiedResponse = await this.getEvaluationsList(1, 100, {
          estado: filters.estado,
          municipio: filters.municipio
        });
        
        if (unifiedResponse?.opcoes_proximos_filtros?.avaliacoes?.length) {
          console.log('✅ Usando nova API - opções de avaliações:', unifiedResponse.opcoes_proximos_filtros.avaliacoes.length);
          return unifiedResponse.opcoes_proximos_filtros.avaliacoes;
        }
        
        if (unifiedResponse?.resultados_detalhados?.avaliacoes?.length) {
          console.log('✅ Usando nova API - resultados detalhados:', unifiedResponse.resultados_detalhados.avaliacoes.length);
          return unifiedResponse.resultados_detalhados.avaliacoes.map(av => ({
            id: av.id,
            titulo: av.titulo
          }));
        }
        
        console.log('⚠️ Nova API não retornou avaliações, usando fallback...');
      } catch (unifiedError) {
        console.log('⚠️ Erro na nova API, usando fallback:', unifiedError);
      }

      // Fallback para endpoint antigo
      const response = await api.get(url);
      
      console.log('✅ LOG - Resposta da API de avaliações (fallback):');
      console.log('📦 Resposta completa:', response);
      console.log('📊 Dados da resposta:', response.data);
      console.log('📚 Avaliações encontradas:', response.data?.avaliacoes || []);

      return response.data.avaliacoes || [];
    } catch (error) {
      console.error('❌ LOG - Erro ao buscar avaliações para filtros:', error);
      return [];
    }
  }

  // ✅ MIGRADO: Buscar escolas usando nova API unificada
  static async getFilterSchoolsByEvaluation(filters: {
    estado: string;
    municipio: string;
    avaliacao: string;
  }): Promise<Array<{
    id: string;
    nome: string;
  }>> {
    try {
      console.log('🏫 Buscando escolas via nova API unificada:', filters);
      
      // Usar nova API unificada
      const response = await this.getEvaluationsList(1, 100, {
        estado: filters.estado,
        municipio: filters.municipio,
        avaliacao: filters.avaliacao
      });
      
      if (response?.opcoes_proximos_filtros?.escolas?.length) {
        console.log('✅ Escolas encontradas na nova API:', response.opcoes_proximos_filtros.escolas.length);
        return response.opcoes_proximos_filtros.escolas.map(escola => ({
          id: escola.id,
          nome: escola.name
        }));
      }
      
      console.log('⚠️ Nova API não retornou escolas, usando fallback...');
      
      // Fallback para endpoint antigo
      const params = new URLSearchParams();
      params.append('estado', filters.estado);
      params.append('municipio', filters.municipio);
      params.append('avaliacao', filters.avaliacao);

      const fallbackResponse = await api.get(`/evaluation-results/opcoes-filtros/escolas-por-avaliacao?${params}`);
      return fallbackResponse.data.escolas || [];
    } catch (error) {
      console.error('Erro ao buscar escolas por avaliação:', error);
      return [];
    }
  }

  // ✅ MIGRADO: Buscar séries usando nova API unificada
  static async getFilterGradesByEvaluation(filters: {
    estado: string;
    municipio: string;
    avaliacao: string;
    escola: string;
  }): Promise<Array<{
    id: string;
    nome: string;
  }>> {
    try {
      console.log('📚 Buscando séries via nova API unificada:', filters);
      
      // Usar nova API unificada
      const response = await this.getEvaluationsList(1, 100, {
        estado: filters.estado,
        municipio: filters.municipio,
        avaliacao: filters.avaliacao,
        escola: filters.escola
      });
      
      if (response?.opcoes_proximos_filtros?.series?.length) {
        console.log('✅ Séries encontradas na nova API:', response.opcoes_proximos_filtros.series.length);
        return response.opcoes_proximos_filtros.series.map(serie => ({
          id: serie.id,
          nome: serie.name
        }));
      }
      
      console.log('⚠️ Nova API não retornou séries, usando fallback...');
      
      // Fallback para endpoint antigo
      const params = new URLSearchParams();
      params.append('estado', filters.estado);
      params.append('municipio', filters.municipio);
      params.append('avaliacao', filters.avaliacao);
      params.append('escola', filters.escola);

      const fallbackResponse = await api.get(`/evaluation-results/opcoes-filtros/series?${params}`);
      return fallbackResponse.data.series || [];
    } catch (error) {
      console.error('Erro ao buscar séries por avaliação:', error);
      return [];
    }
  }

  // ✅ MIGRADO: Buscar turmas usando nova API unificada
  static async getFilterClassesByEvaluation(filters: {
    estado: string;
    municipio: string;
    avaliacao: string;
    escola: string;
    serie: string;
  }): Promise<Array<{
    id: string;
    nome: string;
  }>> {
    try {
      console.log('🏫 Buscando turmas via nova API unificada:', filters);
      
      // Usar nova API unificada
      const response = await this.getEvaluationsList(1, 100, {
        estado: filters.estado,
        municipio: filters.municipio,
        avaliacao: filters.avaliacao,
        escola: filters.escola,
        serie: filters.serie
      });
      
      if (response?.opcoes_proximos_filtros?.turmas?.length) {
        console.log('✅ Turmas encontradas na nova API:', response.opcoes_proximos_filtros.turmas.length);
        return response.opcoes_proximos_filtros.turmas.map(turma => ({
          id: turma.id,
          nome: turma.name
        }));
      }
      
      console.log('⚠️ Nova API não retornou turmas, usando fallback...');
      
      // Fallback para endpoint antigo
      const params = new URLSearchParams();
      params.append('estado', filters.estado);
      params.append('municipio', filters.municipio);
      params.append('avaliacao', filters.avaliacao);
      params.append('escola', filters.escola);
      params.append('serie', filters.serie);

      const fallbackResponse = await api.get(`/evaluation-results/opcoes-filtros/turmas?${params}`);
      return fallbackResponse.data.turmas || [];
    } catch (error) {
      console.error('Erro ao buscar turmas por avaliação:', error);
      return [];
    }
  }

  // ✅ NOVO: Buscar todas as opções de filtros de uma vez (rota principal)
  // REMOVIDO: método antigo duplicado getAllFilterOptions (use a versão otimizada no final do arquivo)

  // ✅ NOVO: Buscar relatório detalhado filtrado (endpoint otimizado)
  static async getDetailedReportFiltered(
    evaluationId: string, 
    fields: string[] = ['alunos', 'nota', 'proficiencia', 'classificacao'],
    orderBy: string = 'proficiencia',
    orderDirection: 'asc' | 'desc' = 'desc'
  ): Promise<{
    alunos: Array<{
      id: string;
      nome: string;
      turma: string;
      nota: number;
      proficiencia: number;
      classificacao: 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado';
      status: 'concluida' | 'pendente';
    }>;
    total: number;
    paginacao: {
      page: number;
      per_page: number;
      total: number;
      total_pages: number;
    };
  } | null> {
    try {
      // Validar parâmetros antes de fazer a requisição
      if (!evaluationId || evaluationId === 'all') {
        console.warn('⚠️ ID de avaliação inválido para relatório filtrado:', evaluationId);
        return null;
      }

      // Mapear campos para garantir compatibilidade com a API
      const fieldMapping: Record<string, string> = {
        'nivel': 'classificacao', // Mapear nivel para classificacao se necessário
        'classificacao': 'classificacao',
        'alunos': 'alunos',
        'nota': 'nota',
        'proficiencia': 'proficiencia',
        'turma': 'turma',
        'status': 'status'
      };

      const validFields = fields.map(field => fieldMapping[field] || field)
                                .filter(field => Object.values(fieldMapping).includes(field));
      
      if (validFields.length === 0) {
        console.warn('⚠️ Nenhum campo válido fornecido para relatório filtrado');
        return null;
      }

      const params = new URLSearchParams({
        fields: validFields.join(','),
        order_by: orderBy,
        order_direction: orderDirection
      });

      console.log('🔍 Chamando endpoint relatório filtrado:', `/evaluation-results/relatorio-detalhado-filtrado/${evaluationId}?${params}`);

      const response = await api.get(`/evaluation-results/relatorio-detalhado-filtrado/${evaluationId}?${params}`);
      
      console.log('✅ Relatório detalhado filtrado recebido:', response.data);
      
      // Normalizar a resposta para garantir compatibilidade
      if (response.data && response.data.alunos) {
        const normalizedData = {
          ...response.data,
          alunos: response.data.alunos.map((aluno: any) => ({
            ...aluno,
            // Garantir que classificacao seja usado ao invés de nivel
            classificacao: aluno.classificacao || aluno.nivel || 'Abaixo do Básico'
          }))
        };
        return normalizedData;
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar relatório detalhado filtrado:', error);
      // Adicionar mais detalhes do erro para debugging
      if (error instanceof Error && 'response' in error) {
        const axiosError = error as any;
        console.error('❌ Status do erro:', axiosError.response?.status);
        console.error('❌ Dados do erro:', axiosError.response?.data);
        console.error('❌ Mensagem do erro:', axiosError.message);
      }
      return null;
    }
  }

  // ✅ NOVO: Buscar ranking otimizado de alunos por proficiência
  static async getRankingByProficiency(
    evaluationId: string,
    options: {
      limit?: number;
      includeAbsent?: boolean;
      schoolId?: string;
      classId?: string;
    } = {}
  ): Promise<{
    ranked: Array<{
      position: number;
      id: string;
      nome: string;
      turma: string;
      nota: number;
      proficiencia: number;
      classificacao: 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado';
      status: 'concluida' | 'pendente';
    }>;
    absent: Array<{
      id: string;
      nome: string;
      turma: string;
      status: 'pendente';
    }>;
    total: number;
  } | null> {
    try {
      const params = new URLSearchParams({
        fields: 'alunos,nota,proficiencia,classificacao,turma,status',
        order_by: 'proficiencia',
        order_direction: 'desc'
      });
      
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.schoolId) params.append('escola', options.schoolId);
      if (options.classId) params.append('turma', options.classId);
      
      console.log('🏆 Carregando ranking otimizado:', {
        evaluationId,
        options,
        params: Object.fromEntries(params.entries())
      });
      
      // Tentar usar endpoint otimizado específico para ranking
      let response;
      try {
        response = await api.get(`/evaluation-results/relatorio-detalhado-filtrado/${evaluationId}/ranking?${params}`);
      } catch (rankingError) {
        // Fallback para endpoint filtrado normal
        console.log('🔄 Endpoint de ranking não disponível, usando filtrado normal');
        response = await api.get(`/evaluation-results/relatorio-detalhado-filtrado/${evaluationId}?${params}`);
      }
      
      if (response.data && response.data.alunos) {
        const students = response.data.alunos;
        
        // Separar alunos que concluíram dos ausentes
        const completed = students.filter((s: any) => s.status === 'concluida');
        const absent = students.filter((s: any) => s.status !== 'concluida');
        
        // Adicionar posição no ranking para alunos que concluíram
        const rankedStudents = completed.map((student: any, index: number) => ({
          position: index + 1,
          id: student.id,
          nome: student.nome,
          turma: student.turma,
          nota: student.nota || 0,
          proficiencia: student.proficiencia || 0,
          classificacao: student.nivel || student.classificacao || 'Abaixo do Básico',
          status: 'concluida' as const
        }));
        
        console.log('🏆 Ranking carregado:', {
          ranked: rankedStudents.length,
          absent: absent.length,
          total: students.length
        });
        
        return {
          ranked: rankedStudents,
          absent: absent.map((s: any) => ({
            id: s.id,
            nome: s.nome,
            turma: s.turma,
            status: 'pendente' as const
          })),
          total: students.length
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Erro ao carregar ranking:', error);
      return null;
    }
  }

  // ✅ NOVO: Buscar dados específicos de uma avaliação (endpoint dedicado)
  static async getEvaluationSpecificData(evaluationId: string): Promise<{
    avaliacao: {
      id: string;
      titulo: string;
      disciplina: string;
      data_aplicacao: string;
      status: string;
      total_questoes: number;
      total_alunos: number;
      alunos_participantes: number;
      alunos_ausentes: number;
      media_nota: number;
      media_proficiencia: number;
    };
    questoes: Array<{
      id: string;
      numero: number;
      texto: string;
      habilidade: string;
      codigo_habilidade: string;
      tipo: 'multipleChoice' | 'open' | 'trueFalse';
      dificuldade: 'Fácil' | 'Médio' | 'Difícil';
      porcentagem_acertos: number;
      porcentagem_erros: number;
    }>;
    alunos: Array<{
      id: string;
      nome: string;
      turma: string;
      nota: number;
      proficiencia: number;
      classificacao: 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado';
      total_acertos: number;
      total_erros: number;
      total_em_branco: number;
      status: 'concluida' | 'pendente';
    }>;
  } | null> {
    try {
      console.log('🎯 Carregando dados específicos da avaliação:', evaluationId);
      
      const response = await api.get(`/evaluation-results/avaliacoes/${evaluationId}`);
      
      console.log('🎯 Dados específicos da avaliação carregados:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar dados específicos da avaliação:', error);
      return null;
    }
  }

  // ✅ MIGRADO: Buscar estatísticas gerais usando nova API unificada
  static async getGeneralStats(filters?: {
    estado?: string;
    municipio?: string;
    escola?: string;
    serie?: string;
    turma?: string;
  }): Promise<{
    total_avaliacoes: number;
    total_alunos: number;
    alunos_participantes: number;
    alunos_ausentes: number;
    media_nota_geral: number;
    media_proficiencia_geral: number;
    distribuicao_classificacao: {
      abaixo_do_basico: number;
      basico: number;
      adequado: number;
      avancado: number;
    };
    top_disciplinas: Array<{
      disciplina: string;
      media_nota: number;
      media_proficiencia: number;
    }>;
  } | null> {
    try {
      console.log('📊 Buscando estatísticas via nova API unificada:', filters);
      
      // Usar nova API unificada para obter estatísticas
      if (filters?.estado && filters?.municipio) {
        const response = await this.getEvaluationsList(1, 100, {
          estado: filters.estado,
          municipio: filters.municipio,
          escola: filters.escola,
          serie: filters.serie,
          turma: filters.turma
        });
        
        if (response?.estatisticas_gerais) {
          console.log('✅ Estatísticas encontradas na nova API');
          
          // Converter formato da nova API para o formato esperado
          const stats = response.estatisticas_gerais;
          const resultadosPorDisciplina = response.resultados_por_disciplina || [];
          
          return {
            total_avaliacoes: stats.total_avaliacoes,
            total_alunos: stats.total_alunos,
            alunos_participantes: stats.alunos_participantes,
            alunos_ausentes: stats.alunos_ausentes,
            media_nota_geral: stats.media_nota_geral,
            media_proficiencia_geral: stats.media_proficiencia_geral,
            distribuicao_classificacao: {
              abaixo_do_basico: stats.distribuicao_classificacao_geral.abaixo_do_basico,
              basico: stats.distribuicao_classificacao_geral.basico,
              adequado: stats.distribuicao_classificacao_geral.adequado,
              avancado: stats.distribuicao_classificacao_geral.avancado
            },
            top_disciplinas: resultadosPorDisciplina.map(d => ({
              disciplina: d.disciplina,
              media_nota: d.media_nota,
              media_proficiencia: d.media_proficiencia
            }))
          };
        }
      }
      
      console.log('⚠️ Nova API não retornou estatísticas, usando fallback...');
      
      // Fallback para endpoint antigo
      const params = new URLSearchParams();
      if (filters?.estado) params.append('estado', filters.estado);
      if (filters?.municipio) params.append('municipio', filters.municipio);
      if (filters?.escola) params.append('escola', filters.escola);
      if (filters?.serie) params.append('serie', filters.serie);
      if (filters?.turma) params.append('turma', filters.turma);
      
      console.log('📊 Carregando estatísticas gerais (fallback):', Object.fromEntries(params.entries()));
      
      const fallbackResponse = await api.get(`/evaluation-results/stats?${params}`);
      
      console.log('📊 Estatísticas gerais carregadas (fallback):', fallbackResponse.data);
      
      return fallbackResponse.data;
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas gerais:', error);
      return null;
    }
  }

  // ✅ NOVO: Recalcular notas de uma avaliação
  static async recalculateEvaluationScores(
    testId: string,
    options?: {
      force_recalculation?: boolean;
      include_pending?: boolean;
    }
  ): Promise<{
    success: boolean;
    message: string;
    updated_students: number;
    updated_scores: Array<{
      student_id: string;
      old_score: number;
      new_score: number;
      old_proficiency: number;
      new_proficiency: number;
    }>;
  } | null> {
    try {
      console.log('🔄 Recalculando notas da avaliação:', testId);
      
      const body: any = {};
      if (options?.force_recalculation) body.force_recalculation = true;
      if (options?.include_pending) body.include_pending = true;
      
      const response = await api.post(`/evaluation-results/${testId}/calculate-scores`, body);
      
      console.log('🔄 Recálculo de notas concluído:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao recalcular notas:', error);
      return null;
    }
  }

  // ✅ NOVO: Buscar respostas detalhadas de um aluno
  static async getStudentDetailedAnswers(
    testId: string,
    studentId: string
  ): Promise<{
    student: {
      id: string;
      nome: string;
      turma: string;
      nota: number;
      proficiencia: number;
      classificacao: string;
    };
    answers: Array<{
      question_id: string;
      question_number: number;
      question_text: string;
      question_type: 'multipleChoice' | 'open' | 'trueFalse';
      question_value: number;
      student_answer: string;
      correct_answer: string;
      is_correct: boolean;
      score: number;
      time_spent: number;
      answered_at: string;
      feedback: string | null;
    }>;
    summary: {
      total_questions: number;
      answered_questions: number;
      correct_answers: number;
      total_score: number;
      max_possible_score: number;
      accuracy_percentage: number;
      time_spent_total: number;
    };
  } | null> {
    try {
      console.log('📝 Carregando respostas detalhadas:', { testId, studentId });
      
      const response = await api.get(`/evaluation-results/${testId}/student/${studentId}/answers`);
      
      console.log('📝 Respostas detalhadas carregadas:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar respostas detalhadas:', error);
      return null;
    }
  }

  // ✅ NOVO: Buscar todas as opções de filtros otimizadas
  static async getAllFilterOptions(
    baseFilters?: {
      estado?: string;
      municipio?: string;
      avaliacao?: string;
    }
  ): Promise<{
    estados: Array<{ id: string; nome: string }>;
    municipios: Array<{ id: string; nome: string; estado_id: string }>;
    avaliacoes: Array<{ 
      id: string; 
      titulo: string; 
      disciplina: string; 
      municipio_id: string;
      status: string;
    }>;
    escolas: Array<{ 
      id: string; 
      nome: string; 
      municipio_id: string; 
      avaliacoes: string[];
    }>;
    series: Array<{ 
      id: string; 
      nome: string; 
      escola_id: string;
    }>;
    turmas: Array<{ 
      id: string; 
      nome: string; 
      serie_id: string; 
      escola_id: string;
    }>;
    disciplinas: Array<{ 
      id: string; 
      nome: string; 
      avaliacoes: string[];
    }>;
  } | null> {
    try {
      const params = new URLSearchParams();
      if (baseFilters?.estado) params.append('estado', baseFilters.estado);
      if (baseFilters?.municipio) params.append('municipio', baseFilters.municipio);
      if (baseFilters?.avaliacao) params.append('avaliacao', baseFilters.avaliacao);
      
      console.log('🎛️ Carregando opções de filtros otimizadas:', Object.fromEntries(params.entries()));
      
      const response = await api.get(`/evaluation-results/opcoes-filtros?${params}`);
      
      console.log('🎛️ Opções de filtros carregadas:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar opções de filtros:', error);
      return null;
    }
  }

  // ✅ NOVO: Buscar relatório completo de uma avaliação
  static async getRelatorioCompleto(evaluationId: string): Promise<RelatorioCompleto> {
    try {
      console.log('🔍 LOG - Iniciando busca do relatório completo');
      console.log('📋 ID da avaliação:', evaluationId);
      console.log('📡 URL da requisição:', `/reports/relatorio-completo/${evaluationId}`);
      
      const response = await api.get(`/reports/relatorio-completo/${evaluationId}`);
      
      console.log('✅ LOG - Resposta recebida com sucesso');
      console.log('📦 Resposta completa:', response);
      console.log('📊 Status da resposta:', response.status);
      console.log('📋 Headers da resposta:', response.headers);
      console.log('📄 Dados da resposta (response.data):', response.data);
      
      // Log detalhado da estrutura dos dados
      if (response.data) {
        console.log('🏗️ Estrutura dos dados:');
        console.log('  - Tipo de response.data:', typeof response.data);
        console.log('  - É um array?', Array.isArray(response.data));
        console.log('  - É um objeto?', typeof response.data === 'object' && response.data !== null);
        
        if (typeof response.data === 'object' && response.data !== null) {
          console.log('  - Chaves do objeto:', Object.keys(response.data));
          
          // Log de cada seção principal
          if (response.data.avaliacao) {
            console.log('  📚 Seção "avaliacao":', response.data.avaliacao);
          }
          if (response.data.total_alunos) {
            console.log('  👥 Seção "total_alunos":', response.data.total_alunos);
          }
          if (response.data.niveis_aprendizagem) {
            console.log('  🎯 Seção "niveis_aprendizagem":', response.data.niveis_aprendizagem);
          }
          if (response.data.proficiencia) {
            console.log('  📈 Seção "proficiencia":', response.data.proficiencia);
          }
          if (response.data.nota_geral) {
            console.log('  🏆 Seção "nota_geral":', response.data.nota_geral);
          }
          if (response.data.acertos_por_habilidade) {
            console.log('  🎓 Seção "acertos_por_habilidade":', response.data.acertos_por_habilidade);
          }
        }
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ LOG - Erro ao buscar relatório completo:');
      console.error('  - Tipo do erro:', typeof error);
      console.error('  - Mensagem do erro:', error);
      
      if (error.response) {
        console.error('  - Status do erro:', error.response.status);
        console.error('  - Dados do erro:', error.response.data);
        console.error('  - Headers do erro:', error.response.headers);
      } else if (error.request) {
        console.error('  - Erro de requisição (sem resposta):', error.request);
      } else {
        console.error('  - Erro de configuração:', error.message);
      }
      
      throw error;
    }
  }

  // ✅ NOVO: Endpoints para avaliação por disciplina
  
  /**
   * Busca resultados gerais e por disciplina de uma avaliação
   */
  static async getResultadosGeraisEDisciplinas(
    evaluationId: string, 
    classIds?: string[]
  ): Promise<ResultadosGeraisEDisciplinas | null> {
    try {
      const params = new URLSearchParams();
      if (classIds && classIds.length > 0) {
        params.append('class_ids', classIds.join(','));
      }
      
      const url = `/evaluation-subject/resultados-gerais-e-disciplinas/${evaluationId}`;
      const fullUrl = params.toString() ? `${url}?${params}` : url;
      
      console.log('📊 Buscando resultados gerais e por disciplina:', fullUrl);
      
      const response = await api.get(fullUrl);
      
      console.log('✅ Resultados gerais e por disciplina carregados:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar resultados gerais e por disciplina:', error);
      return null;
    }
  }

  /**
   * Busca resultados de um aluno específico por disciplina
   */
  static async getResultadosAlunoPorDisciplina(
    evaluationId: string, 
    studentId: string
  ): Promise<ResultadosAlunoPorDisciplina | null> {
    try {
      console.log('👤 Buscando resultados do aluno por disciplina:', { evaluationId, studentId });
      
      const response = await api.get(`/evaluation-subject/resultados-aluno/${evaluationId}/${studentId}`);
      
      console.log('✅ Resultados do aluno por disciplina carregados:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar resultados do aluno por disciplina:', error);
      return null;
    }
  }

  /**
   * Lista as disciplinas presentes em uma avaliação
   */
  static async getDisciplinasAvaliacao(
    evaluationId: string
  ): Promise<DisciplinasAvaliacao | null> {
    try {
      console.log('📚 Buscando disciplinas da avaliação:', evaluationId);
      
      const response = await api.get(`/evaluation-subject/disciplinas-avaliacao/${evaluationId}`);
      
      console.log('✅ Disciplinas da avaliação carregadas:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar disciplinas da avaliação:', error);
      return null;
    }
  }

  /**
   * Busca comparativo de desempenho entre disciplinas
   */
  static async getComparativoDisciplinas(
    evaluationId: string, 
    classIds?: string[]
  ): Promise<ComparativoDisciplinas | null> {
    try {
      const params = new URLSearchParams();
      if (classIds && classIds.length > 0) {
        params.append('class_ids', classIds.join(','));
      }
      
      const url = `/evaluation-subject/comparativo-disciplinas/${evaluationId}`;
      const fullUrl = params.toString() ? `${url}?${params}` : url;
      
      console.log('📊 Buscando comparativo de disciplinas:', fullUrl);
      
      const response = await api.get(fullUrl);
      
      console.log('✅ Comparativo de disciplinas carregado:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar comparativo de disciplinas:', error);
      return null;
    }
  }

  // ===== NOVOS ENDPOINTS DE DASHBOARD E ESTATÍSTICAS =====

  // ✅ NOVO: Métricas gerais do painel (total/ativas/concluídas, alunos, taxa média de conclusão)
  static async getDashboardStats(): Promise<{
    total_evaluations: number;
    active_evaluations: number;
    completed_evaluations: number;
    total_students: number;
    average_completion_rate: number;
    pending_evaluations: number;
    this_month_evaluations: number;
  } | null> {
    try {
      console.log('📊 Carregando métricas gerais do dashboard...');
      const response = await api.get('/dashboard/stats');
      console.log('✅ Métricas do dashboard carregadas:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar métricas do dashboard:', error);
      return null;
    }
  }

  // ✅ NOVO: Estatísticas ampliadas do painel (contagens diversas para cards/gráficos)
  static async getComprehensiveDashboardStats(): Promise<{
    evaluations: {
      total: number;
      by_status: Record<string, number>;
      by_type: Record<string, number>;
      by_subject: Record<string, number>;
    };
    students: {
      total: number;
      active: number;
      by_grade: Record<string, number>;
    };
    schools: {
      total: number;
      with_evaluations: number;
      by_municipality: Record<string, number>;
    };
    performance: {
      average_score: number;
      average_proficiency: number;
      completion_rate: number;
    };
  } | null> {
    try {
      console.log('📈 Carregando estatísticas ampliadas do dashboard...');
      const response = await api.get('/dashboard/comprehensive-stats');
      console.log('✅ Estatísticas ampliadas carregadas:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas ampliadas:', error);
      return null;
    }
  }

  // ✅ NOVO: Lista de avaliações com agregados (útil para tabelas/gráficos de ranking/andamento)
  static async getEvaluationsListWithAggregates(
    page: number = 1,
    perPage: number = 10,
    filters?: {
      status?: string;
      subject?: string;
      municipality?: string;
      school?: string;
    }
  ): Promise<{
    data: Array<{
      id: string;
      titulo: string;
      disciplina: string;
      municipio: string;
      escola: string;
      status: string;
      total_alunos: number;
      alunos_concluidos: number;
      media_nota: number;
      ultima_atualizacao: string;
      progress_percentage: number;
    }>;
    pagination: {
      current_page: number;
      per_page: number;
      total: number;
      total_pages: number;
    };
  } | null> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
      });

      if (filters?.status) params.append('status', filters.status);
      if (filters?.subject) params.append('subject', filters.subject);
      if (filters?.municipality) params.append('municipality', filters.municipality);
      if (filters?.school) params.append('school', filters.school);

      console.log('📋 Carregando lista de avaliações com agregados:', Object.fromEntries(params.entries()));
      const response = await api.get(`/evaluation-results/list?${params}`);
      console.log('✅ Lista de avaliações carregada:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar lista de avaliações:', error);
      return null;
    }
  }

  // ✅ NOVO: Estatísticas de uma avaliação específica
  static async getEvaluationSpecificStats(evaluationId: string): Promise<{
    id: string;
    titulo: string;
    disciplina: string;
    total_alunos: number;
    alunos_participantes: number;
    alunos_ausentes: number;
    media_nota: number;
    media_proficiencia: number;
    distribuicao_classificacao: {
      abaixo_do_basico: number;
      basico: number;
      adequado: number;
      avancado: number;
    };
    tempo_medio_execucao: number;
    taxa_conclusao: number;
  } | null> {
    try {
      console.log('🎯 Carregando estatísticas específicas da avaliação:', evaluationId);
      const response = await api.get(`/evaluation-results/avaliacoes/${evaluationId}`);
      console.log('✅ Estatísticas específicas carregadas:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas específicas:', error);
      return null;
    }
  }

  // ✅ NOVO: Contagem e porcentagem por status das avaliações (para gráfico de pizza/donut)
  static async getEvaluationStatusStats(): Promise<{
    total_evaluations: number;
    by_status: Array<{
      status: string;
      count: number;
      percentage: number;
      label: string;
    }>;
    last_updated: string;
  } | null> {
    try {
      console.log('📊 Carregando estatísticas de status das avaliações...');
      const response = await api.get('/evaluation-results/avaliacoes/estatisticas-status');
      console.log('✅ Estatísticas de status carregadas:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas de status:', error);
      return null;
    }
  }

  // ✅ MIGRADO: Estatísticas globais dos resultados (usando nova API quando possível)
  static async getGlobalResultsStats(): Promise<{
    total_avaliacoes_concluidas: number;
    total_avaliacoes_pendentes: number;
    media_nota_global: number;
    total_alunos: number;
    tempo_medio_execucao: number;
    disciplina_melhor_desempenho: {
      nome: string;
      media_nota: number;
      media_proficiencia: number;
    };
  } | null> {
    try {
      console.log('🌍 Carregando estatísticas globais dos resultados...');
      
      // Tentar usar nova API unificada primeiro
      try {
        // Fazer uma chamada ampla para obter estatísticas globais
        const unifiedResponse = await this.getEvaluationsList(1, 1, {});
        
        if (unifiedResponse?.estatisticas_gerais && unifiedResponse?.resultados_por_disciplina) {
          console.log('✅ Usando nova API unificada para estatísticas globais');
          
          const stats = unifiedResponse.estatisticas_gerais;
          const disciplinas = unifiedResponse.resultados_por_disciplina;
          
          // Encontrar disciplina com melhor desempenho
          const melhorDisciplina = disciplinas.reduce((melhor, atual) => 
            atual.media_nota > melhor.media_nota ? atual : melhor
          , disciplinas[0]);
          
          return {
            total_avaliacoes_concluidas: stats.total_avaliacoes,
            total_avaliacoes_pendentes: 0, // Nova API não diferencia pendentes
            media_nota_global: stats.media_nota_geral,
            total_alunos: stats.total_alunos,
            tempo_medio_execucao: 0, // Não disponível na nova API
            disciplina_melhor_desempenho: {
              nome: melhorDisciplina.disciplina,
              media_nota: melhorDisciplina.media_nota,
              media_proficiencia: melhorDisciplina.media_proficiencia
            }
          };
        }
      } catch (unifiedError) {
        console.log('⚠️ Nova API não disponível, usando fallback');
      }
      
      // Fallback para endpoint específico
      const response = await api.get('/evaluation-results/stats');
      console.log('✅ Estatísticas globais carregadas (fallback):', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas globais:', error);
      return null;
    }
  }

  // ===== ENDPOINTS ESPECÍFICOS DE AVALIAÇÕES =====

  // ✅ NOVO: Verificar status de todas as avaliações
  static async verificarTodasAvaliacoes(filters?: {
    municipio?: string;
    escola?: string;
    status?: string;
  }): Promise<{
    total_verificadas: number;
    avaliacoes_atualizadas: number;
    avaliacoes_com_erro: number;
    detalhes: Array<{
      avaliacao_id: string;
      titulo: string;
      status_anterior: string;
      status_atual: string;
      atualizada: boolean;
      erro?: string;
    }>;
  } | null> {
    try {
      console.log('🔍 Verificando status de todas as avaliações...', filters);
      
      const body: any = {};
      if (filters?.municipio) body.municipio = filters.municipio;
      if (filters?.escola) body.escola = filters.escola;
      if (filters?.status) body.status = filters.status;
      
      const response = await api.post('/evaluation-results/avaliacoes/verificar-todas', body);
      
      console.log('✅ Verificação de todas as avaliações concluída:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao verificar todas as avaliações:', error);
      return null;
    }
  }

  // ✅ ORGANIZANDO: Métodos específicos por avaliação individual

  // GET /evaluation-results/avaliacoes/<evaluation_id> (já implementado como getEvaluationSpecificStats)
  
  // POST /evaluation-results/avaliacoes/calcular (já implementado como calculateEvaluationResults)
  
  // PATCH /evaluation-results/avaliacoes/<test_id>/finalizar (já implementado como finalizeEvaluation)
  
  // POST /evaluation-results/avaliacoes/<test_id>/verificar-status (já implementado como checkEvaluationStatus)
  
  // GET /evaluation-results/avaliacoes/<test_id>/status-resumo (já implementado como getEvaluationStatusSummary)
  
  // GET /evaluation-results/avaliacoes/estatisticas-status (já implementado como getEvaluationStatusStats)
} 