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
  TrendingDown,
  Users,
  FileText,
  Calendar,
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
import EvaluationResults from "@/components/evaluations/EvaluationResults";
import EvaluationReport from "@/components/evaluations/EvaluationReport";
import { useToast } from "@/hooks/use-toast";
import { useEvaluations } from "@/stores/useEvaluationStore";
import * as mockApi from "@/services/mockResultsData";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ResultsStats {
  completedEvaluations: number;
  pendingResults: number;
  totalEvaluations: number;
  averageScore: number;
  lastWeekEvaluations: number;
  correctedToday: number;
  totalStudents: number;
  averageCompletionTime: number;
  topPerformanceSubject: string;
  improvementRate: number;
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
  difficulty: 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado';
}

export default function Results() {
  const [stats, setStats] = useState<ResultsStats>({
    completedEvaluations: 0,
    pendingResults: 0,
    totalEvaluations: 0,
    averageScore: 0,
    lastWeekEvaluations: 0,
    correctedToday: 0,
    totalStudents: 0,
    averageCompletionTime: 0,
    topPerformanceSubject: '',
    improvementRate: 0
  });
  const [evaluationsList, setEvaluationsList] = useState<EvaluationSummary[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { evaluations, getEvaluations } = useEvaluations();

  useEffect(() => {
    fetchResultsStats();
    fetchEvaluationsList();
  }, []);

  const fetchResultsStats = async () => {
    try {
      setIsLoadingStats(true);
      
      // Simular dados mais ricos
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const resultsData = await mockApi.getEvaluationResults();
      const completedResults = resultsData.filter(r => r.status === 'completed');
      const pendingResults = resultsData.filter(r => r.status === 'pending');
      
      // Dados do store
      const storeEvaluations = getEvaluations();
      
      // Calcular métricas avançadas
      const totalStudents = resultsData.reduce((sum, r) => sum + (r.totalStudents || 0), 0);
      const averageCompletionTime = completedResults.length > 0
        ? completedResults.reduce((sum, r) => sum + (r.completionTime || 45), 0) / completedResults.length
        : 0;
      
      // Análise por disciplina
      const subjectScores: Record<string, number[]> = {};
      completedResults.forEach(result => {
        if (!subjectScores[result.subject]) {
          subjectScores[result.subject] = [];
        }
        subjectScores[result.subject].push(result.score || 0);
      });
      
      const subjectAverages = Object.entries(subjectScores).map(([subject, scores]) => ({
        subject,
        average: scores.reduce((sum, score) => sum + score, 0) / scores.length
      }));
      
      const topSubject = subjectAverages.length > 0
        ? subjectAverages.sort((a, b) => b.average - a.average)[0].subject
        : 'Matemática';

      setStats({
        completedEvaluations: completedResults.length,
        pendingResults: pendingResults.length,
        totalEvaluations: resultsData.length,
        averageScore: completedResults.length > 0 
          ? Math.round(completedResults.reduce((sum, r) => sum + (r.score || 0), 0) / completedResults.length) 
          : 0,
        lastWeekEvaluations: Math.floor(resultsData.length * 0.6),
        correctedToday: Math.floor(pendingResults.length * 0.3),
        totalStudents,
        averageCompletionTime: Math.round(averageCompletionTime),
        topPerformanceSubject: topSubject,
        improvementRate: Math.round(Math.random() * 20 + 5) // Simulado
      });
    } catch (error) {
      console.error("Erro ao buscar estatísticas de resultados:", error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const fetchEvaluationsList = async () => {
    try {
      setIsLoadingList(true);
      
      const resultsData = await mockApi.getEvaluationResults();
      const storeEvaluations = getEvaluations();
      
      // Combinar dados do store com resultados
      const evaluationsWithResults: EvaluationSummary[] = storeEvaluations.map(evaluation => {
        const result = resultsData.find(r => r.evaluationId === evaluation.id);
        
        return {
          id: evaluation.id,
          title: evaluation.title,
          subject: evaluation.subject.name,
          completedStudents: result?.completedStudents || 0,
          totalStudents: evaluation.students?.length || 0,
          averageScore: result?.score || 0,
          status: result?.status === 'completed' ? 'completed' : 
                  result?.status === 'pending' ? 'correcting' : 'pending',
          lastUpdated: result?.submittedAt || evaluation.createdAt,
          difficulty: ['Abaixo do Básico', 'Básico', 'Adequado', 'Avançado'][Math.floor(Math.random() * 4)] as 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado'
        };
      });

      setEvaluationsList(evaluationsWithResults);
    } catch (error) {
      console.error("Erro ao buscar lista de avaliações:", error);
    } finally {
      setIsLoadingList(false);
    }
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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Avançado': return 'text-green-100 bg-green-800 border-green-700';
      case 'Adequado': return 'text-green-800 bg-green-100 border-green-300';
      case 'Básico': return 'text-yellow-800 bg-yellow-100 border-yellow-300';
      case 'Abaixo do Básico': return 'text-red-800 bg-red-100 border-red-300';
      default: return 'text-gray-600 bg-gray-100 border-gray-300';
    }
  };

  const handleViewResults = () => {
    setShowResults(true);
  };

  const handleCorrectNow = () => {
    toast({
      title: "Redirecionando",
      description: "Abrindo página de correção...",
    });
    navigate("/app/avaliacoes/correcao");
  };

  const handleGenerateReport = () => {
    setShowReport(true);
  };

  const handleExportAll = async () => {
    try {
      const allResults = await mockApi.getEvaluationResults();
      const allIds = allResults.map(result => result.id);
      const response = await mockApi.exportResults(allIds);
      
      if (response.success) {
        toast({
          title: "Exportação concluída!",
          description: "Todos os resultados foram exportados com sucesso.",
        });
      }
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar os resultados",
        variant: "destructive",
      });
    }
  };

  // If showing results, render the EvaluationResults component
  if (showResults) {
    return <EvaluationResults onBack={() => setShowResults(false)} />;
  }

  // If showing report, render the EvaluationReport component
  if (showReport) {
    return <EvaluationReport onBack={() => setShowReport(false)} />;
  }

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
          <Button variant="outline" size="sm" onClick={handleExportAll}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Tudo
          </Button>
        </div>
      </div>

      {/* Estatísticas Principais - Primeira Linha */}
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
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              +{stats.improvementRate}% este mês
            </div>
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
              Aguardando correção manual
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

      {/* Métricas de Performance - Segunda Linha */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              Esta Semana
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingStats ? <Skeleton className="h-8 w-16" /> : stats.lastWeekEvaluations}
            </div>
            <p className="text-xs text-muted-foreground">
              Avaliações realizadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Correções Hoje
            </CardTitle>
            <ChartLine className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isLoadingStats ? <Skeleton className="h-8 w-16" /> : stats.correctedToday}
            </div>
            <p className="text-xs text-muted-foreground">
              Finalizadas hoje
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Avaliações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Avaliações Recentes
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
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Avaliação</TableHead>
                    <TableHead>Disciplina</TableHead>
                    <TableHead>Progresso</TableHead>
                    <TableHead>Média</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dificuldade</TableHead>
                    <TableHead>Atualizado</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evaluationsList.slice(0, 8).map((evaluation) => (
                    <TableRow key={evaluation.id}>
                      <TableCell className="font-medium">{evaluation.title}</TableCell>
                      <TableCell>{evaluation.subject}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Progress 
                            value={(evaluation.completedStudents / evaluation.totalStudents) * 100} 
                            className="w-16"
                          />
                          <span className="text-xs text-muted-foreground">
                            {evaluation.completedStudents}/{evaluation.totalStudents}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`font-semibold ${evaluation.averageScore >= 70 ? 'text-green-600' : evaluation.averageScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {evaluation.averageScore}%
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(evaluation.status)}</TableCell>
                      <TableCell>
                        <Badge className={getDifficultyColor(evaluation.difficulty)}>
                          {evaluation.difficulty}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(evaluation.lastUpdated), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/app/avaliacoes/${evaluation.id}`)}>
                          <Eye className="h-3 w-3 mr-1" />
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cards de Ações */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handleViewResults}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-5 w-5 text-green-600" />
              Visualizar Resultados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 mb-2">
              {stats.completedEvaluations}
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Resultados prontos para visualização
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

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handleGenerateReport}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Relatórios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 mb-2">
              {stats.completedEvaluations + stats.pendingResults}
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Relatórios disponíveis
            </p>
            <Button variant="outline" size="sm" className="w-full">
              <BarChart3 className="h-4 w-4 mr-2" />
              Gerar Relatório
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
            <Button variant="outline" onClick={handleViewResults} className="h-auto py-3">
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
            <Button variant="outline" onClick={handleGenerateReport} className="h-auto py-3">
              <div className="text-center">
                <BarChart3 className="h-6 w-6 mx-auto mb-2" />
                <div className="text-sm">Gerar Relatórios</div>
              </div>
            </Button>
            <Button variant="outline" onClick={handleExportAll} className="h-auto py-3">
              <div className="text-center">
                <Download className="h-6 w-6 mx-auto mb-2" />
                <div className="text-sm">Exportar Dados</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 