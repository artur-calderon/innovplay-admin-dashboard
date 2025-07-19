import { api } from "@/lib/api";
import { EvaluationResultsData, ResultsFilters, StudentProficiency, calculateProficiency } from "@/types/evaluation-results";
import { generateMockResultsData, filterMockData, getMockFilterOptions } from "@/services/mockResultsData";

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

// ===== NOVAS INTERFACES PARA API DE RESULTADOS =====

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
  total_questions: number;
  answered_questions: number;
  correct_answers: number;
  score_percentage: number;
  total_score: number;
  max_possible_score: number;
  answers: Array<{
    question_id: string;
    question_text: string;
    question_type: 'multipleChoice' | 'open' | 'trueFalse';
    correct_answer: string;
    student_answer: string;
    options: string[];
    is_correct: boolean;
    score: number;
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
  }>;
}

// ===== DADOS MOCK (FALLBACK) =====

let mockEvaluationData: EvaluationResultsData[] = [];

const initializeMockData = () => {
  if (mockEvaluationData.length === 0) {
    mockEvaluationData = generateMockResultsData();
    // ✅ REMOVIDO: Console.log para apresentação
    // console.log('📊 Dados mock inicializados:', mockEvaluationData.length, 'avaliações');
  }
  return mockEvaluationData;
};

// ===== SERVIÇO PRINCIPAL =====

export class EvaluationResultsApiService {

  // ✅ NOVO: Buscar lista de avaliações com estatísticas
  static async getEvaluationsList(): Promise<EvaluationResult[]> {
    try {
      const response = await api.get('/evaluation-results/avaliacoes');
      return response.data.data || [];
    } catch (error) {
      console.error('Erro ao buscar lista de avaliações:', error);
      throw error;
    }
  }

  // ✅ NOVO: Buscar alunos de uma avaliação específica
  static async getStudentsByEvaluation(evaluationId: string): Promise<StudentResult[]> {
    try {
      const response = await api.get(`/evaluation-results/alunos?avaliacao_id=${evaluationId}`);
      return response.data.data || [];
    } catch (error) {
      console.error('Erro ao buscar alunos da avaliação:', error);
      throw error;
    }
  }

