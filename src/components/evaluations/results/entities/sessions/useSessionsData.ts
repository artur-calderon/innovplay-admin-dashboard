/**
 * Hook para gerenciar dados da entidade Sessions
 * Corresponde à tabela: test_sessions
 * 
 * Este hook gerencia as sessões/tentativas dos alunos em uma avaliação
 * ✅ REFATORADO: Implementa estratégia "Tempo Real + Validação"
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  TestSessionEntity, 
  SessionWithStudent, 
  SessionStats, 
  SessionFilters, 
  SessionTimeAnalysis,
  SessionStatus 
} from './types';
import { EvaluationResultsApiService } from '@/services/evaluationResultsApi';
import { 
  validateSessionCompletion,
  CompletionThresholds 
} from '../../utils/completionValidation';
import { CompletionStatusLevel } from '../../types/completion';

interface UseSessionsDataReturn {
  // ✅ NOVO: Dados separados por completude
  validSessions: TestSessionEntity[]; // Apenas completas (para cálculos)
  partialSessions: TestSessionEntity[]; // Parciais (para UI tempo real)
  allSessions: TestSessionEntity[]; // Todas (completas + parciais)
  
  // ✅ NOVO: Dados com detalhes separados
  validSessionsWithStudents: SessionWithStudent[];
  partialSessionsWithStudents: SessionWithStudent[];
  allSessionsWithStudents: SessionWithStudent[];
  
  // Estados de loading
  isLoading: boolean;
  error: string | null;
  
  // ✅ NOVO: Estatísticas separadas
  validStats: SessionStats | null; // Estatísticas apenas de completas
  partialStats: SessionStats | null; // Estatísticas de parciais
  allStats: SessionStats | null; // Estatísticas de todas
  
  // ✅ NOVO: Status de completude
  completionStatus: {
    totalSessions: number;
    completedSessions: number;
    partialSessions: number;
    completionRate: number;
    hasIncompleteSessions: boolean;
    message: string;
  };
  
  // Análise de tempo (apenas com sessões completas)
  timeAnalysis: SessionTimeAnalysis | null;
  
  // Ações
  refetch: () => Promise<void>;
  filterSessions: (filters: SessionFilters) => TestSessionEntity[];
  getSessionsByStatus: (status: SessionStatus) => TestSessionEntity[];
  
  // ✅ NOVO: Filtros específicos
  getValidSessions: () => TestSessionEntity[];
  getPartialSessions: () => TestSessionEntity[];
  getSessionsByCompletionStatus: (status: CompletionStatusLevel) => TestSessionEntity[];
}

export const useSessionsData = (
  testId: string,
  options: {
    thresholds?: CompletionThresholds;
    includePartialInStats?: boolean; // Se deve incluir parciais nas estatísticas gerais
  } = {}
): UseSessionsDataReturn => {
  const { 
    thresholds = {
      minimum_completion_percentage: 80,
      minimum_quality_score: 70,
      minimum_answers_for_analysis: 10
    },
    includePartialInStats = false
  } = options;

  const [allSessions, setAllSessions] = useState<TestSessionEntity[]>([]);
  const [allSessionsWithStudents, setAllSessionsWithStudents] = useState<SessionWithStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allStats, setAllStats] = useState<SessionStats | null>(null);
  const [timeAnalysis, setTimeAnalysis] = useState<SessionTimeAnalysis | null>(null);

  // ✅ NOVO: Separar dados por completude usando useMemo
  const { validSessions, partialSessions, validSessionsWithStudents, partialSessionsWithStudents } = useMemo(() => {
    const valid: TestSessionEntity[] = [];
    const partial: TestSessionEntity[] = [];
    const validWithStudents: SessionWithStudent[] = [];
    const partialWithStudents: SessionWithStudent[] = [];

    allSessions.forEach(session => {
      const sessionWithStudent = allSessionsWithStudents.find(s => s.id === session.id);
      
      // ✅ Validar se a sessão está completa
      const sessionCompletion = validateSessionCompletion(session, thresholds);
      const isComplete = sessionCompletion.is_complete;

      if (isComplete && session.status === 'completed') {
        valid.push(session);
        if (sessionWithStudent) validWithStudents.push(sessionWithStudent);
      } else {
        partial.push(session);
        if (sessionWithStudent) partialWithStudents.push(sessionWithStudent);
      }
    });

    return {
      validSessions: valid,
      partialSessions: partial,
      validSessionsWithStudents: validWithStudents,
      partialSessionsWithStudents: partialWithStudents
    };
  }, [allSessions, allSessionsWithStudents, thresholds]);

  // ✅ NOVO: Calcular estatísticas separadas
  const validStats = useMemo(() => {
    if (validSessions.length === 0) return null;

    const totalSessions = validSessions.length;
    const completedSessions = validSessions.filter(s => s.status === 'completed');
    const averageTimeSpent = completedSessions.reduce((sum, s) => sum + s.time_limit_minutes, 0) / completedSessions.length || 0;
    const averageScore = completedSessions.reduce((sum, s) => sum + s.score, 0) / completedSessions.length || 0;

    return {
      total_sessions: totalSessions,
      completed_sessions: completedSessions.length,
      pending_sessions: 0, // Todos são completos aqui
      abandoned_sessions: 0,
      average_completion_time: averageTimeSpent,
      average_score: averageScore,
      completion_rate: 100, // 100% pois são apenas completas
      average_answered_questions: validSessions.reduce((sum, s) => sum + s.answered_questions, 0) / totalSessions
    };
  }, [validSessions]);

  const partialStats = useMemo(() => {
    if (partialSessions.length === 0) return null;

    const totalSessions = partialSessions.length;
    const answeredQuestions = partialSessions.reduce((sum, s) => sum + s.answered_questions, 0);
    const totalQuestions = partialSessions.reduce((sum, s) => sum + s.total_questions, 0);
    const completionRate = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

    return {
      total_sessions: totalSessions,
      completed_sessions: 0, // Nenhuma é completa
      pending_sessions: totalSessions,
      abandoned_sessions: partialSessions.filter(s => s.status === 'abandoned').length,
      average_completion_time: 0, // Não há tempo válido
      average_score: 0, // Não há score válido
      completion_rate: completionRate,
      average_answered_questions: answeredQuestions / totalSessions
    };
  }, [partialSessions]);

  // ✅ NOVO: Status de completude geral
  const completionStatus = useMemo(() => {
    const totalSessions = allSessions.length;
    const completedSessions = validSessions.length;
    const partialSessions = partialSessions.length;
    const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;
    const hasIncompleteSessions = partialSessions > 0;

    let message = `Total: ${totalSessions} sessões`;
    if (completedSessions > 0) message += `, ${completedSessions} completas`;
    if (partialSessions > 0) message += `, ${partialSessions} em andamento`;
    message += ` (${completionRate.toFixed(1)}% concluído)`;

    return {
      totalSessions,
      completedSessions,
      partialSessions,
      completionRate,
      hasIncompleteSessions,
      message
    };
  }, [allSessions.length, validSessions.length, partialSessions.length]);

  /**
   * Busca sessões da avaliação (tabela test_sessions)
   */
  const fetchSessionsData = useCallback(async () => {
    if (!testId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Buscar dados básicos dos alunos/resultados
      const studentsResponse = await EvaluationResultsApiService.getStudentsByEvaluation(testId);
      
      if (studentsResponse && Array.isArray(studentsResponse)) {
        // Converter dados dos alunos para formato de sessões
        const sessionData: TestSessionEntity[] = studentsResponse.map((student, index) => ({
          id: `session-${student.id}-${index}`,
          student_id: student.id,
          test_id: testId,
          started_at: new Date().toISOString(), // TODO: Buscar dados reais
          submitted_at: student.status === 'concluida' ? new Date().toISOString() : '',
          time_limit_minutes: student.tempo_gasto,
          status: student.status === 'concluida' ? 'completed' : 'in_progress',
          total_questions: student.questoes_respondidas,
          answered_questions: student.questoes_respondidas, // ✅ NOVO: Campo para controle de completude
          correct_answers: student.acertos,
          score: student.nota,
          grade: student.nota,
          feedback: '',
          corrected_by: '',
          corrected_at: '',
          ip_address: '',
          user_agent: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        setAllSessions(sessionData);

        // Sessões com dados dos alunos
        const sessionsWithStudentData: SessionWithStudent[] = sessionData.map(session => {
          const student = studentsResponse.find(s => s.id === session.student_id);
          return {
            ...session,
            student_name: student?.nome || 'Aluno não identificado',
            student_class: student?.turma || 'Turma não identificada',
            student_school: 'Escola não identificada' // TODO: Buscar dados da escola
          };
        });

        setAllSessionsWithStudents(sessionsWithStudentData);

        // ✅ NOVO: Calcular estatísticas gerais (incluindo parciais se configurado)
        const statsData = includePartialInStats ? allSessions : validSessions;
        const totalSessions = statsData.length;
        const completedSessions = statsData.filter(s => s.status === 'completed');
        const pendingSessions = statsData.filter(s => s.status === 'in_progress');
        const abandonedSessions = statsData.filter(s => s.status === 'abandoned');

        const sessionStats: SessionStats = {
          total_sessions: totalSessions,
          completed_sessions: completedSessions.length,
          pending_sessions: pendingSessions.length,
          abandoned_sessions: abandonedSessions.length,
          average_completion_time: completedSessions.reduce((sum, s) => sum + s.time_limit_minutes, 0) / completedSessions.length || 0,
          average_score: completedSessions.reduce((sum, s) => sum + s.score, 0) / completedSessions.length || 0,
          completion_rate: totalSessions > 0 ? (completedSessions.length / totalSessions) * 100 : 0,
          average_answered_questions: statsData.reduce((sum, s) => sum + s.answered_questions, 0) / totalSessions
        };

        setAllStats(sessionStats);

        // ✅ NOVO: Análise de tempo apenas com sessões completas
        if (validSessions.length > 0) {
          const times = validSessions.map(s => s.time_limit_minutes).filter(t => t > 0);
          
          if (times.length > 0) {
            const timeAnalysisData: SessionTimeAnalysis = {
              fastestCompletion: Math.min(...times),
              slowestCompletion: Math.max(...times),
              averageCompletion: times.reduce((sum, t) => sum + t, 0) / times.length,
              timeDistribution: {
                under30min: times.filter(t => t < 30).length,
                between30and60min: times.filter(t => t >= 30 && t <= 60).length,
                over60min: times.filter(t => t > 60).length
              }
            };

            setTimeAnalysis(timeAnalysisData);
          }
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados das sessões';
      setError(errorMessage);
      console.error('Erro ao buscar dados das sessões:', err);
    } finally {
      setIsLoading(false);
    }
  }, [testId, includePartialInStats, allSessions, validSessions]);

  /**
   * Filtra sessões baseado nos critérios fornecidos
   */
  const filterSessions = useCallback((filters: SessionFilters): TestSessionEntity[] => {
    return allSessions.filter(session => {
      if (filters.status && session.status !== filters.status) return false;
      if (filters.studentId && session.student_id !== filters.studentId) return false;
      
      if (filters.dateRange) {
        const sessionDate = new Date(session.started_at);
        const startDate = new Date(filters.dateRange.start);
        const endDate = new Date(filters.dateRange.end);
        if (sessionDate < startDate || sessionDate > endDate) return false;
      }
      
      if (filters.scoreRange) {
        if (session.score < filters.scoreRange.min || session.score > filters.scoreRange.max) return false;
      }
      
      return true;
    });
  }, [allSessions]);

  /**
   * Busca sessões por status específico
   */
  const getSessionsByStatus = useCallback((status: SessionStatus): TestSessionEntity[] => {
    return allSessions.filter(session => session.status === status);
  }, [allSessions]);

  // ✅ NOVO: Filtros específicos por completude
  const getValidSessions = useCallback(() => validSessions, [validSessions]);
  const getPartialSessions = useCallback(() => partialSessions, [partialSessions]);
  const getSessionsByCompletionStatus = useCallback((status: CompletionStatusLevel) => {
    switch (status) {
      case CompletionStatusLevel.COMPLETE:
        return validSessions;
      case CompletionStatusLevel.PARTIALLY_COMPLETE:
      case CompletionStatusLevel.INCOMPLETE:
        return partialSessions;
      default:
        return allSessions;
    }
  }, [validSessions, partialSessions, allSessions]);

  // Carregar dados automaticamente quando testId mudar
  useEffect(() => {
    if (testId) {
      fetchSessionsData();
    }
  }, [testId, fetchSessionsData]);

  return {
    // ✅ NOVO: Dados separados por completude
    validSessions,
    partialSessions,
    allSessions,
    validSessionsWithStudents,
    partialSessionsWithStudents,
    allSessionsWithStudents,
    
    // Estados de loading
    isLoading,
    error,
    
    // ✅ NOVO: Estatísticas separadas
    validStats,
    partialStats,
    allStats,
    
    // ✅ NOVO: Status de completude
    completionStatus,
    
    // Análise de tempo (apenas com sessões completas)
    timeAnalysis,
    
    // Ações
    refetch: fetchSessionsData,
    filterSessions,
    getSessionsByStatus,
    
    // ✅ NOVO: Filtros específicos
    getValidSessions,
    getPartialSessions,
    getSessionsByCompletionStatus
  };
}; 