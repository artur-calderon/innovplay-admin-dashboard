import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  Download,
  TrendingUp,
  Users,
  FileText,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Target,
  Award,
  RefreshCw,
  Search,
  School,
  MapPin,
  GraduationCap,
  BarChart,
  AreaChart
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EvaluationResultsApiService } from "@/services/evaluationResultsApi";
import { useAuth } from "@/context/authContext";

// Interfaces para os dados da API
interface EvaluationResult {
  id: string;
  titulo: string;
  disciplina: string;
  curso: string;
  serie: string;
  grade_id?: string; // ID da série (adicionado)
  class_test_id?: string; // ID do teste de classe (adicionado)
  turma?: string; // Nome da turma (adicionado)
  escola: string;
  municipio: string;
  data_aplicacao: string;
  status: 'concluida' | 'em_andamento' | 'pendente' | string; // Permitir outros status
  total_alunos: number;
  alunos_participantes: number;
  alunos_ausentes: number;
  media_nota: number;
  media_proficiencia: number;
  distribuicao_classificacao: {
    abaixo_do_basico: number;
    basico: number;
    adequado: number;
    avancado: number;
  };
}

interface StudentResult {
  id: string;
  nome: string;
  turma: string;
  nota: number;
  proficiencia: number;
  classificacao: 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado';
  questoes_respondidas: number;
  acertos: number;
  erros: number;
  em_branco: number;
  tempo_gasto: number;
  status: 'concluida' | 'pendente';
}

interface ResultsStats {
  totalEvaluations: number;
  totalStudents: number;
  averageScore: number;
  completedEvaluations: number;
  topPerformanceSubject: string;
}

