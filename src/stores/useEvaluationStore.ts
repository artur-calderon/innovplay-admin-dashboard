import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Question, Subject, ClassInfo } from '@/components/evaluations/types';

// ===== TIPOS MELHORADOS =====

/**
 * ✅ MELHORADO: Error handling robusto
 */
export interface StoreError {
  code: string;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

/**
 * ✅ MELHORADO: Estados de loading específicos
 */
export interface LoadingState {
  evaluations: boolean;
  currentEvaluation: boolean;
  questions: boolean;
  students: boolean;
  submissions: boolean;
  corrections: boolean;
}

/**
 * ✅ MELHORADO: Status de avaliação mais específicos
 */
export type EvaluationStatus = 'draft' | 'active' | 'correction' | 'completed' | 'expired';

/**
 * ✅ MELHORADO: Interface Student com validação
 */
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

/**
 * ✅ MELHORADO: Resposta do estudante com metadados
 */
export interface StudentAnswer {
  questionId: string;
  answer: string | string[] | null;
  isMarked: boolean;
  timeSpent?: number; // em segundos
  attempts?: number;
  confidence?: 1 | 2 | 3 | 4 | 5; // nível de confiança do estudante
}

/**
 * ✅ MELHORADO: Submissão com mais controle
 */
export interface StudentSubmission {
  studentId: string;
  evaluationId: string;
  answers: Record<string, StudentAnswer>;
  startedAt: string;
  submittedAt?: string;
  timeSpent: number; // em segundos
  status: 'in_progress' | 'completed' | 'expired';
  lastActivity?: string; // última atividade para timeout
  deviceInfo?: string; // informações do dispositivo
}

/**
 * ✅ MELHORADO: Correção manual com feedback detalhado
 */
export interface QuestionCorrection {
  questionId: string;
  manualPoints?: number;
  automaticPoints?: number;
  feedback?: string;
  isCorrect?: boolean;
  correctorNotes?: string;
}

/**
 * ✅ MELHORADO: Correção de estudante com auditoria
 */
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
  reviewedBy?: string;
  reviewedAt?: string;
  status: 'pending' | 'corrected' | 'reviewed' | 'published';
}

/**
 * ✅ MELHORADO: Avaliação com campos consistentes
 */
export interface Evaluation {
  id: string;
  title: string;
  description?: string;
  subject: Subject;
  grade: string;
  course: string;
  school: string;
  municipality: string;
  type: "EVALUATION" | "SIMULATION"; // ✅ CORRIGIDO: Consistente com backend
  model: "SAEB" | "PROVA" | "AVALIE";
  questions: Question[];
  students: Student[];
  startDateTime: string;
  endDateTime: string;
  duration: number; // em minutos
  status: EvaluationStatus;
  createdAt: string;
  createdBy: string;
  lastModifiedAt?: string;
  lastModifiedBy?: string;
  
  // Configurações avançadas
  allowReview?: boolean;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  showResults?: boolean;
  maxAttempts?: number;
  
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
    publishedAt?: string;
  };
}

/**
 * ✅ MELHORADO: Dados de criação de avaliação
 */
export interface EvaluationData {
  title: string;
  description?: string;
  subject: Subject;
  grade: string;
  course: string;
  school: string;
  municipality: string;
  type: "EVALUATION" | "SIMULATION";
  model: "SAEB" | "PROVA" | "AVALIE";
  questions: Question[];
  students: Student[];
  startDateTime: string;
  endDateTime: string;
  duration: number;
  
  // Configurações opcionais
  allowReview?: boolean;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  showResults?: boolean;
  maxAttempts?: number;
}

// ===== DADOS MOCKADOS =====

const mockQuestions: Question[] = [];
const mockStudents: Student[] = [];
const mockEvaluations: Evaluation[] = [];

// ===== STORE REESTRUTURADO =====

/**
 * ✅ REESTRUTURADO: Interface do store com separação clara
 */
interface EvaluationStore {
  // ===== ESTADO =====
  evaluations: Evaluation[];
  currentEvaluation: Evaluation | null;
  questions: Question[];
  students: Student[];
  
  // Estados de loading
  loading: LoadingState;
  
