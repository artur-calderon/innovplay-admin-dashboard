// Mock data for evaluation results
export interface EvaluationResult {
  id: string;
  evaluationId: string;
  evaluationTitle: string;
  subject: string;
  grade: string;
  school: string;
  municipality: string;
  totalStudents: number;
  completedStudents: number;
  pendingStudents: number;
  averageScore: number;
  maxScore: number;
  minScore: number;
  passRate: number; // percentage
  appliedAt: string;
  correctedAt?: string;
  status: 'completed' | 'pending' | 'in_progress';
  studentResults: StudentResult[];
  questionAnalysis: QuestionAnalysis[];
  difficultyAnalysis: DifficultyAnalysis;
}

export interface StudentResult {
  studentId: string;
  studentName: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  blankAnswers: number;
  percentage: number;
  status: 'passed' | 'failed';
  timeSpent?: number; // em minutos
  answers: Answer[];
}

export interface Answer {
  questionId: string;
  selectedOption?: number;
  isCorrect: boolean;
  timeSpent?: number;
}

export interface QuestionAnalysis {
  questionId: string;
  questionText: string;
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
  totalAnswers: number;
  correctAnswers: number;
  wrongAnswers: number;
  blankAnswers: number;
  successRate: number;
  averageTime?: number;
  commonWrongAnswers: { option: number; count: number }[];
}

export interface DifficultyAnalysis {
  easy: { total: number; averageSuccess: number };
  medium: { total: number; averageSuccess: number };
  hard: { total: number; averageSuccess: number };
}

