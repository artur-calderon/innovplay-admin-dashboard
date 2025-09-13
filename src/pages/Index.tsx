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
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import ProfessorDashboard from "./ProfessorDashboard";

interface DashboardStats {
  students: number;
  schools: number;
  evaluations: number;
  games: number;
  users: number;
  onlineSupport: number;
  notices: number;
  certificates: number;
  competitions: number;
  olympics: number;
  playTv: number;
}

const Index = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Only fetch dashboard stats for admin users and school managers
    if (user?.role !== "aluno" && user?.role !== "professor") {
      const fetchDashboardStats = async () => {
        try {
          setIsLoading(true);

           // Se for diretor/coordenador, priorizar dados da escola vinculada ao usuário
           const isManager = ["diretor", "coordenador"].includes(String(user?.role).toLowerCase());
           if (isManager && user?.id) {
             try {
               const schoolResp = await api.get(`/users/school/${user.id}`).catch(() => ({ data: null }));
               const schoolData = schoolResp?.data?.school || schoolResp?.data || null;
               const schoolId = schoolData?.id || schoolData?.school_id || schoolData?.school?.id;
               if (schoolId) {
                 // Buscar contagens específicas da escola
                 const [studentsRes, classesRes, evalsRes, usersRes] = await Promise.all([
                   api.get(`/students/school/${schoolId}`).catch(() => ({ data: [] })),
                   api.get(`/classes/school/${schoolId}`).catch(() => ({ data: [] })),
                   api.get(`/test`, { params: { school_id: schoolId, per_page: 1_000 } }).catch(() => ({ data: { data: [] } })),
                   api.get(`/users/school/${schoolId}`).catch(() => ({ data: [] })),
                 ]);

                 const studentsCount = Array.isArray(studentsRes.data) ? studentsRes.data.length : Number(studentsRes.data?.total || 0);
                 const classesCount = Array.isArray(classesRes.data) ? classesRes.data.length : Number(classesRes.data?.total || 0);
                 const evalRaw = evalsRes.data?.data || evalsRes.data?.tests || evalsRes.data || [];
                 const evaluationsCount = Array.isArray(evalRaw) ? evalRaw.length : Number(evalRaw?.total || 0);
                 const usersCount = Array.isArray(usersRes.data) ? usersRes.data.length : Number(usersRes.data?.total || 0);

                 setStats({
                   students: Number(studentsCount) || 0,
                   schools: 1,
                   evaluations: Number(evaluationsCount) || 0,
                   games: 0,
                   users: Number(usersCount) || 0,
                   onlineSupport: 0,
                   notices: 0,
                   certificates: 0,
                   competitions: 0,
                   olympics: 0,
                   playTv: 0,
                 });
                 return;
               }
             } catch (_) {
               // Se falhar, cai para o fluxo padrão global
             }
           }

           // Fluxo padrão (admin/tecadm): Buscar dados reais de múltiplos endpoints para maior precisão
           const [comprehensiveStatsResponse, evaluationStatsResponse, usersResponse, schoolsListResponse] = await Promise.all([
             api.get('/dashboard/comprehensive-stats'),
             api.get('/evaluations/stats').catch(() => ({ data: {} })), // Fallback se não existir
             api.get('/users/list').catch(() => ({ data: [] })), // Buscar lista de usuários
             api.get('/school').catch(() => ({ data: [] })) // Lista real de escolas
           ]);

           const comprehensiveStats = comprehensiveStatsResponse.data || {};
           const evaluationStats = evaluationStatsResponse.data || {};
           const usersData = usersResponse.data || [];
           const schoolsData = schoolsListResponse.data || [];

           // Contar usuários por role para garantir consistência
           const studentUsers = Array.isArray(usersData) ? 
             usersData.filter(user => user.role === 'aluno').length : 0;
           
           // Verificar dados recebidos para debug (apenas em desenvolvimento)
           if (process.env.NODE_ENV === 'development') {
             console.log('Debug Dashboard Stats:');
             console.log('Total usuários da API:', usersData.length);
             console.log('Usuários com role aluno:', studentUsers);
             console.log('comprehensiveStats.students:', comprehensiveStats.students);
             console.log('comprehensiveStats.users:', comprehensiveStats.users);
           }
           
           // Verificar se há inconsistência entre students e usuários com role aluno
           const studentsFromComprehensive = Number(comprehensiveStats.students) || 0;
           
           // Usar a contagem de usuários com role "aluno" se for consistente, 
           // caso contrário usar o valor do comprehensive stats
           const students = studentUsers > 0 ? studentUsers : studentsFromComprehensive;
          // Preferir contagem real da lista de escolas
          const schools = Array.isArray(schoolsData) ? schoolsData.length : (Number(comprehensiveStats.schools) || 0);
          const evaluations = Number(evaluationStats.total) || Number(comprehensiveStats.evaluations) || 0;
          const games = Number(comprehensiveStats.games) || 0;
          const users = Number(comprehensiveStats.users) || 0;
          const questions = Number(comprehensiveStats.questions) || 0;
          const classes = Number(comprehensiveStats.classes) || 0;
          const teachers = Number(comprehensiveStats.teachers) || 0;

          setStats({
            students,
            schools,
            evaluations,
            games,
            users,
            // Usar apenas dados reais disponíveis dos endpoints, caso contrário 0
            onlineSupport: Number(evaluationStats.active_evaluations) || 0,
            notices: Number(evaluationStats.this_month) || 0,
            certificates: 0, // Não disponível no backend - manter 0
            competitions: 0, // Não disponível no backend - manter 0
            olympics: 0, // Não disponível no backend - manter 0
            playTv: 0, // Não disponível no backend - manter 0
          });

        } catch (error) {
          console.error("Erro geral ao buscar estatísticas do dashboard:", error);

          // Valores padrão em caso de erro geral
          setStats({
            students: 0,
            schools: 0,
            evaluations: 0,
            games: 0,
            users: 0,
            onlineSupport: 0,
            notices: 0,
            certificates: 0,
            competitions: 0,
            olympics: 0,
            playTv: 0,
          });
        } finally {
          setIsLoading(false);
        }
      };

      fetchDashboardStats();
    }
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
          value={stats?.students || 0}
          subtitle="Total de estudantes"
          performance={stats?.students && stats.students > 1000 ? "excellent" : stats?.students && stats.students > 500 ? "good" : "average"}
          isLoading={isLoading}
        />
        <ModernStatCard
          icon={<School size={20} className="sm:w-6 sm:h-6" />}
          title="Escolas"
          value={stats?.schools || 0}
          subtitle="Instituições cadastradas"
          performance={stats?.schools && stats.schools > 50 ? "excellent" : stats?.schools && stats.schools > 20 ? "good" : "average"}
          isLoading={isLoading}
        />
        <ModernStatCard
          icon={<List size={20} className="sm:w-6 sm:h-6" />}
          title="Avaliações"
          value={stats?.evaluations || 0}
          subtitle="Avaliações ativas"
          performance={stats?.evaluations && stats.evaluations > 100 ? "excellent" : stats?.evaluations && stats.evaluations > 50 ? "good" : "average"}
          isLoading={isLoading}
        />
        <ModernStatCard
          icon={<Gamepad size={20} className="sm:w-6 sm:h-6" />}
          title="Jogos"
          value={stats?.games || 0}
          subtitle="Jogos educacionais"
          performance={stats?.games && stats.games > 20 ? "excellent" : stats?.games && stats.games > 10 ? "good" : "average"}
          isLoading={isLoading}
        />
      </div>

      {/* Cards Secundários */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <PerformanceCard
          icon={<User size={20} className="sm:w-6 sm:h-6" />}
          title="Usuários"
          value={stats?.users || 0}
          subtitle="Usuários do sistema"
          performance={stats?.users && stats.users > 500 ? "excellent" : stats?.users && stats.users > 200 ? "good" : "average"}
        />
        <PerformanceCard
          icon={<Headset size={20} className="sm:w-6 sm:h-6" />}
          title="Plantões Online"
          value={stats?.onlineSupport || 0}
          subtitle="Suporte ativo"
          performance={stats?.onlineSupport && stats.onlineSupport > 15 ? "excellent" : stats?.onlineSupport && stats.onlineSupport > 10 ? "good" : "average"}
        />
        <PerformanceCard
          icon={<Bell size={20} className="sm:w-6 sm:h-6" />}
          title="Avisos"
          value={stats?.notices || 0}
          subtitle="Notificações ativas"
          performance={stats?.notices && stats.notices > 40 ? "excellent" : stats?.notices && stats.notices > 20 ? "good" : "average"}
        />
        <PerformanceCard
          icon={<Award size={20} className="sm:w-6 sm:h-6" />}
          title="Certificados"
          value={stats?.certificates || 0}
          subtitle="Certificados emitidos"
          performance={stats?.certificates && stats.certificates > 250 ? "excellent" : stats?.certificates && stats.certificates > 150 ? "good" : "average"}
        />
      </div>

      {/* Tabelas Interativas - Nova Seção */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-6">
          <Target className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-800">Análises e Rankings</h2>
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
