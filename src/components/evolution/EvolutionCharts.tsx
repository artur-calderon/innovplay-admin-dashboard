import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, TrendingUp } from 'lucide-react';
import { EvolutionChart, EvolutionData } from './EvolutionChart';

export interface ProcessedEvolutionData {
  /** "Geral" por etapa (notas) */
  generalData: EvolutionData[];
  /** "Geral" por etapa (proficiência) */
  proficiencyData: EvolutionData[];
  /** "Classificação/Aprovação" geral */
  approvalData: EvolutionData[];
  /** por disciplina (notas) */
  subjectData: Record<string, EvolutionData[]>;
  /** por disciplina (proficiência) */
  subjectProficiencyData: Record<string, EvolutionData[]>;
  /** classificação por disciplina (opcional) */
  classificationData: Record<string, EvolutionData[]>;
  /** nomes das avaliações para exibição */
  evaluationNames: string[];
}

interface EvolutionChartsProps {
  data: ProcessedEvolutionData;
  isLoading?: boolean;
}

export function EvolutionCharts({ data, isLoading = false }: EvolutionChartsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4" />
          <p className="text-gray-600">Carregando gráficos...</p>
        </CardContent>
      </Card>
    );
  }

  if (!data || (!data.generalData?.length && !Object.keys(data.subjectData || {}).length)) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <TrendingUp className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum dado disponível</h3>
          <p className="text-gray-600 text-center max-w-md">Não há dados suficientes para gerar os gráficos de evolução.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="general" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="general" className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Visão Geral
        </TabsTrigger>
        <TabsTrigger value="subjects" className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Por Disciplina
        </TabsTrigger>
      </TabsList>

      {/* VISÃO GERAL */}
      <TabsContent value="general" className="space-y-6">
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {!!data.generalData?.length && (
            <EvolutionChart
              data={data.generalData}
              metric="grade"
              title="NOTA GERAL"
              subtitle="Média geral de todas as disciplinas"
              showVariation
              evaluationNames={data.evaluationNames}
            />
          )}

          {!!data.proficiencyData?.length && (
            <EvolutionChart
              data={data.proficiencyData}
              metric="proficiency"
              title="PROFICIÊNCIA GERAL"
              subtitle="Proficiência média de todas as disciplinas"
              showVariation
              evaluationNames={data.evaluationNames}
            />
          )}

        </div>
      </TabsContent>

      {/* POR DISCIPLINA */}
      <TabsContent value="subjects" className="space-y-6">
        {Object.keys(data.subjectData || {}).length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <BookOpen className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma disciplina encontrada</h3>
              <p className="text-gray-600 text-center max-w-md">Não há dados de disciplinas para exibir os gráficos.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(data.subjectData).map(([subject, rows]) => (
              <div key={subject} className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                <EvolutionChart
                  data={rows}
                  metric="grade"
                  title={`NOTA POR DISCIPLINA - ${subject.toUpperCase()}`}
                  subtitle={`Média de notas da disciplina ${subject}`}
                  showVariation
                  evaluationNames={data.evaluationNames}
                />
                {!!data.subjectProficiencyData?.[subject]?.length && (
                  <EvolutionChart
                    data={data.subjectProficiencyData[subject]}
                    metric="proficiency"
                    title={`PROFICIÊNCIA POR DISCIPLINA - ${subject.toUpperCase()}`}
                    subtitle={`Proficiência média da disciplina ${subject}`}
                    showVariation
                    evaluationNames={data.evaluationNames}
                  />
                )}
                {!!data.classificationData?.[subject]?.length && (
                  <EvolutionChart
                    data={data.classificationData[subject]}
                    metric="approval"
                    title={`CLASSIFICAÇÃO POR DISCIPLINA - ${subject.toUpperCase()}`}
                    subtitle={`Percentual de alunos com desempenho adequado/avançado em ${subject}`}
                    showVariation
                    evaluationNames={data.evaluationNames}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}