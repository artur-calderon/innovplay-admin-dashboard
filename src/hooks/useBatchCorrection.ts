import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

export interface BatchCorrectionItem {
  status: 'pending' | 'processing' | 'done' | 'error';
  student_name?: string;
  correct?: number;
  total?: number;
  percentage?: number;
  error?: string;
}

export interface BatchCorrectionProgress {
  job_id: string;
  total: number;
  completed: number;
  successful: number;
  failed: number;
  status: 'processing' | 'completed' | 'error';
  percentage: number;
  items: Record<string, BatchCorrectionItem>;
  results?: any[];
}

export interface BatchCorrectionState {
  // Estado do job
  jobId: string | null;
  isProcessing: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  
  // Progresso
  progress: BatchCorrectionProgress | null;
  
  // Imagens selecionadas
  selectedImages: string[];
  
  // Erro
  error: string | null;
}

export function useBatchCorrection() {
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [state, setState] = useState<BatchCorrectionState>({
    jobId: null,
    isProcessing: false,
    isCompleted: false,
    isFailed: false,
    progress: null,
    selectedImages: [],
    error: null,
  });

  // Adicionar imagens (base64)
  const addImages = useCallback((images: string[]) => {
    setState(prev => {
      const newImages = [...prev.selectedImages, ...images];
      // Limitar a 50 imagens por lote
      const limitedImages = newImages.slice(0, 50);
      
      if (newImages.length > 50) {
        toast({
          title: "Limite de imagens excedido",
          description: "Máximo de 50 imagens por lote. Apenas as primeiras 50 foram selecionadas.",
          variant: "destructive",
        });
      }
      
      return {
        ...prev,
        selectedImages: limitedImages,
      };
    });
  }, [toast]);

  // Remover imagem
  const removeImage = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      selectedImages: prev.selectedImages.filter((_, i) => i !== index),
    }));
  }, []);

  // Limpar imagens
  const clearImages = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedImages: [],
    }));
  }, []);

  // Iniciar correção em lote
  const startBatchCorrection = useCallback(async (testId: string, images?: string[]) => {
    const imagesToProcess = images || state.selectedImages;
    
    if (imagesToProcess.length === 0) {
      toast({
        title: "Nenhuma imagem selecionada",
        description: "Selecione pelo menos uma imagem para processar.",
        variant: "destructive",
      });
      return null;
    }

    try {
      setState(prev => ({
        ...prev,
        isProcessing: true,
        isCompleted: false,
        isFailed: false,
        error: null,
        progress: null,
      }));

      // Enviar imagens para processamento em lote
      const response = await api.post(`/physical-tests/test/${testId}/process-correction`, {
        images: imagesToProcess
      });

      // Verificar se retornou job_id (processamento assíncrono)
      if (response.data.job_id) {
        const jobId = response.data.job_id;
        
        setState(prev => ({
          ...prev,
          jobId,
          progress: {
            job_id: jobId,
            total: response.data.total,
            completed: 0,
            successful: 0,
            failed: 0,
            percentage: 0,
            status: 'processing',
            items: {},
          },
        }));

        return jobId;
      } else {
        // Resposta síncrona (correção única) - não deveria acontecer para múltiplas imagens
        setState(prev => ({
          ...prev,
          isProcessing: false,
          isCompleted: true,
        }));
        
        toast({
          title: "Correção processada!",
          description: "A correção foi realizada com sucesso.",
        });
        
        return null;
      }
    } catch (error: any) {
      console.error("Erro ao iniciar correção em lote:", error);
      
      const errorMessage = error.response?.data?.error || error.message || "Não foi possível iniciar a correção em lote.";
      
      setState(prev => ({
        ...prev,
        isProcessing: false,
        isFailed: true,
        error: errorMessage,
      }));
      
      toast({
        title: "Erro ao iniciar correção",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw error;
    }
  }, [state.selectedImages, toast]);

  // Polling de progresso
  useEffect(() => {
    if (!state.jobId || !state.isProcessing) return;

    const pollProgress = async () => {
      try {
        const response = await api.get(`/physical-tests/correction-progress/${state.jobId}`);
        const progressData: BatchCorrectionProgress = response.data;
        
        setState(prev => ({
          ...prev,
          progress: progressData,
        }));

        // Verificar se completou
        if (progressData.status === 'completed') {
          setState(prev => ({
            ...prev,
            isProcessing: false,
            isCompleted: true,
          }));

          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }

          toast({
            title: "Correção concluída!",
            description: `${progressData.successful} correções bem-sucedidas${progressData.failed > 0 ? `, ${progressData.failed} falhas` : ''}.`,
          });
        } else if (progressData.status === 'error') {
          setState(prev => ({
            ...prev,
            isProcessing: false,
            isFailed: true,
            error: 'Erro durante o processamento',
          }));

          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      } catch (error) {
        console.error('Erro ao buscar progresso:', error);
      }
    };

    // Primeira consulta imediata
    pollProgress();

    // Polling a cada 1.5 segundos
    intervalRef.current = setInterval(pollProgress, 1500);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.jobId, state.isProcessing, toast]);

  // Reset completo
  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setState({
      jobId: null,
      isProcessing: false,
      isCompleted: false,
      isFailed: false,
      progress: null,
      selectedImages: [],
      error: null,
    });
  }, []);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    // Estado
    jobId: state.jobId,
    isProcessing: state.isProcessing,
    isCompleted: state.isCompleted,
    isFailed: state.isFailed,
    progress: state.progress,
    selectedImages: state.selectedImages,
    error: state.error,
    
    // Ações
    addImages,
    removeImage,
    clearImages,
    startBatchCorrection,
    reset,
  };
}
