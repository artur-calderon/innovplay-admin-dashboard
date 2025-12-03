import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  List,
  CalendarDays,
  Gamepad,
  Tv,
  Headset,
  Ticket,
  Award,
  Trophy,
  School,
  User,
  Bell,
  Settings,
  LogOut,
  Edit,
  LandPlot,
  ChevronDown,
  BookOpen,
  Building,
  Users2,
  HelpCircle,
  X,
  ClipboardCheck,
  BarChart3,
  Calculator,
  Menu,
  ChevronLeft,
  FileText,
  Target,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/context/authContext";
import { Button } from "@/components/ui/button";
import { useGamesCount } from "@/hooks/useGamesCount";
import { useUnreadAvisos } from "@/hooks/useUnreadAvisos";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getRoleDisplayName } from "@/lib/constants";
import { AvatarPreview } from "@/components/profile/AvatarPreview";

type SidebarLink = {
  icon: React.ElementType;
  label: string;
  href?: string;
  role: string[];
  children?: SidebarLink[];
  badge?: string;
  divider?: boolean;
  category?: string;
};

type SidebarCategory = {
  name: string;
  role: string[];
  links: SidebarLink[];
};

const isLinkActive = (link: SidebarLink, currentPath: string): boolean => {
  if (link.href) return currentPath === link.href;
  if (link.children) return link.children.some(child => isLinkActive(child, currentPath));
  return false;
};

interface SidebarProps {
  onMobileMenuClose?: () => void;
}

