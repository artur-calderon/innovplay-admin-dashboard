import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  LogOut,
  Edit,
  LandPlot,
  MessageSquare, // Assuming for 'Contato pelo whatsapp' or 'Envie uma mensagem'
  ClipboardEdit, // Assuming for 'Diário de Turma'
  FileText, // Assuming for 'Documentos'
  HelpCircle, // Assuming for 'Precisa de ajuda?'
  BarChart2, // Assuming for 'Relatório de avaliações (BI)'
  Monitor, // Assuming for 'Salas Virtuais'
  Save // Import the Save icon
} from "lucide-react";
import { useAuth } from "@/context/authContext";
import { useDataContext } from "@/context/dataContext"; // Assuming useDataContext or a similar store will handle user preferences

interface QuickLink {
  href: string;
  label: string;
  icon: React.ElementType; // Using React.ElementType for Lucide icons
}

const EditQuickLinks = () => {
  const { user } = useAuth();
  // Assuming useDataContext has professor/aluno menu data or a way to get it
  // For now, use hardcoded data simulating the structure from Sidebar.tsx

  // TODO: Replace with actual fetch from a store or backend
  const allAvailableLinks: QuickLink[] = user?.role === "aluno" ?
    [
      { icon: List, label: "Avaliações", href: `/aluno/avaliacoes` },
      { icon: CalendarDays, label: "Agenda", href: `/aluno/agenda` },
      { icon: Gamepad, label: "Jogos", href: `/aluno/jogos` },
      { icon: Tv, label: "Play TV", href: `/aluno/play-tv` },
      { icon: Award, label: "Certificados", href: `/aluno/certificados` },
      { icon: Trophy, label: "Competições", href: `/aluno/competicoes` },
      { icon: Award, label: "Olimpíadas", href: `/aluno/olimpiadas` },
      { icon: UserIcon, label: "Editar Perfil", href: `/aluno/perfil` },
      { icon: Bell, label: "Avisos", href: `/aluno/avisos` },
      // Add other relevant student links here
    ] : // Assuming professor or other role that should edit quick links
    [
      { icon: List, label: "Avaliações", href: `/app/avaliacoes` },
      { icon: CalendarDays, label: "Agenda", href: `/app/agenda` },
      { icon: Gamepad, label: "Jogos", href: `/app/jogos` },
      { icon: Tv, label: "Play TV", href: `/app/play-tv` },
      { icon: Headset, label: "Plantão Online", href: "/app/plantao" },
      { icon: Ticket, label: "Cartão Resposta", href: "/app/cartao-resposta" },
      { icon: Award, label: "Certificados", href: `/app/certificados` },
      { icon: Trophy, label: "Competições", href: `/app/competicoes` },
      { icon: Award, label: "Olimpíadas", href: `/app/olimpiadas` },
      { icon: School, label: "Escolas", href: "/app/escolas" }, // Professor might see their schools
      { icon: UserIcon, label: "Editar Perfil", href: `/app/perfil` },
      { icon: Bell, label: "Avisos", href: `/app/avisos` },
      { icon: Settings, label: "Configurações", href: "/app/configuracoes" },
      // Add professor specific links from the image/Sidebar
      { icon: MessageSquare, label: "Contato pelo whatsapp", href: "/app/contato-whatsapp" },
      { icon: ClipboardEdit, label: "Diário de Turma", href: "/app/diario-turma" },
      { icon: FileText, label: "Documentos", href: "/app/documentos" },
      { icon: MessageSquare, label: "Envie uma mensagem", href: "/app/enviar-mensagem" },
      { icon: Sparkles, label: "Assistente do Professor", href: "/app/assistente-professor" },
      { icon: HelpCircle, label: "Precisa de ajuda?", href: "/app/ajuda" },
      { icon: BarChart2, label: "Relatório de avaliações (BI)", href: "/app/relatorio-avaliacoes" },
      { icon: List, label: "Resultados de Avaliações...", href: "/app/resultados-avaliacoes" }, // Duplicate label, might need clarification
      { icon: Monitor, label: "Salas Virtuais", href: "/app/salas-virtuais" },
      { icon: Tv, label: "TV COC", href: "/app/tv-coc" }, // Duplicate icon, might need clarification
    ];

  // TODO: Fetch selected quick links for the user
  const [selectedQuickLinks, setSelectedQuickLinks] = useState<QuickLink[]>([]);

  // Filter available links based on selected ones
  const availableQuickLinks = allAvailableLinks.filter(link => 
    !selectedQuickLinks.some(selectedLink => selectedLink.href === link.href)
  );

  const maxSelectedLinks = 4;

  const handleAddQuickLink = (link: QuickLink) => {
    if (selectedQuickLinks.length < maxSelectedLinks) {
      setSelectedQuickLinks([...selectedQuickLinks, link]);
    }
  };

  const handleRemoveQuickLink = (link: QuickLink) => {
    setSelectedQuickLinks(selectedQuickLinks.filter(item => item.href !== link.href));
  };

  // TODO: Implement drag and drop reordering for selectedQuickLinks
  // TODO: Implement save logic to persist selectedQuickLinks for the user
  const handleSaveQuickLinks = () => {
    // This is where you will add the API call later
    console.log("Saving quick links:", selectedQuickLinks);
    // toast("Atalhos salvos!", { type: "success" }); // Example toast
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold">Edição de atalhos</h1>
      <p className="text-muted-foreground mb-6">Adicione, remova e ordene os seus atalhos favoritos.</p>

      {/* Selected Quick Links */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Selecionados <span className="text-muted-foreground text-base">{selectedQuickLinks.length} de {maxSelectedLinks}</span></CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {selectedQuickLinks.map(link => (
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
                <link.icon className="h-6 w-6 text-green-700" />
              </div>
              <span className="text-sm font-medium mb-2">{link.label}</span>
              {/* Drag handle placeholder */}
              <div className="absolute bottom-1 right-1 cursor-grab text-muted-foreground">
                ::
              </div>
            </div>
          ))}
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
            {allAvailableLinks.filter(link => !selectedQuickLinks.some(selected => selected.href === link.href)).map(link => (
              <div 
                key={link.href} 
                className={( "border rounded-md p-4 flex flex-col items-center justify-between text-center relative ") +
                  (selectedQuickLinks.length >= maxSelectedLinks ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-gray-50")
                }
                onClick={() => handleAddQuickLink(link)}
                style={{ pointerEvents: selectedQuickLinks.length >= maxSelectedLinks ? 'none' : 'auto' }}
              >
                 <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-1 right-1 w-6 h-6 text-green-500 hover:bg-green-100"
                 >
                  <Plus className="h-4 w-4" />
                </Button>
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-2">
                   <link.icon className="h-6 w-6 text-gray-700" />
                </div>
                <span className="text-sm font-medium mb-2">{link.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end mt-6">
        <Button onClick={handleSaveQuickLinks}>
          <Save className="h-4 w-4 mr-2" />
          Salvar Atalhos
        </Button>
      </div>
    </div>
  );
};

export default EditQuickLinks; 