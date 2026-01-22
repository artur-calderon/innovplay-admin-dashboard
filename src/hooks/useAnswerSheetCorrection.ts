import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

export interface AnswerSheetCorrectionItem {
  status: 'pending' | 'processing' | 'done' | 'error';
  student_name?: string;
  student_id?: string;
  correct?: number;
  total?: number;
  percentage?: number;
  grade?: number;
  error?: string;
}

export interface AnswerSheetCorrectionProgress {
  job_id: string;
  total: number;
  completed: number;
  successful: number;
  failed: number;
  status: 'processing' | 'completed' | 'error';
  percentage: number;
  items: Record<string, AnswerSheetCorrectionItem>;
  results?: any[];
}

export interface AnswerSheetCorrectionState {
  // Estado do job
  jobId: string | null;
  isProcessing: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  
  // Progresso
  progress: AnswerSheetCorrectionProgress | null;
  
  // Imagens selecionadas
  selectedImages: string[];
  
  // Erro
  error: string | null;
}

export function useAnswerSheetCorrection() {
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [state, setState] = useState<AnswerSheetCorrectionState>({
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
      // Limitar a 10 imagens por lote (pode ser ajustado)
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

  // Iniciar correção única (síncrona)
  // O backend identifica o gabarito automaticamente pelo QR code na imagem
  const startSingleCorrection = useCallback(async (image: string) => {
    try {
      setState(prev => ({
        ...prev,
        isProcessing: true,
        isCompleted: false,
        isFailed: false,
        error: null,
      }));

      // NOVA ROTA - POST /answer-sheets/correct-new
      // Usa o NOVO pipeline robusto
      // Suporta alternativas variáveis
      // Validação rigorosa
      // Grid matemático baseado no JSON
      const response = await api.post('/answer-sheets/correct-new', {
        image: image
      });

      // Resposta síncrona - resultado imediato
      setState(prev => ({
        ...prev,
        isProcessing: false,
        isCompleted: true,
      }));

      toast({
        title: "Correção processada!",
        description: `Aluno: ${response.data.student_name || 'N/A'}. Acertos: ${response.data.correct}/${response.data.total} (${response.data.percentage?.toFixed(1)}%)`,
      });

      return response.data;
    } catch (error: any) {
      console.error("Erro ao processar correção única:", error);
      
      const errorMessage = error.response?.data?.error || error.message || "Não foi possível processar a correção.";
      
      setState(prev => ({
        ...prev,
        isProcessing: false,
        isFailed: true,
        error: errorMessage,
      }));

      toast({
        title: "Erro ao processar correção",
        description: errorMessage,
        variant: "destructive",
      });

      throw error;
    }
  }, [toast]);

  // Iniciar correção em lote (assíncrona)
  // O backend identifica o gabarito automaticamente pelo QR code nas imagens
  const startBatchCorrection = useCallback(async (images?: string[]) => {
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
      // O backend identifica o gabarito automaticamente pelo QR code
      const response = await api.post('/answer-sheets/correct', {
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
            total: response.data.total || imagesToProcess.length,
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
        // Resposta síncrona (não deveria acontecer para múltiplas imagens)
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
        const response = await api.get(`/answer-sheets/correction-progress/${state.jobId}`);
        const progressData: AnswerSheetCorrectionProgress = response.data;
        
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
    startSingleCorrection,
    startBatchCorrection,
    reset,
  };
}

