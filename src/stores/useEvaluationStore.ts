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
  // Matemática - Fácil
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
  // Matemática - Médio
  {
    id: "q4",
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
  // Português - Fácil
  {
    id: "q5",
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
  // Português - Médio
  {
    id: "q6",
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
  // Ciências - Fácil
  {
    id: "q7",
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
  // Ciências - Médio
  {
    id: "q8",
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
    description: "Avaliação sobre números decimais, frações e operações básicas",
    subject: { id: "math", name: "Matemática" },
    grade: "5º Ano",
    course: "Ensino Fundamental",
    school: "E.M. João Silva",
    municipality: "São Paulo",
    type: "AVALIACAO",
    model: "SAEB",
    questions: mockQuestions.slice(0, 4), // 4 questões de matemática
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
    title: "Simulado de Português",
    description: "Simulado preparatório para prova externa",
    subject: { id: "port", name: "Português" },
    grade: "5º Ano",
    course: "Ensino Fundamental",
    school: "E.M. João Silva",
    municipality: "São Paulo",
    type: "SIMULADO",
    model: "SAEB",
    questions: mockQuestions.slice(4, 6), // 2 questões de português
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
          "q5": { questionId: "q5", answer: "c", isMarked: false, timeSpent: 45 },
          "q6": { questionId: "q6", answer: "O texto fala sobre um gato que estava dormindo e foi acordado por um barulho.", isMarked: false, timeSpent: 120 }
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
          "q5": { questionId: "q5", answer: "c", isMarked: false, timeSpent: 30 },
          "q6": { questionId: "q6", answer: "Um gato dormindo no sofá.", isMarked: false, timeSpent: 90 }
        },
        startedAt: "2024-01-14T14:10:00Z",
        submittedAt: "2024-01-14T15:45:00Z",
        timeSpent: 5700, // 95 minutos
        status: "completed"
      }
    }
  },
  {
    id: "eval-3",
    title: "Prova de Ciências - Água e Solo",
    description: "Avaliação sobre ciclo da água e tipos de solo",
    subject: { id: "cienc", name: "Ciências" },
    grade: "5º Ano",
    course: "Ensino Fundamental",
    school: "E.M. João Silva",
    municipality: "São Paulo",
    type: "AVALIACAO",
    model: "PROVA",
    questions: mockQuestions.slice(6, 8), // 2 questões de ciências
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
          "q7": { questionId: "q7", answer: "b", isMarked: false, timeSpent: 25 },
          "q8": { questionId: "q8", answer: "Durante a evaporação, a água líquida se transforma em vapor d'água devido ao calor do sol, subindo para a atmosfera.", isMarked: false, timeSpent: 180 }
        },
        startedAt: "2024-01-12T10:05:00Z",
        submittedAt: "2024-01-12T11:15:00Z",
        timeSpent: 4200, // 70 minutos
        status: "completed"
      }
    },
    corrections: {
      "student-1": {
        studentId: "student-1",
        evaluationId: "eval-3",
        corrections: {
          "q7": { questionId: "q7", manualPoints: 2, feedback: "Correto!", isCorrect: true },
          "q8": { questionId: "q8", manualPoints: 2.5, feedback: "Boa resposta, mas poderia ser mais detalhada", isCorrect: true }
        },
        totalScore: 4.5,
        maxScore: 5,
        percentage: 90,
        feedback: "Excelente desempenho! Demonstrou boa compreensão dos conceitos.",
        correctedBy: "teacher-3",
        correctedAt: "2024-01-12T16:00:00Z",
        status: "corrected"
      }
    },
    results: {
      totalStudents: 18,
      completedStudents: 15,
      pendingStudents: 3,
      averageScore: 7.8,
      maxScore: 10,
      minScore: 4.5,
      passRate: 80,
      appliedAt: "2024-01-12T10:00:00Z",
      correctedAt: "2024-01-12T18:00:00Z"
    }
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