import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, TrendingUp, Users, Award } from "lucide-react";
import { api } from "@/lib/api";

interface SchoolRanking {
  position: number;
  schoolName: string;
  municipality: string;
  averageScore: number;
  completionRate: number;
  totalStudents: number;
  totalEvaluations: number;
}

export default function SchoolRankingTable() {
  const [rankings, setRankings] = useState<SchoolRanking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSchoolRankings() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await api.get("/schools/recent", {
          params: {
            per_page: 50,
            include_stats: true,
          },
        });

        // Verificar diferentes estruturas de resposta
        const data = response.data?.data || response.data?.schools || response.data;
        
        // Log para debug (remover depois)
        if (data && Array.isArray(data) && data.length > 0) {
          console.log('📊 Estrutura de dados da escola (primeira):', JSON.stringify(data[0], null, 2));
        }

        if (Array.isArray(data) && data.length > 0) {
          const rankingsArray = data
            .map((school: any) => {
              // Tentar múltiplos nomes de campos para média
              const averageScore = Number(
                school.average_score ?? 
                school.avg_score ?? 
                school.media_nota ?? 
                school.average_grade ?? 
                school.media_score ??
                school.media_nota_geral ??
                school.stats?.average_score ??
                school.stats?.avg_score ??
                school.stats?.media_nota ??
                school.stats?.media_nota_geral ??
                school.statistics?.average_score ??
                school.statistics?.media_nota ??
                school.evaluation_stats?.average_score ??
                school.evaluation_stats?.media_nota ??
                0
              );

              // Tentar múltiplos nomes de campos para taxa de conclusão
              let completionRate = Number(
                school.completion_rate ?? 
                school.completion_percentage ?? 
                school.taxa_conclusao ??
                school.taxa_conclusao_percentual ??
                school.stats?.completion_rate ??
                school.stats?.completion_percentage ??
                school.stats?.taxa_conclusao ??
                school.statistics?.completion_rate ??
                school.statistics?.completion_percentage ??
                school.evaluation_stats?.completion_rate ??
                school.evaluation_stats?.completion_percentage ??
                0
              );

              // Se não encontrou, calcular a partir de dados disponíveis
              if (completionRate === 0 || isNaN(completionRate)) {
                const completedStudents = Number(
                  school.completed_students ?? 
                  school.students_completed ?? 
                  school.stats?.completed_students ??
                  school.statistics?.completed_students ??
                  0
                );
                const totalStudents = Number(
                  school.total_students ?? 
                  school.students_count ?? 
                  school.stats?.total_students ??
                  school.statistics?.total_students ??
                  0
                );
                
                if (totalStudents > 0) {
                  completionRate = (completedStudents / totalStudents) * 100;
                }
              }

              return {
                position: 0,
                schoolName: school.name || "Escola sem nome",
                municipality: school.city?.name || school.city_name || "Não informado",
                averageScore: isNaN(averageScore) ? 0 : averageScore,
                completionRate: isNaN(completionRate) ? 0 : completionRate,
                totalStudents: Number(school.students_count ?? school.total_students ?? school.students?.length ?? 0),
                totalEvaluations: Number(
                  school.evaluations_count ?? school.total_evaluations ?? school.evaluations?.length ?? 0,
                ),
              };
            })
            .filter((school) => school.schoolName !== "Escola sem nome")
            .sort((a, b) => {
              if (b.averageScore !== a.averageScore) {
                return b.averageScore - a.averageScore;
              }
              if (b.completionRate !== a.completionRate) {
                return b.completionRate - a.completionRate;
              }
              return b.totalStudents - a.totalStudents;
            })
            .slice(0, 10)
            .map((school, index) => ({
              ...school,
              position: index + 1,
            }));

          setRankings(rankingsArray);
        } else {
          setRankings([]);
        }
      } catch (error: unknown) {
        // ✅ MELHORADO: Tratar erro 500 como "sem dados" para endpoints de listagem
        const axiosError = error as { response?: { status?: number; data?: { message?: string } } };
        if (axiosError.response?.status === 500) {
          const errorMessage = axiosError.response?.data?.message || '';
          const isEmptyError = errorMessage.toLowerCase().includes('nenhum') || 
                             errorMessage.toLowerCase().includes('não encontrado') ||
                             errorMessage.toLowerCase().includes('empty') ||
                             errorMessage.toLowerCase().includes('no data') ||
                             errorMessage === '';
          
          if (isEmptyError) {
            // Não há escolas no sistema ainda - não é um erro real
            console.info('Nenhuma escola encontrada no sistema.');
            setRankings([]);
            setError(null);
          } else {
            console.error("Erro ao buscar ranking de escolas:", error);
            setError("Não foi possível carregar o ranking de escolas.");
            setRankings([]);
          }
        } else {
          console.error("Erro ao buscar ranking de escolas:", error);
          setError("Não foi possível carregar o ranking de escolas.");
          setRankings([]);
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchSchoolRankings();
  }, []);

  const getPerformanceColor = (score: number) => {
    if (score >= 8) return "text-green-600 bg-green-50";
    if (score >= 6) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
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
            Ranking de Escolas
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
            Ranking de Escolas
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
            Ranking de Escolas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            Nenhuma escola encontrada para compor o ranking.
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
          Ranking de Escolas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rankings.map((school) => (
            <div key={school.position} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors border-border">
              {/* Posição e Nome da Escola */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  {getPositionIcon(school.position)}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-sm truncate">
                    {school.schoolName}
                  </h4>
                  <p className="text-xs text-muted-foreground truncate">
                    {school.municipality}
                  </p>
                </div>
              </div>

              {/* Métricas */}
              <div className="flex items-center gap-4 flex-shrink-0">
                {/* Média de Pontuação */}
                <div className="text-center">
                  <div className={`text-sm font-semibold px-2 py-1 rounded-full ${getPerformanceColor(school.averageScore)}`}>
                    {school.averageScore > 0 ? school.averageScore.toFixed(1) : '0.0'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Média</p>
                </div>

                {/* Taxa de Conclusão */}
                <div className="text-center">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-sm font-medium">
                      {isNaN(school.completionRate) ? '0.0' : school.completionRate.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Conclusão</p>
                </div>

                {/* Número de Alunos */}
                <div className="text-center">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-blue-500" />
                    <span className="text-sm font-medium">{school.totalStudents}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Alunos</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}