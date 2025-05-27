import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/authContext';

interface PrivateRouteProps {
  children: React.ReactNode;
}

export function PrivateRoute({ children }: PrivateRouteProps) {
  const { persistUser, user } = useAuth();
  const navigate = useNavigate();
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

  return <>{children}</>;
} 