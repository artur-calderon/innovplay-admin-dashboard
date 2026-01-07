import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  FileText, 
  CheckCircle, 
  Award,
  Clock,
  BarChart3,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Info
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/authContext";
import { useToast } from "@/hooks/use-toast";

interface DetailedMetrics {
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  totalEvaluations: number;
  completedEvaluations: number;
  pendingEvaluations: number;
  averageScore: number;
  totalClasses: number;
  evaluationsThisMonth: number;
  lastUpdate: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  percentage?: number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  status?: 'success' | 'warning' | 'error' | 'info';
}

function MetricCard({ title, value, percentage, subtitle, icon, trend, status = 'info' }: MetricCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'down': return <TrendingDown className="h-3 w-3 text-red-500" />;
      default: return <Minus className="h-3 w-3 text-gray-500" />;
    }
  };

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${getStatusColor()}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="p-2 rounded-lg bg-white/50">
            {icon}
          </div>
          {trend && (
            <div className="flex items-center gap-1">
              {getTrendIcon()}
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <h3 className="font-semibold text-sm">{title}</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{value}</span>
          </div>
          {subtitle && (
            <p className="text-xs opacity-80">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DetailedMetricsOverview() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<DetailedMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDetailedMetrics = async () => {
      if (!user?.id) return;

      try {
        setIsLoading(true);

        const [studentsRes, evaluationsRes, classesRes] = await Promise.allSettled([
          api.get('/students', { params: { per_page: 1000 } }),
          api.get('/test/', { params: { per_page: 1000 } }),
          api.get('/classes', { params: { per_page: 1000 } })
        ]);

        let totalStudents = 0;
        let activeStudents = 0;
        let inactiveStudents = 0;
        let totalEvaluations = 0;
        let completedEvaluations = 0;
        let pendingEvaluations = 0;
        let averageScore = 0;
        let totalClasses = 0;
        let evaluationsThisMonth = 0;

        // Processar estudantes
        if (studentsRes.status === 'fulfilled') {
          const studentsData = studentsRes.value.data;
          const students = Array.isArray(studentsData) ? studentsData : studentsData?.data || [];
          totalStudents = students.length;

          // Calcular estudantes ativos/inativos
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);

          activeStudents = students.filter((student: any) => {
            if (student.last_login) {
              return new Date(student.last_login) > weekAgo;
            }
            if (student.created_at) {
              const createdDate = new Date(student.created_at);
              return createdDate > weekAgo;
            }
            return false;
          }).length;

          inactiveStudents = totalStudents - activeStudents;
        }

        // Processar avaliações
        if (evaluationsRes.status === 'fulfilled') {
          const evaluationsData = evaluationsRes.value.data;
          const evaluations = Array.isArray(evaluationsData) ? evaluationsData : evaluationsData?.data || [];
          
          totalEvaluations = evaluations.length;

          // Contar por status
          completedEvaluations = evaluations.filter((evaluation: any) => {
            const status = evaluation.status?.toLowerCase();
            return status === 'completed' || status === 'finalizada' || evaluation.is_active === false;
          }).length;

          pendingEvaluations = evaluations.filter((evaluation: any) => {
            const status = evaluation.status?.toLowerCase();
            return status === 'pending' || status === 'pendente' || evaluation.needs_correction;
          }).length;

          // Avaliações deste mês
          const thisMonth = new Date();
          thisMonth.setDate(1);

          evaluationsThisMonth = evaluations.filter((evaluation: any) => {
            if (!evaluation.created_at) return false;
            const createdDate = new Date(evaluation.created_at);
            return createdDate >= thisMonth;
          }).length;

          // Calcular média
          const evaluationsWithScores = evaluations.filter((evaluation: any) => 
            evaluation.average_score !== null && evaluation.average_score !== undefined
          );

          if (evaluationsWithScores.length > 0) {
            const scoresSum = evaluationsWithScores.reduce((sum: number, evaluation: any) => 
              sum + (evaluation.average_score || 0), 0
            );
            averageScore = scoresSum / evaluationsWithScores.length;
          }
        }

        // Processar turmas
        if (classesRes.status === 'fulfilled') {
          const classesData = classesRes.value.data;
          totalClasses = Array.isArray(classesData) ? classesData.length : classesData?.data?.length || 0;
        }

        setMetrics({
          totalStudents,
          activeStudents,
          inactiveStudents,
          totalEvaluations,
          completedEvaluations,
          pendingEvaluations,
          averageScore,
          totalClasses,
          evaluationsThisMonth,
          lastUpdate: new Date().toLocaleString('pt-BR')
        });

      } catch (error) {
        console.error('Erro ao buscar métricas detalhadas:', error);
        toast({
          title: "Aviso",
          description: "Alguns dados podem não estar atualizados.",
          variant: "default",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetailedMetrics();
  }, [user?.id, toast]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <Skeleton className="h-16 w-full mb-2" />
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-6 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground flex items-center justify-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Erro ao carregar métricas detalhadas
          </div>
        </CardContent>
      </Card>
    );
  }

  // Removido cálculo de porcentagens conforme solicitado

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Visão Geral
        </h3>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Info className="h-4 w-4" />
          Atualizado: {metrics.lastUpdate}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total de Alunos"
          value={metrics.totalStudents}
          subtitle={`${metrics.activeStudents} ativos esta semana`}
          icon={<Users className="h-5 w-5" />}
          status={metrics.totalStudents > 0 ? 'success' : 'warning'}
        />

        <MetricCard
          title="Avaliações"
          value={metrics.totalEvaluations}
          subtitle={`${metrics.evaluationsThisMonth} criadas este mês`}
          icon={<FileText className="h-5 w-5" />}
          trend={metrics.evaluationsThisMonth > 0 ? 'up' : 'stable'}
          status={metrics.totalEvaluations > 0 ? 'success' : 'warning'}
        />

        <MetricCard
          title="Concluídas"
          value={metrics.completedEvaluations}
          subtitle={`${metrics.pendingEvaluations} pendentes de correção`}
          icon={<CheckCircle className="h-5 w-5" />}
          status={metrics.completedEvaluations > 0 ? 'success' : 'warning'}
        />

        <MetricCard
          title="Média Geral"
          value={metrics.averageScore > 0 ? metrics.averageScore.toFixed(1) : '0.0'}
          subtitle="Nota média das avaliações"
          icon={<Award className="h-5 w-5" />}
          trend={metrics.averageScore >= 7.5 ? 'up' : metrics.averageScore >= 6 ? 'stable' : 'down'}
          status={metrics.averageScore >= 8 ? 'success' : metrics.averageScore >= 6 ? 'info' : 'warning'}
        />

        <MetricCard
          title="Taxa de Conclusão"
          value={metrics.completedEvaluations}
          subtitle="Avaliações finalizadas"
          icon={<Target className="h-5 w-5" />}
          status={metrics.completedEvaluations > 0 ? 'success' : 'warning'}
        />

        <MetricCard
          title="Turmas Ativas"
          value={metrics.totalClasses}
          subtitle="Turmas sob sua responsabilidade"
          icon={<Users className="h-4 w-4" />}
          status={metrics.totalClasses > 0 ? 'success' : 'warning'}
        />

        <MetricCard
          title="Pendentes"
          value={metrics.pendingEvaluations}
          percentage={pendingPercentage}
          subtitle="Correções em andamento"
          icon={<Clock className="h-5 w-5" />}
          trend={metrics.pendingEvaluations === 0 ? 'up' : 'down'}
          status={metrics.pendingEvaluations === 0 ? 'success' : metrics.pendingEvaluations < 5 ? 'info' : 'warning'}
        />

        <MetricCard
          title="Engajamento"
          value={metrics.activeStudents}
          subtitle="Alunos ativos esta semana"
          icon={<BarChart3 className="h-5 w-5" />}
          status={metrics.activeStudents > 0 ? 'success' : 'warning'}
        />
      </div>
    </div>
  );
}
