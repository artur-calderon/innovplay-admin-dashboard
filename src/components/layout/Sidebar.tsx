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
  ChevronUp,
  BookOpen,
  Building,
  Users2,
  HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/context/authContext";

type SidebarLink = {
  icon: React.ElementType;
  label: string;
  href?: string;
  role: string[];
  children?: SidebarLink[];
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

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const currentPath = useLocation().pathname;
  const isMobile = useIsMobile();

  const navigate = useNavigate()
  const {logout, user} = useAuth()

  function handleLogout(){
      logout().then(()=>{
        navigate("/")
      })
    
  }

  const sidebarLinks: SidebarLink[] = [
  { icon: LayoutDashboard, label: "Painel", href: `${user.role === 'aluno'? "/aluno" : "/app" }` , role:["admin", "professor","aluno"]},
  { icon: CalendarDays, label: "Agenda", href: `${user.role === 'aluno'? "/aluno/agenda" : "/app/agenda" }`,role:["admin", "professor", "aluno"] },
  { icon: Gamepad, label: "Jogos", href: `${user.role === 'aluno'? "/aluno/jogos" : "/app/jogos" }`,role:["admin", "professor", "aluno"] },
  { icon: Tv, label: "Play TV", href: `${user.role === 'aluno'? "/aluno/play-tv" : "/app/play-tv" }`,role:["admin", "professor", "aluno"] },
  { icon: Headset, label: "Plantão Online", href: "/app/plantao",role:["admin", "professor"] },
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
      { icon: School, label: "Escola", href: "/app/escolas", role: ["admin"] },
      { icon: LandPlot, label: "Municípios", href: "/app/city" ,role:["admin"]},
      { icon: HelpCircle, label: "Questão", href: "/app/cadastros/questao", role: ["admin", "professor"] },
      { icon: Users2, label: "Turma", href: "/app/cadastros/turma", role: ["admin", "professor"] },
      { icon: User, label: "Usuário", href: "/app/usuarios", role: ["admin"] },
    ]
  },
  { icon: Ticket, label: "Cartão Resposta", href: "/app/cartao-resposta",role:["admin", "professor"] },
  { icon: Award, label: "Certificados", href:`${user.role === 'aluno'? "/aluno/certificados" : "/app/certificados" }`,role:["admin", "professor", "aluno"] },
  { icon: Trophy, label: "Competições", href: `${user.role === 'aluno'? "/aluno/competicoes" : "/app/competicoes" }`,role:["admin", "professor", "aluno"] },
  { icon: Award, label: "Olimpíadas", href: `${user.role === 'aluno'? "/aluno/olimpiadas" : "/app/olimpiadas" }` ,role:["admin", "professor", "aluno"]},
  { icon: Edit, label: "Editar Perfil", href:`${user.role === 'aluno'? "/aluno/perfil" : "/app/perfil" }` ,role:["admin", "professor", "aluno"]},
  { icon: Bell, label: "Avisos", href:`${user.role === 'aluno'? "/aluno/avisos" : "/app/avisos" }`,role:["admin", "professor", "aluno"] },
  { icon: Settings, label: "Configurações", href: "/app/configuracoes",role:["admin", "professor"] },
  { icon: LogOut, label: "Sair", href: "/logout",role:["admin", "professor", "aluno"] },

  
];

function RenderMenuItem({
  link,
  currentPath,
  isCollapsed,
  handleLogout,
  userRole
}) {
  const hasSubmenu = link.children && link.children.length > 0;
  const isActive = isLinkActive(link, currentPath);

  // Manage submenu open state locally
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(isActive); // Initialize based on activity

  // Effect to open submenu if route becomes active while sidebar is rendered
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

  return (
    <li>
      {link.label === "Sair" ? (
        <button
          onClick={handleLogout}
          className={
            `sidebar-link w-full text-left flex items-center gap-2 ${
            currentPath === link.href ? "active" : ""
          }`}
        >
          <link.icon size={20} />
          {!isCollapsed && <span>{link.label}</span>}
        </button>
      ) : hasSubmenu ? (
        <button
          onClick={handleToggleSubmenu}
          className={
            `sidebar-link w-full text-left flex items-center justify-between gap-2 ${
            isActive ? "active" : ""
          }`}
        >
          <div className="flex items-center gap-2">
            <link.icon size={20} />
            {!isCollapsed && <span>{link.label}</span>}
          </div>
          {!isCollapsed && (isSubmenuOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
        </button>
      ) : (
        <Link
          to={link.href || "#"}
          className={
            `sidebar-link flex items-center gap-2 ${
            currentPath === link.href ? "active" : ""
          }`}
        >
          <link.icon size={20} />
          {!isCollapsed && <span>{link.label}</span>}
        </Link>
      )}

      {hasSubmenu && !isCollapsed && isSubmenuOpen && (
        <ul className="ml-4 space-y-1 border-l border-white/20 pl-4">
          {link.children?.map(child => (
            <RenderMenuItem 
              key={child.href || child.label}
              link={child}
              currentPath={currentPath}
              isCollapsed={isCollapsed}
              handleLogout={handleLogout}
              userRole={userRole}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

  // Auto-collapse on mobile devices
  useEffect(() => {
    if (isMobile) {
      setIsCollapsed(true);
    }
  }, [isMobile]);

  return (
    <div
      className={cn(
        "sidebar-gradient min-h-screen h-full flex flex-col transition-all duration-300 z-50",
        isCollapsed ? "w-24" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="p-4 flex justify-between items-center">
        <div className={cn("flex items-center", isCollapsed && "justify-center w-full")}>
          {!isCollapsed && (
            <>
              
              <img width='208px' height='56.44' src="/LOGO-1-menor.png"/>
            </>
          )}
          {isCollapsed && (
            <img width='48px' height='54.27'  src="/ico.png"/>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-white/70 hover:text-white"
        >
          {isCollapsed ? "→" : "←"}
        </button>
      </div>

      {/* Navigation */}
      <nav className="mt-6 flex-1 overflow-y-auto">
        <ul className="space-y-1 px-2 md:px-3">
         {sidebarLinks.map(link => (
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
      </nav>
    </div>
  );
}
