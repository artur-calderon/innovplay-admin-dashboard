import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/authContext';

// Evento customizado para sincronizar entre componentes
const AVISOS_UPDATE_EVENT = 'avisos-update';

/**
 * Hook para gerenciar avisos não lidos
 * Persiste no localStorage os IDs dos avisos já visualizados
 */
export function useUnreadAvisos() {
  const { user } = useAuth();
  const [readAvisos, setReadAvisos] = useState<Set<string>>(new Set());
  const [updateTrigger, setUpdateTrigger] = useState(0);

  // Chave do localStorage específica para cada usuário
  const getStorageKey = () => `avisos_lidos_${user.id}`;

  // Carregar avisos lidos do localStorage
  useEffect(() => {
    if (!user.id) return;

    const loadReadAvisos = () => {
      try {
        const stored = localStorage.getItem(getStorageKey());
        if (stored) {
          const avisosArray = JSON.parse(stored) as string[];
          setReadAvisos(new Set(avisosArray));
        }
      } catch (error) {
        console.error('Erro ao carregar avisos lidos:', error);
      }
    };

    loadReadAvisos();
  }, [user.id, updateTrigger]);

  // Listener para sincronizar entre componentes
  useEffect(() => {
    const handleAvisosUpdate = () => {
      setUpdateTrigger(prev => prev + 1);
    };

    window.addEventListener(AVISOS_UPDATE_EVENT, handleAvisosUpdate);
    
    return () => {
      window.removeEventListener(AVISOS_UPDATE_EVENT, handleAvisosUpdate);
    };
  }, []);

  // Salvar avisos lidos no localStorage e notificar outros componentes
  const saveToLocalStorage = useCallback((avisos: Set<string>) => {
    if (!user.id) return;

    try {
      const avisosArray = Array.from(avisos);
      localStorage.setItem(getStorageKey(), JSON.stringify(avisosArray));
      
      // Disparar evento para sincronizar outros componentes
      window.dispatchEvent(new CustomEvent(AVISOS_UPDATE_EVENT));
    } catch (error) {
      console.error('Erro ao salvar avisos lidos:', error);
    }
  }, [user.id]);

  /**
   * Marca um aviso como lido
   */
  const markAsRead = useCallback((avisoId: string) => {
    setReadAvisos(prev => {
      const newSet = new Set(prev);
      newSet.add(avisoId);
      saveToLocalStorage(newSet);
      return newSet;
    });
  }, [saveToLocalStorage]);

  /**
   * Marca múltiplos avisos como lidos
   */
  const markMultipleAsRead = useCallback((avisoIds: string[]) => {
    setReadAvisos(prev => {
      const newSet = new Set(prev);
      avisoIds.forEach(id => newSet.add(id));
      saveToLocalStorage(newSet);
      return newSet;
    });
  }, [saveToLocalStorage]);

  /**
   * Verifica se um aviso específico foi lido
   */
  const isAvisoRead = useCallback((avisoId: string): boolean => {
    return readAvisos.has(avisoId);
  }, [readAvisos]);

  /**
   * Calcula quantos avisos não foram lidos de uma lista
   */
  const getUnreadCount = useCallback((avisoIds: string[]): number => {
    return avisoIds.filter(id => !readAvisos.has(id)).length;
  }, [readAvisos]);

  /**
   * Limpa todos os avisos lidos (útil para debugging ou reset)
   */
  const clearAllRead = useCallback(() => {
    setReadAvisos(new Set());
    if (user.id) {
      localStorage.removeItem(getStorageKey());
    }
  }, [user.id]);

  /**
   * Marca todos os avisos de uma lista como lidos
   */
  const markAllAsRead = useCallback((avisoIds: string[]) => {
    markMultipleAsRead(avisoIds);
  }, [markMultipleAsRead]);

  return {
    markAsRead,
    markMultipleAsRead,
    isAvisoRead,
    getUnreadCount,
    clearAllRead,
    markAllAsRead,
    readAvisos: Array.from(readAvisos),
  };
}

