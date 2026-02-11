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
  LayoutDashboard,
} from "lucide-react";
import { useAuth } from "@/context/authContext";
import { useToast } from "@/hooks/use-toast";
import ProfessorDashboard from "./ProfessorDashboard";
import { fetchDashboardCountsByRole, DashboardCounts } from "@/lib/dashboard/fetch-dashboard-stats-by-role";
import { useDashboardByRole } from "@/hooks/use-cache";
import { DashboardApiService } from "@/services/dashboardApi";
import { CertificatesApiService } from "@/services/certificatesApi";
import type { AdminDashboard, DiretorDashboard } from "@/types/dashboard";

const Index = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [avisosQuantidade, setAvisosQuantidade] = useState<number | null>(null);
  const [certificadosQuantidade, setCertificadosQuantidade] = useState<number | null>(null);

  // Novo hook para buscar dados do dashboard por role
  const dashboardData = user?.role ? useDashboardByRole(user.role) : null;
  const dashboard = dashboardData?.data as AdminDashboard | DiretorDashboard | null;

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

  // Quantidade de avisos (admin e tecadm)
  useEffect(() => {
    const role = user?.role?.toLowerCase();
    if (role !== "admin" && role !== "tecadm") return;

    let isMounted = true;
    DashboardApiService.getAvisosQuantidade()
      .then((qtd) => {
        if (isMounted) setAvisosQuantidade(qtd);
      })
      .catch(() => {
        if (isMounted) setAvisosQuantidade(0);
      });
    return () => {
      isMounted = false;
    };
  }, [user?.role]);

  // Quantidade de certificados emitidos (admin, tecadm, diretor, coordenador)
  useEffect(() => {
    const role = user?.role?.toLowerCase();
    if (!role || role === "aluno" || role === "professor") return;

    let isMounted = true;
    CertificatesApiService.getQuantidade()
      .then((qtd) => {
        if (isMounted) setCertificadosQuantidade(qtd);
      })
      .catch(() => {
        if (isMounted) setCertificadosQuantidade(0);
      });
    return () => {
      isMounted = false;
    };
  }, [user?.role]);

  // Usar dados da nova API se disponível, senão usar fallback
  const isLoadingDashboard = dashboardData?.isLoading ?? isLoading;
  const hasNewDashboardData = dashboard !== null;
  // Priorizar counts (comprehensive-stats) quando disponível, para não exibir zeros se a API nova falhar ou retornar vazio
  const useCountsForMain = counts !== null;

  // Check user role and render appropriate dashboard
  if (user?.role === "professor") {
    return <ProfessorDashboard />;
  }

  // Default dashboard for admin and other roles
  return (
    <div className="mobile-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <LayoutDashboard className="w-8 h-8 text-blue-600" />
          Painel Administrativo
        </h1>
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
          value={
            useCountsForMain
              ? counts!.students
              : hasNewDashboardData && "summary" in dashboard
                ? dashboard.summary.students
                : counts?.students ?? 0
          }
          subtitle="Total de estudantes"
          performance={
            (useCountsForMain ? counts!.students : (hasNewDashboardData && "summary" in dashboard ? dashboard.summary.students : counts?.students ?? 0)) > 1000
              ? "excellent"
              : (useCountsForMain ? counts!.students : (hasNewDashboardData && "summary" in dashboard ? dashboard.summary.students : counts?.students ?? 0)) > 500
              ? "good"
              : "average"
          }
          isLoading={isLoadingDashboard}
        />
        <ModernStatCard
          icon={
            (useCountsForMain ? counts!.institution.label.includes("Turma") : (hasNewDashboardData && "summary" in dashboard && dashboard.summary.classes > 0)) ? (
              <List size={20} className="sm:w-6 sm:h-6" />
            ) : (
              <School size={20} className="sm:w-6 sm:h-6" />
            )
          }
          title={
            useCountsForMain
              ? counts!.institution.label
              : hasNewDashboardData && "summary" in dashboard
                ? (dashboard.summary.classes > 0 ? "Turmas" : "Escolas")
                : counts?.institution.label ?? "Instituições"
          }
          value={
            useCountsForMain
              ? counts!.institution.count
              : hasNewDashboardData && "summary" in dashboard
                ? (dashboard.summary.classes > 0 ? dashboard.summary.classes : (dashboard.summary as { schools?: number }).schools ?? 0)
                : counts?.institution.count ?? 0
          }
          subtitle={
            useCountsForMain
              ? (counts!.institution.label.includes("Turma") ? "Turmas vinculadas" : "Instituições cadastradas")
              : hasNewDashboardData && "summary" in dashboard
                ? (dashboard.summary.classes > 0 ? "Turmas vinculadas" : "Escolas cadastradas")
                : counts?.institution.label.includes("Turma")
                ? "Turmas vinculadas"
                : "Instituições cadastradas"
          }
          performance={
            (useCountsForMain ? counts!.institution.count : (hasNewDashboardData && "summary" in dashboard ? (dashboard.summary.classes > 0 ? dashboard.summary.classes : (dashboard.summary as { schools?: number }).schools ?? 0) : counts?.institution.count ?? 0)) > 50
              ? "excellent"
              : (useCountsForMain ? counts!.institution.count : (hasNewDashboardData && "summary" in dashboard ? (dashboard.summary.classes > 0 ? dashboard.summary.classes : (dashboard.summary as { schools?: number }).schools ?? 0) : counts?.institution.count ?? 0)) > 20
              ? "good"
              : "average"
          }
          isLoading={isLoadingDashboard}
        />
        <ModernStatCard
          icon={<List size={20} className="sm:w-6 sm:h-6" />}
          title="Avaliações"
          value={
            useCountsForMain
              ? counts!.evaluations
              : hasNewDashboardData && "summary" in dashboard
                ? dashboard.summary.evaluations
                : counts?.evaluations ?? 0
          }
          subtitle="Avaliações ativas"
          performance={
            (useCountsForMain ? counts!.evaluations : (hasNewDashboardData && "summary" in dashboard ? dashboard.summary.evaluations : counts?.evaluations ?? 0)) > 100
              ? "excellent"
              : (useCountsForMain ? counts!.evaluations : (hasNewDashboardData && "summary" in dashboard ? dashboard.summary.evaluations : counts?.evaluations ?? 0)) > 50
              ? "good"
              : "average"
          }
          isLoading={isLoadingDashboard}
        />
        <ModernStatCard
          icon={<Gamepad size={20} className="sm:w-6 sm:h-6" />}
          title="Jogos"
          value={
            useCountsForMain
              ? counts!.games
              : hasNewDashboardData && "summary" in dashboard
                ? (dashboard.summary as { games?: number }).games ?? 0
                : counts?.games ?? 0
          }
          subtitle="Jogos educacionais"
          performance={
            (useCountsForMain ? counts!.games : (hasNewDashboardData && "summary" in dashboard ? (dashboard.summary as { games?: number }).games ?? 0 : counts?.games ?? 0)) > 20
              ? "excellent"
              : (useCountsForMain ? counts!.games : (hasNewDashboardData && "summary" in dashboard ? (dashboard.summary as { games?: number }).games ?? 0 : counts?.games ?? 0)) > 10
              ? "good"
              : "average"
          }
          isLoading={isLoadingDashboard}
        />
      </div>

      {/* Cards Secundários */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <PerformanceCard
          icon={<User size={20} className="sm:w-6 sm:h-6" />}
          title="Usuários"
          value={
            useCountsForMain
              ? counts!.users
              : hasNewDashboardData && "summary" in dashboard
                ? (dashboard.summary as { users?: number }).users ?? 0
                : counts?.users ?? 0
          }
          subtitle="Usuários do sistema"
          performance={
            (useCountsForMain ? counts!.users : (hasNewDashboardData && "summary" in dashboard ? (dashboard.summary as { users?: number }).users ?? 0 : counts?.users ?? 0)) > 500
              ? "excellent"
              : (useCountsForMain ? counts!.users : (hasNewDashboardData && "summary" in dashboard ? (dashboard.summary as { users?: number }).users ?? 0 : counts?.users ?? 0)) > 200
              ? "good"
              : "average"
          }
        />
        <PerformanceCard
          icon={<Headset size={20} className="sm:w-6 sm:h-6" />}
          title="Questões no Banco"
          value={
            useCountsForMain
              ? counts!.questions
              : hasNewDashboardData && "summary" in dashboard
                ? (dashboard.summary as { questions?: number }).questions ?? 0
                : counts?.questions ?? 0
          }
          subtitle="Banco de questões"
          performance={
            (useCountsForMain ? counts!.questions : (hasNewDashboardData && "summary" in dashboard ? (dashboard.summary as { questions?: number }).questions ?? 0 : counts?.questions ?? 0)) > 150
              ? "excellent"
              : (useCountsForMain ? counts!.questions : (hasNewDashboardData && "summary" in dashboard ? (dashboard.summary as { questions?: number }).questions ?? 0 : counts?.questions ?? 0)) > 50
              ? "good"
              : "average"
          }
        />
        <PerformanceCard
          icon={<Bell size={20} className="sm:w-6 sm:h-6" />}
          title="Avisos"
          value={
            avisosQuantidade !== null
              ? avisosQuantidade
              : hasNewDashboardData && "secondary_cards" in dashboard
                ? dashboard.secondary_cards.find((c) => c.id === "notices" || c.id === "avisos")?.value ?? "--"
                : "--"
          }
          subtitle="Avisos"
          performance="average"
        />
        <PerformanceCard
          icon={<Award size={20} className="sm:w-6 sm:h-6" />}
          title="Certificados"
          value={
            certificadosQuantidade !== null
              ? certificadosQuantidade
              : hasNewDashboardData && "secondary_cards" in dashboard
                ? dashboard.secondary_cards.find((c) => c.id === "certificates")?.value ?? "--"
                : "--"
          }
          subtitle="Certificados"
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
