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
    resultados_detalhados?: {
      avaliacoes?: Array<{
        turma?: string;
        total_alunos?: number;
        alunos_participantes?: number;
        media_nota?: number;
        media_proficiencia?: number;
        serie?: string;
      }>;
    };
    estatisticas_gerais?: {
      serie?: string;
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
  // ✅ CORRIGIDO: Usar apenas dados reais da tabela_detalhada.disciplinas
  const generateClassData = (): ClassData[] => {
    // Usar apenas dados reais da tabela_detalhada.disciplinas
    if (!apiData?.tabela_detalhada?.disciplinas?.length) {
      return [];
    }

    const turmasMap = new Map<string, {
      alunos: Array<{
        id: string;
        nome: string;
        turma: string;
        nivel_proficiencia: string;
        nota: number;
        proficiencia: number;
      }>;
      serie?: string;
    }>();

    // Processar dados de todas as disciplinas
    apiData.tabela_detalhada.disciplinas.forEach(disciplina => {
      disciplina.alunos.forEach(aluno => {
        const turma = aluno.turma || 'A';
        
        if (!turmasMap.has(turma)) {
          turmasMap.set(turma, {
            alunos: [],
            serie: apiData?.estatisticas_gerais?.serie
          });
        }
        
        // Evitar duplicatas - verificar se o aluno já existe
        const existingAluno = turmasMap.get(turma)!.alunos.find(a => a.id === aluno.id);
        if (!existingAluno) {
          turmasMap.get(turma)!.alunos.push({
            id: aluno.id,
            nome: aluno.nome,
            turma: aluno.turma,
            nivel_proficiencia: aluno.nivel_proficiencia,
            nota: aluno.nota,
            proficiencia: aluno.proficiencia
          });
        }
      });
    });

    // Converter para formato esperado
    return Array.from(turmasMap.entries()).map(([turmaName, turmaData]) => {
      const alunos = turmaData.alunos;
      const totalStudents = alunos.length;
      const participatingStudents = alunos.length; // Todos os alunos na tabela participaram
      
      // Calcular médias reais
      const averageGrade = alunos.length > 0 
        ? alunos.reduce((sum, aluno) => sum + aluno.nota, 0) / alunos.length 
        : 0;
      const proficiency = alunos.length > 0 
        ? alunos.reduce((sum, aluno) => sum + aluno.proficiencia, 0) / alunos.length 
        : 0;

      // ✅ CORRIGIDO: Calcular distribuição real baseada nas classificações dos alunos
      const distribution = {
        abaixo_do_basico: alunos.filter(a => a.nivel_proficiencia === 'Abaixo do Básico').length,
        basico: alunos.filter(a => a.nivel_proficiencia === 'Básico').length,
        adequado: alunos.filter(a => a.nivel_proficiencia === 'Adequado').length,
        avancado: alunos.filter(a => a.nivel_proficiencia === 'Avançado').length
      };

      return {
        name: turmaName,
        seriesName: turmaData.serie,
        totalStudents,
        participatingStudents,
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
