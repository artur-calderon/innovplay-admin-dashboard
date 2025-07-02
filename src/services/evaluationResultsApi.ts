import { api } from "@/lib/api";
import { EvaluationResultsData, ResultsFilters, StudentProficiency } from "@/types/evaluation-results";

// Interfaces para os dados vindos do backend
interface BackendEvaluationResult {
  id: string;
  titulo: string;
  disciplina: string;
  curso: string;
  serie: string;
  escola: string;
  municipio: string;
  data_aplicacao: string;
  data_correcao?: string;
  status: 'concluida' | 'pendente' | 'em_andamento';
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
  turmas_desempenho: Array<{
    id: string;
    nome: string;
    media_proficiencia: number;
    media_nota: number;
    total_alunos: number;
    alunos_participantes: number;
    distribuicao_classificacao: {
      abaixo_do_basico: number;
      basico: number;
      adequado: number;
      avancado: number;
    };
  }>;
}

interface BackendStudentResult {
  id: string;
  nome: string;
  turma: string;
  nota: number;
  proficiencia: number;
  classificacao: string;
  questoes_respondidas: number;
  acertos: number;
  erros: number;
  em_branco: number;
  tempo_gasto?: number;
  status: 'concluida' | 'pendente' | 'ausente';
}

// Nova interface para relatório detalhado
interface BackendDetailedReport {
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
    tipo: string;
    dificuldade: string;
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
      tempo_gasto?: number;
    }>;
    total_acertos: number;
    total_erros: number;
    total_em_branco: number;
    nota_final: number;
    proficiencia: number;
    classificacao: string;
  }>;
}

interface BackendFilters {
  curso?: string;
  disciplina?: string;
  turma?: string;
  escola?: string;
  proficiencia_min?: number;
  proficiencia_max?: number;
  nota_min?: number;
  nota_max?: number;
  classificacao?: string[];
  status?: string[];
  data_inicio?: string;
  data_fim?: string;
  busca?: string;
  page?: number;
  per_page?: number;
}

interface BackendApiResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

interface ChartData {
  labels: string[];
  data: number[];
  colors?: string[];
}

// Interfaces para o relatório detalhado frontend
export interface QuestionData {
  id: string;
  number: number;
  text: string;
  skill: string;
  skillCode: string;
  type: string;
  difficulty: string;
  successRate: number;
  errorRate: number;
}

export interface StudentAnswer {
  questionId: string;
  questionNumber: number;
  isCorrect: boolean;
  isBlank: boolean;
  timeSpent?: number;
}

export interface StudentDetailedResult {
  id: string;
  name: string;
  class: string;
  answers: StudentAnswer[];
  totalCorrect: number;
  totalWrong: number;
  totalBlank: number;
  finalScore: number;
  proficiency: number;
  classification: string;
}

export interface DetailedReport {
  evaluation: {
    id: string;
    title: string;
    subject: string;
    totalQuestions: number;
  };
  questions: QuestionData[];
  students: StudentDetailedResult[];
}

// Dados mock para quando o backend não estiver disponível
const mockEvaluationData: EvaluationResultsData[] = [
  {
    id: "eval-1",
    evaluationId: "eval-1",
    evaluationTitle: "Avaliação de Matemática - 9º Ano",
    subject: "Matemática",
    subjectId: "math-1",
    course: "Ensino Fundamental",
    courseId: "ef-1",
    grade: "9º Ano",
    gradeId: "9ano-1",
    school: "Escola Municipal Campo Alegre",
    schoolId: "escola-1",
    municipality: "Campo Alegre",
    municipalityId: "ca-1",
    appliedAt: "2024-01-15T10:00:00Z",
    correctedAt: "2024-01-16T14:30:00Z",
    status: "completed",
    totalStudents: 25,
    completedStudents: 23,
    pendingStudents: 2,
    absentStudents: 0,
    averageRawScore: 7.2,
    averageProficiency: 650,
    distributionByLevel: {
      abaixo_do_basico: 2,
      basico: 8,
      adequado: 10,
      avancado: 3
    },
    classesPerformance: [],
    studentsData: []
  }
];

