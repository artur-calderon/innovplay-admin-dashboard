import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart3, 
  Download,
  TrendingUp,
  Users,
  FileText,
  Calendar,
  ClipboardCheck,
  Eye
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import EvaluationResults from "@/components/evaluations/EvaluationResults";
import EvaluationReport from "@/components/evaluations/EvaluationReport";
import { useToast } from "@/hooks/use-toast";
import * as mockApi from "@/services/mockResultsData";

interface ResultsStats {
  completedEvaluations: number;
  pendingResults: number;
  totalEvaluations: number;
  averageScore: number;
  lastWeekEvaluations: number;
  correctedToday: number;
}

export default function Results() {
  const [stats, setStats] = useState<ResultsStats>({
    completedEvaluations: 0,
    pendingResults: 0,
    totalEvaluations: 0,
    averageScore: 0,
    lastWeekEvaluations: 0,
    correctedToday: 0
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchResultsStats();
  }, []);

  const fetchResultsStats = async () => {
    try {
      setIsLoadingStats(true);
      
      // Simulação de dados - substituir por API real
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const resultsData = await mockApi.getEvaluationResults();
      const completedResults = resultsData.filter(r => r.status === 'completed');
      const pendingResults = resultsData.filter(r => r.status === 'pending');
      
      setStats({
        completedEvaluations: completedResults.length,
        pendingResults: pendingResults.length,
        totalEvaluations: resultsData.length,
        averageScore: completedResults.length > 0 
          ? Math.round(completedResults.reduce((sum, r) => sum + (r.score || 0), 0) / completedResults.length) 
          : 0,
        lastWeekEvaluations: Math.floor(resultsData.length * 0.6),
        correctedToday: Math.floor(pendingResults.length * 0.3)
      });
    } catch (error) {
      console.error("Erro ao buscar estatísticas de resultados:", error);
    } finally {
      setIsLoadingStats(false);
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
          <h1 className="text-xl md:text-2xl font-bold">Resultados das Avaliações</h1>
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

      {/* Estatísticas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avaliações Concluídas
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isLoadingStats ? <Skeleton className="h-8 w-16" /> : stats.completedEvaluations}
            </div>
            <p className="text-xs text-muted-foreground">
              Com resultados disponíveis
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pendentes de Correção
            </CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
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
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
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
      </div>

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

      {/* Cards de Estatísticas Detalhadas */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Atividade Recente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">Correções finalizadas hoje</span>
              </div>
              <span className="text-lg font-bold text-green-600">{stats.correctedToday}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium">Avaliações desta semana</span>
              </div>
              <span className="text-lg font-bold text-blue-600">{stats.lastWeekEvaluations}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-sm font-medium">Média de desempenho</span>
              </div>
              <span className="text-lg font-bold text-purple-600">{stats.averageScore}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Estatísticas Gerais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Avaliações Concluídas</span>
                  <span className="text-sm text-muted-foreground">
                    {stats.completedEvaluations}/{stats.totalEvaluations}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                    style={{ 
                      width: stats.totalEvaluations > 0 
                        ? `${(stats.completedEvaluations / stats.totalEvaluations) * 100}%` 
                        : '0%' 
                    }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Pendentes de Correção</span>
                  <span className="text-sm text-muted-foreground">
                    {stats.pendingResults}/{stats.totalEvaluations}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-orange-600 h-2 rounded-full transition-all duration-300" 
                    style={{ 
                      width: stats.totalEvaluations > 0 
                        ? `${(stats.pendingResults / stats.totalEvaluations) * 100}%` 
                        : '0%' 
                    }}
                  ></div>
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="text-center">
                  <div className="text-lg font-bold">{stats.totalEvaluations}</div>
                  <div className="text-sm text-muted-foreground">Total de Avaliações</div>
                </div>
              </div>
            </div>
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