// Mock data
export const mockEvaluationResults: EvaluationResult[] = [
  {
    id: "result-1",
    evaluationId: "eval-1",
    evaluationTitle: "Avaliação de Matemática - 5º Ano",
    subject: "Matemática",
    grade: "5º Ano",
    school: "E.M. João Silva",
    municipality: "São Paulo",
    totalStudents: 32,
    completedStudents: 28,
    pendingStudents: 4,
    averageScore: 7.2,
    maxScore: 9.5,
    minScore: 3.2,
    passRate: 75,
    appliedAt: "2024-01-15T09:00:00Z",
    correctedAt: "2024-01-15T17:30:00Z",
    status: "completed",
    studentResults: [
      {
        studentId: "student-1",
        studentName: "Ana Silva Santos",
        score: 8.5,
        totalQuestions: 20,
        correctAnswers: 17,
        wrongAnswers: 2,
        blankAnswers: 1,
        percentage: 85,
        status: "passed",
        timeSpent: 45,
        answers: []
      },
      {
        studentId: "student-2",
        studentName: "Carlos Eduardo Lima",
        score: 6.0,
        totalQuestions: 20,
        correctAnswers: 12,
        wrongAnswers: 6,
        blankAnswers: 2,
        percentage: 60,
        status: "passed",
        timeSpent: 52,
        answers: []
      },
      {
        studentId: "student-3",
        studentName: "Maria Fernanda Costa",
        score: 9.0,
        totalQuestions: 20,
        correctAnswers: 18,
        wrongAnswers: 1,
        blankAnswers: 1,
        percentage: 90,
        status: "passed",
        timeSpent: 38,
        answers: []
      }
    ],
    questionAnalysis: [
      {
        questionId: "q1",
        questionText: "Resolva: 15 + 23 = ?",
        subject: "Matemática",
        difficulty: "easy",
        totalAnswers: 28,
        correctAnswers: 26,
        wrongAnswers: 2,
        blankAnswers: 0,
        successRate: 92.8,
        averageTime: 2.5,
        commonWrongAnswers: [
          { option: 2, count: 2 }
        ]
      },
      {
        questionId: "q2",
        questionText: "Calcule a área de um retângulo com base 8cm e altura 5cm",
        subject: "Matemática", 
        difficulty: "medium",
        totalAnswers: 28,
        correctAnswers: 18,
        wrongAnswers: 8,
        blankAnswers: 2,
        successRate: 64.3,
        averageTime: 4.2,
        commonWrongAnswers: [
          { option: 1, count: 5 },
          { option: 3, count: 3 }
        ]
      }
    ],
    difficultyAnalysis: {
      easy: { total: 8, averageSuccess: 88.5 },
      medium: { total: 10, averageSuccess: 68.2 },
      hard: { total: 2, averageSuccess: 45.0 }
    }
  },
  {
    id: "result-2",
    evaluationId: "eval-2",
    evaluationTitle: "Simulado de Português - 3º Ano",
    subject: "Português",
    grade: "3º Ano",
    school: "E.E. Maria Santos",
    municipality: "São Paulo",
    totalStudents: 25,
    completedStudents: 25,
    pendingStudents: 0,
    averageScore: 6.8,
    maxScore: 9.2,
    minScore: 4.1,
    passRate: 68,
    appliedAt: "2024-01-14T14:00:00Z",
    correctedAt: "2024-01-14T18:45:00Z",
    status: "completed",
    studentResults: [
      {
        studentId: "student-4",
        studentName: "Pedro Henrique Oliveira",
        score: 7.5,
        totalQuestions: 15,
        correctAnswers: 11,
        wrongAnswers: 3,
        blankAnswers: 1,
        percentage: 75,
        status: "passed",
        timeSpent: 60,
        answers: []
      }
    ],
    questionAnalysis: [],
    difficultyAnalysis: {
      easy: { total: 5, averageSuccess: 82.0 },
      medium: { total: 8, averageSuccess: 63.5 },
      hard: { total: 2, averageSuccess: 38.0 }
    }
  },
  {
    id: "result-3",
    evaluationId: "eval-3",
    evaluationTitle: "Prova de Ciências - 4º Ano",
    subject: "Ciências",
    grade: "4º Ano",
    school: "Colégio Dom Pedro",
    municipality: "São Paulo",
    totalStudents: 28,
    completedStudents: 15,
    pendingStudents: 13,
    averageScore: 0,
    maxScore: 0,
    minScore: 0,
    passRate: 0,
    appliedAt: "2024-01-16T10:00:00Z",
    status: "pending",
    studentResults: [],
    questionAnalysis: [],
    difficultyAnalysis: {
      easy: { total: 0, averageSuccess: 0 },
      medium: { total: 0, averageSuccess: 0 },
      hard: { total: 0, averageSuccess: 0 }
    }
  },
  {
    id: "result-4",
    evaluationId: "eval-4",
    evaluationTitle: "Avaliação de História - 6º Ano",
    subject: "História",
    grade: "6º Ano",
    school: "E.E. Santos Dumont",
    municipality: "São Paulo",
    totalStudents: 30,
    completedStudents: 30,
    pendingStudents: 0,
    averageScore: 8.1,
    maxScore: 9.8,
    minScore: 5.5,
    passRate: 83,
    appliedAt: "2024-01-12T08:30:00Z",
    correctedAt: "2024-01-12T16:00:00Z",
    status: "completed",
    studentResults: [
      {
        studentId: "student-5",
        studentName: "Julia Martins Silva",
        score: 8.8,
        totalQuestions: 15,
        correctAnswers: 13,
        wrongAnswers: 2,
        blankAnswers: 0,
        percentage: 88,
        status: "passed",
        timeSpent: 42,
        answers: []
      },
      {
        studentId: "student-6",
        studentName: "Roberto Santos Lima",
        score: 7.2,
        totalQuestions: 15,
        correctAnswers: 11,
        wrongAnswers: 3,
        blankAnswers: 1,
        percentage: 72,
        status: "passed",
        timeSpent: 55,
        answers: []
      }
    ],
    questionAnalysis: [
      {
        questionId: "h1",
        questionText: "Em que século ocorreu o descobrimento do Brasil?",
        subject: "História",
        difficulty: "easy",
        totalAnswers: 30,
        correctAnswers: 28,
        wrongAnswers: 2,
        blankAnswers: 0,
        successRate: 93.3,
        averageTime: 1.8,
        commonWrongAnswers: [
          { option: 3, count: 2 }
        ]
      }
    ],
    difficultyAnalysis: {
      easy: { total: 6, averageSuccess: 91.2 },
      medium: { total: 7, averageSuccess: 76.8 },
      hard: { total: 2, averageSuccess: 55.0 }
    }
  },
  {
    id: "result-5",
    evaluationId: "eval-5",
    evaluationTitle: "Simulado de Geografia - 8º Ano",
    subject: "Geografia",
    grade: "8º Ano",
    school: "Colégio Brasil",
    municipality: "São Paulo",
    totalStudents: 26,
    completedStudents: 24,
    pendingStudents: 2,
    averageScore: 6.4,
    maxScore: 8.7,
    minScore: 3.8,
    passRate: 62,
    appliedAt: "2024-01-18T14:00:00Z",
    correctedAt: "2024-01-18T19:30:00Z",
    status: "completed",
    studentResults: [
      {
        studentId: "student-7",
        studentName: "Larissa Oliveira Costa",
        score: 7.8,
        totalQuestions: 18,
        correctAnswers: 14,
        wrongAnswers: 3,
        blankAnswers: 1,
        percentage: 78,
        status: "passed",
        timeSpent: 48,
        answers: []
      }
    ],
    questionAnalysis: [],
    difficultyAnalysis: {
      easy: { total: 7, averageSuccess: 78.4 },
      medium: { total: 9, averageSuccess: 58.1 },
      hard: { total: 2, averageSuccess: 32.5 }
    }
  }
];

