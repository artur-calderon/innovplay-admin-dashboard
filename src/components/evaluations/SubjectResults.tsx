import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, TrendingDown, BookOpen, Users, Target } from "lucide-react";
import { EvaluationResultsApiService } from "@/services/evaluationResultsApi";
import { BarChartComponent, DonutChartComponent } from "@/components/ui/charts";

// Interfaces para os dados dos novos endpoints
interface AvaliacaoPorDisciplina {
  id: string;
  titulo: string;
  disciplina_principal: string;
  curso: string;
  tipo_calculo: string;
}

interface EstatisticasPorDisciplina {
  disciplina: string;
  total_alunos: number;
  alunos_participantes: number;
  alunos_pendentes: number;
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

interface ResultadosGeraisEDisciplinas {
  avaliacao: AvaliacaoPorDisciplina;
  resultados: {
    estatisticas_gerais: {
      total_alunos: number;
      alunos_participantes: number;
      alunos_pendentes: number;
      alunos_ausentes: number;
      media_nota_geral: number;
      media_proficiencia_geral: number;
      distribuicao_classificacao_geral: {
        abaixo_do_basico: number;
        basico: number;
        adequado: number;
        avancado: number;
      };
    };
    estatisticas_por_disciplina: Record<string, EstatisticasPorDisciplina>;
  };
}

interface ComparativoDisciplinas {
  avaliacao: AvaliacaoPorDisciplina;
  comparativo_disciplinas: Array<{
    disciplina: string;
    media_nota: number;
    media_proficiencia: number;
    total_alunos: number;
    alunos_participantes: number;
    distribuicao_classificacao: {
      abaixo_do_basico: number;
      basico: number;
      adequado: number;
      avancado: number;
    };
  }>;
  resumo: {
    melhor_disciplina: string;
    pior_disciplina: string;
    diferenca_maior_menor: number;
  };
}

interface SubjectResultsProps {
  evaluationId: string;
  classIds?: string[];
}

export function SubjectResults({ evaluationId, classIds }: SubjectResultsProps) {
  const [resultados, setResultados] = useState<ResultadosGeraisEDisciplinas | null>(null);
  const [comparativo, setComparativo] = useState<ComparativoDisciplinas | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const loadData = async () => {
      if (!evaluationId) return;
      
      setIsLoading(true);
      try {
        // Carregar dados em paralelo
        const [resultadosData, comparativoData] = await Promise.all([
          EvaluationResultsApiService.getResultadosGeraisEDisciplinas(evaluationId, classIds),
          EvaluationResultsApiService.getComparativoDisciplinas(evaluationId, classIds)
        ]);

        setResultados(resultadosData);
        setComparativo(comparativoData);
      } catch (error) {
        console.error('Erro ao carregar dados por disciplina:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [evaluationId, classIds]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando resultados por disciplina...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!resultados) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Dados não disponíveis
          </h3>
          <p className="text-gray-600">
            Não foi possível carregar os resultados por disciplina para esta avaliação.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { avaliacao, resultados: dados } = resultados;
  const disciplinas = Object.keys(dados.estatisticas_por_disciplina);

  // Preparar dados para gráficos
  const prepareChartData = () => {
    const notaData = [
      { name: "Geral", value: dados.estatisticas_gerais.media_nota_geral },
      ...disciplinas.map(disciplina => ({
        name: disciplina,
        value: dados.estatisticas_por_disciplina[disciplina].media_nota
      }))
    ];

    const proficienciaData = [
      { name: "Geral", value: dados.estatisticas_gerais.media_proficiencia_geral },
      ...disciplinas.map(disciplina => ({
        name: disciplina,
        value: dados.estatisticas_por_disciplina[disciplina].media_proficiencia
      }))
    ];

    return { notaData, proficienciaData };
  };

  const { notaData, proficienciaData } = prepareChartData();

  return (
    <div className="space-y-6">
      {/* Header da Avaliação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-blue-600" />
            {avaliacao.titulo}
          </CardTitle>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span>Disciplina Principal: {avaliacao.disciplina_principal}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Curso: {avaliacao.curso}</span>
            </div>
            <Badge variant="outline">{avaliacao.tipo_calculo}</Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Abas de Visualização */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="disciplines">Por Disciplina</TabsTrigger>
          <TabsTrigger value="comparison">Comparativo</TabsTrigger>
          <TabsTrigger value="charts">Gráficos</TabsTrigger>
        </TabsList>

        {/* Visão Geral */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Total de Alunos</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {dados.estatisticas_gerais.total_alunos}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Participantes</div>
                  <div className="text-2xl font-bold text-green-600">
                    {dados.estatisticas_gerais.alunos_participantes}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Média Geral</div>
                  <div className="text-2xl font-bold text-purple-600">
                    {dados.estatisticas_gerais.media_nota_geral.toFixed(1)}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Proficiência Geral</div>
                  <div className="text-2xl font-bold text-orange-600">
                    {dados.estatisticas_gerais.media_proficiencia_geral.toFixed(1)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Distribuição de Classificação Geral */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Classificação Geral</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                {Object.entries(dados.estatisticas_gerais.distribuicao_classificacao_geral).map(([nivel, quantidade]) => (
                  <div key={nivel} className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{quantidade}</div>
                    <div className="text-sm text-gray-600 capitalize">
                      {nivel.replace('_', ' ')}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Por Disciplina */}
        <TabsContent value="disciplines" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {disciplinas.map(disciplina => {
              const stats = dados.estatisticas_por_disciplina[disciplina];
              const taxaParticipacao = (stats.alunos_participantes / stats.total_alunos) * 100;

              return (
                <Card key={disciplina}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{disciplina}</span>
                      <Badge variant="secondary">
                        {stats.alunos_participantes}/{stats.total_alunos}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {stats.media_nota.toFixed(1)}
                        </div>
                        <div className="text-sm text-gray-600">Média</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {stats.media_proficiencia.toFixed(1)}
                        </div>
                        <div className="text-sm text-gray-600">Proficiência</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Taxa de Participação</span>
                        <span>{taxaParticipacao.toFixed(1)}%</span>
                      </div>
                      <Progress value={taxaParticipacao} className="h-2" />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(stats.distribuicao_classificacao).map(([nivel, quantidade]) => (
                        <div key={nivel} className="flex justify-between">
                          <span className="capitalize">{nivel.replace('_', ' ')}</span>
                          <span className="font-medium">{quantidade}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Comparativo */}
        <TabsContent value="comparison" className="space-y-6">
          {comparativo && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Resumo do Comparativo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-lg font-semibold text-green-800">
                        {comparativo.resumo.melhor_disciplina}
                      </div>
                      <div className="text-sm text-green-600">Melhor Desempenho</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-lg font-semibold text-red-800">
                        {comparativo.resumo.pior_disciplina}
                      </div>
                      <div className="text-sm text-red-600">Pior Desempenho</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-lg font-semibold text-blue-800">
                        {comparativo.resumo.diferenca_maior_menor.toFixed(1)}
                      </div>
                      <div className="text-sm text-blue-600">Diferença (pontos)</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-2">
                {comparativo.comparativo_disciplinas.map((item, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{item.disciplina}</span>
                        <Badge variant={item.disciplina === comparativo.resumo.melhor_disciplina ? "default" : "secondary"}>
                          {item.media_nota.toFixed(1)}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Média de Nota:</span>
                          <span className="font-medium">{item.media_nota.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Proficiência:</span>
                          <span className="font-medium">{item.media_proficiencia.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Participantes:</span>
                          <span className="font-medium">{item.alunos_participantes}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* Gráficos */}
        <TabsContent value="charts" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardContent className="pt-6">
                <BarChartComponent
                  data={notaData}
                  title="Média de Nota por Disciplina"
                  subtitle="Comparação de notas entre disciplinas"
                  color="#22c55e"
                  yAxisDomain={[0, 10]}
                  yAxisLabel="Nota"
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <BarChartComponent
                  data={proficienciaData}
                  title="Média de Proficiência por Disciplina"
                  subtitle="Comparação de proficiência entre disciplinas"
                  color="#15803d"
                  yAxisDomain={[0, Math.max(...proficienciaData.map(d => d.value))]}
                  yAxisLabel="Proficiência"
                />
              </CardContent>
            </Card>
          </div>

          {/* Gráficos de Distribuição por Disciplina */}
          <div className="grid gap-6 md:grid-cols-2">
            {disciplinas.map(disciplina => {
              const stats = dados.estatisticas_por_disciplina[disciplina];
              const distributionData = [
                { name: "Abaixo do Básico", value: stats.distribuicao_classificacao.abaixo_do_basico },
                { name: "Básico", value: stats.distribuicao_classificacao.basico },
                { name: "Adequado", value: stats.distribuicao_classificacao.adequado },
                { name: "Avançado", value: stats.distribuicao_classificacao.avancado }
              ];

              return (
                <Card key={disciplina}>
                  <CardContent className="pt-6">
                    <DonutChartComponent
                      data={distributionData}
                      title={disciplina}
                      subtitle="Distribuição de Desempenho"
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
