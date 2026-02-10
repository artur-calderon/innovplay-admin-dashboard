import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/context/authContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import StatsCards from "@/components/dashboard/StatsCards";
import MedalhasCard from "@/components/dashboard/MedalhasCard";
import InnovCoinsCard from "@/components/dashboard/InnovCoinsCard";
import RankingCard from "@/components/dashboard/RankingCard";
import EvolutionChart from "@/components/dashboard/EvolutionChart";

// Interface para avaliações do aluno
interface StudentEvaluation {
  id: string;
  titulo: string;
  data_aplicacao: string;
  disciplina: string;
  serie: string;
  escola: string;
  turma?: string;
  type?: string;
}

// Interface para dados específicos de uma avaliação
interface StudentEvaluationResults {
  test_id: string;
  student_id: string;
  student_db_id: string;
  total_questions: number;
  answered_questions: number;
  correct_answers: number;
  score_percentage: number;
  total_score: number;
  max_possible_score: number;
  proficiency: number;
  proficiencia: number; // Campo com acento da API
  grade: number;
  classification: string;
  classificacao: string; // Campo com acento da API
  calculated_at: string;
  answers: unknown[];
  rankings?: {
    class?: ApiRankingGroup;
    school?: ApiRankingGroup;
    municipality?: ApiRankingGroup;
  };
}

// Interface para avaliações completadas do aluno
interface StudentCompletedResponse {
  student: {
    id: string;
    name: string;
    user_id: string;
  };
  total_completed: number;
  returned_count: number;
  pagination: {
    limit: number;
    offset: number;
    has_more: boolean;
  };
  evaluations: Array<{
    test_id: string;
    title: string;
    description: string;
    type: string;
    subject: {
      id: string;
      name: string;
    };
    grade: {
      id: string;
      name: string;
    };
    subjects_info: Array<{
      id: string;
      name: string;
    }>;
    total_questions: number;
    application_info: {
      application: string;
      expiration: string;
    };
    student_results: {
      correct_answers: number;
      total_questions: number;
      score_percentage: number;
      grade: number;
      proficiency: number;
      classification: string;
      calculated_at: string;
    };
  }>;
}

// Interface para dados de comparação entre avaliações
interface StudentCompareResponse {
  student: {
    id: string;
    user_id: string;
    name: string;
  };
  evaluations: Array<{
    order: number;
    id: string;
    title: string;
    created_at: string;
    application_date: string;
  }>;
  total_evaluations: number;
  comparisons: Array<{
    from_evaluation: {
      id: string;
      title: string;
      order: number;
    };
    to_evaluation: {
      id: string;
      title: string;
      order: number;
    };
    general_comparison: {
      student_grade: {
        evaluation_1: number;
        evaluation_2: number;
        evolution: EvolutionData;
      };
      student_proficiency: {
        evaluation_1: number;
        evaluation_2: number;
        evolution: EvolutionData;
      };
      student_classification: {
        evaluation_1: string;
        evaluation_2: string;
      };
      correct_answers: {
        evaluation_1: number;
        evaluation_2: number;
        evolution: EvolutionData;
      };
      total_questions: {
        evaluation_1: number;
        evaluation_2: number;
      };
      score_percentage: {
        evaluation_1: number;
        evaluation_2: number;
        evolution: EvolutionData;
      };
    };
    subject_comparison: Record<string, {
      subject_id: string;
      student_grade: {
        evaluation_1: number;
        evaluation_2: number;
        evolution: EvolutionData;
      };
      student_proficiency: {
        evaluation_1: number;
        evaluation_2: number;
        evolution: EvolutionData;
      };
      student_classification: {
        evaluation_1: string;
        evaluation_2: string;
      };
      correct_answers: {
        evaluation_1: number;
        evaluation_2: number;
        evolution: EvolutionData;
      };
      total_questions: {
        evaluation_1: number;
        evaluation_2: number;
      };
    }>;
  }>;
  total_comparisons: number;
}

interface EvolutionData {
  value: number;
  percentage: number;
  direction: 'increase' | 'decrease' | 'stable';
}

interface ApiRankingEntry {
  position: number;
  student_id: string;
  student_name: string;
  proficiency: number | string;
}

interface ApiRankingGroup {
  position?: number;
  total_students?: number;
  current_student?: ApiRankingEntry;
  ranking?: ApiRankingEntry[];
}

interface RankingCardData {
  posicaoAtual: number;
  pontos: number;
  mudancaPosicao: number;
  lista: Array<{
    id: number;
    nome: string;
    acertos: number;
    total: number;
    posicao: number;
    pontos: number;
    avatar?: string;
  }>;
  proximoObjetivo: {
    posicao: number;
    pontosNecessarios: number;
    progresso: number;
  };
}

