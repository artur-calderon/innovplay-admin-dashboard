/**
 * Utilitários para Validação de Completude
 * 
 * Funções para validar se as avaliações, sessões e respostas estão completas
 * e integras segundo as regras de negócio, incluindo controle de completude
 */

import { TestEntity } from '../entities/test/types';
import { TestSessionEntity, SessionStatus, SessionCompletionStatus } from '../entities/sessions/types';
import { StudentAnswerEntity } from '../entities/answers/types';
import { EvaluationResultEntity, ResultCompletionStatus } from '../entities/results/types';
import { CompletionStatus, CompletionStatusLevel, CompletionThresholds, EvaluationCompletionStats } from '../types/completion';

// ===== FUNÇÕES ESPECÍFICAS SOLICITADAS =====

/**
 * ✅ 1. Verifica se uma avaliação está completa (total_questions === answered_questions)
 */
export const isEvaluationComplete = (
  result: EvaluationResultEntity | TestSessionEntity,
  thresholds?: CompletionThresholds
): boolean => {
  // ✅ VALIDAÇÃO DEFENSIVA: Verificar se result é um objeto válido
  if (!result || typeof result !== 'object') {
    console.warn('isEvaluationComplete: result não é um objeto válido:', result);
    return false;
  }

  // Para EvaluationResultEntity
  if ('is_complete' in result) {
    return result.total_questions === result.answered_questions && result.is_complete;
  }
  
  // Para TestSessionEntity
  if ('status' in result) {
    return result.total_questions === result.answered_questions && 
           (result.status === SessionStatus.COMPLETED || result.status === SessionStatus.SUBMITTED);
  }
  
  return false;
};

/**
 * ✅ 2. Separa resultados completos de incompletos
 */
