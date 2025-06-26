import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Info,
  Minus,
  Plus,
  Book,
  List,
  Sparkles,
  CalendarDays,
  Gamepad,
  Tv,
  Headset,
  Ticket,
  Award,
  Trophy,
  School,
  User as UserIcon,
  Bell,
  Settings,
  Edit,
  MessageSquare,
  ClipboardEdit,
  FileText,
  HelpCircle,
  BarChart2,
  Monitor,
  Save,
  ArrowLeft
} from "lucide-react";
import { useAuth } from "@/context/authContext";
import { useNavigate } from "react-router-dom";
import { quickLinksApi, QuickLink } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// Mapeamento reverso para obter componentes dos ícones
const iconComponents = {
  Book,
  List,
  Sparkles,
  CalendarDays,
  Gamepad,
  Tv,
  Headset,
  Ticket,
  Award,
  Trophy,
  School,
  UserIcon,
  Bell,
  Settings,
  Edit,
  MessageSquare,
  ClipboardEdit,
  FileText,
  HelpCircle,
  BarChart2,
  Monitor,
};

interface AvailableQuickLink {
  href: string;
  label: string;
  icon: string; // Nome do ícone como string
  iconComponent: React.ElementType; // Componente real do ícone
}

const EditQuickLinks = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [selectedQuickLinks, setSelectedQuickLinks] = useState<QuickLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Links disponíveis baseados no papel do usuário
  const allAvailableLinks: AvailableQuickLink[] = user?.role === "aluno" ?
    [
      { icon: "List", iconComponent: List, label: "Avaliações", href: `/aluno/avaliacoes` },
      { icon: "CalendarDays", iconComponent: CalendarDays, label: "Agenda", href: `/aluno/agenda` },
      { icon: "Gamepad", iconComponent: Gamepad, label: "Jogos", href: `/aluno/jogos` },
      { icon: "Tv", iconComponent: Tv, label: "Play TV", href: `/aluno/play-tv` },
      { icon: "Award", iconComponent: Award, label: "Certificados", href: `/aluno/certificados` },
      { icon: "Trophy", iconComponent: Trophy, label: "Competições", href: `/aluno/competicoes` },
      { icon: "Award", iconComponent: Award, label: "Olimpíadas", href: `/aluno/olimpiadas` },
      { icon: "UserIcon", iconComponent: UserIcon, label: "Editar Perfil", href: `/aluno/perfil` },
      { icon: "Bell", iconComponent: Bell, label: "Avisos", href: `/aluno/avisos` },
    ] :
    [
      { icon: "List", iconComponent: List, label: "Avaliações", href: `/app/avaliacoes` },
      { icon: "CalendarDays", iconComponent: CalendarDays, label: "Agenda", href: `/app/agenda` },
      { icon: "Gamepad", iconComponent: Gamepad, label: "Jogos", href: `/app/jogos` },
      { icon: "Tv", iconComponent: Tv, label: "Play TV", href: `/app/play-tv` },
      { icon: "Headset", iconComponent: Headset, label: "Plantão Online", href: "/app/plantao" },
      { icon: "Ticket", iconComponent: Ticket, label: "Cartão Resposta", href: "/app/cartao-resposta" },
      { icon: "Award", iconComponent: Award, label: "Certificados", href: `/app/certificados` },
      { icon: "Trophy", iconComponent: Trophy, label: "Competições", href: `/app/competicoes` },
      { icon: "Award", iconComponent: Award, label: "Olimpíadas", href: `/app/olimpiadas` },
      { icon: "School", iconComponent: School, label: "Escolas", href: "/app/escolas" },
      { icon: "UserIcon", iconComponent: UserIcon, label: "Editar Perfil", href: `/app/perfil` },
      { icon: "Bell", iconComponent: Bell, label: "Avisos", href: `/app/avisos` },
      { icon: "Settings", iconComponent: Settings, label: "Configurações", href: "/app/configuracoes" },
    //  { icon: "MessageSquare", iconComponent: MessageSquare, label: "Contato pelo WhatsApp", href: "/app/contato-whatsapp" },
     // { icon: "ClipboardEdit", iconComponent: ClipboardEdit, label: "Diário de Turma", href: "/app/diario-turma" },
    //  { icon: "FileText", iconComponent: FileText, label: "Documentos", href: "/app/documentos" },
     // { icon: "MessageSquare", iconComponent: MessageSquare, label: "Envie uma mensagem", href: "/app/enviar-mensagem" },
    //  { icon: "Sparkles", iconComponent: Sparkles, label: "Assistente do Professor", href: "/app/assistente-professor" },
    //  { icon: "HelpCircle", iconComponent: HelpCircle, label: "Precisa de ajuda?", href: "/app/ajuda" },
     // { icon: "BarChart2", iconComponent: BarChart2, label: "Relatório de avaliações (BI)", href: "/app/relatorio-avaliacoes" },
    //  { icon: "Monitor", iconComponent: Monitor, label: "Salas Virtuais", href: "/app/salas-virtuais" },
    ];

  const maxSelectedLinks = 4;

  // Carregar atalhos salvos do usuário
  useEffect(() => {
    const loadQuickLinks = async () => {
      if (!user?.id) return;
      
      try {
        setIsLoading(true);
        const savedLinks = await quickLinksApi.getUserQuickLinks(user.id);
        setSelectedQuickLinks(savedLinks);
      } catch (error) {
        console.error('Erro ao carregar atalhos:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os atalhos salvos.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadQuickLinks();
  }, [user?.id, toast]);

  // Função para obter o componente do ícone
  const getIconComponent = (iconName: string) => {
    return iconComponents[iconName as keyof typeof iconComponents] || List;
  };

  // Filtrar links disponíveis baseado nos selecionados
  const availableQuickLinks = allAvailableLinks.filter(link => 
    !selectedQuickLinks.some(selectedLink => selectedLink.href === link.href)
  );

  const handleAddQuickLink = (link: AvailableQuickLink) => {
    if (selectedQuickLinks.length < maxSelectedLinks) {
      const newQuickLink: QuickLink = {
        href: link.href,
        label: link.label,
        icon: link.icon
      };
      setSelectedQuickLinks([...selectedQuickLinks, newQuickLink]);
    }
  };

  const handleRemoveQuickLink = (link: QuickLink) => {
    setSelectedQuickLinks(selectedQuickLinks.filter(item => item.href !== link.href));
  };

  const handleSaveQuickLinks = async () => {
    if (!user?.id) return;

    try {
      setIsSaving(true);
      await quickLinksApi.saveUserQuickLinks(user.id, selectedQuickLinks);
      toast({
        title: "Sucesso",
        description: "Atalhos salvos com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao salvar atalhos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar os atalhos.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    const baseRoute = user?.role === "aluno" ? "/aluno" : "/app";
    navigate(baseRoute);
  };

  const handleClearAll = async () => {
    if (!user?.id) return;

    try {
      setIsSaving(true);
      await quickLinksApi.deleteUserQuickLinks(user.id);
      setSelectedQuickLinks([]);
      toast({
        title: "Sucesso",
        description: "Todos os atalhos foram removidos.",
      });
    } catch (error) {
      console.error('Erro ao remover atalhos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover os atalhos.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="mb-6">
          <Skeleton className="h-4 w-16 mb-4" />
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>

        {/* Skeleton para Selected Quick Links */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-8 w-28" />
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="border rounded-md p-4 flex flex-col items-center justify-between text-center relative">
                <Skeleton className="absolute top-1 right-1 h-6 w-6 rounded" />
                <Skeleton className="h-12 w-12 rounded-full mb-2" />
                <Skeleton className="h-4 w-20 mb-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Skeleton para Shortcut Options */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(12)].map((_, index) => (
                <div key={index} className="border rounded-md p-4 flex flex-col items-center justify-between text-center relative">
                  <Skeleton className="absolute top-1 right-1 h-6 w-6 rounded" />
                  <Skeleton className="h-12 w-12 rounded-full mb-2" />
                  <Skeleton className="h-4 w-16 mb-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Skeleton para Action Buttons */}
        <div className="flex justify-end gap-4 mt-6">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={handleCancel}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold">Edição de atalhos</h1>
        <p className="text-muted-foreground">Adicione, remova e ordene os seus atalhos favoritos.</p>
      </div>

      {/* Selected Quick Links */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            Selecionados <span className="text-muted-foreground text-base">({selectedQuickLinks.length} de {maxSelectedLinks})</span>
          </CardTitle>
          {selectedQuickLinks.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              disabled={isSaving}
            >
              Remover todos
            </Button>
          )}
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {selectedQuickLinks.length === 0 ? (
            <div className="col-span-full text-center text-muted-foreground py-8">
              Nenhum atalho selecionado. Escolha abaixo os atalhos que deseja adicionar.
            </div>
          ) : (
            selectedQuickLinks.map((link, index) => {
              const IconComponent = getIconComponent(link.icon);
              return (
                <div key={link.href} className="border rounded-md p-4 flex flex-col items-center justify-between text-center relative">
                  <Button 
                     variant="ghost" 
                     size="icon" 
                     onClick={() => handleRemoveQuickLink(link)} 
                     className="absolute top-1 right-1 w-6 h-6 text-red-500 hover:bg-red-100"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-2">
                    <IconComponent className="h-6 w-6 text-green-700" />
                  </div>
                  <span className="text-sm font-medium mb-2">{link.label}</span>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Shortcut Options */}
      <Card>
        <CardHeader>
          <CardTitle>Opções de atalhos</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedQuickLinks.length >= maxSelectedLinks && (
            <div className="flex items-center p-3 mb-4 text-sm text-blue-800 rounded-lg bg-blue-50 dark:bg-gray-800 dark:text-blue-400" role="alert">
              <Info className="flex-shrink-0 inline w-4 h-4 me-3" />
              <span className="sr-only">Info</span>
              <div>
                <span className="font-medium">Limite de atalhos atingido.</span> Para adicionar outros, remova atalhos de 'Selecionados'.
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {availableQuickLinks.map(link => (
              <div 
                key={link.href} 
                className={`border rounded-md p-4 flex flex-col items-center justify-between text-center relative ${
                  selectedQuickLinks.length >= maxSelectedLinks 
                    ? "opacity-50 cursor-not-allowed" 
                    : "cursor-pointer hover:bg-gray-50"
                }`}
                onClick={() => selectedQuickLinks.length < maxSelectedLinks && handleAddQuickLink(link)}
              >
                 <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-1 right-1 w-6 h-6 text-green-500 hover:bg-green-100"
                    disabled={selectedQuickLinks.length >= maxSelectedLinks}
                 >
                  <Plus className="h-4 w-4" />
                </Button>
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-2">
                   <link.iconComponent className="h-6 w-6 text-gray-700" />
                </div>
                <span className="text-sm font-medium mb-2">{link.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4 mt-6">
        <Button 
          variant="outline" 
          onClick={handleCancel}
          disabled={isSaving}
        >
          Cancelar
        </Button>
        <Button 
          onClick={handleSaveQuickLinks}
          disabled={isSaving}
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Salvando..." : "Salvar Atalhos"}
        </Button>
      </div>
    </div>
  );
};

export default EditQuickLinks; 