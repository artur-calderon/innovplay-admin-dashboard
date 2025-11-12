import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
// Componentes antigos removidos - substituídos pelos novos componentes da Fase 1

// Novos componentes da Fase 1
import SchoolRankingTable from "@/components/dashboard/SchoolRankingTable";
import TopStudentsTable from "@/components/dashboard/TopStudentsTable";
import RecentEvaluationsTable from "@/components/dashboard/RecentEvaluationsTable";
import QuestionsList from "@/components/dashboard/QuestionsList";
import ActionCards from "@/components/dashboard/ActionCards";
import ModernStatCard from "@/components/dashboard/ModernStatCard";
import PerformanceCard from "@/components/dashboard/PerformanceCard";

import {
  Users,
  School,
  List,
  Gamepad,
  User,
  Headset,
  Bell,
  Award,
  Trophy,
  Tv,
  TrendingUp,
  Clock,
  Target,
} from "lucide-react";
import { useAuth } from "@/context/authContext";
import { useToast } from "@/hooks/use-toast";
import ProfessorDashboard from "./ProfessorDashboard";
import { fetchDashboardCountsByRole, DashboardCounts } from "@/lib/dashboard/fetch-dashboard-stats-by-role";

const Index = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || !user?.role) {
      return;
    }

    const normalisedRole = String(user.role).toLowerCase();
    if (normalisedRole === "aluno" || normalisedRole === "professor") {
      return;
    }

    let isMounted = true;

    async function loadDashboardCounts() {
      try {
        setIsLoading(true);
        const metrics = await fetchDashboardCountsByRole({
          role: user.role,
          userId: user.id,
        });

        if (!isMounted) {
          return;
        }

        setCounts(metrics);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        console.error("Erro ao carregar estatísticas do painel:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as estatísticas do painel.",
          variant: "destructive",
        });
        setCounts(null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDashboardCounts();

    return () => {
      isMounted = false;
    };
  }, [toast, user?.role, user?.id]);

  // Check user role and render appropriate dashboard
  if (user?.role === "professor") {
    return <ProfessorDashboard />;
  }

  // Default dashboard for admin and other roles
  return (
    <div className="mobile-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h1 className="mobile-title font-bold">Painel Administrativo</h1>
        <span className="text-sm sm:text-base text-muted-foreground">
          Bem vindo! {user.name ? user.name : "Usuário"}
        </span>
      </div>

      {/* Cards de Ação Rápida */}
      <div className="mb-8">
        <ActionCards />
      </div>


      {/* Cards Principais com Performance */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <ModernStatCard
          icon={<Users size={20} className="sm:w-6 sm:h-6" />}
          title="Alunos"
          value={counts?.students ?? 0}
          subtitle="Total de estudantes"
          performance={
            counts?.students && counts.students > 1000
              ? "excellent"
              : counts?.students && counts.students > 500
              ? "good"
              : "average"
          }
          isLoading={isLoading}
        />
        <ModernStatCard
          icon={
            counts?.institution.label.includes("Turma") ? (
              <List size={20} className="sm:w-6 sm:h-6" />
            ) : (
              <School size={20} className="sm:w-6 sm:h-6" />
            )
          }
          title={counts?.institution.label ?? "Instituições"}
          value={counts?.institution.count ?? 0}
          subtitle={
            counts?.institution.label.includes("Turma")
              ? "Turmas vinculadas"
              : "Instituições cadastradas"
          }
          performance={
            counts?.institution.count && counts.institution.count > 50
              ? "excellent"
              : counts?.institution.count && counts.institution.count > 20
              ? "good"
              : "average"
          }
          isLoading={isLoading}
        />
        <ModernStatCard
          icon={<List size={20} className="sm:w-6 sm:h-6" />}
          title="Avaliações"
          value={counts?.evaluations ?? 0}
          subtitle="Avaliações ativas"
          performance={
            counts?.evaluations && counts.evaluations > 100
              ? "excellent"
              : counts?.evaluations && counts.evaluations > 50
              ? "good"
              : "average"
          }
          isLoading={isLoading}
        />
        <ModernStatCard
          icon={<Gamepad size={20} className="sm:w-6 sm:h-6" />}
          title="Jogos"
          value={counts?.games ?? 0}
          subtitle="Jogos educacionais"
          performance={
            counts?.games && counts.games > 20
              ? "excellent"
              : counts?.games && counts.games > 10
              ? "good"
              : "average"
          }
          isLoading={isLoading}
        />
      </div>

      {/* Cards Secundários */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <PerformanceCard
          icon={<User size={20} className="sm:w-6 sm:h-6" />}
          title="Usuários"
          value={counts?.users ?? 0}
          subtitle="Usuários do sistema"
          performance={
            counts?.users && counts.users > 500
              ? "excellent"
              : counts?.users && counts.users > 200
              ? "good"
              : "average"
          }
        />
        <PerformanceCard
          icon={<Headset size={20} className="sm:w-6 sm:h-6" />}
          title="Questões no Banco"
          value={counts?.questions ?? 0}
          subtitle="Banco de questões"
          performance={
            counts?.questions && counts.questions > 150
              ? "excellent"
              : counts?.questions && counts.questions > 50
              ? "good"
              : "average"
          }
        />
        <PerformanceCard
          icon={<Bell size={20} className="sm:w-6 sm:h-6" />}
          title="Avisos"
          value="--"
          subtitle="Em implementação"
          performance="average"
        />
        <PerformanceCard
          icon={<Award size={20} className="sm:w-6 sm:h-6" />}
          title="Certificados"
          value="--"
          subtitle="Em implementação"
          performance="average"
        />
      </div>

      {/* Tabelas Interativas - Nova Seção */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-6">
          <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-semibold text-foreground">Análises e Rankings</h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <SchoolRankingTable />
          <TopStudentsTable />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <RecentEvaluationsTable />
          <QuestionsList />
        </div>
      </div>

    </div>
  );
};

export default Index;
