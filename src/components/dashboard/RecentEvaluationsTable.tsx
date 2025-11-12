import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, CheckCircle, AlertCircle, XCircle, Users, Calendar } from "lucide-react";
import { api } from "@/lib/api";

interface RecentEvaluation {
  id: string;
  title: string;
  subject: string;
  school: string;
  status: 'completed' | 'in_progress' | 'pending' | 'expired';
  progress: number;
  totalStudents: number;
  completedStudents: number;
  averageScore: number;
  startDate: string;
  endDate: string;
  timeRemaining?: string;
}

export default function RecentEvaluationsTable() {
  const [evaluations, setEvaluations] = useState<RecentEvaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecentEvaluations = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Usar endpoint de testes para buscar avaliações recentes
        const response = await api.get('/test/', {
          params: {
            per_page: 10,
            sort: 'created_at',
            order: 'desc'
          }
        });

        const data = response.data;
        
        if (data?.data && Array.isArray(data.data)) {
          const activeEvaluations = data.data.filter((evaluation: any) => {
            return !evaluation.deleted_at && !evaluation.archived && evaluation.is_active !== false;
          });

          const recentEvaluations = activeEvaluations.map((evaluation: any) => {
            const startDate = evaluation.data_inicio || evaluation.created_at;
            const endDate = evaluation.data_fim || null;

            return {
              id: evaluation.id,
              title: evaluation.title || "Avaliação sem título",
              subject: evaluation.subject_rel?.name || evaluation.subject?.name || "Disciplina não informada",
              school:
                evaluation.schools && evaluation.schools.length > 0
                  ? typeof evaluation.schools[0] === "string"
                    ? evaluation.schools[0]
                    : evaluation.schools[0].name
                  : "Escola não informada",
              status: getEvaluationStatus(evaluation),
              progress: Number(evaluation.progress_percentage ?? 0),
              totalStudents: Number(evaluation.total_students ?? 0),
              completedStudents: Number(evaluation.completed_students ?? 0),
              averageScore: Number(evaluation.average_score ?? 0),
              startDate: startDate,
              endDate: endDate,
              timeRemaining: calculateTimeRemaining(endDate),
            };
          });

          setEvaluations(recentEvaluations);
        } else if (data?.tests && Array.isArray(data.tests)) {
          const activeTests = data.tests.filter((evaluation: any) => {
            return !evaluation.deleted_at && !evaluation.archived && evaluation.is_active !== false;
          });

          const recentEvaluations = activeTests.map((evaluation: any) => {
            const startDate = evaluation.data_inicio || evaluation.created_at;
            const endDate = evaluation.data_fim || null;

            return {
              id: evaluation.id,
              title: evaluation.title || "Avaliação sem título",
              subject: evaluation.subject_rel?.name || evaluation.subject?.name || "Disciplina não informada",
              school:
                evaluation.schools && evaluation.schools.length > 0
                  ? typeof evaluation.schools[0] === "string"
                    ? evaluation.schools[0]
                    : evaluation.schools[0].name
                  : "Escola não informada",
              status: getEvaluationStatus(evaluation),
              progress: Number(evaluation.progress_percentage ?? 0),
              totalStudents: Number(evaluation.total_students ?? 0),
              completedStudents: Number(evaluation.completed_students ?? 0),
              averageScore: Number(evaluation.average_score ?? 0),
              startDate: startDate,
              endDate: endDate,
              timeRemaining: calculateTimeRemaining(endDate),
            };
          });

          setEvaluations(recentEvaluations);
        } else {
          setEvaluations([]);
        }
      } catch (error) {
        console.error('Erro ao buscar avaliações recentes:', error);
        setError('Erro ao carregar dados');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentEvaluations();
  }, []);

  const getEvaluationStatus = (evaluation: any): RecentEvaluation["status"] => {
    const now = new Date();
    const startValue = evaluation.data_inicio || evaluation.start_date || evaluation.created_at;
    const endValue = evaluation.data_fim || evaluation.end_date;

    const startDate = startValue ? new Date(startValue) : null;
    const endDate = endValue ? new Date(endValue) : null;

    if (evaluation.status === "finalizada" || Number(evaluation.progress_percentage ?? 0) === 100) {
      return "completed";
    }

    if (endDate && now > endDate) {
      return "expired";
    }

    if (startDate && now < startDate) {
      return "pending";
    }

    return "in_progress";
  };

  const calculateTimeRemaining = (endDate: string | null | undefined): string => {
    if (!endDate) {
      return "Sem prazo definido";
    }

    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();

    if (Number.isNaN(diff) || diff <= 0) return "Expirada";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days} dias restantes`;
    if (hours > 0) return `${hours} horas restantes`;
    return "Menos de 1 hora";
  };

  const getStatusIcon = (status: RecentEvaluation['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'expired':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: RecentEvaluation['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
    }
  };

  const getStatusText = (status: RecentEvaluation['status']) => {
    switch (status) {
      case 'completed':
        return 'Concluída';
      case 'in_progress':
        return 'Em Andamento';
      case 'pending':
        return 'Pendente';
      case 'expired':
        return 'Expirada';
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
          <div className="text-center text-red-500 py-4">
            {error}
          </div>
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
            <div key={evaluation.id} className="p-3 rounded-lg border hover:bg-muted transition-colors border-border">
              {/* Header com título e status */}
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

              {/* Barra de progresso */}
              <div className="mb-2">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Progresso</span>
                  <span>{evaluation.progress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      evaluation.status === 'completed' ? 'bg-green-500' :
                      evaluation.status === 'in_progress' ? 'bg-blue-500' :
                      evaluation.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${evaluation.progress}%` }}
                  />
                </div>
              </div>

              {/* Métricas */}
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
                  <span>{evaluation.timeRemaining}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
