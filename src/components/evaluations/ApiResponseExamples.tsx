import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EvaluationResultsApiService } from '@/services/evaluationResultsApi';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info,
  Database,
  Filter,
  BarChart3,
  Users,
  School
} from 'lucide-react';

// Componente que demonstra os diferentes cenários de resposta da API
export function ApiResponseExamples() {
  const { toast } = useToast();
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cenários de teste baseados nos exemplos fornecidos
  const scenarios = [
    {
      id: 'success-with-evaluation',
      name: '✅ Sucesso - Com Avaliação Específica',
      description: 'Retorna dados completos quando há uma avaliação específica aplicada no município',
      filters: { estado: 'ALAGOAS', municipio: '4f5078e3-58a5-48e6-bca9-e3f85d35f87e', avaliacao: '3d3a2f93-6487-4b2e-844f-06e22487308a' }
    },
    {
      id: 'success-no-evaluation',
      name: '✅ Sucesso - Sem Avaliação no Município',
      description: 'Retorna estrutura vazia quando não há avaliação no município selecionado',
      filters: { estado: 'ALAGOAS', municipio: '4f5078e3-58a5-48e6-bca9-e3f85d35f87e', avaliacao: 'inexistent-evaluation-id' }
    },
    {
      id: 'error-missing-state',
      name: '❌ Erro - Estado Ausente',
      description: 'Erro 400: Estado é obrigatório e não pode ser "all"',
      filters: { municipio: 'some-municipality-id' }
    },
    {
      id: 'error-missing-municipality',
      name: '❌ Erro - Município Ausente',
      description: 'Erro 400: Município é obrigatório',
      filters: { estado: 'ALAGOAS' }
    },
    {
      id: 'error-insufficient-filters',
      name: '❌ Erro - Filtros Insuficientes',
      description: 'Erro 400: É necessário aplicar pelo menos 2 filtros válidos',
      filters: { estado: 'all', municipio: 'all' }
    },
    {
      id: 'error-access-denied',
      name: '🚫 Erro - Acesso Negado',
      description: 'Erro 403: Acesso negado a este município',
      filters: { estado: 'ALAGOAS', municipio: 'unauthorized-municipality-id' }
    }
  ];

  const handleTestScenario = async () => {
    if (!selectedScenario) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um cenário para testar",
        variant: "destructive"
      });
      return;
    }

    const scenario = scenarios.find(s => s.id === selectedScenario);
    if (!scenario) return;

    setIsLoading(true);
    setError(null);
    setApiResponse(null);

    try {
      console.log(`🧪 Testando cenário: ${scenario.name}`);
      console.log('🔧 Filtros:', scenario.filters);

      const result = await EvaluationResultsApiService.getEvaluationsList(1, 10, scenario.filters);
      
      if (result) {
        setApiResponse(result);
        toast({
          title: "Sucesso",
          description: `Cenário "${scenario.name}" executado com sucesso!`
        });
      } else {
        setError('API retornou null - verifique os logs do console para detalhes do erro');
        toast({
          title: "Resultado Vazio",
          description: "A API retornou null. Verifique os logs do console.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Erro capturado no componente:', error);
      setError(error.message || 'Erro desconhecido');
      toast({
        title: "Erro",
        description: `Erro ao executar cenário: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderResponseAnalysis = () => {
    if (!apiResponse) return null;

    const { nivel_granularidade, estatisticas_gerais, resultados_por_disciplina, resultados_detalhados, tabela_detalhada, ranking } = apiResponse;

    return (
      <div className="space-y-4">
        {/* Informações Básicas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Granularidade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={nivel_granularidade === 'avaliacao' ? 'default' : 'secondary'}>
                {nivel_granularidade}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Alunos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {estatisticas_gerais?.total_alunos || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {estatisticas_gerais?.alunos_participantes || 0} participantes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Média Geral
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {estatisticas_gerais?.media_nota_geral?.toFixed(1) || '0.0'}
              </div>
              <p className="text-xs text-muted-foreground">
                Proficiência: {estatisticas_gerais?.media_proficiencia_geral?.toFixed(1) || '0.0'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Resultados por Disciplina */}
        {resultados_por_disciplina && resultados_por_disciplina.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <School className="h-5 w-5" />
                Resultados por Disciplina
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {resultados_por_disciplina.map((disciplina, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-semibold">{disciplina.disciplina}</h4>
                      <p className="text-sm text-muted-foreground">
                        {disciplina.alunos_participantes} alunos participantes
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-lg">{disciplina.media_nota.toFixed(1)}</div>
                      <div className="text-xs text-muted-foreground">
                        Prof: {disciplina.media_proficiencia.toFixed(1)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Indicadores de Dados Avançados */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Alert>
            <Database className="h-4 w-4" />
            <AlertDescription>
              <strong>Tabela Detalhada:</strong> {tabela_detalhada ? '✅ Disponível' : '❌ Não disponível'}
              {tabela_detalhada && (
                <div className="text-xs mt-1">
                  {tabela_detalhada.disciplinas.length} disciplina(s) com dados granulares
                </div>
              )}
            </AlertDescription>
          </Alert>

          <Alert>
            <BarChart3 className="h-4 w-4" />
            <AlertDescription>
              <strong>Ranking:</strong> {ranking ? '✅ Disponível' : '❌ Não disponível'}
              {ranking && (
                <div className="text-xs mt-1">
                  {ranking.length} aluno(s) no ranking
                </div>
              )}
            </AlertDescription>
          </Alert>

          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Avaliações:</strong> {resultados_detalhados?.avaliacoes?.length || 0}
              <div className="text-xs mt-1">
                Página {resultados_detalhados?.paginacao?.page || 1} de {resultados_detalhados?.paginacao?.total_pages || 1}
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Seletor de Cenário */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Teste dos Cenários de Resposta da API
          </CardTitle>
          <CardDescription>
            Selecione um cenário para testar diferentes tipos de resposta da API /evaluation-results/avaliacoes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Cenário de Teste:</label>
            <Select value={selectedScenario} onValueChange={setSelectedScenario}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cenário para testar" />
              </SelectTrigger>
              <SelectContent>
                {scenarios.map((scenario) => (
                  <SelectItem key={scenario.id} value={scenario.id}>
                    {scenario.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedScenario && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Cenário:</strong> {scenarios.find(s => s.id === selectedScenario)?.description}
                <div className="text-xs mt-2 font-mono bg-gray-100 p-2 rounded">
                  Filtros: {JSON.stringify(scenarios.find(s => s.id === selectedScenario)?.filters, null, 2)}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={handleTestScenario} 
            disabled={isLoading || !selectedScenario}
            className="w-full"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Executando Teste...
              </>
            ) : (
              'Executar Cenário de Teste'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Erro */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Erro:</strong> {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Análise da Resposta */}
      {apiResponse && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Análise da Resposta da API
            </CardTitle>
            <CardDescription>
              Estrutura e dados retornados pela API
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderResponseAnalysis()}
          </CardContent>
        </Card>
      )}

      {/* JSON Raw da Resposta */}
      {apiResponse && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">JSON Raw da Resposta</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-96">
              {JSON.stringify(apiResponse, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Documentação dos Cenários */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">📋 Cenários de Teste Implementados</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-700 space-y-3">
          {scenarios.map((scenario) => (
            <div key={scenario.id} className="border-l-2 border-blue-300 pl-3">
              <p><strong>{scenario.name}:</strong> {scenario.description}</p>
              <code className="text-xs bg-blue-100 px-2 py-1 rounded">
                {JSON.stringify(scenario.filters)}
              </code>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default ApiResponseExamples;
