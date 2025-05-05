
import { Link, useNavigate } from "react-router-dom";
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
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/context/authContext";

type SidebarLink = {
  icon: React.ElementType;
  label: string;
  href: string;
  role:string[];
};

const sidebarLinks: SidebarLink[] = [
  { icon: LayoutDashboard, label: "Painel", href: "/" , role:["admin", "professor","aluno"]},
  { icon: Users, label: "Alunos", href: "/alunos" , role:["admin", "professor"]},
  { icon: List, label: "Avaliações", href: "/avaliacoes",role:["admin", "professor", "aluno"] },
  { icon: CalendarDays, label: "Agenda", href: "/agenda",role:["admin", "professor", "aluno"] },
  { icon: Gamepad, label: "Jogos", href: "/jogos",role:["admin", "professor", "aluno"] },
  { icon: Tv, label: "Play TV", href: "/play-tv",role:["admin", "professor", "aluno"] },
  { icon: Headset, label: "Plantão Online", href: "/plantao",role:["admin", "professor"] },
  { icon: Ticket, label: "Cartão Resposta", href: "/cartao-resposta",role:["admin", "professor"] },
  { icon: Award, label: "Certificados", href: "/certificados",role:["admin", "professor", "aluno"] },
  { icon: Trophy, label: "Competições", href: "/competicoes",role:["admin", "professor", "aluno"] },
  { icon: Award, label: "Olimpíadas", href: "/olimpiadas" ,role:["admin", "professor", "aluno"]},
  { icon: School, label: "Escolas", href: "/escolas" ,role:["admin", "professor"]},
  { icon: User, label: "Usuários", href: "/usuarios",role:["admin"] },
  { icon: Edit, label: "Editar Perfil", href: "/perfil" ,role:["admin", "professor", "aluno"]},
  { icon: Bell, label: "Avisos", href: "/avisos",role:["admin", "professor", "aluno"] },
  { icon: Settings, label: "Configurações", href: "/configuracoes",role:["admin", "professor", "aluno"] },
  { icon: LogOut, label: "Sair", href: "/logout",role:["admin", "professor", "aluno"] },
];


const menuProfessor = sidebarLinks.filter(menu => menu.role.includes("professor"))
const menuAdmin = sidebarLinks.filter(menu => menu.role.includes("admin"))
const menuAluno = sidebarLinks.filter(menu => menu.role.includes("aluno"))
const menuDiretor = sidebarLinks.filter(menu => menu.role.includes("diretor"))


export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const currentPath = window.location.pathname;
  const isMobile = useIsMobile();

  const navigate = useNavigate()
  const {logout, user} = useAuth()

  function handleLogout(){
      logout().then(()=>{
        navigate("/")
      })
    
  }



function RenderMenu({ user, currentPath, isCollapsed, handleLogout }) {
  let menu = [];

  switch (user.role) {
    case "admin":
      menu = menuAdmin;
      break;
    case "professor":
      menu = menuProfessor;
      break;
    case "aluno":
      menu = menuAluno;
      break;
    default:
      return null;
  }

  return (
    <>
      {menu.map((link) => (
        <li key={link.href}>
          {link.label === "Sair" ? (
            <button
              onClick={handleLogout}
              className={`sidebar-link w-full text-left flex items-center gap-2 ${
                currentPath === link.href ? "active" : ""
              }`}
            >
              <link.icon size={20} />
              {!isCollapsed && <span>{link.label}</span>}
            </button>
          ) : (
            <Link
              to={link.href}
              className={`sidebar-link flex items-center gap-2 ${
                currentPath === link.href ? "active" : ""
              }`}
            >
              <link.icon size={20} />
              {!isCollapsed && <span>{link.label}</span>}
            </Link>
          )}
        </li>
      ))}
    </>
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
              <span className="text-white font-bold text-xl md:text-2xl">Innov</span>
              <span className="text-white font-bold text-xl md:text-2xl ml-1">Play</span>
            </>
          )}
          {isCollapsed && (
            <span className="text-white font-bold text-xl md:text-2xl">IP</span>
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
         <RenderMenu
          user={user}
          currentPath={currentPath}
          isCollapsed={isCollapsed}
          handleLogout={handleLogout}
         />
        </ul>
      </nav>
    </div>
  );
}
