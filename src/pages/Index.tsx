import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import StatCard from "@/components/dashboard/StatCard";
import RecentStudents from "@/components/dashboard/RecentStudents";
import RecentEvaluations from "@/components/dashboard/RecentEvaluations";
import QuestionsTable from "@/components/dashboard/QuestionsTable";
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
  Tv
} from "lucide-react";
import { useAuth } from "@/context/authContext";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import StudentProfessorIndex from "./StudentProfessorIndex";

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
    // Only fetch dashboard stats for admin users
    if (user?.role !== "aluno" && user?.role !== "professor") {
      const fetchDashboardStats = async () => {
        try {
          setIsLoading(true);

          // Simular delay de carregamento
          await new Promise(resolve => setTimeout(resolve, 800));

          // Usar dados mockados realistas
          setStats({
            students: 30, // 30 alunos mockados implementados
            schools: 5, // Escolas mockadas
            evaluations: 12, // Avaliações mockadas
            games: 36, // Jogos mockados
            users: 45, // Total de usuários (alunos + professores + admin)
            onlineSupport: 18, // Plantões online
            notices: 57, // Avisos sistema
            certificates: 356, // Certificados emitidos
            competitions: 12, // Competições ativas
            olympics: 8, // Olimpíadas
            playTv: 64, // Conteúdo Play TV
          });

        } catch (error) {
          console.error("Erro ao buscar estatísticas do dashboard:", error);
          toast({
            title: "Erro",
            description: "Não foi possível carregar as estatísticas do dashboard",
            variant: "destructive",
          });
          
          // Valores padrão em caso de erro
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
  }, [toast, user?.role]);

  // Check user role and render appropriate dashboard
  if (user?.role === "aluno" || user?.role === "professor") {
    return <StudentProfessorIndex />;
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
      
      {/* Stat Cards Grid - Responsive layout */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard 
          icon={<Users size={20} className="sm:w-6 sm:h-6" />} 
          title="Alunos" 
          value={stats?.students || 0}
          color="bg-blue-500"
          isLoading={isLoading}
        />
        <StatCard 
          icon={<School size={20} className="sm:w-6 sm:h-6" />} 
          title="Escolas" 
          value={stats?.schools || 0}
          color="bg-green-500"
          isLoading={isLoading}
        />
        <StatCard 
          icon={<List size={20} className="sm:w-6 sm:h-6" />} 
          title="Avaliações" 
          value={stats?.evaluations || 0}
          color="bg-amber-500"
          isLoading={isLoading}
        />
        <StatCard 
          icon={<Gamepad size={20} className="sm:w-6 sm:h-6" />} 
          title="Jogos" 
          value={stats?.games || 0}
          color="bg-purple-500"
          isLoading={isLoading}
        />
        
        <StatCard 
          icon={<User size={20} className="sm:w-6 sm:h-6" />} 
          title="Usuários" 
          value={stats?.users || 0}
          color="bg-indigo-500"
          isLoading={isLoading}
        />
        <StatCard 
          icon={<Headset size={20} className="sm:w-6 sm:h-6" />} 
          title="Plantões Online" 
          value={stats?.onlineSupport || 0}
          color="bg-pink-500"
          isLoading={isLoading}
        />
        <StatCard 
          icon={<Bell size={20} className="sm:w-6 sm:h-6" />} 
          title="Avisos" 
          value={stats?.notices || 0}
          color="bg-red-500"
          isLoading={isLoading}
        />
        <StatCard 
          icon={<Award size={20} className="sm:w-6 sm:h-6" />} 
          title="Certificados" 
          value={stats?.certificates || 0}
          color="bg-teal-500"
          isLoading={isLoading}
        />
        
        <StatCard 
          icon={<Trophy size={20} className="sm:w-6 sm:h-6" />} 
          title="Competições" 
          value={stats?.competitions || 0}
          color="bg-orange-500"
          isLoading={isLoading}
        />
        <StatCard 
          icon={<Award size={20} className="sm:w-6 sm:h-6" />} 
          title="Olimpíadas" 
          value={stats?.olympics || 0}
          color="bg-cyan-500"
          isLoading={isLoading}
        />
        <StatCard 
          icon={<Tv size={20} className="sm:w-6 sm:h-6" />} 
          title="Play TV" 
          value={stats?.playTv || 0}
          color="bg-yellow-500"
          isLoading={isLoading}
        />
        {/* Empty slot to maintain grid alignment */}
        <div className="hidden lg:block"></div>
      </div>
      
      {/* Recent Students and Evaluations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <RecentStudents />
        <RecentEvaluations />
      </div>
      
      {/* Questions Table */}
      <div className="mb-6 sm:mb-8">
        <QuestionsTable />
      </div>
    </div>
  );
};

export default Index;
