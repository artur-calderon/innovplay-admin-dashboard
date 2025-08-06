/**
 * Hook Agregador Principal para Resultados de Avaliação
 * 
 * Este hook combina dados de todas as entidades (sessions, results, answers)
 * e implementa a estratégia "Tempo Real + Validação" com controle granular
 * sobre quais dados mostrar (completos, parciais, ou todos).
 * 
 * ✅ IMPLEMENTAÇÃO COMPLETA: Estratégia "Tempo Real + Validação"
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useResultsData } from '../entities/results/useResultsData';
import { useSessionsData } from '../entities/sessions/useSessionsData';
import { useAnswersData } from '../entities/answers/useAnswersData';
import { useTestData } from '../entities/test/useTestData';
import { 
  CompletionThresholds,
  createCompletionStats 
} from '../utils/completionValidation';
import { CompletionStatusLevel } from '../types/completion';

// ===== TIPOS =====

interface AggregatedStudentData {
  id: string;
  name: string;
  class: string;
  school?: string;
  
  // Dados da sessão
  session?: {
    id: string;
    status: string;
    startedAt: string;
    submittedAt?: string;
    totalQuestions: number;
    answeredQuestions: number;
    timeSpent: number;
    completionPercentage: number;
  };
  
  // Dados do resultado
  result?: {
    grade: number;
    proficiency: number;
    classification: string;
    correctAnswers: number;
    totalQuestions: number;
    scorePercentage: number;
  };
  
  // Dados das respostas
  answers?: {
    total: number;
    correct: number;
    incorrect: number;
    blank: number;
    averageTimePerQuestion: number;
  };
  
  // Status de completude
  completionStatus: CompletionStatusLevel;
  isComplete: boolean;
  canAnalyze: boolean;
  
  // Estatísticas agregadas
  aggregatedStats?: {
    overallScore: number;
    overallProficiency: number;
    completionRate: number;
    qualityScore: number;
    timeEfficiency: number;
  };
}

interface AggregatedStats {
  // Estatísticas gerais
  totalStudents: number;
  completedStudents: number;
  partialStudents: number;
  completionRate: number;
  
  // Estatísticas apenas de completos (para cálculos oficiais)
  validStats: {
    averageGrade: number;
    averageProficiency: number;
    averageAccuracy: number;
    averageTimeSpent: number;
    classificationDistribution: {
      abaixo_do_basico: number;
      basico: number;
      adequado: number;
      avancado: number;
    };
  };
  
  // Estatísticas de parciais (para monitoramento)
  partialStats: {
    averageCompletionPercentage: number;
    averageAnsweredQuestions: number;
    studentsInProgress: number;
    estimatedCompletionTime: number;
  };
  
  // Estatísticas combinadas (se configurado)
  combinedStats?: {
    averageGrade: number;
    averageProficiency: number;
    averageCompletionRate: number;
  };
}

interface CompletionStatus {
  totalStudents: number;
  completedStudents: number;
  partialStudents: number;
  completionRate: number;
  hasIncompleteStudents: boolean;
  message: string;
  recommendations: string[];
}

interface UseAggregatedResultsReturn {
  // ✅ Dados separados por completude
  students: AggregatedStudentData[]; // Apenas completos (para cálculos)
  allStudents: AggregatedStudentData[]; // Todos (incluindo parciais)
  
  // ✅ Status de completude
  completionStatus: CompletionStatus;
  hasIncompleteStudents: boolean;
  
  // ✅ Estatísticas separadas
  stats: AggregatedStats;
  
  // ✅ Estados de loading
  isLoading: boolean;
  isCheckingCompletion: boolean;
  error: string | null;
  
  // ✅ Controle de visualização
  showAll: boolean;
  setShowAll: (enabled: boolean) => void;
  
  // ✅ Ações
  refetch: () => Promise<void>;
  refreshCompletionStatus: () => void;
  
  // ✅ Filtros específicos
  getCompletedStudents: () => AggregatedStudentData[];
  getPartialStudents: () => AggregatedStudentData[];
  getStudentsByCompletionStatus: (status: CompletionStatusLevel) => AggregatedStudentData[];
  getStudentsByClassification: (classification: string) => AggregatedStudentData[];
  
  // ✅ Dados brutos dos hooks
  resultsData: ReturnType<typeof useResultsData>;
  sessionsData: ReturnType<typeof useSessionsData>;
  answersData: ReturnType<typeof useAnswersData>;
  testData: ReturnType<typeof useTestData>;
}

// ===== HOOK PRINCIPAL =====

export const useAggregatedResults = (
  testId: string,
  options: {
    thresholds?: CompletionThresholds;
    includePartialInStats?: boolean; // Se deve incluir parciais nas estatísticas gerais
    enablePartialView?: boolean; // Se deve habilitar visualização parcial por padrão
    autoRefresh?: boolean; // Se deve atualizar automaticamente
    refreshInterval?: number; // Intervalo de atualização em ms
  } = {}
): UseAggregatedResultsReturn => {
  
  // ===== CONFIGURAÇÕES =====
  
  const {
    thresholds = {
      minimum_completion_percentage: 80,
      minimum_quality_score: 70,
      minimum_answers_for_analysis: 10
    },
    includePartialInStats = false,
    enablePartialView = false,
    autoRefresh = false,
    refreshInterval = 30000 // 30 segundos
  } = options;
  
  // ===== ESTADOS =====
  
  const [showAll, setShowAll] = useState(enablePartialView);
  const [isCheckingCompletion, setIsCheckingCompletion] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  
  // ===== HOOKS DAS ENTIDADES =====
  
  const resultsData = useResultsData(testId, { thresholds, includePartialInStats });
  const sessionsData = useSessionsData(testId, { thresholds, includePartialInStats });
  const answersData = useAnswersData(testId, undefined, { 
    thresholds, 
    includePartialInStats,
    enablePartialView: showAll 
  });
  const testData = useTestData(testId);
  
  // ===== AGREGAR DADOS DOS ALUNOS =====
  
  const { students, allStudents } = useMemo(() => {
    const allStudentsData: AggregatedStudentData[] = [];
    const completedStudentsData: AggregatedStudentData[] = [];
    
    // Usar dados de resultados como base (mais confiável)
    const baseStudents = resultsData.allResultsWithDetails;
    
    baseStudents.forEach(resultWithDetails => {
      const studentId = resultWithDetails.student_id;
      
      // Buscar dados da sessão
      const sessionData = sessionsData.allSessionsWithStudents.find(
        s => s.student_id === studentId
      );
      
      // Buscar dados das respostas
      const studentAnswers = answersData.allAnswersWithDetails.filter(
        a => a.student_id === studentId
      );
      
      // Determinar status de completude
      const isComplete = resultWithDetails.status === 'completed' && 
                        resultWithDetails.grade > 0 &&
                        resultWithDetails.answered_questions >= resultWithDetails.total_questions * 0.8;
      
      const completionStatus: CompletionStatusLevel = isComplete 
        ? CompletionStatusLevel.COMPLETE 
        : resultWithDetails.answered_questions > 0 
          ? CompletionStatusLevel.PARTIALLY_COMPLETE 
          : CompletionStatusLevel.INCOMPLETE;
      
      // Criar dados agregados do aluno
      const studentData: AggregatedStudentData = {
        id: studentId,
        name: resultWithDetails.student_name,
        class: resultWithDetails.student_class,
        school: sessionData?.student_school,
        
        // Dados da sessão
        session: sessionData ? {
          id: sessionData.id,
          status: sessionData.status,
          startedAt: sessionData.started_at,
          submittedAt: sessionData.submitted_at,
          totalQuestions: sessionData.total_questions,
          answeredQuestions: sessionData.answered_questions,
          timeSpent: sessionData.time_limit_minutes,
          completionPercentage: sessionData.total_questions > 0 
            ? (sessionData.answered_questions / sessionData.total_questions) * 100 
            : 0
        } : undefined,
        
        // Dados do resultado
        result: {
          grade: resultWithDetails.grade,
          proficiency: resultWithDetails.proficiency,
          classification: resultWithDetails.classification,
          correctAnswers: resultWithDetails.correct_answers,
          totalQuestions: resultWithDetails.total_questions,
          scorePercentage: resultWithDetails.score_percentage
        },
        
        // Dados das respostas
        answers: studentAnswers.length > 0 ? {
          total: studentAnswers.length,
          correct: studentAnswers.filter(a => a.is_correct).length,
          incorrect: studentAnswers.filter(a => !a.is_correct && !a.is_blank).length,
          blank: studentAnswers.filter(a => a.is_blank).length,
          averageTimePerQuestion: studentAnswers.reduce((sum, a) => sum + a.time_spent, 0) / studentAnswers.length
        } : undefined,
        
        // Status de completude
        completionStatus,
        isComplete,
        canAnalyze: isComplete,
        
        // Estatísticas agregadas (só se completo)
        aggregatedStats: isComplete ? {
          overallScore: resultWithDetails.grade,
          overallProficiency: resultWithDetails.proficiency,
          completionRate: 100,
          qualityScore: 100,
          timeEfficiency: sessionData ? 
            (sessionData.answered_questions / sessionData.total_questions) * 100 : 100
        } : undefined
      };
      
      allStudentsData.push(studentData);
      
      if (isComplete) {
        completedStudentsData.push(studentData);
      }
    });
    
    return {
      students: completedStudentsData,
      allStudents: allStudentsData
    };
  }, [
    resultsData.allResultsWithDetails,
    sessionsData.allSessionsWithStudents,
    answersData.allAnswersWithDetails
  ]);
  
  // ===== CALCULAR ESTATÍSTICAS =====
  
  const stats = useMemo(() => {
    const totalStudents = allStudents.length;
    const completedStudents = students.length;
    const partialStudents = totalStudents - completedStudents;
    const completionRate = totalStudents > 0 ? (completedStudents / totalStudents) * 100 : 0;
    
    // Estatísticas apenas de completos (para cálculos oficiais)
    const validStats = {
      averageGrade: completedStudents > 0 
        ? students.reduce((sum, s) => sum + (s.result?.grade || 0), 0) / completedStudents 
        : 0,
      averageProficiency: completedStudents > 0 
        ? students.reduce((sum, s) => sum + (s.result?.proficiency || 0), 0) / completedStudents 
        : 0,
      averageAccuracy: completedStudents > 0 
        ? students.reduce((sum, s) => {
            const accuracy = s.result && s.result.totalQuestions > 0 
              ? (s.result.correctAnswers / s.result.totalQuestions) * 100 
              : 0;
            return sum + accuracy;
          }, 0) / completedStudents 
        : 0,
      averageTimeSpent: completedStudents > 0 
        ? students.reduce((sum, s) => sum + (s.session?.timeSpent || 0), 0) / completedStudents 
        : 0,
      classificationDistribution: {
        abaixo_do_basico: students.filter(s => s.result?.classification === 'Abaixo do Básico').length,
        basico: students.filter(s => s.result?.classification === 'Básico').length,
        adequado: students.filter(s => s.result?.classification === 'Adequado').length,
        avancado: students.filter(s => s.result?.classification === 'Avançado').length
      }
    };
    
    // Estatísticas de parciais (para monitoramento)
    const partialStudentsData = allStudents.filter(s => !s.isComplete);
    const partialStats = {
      averageCompletionPercentage: partialStudentsData.length > 0 
        ? partialStudentsData.reduce((sum, s) => sum + (s.session?.completionPercentage || 0), 0) / partialStudentsData.length 
        : 0,
      averageAnsweredQuestions: partialStudentsData.length > 0 
        ? partialStudentsData.reduce((sum, s) => sum + (s.session?.answeredQuestions || 0), 0) / partialStudentsData.length 
        : 0,
      studentsInProgress: partialStudentsData.length,
      estimatedCompletionTime: partialStudentsData.length > 0 
        ? partialStudentsData.reduce((sum, s) => sum + (s.session?.timeSpent || 0), 0) / partialStudentsData.length 
        : 0
    };
    
    // Estatísticas combinadas (se configurado)
    const combinedStats = includePartialInStats ? {
      averageGrade: totalStudents > 0 
        ? allStudents.reduce((sum, s) => sum + (s.result?.grade || 0), 0) / totalStudents 
        : 0,
      averageProficiency: totalStudents > 0 
        ? allStudents.reduce((sum, s) => sum + (s.result?.proficiency || 0), 0) / totalStudents 
        : 0,
      averageCompletionRate: completionRate
    } : undefined;
    
    return {
      totalStudents,
      completedStudents,
      partialStudents,
      completionRate,
      validStats,
      partialStats,
      combinedStats
    };
  }, [allStudents, students, includePartialInStats]);
  
  // ===== STATUS DE COMPLETUDE =====
  
  const completionStatus = useMemo(() => {
    const { totalStudents, completedStudents, partialStudents, completionRate } = stats;
    const hasIncompleteStudents = partialStudents > 0;
    
    let message = `Total: ${totalStudents} alunos`;
    if (completedStudents > 0) message += `, ${completedStudents} completos`;
    if (partialStudents > 0) message += `, ${partialStudents} em andamento`;
    message += ` (${completionRate.toFixed(1)}% concluído)`;
    
    const recommendations: string[] = [];
    if (partialStudents > 0) {
      recommendations.push(`Há ${partialStudents} alunos com avaliação em andamento`);
      recommendations.push('Use o toggle "Mostrar Todos" para visualizar progresso em tempo real');
    }
    if (completionRate < 50) {
      recommendations.push('Taxa de conclusão baixa - verifique se há problemas técnicos');
    }
    if (completionRate > 90) {
      recommendations.push('Excelente taxa de conclusão!');
    }
    
    return {
      totalStudents,
      completedStudents,
      partialStudents,
      completionRate,
      hasIncompleteStudents,
      message,
      recommendations
    };
  }, [stats]);
  
  // ===== FUNÇÕES DE FILTRO =====
  
  const getCompletedStudents = useCallback(() => students, [students]);
  const getPartialStudents = useCallback(() => allStudents.filter(s => !s.isComplete), [allStudents]);
  const getStudentsByCompletionStatus = useCallback((status: CompletionStatusLevel) => {
    switch (status) {
      case CompletionStatusLevel.COMPLETE:
        return students;
      case CompletionStatusLevel.PARTIALLY_COMPLETE:
      case CompletionStatusLevel.INCOMPLETE:
        return allStudents.filter(s => !s.isComplete);
      default:
        return allStudents;
    }
  }, [students, allStudents]);
  const getStudentsByClassification = useCallback((classification: string) => {
    return allStudents.filter(s => s.result?.classification === classification);
  }, [allStudents]);
  
  // ===== FUNÇÕES DE AÇÃO =====
  
  const refetch = useCallback(async () => {
    setIsCheckingCompletion(true);
    try {
      await Promise.all([
        resultsData.refetch(),
        sessionsData.refetch(),
        answersData.refetch(),
        testData.refetch()
      ]);
      setLastRefresh(new Date());
    } finally {
      setIsCheckingCompletion(false);
    }
  }, [resultsData, sessionsData, answersData, testData]);
  
  const refreshCompletionStatus = useCallback(() => {
    setIsCheckingCompletion(true);
    setTimeout(() => {
      setIsCheckingCompletion(false);
      setLastRefresh(new Date());
    }, 1000);
  }, []);
  
  // ===== AUTO REFRESH =====
  
  useEffect(() => {
    if (!autoRefresh) return;
    
    // ✅ DEBOUNCE: Evitar chamadas excessivas
    let timeoutId: NodeJS.Timeout;
    
    const debouncedRefetch = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        refetch();
      }, 1000); // Debounce de 1 segundo
    };
    
    const interval = setInterval(debouncedRefetch, refreshInterval);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timeoutId);
    };
  }, [autoRefresh, refreshInterval]); // ✅ REMOVIDO: refetch da dependência para evitar loop infinito
  
  // ===== ESTADOS COMPUTADOS =====
  
  const isLoading = resultsData.isLoading || sessionsData.isLoading || answersData.isLoading || testData.isLoading;
  const error = resultsData.error || sessionsData.error || answersData.error || testData.error;
  const hasIncompleteStudents = completionStatus.hasIncompleteStudents;
  
  // ===== RETORNO =====
  
  return {
    // Dados separados por completude
    students,
    allStudents,
    
    // Status de completude
    completionStatus,
    hasIncompleteStudents,
    
    // Estatísticas separadas
    stats,
    
    // Estados de loading
    isLoading,
    isCheckingCompletion,
    error,
    
    // Controle de visualização
    showAll,
    setShowAll,
    
    // Ações
    refetch,
    refreshCompletionStatus,
    
    // Filtros específicos
    getCompletedStudents,
    getPartialStudents,
    getStudentsByCompletionStatus,
    getStudentsByClassification,
    
    // Dados brutos dos hooks
    resultsData,
    sessionsData,
    answersData,
    testData
  };
}; 