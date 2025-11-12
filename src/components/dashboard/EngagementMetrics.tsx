import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  Clock, 
  TrendingUp, 
  Activity,
  Calendar,
  Eye,
  Repeat
} from "lucide-react";
import { api } from "@/lib/api";

interface EngagementMetrics {
  activeUsers: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    growth: number;
  };
  sessionTime: {
    average: number;
    total: number;
    growth: number;
  };
  popularEvaluations: {
    id: string;
    title: string;
    views: number;
    completions: number;
  }[];
  returnRate: {
    percentage: number;
    totalUsers: number;
    returningUsers: number;
    growth: number;
  };
}

export default function EngagementMetrics() {
  const [metrics, setMetrics] = useState<EngagementMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEngagementMetrics = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [usersOutcome, evaluationsOutcome, schoolsOutcome] = await Promise.allSettled([
          api.get("/users/list"),
          api.get("/test/", { params: { per_page: 100 } }),
          api.get("/schools/recent"),
        ]);

        const users = usersOutcome.status === "fulfilled" ? usersOutcome.value.data?.users ?? usersOutcome.value.data ?? [] : [];
        const evaluations =
          evaluationsOutcome.status === "fulfilled"
            ? evaluationsOutcome.value.data?.data ?? evaluationsOutcome.value.data?.tests ?? []
            : [];
        const schools =
          schoolsOutcome.status === "fulfilled" ? schoolsOutcome.value.data ?? [] : [];

        if (users.length === 0 && evaluations.length === 0) {
          setMetrics(null);
          setError("Métricas de engajamento indisponíveis no momento.");
          return;
        }

        const totalUsers = users.length;
        const totalEvaluations = evaluations.length;
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const activeToday = users.filter((user: any) => {
          const userDate = user.created_at || user.last_login;
          if (!userDate) {
            return false;
          }
          const date = new Date(userDate);
          return date >= startOfDay;
        }).length;

        const activeThisWeek = users.filter((user: any) => {
          const userDate = user.created_at || user.last_login;
          if (!userDate) {
            return false;
          }
          const date = new Date(userDate);
          return date >= sevenDaysAgo;
        }).length;

        const activeThisMonth = users.filter((user: any) => {
          const userDate = user.created_at || user.last_login;
          if (!userDate) {
            return false;
          }
          const date = new Date(userDate);
          return date >= thirtyDaysAgo;
        }).length;

        const totalSessions = evaluations.reduce((sum: number, evaluation: any) => {
          return sum + Number(evaluation.total_students ?? 0);
        }, 0);

        const averageSessionTime =
          totalEvaluations > 0 ? Math.floor(totalSessions / totalEvaluations) : 0;

        const popularEvaluations = evaluations
          .filter((evaluation: any) => evaluation.total_students)
          .sort((a: any, b: any) => Number(b.total_students ?? 0) - Number(a.total_students ?? 0))
          .slice(0, 3)
          .map((evaluation: any) => ({
            id: evaluation.id,
            title: evaluation.title || "Avaliação sem título",
            views: Number(evaluation.total_students ?? 0),
            completions: Number(evaluation.completed_students ?? 0),
          }));

        setMetrics({
          activeUsers: {
            today: activeToday,
            thisWeek: activeThisWeek,
            thisMonth: activeThisMonth,
            growth: totalUsers > 0 ? Math.floor((activeThisMonth / totalUsers) * 100) : 0,
          },
          sessionTime: {
            average: averageSessionTime,
            total: totalSessions,
            growth: totalEvaluations > 0 ? Math.floor((totalSessions / totalEvaluations) * 10) : 0,
          },
          popularEvaluations,
          returnRate: {
            percentage: totalUsers > 0 ? Math.floor((activeThisMonth / totalUsers) * 100) : 0,
            totalUsers,
            returningUsers: activeThisMonth,
            growth: totalUsers > 0 ? Math.floor((activeThisWeek / totalUsers) * 100) : 0,
          },
        });
      } catch (error) {
        console.error('Erro ao buscar métricas de engajamento:', error);
        setError('Erro ao carregar dados');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEngagementMetrics();
  }, []);

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return "text-green-600";
    if (growth < 0) return "text-red-600";
    return "text-gray-600";
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return "↗️";
    if (growth < 0) return "↘️";
    return "→";
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
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

  if (error || !metrics) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            {error || 'Erro ao carregar métricas de engajamento'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards principais de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Usuários Ativos */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuários Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-gray-900">
                {metrics.activeUsers.today.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">
                Hoje
              </div>
              <div className="flex items-center gap-1">
                <span className={`text-xs ${getGrowthColor(metrics.activeUsers.growth)}`}>
                  {getGrowthIcon(metrics.activeUsers.growth)} {Math.abs(metrics.activeUsers.growth)}%
                </span>
                <span className="text-xs text-gray-500">vs mês anterior</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tempo de Sessão */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Tempo Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-gray-900">
                {formatTime(metrics.sessionTime.average)}
              </div>
              <div className="text-xs text-gray-500">
                Por sessão
              </div>
              <div className="flex items-center gap-1">
                <span className={`text-xs ${getGrowthColor(metrics.sessionTime.growth)}`}>
                  {getGrowthIcon(metrics.sessionTime.growth)} {Math.abs(metrics.sessionTime.growth)}%
                </span>
                <span className="text-xs text-gray-500">vs mês anterior</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Taxa de Retorno */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Repeat className="h-4 w-4" />
              Taxa de Retorno
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-gray-900">
                {metrics.returnRate.percentage.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">
                {metrics.returnRate.returningUsers.toLocaleString()} de {metrics.returnRate.totalUsers.toLocaleString()}
              </div>
              <div className="flex items-center gap-1">
                <span className={`text-xs ${getGrowthColor(metrics.returnRate.growth)}`}>
                  {getGrowthIcon(metrics.returnRate.growth)} {Math.abs(metrics.returnRate.growth)}%
                </span>
                <span className="text-xs text-gray-500">vs mês anterior</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total de Horas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Tempo Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-gray-900">
                {metrics.sessionTime.total.toLocaleString()}h
              </div>
              <div className="text-xs text-gray-500">
                Este mês
              </div>
              <div className="flex items-center gap-1">
                <span className={`text-xs ${getGrowthColor(metrics.sessionTime.growth)}`}>
                  {getGrowthIcon(metrics.sessionTime.growth)} {Math.abs(metrics.sessionTime.growth)}%
                </span>
                <span className="text-xs text-gray-500">vs mês anterior</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Avaliações Mais Acessadas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Avaliações Mais Acessadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.popularEvaluations.map((evaluation, index) => (
              <div key={evaluation.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-600">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{evaluation.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">
                        {evaluation.views.toLocaleString()} visualizações
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">
                        {evaluation.completions.toLocaleString()} conclusões
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-700">
                    {((evaluation.completions / evaluation.views) * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500">Taxa de conclusão</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
