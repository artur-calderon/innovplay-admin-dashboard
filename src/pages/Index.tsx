
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

const Index = () => {
  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-6">Painel Administrativo</h1>
      
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard 
          icon={<Users size={24} />} 
          title="Alunos" 
          value="1,245" 
          color="bg-blue-500"
        />
        <StatCard 
          icon={<School size={24} />} 
          title="Escolas" 
          value="42" 
          color="bg-green-500"
        />
        <StatCard 
          icon={<List size={24} />} 
          title="Avaliações" 
          value="128" 
          color="bg-amber-500"
        />
        <StatCard 
          icon={<Gamepad size={24} />} 
          title="Jogos" 
          value="36" 
          color="bg-purple-500"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard 
          icon={<User size={24} />} 
          title="Usuários" 
          value="2,845" 
          color="bg-indigo-500"
        />
        <StatCard 
          icon={<Headset size={24} />} 
          title="Plantões Online" 
          value="18" 
          color="bg-pink-500"
        />
        <StatCard 
          icon={<Bell size={24} />} 
          title="Avisos" 
          value="57" 
          color="bg-red-500"
        />
        <StatCard 
          icon={<Award size={24} />} 
          title="Certificados" 
          value="356" 
          color="bg-teal-500"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard 
          icon={<Trophy size={24} />} 
          title="Competições" 
          value="12" 
          color="bg-orange-500"
        />
        <StatCard 
          icon={<Award size={24} />} 
          title="Olimpíadas" 
          value="8" 
          color="bg-cyan-500"
        />
        <StatCard 
          icon={<Tv size={24} />} 
          title="Play TV" 
          value="64" 
          color="bg-yellow-500"
        />
      </div>
      
      {/* Recent Students and Evaluations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <RecentStudents />
        <RecentEvaluations />
      </div>
      
      {/* Questions Table */}
      <div className="mb-8">
        <QuestionsTable />
      </div>
    </Layout>
  );
};

export default Index;
