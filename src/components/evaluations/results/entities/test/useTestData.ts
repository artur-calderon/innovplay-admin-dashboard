/**
 * Hook para gerenciar dados da entidade Test
 * Corresponde à tabela: test
 * 
 * Este hook gerencia o carregamento e estado dos dados de uma avaliação/teste
 */

import { useState, useCallback, useEffect } from 'react';
import { TestEntity, TestFilters, TestStats } from './types';
import { EvaluationResultsApiService } from '@/services/evaluationResultsApi';

interface UseTestDataReturn {
  testData: TestEntity | null;
  isLoading: boolean;
  error: string | null;
  stats: TestStats | null;
  refetch: () => Promise<void>;
  updateTest: (updates: Partial<TestEntity>) => void;
}

export const useTestData = (testId: string): UseTestDataReturn => {
  const [testData, setTestData] = useState<TestEntity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<TestStats | null>(null);

  /**
   * Busca dados básicos da avaliação (tabela test)
   */
  const fetchTestData = useCallback(async () => {
    if (!testId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Buscar dados da tabela test
      const response = await EvaluationResultsApiService.getEvaluationById(testId);
      
      if (response) {
        setTestData(response as TestEntity);
        
        // Buscar estatísticas relacionadas
        const statusSummary = await EvaluationResultsApiService.getEvaluationStatusSummary(testId);
        if (statusSummary) {
          setStats({
            totalStudents: statusSummary.total_alunos,
            completedSessions: statusSummary.alunos_participantes,
            averageScore: statusSummary.average_score,
            averageDuration: 0 // TODO: Calcular duração média das sessões
          });
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados da avaliação';
      setError(errorMessage);
      console.error('Erro ao buscar dados da avaliação:', err);
    } finally {
      setIsLoading(false);
    }
  }, [testId]);

  /**
   * Atualiza dados da avaliação localmente
   */
  const updateTest = useCallback((updates: Partial<TestEntity>) => {
    setTestData(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  // Carregar dados automaticamente quando testId mudar
  useEffect(() => {
    if (testId) {
      fetchTestData();
    }
  }, [testId, fetchTestData]);

  return {
    testData,
    isLoading,
    error,
    stats,
    refetch: fetchTestData,
    updateTest
  };
}; 