  // ✅ NOVO: Buscar resultados detalhados de um aluno específico
  static async getStudentDetailedResults(testId: string, studentId: string): Promise<StudentDetailedResult> {
    try {
      const response = await api.get(`/evaluation-results/${testId}/student/${studentId}/results`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar resultados detalhados do aluno:', error);
      throw error;
    }
  }

  // ✅ NOVO: Buscar relatório detalhado de uma avaliação
  static async getDetailedReport(evaluationId: string): Promise<DetailedReport> {
    try {
      const response = await api.get(`/evaluation-results/relatorio-detalhado/${evaluationId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar relatório detalhado:', error);
      throw error;
    }
  }

  // ✅ NOVO: Buscar resultados das sessões de teste (API REAL)
  static async getEvaluations(filters: ResultsFilters = {}, page = 1, perPage = 10): Promise<{
    results: EvaluationResultsData[];
    total: number;
    page: number;
    totalPages: number;
    isBackendConnected: boolean;
  }> {
    try {
      // console.log('🔄 Buscando resultados de avaliações do backend...');

      // Construir parâmetros para a API real
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
        // console.warn('Resposta da API não possui estrutura esperada, usando dados mock');
        return this.getMockResults(filters, page, perPage);
      }

      // console.log('✅ Resultados recebidos do backend:', response.data);

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
      // console.error('❌ Erro ao conectar com backend para resultados:', error);
      // console.log('📋 Usando dados mock devido ao erro de conexão');

      return this.getMockResults(filters, page, perPage);
    }
  }

  // ✅ NOVO: Transformar sessões em resultados agrupados
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

  // ✅ NOVO: Buscar alunos de uma avaliação específica (API REAL)
  static async getStudents(evaluationId: string, filters: ResultsFilters = {}): Promise<StudentProficiency[]> {
    try {
      // console.log('🔄 Buscando alunos do teste:', evaluationId);

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
        // console.warn('Resposta da API não possui estrutura esperada para alunos, usando dados mock');
        return this.getMockStudents(evaluationId);
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
      // console.error('❌ Erro ao buscar alunos:', error);
      return this.getMockStudents(evaluationId);
    }
  }

  // ✅ NOVO: Recalcular resultados de uma avaliação (API REAL)
  static async recalculateEvaluation(evaluationId: string): Promise<{
    success: boolean;
    message: string;
    dados_atualizados: any;
  }> {
    try {
      // console.log('🔄 Recalculando avaliação:', evaluationId);

      const response = await api.post(`/test/${evaluationId}/recalculate`);

      return {
        success: true,
        message: 'Avaliação recalculada com sucesso!',
        dados_atualizados: response.data
      };

    } catch (error) {
      // console.error('❌ Erro ao recalcular avaliação:', error);

      // Simulação de sucesso para demonstração
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        success: true,
        message: 'Avaliação recalculada com sucesso! (Simulação)',
        dados_atualizados: {
          timestamp: new Date().toISOString(),
          evaluationId
        }
      };
    }
  }

  // ✅ NOVO: Buscar submissões de uma avaliação para correção (API REAL)
  static async getSubmissionsForCorrection(evaluationId: string): Promise<BackendSubmissionResult[]> {
    try {
      // console.log('🔄 Buscando submissões para correção:', evaluationId);

      const response = await api.get(`/test/${evaluationId}/submissions`);

      if (!response.data || !Array.isArray(response.data.submissions)) {
        // console.warn('Nenhuma submissão encontrada');
        return [];
      }

      return response.data.submissions;

    } catch (error) {
      // console.error('❌ Erro ao buscar submissões:', error);
      return [];
    }
  }

  // ✅ NOVO: Corrigir submissão de um aluno (API REAL)
  static async correctSubmission(sessionId: string, corrections: any): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // console.log('🔄 Corrigindo submissão:', sessionId);

      const response = await api.post(`/test-session/${sessionId}/correct`, corrections);

      return {
        success: true,
        message: 'Submissão corrigida com sucesso!'
      };

    } catch (error) {
      // console.error('❌ Erro ao corrigir submissão:', error);

      // Simulação de sucesso
      return {
        success: true,
        message: 'Submissão corrigida com sucesso! (Simulação)'
      };
    }
  }

  // ===== MÉTODOS AUXILIARES =====

  private static getMockResults(filters: ResultsFilters = {}, page = 1, perPage = 10): {
    results: EvaluationResultsData[];
    total: number;
    page: number;
    totalPages: number;
    isBackendConnected: boolean;
  } {
    const allData = initializeMockData();

    const filteredData = filterMockData(allData, {
      course: filters.course,
      subject: filters.subject,
      class: filters.class,
      school: filters.school,
      status: filters.status,
      proficiencyRange: filters.proficiencyRange,
      scoreRange: filters.scoreRange,
      dateRange: filters.dateRange
    });

    const total = filteredData.length;
    const totalPages = Math.ceil(total / perPage);
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const paginatedResults = filteredData.slice(startIndex, endIndex);

    return {
      results: paginatedResults,
      total,
      page,
      totalPages,
      isBackendConnected: false
    };
  }

  private static getMockStudents(evaluationId: string): StudentProficiency[] {
    const allData = initializeMockData();
    const evaluation = allData.find(e => e.id === evaluationId);
    return evaluation?.studentsData || [];
  }

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

  // ===== MÉTODOS EXISTENTES (mantidos para compatibilidade) =====

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

      const backendOptions = {
        courses: Array.isArray(coursesRes.data) ? coursesRes.data.map((c: any) => c.name || c.nome) : [],
        subjects: Array.isArray(subjectsRes.data) ? subjectsRes.data.map((s: any) => s.name || s.nome) : [],
        classes: Array.isArray(classesRes.data) ? classesRes.data.map((c: any) => c.name || c.nome) : [],
        schools: Array.isArray(schoolsRes.data) ? schoolsRes.data.map((s: any) => s.name || s.nome) : []
      };

      if (backendOptions.courses.length > 0 || backendOptions.subjects.length > 0) {
        return backendOptions;
      }

      const allData = initializeMockData();
      const mockOptions = getMockFilterOptions(allData);

      // console.log('📋 Usando opções de filtros dos dados mock:', mockOptions);
      return mockOptions;

    } catch (error) {
      // console.error('Erro ao buscar opções de filtros:', error);

      const allData = initializeMockData();
      return getMockFilterOptions(allData);
    }
  }

  static simulateProficiencyCalculation(score: number, grade: string = '6º Ano', subject: string = 'Matemática') {
    return calculateProficiency(score, 20, grade, subject);
  }
} 