import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, TrendingUp, Users, Award, FileCheck } from "lucide-react";
import { DashboardApiService } from "@/services/dashboardApi";

interface SchoolRankingItem {
  posicao: number;
  escola_id: string;
  nome_escola: string;
  municipio: string;
  media: number;
  media_score_percent: number;
  quantidade_alunos: number;
  taxa_conclusao: number;
  quantidade_avaliacoes: number;
  total_turmas: number;
  total_provas_entregues: number;
}

export default function SchoolRankingTable() {
  const [rankings, setRankings] = useState<SchoolRankingItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSchoolRankings() {
      try {
        setIsLoading(true);
        setError(null);

        const data = await DashboardApiService.getSchoolRanking(10, 0);

        if (data?.ranking && Array.isArray(data.ranking)) {
          setRankings(data.ranking.slice(0, 10));
          setTotal(data.total ?? data.ranking.length);
        } else {
          setRankings([]);
          setTotal(0);
        }
      } catch (err) {
        console.error("Erro ao buscar ranking de escolas:", err);
        setError("Não foi possível carregar o ranking de escolas.");
        setRankings([]);
        setTotal(0);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSchoolRankings();
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
            Ranking de Escolas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border">
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
          <div className="text-center text-red-500 py-8">{error}</div>
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
        <p className="text-xs text-muted-foreground mt-1">
          Top 10 • ordenado por média (0–10)
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rankings.map((school) => (
            <div
              key={school.escola_id}
              className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0 w-8 flex items-center justify-center">
                  {getPositionIcon(school.posicao)}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-sm truncate">{school.nome_escola}</h4>
                  <p className="text-xs text-muted-foreground truncate">{school.municipio}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                <div className="text-center">
                  <div
                    className={`text-sm font-semibold px-2 py-1 rounded-full ${getPerformanceColor(school.media)}`}
                  >
                    {school.media > 0 ? school.media.toFixed(1) : "0.0"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Média</p>
                </div>

                <div className="text-center hidden sm:block">
                  <span className="text-sm font-medium">{school.media_score_percent?.toFixed(1) ?? "0"}%</span>
                  <p className="text-xs text-muted-foreground mt-0.5">Acerto</p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-sm font-medium">
                      {school.taxa_conclusao != null ? school.taxa_conclusao.toFixed(1) : "0"}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Conclusão</p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Users className="h-3 w-3 text-blue-500" />
                    <span className="text-sm font-medium">{school.quantidade_alunos ?? 0}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Alunos</p>
                </div>

                <div className="text-center hidden md:flex flex-col">
                  <div className="flex items-center justify-center gap-1">
                    <FileCheck className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm font-medium">{school.quantidade_avaliacoes ?? 0}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Avaliações</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
