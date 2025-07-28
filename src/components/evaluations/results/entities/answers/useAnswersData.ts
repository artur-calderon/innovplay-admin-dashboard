/**
 * Hook para gerenciar dados da entidade Answers
 * Corresponde à tabela: student_answers
 * 
 * Este hook gerencia as respostas individuais dos alunos para cada questão
 * ✅ REFATORADO: Implementa estratégia "Tempo Real + Validação"
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  StudentAnswerEntity, 
  AnswerWithDetails, 
  AnswerStats, 
  QuestionAnalysis,
  AnswerFilters,
  StudentAnswerSummary,
  AnswerType 
} from './types';
import { EvaluationResultsApiService } from '@/services/evaluationResultsApi';
import { 
  validateAnswersConsistency,
  CompletionThresholds 
} from '../../utils/completionValidation';
import { CompletionStatusLevel } from '../../types/completion';

interface UseAnswersDataReturn {
  // ✅ NOVO: Dados separados por completude
  validAnswers: StudentAnswerEntity[]; // Apenas completas (para cálculos)
  partialAnswers: StudentAnswerEntity[]; // Parciais (para UI tempo real)
  allAnswers: StudentAnswerEntity[]; // Todas (completas + parciais)
  
  // ✅ NOVO: Dados com detalhes separados
  validAnswersWithDetails: AnswerWithDetails[];
  partialAnswersWithDetails: AnswerWithDetails[];
  allAnswersWithDetails: AnswerWithDetails[];
  
  // Estados de loading
  isLoading: boolean;
  error: string | null;
  
  // ✅ NOVO: Estatísticas separadas
  validStats: AnswerStats | null; // Estatísticas apenas de completas
  partialStats: AnswerStats | null; // Estatísticas de parciais
  allStats: AnswerStats | null; // Estatísticas de todas
  
  // ✅ NOVO: Status de completude
  completionStatus: {
    totalAnswers: number;
    completedAnswers: number;
    partialAnswers: number;
    completionRate: number;
    hasIncompleteAnswers: boolean;
    message: string;
  };
  
  // Análises (apenas com respostas completas)
  questionAnalyses: QuestionAnalysis[];
  studentSummaries: StudentAnswerSummary[];
  
  // Ações
  refetch: () => Promise<void>;
  filterAnswers: (filters: AnswerFilters) => StudentAnswerEntity[];
  getAnswersByStudent: (studentId: string) => StudentAnswerEntity[];
  getAnswersByQuestion: (questionId: string) => StudentAnswerEntity[];
  
  // ✅ NOVO: Filtros específicos
  getValidAnswers: () => StudentAnswerEntity[];
  getPartialAnswers: () => StudentAnswerEntity[];
  getAnswersByCompletionStatus: (status: CompletionStatusLevel) => StudentAnswerEntity[];
  
  // ✅ NOVO: Flag para visualização parcial
  isPartialView: boolean;
  setPartialView: (enabled: boolean) => void;
}

export const useAnswersData = (
  testId: string, 
  studentId?: string,
  options: {
    thresholds?: CompletionThresholds;
    includePartialInStats?: boolean; // Se deve incluir parciais nas estatísticas gerais
    enablePartialView?: boolean; // Se deve habilitar visualização parcial
  } = {}
): UseAnswersDataReturn => {
  const { 
    thresholds = {
      minimum_completion_percentage: 80,
      minimum_quality_score: 70,
      minimum_answers_for_analysis: 10
    },
    includePartialInStats = false,
    enablePartialView = false
  } = options;

  const [allAnswers, setAllAnswers] = useState<StudentAnswerEntity[]>([]);
  const [allAnswersWithDetails, setAllAnswersWithDetails] = useState<AnswerWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allStats, setAllStats] = useState<AnswerStats | null>(null);
  const [questionAnalyses, setQuestionAnalyses] = useState<QuestionAnalysis[]>([]);
  const [studentSummaries, setStudentSummaries] = useState<StudentAnswerSummary[]>([]);
  const [isPartialView, setIsPartialView] = useState(enablePartialView);

  // ✅ NOVO: Separar dados por completude usando useMemo
  const answersData = useMemo(() => {
    const valid: StudentAnswerEntity[] = [];
    const partial: StudentAnswerEntity[] = [];
    const validWithDetails: AnswerWithDetails[] = [];
    const partialWithDetails: AnswerWithDetails[] = [];

    allAnswers.forEach(answer => {
      // ✅ VALIDAÇÃO DEFENSIVA: Verificar se answer é um objeto válido
      if (!answer || typeof answer !== 'object') {
        console.warn('useAnswersData: answer inválida encontrada:', answer);
        return; // Pular este item
      }

      const answerWithDetails = allAnswersWithDetails.find(a => a.id === answer.id);
      
      // ✅ Validar se a resposta está completa
      const isComplete = answer.is_correct !== null && 
                        answer.answer_text !== null && 
                        answer.answer_text.trim() !== '' &&
                        answer.time_spent > 0;

      if (isComplete) {
        valid.push(answer);
        if (answerWithDetails) validWithDetails.push(answerWithDetails);
      } else {
        partial.push(answer);
        if (answerWithDetails) partialWithDetails.push(answerWithDetails);
      }
    });

    return {
      validAnswers: valid,
      partialAnswers: partial,
      validAnswersWithDetails: validWithDetails,
      partialAnswersWithDetails: partialWithDetails
    };
  }, [allAnswers, allAnswersWithDetails]);

  // ✅ Extrair as variáveis do resultado do useMemo
  const { validAnswers, partialAnswers, validAnswersWithDetails, partialAnswersWithDetails } = answersData;

  // ✅ NOVO: Calcular estatísticas separadas
  const validStats = useMemo(() => {
    if (validAnswers.length === 0) return null;

    const totalAnswers = validAnswers.length;
    const correctAnswers = validAnswers.filter(a => a.is_correct).length;
    const averageTimeSpent = validAnswers.reduce((sum, a) => sum + a.time_spent, 0) / totalAnswers;

    return {
      total_answers: totalAnswers,
      correct_answers: correctAnswers,
      incorrect_answers: totalAnswers - correctAnswers,
      blank_answers: 0, // Todos são completos aqui
      average_time_spent: averageTimeSpent,
      accuracy_rate: totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0,
      completion_rate: 100, // 100% pois são apenas completas
      quality_score: 100 // Alta qualidade pois são apenas completas
    };
  }, [validAnswers]);

  const partialStats = useMemo(() => {
    if (partialAnswers.length === 0) return null;

    const totalAnswers = partialAnswers.length;
    const answeredQuestions = partialAnswers.filter(a => a.answer_text && a.answer_text.trim() !== '').length;
    const completionRate = totalAnswers > 0 ? (answeredQuestions / totalAnswers) * 100 : 0;

    return {
      total_answers: totalAnswers,
      correct_answers: 0, // Não há respostas corretas válidas
      incorrect_answers: 0, // Não há respostas incorretas válidas
      blank_answers: totalAnswers - answeredQuestions,
      average_time_spent: 0, // Não há tempo válido
      accuracy_rate: 0, // Não há acurácia válida
      completion_rate: completionRate,
      quality_score: completionRate // Qualidade baseada na completude
    };
  }, [partialAnswers]);

  // ✅ NOVO: Status de completude geral
  const completionStatus = useMemo(() => {
    const totalAnswers = allAnswers.length;
    const completedAnswers = validAnswers.length;
    const partialAnswersCount = partialAnswers.length;
    const completionRate = totalAnswers > 0 ? (completedAnswers / totalAnswers) * 100 : 0;
    const hasIncompleteAnswers = partialAnswersCount > 0;

    let message = `Total: ${totalAnswers} respostas`;
    if (completedAnswers > 0) message += `, ${completedAnswers} completas`;
    if (partialAnswersCount > 0) message += `, ${partialAnswersCount} parciais`;
    message += ` (${completionRate.toFixed(1)}% concluído)`;

    return {
      totalAnswers,
      completedAnswers,
      partialAnswers: partialAnswersCount,
      completionRate,
      hasIncompleteAnswers,
      message
    };
  }, [allAnswers.length, validAnswers.length, partialAnswers.length]);

  /**
   * Busca respostas dos alunos (tabela student_answers)
   */
  const fetchAnswersData = useCallback(async () => {
    if (!testId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Buscar dados detalhados que contém as respostas
      const detailedReport = await EvaluationResultsApiService.getDetailedReport(testId);
      
      if (detailedReport?.alunos) {
        // Converter dados dos alunos para formato de respostas
        const answersData: StudentAnswerEntity[] = [];
        
        detailedReport.alunos.forEach(aluno => {
          if (studentId && aluno.id !== studentId) return; // Filtrar por aluno se especificado
          
          aluno.respostas.forEach((resposta, index) => {
            const answer: StudentAnswerEntity = {
              id: `answer-${aluno.id}-${resposta.questao_id}-${index}`,
              test_id: testId,
              student_id: aluno.id,
              question_id: resposta.questao_id,
              question_number: resposta.questao_numero,
              answer_text: resposta.resposta_em_branco ? '' : 'Resposta fornecida', // TODO: Buscar texto real
              is_correct: resposta.resposta_correta,
              is_blank: resposta.resposta_em_branco,
              time_spent: resposta.tempo_gasto,
              points_earned: resposta.resposta_correta ? 1 : 0, // TODO: Buscar pontuação real
              max_points: 1, // TODO: Buscar pontuação máxima real
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            answersData.push(answer);
          });
        });

        setAllAnswers(answersData);

        // Respostas com detalhes
        const answersWithDetailsData: AnswerWithDetails[] = answersData.map(answer => {
          const aluno = detailedReport.alunos.find(a => a.id === answer.student_id);
          const questao = detailedReport.questoes.find(q => q.id === answer.question_id);
          
          return {
            ...answer,
            student_name: aluno?.nome || 'Aluno não identificado',
            student_class: aluno?.turma || 'Turma não identificada',
            question_text: questao?.texto || 'Questão não identificada',
            question_skill: questao?.habilidade || 'Habilidade não identificada',
            question_difficulty: questao?.dificuldade || 'Fácil',
            question_type: questao?.tipo || 'multipleChoice'
          };
        });

        setAllAnswersWithDetails(answersWithDetailsData);

        // ✅ NOVO: Calcular estatísticas gerais (incluindo parciais se configurado)
        const statsData = includePartialInStats ? allAnswers : validAnswers;
        const totalAnswers = statsData.length;
        const correctAnswers = statsData.filter(a => a.is_correct).length;
        const blankAnswers = statsData.filter(a => a.is_blank).length;
        const averageTimeSpent = statsData.reduce((sum, a) => sum + a.time_spent, 0) / totalAnswers;

        const answerStats: AnswerStats = {
          total_answers: totalAnswers,
          correct_answers: correctAnswers,
          incorrect_answers: totalAnswers - correctAnswers - blankAnswers,
          blank_answers: blankAnswers,
          average_time_spent: averageTimeSpent,
          accuracy_rate: totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0,
          completion_rate: totalAnswers > 0 ? ((totalAnswers - blankAnswers) / totalAnswers) * 100 : 0,
          quality_score: totalAnswers > 0 ? ((totalAnswers - blankAnswers) / totalAnswers) * 100 : 0
        };

        setAllStats(answerStats);

        // ✅ NOVO: Análise de questões apenas com respostas completas
        const questionAnalysisData: QuestionAnalysis[] = detailedReport.questoes.map(questao => {
          const questionAnswers = validAnswers.filter(a => a.question_id === questao.id);
          const correctAnswers = questionAnswers.filter(a => a.is_correct).length;
          
          return {
            question_id: questao.id,
            question_number: questao.numero,
            question_text: questao.texto,
            total_answers: questionAnswers.length,
            correct_answers: correctAnswers,
            incorrect_answers: questionAnswers.length - correctAnswers,
            accuracy_rate: questionAnswers.length > 0 ? (correctAnswers / questionAnswers.length) * 100 : 0,
            average_time_spent: questionAnswers.reduce((sum, a) => sum + a.time_spent, 0) / questionAnswers.length || 0,
            difficulty_level: questao.dificuldade,
            skill: questao.habilidade
          };
        });

        setQuestionAnalyses(questionAnalysisData);

        // ✅ NOVO: Resumo por aluno apenas com respostas completas
        const studentSummaryData: StudentAnswerSummary[] = detailedReport.alunos.map(aluno => {
          const studentAnswers = validAnswers.filter(a => a.student_id === aluno.id);
          const correctAnswers = studentAnswers.filter(a => a.is_correct).length;
          
          return {
            student_id: aluno.id,
            student_name: aluno.nome,
            total_questions: studentAnswers.length,
            answered_questions: studentAnswers.filter(a => !a.is_blank).length,
            correct_answers: correctAnswers,
            accuracy_rate: studentAnswers.length > 0 ? (correctAnswers / studentAnswers.length) * 100 : 0,
            average_time_spent: studentAnswers.reduce((sum, a) => sum + a.time_spent, 0) / studentAnswers.length || 0,
            completion_percentage: studentAnswers.length > 0 ? (studentAnswers.filter(a => !a.is_blank).length / studentAnswers.length) * 100 : 0
          };
        });

        setStudentSummaries(studentSummaryData);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar respostas dos alunos';
      setError(errorMessage);
      console.error('Erro ao buscar respostas dos alunos:', err);
    } finally {
      setIsLoading(false);
    }
  }, [testId, studentId, includePartialInStats, allAnswers, validAnswers]);

  /**
   * Filtra respostas baseado nos critérios fornecidos
   */
  const filterAnswers = useCallback((filters: AnswerFilters): StudentAnswerEntity[] => {
    return allAnswers.filter(answer => {
      if (filters.studentId && answer.student_id !== filters.studentId) return false;
      if (filters.questionId && answer.question_id !== filters.questionId) return false;
      if (filters.isCorrect !== undefined && answer.is_correct !== filters.isCorrect) return false;
      if (filters.isBlank !== undefined && answer.is_blank !== filters.isBlank) return false;
      
      if (filters.timeRange) {
        if (answer.time_spent < filters.timeRange.min || answer.time_spent > filters.timeRange.max) return false;
      }
      
      if (filters.dateRange) {
        const answerDate = new Date(answer.created_at);
        const startDate = new Date(filters.dateRange.start);
        const endDate = new Date(filters.dateRange.end);
        if (answerDate < startDate || answerDate > endDate) return false;
      }
      
      return true;
    });
  }, [allAnswers]);

  /**
   * Busca respostas por aluno específico
   */
  const getAnswersByStudent = useCallback((studentId: string): StudentAnswerEntity[] => {
    return allAnswers.filter(answer => answer.student_id === studentId);
  }, [allAnswers]);

  /**
   * Busca respostas por questão específica
   */
  const getAnswersByQuestion = useCallback((questionId: string): StudentAnswerEntity[] => {
    return allAnswers.filter(answer => answer.question_id === questionId);
  }, [allAnswers]);

  // ✅ NOVO: Filtros específicos por completude
  const getValidAnswers = useCallback(() => validAnswers, [validAnswers]);
  const getPartialAnswers = useCallback(() => partialAnswers, [partialAnswers]);
  const getAnswersByCompletionStatus = useCallback((status: CompletionStatusLevel) => {
    switch (status) {
      case CompletionStatusLevel.COMPLETE:
        return validAnswers;
      case CompletionStatusLevel.PARTIALLY_COMPLETE:
      case CompletionStatusLevel.INCOMPLETE:
        return partialAnswers;
      default:
        return allAnswers;
    }
  }, [validAnswers, partialAnswers, allAnswers]);

  // ✅ NOVO: Controle de visualização parcial
  const setPartialView = useCallback((enabled: boolean) => {
    setIsPartialView(enabled);
  }, []);

  // Carregar dados automaticamente quando testId ou studentId mudar
  useEffect(() => {
    if (testId) {
      fetchAnswersData();
    }
  }, [testId, studentId]); // ✅ REMOVIDO: fetchAnswersData da dependência para evitar loop infinito

  return {
    // ✅ NOVO: Dados separados por completude
    validAnswers,
    partialAnswers,
    allAnswers,
    validAnswersWithDetails,
    partialAnswersWithDetails,
    allAnswersWithDetails,
    
    // Estados de loading
    isLoading,
    error,
    
    // ✅ NOVO: Estatísticas separadas
    validStats,
    partialStats,
    allStats,
    
    // ✅ NOVO: Status de completude
    completionStatus,
    
    // Análises (apenas com respostas completas)
    questionAnalyses,
    studentSummaries,
    
    // Ações
    refetch: fetchAnswersData,
    filterAnswers,
    getAnswersByStudent,
    getAnswersByQuestion,
    
    // ✅ NOVO: Filtros específicos
    getValidAnswers,
    getPartialAnswers,
    getAnswersByCompletionStatus,
    
    // ✅ NOVO: Controle de visualização parcial
    isPartialView,
    setPartialView
  };
}; 