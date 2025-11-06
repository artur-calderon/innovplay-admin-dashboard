import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Play,
  Clock,
  CheckCircle,
  AlertCircle,
  BookOpen,
  Calendar,
  Users,
  FileText,
  Timer,
  RefreshCw,
  Trophy,
  Target,
  Zap,
  Info
} from "lucide-react";
import { useAuth } from "@/context/authContext";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { EvaluationApiService } from "@/services/evaluationApi";

import { format, isAfter, isBefore, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "./results/constants";

interface DetailedAnswer {
  question_id: string;
  question_number: number;
  question_text: string;
  question_type: string;
  question_value: number;
  student_answer: string | null;
  answered_at: string | null;
  is_correct: boolean | null;
  score: number | null;
  feedback: string | null;
  corrected_by: string | null;
  corrected_at: string | null;
  manual_score?: number;
  status?: string;
}

interface DetailedResults {
  test_id: string;
  student_id: string;
  total_questions: number;
  answered_questions: number;
  correct_answers: number;
  score_percentage: number;
  total_score: number;
  max_possible_score: number;
  answers: DetailedAnswer[] | null;
}

// ✅ NOVO: Interfaces atualizadas para os novos campos
interface Availability {
  is_available: boolean;
  status: "available" | "not_available" | "not_yet_available" | "expired" | "completed" | "not_started";
}

interface StudentStatus {
  has_completed: boolean;
  status: "nao_iniciada" | "em_andamento" | "finalizada" | "expirada" | "corrigida" | "revisada";
  can_start: boolean;
  score?: number;
  grade?: number;
}

interface StudentEvaluation {
  id: string;
  title: string;
  description: string;
  subject: { id: string; name: string }; // Subject principal (compatibilidade)
  subjects: { id: string; name: string }[]; // Lista completa de subjects
  subjects_info: { id: string; name: string }[]; // Lista de disciplinas com id e name
  grade: { id: string; name: string };
  course: { id: string; name: string };
  startDateTime: string;
  endDateTime?: string;
  duration: number; // em minutos
  totalQuestions: number;
  maxScore: number;
  type: string;
  model: string;
  // ✅ NOVO: Campos atualizados
  availability: Availability;
  student_status: StudentStatus;
  detailedResults?: DetailedResults; // Resultados detalhados com respostas
}

interface EvaluationTaking {
  evaluationId: string;
  currentQuestion: number;
  answers: { [questionId: string]: string | string[] };
  timeRemaining: number;
  startedAt: string;
}

interface StudentClass {
  id: string;
  name: string;
  school_id: string;
  grade_id: string;
  school: {
    id: string;
    name: string;
    domain: string;
    address: string;
    city_id: string;
  };
  grade: {
    id: string;
    name: string;
  };
  student: {
    id: string;
    name: string;
    registration: string;
    birth_date: string;
    user_id: string;
  };
  applied_tests: {
    total: number;
    test_ids: string[];
  };
}

interface MyClassTestItem {
  test_id: string;
  title: string;
  subjects_info?: { id: string; name: string }[];
  subject?: { id: string; name: string };
  application_info?: {
    application?: string;
    expiration?: string;
  };
  duration?: number;
  total_questions?: number;
  max_score?: number;
  type?: string;
  model?: string;
  grade?: { id: string; name: string };
  description?: string;
  availability: Availability;
  student_status: StudentStatus;
}

export default function StudentEvaluations() {
  const [evaluations, setEvaluations] = useState<StudentEvaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvaluation, setSelectedEvaluation] = useState<StudentEvaluation | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  const [currentTaking, setCurrentTaking] = useState<EvaluationTaking | null>(null);
  const [confirmStart, setConfirmStart] = useState(false);
  const [canStartReason, setCanStartReason] = useState<string>("");

  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Função de retry com backoff exponencial
  const retryWithBackoff = async <T,>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000
  ): Promise<T> => {
    let lastError: unknown;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error: unknown) {
        lastError = error;
        
        const apiError = error as { response?: { status?: number } };
        
        // Verificar se é erro de rede que deve ter retry
        const isNetworkError = 
          !apiError.response || 
          apiError.response.status === 500 || 
          apiError.response.status === 502 || 
          apiError.response.status === 503 || 
          apiError.response.status === 504;
        
        // Se não é erro de rede ou já foi a última tentativa, lançar erro
        if (!isNetworkError || attempt >= maxAttempts) {
          throw error;
        }
        
        // Calcular delay com backoff exponencial: 1s, 2s, 4s
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`🔄 Retry ${attempt}/${maxAttempts} após ${delay}ms...`);
        
        // Aguardar antes da próxima tentativa
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  };

  const fetchStudentEvaluations = useCallback(async () => {
    console.log('🚀 Iniciando busca de avaliações...');
    try {
      setIsLoading(true);

      // Usar retry com backoff exponencial para erros de rede
      await retryWithBackoff(async () => {
        // ✅ NOVO: Usar o endpoint /test/my-class/tests
        const response = await api.get('/test/my-class/tests');
      console.log('Resposta da API de avaliações:', response);

      const testsData = response.data.tests || [];
      console.log('📊 Dados brutos das avaliações:', testsData);

      if (!testsData || !Array.isArray(testsData)) {
        console.log('Nenhuma avaliação encontrada ou formato inválido');
        setEvaluations([]);
        return;
      }

      // ✅ CORRIGIDO: Log para debug - verificar estrutura dos dados
      testsData.forEach((testData: MyClassTestItem, index: number) => {
        console.log(`📋 Avaliação ${index}:`, {
          testId: testData.test_id,
          title: testData.title,
          duration: testData.duration,
          subject: testData.subject,
          subjects_info: testData.subjects_info,
          subjectsCount: testData.subjects_info?.length || 1,
          hasAvailability: !!testData.availability,
          hasStudentStatus: !!testData.student_status,
          availability: testData.availability,
          studentStatus: testData.student_status
        });
      });

      // ✅ CORRIGIDO: Mostrar todas as avaliações (incluindo as já realizadas)
      const filteredTests = testsData.filter((testData: MyClassTestItem) => {
        // ✅ CORRIGIDO: Verificar se os campos obrigatórios existem
        if (!testData.availability || !testData.student_status) {
          console.warn('Dados de avaliação incompletos:', testData);
          return false;
        }
        // ✅ NOVO: Incluir todas as avaliações, não apenas as não concluídas
        return true;
      });

      console.log('Avaliações filtradas:', filteredTests.length, 'de', testsData.length);

      // Transformar e adicionar as avaliações encontradas
      const evaluationsWithStatus = filteredTests.map((testData: MyClassTestItem) => {
        console.log('📊 Dados da avaliação da API:', {
          id: testData.test_id,
          title: testData.title,
          duration: testData.duration,
          subject: testData.subject,
          subjects_info: testData.subjects_info,
          subjects_count: testData.subjects_info?.length || 1,
          availability: testData.availability,
          student_status: testData.student_status
        });

        // Mapear os dados da API para o formato esperado pelo componente
        const evaluation: StudentEvaluation = {
          id: testData.test_id,
          title: testData.title || testData.description || 'Avaliação sem título',
          description: testData.description || '',
          subject: testData.subject || { id: 'default', name: 'Disciplina' },
          subjects: testData.subjects_info || [testData.subject || { id: 'default', name: 'Disciplina' }],
          subjects_info: testData.subjects_info || [testData.subject || { id: 'default', name: 'Disciplina' }],
          grade: testData.grade || { id: 'default', name: 'Série' },
          course: { id: 'course', name: 'Curso' },
          startDateTime: testData.application_info?.application || new Date().toISOString(),
          endDateTime: testData.application_info?.expiration,
          duration: testData.duration || 60, // em minutos - usar o valor da API
          totalQuestions: testData.total_questions || 0,
          maxScore: testData.max_score || 0,
          type: testData.type || 'AVALIACAO',
          model: testData.model || 'SAEB',
          // ✅ NOVO: Usar os novos campos
          availability: testData.availability,
          student_status: testData.student_status
        };

        return evaluation;
      });

        console.log('🔍 Avaliações processadas:', evaluationsWithStatus);
        setEvaluations(evaluationsWithStatus);
        
        return evaluationsWithStatus; // Retornar para retryWithBackoff
      }, 3, 1000); // 3 tentativas, começando com 1 segundo

    } catch (error: unknown) {
      const apiError = error as { message?: string; response?: { data?: unknown; status?: number }; stack?: string };
      
      console.error("❌ Erro ao buscar avaliações do aluno após retries:", error);
      console.error("Detalhes do erro:", {
        message: apiError.message,
        response: apiError.response?.data,
        status: apiError.response?.status,
        stack: apiError.stack
      });
      
      // Verificar se é erro de rede após todas as tentativas
      const isNetworkError = 
        !apiError.response || 
        apiError.response.status === 500 || 
        apiError.response.status === 502 || 
        apiError.response.status === 503 || 
        apiError.response.status === 504;
      
      if (isNetworkError) {
        toast({
          title: "Erro",
          description: ERROR_MESSAGES.RETRY_FAILED,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao carregar avaliações",
          description: ERROR_MESSAGES.EVALUATION_LOAD_FAILED,
          variant: "destructive",
        });
      }

      setEvaluations([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStudentEvaluations();
  }, [fetchStudentEvaluations]);

  // Verificar avaliação em progresso separadamente, apenas quando evaluations mudar
  useEffect(() => {
    const inProgress = localStorage.getItem("evaluation_in_progress");
    if (inProgress && evaluations.length > 0) {
      try {
        const data = JSON.parse(inProgress);
        if (data && data.evaluationId && typeof data.evaluationId === 'string') {
          const evaluation = evaluations.find(e => e.id === data.evaluationId);
          if (evaluation && evaluation.student_status.has_completed) {
            localStorage.removeItem("evaluation_in_progress");
            localStorage.removeItem("current_evaluation_data");
            setCurrentTaking(null);
          } else {
            setCurrentTaking(data);
          }
        } else {
          localStorage.removeItem("evaluation_in_progress");
        }
      } catch (error) {
        console.error("Erro ao carregar avaliação em progresso:", error);
        localStorage.removeItem("evaluation_in_progress");
      }
    } else if (inProgress && evaluations.length === 0) {
      // Se não há avaliações ainda, apenas definir o currentTaking se houver dados no localStorage
      try {
        const data = JSON.parse(inProgress);
        if (data && data.evaluationId) {
          setCurrentTaking(data);
        }
      } catch (error) {
        console.error("Erro ao carregar avaliação em progresso:", error);
      }
    }
  }, [evaluations]);

  const handleStartEvaluation = async (evaluation: StudentEvaluation) => {
    setSelectedEvaluation(evaluation);

    // ✅ DEBUG: Log dos dados da avaliação antes de verificar
    console.log("🔍 Dados da avaliação para verificação:", {
      id: evaluation.id,
      title: evaluation.title,
      availability: evaluation.availability,
      student_status: evaluation.student_status,
      startDateTime: evaluation.startDateTime,
      endDateTime: evaluation.endDateTime,
      currentTime: new Date().toISOString()
    });

    // ✅ DEBUG: Verificação de data para debug
    if (evaluation.endDateTime) {
      const endDate = new Date(evaluation.endDateTime);
      const currentDate = new Date();
      const isExpired = currentDate > endDate;

      console.log("🔍 Verificação de data:", {
        endDate: endDate.toISOString(),
        currentDate: currentDate.toISOString(),
        isExpired,
        timeDifference: endDate.getTime() - currentDate.getTime()
      });
    }

    // ✅ NOVO: Verificar se pode iniciar usando o endpoint can-start
    try {
      // ✅ CORRIGIDO: Usar o endpoint correto para verificar se pode iniciar
      const response = await api.get(`/student-answers/student/${evaluation.id}/can-start`);
      const canStartData = response.data;

      console.log("🔍 Resposta do can-start:", canStartData);

      if (canStartData.can_start) {
        setShowInstructions(true);
      } else {
        // ✅ NOVO: Mostrar mensagem de erro usando o reason
        setCanStartReason(canStartData.reason || "Não foi possível iniciar a avaliação");
        console.log("❌ Não pode iniciar:", canStartData.reason);
        toast({
          title: "Não é possível iniciar",
          description: canStartData.reason || "Não foi possível iniciar a avaliação",
          variant: "destructive",
        });
      }
    } catch (error: unknown) {
      const apiError = error as { message?: string; response?: { data?: { error?: string; message?: string }; status?: number }; config?: { url?: string } };
      
      console.error("Erro ao verificar se pode iniciar:", error);
      console.error("Detalhes do erro:", {
        message: apiError.message,
        response: apiError.response?.data,
        status: apiError.response?.status,
        url: apiError.config?.url
      });

      let errorMessage = "Erro ao verificar disponibilidade da avaliação";

      if (apiError.response?.data?.error) {
        errorMessage = apiError.response.data.error;
      } else if (apiError.response?.data?.message) {
        errorMessage = apiError.response.data.message;
      }

      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleConfirmStart = async () => {
    if (!selectedEvaluation) return;

    console.log("🚀 Iniciando avaliação:", {
      evaluationId: selectedEvaluation.id,
      title: selectedEvaluation.title,
      availability: selectedEvaluation.availability,
      student_status: selectedEvaluation.student_status,
      startDateTime: selectedEvaluation.startDateTime,
      endDateTime: selectedEvaluation.endDateTime
    });

    try {
      // Usar a API real para iniciar a sessão da avaliação
      const testId = selectedEvaluation.id;
      console.log("📡 Fazendo POST para /test/${testId}/start-session");

      // ✅ DEBUG: Log dos dados que serão enviados
      console.log("📤 Dados para start-session:", {
        testId,
        evaluationData: {
          availability: selectedEvaluation.availability,
          student_status: selectedEvaluation.student_status,
          startDateTime: selectedEvaluation.startDateTime,
          endDateTime: selectedEvaluation.endDateTime
        }
      });

      // ✅ CORRIGIDO: Usar o serviço EvaluationApiService para iniciar a sessão
      console.log("📤 Iniciando sessão usando EvaluationApiService");

      const sessionData = await EvaluationApiService.startSession(testId, selectedEvaluation.duration);

      console.log('✅ Resposta da API de iniciar sessão:', sessionData);

      // Buscar os dados completos da avaliação usando o serviço
      console.log("📤 Buscando dados da avaliação usando EvaluationApiService");
      const evaluationData = await EvaluationApiService.getTestData(testId);

      // Salvar os dados completos da avaliação no sessionStorage
      sessionStorage.setItem("current_evaluation", JSON.stringify(evaluationData));
      sessionStorage.setItem("evaluation_session", JSON.stringify(sessionData));

      console.log("📁 Dados da avaliação salvos:", evaluationData);
      console.log("📁 Dados da sessão salvos:", sessionData);

      const takingData: EvaluationTaking = {
        evaluationId: testId,
        currentQuestion: 0,
        answers: {},
        timeRemaining: selectedEvaluation.duration * 60, // converter para segundos
        startedAt: new Date().toISOString(),
      };

      // Salvar no localStorage para persistência
      localStorage.setItem("evaluation_in_progress", JSON.stringify(takingData));
      setCurrentTaking(takingData);

      setShowInstructions(false);
      setConfirmStart(false);

      toast({
        title: "🎉 Avaliação iniciada!",
        description: `Você tem ${selectedEvaluation.duration} minutos para completar`,
      });

      // Redirecionar para tela de avaliação
      window.location.href = `/app/avaliacao/${testId}/fazer`;

    } catch (error: unknown) {
      const apiError = error as { message?: string; response?: { data?: { error?: string; message?: string }; status?: number }; config?: { url?: string; method?: string }; stack?: string };
      
      console.error("❌ Erro ao iniciar avaliação:", error);
      console.error("Detalhes completos do erro:", {
        message: apiError.message,
        response: apiError.response?.data,
        status: apiError.response?.status,
        url: apiError.config?.url,
        method: apiError.config?.method,
        stack: apiError.stack
      });

      let errorMessage = "Não foi possível iniciar a avaliação";

      // ✅ MELHORADO: Tratamento específico para diferentes tipos de erro
      if (apiError.response?.status === 403) {
        errorMessage = "Você não tem permissão para acessar esta avaliação";
      } else if (apiError.response?.status === 404) {
        errorMessage = "Avaliação não encontrada";
      } else if (apiError.response?.status === 400) {
        errorMessage = apiError.response.data?.error || "Dados inválidos para iniciar a avaliação";
      } else if (apiError.response?.status === 422) {
        errorMessage = apiError.response.data?.error || "Avaliação expirada ou indisponível";
      } else if (apiError.response?.data?.error) {
        errorMessage = apiError.response.data.error;
      } else if (apiError.response?.data?.message) {
        errorMessage = apiError.response.data.message;
      } else if (apiError.message) {
        errorMessage = apiError.message;
      }

      console.log("🚨 Mensagem de erro final:", errorMessage);

      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleContinueEvaluation = async (evaluation: StudentEvaluation) => {
    console.log("🔄 Continuando avaliação:", evaluation.id);

    try {
      // Buscar dados da avaliação usando o serviço
      console.log("📤 Buscando dados da avaliação para continuar");
      const evaluationData = await EvaluationApiService.getTestData(evaluation.id);

      // Salvar os dados da avaliação no sessionStorage
      sessionStorage.setItem("current_evaluation", JSON.stringify(evaluationData));

      console.log("📁 Dados da avaliação carregados:", evaluationData);

      // Redirecionar para tela de avaliação
      window.location.href = `/app/avaliacao/${evaluation.id}/fazer`;

    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { error?: string }; status?: number } };
      
      console.error("❌ Erro ao continuar avaliação:", error);

      let errorMessage = "Não foi possível continuar a avaliação";

      if (apiError.response?.status === 403) {
        errorMessage = ERROR_MESSAGES.FORBIDDEN;
      } else if (apiError.response?.status === 404) {
        errorMessage = ERROR_MESSAGES.EVALUATION_NOT_FOUND;
      } else if (apiError.response?.data?.error) {
        errorMessage = apiError.response.data.error;
      }

      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };



  // ✅ NOVO: Função para obter badge baseado no student_status
  const getStatusBadge = (evaluation: StudentEvaluation) => {
    const { student_status, availability } = evaluation;

    // ✅ CORRIGIDO: Verificar se está concluída primeiro
    if (student_status.has_completed) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Concluída
        </Badge>
      );
    }

    // ✅ CORRIGIDO: Verificar se está expirada (tanto no student_status quanto no availability)
    if (student_status.status === 'expirada' || availability.status === 'expired') {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Expirada
        </Badge>
      );
    }

    // ✅ NOVO: Verificar se está agendada (not_started)
    if (availability.status === 'not_started') {
      return (
        <Badge variant="outline" className="flex items-center gap-1 bg-blue-50 text-blue-700 border-blue-300">
          <Calendar className="h-3 w-3" />
          Agendada
        </Badge>
      );
    }

    // ✅ CORRIGIDO: Verificar outros status do student_status
    switch (student_status.status) {
      case 'em_andamento':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Timer className="h-3 w-3" />
            Em andamento
          </Badge>
        );
      case 'finalizada':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Finalizada
          </Badge>
        );
      case 'corrigida':
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Corrigida
          </Badge>
        );
      case 'revisada':
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Revisada
          </Badge>
        );
      default:
        // ✅ CORRIGIDO: Verificar se está disponível baseado no availability
        if (availability.is_available && student_status.can_start) {
          return (
            <Badge variant="outline" className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Disponível
            </Badge>
          );
        } else {
          return (
            <Badge variant="secondary" className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Indisponível
            </Badge>
          );
        }
    }
  };

  const formatTimeRemaining = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-blue-600";
    if (percentage >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  // ✅ NOVO: Função para formatar a exibição das disciplinas
  const formatSubjects = (evaluation: StudentEvaluation) => {
    if (evaluation.subjects_info && evaluation.subjects_info.length > 1) {
      // Se há múltiplas disciplinas, mostrar a primeira + "e mais X"
      const firstSubject = evaluation.subjects_info[0].name;
      const remainingCount = evaluation.subjects_info.length - 1;
      return `${firstSubject} e mais ${remainingCount} disciplina${remainingCount > 1 ? 's' : ''}`;
    } else if (evaluation.subjects_info && evaluation.subjects_info.length === 1) {
      // Se há apenas uma disciplina
      return evaluation.subjects_info[0].name;
    } else {
      // Fallback para o subject principal
      return evaluation.subject.name;
    }
  };

  // ✅ NOVO: Função para obter todas as disciplinas como string
  const getAllSubjects = (evaluation: StudentEvaluation) => {
    if (evaluation.subjects_info && evaluation.subjects_info.length > 0) {
      return evaluation.subjects_info.map(subject => subject.name).join(', ');
    } else {
      return evaluation.subject.name;
    }
  };

  // ✅ NOVO: Função para obter a quantidade de disciplinas
  const getSubjectsCount = (evaluation: StudentEvaluation) => {
    return evaluation.subjects_info?.length || 1;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Minhas Avaliações</h1>
            <p className="text-muted-foreground">
              Acompanhe suas avaliações agendadas e resultados
            </p>
          </div>

          {/* Botão de atualizar */}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStudentEvaluations}
            disabled={isLoading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Disponíveis</p>
                <p className="text-2xl font-bold text-blue-600">
                  {evaluations.filter(e => e.availability.is_available && !e.student_status.has_completed && e.student_status.can_start && e.availability.status !== 'not_started').length}
                </p>
              </div>
              <Play className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Agendadas</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {evaluations.filter(e => e.availability.status === 'not_started').length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Em andamento</p>
                <p className="text-2xl font-bold text-orange-600">
                  {evaluations.filter(e => e.student_status.status === 'em_andamento').length}
                </p>
              </div>
              <Timer className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Concluídas</p>
                <p className="text-2xl font-bold text-green-600">
                  {evaluations.filter(e => e.student_status.has_completed).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Média Geral</p>
                <p className="text-2xl font-bold text-purple-600">
                  {evaluations.filter(e => e.student_status.score).length > 0
                    ? (evaluations.filter(e => e.student_status.score).reduce((acc, e) => acc + (e.student_status.score || 0), 0) / evaluations.filter(e => e.student_status.score).length).toFixed(0) + "%"
                    : "0%"
                  }
                </p>
              </div>
              <Trophy className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Avaliação em Progresso */}
      {currentTaking && currentTaking.evaluationId &&
        evaluations.find(e => e.id === currentTaking.evaluationId && e.student_status.status === 'em_andamento') && (
          <Alert className="border-blue-200 bg-blue-50">
            <Timer className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                Você tem uma avaliação em progresso.
                <strong className="ml-1">
                  {evaluations.find(e => e.id === currentTaking.evaluationId)?.title || 'Avaliação'}
                </strong>
              </span>
              <Button
                size="sm"
                onClick={() => {
                  const evaluation = evaluations.find(e => e.id === currentTaking.evaluationId);
                  if (evaluation) {
                    handleContinueEvaluation(evaluation);
                  } else {
                    toast({
                      title: "Erro",
                      description: ERROR_MESSAGES.EVALUATION_NOT_FOUND,
                      variant: "destructive",
                    });
                  }
                }}
              >
                Continuar
              </Button>
            </AlertDescription>
          </Alert>
        )}

      {/* Lista de Avaliações */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {evaluations.map((evaluation) => (
          <Card key={evaluation.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <CardTitle className="text-base line-clamp-2">{evaluation.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(evaluation)}
                    <Badge variant="outline" className="text-xs">
                      {evaluation.type}
                    </Badge>
                    {evaluation.subjects_info && evaluation.subjects_info.length > 1 && (
                      <Badge
                        variant="secondary"
                        className="text-xs bg-purple-100 text-purple-800 border-purple-300"
                        title={getAllSubjects(evaluation)}
                      >
                        {getSubjectsCount(evaluation)} Disciplina{getSubjectsCount(evaluation) > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Informações básicas */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="line-clamp-1" title={getAllSubjects(evaluation)}>
                    {formatSubjects(evaluation)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{evaluation.duration || 60} minutos</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>{evaluation.totalQuestions} questões</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Disponível em: {evaluation.startDateTime ?
                      format(new Date(evaluation.startDateTime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) :
                      "Data não definida"
                    } até {evaluation.endDateTime ?
                      format(new Date(evaluation.endDateTime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) :
                      "Sem prazo definido"
                    }
                  </span>
                </div>
              </div>


              {/* Ações */}
              <div className="flex gap-2">
                {/* ✅ NOVO: Botão "Agendada" se status === "not_started" */}
                {evaluation.availability.status === 'not_started' && (
                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    disabled
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Agendada
                  </Button>
                )}

                {/* ✅ CORRIGIDO: Botão "Iniciar" só mostrar se disponível, pode iniciar e NÃO está em andamento */}
                {evaluation.availability.is_available &&
                  !evaluation.student_status.has_completed &&
                  evaluation.student_status.can_start &&
                  evaluation.student_status.status !== "expirada" &&
                  evaluation.student_status.status !== "em_andamento" &&
                  evaluation.availability.status !== 'not_started' && (
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => handleStartEvaluation(evaluation)}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Iniciar Avaliação
                    </Button>
                  )}

                {/* ✅ CORRIGIDO: Botão "Continuar" se status === "em_andamento" */}
                {evaluation.student_status.status === "em_andamento" && (
                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    onClick={() => handleContinueEvaluation(evaluation)}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Continuar
                  </Button>
                )}

                {/* ✅ Botão "Ver Resultado" aparece apenas quando concluída E entregue (tem score ou status finalizado) */}
                {evaluation.student_status.has_completed && 
                 (evaluation.student_status.score !== undefined || 
                  evaluation.student_status.status === "finalizada" || 
                  evaluation.student_status.status === "corrigida" || 
                  evaluation.student_status.status === "revisada") && (
                  <Button
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                    onClick={() => navigate(`/aluno/avaliacao/${evaluation.id}/resultado`)}
                  >
                    <Trophy className="h-4 w-4 mr-2" />
                    Ver Resultado
                  </Button>
                )}

                {/* ✅ CORRIGIDO: Botão "Expirada" se status === "expirada" ou availability.status === "expired" */}
                {(evaluation.student_status.status === "expirada" ||
                  evaluation.availability.status === "expired") && (
                    <Button className="flex-1 bg-red-600 hover:bg-red-700" disabled>
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Expirada
                    </Button>
                  )}

                {/* ✅ CORRIGIDO: Botão "Indisponível" se não pode iniciar, não está expirada e não está em andamento */}
                {evaluation.availability.is_available &&
                  !evaluation.student_status.has_completed &&
                  !evaluation.student_status.can_start &&
                  evaluation.student_status.status !== "expirada" &&
                  evaluation.student_status.status !== "em_andamento" &&
                  evaluation.availability.status !== "expired" &&
                  evaluation.availability.status !== 'not_started' && (
                    <Button className="flex-1 bg-muted text-muted-foreground hover:bg-muted/80" disabled>
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Indisponível
                    </Button>
                  )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog de Instruções */}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 dark:text-gray-100">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Instruções da Avaliação
            </DialogTitle>
            <DialogDescription className="dark:text-gray-400">
              Leia atentamente antes de iniciar a avaliação
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Informações da Avaliação */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-3 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                {selectedEvaluation?.title}
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm text-blue-800 dark:text-blue-300">
                <div>
                  <span className="font-medium">Disciplina{selectedEvaluation?.subjects_info && selectedEvaluation.subjects_info.length > 1 ? 's' : ''}:</span>
                  <p className="dark:text-blue-200">{selectedEvaluation ? getAllSubjects(selectedEvaluation) : ''}</p>
                </div>
                <div>
                  <span className="font-medium">Duração:</span>
                  <p className="dark:text-blue-200">{selectedEvaluation?.duration} minutos</p>
                </div>
                <div>
                  <span className="font-medium">Questões:</span>
                  <p className="dark:text-blue-200">{selectedEvaluation?.totalQuestions}</p>
                </div>
                <div>
                  <span className="font-medium">Tipo:</span>
                  <p className="dark:text-blue-200">{selectedEvaluation?.type}</p>
                </div>
              </div>
            </div>

            {/* Como Funciona - SIMPLIFICADO */}
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4 rounded-lg">
              <h5 className="font-semibold text-green-900 dark:text-green-300 mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                Como funciona
              </h5>
              <div className="space-y-1 text-sm text-green-800 dark:text-green-300">
                <p>✔️ Leia as questões com atenção</p>
                <p>✔️ Suas respostas são salvas automaticamente</p>
                <p>✔️ Você pode revisar antes de finalizar</p>
              </div>
            </div>

            {/* Importante - SIMPLIFICADO */}
            <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
              <h5 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                Importante
              </h5>
              <div className="space-y-1 text-sm text-yellow-800 dark:text-yellow-300">
                <p>⚠️ Mantenha conexão estável com a internet</p>
                <p>⚠️ Não feche a aba/janela durante a avaliação</p>
              </div>
            </div>

            {/* Tempo Disponível - SIMPLIFICADO */}
            {selectedEvaluation && (
              <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 p-4 rounded-lg">
                <h5 className="font-semibold text-purple-900 dark:text-purple-300 mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  Tempo disponível
                </h5>
                <p className="text-sm text-purple-800 dark:text-purple-300">
                  De {selectedEvaluation.startDateTime ?
                    format(new Date(selectedEvaluation.startDateTime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) :
                    "data não definida"
                  } até {selectedEvaluation.endDateTime ?
                    format(new Date(selectedEvaluation.endDateTime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) :
                    "sem prazo definido"
                  }
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowInstructions(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => setConfirmStart(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="h-4 w-4 mr-2" />
              Iniciar Avaliação
            </Button>
          </div>
        </DialogContent>
      </Dialog>



      {/* AlertDialog de Confirmação */}
      <AlertDialog open={confirmStart} onOpenChange={setConfirmStart}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar início da avaliação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja iniciar a avaliação? Uma vez iniciada,
              o cronômetro começará e não poderá ser pausado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmStart}>
              Sim, iniciar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
