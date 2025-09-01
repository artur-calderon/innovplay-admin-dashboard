import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BarChartComponent, DonutChartComponent } from "@/components/ui/charts";

// ✅ TIPOS MAIS ESPECÍFICOS
type StageGroup = "group1" | "group2";

interface ChartData {
  averageScoreData: Array<{ name: string; value: number }>;
  averageProficiencyData: Array<{ name: string; value: number }>;
  distributionData: Array<{
    disciplina: string;
    data: Array<{ name: string; value: number }>;
  }>;
  proficiencyMax: number;
}

interface ChartsApiData {
  estatisticas_gerais?: {
    media_nota_geral?: number;
    media_proficiencia_geral?: number;
  };
  resultados_por_disciplina?: Array<{
    disciplina: string;
    media_nota: number; // ✅ CORREÇÃO: Campo obrigatório
    media_proficiencia: number; // ✅ CORREÇÃO: Campo obrigatório
    distribuicao_classificacao?: {
      abaixo_do_basico?: number;
      basico?: number;
      adequado?: number;
      avancado?: number;
    };
  }>;
}

interface ChartsEvaluationInfo {
  id: string;
  titulo: string;
  disciplina?: string;
  serie?: string;
  turma?: string;
  escola?: string;
  municipio?: string;
  estado?: string;
  data_aplicacao?: string;
  total_alunos: number;
  alunos_participantes: number;
  alunos_ausentes: number;
  media_nota: number;
  media_proficiencia: number;
}

interface ResultsChartsProps {
  apiData: ChartsApiData | null;
  evaluationInfo: ChartsEvaluationInfo | null;
  inferStageGroup: () => StageGroup;
  getMaxForDiscipline: (disciplina: string, group: StageGroup) => number;
}

// ✅ HOOK PARA LÓGICA DE DADOS
function useChartData(
  apiData: ChartsApiData | null, 
  inferStageGroup: () => StageGroup, 
  getMaxForDiscipline: (disciplina: string, group: StageGroup) => number
): ChartData | null {
  return useMemo(() => {
    // ✅ DEBUG: Log dos dados recebidos no componente
    console.log('🔍 DEBUG - Dados recebidos no ResultsCharts:');
    console.log('  - apiData:', apiData);
    console.log('  - resultados_por_disciplina:', apiData?.resultados_por_disciplina);
    console.log('  - estatisticas_gerais:', apiData?.estatisticas_gerais);
    
    // ✅ DEBUG: Log detalhado de cada disciplina
    if (apiData?.resultados_por_disciplina) {
      console.log('🔍 DEBUG - Detalhes de cada disciplina:');
      apiData.resultados_por_disciplina.forEach((item, index) => {
        console.log(`  - Disciplina ${index + 1}:`, {
          nome: item.disciplina,
          media_nota: item.media_nota,
          media_proficiencia: item.media_proficiencia,
          tipo_media_nota: typeof item.media_nota,
          tipo_media_proficiencia: typeof item.media_proficiencia
        });
      });
    }
    
    if (!apiData?.estatisticas_gerais || !apiData?.resultados_por_disciplina) {
      console.warn('Dados incompletos para gráficos:', apiData);
      return null;
    }

    // ✅ FUNÇÕES AUXILIARES
    const createScoreData = () => {
      console.log('🔍 DEBUG - Criando dados de nota:');
      console.log('  - media_nota_geral:', apiData.estatisticas_gerais!.media_nota_geral);
      
      const scoreData = [
        { name: "Geral", value: typeof apiData.estatisticas_gerais!.media_nota_geral === 'number' ? apiData.estatisticas_gerais!.media_nota_geral : 0 },
        ...apiData.resultados_por_disciplina!.map((item) => {
          console.log(`  - ${item.disciplina}: media_nota = ${item.media_nota} (tipo: ${typeof item.media_nota})`);
          // ✅ CORREÇÃO: Usar valor explícito em vez de fallback || 0
          const value = typeof item.media_nota === 'number' ? item.media_nota : 0;
          console.log(`  - ${item.disciplina}: valor final = ${value}`);
          return {
            name: item.disciplina.toUpperCase(),
            value: value
          };
        })
      ];
      
      console.log('🔍 DEBUG - Dados de nota criados:', scoreData);
      return scoreData;
    };

    const createProficiencyData = () => {
      console.log('🔍 DEBUG - Criando dados de proficiência:');
      console.log('  - media_proficiencia_geral:', apiData.estatisticas_gerais!.media_proficiencia_geral);
      console.log('  - resultados_por_disciplina:', apiData.resultados_por_disciplina);
      
      const proficiencyData = [
        { name: "Geral", value: typeof apiData.estatisticas_gerais!.media_proficiencia_geral === 'number' ? apiData.estatisticas_gerais!.media_proficiencia_geral : 0 },
        ...apiData.resultados_por_disciplina!.map((item) => {
          console.log(`  - ${item.disciplina}: media_proficiencia = ${item.media_proficiencia} (tipo: ${typeof item.media_proficiencia})`);
          // ✅ CORREÇÃO: Usar valor explícito em vez de fallback || 0
          const value = typeof item.media_proficiencia === 'number' ? item.media_proficiencia : 0;
          console.log(`  - ${item.disciplina}: valor final = ${value}`);
          return {
            name: item.disciplina.toUpperCase(),
            value: value
          };
        })
      ];
      
      console.log('🔍 DEBUG - Dados de proficiência criados:', proficiencyData);
      return proficiencyData;
    };

    const createDistributionData = () => {
      // ✅ DEBUG: Log dos dados de distribuição
      console.log('🔍 DEBUG - Criando dados de distribuição:');
      console.log('  - resultados_por_disciplina:', apiData.resultados_por_disciplina);
      
      return apiData.resultados_por_disciplina!.map((item) => {
        console.log(`  - Disciplina ${item.disciplina}:`, item);
        console.log(`    - distribuicao_classificacao:`, item.distribuicao_classificacao);
        
        return {
          disciplina: item.disciplina,
          data: [
            { name: "Abaixo do Básico", value: item.distribuicao_classificacao?.abaixo_do_basico || 0 },
            { name: "Básico", value: item.distribuicao_classificacao?.basico || 0 },
            { name: "Adequado", value: item.distribuicao_classificacao?.adequado || 0 },
            { name: "Avançado", value: item.distribuicao_classificacao?.avancado || 0 }
          ]
        };
      });
    };

    const calculateProficiencyMax = () => {
      const group = inferStageGroup();
      const profMaxCandidates = apiData.resultados_por_disciplina!.length
        ? apiData.resultados_por_disciplina!.map(d => getMaxForDiscipline(d.disciplina, group))
        : [getMaxForDiscipline("outras", group)];
      return Math.max(...profMaxCandidates);
    };

    const result = {
      averageScoreData: createScoreData(),
      averageProficiencyData: createProficiencyData(),
      distributionData: createDistributionData(),
      proficiencyMax: calculateProficiencyMax(),
    };

    console.log('Dados dos gráficos preparados:', result);
    return result;
  }, [apiData, inferStageGroup, getMaxForDiscipline]);
}