// Mock API functions
export const mockApi = {
  getEvaluationResults: async (): Promise<EvaluationResult[]> => {
    // Simular delay de API
    await new Promise(resolve => setTimeout(resolve, 1000));
    return mockEvaluationResults;
  },

  getEvaluationResultById: async (id: string): Promise<EvaluationResult | null> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    return mockEvaluationResults.find(result => result.id === id) || null;
  },

  getResultsByStatus: async (status: 'completed' | 'pending' | 'in_progress'): Promise<EvaluationResult[]> => {
    await new Promise(resolve => setTimeout(resolve, 600));
    return mockEvaluationResults.filter(result => result.status === status);
  },

  exportResults: async (resultIds: string[]): Promise<{ success: boolean; downloadUrl?: string }> => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return {
      success: true,
      downloadUrl: "https://example.com/export/results.xlsx"
    };
  },

  generateCSVReport: async (): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const results = mockEvaluationResults.filter(r => r.status === 'completed');
    
    // Headers do CSV
    let csvContent = "Avaliação,Disciplina,Série,Escola,Data Aplicação,Total Alunos,Participantes,Média,Taxa Aprovação,Maior Nota,Menor Nota\n";
    
    // Dados das avaliações
    results.forEach(result => {
      const row = [
        `"${result.evaluationTitle}"`,
        `"${result.subject}"`,
        `"${result.grade}"`,
        `"${result.school}"`,
        `"${new Date(result.appliedAt).toLocaleDateString('pt-BR')}"`,
        result.totalStudents,
        result.completedStudents,
        result.averageScore.toFixed(1),
        `${result.passRate}%`,
        result.maxScore.toFixed(1),
        result.minScore.toFixed(1)
      ].join(',');
      csvContent += row + '\n';
    });
    
    return csvContent;
  },

  generateExcelData: async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const results = mockEvaluationResults.filter(r => r.status === 'completed');
    
    // Planilha principal com resumo
    const summaryData = [
      ['RELATÓRIO DE AVALIAÇÕES'],
      ['Gerado em:', new Date().toLocaleDateString('pt-BR')],
      [''],
      ['RESUMO GERAL'],
      ['Total de Avaliações:', results.length],
      ['Alunos Participantes:', results.reduce((sum, r) => sum + r.completedStudents, 0)],
      ['Média Geral:', (results.reduce((sum, r) => sum + r.averageScore, 0) / results.length).toFixed(1)],
      ['Taxa de Aprovação Média:', (results.reduce((sum, r) => sum + r.passRate, 0) / results.length).toFixed(1) + '%'],
      [''],
      ['DETALHAMENTO POR AVALIAÇÃO'],
      ['Avaliação', 'Disciplina', 'Série', 'Escola', 'Data Aplicação', 'Total Alunos', 'Participantes', 'Média', 'Taxa Aprovação', 'Maior Nota', 'Menor Nota']
    ];

    // Adicionar dados das avaliações
    results.forEach(result => {
      summaryData.push([
        result.evaluationTitle,
        result.subject,
        result.grade,
        result.school,
        new Date(result.appliedAt).toLocaleDateString('pt-BR'),
        result.totalStudents,
        result.completedStudents,
        result.averageScore,
        result.passRate / 100,
        result.maxScore,
        result.minScore
      ]);
    });

    // Planilha de análise de dificuldade
    const difficultyData = [
      ['ANÁLISE POR DIFICULDADE'],
      [''],
      ['Avaliação', 'Questões Fáceis', 'Taxa Fáceis (%)', 'Questões Médias', 'Taxa Médias (%)', 'Questões Difíceis', 'Taxa Difíceis (%)']
    ];

    results.forEach(result => {
      difficultyData.push([
        result.evaluationTitle,
        result.difficultyAnalysis.easy.total,
        result.difficultyAnalysis.easy.averageSuccess,
        result.difficultyAnalysis.medium.total,
        result.difficultyAnalysis.medium.averageSuccess,
        result.difficultyAnalysis.hard.total,
        result.difficultyAnalysis.hard.averageSuccess
      ]);
    });

    // Planilha de resultados de alunos
    const studentsData = [
      ['RESULTADOS DOS ALUNOS'],
      [''],
      ['Avaliação', 'Aluno', 'Nota', 'Acertos', 'Erros', 'Em Branco', 'Percentual', 'Status', 'Tempo (min)']
    ];

    results.forEach(result => {
      result.studentResults.forEach(student => {
        studentsData.push([
          result.evaluationTitle,
          student.studentName,
          student.score,
          student.correctAnswers,
          student.wrongAnswers,
          student.blankAnswers,
          student.percentage / 100,
          student.status === 'passed' ? 'Aprovado' : 'Reprovado',
          student.timeSpent || ''
        ]);
      });
    });

    return {
      summary: summaryData,
      difficulty: difficultyData,
      students: studentsData
    };
  }
}; 