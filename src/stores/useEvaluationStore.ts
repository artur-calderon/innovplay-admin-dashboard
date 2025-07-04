import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Question, Subject, ClassInfo } from '@/components/evaluations/types';

// ===== TIPOS =====

export type EvaluationStatus = 'draft' | 'active' | 'correction' | 'completed' | 'expired';

export interface Student {
  id: string;
  name: string;
  email?: string;
  grade: string;
  class: string;
  school: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface StudentAnswer {
  questionId: string;
  answer: string | string[] | null;
  isMarked: boolean;
  timeSpent?: number; // em segundos
}

export interface StudentSubmission {
  studentId: string;
  evaluationId: string;
  answers: Record<string, StudentAnswer>;
  startedAt: string;
  submittedAt?: string;
  timeSpent: number; // em segundos
  status: 'in_progress' | 'completed' | 'expired';
}

export interface QuestionCorrection {
  questionId: string;
  manualPoints?: number;
  feedback?: string;
  isCorrect?: boolean;
}

export interface StudentCorrection {
  studentId: string;
  evaluationId: string;
  corrections: Record<string, QuestionCorrection>;
  totalScore: number;
  maxScore: number;
  percentage: number;
  feedback?: string;
  correctedBy?: string;
  correctedAt?: string;
  status: 'pending' | 'corrected' | 'reviewed';
}

export interface Evaluation {
  id: string;
  title: string;
  description?: string;
  subject: Subject;
  grade: string;
  course: string;
  school: string;
  municipality: string;
  type: "AVALIACAO" | "SIMULADO";
  model: "SAEB" | "PROVA" | "AVALIE";
  questions: Question[];
  students: Student[];
  startDateTime: string;
  endDateTime: string;
  duration: number; // em minutos
  status: EvaluationStatus;
  createdAt: string;
  createdBy: string;
  
  // Dados de aplicação
  submissions?: Record<string, StudentSubmission>;
  
  // Dados de correção
  corrections?: Record<string, StudentCorrection>;
  
