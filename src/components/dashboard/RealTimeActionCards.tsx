import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Upload, 
  FileText, 
  Settings, 
  ArrowRight,
  Users,
  BookOpen,
  BarChart3,
  Cog,
  TrendingUp,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface ActionData {
  totalEvaluations: number;
  totalStudents: number;
  totalQuestions: number;
  recentEvaluations: number;
  pendingCorrections: number;
  activeUsers: number;
}

interface ActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: () => void;
  color: string;
  bgColor: string;
  count?: number;
  countLabel?: string;
  status?: 'normal' | 'warning' | 'success';
  isLoading?: boolean;
}

function RealTimeActionCard({ 
  icon, 
  title, 
  description, 
  action, 
  color, 
  bgColor, 
  count, 
  countLabel, 
  status = 'normal',
  isLoading = false 
}: ActionCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'warning': return 'text-orange-600';
      case 'success': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'warning': return <AlertTriangle className="h-3 w-3" />;
      case 'success': return <CheckCircle className="h-3 w-3" />;
      default: return <TrendingUp className="h-3 w-3" />;
    }
  };

  return (
    <Card className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-0 shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-3 rounded-lg ${bgColor} group-hover:scale-110 transition-transform duration-200`}>
            <div className={color}>
              {icon}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm group-hover:text-blue-600 transition-colors">
                {title}
              </h3>
              {count !== undefined && (
                <Badge variant="secondary" className="text-xs">
                  {isLoading ? (
                    <Skeleton className="h-3 w-6" />
                  ) : (
                    count
                  )}
                </Badge>
              )}
            </div>
            
            <p className="text-xs text-gray-500 mb-2 line-clamp-2">
              {description}
            </p>

            {countLabel && count !== undefined && (
              <div className={`flex items-center gap-1 mb-2 text-xs ${getStatusColor()}`}>
                {getStatusIcon()}
                <span>
                  {isLoading ? (
                    <Skeleton className="h-3 w-16 inline-block" />
                  ) : (
                    countLabel
                  )}
                </span>
              </div>
            )}

            <Button 
              onClick={action}
              size="sm" 
              variant="ghost" 
              className="h-8 px-2 text-xs group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors"
              disabled={isLoading}
            >
              Acessar
              <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function RealTimeActionCards() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<ActionData>({
    totalEvaluations: 0,
    totalStudents: 0,
    totalQuestions: 0,
    recentEvaluations: 0,
    pendingCorrections: 0,
    activeUsers: 0
  });

  useEffect(() => {
    const fetchActionData = async () => {
      try {
        setIsLoading(true);

        // Buscar dados em paralelo
        const [evaluationsRes, studentsRes, questionsRes, usersRes] = await Promise.allSettled([
          api.get('/test/', { params: { per_page: 100 } }),
          api.get('/students', { params: { per_page: 100 } }),
          api.get('/questions/recent', { params: { per_page: 100 } }),
          api.get('/users/list', { params: { per_page: 100 } })
        ]);

        let totalEvaluations = 0;
        let totalStudents = 0;
        let totalQuestions = 0;
        let recentEvaluations = 0;
        let pendingCorrections = 0;
        let activeUsers = 0;

        // Processar avaliações
        if (evaluationsRes.status === 'fulfilled') {
          const allEvaluations = evaluationsRes.value.data?.data || evaluationsRes.value.data || [];
          // Filtrar avaliações ativas (não deletadas/arquivadas)
          const evaluations = allEvaluations.filter((evaluation: any) => 
            !evaluation.deleted_at && 
            !evaluation.archived && 
            evaluation.is_active !== false
          );
          totalEvaluations = evaluations.length;
          
          // Contar pendências
          pendingCorrections = evaluations.filter((evaluation: any) => 
            evaluation.status === 'pending' || evaluation.needs_correction
          ).length;

          // Contar recentes (últimos 7 dias)
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          
          recentEvaluations = evaluations.filter((evaluation: any) => {
            if (!evaluation.created_at) return false;
            const createdDate = new Date(evaluation.created_at);
            return createdDate > weekAgo;
          }).length;
        }

        // Processar estudantes
        if (studentsRes.status === 'fulfilled') {
          const students = studentsRes.value.data?.data || studentsRes.value.data || [];
          totalStudents = students.length;
        }

        // Processar questões
        if (questionsRes.status === 'fulfilled') {
          const questions = questionsRes.value.data?.data || questionsRes.value.data || [];
          totalQuestions = questions.length;
        }

        // Processar usuários
        if (usersRes.status === 'fulfilled') {
          const users = usersRes.value.data?.data || usersRes.value.data || [];
          activeUsers = users.length;
        }

        setData({
          totalEvaluations,
          totalStudents,
          totalQuestions,
          recentEvaluations,
          pendingCorrections,
          activeUsers
        });

      } catch (error) {
        console.error('Erro ao buscar dados dos cards:', error);
        toast({
          title: "Aviso",
          description: "Alguns dados podem não estar atualizados.",
          variant: "default",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchActionData();
  }, [toast]);

  const actions = [
    {
      icon: <Plus className="h-5 w-5" />,
      title: "Criar Nova Avaliação",
      description: "Crie uma nova avaliação personalizada com questões de múltipla escolha, dissertativas e mais.",
      action: () => navigate('/app/criar-avaliacao'),
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      count: data.recentEvaluations,
      countLabel: `${data.recentEvaluations} criadas esta semana`,
      status: data.recentEvaluations > 0 ? 'success' : 'normal' as const
    },
    {
      icon: <Upload className="h-5 w-5" />,
      title: "Gerenciar Usuários",
      description: "Gerencie alunos, professores e outros usuários do sistema de forma eficiente.",
      action: () => navigate('/app/cadastros/gestao?tab=usuarios'),
      color: "text-green-600",
      bgColor: "bg-green-50",
      count: data.totalStudents,
      countLabel: `${data.totalStudents} alunos cadastrados`,
      status: 'normal' as const
    },
    {
      icon: <FileText className="h-5 w-5" />,
      title: "Gerar Relatório",
      description: "Gere relatórios detalhados de performance, estatísticas e análises personalizadas.",
      action: () => navigate('/app/relatorios/analise-avaliacoes'),
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      count: data.pendingCorrections,
      countLabel: data.pendingCorrections > 0 
        ? `${data.pendingCorrections} correções pendentes` 
        : "Todas as correções em dia",
      status: data.pendingCorrections > 0 ? 'warning' : 'success' as const
    },
    {
      icon: <Settings className="h-5 w-5" />,
      title: "Configurar Sistema",
      description: "Configure parâmetros do sistema, usuários, permissões e integrações.",
      action: () => navigate('/app/configuracoes'),
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      count: data.activeUsers,
      countLabel: `${data.activeUsers} usuários ativos`,
      status: 'normal' as const
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Cog className="h-5 w-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-800">Ações Rápidas</h2>
        {!isLoading && (
          <Badge variant="outline" className="text-xs">
            Atualizado agora
          </Badge>
        )}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {actions.map((action, index) => (
          <RealTimeActionCard
            key={index}
            icon={action.icon}
            title={action.title}
            description={action.description}
            action={action.action}
            color={action.color}
            bgColor={action.bgColor}
            count={action.count}
            countLabel={action.countLabel}
            status={action.status}
            isLoading={isLoading}
          />
        ))}
      </div>

      {/* Cards adicionais com dados em tempo real */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
        <Card 
          className="group cursor-pointer transition-all duration-200 hover:shadow-md border border-gray-200"
          onClick={() => navigate('/app/cadastros/gestao?tab=usuarios')}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-50">
                <Users className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-xs text-gray-700">Gerenciar Usuários</h4>
                <p className="text-xs text-gray-500">
                  {isLoading ? (
                    <Skeleton className="h-3 w-20" />
                  ) : (
                    `${data.activeUsers} usuários no sistema`
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="group cursor-pointer transition-all duration-200 hover:shadow-md border border-gray-200"
          onClick={() => navigate('/app/cadastros/questao')}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-teal-50">
                <BookOpen className="h-4 w-4 text-teal-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-xs text-gray-700">Banco de Questões</h4>
                <p className="text-xs text-gray-500">
                  {isLoading ? (
                    <Skeleton className="h-3 w-24" />
                  ) : (
                    `${data.totalQuestions} questões disponíveis`
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="group cursor-pointer transition-all duration-200 hover:shadow-md border border-gray-200"
          onClick={() => navigate('/app/resultados')}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-cyan-50">
                <BarChart3 className="h-4 w-4 text-cyan-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-xs text-gray-700">Análise de Dados</h4>
                <p className="text-xs text-gray-500">
                  {isLoading ? (
                    <Skeleton className="h-3 w-20" />
                  ) : (
                    `${data.totalEvaluations} avaliações analisadas`
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
