import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Upload, 
  FileText, 
  Settings, 
  ArrowRight,
  Users,
  BookOpen,
  BarChart3,
  Cog
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: () => void;
  color: string;
  bgColor: string;
}

function ActionCard({ icon, title, description, action, color, bgColor }: ActionCardProps) {
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
            <h3 className="font-semibold text-sm mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {title}
            </h3>
            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
              {description}
            </p>
            <Button 
              onClick={action}
              size="sm" 
              variant="ghost" 
              className="h-8 px-2 text-xs group-hover:bg-blue-50 dark:group-hover:bg-blue-950/30 group-hover:text-blue-600 transition-colors"
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

export default function ActionCards() {
  const navigate = useNavigate();

  const actions = [
    {
      icon: <Plus className="h-5 w-5" />,
      title: "Criar Nova Avaliação",
      description: "Crie uma nova avaliação personalizada com questões de múltipla escolha, dissertativas e mais.",
      action: () => navigate('/app/criar-avaliacao'),
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/30"
    },
    {
      icon: <Upload className="h-5 w-5" />,
      title: "Importar Alunos",
      description: "Importe uma lista de alunos em lote usando planilhas CSV ou Excel para agilizar o cadastro.",
      action: () => navigate('/app/usuarios'),
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950/30"
    },
    {
      icon: <FileText className="h-5 w-5" />,
      title: "Gerar Relatório",
      description: "Gere relatórios detalhados de performance, estatísticas e análises personalizadas.",
      action: () => navigate('/app/relatorios/analise-avaliacoes'),
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/30"
    },
    {
      icon: <Settings className="h-5 w-5" />,
      title: "Configurar Sistema",
      description: "Configure parâmetros do sistema, usuários, permissões e integrações.",
      action: () => navigate('/app/configuracoes'),
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-950/30"
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Cog className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-foreground">Ações Rápidas</h2>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {actions.map((action, index) => (
          <ActionCard
            key={index}
            icon={action.icon}
            title={action.title}
            description={action.description}
            action={action.action}
            color={action.color}
            bgColor={action.bgColor}
          />
        ))}
      </div>

      {/* Cards adicionais para funcionalidades específicas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
        <Card 
          className="group cursor-pointer transition-all duration-200 hover:shadow-md border border-border"
          onClick={() => navigate('/app/usuarios')}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/30">
                <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-xs text-foreground">Gerenciar Usuários</h4>
                <p className="text-xs text-muted-foreground">Adicionar, editar e gerenciar usuários do sistema</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="group cursor-pointer transition-all duration-200 hover:shadow-md border border-border"
          onClick={() => navigate('/app/cadastros/questao')}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/30">
                <BookOpen className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-xs text-foreground">Banco de Questões</h4>
                <p className="text-xs text-muted-foreground">Criar e gerenciar questões para avaliações</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="group cursor-pointer transition-all duration-200 hover:shadow-md border border-border"
          onClick={() => navigate('/app/resultados')}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-950/30">
                <BarChart3 className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-xs text-foreground">Análise de Dados</h4>
                <p className="text-xs text-muted-foreground">Visualizar métricas e tendências do sistema</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