interface StudentStats {
  proficiencia: { value: number; change: number; trend: 'up' | 'down' };
  nota: { value: number; change: number; trend: 'up' | 'down' };
  nivel: { value: string; change: number; trend: 'up' | 'down' };
  acertos: { value: number; change: number; trend: 'up' | 'down' };
  medalhas: { 
    total: number; 
    percentage: number;
    conquistadas: Array<{
      id: string;
      nome: string;
      tipo: 'ouro' | 'prata' | 'bronze';
      icone: string;
      descricao: string;
    }>;
    proximas: Array<{
      id: string;
      nome: string;
      requisito: string;
      progresso: number;
    }>;
  };
  moedas: { 
    total: number;
    ganhasHoje: number;
    historico: Array<{
      data: string;
      acao: string;
      valor: number;
    }>;
    loja: Array<{
      item: string;
      preco: number;
      disponivel: boolean;
    }>;
  };
  ranking: {
    posicaoAtual: number;
    pontos: number;
    mudancaPosicao: number;
    lista: Array<{
      id: number;
      nome: string;
      acertos: number;
      total: number;
      posicao: number;
      pontos: number;
      avatar?: string;
    }>;
    proximoObjetivo: {
      posicao: number;
      pontosNecessarios: number;
      progresso: number;
    };
  };
  estatisticas: {
    semana: Array<{ day: string; nota: number; avaliacao: string }>;
    mes: Array<{ week: string; nota: number; avaliacoes: number }>;
    ano: Array<{ month: string; nota: number; avaliacoes: number }>;
    resumo: {
      media: number;
      melhorNota: number;
      streak: number;
      metaAlcancada: boolean;
      progresso: number;
      totalAvaliacoes: number;
      tendencia: 'up' | 'down' | 'stable';
    };
  };
}

type ChartType = 'bar' | 'line' | 'area' | 'pie';
type PeriodType = 'week' | 'month' | 'year';

const emptyRankingCardData: RankingCardData = {
  posicaoAtual: 0,
  pontos: 0,
  mudancaPosicao: 0,
  lista: [],
  proximoObjetivo: {
    posicao: 1,
    pontosNecessarios: 0,
    progresso: 0
  }
};

const normalizeNumber = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(',', '.'));
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const transformRankingGroupToCardData = (group?: ApiRankingGroup): RankingCardData => {
  if (!group || !group.current_student) {
    return { ...emptyRankingCardData };
  }

  const rankingList = (group.ranking ?? []).map((item) => ({
    id: item.position,
    nome: item.student_name,
    acertos: 0,
    total: 0,
    posicao: item.position,
    pontos: normalizeNumber(item.proficiency)
  }));

  const currentPosition = group.current_student?.position ?? group.position ?? 0;
  const currentProficiency = normalizeNumber(group.current_student?.proficiency);
  const previousRank = rankingList.find((item) => item.posicao === currentPosition - 1);
  const pontosNecessarios = previousRank
    ? Math.max(0, normalizeNumber(previousRank.pontos) - currentProficiency)
    : 0;

  const progresso = group.total_students && currentPosition
    ? Math.round(((group.total_students - currentPosition + 1) / group.total_students) * 100)
    : 0;

  return {
    posicaoAtual: currentPosition,
    pontos: currentProficiency,
    mudancaPosicao: 0,
    lista: rankingList,
    proximoObjetivo: {
      posicao: Math.max(1, currentPosition - 1),
      pontosNecessarios,
      progresso: Math.min(100, Math.max(0, progresso))
    }
  };
};

const StudentDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [period, setPeriod] = useState<PeriodType>('week');
  const [rankingFilter, setRankingFilter] = useState<'turma' | 'escola' | 'municipio'>('turma');
  
  // Estados para avaliações
  const [evaluations, setEvaluations] = useState<StudentEvaluation[]>([]);
  const [selectedEvaluation, setSelectedEvaluation] = useState<string | null>(null);
  const [evaluationResults, setEvaluationResults] = useState<StudentEvaluationResults | null>(null);
  const [isLoadingEvaluations, setIsLoadingEvaluations] = useState(true);
  
  // Estados para gráfico de evolução
  const [comparisonData, setComparisonData] = useState<StudentCompareResponse | null>(null);
  const [isLoadingComparison, setIsLoadingComparison] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  
  // Ref para rastrear a última avaliação carregada e evitar chamadas duplicadas
  const lastLoadedEvaluationRef = useRef<string | null>(null);

  // Dados mockados baseados na imagem + dados de estatísticas
  const mockStats: StudentStats = useMemo(() => ({
    proficiencia: { value: 119, change: 2.1, trend: 'up' },
    nota: { value: 6.5, change: -3.4, trend: 'down' },
    nivel: { value: 'Abaixo do Básico', change: -3.1, trend: 'down' },
    acertos: { value: 18, change: 2.4, trend: 'up' },
    medalhas: { 
      total: 4, 
      percentage: 60,
      conquistadas: [
        { id: '1', nome: 'Primeira Nota 10', tipo: 'ouro', icone: '🏆', descricao: 'Primeira nota máxima' },
        { id: '2', nome: 'Streak 7 dias', tipo: 'prata', icone: '🔥', descricao: 'Uma semana consecutiva' },
        { id: '3', nome: 'Top 10', tipo: 'bronze', icone: '⭐', descricao: 'Entre os 10 melhores' },
      ],
      proximas: [
        { id: '4', nome: 'Estudioso', requisito: '5 avaliações em sequência', progresso: 60 },
        { id: '5', nome: 'Matemático', requisito: '3 notas 10 em matemática', progresso: 33 },
      ]
    },
    moedas: { 
      total: 21,
      ganhasHoje: 5,
      historico: [
        { data: 'hoje', acao: 'Avaliação Matemática', valor: 5 },
        { data: 'ontem', acao: 'Streak 3 dias', valor: 3 },
        { data: '2 dias', acao: 'Primeira Medalha', valor: 10 },
      ],
      loja: [
        { item: 'Avatar personalizado', preco: 50, disponivel: true },
        { item: 'Tema especial', preco: 100, disponivel: true },
        { item: 'Badge exclusivo', preco: 200, disponivel: false },
      ]
    },
    ranking: {
      posicaoAtual: 5,
      pontos: 847,
      mudancaPosicao: 2,
      lista: [
        { id: 1, nome: 'Lucas Silva', acertos: 58, total: 60, posicao: 1, pontos: 1200 },
        { id: 2, nome: 'Maria Souza', acertos: 56, total: 60, posicao: 2, pontos: 1150 },
        { id: 3, nome: 'Pedro Oliveira', acertos: 54, total: 60, posicao: 3, pontos: 1100 },
        { id: 4, nome: 'Ana Costa', acertos: 52, total: 60, posicao: 4, pontos: 1050 },
        { id: 5, nome: 'João Lima', acertos: 50, total: 60, posicao: 5, pontos: 1000 },
        { id: 6, nome: 'Beatriz Ramos', acertos: 48, total: 60, posicao: 6, pontos: 950 },
        { id: 7, nome: 'Rafael Martins', acertos: 47, total: 60, posicao: 7, pontos: 900 },
        { id: 8, nome: 'Gabriela Dias', acertos: 45, total: 60, posicao: 8, pontos: 850 },
        { id: 9, nome: 'Carlos Mendes', acertos: 44, total: 60, posicao: 9, pontos: 800 },
        { id: 10, nome: 'Fernanda Rocha', acertos: 42, total: 60, posicao: 10, pontos: 750 },
      ],
      proximoObjetivo: {
        posicao: 4,
        pontosNecessarios: 50,
        progresso: 80
      }
    },
    estatisticas: {
      semana: [
        { day: 'Seg', nota: 7.2, avaliacao: 'Matemática' },
        { day: 'Ter', nota: 8.5, avaliacao: 'Português' },
        { day: 'Qua', nota: 6.8, avaliacao: 'História' },
        { day: 'Qui', nota: 9.1, avaliacao: 'Ciências' },
        { day: 'Sex', nota: 7.7, avaliacao: 'Geografia' },
        { day: 'Sáb', nota: 8.9, avaliacao: 'Inglês' },
        { day: 'Dom', nota: 7.5, avaliacao: 'Arte' },
      ],
      mes: [
        { week: 'Sem 1', nota: 7.8, avaliacoes: 12 },
        { week: 'Sem 2', nota: 8.2, avaliacoes: 15 },
        { week: 'Sem 3', nota: 7.1, avaliacoes: 10 },
        { week: 'Sem 4', nota: 8.6, avaliacoes: 18 },
      ],
      ano: [
        { month: 'Jan', nota: 7.2, avaliacoes: 45 },
        { month: 'Fev', nota: 7.8, avaliacoes: 52 },
        { month: 'Mar', nota: 8.1, avaliacoes: 48 },
        { month: 'Abr', nota: 7.5, avaliacoes: 51 },
        { month: 'Mai', nota: 8.3, avaliacoes: 49 },
        { month: 'Jun', nota: 7.9, avaliacoes: 47 },
      ],
      resumo: {
        media: 7.8,
        melhorNota: 9.1,
        streak: 12,
        metaAlcancada: true,
        progresso: 78,
        totalAvaliacoes: 124,
        tendencia: 'up'
      }
    }
  }), []);

  // Dados mockados para ranking (mantidos como fallback)
  const mockRankingData = {
    turma: {
      posicaoAtual: 3,
      pontos: 285.5,
      mudancaPosicao: 1,
      lista: [
        { id: 1, nome: 'Ana Oliveira', acertos: 18, total: 20, posicao: 1, pontos: 320.0 },
        { id: 2, nome: 'Carlos Lima', acertos: 17, total: 20, posicao: 2, pontos: 310.5 },
        { id: 3, nome: 'Pedro Costa', acertos: 15, total: 20, posicao: 3, pontos: 285.5 },
        { id: 4, nome: 'Maria Silva', acertos: 14, total: 20, posicao: 4, pontos: 280.0 },
        { id: 5, nome: 'João Santos', acertos: 13, total: 20, posicao: 5, pontos: 275.0 },
      ],
      proximoObjetivo: {
        posicao: 2,
        pontosNecessarios: 25,
        progresso: 60
      }
    },
    escola: {
      posicaoAtual: 15,
      pontos: 285.5,
      mudancaPosicao: 2,
      lista: [
        { id: 1, nome: 'Lucas Ferreira', acertos: 20, total: 20, posicao: 1, pontos: 380.0 },
        { id: 2, nome: 'Maria Silva', acertos: 19, total: 20, posicao: 2, pontos: 350.0 },
        { id: 3, nome: 'João Santos', acertos: 18, total: 20, posicao: 3, pontos: 345.5 },
        { id: 4, nome: 'Ana Costa', acertos: 17, total: 20, posicao: 4, pontos: 340.0 },
        { id: 5, nome: 'Carlos Lima', acertos: 16, total: 20, posicao: 5, pontos: 335.0 },
        { id: 6, nome: 'Beatriz Ramos', acertos: 15, total: 20, posicao: 6, pontos: 330.0 },
        { id: 7, nome: 'Rafael Martins', acertos: 15, total: 20, posicao: 7, pontos: 325.0 },
        { id: 8, nome: 'Gabriela Dias', acertos: 15, total: 20, posicao: 8, pontos: 320.0 },
        { id: 9, nome: 'Fernanda Rocha', acertos: 15, total: 20, posicao: 9, pontos: 315.0 },
        { id: 10, nome: 'Pedro Costa', acertos: 15, total: 20, posicao: 15, pontos: 285.5 },
      ],
      proximoObjetivo: {
        posicao: 14,
        pontosNecessarios: 10,
        progresso: 80
      }
    },
    municipio: {
      posicaoAtual: 89,
      pontos: 285.5,
      mudancaPosicao: -5,
      lista: [
        { id: 1, nome: 'Lucas Ferreira', acertos: 20, total: 20, posicao: 1, pontos: 380.0 },
        { id: 2, nome: 'Maria Silva', acertos: 19, total: 20, posicao: 2, pontos: 375.0 },
        { id: 3, nome: 'João Santos', acertos: 19, total: 20, posicao: 3, pontos: 370.0 },
        { id: 4, nome: 'Ana Costa', acertos: 18, total: 20, posicao: 4, pontos: 365.0 },
        { id: 5, nome: 'Carlos Lima', acertos: 18, total: 20, posicao: 5, pontos: 360.0 },
        { id: 6, nome: 'Beatriz Ramos', acertos: 17, total: 20, posicao: 6, pontos: 355.0 },
        { id: 7, nome: 'Rafael Martins', acertos: 17, total: 20, posicao: 7, pontos: 350.0 },
        { id: 8, nome: 'Gabriela Dias', acertos: 16, total: 20, posicao: 8, pontos: 345.0 },
        { id: 9, nome: 'Fernanda Rocha', acertos: 16, total: 20, posicao: 9, pontos: 340.0 },
        { id: 10, nome: 'Pedro Costa', acertos: 15, total: 20, posicao: 89, pontos: 285.5 },
      ],
      proximoObjetivo: {
        posicao: 88,
        pontosNecessarios: 5,
        progresso: 50
      }
    }
  };

  // Função para obter dados do ranking baseado no filtro
  const getCurrentRankingData = () => {
    const rankings = evaluationResults?.rankings;
    const rankingKeyMap: Record<typeof rankingFilter, keyof NonNullable<StudentEvaluationResults['rankings']>> = {
      turma: 'class',
      escola: 'school',
      municipio: 'municipality'
    };

    if (rankings) {
      const apiGroup = rankings[rankingKeyMap[rankingFilter]];
      const transformed = transformRankingGroupToCardData(apiGroup);

      if (transformed.lista.length > 0 || transformed.posicaoAtual > 0) {
        return transformed;
      }
    }

    if (stats?.ranking) {
      return stats.ranking;
    }

    console.log('⚠️ Dados de ranking indisponíveis, retornando estrutura vazia');
    return emptyRankingCardData;
  };

  // Função para alterar filtro do ranking
  const handleRankingFilterChange = (filter: 'turma' | 'escola' | 'municipio') => {
    setRankingFilter(filter);
  };

  // Função para mapear dados completados para formato de avaliações
  const mapCompletedToEvaluations = (apiData: StudentCompletedResponse): StudentEvaluation[] => {
    console.log('🔄 Mapeando dados completados para formato de avaliações...');
    console.log('📊 Dados da API:', apiData);
    
    const evaluations = apiData?.evaluations ?? [];
    if (!Array.isArray(evaluations)) return [];

    return evaluations.map(evaluation => ({
      id: evaluation.test_id,
      titulo: evaluation.title ?? '—',
      disciplina: evaluation.subject?.name ?? '—',
      data_aplicacao: evaluation.application_info?.application ?? '—',
      serie: evaluation.grade?.name ?? '—',
      escola: apiData?.student?.name ?? '—',
      turma: evaluation.grade?.name ?? '—',
      type: evaluation.type
    }));
  };

  // Função para buscar avaliações do aluno
  const fetchStudentEvaluations = useCallback(async (userId: string): Promise<StudentEvaluation[]> => {
    console.log('🔍 Buscando avaliações completadas do aluno:', `/test/student/completed`);
    const response = await api.get(`/test/student/completed`);
    console.log('📊 Resposta completa da API:', response.data);
    
    const completedData: StudentCompletedResponse = response.data ?? {};
    console.log('📊 Dados completados:', completedData);
    console.log('📊 Total de avaliações completadas:', completedData.total_completed);
    console.log('📊 Avaliações retornadas:', completedData.returned_count);

    // Mapear os dados da nova API para o formato esperado (com proteção contra null/undefined)
    const mappedEvaluations = mapCompletedToEvaluations(completedData);

    // Remover olimpíadas e competições da lista de avaliações usadas no dashboard do aluno
    const filteredEvaluations = mappedEvaluations.filter((evaluation) => {
      const type = evaluation.type?.toLowerCase() ?? '';
      // Considera qualquer tipo que contenha "olimpi" (olimpíada, olimpiada, etc.) como olimpíada
      const isOlimpiada = type.includes('olimpi');
      // Considera qualquer tipo que contenha "compet" (competição, competicao, etc.) como competição
      const isCompeticao = type.includes('compet');
      return !isOlimpiada && !isCompeticao;
    });
    
    console.log('📊 Avaliações mapeadas (sem olimpíadas):', filteredEvaluations);
    return filteredEvaluations;
  }, []);

  // Função para buscar dados específicos de uma avaliação
  const fetchEvaluationResults = async (testId: string, studentId: string): Promise<StudentEvaluationResults> => {
    console.log('🔍 Buscando resultados da avaliação:', `/evaluation-results/${testId}/student/${studentId}/results`);
    const response = await api.get(`/evaluation-results/${testId}/student/${studentId}/results`);
    console.log('📊 Resultados da avaliação:', response.data);
    console.log('🏆 Rankings retornados pela API:', response.data?.rankings);
    return response.data;
  };

  // Função para buscar dados de comparação entre avaliações
  const fetchStudentComparison = async (studentId: string, testIds: string[]): Promise<StudentCompareResponse> => {
    console.log('🔍 Buscando comparação entre avaliações:', `/test/student/compare`);
    console.log('📊 IDs das avaliações:', testIds);
    
    // Primeiro buscar avaliações completadas para validar
    const completedResponse = await api.get(`/test/student/completed`);
    const completedData: StudentCompletedResponse = completedResponse.data ?? {};
    const evaluationsList = completedData.evaluations ?? [];
    
    // Filtrar apenas as avaliações solicitadas que existem nas completadas
    const availableTestIds = evaluationsList
      .map(evaluation => evaluation.test_id)
      .filter(id => testIds.includes(id));
    
    console.log('📊 IDs disponíveis para comparação:', availableTestIds);
    
    if (availableTestIds.length === 0) {
      throw new Error('Nenhuma avaliação completada encontrada para comparação');
    }
    
    const response = await api.post('/test/student/compare', {
      student_id: studentId,
      test_ids: availableTestIds
    });
    
    console.log('📊 Dados de comparação:', response.data);
    return response.data;
  };

  // Função para mapear dados específicos de uma avaliação para a interface atual
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mapEvaluationResultsToStats = useCallback((evaluationResults: StudentEvaluationResults, selectedEval: StudentEvaluation): StudentStats => {
    console.log('🔄 Mapeando dados específicos da avaliação para interface...');
    console.log('📊 Dados da avaliação:', evaluationResults);
    console.log('📊 Avaliação selecionada:', selectedEval);
    
    // Usar classificacao (com acento) se disponível, senão usar classification
    const classification = evaluationResults.classificacao || evaluationResults.classification || 'N/A';
    console.log('📊 Classificação encontrada:', classification);
    
    // Usar proficiencia (com acento) se disponível, senão usar proficiency
    const proficiency = normalizeNumber(evaluationResults.proficiencia ?? evaluationResults.proficiency);
    console.log('📊 Proficiência encontrada:', proficiency);

    const gradeValue = normalizeNumber(evaluationResults.grade);
    const correctAnswers = normalizeNumber(evaluationResults.correct_answers);

    const rankingFromApi =
      [
        evaluationResults.rankings?.class,
        evaluationResults.rankings?.school,
        evaluationResults.rankings?.municipality,
      ]
        .map((group) => transformRankingGroupToCardData(group))
        .find((data) => data.lista.length > 0 || data.posicaoAtual > 0) ?? emptyRankingCardData;

    const rankingData = rankingFromApi.lista.length > 0 ? rankingFromApi : mockStats.ranking;
    
    return {
      proficiencia: { 
        value: proficiency, 
        change: 0, 
        trend: 'up' 
      },
      nota: { 
        value: gradeValue, 
        change: 0, 
        trend: 'up' 
      },
      nivel: { 
        value: classification, 
        change: 0, 
        trend: 'up' 
      },
      acertos: { 
        value: correctAnswers, 
        change: 0, 
        trend: 'up' 
      },
      // Manter dados gamificados como mockados
      medalhas: mockStats.medalhas,
      moedas: mockStats.moedas,
      ranking: rankingData,
      estatisticas: {
        semana: [
          { day: 'Seg', nota: 7.2, avaliacao: 'Matemática' },
          { day: 'Ter', nota: 8.5, avaliacao: 'Português' },
          { day: 'Qua', nota: 6.8, avaliacao: 'História' },
          { day: 'Qui', nota: 9.1, avaliacao: 'Ciências' },
          { day: 'Sex', nota: 7.7, avaliacao: 'Geografia' },
          { day: 'Sáb', nota: 8.9, avaliacao: 'Inglês' },
          { day: 'Dom', nota: 7.5, avaliacao: 'Arte' },
        ],
        mes: [
          { week: 'Sem 1', nota: 7.8, avaliacoes: 12 },
          { week: 'Sem 2', nota: 8.2, avaliacoes: 15 },
          { week: 'Sem 3', nota: 7.1, avaliacoes: 10 },
          { week: 'Sem 4', nota: 8.6, avaliacoes: 18 },
        ],
        ano: [
          { month: 'Jan', nota: 7.2, avaliacoes: 45 },
          { month: 'Fev', nota: 7.8, avaliacoes: 52 },
          { month: 'Mar', nota: 8.1, avaliacoes: 48 },
          { month: 'Abr', nota: 7.5, avaliacoes: 51 },
          { month: 'Mai', nota: 8.3, avaliacoes: 49 },
          { month: 'Jun', nota: 7.9, avaliacoes: 47 },
        ],
        resumo: {
          media: evaluationResults.grade,
          melhorNota: evaluationResults.grade,
          streak: 1,
          metaAlcancada: evaluationResults.grade >= 7.0,
          progresso: Math.min(100, (evaluationResults.grade / 10) * 100),
          totalAvaliacoes: 1,
          tendencia: evaluationResults.grade >= 7.0 ? 'up' : 'stable'
        }
      }
    };
  }, []);

  // Função para carregar dados de uma avaliação específica
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const loadEvaluationData = useCallback(async (evaluationId: string) => {
    if (!user?.id || !evaluationId) {
      console.log('⚠️ Dados insuficientes para carregar avaliação:', { userId: user?.id, evaluationId });
      return;
    }
    
    // Impedir carregamento de olimpíadas na avaliação específica do dashboard
    const evaluation = evaluations.find(e => e.id === evaluationId);
    if (evaluation) {
      const type = evaluation.type?.toLowerCase() ?? '';
      if (type.includes('olimpi')) {
        console.log('⚠️ Ignorando carregamento de avaliação do tipo olimpíada no dashboard do aluno:', {
          evaluationId,
          type: evaluation.type,
        });
        return;
      }
    }

    // Validação: garantir que o evaluationId corresponde ao selectedEvaluation
    if (evaluationId !== selectedEvaluation) {
      console.warn('⚠️ Tentativa de carregar avaliação diferente da selecionada:', {
        requested: evaluationId,
        selected: selectedEvaluation
      });
      return;
    }
    
    try {
      console.log('🔍 Carregando dados da avaliação:', evaluationId);
      const evaluationResults = await fetchEvaluationResults(evaluationId, user.id);
      const selectedEval = evaluations.find(evaluation => evaluation.id === evaluationId);
      
      if (selectedEval) {
        // Validar novamente antes de setar os dados
        if (evaluationId === selectedEvaluation) {
          const mappedStats = mapEvaluationResultsToStats(evaluationResults, selectedEval);
          setStats(mappedStats);
          setEvaluationResults(evaluationResults);
          // Atualizar ref apenas após carregar com sucesso
          lastLoadedEvaluationRef.current = evaluationId;
        } else {
          console.warn('⚠️ Avaliação mudou durante o carregamento, ignorando dados antigos');
        }
      } else {
        console.warn('⚠️ Avaliação não encontrada na lista:', evaluationId);
      }
    } catch (error) {
      console.error('Erro ao carregar dados da avaliação:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados da avaliação selecionada.",
        variant: "destructive",
      });
    }
  }, [user?.id, evaluations, selectedEvaluation, toast]);

  // Função principal para carregar dados
  const loadStudentData = async () => {
    try {
      setIsLoading(true);
      setIsLoadingEvaluations(true);
      
      if (!user?.id) {
        throw new Error('ID do usuário não encontrado');
      }

      // 1. Buscar avaliações do aluno PRIMEIRO
      console.log('🔍 Buscando avaliações do aluno...');
      const studentEvaluations = await fetchStudentEvaluations(user.id);
      console.log('📊 Avaliações encontradas:', studentEvaluations);
      setEvaluations(studentEvaluations);
      
      if (studentEvaluations.length > 0) {
        // 2. Selecionar automaticamente a primeira avaliação
        const firstEvaluation = studentEvaluations[0];
        console.log('✅ Primeira avaliação selecionada:', firstEvaluation);
        console.log('✅ ID da primeira avaliação:', firstEvaluation.id);
        setSelectedEvaluation(firstEvaluation.id);
        
        // 3. AGORA carregar dados da primeira avaliação (após ter a lista)
        console.log('🔍 Carregando dados da primeira avaliação:', firstEvaluation.id);
        await loadEvaluationData(firstEvaluation.id);
      } else {
        // 4. Se não houver avaliações, não há nada para exibir
        console.log('⚠️ Nenhuma avaliação encontrada');
      }
        
    } catch (error) {
      console.error('Erro ao carregar dados do aluno:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar seus dados.",
        variant: "destructive",
      });
        
      // Em caso de erro, usar dados mockados como último recurso
      console.error('Erro no carregamento, usando dados mockados:', error);
      setStats(mockStats);
    } finally {
      setIsLoading(false);
      setIsLoadingEvaluations(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    if (hasLoadedData || !user?.id) return;
    
    const loadStudentData = async () => {
      try {
        setIsLoading(true);
        setIsLoadingEvaluations(true);
        setHasLoadedData(true);
        
        if (!user?.id) {
          throw new Error('ID do usuário não encontrado');
        }

        // 1. Buscar avaliações do aluno PRIMEIRO
        console.log('🔍 Buscando avaliações do aluno...');
        const studentEvaluations = await fetchStudentEvaluations(user.id);
        console.log('📊 Avaliações encontradas:', studentEvaluations);
        setEvaluations(studentEvaluations);
        
        if (studentEvaluations.length > 0) {
          // 2. Selecionar automaticamente a primeira avaliação
          // O useEffect abaixo irá detectar a mudança e carregar os dados automaticamente
          const firstEvaluation = studentEvaluations[0];
          console.log('✅ Primeira avaliação selecionada:', firstEvaluation);
          console.log('✅ ID da primeira avaliação:', firstEvaluation.id);
          setSelectedEvaluation(firstEvaluation.id);
        } else {
          // 3. Se não houver avaliações, não há nada para exibir
          console.log('⚠️ Nenhuma avaliação encontrada');
        }
          
      } catch (error) {
        console.error('Erro ao carregar dados do aluno:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar seus dados.",
          variant: "destructive",
        });
        setHasLoadedData(false);
        
        // Em caso de erro, usar dados mockados como último recurso
        console.error('Erro no carregamento, usando dados mockados:', error);
        setStats(mockStats);
      } finally {
        setIsLoading(false);
        setIsLoadingEvaluations(false);
      }
    };

    loadStudentData();
  }, [user?.id]);

  // useEffect que monitora selectedEvaluation e carrega dados automaticamente
  useEffect(() => {
    if (selectedEvaluation && user?.id && evaluations.length > 0) {
      // Verificar se a avaliação selecionada existe na lista
      const evaluationExists = evaluations.find(e => e.id === selectedEvaluation);
      if (evaluationExists) {
        // Evitar carregar a mesma avaliação novamente
        if (lastLoadedEvaluationRef.current !== selectedEvaluation) {
          console.log('🔄 selectedEvaluation mudou, carregando dados:', selectedEvaluation);
          loadEvaluationData(selectedEvaluation);
        } else {
          console.log('ℹ️ Avaliação já carregada, ignorando:', selectedEvaluation);
        }
      } else {
        console.warn('⚠️ Avaliação selecionada não encontrada na lista:', selectedEvaluation);
      }
    }
  }, [selectedEvaluation, user?.id, evaluations.length, loadEvaluationData]);

  // Função para carregar dados de comparação
  const loadComparisonData = useCallback(async () => {
    try {
      if (!user?.id) {
        console.log('⚠️ Usuário não encontrado para comparação');
        return;
      }

      // Filtrar avaliações que não são de olimpíadas
      const evaluationsForComparison = evaluations.filter((evaluation) => {
        const type = evaluation.type?.toLowerCase() ?? '';
        // Considera qualquer tipo que contenha "olimpi" (olimpíada, olimpiada, etc.) como olimpíada
        return !type.includes('olimpi');
      });

      if (evaluationsForComparison.length < 2) {
        console.log('⚠️ Avaliações suficientes para comparação apenas sem olimpíadas:', {
          totalEvaluations: evaluations.length,
          evaluationsForComparison: evaluationsForComparison.length,
        });
        return;
      }

      setIsLoadingComparison(true);
      console.log('🔍 Carregando dados de comparação...');
      
      // Pegar os IDs das avaliações disponíveis
      const testIds = evaluationsForComparison.map(evaluation => evaluation.id);
      console.log('📊 IDs das avaliações para comparação (sem olimpíadas):', testIds);
      
      const comparisonResponse = await fetchStudentComparison(user.id, testIds);
      setComparisonData(comparisonResponse);
      
      console.log('✅ Dados de comparação carregados:', comparisonResponse);
    } catch (error) {
      console.error('Erro ao carregar dados de comparação:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados de comparação entre avaliações.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingComparison(false);
    }
  }, [user?.id, evaluations, toast]);

  // Carregar dados de comparação quando as avaliações estiverem disponíveis
  useEffect(() => {
    if (evaluations.length >= 2 && !comparisonData) {
      loadComparisonData();
    }
  }, [evaluations, comparisonData]);

  // Função para lidar com mudança de avaliação
  const handleEvaluationChange = (evaluationId: string) => {
    if (!evaluationId) {
      console.warn('⚠️ ID da avaliação não fornecido');
      return;
    }
    
    console.log('🔄 Mudando para avaliação:', evaluationId);
    // Apenas setar selectedEvaluation - o useEffect irá detectar e carregar os dados automaticamente
    setSelectedEvaluation(evaluationId);
  };





  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }


  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-shrink-0">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
            <User className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground truncate">Olá, {user?.name || "Aluno"}!</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Painel do Aluno</p>
          </div>
        </div>
        
        {/* Select de Avaliações */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {evaluations.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-foreground">Avaliação:</label>
              <select
                value={selectedEvaluation || ''}
                onChange={(e) => handleEvaluationChange(e.target.value)}
                disabled={isLoadingEvaluations}
                className="px-3 py-1.5 border border-border rounded-md text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
              >
                {evaluations.map((evaluation) => (
                  <option key={evaluation.id} value={evaluation.id}>
                    {evaluation.titulo} - {evaluation.disciplina}
                  </option>
                ))}
              </select>
            </div>
          )}
          {selectedEvaluation && (
            <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700 px-2 sm:px-3 py-1 text-xs sm:text-sm">
              Avaliação Específica
            </Badge>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && <StatsCards stats={stats} />}

      {/* Layout Principal - 3 cards em cima, comparação embaixo */}
      <div className="space-y-6">
        {/* Top Row - 3 Cards lado a lado */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Medalhas */}
          {stats && <MedalhasCard medalhas={stats.medalhas} />}

          {/* AfirmeCoins */}
          {stats && <InnovCoinsCard moedas={stats.moedas} />}

          {/* Ranking */}
          {stats && (
            <RankingCard 
              ranking={getCurrentRankingData()} 
              rankingFilter={rankingFilter}
              onRankingFilterChange={handleRankingFilterChange}
              userName={user?.name}
            />
          )}
          </div>

        {/* Bottom Row - Gráfico de Evolução */}
        <div className="w-full">
          <EvolutionChart 
            data={comparisonData as unknown as any} // eslint-disable-line @typescript-eslint/no-explicit-any
            isLoading={isLoadingComparison}
          />
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard; 