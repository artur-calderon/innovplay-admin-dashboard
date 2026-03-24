import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Award, BookOpen } from "lucide-react";
import { api } from "@/lib/api";
import { EvaluationResultsApiService } from "@/services/evaluationResultsApi";
import { DashboardApiService } from "@/services/dashboardApi";

interface StudentRanking {
  position: number;
  studentName: string;
  serie?: string;
  className: string;
  schoolName?: string;
  averageScore: number;
  totalEvaluations: number;
  bestProficiency?: number;
}

export default function TopStudentsTable() {
  const [rankings, setRankings] = useState<StudentRanking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStudentRankings() {
      try {
        setIsLoading(true);
        setError(null);

        // Preferir endpoint do dashboard (ranking-alunos; sem scope = escopo do usuário logado)
        const apiRanking = await DashboardApiService.getStudentRanking({ limit: 10 });
        if (apiRanking?.ranking?.length) {
          const mapped: StudentRanking[] = apiRanking.ranking.map((item, index) => ({
            position: item.position ?? index + 1,
            studentName: item.name,
            serie: item.serie,
            className: item.class_name,
            schoolName: item.school_name || undefined,
            averageScore: item.media,
            totalEvaluations: item.completed_evaluations,
          }));
          setRankings(mapped);
          return;
        }

        // Fallback: montar ranking a partir de avaliações
        // 1. Buscar avaliações recentes (últimas 20 para performance)
        const evaluationsResponse = await api.get("/test/", {
          params: {
            per_page: 20,
            sort: "created_at",
            order: "desc",
          },
        });

        const evaluationsData = evaluationsResponse.data?.data || evaluationsResponse.data || [];
        
        if (!Array.isArray(evaluationsData) || evaluationsData.length === 0) {
          setRankings([]);
          return;
        }

        // Filtrar apenas avaliações ativas
        const activeEvaluations = evaluationsData.filter(
          (evaluation: any) => !evaluation.deleted_at && !evaluation.archived && evaluation.is_active !== false
        );

        if (activeEvaluations.length === 0) {
          setRankings([]);
          return;
        }

        // 2. Para cada avaliação, buscar alunos
        const studentDataMap = new Map<string, {
          nome: string;
          turma: string;
          escola?: string;
          notas: number[];
          proficiencias: number[];
          avaliacoesCompletadas: number;
        }>();

        // Limitar a 15 avaliações para não sobrecarregar
        const evaluationsToProcess = activeEvaluations.slice(0, 15);

        for (const evaluation of evaluationsToProcess) {
          try {
            const students = await EvaluationResultsApiService.getStudentsByEvaluation(evaluation.id);
            
            // Processar alunos desta avaliação
            students.forEach((student: any) => {
              // Apenas alunos que completaram a avaliação
              if (student.status === 'concluida' || student.status === 'concluída') {
                const studentId = student.id;
                const nota = Number(student.nota || student.grade || student.score || 0);
                const proficiencia = Number(student.proficiencia || student.proficiency || 0);

                if (studentDataMap.has(studentId)) {
                  const existing = studentDataMap.get(studentId)!;
                  existing.notas.push(nota);
                  if (proficiencia > 0) {
                    existing.proficiencias.push(proficiencia);
                  }
                  existing.avaliacoesCompletadas += 1;
                  // Atualizar turma/escola se não estiver definido
                  if (!existing.turma && student.turma) {
                    existing.turma = student.turma;
                  }
                  if (!existing.escola && student.escola) {
                    existing.escola = student.escola;
                  }
                } else {
                  studentDataMap.set(studentId, {
                    nome: student.nome || student.name || "Aluno sem nome",
                    turma: student.turma || student.class_name || "N/A",
                    escola: student.escola || student.school_name,
                    notas: [nota],
                    proficiencias: proficiencia > 0 ? [proficiencia] : [],
                    avaliacoesCompletadas: 1,
                  });
                }
              }
            });
          } catch (evalError) {
            // Continuar com próxima avaliação se houver erro
            console.warn(`Erro ao buscar alunos da avaliação ${evaluation.id}:`, evalError);
          }
        }

        // 3. Calcular médias e criar ranking
        const rankingsArray: StudentRanking[] = Array.from(studentDataMap.entries())
          .map(([studentId, data]) => {
            const averageScore = data.notas.length > 0
              ? data.notas.reduce((sum, nota) => sum + nota, 0) / data.notas.length
              : 0;
            
            const bestProficiency = data.proficiencias.length > 0
              ? Math.max(...data.proficiencias)
              : undefined;

            return {
              position: 0,
              studentName: data.nome,
              serie: undefined,
              className: data.turma,
              schoolName: data.escola,
              averageScore,
              totalEvaluations: data.avaliacoesCompletadas,
              bestProficiency,
            };
          })
          .filter((student) => student.averageScore > 0) // Apenas alunos com pelo menos uma nota
          .sort((a, b) => {
            // Ordenar por média de notas (decrescente)
            if (b.averageScore !== a.averageScore) {
              return b.averageScore - a.averageScore;
            }
            // Em caso de empate, ordenar por número de avaliações (mais avaliações = melhor)
            return b.totalEvaluations - a.totalEvaluations;
          })
          .slice(0, 10) // Top 10
          .map((student, index) => ({
            ...student,
            position: index + 1,
          }));

        setRankings(rankingsArray);
      } catch (error: unknown) {
        console.error("Erro ao buscar ranking de alunos:", error);
        const axiosError = error as { response?: { status?: number; data?: { message?: string } } };
        
        if (axiosError.response?.status === 500) {
          const errorMessage = axiosError.response?.data?.message || '';
          const isEmptyError = errorMessage.toLowerCase().includes('nenhum') || 
                             errorMessage.toLowerCase().includes('não encontrado') ||
                             errorMessage.toLowerCase().includes('empty') ||
                             errorMessage.toLowerCase().includes('no data') ||
                             errorMessage === '';
          
          if (isEmptyError) {
            console.info('Nenhum aluno encontrado para compor o ranking.');
            setRankings([]);
            setError(null);
          } else {
            setError("Não foi possível carregar o ranking de alunos.");
            setRankings([]);
          }
        } else {
          setError("Não foi possível carregar o ranking de alunos.");
          setRankings([]);
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchStudentRankings();
  }, []);

  const getPerformanceColor = (score: number) => {
    if (score >= 8) return "text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400";
    if (score >= 6) return "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30 dark:text-yellow-400";
    return "text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400";
  };

  const getPositionIcon = (position: number) => {
    if (position === 1) return <Trophy className="h-4 w-4 text-yellow-500" />;
    if (position === 2) return <Award className="h-4 w-4 text-muted-foreground" />;
    if (position === 3) return <Award className="h-4 w-4 text-amber-600" />;
    return <span className="text-sm font-medium text-muted-foreground">#{position}</span>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top Alunos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top Alunos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-500 py-8">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (rankings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top Alunos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            Nenhum aluno encontrado para compor o ranking.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Top Alunos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rankings.map((student) => (
            <div key={student.position} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors border-border">
              {/* Posição e Nome do Aluno */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  {getPositionIcon(student.position)}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-sm truncate">
                    {student.studentName}
                  </h4>
                  <p className="text-xs text-muted-foreground truncate">
                    {[student.serie, student.className].filter(Boolean).join(" • ")}
                    {student.schoolName && ` • ${student.schoolName}`}
                  </p>
                </div>
              </div>

              {/* Métricas */}
              <div className="flex items-center gap-4 flex-shrink-0">
                {/* Média de Notas */}
                <div className="text-center">
                  <div className={`text-sm font-semibold px-2 py-1 rounded-full ${getPerformanceColor(student.averageScore)}`}>
                    {student.averageScore > 0 ? student.averageScore.toFixed(1) : '0.0'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Média</p>
                </div>

                {/* Número de Avaliações */}
                <div className="text-center">
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3 text-blue-500" />
                    <span className="text-sm font-medium">{student.totalEvaluations}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Avaliações</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
