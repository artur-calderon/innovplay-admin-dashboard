import React from "react";
import { useAuth } from "@/context/authContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Book, List, Sparkles, CalendarDays, ArrowLeft, ArrowRight, Plus, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";

const StudentProfessorIndex = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Dummy data for Agenda
  const agendaItems = [
    { date: "Ter 3", event: "Nenhum evento encontrado" },
    { date: "Qua 4", event: "Nenhum evento encontrado" },
    { date: "Qui 5", event: "Nenhum evento encontrado" },
    { date: "Sex 6", event: "Nenhum evento encontrado" },
  ];

  const handleEditQuickLinks = () => {
    const baseRoute = user?.role === "aluno" ? "/aluno" : "/app";
    navigate(`${baseRoute}/editar-atalhos`);
  };

  // Define quick link items. This should ideally come from a state/store
  // that is populated from the user's saved quick links.
  // Starting empty now.
  const quickLinks: { icon: React.ElementType; label: string; path: string; }[] = [];

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Info Card */}
        <div className="lg:col-span-1">
          <Card className="h-[20rem] bg-green-700 text-white">
            <CardContent className="flex flex-col items-center justify-center h-full">
              <div className="w-20 h-20 rounded-full bg-blue-300 flex items-center justify-center text-3xl font-bold mb-4">
                {user?.name ? user.name.charAt(0).toUpperCase() : "E"}
              </div>
              <h2 className="text-xl font-bold">{user?.name || "Usuário COC"}</h2>
              <p className="text-sm opacity-80">{user?.role || "Professor"}</p>
              {user?.role !== "aluno" && (
                <p className="text-sm opacity-80">7º ANO +1</p>
              )}
              {user?.role !== "aluno" && (
                <p className="text-sm opacity-80">NASCIMENTO E MENEZES...</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Links and Agenda */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quick Links */}
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Atalhos rápidos</CardTitle>
              <Pencil className="h-4 w-4 text-muted-foreground cursor-pointer" onClick={handleEditQuickLinks} />
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              {quickLinks.length === 0 ? (
                <div className="col-span-2 text-center text-muted-foreground">
                  Nenhum atalho selecionado. Clique no lápis para adicionar.
                </div>
              ) : (
                quickLinks.map((link, index) => (
                  <div 
                    key={index} 
                    className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => navigate(link.path)}
                  >
                    <div className="p-3 rounded-full bg-green-100">
                      <link.icon className="h-6 w-6 text-green-700" />
                    </div>
                    <span>{link.label}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Agenda */}
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle>Agenda</CardTitle>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">1 Jun. - 7 Jun.</span>
                <ArrowLeft className="h-4 w-4 text-muted-foreground cursor-pointer" />
                <span className="text-sm text-green-700 font-semibold cursor-pointer">Hoje</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground cursor-pointer" />
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-7 text-center text-sm font-medium text-muted-foreground gap-2 pb-4">
                <div>Dom 1</div>
                <div>Seg 2</div>
                <div className="text-green-700">Ter 3</div>
                <div>Qua 4</div>
                <div>Qui 5</div>
                <div>Sex 6</div>
                <div>Sáb 7</div>
            </CardContent>
             <CardContent className="space-y-4">
                {agendaItems.map((item, index) => (
                    <div key={index} className="flex items-center border-b pb-2 last:border-b-0">
                        <span className="w-16 font-semibold text-muted-foreground">{item.date}</span>
                        <span className="ml-4 text-sm">{item.event}</span>
                    </div>
                ))}
             </CardContent>
             <CardContent>
                 <button className="w-full text-center text-green-700 flex items-center justify-center gap-1">
                     <Plus className="h-4 w-4" />
                     Criar lembrete
                 </button>
             </CardContent>
          </Card>

          {/* Comunicados COC - Placeholder for now, can be refined later */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Comunicados InnovPlay</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-green-100">
                        <List className="h-6 w-6 text-green-700" />
                    </div>
                    <div>
                        <h4 className="font-semibold">Tem novidade no ar!</h4>
                        <p className="text-sm text-muted-foreground">Estante de Inovação. Um novo espaço para você ficar por dentro de todos os produtos...</p>
                    </div>
                </div>
                 <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-green-100">
                        <List className="h-6 w-6 text-green-700" />
                    </div>
                    <div>
                        <h4 className="font-semibold">Está disponível: Fala, Professor!</h4>
                        <p className="text-sm text-muted-foreground">Confira aqui como acessar a ferramenta</p>
                    </div>
                </div>
                 <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-green-100">
                        <List className="h-6 w-6 text-green-700" />
                    </div>
                    <div>
                        <h4 className="font-semibold">Jornada COC: Conheça os recursos de Avaliações!</h4>
                        <p className="text-sm text-muted-foreground">Clique no link e saiba mais sobre funcionalidades.</p>
                    </div>
                </div>
                 <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-green-100">
                        <List className="h-6 w-6 text-green-700" />
                    </div>
                    <div>
                        <h4 className="font-semibold">Jornada COC: Conheça os recursos de Aprendizagem!</h4>
                        <p className="text-sm text-muted-foreground">Acesse as novas funcionalidades da Jornada...</p>
                    </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default StudentProfessorIndex; 