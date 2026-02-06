/**
 * Componente de sino de notificações com badge e dropdown.
 * Exibe notificações não lidas e permite redirecionamento para competições.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Trophy, X, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/authContext';
import { api } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export interface Notification {
  id: string;
  type: 'competition' | 'evaluation' | 'system' | 'deadline';
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  action_url?: string;
  competition_id?: string;
  priority: 'high' | 'medium' | 'low';
}

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    try {
      setIsLoading(true);
      
      // Buscar competições recentes e criar notificações
      // TODO: Substituir por endpoint real de notificações quando disponível
      const competitionsRes = await api.get('/competitions/available').catch(() => ({ data: [] }));
      const competitions = Array.isArray(competitionsRes.data) ? competitionsRes.data : [];

      const newNotifications: Notification[] = [];

      // Criar notificações para competições que começam em breve
      competitions.forEach((comp: any) => {
        if (!comp.is_enrolled && comp.enrollment_start) {
          const enrollmentStart = new Date(comp.enrollment_start).getTime();
          const now = Date.now();
          const daysUntilStart = Math.floor((enrollmentStart - now) / (1000 * 60 * 60 * 24));

          // Notificar sobre competições que começam nos próximos 3 dias
          if (daysUntilStart >= 0 && daysUntilStart <= 3) {
            newNotifications.push({
              id: `competition-${comp.id}-enrollment`,
              type: 'competition',
              title: 'Nova competição disponível',
              message: `"${comp.name}" está aberta para inscrição`,
              created_at: comp.enrollment_start,
              is_read: false,
              action_url: user.role === 'aluno' 
                ? `/aluno/competitions/${comp.id}` 
                : `/app/competitions/${comp.id}`,
              competition_id: comp.id,
              priority: daysUntilStart === 0 ? 'high' : 'medium',
            });
          }
        }

        // Notificar sobre competições que começam hoje
        if (comp.application) {
          const applicationDate = new Date(comp.application).getTime();
          const now = Date.now();
          const hoursUntilStart = Math.floor((applicationDate - now) / (1000 * 60 * 60));

          if (comp.is_enrolled && hoursUntilStart >= 0 && hoursUntilStart <= 24) {
            newNotifications.push({
              id: `competition-${comp.id}-start`,
              type: 'competition',
              title: 'Competição começa em breve',
              message: `"${comp.name}" começa em ${hoursUntilStart}h`,
              created_at: comp.application,
              is_read: false,
              action_url: user.role === 'aluno' 
                ? `/aluno/competitions/${comp.id}` 
                : `/app/competitions/${comp.id}`,
              competition_id: comp.id,
              priority: hoursUntilStart <= 2 ? 'high' : 'medium',
            });
          }
        }
      });

      // Ordenar por prioridade e data
      newNotifications.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setNotifications(newNotifications);
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, user?.role]);

  // Buscar notificações apenas quando o popover é aberto,
  // para evitar chamadas constantes à API (especialmente em caso de erro 500).
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, is_read: true } : notif
      )
    );

    // TODO: Chamar API para marcar como lida quando endpoint estiver disponível
    // await api.patch(`/notifications/${notificationId}`, { is_read: true });
  }, []);

  const handleNotificationClick = useCallback((notification: Notification) => {
    markAsRead(notification.id);
    if (notification.action_url) {
      navigate(notification.action_url);
      setIsOpen(false);
    }
  }, [markAsRead, navigate]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'competition':
        return <Trophy className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return 'há pouco tempo';
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-sm">Notificações</h3>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadCount} não lidas
            </Badge>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">
                Nenhuma notificação no momento
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "w-full text-left p-4 hover:bg-muted/50 transition-colors",
                    !notification.is_read && "bg-primary/5"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      notification.type === 'competition' && "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
                      notification.type === 'evaluation' && "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
                      notification.type === 'system' && "bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300",
                      notification.type === 'deadline' && "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                    )}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "text-sm font-medium",
                          !notification.is_read && "font-semibold"
                        )}>
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTimeAgo(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
