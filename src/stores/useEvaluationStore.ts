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

const mockQuestions: Question[] = [];

const mockStudents: Student[] = [];

const mockEvaluations: Evaluation[] = [];

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