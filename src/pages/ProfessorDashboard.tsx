import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/authContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Book, 
  List, 
  Sparkles, 
  CalendarDays, 
  Pencil,
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
  Monitor
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { quickLinksApi, QuickLink } from "./EditQuickLinks";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
// import RecentEvaluations from "@/components/dashboard/RecentEvaluations";

// Mapeamento de ícones para converter strings em componentes
const iconMap = {
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

const ProfessorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [schoolName, setSchoolName] = useState<string>("");
  

  // Carregar atalhos salvos do usuário
  useEffect(() => {
    const loadQuickLinks = async () => {
      if (!user?.id) return;
      
      try {
        setIsLoading(true);
        const savedLinks = await quickLinksApi.getUserQuickLinks(user.id);
        setQuickLinks(savedLinks);
      } catch (error) {
        console.error('Erro ao carregar atalhos:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os atalhos rápidos.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadQuickLinks();
  }, [user?.id, user.role, toast]);

  // Carregar dados de escola
  useEffect(() => {
    const loadSchool = async () => {
      if (!user?.id) return;
      try {
        // 1) Tentar rota direta do usuário -> escola (se existir/permitida)
        try {
          const schoolResp = await api.get(`/users/school/${user.id}`);
          const school = schoolResp.data?.school || schoolResp.data;
          const name: unknown = school?.name || school?.nome;
          if (name) {
            setSchoolName(String(name));
            return;
          }
        } catch (e) {
          // Ignorar 404/sem permissão e seguir fallback por função/role
        }

        // 2) Fallback via endpoints de professor -> vínculos -> escola (apenas para roles permitidas)
        const canQueryTeacher = ['admin', 'diretor', 'coordenador', 'tecadm'].includes(String(user.role).toLowerCase());
        if (!canQueryTeacher) {
          setSchoolName("");
          return;
        }

        const teachersResp = await api.get('/teacher');
        const teachers: Array<{ id?: string; user_id?: string; usuario_id?: string; user?: { id?: string } }> = Array.isArray(teachersResp.data) ? teachersResp.data : (teachersResp.data?.data || []);
        const teacher = teachers.find((t) => (
          t?.user_id === user.id || t?.usuario_id === user.id || t?.user?.id === user.id
        ));

        if (!teacher?.id) {
          setSchoolName("");
          return;
        }

        let links: Array<{ teacher_id?: string; school_id?: string; school?: { id?: string } }> = [];
        try {
          const linksResp = await api.get('/school-teacher', { params: { teacher_id: teacher.id } });
          links = Array.isArray(linksResp.data) ? linksResp.data : (linksResp.data?.data || []);
        } catch {
          const allLinksResp = await api.get('/school-teacher');
          const allLinks: Array<{ teacher_id?: string; school_id?: string; school?: { id?: string } }> = Array.isArray(allLinksResp.data) ? allLinksResp.data : (allLinksResp.data?.data || []);
          links = allLinks.filter((lk) => lk?.teacher_id === teacher.id);
        }

        const firstLink = links[0];
        const schoolId = firstLink?.school_id || firstLink?.school?.id;
        if (!schoolId) {
          setSchoolName("");
          return;
        }

        try {
          const schoolDetail = await api.get(`/school/${schoolId}`);
          const schoolNameCandidate: unknown = schoolDetail.data?.name || schoolDetail.data?.nome || schoolDetail.data?.school?.name;
          if (schoolNameCandidate) {
            setSchoolName(String(schoolNameCandidate));
          } else {
            setSchoolName("");
          }
        } catch {
          setSchoolName("");
        }
      } catch (err) {
        // Tratar silenciosamente quaisquer falhas
        setSchoolName("");
      }
    };

    loadSchool();
  }, [user?.id, user.role, toast]);

  const handleEditQuickLinks = () => {
    const baseRoute = user?.role === "aluno" ? "/aluno" : "/app";
    navigate(`${baseRoute}/editar-atalhos`);
  };

  // Função para obter o ícone correto
  const getIconComponent = (iconName: string) => {
    return iconMap[iconName as keyof typeof iconMap] || List;
  };

  const formatRole = (role?: string) => {
    if (!role) return "Professor";
    const normalized = String(role);
    return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
  };

  const formatDisplayName = (name?: string) => {
    if (!name || typeof name !== 'string') return "Professor";
    return name
      .trim()
      .split(/\s+/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Info Card */}
        <div className="lg:col-span-1">
          <Card className="h-[20rem] bg-gradient-to-br from-innov-blue to-innov-purple text-white shadow-lg">
            <CardContent className="flex flex-col items-center justify-center h-full">
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold mb-4">
                {user?.name ? user.name.charAt(0).toUpperCase() : "P"}
              </div>
              <h2 className="text-xl font-bold">{formatDisplayName(user?.name)}</h2>
              <p className="text-sm opacity-80">{formatRole(user?.role)}</p>
              {schoolName && (
                <p className="text-sm opacity-80 text-center px-4 truncate w-full" title={schoolName}>
                  {schoolName}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Links e Comunicados */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quick Links */}
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Atalhos rápidos</CardTitle>
              <Pencil className="h-4 w-4 text-muted-foreground hover:text-innov-purple cursor-pointer transition-colors" onClick={handleEditQuickLinks} />
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              {isLoading ? (
                // Skeleton loading para atalhos
                <>
                  {[...Array(4)].map((_, index) => (
                    <div key={index} className="flex items-center gap-3 animate-pulse">
                      <Skeleton className="h-12 w-12 rounded-full bg-gray-200" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-24 mb-1 bg-gray-200" />
                      </div>
                    </div>
                  ))}
                </>
              ) : quickLinks.length === 0 ? (
                <div className="col-span-2 text-center text-muted-foreground py-8">
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-3 rounded-full bg-gray-100">
                      <Pencil className="h-6 w-6 text-gray-400" />
                    </div>
                    <p>Nenhum atalho selecionado.</p>
                    <p className="text-sm">Clique no lápis para adicionar.</p>
                  </div>
                </div>
              ) : (
                quickLinks.map((link, index) => {
                  const IconComponent = getIconComponent(link.icon);
                  return (
                    <div 
                      key={index} 
                      className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-all duration-200 hover:shadow-sm"
                      onClick={() => navigate(link.href)}
                    >
                      <div className="p-3 rounded-full bg-innov-purple/10 flex-shrink-0">
                        <IconComponent className="h-6 w-6 text-innov-purple" />
                      </div>
                      <span className="font-medium text-sm">{link.label}</span>
                    </div>
                  );
                })
              )}
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
                    <div className="p-3 rounded-full bg-innov-purple/10">
                        <List className="h-6 w-6 text-innov-purple" />
                    </div>
                    <div>
                        <h4 className="font-semibold">Tem novidade no ar!</h4>
                        <p className="text-sm text-muted-foreground">Estante de Inovação. Um novo espaço para você ficar por dentro de todos os produtos...</p>
                    </div>
                </div>
                 <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-innov-purple/10">
                        <List className="h-6 w-6 text-innov-purple" />
                    </div>
                    <div>
                        <h4 className="font-semibold">Está disponível: Fala, Professor!</h4>
                        <p className="text-sm text-muted-foreground">Confira aqui como acessar a ferramenta</p>
                    </div>
                </div>
                 <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-innov-purple/10">
                        <List className="h-6 w-6 text-innov-purple" />
                    </div>
                    <div>
                        <h4 className="font-semibold">Jornada COC: Conheça os recursos de Avaliações!</h4>
                        <p className="text-sm text-muted-foreground">Clique no link e saiba mais sobre funcionalidades.</p>
                    </div>
                </div>
                 <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-innov-purple/10">
                        <List className="h-6 w-6 text-innov-purple" />
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

export default ProfessorDashboard; 