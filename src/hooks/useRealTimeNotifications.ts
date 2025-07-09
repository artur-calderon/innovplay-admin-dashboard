import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  type: 'new_evaluation' | 'evaluation_updated' | 'result_available';
  title: string;
  message: string;
  timestamp: string;
  data?: any;
}

export const useRealTimeNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // ✅ IMPLEMENTAÇÃO: Polling para simular notificações em tempo real
    const checkForNotifications = async () => {
      try {
        // TODO: Verificar notificações quando o backend estiver disponível
        // const response = await fetch('http://localhost:5000/notifications/check', {
        //   method: 'GET',
        //   headers: {
        //     'Authorization': `Bearer ${localStorage.getItem('token')}`,
        //     'Content-Type': 'application/json'
        //   }
        // });
        
        // if (response.ok) {
        //   const newNotifications = await response.json();
        //   
        //   if (newNotifications.length > 0) {
        //     setNotifications(prev => [...prev, ...newNotifications]);
        //     
        //     // Mostrar toast para cada nova notificação
        //     newNotifications.forEach((notification: Notification) => {
        //       toast({
        //         title: notification.title,
        //         description: notification.message,
        //         duration: 5000,
        //       });
        //     });
        //   }
        // }
        
        // Por enquanto, simular que está conectado mas sem notificações
        setIsConnected(true);
      } catch (error) {
        console.log('📡 Erro ao verificar notificações:', error);
        setIsConnected(false);
      }
    };

    // ✅ FALLBACK: Usar polling enquanto WebSocket não estiver implementado
    const interval = setInterval(checkForNotifications, 30000); // 30 segundos
    
    // Verificar imediatamente
    checkForNotifications();

    // ✅ FUTURO: Implementar WebSocket real
    // const ws = new WebSocket('ws://localhost:8000/ws/notifications');
    // ws.onopen = () => setIsConnected(true);
    // ws.onmessage = (event) => {
    //   const notification = JSON.parse(event.data);
    //   setNotifications(prev => [...prev, notification]);
    //   toast({
    //     title: notification.title,
    //     description: notification.message,
    //   });
    // };
    // ws.onclose = () => setIsConnected(false);

    return () => {
      clearInterval(interval);
      // ws?.close();
    };
  }, [toast]);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId 
          ? { ...n, read: true } 
          : n
      )
    );
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return {
    notifications,
    isConnected,
    markAsRead,
    clearNotifications,
    unreadCount: notifications.filter(n => !n.read).length
  };
};