import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  FileText, 
  Users, 
  BarChart3, 
  Settings, 
  BookOpen,
  Calendar,
  Download,
  Upload,
  Eye
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/authContext";

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
}

export default function ProfessorQuickActions() {
  const navigate = useNavigate();
  const { user } = useAuth();

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
      category: 'primary'
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
      category: 'primary'
    },
    {
      id: 'manage-students',
      title: 'Gerenciar Alunos',
      description: 'Ver e organizar alunos',
      icon: <Users className="h-5 w-5" />,
      href: '/app/usuarios',
      color: 'text-white',
      bgColor: 'bg-green-600',
      hoverColor: 'hover:bg-green-700',
      category: 'primary'
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
      category: 'primary'
    },

    // Ações secundárias
    {
      id: 'manage-classes',
      title: 'Turmas',
      description: 'Organizar turmas',
      icon: <BookOpen className="h-4 w-4" />,
      href: '/app/cadastros/turma',
      color: 'text-gray-700',
      bgColor: 'bg-gray-100',
      hoverColor: 'hover:bg-gray-200',
      category: 'secondary'
    },
    {
      id: 'schedule',
      title: 'Agenda',
      description: 'Cronograma de aulas',
      icon: <Calendar className="h-4 w-4" />,
      href: '/app/agenda',
      color: 'text-gray-700',
      bgColor: 'bg-gray-100',
      hoverColor: 'hover:bg-gray-200',
      category: 'secondary'
    },
    {
      id: 'import-students',
      title: 'Importar Alunos',
      description: 'Upload em lote',
      icon: <Upload className="h-4 w-4" />,
      href: '/app/usuarios',
      color: 'text-gray-700',
      bgColor: 'bg-gray-100',
      hoverColor: 'hover:bg-gray-200',
      category: 'secondary'
    },
    {
      id: 'export-data',
      title: 'Exportar Dados',
      description: 'Download de relatórios',
      icon: <Download className="h-4 w-4" />,
      href: '/app/relatorios/relatorio-escolar',
      color: 'text-gray-700',
      bgColor: 'bg-gray-100',
      hoverColor: 'hover:bg-gray-200',
      category: 'secondary'
    },
    {
      id: 'view-results',
      title: 'Resultados',
      description: 'Desempenho detalhado',
      icon: <Eye className="h-4 w-4" />,
      href: '/app/resultados',
      color: 'text-gray-700',
      bgColor: 'bg-gray-100',
      hoverColor: 'hover:bg-gray-200',
      category: 'secondary'
    },
    {
      id: 'settings',
      title: 'Configurações',
      description: 'Preferências do sistema',
      icon: <Settings className="h-4 w-4" />,
      href: '/app/configuracoes',
      color: 'text-gray-700',
      bgColor: 'bg-gray-100',
      hoverColor: 'hover:bg-gray-200',
      category: 'secondary'
    }
  ];

  const handleActionClick = (action: QuickAction) => {
    navigate(action.href);
  };

  const primaryActions = quickActions.filter(action => action.category === 'primary');
  const secondaryActions = quickActions.filter(action => action.category === 'secondary');

  return (
    <div className="space-y-6">
      {/* Ações Principais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ações Rápidas</CardTitle>
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
          <CardTitle className="text-base text-gray-700">Outras Funcionalidades</CardTitle>
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
                <div className="p-2 rounded-lg bg-white">
                  {action.icon}
                </div>
                <div className="text-center">
                  <h4 className="font-medium text-xs">{action.title}</h4>
                  <p className="text-xs opacity-70 mt-1">{action.description}</p>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Card de Ajuda/Suporte */}
      <Card className="bg-gradient-to-r from-innov-blue/10 to-innov-purple/10 border-innov-purple/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-innov-purple/10">
              <BookOpen className="h-6 w-6 text-innov-purple" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">Precisa de ajuda?</h3>
              <p className="text-sm text-gray-600 mb-3">
                Acesse nossos tutoriais e documentação para aproveitar ao máximo a plataforma.
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