  // Error handling
  errors: StoreError[];
  lastError: StoreError | null;
  
  // Cache e configurações
  cache: {
    evaluationsLastFetch?: string;
    questionsLastFetch?: string;
    studentsLastFetch?: string;
  };
  
  settings: {
    autoSave: boolean;
    cacheTimeout: number; // em minutos
    maxCachedEvaluations: number;
  };
  
  // ===== ACTIONS BÁSICAS =====
  
  /**
   * Criar nova avaliação
   */
  createEvaluation: (data: EvaluationData) => Promise<Evaluation>;
  
  /**
   * Buscar todas as avaliações
   */
  getEvaluations: () => Evaluation[];
  
  /**
   * Buscar avaliação específica por ID
   */
  getEvaluation: (id: string) => Evaluation | null;
  
  /**
   * Atualizar status da avaliação
   */
  updateEvaluationStatus: (id: string, status: EvaluationStatus) => void;
  
  /**
   * Deletar avaliação
   */
  deleteEvaluation: (id: string) => void;
  
  // ===== ACTIONS DE APLICAÇÃO =====
  
  /**
   * Iniciar avaliação para um estudante
   */
  startEvaluation: (evaluationId: string, studentId: string) => void;
  
  /**
   * Submeter respostas do estudante
   */
  submitAnswers: (evaluationId: string, studentId: string, answers: Record<string, StudentAnswer>) => void;
  
  // ===== ACTIONS DE CORREÇÃO =====
  
  /**
   * Salvar correção de estudante
   */
  saveCorrection: (evaluationId: string, studentId: string, correction: StudentCorrection) => void;
  
  /**
   * Buscar submissões para correção
   */
  getSubmissionsForCorrection: (evaluationId: string) => StudentSubmission[];
  
  // ===== ACTIONS DE RESULTADOS =====
  
  /**
   * Calcular resultados da avaliação
   */
  calculateResults: (evaluationId: string) => void;
  
  /**
   * Buscar resultados da avaliação
   */
  getResults: (evaluationId: string) => Evaluation['results'] | null;
  
  // ===== UTILITÁRIOS =====
  
  getQuestionsBySubject: (subjectId: string) => Question[];
  getStudentsByClass: (classId: string) => Student[];
  checkEvaluationStatus: (evaluation: Evaluation) => EvaluationStatus;
  updateAutoStatus: () => void;
  
  // ===== ERROR HANDLING =====
  
  addError: (error: Omit<StoreError, 'timestamp'>) => void;
  clearError: (code: string) => void;
  clearAllErrors: () => void;
  
  // ===== CACHE E PERFORMANCE =====
  
  clearCache: () => void;
  updateSettings: (settings: Partial<EvaluationStore['settings']>) => void;
}

/**
 * ✅ REESTRUTURADO: Store com error handling e performance
 */
