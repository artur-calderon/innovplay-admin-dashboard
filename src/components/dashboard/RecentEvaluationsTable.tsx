import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, CheckCircle, AlertCircle, XCircle, Users, Calendar } from "lucide-react";
import { DashboardApiService } from "@/services/dashboardApi";

interface RecentEvaluation {
  id: string;
  title: string;
  subject: string;
  school: string;
  status: "completed" | "in_progress" | "pending" | "expired";
  progress: number;
  totalStudents: number;
  completedStudents: number;
  averageScore: number;
  startDate: string;
  endDate: string;
  timeRemaining?: string;
}

interface RecentEvaluationsTableProps {
  dashboard?: unknown;
}

function formatTimeRemaining(endDate: string | null | undefined): string {
  if (!endDate) return "Sem prazo definido";
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();
  if (Number.isNaN(diff) || diff <= 0) return "Expirada";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days} dias restantes`;
  if (hours > 0) return `${hours} horas restantes`;
  return "Menos de 1 hora";
}

export default function RecentEvaluationsTable(_props: RecentEvaluationsTableProps) {
  const [evaluations, setEvaluations] = useState<RecentEvaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecentEvaluations = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const dataRecentes = await DashboardApiService.getAvaliacoesRecentes(5);
        if (dataRecentes?.avaliacoes?.length > 0) {
          const mapped: RecentEvaluation[] = dataRecentes.avaliacoes.map((av) => {
            const rawMedia = av.media ?? av.nota_media ?? av.average_score;
            const averageScore = typeof rawMedia === "number" && !Number.isNaN(rawMedia) ? rawMedia : 0;
            const startDate = av.data_inicio ?? av.start_date ?? "";
            return {
              id: av.avaliacao_id,
              title: av.titulo,
              subject: av.disciplina || "—",
              school: av.escola || (av.escolas?.length ? av.escolas.join(", ") : "—"),
              status: normalizeStatus(av.status),
              progress: Number(av.progresso ?? 0),
              totalStudents: Number(av.quantidade_alunos_vao_fazer ?? 0),
              completedStudents: Number(av.quantidade_alunos_fizeram ?? 0),
              averageScore,
              startDate,
              endDate: av.prazo || "",
              timeRemaining: formatTimeRemaining(av.prazo),
            };
          });
          setEvaluations(mapped);
        } else {
          setEvaluations([]);
        }
      } catch {
        setEvaluations([]);
        setError("Erro ao carregar dados");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentEvaluations();
  }, []);

  function normalizeStatus(s: string): RecentEvaluation["status"] {
    const lower = s.toLowerCase();
    if (lower === "concluida" || lower === "completed" || lower === "finalizada") return "completed";
    if (lower === "expirada" || lower === "expired") return "expired";
    if (lower === "pendente" || lower === "pending") return "pending";
    return "in_progress";
  }

  const getStatusIcon = (status: RecentEvaluation["status"]) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "in_progress": return <Clock className="h-4 w-4 text-blue-500" />;
      case "pending": return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "expired": return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };
  const getStatusColor = (status: RecentEvaluation["status"]) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "in_progress": return "bg-blue-100 text-blue-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "expired": return "bg-red-100 text-red-800";
    }
  };
  const getStatusText = (status: RecentEvaluation["status"]) => {
    switch (status) {
      case "completed": return "Concluída";
      case "in_progress": return "Em Andamento";
      case "pending": return "Pendente";
      case "expired": return "Expirada";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Avaliações Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-20" />
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
            <Clock className="h-5 w-5 text-blue-500" />
            Avaliações Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-500 py-4">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (evaluations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Avaliações Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-6">
            Nenhuma avaliação recente encontrada.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-500" />
          Avaliações Recentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {evaluations.map((evaluation) => (
            <div
              key={evaluation.id}
              className="p-3 rounded-lg border hover:bg-muted transition-colors border-border"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{evaluation.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{evaluation.subject}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground truncate">{evaluation.school}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(evaluation.status)}
                  <Badge className={`text-xs ${getStatusColor(evaluation.status)}`}>
                    {getStatusText(evaluation.status)}
                  </Badge>
                </div>
              </div>
              <div className="mb-2">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Progresso</span>
                  <span>{evaluation.progress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      evaluation.status === "completed" ? "bg-green-500" :
                      evaluation.status === "in_progress" ? "bg-blue-500" :
                      evaluation.status === "pending" ? "bg-yellow-500" : "bg-red-500"
                    }`}
                    style={{ width: `${Math.min(100, evaluation.progress)}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{evaluation.completedStudents}/{evaluation.totalStudents} alunos</span>
                  </div>
                  {evaluation.averageScore > 0 && (
                    <div className="flex items-center gap-1">
                      <span>Média: {evaluation.averageScore.toFixed(1)}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{evaluation.timeRemaining ?? "Sem prazo definido"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