// ✅ COMPONENTES MENORES
const ScoreChart = ({ data }: { data: ChartData }) => (
  <Card>
    <CardContent className="pt-6">
      <BarChartComponent
        data={data.averageScoreData}
        title="Média de Nota"
        subtitle="Média de Nota (Geral + Disciplinas)"
        color="#22c55e"
        yAxisDomain={[0, 10]}
        yAxisLabel="Nota"
      />
    </CardContent>
  </Card>
);

const ProficiencyChart = ({ data }: { data: ChartData }) => (
  <Card>
    <CardContent className="pt-6">
      <BarChartComponent
        data={data.averageProficiencyData}
        title="Média de Proficiência"
        subtitle="Média de Proficiência (Geral + Disciplinas)"
        color="#15803d"
        yAxisDomain={[0, data.proficiencyMax]}
        yAxisLabel="Proficiência"
      />
    </CardContent>
  </Card>
);

const DistributionCharts = ({ data }: { data: ChartData }) => (
  <>
    {data.distributionData.map((item, index) => (
      <Card key={index}>
        <CardContent className="pt-6">
          <DonutChartComponent
            data={item.data}
            title={item.disciplina.toUpperCase()}
            subtitle="Distribuição de Desempenho"
          />
        </CardContent>
      </Card>
    ))}
  </>
);

// ✅ COMPONENTE PRINCIPAL MAIS LIMPO
export function ResultsCharts({ 
  apiData, 
  evaluationInfo, 
  inferStageGroup, 
  getMaxForDiscipline 
}: ResultsChartsProps) {
  
  const chartData = useChartData(apiData, inferStageGroup, getMaxForDiscipline);

  if (!chartData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Não há dados suficientes para gerar os gráficos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gráficos de Médias */}
      <div className="grid gap-6 md:grid-cols-2">
        <ScoreChart data={chartData} />
        <ProficiencyChart data={chartData} />
      </div>

      {/* Gráficos de Distribuição */}
      {chartData.distributionData.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          <DistributionCharts data={chartData} />
        </div>
      )}
    </div>
  );
}
