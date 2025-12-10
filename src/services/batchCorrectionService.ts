import { api } from "@/lib/api";

export interface BatchCorrectionImage {
  image: string; // base64
  studentName?: string;
  studentId?: string;
}

export interface BatchCorrectionJob {
  job_id: string;
  test_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  total_images: number;
  processed_images: number;
  failed_images: number;
  progress_percentage: number;
  current_student_name?: string;
  started_at: string;
  completed_at?: string;
  estimated_completion?: string;
  results?: BatchCorrectionResult[];
  errors?: BatchCorrectionError[];
}

export interface BatchCorrectionResult {
  student_id: string;
  student_name: string;
  image_index?: number;
  correct_answers: number;
  total_questions: number;
  score_percentage: number;
  grade: number;
  proficiency: number;
  classification: string;
  answers_detected: number;
  qr_data?: {
    student_id: string;
    test_id: string;
    class_test_id: string;
    timestamp: string;
  };
}

export interface BatchCorrectionError {
  image_index: number;
  student_name?: string;
  error_message: string;
  retry_count: number;
}

export interface BatchProgressUpdate {
  type: 'connected' | 'progress' | 'completed' | 'error' | 'cancelled';
  job_id: string;
  data: {
    status: string;
    total_images?: number;
    processed_images?: number;
    successful_corrections?: number;
    failed_corrections?: number;
    current_student_name?: string;
    progress_percentage?: number;
    summary?: {
      total_images: number;
      successful_corrections: number;
      failed_corrections: number;
      success_rate: number;
    };
    results?: BatchCorrectionResult[];
    errors?: BatchCorrectionError[];
  };
}

class BatchCorrectionService {
  private eventSources: Map<string, EventSource> = new Map();

