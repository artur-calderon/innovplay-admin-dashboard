import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  BarChart3, 
  Download,
  TrendingUp,
  Users,
  FileText,
  ClipboardCheck,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Target,
  Award,
  ChartLine
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ResultsStats {
  completedEvaluations: number;
  pendingResults: number;
  totalEvaluations: number;
  averageScore: number;
  totalStudents: number;
  averageCompletionTime: number;
  topPerformanceSubject: string;
}

interface EvaluationSummary {
  id: string;
  title: string;
  subject: string;
  completedStudents: number;
  totalStudents: number;
  averageScore: number;
  status: 'completed' | 'pending' | 'correcting';
  lastUpdated: string;
  proficiencyLevel: 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado';
}

export default function Results() {
  const [stats, setStats] = useState<ResultsStats>({
    completedEvaluations: 0,
    pendingResults: 0,
    totalEvaluations: 0,
    averageScore: 0,
    totalStudents: 0,
    averageCompletionTime: 0,
    topPerformanceSubject: '',
  });
  const [evaluationsList, setEvaluationsList] = useState<EvaluationSummary[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchResultsStats();
    fetchEvaluationsList();
  }, []);

  const fetchResultsStats = async () => {
    try {
      setIsLoadingStats(true);
      
      // Buscar estatísticas reais da API
      const response = await api.get('/evaluation-results/stats');
      
      if (response.data) {
        setStats({
          completedEvaluations: response.data.completed_evaluations || 0,
          pendingResults: response.data.pending_results || 0,
          totalEvaluations: response.data.total_evaluations || 0,
          averageScore: response.data.average_score || 0,
          totalStudents: response.data.total_students || 0,
          averageCompletionTime: response.data.average_completion_time || 0,
          topPerformanceSubject: response.data.top_performance_subject || 'Não disponível',
        });
      }
    } catch (error) {
      console.error("Erro ao buscar estatísticas de resultados:", error);
      toast({
        title: "Erro ao carregar estatísticas",
        description: "Não foi possível carregar as estatísticas. Verifique a conexão com o servidor.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingStats(false);
    }
  };

  const fetchEvaluationsList = async () => {
    try {
      setIsLoadingList(true);
      
      // Buscar lista de avaliações com resultados da API
      const response = await api.get('/evaluation-results/list');
      
      if (response.data && Array.isArray(response.data)) {
        const evaluationsWithResults: EvaluationSummary[] = response.data.map((evaluation: any) => ({
          id: evaluation.id,
          title: evaluation.title,
          subject: evaluation.subject_name || 'Sem disciplina',
          completedStudents: evaluation.completed_students || 0,
          totalStudents: evaluation.total_students || 0,
          averageScore: evaluation.average_score || 0,
          status: mapEvaluationStatus(evaluation.status),
          lastUpdated: evaluation.last_updated || evaluation.created_at,
          proficiencyLevel: calculateProficiencyLevel(evaluation.average_score || 0)
        }));

        setEvaluationsList(evaluationsWithResults);
      } else {
        setEvaluationsList([]);
      }
    } catch (error) {
      console.error("Erro ao buscar lista de avaliações:", error);
      toast({
        title: "Erro ao carregar avaliações",
        description: "Não foi possível carregar a lista de avaliações.",
        variant: "destructive",
      });
      setEvaluationsList([]);
    } finally {
      setIsLoadingList(false);
    }
  };

  const mapEvaluationStatus = (status: string): EvaluationSummary['status'] => {
    switch (status) {
      case 'completed':
      case 'finalized':
        return 'completed';
      case 'correcting':
      case 'in_correction':
        return 'correcting';
      default:
        return 'pending';
    }
  };

  const calculateProficiencyLevel = (score: number): EvaluationSummary['proficiencyLevel'] => {
    if (score >= 80) return 'Avançado';
    if (score >= 65) return 'Adequado';
    if (score >= 50) return 'Básico';
    return 'Abaixo do Básico';
  };

  const getStatusBadge = (status: EvaluationSummary['status']) => {
    const configs = {
      completed: { label: "Concluída", variant: "default" as const, icon: CheckCircle2, color: "text-green-600" },
      correcting: { label: "Corrigindo", variant: "secondary" as const, icon: Clock, color: "text-orange-600" },
      pending: { label: "Pendente", variant: "outline" as const, icon: AlertTriangle, color: "text-gray-600" },
    };
    
    const config = configs[status];
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        {config.label}
      </Badge>
    );
  };

  const getProficiencyColor = (proficiency: string) => {
    switch (proficiency) {
      case 'Avançado': return 'text-green-100 bg-green-800 border-green-700';
      case 'Adequado': return 'text-green-800 bg-green-100 border-green-300';
      case 'Básico': return 'text-yellow-800 bg-yellow-100 border-yellow-300';
      case 'Abaixo do Básico': return 'text-red-800 bg-red-100 border-red-300';
      default: return 'text-gray-600 bg-gray-100 border-gray-300';
    }
  };

  const handleViewEvaluationResults = (evaluationId: string) => {
    navigate(`/app/avaliacao/${evaluationId}/resultados`);
  };

  const handleCorrectNow = () => {
    navigate("/app/avaliacoes/correcao");
  };

  const handleExportResults = async (evaluationId?: string) => {
    try {
      const endpoint = evaluationId 
        ? `/evaluation-results/${evaluationId}/export`
        : '/evaluation-results/export-all';
      
      const response = await api.get(endpoint, { responseType: 'blob' });
      
      // Criar download do arquivo
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `resultados-${evaluationId || 'todos'}-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
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

  return (
    <div className="container mx-auto px-2 md:px-4 py-4 md:py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Dashboard de Resultados</h1>
          <p className="text-muted-foreground">
            Acompanhe o desempenho dos alunos e gere relatórios detalhados
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExportResults()}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Tudo
          </Button>
        </div>
      </div>

      {/* Estatísticas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avaliações Concluídas
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isLoadingStats ? <Skeleton className="h-8 w-16" /> : stats.completedEvaluations}
            </div>
            <p className="text-xs text-muted-foreground">
              Avaliações finalizadas
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pendentes de Correção
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {isLoadingStats ? <Skeleton className="h-8 w-16" /> : stats.pendingResults}
            </div>
            <p className="text-xs text-muted-foreground">
              Aguardando correção
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Média de Desempenho
            </CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {isLoadingStats ? <Skeleton className="h-8 w-16" /> : `${stats.averageScore}%`}
            </div>
            <p className="text-xs text-muted-foreground">
              Média geral dos alunos
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Alunos
            </CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {isLoadingStats ? <Skeleton className="h-8 w-16" /> : stats.totalStudents}
            </div>
            <p className="text-xs text-muted-foreground">
              Participaram das avaliações
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Métricas Adicionais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tempo Médio
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingStats ? <Skeleton className="h-8 w-16" /> : `${stats.averageCompletionTime}min`}
            </div>
            <p className="text-xs text-muted-foreground">
              Por avaliação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Melhor Disciplina
            </CardTitle>
            <Award className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-yellow-600">
              {isLoadingStats ? <Skeleton className="h-6 w-20" /> : stats.topPerformanceSubject}
            </div>
            <p className="text-xs text-muted-foreground">
              Maior média de acertos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Avaliações
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingStats ? <Skeleton className="h-8 w-16" /> : stats.totalEvaluations}
            </div>
            <p className="text-xs text-muted-foreground">
              Avaliações no sistema
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Avaliações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Avaliações com Resultados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingList ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-[80px]" />
                  <Skeleton className="h-4 w-[60px]" />
                </div>
              ))}
            </div>
          ) : evaluationsList.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Avaliação</TableHead>
                    <TableHead>Disciplina</TableHead>
                    <TableHead>Progresso</TableHead>
                    <TableHead>Média</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Proficiência</TableHead>
                    <TableHead>Atualizado</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evaluationsList.map((evaluation) => (
                    <TableRow key={evaluation.id}>
                      <TableCell className="font-medium">{evaluation.title}</TableCell>
                      <TableCell>{evaluation.subject}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Progress 
                            value={evaluation.totalStudents > 0 ? (evaluation.completedStudents / evaluation.totalStudents) * 100 : 0} 
                            className="w-16"
                          />
                          <span className="text-xs text-muted-foreground">
                            {evaluation.completedStudents}/{evaluation.totalStudents}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`font-semibold ${
                          evaluation.averageScore >= 70 ? 'text-green-600' : 
                          evaluation.averageScore >= 50 ? 'text-yellow-600' : 
                          'text-red-600'
                        }`}>
                          {evaluation.averageScore}%
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(evaluation.status)}</TableCell>
                      <TableCell>
                        <Badge className={getProficiencyColor(evaluation.proficiencyLevel)}>
                          {evaluation.proficiencyLevel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(evaluation.lastUpdated), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleViewEvaluationResults(evaluation.id)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Ver
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleExportResults(evaluation.id)}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhuma avaliação com resultados
              </h3>
              <p className="text-gray-600">
                Ainda não há avaliações finalizadas com resultados disponíveis.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cards de Ações */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/app/avaliacoes/resultados')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-5 w-5 text-green-600" />
              Visualizar Resultados Detalhados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 mb-2">
              {stats.completedEvaluations}
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Resultados prontos para análise
            </p>
            <Button variant="outline" size="sm" className="w-full">
              <Eye className="h-4 w-4 mr-2" />
              Ver Resultados
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handleCorrectNow}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-orange-600" />
              Correções Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 mb-2">
              {stats.pendingResults}
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Avaliações aguardando correção
            </p>
            <Button variant="outline" size="sm" className="w-full">
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Corrigir Agora
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleExportResults()}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Relatórios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 mb-2">
              {stats.totalEvaluations}
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Relatórios disponíveis
            </p>
            <Button variant="outline" size="sm" className="w-full">
              <BarChart3 className="h-4 w-4 mr-2" />
              Exportar Relatório
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <Button variant="outline" onClick={() => navigate('/app/avaliacoes/resultados')} className="h-auto py-3">
              <div className="text-center">
                <Eye className="h-6 w-6 mx-auto mb-2" />
                <div className="text-sm">Ver Resultados</div>
              </div>
            </Button>
            <Button variant="outline" onClick={handleCorrectNow} className="h-auto py-3">
              <div className="text-center">
                <ClipboardCheck className="h-6 w-6 mx-auto mb-2" />
                <div className="text-sm">Corrigir Avaliações</div>
              </div>
            </Button>
            <Button variant="outline" onClick={() => handleExportResults()} className="h-auto py-3">
              <div className="text-center">
                <BarChart3 className="h-6 w-6 mx-auto mb-2" />
                <div className="text-sm">Gerar Relatórios</div>
              </div>
            </Button>
            <Button variant="outline" onClick={fetchResultsStats} className="h-auto py-3">
              <div className="text-center">
                <TrendingUp className="h-6 w-6 mx-auto mb-2" />
                <div className="text-sm">Atualizar Dados</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 