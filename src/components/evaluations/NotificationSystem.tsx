import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Bell, 
  BellOff, 
  Check, 
  X, 
  Clock, 
  AlertTriangle, 
  Info, 
  CheckCircle,
  Calendar,
  Users,
  FileText,
  Settings,
  Trash2,
  MoreVertical
} from "lucide-react";
import { useAuth } from "@/context/authContext";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isToday, isYesterday, differenceInHours } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Notification {
  id: string;
  type: "evaluation_reminder" | "evaluation_available" | "correction_pending" | "results_ready" | "deadline_warning" | "system_announcement";
  title: string;
  message: string;
  data?: {
    evaluationId?: string;
    evaluationTitle?: string;
    studentCount?: number;
    dueDate?: string;
    url?: string;
  };
  isRead: boolean;
  priority: "low" | "medium" | "high" | "urgent";
  createdAt: string;
  expiresAt?: string;
  actions?: {
    label: string;
    action: string;
    variant?: "default" | "destructive" | "outline";
  }[];
}

interface NotificationSettings {
  evaluationReminders: boolean;
  evaluationAvailable: boolean;
  correctionPending: boolean;
  resultsReady: boolean;
  deadlineWarnings: boolean;
  systemAnnouncements: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  soundEnabled: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

interface NotificationSystemProps {
  showBadge?: boolean;
  maxVisible?: number;
}

export default function NotificationSystem({ showBadge = true, maxVisible = 5 }: NotificationSystemProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadNotifications();
    loadSettings();
    
    // Polling para novas notificações a cada 30 segundos
    const interval = setInterval(loadNotifications, 30000);
    
    // Event listener para notificações em tempo real
    const handleNewNotification = (event: CustomEvent) => {
      const newNotification = event.detail as Notification;
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Tocar som se habilitado
      if (settings?.soundEnabled && !isQuietHours()) {
        playNotificationSound();
      }
      
      // Mostrar toast para notificações urgentes
      if (newNotification.priority === "urgent") {
        toast({
          title: newNotification.title,
          description: newNotification.message,
          duration: 8000,
        });
      }
    };
    
    window.addEventListener('newNotification', handleNewNotification as EventListener);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('newNotification', handleNewNotification as EventListener);
    };
  }, [settings]);

  const loadNotifications = async () => {
    try {
      const response = await api.get(`/notifications/${user?.id}`);
      const notificationsList = response.data || getMockNotifications();
      
      setNotifications(notificationsList);
      setUnreadCount(notificationsList.filter((n: Notification) => !n.isRead).length);
    } catch (error) {
      console.error("Erro ao carregar notificações:", error);
      // Usar dados mock em caso de erro
      const mockNotifications = getMockNotifications();
      setNotifications(mockNotifications);
      setUnreadCount(mockNotifications.filter(n => !n.isRead).length);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await api.get(`/notification-settings/${user?.id}`);
      setSettings(response.data || getDefaultSettings());
    } catch (error) {
      setSettings(getDefaultSettings());
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Erro ao marcar como lida:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch(`/notifications/${user?.id}/read-all`);
      
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      
      toast({
        title: "Notificações marcadas como lidas",
        description: "Todas as notificações foram marcadas como lidas",
      });
    } catch (error) {
      console.error("Erro ao marcar todas como lidas:", error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      
      const notification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      if (!notification?.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Erro ao excluir notificação:", error);
    }
  };

  const updateSettings = async (newSettings: NotificationSettings) => {
    try {
      setIsLoading(true);
      await api.put(`/notification-settings/${user?.id}`, newSettings);
      setSettings(newSettings);
      
      toast({
        title: "Configurações salvas",
        description: "Suas preferências de notificação foram atualizadas",
      });
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationAction = async (notificationId: string, action: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification) return;

    try {
      switch (action) {
        case "view_evaluation":
          window.location.href = `/app/avaliacao/${notification.data?.evaluationId}`;
          break;
        case "start_correction":
          window.location.href = `/app/avaliacao/${notification.data?.evaluationId}/corrigir`;
          break;
        case "view_results":
          window.location.href = `/app/avaliacao/${notification.data?.evaluationId}/resultados`;
          break;
        case "dismiss":
          await markAsRead(notificationId);
          break;
        default:
          if (notification.data?.url) {
            window.location.href = notification.data.url;
          }
      }
    } catch (error) {
      console.error("Erro ao executar ação:", error);
    }
  };

  const isQuietHours = () => {
    if (!settings?.quietHours.enabled) return false;
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const start = parseInt(settings.quietHours.start.split(':')[0]) * 60 + parseInt(settings.quietHours.start.split(':')[1]);
    const end = parseInt(settings.quietHours.end.split(':')[0]) * 60 + parseInt(settings.quietHours.end.split(':')[1]);
    
    if (start < end) {
      return currentTime >= start && currentTime <= end;
    } else {
      return currentTime >= start || currentTime <= end;
    }
  };

  const playNotificationSound = () => {
    const audio = new Audio('/sounds/notification.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {
      // Ignorar erro se não conseguir tocar
    });
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    const icons = {
      evaluation_reminder: Calendar,
      evaluation_available: Bell,
      correction_pending: Clock,
      results_ready: CheckCircle,
      deadline_warning: AlertTriangle,
      system_announcement: Info,
    };
    
    return icons[type] || Bell;
  };

  const getPriorityColor = (priority: Notification["priority"]) => {
    const colors = {
      low: "text-gray-500",
      medium: "text-blue-500", 
      high: "text-orange-500",
      urgent: "text-red-500",
    };
    
    return colors[priority];
  };

  const formatNotificationTime = (dateString: string) => {
    const date = parseISO(dateString);
    
    if (isToday(date)) {
      return format(date, "HH:mm", { locale: ptBR });
    } else if (isYesterday(date)) {
      return "Ontem";
    } else if (differenceInHours(new Date(), date) < 72) {
      return format(date, "EEEE", { locale: ptBR });
    } else {
      return format(date, "dd/MM", { locale: ptBR });
    }
  };

  const getDefaultSettings = (): NotificationSettings => ({
    evaluationReminders: true,
    evaluationAvailable: true,
    correctionPending: true,
    resultsReady: true,
    deadlineWarnings: true,
    systemAnnouncements: true,
    emailNotifications: false,
    pushNotifications: true,
    soundEnabled: true,
    quietHours: {
      enabled: false,
      start: "22:00",
      end: "08:00"
    }
  });

  const getMockNotifications = (): Notification[] => [
    {
      id: "1",
      type: "evaluation_available",
      title: "Nova avaliação disponível",
      message: "A avaliação de Matemática está disponível para seus alunos",
      data: {
        evaluationId: "eval-1",
        evaluationTitle: "Prova de Matemática - 2º Bimestre",
        studentCount: 28
      },
      isRead: false,
      priority: "high",
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      actions: [
        { label: "Ver avaliação", action: "view_evaluation" },
        { label: "Dispensar", action: "dismiss", variant: "outline" }
      ]
    },
    {
      id: "2", 
      type: "correction_pending",
      title: "Correções pendentes",
      message: "15 avaliações aguardam correção",
      data: {
        evaluationId: "eval-2",
        studentCount: 15
      },
      isRead: false,
      priority: "medium",
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      actions: [
        { label: "Iniciar correção", action: "start_correction" },
        { label: "Mais tarde", action: "dismiss", variant: "outline" }
      ]
    },
    {
      id: "3",
      type: "results_ready", 
      title: "Resultados prontos",
      message: "Os resultados da avaliação de Português estão disponíveis",
      data: {
        evaluationId: "eval-3",
        evaluationTitle: "Simulado de Português"
      },
      isRead: true,
      priority: "low",
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      actions: [
        { label: "Ver resultados", action: "view_results" }
      ]
    }
  ];

  const visibleNotifications = notifications.slice(0, maxVisible);

  return (
    <>
      {/* Notification Bell */}
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {showBadge && unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs p-0"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Notifications Panel */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Notificações</span>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowSettings(true)}
                >
                  <Settings className="h-4 w-4" />
                </Button>
                {unreadCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={markAllAsRead}
                  >
                    Marcar todas como lidas
                  </Button>
                )}
              </div>
            </DialogTitle>
            <DialogDescription>
              {unreadCount > 0 
                ? `Você tem ${unreadCount} notificação${unreadCount > 1 ? 'ões' : ''} não lida${unreadCount > 1 ? 's' : ''}`
                : "Você está em dia com suas notificações"
              }
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-2">
            {visibleNotifications.length > 0 ? (
              visibleNotifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                
                return (
                  <Card 
                    key={notification.id} 
                    className={`transition-all cursor-pointer ${
                      notification.isRead ? 'opacity-60' : 'bg-blue-50 border-blue-200'
                    }`}
                    onClick={() => !notification.isRead && markAsRead(notification.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Icon className={`h-5 w-5 mt-0.5 ${getPriorityColor(notification.priority)}`} />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium text-sm truncate">
                              {notification.title}
                            </h4>
                            <div className="flex items-center gap-1 ml-2">
                              <span className="text-xs text-muted-foreground">
                                {formatNotificationTime(notification.createdAt)}
                              </span>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {!notification.isRead && (
                                    <DropdownMenuItem onClick={() => markAsRead(notification.id)}>
                                      <Check className="h-4 w-4 mr-2" />
                                      Marcar como lida
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem 
                                    onClick={() => deleteNotification(notification.id)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2">
                            {notification.message}
                          </p>
                          
                          {notification.actions && notification.actions.length > 0 && (
                            <div className="flex gap-2">
                              {notification.actions.map((action, index) => (
                                <Button
                                  key={index}
                                  variant={action.variant || "default"}
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleNotificationAction(notification.id, action.action);
                                  }}
                                >
                                  {action.label}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="text-center py-8">
                <BellOff className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">Nenhuma notificação</p>
              </div>
            )}
            
            {notifications.length > maxVisible && (
              <Button variant="outline" className="w-full" onClick={() => {/* Ver todas */}}>
                Ver todas as notificações ({notifications.length})
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Configurações de Notificação</DialogTitle>
            <DialogDescription>
              Personalize como você recebe notificações sobre avaliações
            </DialogDescription>
          </DialogHeader>

          {settings && (
            <div className="space-y-6">
              {/* Tipos de notificação */}
              <div className="space-y-4">
                <h4 className="font-medium">Tipos de notificação</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="eval-reminders">Lembretes de avaliação</Label>
                    <Switch
                      id="eval-reminders"
                      checked={settings.evaluationReminders}
                      onCheckedChange={(checked) => 
                        setSettings({...settings, evaluationReminders: checked})
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="eval-available">Avaliações disponíveis</Label>
                    <Switch
                      id="eval-available"
                      checked={settings.evaluationAvailable}
                      onCheckedChange={(checked) => 
                        setSettings({...settings, evaluationAvailable: checked})
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="correction-pending">Correções pendentes</Label>
                    <Switch
                      id="correction-pending"
                      checked={settings.correctionPending}
                      onCheckedChange={(checked) => 
                        setSettings({...settings, correctionPending: checked})
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="results-ready">Resultados prontos</Label>
                    <Switch
                      id="results-ready"
                      checked={settings.resultsReady}
                      onCheckedChange={(checked) => 
                        setSettings({...settings, resultsReady: checked})
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Métodos de entrega */}
              <div className="space-y-4">
                <h4 className="font-medium">Métodos de entrega</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="push-notifications">Notificações push</Label>
                    <Switch
                      id="push-notifications"
                      checked={settings.pushNotifications}
                      onCheckedChange={(checked) => 
                        setSettings({...settings, pushNotifications: checked})
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-notifications">Notificações por email</Label>
                    <Switch
                      id="email-notifications"
                      checked={settings.emailNotifications}
                      onCheckedChange={(checked) => 
                        setSettings({...settings, emailNotifications: checked})
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sound-enabled">Som</Label>
                    <Switch
                      id="sound-enabled"
                      checked={settings.soundEnabled}
                      onCheckedChange={(checked) => 
                        setSettings({...settings, soundEnabled: checked})
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowSettings(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={() => updateSettings(settings)}
                  disabled={isLoading}
                >
                  Salvar configurações
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
} 