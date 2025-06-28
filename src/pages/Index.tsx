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
import StudentProfessorIndex from "./StudentProfessorIndex";

const Index = () => {
  const { user } = useAuth();

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
          value="1,245" 
          color="bg-blue-500"
        />
        <StatCard 
          icon={<School size={20} className="sm:w-6 sm:h-6" />} 
          title="Escolas" 
          value="42" 
          color="bg-green-500"
        />
        <StatCard 
          icon={<List size={20} className="sm:w-6 sm:h-6" />} 
          title="Avaliações" 
          value="128" 
          color="bg-amber-500"
        />
        <StatCard 
          icon={<Gamepad size={20} className="sm:w-6 sm:h-6" />} 
          title="Jogos" 
          value="36" 
          color="bg-purple-500"
        />
        
        <StatCard 
          icon={<User size={20} className="sm:w-6 sm:h-6" />} 
          title="Usuários" 
          value="2,845" 
          color="bg-indigo-500"
        />
        <StatCard 
          icon={<Headset size={20} className="sm:w-6 sm:h-6" />} 
          title="Plantões Online" 
          value="18" 
          color="bg-pink-500"
        />
        <StatCard 
          icon={<Bell size={20} className="sm:w-6 sm:h-6" />} 
          title="Avisos" 
          value="57" 
          color="bg-red-500"
        />
        <StatCard 
          icon={<Award size={20} className="sm:w-6 sm:h-6" />} 
          title="Certificados" 
          value="356" 
          color="bg-teal-500"
        />
        
        <StatCard 
          icon={<Trophy size={20} className="sm:w-6 sm:h-6" />} 
          title="Competições" 
          value="12" 
          color="bg-orange-500"
        />
        <StatCard 
          icon={<Award size={20} className="sm:w-6 sm:h-6" />} 
          title="Olimpíadas" 
          value="8" 
          color="bg-cyan-500"
        />
        <StatCard 
          icon={<Tv size={20} className="sm:w-6 sm:h-6" />} 
          title="Play TV" 
          value="64" 
          color="bg-yellow-500"
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