export const useEvaluationStore = create<EvaluationStore>()(
  persist(
    (set, get) => ({
      // ===== ESTADO INICIAL =====
      evaluations: mockEvaluations,
      currentEvaluation: null,
      questions: mockQuestions,
      students: mockStudents,
      
      loading: {
        evaluations: false,
        currentEvaluation: false,
        questions: false,
        students: false,
        submissions: false,
        corrections: false,
      },
      
      errors: [],
      lastError: null,
      
      cache: {},
      
      settings: {
        autoSave: true,
        cacheTimeout: 30, // 30 minutos
        maxCachedEvaluations: 50,
      },
      
      // ===== IMPLEMENTAÇÃO DAS ACTIONS =====
      
      createEvaluation: async (data: EvaluationData) => {
        try {
          const newEvaluation: Evaluation = {
            id: `eval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            ...data,
            status: 'draft',
            createdAt: new Date().toISOString(),
            createdBy: 'current-user', // TODO: pegar do contexto de auth
            lastModifiedAt: new Date().toISOString(),
          };

          set(state => ({
            ...state,
            evaluations: [...state.evaluations, newEvaluation],
            loading: { ...state.loading, evaluations: false },
          }));

          return newEvaluation;
        } catch (error) {
          const storeError: StoreError = {
            code: 'CREATE_EVALUATION_FAILED',
            message: error instanceof Error ? error.message : 'Erro desconhecido',
            timestamp: new Date().toISOString(),
            context: { data },
          };

          set(state => ({
            ...state,
            loading: { ...state.loading, evaluations: false },
            lastError: storeError,
            errors: [...state.errors, storeError],
          }));

          throw storeError;
        }
      },

      getEvaluations: () => {
        return get().evaluations;
      },

      getEvaluation: (id: string) => {
        return get().evaluations.find(evaluation => evaluation.id === id) || null;
      },

      updateEvaluationStatus: (id: string, status: EvaluationStatus) => {
        set(state => ({
          ...state,
          evaluations: state.evaluations.map(evaluation =>
            evaluation.id === id 
              ? { ...evaluation, status, lastModifiedAt: new Date().toISOString() } 
              : evaluation
          ),
          currentEvaluation: state.currentEvaluation?.id === id 
            ? { ...state.currentEvaluation, status, lastModifiedAt: new Date().toISOString() }
            : state.currentEvaluation,
        }));
      },

      deleteEvaluation: (id: string) => {
        set(state => ({
          ...state,
          evaluations: state.evaluations.filter(evaluation => evaluation.id !== id),
          currentEvaluation: state.currentEvaluation?.id === id ? null : state.currentEvaluation,
        }));
      },

      startEvaluation: (evaluationId: string, studentId: string) => {
        const evaluation = get().getEvaluation(evaluationId);
        if (!evaluation) return;

        const submission: StudentSubmission = {
          studentId,
          evaluationId,
          answers: {},
          startedAt: new Date().toISOString(),
          timeSpent: 0,
          status: 'in_progress',
          lastActivity: new Date().toISOString(),
        };

        set(state => ({
          ...state,
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
        if (!evaluation?.submissions?.[studentId]) return;

        const submission = evaluation.submissions[studentId];
        const updatedSubmission: StudentSubmission = {
          ...submission,
          answers,
          submittedAt: new Date().toISOString(),
          timeSpent: Math.floor((new Date().getTime() - new Date(submission.startedAt).getTime()) / 1000),
          status: 'completed'
        };

        set(state => ({
          ...state,
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

      saveCorrection: (evaluationId: string, studentId: string, correction: StudentCorrection) => {
        set(state => ({
          ...state,
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

        return Object.values(evaluation.submissions).filter(
          submission => submission.status === 'completed'
        );
      },

      calculateResults: (evaluationId: string) => {
        const evaluation = get().getEvaluation(evaluationId);
        if (!evaluation?.corrections) return;

        const corrections = Object.values(evaluation.corrections);
        const scores = corrections.map(c => c.totalScore);

        if (scores.length === 0) return;

        const results = {
          totalStudents: evaluation.students.length,
          completedStudents: corrections.length,
          pendingStudents: evaluation.students.length - corrections.length,
          averageScore: scores.reduce((sum, score) => sum + score, 0) / scores.length,
          maxScore: Math.max(...scores),
          minScore: Math.min(...scores),
          passRate: (corrections.filter(c => c.percentage >= 70).length / corrections.length) * 100,
          appliedAt: evaluation.startDateTime,
          correctedAt: new Date().toISOString(),
        };

        set(state => ({
          ...state,
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
        set(state => ({
          ...state,
          evaluations: state.evaluations.map(evaluation => {
            const calculatedStatus = get().checkEvaluationStatus(evaluation);
            return calculatedStatus !== evaluation.status 
              ? { ...evaluation, status: calculatedStatus, lastModifiedAt: new Date().toISOString() }
              : evaluation;
          })
        }));
      },

      // ===== ERROR HANDLING =====

      addError: (error: Omit<StoreError, 'timestamp'>) => {
        const newError: StoreError = {
          ...error,
          timestamp: new Date().toISOString(),
        };
        
        set(state => ({
          ...state,
          errors: [...state.errors, newError],
          lastError: newError,
        }));
      },

      clearError: (code: string) => {
        set(state => {
          const filteredErrors = state.errors.filter(error => error.code !== code);
          return {
            ...state,
            errors: filteredErrors,
            lastError: state.lastError?.code === code 
              ? (filteredErrors[filteredErrors.length - 1] || null)
              : state.lastError,
          };
        });
      },

      clearAllErrors: () => {
        set(state => ({
          ...state,
          errors: [],
          lastError: null,
        }));
      },

      // ===== CACHE E PERFORMANCE =====

      clearCache: () => {
        set(state => ({
          ...state,
          cache: {},
        }));
      },

      updateSettings: (settings: Partial<EvaluationStore['settings']>) => {
        set(state => ({
          ...state,
          settings: { ...state.settings, ...settings },
        }));
      },
    }),
    {
      name: 'evaluation-store',
      partialize: (state) => ({
        evaluations: state.evaluations,
        questions: state.questions,
        students: state.students,
        settings: state.settings,
        cache: state.cache,
      }),
    }
  )
);

// ===== HOOKS UTILITÁRIOS OTIMIZADOS =====

/**
 * ✅ OTIMIZADO: Hook para avaliações com seletores específicos
 */
export const useEvaluations = () => {
  const evaluations = useEvaluationStore(state => state.evaluations);
  const loading = useEvaluationStore(state => state.loading.evaluations);
  const getEvaluations = useEvaluationStore(state => state.getEvaluations);
  const getEvaluation = useEvaluationStore(state => state.getEvaluation);
  const createEvaluation = useEvaluationStore(state => state.createEvaluation);

  return {
    evaluations,
    loading,
    getEvaluations,
    getEvaluation,
    createEvaluation,
  };
};

/**
 * ✅ OTIMIZADO: Hook para actions de avaliação
 */
export const useEvaluationActions = () => {
  const createEvaluation = useEvaluationStore(state => state.createEvaluation);
  const updateEvaluationStatus = useEvaluationStore(state => state.updateEvaluationStatus);
  const deleteEvaluation = useEvaluationStore(state => state.deleteEvaluation);
  const startEvaluation = useEvaluationStore(state => state.startEvaluation);
  const submitAnswers = useEvaluationStore(state => state.submitAnswers);
  const saveCorrection = useEvaluationStore(state => state.saveCorrection);
  const calculateResults = useEvaluationStore(state => state.calculateResults);

  return {
    createEvaluation,
    updateEvaluationStatus,
    deleteEvaluation,
    startEvaluation,
    submitAnswers,
    saveCorrection,
    calculateResults,
  };
};

/**
 * ✅ OTIMIZADO: Hook para questões
 */
export const useQuestions = () => {
  const questions = useEvaluationStore(state => state.questions);
  const loading = useEvaluationStore(state => state.loading.questions);
  const getQuestionsBySubject = useEvaluationStore(state => state.getQuestionsBySubject);

  return {
    questions,
    loading,
    getQuestionsBySubject,
  };
};

/**
 * ✅ OTIMIZADO: Hook para estudantes
 */
export const useStudents = () => {
  const students = useEvaluationStore(state => state.students);
  const loading = useEvaluationStore(state => state.loading.students);
  const getStudentsByClass = useEvaluationStore(state => state.getStudentsByClass);

  return {
    students,
    loading,
    getStudentsByClass,
  };
};

/**
 * ✅ NOVO: Hook para error handling
 */
export const useEvaluationErrors = () => {
  const errors = useEvaluationStore(state => state.errors);
  const lastError = useEvaluationStore(state => state.lastError);
  const addError = useEvaluationStore(state => state.addError);
  const clearError = useEvaluationStore(state => state.clearError);
  const clearAllErrors = useEvaluationStore(state => state.clearAllErrors);

  return {
    errors,
    lastError,
    addError,
    clearError,
    clearAllErrors,
  };
};

/**
 * ✅ NOVO: Hook para loading states
 */
export const useEvaluationLoading = () => {
  return useEvaluationStore(state => state.loading);
};

/**
 * ✅ NOVO: Hook para configurações
 */
export const useEvaluationSettings = () => {
  const settings = useEvaluationStore(state => state.settings);
  const updateSettings = useEvaluationStore(state => state.updateSettings);
  const clearCache = useEvaluationStore(state => state.clearCache);

  return {
    settings,
    updateSettings,
    clearCache,
  };
};