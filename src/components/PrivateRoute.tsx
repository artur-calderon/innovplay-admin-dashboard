import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/authContext';

interface PrivateRouteProps {
  children: ReactNode;
}


export function PrivateRoute({ children }: PrivateRouteProps) {
  const { persistUser, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);

  const token = localStorage.getItem('token')

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isValid = await persistUser();
        if (!isValid) {
          navigate('/');
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [navigate, persistUser]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!token) {
    return null;
  }

  // Contas "corretor(n)@afirmeplay.com.br" (TEC admin) devem acessar
  // somente cartão resposta, agenda, configurações e correção de prova física;
  // todo o resto é redirecionado.
  const email = user?.email?.toLowerCase();
  const isCorretor = Boolean(email?.includes('corretor'));
  if (isCorretor) {
    const pathname = location.pathname;
    const allowed =
      pathname === '/app' ||
      pathname === '/app/' ||
      pathname === '/app/avaliacoes' ||
      pathname === '/app/avaliacoes/' ||
      pathname === '/app/perfil' ||
      pathname === '/app/perfil/' ||
      pathname === '/app/agenda' ||
      pathname.startsWith('/app/agenda/') ||
      pathname === '/app/cartao-resposta' ||
      pathname === '/app/cartao-resposta/gerar' ||
      pathname === '/app/cartao-resposta/cadastrar' ||
      pathname === '/app/cartao-resposta/corrigir' ||
      pathname === '/app/configuracoes' ||
      pathname.startsWith('/app/configuracoes/') ||
      (pathname.startsWith('/app/avaliacao/') && pathname.endsWith('/fisica')) ||
      pathname.startsWith('/app/provas-fisicas/');

    if (!allowed) {
      return <Navigate to="/app/cartao-resposta/corrigir" replace />;
    }
  }

  return <>{children}</>;
}
