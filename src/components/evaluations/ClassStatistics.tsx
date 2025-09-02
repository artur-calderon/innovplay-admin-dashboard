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
  apiData: any;
}

export function ClassStatistics({ apiData }: ClassStatisticsProps) {
    // Simular dados por turma baseados nos dados da API
  const generateClassData = (): ClassData[] => {
    if (!apiData?.resultados_detalhados?.avaliacoes) {
      // Dados de exemplo quando não há dados reais
      return [
        {
          name: 'A',
          seriesName: undefined,
          totalStudents: 2,
          participatingStudents: 2,
          averageGrade: 3.8,
          proficiency: 212.5,
          distribution: { abaixo_do_basico: 2, basico: 0, adequado: 0, avancado: 0 }
        }
      ];
    }

    // Agrupar por turma
    const turmasMap = new Map<string, any[]>();
    
    apiData.resultados_detalhados.avaliacoes.forEach((evaluation: any) => {
      const turma = evaluation.turma || 'A';
      if (!turmasMap.has(turma)) {
        turmasMap.set(turma, []);
      }
      turmasMap.get(turma)!.push(evaluation);
    });

    // Se não há turmas específicas, criar dados de exemplo
    if (turmasMap.size === 0) {
      return [
        {
          name: 'A',
          seriesName: undefined,
          totalStudents: 2,
          participatingStudents: 2,
          averageGrade: 3.8,
          proficiency: 212.5,
          distribution: { abaixo_do_basico: 2, basico: 0, adequado: 0, avancado: 0 }
        }
      ];
    }

    return Array.from(turmasMap.entries()).map(([turmaName, evaluations]) => {
      const totalStudents = evaluations.reduce((sum, evaluation) => sum + (evaluation.total_alunos || 0), 0);
      const participatingStudents = evaluations.reduce((sum, evaluation) => sum + (evaluation.alunos_participantes || 0), 0);
      const averageGrade = evaluations.reduce((sum, evaluation) => sum + (evaluation.media_nota || 0), 0) / evaluations.length;
      const proficiency = evaluations.reduce((sum, evaluation) => sum + (evaluation.media_proficiencia || 0), 0) / evaluations.length;
      const seriesName = (evaluations.find((e) => !!e.serie)?.serie) || (apiData?.estatisticas_gerais?.serie) || undefined;

      // Simular distribuição baseada na média da turma
      let distribution;
      if (averageGrade >= 8) {
        distribution = { abaixo_do_basico: 0, basico: 0, adequado: 1, avancado: 1 };
      } else if (averageGrade >= 6) {
        distribution = { abaixo_do_basico: 0, basico: 1, adequado: 1, avancado: 0 };
      } else if (averageGrade >= 4) {
        distribution = { abaixo_do_basico: 1, basico: 1, adequado: 0, avancado: 0 };
      } else {
        distribution = { abaixo_do_basico: 2, basico: 0, adequado: 0, avancado: 0 };
      }

      return {
        name: turmaName,
        seriesName,
        totalStudents: Math.max(totalStudents, 2),
        participatingStudents: Math.max(participatingStudents, 2),
        averageGrade: Number(averageGrade.toFixed(1)),
        proficiency: Number(proficiency.toFixed(1)),
        distribution
      };
    });
  };

  const classesData = generateClassData();

  if (classesData.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p className="text-gray-600">Não há dados de turmas disponíveis para os filtros selecionados.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Estatísticas por Turma</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classesData.map((classData) => {
            const participationRate = classData.totalStudents > 0 
              ? (classData.participatingStudents / classData.totalStudents) * 100 
              : 0;

            return (
              <div key={classData.name} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">{classData.seriesName ? `${classData.seriesName} - ${classData.name}` : classData.name}</h3>
                  <Badge variant="outline">{classData.totalStudents} alunos</Badge>
                </div>
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Participação:</span>
                      <span className="font-medium">
                        {classData.participatingStudents}/{classData.totalStudents} alunos
                      </span>
                    </div>
                    <Progress value={participationRate} className="h-2" />
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Média Nota:</span>
                    <span className="font-medium">{classData.averageGrade.toFixed(1)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Proficiência:</span>
                    <span className="font-medium">{classData.proficiency.toFixed(1)}</span>
                  </div>
                  
                  {/* Distribuição de classificação */}
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Distribuição:</div>
                    <div className="flex gap-1">
                      <div 
                        className="flex-1 bg-red-500 rounded-sm h-2" 
                        title={`Abaixo do Básico: ${classData.distribution.abaixo_do_basico}`}
                        style={{ 
                          width: `${classData.totalStudents > 0 ? (classData.distribution.abaixo_do_basico / classData.totalStudents) * 100 : 0}%` 
                        }}
                      ></div>
                      <div 
                        className="flex-1 bg-yellow-500 rounded-sm h-2" 
                        title={`Básico: ${classData.distribution.basico}`}
                        style={{ 
                          width: `${classData.totalStudents > 0 ? (classData.distribution.basico / classData.totalStudents) * 100 : 0}%` 
                        }}
                      ></div>
                      <div 
                        className="flex-1 bg-green-400 rounded-sm h-2" 
                        title={`Adequado: ${classData.distribution.adequado}`}
                        style={{ 
                          width: `${classData.totalStudents > 0 ? (classData.distribution.adequado / classData.totalStudents) * 100 : 0}%` 
                        }}
                      ></div>
                      <div 
                        className="flex-1 bg-green-600 rounded-sm h-2" 
                        title={`Avançado: ${classData.distribution.avancado}`}
                        style={{ 
                          width: `${classData.totalStudents > 0 ? (classData.distribution.avancado / classData.totalStudents) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{classData.distribution.abaixo_do_basico}</span>
                      <span>{classData.distribution.basico}</span>
                      <span>{classData.distribution.adequado}</span>
                      <span>{classData.distribution.avancado}</span>
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