  // Dados de resultados
  results?: {
    totalStudents: number;
    completedStudents: number;
    pendingStudents: number;
    averageScore: number;
    maxScore: number;
    minScore: number;
    passRate: number;
    appliedAt: string;
    correctedAt?: string;
  };
}

export interface EvaluationData {
  title: string;
  description?: string;
  subject: Subject;
  grade: string;
  course: string;
  school: string;
  municipality: string;
  type: "AVALIACAO" | "SIMULADO";
  model: "SAEB" | "PROVA" | "AVALIE";
  questions: Question[];
  students: Student[];
  startDateTime: string;
  endDateTime: string;
  duration: number;
}

// ===== DADOS MOCKADOS =====

const mockQuestions: Question[] = [
  // MATEMÁTICA - BÁSICO
  {
    id: "q1",
    title: "Adição de Números Decimais",
    text: "Qual é o resultado da operação 2,5 + 3,7?",
    type: "multipleChoice",
    subjectId: "math",
    subject: { id: "math", name: "Matemática" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Básico",
    value: 2,
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
    value: 2,
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
    title: "Soma de Frações",
    text: "Explique como você faria para somar as frações 1/4 + 2/3.",
    type: "open",
    subjectId: "math",
    subject: { id: "math", name: "Matemática" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Adequado",
    value: 3,
    solution: "Primeiro encontro o denominador comum que é 12. Depois transformo: 1/4 = 3/12 e 2/3 = 8/12. Aí somo: 3/12 + 8/12 = 11/12.",
    options: [],
    skills: ["Soma de frações", "Denominador comum"],
    created_by: "teacher-1"
  },
  // MATEMÁTICA - ADEQUADO
  {
    id: "q4",
    title: "Área do Retângulo",
    text: "Calcule a área de um retângulo com base 8cm e altura 5cm.",
    type: "multipleChoice",
    subjectId: "math",
    subject: { id: "math", name: "Matemática" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Adequado",
    value: 2,
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
    id: "q5",
    title: "Multiplicação de Números Naturais",
    text: "Qual é o resultado de 125 × 8?",
    type: "multipleChoice",
    subjectId: "math",
    subject: { id: "math", name: "Matemática" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Adequado",
    value: 2,
    solution: "1000",
    options: [
      { id: "a", text: "1000", isCorrect: true },
      { id: "b", text: "1008", isCorrect: false },
      { id: "c", text: "992", isCorrect: false },
      { id: "d", text: "1080", isCorrect: false }
    ],
    skills: ["Multiplicação"],
    created_by: "teacher-1"
  },
  // MATEMÁTICA - AVANÇADO
  {
    id: "q6",
    title: "Resolução de Problemas",
    text: "João tem R$ 150,00. Ele comprou 3 brinquedos por R$ 35,00 cada um. Quanto sobrou de troco?",
    type: "open",
    subjectId: "math",
    subject: { id: "math", name: "Matemática" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Avançado",
    value: 3,
    solution: "150 - (3 × 35) = 150 - 105 = R$ 45,00",
    options: [],
    skills: ["Resolução de problemas", "Operações combinadas"],
    created_by: "teacher-1"
  },
  // PORTUGUÊS - BÁSICO
  {
    id: "q7",
    title: "Identificação de Substantivos",
    text: "Qual das palavras abaixo é um substantivo?",
    type: "multipleChoice",
    subjectId: "port",
    subject: { id: "port", name: "Português" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Básico",
    value: 2,
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
    id: "q8",
    title: "Plural Correto",
    text: "Qual é o plural correto da palavra 'coração'?",
    type: "multipleChoice",
    subjectId: "port",
    subject: { id: "port", name: "Português" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Básico",
    value: 2,
    solution: "corações",
    options: [
      { id: "a", text: "coraçãos", isCorrect: false },
      { id: "b", text: "corações", isCorrect: true },
      { id: "c", text: "coração", isCorrect: false },
      { id: "d", text: "coraçons", isCorrect: false }
    ],
    skills: ["Formação do plural"],
    created_by: "teacher-2"
  },
  // PORTUGUÊS - ADEQUADO
  {
    id: "q9",
    title: "Interpretação de Texto",
    text: "Leia o texto: 'O gato dormia tranquilamente no sofá. De repente, um barulho o acordou.' Qual é o tema principal do texto?",
    type: "open",
    subjectId: "port",
    subject: { id: "port", name: "Português" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Adequado",
    value: 3,
    solution: "O texto fala sobre um gato que estava dormindo e foi acordado por um barulho.",
    options: [],
    skills: ["Interpretação de texto"],
    created_by: "teacher-2"
  },
  {
    id: "q10",
    title: "Acentuação Gráfica",
    text: "Qual palavra deve receber acento agudo?",
    type: "multipleChoice",
    subjectId: "port",
    subject: { id: "port", name: "Português" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Adequado",
    value: 2,
    solution: "médico",
    options: [
      { id: "a", text: "medico", isCorrect: false },
      { id: "b", text: "médico", isCorrect: true },
      { id: "c", text: "amigo", isCorrect: false },
      { id: "d", text: "casa", isCorrect: false }
    ],
    skills: ["Acentuação"],
    created_by: "teacher-2"
  },
  // PORTUGUÊS - AVANÇADO
  {
    id: "q11",
    title: "Análise Sintática",
    text: "Na frase 'O menino estudioso leu o livro interessante', identifique o sujeito e o predicado.",
    type: "open",
    subjectId: "port",
    subject: { id: "port", name: "Português" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Avançado",
    value: 3,
    solution: "Sujeito: 'O menino estudioso'. Predicado: 'leu o livro interessante'.",
    options: [],
    skills: ["Análise sintática", "Sujeito e predicado"],
    created_by: "teacher-2"
  },
  // CIÊNCIAS - BÁSICO
  {
    id: "q12",
    title: "Estados da Matéria",
    text: "A água em estado líquido pode se transformar em vapor quando:",
    type: "multipleChoice",
    subjectId: "cienc",
    subject: { id: "cienc", name: "Ciências" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Básico",
    value: 2,
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
    id: "q13",
    title: "Seres Vivos e Não Vivos",
    text: "Qual das opções contém apenas seres vivos?",
    type: "multipleChoice",
    subjectId: "cienc",
    subject: { id: "cienc", name: "Ciências" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Básico",
    value: 2,
    solution: "Árvore, cachorro, pessoa",
    options: [
      { id: "a", text: "Pedra, água, ar", isCorrect: false },
      { id: "b", text: "Árvore, cachorro, pessoa", isCorrect: true },
      { id: "c", text: "Mesa, cadeira, livro", isCorrect: false },
      { id: "d", text: "Sol, lua, estrelas", isCorrect: false }
    ],
    skills: ["Classificação dos seres"],
    created_by: "teacher-3"
  },
  // CIÊNCIAS - ADEQUADO
  {
    id: "q14",
    title: "Ciclo da Água",
    text: "Explique o que acontece durante a evaporação no ciclo da água.",
    type: "open",
    subjectId: "cienc",
    subject: { id: "cienc", name: "Ciências" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Adequado",
    value: 3,
    solution: "Durante a evaporação, a água líquida se transforma em vapor d'água devido ao calor do sol, subindo para a atmosfera.",
    options: [],
    skills: ["Ciclo da água"],
    created_by: "teacher-3"
  },
  {
    id: "q15",
    title: "Sistema Solar",
    text: "Quantos planetas existem no Sistema Solar?",
    type: "multipleChoice",
    subjectId: "cienc",
    subject: { id: "cienc", name: "Ciências" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Adequado",
    value: 2,
    solution: "8 planetas",
    options: [
      { id: "a", text: "7 planetas", isCorrect: false },
      { id: "b", text: "8 planetas", isCorrect: true },
      { id: "c", text: "9 planetas", isCorrect: false },
      { id: "d", text: "10 planetas", isCorrect: false }
    ],
    skills: ["Sistema Solar"],
    created_by: "teacher-3"
  },
  // CIÊNCIAS - AVANÇADO
  {
    id: "q16",
    title: "Fotossíntese",
    text: "Explique como as plantas produzem seu próprio alimento através da fotossíntese.",
    type: "open",
    subjectId: "cienc",
    subject: { id: "cienc", name: "Ciências" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Avançado",
    value: 3,
    solution: "As plantas usam luz solar, água e gás carbônico para produzir glicose (açúcar) e liberar oxigênio. Este processo acontece nas folhas, especificamente nos cloroplastos.",
    options: [],
    skills: ["Fotossíntese", "Biologia vegetal"],
    created_by: "teacher-3"
  },
  // HISTÓRIA - BÁSICO
  {
    id: "q17",
    title: "Descobrimento do Brasil",
    text: "Em que ano foi descoberto o Brasil?",
    type: "multipleChoice",
    subjectId: "hist",
    subject: { id: "hist", name: "História" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Básico",
    value: 2,
    solution: "1500",
    options: [
      { id: "a", text: "1492", isCorrect: false },
      { id: "b", text: "1500", isCorrect: true },
      { id: "c", text: "1498", isCorrect: false },
      { id: "d", text: "1502", isCorrect: false }
    ],
    skills: ["História do Brasil"],
    created_by: "teacher-4"
  },
  {
    id: "q18",
    title: "Independência do Brasil",
    text: "Quem proclamou a Independência do Brasil?",
    type: "multipleChoice",
    subjectId: "hist",
    subject: { id: "hist", name: "História" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Básico",
    value: 2,
    solution: "Dom Pedro I",
    options: [
      { id: "a", text: "Dom Pedro I", isCorrect: true },
      { id: "b", text: "Dom Pedro II", isCorrect: false },
      { id: "c", text: "Getúlio Vargas", isCorrect: false },
      { id: "d", text: "Tiradentes", isCorrect: false }
    ],
    skills: ["Independência do Brasil"],
    created_by: "teacher-4"
  },
  // GEOGRAFIA - BÁSICO
  {
    id: "q19",
    title: "Estados do Brasil",
    text: "Qual é a capital do estado de São Paulo?",
    type: "multipleChoice",
    subjectId: "geo",
    subject: { id: "geo", name: "Geografia" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Básico",
    value: 2,
    solution: "São Paulo",
    options: [
      { id: "a", text: "Rio de Janeiro", isCorrect: false },
      { id: "b", text: "São Paulo", isCorrect: true },
      { id: "c", text: "Campinas", isCorrect: false },
      { id: "d", text: "Santos", isCorrect: false }
    ],
    skills: ["Geografia do Brasil"],
    created_by: "teacher-5"
  },
  {
    id: "q20",
    title: "Regiões do Brasil",
    text: "Quantas regiões o Brasil possui?",
    type: "multipleChoice",
    subjectId: "geo",
    subject: { id: "geo", name: "Geografia" },
    grade: { id: "5ano", name: "5º Ano" },
    difficulty: "Básico",
    value: 2,
    solution: "5 regiões",
    options: [
      { id: "a", text: "4 regiões", isCorrect: false },
      { id: "b", text: "5 regiões", isCorrect: true },
      { id: "c", text: "6 regiões", isCorrect: false },
      { id: "d", text: "7 regiões", isCorrect: false }
    ],
    skills: ["Divisão regional"],
    created_by: "teacher-5"
  }
];

const mockStudents: Student[] = [
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
  { id: "student-15", name: "Otavio Ferreira Costa", grade: "5º Ano", class: "5C", school: "E.M. João Silva", status: "active", createdAt: "2024-01-01T00:00:00Z" }
];

const mockEvaluations: Evaluation[] = [
  {
    id: "eval-1",
    title: "Avaliação de Matemática - 1º Bimestre",
    description: "Avaliação abrangente sobre números decimais, frações e operações básicas",
    subject: { id: "math", name: "Matemática" },
    grade: "5º Ano",
    course: "Ensino Fundamental",
    school: "E.M. João Silva",
    municipality: "São Paulo",
    type: "AVALIACAO",
    model: "SAEB",
    questions: mockQuestions.slice(0, 6), // 6 questões de matemática (básico ao avançado)
    students: mockStudents.slice(0, 15),
    startDateTime: "2024-01-15T08:00:00Z",
    endDateTime: "2024-01-15T10:00:00Z",
    duration: 120,
    status: "active",
    createdAt: "2024-01-10T10:00:00Z",
    createdBy: "teacher-1"
  },
  {
    id: "eval-2",
    title: "Simulado de Português - Interpretação de Texto",
    description: "Simulado preparatório focado em interpretação e gramática",
    subject: { id: "port", name: "Português" },
    grade: "5º Ano",
    course: "Ensino Fundamental",
    school: "E.M. João Silva",
    municipality: "São Paulo",
    type: "SIMULADO",
    model: "SAEB",
    questions: mockQuestions.slice(6, 11), // 5 questões de português
    students: mockStudents.slice(0, 12),
    startDateTime: "2024-01-14T14:00:00Z",
    endDateTime: "2024-01-14T16:00:00Z",
    duration: 90,
    status: "correction",
    createdAt: "2024-01-08T09:00:00Z",
    createdBy: "teacher-2",
    submissions: {
      "student-1": {
        studentId: "student-1",
        evaluationId: "eval-2",
        answers: {
          "q7": { questionId: "q7", answer: "c", isMarked: false, timeSpent: 45 },
          "q8": { questionId: "q8", answer: "b", isMarked: false, timeSpent: 30 },
          "q9": { questionId: "q9", answer: "O texto fala sobre um gato que estava dormindo e foi acordado por um barulho.", isMarked: false, timeSpent: 120 },
          "q10": { questionId: "q10", answer: "b", isMarked: false, timeSpent: 35 },
          "q11": { questionId: "q11", answer: "Sujeito: O menino estudioso. Predicado: leu o livro interessante.", isMarked: false, timeSpent: 180 }
        },
        startedAt: "2024-01-14T14:05:00Z",
        submittedAt: "2024-01-14T15:30:00Z",
        timeSpent: 5100, // 85 minutos
        status: "completed"
      },
      "student-2": {
        studentId: "student-2",
        evaluationId: "eval-2",
        answers: {
          "q7": { questionId: "q7", answer: "c", isMarked: false, timeSpent: 30 },
          "q8": { questionId: "q8", answer: "a", isMarked: false, timeSpent: 25 },
          "q9": { questionId: "q9", answer: "Um gato dormindo no sofá.", isMarked: false, timeSpent: 90 },
          "q10": { questionId: "q10", answer: "b", isMarked: false, timeSpent: 40 },
          "q11": { questionId: "q11", answer: "O menino leu o livro.", isMarked: false, timeSpent: 120 }
        },
        startedAt: "2024-01-14T14:10:00Z",
        submittedAt: "2024-01-14T15:45:00Z",
        timeSpent: 5700, // 95 minutos
        status: "completed"
      },
      "student-3": {
        studentId: "student-3",
        evaluationId: "eval-2",
        answers: {
          "q7": { questionId: "q7", answer: "c", isMarked: false, timeSpent: 20 },
          "q8": { questionId: "q8", answer: "b", isMarked: false, timeSpent: 15 },
          "q9": { questionId: "q9", answer: "O texto conta sobre um gato que dormia e foi acordado por um barulho repentino.", isMarked: false, timeSpent: 100 },
          "q10": { questionId: "q10", answer: "b", isMarked: false, timeSpent: 25 },
          "q11": { questionId: "q11", answer: "Sujeito: O menino estudioso. Predicado: leu o livro interessante.", isMarked: false, timeSpent: 150 }
        },
        startedAt: "2024-01-14T14:00:00Z",
        submittedAt: "2024-01-14T15:15:00Z",
        timeSpent: 4500, // 75 minutos
        status: "completed"
      }
    }
  },
  {
    id: "eval-3",
    title: "Prova de Ciências - Água e Meio Ambiente",
    description: "Avaliação sobre ciclo da água, estados da matéria e seres vivos",
    subject: { id: "cienc", name: "Ciências" },
    grade: "5º Ano",
    course: "Ensino Fundamental",
    school: "E.M. João Silva",
    municipality: "São Paulo",
    type: "AVALIACAO",
    model: "PROVA",
    questions: mockQuestions.slice(11, 16), // 5 questões de ciências
    students: mockStudents.slice(0, 18),
    startDateTime: "2024-01-12T10:00:00Z",
    endDateTime: "2024-01-12T11:30:00Z",
    duration: 90,
    status: "completed",
    createdAt: "2024-01-05T14:00:00Z",
    createdBy: "teacher-3",
    submissions: {
      "student-1": {
        studentId: "student-1",
        evaluationId: "eval-3",
        answers: {
          "q12": { questionId: "q12", answer: "b", isMarked: false, timeSpent: 25 },
          "q13": { questionId: "q13", answer: "b", isMarked: false, timeSpent: 30 },
          "q14": { questionId: "q14", answer: "Durante a evaporação, a água líquida se transforma em vapor d'água devido ao calor do sol, subindo para a atmosfera.", isMarked: false, timeSpent: 180 },
          "q15": { questionId: "q15", answer: "b", isMarked: false, timeSpent: 20 },
          "q16": { questionId: "q16", answer: "As plantas usam luz solar, água e CO2 para fazer açúcar e liberar oxigênio.", isMarked: false, timeSpent: 200 }
        },
        startedAt: "2024-01-12T10:05:00Z",
        submittedAt: "2024-01-12T11:15:00Z",
        timeSpent: 4200, // 70 minutos
        status: "completed"
      },
      "student-4": {
        studentId: "student-4",
        evaluationId: "eval-3",
        answers: {
          "q12": { questionId: "q12", answer: "b", isMarked: false, timeSpent: 20 },
          "q13": { questionId: "q13", answer: "b", isMarked: false, timeSpent: 25 },
          "q14": { questionId: "q14", answer: "A água vira vapor quando esquenta.", isMarked: false, timeSpent: 120 },
          "q15": { questionId: "q15", answer: "b", isMarked: false, timeSpent: 15 },
          "q16": { questionId: "q16", answer: "As plantas fazem comida com luz do sol.", isMarked: false, timeSpent: 150 }
        },
        startedAt: "2024-01-12T10:10:00Z",
        submittedAt: "2024-01-12T11:20:00Z",
        timeSpent: 4200, // 70 minutos
        status: "completed"
      }
    },
    corrections: {
      "student-1": {
        studentId: "student-1",
        evaluationId: "eval-3",
        corrections: {
          "q12": { questionId: "q12", manualPoints: 2, feedback: "Correto!", isCorrect: true },
          "q13": { questionId: "q13", manualPoints: 2, feedback: "Correto!", isCorrect: true },
          "q14": { questionId: "q14", manualPoints: 3, feedback: "Excelente explicação completa!", isCorrect: true },
          "q15": { questionId: "q15", manualPoints: 2, feedback: "Correto!", isCorrect: true },
          "q16": { questionId: "q16", manualPoints: 2.5, feedback: "Boa resposta, mas poderia mencionar os cloroplastos", isCorrect: true }
        },
        totalScore: 11.5,
        maxScore: 13,
        percentage: 88.5,
        feedback: "Excelente desempenho! Demonstrou boa compreensão dos conceitos científicos.",
        correctedBy: "teacher-3",
        correctedAt: "2024-01-12T16:00:00Z",
        status: "corrected"
      },
      "student-4": {
        studentId: "student-4",
        evaluationId: "eval-3",
        corrections: {
          "q12": { questionId: "q12", manualPoints: 2, feedback: "Correto!", isCorrect: true },
          "q13": { questionId: "q13", manualPoints: 2, feedback: "Correto!", isCorrect: true },
          "q14": { questionId: "q14", manualPoints: 1.5, feedback: "Resposta muito simples, faltaram detalhes", isCorrect: true },
          "q15": { questionId: "q15", manualPoints: 2, feedback: "Correto!", isCorrect: true },
          "q16": { questionId: "q16", manualPoints: 1, feedback: "Resposta muito superficial, precisa estudar mais", isCorrect: true }
        },
        totalScore: 8.5,
        maxScore: 13,
        percentage: 65.4,
        feedback: "Bom conhecimento básico, mas precisa desenvolver mais as respostas dissertativas.",
        correctedBy: "teacher-3",
        correctedAt: "2024-01-12T16:30:00Z",
        status: "corrected"
      }
    },
    results: {
      totalStudents: 18,
      completedStudents: 16,
      pendingStudents: 2,
      averageScore: 8.2,
      maxScore: 13,
      minScore: 5.5,
      passRate: 81.3,
      appliedAt: "2024-01-12T10:00:00Z",
      correctedAt: "2024-01-12T18:00:00Z"
    }
  },
  {
    id: "eval-4",
    title: "Avaliação de História - Brasil Colonial",
    description: "Avaliação sobre descobrimento e independência do Brasil",
    subject: { id: "hist", name: "História" },
    grade: "5º Ano",
    course: "Ensino Fundamental",
    school: "E.E. Maria Santos",
    municipality: "São Paulo",
    type: "AVALIACAO",
    model: "PROVA",
    questions: mockQuestions.slice(16, 18), // 2 questões de história
    students: mockStudents.slice(5, 15), // 10 alunos diferentes
    startDateTime: "2024-01-18T08:00:00Z",
    endDateTime: "2024-01-18T09:30:00Z",
    duration: 90,
    status: "pending",
    createdAt: "2024-01-15T10:00:00Z",
    createdBy: "teacher-4"
  },
  {
    id: "eval-5",
    title: "Simulado de Geografia - Brasil",
    description: "Simulado sobre estados, capitais e regiões do Brasil",
    subject: { id: "geo", name: "Geografia" },
    grade: "5º Ano",
    course: "Ensino Fundamental",
    school: "Colégio Dom Pedro",
    municipality: "São Paulo",
    type: "SIMULADO",
    model: "SAEB",
    questions: mockQuestions.slice(18, 20), // 2 questões de geografia
    students: mockStudents.slice(10, 15), // 5 alunos
    startDateTime: "2024-01-20T14:00:00Z",
    endDateTime: "2024-01-20T15:00:00Z",
    duration: 60,
    status: "draft",
    createdAt: "2024-01-16T14:00:00Z",
    createdBy: "teacher-5"
  }
];

// ===== STORE =====

interface EvaluationStore {
  // Estado
  evaluations: Evaluation[];
  currentEvaluation: Evaluation | null;
  questions: Question[];
  students: Student[];
  
  // Ações
  createEvaluation: (data: EvaluationData) => Promise<Evaluation>;
  getEvaluations: () => Evaluation[];
  getEvaluation: (id: string) => Evaluation | null;
  updateEvaluationStatus: (id: string, status: EvaluationStatus) => void;
  
  // Ações de aplicação
  startEvaluation: (evaluationId: string, studentId: string) => void;
  submitAnswers: (evaluationId: string, studentId: string, answers: Record<string, StudentAnswer>) => void;
  
  // Ações de correção
  saveCorrection: (evaluationId: string, studentId: string, correction: StudentCorrection) => void;
  getSubmissionsForCorrection: (evaluationId: string) => StudentSubmission[];
  
  // Ações de resultados
  calculateResults: (evaluationId: string) => void;
  getResults: (evaluationId: string) => Evaluation['results'] | null;
  
  // Utilitários
  getQuestionsBySubject: (subjectId: string) => Question[];
  getStudentsByClass: (classId: string) => Student[];
  checkEvaluationStatus: (evaluation: Evaluation) => EvaluationStatus;
  updateAutoStatus: () => void;
}

export const useEvaluationStore = create<EvaluationStore>()(
  persist(
    (set, get) => ({
      // Estado inicial
      evaluations: mockEvaluations,
      currentEvaluation: null,
      questions: mockQuestions,
      students: mockStudents,
      
      // ===== AÇÕES BÁSICAS =====
      
      createEvaluation: async (data: EvaluationData) => {
        const newEvaluation: Evaluation = {
          id: `eval-${Date.now()}`,
          ...data,
          status: 'draft',
          createdAt: new Date().toISOString(),
          createdBy: 'current-user', // TODO: pegar do contexto de auth
        };
        
        set(state => ({
          evaluations: [...state.evaluations, newEvaluation]
        }));
        
        return newEvaluation;
      },
      
      getEvaluations: () => {
        return get().evaluations;
      },
      
              getEvaluation: (id: string) => {
          return get().evaluations.find(evaluation => evaluation.id === id) || null;
        },
      
              updateEvaluationStatus: (id: string, status: EvaluationStatus) => {
          set(state => ({
            evaluations: state.evaluations.map(evaluation =>
              evaluation.id === id ? { ...evaluation, status } : evaluation
            )
          }));
        },
      
      // ===== AÇÕES DE APLICAÇÃO =====
      
      startEvaluation: (evaluationId: string, studentId: string) => {
        const evaluation = get().getEvaluation(evaluationId);
        if (!evaluation) return;
        
        const submission: StudentSubmission = {
          studentId,
          evaluationId,
          answers: {},
          startedAt: new Date().toISOString(),
          timeSpent: 0,
          status: 'in_progress'
        };
        
        set(state => ({
          evaluations: state.evaluations.map(evaluation =>
            evaluation.id === evaluationId
              ? {
                  ...evaluation,
                  submissions: {
                    ...evaluation.submissions,
                    [studentId]: submission
                  }
                }
              : evaluation
          )
        }));
      },
      
      submitAnswers: (evaluationId: string, studentId: string, answers: Record<string, StudentAnswer>) => {
        const evaluation = get().getEvaluation(evaluationId);
        if (!evaluation) return;
        
        const submission = evaluation.submissions?.[studentId];
        if (!submission) return;
        
        const updatedSubmission: StudentSubmission = {
          ...submission,
          answers,
          submittedAt: new Date().toISOString(),
          timeSpent: Math.floor((new Date().getTime() - new Date(submission.startedAt).getTime()) / 1000),
          status: 'completed'
        };
        
        set(state => ({
          evaluations: state.evaluations.map(evaluation =>
            evaluation.id === evaluationId
              ? {
                  ...evaluation,
                  submissions: {
                    ...evaluation.submissions,
                    [studentId]: updatedSubmission
                  },
                  status: 'correction' // Mover para correção quando primeiro aluno termina
                }
              : evaluation
          )
        }));
      },
      
      // ===== AÇÕES DE CORREÇÃO =====
      
      saveCorrection: (evaluationId: string, studentId: string, correction: StudentCorrection) => {
        set(state => ({
          evaluations: state.evaluations.map(evaluation =>
            evaluation.id === evaluationId
              ? {
                  ...evaluation,
                  corrections: {
                    ...evaluation.corrections,
                    [studentId]: correction
                  }
                }
              : evaluation
          )
        }));
        
        // Verificar se todas as correções foram feitas
        const evaluation = get().getEvaluation(evaluationId);
        if (evaluation) {
          const totalStudents = evaluation.students.length;
          const correctedStudents = Object.keys(evaluation.corrections || {}).length;
          
          if (correctedStudents === totalStudents) {
            get().calculateResults(evaluationId);
          }
        }
      },
      
      getSubmissionsForCorrection: (evaluationId: string) => {
        const evaluation = get().getEvaluation(evaluationId);
        if (!evaluation?.submissions) return [];
        
        return Object.values(evaluation.submissions);
      },
      
      // ===== AÇÕES DE RESULTADOS =====
      
      calculateResults: (evaluationId: string) => {
        const evaluation = get().getEvaluation(evaluationId);
        if (!evaluation?.corrections) return;
        
        const corrections = Object.values(evaluation.corrections);
        const scores = corrections.map(c => c.totalScore);
        
        const results = {
          totalStudents: evaluation.students.length,
          completedStudents: corrections.length,
          pendingStudents: evaluation.students.length - corrections.length,
          averageScore: scores.reduce((sum, score) => sum + score, 0) / scores.length,
          maxScore: Math.max(...scores),
          minScore: Math.min(...scores),
          passRate: (corrections.filter(c => c.percentage >= 70).length / corrections.length) * 100,
          appliedAt: evaluation.startDateTime,
          correctedAt: new Date().toISOString()
        };
        
        set(state => ({
          evaluations: state.evaluations.map(evaluation =>
            evaluation.id === evaluationId
              ? {
                  ...evaluation,
                  results,
                  status: 'completed'
                }
              : evaluation
          )
        }));
      },
      
      getResults: (evaluationId: string) => {
        const evaluation = get().getEvaluation(evaluationId);
        return evaluation?.results || null;
      },
      
      // ===== UTILITÁRIOS =====
      
      getQuestionsBySubject: (subjectId: string) => {
        return get().questions.filter(q => q.subjectId === subjectId);
      },
      
      getStudentsByClass: (classId: string) => {
        return get().students.filter(s => s.class === classId);
      },
      
      checkEvaluationStatus: (evaluation: Evaluation) => {
        const now = new Date();
        const startDate = new Date(evaluation.startDateTime);
        const endDate = new Date(evaluation.endDateTime);
        
        if (now < startDate) return 'draft';
        if (now > endDate) return 'expired';
        if (evaluation.status === 'completed') return 'completed';
        if (evaluation.submissions && Object.keys(evaluation.submissions).length > 0) return 'correction';
        return 'active';
      },
      
      updateAutoStatus: () => {
        const now = new Date();
        set(state => ({
          evaluations: state.evaluations.map(evaluation => {
            const startDate = new Date(evaluation.startDateTime);
            const endDate = new Date(evaluation.endDateTime);
            
            if (now < startDate) {
              return { ...evaluation, status: 'draft' };
            } else if (now > endDate) {
              return { ...evaluation, status: 'expired' };
            } else if (evaluation.status === 'completed') {
              return evaluation;
            } else if (evaluation.submissions && Object.keys(evaluation.submissions).length > 0) {
              return { ...evaluation, status: 'correction' };
            } else {
              return { ...evaluation, status: 'active' };
            }
          })
        }));
      }
    }),
    {
      name: 'evaluation-store',
      partialize: (state) => ({
        evaluations: state.evaluations,
        questions: state.questions,
        students: state.students
      })
    }
  )
);

// ===== HOOKS ÚTEIS =====

export const useEvaluations = () => {
  const evaluations = useEvaluationStore(state => state.evaluations);
  const getEvaluations = useEvaluationStore(state => state.getEvaluations);
  const getEvaluation = useEvaluationStore(state => state.getEvaluation);
  
  return {
    evaluations,
    getEvaluations,
    getEvaluation
  };
};

export const useEvaluationActions = () => {
  const createEvaluation = useEvaluationStore(state => state.createEvaluation);
  const updateEvaluationStatus = useEvaluationStore(state => state.updateEvaluationStatus);
  const startEvaluation = useEvaluationStore(state => state.startEvaluation);
  const submitAnswers = useEvaluationStore(state => state.submitAnswers);
  const saveCorrection = useEvaluationStore(state => state.saveCorrection);
  const calculateResults = useEvaluationStore(state => state.calculateResults);
  
  return {
    createEvaluation,
    updateEvaluationStatus,
    startEvaluation,
    submitAnswers,
    saveCorrection,
    calculateResults
  };
};

export const useQuestions = () => {
  const questions = useEvaluationStore(state => state.questions);
  const getQuestionsBySubject = useEvaluationStore(state => state.getQuestionsBySubject);
  
  return {
    questions,
    getQuestionsBySubject
  };
};

export const useStudents = () => {
  const students = useEvaluationStore(state => state.students);
  const getStudentsByClass = useEvaluationStore(state => state.getStudentsByClass);
  
  return {
    students,
    getStudentsByClass
  };
}; 