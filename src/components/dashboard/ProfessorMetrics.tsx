import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ModernStatCard from "./ModernStatCard";
import { 
  Users, 
  FileText, 
  CheckCircle, 
  TrendingUp,
  Award,
  Clock,
  BarChart3,
  Target
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/authContext";
import { useToast } from "@/hooks/use-toast";
import { fetchDashboardCountsByRole, DashboardCounts } from "@/lib/dashboard/fetch-dashboard-stats-by-role";

interface ProfessorMetrics {
  totalStudents: number;
  totalEvaluations: number;
  completedEvaluations: number;
  pendingCorrections: number;
  averageScore: number;
  activeStudentsThisWeek: number;
  totalClasses: number;
  evaluationsThisMonth: number;
}

export default function ProfessorMetrics() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<ProfessorMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfessorMetrics = async () => {
      if (!user?.id || !user?.role) {
        return;
      }

      setIsLoading(true);
      let baseCounts: DashboardCounts | null = null;

      try {
        baseCounts = await fetchDashboardCountsByRole({
          role: user.role,
          userId: user.id,
        });

        const [studentsRes, evaluationsRes, classesRes] = await Promise.allSettled([
          api.get("/students", { params: { per_page: 1000 } }),
          api.get("/test/", { params: { per_page: 1000 } }),
          api.get("/classes", { params: { per_page: 1000 } }),
        ]);

        let totalStudents = baseCounts.students;
        let totalEvaluations = baseCounts.evaluations;
        let totalClasses = baseCounts.classes;
        let completedEvaluations = 0;
        let pendingCorrections = 0;
        let averageScore = 0;
        let activeStudentsThisWeek = 0;
        let evaluationsThisMonth = 0;

        if (studentsRes.status === "fulfilled") {
          const studentsPayload = studentsRes.value.data;
          const studentsList = Array.isArray(studentsPayload)
            ? studentsPayload
            : studentsPayload?.data ?? [];
          totalStudents = studentsList.length || totalStudents;

          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);

          activeStudentsThisWeek = studentsList.filter((student: any) => {
            if (student.last_login) {
              return new Date(student.last_login) > weekAgo;
            }
            if (student.created_at) {
              return new Date(student.created_at) > weekAgo;
            }
            return false;
          }).length;
        }

        if (evaluationsRes.status === "fulfilled") {
          const evaluationsPayload = evaluationsRes.value.data;
          const evaluationsList = Array.isArray(evaluationsPayload)
            ? evaluationsPayload
            : evaluationsPayload?.data ?? [];

          if (evaluationsList.length > 0) {
            totalEvaluations = evaluationsList.length;
          }

          completedEvaluations = evaluationsList.filter((evaluation: any) => {
            const status = String(evaluation.status ?? "").toLowerCase();
            return status === "completed" || status === "finalizada" || evaluation.is_active === false;
          }).length;

          pendingCorrections = evaluationsList.filter((evaluation: any) => {
            const status = String(evaluation.status ?? "").toLowerCase();
            return status === "pending" || status === "pendente" || Boolean(evaluation.needs_correction);
          }).length;

          const firstDayOfMonth = new Date();
          firstDayOfMonth.setDate(1);

          evaluationsThisMonth = evaluationsList.filter((evaluation: any) => {
            if (!evaluation.created_at) {
              return false;
            }
            const createdDate = new Date(evaluation.created_at);
            return createdDate >= firstDayOfMonth;
          }).length;

          const evaluationsWithScores = evaluationsList.filter((evaluation: any) => {
            return evaluation.average_score !== null && evaluation.average_score !== undefined;
          });

          if (evaluationsWithScores.length > 0) {
            const scoresSum = evaluationsWithScores.reduce((sum: number, evaluation: any) => {
              return sum + Number(evaluation.average_score || 0);
            }, 0);
            averageScore = scoresSum / evaluationsWithScores.length;
          }
        }

        if (classesRes.status === "fulfilled") {
          const classesPayload = classesRes.value.data;
          const classesList = Array.isArray(classesPayload)
            ? classesPayload
            : classesPayload?.data ?? [];
          totalClasses = classesList.length || totalClasses;
        }

        setMetrics({
          totalStudents,
          totalEvaluations,
          completedEvaluations,
          pendingCorrections,
          averageScore: Math.round(averageScore * 10) / 10,
          activeStudentsThisWeek,
          totalClasses,
          evaluationsThisMonth,
        });
      } catch (error) {
        console.error("Erro ao buscar métricas do professor:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as métricas.",
          variant: "destructive",
        });

        setMetrics({
          totalStudents: baseCounts?.students ?? 0,
          totalEvaluations: baseCounts?.evaluations ?? 0,
          completedEvaluations: 0,
          pendingCorrections: 0,
          averageScore: 0,
          activeStudentsThisWeek: 0,
          totalClasses: baseCounts?.classes ?? 0,
          evaluationsThisMonth: 0,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfessorMetrics();
  }, [toast, user?.id, user?.role]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, index) => (
          <Card key={index}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Erro ao carregar métricas
          </div>
        </CardContent>
      </Card>
    );
  }

  const getPerformanceLevel = (score: number): 'excellent' | 'good' | 'average' | 'poor' => {
    if (score >= 9) return 'excellent';
    if (score >= 7.5) return 'good';
    if (score >= 6) return 'average';
    return 'poor';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Visão Geral</h3>
        <div className="text-sm text-gray-500">
          Atualizado há poucos minutos
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ModernStatCard
          icon={<Users className="h-5 w-5" />}
          title="Total de Alunos"
          value={metrics.totalStudents}
          subtitle={`${metrics.activeStudentsThisWeek} ativos esta semana`}
          trend={{
            current: metrics.activeStudentsThisWeek,
            previous: Math.floor(metrics.activeStudentsThisWeek * 0.9),
            isPositive: true
          }}
          performance="good"
        />

        <ModernStatCard
          icon={<FileText className="h-5 w-5" />}
          title="Avaliações"
          value={metrics.totalEvaluations}
          subtitle={`${metrics.evaluationsThisMonth} criadas este mês`}
          trend={{
            current: metrics.evaluationsThisMonth,
            previous: Math.floor(metrics.evaluationsThisMonth * 0.8),
            isPositive: true
          }}
          performance="good"
        />

        <ModernStatCard
          icon={<CheckCircle className="h-5 w-5" />}
          title="Concluídas"
          value={metrics.completedEvaluations}
          subtitle={`${metrics.pendingCorrections} pendentes de correção`}
          trend={{
            current: metrics.completedEvaluations,
            previous: metrics.completedEvaluations - 2,
            isPositive: true
          }}
          performance={metrics.pendingCorrections > 5 ? 'average' : 'good'}
        />

        <ModernStatCard
          icon={<Award className="h-5 w-5" />}
          title="Média Geral"
          value={metrics.averageScore.toFixed(1)}
          subtitle="Nota média das avaliações"
          trend={{
            current: metrics.averageScore,
            previous: metrics.averageScore - 0.3,
            isPositive: true
          }}
          performance={getPerformanceLevel(metrics.averageScore)}
        />

        <ModernStatCard
          icon={<Target className="h-5 w-5" />}
          title="Taxa de Conclusão"
          value={metrics.completedEvaluations}
          subtitle="Avaliações finalizadas"
          performance={metrics.totalEvaluations > 0 && (metrics.completedEvaluations / metrics.totalEvaluations) > 0.8 ? 'excellent' : 'good'}
        />

        <ModernStatCard
          icon={<Users className="h-5 w-5" />}
          title="Turmas Ativas"
          value={metrics.totalClasses}
          subtitle="Turmas sob sua responsabilidade"
          performance="good"
        />

        <ModernStatCard
          icon={<Clock className="h-5 w-5" />}
          title="Pendentes"
          value={metrics.pendingCorrections}
          subtitle="Correções em andamento"
          performance={metrics.pendingCorrections > 10 ? 'poor' : metrics.pendingCorrections > 5 ? 'average' : 'good'}
        />

        <ModernStatCard
          icon={<BarChart3 className="h-5 w-5" />}
          title="Engajamento"
          value={metrics.activeStudentsThisWeek}
          subtitle="Alunos ativos esta semana"
          performance={metrics.totalStudents > 0 && (metrics.activeStudentsThisWeek / metrics.totalStudents) > 0.8 ? 'excellent' : 'good'}
        />
      </div>
    </div>
  );
}


