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
  TrendingUp,
  GraduationCap,
  BookMarked,
  Layers,
  Library,
  FolderTree,
  FileCheck,
  Presentation,
  PieChart,
  FileBarChart,
  ClipboardList,
  NotebookPen,
  Users,
  MapPin,
  Sparkles,
  Medal,
  Star,
  Coins
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
import { CoinBalance } from "@/components/coins/CoinBalance";

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
  const [isDarkMode, setIsDarkMode] = useState(false);

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

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);

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
          icon: ClipboardList,
          label: "Avaliações",
          href: `${user.role === 'aluno' ? "/aluno/avaliacoes" : "/app/avaliacoes"}`,
          role: ["aluno"]
        },
        {
          icon: NotebookPen,
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
          icon: FileCheck,
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
          icon: FolderTree,
          label: "Cadastros",
          role: ["admin", "tecadm"],
          children: [
            {
              icon: Building,
              label: "Instituição",
              role: ["admin", "tecadm"],
              children: [
                { icon: Building, label: "Instituição", href: "/app/cadastros/instituicao", role: ["admin", "tecadm"] },
                { icon: GraduationCap, label: "Curso", href: "/app/cadastros/curso", role: ["admin", "tecadm"] },
                { icon: Layers, label: "Série", href: "/app/cadastros/serie", role: ["admin", "tecadm"] },
                { icon: BookMarked, label: "Disciplina", href: "/app/cadastros/disciplina", role: ["admin", "tecadm"] },
                { icon: Users2, label: "Turma", href: "/app/cadastros/turma", role: ["admin", "tecadm"] },
              ]
            },
            { icon: FileCheck, label: "Avaliações", href: "/app/avaliacoes", role: ["admin", "tecadm"] },
            { icon: MapPin, label: "Municípios", href: "/app/city", role: ["admin", "tecadm"] },
            { icon: HelpCircle, label: "Questão", href: "/app/cadastros/questao", role: ["admin", "tecadm"] },
            { icon: Users, label: "Usuário", href: "/app/usuarios", role: ["admin", "tecadm"] },
          ]
        },
        {
          icon: Ticket,
          label: "Cartão Resposta",
          href: "/app/cartao-resposta",
          role: ["admin", "professor", "diretor", "coordenador", "tecadm"]
        },
        { icon: Calculator, label: "Calculadora SAEB", href: "/app/calculadora-saeb", role: ["admin", "professor", "diretor", "coordenador", "tecadm"] },
        { icon: Coins, label: "Administração de moedas", href: "/app/moedas", role: ["admin", "professor", "diretor", "coordenador", "tecadm"] },
        { icon: Target, label: "Cálculo de Metas", href: "/app/calculo-metas", role: ["admin", "professor", "diretor", "coordenador", "tecadm"] },
        { icon: ClipboardCheck, label: "Correção", href: "/app/avaliacoes/correcao", role: ["admin", "professor", "diretor", "coordenador", "tecadm"] },
        { icon: BarChart3, label: "Resultados", href: "/app/resultados", role: ["admin", "professor", "diretor", "coordenador", "tecadm"] },
        { icon: TrendingUp, label: "Evolução", href: "/app/evolucao", role: ["admin", "professor", "diretor", "coordenador", "tecadm"] },
        {
          icon: NotebookPen,
          label: "Questionários",
          role: ["admin", "tecadm"],
          children: [
            { icon: FileText, label: "Cadastro de questionários", href: "/app/questionarios/cadastro", role: ["admin", "tecadm"] },
            { icon: Presentation, label: "Relatórios Socio-Econômicos", href: "/app/questionarios/relatorios-socio-economicos", role: ["admin", "tecadm"] },
          ]
        },
        {
          icon: FileBarChart,
          label: "Relatórios",
          role: ["admin", "professor", "diretor", "coordenador", "tecadm"],
          children: [
            { icon: Target, label: "Acerto e Níveis", href: "/app/relatorios/acerto-niveis", role: ["admin", "professor", "diretor", "coordenador", "tecadm"] },
            { icon: PieChart, label: "Análise das Avaliações", href: "/app/relatorios/analise-avaliacoes", role: ["admin", "professor", "diretor", "coordenador", "tecadm"] },
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
        { icon: Sparkles, label: "Olimpíadas", href: `${user.role === 'aluno' ? "/aluno/olimpiadas" : "/app/olimpiadas"}`, role: ["admin", "professor", "diretor", "coordenador", "aluno", "tecadm"] },
        { icon: Trophy, label: "Competições", href: `${user.role === 'aluno' ? "/aluno/competitions" : "/app/competitions"}`, role: ["admin", "coordenador", "diretor", "tecadm", "aluno"] },
        { icon: Coins, label: "Histórico de Moedas", href: "/aluno/moedas/historico", role: ["aluno"] },
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
      <div className="px-2 pt-1 pb-0.5 md:px-3 lg:px-3">
        <div className="rounded-xl border bg-white/90 border-[#E5D5EA] text-slate-900 shadow-sm
                        dark:bg-white/5 dark:border-white/10 dark:text-white">
          <div className="px-2 py-1.5 md:px-3 md:py-2 lg:px-3 lg:py-1.5 flex items-center gap-2 md:gap-3">
            {user?.avatar_config ? (
              <div className="flex-shrink-0">
                <AvatarPreview 
                  config={user.avatar_config} 
                  size={isMobile ? 36 : 40} 
                  className="flex-shrink-0" 
                />
              </div>
            ) : (
              <div className={cn(
                "rounded-full bg-[#EDE9FF] text-slate-900 flex items-center justify-center font-semibold flex-shrink-0",
                "dark:bg-white/20 dark:text-white",
                isMobile ? "w-9 h-9" : "w-10 h-10"
              )}>
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-xs md:text-sm truncate text-slate-900 dark:text-white">
                  {user?.name || "Usuário"}
                </p>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={handleProfileClick}
                        className="flex-shrink-0 p-1 rounded-full transition-colors
                                   hover:bg-[#EDE9FF] dark:hover:bg-white/10"
                        aria-label="Editar perfil"
                      >
                        <Edit className="h-3.5 w-3.5 md:h-4 md:w-4 text-slate-800 hover:text-[#7B3FE4] dark:text-white/70 dark:hover:text-white" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Editar perfil</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="mt-0.5 md:mt-1">
                <p className="text-[10px] md:text-xs truncate text-slate-700 dark:text-white/70">
                  {user?.role ? getRoleDisplayName(user.role) : "Usuário"}
                </p>
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
        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
          <div
            className={cn(
              "flex items-center justify-center rounded-full transition-colors",
              // fundo do ícone ajustado p/ tema claro
              "bg-[#F5F0F7] group-hover:bg-[#EDE9FF]",
              "dark:bg-white/5 dark:group-hover:bg-white/10",
              isCollapsed 
                ? "h-10 w-10" 
                : "h-8 w-8 md:h-9 md:w-9 lg:h-9 lg:w-9"
            )}
          >
            <link.icon
              size={isCollapsed ? 18 : 16}
              className={cn(
                "flex-shrink-0 transition-colors md:w-[18px] md:h-[18px] lg:w-[18px] lg:h-[18px]",
                isActive
                  ? "text-[#7B3FE4]"
                  : "text-slate-800 group-hover:text-[#7B3FE4] dark:text-white/80 dark:group-hover:text-white"
              )}
            />
          </div>

          {!isCollapsed && (
            <span
              className={cn(
                "truncate text-xs md:text-sm font-medium transition-colors",
                isActive
                  ? "text-slate-900 dark:text-[#1B1F4A]"
                  : "text-slate-800 group-hover:text-slate-900 dark:text-white/80 dark:group-hover:text-white"
              )}
            >
              {link.label}
            </span>
          )}
        </div>

        {!isCollapsed && (
          <div className="flex items-center gap-1.5 md:gap-2">
            {link.badge && (
              <span className="bg-pink-500 text-white text-[9px] md:text-[10px] font-bold px-1 md:px-1.5 py-0.5 rounded-full min-w-[18px] md:min-w-[20px] text-center">
                {link.badge}
              </span>
            )}
            {hasSubmenu && (
              <ChevronDown
                size={isMobile ? 12 : 14}
                className={cn(
                  "transition-transform duration-200",
                  "text-slate-700 group-hover:text-[#7B3FE4] dark:text-white/70 dark:group-hover:text-white",
                  isSubmenuOpen && "rotate-180"
                )}
              />
            )}
          </div>
        )}

        {isCollapsed && link.badge && (
          <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-[9px] md:text-[10px] font-bold w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center">
            {link.badge}
          </span>
        )}
      </div>
    );

    const itemClasses = cn(
      "sidebar-link w-full text-left group relative",
      "flex items-center gap-2 md:gap-3 transition-all duration-200",
      isCollapsed 
        ? "justify-center px-0 py-1" 
        : "px-2 py-2 md:px-3 md:py-2.5 lg:px-3 lg:py-2.5 rounded-full text-xs md:text-sm",

      // ✅ HOVER: forçado (important) para NÃO virar branco estourado (mesmo que exista CSS externo)
      "hover:!bg-[#EDE9FF]/50 dark:hover:!bg-white/10",

      // ✅ Active (tema claro e escuro)
      isActive && !isCollapsed && "bg-[#EDE9FF] text-slate-900 shadow-sm font-semibold dark:bg-[#E3DFFF] dark:text-[#1B1F4A] dark:shadow-lg",
      isActive && isCollapsed && "bg-slate-900/10 dark:bg-white/20",

      // níveis
      level > 0 && !isCollapsed && "ml-3 md:ml-4 text-xs md:text-sm",
      level > 1 && !isCollapsed && "ml-6 md:ml-8 text-[10px] md:text-xs",

      // foco bonito
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B3FE4]/40"
    );

    return (
      <li className={cn(link.divider && "border-t border-[#E5D5EA] pt-2 mt-2 dark:border-white/10")}>
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
          <ul className="space-y-1 ml-1.5 md:ml-2 mt-1 border-l border-[#E5D5EA] pl-2 md:pl-3 dark:border-white/10">
            {link.children.map((child, index) => (
              <RenderMenuItem
                key={`${child.label}-${child.href || child.role.join('-')}-${index}`}
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
    <div className={cn(
      "px-2 pt-1.5 pb-0.5 first:pt-0.5 md:px-3 lg:px-3", 
      isCollapsed && "px-2"
    )}>
      {!isCollapsed && (
        <h3 className="text-[10px] md:text-[10px] lg:text-[10px] font-medium uppercase tracking-[0.18em] text-slate-700 dark:text-white/40">
          {name}
        </h3>
      )}
    </div>
  );

  return (
    <div
      className={cn(
        "min-h-screen h-full flex flex-col transition-all duration-300 ease-in-out z-50 relative",
        "border-r shadow-xl",
        "dark:from-[#0B0F2B] dark:via-[#070A1E] dark:to-[#050617] dark:bg-gradient-to-b",
        isMobile 
          ? "w-screen" 
          : isCollapsed 
            ? "w-16 md:w-16 lg:w-16" 
            : "w-64 md:w-72 lg:w-64"
      )}
      style={{
        ...(!isDarkMode && {
          background: 'linear-gradient(to bottom, #f0e8f5, #e8daf0, #dcc5e8, #d0b0e0)'
        })
      }}
    >
      {/* Header */}
      <div className={cn(
        "border-b overflow-hidden border-[#E5D5EA] dark:border-white/10",
        "px-2 py-2 md:px-3 md:py-2 lg:px-3 lg:py-1"
      )}>
          <div className={cn(
            "flex items-center gap-2 md:gap-3", 
            isCollapsed && !isMobile 
              ? "justify-center" 
              : "justify-between"
          )}>
            {isCollapsed && !isMobile ? (
              // Quando colapsado, mostra apenas a logo centralizada (substitui o botão de menu)
              <button
                onClick={handleToggleCollapse}
                className="flex items-center justify-center p-1 rounded-full transition-colors
                           hover:bg-[#EDE9FF] dark:hover:bg-white/10
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7B3FE4]/40"
                aria-label="Expandir menu"
              >
                <img
                  width="90px"
                  height="90px"
                  src="/AFIRME-PLAY-ico.png"
                  alt="Afirme Play"
                  className="object-contain transition-all duration-300"
                />
              </button>
            ) : (
              <>
                <div
                  className={cn(
                    "flex items-center gap-2 px-0 py-0",
                    isCollapsed && !isMobile && "px-0 py-0"
                  )}
                >
                  <img
                    width={isMobile ? "40px" : "48px"}
                    height={isMobile ? "40px" : "48px"}
                    src="/AFIRME-PLAY-ico.png"
                    alt="Afirme Play"
                    className="object-contain transition-all duration-300"
                  />
                </div>

                {isMobile ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 md:h-10 md:w-10 rounded-full border transition-colors
                               border-[#E5D5EA] text-slate-800 hover:bg-[#EDE9FF] hover:text-[#7B3FE4]
                               dark:border-white/10 dark:text-white/70 dark:hover:text-white dark:hover:bg-white/10"
                    onClick={onMobileMenuClose}
                  >
                    <X className="h-5 w-5 md:h-6 md:w-6" />
                    <span className="sr-only">Fechar menu</span>
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 md:h-9 md:w-9 lg:h-8 lg:w-8 rounded-full border transition-colors
                               border-[#E5D5EA] text-slate-800 hover:bg-[#EDE9FF] hover:text-[#7B3FE4]
                               dark:border-white/10 dark:text-white/70 dark:hover:text-white dark:hover:bg-white/10"
                    onClick={handleToggleCollapse}
                  >
                    <ChevronLeft className="h-4 w-4 md:h-5 md:w-5 lg:h-4 lg:w-4" />
                    <span className="sr-only">Alternar menu</span>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Coin balance (aluno) + User Info */}
        {!isCollapsed && !isMobile && user.role === 'aluno' && (
          <div className="px-2 pb-1 md:px-3">
            <Link to="/aluno/moedas/historico" className="block">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="rounded-lg border border-[#E5D5EA] dark:border-white/10 bg-white/80 dark:bg-white/5 px-2 py-1.5">
                      <CoinBalance size="small" showLabel={false} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Ver histórico</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Link>
          </div>
        )}
        {!isCollapsed && !isMobile && <UserInfo />}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar">
          <div className={cn(
            "px-1.5 pb-2 md:px-2 md:pb-3 lg:px-2 lg:pb-2", 
            isMobile && "pb-4"
          )}>
            {sidebarCategories.map(category => {
              if (!category.role.includes(user.role)) return null;

              return (
                <div key={category.name}>
                  <CategorySeparator name={category.name} />
                  <ul className="space-y-1 md:space-y-1.5">
                    {category.links.map((link, index) => (
                      <RenderMenuItem
                        key={`${link.label}-${link.href || link.role.join('-')}-${index}`}
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
  );
}
