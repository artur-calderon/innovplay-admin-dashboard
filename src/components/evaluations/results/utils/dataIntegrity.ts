/**
 * Utilitários para Integridade de Dados
 * 
 * Funções para verificar e garantir a integridade dos dados entre as diferentes
 * entidades do sistema de resultados, seguindo os relacionamentos do banco de dados
 */

import { TestEntity } from '../entities/test/types';
import { QuestionEntity } from '../entities/questions/types';
import { TestSessionEntity } from '../entities/sessions/types';
import { StudentAnswerEntity } from '../entities/answers/types';
import { EvaluationResultEntity } from '../entities/results/types';

/**
 * Verifica a integridade referencial entre entidades
 */
export const checkReferentialIntegrity = (data: {
  test: TestEntity;
  questions: QuestionEntity[];
  sessions: TestSessionEntity[];
  answers: StudentAnswerEntity[];
  results: EvaluationResultEntity[];
}): {
  isIntegral: boolean;
  violations: Array<{
    type: 'missing_reference' | 'orphaned_record' | 'duplicate_key' | 'invalid_constraint';
    entity: string;
    field: string;
    value: string;
    description: string;
  }>;
  summary: {
    totalViolations: number;
    violationsByType: Record<string, number>;
    violationsByEntity: Record<string, number>;
  };
} => {
  const violations: Array<{
    type: 'missing_reference' | 'orphaned_record' | 'duplicate_key' | 'invalid_constraint';
    entity: string;
    field: string;
    value: string;
    description: string;
  }> = [];

  const { test, questions, sessions, answers, results } = data;

  // 1. Verificar se todas as questões pertencem ao teste
  questions.forEach(question => {
    if (question.test_id !== test.id) {
      violations.push({
        type: 'missing_reference',
        entity: 'question',
        field: 'test_id',
        value: question.test_id,
        description: `Questão ${question.id} referencia test_id inexistente: ${question.test_id}`
      });
    }
  });

  // 2. Verificar se todas as sessões pertencem ao teste
  sessions.forEach(session => {
    if (session.test_id !== test.id) {
      violations.push({
        type: 'missing_reference',
        entity: 'test_sessions',
        field: 'test_id',
        value: session.test_id,
        description: `Sessão ${session.id} referencia test_id inexistente: ${session.test_id}`
      });
    }

    // Verificar se não há sessões duplicadas para o mesmo aluno
    const duplicateSessions = sessions.filter(s => 
      s.student_id === session.student_id && 
      s.test_id === session.test_id && 
      s.id !== session.id
    );

    if (duplicateSessions.length > 0) {
      violations.push({
        type: 'duplicate_key',
        entity: 'test_sessions',
        field: 'student_id + test_id',
        value: `${session.student_id}:${session.test_id}`,
        description: `Múltiplas sessões encontradas para aluno ${session.student_id} no teste ${session.test_id}`
      });
    }
  });

  // 3. Verificar integridade das respostas
  answers.forEach(answer => {
    // Verificar se a resposta referencia um teste válido
    if (answer.test_id !== test.id) {
      violations.push({
        type: 'missing_reference',
        entity: 'student_answers',
        field: 'test_id',
        value: answer.test_id,
        description: `Resposta ${answer.id} referencia test_id inexistente: ${answer.test_id}`
      });
    }

    // Verificar se a resposta referencia uma questão válida
    const questionExists = questions.some(q => q.id === answer.question_id);
    if (!questionExists) {
      violations.push({
        type: 'missing_reference',
        entity: 'student_answers',
        field: 'question_id',
        value: answer.question_id,
        description: `Resposta ${answer.id} referencia question_id inexistente: ${answer.question_id}`
      });
    }

    // Verificar se existe uma sessão para o aluno
    const sessionExists = sessions.some(s => 
      s.student_id === answer.student_id && s.test_id === answer.test_id
    );
    if (!sessionExists) {
      violations.push({
        type: 'missing_reference',
        entity: 'student_answers',
        field: 'student_id',
        value: answer.student_id,
        description: `Resposta ${answer.id} não possui sessão correspondente para aluno ${answer.student_id}`
      });
    }
  });

  // 4. Verificar integridade dos resultados
  results.forEach(result => {
    // Verificar se o resultado referencia um teste válido
    if (result.test_id !== test.id) {
      violations.push({
        type: 'missing_reference',
        entity: 'evaluation_results',
        field: 'test_id',
        value: result.test_id,
        description: `Resultado ${result.id} referencia test_id inexistente: ${result.test_id}`
      });
    }

    // Verificar se existe uma sessão correspondente
    const sessionExists = sessions.some(s => 
      s.student_id === result.student_id && s.test_id === result.test_id
    );
    if (!sessionExists) {
      violations.push({
        type: 'missing_reference',
        entity: 'evaluation_results',
        field: 'student_id',
        value: result.student_id,
        description: `Resultado ${result.id} não possui sessão correspondente para aluno ${result.student_id}`
      });
    }

    // Verificar se existem respostas correspondentes
    const answersExist = answers.some(a => 
      a.student_id === result.student_id && a.test_id === result.test_id
    );
    if (!answersExist && result.correct_answers > 0) {
      violations.push({
        type: 'missing_reference',
        entity: 'evaluation_results',
        field: 'student_id',
        value: result.student_id,
        description: `Resultado ${result.id} indica acertos mas não possui respostas correspondentes`
      });
    }
  });

  // 5. Verificar registros órfãos
  // Respostas sem resultados correspondentes
  answers.forEach(answer => {
    const hasResult = results.some(r => 
      r.student_id === answer.student_id && r.test_id === answer.test_id
    );
    if (!hasResult) {
      violations.push({
        type: 'orphaned_record',
        entity: 'student_answers',
        field: 'student_id',
        value: answer.student_id,
        description: `Resposta ${answer.id} não possui resultado correspondente para aluno ${answer.student_id}`
      });
    }
  });

  // Calcular resumo
  const violationsByType = violations.reduce((acc, v) => {
    acc[v.type] = (acc[v.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const violationsByEntity = violations.reduce((acc, v) => {
    acc[v.entity] = (acc[v.entity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    isIntegral: violations.length === 0,
    violations,
    summary: {
      totalViolations: violations.length,
      violationsByType,
      violationsByEntity
    }
  };
};

/**
 * Verifica a consistência dos dados calculados
 */
export const checkDataConsistency = (data: {
  test: TestEntity;
  questions: QuestionEntity[];
  sessions: TestSessionEntity[];
  answers: StudentAnswerEntity[];
  results: EvaluationResultEntity[];
}): {
  isConsistent: boolean;
  inconsistencies: Array<{
    type: 'calculation_error' | 'data_mismatch' | 'constraint_violation';
    entity: string;
    field: string;
    expected: any;
    actual: any;
    description: string;
  }>;
  summary: {
    totalInconsistencies: number;
    affectedStudents: string[];
    affectedQuestions: string[];
  };
} => {
  const inconsistencies: Array<{
    type: 'calculation_error' | 'data_mismatch' | 'constraint_violation';
    entity: string;
    field: string;
    expected: any;
    actual: any;
    description: string;
  }> = [];

  const { test, questions, sessions, answers, results } = data;
  const affectedStudents = new Set<string>();
  const affectedQuestions = new Set<string>();

  // 1. Verificar consistência entre sessões e resultados
  sessions.forEach(session => {
    const correspondingResult = results.find(r => 
      r.student_id === session.student_id && r.test_id === session.test_id
    );

    if (correspondingResult) {
      // Verificar se os acertos coincidem
      if (session.correct_answers !== correspondingResult.correct_answers) {
        inconsistencies.push({
          type: 'data_mismatch',
          entity: 'test_sessions vs evaluation_results',
          field: 'correct_answers',
          expected: session.correct_answers,
          actual: correspondingResult.correct_answers,
          description: `Acertos diferentes entre sessão (${session.correct_answers}) e resultado (${correspondingResult.correct_answers}) para aluno ${session.student_id}`
        });
        affectedStudents.add(session.student_id);
      }

      // Verificar se as notas coincidem
      if (Math.abs(session.grade - correspondingResult.grade) > 0.01) {
        inconsistencies.push({
          type: 'data_mismatch',
          entity: 'test_sessions vs evaluation_results',
          field: 'grade',
          expected: session.grade,
          actual: correspondingResult.grade,
          description: `Notas diferentes entre sessão (${session.grade}) e resultado (${correspondingResult.grade}) para aluno ${session.student_id}`
        });
        affectedStudents.add(session.student_id);
      }
    }
  });

  // 2. Verificar cálculos baseados nas respostas
  results.forEach(result => {
    const studentAnswers = answers.filter(a => 
      a.student_id === result.student_id && a.test_id === result.test_id
    );

    if (studentAnswers.length > 0) {
      // Calcular acertos baseado nas respostas
      const calculatedCorrect = studentAnswers.filter(a => a.is_correct).length;
      if (calculatedCorrect !== result.correct_answers) {
        inconsistencies.push({
          type: 'calculation_error',
          entity: 'evaluation_results',
          field: 'correct_answers',
          expected: calculatedCorrect,
          actual: result.correct_answers,
          description: `Acertos calculados (${calculatedCorrect}) não conferem com resultado (${result.correct_answers}) para aluno ${result.student_id}`
        });
        affectedStudents.add(result.student_id);
      }

      // Calcular porcentagem
      const calculatedPercentage = studentAnswers.length > 0 ? 
        (calculatedCorrect / studentAnswers.length) * 100 : 0;
      
      if (Math.abs(calculatedPercentage - result.score_percentage) > 0.1) {
        inconsistencies.push({
          type: 'calculation_error',
          entity: 'evaluation_results',
          field: 'score_percentage',
          expected: calculatedPercentage,
          actual: result.score_percentage,
          description: `Porcentagem calculada (${calculatedPercentage.toFixed(1)}%) não confere com resultado (${result.score_percentage.toFixed(1)}%) para aluno ${result.student_id}`
        });
        affectedStudents.add(result.student_id);
      }
    }
  });

  // 3. Verificar restrições de domínio
  results.forEach(result => {
    // Verificar se a nota está no intervalo válido (0-10)
    if (result.grade < 0 || result.grade > 10) {
      inconsistencies.push({
        type: 'constraint_violation',
        entity: 'evaluation_results',
        field: 'grade',
        expected: '0-10',
        actual: result.grade,
        description: `Nota ${result.grade} fora do intervalo válido (0-10) para aluno ${result.student_id}`
      });
      affectedStudents.add(result.student_id);
    }

    // Verificar se a porcentagem está no intervalo válido (0-100)
    if (result.score_percentage < 0 || result.score_percentage > 100) {
      inconsistencies.push({
        type: 'constraint_violation',
        entity: 'evaluation_results',
        field: 'score_percentage',
        expected: '0-100',
        actual: result.score_percentage,
        description: `Porcentagem ${result.score_percentage}% fora do intervalo válido (0-100%) para aluno ${result.student_id}`
      });
      affectedStudents.add(result.student_id);
    }

    // Verificar se os acertos não excedem o total de questões
    if (result.correct_answers > result.total_questions) {
      inconsistencies.push({
        type: 'constraint_violation',
        entity: 'evaluation_results',
        field: 'correct_answers',
        expected: `<= ${result.total_questions}`,
        actual: result.correct_answers,
        description: `Acertos (${result.correct_answers}) excedem total de questões (${result.total_questions}) para aluno ${result.student_id}`
      });
      affectedStudents.add(result.student_id);
    }
  });

  // 4. Verificar integridade temporal
  sessions.forEach(session => {
    if (session.started_at && session.submitted_at) {
      const startTime = new Date(session.started_at);
      const endTime = new Date(session.submitted_at);

      if (endTime < startTime) {
        inconsistencies.push({
          type: 'constraint_violation',
          entity: 'test_sessions',
          field: 'submitted_at',
          expected: `> ${session.started_at}`,
          actual: session.submitted_at,
          description: `Data de submissão anterior à data de início na sessão ${session.id}`
        });
        affectedStudents.add(session.student_id);
      }
    }
  });

  return {
    isConsistent: inconsistencies.length === 0,
    inconsistencies,
    summary: {
      totalInconsistencies: inconsistencies.length,
      affectedStudents: Array.from(affectedStudents),
      affectedQuestions: Array.from(affectedQuestions)
    }
  };
};

/**
 * Executa uma verificação completa de integridade dos dados
 */
export const performCompleteIntegrityCheck = (data: {
  test: TestEntity;
  questions: QuestionEntity[];
  sessions: TestSessionEntity[];
  answers: StudentAnswerEntity[];
  results: EvaluationResultEntity[];
}): {
  overallStatus: 'healthy' | 'warnings' | 'errors' | 'critical';
  referentialIntegrity: ReturnType<typeof checkReferentialIntegrity>;
  dataConsistency: ReturnType<typeof checkDataConsistency>;
  recommendations: string[];
  criticalIssues: string[];
} => {
  const referentialIntegrity = checkReferentialIntegrity(data);
  const dataConsistency = checkDataConsistency(data);

  const recommendations: string[] = [];
  const criticalIssues: string[] = [];

  // Analisar violações de integridade referencial
  referentialIntegrity.violations.forEach(violation => {
    if (violation.type === 'missing_reference' || violation.type === 'orphaned_record') {
      criticalIssues.push(violation.description);
    } else {
      recommendations.push(`Corrigir: ${violation.description}`);
    }
  });

  // Analisar inconsistências de dados
  dataConsistency.inconsistencies.forEach(inconsistency => {
    if (inconsistency.type === 'calculation_error') {
      criticalIssues.push(inconsistency.description);
    } else {
      recommendations.push(`Verificar: ${inconsistency.description}`);
    }
  });

  // Determinar status geral
  let overallStatus: 'healthy' | 'warnings' | 'errors' | 'critical' = 'healthy';

  if (criticalIssues.length > 0) {
    overallStatus = 'critical';
  } else if (!referentialIntegrity.isIntegral || !dataConsistency.isConsistent) {
    overallStatus = 'errors';
  } else if (recommendations.length > 0) {
    overallStatus = 'warnings';
  }

  // Adicionar recomendações gerais
  if (data.sessions.length === 0) {
    recommendations.push('Nenhuma sessão encontrada - verificar se a avaliação foi aplicada');
  }

  if (data.results.length === 0) {
    recommendations.push('Nenhum resultado encontrado - executar cálculo de resultados');
  }

  const completionRate = data.sessions.length > 0 ? 
    (data.sessions.filter(s => s.status === 'completed').length / data.sessions.length) * 100 : 0;

  if (completionRate < 80) {
    recommendations.push(`Taxa de conclusão baixa (${completionRate.toFixed(1)}%) - investigar possíveis problemas`);
  }

  return {
    overallStatus,
    referentialIntegrity,
    dataConsistency,
    recommendations,
    criticalIssues
  };
};

/**
 * Gera um relatório de saúde dos dados
 */
export const generateDataHealthReport = (data: {
  test: TestEntity;
  questions: QuestionEntity[];
  sessions: TestSessionEntity[];
  answers: StudentAnswerEntity[];
  results: EvaluationResultEntity[];
}): {
  reportDate: string;
  testId: string;
  testTitle: string;
  dataStats: {
    totalQuestions: number;
    totalSessions: number;
    totalAnswers: number;
    totalResults: number;
    completionRate: number;
  };
  integrityCheck: ReturnType<typeof performCompleteIntegrityCheck>;
  healthScore: number; // 0-100
  actions: Array<{
    priority: 'high' | 'medium' | 'low';
    action: string;
    description: string;
  }>;
} => {
  const integrityCheck = performCompleteIntegrityCheck(data);
  
  const dataStats = {
    totalQuestions: data.questions.length,
    totalSessions: data.sessions.length,
    totalAnswers: data.answers.length,
    totalResults: data.results.length,
    completionRate: data.sessions.length > 0 ? 
      (data.sessions.filter(s => s.status === 'completed').length / data.sessions.length) * 100 : 0
  };

  // Calcular pontuação de saúde (0-100)
  let healthScore = 100;
  
  // Penalizar por violações críticas
  healthScore -= integrityCheck.criticalIssues.length * 20;
  
  // Penalizar por violações de integridade
  healthScore -= integrityCheck.referentialIntegrity.violations.length * 5;
  
  // Penalizar por inconsistências
  healthScore -= integrityCheck.dataConsistency.inconsistencies.length * 3;
  
  // Ajustar por taxa de conclusão
  if (dataStats.completionRate < 50) {
    healthScore -= 15;
  } else if (dataStats.completionRate < 80) {
    healthScore -= 5;
  }

  healthScore = Math.max(0, healthScore);

  // Definir ações recomendadas
  const actions: Array<{
    priority: 'high' | 'medium' | 'low';
    action: string;
    description: string;
  }> = [];

  integrityCheck.criticalIssues.forEach(issue => {
    actions.push({
      priority: 'high',
      action: 'Corrigir integridade de dados',
      description: issue
    });
  });

  if (dataStats.completionRate < 50) {
    actions.push({
      priority: 'high',
      action: 'Investigar baixa participação',
      description: `Apenas ${dataStats.completionRate.toFixed(1)}% dos alunos completaram a avaliação`
    });
  }

  integrityCheck.recommendations.forEach(rec => {
    actions.push({
      priority: 'medium',
      action: 'Verificar dados',
      description: rec
    });
  });

  return {
    reportDate: new Date().toISOString(),
    testId: data.test.id,
    testTitle: data.test.title,
    dataStats,
    integrityCheck,
    healthScore,
    actions
  };
}; 