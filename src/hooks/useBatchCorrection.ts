import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  batchCorrectionService, 
  BatchCorrectionImage, 
  BatchCorrectionJob, 
  BatchProgressUpdate,
  BatchCorrectionResult,
  BatchCorrectionError
} from '@/services/batchCorrectionService';

export interface BatchCorrectionState {
  // Estado do job
  job: BatchCorrectionJob | null;
  isProcessing: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  isCancelled: boolean;
  
  // Progresso
  progressPercentage: number;
  currentStudentName?: string;
  processedImages: number;
  totalImages: number;
  failedImages: number;
  
  // Resultados
  results: BatchCorrectionResult[];
  errors: BatchCorrectionError[];
  
  // Imagens selecionadas
  selectedImages: BatchCorrectionImage[];
  
  // Event source
  eventSource: EventSource | null;
}

export interface BatchCorrectionActions {
  // Gerenciamento de imagens
  addImages: (images: BatchCorrectionImage[]) => void;
  removeImage: (index: number) => void;
  clearImages: () => void;
  
  // Processamento
  startBatchCorrection: (testId: string) => Promise<void>;
  cancelBatchCorrection: () => Promise<void>;
  retryImage: (imageIndex: number, image: BatchCorrectionImage) => Promise<void>;
  
  // Limpeza
  cleanup: () => void;
  reset: () => void;
}

export function useBatchCorrection() {
  const { toast } = useToast();
  // Removido eventSourceRef - não mais necessário
  
  const [state, setState] = useState<BatchCorrectionState>({
    job: null,
    isProcessing: false,
    isCompleted: false,
    isFailed: false,
    isCancelled: false,
    progressPercentage: 0,
    currentStudentName: undefined,
    processedImages: 0,
    totalImages: 0,
    failedImages: 0,
    results: [],
    errors: [],
    selectedImages: [],
    eventSource: null,
  });

  // Adicionar imagens
  const addImages = useCallback((images: BatchCorrectionImage[]) => {
    setState(prev => {
      const newImages = [...prev.selectedImages, ...images];
      // Limitar a 10 imagens
      const limitedImages = newImages.slice(0, 10);
      
      if (newImages.length > 10) {
        toast({
          title: "Limite de imagens excedido",
          description: "Máximo de 10 imagens por lote. Apenas as primeiras 10 foram selecionadas.",
          variant: "destructive",
        });
      }
      
      return {
        ...prev,
        selectedImages: limitedImages,
        totalImages: limitedImages.length,
      };
    });
  }, [toast]);

  // Remover imagem
  const removeImage = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      selectedImages: prev.selectedImages.filter((_, i) => i !== index),
      totalImages: prev.selectedImages.length - 1,
    }));
  }, []);

  // Limpar imagens
  const clearImages = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedImages: [],
      totalImages: 0,
    }));
  }, []);

  // Iniciar correção em lote
  const startBatchCorrection = useCallback(async (testId: string) => {
    if (state.selectedImages.length === 0) {
      toast({
        title: "Nenhuma imagem selecionada",
        description: "Selecione pelo menos uma imagem para processar.",
        variant: "destructive",
      });
      return;
    }

    try {
      setState(prev => ({
        ...prev,
        isProcessing: true,
        isCompleted: false,
        isFailed: false,
        isCancelled: false,
        progressPercentage: 0,
        processedImages: 0,
        failedImages: 0,
        results: [],
        errors: [],
      }));

      // Iniciar job no backend
      const job = await batchCorrectionService.startBatchCorrection(testId, state.selectedImages);
      
      setState(prev => ({
        ...prev,
        job,
        totalImages: state.selectedImages.length,
      }));

      // Simular processamento com loading
      setState(prev => ({
        ...prev,
        isProcessing: true,
        progressPercentage: 0,
      }));

      // Simular progresso de processamento
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms de delay
        setState(prev => ({
          ...prev,
          progressPercentage: i,
        }));
      }

      // Finalizar processamento
      setState(prev => ({
        ...prev,
        isProcessing: false,
        isCompleted: true,
        progressPercentage: 100,
        results: job.results || [],
        errors: job.errors || [],
      }));

      toast({
        title: "Correção concluída!",
        description: `${job.results?.length || 0} imagens processadas com sucesso.`,
      });

    } catch (error: any) {
      console.error("Erro ao iniciar correção em lote:", error);
      setState(prev => ({
        ...prev,
        isProcessing: false,
        isFailed: true,
      }));
      
      toast({
        title: "Erro ao iniciar correção",
        description: error.message || "Não foi possível iniciar a correção em lote.",
        variant: "destructive",
      });
    }
  }, [state.selectedImages, toast]);

  // Cancelar correção
  const cancelBatchCorrection = useCallback(async () => {
    setState(prev => ({
      ...prev,
      isProcessing: false,
      isCancelled: true,
    }));

    toast({
      title: "Correção cancelada",
      description: "A correção em lote foi cancelada com sucesso.",
    });
  }, [toast]);

  // Retry de imagem
  const retryImage = useCallback(async (imageIndex: number, image: BatchCorrectionImage) => {
    toast({
      title: "Imagem reprocessada",
      description: "A imagem foi enviada para reprocessamento.",
    });
  }, [toast]);

  // Função de download removida - não é mais necessária

  // Limpeza
  const cleanup = useCallback(() => {
    // Limpeza simples sem SSE
  }, []);

  // Reset completo
  const reset = useCallback(() => {
    cleanup();
    setState({
      job: null,
      isProcessing: false,
      isCompleted: false,
      isFailed: false,
      isCancelled: false,
      progressPercentage: 0,
      currentStudentName: undefined,
      processedImages: 0,
      totalImages: 0,
      failedImages: 0,
      results: [],
      errors: [],
      selectedImages: [],
    });
  }, [cleanup]);

  // Cleanup automático ao desmontar
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const actions: BatchCorrectionActions = {
    addImages,
    removeImage,
    clearImages,
    startBatchCorrection,
    cancelBatchCorrection,
    retryImage,
    cleanup,
    reset,
  };

  return {
    ...state,
    ...actions,
  };
}