export default function Results() {
  const { id: evaluationId } = useParams<{ id: string }>();
  const { user, autoLogin } = useAuth();
  const [stats, setStats] = useState<ResultsStats>({
    totalEvaluations: 0,
    totalStudents: 0,
    averageScore: 0,
    completedEvaluations: 0,
    topPerformanceSubject: '',
  });
  const [evaluationsList, setEvaluationsList] = useState<EvaluationResult[]>([]);
  const [filteredEvaluations, setFilteredEvaluations] = useState<EvaluationResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [chartType, setChartType] = useState<'bars' | 'area'>('bars');

  // Novos estados para filtros adicionais
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [schoolFilter, setSchoolFilter] = useState<string>('all');
  const [evaluationFilter, setEvaluationFilter] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  
  // Estado para mapeamento de séries (ID -> Nome)
  const [gradesMapping, setGradesMapping] = useState<Record<string, string>>({});

  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalEvaluations, setTotalEvaluations] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const initializeData = async () => {
      // Verificar se há token, se não houver, fazer login automático
      const token = localStorage.getItem('token');
      if (!token) {
        try {
          await autoLogin();
        } catch (error) {
          console.error("Erro no login automático:", error);
          toast({
            title: "Erro de Autenticação",
            description: "Não foi possível fazer login automático. Verifique suas credenciais.",
            variant: "destructive",
          });
          // Não carregar dados se login falhar
          return;
        }
      }
      await fetchData();
    };

    initializeData();
  }, [evaluationId, autoLogin]);

  // Recarregar dados quando página ou filtros mudarem
  useEffect(() => {
    if (!evaluationId && !isLoading) {
      // Só recarregar se não estiver carregando inicialmente
      fetchEvaluationsList();
    }
  }, [currentPage, perPage]); // Removido filtros que causam duplicação

  // Filtrar avaliações baseado na busca local e filtros
  useEffect(() => {
    let filtered = evaluationsList;

    // Filtro por busca (local)
    if (searchTerm) {
      filtered = filtered.filter(evaluation =>
        evaluation.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        evaluation.disciplina.toLowerCase().includes(searchTerm.toLowerCase()) ||
        evaluation.escola.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por ano de realização
    if (yearFilter !== 'all') {
      filtered = filtered.filter(evaluation => {
        const evaluationYear = new Date(evaluation.data_aplicacao).getFullYear().toString();
        return evaluationYear === yearFilter;
      });
    }

    // Filtro por escola
    if (schoolFilter !== 'all') {
      filtered = filtered.filter(evaluation => evaluation.escola === schoolFilter);
    }

    // Filtro por avaliação (título)
    if (evaluationFilter !== 'all') {
      filtered = filtered.filter(evaluation => evaluation.titulo === evaluationFilter);
    }

    // Filtro por série
    if (gradeFilter !== 'all') {
      filtered = filtered.filter(evaluation => getGradeName(evaluation.serie, evaluation.grade_id, evaluation) === gradeFilter);
    }

    // Filtro por turma
    if (classFilter !== 'all') {
      filtered = filtered.filter(evaluation => evaluation.turma === classFilter);
    }

    setFilteredEvaluations(filtered);
  }, [evaluationsList, searchTerm, yearFilter, schoolFilter, evaluationFilter, gradeFilter, classFilter]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([fetchResultsStats(), fetchEvaluationsList(), fetchGradesMapping()]);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro de Conexão",
        description: "Não foi possível conectar com o servidor. Verifique se o backend está rodando.",
        variant: "destructive",
      });
      // Definir estatísticas vazias
      setStats({
        totalEvaluations: 0,
        totalStudents: 0,
        averageScore: 0,
        completedEvaluations: 0,
        topPerformanceSubject: '',
      });
      setEvaluationsList([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGradesMapping = async () => {
    // Mapeamento vazio - agora a API retorna as séries corretamente
    setGradesMapping({});
  };

  // Funções removidas para evitar erros 404

  // Função para determinar série baseada no class_test_id (fallback)
  const determineGradeFromEvaluation = (evaluation: EvaluationResult): string => {
    // Fallback caso a API não retorne série (não deve mais acontecer)
    return 'Série não identificada';
  };

  const fetchResultsStats = async () => {
    // Buscar todas as avaliações para estatísticas (sem paginação)
    const response = await EvaluationResultsApiService.getEvaluationsList(1, 1000);
    const evaluations = response.data;

    if (evaluations.length === 0) {
      setStats({
        totalEvaluations: 0,
        totalStudents: 0,
        averageScore: 0,
        completedEvaluations: 0,
        topPerformanceSubject: '',
      });
      return;
    }

    const totalStudents = evaluations.reduce((sum: number, evaluation: EvaluationResult) =>
      sum + evaluation.alunos_participantes, 0);
    const averageScore = evaluations.reduce((sum: number, evaluation: EvaluationResult) =>
      sum + evaluation.media_nota, 0) / evaluations.length;
    const completedEvaluations = evaluations.filter((e: EvaluationResult) => e.status === 'concluida').length;

    // Encontrar a disciplina com melhor desempenho
    const subjectScores = evaluations.reduce((acc: Record<string, { total: number; count: number }>, evaluation: EvaluationResult) => {
      if (!acc[evaluation.disciplina]) {
        acc[evaluation.disciplina] = { total: 0, count: 0 };
      }
      acc[evaluation.disciplina].total += evaluation.media_nota;
      acc[evaluation.disciplina].count += 1;
      return acc;
    }, {});

    const topSubject = Object.entries(subjectScores).reduce((best: { subject: string; average: number }, [subject, data]) => {
      const average = data.total / data.count;
      return average > best.average ? { subject, average } : best;
    }, { subject: '', average: 0 });

    const finalStats = {
      totalEvaluations: response.total,
      totalStudents: totalStudents,
      averageScore: averageScore,
      completedEvaluations: completedEvaluations,
      topPerformanceSubject: topSubject.subject,
    };

    setStats(finalStats);
  };

  const fetchEvaluationsList = async () => {
    setIsLoadingPage(true);

    try {
      const filters = {
        status: statusFilter !== 'all' ? statusFilter : undefined,
        disciplina: subjectFilter !== 'all' ? subjectFilter : undefined,
      };

      const response = await EvaluationResultsApiService.getEvaluationsList(
        currentPage,
        perPage,
        filters
      );

      // Atualizar estados de paginação
      setTotalPages(response.total_pages);
      setTotalEvaluations(response.total);

      // Usar dados diretamente sem tentar buscar grade_id (endpoints não existem)
      const enrichedData = response.data;

      if (evaluationId) {
        // Se há um ID específico, filtrar apenas essa avaliação
        const specificEvaluation = enrichedData.filter((evaluation: EvaluationResult) => evaluation.id === evaluationId);
        setEvaluationsList(specificEvaluation);
      } else {
        setEvaluationsList(enrichedData);
      }
    } catch (error) {
      console.error("Erro ao carregar avaliações:", error);
      toast({
        title: "Erro ao carregar avaliações",
        description: "Não foi possível carregar as avaliações. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPage(false);
    }
  };

  const getStatusConfig = (status: EvaluationResult['status']) => {
    const configs = {
      concluida: {
        label: "Concluída",
        color: "bg-green-100 text-green-800 border-green-300"
      },
      em_andamento: {
        label: "Em Andamento",
        color: "bg-blue-100 text-blue-800 border-blue-300"
      },
      pendente: {
        label: "Pendente",
        color: "bg-gray-100 text-gray-800 border-gray-300"
      },
      agendada: {
        label: "Agendada",
        color: "bg-yellow-100 text-yellow-800 border-yellow-300"
      },
      // Adicionar possíveis variações
      'concluído': {
        label: "Concluída",
        color: "bg-green-100 text-green-800 border-green-300"
      },
      'em andamento': {
        label: "Em Andamento",
        color: "bg-blue-100 text-blue-800 border-blue-300"
      },
      'finalizada': {
        label: "Concluída",
        color: "bg-green-100 text-green-800 border-green-300"
      },
      'finalizado': {
        label: "Concluída",
        color: "bg-green-100 text-green-800 border-green-300"
      },
      'agendado': {
        label: "Agendada",
        color: "bg-yellow-100 text-yellow-800 border-yellow-300"
      }
    };

    const config = configs[status] || {
      label: "Desconhecido",
      color: "bg-gray-100 text-gray-800 border-gray-300"
    };

    return config;
  };

  const getProficiencyColor = (proficiency: string) => {
    switch (proficiency) {
      case 'Avançado': return 'bg-green-100 text-green-800 border-green-300';
      case 'Adequado': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Básico': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Abaixo do Básico': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const handleViewResults = (evaluationId: string) => {
    navigate(`/app/avaliacao/${evaluationId}/resultados-detalhados`);
  };

  // Funções de paginação
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePerPageChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setCurrentPage(1); // Voltar para a primeira página
  };

  const handleFilterChange = (filterType: 'status' | 'subject' | 'year' | 'school' | 'evaluation' | 'grade' | 'class', value: string) => {
    if (filterType === 'status') {
      setStatusFilter(value);
    } else if (filterType === 'subject') {
      setSubjectFilter(value);
    } else if (filterType === 'year') {
      setYearFilter(value);
    } else if (filterType === 'school') {
      setSchoolFilter(value);
    } else if (filterType === 'evaluation') {
      setEvaluationFilter(value);
    } else if (filterType === 'grade') {
      setGradeFilter(value);
    } else if (filterType === 'class') {
      setClassFilter(value);
    }
    setCurrentPage(1); // Voltar para a primeira página ao aplicar filtros
  };

  const handleClearAllFilters = () => {
    setStatusFilter('all');
    setSubjectFilter('all');
    setYearFilter('all');
    setSchoolFilter('all');
    setEvaluationFilter('all');
    setGradeFilter('all');
    setClassFilter('all');
    setSearchTerm('');
    setCurrentPage(1);
  };

  // Função utilitária para tratar valores vazios
  const formatFieldValue = (value: string | null | undefined, fallback: string = 'Não informado') => {
    if (!value || value.trim() === '') return fallback;
    return value;
  };

  // Função para obter o nome da série baseado no ID
  const getGradeName = (gradeId: string | null | undefined, gradeIdFromApi?: string | null | undefined, evaluation?: EvaluationResult): string => {
    // ✅ PRIORIDADE 1: Usar o campo serie da API (agora deve vir correto)
    if (gradeId && gradeId !== 'N/A') {
      return gradeId;
    }
    
    // ✅ PRIORIDADE 2: Usar o grade_id da API (UUID da grade)
    if (gradeIdFromApi && gradeIdFromApi !== 'N/A') {
      if (gradeIdFromApi.includes('-')) {
        const mappedName = gradesMapping[gradeIdFromApi];
        if (mappedName) {
          return mappedName;
        }
        return `Série ${gradeIdFromApi.slice(0, 8)}...`;
      }
      return gradeIdFromApi;
    }
    
    // ✅ PRIORIDADE 3: Fallback para mapeamento local (se API não retornar)
    if (evaluation) {
      return determineGradeFromEvaluation(evaluation);
    }
    
    return 'Série não identificada';
  };

  // Função para renderizar diferentes tipos de gráficos
  const renderProficiencyChart = (levels: Array<{ name: string, value: number, color: string, textColor: string }>) => {
    const total = levels.reduce((sum, level) => sum + level.value, 0);

    if (total === 0) return <div className="text-center text-muted-foreground">Nenhum dado disponível</div>;

    switch (chartType) {
      case 'bars':
        return (
          <div className="space-y-3">
            {levels.map((level, index) => (
              <div key={`${level.name}-${index}`} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{level.name}</span>
                  <span className={`font-bold ${level.textColor}`}>
                    {level.value} ({((level.value / total) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`${level.color} h-3 rounded-full transition-all duration-300`}
                    style={{ width: `${(level.value / total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        );

      case 'area':
        return (
          <div className="space-y-4">
            <div className="relative h-40 bg-gradient-to-b from-gray-50 to-white rounded-lg border p-4">
              <svg className="w-full h-full" viewBox="0 0 100 40">
                <defs>
                  <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
                  </linearGradient>
                </defs>
                {/* Linhas de grade */}
                {[0, 10, 20, 30, 40].map(y => (
                  <line
                    key={y}
                    x1="0"
                    y1={y}
                    x2="100"
                    y2={y}
                    stroke="#e5e7eb"
                    strokeWidth="0.5"
                    opacity="0.5"
                  />
                ))}
                {/* Área do gráfico */}
                <path
                  d={(() => {
                    const points = levels.map((level, index) => {
                      const x = (index / (levels.length - 1)) * 100;
                      let percentage = 0;

                      if (total > 0) {
                        percentage = level.value / total;

                        // Verificar se é um caso extremo (apenas um valor não-zero)
                        const nonZeroValues = levels.filter(l => l.value > 0).length;
                        const maxValue = Math.max(...levels.map(l => l.value));

                        if (nonZeroValues === 1 && level.value === maxValue) {
                          // Caso extremo: criar uma forma mais suave e elegante
                          if (index === 0) {
                            return `M 0 12`; // Começar um pouco acima da base
                          } else if (index === 1) {
                            return `Q 12.5 12 25 12`; // Curva suave para o pico
                          } else if (index === 2) {
                            return `Q 37.5 20 50 20`; // Curva suave para descer
                          } else {
                            return `Q 75 30 100 40`; // Curva suave para a base
                          }
                        } else {
                          // Caso normal: usar porcentagem real com curvas suaves
                          const y = Math.max(12, Math.min(40, 40 - (percentage * 28)));
                          if (index === 0) {
                            return `M 0 ${y}`;
                          } else {
                            const prevY = index > 0 ? Math.max(12, Math.min(40, 40 - ((levels[index - 1].value / total) * 28))) : y;
                            const midX = (index - 0.5) / (levels.length - 1) * 100;
                            const midY = (prevY + y) / 2;
                            return `Q ${midX} ${midY} ${x} ${y}`;
                          }
                        }
                      }

                      const y = Math.max(12, Math.min(40, 40 - (percentage * 28)));
                      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                    }).join(' ');

                    return `${points} L 100 40 L 0 40 Z`;
                  })()}
                  fill="url(#areaGradient)"
                  stroke="#3b82f6"
                  strokeWidth="2"
                />
                {/* Pontos de dados */}
                {levels.map((level, index) => {
                  const x = (index / (levels.length - 1)) * 100;
                  let percentage = 0;
                  let y = 40;

                  if (total > 0) {
                    percentage = level.value / total;

                    // Verificar se é um caso extremo
                    const nonZeroValues = levels.filter(l => l.value > 0).length;
                    const maxValue = Math.max(...levels.map(l => l.value));

                    if (nonZeroValues === 1 && level.value === maxValue) {
                      if (index === 0) {
                        y = 12; // Base
                      } else if (index === 1) {
                        y = 12; // Pico
                      } else if (index === 2) {
                        y = 20; // Meio
                      } else {
                        y = 40; // Base
                      }
                    } else {
                      y = Math.max(12, Math.min(40, 40 - (percentage * 28)));
                    }
                  }

                  return (
                    <g key={`${level.name}-${index}`}>
                      <circle
                        cx={x}
                        cy={y}
                        r="2"
                        fill="white"
                        stroke="#3b82f6"
                        strokeWidth="2"
                      />
                      <text
                        x={x}
                        y={y - 3}
                        textAnchor="middle"
                        fontSize="2"
                        fill="#374151"
                        fontWeight="bold"
                      >
                        {level.value}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {levels.map((level, index) => (
                <div key={`${level.name}-${index}`} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded ${level.color}`}></div>
                    <span className="font-medium">{level.name}</span>
                  </div>
                  <span className={`font-bold ${level.textColor}`}>
                    {total > 0 ? ((level.value / total) * 100).toFixed(1) : '0.0'}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        );



      default:
        return null;
    }
  };

  const handleExportResults = async (evaluationId?: string) => {
    try {
      const XLSX = await import('xlsx');
      const { saveAs } = await import('file-saver');

      const dataToExport = evaluationId
        ? filteredEvaluations.filter(e => e.id === evaluationId)
        : filteredEvaluations;

      if (dataToExport.length === 0) {
        toast({
          title: "Nenhum dado para exportar",
          description: "Não há avaliações para gerar a planilha",
          variant: "destructive",
        });
        return;
      }

      // Criar dados da planilha
      const worksheetData = [
        ['Avaliação', 'Disciplina', 'Escola', 'Série', 'Turma', 'Município', 'Participantes', 'Média', 'Proficiência', 'Status'],
        ...dataToExport.map(evaluation => [
          formatFieldValue(evaluation.titulo, 'Título não informado'),
          formatFieldValue(evaluation.disciplina, 'N/A'),
          formatFieldValue(evaluation.escola, 'N/A'),
          getGradeName(evaluation.serie, evaluation.grade_id, evaluation),
          formatFieldValue(evaluation.turma, 'N/A'),
          formatFieldValue(evaluation.municipio, 'N/A'),
          `${evaluation.alunos_participantes}/${evaluation.total_alunos}`,
          evaluation.media_nota.toFixed(1),
          evaluation.media_proficiencia.toFixed(1),
          evaluation.status === 'concluida' ? 'Concluída' : evaluation.status === 'em_andamento' ? 'Em Andamento' : 'Pendente'
        ])
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Avaliações');

      const fileName = `resultados-avaliacoes-${new Date().toISOString().split('T')[0]}.xlsx`;
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      saveAs(blob, fileName);

      toast({
        title: "Exportação concluída!",
        description: "Os resultados foram exportados com sucesso.",
      });
    } catch (error) {
      console.error("Erro na exportação:", error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar os resultados",
        variant: "destructive",
      });
    }
  };

  const uniqueSubjects = [...new Set(evaluationsList.map(e => e.disciplina))];
  
  // Dados únicos para os novos filtros
  const uniqueYears = [...new Set(evaluationsList.map(e => new Date(e.data_aplicacao).getFullYear().toString()))].sort((a, b) => b.localeCompare(a));
  const uniqueSchools = [...new Set(evaluationsList.map(e => e.escola))].sort();
  const uniqueEvaluations = [...new Set(evaluationsList.map(e => e.titulo))].sort();
  const uniqueClasses = [...new Set(evaluationsList.map(e => e.turma))].sort();
  // Memoizar o cálculo de séries únicas para evitar re-renders
  const uniqueGrades = React.useMemo(() => {
    return [...new Set(evaluationsList.map(e => getGradeName(e.serie, e.grade_id, e)))].sort();
  }, [evaluationsList]);
  

  
  const isSpecificEvaluation = Boolean(evaluationId);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {isSpecificEvaluation ? 'Resultado da Avaliação' : 'Resultados das Avaliações'}
          </h1>
          <p className="text-muted-foreground">
            {isSpecificEvaluation
              ? `Análise detalhada dos resultados da avaliação`
              : 'Acompanhe o desempenho das avaliações e gere relatórios'
            }
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fetchData()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button onClick={() => handleExportResults()}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Tudo
          </Button>
        </div>
      </div>

      {/* Estatísticas Principais */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              Total de Avaliações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {isLoading ? <Skeleton className="h-8 w-16" /> : stats.totalEvaluations}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.completedEvaluations} concluídas
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-green-600" />
              Alunos Participantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isLoading ? <Skeleton className="h-8 w-16" /> : stats.totalStudents}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Realizaram avaliações
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-600" />
              Média Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {isLoading ? <Skeleton className="h-8 w-16" /> : `${stats.averageScore.toFixed(1)}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Desempenho médio
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos de Proficiência */}
      {!isLoading && (
        <>
          {filteredEvaluations.length > 0 ? (
            <div className="grid gap-6">
              {/* Gráfico de Distribuição Geral */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Distribuição Geral de Proficiência
                    </CardTitle>
                    {/* Controles de alternância de gráfico */}
                    <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                      <button
                        onClick={() => setChartType('bars')}
                        className={`px-3 py-1 text-xs rounded-md transition-all flex items-center gap-1 ${chartType === 'bars'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                          }`}
                        title="Gráfico de Barras"
                      >
                        <BarChart className="h-3 w-3" />
                        Barras
                      </button>
                      <button
                        onClick={() => setChartType('area')}
                        className={`px-3 py-1 text-xs rounded-md transition-all flex items-center gap-1 ${chartType === 'area'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                          }`}
                        title="Gráfico de Área"
                      >
                        <AreaChart className="h-3 w-3" />
                        Área
                      </button>

                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(() => {
                      const total = filteredEvaluations.reduce((sum, evaluation) =>
                        sum + evaluation.distribuicao_classificacao.abaixo_do_basico +
                        evaluation.distribuicao_classificacao.basico +
                        evaluation.distribuicao_classificacao.adequado +
                        evaluation.distribuicao_classificacao.avancado, 0);

                      if (total === 0) return <div className="text-center text-muted-foreground">Nenhum dado disponível</div>;

                      const abaixo = filteredEvaluations.reduce((sum, evaluation) =>
                        sum + evaluation.distribuicao_classificacao.abaixo_do_basico, 0);
                      const basico = filteredEvaluations.reduce((sum, evaluation) =>
                        sum + evaluation.distribuicao_classificacao.basico, 0);
                      const adequado = filteredEvaluations.reduce((sum, evaluation) =>
                        sum + evaluation.distribuicao_classificacao.adequado, 0);
                      const avancado = filteredEvaluations.reduce((sum, evaluation) =>
                        sum + evaluation.distribuicao_classificacao.avancado, 0);

                      const levels = [
                        { name: 'Abaixo do Básico', value: abaixo, color: 'bg-red-500', textColor: 'text-red-600' },
                        { name: 'Básico', value: basico, color: 'bg-yellow-500', textColor: 'text-yellow-600' },
                        { name: 'Adequado', value: adequado, color: 'bg-blue-500', textColor: 'text-blue-600' },
                        { name: 'Avançado', value: avancado, color: 'bg-green-500', textColor: 'text-green-600' }
                      ];

                      return renderProficiencyChart(levels);
                    })()}
                  </div>
                </CardContent>
              </Card>


            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Gráficos de Proficiência
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhum dado disponível para gráficos
                  </h3>
                  <p className="text-gray-600">
                    Não há dados suficientes para gerar os gráficos de proficiência.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Filtros e Busca */}
      {!isSpecificEvaluation && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome da avaliação, disciplina ou escola..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Filtros em grid responsivo */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {/* Status */}
                <Select value={statusFilter} onValueChange={(value) => handleFilterChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="agendada">Agendada</SelectItem>
                  </SelectContent>
                </Select>

                {/* Disciplina */}
                <Select value={subjectFilter} onValueChange={(value) => handleFilterChange('subject', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Disciplina" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Disciplinas</SelectItem>
                    {uniqueSubjects.map(subject => (
                      <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Ano de Realização */}
                <Select value={yearFilter} onValueChange={(value) => handleFilterChange('year', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Ano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Anos</SelectItem>
                    {uniqueYears.map(year => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Escola */}
                <Select value={schoolFilter} onValueChange={(value) => handleFilterChange('school', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escola" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Escolas</SelectItem>
                    {uniqueSchools.map(school => (
                      <SelectItem key={school} value={school}>{school}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Avaliação */}
                <Select value={evaluationFilter} onValueChange={(value) => handleFilterChange('evaluation', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Avaliação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Avaliações</SelectItem>
                    {uniqueEvaluations.map(evaluation => (
                      <SelectItem key={evaluation} value={evaluation}>{evaluation}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Série */}
                <Select value={gradeFilter} onValueChange={(value) => handleFilterChange('grade', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Série" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Séries</SelectItem>
                    {uniqueGrades.map(grade => (
                      <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Turma */}
                <Select value={classFilter} onValueChange={(value) => handleFilterChange('class', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Turma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Turmas</SelectItem>
                    {uniqueClasses.map(class_name => (
                      <SelectItem key={class_name} value={class_name}>{class_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Informação sobre filtros ativos e botão limpar */}
              {(statusFilter !== 'all' || subjectFilter !== 'all' || yearFilter !== 'all' || 
                schoolFilter !== 'all' || evaluationFilter !== 'all' || gradeFilter !== 'all' || 
                classFilter !== 'all' || searchTerm) && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Filtros ativos:</span>
                    {statusFilter !== 'all' && (
                      <Badge variant="secondary" className="text-xs">
                        Status: {statusFilter === 'concluida' ? 'Concluída' : statusFilter === 'em_andamento' ? 'Em Andamento' : 'Pendente'}
                      </Badge>
                    )}
                    {subjectFilter !== 'all' && (
                      <Badge variant="secondary" className="text-xs">
                        Disciplina: {subjectFilter}
                      </Badge>
                    )}
                    {yearFilter !== 'all' && (
                      <Badge variant="secondary" className="text-xs">
                        Ano: {yearFilter}
                      </Badge>
                    )}
                    {schoolFilter !== 'all' && (
                      <Badge variant="secondary" className="text-xs">
                        Escola: {schoolFilter}
                      </Badge>
                    )}
                    {evaluationFilter !== 'all' && (
                      <Badge variant="secondary" className="text-xs">
                        Avaliação: {evaluationFilter}
                      </Badge>
                    )}
                    {gradeFilter !== 'all' && (
                      <Badge variant="secondary" className="text-xs">
                        Série: {gradeFilter}
                      </Badge>
                    )}
                    {classFilter !== 'all' && (
                      <Badge variant="secondary" className="text-xs">
                        Turma: {classFilter}
                      </Badge>
                    )}
                    {searchTerm && (
                      <Badge variant="secondary" className="text-xs">
                        Busca: "{searchTerm}"
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearAllFilters}
                    className="text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Limpar Todos os Filtros
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Avaliações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              {isSpecificEvaluation ? 'Detalhes da Avaliação' : 'Avaliações'}
            </span>
            <Badge variant="outline">
              {totalEvaluations} {totalEvaluations === 1 ? 'avaliação' : 'avaliações'} total
              {(searchTerm || statusFilter !== 'all' || subjectFilter !== 'all' || yearFilter !== 'all' || 
                schoolFilter !== 'all' || evaluationFilter !== 'all' || gradeFilter !== 'all' || 
                classFilter !== 'all') && (
                <span className="ml-2">
                  ({filteredEvaluations.length} filtradas)
                </span>
              )}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-20" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : isLoadingPage ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-20" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredEvaluations.length > 0 ? (
            <div className="space-y-4">
              {filteredEvaluations.map((evaluation, index) => {
                const statusConfig = getStatusConfig(evaluation.status);
                const participationRate = evaluation.total_alunos > 0
                  ? (evaluation.alunos_participantes / evaluation.total_alunos) * 100
                  : 0;

                return (
                  <div key={`${evaluation.id}-${index}`} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      {/* Informações principais */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{formatFieldValue(evaluation.titulo, 'Título não informado')}</h3>
                          <Badge className={statusConfig.color}>
                            {statusConfig.label}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Badge variant="outline">{formatFieldValue(evaluation.disciplina, 'Disciplina não informada')}</Badge>
                            <span>•</span>
                            <span>{getGradeName(evaluation.serie, evaluation.grade_id, evaluation)}</span>
                            <span>•</span>
                            <span>{formatFieldValue(evaluation.turma, 'Turma não informada')}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <School className="h-4 w-4" />
                            <span>{formatFieldValue(evaluation.escola, 'Escola não informada')}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>{formatFieldValue(evaluation.municipio, 'Município não informado')}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {evaluation.alunos_participantes}/{evaluation.total_alunos} alunos
                            </span>
                            <Progress value={participationRate} className="w-20 h-2" />
                          </div>

                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              Média: {evaluation.media_nota.toFixed(1)}
                            </span>
                            {evaluation.media_nota >= 7 ? (
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-orange-600" />
                            )}
                          </div>

                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(evaluation.data_aplicacao), {
                              addSuffix: true,
                              locale: ptBR
                            })}
                          </div>
                        </div>

                        {/* Distribuição de classificação com gráfico visual */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">Distribuição de Proficiência:</span>
                          </div>
                          <div className="flex items-end gap-1 h-16">
                            {/* Gráfico de barras */}
                            <div key="abaixo-basico" className="flex-1 flex flex-col items-center">
                              <div
                                className="w-full bg-red-500 rounded-t-sm transition-all hover:bg-red-600"
                                style={{
                                  height: `${Math.max(10, (evaluation.distribuicao_classificacao.abaixo_do_basico / Math.max(1, evaluation.total_alunos)) * 100)}%`
                                }}
                                title={`Abaixo do Básico: ${evaluation.distribuicao_classificacao.abaixo_do_basico} alunos`}
                              />
                              <span className="text-xs text-red-600 font-medium mt-1">
                                {evaluation.distribuicao_classificacao.abaixo_do_basico}
                              </span>
                            </div>
                            <div key="basico" className="flex-1 flex flex-col items-center">
                              <div
                                className="w-full bg-yellow-500 rounded-t-sm transition-all hover:bg-yellow-600"
                                style={{
                                  height: `${Math.max(10, (evaluation.distribuicao_classificacao.basico / Math.max(1, evaluation.total_alunos)) * 100)}%`
                                }}
                                title={`Básico: ${evaluation.distribuicao_classificacao.basico} alunos`}
                              />
                              <span className="text-xs text-yellow-600 font-medium mt-1">
                                {evaluation.distribuicao_classificacao.basico}
                              </span>
                            </div>
                            <div key="adequado" className="flex-1 flex flex-col items-center">
                              <div
                                className="w-full bg-blue-500 rounded-t-sm transition-all hover:bg-blue-600"
                                style={{
                                  height: `${Math.max(10, (evaluation.distribuicao_classificacao.adequado / Math.max(1, evaluation.total_alunos)) * 100)}%`
                                }}
                                title={`Adequado: ${evaluation.distribuicao_classificacao.adequado} alunos`}
                              />
                              <span className="text-xs text-blue-600 font-medium mt-1">
                                {evaluation.distribuicao_classificacao.adequado}
                              </span>
                            </div>
                            <div key="avancado" className="flex-1 flex flex-col items-center">
                              <div
                                className="w-full bg-green-500 rounded-t-sm transition-all hover:bg-green-600"
                                style={{
                                  height: `${Math.max(10, (evaluation.distribuicao_classificacao.avancado / Math.max(1, evaluation.total_alunos)) * 100)}%`
                                }}
                                title={`Avançado: ${evaluation.distribuicao_classificacao.avancado} alunos`}
                              />
                              <span className="text-xs text-green-600 font-medium mt-1">
                                {evaluation.distribuicao_classificacao.avancado}
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Abaixo</span>
                            <span>Básico</span>
                            <span>Adequado</span>
                            <span>Avançado</span>
                          </div>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => handleViewResults(evaluation.id)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Resultados
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleExportResults(evaluation.id)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Exportar
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhuma avaliação encontrada
              </h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all' || subjectFilter !== 'all' || yearFilter !== 'all' || 
                 schoolFilter !== 'all' || evaluationFilter !== 'all' || gradeFilter !== 'all' || 
                 classFilter !== 'all'
                  ? 'Tente ajustar os filtros para ver mais resultados.'
                  : 'Ainda não há avaliações com resultados disponíveis. Verifique se o backend está rodando e se há dados cadastrados.'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && subjectFilter === 'all' && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700">
                    💡 Dica: Certifique-se de que o backend está rodando em <code className="bg-blue-100 px-1 rounded">http://localhost:5000</code> e que há avaliações cadastradas no sistema.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Paginação */}
          {!isLoading && !isSpecificEvaluation && totalPages > 1 && (
            <div className="mt-6 border-t pt-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Informações da página */}
                <div className="text-sm text-muted-foreground">
                  {isLoadingPage ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Carregando...
                    </div>
                  ) : (
                    `Mostrando ${((currentPage - 1) * perPage) + 1} a ${Math.min(currentPage * perPage, totalEvaluations)} de ${totalEvaluations} avaliações`
                  )}
                </div>

                {/* Controles de paginação */}
                <div className="flex items-center gap-2">
                  {/* Seletor de itens por página */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Itens por página:</span>
                    <Select value={perPage.toString()} onValueChange={(value) => handlePerPageChange(Number(value))} disabled={isLoadingPage}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Navegação de páginas */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1 || isLoadingPage}
                    >
                      Anterior
                    </Button>

                    {/* Páginas numeradas */}
                    <div className="flex items-center gap-1">
                      {(() => {
                        const pages = [];
                        const maxVisiblePages = 5;
                        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

                        // Ajustar se não há páginas suficientes
                        if (endPage - startPage + 1 < maxVisiblePages) {
                          startPage = Math.max(1, endPage - maxVisiblePages + 1);
                        }

                        // Primeira página
                        if (startPage > 1) {
                          pages.push(
                            <Button
                              key="1"
                              variant="outline"
                              size="sm"
                              onClick={() => handlePageChange(1)}
                              disabled={isLoadingPage}
                              className="w-8 h-8"
                            >
                              1
                            </Button>
                          );
                          if (startPage > 2) {
                            pages.push(
                              <span key="ellipsis1" className="px-2 text-muted-foreground">
                                ...
                              </span>
                            );
                          }
                        }

                        // Páginas do meio
                        for (let i = startPage; i <= endPage; i++) {
                          pages.push(
                            <Button
                              key={i}
                              variant={currentPage === i ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(i)}
                              disabled={isLoadingPage}
                              className="w-8 h-8"
                            >
                              {i}
                            </Button>
                          );
                        }

                        // Última página
                        if (endPage < totalPages) {
                          if (endPage < totalPages - 1) {
                            pages.push(
                              <span key="ellipsis2" className="px-2 text-muted-foreground">
                                ...
                              </span>
                            );
                          }
                          pages.push(
                            <Button
                              key={totalPages}
                              variant="outline"
                              size="sm"
                              onClick={() => handlePageChange(totalPages)}
                              disabled={isLoadingPage}
                              className="w-8 h-8"
                            >
                              {totalPages}
                            </Button>
                          );
                        }

                        return pages;
                      })()}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages || isLoadingPage}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 