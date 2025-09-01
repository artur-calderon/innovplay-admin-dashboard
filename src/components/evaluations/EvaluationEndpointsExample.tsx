import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  useEvaluationStatusStats,
  useBulkEvaluationStatusCheck 
} from '@/hooks/use-cache';
import { EvaluationResultsApiService } from '@/services/evaluationResultsApi';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw, 
  Calculator, 
  Flag, 
  Search,
  BarChart3,
  FileText,
  AlertTriangle
} from 'lucide-react';

// Componente demonstrando todos os endpoints de avaliações
export function EvaluationEndpointsExample() {
  const { toast } = useToast();
  const [evaluationId, setEvaluationId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  // Usar hooks existentes
  const { data: statusStats, isLoading: loadingStatus } = useEvaluationStatusStats();
  const { checkAllEvaluations, isChecking, lastCheck } = useBulkEvaluationStatusCheck();

  // Funções para demonstrar cada endpoint
  const handleGetEvaluationStats = async () => {
    if (!evaluationId) {
      toast({
        title: "Erro",
        description: "Por favor, informe o ID da avaliação",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await EvaluationResultsApiService.getEvaluationSpecificStats(evaluationId);
      setResults(result);
      toast({
        title: "Sucesso",
        description: "Estatísticas da avaliação carregadas!"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar estatísticas",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalculateEvaluation = async () => {
    if (!evaluationId) {
      toast({
        title: "Erro",
        description: "Por favor, informe o ID da avaliação",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await EvaluationResultsApiService.calculateEvaluationResults(evaluationId);
      setResults(result);
      toast({
        title: "Sucesso",
        description: "Cálculo da avaliação iniciado!"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao calcular avaliação",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalizeEvaluation = async () => {
    if (!evaluationId) {
      toast({
        title: "Erro",
        description: "Por favor, informe o ID da avaliação",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await EvaluationResultsApiService.finalizeEvaluation(evaluationId);
      setResults(result);
      toast({
        title: result?.success ? "Sucesso" : "Erro",
        description: result?.message || "Operação concluída",
        variant: result?.success ? "default" : "destructive"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao finalizar avaliação",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckEvaluationStatus = async () => {
    if (!evaluationId) {
      toast({
        title: "Erro",
        description: "Por favor, informe o ID da avaliação",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await EvaluationResultsApiService.checkEvaluationStatus(evaluationId);
      setResults(result);
      toast({
        title: "Sucesso",
        description: "Status verificado!"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao verificar status",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetStatusSummary = async () => {
    if (!evaluationId) {
      toast({
        title: "Erro",
        description: "Por favor, informe o ID da avaliação",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await EvaluationResultsApiService.getEvaluationStatusSummary(evaluationId);
      setResults(result);
      toast({
        title: "Sucesso",
        description: "Resumo de status carregado!"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar resumo",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckAllEvaluations = async () => {
    const result = await checkAllEvaluations({
      // Você pode adicionar filtros aqui se necessário
    });
    
    if (result) {
      setResults(result);
      toast({
        title: "Verificação Completa",
        description: `${result.total_verificadas} avaliações verificadas, ${result.avaliacoes_atualizadas} atualizadas`
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Controles de Entrada */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Teste dos Endpoints de Avaliações
          </CardTitle>
          <CardDescription>
            Demonstração de todos os endpoints implementados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="evaluationId">ID da Avaliação</Label>
            <Input
              id="evaluationId"
              value={evaluationId}
              onChange={(e) => setEvaluationId(e.target.value)}
              placeholder="Digite o ID da avaliação para testar endpoints específicos"
            />
          </div>
        </CardContent>
      </Card>

      {/* Endpoints Específicos por Avaliação */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Estatísticas
            </CardTitle>
            <CardDescription className="text-xs">
              GET /avaliacoes/{`{id}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleGetEvaluationStats} 
              disabled={isLoading || !evaluationId}
              size="sm"
              className="w-full"
            >
              {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Obter Estatísticas
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Calcular
            </CardTitle>
            <CardDescription className="text-xs">
              POST /avaliacoes/calcular
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleCalculateEvaluation} 
              disabled={isLoading || !evaluationId}
              size="sm"
              className="w-full"
              variant="outline"
            >
              {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
              Calcular Resultados
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Flag className="h-4 w-4" />
              Finalizar
            </CardTitle>
            <CardDescription className="text-xs">
              PATCH /avaliacoes/{`{id}`}/finalizar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleFinalizeEvaluation} 
              disabled={isLoading || !evaluationId}
              size="sm"
              className="w-full"
              variant="destructive"
            >
              {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
              Finalizar
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Verificar Status
            </CardTitle>
            <CardDescription className="text-xs">
              POST /avaliacoes/{`{id}`}/verificar-status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleCheckEvaluationStatus} 
              disabled={isLoading || !evaluationId}
              size="sm"
              className="w-full"
              variant="secondary"
            >
              {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Verificar Status
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Resumo Status
            </CardTitle>
            <CardDescription className="text-xs">
              GET /avaliacoes/{`{id}`}/status-resumo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleGetStatusSummary} 
              disabled={isLoading || !evaluationId}
              size="sm"
              className="w-full"
              variant="secondary"
            >
              {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
              Resumo Status
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Verificar Todas
            </CardTitle>
            <CardDescription className="text-xs">
              POST /avaliacoes/verificar-todas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleCheckAllEvaluations} 
              disabled={isChecking}
              size="sm"
              className="w-full"
              variant="outline"
            >
              {isChecking ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Verificar Todas
            </Button>
            {lastCheck && (
              <p className="text-xs text-muted-foreground mt-2">
                Última verificação: {lastCheck.toLocaleTimeString()}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas de Status Global */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Estatísticas de Status Global
          </CardTitle>
          <CardDescription>
            GET /evaluation-results/avaliacoes/estatisticas-status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingStatus ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total de Avaliações:</span>
                <Badge variant="outline">{statusStats?.total_evaluations || 0}</Badge>
              </div>
              {statusStats?.by_status.map((item) => (
                <div key={item.status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={item.status === 'concluida' ? 'default' : 'secondary'}>
                      {item.label}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {item.count} avaliações
                    </span>
                  </div>
                  <span className="font-semibold">{item.percentage.toFixed(1)}%</span>
                </div>
              ))}
              {statusStats?.last_updated && (
                <p className="text-xs text-muted-foreground">
                  Atualizado em: {new Date(statusStats.last_updated).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resultados das Operações */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Resultado da Operação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto max-h-96">
              {JSON.stringify(results, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Documentação dos Endpoints */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            📋 Endpoints Implementados
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-700 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <p><strong>GET /avaliacoes:</strong> ✅ Lista consolidada (nova API)</p>
            <p><strong>GET /avaliacoes/{`{id}`}:</strong> ✅ Estatísticas específicas</p>
            <p><strong>POST /avaliacoes/calcular:</strong> ✅ Calcular resultados</p>
            <p><strong>PATCH /avaliacoes/{`{id}`}/finalizar:</strong> ✅ Finalizar avaliação</p>
            <p><strong>POST /avaliacoes/{`{id}`}/verificar-status:</strong> ✅ Verificar status</p>
            <p><strong>GET /avaliacoes/{`{id}`}/status-resumo:</strong> ✅ Resumo de status</p>
            <p><strong>POST /avaliacoes/verificar-todas:</strong> ✅ Verificação em lote</p>
            <p><strong>GET /avaliacoes/estatisticas-status:</strong> ✅ Stats para gráficos</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default EvaluationEndpointsExample;
