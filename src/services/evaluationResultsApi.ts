import { api, apiWithRetry, apiWithTimeout } from '@/lib/api';
import { EvaluationResultsData, StudentProficiency, ResultsFilters, calculateProficiency } from '@/types/evaluation-results';

// ===== INTERFACES PARA BACKEND REAL =====

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

// ===== INTERFACES PARA API DE RESULTADOS =====

interface EvaluationResult {
  id: string;
  titulo: string;
  disciplina: string;
  curso: string;
  serie: string;
  escola: string;
  municipio: string;
  data_aplicacao: string;
  status: 'concluida' | 'em_andamento' | 'pendente';
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

  // ✅ NOVO: Buscar lista de avaliações com nova estrutura
  static async getEvaluationsList(
    page: number = 1,
    perPage: number = 10,
    filters: {
      estado?: string;
      municipio?: string;
      escola?: string;
      serie?: string;
      turma?: string;
    } = {}
  ): Promise<{
    municipio_geral: {
      nome: string;
      estado: string;
      total_escolas: number;
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
    };
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
      data: EvaluationResult[];
      total: number;
      page: number;
      per_page: number;
      total_pages: number;
    };
  } | null> {
    try {
      // Construir parâmetros baseado nos filtros selecionados
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
      });

      // Adicionar filtros apenas se estiverem definidos
      if (filters.estado && filters.estado !== 'all') {
        params.append('estado', filters.estado);
      }
      if (filters.municipio && filters.municipio !== 'all') {
        params.append('municipio', filters.municipio);
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
      console.log('🔍 LOG - Resposta da API /evaluation-results/avaliacoes:');
      console.log('📋 Parâmetros enviados:', Object.fromEntries(params.entries()));
      console.log('📦 Resposta completa:', response);
      console.log('📊 Dados da resposta:', response.data);
      console.log('🏫 Municipio geral:', response.data?.municipio_geral);
      console.log('📚 Resultados por disciplina:', response.data?.resultados_por_disciplina);
      console.log('📝 Resultados detalhados:', response.data?.resultados_detalhados);

      return response.data;
    } catch (error) {
      console.error('Erro ao buscar avaliações:', error);
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
      console.error('Erro ao verificar status da avaliação:', error);
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
      console.error('Erro ao obter resumo de status da avaliação:', error);
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
      console.error('Erro ao obter opções de filtros da avaliação:', error);
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

  // Buscar resultados detalhados de um aluno específico
  static async getStudentDetailedResults(testId: string, studentId: string, includeAnswers: boolean = false): Promise<StudentDetailedResult | null> {
    try {
      const params = includeAnswers ? { include_answers: 'true' } : {};
      const response = await api.get(`/evaluation-results/${testId}/student/${studentId}/results`, { params });
      return response.data;
    } catch (error: any) {
      // Se o erro contém dados da resposta (aluno não respondeu), retornar os dados
      if (error.response?.data && error.response.data.test_id) {
        return {
          test_id: error.response.data.test_id,
          student_id: error.response.data.student_id,
          student_db_id: error.response.data.student_db_id,
          total_questions: error.response.data.total_questions,
          answered_questions: error.response.data.answered_questions,
          correct_answers: error.response.data.correct_answers,
          score_percentage: error.response.data.score_percentage,
          total_score: error.response.data.total_score,
          max_possible_score: error.response.data.max_possible_score,
          grade: error.response.data.grade || 0,
          proficiencia: error.response.data.proficiencia || 0,
          classificacao: error.response.data.classificacao || 'Abaixo do Básico',
          calculated_at: error.response.data.calculated_at || new Date().toISOString(),
          status: error.response.data.status,
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
      console.error('Erro ao buscar avaliações:', error);
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
      console.error('Erro ao buscar alunos:', error);
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
      console.error('Erro ao recalcular avaliação:', error);
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
      console.error('Erro ao corrigir submissão:', error);
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
      console.error('Erro ao buscar estados:', error);
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
      console.error('Erro ao buscar municípios:', error);
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
      console.error('Erro ao buscar escolas:', error);
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
      console.error('Erro ao buscar séries:', error);
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
      console.error('Erro ao buscar turmas:', error);
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
      console.error('Erro ao buscar turmas filtradas:', error);
      return [];
    }
  }

  // ✅ NOVO: Buscar etapas educacionais
  static async getEducationStages(): Promise<Array<{
    id: string;
    name: string;
  }>> {
    try {
      const response = await api.get('/education_stages');
      return response.data || [];
    } catch (error) {
      console.error('Erro ao buscar etapas educacionais:', error);
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
      console.error('Erro ao buscar opções de filtros:', error);
      return {
        courses: [],
        subjects: [],
        classes: [],
        schools: []
      };
    }
  }

  // Simular cálculo de proficiência (mantido para compatibilidade)
  static simulateProficiencyCalculation(score: number, grade: string = '6º Ano', subject: string = 'Matemática') {
    return calculateProficiency(score, 20, grade, subject);
  }

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
      console.error('Erro ao finalizar avaliação:', error);
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
      console.error('Erro ao calcular notas:', error);
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
      console.error('Erro ao aplicar correção manual:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao aplicar correção manual'
      };
    }
  }

  // ✅ NOVO: Buscar estatísticas gerais
  static async getGeneralStats(): Promise<{
    completed_evaluations: number;
    pending_results: number;
    total_evaluations: number;
    average_score: number;
    total_students: number;
    average_completion_time: number;
    top_performance_subject: string;
  }> {
    const response = await api.get('/evaluation-results/stats');
    return response.data;
  }

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
      console.error('❌ Erro ao buscar resultados do aluno:', error);
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
      console.error('Erro ao aplicar correção em lote:', error);
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
      console.error('Erro ao finalizar correção:', error);
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
        console.warn(`⚠️ Disciplina não encontrada: ${subjectName}`);
        return [];
      }

      console.log(`🔍 Disciplina encontrada: ${subject.name} (ID: ${subject.id})`);

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
} 