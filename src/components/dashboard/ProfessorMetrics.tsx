import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ModernStatCard from "./ModernStatCard";
import { 
  Users, 
  FileText, 
  CheckCircle, 
  Award
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/authContext";
import { useToast } from "@/hooks/use-toast";
import { useProfessorDashboard } from "@/hooks/use-cache";
import type { ProfessorDashboard as ProfessorDashboardType } from "@/types/dashboard";

export default function ProfessorMetrics() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Hook para buscar dados do dashboard do professor
  const dashboardData = useProfessorDashboard();
  const dashboard = dashboardData?.data as ProfessorDashboardType | null;
  const isLoading = dashboardData?.isLoading ?? true;

  useEffect(() => {
    const fetchProfessorDashboard = async () => {
      if (!user?.id || !user?.role) {
        return;
      }

      // Se o hook não retornou dados, tentar buscar diretamente
      if (!dashboard && !isLoading) {
        try {
          await api.get<ProfessorDashboardType>("/dashboard/professor");
        } catch (error) {
          console.error("Erro ao buscar dashboard do professor:", error);
          toast({
            title: "Erro",
            description: "Não foi possível carregar as métricas do dashboard. Verifique se você está vinculado a turmas.",
            variant: "destructive",
          });
        }
      }
    };

    fetchProfessorDashboard();
  }, [toast, user?.id, user?.role, dashboard, isLoading]);

  // Função auxiliar para obter nível de performance baseado na nota
  const getPerformanceLevel = (score: number): 'excellent' | 'good' | 'average' | 'poor' => {
    if (score >= 9) return 'excellent';
    if (score >= 7.5) return 'good';
    if (score >= 6) return 'average';
    return 'poor';
  };

  // Função para mapear KPI para card
  // Os KPIs já são filtrados antes de chegar aqui, então todos têm valores válidos
  const renderKpiCard = (kpi: ProfessorDashboardType['kpis'][0], index: number) => {
    switch (kpi.id) {
      case 'students': {
        // Card: Total de Alunos na Turma
        // Backend: dashboard.kpis.find(k => k.id === 'students') - value: total de alunos, active_this_week: alunos ativos esta semana
        return (
          <ModernStatCard
            key={kpi.id}
            icon={<Users className="h-5 w-5" />}
            title="Total de Alunos na Turma"
            value={kpi.value}
            subtitle={kpi.active_this_week !== undefined && kpi.active_this_week > 0 
              ? `${kpi.active_this_week} alunos ativos esta semana` 
              : "Total de alunos nas suas turmas"}
            performance="good"
            delay={index * 80}
          />
        );
      }

      case 'evaluations': {
        // Card: Avaliações Criadas para a Turma
        // Backend: dashboard.kpis.find(k => k.id === 'evaluations') - value: total de avaliações, created_this_month: criadas este mês
        return (
          <ModernStatCard
            key={kpi.id}
            icon={<FileText className="h-5 w-5" />}
            title="Avaliações Criadas para a Turma"
            value={kpi.value}
            subtitle={kpi.created_this_month !== undefined && kpi.created_this_month > 0
              ? `${kpi.created_this_month} avaliações criadas este mês`
              : "Avaliações vinculadas às suas turmas"}
            performance="good"
            delay={index * 80}
          />
        );
      }

      case 'completed_evaluations': {
        // Card: Avaliações Concluídas pelos Alunos
        // Backend: dashboard.kpis.find(k => k.id === 'completed_evaluations') - value: avaliações concluídas
        return (
          <ModernStatCard
            key={kpi.id}
            icon={<CheckCircle className="h-5 w-5" />}
            title="Avaliações Concluídas pelos Alunos"
            value={kpi.value}
            subtitle="Quantidade de avaliações finalizadas pelos alunos"
            performance="good"
            delay={index * 80}
          />
        );
      }

      case 'average_score': {
        // Card: Média Geral dos Alunos
        // Backend: dashboard.kpis.find(k => k.id === 'average_score') - value: nota média das avaliações
        return (
          <ModernStatCard
            key={kpi.id}
            icon={<Award className="h-5 w-5" />}
            title="Média Geral dos Alunos"
            value={typeof kpi.value === 'number' ? kpi.value.toFixed(1) : kpi.value}
            subtitle="Média geral de notas de todas as avaliações"
            performance={getPerformanceLevel(kpi.value)}
            delay={index * 80}
          />
        );
      }

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!dashboard) {
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

  // Filtrar KPIs que têm valores válidos para renderizar
  const validKpis = dashboard.kpis.filter(kpi => 
    kpi.value !== null && kpi.value !== undefined && kpi.value > 0
  );

  // Verificar se há turmas para renderizar o card de Turmas Ativas
  const hasClasses = dashboard.summary.classes > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Visão Geral</h3>
        <div className="text-sm text-muted-foreground">
          Atualizado há poucos minutos
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Renderizar cards dinamicamente baseados nos KPIs do backend */}
        {validKpis.map((kpi, index) => renderKpiCard(kpi, index))}

        {/* Card de Turmas Ativas - apenas se houver turmas */}
        {/* Backend: dashboard.summary.classes - total de turmas do professor */}
        {hasClasses && (
          <ModernStatCard
            icon={<Users className="h-5 w-5" />}
            title="Turmas sob sua Responsabilidade"
            value={dashboard.summary.classes}
            subtitle="Total de turmas onde você está vinculado como professor"
            performance="good"
            delay={validKpis.length * 80}
          />
        )}
      </div>
    </div>
  );
}


