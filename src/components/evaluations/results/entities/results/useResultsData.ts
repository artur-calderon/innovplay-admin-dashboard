/**
 * Hook para gerenciar dados da entidade Results
 * Corresponde à tabela: evaluation_results
 * 
 * Este hook gerencia os resultados calculados das avaliações dos alunos
 * ✅ REFATORADO: Implementa estratégia "Tempo Real + Validação"
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  EvaluationResultEntity, 
  ResultWithDetails, 
  ResultsStats, 
  ClassificationAnalysis,
  ResultFilters,
  TrendAnalysis,
  ComparisonData,
  ClassificationLevel,
  ResultStatus 
} from './types';
import { EvaluationResultsApiService } from '@/services/evaluationResultsApi';
import { 
  isEvaluationComplete,
  validateResultCompletion,
  CompletionThresholds 
} from '../../utils/completionValidation';
import { CompletionStatusLevel } from '../../types/completion';
import { calculateProficiency } from '@/types/evaluation-results';

interface UseResultsDataReturn {
  // ✅ NOVO: Dados separados por completude
  validResults: EvaluationResultEntity[]; // Apenas completos (para cálculos)
  partialResults: EvaluationResultEntity[]; // Parciais (para UI tempo real)
  allResults: EvaluationResultEntity[]; // Todos (completos + parciais)
  
  // ✅ NOVO: Dados com detalhes separados
  validResultsWithDetails: ResultWithDetails[];
  partialResultsWithDetails: ResultWithDetails[];
  allResultsWithDetails: ResultWithDetails[];
  
  // Estados de loading
  isLoading: boolean;
  error: string | null;
  
  // ✅ NOVO: Estatísticas separadas
  validStats: ResultsStats | null; // Estatísticas apenas de completos
  partialStats: ResultsStats | null; // Estatísticas de parciais
  allStats: ResultsStats | null; // Estatísticas de todos
  
  // ✅ NOVO: Status de completude
  completionStatus: {
    totalStudents: number;
    completedStudents: number;
    partialStudents: number;
    completionRate: number;
    hasIncompleteStudents: boolean;
    message: string;
  };
  
  // Análises (apenas com dados completos)
  classificationAnalysis: ClassificationAnalysis[];
  trendAnalysis: TrendAnalysis[];
  
  // Ações
  refetch: () => Promise<void>;
  filterResults: (filters: ResultFilters) => EvaluationResultEntity[];
  getResultsByClassification: (level: ClassificationLevel) => EvaluationResultEntity[];
  getStudentComparison: (studentId: string) => ComparisonData | null;
  
  // ✅ NOVO: Filtros específicos
  getValidResults: () => EvaluationResultEntity[];
  getPartialResults: () => EvaluationResultEntity[];
  getResultsByCompletionStatus: (status: CompletionStatusLevel) => EvaluationResultEntity[];
}

export const useResultsData = (
  testId: string,
  options: {
    thresholds?: CompletionThresholds;
    includePartialInStats?: boolean; // Se deve incluir parciais nas estatísticas gerais
  } = {}
): UseResultsDataReturn => {
  const { 
    thresholds = {
      minimum_completion_percentage: 80,
      minimum_quality_score: 70,
      minimum_answers_for_analysis: 10
    },
    includePartialInStats = false
  } = options;

  const [allResults, setAllResults] = useState<EvaluationResultEntity[]>([]);
  const [allResultsWithDetails, setAllResultsWithDetails] = useState<ResultWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allStats, setAllStats] = useState<ResultsStats | null>(null);
  const [classificationAnalysis, setClassificationAnalysis] = useState<ClassificationAnalysis[]>([]);
  const [trendAnalysis, setTrendAnalysis] = useState<TrendAnalysis[]>([]);

  // ✅ NOVO: Separar dados por completude usando useMemo
  const { validResults, partialResults, validResultsWithDetails, partialResultsWithDetails } = useMemo(() => {
    const valid: EvaluationResultEntity[] = [];
    const partial: EvaluationResultEntity[] = [];
    const validWithDetails: ResultWithDetails[] = [];
    const partialWithDetails: ResultWithDetails[] = [];

    allResults.forEach(result => {
      // ✅ VALIDAÇÃO DEFENSIVA: Verificar se result é um objeto válido
      if (!result || typeof result !== 'object') {
        console.warn('useResultsData: result inválido encontrado:', result);
        return; // Pular este item
      }

      const resultWithDetails = allResultsWithDetails.find(r => r.id === result.id);
      
      // ✅ Validar se o resultado está completo
      const isComplete = isEvaluationComplete(result, thresholds);

      if (isComplete && result.grade > 0) {
        valid.push(result);
        if (resultWithDetails) validWithDetails.push(resultWithDetails);
      } else {
        partial.push(result);
        if (resultWithDetails) partialWithDetails.push(resultWithDetails);
      }
    });

    return {
      validResults: valid,
      partialResults: partial,
      validResultsWithDetails: validWithDetails,
      partialResultsWithDetails: partialWithDetails
    };
  }, [allResults, allResultsWithDetails, thresholds]);

  // ✅ NOVO: Calcular estatísticas separadas
  const validStats = useMemo(() => {
    if (validResults.length === 0) return null;

    const totalResults = validResults.length;
    const completedResults = validResults.filter(r => r.grade > 0);
    const averageGrade = completedResults.reduce((sum, r) => sum + r.grade, 0) / completedResults.length || 0;
    const averageProficiency = completedResults.reduce((sum, r) => sum + r.proficiency, 0) / completedResults.length || 0;

    const classification_dist = {
      abaixo_do_basico: validResults.filter(r => r.classification === 'Abaixo do Básico').length,
      basico: validResults.filter(r => r.classification === 'Básico').length,
      adequado: validResults.filter(r => r.classification === 'Adequado').length,
      avancado: validResults.filter(r => r.classification === 'Avançado').length
    };

    return {
      total_results: totalResults,
      complete_results: completedResults.length,
      incomplete_results: 0, // Todos são completos aqui
      pending_results: 0,
      average_score: averageGrade,
      average_proficiency: averageProficiency,
      completion_rate: 100, // 100% pois são apenas completos
      average_answered_questions: validResults.reduce((sum, r) => sum + (r.answered_questions || r.total_questions), 0) / totalResults,
      quality_score: 100 // Alta qualidade pois são apenas completos
    };
  }, [validResults]);

  const partialStats = useMemo(() => {
    if (partialResults.length === 0) return null;

    const totalResults = partialResults.length;
    const answeredQuestions = partialResults.reduce((sum, r) => sum + (r.answered_questions || 0), 0);
    const totalQuestions = partialResults.reduce((sum, r) => sum + r.total_questions, 0);
    const completionRate = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

    return {
      total_results: totalResults,
      complete_results: 0, // Nenhum é completo
      incomplete_results: totalResults,
      pending_results: totalResults,
      average_score: 0, // Não há notas válidas
      average_proficiency: 0, // Não há proficiência válida
      completion_rate: completionRate,
      average_answered_questions: answeredQuestions / totalResults,
      quality_score: completionRate // Qualidade baseada na completude
    };
  }, [partialResults]);

  // ✅ NOVO: Status de completude geral
  const completionStatus = useMemo(() => {
    const totalStudents = allResults.length;
    const completedStudents = validResults.length;
    const partialStudents = partialResults.length;
    const completionRate = totalStudents > 0 ? (completedStudents / totalStudents) * 100 : 0;
    const hasIncompleteStudents = partialStudents > 0;

    let message = `Total: ${totalStudents} alunos`;
    if (completedStudents > 0) message += `, ${completedStudents} completos`;
    if (partialStudents > 0) message += `, ${partialStudents} em andamento`;
    message += ` (${completionRate.toFixed(1)}% concluído)`;

    return {
      totalStudents,
      completedStudents,
      partialStudents,
      completionRate,
      hasIncompleteStudents,
      message
    };
  }, [allResults.length, validResults.length, partialResults.length]);

  /**
   * Busca resultados da avaliação (tabela evaluation_results)
   */
  const fetchResultsData = useCallback(async () => {
    if (!testId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Buscar relatório detalhado que contém os resultados
      const detailedReport = await EvaluationResultsApiService.getDetailedReport(testId);
      
      if (detailedReport?.alunos) {
        // Converter dados dos alunos para formato de resultados
        const resultsData: EvaluationResultEntity[] = detailedReport.alunos.map((aluno, index) => {
          // ✅ CORREÇÃO: Recalcular proficiência usando a função oficial
          const totalQuestions = aluno.total_acertos + aluno.total_erros + aluno.total_em_branco;
          const calculatedProficiency = calculateProficiency(
            aluno.nota_final,
            totalQuestions,
            detailedReport.avaliacao.serie, // Usar série da avaliação
            detailedReport.avaliacao.disciplina, // Usar disciplina da avaliação
            undefined // Course será determinado automaticamente
          );

          // ✅ VALIDAÇÃO ADICIONAL: Verificar se o valor da API está dentro dos limites
          const maxProficiency = detailedReport.avaliacao.disciplina?.toLowerCase().includes('matemática') || 
                                 detailedReport.avaliacao.disciplina?.toLowerCase().includes('matematica') ? 425 : 375;
          
          if (aluno.proficiencia > maxProficiency) {
            console.warn(`⚠️ Proficiência inválida detectada: ${aluno.proficiencia} > ${maxProficiency} para aluno ${aluno.nome}. Usando valor recalculado.`);
          }

          return {
            id: `result-${aluno.id}-${index}`,
            test_id: testId,
            student_id: aluno.id,
            session_id: `session-${aluno.id}`, // TODO: Usar session_id real quando disponível
            correct_answers: aluno.total_acertos,
            total_questions: totalQuestions,
            answered_questions: aluno.total_acertos + aluno.total_erros, // ✅ NOVO: Campo para controle de completude
            score_percentage: (aluno.nota_final / 10) * 100, // Convertendo para porcentagem
            grade: aluno.nota_final,
            proficiency: calculatedProficiency.proficiencyScore, // ✅ CORREÇÃO: Usar valor recalculado
            classification: calculatedProficiency.classification, // ✅ CORREÇÃO: Usar classificação recalculada
            calculated_at: new Date().toISOString(),
            is_complete: aluno.status === 'concluida' && aluno.nota_final > 0 // ✅ NOVO: Flag de completude
          };
        });

        setAllResults(resultsData);

        // Resultados com detalhes
        const resultsWithDetailsData: ResultWithDetails[] = resultsData.map(result => {
          const aluno = detailedReport.alunos.find(a => a.id === result.student_id);
          return {
            ...result,
            student_name: aluno?.nome || 'Aluno não identificado',
            student_class: aluno?.turma || 'Turma não identificada',
            test_title: detailedReport.avaliacao.titulo,
            test_subject: detailedReport.avaliacao.disciplina,
            time_spent: aluno?.respostas.reduce((total, resp) => total + resp.tempo_gasto, 0) || 0,
            answered_questions: result.answered_questions || (result.total_questions - (aluno?.total_em_branco || 0)),
            blank_answers: aluno?.total_em_branco || 0,
            status: aluno?.status === 'concluida' ? 'completed' : 'pending'
          };
        });

        setAllResultsWithDetails(resultsWithDetailsData);

        // ✅ NOVO: Calcular estatísticas gerais (incluindo parciais se configurado)
        const statsData = includePartialInStats ? allResults : validResults;
        const totalResults = statsData.length;
        const completedResults = statsData.filter(r => r.grade > 0);
        const averageGrade = completedResults.reduce((sum, r) => sum + r.grade, 0) / completedResults.length || 0;
        const averageProficiency = completedResults.reduce((sum, r) => sum + r.proficiency, 0) / completedResults.length || 0;

        const classification_dist = {
          abaixo_do_basico: statsData.filter(r => r.classification === 'Abaixo do Básico').length,
          basico: statsData.filter(r => r.classification === 'Básico').length,
          adequado: statsData.filter(r => r.classification === 'Adequado').length,
          avancado: statsData.filter(r => r.classification === 'Avançado').length
        };

        const resultsStats: ResultsStats = {
          total_results: totalResults,
          complete_results: completedResults.length,
          incomplete_results: statsData.filter(r => r.grade === 0).length,
          pending_results: statsData.filter(r => r.grade === 0).length,
          average_score: averageGrade,
          average_proficiency: averageProficiency,
          completion_rate: totalResults > 0 ? (completedResults.length / totalResults) * 100 : 0,
          average_answered_questions: statsData.reduce((sum, r) => sum + (r.answered_questions || r.total_questions), 0) / totalResults,
          quality_score: totalResults > 0 ? (completedResults.length / totalResults) * 100 : 0
        };

        setAllStats(resultsStats);

        // ✅ NOVO: Análise de classificação apenas com dados completos
        const classificationLevels: ClassificationLevel[] = ['Abaixo do Básico', 'Básico', 'Adequado', 'Avançado'];
        const classificationAnalysisData: ClassificationAnalysis[] = classificationLevels.map(level => {
          const levelResults = validResults.filter(r => r.classification === level);
          const levelResultsWithDetails = validResultsWithDetails.filter(r => r.classification === level);
          
          return {
            level,
            count: levelResults.length,
            percentage: validResults.length > 0 ? (levelResults.length / validResults.length) * 100 : 0,
            averageGrade: levelResults.reduce((sum, r) => sum + r.grade, 0) / levelResults.length || 0,
            averageProficiency: levelResults.reduce((sum, r) => sum + r.proficiency, 0) / levelResults.length || 0,
            students: levelResultsWithDetails.map(r => ({
              student_id: r.student_id,
              student_name: r.student_name,
              grade: r.grade,
              proficiency: r.proficiency
            }))
          };
        });

        setClassificationAnalysis(classificationAnalysisData);

        // ✅ NOVO: Análise de tendência apenas com dados completos
        const trendAnalysisData: TrendAnalysis[] = [
          {
            period: new Date().toISOString().slice(0, 7), // YYYY-MM
            averageGrade: validStats?.average_score || 0,
            averageProficiency: validStats?.average_proficiency || 0,
            classificationDistribution: classification_dist,
            improvementRate: 0 // TODO: Calcular baseado em dados históricos
          }
        ];

        setTrendAnalysis(trendAnalysisData);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar resultados da avaliação';
      setError(errorMessage);
      console.error('Erro ao buscar resultados da avaliação:', err);
    } finally {
      setIsLoading(false);
    }
  }, [testId, includePartialInStats, validResults, validResultsWithDetails, validStats]);

  /**
   * Filtra resultados baseado nos critérios fornecidos
   */
  const filterResults = useCallback((filters: ResultFilters): EvaluationResultEntity[] => {
    return allResults.filter(result => {
      if (filters.classification && result.classification !== filters.classification) return false;
      
      if (filters.gradeRange) {
        if (result.grade < filters.gradeRange.min || result.grade > filters.gradeRange.max) return false;
      }
      
      if (filters.proficiencyRange) {
        if (result.proficiency < filters.proficiencyRange.min || result.proficiency > filters.proficiencyRange.max) return false;
      }
      
      if (filters.status) {
        const resultWithDetails = allResultsWithDetails.find(r => r.id === result.id);
        if (resultWithDetails && resultWithDetails.status !== filters.status) return false;
      }
      
      if (filters.dateRange) {
        const resultDate = new Date(result.calculated_at);
        const startDate = new Date(filters.dateRange.start);
        const endDate = new Date(filters.dateRange.end);
        if (resultDate < startDate || resultDate > endDate) return false;
      }
      
      return true;
    });
  }, [allResults, allResultsWithDetails]);

  /**
   * Busca resultados por nível de classificação específico
   */
  const getResultsByClassification = useCallback((level: ClassificationLevel): EvaluationResultEntity[] => {
    return allResults.filter(result => result.classification === level);
  }, [allResults]);

  /**
   * Busca comparação histórica para um aluno específico
   */
  const getStudentComparison = useCallback((studentId: string): ComparisonData | null => {
    const currentResult = allResults.find(r => r.student_id === studentId);
    if (!currentResult) return null;

    // TODO: Implementar busca de resultados históricos
    const previousResults: EvaluationResultEntity[] = [];
    
    const comparisonData: ComparisonData = {
      currentResult,
      previousResults,
      improvementTrend: 'stable', // TODO: Calcular baseado em dados históricos
      improvementPercentage: 0 // TODO: Calcular baseado em dados históricos
    };

    return comparisonData;
  }, [allResults]);

  // ✅ NOVO: Filtros específicos por completude
  const getValidResults = useCallback(() => validResults, [validResults]);
  const getPartialResults = useCallback(() => partialResults, [partialResults]);
  const getResultsByCompletionStatus = useCallback((status: CompletionStatusLevel) => {
    switch (status) {
      case CompletionStatusLevel.COMPLETE:
        return validResults;
      case CompletionStatusLevel.PARTIALLY_COMPLETE:
      case CompletionStatusLevel.INCOMPLETE:
        return partialResults;
      default:
        return allResults;
    }
  }, [validResults, partialResults, allResults]);

  // Carregar dados automaticamente quando testId mudar
  useEffect(() => {
    if (testId) {
      fetchResultsData();
    }
  }, [testId]); // ✅ REMOVIDO: fetchResultsData da dependência para evitar loop infinito

  return {
    // ✅ NOVO: Dados separados por completude
    validResults,
    partialResults,
    allResults,
    validResultsWithDetails,
    partialResultsWithDetails,
    allResultsWithDetails,
    
    // Estados de loading
    isLoading,
    error,
    
    // ✅ NOVO: Estatísticas separadas
    validStats,
    partialStats,
    allStats,
    
    // ✅ NOVO: Status de completude
    completionStatus,
    
    // Análises (apenas com dados completos)
    classificationAnalysis,
    trendAnalysis,
    
    // Ações
    refetch: fetchResultsData,
    filterResults,
    getResultsByClassification,
    getStudentComparison,
    
    // ✅ NOVO: Filtros específicos
    getValidResults,
    getPartialResults,
    getResultsByCompletionStatus
  };
}; 