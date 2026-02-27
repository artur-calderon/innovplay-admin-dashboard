import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, 
  FileText, 
  Users, 
  BarChart3, 
  Settings, 
  BookOpen,
  Calendar,
  Download,
  Eye,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface QuickActionData {
  totalEvaluations: number;
  totalStudents: number;
  totalClasses: number;
  pendingCorrections: number;
  recentEvaluations: number;
  activeStudents: number;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
  bgColor: string;
  hoverColor: string;
  category: 'primary' | 'secondary';
  count?: number;
  countLabel?: string;
  apiEndpoint?: string;
}

export default function EnhancedQuickActions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<QuickActionData>({
    totalEvaluations: 0,
    totalStudents: 0,
    totalClasses: 0,
    pendingCorrections: 0,
    recentEvaluations: 0,
    activeStudents: 0
  });

  useEffect(() => {
    const fetchQuickActionData = async () => {
      if (!user?.id) return;

      try {
        setIsLoading(true);

        // Buscar dados de diferentes endpoints
        const [evaluationsRes, studentsRes, classesRes] = await Promise.allSettled([
          api.get('/test/', { params: { per_page: 100 } }),
          api.get('/students', { params: { per_page: 100 } }),
          api.get('/classes', { params: { per_page: 100 } })
        ]);

        let totalEvaluations = 0;
        let totalStudents = 0;
        let totalClasses = 0;
        let pendingCorrections = 0;
        let recentEvaluations = 0;
        let activeStudents = 0;

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
          
          // Contar avaliações pendentes de correção
          pendingCorrections = evaluations.filter((evaluation: any) => 
            evaluation.status === 'pending' || evaluation.needs_correction
          ).length;

          // Contar avaliações recentes (últimos 30 dias)
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          recentEvaluations = evaluations.filter((evaluation: any) => {
            if (!evaluation.created_at) return false;
            const createdDate = new Date(evaluation.created_at);
            return createdDate > thirtyDaysAgo;
          }).length;
        }

        // Processar estudantes
        if (studentsRes.status === 'fulfilled') {
          const students = studentsRes.value.data?.data || studentsRes.value.data || [];
          totalStudents = students.length;
          
          // Simular estudantes ativos (últimos 7 dias)
          activeStudents = Math.floor(totalStudents * 0.7);
        }

        // Processar turmas
        if (classesRes.status === 'fulfilled') {
          const classes = classesRes.value.data?.data || classesRes.value.data || [];
          totalClasses = classes.length;
        }

        setData({
          totalEvaluations,
          totalStudents,
          totalClasses,
          pendingCorrections,
          recentEvaluations,
          activeStudents
        });

      } catch (error) {
        console.error('Erro ao buscar dados das ações rápidas:', error);
        toast({
          title: "Aviso",
          description: "Alguns dados podem não estar atualizados.",
          variant: "default",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuickActionData();
  }, [user?.id, toast]);

  const quickActions: QuickAction[] = [
    // Ações principais
    {
      id: 'create-evaluation',
      title: 'Criar Avaliação',
      description: 'Nova avaliação para suas turmas',
      icon: <Plus className="h-5 w-5" />,
      href: '/app/criar-avaliacao',
      color: 'text-white',
      bgColor: 'bg-innov-purple',
      hoverColor: 'hover:bg-innov-purple/90',
      category: 'primary',
      count: data.recentEvaluations,
      countLabel: 'criadas este mês'
    },
    {
      id: 'view-evaluations',
      title: 'Minhas Avaliações',
      description: 'Gerenciar avaliações existentes',
      icon: <FileText className="h-5 w-5" />,
      href: '/app/avaliacoes',
      color: 'text-white',
      bgColor: 'bg-blue-600',
      hoverColor: 'hover:bg-blue-700',
      category: 'primary',
      count: data.totalEvaluations,
      countLabel: 'avaliações'
    },
    {
      id: 'manage-students',
      title: 'Gerenciar Alunos',
      description: 'Ver e organizar alunos',
      icon: <Users className="h-5 w-5" />,
      href: '/app/cadastros/gestao?tab=usuarios',
      color: 'text-white',
      bgColor: 'bg-green-600',
      hoverColor: 'hover:bg-green-700',
      category: 'primary',
      count: data.totalStudents,
      countLabel: 'alunos cadastrados'
    },
    {
      id: 'view-reports',
      title: 'Relatórios',
      description: 'Análises e estatísticas',
      icon: <BarChart3 className="h-5 w-5" />,
      href: '/app/relatorios/analise-avaliacoes',
      color: 'text-white',
      bgColor: 'bg-orange-600',
      hoverColor: 'hover:bg-orange-700',
      category: 'primary',
      count: data.pendingCorrections,
      countLabel: 'correções pendentes'
    },

    // Ações secundárias
    {
      id: 'manage-classes',
      title: 'Turmas',
      description: 'Organizar turmas',
      icon: <BookOpen className="h-4 w-4" />,
      href: '/app/cadastros/gestao?tab=turmas',
      color: 'text-foreground dark:text-foreground',
      bgColor: 'bg-muted dark:bg-muted',
      hoverColor: 'hover:bg-muted/80 dark:hover:bg-muted/80',
      category: 'secondary',
      count: data.totalClasses,
      countLabel: 'turmas'
    },
    {
      id: 'schedule',
      title: 'Agenda',
      description: 'Cronograma de aulas',
      icon: <Calendar className="h-4 w-4" />,
      href: '/app/agenda',
      color: 'text-foreground dark:text-foreground',
      bgColor: 'bg-muted dark:bg-muted',
      hoverColor: 'hover:bg-muted/80 dark:hover:bg-muted/80',
      category: 'secondary'
    },
    {
      id: 'export-data',
      title: 'Exportar Dados',
      description: 'Download de relatórios',
      icon: <Download className="h-4 w-4" />,
      href: '/app/relatorios/relatorio-escolar',
      color: 'text-foreground dark:text-foreground',
      bgColor: 'bg-muted dark:bg-muted',
      hoverColor: 'hover:bg-muted/80 dark:hover:bg-muted/80',
      category: 'secondary'
    },
    {
      id: 'view-results',
      title: 'Resultados',
      description: 'Desempenho detalhado',
      icon: <Eye className="h-4 w-4" />,
      href: '/app/resultados',
      color: 'text-foreground dark:text-foreground',
      bgColor: 'bg-muted dark:bg-muted',
      hoverColor: 'hover:bg-muted/80 dark:hover:bg-muted/80',
      category: 'secondary'
    },
    {
      id: 'settings',
      title: 'Configurações',
      description: 'Preferências do sistema',
      icon: <Settings className="h-4 w-4" />,
      href: '/app/configuracoes',
      color: 'text-foreground dark:text-foreground',
      bgColor: 'bg-muted dark:bg-muted',
      hoverColor: 'hover:bg-muted/80 dark:hover:bg-muted/80',
      category: 'secondary'
    }
  ];

  const handleActionClick = async (action: QuickAction) => {
    // Opcional: fazer uma verificação antes de navegar
    if (action.apiEndpoint) {
      try {
        await api.get(action.apiEndpoint);
      } catch (error) {
        console.warn(`Endpoint ${action.apiEndpoint} não disponível:`, error);
      }
    }
    navigate(action.href);
  };

  const primaryActions = quickActions.filter(action => {
    if (action.category !== 'primary') return false;
    if (user?.role === 'professor' && action.id === 'manage-students') return false;
    return true;
  });
  const secondaryActions = quickActions.filter(action => action.category === 'secondary');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="h-24 p-4 rounded-lg border">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Ações Principais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-foreground">
            Ações Rápidas
            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {primaryActions.map((action) => (
              <Button
                key={action.id}
                onClick={() => handleActionClick(action)}
                className={`h-auto p-4 flex flex-col items-start gap-2 ${action.bgColor} ${action.hoverColor} ${action.color} transition-all duration-200 hover:shadow-md`}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="p-2 rounded-lg bg-white/20">
                    {action.icon}
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="font-semibold text-sm">{action.title}</h3>
                    <p className="text-xs opacity-90 mt-1">{action.description}</p>
                    {action.count !== undefined && action.countLabel && (
                      <div className="flex items-center gap-1 mt-2">
                        <span className="text-lg font-bold">{action.count}</span>
                        <span className="text-xs opacity-75">{action.countLabel}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ações Secundárias */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-foreground">Outras Funcionalidades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {secondaryActions.map((action) => (
              <Button
                key={action.id}
                variant="ghost"
                onClick={() => handleActionClick(action)}
                className={`h-auto p-3 flex flex-col items-center gap-2 ${action.bgColor} ${action.hoverColor} ${action.color} transition-all duration-200`}
              >
                <div className="p-2 rounded-lg bg-background dark:bg-card border border-border">
                  {action.icon}
                </div>
                <div className="text-center">
                  <h4 className="font-medium text-xs">{action.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
                  {action.count !== undefined && action.countLabel && (
                    <div className="mt-1">
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{action.count}</span>
                      <span className="text-xs text-muted-foreground ml-1">{action.countLabel}</span>
                    </div>
                  )}
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Card de Ajuda/Suporte com dados dinâmicos */}
      <Card className="bg-gradient-to-r from-innov-blue/10 to-innov-purple/10 border-innov-purple/20 dark:from-innov-blue/20 dark:to-innov-purple/20 dark:border-innov-purple/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-innov-purple/10">
              <BookOpen className="h-6 w-6 text-innov-purple" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">Status do Sistema</h3>
              <p className="text-sm text-muted-foreground mb-3">
                {data.pendingCorrections > 0 ? (
                  <span className="flex items-center gap-1">
                    <AlertCircle className="h-4 w-4 text-orange-500 dark:text-orange-400" />
                    {data.pendingCorrections} correções pendentes
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-green-500 dark:text-green-400" />
                    Sistema funcionando normalmente
                  </span>
                )}
              </p>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => navigate('/app/avisos')}
                >
                  Central de Ajuda
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => navigate('/app/configuracoes')}
                >
                  Ver Tutoriais
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
