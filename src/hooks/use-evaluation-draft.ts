import { useState, useCallback } from "react";
import { EvaluationFormData } from "@/components/evaluations/types";

interface DraftData {
  data: EvaluationFormData | null;
  step: number;
  timestamp: number;
  version: string;
}

const DRAFT_KEY = "evaluation_draft";
const DRAFT_VERSION = "1.0.0";
const DRAFT_EXPIRY_DAYS = 7; // Rascunhos expiram em 7 dias

export function useEvaluationDraft() {
  const [currentDraft, setCurrentDraft] = useState<DraftData | null>(null);

  const saveDraft = useCallback((data: EvaluationFormData, step: number) => {
    try {
      const draft: DraftData = {
        data,
        step,
        timestamp: Date.now(),
        version: DRAFT_VERSION
      };
      
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setCurrentDraft(draft);
      
      return true;
    } catch (error) {
      console.error("Erro ao salvar rascunho:", error);
      return false;
    }
  }, []);

  const loadDraft = useCallback((): DraftData => {
    try {
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      if (!savedDraft) {
        return { data: null, step: 1, timestamp: 0, version: DRAFT_VERSION };
      }

      const draft: DraftData = JSON.parse(savedDraft);
      
      // Verificar versão
      if (draft.version !== DRAFT_VERSION) {
        console.warn("Versão do rascunho incompatível, descartando...");
        clearDraft();
        return { data: null, step: 1, timestamp: 0, version: DRAFT_VERSION };
      }

      // Verificar expiração
      const daysSinceCreation = (Date.now() - draft.timestamp) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation > DRAFT_EXPIRY_DAYS) {
        console.warn("Rascunho expirado, descartando...");
        clearDraft();
        return { data: null, step: 1, timestamp: 0, version: DRAFT_VERSION };
      }

      setCurrentDraft(draft);
      return draft;
    } catch (error) {
      console.error("Erro ao carregar rascunho:", error);
      clearDraft();
      return { data: null, step: 1, timestamp: 0, version: DRAFT_VERSION };
    }
  }, []);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_KEY);
      setCurrentDraft(null);
      return true;
    } catch (error) {
      console.error("Erro ao limpar rascunho:", error);
      return false;
    }
  }, []);

  const hasDraft = useCallback((): boolean => {
    const draft = loadDraft();
    return draft.data !== null;
  }, [loadDraft]);

  const getDraftAge = useCallback((): number => {
    const draft = loadDraft();
    if (!draft.timestamp) return 0;
    
    return Math.floor((Date.now() - draft.timestamp) / (1000 * 60 * 60 * 24));
  }, [loadDraft]);

  const updateDraftStep = useCallback((step: number) => {
    if (currentDraft && currentDraft.data) {
      saveDraft(currentDraft.data, step);
    }
  }, [currentDraft, saveDraft]);

  return {
    saveDraft,
    loadDraft,
    clearDraft,
    hasDraft,
    getDraftAge,
    updateDraftStep,
    currentDraft
  };
} 