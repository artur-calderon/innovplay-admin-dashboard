
import { Link } from "react-router-dom";
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
  Edit
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

type SidebarLink = {
  icon: React.ElementType;
  label: string;
  href: string;
};

const sidebarLinks: SidebarLink[] = [
  { icon: LayoutDashboard, label: "Painel", href: "/" },
  { icon: Users, label: "Alunos", href: "/alunos" },
  { icon: List, label: "Avaliações", href: "/avaliacoes" },
  { icon: CalendarDays, label: "Agenda", href: "/agenda" },
  { icon: Gamepad, label: "Jogos", href: "/jogos" },
  { icon: Tv, label: "Play TV", href: "/play-tv" },
  { icon: Headset, label: "Plantão Online", href: "/plantao" },
  { icon: Ticket, label: "Cartão Resposta", href: "/cartao-resposta" },
  { icon: Award, label: "Certificados", href: "/certificados" },
  { icon: Trophy, label: "Competições", href: "/competicoes" },
  { icon: Award, label: "Olimpíadas", href: "/olimpiadas" },
  { icon: School, label: "Escolas", href: "/escolas" },
  { icon: User, label: "Usuários", href: "/usuarios" },
  { icon: Edit, label: "Editar Perfil", href: "/perfil" },
  { icon: Bell, label: "Avisos", href: "/avisos" },
  { icon: Settings, label: "Configurações", href: "/configuracoes" },
  { icon: LogOut, label: "Sair", href: "/logout" },
];

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const currentPath = window.location.pathname;

  return (
    <div 
      className={cn(
        "sidebar-gradient min-h-screen flex flex-col transition-all duration-300",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="p-4 flex justify-between items-center">
        <div className={cn("flex items-center", isCollapsed && "justify-center w-full")}>
          {!isCollapsed && (
            <>
              <span className="text-white font-bold text-2xl">Innov</span>
              <span className="text-white font-bold text-2xl ml-1">Play</span>
            </>
          )}
          {isCollapsed && (
            <span className="text-white font-bold text-2xl">IP</span>
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
        <ul className="space-y-1 px-3">
          {sidebarLinks.map((link) => (
            <li key={link.href}>
              <Link
                to={link.href}
                className={cn(
                  "sidebar-link",
                  currentPath === link.href && "active"
                )}
              >
                <link.icon size={20} />
                {!isCollapsed && <span>{link.label}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
