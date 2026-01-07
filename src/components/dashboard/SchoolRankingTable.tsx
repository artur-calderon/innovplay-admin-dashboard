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

        const data = response.data;

        if (Array.isArray(data) && data.length > 0) {
          const rankingsArray = data
            .map((school: any) => ({
              position: 0,
              schoolName: school.name || "Escola sem nome",
              municipality: school.city?.name || school.city_name || "Não informado",
              averageScore: Number(school.average_score ?? school.avg_score ?? 0),
              completionRate: Number(
                school.completion_rate ?? school.completion_percentage ?? 0,
              ),
              totalStudents: Number(school.students_count ?? school.total_students ?? 0),
              totalEvaluations: Number(
                school.evaluations_count ?? school.total_evaluations ?? 0,
              ),
            }))
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
                    {school.averageScore.toFixed(1)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Média</p>
                </div>

                {/* Taxa de Conclusão */}
                <div className="text-center">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-sm font-medium">{school.completionRate.toFixed(1)}%</span>
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