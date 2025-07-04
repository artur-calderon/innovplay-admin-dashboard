import { format, subDays, addDays } from 'date-fns';

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
        '"' + result.evaluationTitle + '"',
        '"' + result.subject + '"',
        '"' + result.grade + '"',
        '"' + result.school + '"',
        '"' + (new Date(result.appliedAt)).toLocaleDateString('pt-BR') + '"',
        result.totalStudents,
        result.completedStudents,
        result.averageScore.toFixed(1),
        result.passRate + '%',
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
        String(result.evaluationTitle),
        String(result.difficultyAnalysis.easy.total),
        String(result.difficultyAnalysis.easy.averageSuccess),
        String(result.difficultyAnalysis.medium.total),
        String(result.difficultyAnalysis.medium.averageSuccess),
        String(result.difficultyAnalysis.hard.total),
        String(result.difficultyAnalysis.hard.averageSuccess)
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
          String(result.evaluationTitle),
          String(student.studentName),
          String(student.score),
          String(student.correctAnswers),
          String(student.wrongAnswers),
          String(student.blankAnswers),
          String(student.percentage / 100),
          student.status === 'passed' ? 'Aprovado' : 'Reprovado',
          String(student.timeSpent ?? '')
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

// ===== DADOS MOCKADOS BASE =====

