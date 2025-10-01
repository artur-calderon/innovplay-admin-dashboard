import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface ClassData {
  name: string;
  seriesName?: string;
  totalStudents: number;
  participatingStudents: number;
  averageGrade: number;
  proficiency: number;
  distribution: {
    abaixo_do_basico: number;
    basico: number;
    adequado: number;
    avancado: number;
  };
}

interface ClassStatisticsProps {
  apiData: {
    nivel_granularidade?: 'municipio' | 'escola' | 'serie' | 'turma' | 'avaliacao';
    resultados_detalhados?: {
      avaliacoes?: Array<{
        id: string;
        titulo: string;
        serie?: string;
        turma?: string;
        escola?: string;
        total_alunos?: number;
        alunos_participantes?: number;
        alunos_pendentes?: number;
        alunos_ausentes?: number;
        media_nota?: number;
        media_proficiencia?: number;
        distribuicao_classificacao?: {
          abaixo_do_basico: number;
          basico: number;
          adequado: number;
          avancado: number;
        };
      }>;
    };
    estatisticas_gerais?: {
      tipo?: string;
      serie?: string;
      media_nota_geral?: number;
      media_proficiencia_geral?: number;
    };
    tabela_detalhada?: {
      disciplinas?: Array<{
        id: string;
        nome: string;
        alunos: Array<{
          id: string;
          nome: string;
          turma: string;
          nivel_proficiencia: string;
          nota: number;
          proficiencia: number;
          total_acertos: number;
          total_erros: number;
          total_respondidas: number;
        }>;
      }>;
      geral?: {
        alunos: Array<{
          id: string;
          nome: string;
          turma: string;
          nivel_proficiencia_geral: string;
          nota_geral: number;
          proficiencia_geral: number;
          total_acertos_geral: number;
          total_erros_geral: number;
          total_respondidas_geral: number;
        }>;
      };
    };
  } | null;
}

export function ClassStatistics({ apiData }: ClassStatisticsProps) {
  // ✅ NOVA IMPLEMENTAÇÃO: Usar dados agrupados do backend baseado na granularidade
  const generateStatisticsData = (): ClassData[] => {
    // Verificar se temos dados agrupados do backend
    if (!apiData?.resultados_detalhados?.avaliacoes?.length) {
      return [];
    }

    const granularidade = apiData.nivel_granularidade || apiData.estatisticas_gerais?.tipo || 'turma';

    // Processar dados agrupados do backend
    return apiData.resultados_detalhados.avaliacoes.map((avaliacao, index) => {
      const totalStudents = avaliacao.total_alunos || 0;
      const participatingStudents = avaliacao.alunos_participantes || 0;
      const averageGrade = avaliacao.media_nota || 0;
      const proficiency = avaliacao.media_proficiencia || 0;
      
      // Usar distribuição do backend se disponível, senão usar valores padrão
      const distribution = avaliacao.distribuicao_classificacao || {
        abaixo_do_basico: 0,
        basico: 0,
        adequado: 0,
        avancado: 0
      };

      // Determinar nome e série baseado na granularidade
      let name: string;
      let seriesName: string | undefined;

      switch (granularidade) {
        case 'municipio':
          name = avaliacao.escola || `Escola ${index + 1}`;
          seriesName = avaliacao.serie === 'Todas as séries' ? undefined : avaliacao.serie;
          break;
        case 'escola':
          name = avaliacao.turma === 'Todas as turmas' ? avaliacao.serie || `Série ${index + 1}` : `${avaliacao.serie} - ${avaliacao.turma}`;
          seriesName = avaliacao.serie;
          break;
        case 'serie':
          name = avaliacao.turma || `Turma ${index + 1}`;
          seriesName = avaliacao.serie;
          break;
        case 'turma':
        default:
          name = avaliacao.turma || `Turma ${index + 1}`;
          seriesName = avaliacao.serie;
          break;
      }

      return {
        name,
        seriesName,
        totalStudents,
        participatingStudents,
        averageGrade: Number(averageGrade.toFixed(1)),
        proficiency: Number(proficiency.toFixed(1)),
        distribution
      };
    });
  };

  const statisticsData = generateStatisticsData();
  
  // Determinar título baseado na granularidade
  const getTitle = (): string => {
    const granularidade = apiData?.nivel_granularidade || apiData?.estatisticas_gerais?.tipo || 'turma';
    
    switch (granularidade) {
      case 'municipio':
        return 'Estatísticas por Escola';
      case 'escola':
        return 'Estatísticas por Série';
      case 'serie':
        return 'Estatísticas por Turma';
      case 'turma':
      default:
        return 'Estatísticas da Turma';
    }
  };

  if (statisticsData.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p className="text-gray-600">Não há dados disponíveis para os filtros selecionados.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{getTitle()}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {statisticsData.map((statisticsItem) => {
            const participationRate = statisticsItem.totalStudents > 0 
              ? (statisticsItem.participatingStudents / statisticsItem.totalStudents) * 100 
              : 0;

            return (
              <div key={statisticsItem.name} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">{statisticsItem.seriesName ? `${statisticsItem.seriesName} - ${statisticsItem.name}` : statisticsItem.name}</h3>
                  <Badge variant="outline">{statisticsItem.totalStudents} alunos</Badge>
                </div>
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Participação:</span>
                      <span className="font-medium">
                        {statisticsItem.participatingStudents}/{statisticsItem.totalStudents} alunos
                      </span>
                    </div>
                    <Progress value={participationRate} className="h-2" />
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Média Nota:</span>
                    <span className="font-medium">{statisticsItem.averageGrade.toFixed(1)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Proficiência:</span>
                    <span className="font-medium">{statisticsItem.proficiency.toFixed(1)}</span>
                  </div>
                  
                  {/* Distribuição de classificação */}
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Distribuição:</div>
                    <div className="flex gap-1">
                      <div 
                        className="flex-1 bg-red-500 rounded-sm h-2" 
                        title={`Abaixo do Básico: ${statisticsItem.distribution.abaixo_do_basico}`}
                        style={{ 
                          width: `${statisticsItem.totalStudents > 0 ? (statisticsItem.distribution.abaixo_do_basico / statisticsItem.totalStudents) * 100 : 0}%` 
                        }}
                      ></div>
                      <div 
                        className="flex-1 bg-yellow-500 rounded-sm h-2" 
                        title={`Básico: ${statisticsItem.distribution.basico}`}
                        style={{ 
                          width: `${statisticsItem.totalStudents > 0 ? (statisticsItem.distribution.basico / statisticsItem.totalStudents) * 100 : 0}%` 
                        }}
                      ></div>
                      <div 
                        className="flex-1 bg-green-400 rounded-sm h-2" 
                        title={`Adequado: ${statisticsItem.distribution.adequado}`}
                        style={{ 
                          width: `${statisticsItem.totalStudents > 0 ? (statisticsItem.distribution.adequado / statisticsItem.totalStudents) * 100 : 0}%` 
                        }}
                      ></div>
                      <div 
                        className="flex-1 bg-green-600 rounded-sm h-2" 
                        title={`Avançado: ${statisticsItem.distribution.avancado}`}
                        style={{ 
                          width: `${statisticsItem.totalStudents > 0 ? (statisticsItem.distribution.avancado / statisticsItem.totalStudents) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{statisticsItem.distribution.abaixo_do_basico}</span>
                      <span>{statisticsItem.distribution.basico}</span>
                      <span>{statisticsItem.distribution.adequado}</span>
                      <span>{statisticsItem.distribution.avancado}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
