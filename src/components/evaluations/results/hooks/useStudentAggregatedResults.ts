/**
 * Hook para Resultados Agregados do Aluno
 * 
 * Este hook verifica se o aluno completou a avaliação antes de agregar dados,
 * evitando buscas desnecessárias e fornecendo feedback adequado para alunos
 * que não completaram a avaliação.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { EvaluationResultsApiService } from '@/services/evaluationResultsApi';
import { 
  TestSessionEntity, 
  SessionStatus, 
  SessionCompletionStatus 
} from '../entities/sessions/types';
import { 
  EvaluationResultEntity, 
  ResultCompletionStatus,
  ClassificationLevel 
} from '../entities/results/types';
import { 
  StudentAnswerEntity 
} from '../entities/answers/types';
import { 
  CompletionStatus, 
  CompletionStatusLevel, 
  CompletionThresholds 
} from '../types/completion';
import { 
  isEvaluationComplete,
  validateSessionCompletion,
  validateResultCompletion,
  createCompletionStats
} from '../utils/completionValidation';

// ===== INTERFACES =====

interface StudentAggregatedData {
  // Dados básicos do aluno
  student_id: string;
  student_name?: string;
  test_id: string;
  
  // Status de completude
  completion_status: CompletionStatusLevel;
  is_complete: boolean;
  
  // Dados da sessão (se disponível)
  session?: TestSessionEntity;
  session_completion?: SessionCompletionStatus;
  
  // Dados do resultado (se disponível)  
  result?: EvaluationResultEntity;
  result_completion?: ResultCompletionStatus;
  
  // Respostas detalhadas (só se necessário)
  answers?: StudentAnswerEntity[];
  
  // Estatísticas agregadas (só se completo)
  aggregated_stats?: {
    total_questions: number;
    answered_questions: number;
    correct_answers: number;
    score_percentage: number;
    grade: number;
    proficiency: number;
    classification: ClassificationLevel;
    time_spent_minutes: number;
    completion_percentage: number;
    quality_score: number;
  };
  
  // Mensagens explicativas
  status_message: string;
  recommendations: string[];
}

interface UseStudentAggregatedResultsReturn {
  // Dados principais
  data: StudentAggregatedData | null;
  
  // Estados de carregamento
  isLoading: boolean;
  isCheckingCompletion: boolean;
  isLoadingDetails: boolean;
  
  // Estados de erro
  error: string | null;
  
  // Funções utilitárias
  refetch: () => Promise<void>;
  forceLoadDetails: () => Promise<void>; // Para forçar carregamento mesmo se incompleto
  
  // Estados de conveniência
  canAnalyze: boolean;
  shouldShowResults: boolean;
  completionLevel: CompletionStatusLevel;
  
  // Métricas rápidas (sem necessidade de carregamento completo)
  quickStats: {
    hasStarted: boolean;
    hasAnswered: boolean;
    estimatedCompletion: number; // %
    timeSpent: number; // minutos estimados
  };
}

// ===== CONFIGURAÇÕES PADRÃO =====

const DEFAULT_THRESHOLDS: CompletionThresholds = {
  minimum_completion_percentage: 80,
  minimum_quality_score: 70,
  minimum_answers_for_analysis: 10,
  high_quality_threshold: 90,
  medium_quality_threshold: 70,
  suspicious_activity_threshold: 20,
  minimum_time_per_question: 10,
  maximum_time_per_question: 300,
  total_time_warning_threshold: 120,
  context_specific: {
    grade_adjustments: {},
    subject_adjustments: {},
    special_needs_adjustments: {}
  }
};

// ===== MENSAGENS EXPLICATIVAS =====

const getStatusMessage = (
  completionLevel: CompletionStatusLevel,
  completion_percentage: number,
  hasStarted: boolean
): string => {
  switch (completionLevel) {
    case CompletionStatusLevel.NOT_STARTED:
      return "O aluno ainda não iniciou esta avaliação.";
      
    case CompletionStatusLevel.INCOMPLETE:
      if (!hasStarted) {
        return "O aluno não iniciou a avaliação.";
      }
      return `O aluno iniciou mas não completou a avaliação (${completion_percentage.toFixed(1)}% concluído).`;
      
    case CompletionStatusLevel.PARTIALLY_COMPLETE:
      return `O aluno completou parcialmente a avaliação (${completion_percentage.toFixed(1)}% concluído). Os dados são suficientes para análise básica.`;
      
    case CompletionStatusLevel.MOSTLY_COMPLETE:
      return `O aluno quase completou a avaliação (${completion_percentage.toFixed(1)}% concluído). Os dados são confiáveis para análise.`;
      
    case CompletionStatusLevel.COMPLETE:
      return "O aluno completou totalmente a avaliação. Todos os dados estão disponíveis para análise.";
      
    default:
      return "Status da avaliação não pode ser determinado.";
  }
};

const getRecommendations = (
  completionLevel: CompletionStatusLevel,
  completion_percentage: number,
  hasStarted: boolean,
  timeSpent: number
): string[] => {
  const recommendations: string[] = [];
  
  switch (completionLevel) {
    case CompletionStatusLevel.NOT_STARTED:
      recommendations.push("Verifique se o aluno teve acesso à avaliação");
      recommendations.push("Confirme se o aluno recebeu as instruções adequadas");
      break;
      
    case CompletionStatusLevel.INCOMPLETE:
      if (hasStarted) {
        recommendations.push("Verifique se houve problemas técnicos durante a avaliação");
        recommendations.push("Entre em contato com o aluno para entender os motivos");
        if (timeSpent < 10) {
          recommendations.push("O tempo gasto foi muito baixo - possível problema de acesso");
        }
      } else {
        recommendations.push("O aluno não acessou a avaliação");
        recommendations.push("Verifique se as credenciais de acesso estão corretas");
      }
      break;
      
    case CompletionStatusLevel.PARTIALLY_COMPLETE:
      recommendations.push("Os dados parciais podem ser usados para análise básica");
      recommendations.push("Considere oferecer oportunidade de completar a avaliação");
      if (completion_percentage < 60) {
        recommendations.push("Completude baixa pode afetar a confiabilidade dos resultados");
      }
      break;
      
    case CompletionStatusLevel.MOSTLY_COMPLETE:
      recommendations.push("Os dados são suficientes para análise completa");
      if (completion_percentage < 95) {
        recommendations.push("Algumas questões podem não ter sido respondidas");
      }
      break;
      
    case CompletionStatusLevel.COMPLETE:
      recommendations.push("Todos os dados estão disponíveis para análise completa");
      break;
  }
  
  return recommendations;
};

// ===== HOOK PRINCIPAL =====

export const useStudentAggregatedResults = (
  testId: string,
  studentId: string,
  options: {
    thresholds?: CompletionThresholds;
    includeAnswers?: boolean; // Se deve carregar respostas detalhadas
    autoLoadDetails?: boolean; // Se deve carregar detalhes automaticamente para completos
  } = {}
): UseStudentAggregatedResultsReturn => {
  
  // ===== CONFIGURAÇÕES =====
  
  const {
    thresholds = DEFAULT_THRESHOLDS,
    includeAnswers = false,
    autoLoadDetails = true
  } = options;
  
  // ===== ESTADOS =====
  
  const [data, setData] = useState<StudentAggregatedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingCompletion, setIsCheckingCompletion] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // ===== FUNÇÕES AUXILIARES =====
  
  /**
   * ✅ 1. Verifica completude básica do aluno (busca rápida)
   */
  const checkBasicCompletion = useCallback(async (): Promise<{
    hasSession: boolean;
    session?: TestSessionEntity;
    hasResult?: boolean;
    basicCompletion: number;
    shouldLoadDetails: boolean;
  }> => {
    try {
      // Buscar sessão básica primeiro (mais rápido)
      const sessions = await EvaluationResultsApiService.getStudentsByEvaluation(testId);
      const studentSession = sessions.find(s => s.id === studentId);
      
      if (!studentSession) {
        return {
          hasSession: false,
          basicCompletion: 0,
          shouldLoadDetails: false
        };
      }
      
      // Converter para TestSessionEntity format
      const session: TestSessionEntity = {
        id: studentSession.id,
        student_id: studentId,
        test_id: testId,
        started_at: new Date().toISOString(), // Placeholder
        submitted_at: studentSession.status === 'concluida' ? new Date().toISOString() : '',
        time_limit_minutes: 120, // Default
        status: studentSession.status === 'concluida' ? SessionStatus.COMPLETED : SessionStatus.IN_PROGRESS,
        total_questions: studentSession.questoes_respondidas + studentSession.erros + studentSession.em_branco,
        answered_questions: studentSession.questoes_respondidas,
        correct_answers: studentSession.acertos,
        score: studentSession.nota,
        grade: studentSession.nota,
        feedback: '',
        corrected_by: '',
        corrected_at: '',
        ip_address: '',
        user_agent: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const basicCompletion = session.total_questions > 0 
        ? (session.answered_questions / session.total_questions) * 100 
        : 0;
      
      const isComplete = isEvaluationComplete(session);
      const shouldLoadDetails = isComplete || (basicCompletion >= thresholds.minimum_completion_percentage);
      
      return {
        hasSession: true,
        session,
        hasResult: studentSession.status === 'concluida',
        basicCompletion,
        shouldLoadDetails: autoLoadDetails && shouldLoadDetails
      };
      
    } catch (err) {
      console.error('Erro ao verificar completude básica:', err);
      throw new Error('Não foi possível verificar o status do aluno');
    }
  }, [testId, studentId, thresholds, autoLoadDetails]);
  
  /**
   * ✅ 2. Carrega dados detalhados (só se necessário)
   */
  const loadDetailedData = useCallback(async (session: TestSessionEntity): Promise<{
    result?: EvaluationResultEntity;
    answers?: StudentAnswerEntity[];
  }> => {
    try {
      setIsLoadingDetails(true);
      
      const promises: Promise<any>[] = [];
      
      // Carregar resultado detalhado
      promises.push(
        EvaluationResultsApiService.getStudentResults(testId, studentId)
      );
      
      // Carregar respostas se solicitado
      if (includeAnswers) {
        promises.push(
          EvaluationResultsApiService.getStudentDetailedResults(testId, studentId, true)
        );
      }
      
      const results = await Promise.all(promises);
      
      const result = results[0];
      const detailedAnswers = includeAnswers ? results[1] : null;
      
      // Converter resultado para EvaluationResultEntity
      const evaluationResult: EvaluationResultEntity | undefined = result ? {
        id: `${result.test_id}-${result.student_id}`,
        test_id: result.test_id,
        student_id: result.student_id,
        session_id: session.id,
        correct_answers: result.correct_answers,
        total_questions: result.total_questions,
        answered_questions: result.answered_questions,
        score_percentage: result.score_percentage,
        grade: result.grade,
        proficiency: result.proficiencia,
        classification: result.classificacao as ClassificationLevel,
        is_complete: result.status !== 'nao_respondida',
        calculated_at: result.calculated_at
      } : undefined;
      
      const answers = detailedAnswers?.answers || undefined;
      
      return {
        result: evaluationResult,
        answers
      };
      
    } catch (err) {
      console.error('Erro ao carregar dados detalhados:', err);
      // Não falhar completamente - retornar dados parciais
      return {};
    } finally {
      setIsLoadingDetails(false);
    }
  }, [testId, studentId, includeAnswers]);
  
  /**
   * ✅ 3. Agrega todos os dados
   */
  const aggregateData = useCallback((
    session: TestSessionEntity,
    result?: EvaluationResultEntity,
    answers?: StudentAnswerEntity[]
  ): StudentAggregatedData => {
    
    // Validar completude da sessão
    const sessionCompletion = validateSessionCompletion(session, thresholds);
    
    // Validar completude do resultado (se disponível)
    const resultCompletion = result 
      ? validateResultCompletion(result, answers, thresholds)
      : undefined;
    
    // Determinar nível de completude geral
    const completion_percentage = sessionCompletion.completion_percentage;
    const completionLevel = sessionCompletion.completionDetails.completionLevel;
    const isComplete = sessionCompletion.is_complete;
    
    // Estatísticas agregadas (só se vale a pena)
    let aggregated_stats = undefined;
    if (completionLevel !== CompletionStatusLevel.NOT_STARTED && 
        completionLevel !== CompletionStatusLevel.INCOMPLETE) {
      
      aggregated_stats = {
        total_questions: session.total_questions,
        answered_questions: session.answered_questions,
        correct_answers: session.correct_answers,
        score_percentage: result?.score_percentage || (session.correct_answers / session.total_questions) * 100,
        grade: session.grade,
        proficiency: result?.proficiency || 0,
        classification: result?.classification || ClassificationLevel.ABAIXO_DO_BASICO,
        time_spent_minutes: sessionCompletion.completionDetails.timeSpentMinutes,
        completion_percentage,
        quality_score: sessionCompletion.completionDetails.qualityScore
      };
    }
    
    // Gerar mensagens
    const hasStarted = session.answered_questions > 0;
    const status_message = getStatusMessage(completionLevel, completion_percentage, hasStarted);
    const recommendations = getRecommendations(
      completionLevel, 
      completion_percentage, 
      hasStarted, 
      sessionCompletion.completionDetails.timeSpentMinutes
    );
    
    return {
      student_id: session.student_id,
      student_name: result?.student_name,
      test_id: session.test_id,
      completion_status: completionLevel,
      is_complete: isComplete,
      session,
      session_completion: sessionCompletion,
      result,
      result_completion: resultCompletion,
      answers,
      aggregated_stats,
      status_message,
      recommendations
    };
    
  }, [thresholds]);
  
  /**
   * ✅ 4. Função principal de carregamento
   */
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fase 1: Verificação rápida de completude
      setIsCheckingCompletion(true);
      const basicCheck = await checkBasicCompletion();
      setIsCheckingCompletion(false);
      
      if (!basicCheck.hasSession || !basicCheck.session) {
        // Aluno não tem sessão - criar estado básico
        const emptyData: StudentAggregatedData = {
          student_id: studentId,
          test_id: testId,
          completion_status: CompletionStatusLevel.NOT_STARTED,
          is_complete: false,
          status_message: "O aluno ainda não iniciou esta avaliação.",
          recommendations: [
            "Verifique se o aluno teve acesso à avaliação",
            "Confirme se o aluno recebeu as instruções adequadas"
          ]
        };
        
        setData(emptyData);
        return;
      }
      
      // Fase 2: Dados básicos sempre disponíveis
      let detailedData = { result: undefined, answers: undefined };
      
      // Fase 3: Só carregar dados detalhados se necessário
      if (basicCheck.shouldLoadDetails) {
        detailedData = await loadDetailedData(basicCheck.session);
      }
      
      // Fase 4: Agregar dados
      const aggregatedData = aggregateData(
        basicCheck.session,
        detailedData.result,
        detailedData.answers
      );
      
      setData(aggregatedData);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro no useStudentAggregatedResults:', err);
    } finally {
      setIsLoading(false);
    }
  }, [checkBasicCompletion, loadDetailedData, aggregateData, studentId, testId]);
  
  /**
   * ✅ 5. Força carregamento de detalhes (mesmo se incompleto)
   */
  const forceLoadDetails = useCallback(async () => {
    if (!data?.session) return;
    
    try {
      const detailedData = await loadDetailedData(data.session);
      
      // Re-agregar com os novos dados
      const updatedData = aggregateData(
        data.session,
        detailedData.result,
        detailedData.answers
      );
      
      setData(updatedData);
      
    } catch (err) {
      console.error('Erro ao forçar carregamento de detalhes:', err);
    }
  }, [data?.session, loadDetailedData, aggregateData]);
  
  // ===== EFFECTS =====
  
  useEffect(() => {
    if (testId && studentId) {
      fetchData();
    }
  }, [fetchData, testId, studentId]);
  
  // ===== VALORES COMPUTADOS =====
  
  const quickStats = useMemo(() => {
    if (!data?.session) {
      return {
        hasStarted: false,
        hasAnswered: false,
        estimatedCompletion: 0,
        timeSpent: 0
      };
    }
    
    return {
      hasStarted: data.session.answered_questions > 0,
      hasAnswered: data.session.answered_questions > 0,
      estimatedCompletion: data.session.total_questions > 0 
        ? (data.session.answered_questions / data.session.total_questions) * 100 
        : 0,
      timeSpent: data.session_completion?.completionDetails.timeSpentMinutes || 0
    };
  }, [data]);
  
  const canAnalyze = useMemo(() => {
    return data?.completion_status === CompletionStatusLevel.COMPLETE ||
           data?.completion_status === CompletionStatusLevel.MOSTLY_COMPLETE ||
           data?.completion_status === CompletionStatusLevel.PARTIALLY_COMPLETE;
  }, [data?.completion_status]);
  
  const shouldShowResults = useMemo(() => {
    return canAnalyze && data?.aggregated_stats !== undefined;
  }, [canAnalyze, data?.aggregated_stats]);
  
  const completionLevel = data?.completion_status || CompletionStatusLevel.NOT_STARTED;
  
  // ===== RETORNO =====
  
  return {
    data,
    isLoading,
    isCheckingCompletion,
    isLoadingDetails,
    error,
    refetch: fetchData,
    forceLoadDetails,
    canAnalyze,
    shouldShowResults,
    completionLevel,
    quickStats
  };
}; 