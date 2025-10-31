import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/authContext';

interface RoleRouteProps {
  allowed: string[]; // ex.: ['admin', 'diretor', 'coordenador']
  children: ReactNode;
}

export function RoleRoute({ allowed, children }: RoleRouteProps) {
  const { user } = useAuth();
  if (!user?.role) return <Navigate to="/" replace />;
  if (!allowed.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}