export const filterCompletedResults = <T extends EvaluationResultEntity | TestSessionEntity>(
  items: T[],
  thresholds?: CompletionThresholds
): {
  completed: T[];
  incomplete: T[];
  partial: T[];
  stats: {
    total: number;
    completed: number;
    incomplete: number;
    partial: number;
    completionRate: number;
    partialRate: number;
  };
} => {
  const defaultThresholds: CompletionThresholds = {
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

  const config = thresholds || defaultThresholds;
  
  const completed: T[] = [];
  const incomplete: T[] = [];
  const partial: T[] = [];

  items.forEach(item => {
    const completionPercentage = item.total_questions > 0 
      ? (item.answered_questions / item.total_questions) * 100 
      : 0;

    if (isEvaluationComplete(item)) {
      completed.push(item);
    } else if (completionPercentage >= config.minimum_completion_percentage) {
      partial.push(item);
    } else {
      incomplete.push(item);
    }
  });

  const total = items.length;
  const completionRate = total > 0 ? (completed.length / total) * 100 : 0;
  const partialRate = total > 0 ? (partial.length / total) * 100 : 0;

  return {
    completed,
    incomplete,
    partial,
    stats: {
      total,
      completed: completed.length,
      incomplete: incomplete.length,
      partial: partial.length,
      completionRate,
      partialRate
    }
  };
};

/**
 * ✅ 3. Valida se sessão está completa (versão melhorada)
 */
export const validateSessionCompletion = (
  session: TestSessionEntity, 
  thresholds?: CompletionThresholds
): SessionCompletionStatus & {
  completionDetails: {
    isFullyComplete: boolean;
    isPartiallyComplete: boolean;
    qualityScore: number;
    reliabilityScore: number;
    timeSpentMinutes: number;
    avgTimePerQuestion: number;
    completionLevel: CompletionStatusLevel;
  };
} => {
  const defaultThresholds: CompletionThresholds = {
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

  const config = thresholds || defaultThresholds;
  
  // Calcular completude
  const completion_percentage = session.total_questions > 0 
    ? (session.answered_questions / session.total_questions) * 100 
    : 0;

  const is_complete = session.status === SessionStatus.COMPLETED || 
                     session.status === SessionStatus.SUBMITTED;

  const is_fully_answered = session.answered_questions === session.total_questions;

  const minimum_completion_met = completion_percentage >= config.minimum_completion_percentage;

  // Calcular tempo
  const timeSpentMinutes = session.submitted_at && session.started_at 
    ? Math.floor((new Date(session.submitted_at).getTime() - new Date(session.started_at).getTime()) / 60000)
    : 0;

  const avgTimePerQuestion = session.answered_questions > 0 
    ? (timeSpentMinutes * 60) / session.answered_questions 
    : 0;

  const time_remaining = Math.max(0, session.time_limit_minutes - timeSpentMinutes);

  // Calcular qualidade
  let qualityScore = completion_percentage;
  
  // Penalizar por tempo muito rápido ou muito lento
  if (avgTimePerQuestion < config.minimum_time_per_question) {
    qualityScore *= 0.8; // Penalizar respostas muito rápidas
  } else if (avgTimePerQuestion > config.maximum_time_per_question) {
    qualityScore *= 0.9; // Penalizar respostas muito lentas
  }

  // Bonificar por completude
  if (is_fully_answered) {
    qualityScore = Math.min(100, qualityScore * 1.1);
  }

  // Calcular confiabilidade
  const reliabilityScore = Math.min(100, 
    (completion_percentage * 0.6) + 
    (qualityScore * 0.3) + 
    (is_complete ? 10 : 0)
  );

  // Determinar nível de completude
  let completionLevel: CompletionStatusLevel;
  if (is_fully_answered && is_complete) {
    completionLevel = CompletionStatusLevel.COMPLETE;
  } else if (completion_percentage >= config.high_quality_threshold) {
    completionLevel = CompletionStatusLevel.MOSTLY_COMPLETE;
  } else if (completion_percentage >= config.minimum_completion_percentage) {
    completionLevel = CompletionStatusLevel.PARTIALLY_COMPLETE;
  } else if (completion_percentage > 0) {
    completionLevel = CompletionStatusLevel.INCOMPLETE;
  } else {
    completionLevel = CompletionStatusLevel.NOT_STARTED;
  }

  const can_submit = session.answered_questions >= config.minimum_answers_for_analysis &&
                    completion_percentage >= config.minimum_completion_percentage;

  return {
    session_id: session.id,
    total_questions: session.total_questions,
    answered_questions: session.answered_questions,
    completion_percentage,
    is_complete,
    is_fully_answered,
    time_remaining,
    can_submit,
    minimum_completion_met,
    completionDetails: {
      isFullyComplete: is_fully_answered && is_complete,
      isPartiallyComplete: minimum_completion_met && !is_fully_answered,
      qualityScore,
      reliabilityScore,
      timeSpentMinutes,
      avgTimePerQuestion,
      completionLevel
    }
  };
};

/**
 * ✅ 4. Gera estatísticas completas de completude
 */
export const createCompletionStats = (
  sessions: TestSessionEntity[],
  results: EvaluationResultEntity[],
  testData?: TestEntity,
  thresholds?: CompletionThresholds
): EvaluationCompletionStats => {
  const defaultThresholds: CompletionThresholds = {
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

  const config = thresholds || defaultThresholds;

  // Filtrar dados
  const sessionFilters = filterCompletedResults(sessions, config);
  const resultFilters = filterCompletedResults(results, config);

  // Calcular participação
  const total_students = sessions.length;
  const started_students = sessions.filter(s => s.answered_questions > 0).length;
  const completed_students = sessionFilters.completed.length;
  const abandoned_students = sessions.filter(s => 
    s.status === SessionStatus.ABANDONED || s.status === SessionStatus.TIMED_OUT
  ).length;

  // Calcular completude das respostas
  const total_possible_answers = total_students * (testData?.max_score || 0);
  const actual_answers = sessions.reduce((sum, s) => sum + s.answered_questions, 0);
  const blank_answers = total_possible_answers - actual_answers;

  // Analisar qualidade das submissões
  const qualityAnalysis = sessions.map(s => validateSessionCompletion(s, config));
  
  const high_quality_submissions = qualityAnalysis.filter(q => 
    q.completionDetails.qualityScore >= config.high_quality_threshold
  ).length;
  
  const medium_quality_submissions = qualityAnalysis.filter(q => 
    q.completionDetails.qualityScore >= config.medium_quality_threshold &&
    q.completionDetails.qualityScore < config.high_quality_threshold
  ).length;
  
  const low_quality_submissions = qualityAnalysis.filter(q => 
    q.completionDetails.qualityScore < config.medium_quality_threshold
  ).length;

  const suspicious_submissions = qualityAnalysis.filter(q => 
    q.completionDetails.avgTimePerQuestion < config.minimum_time_per_question ||
    q.completionDetails.qualityScore < config.suspicious_activity_threshold
  ).length;

  // Calcular taxas
  const participation_rate = total_students > 0 ? (started_students / total_students) * 100 : 0;
  const completion_rate = total_students > 0 ? (completed_students / total_students) * 100 : 0;
  const answer_completeness_rate = total_possible_answers > 0 ? (actual_answers / total_possible_answers) * 100 : 0;
  const quality_rate = total_students > 0 ? ((high_quality_submissions + medium_quality_submissions) / total_students) * 100 : 0;

  // Análise de tempo
  const validTimes = qualityAnalysis
    .filter(q => q.completionDetails.timeSpentMinutes > 0)
    .map(q => q.completionDetails.timeSpentMinutes);

  const average_completion_time = validTimes.length > 0 
    ? validTimes.reduce((sum, time) => sum + time, 0) / validTimes.length 
    : 0;

  const median_completion_time = validTimes.length > 0 
    ? validTimes.sort((a, b) => a - b)[Math.floor(validTimes.length / 2)] 
    : 0;

  // Distribuição de tempo
  const expectedTime = testData?.duration || 60; // minutos
  const time_distribution = {
    very_fast: qualityAnalysis.filter(q => q.completionDetails.timeSpentMinutes < expectedTime * 0.25).length,
    fast: qualityAnalysis.filter(q => 
      q.completionDetails.timeSpentMinutes >= expectedTime * 0.25 && 
      q.completionDetails.timeSpentMinutes < expectedTime * 0.50
    ).length,
    normal: qualityAnalysis.filter(q => 
      q.completionDetails.timeSpentMinutes >= expectedTime * 0.50 && 
      q.completionDetails.timeSpentMinutes <= expectedTime * 1.50
    ).length,
    slow: qualityAnalysis.filter(q => q.completionDetails.timeSpentMinutes > expectedTime * 1.50).length
  };

  // Completude por nível de classificação
  const completion_by_level = results.reduce((acc, result) => {
    const level = result.classification;
    if (!acc[level]) {
      acc[level] = {
        completed: 0,
        abandoned: 0,
        completion_rate: 0,
        average_quality: 0
      };
    }

    const session = sessions.find(s => s.student_id === result.student_id);
    if (session) {
      const analysis = validateSessionCompletion(session, config);
      
      if (analysis.is_complete) {
        acc[level].completed++;
      } else {
        acc[level].abandoned++;
      }
      
      acc[level].average_quality += analysis.completionDetails.qualityScore;
    }

    return acc;
  }, {} as Record<any, any>);

  // Calcular médias por nível
  Object.keys(completion_by_level).forEach(level => {
    const total = completion_by_level[level].completed + completion_by_level[level].abandoned;
    completion_by_level[level].completion_rate = total > 0 
      ? (completion_by_level[level].completed / total) * 100 
      : 0;
    completion_by_level[level].average_quality = total > 0 
      ? completion_by_level[level].average_quality / total 
      : 0;
  });

  // Determinar frescor dos dados
  const lastUpdate = sessions.reduce((latest, session) => {
    const sessionTime = new Date(session.updated_at || session.created_at).getTime();
    return sessionTime > latest ? sessionTime : latest;
  }, 0);

  const now = Date.now();
  const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);

  let data_freshness: 'real_time' | 'recent' | 'stale' | 'outdated';
  if (hoursSinceUpdate < 0.5) {
    data_freshness = 'real_time';
  } else if (hoursSinceUpdate < 2) {
    data_freshness = 'recent';
  } else if (hoursSinceUpdate < 24) {
    data_freshness = 'stale';
  } else {
    data_freshness = 'outdated';
  }

  return {
    test_id: testData?.id || 'unknown',
    test_title: testData?.title || 'Unknown Test',
    
    // Participação
    total_students,
    started_students,
    completed_students,
    abandoned_students,
    
    // Completude das respostas
    total_possible_answers,
    actual_answers,
    blank_answers,
    
    // Qualidade
    high_quality_submissions,
    medium_quality_submissions,
    low_quality_submissions,
    suspicious_submissions,
    
    // Taxas
    participation_rate,
    completion_rate,
    answer_completeness_rate,
    quality_rate,
    
    // Tempo
    average_completion_time,
    median_completion_time,
    time_distribution,
    
    // Status por classificação
    completion_by_level,
    
    // Atualizações
    last_calculated: new Date().toISOString(),
    data_freshness
  };
};

// ===== FUNÇÕES AUXILIARES PARA OS HOOKS =====

/**
 * ✅ Função auxiliar para filtrar dados na origem (para uso nos hooks)
 */
export const prepareDataForHooks = <T extends EvaluationResultEntity | TestSessionEntity>(
  data: T[],
  thresholds?: CompletionThresholds
) => {
  const filtered = filterCompletedResults(data, thresholds);
  
  return {
    all: data,
    completed: filtered.completed,
    incomplete: filtered.incomplete,
    partial: filtered.partial,
    completionStats: filtered.stats,
    
    // Métodos de conveniência
    getByCompletionLevel: (level: 'completed' | 'partial' | 'incomplete') => {
      switch (level) {
        case 'completed': return filtered.completed;
        case 'partial': return filtered.partial;
        case 'incomplete': return filtered.incomplete;
        default: return data;
      }
    },
    
    // Estatísticas de qualidade
    getQualityDistribution: () => {
      const total = data.length;
      return {
        high: filtered.completed.length,
        medium: filtered.partial.length,
        low: filtered.incomplete.length,
        percentages: {
          high: total > 0 ? (filtered.completed.length / total) * 100 : 0,
          medium: total > 0 ? (filtered.partial.length / total) * 100 : 0,
          low: total > 0 ? (filtered.incomplete.length / total) * 100 : 0
        }
      };
    }
  };
};

/**
 * ✅ Função para validar se dados são adequados para análise
 */
export const validateDataReadinessForAnalysis = (
  sessions: TestSessionEntity[],
  results: EvaluationResultEntity[],
  thresholds?: CompletionThresholds
): {
  isReady: boolean;
  issues: string[];
  recommendations: string[];
  readinessScore: number; // 0-100
} => {
  const config = thresholds || {
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

  const issues: string[] = [];
  const recommendations: string[] = [];

  // Verificar quantidade mínima de dados
  const minSessions = 10;
  if (sessions.length < minSessions) {
    issues.push(`Número insuficiente de sessões (${sessions.length}/${minSessions})`);
    recommendations.push('Aguarde mais participações antes de analisar os dados');
  }

  // Verificar qualidade das sessões
  const sessionFilters = filterCompletedResults(sessions, config);
  const qualityRate = sessionFilters.stats.completionRate;

  if (qualityRate < config.minimum_quality_score) {
    issues.push(`Taxa de completude baixa (${qualityRate.toFixed(1)}%)`);
    recommendations.push('Verifique se há problemas técnicos impedindo a conclusão');
  }

  // Verificar consistência entre sessões e resultados
  if (results.length > 0 && Math.abs(sessions.length - results.length) > sessions.length * 0.1) {
    issues.push('Inconsistência entre número de sessões e resultados');
    recommendations.push('Execute recálculo dos resultados');
  }

  // Calcular pontuação de prontidão
  let readinessScore = 0;
  
  // Quantidade (30%)
  readinessScore += Math.min(30, (sessions.length / minSessions) * 30);
  
  // Qualidade (40%)
  readinessScore += (qualityRate / 100) * 40;
  
  // Consistência (30%)
  const consistencyScore = results.length > 0 
    ? Math.max(0, 30 - (Math.abs(sessions.length - results.length) / sessions.length) * 30)
    : 0;
  readinessScore += consistencyScore;

  const isReady = issues.length === 0 && readinessScore >= 70;

  return {
    isReady,
    issues,
    recommendations,
    readinessScore: Math.round(readinessScore)
  };
};

// ===== FUNÇÕES EXISTENTES (mantidas) =====

/**
 * Valida se uma avaliação está completa e pronta para ser aplicada
 */
export const validateTestCompletion = (test: TestEntity): {
  isComplete: boolean;
  missingFields: string[];
  warnings: string[];
} => {
  const missingFields: string[] = [];
  const warnings: string[] = [];

  // Campos obrigatórios
  if (!test.title?.trim()) missingFields.push('título');
  if (!test.description?.trim()) missingFields.push('descrição');
  if (!test.subject?.trim()) missingFields.push('disciplina');
  if (!test.grade_id?.trim()) missingFields.push('série');
  if (!test.created_by?.trim()) missingFields.push('criador');

  // Validações específicas
  if (test.max_score <= 0) missingFields.push('pontuação máxima válida');
  if (test.time_limit <= 0) missingFields.push('tempo limite válido');
  if (test.duration <= 0) missingFields.push('duração válida');

  // Validações de integridade
  if (test.municipalities && test.municipalities.length === 0) {
    warnings.push('Nenhum município selecionado');
  }
  if (test.schools && test.schools.length === 0) {
    warnings.push('Nenhuma escola selecionada');
  }

  // Verificar status
  if (test.status !== 'active' && test.status !== 'published') {
    warnings.push('Avaliação não está ativa ou publicada');
  }

  const isComplete = missingFields.length === 0;

  return {
    isComplete,
    missingFields,
    warnings
  };
};

/**
 * ✅ NOVA: Valida se um resultado está completo com controle de completude
 */
export const validateResultCompletion = (
  result: EvaluationResultEntity,
  answers?: StudentAnswerEntity[],
  thresholds?: CompletionThresholds
): ResultCompletionStatus => {
  const defaultThresholds: CompletionThresholds = {
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

  const config = thresholds || defaultThresholds;

  // Calcular completude
  const completion_percentage = result.total_questions > 0 
    ? (result.answered_questions / result.total_questions) * 100 
    : 0;

  const is_fully_answered = result.answered_questions === result.total_questions;
  const minimum_completion_met = completion_percentage >= config.minimum_completion_percentage;
  const missing_questions = result.total_questions - result.answered_questions;
  const blank_answers = result.total_questions - result.answered_questions;

  // Calcular qualidade baseada na completude e consistência
  let quality_score = 0;
  if (completion_percentage >= config.high_quality_threshold) {
    quality_score = 90 + (completion_percentage - config.high_quality_threshold);
  } else if (completion_percentage >= config.medium_quality_threshold) {
    quality_score = 70 + ((completion_percentage - config.medium_quality_threshold) / (config.high_quality_threshold - config.medium_quality_threshold)) * 20;
  } else {
    quality_score = (completion_percentage / config.medium_quality_threshold) * 70;
  }

  // Determinar qualidade da completude
  let completion_quality: 'high' | 'medium' | 'low';
  if (completion_percentage >= config.high_quality_threshold) {
    completion_quality = 'high';
  } else if (completion_percentage >= config.medium_quality_threshold) {
    completion_quality = 'medium';
  } else {
    completion_quality = 'low';
  }

  // Verificar se há dados suficientes para calcular proficiência
  const can_calculate_proficiency = result.answered_questions >= config.minimum_answers_for_analysis &&
                                   completion_percentage >= config.minimum_completion_percentage;

  // Calcular confiabilidade
  const reliability_score = Math.min(100, 
    (completion_percentage * 0.6) + 
    (quality_score * 0.3) + 
    (can_calculate_proficiency ? 10 : 0)
  );

  return {
    result_id: result.id,
    student_id: result.student_id,
    test_id: result.test_id,
    total_questions: result.total_questions,
    answered_questions: result.answered_questions,
    completion_percentage,
    is_complete: result.is_complete,
    is_fully_answered,
    minimum_completion_met,
    quality_score,
    completion_quality,
    missing_questions,
    blank_answers,
    can_calculate_proficiency,
    reliability_score
  };
};

/**
 * ✅ NOVA: Gera status geral de completude para qualquer entidade
 */
export const generateCompletionStatus = (
  entity_type: 'test' | 'session' | 'answer' | 'result',
  entity_id: string,
  data: any,
  thresholds?: CompletionThresholds
): CompletionStatus => {
  const defaultThresholds: CompletionThresholds = {
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

  const config = thresholds || defaultThresholds;

  let completion_percentage = 0;
  let quality_percentage = 0;
  let reliability_percentage = 0;
  let overall_status: CompletionStatusLevel = CompletionStatusLevel.NOT_STARTED;
  let total_items = 0;
  let completed_items = 0;

  // Calcular métricas baseadas no tipo de entidade
  switch (entity_type) {
    case 'session':
      const session = data as TestSessionEntity;
      total_items = session.total_questions;
      completed_items = session.answered_questions;
      completion_percentage = total_items > 0 ? (completed_items / total_items) * 100 : 0;
      
      if (session.status === SessionStatus.COMPLETED) {
        overall_status = CompletionStatusLevel.COMPLETE;
      } else if (completion_percentage >= config.high_quality_threshold) {
        overall_status = CompletionStatusLevel.MOSTLY_COMPLETE;
      } else if (completion_percentage >= config.minimum_completion_percentage) {
        overall_status = CompletionStatusLevel.PARTIALLY_COMPLETE;
      } else if (completion_percentage > 0) {
        overall_status = CompletionStatusLevel.INCOMPLETE;
      }
      break;

    case 'result':
      const result = data as EvaluationResultEntity;
      total_items = result.total_questions;
      completed_items = result.answered_questions;
      completion_percentage = total_items > 0 ? (completed_items / total_items) * 100 : 0;
      
      if (result.is_complete && completion_percentage === 100) {
        overall_status = CompletionStatusLevel.COMPLETE;
      } else if (completion_percentage >= config.high_quality_threshold) {
        overall_status = CompletionStatusLevel.MOSTLY_COMPLETE;
      } else if (completion_percentage >= config.minimum_completion_percentage) {
        overall_status = CompletionStatusLevel.PARTIALLY_COMPLETE;
      } else if (completion_percentage > 0) {
        overall_status = CompletionStatusLevel.INCOMPLETE;
      }
      break;

    default:
      // Para test e answer, usar lógica genérica
      completion_percentage = 50; // Placeholder
      overall_status = CompletionStatusLevel.PARTIALLY_COMPLETE;
  }

  // Calcular qualidade e confiabilidade
  quality_percentage = Math.min(100, completion_percentage * 1.2);
  reliability_percentage = Math.min(100, 
    (completion_percentage * 0.7) + 
    (quality_percentage * 0.3)
  );

  const is_ready_for_analysis = completion_percentage >= config.minimum_completion_percentage;
  const meets_minimum_threshold = completion_percentage >= config.minimum_completion_percentage;

  return {
    entity_type,
    entity_id,
    total_items,
    completed_items,
    pending_items: total_items - completed_items,
    incomplete_items: total_items - completed_items,
    completion_percentage,
    quality_percentage,
    reliability_percentage,
    overall_status,
    is_ready_for_analysis,
    meets_minimum_threshold,
    last_updated: new Date().toISOString(),
    details: {
      total_questions: total_items,
      answered_questions: completed_items,
      blank_answers: total_items - completed_items,
      consistency_score: quality_percentage,
      engagement_score: reliability_percentage,
      issues: [],
      warnings: [],
      recommendations: []
    }
  };
};

/**
 * Valida se as respostas dos alunos estão consistentes
 */
export const validateAnswersConsistency = (answers: StudentAnswerEntity[]): {
  isConsistent: boolean;
  issues: string[];
  duplicates: string[];
  missing: string[];
} => {
  const issues: string[] = [];
  const duplicates: string[] = [];
  const missing: string[] = [];

  // Verificar duplicatas
  const answerKeys = answers.map(a => `${a.student_id}-${a.question_id}`);
  const uniqueKeys = new Set(answerKeys);
  
  if (answerKeys.length !== uniqueKeys.size) {
    const duplicateKeys = answerKeys.filter((key, index) => answerKeys.indexOf(key) !== index);
    duplicates.push(...duplicateKeys);
    issues.push('Respostas duplicadas encontradas');
  }

  // Verificar consistência temporal
  const sortedAnswers = answers.sort((a, b) => 
    new Date(a.answered_at).getTime() - new Date(b.answered_at).getTime()
  );

  for (let i = 1; i < sortedAnswers.length; i++) {
    const prev = sortedAnswers[i-1];
    const curr = sortedAnswers[i];
    
    const timeDiff = new Date(curr.answered_at).getTime() - new Date(prev.answered_at).getTime();
    
    // Respostas muito rápidas (menos de 5 segundos)
    if (timeDiff < 5000) {
      issues.push(`Resposta muito rápida entre questões ${prev.question_id} e ${curr.question_id}`);
    }
  }

  // Verificar padrões suspeitos
  const answerPattern = answers.map(a => a.answer).join('');
  if (/^(.)\1{4,}/.test(answerPattern)) {
    issues.push('Padrão suspeito de respostas repetitivas');
  }

  const isConsistent = issues.length === 0 && duplicates.length === 0;

  return {
    isConsistent,
    issues,
    duplicates,
    missing
  };
};

/**
 * ✅ NOVA: Valida completude mínima para análise estatística
 */
export const validateMinimumDataForAnalysis = (
  sessions: TestSessionEntity[],
  thresholds?: CompletionThresholds
): {
  hasMinimumData: boolean;
  completeSessions: number;
  partialSessions: number;
  qualityScore: number;
  recommendations: string[];
} => {
  const defaultThresholds: CompletionThresholds = {
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

  const config = thresholds || defaultThresholds;
  const recommendations: string[] = [];

  const completeSessions = sessions.filter(s => 
    s.status === SessionStatus.COMPLETED && 
    s.answered_questions >= config.minimum_answers_for_analysis
  ).length;

  const partialSessions = sessions.filter(s => 
    s.answered_questions >= config.minimum_answers_for_analysis &&
    (s.answered_questions / s.total_questions) * 100 >= config.minimum_completion_percentage
  ).length;

  const totalUsableSessions = Math.max(completeSessions, partialSessions);
  const hasMinimumData = totalUsableSessions >= 10; // Mínimo de 10 sessões para análise

  // Calcular qualidade geral
  const averageCompletion = sessions.length > 0 
    ? sessions.reduce((sum, s) => sum + ((s.answered_questions / s.total_questions) * 100), 0) / sessions.length
    : 0;

  const qualityScore = Math.min(100, averageCompletion);

  // Gerar recomendações
  if (!hasMinimumData) {
    recommendations.push('Número insuficiente de sessões completas para análise confiável');
  }

  if (qualityScore < config.minimum_quality_score) {
    recommendations.push('Qualidade dos dados abaixo do limite mínimo para análise');
  }

  if (completeSessions < sessions.length * 0.5) {
    recommendations.push('Mais de 50% das sessões estão incompletas');
  }

  return {
    hasMinimumData,
    completeSessions,
    partialSessions,
    qualityScore,
    recommendations
  };
}; 