const mockDetailedReport: DetailedReport = {
  evaluation: {
    id: "eval-1",
    title: "Avaliação de Matemática - 9º Ano",
    subject: "Matemática",
    totalQuestions: 21
  },
  questions: [
    {
      id: "q1",
      number: 1,
      text: "Questão sobre números e operações",
      skill: "Números e Operações",
      skillCode: "9N1.1",
      type: "Múltipla Escolha",
      difficulty: "Fácil",
      successRate: 85.5,
      errorRate: 14.5
    },
    {
      id: "q2", 
      number: 2,
      text: "Questão sobre álgebra",
      skill: "Álgebra",
      skillCode: "9A1.2",
      type: "Múltipla Escolha",
      difficulty: "Médio",
      successRate: 72.3,
      errorRate: 27.7
    }
  ],
  students: [
    {
      id: "student-1",
      name: "João Silva",
      class: "9º A",
      answers: [
        { questionId: "q1", questionNumber: 1, isCorrect: true, isBlank: false },
        { questionId: "q2", questionNumber: 2, isCorrect: false, isBlank: false }
      ],
      totalCorrect: 15,
      totalWrong: 5,
      totalBlank: 1,
      finalScore: 7.1,
      proficiency: 652,
      classification: "Adequado"
    }
  ]
};

export class EvaluationResultsApiService {
  
