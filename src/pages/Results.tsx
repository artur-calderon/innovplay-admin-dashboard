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
  GraduationCap
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
  escola: string;
  municipio: string;
  data_aplicacao: string;
  status: 'concluida' | 'em_andamento' | 'pendente';
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
  const { user } = useAuth();
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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [evaluationId]);

  // Filtrar avaliações baseado nos filtros
  useEffect(() => {
    let filtered = evaluationsList;

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(evaluation =>
        evaluation.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        evaluation.disciplina.toLowerCase().includes(searchTerm.toLowerCase()) ||
        evaluation.escola.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(evaluation => evaluation.status === statusFilter);
    }

    // Filtro por disciplina
    if (subjectFilter !== 'all') {
      filtered = filtered.filter(evaluation => evaluation.disciplina === subjectFilter);
    }

    setFilteredEvaluations(filtered);
  }, [evaluationsList, searchTerm, statusFilter, subjectFilter]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([fetchResultsStats(), fetchEvaluationsList()]);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados dos resultados",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchResultsStats = async () => {
    try {
      const evaluations = await EvaluationResultsApiService.getEvaluationsList();

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

      setStats({
        totalEvaluations: evaluations.length,
        totalStudents: totalStudents,
        averageScore: averageScore,
        completedEvaluations: completedEvaluations,
        topPerformanceSubject: topSubject.subject,
      });
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as estatísticas",
        variant: "destructive",
      });
    }
  };

  const fetchEvaluationsList = async () => {
    try {
      const evaluations = await EvaluationResultsApiService.getEvaluationsList();

      if (evaluationId) {
        // Se há um ID específico, filtrar apenas essa avaliação
        const specificEvaluation = evaluations.filter((evaluation: EvaluationResult) => evaluation.id === evaluationId);
        setEvaluationsList(specificEvaluation);
      } else {
        setEvaluationsList(evaluations);
      }
    } catch (error) {
      console.error("Erro ao buscar avaliações:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a lista de avaliações",
        variant: "destructive",
      });
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
    };
    return configs[status];
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
        ['Avaliação', 'Disciplina', 'Escola', 'Série', 'Município', 'Participantes', 'Média', 'Proficiência', 'Status'],
        ...dataToExport.map(evaluation => [
          evaluation.titulo,
          evaluation.disciplina,
          evaluation.escola,
          evaluation.serie,
          evaluation.municipio,
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4 text-orange-600" />
              Melhor Disciplina
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold text-orange-600">
              {isLoading ? <Skeleton className="h-6 w-20" /> : stats.topPerformanceSubject}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Maior média de desempenho
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Busca */}
      {!isSpecificEvaluation && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome da avaliação, disciplina ou escola..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Disciplina" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Disciplinas</SelectItem>
                  {uniqueSubjects.map(subject => (
                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              {filteredEvaluations.length} {filteredEvaluations.length === 1 ? 'avaliação' : 'avaliações'}
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
          ) : filteredEvaluations.length > 0 ? (
            <div className="space-y-4">
              {filteredEvaluations.map((evaluation) => {
                const statusConfig = getStatusConfig(evaluation.status);
                const participationRate = evaluation.total_alunos > 0
                  ? (evaluation.alunos_participantes / evaluation.total_alunos) * 100
                  : 0;

                return (
                  <div key={evaluation.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      {/* Informações principais */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{evaluation.titulo}</h3>
                          <Badge className={statusConfig.color}>
                            {statusConfig.label}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Badge variant="outline">{evaluation.disciplina}</Badge>
                            <span>•</span>
                            <span>{evaluation.serie}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <School className="h-4 w-4" />
                            <span>{evaluation.escola}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>{evaluation.municipio}</span>
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

                        {/* Distribuição de classificação */}
                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-muted-foreground">Distribuição:</span>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="text-red-600 border-red-300">
                              Abaixo: {evaluation.distribuicao_classificacao.abaixo_do_basico}
                            </Badge>
                            <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                              Básico: {evaluation.distribuicao_classificacao.basico}
                            </Badge>
                            <Badge variant="outline" className="text-blue-600 border-blue-300">
                              Adequado: {evaluation.distribuicao_classificacao.adequado}
                            </Badge>
                            <Badge variant="outline" className="text-green-600 border-green-300">
                              Avançado: {evaluation.distribuicao_classificacao.avancado}
                            </Badge>
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
                {searchTerm || statusFilter !== 'all' || subjectFilter !== 'all'
                  ? 'Tente ajustar os filtros para ver mais resultados.'
                  : 'Ainda não há avaliações com resultados disponíveis.'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 