  /**
   * Iniciar correção em lote
   */
  async startBatchCorrection(testId: string, images: BatchCorrectionImage[]): Promise<BatchCorrectionJob> {
    try {
      const response = await api.post(`/physical-tests/test/${testId}/batch-process-correction`, {
        images: images
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Usar processamento individual como fallback (mais simples e funcional)
      console.log("Usando processamento individual como fallback");
      return this.fallbackToIndividualProcessing(testId, images);
    } catch (error: any) {
      console.error("Erro ao iniciar correção em lote:", error);
      
      // Se a rota de lote não existir (404), usar processamento individual como fallback
      if (error.response?.status === 404) {
        console.warn("Rota de correção em lote não encontrada, usando processamento individual como fallback");
        return this.fallbackToIndividualProcessing(testId, images);
      }
      
      throw new Error(error.response?.data?.error || "Erro ao iniciar correção em lote");
    }
  }

  /**
   * Fallback para processamento individual quando lote não estiver disponível
   */
  private async fallbackToIndividualProcessing(testId: string, images: BatchCorrectionImage[]): Promise<BatchCorrectionJob> {
    const jobId = `fallback-${Date.now()}`;
    
    // Simular job de lote com processamento individual
    const job: BatchCorrectionJob = {
      job_id: jobId,
      test_id: testId,
      status: 'processing',
      total_images: images.length,
      processed_images: 0,
      failed_images: 0,
      progress_percentage: 0,
      started_at: new Date().toISOString(),
      results: [],
      errors: []
    };

    // Função auxiliar para formatar mensagens de erro da correção
    const formatCorrectionError = (error: any): string => {
      const errorData = error.response?.data;
      
      if (!errorData) {
        return "Erro desconhecido na correção";
      }

      // Extrair mensagem de erro
      const errorMessage = errorData.error || "Erro desconhecido na correção";
      
      // Adicionar informação do sistema se disponível
      const system = errorData.system;
      if (system) {
        const systemLabels: Record<string, string> = {
          ai: "Sistema de IA",
          old: "Sistema Antigo",
          new_orm: "Sistema OMR"
        };
        return `${errorMessage} (${systemLabels[system] || system})`;
      }

      return errorMessage;
    };

    // Processar imagens individualmente
    for (let i = 0; i < images.length; i++) {
      try {
        const response = await api.post(`/physical-tests/test/${testId}/process-correction`, {
          image: images[i].image
        }, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        job.results!.push({
          student_id: images[i].studentId || `student-${i}`,
          student_name: images[i].studentName || `Aluno ${i + 1}`,
          image_index: i,
          correct_answers: response.data.correct_answers,
          total_questions: response.data.total_questions,
          score_percentage: response.data.score_percentage,
          grade: response.data.grade,
          proficiency: response.data.proficiency,
          classification: response.data.classification,
          answers_detected: response.data.answers_detected,
          qr_data: response.data.qr_data
        });

        job.processed_images++;
        job.progress_percentage = Math.round((job.processed_images / job.total_images) * 100);
        
      } catch (error: any) {
        const errorMessage = formatCorrectionError(error);
        job.errors!.push({
          image_index: i,
          student_name: images[i].studentName || `Aluno ${i + 1}`,
          error_message: errorMessage,
          retry_count: 0
        });
        job.failed_images++;
      }
    }

    job.status = 'completed';
    job.completed_at = new Date().toISOString();
    job.progress_percentage = 100;

    return job;
  }

  /**
   * Conectar ao stream SSE para receber atualizações de progresso
   */
  connectToProgressStream(jobId: string, onMessage: (data: BatchProgressUpdate) => void): EventSource {
    // EventSource precisa acessar diretamente o backend (não pode usar proxy do Vite)
    const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const eventSource = new EventSource(`${backendUrl}/physical-tests/batch-correction/stream/${jobId}`);
    
    eventSource.onmessage = (event) => {
      try {
        const data: BatchProgressUpdate = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error("Erro ao processar mensagem SSE:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("Erro na conexão SSE:", error);
    };

    this.eventSources.set(jobId, eventSource);
    return eventSource;
  }

  /**
   * Desconectar do stream SSE
   */
  disconnectFromProgressStream(jobId: string): void {
    const eventSource = this.eventSources.get(jobId);
    if (eventSource) {
      eventSource.close();
      this.eventSources.delete(jobId);
    }
  }

  /**
   * Obter status do job (polling)
   */
  async getJobStatus(jobId: string): Promise<BatchCorrectionJob> {
    try {
      const response = await api.get(`/physical-tests/batch-correction/status/${jobId}`);
      return response.data;
    } catch (error: any) {
      console.error("Erro ao obter status do job:", error);
      throw new Error(error.response?.data?.error || "Erro ao obter status do job");
    }
  }

  /**
   * Obter resultados finais do job
   */
  async getJobResults(jobId: string): Promise<BatchCorrectionJob> {
    try {
      const response = await api.get(`/physical-tests/batch-correction/results/${jobId}`);
      return response.data;
    } catch (error: any) {
      console.error("Erro ao obter resultados do job:", error);
      throw new Error(error.response?.data?.error || "Erro ao obter resultados do job");
    }
  }

  /**
   * Cancelar job
   */
  async cancelJob(jobId: string): Promise<void> {
    try {
      await api.post(`/physical-tests/batch-correction/cancel/${jobId}`);
    } catch (error: any) {
      console.error("Erro ao cancelar job:", error);
      throw new Error(error.response?.data?.error || "Erro ao cancelar job");
    }
  }

  /**
   * Fazer retry de uma imagem específica
   */
  async retryImage(jobId: string, imageIndex: number, image: BatchCorrectionImage): Promise<void> {
    try {
      await api.post(`/physical-tests/batch-correction/retry/${jobId}`, {
        image_index: imageIndex,
        image: image
      });
    } catch (error: any) {
      console.error("Erro ao fazer retry da imagem:", error);
      throw new Error(error.response?.data?.error || "Erro ao fazer retry da imagem");
    }
  }

  /**
   * Download de resultados consolidados
   */
  async downloadConsolidatedResults(jobId: string): Promise<Blob> {
    try {
      const response = await api.get(`/physical-tests/batch-correction/download/${jobId}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error: any) {
      console.error("Erro ao baixar resultados consolidados:", error);
      throw new Error(error.response?.data?.error || "Erro ao baixar resultados consolidados");
    }
  }

  /**
   * Limpar todos os event sources
   */
  cleanup(): void {
    this.eventSources.forEach((eventSource) => {
      eventSource.close();
    });
    this.eventSources.clear();
  }
}

export const batchCorrectionService = new BatchCorrectionService();
