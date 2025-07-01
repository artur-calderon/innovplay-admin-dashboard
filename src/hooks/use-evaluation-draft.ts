import { useState, useEffect, useCallback } from 'react';
import { EvaluationFormData } from '@/components/evaluations/types';

const DRAFT_KEY = 'evaluation_draft';
const DRAFT_EXPIRY_DAYS = 7; // Rascunhos expiram em 7 dias

interface DraftData {
  data: EvaluationFormData;
  timestamp: number;
  step: number;
}

export const useEvaluationDraft = () => {
  const [hasDraft, setHasDraft] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar se existe rascunho válido
  useEffect(() => {
    const checkDraft = () => {
      try {
        const draft = localStorage.getItem(DRAFT_KEY);
        if (draft) {
          const draftData: DraftData = JSON.parse(draft);
          const now = Date.now();
          const expiryTime = draftData.timestamp + (DRAFT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
          
          if (now < expiryTime) {
            setHasDraft(true);
          } else {
            // Remove rascunho expirado
            localStorage.removeItem(DRAFT_KEY);
            setHasDraft(false);
          }
        }
      } catch (error) {
        console.error('Erro ao verificar rascunho:', error);
        localStorage.removeItem(DRAFT_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    checkDraft();
  }, []);

  // Salvar rascunho
  const saveDraft = useCallback((data: EvaluationFormData, step: number) => {
    try {
      const draftData: DraftData = {
        data,
        timestamp: Date.now(),
        step
      };
      
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
      setHasDraft(true);
    } catch (error) {
      console.error('Erro ao salvar rascunho:', error);
    }
  }, []);

  // Carregar rascunho
  const loadDraft = useCallback((): { data: EvaluationFormData; step: number } | null => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        const draftData: DraftData = JSON.parse(draft);
        return {
          data: draftData.data,
          step: draftData.step
        };
      }
    } catch (error) {
      console.error('Erro ao carregar rascunho:', error);
    }
    return null;
  }, []);

  // Remover rascunho
  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
    setHasDraft(false);
  }, []);

  // Obter informações do rascunho
  const getDraftInfo = useCallback(() => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        const draftData: DraftData = JSON.parse(draft);
        return {
          title: draftData.data.title || 'Avaliação sem título',
          timestamp: draftData.timestamp,
          step: draftData.step
        };
      }
    } catch (error) {
      console.error('Erro ao obter informações do rascunho:', error);
    }
    return null;
  }, []);

  return {
    hasDraft,
    isLoading,
    saveDraft,
    loadDraft,
    clearDraft,
    getDraftInfo
  };
}; 