  // Buscar lista de avaliações com filtros
  static async getEvaluations(filters: ResultsFilters = {}, page = 1, perPage = 10): Promise<{
    results: EvaluationResultsData[];
    total: number;
    page: number;
    totalPages: number;
    isBackendConnected: boolean;
  }> {
    try {
      console.log('🔄 Testando conexão com backend...');
      
      // ⚠️ TEMPORÁRIO: Usar endpoint de teste para verificar conectividade
      // Este endpoint /test/avaliacoes não requer autenticação JWT
      // Para usar dados reais, alterar para '/evaluation-results/avaliacoes' com token JWT
      const response = await api.get<BackendApiResponse<BackendEvaluationResult>>('/evaluation-results/test/avaliacoes');

      // Verificar se a resposta tem os dados esperados
      if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
        console.warn('Resposta da API não possui estrutura esperada, usando dados mock');
        return {
          results: mockEvaluationData,
          total: mockEvaluationData.length,
          page: 1,
          totalPages: 1,
          isBackendConnected: false // Mock data = backend desconectado
        };
      }

      console.log('✅ Conexão com backend FUNCIONANDO! Dados recebidos:', response.data);
      
      const results = response.data.data.map(this.transformEvaluationData);
      
      return {
        results,
        total: response.data.total || results.length,
        page: response.data.page || 1,
        totalPages: response.data.total_pages || 1,
        isBackendConnected: true // ✅ Dados do backend = conectado
      };
    } catch (error) {
      console.error('❌ Erro ao conectar com backend:', error);
      console.log('📋 Usando dados mock devido ao erro de conexão');
      
      // Retornar dados mock em caso de erro
      return {
        results: mockEvaluationData,
        total: mockEvaluationData.length,
        page: 1,
        totalPages: 1,
        isBackendConnected: false // ❌ Erro = backend desconectado
      };
    }
  }

  // Buscar alunos de uma avaliação específica
  static async getStudents(evaluationId: string, filters: ResultsFilters = {}): Promise<StudentProficiency[]> {
    try {
      const backendFilters: BackendFilters = {
        turma: filters.class,
        proficiencia_min: filters.proficiencyRange?.[0],
        proficiencia_max: filters.proficiencyRange?.[1],
        nota_min: filters.scoreRange?.[0],
        nota_max: filters.scoreRange?.[1],
        classificacao: filters.proficiencyLevels,
        status: filters.status
      };

      const response = await api.get<BackendApiResponse<BackendStudentResult>>(`/evaluation-results/alunos`, {
        params: {
          avaliacao_id: evaluationId,
          ...backendFilters
        }
      });

      if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
        console.warn('Resposta da API não possui estrutura esperada para alunos');
        return [];
      }

      return response.data.data.map(this.transformStudentData);
    } catch (error) {
      console.error('Erro ao buscar alunos:', error);
      return [];
    }
  }

  // Nova função: Buscar relatório detalhado da avaliação
  static async getDetailedReport(evaluationId: string): Promise<DetailedReport> {
    try {
      console.log('🔄 Buscando relatório detalhado do backend...');
      
      // TEMPORÁRIO: Usar endpoint de teste
      const response = await api.get<BackendDetailedReport>(`/evaluation-results/test/relatorio-detalhado/${evaluationId}`);
      
      if (!response.data) {
        console.warn('Resposta da API não possui dados para relatório detalhado, usando dados mock');
        return mockDetailedReport;
      }
      
      console.log('✅ Relatório detalhado recebido do backend:', response.data);
      
      return this.transformDetailedReport(response.data);
    } catch (error) {
      console.error('❌ Erro ao buscar relatório detalhado:', error);
      console.log('📋 Usando dados mock para relatório detalhado');
      return mockDetailedReport;
    }
  }

  // Recalcular resultados de uma avaliação
  static async recalculateEvaluation(evaluationId: string): Promise<{
    success: boolean;
    message: string;
    dados_atualizados: any;
  }> {
    try {
      const response = await api.post(`/evaluation-results/avaliacoes/calcular`, {
        avaliacao_id: evaluationId
      });

      return response.data;
    } catch (error) {
      console.error('Erro ao recalcular avaliação:', error);
      return {
        success: false,
        message: 'Erro ao recalcular avaliação. Tente novamente.',
        dados_atualizados: null
      };
    }
  }

  // Buscar dados para gráfico de classificações
  static async getClassificationChart(filters: ResultsFilters = {}): Promise<ChartData> {
    try {
      const backendFilters: BackendFilters = {
        curso: filters.course,
        disciplina: filters.subject,
        escola: filters.class,
        data_inicio: filters.dateRange?.start,
        data_fim: filters.dateRange?.end
      };

      const response = await api.get<ChartData>('/evaluation-results/graficos/classificacoes', {
        params: backendFilters
      });

      return response.data || { labels: [], data: [] };
    } catch (error) {
      console.error('Erro ao buscar dados de classificação:', error);
      return { labels: [], data: [] };
    }
  }

  // Buscar dados para gráfico de proficiência
  static async getProficiencyChart(filters: ResultsFilters = {}): Promise<ChartData> {
    try {
      const backendFilters: BackendFilters = {
        curso: filters.course,
        disciplina: filters.subject,
        data_inicio: filters.dateRange?.start,
        data_fim: filters.dateRange?.end
      };

      const response = await api.get<ChartData>('/evaluation-results/graficos/proficiencia', {
        params: backendFilters
      });

      return response.data || { labels: [], data: [] };
    } catch (error) {
      console.error('Erro ao buscar dados de proficiência:', error);
      return { labels: [], data: [] };
    }
  }

  // Buscar dados para gráfico de escolas
  static async getSchoolsChart(filters: ResultsFilters = {}): Promise<ChartData> {
    try {
      const backendFilters: BackendFilters = {
        curso: filters.course,
        disciplina: filters.subject,
        data_inicio: filters.dateRange?.start,
        data_fim: filters.dateRange?.end
      };

      const response = await api.get<ChartData>('/evaluation-results/graficos/escolas', {
        params: backendFilters
      });

      return response.data || { labels: [], data: [] };
    } catch (error) {
      console.error('Erro ao buscar dados de escolas:', error);
      return { labels: [], data: [] };
    }
  }

  // Buscar opções para filtros (cursos, disciplinas, etc.)
  static async getFilterOptions(): Promise<{
    courses: string[];
    subjects: string[];
    classes: string[];
    schools: string[];
  }> {
    try {
      // Fazer múltiplas requisições para buscar opções de filtros
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
      // Retorna opções vazias em caso de erro
      return {
        courses: [],
        subjects: [],
        classes: [],
        schools: []
      };
    }
  }

  // Transformar dados do backend para o formato do frontend
  private static transformEvaluationData(backendData: BackendEvaluationResult): EvaluationResultsData {
    return {
      id: backendData.id,
      evaluationId: backendData.id,
      evaluationTitle: backendData.titulo,
      subject: backendData.disciplina,
      subjectId: backendData.id,
      course: backendData.curso,
      courseId: backendData.id,
      grade: backendData.serie,
      gradeId: backendData.id,
      school: backendData.escola,
      schoolId: backendData.id,
      municipality: backendData.municipio,
      municipalityId: backendData.id,
      appliedAt: backendData.data_aplicacao,
      correctedAt: backendData.data_correcao,
      status: this.mapStatus(backendData.status),
      totalStudents: backendData.total_alunos,
      completedStudents: backendData.alunos_participantes,
      pendingStudents: backendData.alunos_pendentes,
      absentStudents: backendData.alunos_ausentes,
      averageRawScore: backendData.media_nota,
      averageProficiency: backendData.media_proficiencia,
      distributionByLevel: {
        abaixo_do_basico: backendData.distribuicao_classificacao.abaixo_do_basico,
        basico: backendData.distribuicao_classificacao.basico,
        adequado: backendData.distribuicao_classificacao.adequado,
        avancado: backendData.distribuicao_classificacao.avancado
      },
      classesPerformance: backendData.turmas_desempenho?.map(turma => ({
        classId: turma.id,
        className: turma.nome,
        averageProficiency: turma.media_proficiencia,
        averageScore: turma.media_nota,
        totalStudents: turma.total_alunos,
        completedStudents: turma.alunos_participantes,
        distributionByLevel: {
          abaixo_do_basico: turma.distribuicao_classificacao.abaixo_do_basico,
          basico: turma.distribuicao_classificacao.basico,
          adequado: turma.distribuicao_classificacao.adequado,
          avancado: turma.distribuicao_classificacao.avancado
        }
      })) || [],
      studentsData: []
    };
  }

  private static transformStudentData(backendData: BackendStudentResult): StudentProficiency {
    return {
      studentId: backendData.id,
      studentName: backendData.nome,
      studentClass: backendData.turma,
      rawScore: backendData.nota,
      proficiencyScore: backendData.proficiencia,
      proficiencyLevel: this.mapClassificationToProficiencyLevel(backendData.classificacao),
      classification: backendData.classificacao,
      answeredQuestions: backendData.questoes_respondidas,
      correctAnswers: backendData.acertos,
      wrongAnswers: backendData.erros,
      blankAnswers: backendData.em_branco,
      timeSpent: backendData.tempo_gasto,
      status: this.mapStudentStatus(backendData.status)
    };
  }

  // Nova função: Transformar relatório detalhado
  private static transformDetailedReport(backendData: BackendDetailedReport): DetailedReport {
    return {
      evaluation: {
        id: backendData.avaliacao?.id || 'unknown',
        title: backendData.avaliacao?.titulo || 'Avaliação',
        subject: backendData.avaliacao?.disciplina || 'Disciplina',
        totalQuestions: backendData.avaliacao?.total_questoes || 0
      },
      questions: backendData.questoes?.map(q => ({
        id: q.id,
        number: q.numero,
        text: q.texto,
        skill: q.habilidade,
        skillCode: q.codigo_habilidade,
        type: q.tipo,
        difficulty: q.dificuldade,
        successRate: q.porcentagem_acertos,
        errorRate: q.porcentagem_erros
      })) || [],
      students: backendData.alunos?.map(s => ({
        id: s.id,
        name: s.nome,
        class: s.turma,
        answers: s.respostas?.map(r => ({
          questionId: r.questao_id,
          questionNumber: r.questao_numero,
          isCorrect: r.resposta_correta,
          isBlank: r.resposta_em_branco,
          timeSpent: r.tempo_gasto
        })) || [],
        totalCorrect: s.total_acertos,
        totalWrong: s.total_erros,
        totalBlank: s.total_em_branco,
        finalScore: s.nota_final,
        proficiency: s.proficiencia,
        classification: s.classificacao
      })) || []
    };
  }

  private static mapStatus(backendStatus: string): 'completed' | 'pending' | 'in_progress' {
    switch (backendStatus) {
      case 'concluida':
        return 'completed';
      case 'pendente':
        return 'pending';
      case 'em_andamento':
        return 'in_progress';
      default:
        return 'pending';
    }
  }

  private static mapStudentStatus(backendStatus: string): 'completed' | 'pending' | 'absent' {
    switch (backendStatus) {
      case 'concluida':
        return 'completed';
      case 'pendente':
        return 'pending';
      case 'ausente':
        return 'absent';
      default:
        return 'pending';
    }
  }

  private static mapClassificationToProficiencyLevel(classification: string): 'abaixo_do_basico' | 'basico' | 'adequado' | 'avancado' {
    const normalized = classification.toLowerCase().replace(/\s+/g, '_');
    
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
} 