export default function Sidebar({ onMobileMenuClose }: SidebarProps = {}) {
  const currentPath = useLocation().pathname;
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [avisoIds, setAvisoIds] = useState<string[]>([]);

  const navigate = useNavigate();
  const { logout, user } = useAuth();
  useGamesCount();
  const { getUnreadCount } = useUnreadAvisos();

  useEffect(() => {
    const loadAvisoIds = async () => {
      try {
        const mockAvisoIds = ['1', '2', '3', '4', '5', '6', '7', '8'];
        setAvisoIds(mockAvisoIds);
      } catch (error) {
        console.error('Erro ao carregar avisos:', error);
      }
    };

    if (user.id) loadAvisoIds();
  }, [user.id, user.role]);

  const unreadAvisosCount = useMemo(() => getUnreadCount(avisoIds), [avisoIds, getUnreadCount]);

  function handleLogout() {
    logout().then(() => navigate("/"));
  }

  const handleLinkClick = () => {
    if (isMobile && onMobileMenuClose) onMobileMenuClose();
  };

  const handleToggleCollapse = () => setIsCollapsed(!isCollapsed);

  const sidebarCategories: SidebarCategory[] = [
    {
      name: "Principal",
      role: ["admin", "professor", "diretor", "coordenador", "aluno", "tecadm"],
      links: [
        {
          icon: LayoutDashboard,
          label: "Painel",
          href: `${user.role === 'aluno' ? "/aluno" : "/app"}`,
          role: ["admin", "professor", "diretor", "coordenador", "aluno", "tecadm"]
        },
        {
          icon: CalendarDays,
          label: "Agenda",
          href: `${user.role === 'aluno' ? "/aluno/agenda" : "/app/agenda"}`,
          role: ["admin", "professor", "diretor", "coordenador", "aluno", "tecadm"]
        },
        {
          icon: List,
          label: "Avaliações",
          href: `${user.role === 'aluno' ? "/aluno/avaliacoes" : "/app/avaliacoes"}`,
          role: ["aluno"]
        },
        {
          icon: FileText,
          label: "Questionário",
          href: `${user.role === 'aluno' ? "/aluno/questionario" : "/app/questionario"}`,
          role: ["professor", "diretor", "aluno"]
        },
      ]
    },
    {
      name: "Plataforma",
      role: ["admin", "professor", "diretor", "coordenador", "aluno", "tecadm"],
      links: [
        {
          icon: Gamepad,
          label: "Jogos",
          href: `${user.role === 'aluno' ? "/aluno/jogos" : "/app/jogos"}`,
          role: ["admin", "professor", "diretor", "coordenador", "aluno", "tecadm"]
        },
        {
          icon: Tv,
          label: "Play TV",
          href: `${user.role === 'aluno' ? "/aluno/play-tv" : "/app/play-tv"}`,
          role: ["admin", "professor", "diretor", "coordenador", "aluno", "tecadm"]
        },
        {
          icon: Headset,
          label: "Plantão Online",
          href: `${user.role === 'aluno' ? "/aluno/plantao-online" : "/app/plantao"}`,
          role: ["admin", "professor", "diretor", "coordenador", "aluno", "tecadm"]
        },
      ]
    },
    {
      name: "Gestão",
      role: ["admin", "professor", "diretor", "coordenador", "tecadm"],
      links: [
        {
          icon: Building,
          label: "Instituição",
          href: "/app/cadastros/instituicao",
          role: ["professor", "diretor", "coordenador"]
        },
        {
          icon: List,
          label: "Avaliações",
          href: "/app/avaliacoes",
          role: ["professor", "diretor", "coordenador"]
        },
        {
          icon: HelpCircle,
          label: "Questão",
          href: "/app/cadastros/questao",
          role: ["professor", "diretor", "coordenador"]
        },
        {
          icon: List,
          label: "Cadastros",
          role: ["admin", "tecadm"],
          children: [
            {
              icon: Building,
              label: "Instituição",
              role: ["admin", "tecadm"],
              children: [
                { icon: Building, label: "Instituição", href: "/app/cadastros/instituicao", role: ["admin", "tecadm"] },
                { icon: BookOpen, label: "Curso", href: "/app/cadastros/curso", role: ["admin", "tecadm"] },
                { icon: BookOpen, label: "Série", href: "/app/cadastros/serie", role: ["admin", "tecadm"] },
                { icon: BookOpen, label: "Disciplina", href: "/app/cadastros/disciplina", role: ["admin", "tecadm"] },
                { icon: Users2, label: "Turma", href: "/app/cadastros/turma", role: ["admin", "tecadm"] },
              ]
            },
            { icon: List, label: "Avaliações", href: "/app/avaliacoes", role: ["admin", "tecadm"] },
            { icon: LandPlot, label: "Municípios", href: "/app/city", role: ["admin", "tecadm"] },
            { icon: HelpCircle, label: "Questão", href: "/app/cadastros/questao", role: ["admin", "tecadm"] },
            { icon: User, label: "Usuário", href: "/app/usuarios", role: ["admin", "tecadm"] },
          ]
        },
        {
          icon: Ticket,
          label: "Cartão Resposta",
          href: "/app/cartao-resposta",
          role: ["admin", "professor", "diretor", "coordenador", "tecadm"]
        },
        { icon: Calculator, label: "Calculadora SAEB", href: "/app/calculadora-saeb", role: ["admin", "professor", "diretor", "coordenador", "tecadm"] },
        { icon: ClipboardCheck, label: "Correção", href: "/app/avaliacoes/correcao", role: ["admin", "professor", "diretor", "coordenador", "tecadm"] },
        { icon: BarChart3, label: "Resultados", href: "/app/resultados", role: ["admin", "professor", "diretor", "coordenador", "tecadm"] },
        { icon: TrendingUp, label: "Evolução", href: "/app/evolucao", role: ["admin", "professor", "diretor", "coordenador", "tecadm"] },
        {
          icon: FileText,
          label: "Questionários",
          role: ["admin", "tecadm"],
          children: [
            { icon: FileText, label: "Cadastro de questionários", href: "/app/questionarios/cadastro", role: ["admin", "tecadm"] },
            { icon: BarChart3, label: "Relatórios Socio-Econômicos", href: "/app/questionarios/relatorios-socio-economicos", role: ["admin", "tecadm"] },
          ]
        },
        {
          icon: FileText,
          label: "Relatórios",
          role: ["admin", "professor", "diretor", "coordenador", "tecadm"],
          children: [
            { icon: Target, label: "Acerto e Níveis", href: "/app/relatorios/acerto-niveis", role: ["admin", "professor", "diretor", "coordenador", "tecadm"] },
            { icon: BarChart3, label: "Análise das Avaliações", href: "/app/relatorios/analise-avaliacoes", role: ["admin", "professor", "diretor", "coordenador", "tecadm"] },
            { icon: School, label: "Relatório Escolar", href: "/app/relatorios/relatorio-escolar", role: ["admin", "professor", "diretor", "coordenador", "tecadm"] }
          ]
        },
      ]
    },
    {
      name: "Atividades",
      role: ["admin", "professor", "diretor", "coordenador", "aluno", "tecadm"],
      links: [
        { icon: Award, label: "Certificados", href: `${user.role === 'aluno' ? "/aluno/certificados" : "/app/certificados"}`, role: ["admin", "professor", "diretor", "coordenador", "aluno", "tecadm"] },
        { icon: Trophy, label: "Competições", href: `${user.role === 'aluno' ? "/aluno/competicoes" : "/app/competicoes"}`, role: ["admin", "professor", "diretor", "coordenador", "aluno", "tecadm"] },
        { icon: Award, label: "Olimpíadas", href: `${user.role === 'aluno' ? "/aluno/olimpiadas" : "/app/olimpiadas"}`, role: ["admin", "professor", "diretor", "coordenador", "aluno", "tecadm"] },
      ]
    },
    {
      name: "Configurações",
      role: ["admin", "professor", "diretor", "coordenador", "aluno", "tecadm"],
      links: [
        {
          icon: Bell,
          label: "Avisos",
          href: `${user.role === 'aluno' ? "/aluno/avisos" : "/app/avisos"}`,
          role: ["admin", "professor", "diretor", "coordenador", "aluno", "tecadm"],
          badge: unreadAvisosCount > 0 ? unreadAvisosCount.toString() : undefined
        },
        { icon: Settings, label: "Configurações", href: `${user.role === 'aluno' ? "/aluno/configuracoes" : "/app/configuracoes"}`, role: ["admin", "professor", "diretor", "coordenador", "aluno", "tecadm"] },
        { icon: LogOut, label: "Sair", href: "/logout", role: ["admin", "professor", "diretor", "coordenador", "aluno", "tecadm"], divider: true },
      ]
    }
  ];

  const UserInfo = () => {
    const handleProfileClick = () => {
      navigate(user.role === 'aluno' ? "/aluno/perfil" : "/app/perfil");
      handleLinkClick();
    };

    return (
      <div className="px-3 pt-3 pb-2">
        <div className="rounded-xl border bg-white/70 border-slate-200/70 text-slate-900 shadow-sm
                        dark:bg-white/5 dark:border-white/10 dark:text-white">
          <div className="px-3 py-3 flex items-center gap-3">
            {user?.avatar_config ? (
              <div className="flex-shrink-0">
                <AvatarPreview config={user.avatar_config} size={40} className="flex-shrink-0" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-900/10 text-slate-900 flex items-center justify-center font-semibold flex-shrink-0
                              dark:bg-white/20 dark:text-white">
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm truncate text-slate-900 dark:text-white">
                  {user?.name || "Usuário"}
                </p>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={handleProfileClick}
                        className="flex-shrink-0 p-1 rounded-full transition-colors
                                   hover:bg-slate-900/5 dark:hover:bg-white/10"
                        aria-label="Editar perfil"
                      >
                        <Edit className="h-4 w-4 text-slate-600 hover:text-slate-900 dark:text-white/70 dark:hover:text-white" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Editar perfil</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="mt-1 flex items-center gap-2">
                <p className="text-xs truncate text-slate-600 dark:text-white/70">
                  {user?.role ? getRoleDisplayName(user.role) : "Usuário"}
                </p>
                <span className="text-[11px] px-2 py-0.5 rounded-full truncate
                                 bg-slate-900/5 text-slate-700
                                 dark:bg-white/10 dark:text-white/80">
                  {user?.registration || user?.email || ""}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  function RenderMenuItem({
    link,
    currentPath,
    isCollapsed,
    handleLogout,
    userRole,
    level = 0
  }: {
    link: SidebarLink;
    currentPath: string;
    isCollapsed: boolean;
    handleLogout: () => void;
    userRole: string;
    level?: number;
  }) {
    const hasSubmenu = link.children && link.children.length > 0;
    const isActive = isLinkActive(link, currentPath);
    const [isSubmenuOpen, setIsSubmenuOpen] = useState(isActive);

    useEffect(() => {
      if (isActive) setIsSubmenuOpen(true);
    }, [isActive]);

    const handleToggleSubmenu = () => {
      if (hasSubmenu) setIsSubmenuOpen(!isSubmenuOpen);
    };

    if (!link.role.includes(userRole)) return null;

    const linkContent = (
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className={cn(
              "flex items-center justify-center rounded-full transition-colors",
              // fundo do ícone ajustado p/ tema claro
              "bg-slate-900/5 group-hover:bg-slate-900/10",
              "dark:bg-white/5 dark:group-hover:bg-white/10",
              isCollapsed ? "h-10 w-10" : "h-9 w-9"
            )}
          >
            <link.icon
              size={18}
              className={cn(
                "flex-shrink-0 transition-colors",
                isActive
                  ? "text-[#7B3FE4]"
                  : "text-slate-600 group-hover:text-slate-900 dark:text-white/80 dark:group-hover:text-white"
              )}
            />
          </div>

          {!isCollapsed && (
            <span
              className={cn(
                "truncate text-sm font-medium transition-colors",
                isActive
                  ? "text-slate-900 dark:text-[#1B1F4A]"
                  : "text-slate-700 group-hover:text-slate-900 dark:text-white/80 dark:group-hover:text-white"
              )}
            >
              {link.label}
            </span>
          )}
        </div>

        {!isCollapsed && (
          <div className="flex items-center gap-2">
            {link.badge && (
              <span className="bg-pink-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {link.badge}
              </span>
            )}
            {hasSubmenu && (
              <ChevronDown
                size={14}
                className={cn(
                  "transition-transform duration-200",
                  "text-slate-500 group-hover:text-slate-900 dark:text-white/70 dark:group-hover:text-white",
                  isSubmenuOpen && "rotate-180"
                )}
              />
            )}
          </div>
        )}

        {isCollapsed && link.badge && (
          <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {link.badge}
          </span>
        )}
      </div>
    );

    const itemClasses = cn(
      "sidebar-link w-full text-left group relative",
      "flex items-center gap-3 transition-all duration-200",
      isCollapsed ? "justify-center px-0 py-1" : "px-3 py-2.5 rounded-full text-sm",

      // ✅ HOVER: forçado (important) para NÃO virar branco estourado (mesmo que exista CSS externo)
      "hover:!bg-slate-900/5 dark:hover:!bg-white/10",

      // ✅ Active (tema claro e escuro)
      isActive && !isCollapsed && "bg-[#EDE9FF] text-slate-900 shadow-sm font-semibold dark:bg-[#E3DFFF] dark:text-[#1B1F4A] dark:shadow-lg",
      isActive && isCollapsed && "bg-slate-900/10 dark:bg-white/20",

      // níveis
      level > 0 && !isCollapsed && "ml-4 text-sm",
      level > 1 && !isCollapsed && "ml-8 text-xs",

      // foco bonito
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B3FE4]/40"
    );

    return (
      <li className={cn(link.divider && "border-t border-slate-200/60 pt-2 mt-2 dark:border-white/10")}>
        {link.label === "Sair" ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={handleLogout} className={itemClasses}>
                  {linkContent}
                </button>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right">
                  <p>{link.label}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        ) : link.children && link.children.length > 0 ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={handleToggleSubmenu} className={itemClasses}>
                  {linkContent}
                </button>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right">
                  <p>{link.label}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to={link.href || "#"} className={itemClasses} onClick={handleLinkClick}>
                  {linkContent}
                </Link>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right">
                  <p>{link.label}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        )}

        {link.children && isSubmenuOpen && !isCollapsed && (
          <ul className="space-y-1 ml-2 mt-1 border-l border-slate-200/60 pl-3 dark:border-white/10">
            {link.children.map(child => (
              <RenderMenuItem
                key={child.href || child.label}
                link={child}
                currentPath={currentPath}
                isCollapsed={isCollapsed}
                handleLogout={handleLogout}
                userRole={userRole}
                level={level + 1}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  const CategorySeparator = ({ name }: { name: string }) => (
    <div className={cn("px-3 pt-4 pb-1 first:pt-2", isCollapsed && "px-2")}>
      {!isCollapsed && (
        <h3 className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-white/40">
          {name}
        </h3>
      )}
    </div>
  );

  return (
    <div
      className={cn(
        // ✅ gradiente com fallback no tema claro (pra sidebar não “sumir”)
        "min-h-screen h-full flex flex-col transition-all duration-300 z-50 relative",
        "bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100 dark:from-[#0B0F2B] dark:via-[#070A1E] dark:to-[#050617]",
        isMobile ? "w-screen" : isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div
        className={cn(
          "flex h-full flex-col backdrop-blur-md border-r shadow-xl",
          "bg-white/60 border-slate-200/70 dark:bg-white/5 dark:border-white/10",
          isMobile ? "w-full" : "mx-2 my-3 rounded-r-3xl"
        )}
      >
        {/* Header */}
        <div className="border-b px-3 py-3 overflow-hidden border-slate-200/70 dark:border-white/10">
          <div className={cn("flex items-center justify-between gap-3", isCollapsed && !isMobile && "justify-center")}>
            <div
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 shadow-sm border",
                "bg-white/70 border-slate-200/70 dark:bg-white/10 dark:border-white/20",
                isCollapsed && !isMobile && "px-2 py-2"
              )}
            >
              <img
                width={isMobile ? "140px" : isCollapsed ? "32px" : "160px"}
                height={isMobile ? "40px" : isCollapsed ? "32px" : "44px"}
                src={isCollapsed && !isMobile ? "/ico.png" : "/LOGO-1-menor.png"}
                alt="Afirme Play"
                className="object-contain"
              />

              {!isCollapsed && !isMobile && (
                <div className="flex flex-col overflow-hidden">
                  <span className="text-xs font-semibold tracking-wide truncate text-slate-900 dark:text-white">
                    Afirme Play
                  </span>
                  <span className="text-[11px] leading-tight truncate max-w-[150px] text-slate-600 dark:text-white/60">
                    Aprendizagem e Resultado
                  </span>
                </div>
              )}
            </div>

            {isMobile ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full border transition-colors
                           border-slate-200/70 text-slate-700 hover:bg-slate-900/5 hover:text-slate-900
                           dark:border-white/10 dark:text-white/70 dark:hover:text-white dark:hover:bg-white/10"
                onClick={onMobileMenuClose}
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Fechar menu</span>
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full border transition-colors
                           border-slate-200/70 text-slate-700 hover:bg-slate-900/5 hover:text-slate-900
                           dark:border-white/10 dark:text-white/70 dark:hover:text-white dark:hover:bg-white/10"
                onClick={handleToggleCollapse}
              >
                {isCollapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                <span className="sr-only">Alternar menu</span>
              </Button>
            )}
          </div>
        </div>

        {/* User Info */}
        {!isCollapsed && !isMobile && <UserInfo />}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar">
          <div className={cn("px-2 pb-4", isMobile && "pb-8")}>
            {sidebarCategories.map(category => {
              if (!category.role.includes(user.role)) return null;

              return (
                <div key={category.name}>
                  <CategorySeparator name={category.name} />
                  <ul className="space-y-1.5">
                    {category.links.map(link => (
                      <RenderMenuItem
                        key={link.label}
                        link={link}
                        currentPath={currentPath}
                        isCollapsed={isCollapsed}
                        handleLogout={handleLogout}
                        userRole={user.role}
                      />
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
