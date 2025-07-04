import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
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
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/context/authContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGamesCount } from "@/hooks/useGamesCount";

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

// Helper function to check if a link or any of its children is active
const isLinkActive = (link: SidebarLink, currentPath: string): boolean => {
  if (link.href && currentPath.startsWith(link.href)) {
    return true;
  }
  if (link.children) {
    return link.children.some(child => isLinkActive(child, currentPath));
  }
  return false;
};

interface SidebarProps {
  onMobileMenuClose?: () => void;
}

export default function Sidebar({ onMobileMenuClose }: SidebarProps = {}) {
  const currentPath = useLocation().pathname;
  const isMobile = useIsMobile();

  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { gamesCount } = useGamesCount();

  function handleLogout() {
    logout().then(() => {
      navigate("/");
    });
  }

  // Função para fechar menu mobile quando um link for clicado
  const handleLinkClick = () => {
    if (isMobile && onMobileMenuClose) {
      onMobileMenuClose();
    }
  };

  // No mobile sempre expandida quando visível, no desktop sempre expandida
  const isCollapsed = false;

  // Organize links by categories for better UX
  const sidebarCategories: SidebarCategory[] = [
    {
      name: "Principal",
      role: ["admin", "professor", "aluno"],
      links: [
        {
          icon: LayoutDashboard,
          label: "Painel",
          href: `${user.role === 'aluno' ? "/aluno" : "/app"}`,
          role: ["admin", "professor", "aluno"]
        },
        {
          icon: CalendarDays,
          label: "Agenda",
          href: `${user.role === 'aluno' ? "/aluno/agenda" : "/app/agenda"}`,
          role: ["admin", "professor", "aluno"]
        },
        {
          icon: List,
          label: "Avaliações",
          href: `${user.role === 'aluno' ? "/aluno/avaliacoes" : "/app/avaliacoes"}`,
          role: ["aluno"]
        },
      ]
    },
    {
      name: "Plataforma",
      role: ["admin", "professor", "aluno"],
      links: [
        {
          icon: Gamepad,
          label: "Jogos",
          href: `${user.role === 'aluno' ? "/aluno/jogos" : "/app/jogos"}`,
          role: ["admin", "professor", "aluno"],
          badge: gamesCount > 0 ? gamesCount.toString() : "0"
        },
        {
          icon: Tv,
          label: "Play TV",
          href: `${user.role === 'aluno' ? "/aluno/play-tv" : "/app/play-tv"}`,
          role: ["admin", "professor", "aluno"]
        },
        {
          icon: Headset,
          label: "Plantão Online",
          href: "/app/plantao",
          role: ["admin", "professor"]
        },
      ]
    },
    {
      name: "Gestão",
      role: ["admin", "professor"],
      links: [
        {
          icon: List,
          label: "Cadastros",
          role: ["admin", "professor"],
          children: [
            {
              icon: Building,
              label: "Instituição",
              role: ["admin"],
              children: [
                { icon: Building, label: "Instituição", href: "/app/cadastros/instituicao", role: ["admin"] },
                { icon: BookOpen, label: "Curso", href: "/app/cadastros/curso", role: ["admin"] },
                { icon: BookOpen, label: "Série", href: "/app/cadastros/serie", role: ["admin"] },
                { icon: BookOpen, label: "Disciplina", href: "/app/cadastros/disciplina", role: ["admin"] },
              ]
            },
            { icon: List, label: "Avaliações", href: "/app/avaliacoes", role: ["admin", "professor"] },
            { icon: ClipboardCheck, label: "Correção", href: "/app/avaliacoes/correcao", role: ["admin", "professor"], badge: "3" },
            { icon: BarChart3, label: "Resultados", href: "/app/resultados", role: ["admin", "professor"] },
            { icon: School, label: "Escola", href: "/app/escolas", role: ["admin"] },
            { icon: LandPlot, label: "Municípios", href: "/app/city", role: ["admin"] },
            { icon: HelpCircle, label: "Questão", href: "/app/cadastros/questao", role: ["admin", "professor"] },
            { icon: Users2, label: "Turma", href: "/app/cadastros/turma", role: ["admin", "professor"] },
            { icon: User, label: "Usuário", href: "/app/usuarios", role: ["admin"] },
          ]
        },
        {
          icon: Ticket,
          label: "Cartão Resposta",
          href: "/app/cartao-resposta",
          role: ["admin", "professor"]
        },
      ]
    },
    {
      name: "Atividades",
      role: ["admin", "professor", "aluno"],
      links: [
        {
          icon: Award,
          label: "Certificados",
          href: `${user.role === 'aluno' ? "/aluno/certificados" : "/app/certificados"}`,
          role: ["admin", "professor", "aluno"]
        },
        {
          icon: Trophy,
          label: "Competições",
          href: `${user.role === 'aluno' ? "/aluno/competicoes" : "/app/competicoes"}`,
          role: ["admin", "professor", "aluno"],
          badge: "2"
        },
        {
          icon: Award,
          label: "Olimpíadas",
          href: `${user.role === 'aluno' ? "/aluno/olimpiadas" : "/app/olimpiadas"}`,
          role: ["admin", "professor", "aluno"]
        },
      ]
    },
    {
      name: "Configurações",
      role: ["admin", "professor", "aluno"],
      links: [
        {
          icon: Edit,
          label: "Editar Perfil",
          href: `${user.role === 'aluno' ? "/aluno/perfil" : "/app/perfil"}`,
          role: ["admin", "professor", "aluno"]
        },
        {
          icon: Bell,
          label: "Avisos",
          href: `${user.role === 'aluno' ? "/aluno/avisos" : "/app/avisos"}`,
          role: ["admin", "professor", "aluno"],
          badge: "5"
        },
        {
          icon: Settings,
          label: "Configurações",
          href: "/app/configuracoes",
          role: ["admin", "professor"]
        },
        {
          icon: LogOut,
          label: "Sair",
          href: "/logout",
          role: ["admin", "professor", "aluno"],
          divider: true
        },
      ]
    }
  ];

  // User info component
  const UserInfo = () => (
    <div className="p-4 border-b border-white/10">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold flex-shrink-0">
          {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-sm truncate">
            {user?.name || "Usuário"}
          </p>
          <p className="text-white/70 text-xs truncate capitalize">
            {user?.role || "Usuário"}
          </p>
        </div>
      </div>
    </div>
  );

  // Enhanced menu item component with tooltips and badges
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
      if (isActive) {
        setIsSubmenuOpen(true);
      }
    }, [isActive]);

    const handleToggleSubmenu = () => {
      if (hasSubmenu) {
        setIsSubmenuOpen(!isSubmenuOpen);
      }
    };

    if (!link.role.includes(userRole)) {
      return null;
    }

    const linkContent = (
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <link.icon size={18} className="flex-shrink-0" />
          <span className="truncate text-sm font-medium">{link.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {link.badge && (
            <Badge
              variant="secondary"
              className="bg-white/20 text-white text-xs px-1.5 py-0.5 h-5"
            >
              {link.badge}
            </Badge>
          )}
          {hasSubmenu && (
            <ChevronDown
              size={14}
              className={cn(
                "transition-transform duration-200",
                isSubmenuOpen && "rotate-180"
              )}
            />
          )}
        </div>
      </div>
    );

    const itemClasses = cn(
      "sidebar-link w-full text-left group relative",
      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
      "text-white/80 hover:text-white hover:bg-white/10",
      isActive && "bg-white/15 text-white font-medium shadow-lg",
      level > 0 && "ml-4 text-sm",
      level > 1 && "ml-8 text-xs"
    );

    const menuItem = (
      <li className={cn(link.divider && "border-t border-white/10 pt-2 mt-2")}>
        {link.label === "Sair" ? (
          <button onClick={handleLogout} className={itemClasses}>
            {linkContent}
          </button>
        ) : hasSubmenu ? (
          <button onClick={handleToggleSubmenu} className={itemClasses}>
            {linkContent}
          </button>
        ) : (
          <Link
            to={link.href || "#"}
            className={itemClasses}
            onClick={handleLinkClick}
          >
            {linkContent}
          </Link>
        )}

        {hasSubmenu && isSubmenuOpen && (
          <ul className="space-y-1 ml-2 mt-1 border-l border-white/10 pl-3">
            {link.children?.map(child => (
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

    return menuItem;
  }

  // Category separator component
  const CategorySeparator = ({ name }: { name: string }) => (
    <div className="px-3 pt-6 pb-2 first:pt-2">
      <h3 className="text-white/50 text-xs font-medium uppercase tracking-wider">
        {name}
      </h3>
    </div>
  );

  return (
    <div
      className={cn(
        "sidebar-gradient min-h-screen h-full flex flex-col transition-all duration-300 z-50 relative",
        isMobile ? "w-screen" : "w-64"
      )}
    >
      {/* Mobile Header with Close Button */}
      {isMobile && (
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <img
            width="150px"
            height="40px"
            src="/LOGO-1-menor.png"
            alt="Logo"
            className="object-contain"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/10"
            onClick={onMobileMenuClose}
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Fechar menu</span>
          </Button>
        </div>
      )}

      {/* Desktop Logo Section */}
      {!isMobile && (
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-center">
            <img
              width="180px"
              height="48px"
              src="/LOGO-1-menor.png"
              alt="Logo"
              className="object-contain"
            />
          </div>
        </div>
      )}

      {/* User Info */}
      <UserInfo />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar">
        <div className={cn("px-2 pb-4", isMobile && "pb-8")}>
          {sidebarCategories.map(category => {
            // Check if user has permission for this category
            const hasPermission = category.role.includes(user.role);
            if (!hasPermission) return null;

            return (
              <div key={category.name}>
                <CategorySeparator name={category.name} />
                <ul className="space-y-1">
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
  );
}
