/**
 * Hook para gerenciar dados da entidade Questions
 * Corresponde à tabela: question
 * 
 * Este hook gerencia as questões de uma avaliação específica
 */

import { useState, useCallback, useEffect } from 'react';
import { QuestionEntity, QuestionWithSkills, QuestionStats, QuestionFilters } from './types';
import { EvaluationResultsApiService } from '@/services/evaluationResultsApi';

interface UseQuestionsDataReturn {
  questions: QuestionEntity[];
  questionsWithSkills: QuestionWithSkills[];
  isLoading: boolean;
  error: string | null;
  stats: QuestionStats | null;
  refetch: () => Promise<void>;
  filterQuestions: (filters: QuestionFilters) => QuestionEntity[];
}

export const useQuestionsData = (testId: string): UseQuestionsDataReturn => {
  const [questions, setQuestions] = useState<QuestionEntity[]>([]);
  const [questionsWithSkills, setQuestionsWithSkills] = useState<QuestionWithSkills[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<QuestionStats | null>(null);

  /**
   * Busca questões da avaliação (tabela question relacionada via test_id)
   */
  const fetchQuestionsData = useCallback(async () => {
    if (!testId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Buscar questões com habilidades da API
      const questionsWithSkillsResponse = await EvaluationResultsApiService.getEvaluationSkills(testId);
      
      if (Array.isArray(questionsWithSkillsResponse)) {
        setQuestionsWithSkills(questionsWithSkillsResponse);
        
        // Converter para formato básico de questões
        const basicQuestions: QuestionEntity[] = questionsWithSkillsResponse.map(q => ({
          id: q.id,
          number: q.number,
          text: q.text,
          formatted_text: q.formattedText,
          secondstatement: '',
          images: [],
          subject_id: q.subject?.id || '',
          ide: '',
          description: '',
          command: '',
          subtitle: '',
          alternatives: q.alternatives || [],
          skill: q.skills?.join(', ') || '',
          grade_level: q.grade?.name || '',
          education_stage_id: '',
          difficulty_level: q.difficulty,
          correct_answer: '',
          formatted_solution: q.solution,
          test_id: testId,
          question_type: q.type,
          value: q.value,
          topics: [],
          version: 1,
          created_by: '',
          created_at: '',
          updated_at: '',
          last_modified_by: ''
        }));

        setQuestions(basicQuestions);

        // Calcular estatísticas
        const questionStats: QuestionStats = {
          totalQuestions: basicQuestions.length,
          byDifficulty: {
            facil: basicQuestions.filter(q => q.difficulty_level === 'Fácil').length,
            medio: basicQuestions.filter(q => q.difficulty_level === 'Médio').length,
            dificil: basicQuestions.filter(q => q.difficulty_level === 'Difícil').length,
          },
          byType: {
            multipleChoice: basicQuestions.filter(q => q.question_type === 'multipleChoice').length,
            open: basicQuestions.filter(q => q.question_type === 'open').length,
            trueFalse: basicQuestions.filter(q => q.question_type === 'trueFalse').length,
          },
          bySubject: basicQuestions.reduce((acc, q) => {
            acc[q.subject_id] = (acc[q.subject_id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        };

        setStats(questionStats);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar questões da avaliação';
      setError(errorMessage);
      console.error('Erro ao buscar questões da avaliação:', err);
    } finally {
      setIsLoading(false);
    }
  }, [testId]);

  /**
   * Filtra questões baseado nos critérios fornecidos
   */
  const filterQuestions = useCallback((filters: QuestionFilters): QuestionEntity[] => {
    return questions.filter(question => {
      if (filters.subject && question.subject_id !== filters.subject) return false;
      if (filters.difficulty && question.difficulty_level !== filters.difficulty) return false;
      if (filters.questionType && question.question_type !== filters.questionType) return false;
      if (filters.skill && !question.skill.includes(filters.skill)) return false;
      return true;
    });
  }, [questions]);

  // Carregar dados automaticamente quando testId mudar
  useEffect(() => {
    if (testId) {
      fetchQuestionsData();
    }
  }, [testId, fetchQuestionsData]);

  return {
    questions,
    questionsWithSkills,
    isLoading,
    error,
    stats,
    refetch: fetchQuestionsData,
    filterQuestions
  };
}; 