// 30 questões variadas (fácil, médio, difícil)
export const mockQuestions = [
  // MATEMÁTICA - FÁCIL
  {
    id: "q1",
    title: "Adição de Números Decimais",
    text: "Qual é o resultado da operação 2,5 + 3,7?",
    type: "multipleChoice",
    subjectId: "math",
    subject: { id: "math", name: "Matemática" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Básico",
    value: "2",
    solution: "6,2",
    options: [
      { id: "a", text: "5,2", isCorrect: false },
      { id: "b", text: "6,2", isCorrect: true },
      { id: "c", text: "6,1", isCorrect: false },
      { id: "d", text: "5,3", isCorrect: false }
    ],
    skills: ["Operações com decimais"],
    created_by: "teacher-1"
  },
  {
    id: "q2",
    title: "Verdadeiro ou Falso - Frações",
    text: "A fração 3/4 é equivalente a 0,75.",
    type: "trueFalse",
    subjectId: "math",
    subject: { id: "math", name: "Matemática" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Básico",
    value: "2",
    solution: "Verdadeiro",
    options: [
      { id: "true", text: "Verdadeiro", isCorrect: true },
      { id: "false", text: "Falso", isCorrect: false }
    ],
    skills: ["Frações equivalentes"],
    created_by: "teacher-1"
  },
  {
    id: "q3",
    title: "Subtração Simples",
    text: "Calcule: 15 - 8 = ?",
    type: "multipleChoice",
    subjectId: "math",
    subject: { id: "math", name: "Matemática" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Básico",
    value: "2",
    solution: "7",
    options: [
      { id: "a", text: "5", isCorrect: false },
      { id: "b", text: "6", isCorrect: false },
      { id: "c", text: "7", isCorrect: true },
      { id: "d", text: "8", isCorrect: false }
    ],
    skills: ["Subtração"],
    created_by: "teacher-1"
  },
  {
    id: "q4",
    title: "Multiplicação Básica",
    text: "Quanto é 6 x 7?",
    type: "multipleChoice",
    subjectId: "math",
    subject: { id: "math", name: "Matemática" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Básico",
    value: "2",
    solution: "42",
    options: [
      { id: "a", text: "40", isCorrect: false },
      { id: "b", text: "41", isCorrect: false },
      { id: "c", text: "42", isCorrect: true },
      { id: "d", text: "43", isCorrect: false }
    ],
    skills: ["Multiplicação"],
    created_by: "teacher-1"
  },
  {
    id: "q5",
    title: "Divisão Simples",
    text: "Divida 24 por 6.",
    type: "multipleChoice",
    subjectId: "math",
    subject: { id: "math", name: "Matemática" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Básico",
    value: "2",
    solution: "4",
    options: [
      { id: "a", text: "3", isCorrect: false },
      { id: "b", text: "4", isCorrect: true },
      { id: "c", text: "5", isCorrect: false },
      { id: "d", text: "6", isCorrect: false }
    ],
    skills: ["Divisão"],
    created_by: "teacher-1"
  },

  // MATEMÁTICA - MÉDIO
  {
    id: "q6",
    title: "Soma de Frações",
    text: "Explique como você faria para somar as frações 1/4 + 2/3.",
    type: "open",
    subjectId: "math",
    subject: { id: "math", name: "Matemática" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Adequado",
    value: "3",
    solution: "Primeiro encontro o denominador comum que é 12. Depois transformo: 1/4 = 3/12 e 2/3 = 8/12. Aí somo: 3/12 + 8/12 = 11/12.",
    options: [],
    skills: ["Soma de frações", "Denominador comum"],
    created_by: "teacher-1"
  },
  {
    id: "q7",
    title: "Área do Retângulo",
    text: "Calcule a área de um retângulo com base 8cm e altura 5cm.",
    type: "multipleChoice",
    subjectId: "math",
    subject: { id: "math", name: "Matemática" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Adequado",
    value: "2",
    solution: "40cm²",
    options: [
      { id: "a", text: "13cm²", isCorrect: false },
      { id: "b", text: "40cm²", isCorrect: true },
      { id: "c", text: "26cm²", isCorrect: false },
      { id: "d", text: "35cm²", isCorrect: false }
    ],
    skills: ["Cálculo de área"],
    created_by: "teacher-1"
  },
  {
    id: "q8",
    title: "Perímetro do Quadrado",
    text: "Um quadrado tem lado de 6cm. Qual é seu perímetro?",
    type: "multipleChoice",
    subjectId: "math",
    subject: { id: "math", name: "Matemática" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Adequado",
    value: "2",
    solution: "24cm",
    options: [
      { id: "a", text: "12cm", isCorrect: false },
      { id: "b", text: "18cm", isCorrect: false },
      { id: "c", text: "24cm", isCorrect: true },
      { id: "d", text: "36cm", isCorrect: false }
    ],
    skills: ["Cálculo de perímetro"],
    created_by: "teacher-1"
  },

  // MATEMÁTICA - DIFÍCIL
  {
    id: "q9",
    title: "Problema de Regra de Três",
    text: "Se 3 operários fazem um trabalho em 8 dias, quantos dias 6 operários levariam para fazer o mesmo trabalho?",
    type: "open",
    subjectId: "math",
    subject: { id: "math", name: "Matemática" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Avançado",
    value: "4",
    solution: "Se 3 operários fazem em 8 dias, então 6 operários (o dobro) farão na metade do tempo: 8 ÷ 2 = 4 dias.",
    options: [],
    skills: ["Regra de três", "Proporcionalidade"],
    created_by: "teacher-1"
  },
  {
    id: "q10",
    title: "Equação do Primeiro Grau",
    text: "Resolva a equação: 2x + 5 = 13",
    type: "open",
    subjectId: "math",
    subject: { id: "math", name: "Matemática" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Avançado",
    value: "3",
    solution: "2x + 5 = 13 → 2x = 13 - 5 → 2x = 8 → x = 8 ÷ 2 → x = 4",
    options: [],
    skills: ["Equações do primeiro grau"],
    created_by: "teacher-1"
  },

  // PORTUGUÊS - FÁCIL
  {
    id: "q11",
    title: "Identificação de Substantivos",
    text: "Qual das palavras abaixo é um substantivo?",
    type: "multipleChoice",
    subjectId: "port",
    subject: { id: "port", name: "Português" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Básico",
    value: "2",
    solution: "casa",
    options: [
      { id: "a", text: "bonito", isCorrect: false },
      { id: "b", text: "correr", isCorrect: false },
      { id: "c", text: "casa", isCorrect: true },
      { id: "d", text: "muito", isCorrect: false }
    ],
    skills: ["Classes gramaticais"],
    created_by: "teacher-2"
  },
  {
    id: "q12",
    title: "Vogais e Consoantes",
    text: "Quantas vogais existem na palavra 'EDUCAÇÃO'?",
    type: "multipleChoice",
    subjectId: "port",
    subject: { id: "port", name: "Português" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Básico",
    value: "2",
    solution: "5",
    options: [
      { id: "a", text: "3", isCorrect: false },
      { id: "b", text: "4", isCorrect: false },
      { id: "c", text: "5", isCorrect: true },
      { id: "d", text: "6", isCorrect: false }
    ],
    skills: ["Fonética"],
    created_by: "teacher-2"
  },
  {
    id: "q13",
    title: "Sílaba Tônica",
    text: "Em qual sílaba está a tônica da palavra 'ESCOLA'?",
    type: "multipleChoice",
    subjectId: "port",
    subject: { id: "port", name: "Português" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Básico",
    value: "2",
    solution: "Segunda sílaba (co)",
    options: [
      { id: "a", text: "Primeira sílaba (es)", isCorrect: false },
      { id: "b", text: "Segunda sílaba (co)", isCorrect: true },
      { id: "c", text: "Terceira sílaba (la)", isCorrect: false }
    ],
    skills: ["Acentuação"],
    created_by: "teacher-2"
  },

  // PORTUGUÊS - MÉDIO
  {
    id: "q14",
    title: "Interpretação de Texto",
    text: "Leia o texto: 'O gato dormia tranquilamente no sofá. De repente, um barulho o acordou.' Qual é o tema principal do texto?",
    type: "open",
    subjectId: "port",
    subject: { id: "port", name: "Português" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Adequado",
    value: "3",
    solution: "O texto fala sobre um gato que estava dormindo e foi acordado por um barulho.",
    options: [],
    skills: ["Interpretação de texto"],
    created_by: "teacher-2"
  },
  {
    id: "q15",
    title: "Sinônimos",
    text: "Qual é o sinônimo de 'ALEGRE'?",
    type: "multipleChoice",
    subjectId: "port",
    subject: { id: "port", name: "Português" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Adequado",
    value: "2",
    solution: "Feliz",
    options: [
      { id: "a", text: "Triste", isCorrect: false },
      { id: "b", text: "Feliz", isCorrect: true },
      { id: "c", text: "Bravo", isCorrect: false },
      { id: "d", text: "Calmo", isCorrect: false }
    ],
    skills: ["Sinônimos"],
    created_by: "teacher-2"
  },

  // CIÊNCIAS - FÁCIL
  {
    id: "q16",
    title: "Estados da Matéria",
    text: "A água em estado líquido pode se transformar em vapor quando:",
    type: "multipleChoice",
    subjectId: "cienc",
    subject: { id: "cienc", name: "Ciências" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Básico",
    value: "2",
    solution: "É aquecida",
    options: [
      { id: "a", text: "É resfriada", isCorrect: false },
      { id: "b", text: "É aquecida", isCorrect: true },
      { id: "c", text: "É congelada", isCorrect: false },
      { id: "d", text: "É misturada", isCorrect: false }
    ],
    skills: ["Estados da matéria"],
    created_by: "teacher-3"
  },
  {
    id: "q17",
    title: "Órgãos dos Sentidos",
    text: "Qual órgão é responsável pela visão?",
    type: "multipleChoice",
    subjectId: "cienc",
    subject: { id: "cienc", name: "Ciências" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Básico",
    value: "2",
    solution: "Os olhos",
    options: [
      { id: "a", text: "Os ouvidos", isCorrect: false },
      { id: "b", text: "Os olhos", isCorrect: true },
      { id: "c", text: "O nariz", isCorrect: false },
      { id: "d", text: "A boca", isCorrect: false }
    ],
    skills: ["Sistema sensorial"],
    created_by: "teacher-3"
  },

  // CIÊNCIAS - MÉDIO
  {
    id: "q18",
    title: "Ciclo da Água",
    text: "Explique o que acontece durante a evaporação no ciclo da água.",
    type: "open",
    subjectId: "cienc",
    subject: { id: "cienc", name: "Ciências" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Adequado",
    value: "3",
    solution: "Durante a evaporação, a água líquida se transforma em vapor d'água devido ao calor do sol, subindo para a atmosfera.",
    options: [],
    skills: ["Ciclo da água"],
    created_by: "teacher-3"
  },

  // HISTÓRIA - FÁCIL
  {
    id: "q19",
    title: "Descobrimento do Brasil",
    text: "Em que ano o Brasil foi descoberto?",
    type: "multipleChoice",
    subjectId: "hist",
    subject: { id: "hist", name: "História" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Básico",
    value: "2",
    solution: "1500",
    options: [
      { id: "a", text: "1492", isCorrect: false },
      { id: "b", text: "1500", isCorrect: true },
      { id: "c", text: "1501", isCorrect: false },
      { id: "d", text: "1499", isCorrect: false }
    ],
    skills: ["História do Brasil"],
    created_by: "teacher-4"
  },

  // GEOGRAFIA - FÁCIL
  {
    id: "q20",
    title: "Capital do Brasil",
    text: "Qual é a capital do Brasil?",
    type: "multipleChoice",
    subjectId: "geo",
    subject: { id: "geo", name: "Geografia" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Básico",
    value: "2",
    solution: "Brasília",
    options: [
      { id: "a", text: "São Paulo", isCorrect: false },
      { id: "b", text: "Rio de Janeiro", isCorrect: false },
      { id: "c", text: "Brasília", isCorrect: true },
      { id: "d", text: "Salvador", isCorrect: false }
    ],
    skills: ["Geografia do Brasil"],
    created_by: "teacher-5"
  },

  // QUESTÕES ADICIONAIS PARA COMPLETAR 30
  {
    id: "q21",
    title: "Multiplicação por 10",
    text: "Quanto é 25 x 10?",
    type: "multipleChoice",
    subjectId: "math",
    subject: { id: "math", name: "Matemática" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Básico",
    value: "2",
    solution: "250",
    options: [
      { id: "a", text: "250", isCorrect: true },
      { id: "b", text: "25", isCorrect: false },
      { id: "c", text: "2500", isCorrect: false },
      { id: "d", text: "2.5", isCorrect: false }
    ],
    skills: ["Multiplicação"],
    created_by: "teacher-1"
  },
  {
    id: "q22",
    title: "Antônimos",
    text: "Qual é o antônimo de 'GRANDE'?",
    type: "multipleChoice",
    subjectId: "port",
    subject: { id: "port", name: "Português" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Básico",
    value: "2",
    solution: "Pequeno",
    options: [
      { id: "a", text: "Alto", isCorrect: false },
      { id: "b", text: "Pequeno", isCorrect: true },
      { id: "c", text: "Largo", isCorrect: false },
      { id: "d", text: "Forte", isCorrect: false }
    ],
    skills: ["Antônimos"],
    created_by: "teacher-2"
  },
  {
    id: "q23",
    title: "Animais Vertebrados",
    text: "Qual destes animais é vertebrado?",
    type: "multipleChoice",
    subjectId: "cienc",
    subject: { id: "cienc", name: "Ciências" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Básico",
    value: "2",
    solution: "Cachorro",
    options: [
      { id: "a", text: "Aranha", isCorrect: false },
      { id: "b", text: "Cachorro", isCorrect: true },
      { id: "c", text: "Caracol", isCorrect: false },
      { id: "d", text: "Minhoca", isCorrect: false }
    ],
    skills: ["Classificação dos animais"],
    created_by: "teacher-3"
  },
  {
    id: "q24",
    title: "Divisão com Resto",
    text: "Divida 17 por 3 e indique o resto.",
    type: "open",
    subjectId: "math",
    subject: { id: "math", name: "Matemática" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Adequado",
    value: "3",
    solution: "17 ÷ 3 = 5 com resto 2",
    options: [],
    skills: ["Divisão com resto"],
    created_by: "teacher-1"
  },
  {
    id: "q25",
    title: "Produção de Texto",
    text: "Escreva um pequeno texto (5 linhas) sobre sua escola.",
    type: "open",
    subjectId: "port",
    subject: { id: "port", name: "Português" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Adequado",
    value: "4",
    solution: "Resposta pessoal - deve incluir descrição da escola, atividades, professores, etc.",
    options: [],
    skills: ["Produção de texto"],
    created_by: "teacher-2"
  },
  {
    id: "q26",
    title: "Sistema Solar",
    text: "Qual é o planeta mais próximo do Sol?",
    type: "multipleChoice",
    subjectId: "cienc",
    subject: { id: "cienc", name: "Ciências" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Básico",
    value: "2",
    solution: "Mercúrio",
    options: [
      { id: "a", text: "Vênus", isCorrect: false },
      { id: "b", text: "Mercúrio", isCorrect: true },
      { id: "c", text: "Terra", isCorrect: false },
      { id: "d", text: "Marte", isCorrect: false }
    ],
    skills: ["Sistema solar"],
    created_by: "teacher-3"
  },
  {
    id: "q27",
    title: "Problema de Porcentagem",
    text: "Se 20% de uma turma tem 30 alunos, quantos alunos tem a turma toda?",
    type: "open",
    subjectId: "math",
    subject: { id: "math", name: "Matemática" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Avançado",
    value: "4",
    solution: "Se 20% = 30 alunos, então 100% = 30 × 5 = 150 alunos",
    options: [],
    skills: ["Porcentagem"],
    created_by: "teacher-1"
  },
  {
    id: "q28",
    title: "Independência do Brasil",
    text: "Em que ano o Brasil se tornou independente de Portugal?",
    type: "multipleChoice",
    subjectId: "hist",
    subject: { id: "hist", name: "História" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Básico",
    value: "2",
    solution: "1822",
    options: [
      { id: "a", text: "1808", isCorrect: false },
      { id: "b", text: "1822", isCorrect: true },
      { id: "c", text: "1889", isCorrect: false },
      { id: "d", text: "1891", isCorrect: false }
    ],
    skills: ["História do Brasil"],
    created_by: "teacher-4"
  },
  {
    id: "q29",
    title: "Regiões do Brasil",
    text: "Quantas regiões o Brasil possui?",
    type: "multipleChoice",
    subjectId: "geo",
    subject: { id: "geo", name: "Geografia" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Básico",
    value: "2",
    solution: "5",
    options: [
      { id: "a", text: "3", isCorrect: false },
      { id: "b", text: "4", isCorrect: false },
      { id: "c", text: "5", isCorrect: true },
      { id: "d", text: "6", isCorrect: false }
    ],
    skills: ["Geografia do Brasil"],
    created_by: "teacher-5"
  },
  {
    id: "q30",
    title: "Alimentação Saudável",
    text: "Explique por que é importante ter uma alimentação balanceada.",
    type: "open",
    subjectId: "cienc",
    subject: { id: "cienc", name: "Ciências" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Adequado",
    value: "3",
    solution: "Uma alimentação balanceada fornece todos os nutrientes necessários para o crescimento, desenvolvimento e manutenção da saúde.",
    options: [],
    skills: ["Saúde e nutrição"],
    created_by: "teacher-3"
  },
  {
    id: "q31",
    title: "Proclamação da República",
    text: "Em que ano foi proclamada a República no Brasil?",
    type: "multipleChoice",
    subjectId: "hist",
    subject: { id: "hist", name: "História" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Básico",
    value: "2",
    solution: "1889",
    options: [
      { id: "a", text: "1822", isCorrect: false },
      { id: "b", text: "1889", isCorrect: true },
      { id: "c", text: "1891", isCorrect: false },
      { id: "d", text: "1900", isCorrect: false }
    ],
    skills: ["História do Brasil"],
    created_by: "teacher-4"
  },
  {
    id: "q32",
    title: "Clima do Brasil",
    text: "Qual é o clima predominante na região Norte do Brasil?",
    type: "multipleChoice",
    subjectId: "geo",
    subject: { id: "geo", name: "Geografia" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Básico",
    value: "2",
    solution: "Equatorial",
    options: [
      { id: "a", text: "Tropical", isCorrect: false },
      { id: "b", text: "Equatorial", isCorrect: true },
      { id: "c", text: "Subtropical", isCorrect: false },
      { id: "d", text: "Semiárido", isCorrect: false }
    ],
    skills: ["Geografia do Brasil"],
    created_by: "teacher-5"
  }
];

// 30 alunos com dados realistas
export const mockStudents = [
  { id: "student-1", name: "Ana Silva Santos", grade: "5º Ano", class: "5A", school: "E.M. João Silva", status: "active", createdAt: "2024-01-01T00:00:00Z" },
  { id: "student-2", name: "Bruno Costa Lima", grade: "5º Ano", class: "5A", school: "E.M. João Silva", status: "active", createdAt: "2024-01-01T00:00:00Z" },
  { id: "student-3", name: "Carlos Eduardo Oliveira", grade: "5º Ano", class: "5A", school: "E.M. João Silva", status: "active", createdAt: "2024-01-01T00:00:00Z" },
  { id: "student-4", name: "Daniela Ferreira Costa", grade: "5º Ano", class: "5A", school: "E.M. João Silva", status: "active", createdAt: "2024-01-01T00:00:00Z" },
  { id: "student-5", name: "Eduardo Santos Pereira", grade: "5º Ano", class: "5A", school: "E.M. João Silva", status: "active", createdAt: "2024-01-01T00:00:00Z" },
  { id: "student-6", name: "Fernanda Almeida Silva", grade: "5º Ano", class: "5B", school: "E.M. João Silva", status: "active", createdAt: "2024-01-01T00:00:00Z" },
  { id: "student-7", name: "Gabriel Martins Rodrigues", grade: "5º Ano", class: "5B", school: "E.M. João Silva", status: "active", createdAt: "2024-01-01T00:00:00Z" },
  { id: "student-8", name: "Helena Costa Santos", grade: "5º Ano", class: "5B", school: "E.M. João Silva", status: "active", createdAt: "2024-01-01T00:00:00Z" },
  { id: "student-9", name: "Igor Silva Oliveira", grade: "5º Ano", class: "5B", school: "E.M. João Silva", status: "active", createdAt: "2024-01-01T00:00:00Z" },
  { id: "student-10", name: "Julia Ferreira Lima", grade: "5º Ano", class: "5B", school: "E.M. João Silva", status: "active", createdAt: "2024-01-01T00:00:00Z" },
  { id: "student-11", name: "Kevin Santos Costa", grade: "5º Ano", class: "5C", school: "E.M. João Silva", status: "active", createdAt: "2024-01-01T00:00:00Z" },
  { id: "student-12", name: "Larissa Oliveira Silva", grade: "5º Ano", class: "5C", school: "E.M. João Silva", status: "active", createdAt: "2024-01-01T00:00:00Z" },
  { id: "student-13", name: "Marcos Costa Lima", grade: "5º Ano", class: "5C", school: "E.M. João Silva", status: "active", createdAt: "2024-01-01T00:00:00Z" },
  { id: "student-14", name: "Natalia Silva Santos", grade: "5º Ano", class: "5C", school: "E.M. João Silva", status: "active", createdAt: "2024-01-01T00:00:00Z" },
  { id: "student-15", name: "Otavio Ferreira Costa", grade: "5º Ano", class: "5C", school: "E.M. João Silva", status: "active", createdAt: "2024-01-01T00:00:00Z" },
  { id: "student-16", name: "Paula Rodrigues Alves", grade: "5º Ano", class: "5A", school: "E.M. João Silva", status: "active", createdAt: "2024-01-01T00:00:00Z" },
  { id: "student-17", name: "Rafael Silva Mendes", grade: "5º Ano", class: "5A", school: "E.M. João Silva", status: "active", createdAt: "2024-01-01T00:00:00Z" },
  { id: "student-18", name: "Sofia Costa Pereira", grade: "5º Ano", class: "5A", school: "E.M. João Silva", status: "active", createdAt: "2024-01-01T00:00:00Z" },
  { id: "student-19", name: "Thiago Oliveira Santos", grade: "5º Ano", class: "5B", school: "E.M. João Silva", status: "active", createdAt: "2024-01-01T00:00:00Z" },
  { id: "student-20", name: "Valentina Lima Costa", grade: "5º Ano", class: "5B", school: "E.M. João Silva", status: "active", createdAt: "2024-01-01T00:00:00Z" },
  { id: "student-21", name: "William Silva Rodrigues", grade: "5º Ano", class: "5B", school: "E.M. João Silva", status: "active", createdAt: "2024-01-01T00:00:00Z" },
  { id: "student-22", name: "Yasmin Costa Almeida", grade: "5º Ano", class: "5C", school: "E.M. João Silva", status: "active", createdAt: "2024-01-01T00:00:00Z" },
  { id: "student-23", name: "Zoe Silva Ferreira", grade: "5º Ano", class: "5C", school: "E.M. João Silva", status: "active", createdAt: "2024-01-01T00:00:00Z" },
  { id: "student-24", name: "Arthur Santos Lima", grade: "5º Ano", class: "5C", school: "E.M. João Silva", status: "active", createdAt: "2024-01-01T00:00:00Z" },
  { id: "student-25", name: "Beatriz Costa Silva", grade: "5º Ano", class: "5A", school: "E.M. João Silva", status: "active", createdAt: "2024-01-01T00:00:00Z" },
  { id: "student-26", name: "Cauã Oliveira Costa", grade: "5º Ano", class: "5A", school: "E.M. João Silva", status: "active", createdAt: "2024-01-01T00:00:00Z" },
  { id: "student-27", name: "Diana Silva Santos", grade: "5º Ano", class: "5B", school: "E.M. João Silva", status: "active", createdAt: "2024-01-01T00:00:00Z" },
  { id: "student-28", name: "Enzo Costa Lima", grade: "5º Ano", class: "5B", school: "E.M. João Silva", status: "active", createdAt: "2024-01-00T00:00:00Z" },
  { id: "student-29", name: "Flávia Silva Costa", grade: "5º Ano", class: "5C", school: "E.M. João Silva", status: "active", createdAt: "2024-01-01T00:00:00Z" },
  { id: "student-30", name: "Guilherme Costa Silva", grade: "5º Ano", class: "5C", school: "E.M. João Silva", status: "active", createdAt: "2024-01-01T00:00:00Z" }
];

// Avaliações em diferentes status
export const mockEvaluations: MockEvaluation[] = [
  {
    id: "eval-1",
    title: "Avaliação de Matemática - 1º Bimestre",
    description: "Avaliação bimestral focada em operações básicas, frações e geometria plana",
    status: "active",
    subject: "Matemática",
    grade: "5º Ano",
    startDate: format(new Date(), "yyyy-MM-dd'T'08:00:00'Z'"),
    endDate: format(addDays(new Date(), 1), "yyyy-MM-dd'T'10:00:00'Z'"),
    duration: 120,
    questions: 15,
    students: 25,
    createdAt: format(subDays(new Date(), 5), "yyyy-MM-dd'T'10:00:00'Z'"),
    createdBy: "Prof. Maria Silva"
  },
  {
    id: "eval-2", 
    title: "Simulado de Português - Interpretação",
    description: "Simulado preparatório com foco em interpretação de texto e gramática",
    status: "correction",
    subject: "Português", 
    grade: "5º Ano",
    startDate: format(subDays(new Date(), 2), "yyyy-MM-dd'T'14:00:00'Z'"),
    endDate: format(subDays(new Date(), 2), "yyyy-MM-dd'T'16:00:00'Z'"),
    duration: 90,
    questions: 12,
    students: 23,
    createdAt: format(subDays(new Date(), 7), "yyyy-MM-dd'T'09:00:00'Z'"),
    createdBy: "Prof. João Santos"
  },
  {
    id: "eval-3",
    title: "Prova de Ciências - Sistema Solar",
    description: "Avaliação sobre sistema solar, estados da matéria e seres vivos",
    status: "completed",
    subject: "Ciências",  grade: "5º Ano", 
    startDate: format(subDays(new Date(), 5), "yyyy-MM-dd'T'10:00:00'Z'"),
    endDate: format(subDays(new Date(), 5), "yyyy-MM-dd'T'11:30:00'Z'"),
    duration: 90,    questions: 10,
    students: 25,
    createdAt: format(subDays(new Date(), 10), "yyyy-MM-dd'T'14:00:00'Z'"),
    createdBy: "Prof. Ana Costa",
    results: {
      totalStudents: 25,
      completedStudents: 23,
      pendingStudents: 2,
      averageScore: 7.8,
      maxScore: 9.5,
      minScore: 4.2,
      passRate: 87,
      completionRate: 92,
      topPerformers: ["student-1", "student-6", "student-12"],
      needsSupport: ["student-4", "student-9", "student-14"],
      byQuestion: {
        "q1": { correctAnswers: 21, totalAnswers: 23, successRate: 91, averageTime: 45 },
        "q2": { correctAnswers: 19, totalAnswers: 23, successRate: 83, averageTime: 62 },
        "q3": { correctAnswers: 15, totalAnswers: 23, successRate: 65, averageTime: 120 }
      }
    }
  }
];

export const mockClasses = [
  {
    id: "class-5A",
    name: "5A",
    school_id: "school-1",
    grade_id: "5",
    students_count: 10,
    school: { id: "school-1", name: "E.M. João Silva" },
    grade: { id: "5", name: "5º Ano" }
  },
  {
    id: "class-5B",
    name: "5B",
    school_id: "school-1",
    grade_id: "5",
    students_count: 10,
    school: { id: "school-1", name: "E.M. João Silva" },
    grade: { id: "5", name: "5º Ano" }
  },
  {
    id: "class-5C",
    name: "5C",
    school_id: "school-1",
    grade_id: "5",
    students_count: 10,
    school: { id: "school-1", name: "E.M. João Silva" },
    grade: { id: "5", name: "5º Ano" }
  }
];

// Dados mockados estruturados para demonstração completa
import { allMockStudents } from './extendedMockData';
export interface MockEvaluation {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'active' | 'correction' | 'completed' | 'expired';
  subject: string;
  grade: string;
  startDate: string;
  endDate: string;
  duration: number; // em minutos
  questions: number;
  students: number;
  createdAt: string;
  createdBy: string;
  studentAnswers?: Record<string, Record<string, string | number>>;
  corrections?: Record<string, Record<string, string | number | boolean>>;
  results?: MockEvaluationResults;
}

export interface MockQuestion {
  id: string;
  text: string;
  type: 'multiple_choice' | 'true_false' | 'open' | 'multiple_answer' | string;
  options?: string[] | { id: string; text: string; isCorrect: boolean }[];
  correctAnswer?: string | string[];
  points?: number;
  difficulty: 'easy' | 'medium' | 'hard' | string;
  subject: string | { id: string; name: string };
  grade: string | { id: string; name: string };
  skills: string[];
  topic?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface MockStudent {
  id: string;
  name: string;
  email?: string;
  grade: string;
  class: string;
  school: string;
  status: 'active' | 'inactive';
  profileType?: 'excellent' | 'good' | 'average' | 'struggling' | 'improving';
  characteristics?: string[];
  createdAt: string;
}

export interface MockEvaluationResults {
  totalStudents: number;
  completedStudents: number;
  pendingStudents: number;
  averageScore: number;
  maxScore: number;
  minScore: number;
  passRate: number;
  completionRate: number;
  topPerformers: string[];
  needsSupport: string[];
  byQuestion: Record<string, {
    correctAnswers: number;
    totalAnswers: number;
    successRate: number;
    averageTime: number;
  }>;
}

// ===== FUNÇÕES UTILITÁRIAS =====
export const getEvaluationById = (id: string): MockEvaluation | undefined => {
  return mockEvaluations.find(evaluation => evaluation.id === id);
};

export const getQuestionsBySubject = (subject: string): MockQuestion[] => {
  return mockQuestions.filter(q => q.subject.name === subject);
};

export const getStudentsByClass = (className: string): MockStudent[] => {
  return mockStudents.filter(s => s.class === className) as MockStudent[];
};

export const getAnswersForEvaluation = (evaluationId: string): Record<string, Record<string, string | number>> => {
  // Filtrar respostas por avaliação (simplificado para demo)
  return {
    "student-1": {
      "q1": "6,2",
      "q2": "Verdadeiro",
      "q3": "Resposta completa",
      timeSpent: 85
    },
    "student-2": {
      "q1": "6,2",
      "q2": "Verdadeiro", 
      "q3": "Resposta parcial",
      timeSpent: 95
    }
  };
};

export const getCorrectionsForEvaluation = (evaluationId: string): Record<string, Record<string, string | number | boolean>> => {
  // Filtrar correções por avaliação (simplificado para demo)
  return {
    "student-1": {
      "q1": 2,
      "q2": 2,
      "q3": 3,
      totalScore: 11,
      percentage: 100,
      isCorrect: true
    },
    "student-2": {
      "q1": 2,
      "q2": 2,
      "q3": 2,
      totalScore: 8,
      percentage: 73,
      isCorrect: false
    }
  };
};

// ===== DADOS PARA DASHBOARD =====
export const getDashboardStats = () => {
  return {
    totalEvaluations: mockEvaluations.length,
    activeEvaluations: mockEvaluations.filter(e => e.status === 'active').length,
    pendingCorrections: mockEvaluations.filter(e => e.status === 'correction').length,
    completedEvaluations: mockEvaluations.filter(e => e.status === 'completed').length,
    totalStudents: 30, // Agora temos 30 alunos completos
    activeStudents: 30, // Todos ativos
    totalQuestions: 30, // 30 questões completas
    questionsBySubject: {
      'Matemática': 10, // 10 questões de matemática
      'Português': 10, // 10 questões de português
      'Ciências': 10  // 10 questões de ciências
    },
    // Estatísticas adicionais para demonstração
    averagePerformance: 73.5,
    studentsByProfile: {
      excellent: 6,   // 20% - Excelentes
      good: 8,        // 27% - Bons
      average: 8,     // 27% - Médios
      struggling: 4,  // 13% - Com dificuldades
      improving: 4    // 13% - Melhorando
    },
    classDistribution: {
      '5A': 10,
      '5B': 10,
      '5C': 10
    },
    recentActivity: {
      evaluationsThisWeek: 2,
      correctionsToday: 3,
      newStudentsThisMonth: 5
    },
    bestSubject: 'Matemática',
    averageTime: 85 // minutos
  };
};

export default {
  mockEvaluations,
  mockQuestions,
  mockStudents,
  getEvaluationById,
  getQuestionsBySubject,
  getStudentsByClass,
  getAnswersForEvaluation,
  getCorrectionsForEvaluation,
  getDashboardStats
};