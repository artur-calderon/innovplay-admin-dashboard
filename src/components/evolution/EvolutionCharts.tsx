import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EvolutionChart } from './EvolutionChart';
import { ProcessedEvolutionData } from '@/utils/evolutionDataProcessor';
import { getYAxisDomain, getYAxisLabel } from '@/utils/evolutionDataProcessor';
import { BookOpen, TrendingUp, Users, Target, Award } from 'lucide-react';

interface EvolutionChartsProps {
  data: ProcessedEvolutionData;
  isLoading?: boolean;
}

export function EvolutionCharts({ data, isLoading = false }: EvolutionChartsProps) {
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Carregando gráficos...</p>
        </CardContent>
      </Card>
    );
  }

  if (!data || (!data.generalData.length && !Object.keys(data.subjectData).length)) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <TrendingUp className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhum dado disponível
          </h3>
          <p className="text-gray-600 text-center max-w-md">
            Não há dados suficientes para gerar os gráficos de evolução.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="general" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="general" className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Visão Geral
        </TabsTrigger>
        <TabsTrigger value="subjects" className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Por Disciplina
        </TabsTrigger>
        <TabsTrigger value="classification" className="flex items-center gap-2">
          <Target className="h-4 w-4" />
          Classificação
        </TabsTrigger>
        <TabsTrigger value="participation" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Participação
        </TabsTrigger>
      </TabsList>

      {/* Aba Visão Geral */}
      <TabsContent value="general" className="space-y-6">
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {/* Gráfico de Nota Geral */}
          {data.generalData.length > 0 && (
            <EvolutionChart
              data={data.generalData}
              metric="grade"
              title="Evolução da Nota Geral"
              subtitle="Média geral de todas as disciplinas"
              yAxisLabel={getYAxisLabel('grade')}
              yAxisDomain={getYAxisDomain('grade')}
              showVariation={true}
            />
          )}

          {/* Gráfico de Proficiência Geral */}
          {data.generalData.length > 0 && (
            <EvolutionChart
              data={data.generalData}
              metric="proficiency"
              title="Evolução da Proficiência Geral"
              subtitle="Proficiência média de todas as disciplinas"
              yAxisLabel={getYAxisLabel('proficiency')}
              yAxisDomain={getYAxisDomain('proficiency')}
              showVariation={true}
            />
          )}

          {/* Gráfico de Taxa de Aprovação */}
          {data.approvalData.length > 0 && (
            <EvolutionChart
              data={data.approvalData}
              metric="approval"
              title="Evolução da Taxa de Aprovação"
              subtitle="Percentual de alunos aprovados"
              yAxisLabel={getYAxisLabel('approval')}
              yAxisDomain={getYAxisDomain('approval')}
              showVariation={true}
            />
          )}

          {/* Gráfico de Participação */}
          {data.participationData.length > 0 && (
            <EvolutionChart
              data={data.participationData}
              metric="participation"
              title="Evolução da Participação"
              subtitle="Taxa de participação dos alunos"
              yAxisLabel={getYAxisLabel('participation')}
              yAxisDomain={getYAxisDomain('participation')}
              showVariation={true}
            />
          )}
        </div>
      </TabsContent>

      {/* Aba Por Disciplina */}
      <TabsContent value="subjects" className="space-y-6">
        {Object.keys(data.subjectData).length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <BookOpen className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhuma disciplina encontrada
              </h3>
              <p className="text-gray-600 text-center max-w-md">
                Não há dados de disciplinas para exibir os gráficos.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(data.subjectData).map(([subjectName, subjectData]) => (
              <div key={subjectName} className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                {/* Gráfico de Nota por Disciplina */}
                <EvolutionChart
                  data={subjectData}
                  metric="grade"
                  title={`Evolução da Nota - ${subjectName.toUpperCase()}`}
                  subtitle={`Média de notas da disciplina ${subjectName}`}
                  yAxisLabel={getYAxisLabel('grade')}
                  yAxisDomain={getYAxisDomain('grade')}
                  showVariation={true}
                />

                {/* Gráfico de Proficiência por Disciplina */}
                <EvolutionChart
                  data={subjectData}
                  metric="proficiency"
                  title={`Evolução da Proficiência - ${subjectName.toUpperCase()}`}
                  subtitle={`Proficiência média da disciplina ${subjectName}`}
                  yAxisLabel={getYAxisLabel('proficiency')}
                  yAxisDomain={getYAxisDomain('proficiency')}
                  showVariation={true}
                />
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      {/* Aba Classificação */}
      <TabsContent value="classification" className="space-y-6">
        {Object.keys(data.classificationData).length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Target className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum dado de classificação encontrado
              </h3>
              <p className="text-gray-600 text-center max-w-md">
                Não há dados de classificação para exibir os gráficos.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(data.classificationData).map(([subjectName, classificationData]) => (
              <EvolutionChart
                key={subjectName}
                data={classificationData}
                metric="approval"
                title={`Evolução da Classificação - ${subjectName.toUpperCase()}`}
                subtitle={`Percentual de alunos com desempenho adequado/avançado em ${subjectName}`}
                yAxisLabel={getYAxisLabel('approval')}
                yAxisDomain={getYAxisDomain('approval')}
                showVariation={true}
              />
            ))}
          </div>
        )}
      </TabsContent>

      {/* Aba Participação */}
      <TabsContent value="participation" className="space-y-6">
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {/* Gráfico de Participação Geral */}
          {data.participationData.length > 0 && (
            <EvolutionChart
              data={data.participationData}
              metric="participation"
              title="Evolução da Participação Geral"
              subtitle="Taxa de participação geral dos alunos"
              yAxisLabel={getYAxisLabel('participation')}
              yAxisDomain={getYAxisDomain('participation')}
              showVariation={true}
            />
          )}

          {/* Gráfico de Taxa de Aprovação */}
          {data.approvalData.length > 0 && (
            <EvolutionChart
              data={data.approvalData}
              metric="approval"
              title="Evolução da Taxa de Aprovação"
              subtitle="Percentual de alunos aprovados"
              yAxisLabel={getYAxisLabel('approval')}
              yAxisDomain={getYAxisDomain('approval')}
              showVariation={true}
            />
          )}
        </div>

        {/* Resumo de Participação */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Resumo de Participação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {data.participationData.map((item, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">
                    {item.name}
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">1ª Etapa:</span>
                      <span className="font-medium">{item.etapa1.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">2ª Etapa:</span>
                      <span className="font-medium">{item.etapa2.toFixed(1)}%</span>
                    </div>
                    {item.etapa3 !== undefined && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">3ª Etapa:</span>
                        <span className="font-medium">{item.etapa3.toFixed(1)}%</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Variação:</span>
                      <span className={`font-medium ${
                        item.variacao_1_2 > 0 ? 'text-green-600' : 
                        item.variacao_1_2 < 0 ? 'text-red-600' : 
                        'text-gray-600'
                      }`}>
                        {item.variacao_1_2 > 0 ? '+' : ''}{item.variacao_1_2.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

