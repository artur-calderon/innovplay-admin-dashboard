import React, { useState, useEffect } from "react";
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
  Eye,
  RefreshCw,
  Trophy,
  Target,
  Zap,
  Info
} from "lucide-react";
import { useAuth } from "@/context/authContext";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

import { format, isAfter, isBefore, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface StudentEvaluation {
  id: string;
  title: string;
  description: string;
  subject: { id: string; name: string };
  subjects?: { id: string; name: string }[];
  grade: { id: string; name: string };
  course: { id: string; name: string };
  startDateTime: string;
  endDateTime?: string;
  duration: number; // em minutos
  totalQuestions: number;
  maxScore: number;
  type: string;
  model: string;
  status: "pending" | "available" | "in_progress" | "completed" | "expired";
  timeRemaining?: number; // em segundos se estiver em progresso
  currentProgress?: {
    questionsAnswered: number;
    timeSpent: number; // em segundos
    lastAccess: string;
  };
  result?: {
    score: number;
    percentage: number;
    correctAnswers: number;
    wrongAnswers: number;
    blankAnswers: number;
    timeSpent: number;
    completedAt: string;
  };
  student_result?: { // Adicionado para verificar o resultado do aluno
    score: number;
    percentage: number;
    correctAnswers: number;
    wrongAnswers: number;
    blankAnswers: number;
    timeSpent: number;
    completedAt: string;
  };
}

interface EvaluationTaking {
  evaluationId: string;
  currentQuestion: number;
  answers: { [questionId: string]: any };
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

export default function StudentEvaluations() {
  const [evaluations, setEvaluations] = useState<StudentEvaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvaluation, setSelectedEvaluation] = useState<StudentEvaluation | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [currentTaking, setCurrentTaking] = useState<EvaluationTaking | null>(null);
  const [confirmStart, setConfirmStart] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchStudentEvaluations();
    // Verificar se há avaliação em andamento no localStorage
    checkInProgressEvaluation();
    
    // ✅ NOVO: Atualizar status das avaliações periodicamente
    const interval = setInterval(() => {
      updateEvaluationStatuses();
    }, 60000); // Atualizar a cada minuto
    
    return () => clearInterval(interval);
  }, []);
  
  // ✅ NOVO: Função para atualizar status das avaliações em tempo real
  const updateEvaluationStatuses = () => {
    setEvaluations(currentEvaluations => {
      const updatedEvaluations = currentEvaluations.map(evaluation => {
        const newStatus = determineEvaluationStatus(evaluation);
        
        // Se o status mudou para completed, limpar dados de progresso
        if (newStatus === "completed" && evaluation.status !== "completed") {
          const inProgress = localStorage.getItem("evaluation_in_progress");
          if (inProgress) {
            try {
              const progressData = JSON.parse(inProgress);
              if (progressData.evaluationId === evaluation.id) {
                localStorage.removeItem("evaluation_in_progress");
                localStorage.removeItem("current_evaluation_data");
                setCurrentTaking(null);
              }
            } catch (e) {
              // Ignorar erros de parsing
            }
          }
          
          toast({
            title: "✅ Avaliação concluída!",
            description: `A avaliação "${evaluation.title}" foi finalizada com sucesso.`,
          });
        }
        
        // Mostrar notificação quando uma avaliação ficar disponível
        if (newStatus === "available" && evaluation.status === "pending") {
          toast({
            title: "📢 Avaliação disponível!",
            description: `A avaliação "${evaluation.title}" está disponível para início.`,
          });
        }
        
        return {
          ...evaluation,
          status: newStatus
        };
      });
      
      return updatedEvaluations;
    });
  };

  const fetchStudentEvaluations = async () => {
    try {
      setIsLoading(true);

      // Buscar dados do aluno logado usando a nova API
      const studentResponse = await api.get('/students/me');
      const studentData = studentResponse.data;

      console.log('Dados do aluno:', studentData);

      if (!studentData || !studentData.class || !studentData.class.id) {
        setEvaluations([]);
        toast({
          title: "Nenhuma turma encontrada",
          description: "Você não está matriculado em nenhuma turma no momento.",
          variant: "default",
        });
        return;
      }

      const classId = studentData.class.id;

      // Buscar todas as avaliações da turma usando a API real
      const evaluationsResponse = await api.get(`/test/class/${classId}/tests/complete`);
      console.log('Resposta da API de avaliações:', evaluationsResponse);

      // Os dados das avaliações estão em evaluationsResponse.data.tests
      const testsData = evaluationsResponse.data.tests;

      if (!testsData || !Array.isArray(testsData)) {
        console.log('Nenhuma avaliação encontrada ou formato inválido');
        setEvaluations([]);
        return;
      }

      // Transformar e adicionar as avaliações encontradas
      const evaluationsWithStatus = testsData.map((testData: any) => {
        // Mapear os dados da API para o formato esperado pelo componente
        const evaluation = {
          id: testData.test.id,
          title: testData.test.title || testData.test.description,
          description: testData.test.description,
          subject: testData.test.subject || { id: 'default', name: 'Disciplina' },
          grade: testData.test.grade,
          course: { id: 'course', name: 'Curso' },
          startDateTime: testData.class_test_info.application,
          endDateTime: testData.class_test_info.expiration,
          duration: testData.test.duration || 60, // em minutos
          totalQuestions: testData.total_questions,
          maxScore: testData.total_value,
          type: testData.test.type || 'AVALIACAO',
          model: testData.test.model || 'SAEB',
          status: determineEvaluationStatus({
            id: testData.test.id,
            startDateTime: testData.class_test_info.application,
            endDateTime: testData.class_test_info.expiration,
            availability: testData.availability,
            class_test_info: testData.class_test_info,
            student_result: testData.student_result // ✅ Incluir resultado individual do aluno
          }),
          // Adicionar dados adicionais se disponíveis
          questions: testData.questions,
          availability: testData.availability,
          class_test_info: testData.class_test_info,
          student_result: testData.student_result // ✅ Incluir resultado individual do aluno
        };

        return evaluation;
      });

      setEvaluations(evaluationsWithStatus);

    } catch (error) {
      console.error("Erro ao buscar avaliações do aluno:", error);

      // Usar dados mock para desenvolvimento
      const mockEvaluations = getMockEvaluations();
      setEvaluations(mockEvaluations);

      // ✅ REMOVIDO: Toast de aviso de modo demonstração para apresentação
      // toast({
      //   title: "Modo de demonstração",
      //   description: "Exibindo dados de exemplo. Backend não disponível.",
      //   variant: "default",
      // });
    } finally {
      setIsLoading(false);
    }
  };

  const determineEvaluationStatus = (evaluation: any): StudentEvaluation["status"] => {
    if (evaluation.status === "finalizada" || (evaluation.availability && evaluation.availability.status === "finalizada")) {
      localStorage.removeItem("evaluation_in_progress");
      localStorage.removeItem("current_evaluation_data");
      return "completed";
    }
    const now = new Date();
    const startDate = parseISO(evaluation.startDateTime);
    const endDate = evaluation.endDateTime ? parseISO(evaluation.endDateTime) : null;

    // PRIORIDADE 1: Se o backend diz que está expirada, sempre retorna expired
    if (evaluation.availability && evaluation.availability.status === 'expired') {
      localStorage.removeItem("evaluation_in_progress");
      localStorage.removeItem("current_evaluation_data");
      return "expired";
    }
    // PRIORIDADE 2: Se o backend diz que está concluída, sempre retorna completed
    if (evaluation.student_result || evaluation.result || (evaluation.availability && evaluation.availability.status === 'completed')) {
      localStorage.removeItem("evaluation_in_progress");
      localStorage.removeItem("current_evaluation_data");
      return "completed";
    }

    // PRIORIDADE 3: Se há sessão ativa no localStorage
    const inProgress = localStorage.getItem("evaluation_in_progress");
    if (inProgress) {
      try {
        const progressData = JSON.parse(inProgress);
        if (progressData.evaluationId === evaluation.id) {
          return "in_progress";
        }
      } catch (e) {
        localStorage.removeItem("evaluation_in_progress");
      }
    }

    // PRIORIDADE 4: Progresso atual da API
    if (evaluation.currentProgress) {
      return "in_progress";
    }

    // PRIORIDADE 5: Disponibilidade da API
    if (evaluation.availability) {
      switch (evaluation.availability.status) {
        case 'not_available':
          return "pending";
        case 'available':
          return "available";
        default:
          break;
      }
    }

    // PRIORIDADE 6: Datas
    if (endDate && isAfter(now, endDate)) {
      localStorage.removeItem("evaluation_in_progress");
      localStorage.removeItem("current_evaluation_data");
      return "expired";
    }
    if (isAfter(now, startDate)) {
      return "available";
    }
    return "pending";
  };

  const checkInProgressEvaluation = () => {
    const inProgress = localStorage.getItem("evaluation_in_progress");
    if (inProgress) {
      try {
        const data = JSON.parse(inProgress);
        // Verificar se os dados são válidos
        if (data && data.evaluationId && typeof data.evaluationId === 'string') {
          // Verificar se a avaliação ainda está em progresso
          const evaluation = evaluations.find(e => e.id === data.evaluationId);
          if (evaluation && evaluation.status === 'completed') {
            // Avaliação foi concluída, limpar localStorage
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
    }
  };

  const handleStartEvaluation = (evaluation: StudentEvaluation) => {
    setSelectedEvaluation(evaluation);
    setShowInstructions(true);
  };

  const handleConfirmStart = async () => {
    if (!selectedEvaluation) return;

    // ✅ NOVO: Verificação rigorosa de horários antes de iniciar
    const now = new Date();
    const startDate = parseISO(selectedEvaluation.startDateTime);
    const endDate = selectedEvaluation.endDateTime ? parseISO(selectedEvaluation.endDateTime) : null;

    // Verificar se está dentro do período permitido
    if (isBefore(now, startDate)) {
      toast({
        title: "⏰ Avaliação ainda não disponível",
        description: `Esta avaliação só estará disponível a partir de ${format(startDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
        variant: "destructive",
      });
      return;
    }

    if (endDate && isAfter(now, endDate)) {
      toast({
        title: "⏰ Avaliação expirada",
        description: `O prazo para esta avaliação expirou em ${format(endDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
        variant: "destructive",
      });
      return;
    }

    console.log("🚀 Iniciando avaliação:", {
      evaluationId: selectedEvaluation.id,
      title: selectedEvaluation.title,
      now: now.toISOString(),
      startDate: startDate.toISOString(),
      endDate: endDate?.toISOString(),
      isWithinTimeRange: true
    });

    try {
      // Usar a API real para iniciar a sessão da avaliação
      const testId = selectedEvaluation.id;
      const response = await api.post(`/test/${testId}/start-session`);
      
      console.log('✅ Resposta da API de iniciar sessão:', response);
      const sessionData = response.data;

      // Buscar os dados completos da avaliação usando a API real
      const evaluationResponse = await api.get(`/test/${testId}/details`);
      const evaluationData = evaluationResponse.data;

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

    } catch (error: any) {
      console.error("❌ Erro ao iniciar avaliação:", error);
      
      let errorMessage = "Não foi possível iniciar a avaliação";
      
      if (error.response?.status === 403) {
        errorMessage = "Você não tem permissão para acessar esta avaliação";
      } else if (error.response?.status === 404) {
        errorMessage = "Avaliação não encontrada";
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.error || "Dados inválidos para iniciar a avaliação";
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleContinueEvaluation = async (evaluation: StudentEvaluation) => {
    // Verificação de segurança
    if (!evaluation || !evaluation.id) {
      console.error("Avaliação inválida:", evaluation);
      toast({
        title: "Erro",
        description: "Dados da avaliação inválidos. Tente atualizar a página.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Buscar os dados completos da avaliação usando a API real
      const evaluationResponse = await api.get(`/test/${evaluation.id}/details`);
      const evaluationData = evaluationResponse.data;

      // Salvar os dados completos da avaliação no sessionStorage
      sessionStorage.setItem("current_evaluation", JSON.stringify(evaluationData));
      console.log("Dados da avaliação salvos para continuar:", evaluationData);
    } catch (apiError) {
      console.error("Erro ao buscar dados da avaliação:", apiError);
      // Fallback: salvar apenas os dados básicos
      sessionStorage.setItem("current_evaluation", JSON.stringify(evaluation));
    }

    window.location.href = `/app/avaliacao/${evaluation.id}/fazer`;
  };

  const handleViewResults = (evaluation: StudentEvaluation) => {
    setSelectedEvaluation(evaluation);
    setShowResults(true);
  };

  const getStatusBadge = (status: StudentEvaluation["status"]) => {
    const configs = {
      pending: { label: "Agendada", variant: "secondary" as const, icon: Calendar },
      available: { label: "Disponível", variant: "default" as const, icon: Play },
      in_progress: { label: "Em Progresso", variant: "secondary" as const, icon: Timer },
      completed: { label: "Concluída", variant: "secondary" as const, icon: CheckCircle },
      expired: { label: "Expirada", variant: "destructive" as const, icon: AlertCircle },
    };

    const config = configs[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
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

  const getMockEvaluations = (): StudentEvaluation[] => [
    {
      id: "eval-1",
      title: "Avaliação de Matemática - 1º Bimestre",
      description: "Avaliação sobre números decimais e frações",
      subject: { id: "math", name: "Matemática" },
      grade: { id: "5ano", name: "5º Ano" },
      course: { id: "ef", name: "Ensino Fundamental" },
      startDateTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 horas atrás
      duration: 90,
      totalQuestions: 15,
      maxScore: 10,
      type: "AVALIACAO",
      model: "SAEB",
      status: "available",
    },
    {
      id: "eval-2",
      title: "Simulado de Português",
      description: "Simulado preparatório para prova externa",
      subject: { id: "port", name: "Português" },
      grade: { id: "5ano", name: "5º Ano" },
      course: { id: "ef", name: "Ensino Fundamental" },
      startDateTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 dia atrás
      duration: 120,
      totalQuestions: 20,
      maxScore: 10,
      type: "SIMULADO",
      model: "SAEB",
      status: "completed",
      result: {
        score: 8.5,
        percentage: 85,
        correctAnswers: 17,
        wrongAnswers: 2,
        blankAnswers: 1,
        timeSpent: 4500, // 1h15min
        completedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      }
    },
    {
      id: "eval-3",
      title: "Prova de Ciências - Água e Solo",
      description: "Avaliação sobre ciclo da água e tipos de solo",
      subject: { id: "cienc", name: "Ciências" },
      grade: { id: "5ano", name: "5º Ano" },
      course: { id: "ef", name: "Ensino Fundamental" },
      startDateTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // em 2 dias
      duration: 60,
      totalQuestions: 12,
      maxScore: 10,
      type: "AVALIACAO",
      model: "PROVA",
      status: "pending",
    },
    {
      id: "eval-4",
      title: "Avaliação de História - Brasil Colonial",
      description: "Avaliação sobre o período colonial brasileiro",
      subject: { id: "hist", name: "História" },
      grade: { id: "5ano", name: "5º Ano" },
      course: { id: "ef", name: "Ensino Fundamental" },
      startDateTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 dias atrás
      duration: 75,
      totalQuestions: 18,
      maxScore: 10,
      type: "AVALIACAO",
      model: "SAEB",
      status: "completed",
      result: {
        score: 7.2,
        percentage: 72,
        correctAnswers: 13,
        wrongAnswers: 4,
        blankAnswers: 1,
        timeSpent: 3600, // 1h
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      }
    }
  ];

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
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold text-orange-600">
                  {evaluations.filter(e => e.status === "pending").length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Disponíveis</p>
                <p className="text-2xl font-bold text-blue-600">
                  {evaluations.filter(e => e.status === "available").length}
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
                <p className="text-sm text-muted-foreground">Concluídas</p>
                <p className="text-2xl font-bold text-green-600">
                  {evaluations.filter(e => e.status === "completed").length}
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
                  {evaluations.filter(e => e.result).length > 0
                    ? (evaluations.filter(e => e.result).reduce((acc, e) => acc + (e.result?.percentage || 0), 0) / evaluations.filter(e => e.result).length).toFixed(0) + "%"
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
        evaluations.find(e => e.id === currentTaking.evaluationId && e.status === 'in_progress') && (
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
                      description: "Avaliação não encontrada. Tente atualizar a página.",
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
                    {getStatusBadge(evaluation.status)}
                    <Badge variant="outline" className="text-xs">
                      {evaluation.type}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Informações básicas */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span>{evaluation.subject.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{evaluation.duration} minutos</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>{evaluation.totalQuestions} questões</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(parseISO(evaluation.startDateTime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </div>

              {/* Progresso se estiver em andamento */}
              {evaluation.currentProgress && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progresso</span>
                    <span>{evaluation.currentProgress.questionsAnswered}/{evaluation.totalQuestions}</span>
                  </div>
                  <Progress
                    value={(evaluation.currentProgress.questionsAnswered / evaluation.totalQuestions) * 100}
                    className="h-2"
                  />
                </div>
              )}

              {/* Resultado se concluída */}
              {evaluation.result && (
                <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Resultado</span>
                    <Badge
                      variant="secondary"
                      className={`${getPerformanceColor(evaluation.result.percentage)} bg-transparent border`}
                    >
                      {evaluation.result.percentage}%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <p className="font-medium text-green-600">{evaluation.result.correctAnswers}</p>
                      <p className="text-muted-foreground">Acertos</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-red-600">{evaluation.result.wrongAnswers}</p>
                      <p className="text-muted-foreground">Erros</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-gray-600">{evaluation.result.blankAnswers}</p>
                      <p className="text-muted-foreground">Em branco</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Ações */}
              <div className="flex gap-2">
                {evaluation.status === "available" && (
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleStartEvaluation(evaluation)}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Iniciar Avaliação
                  </Button>
                )}

                {evaluation.status === "in_progress" && (
                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    onClick={() => handleContinueEvaluation(evaluation)}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Continuar
                  </Button>
                )}

                {evaluation.status === "completed" && (
                  <div className="flex-1 space-y-2">
                    <Button
                      className="w-full bg-gray-600 hover:bg-gray-700"
                      disabled
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Concluída
                    </Button>
                    <Button
                      className="w-full"
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewResults(evaluation)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Resultado
                    </Button>
                  </div>
                )}

                {evaluation.status === "pending" && (
                  <Button className="flex-1 bg-orange-600 hover:bg-orange-700" disabled>
                    <Calendar className="h-4 w-4 mr-2" />
                    Agendada
                  </Button>
                )}

                {evaluation.status === "expired" && (
                  <Button className="flex-1 bg-red-600 hover:bg-red-700" disabled>
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Expirada
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
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600" />
              Instruções da Avaliação
            </DialogTitle>
            <DialogDescription>
              Leia atentamente antes de iniciar a avaliação
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Informações da Avaliação */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                {selectedEvaluation?.title}
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm text-blue-800">
                <div>
                  <span className="font-medium">Disciplina:</span>
                  <p>{selectedEvaluation?.subject.name}</p>
                </div>
                <div>
                  <span className="font-medium">Duração:</span>
                  <p>{selectedEvaluation?.duration} minutos</p>
                </div>
                <div>
                  <span className="font-medium">Questões:</span>
                  <p>{selectedEvaluation?.totalQuestions}</p>
                </div>
                <div>
                  <span className="font-medium">Tipo:</span>
                  <p>{selectedEvaluation?.type}</p>
                </div>
              </div>
            </div>

            {/* Como Funciona - SIMPLIFICADO */}
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <h5 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Como funciona
              </h5>
              <div className="space-y-1 text-sm text-green-800">
                <p>✔️ Leia as questões com atenção</p>
                <p>✔️ Suas respostas são salvas automaticamente</p>
                <p>✔️ Você pode revisar antes de finalizar</p>
              </div>
            </div>

            {/* Importante - SIMPLIFICADO */}
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <h5 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Importante
              </h5>
              <div className="space-y-1 text-sm text-yellow-800">
                <p>⚠️ Mantenha conexão estável com a internet</p>
                <p>⚠️ Não feche a aba/janela durante a avaliação</p>
              </div>
            </div>

            {/* Tempo Disponível - SIMPLIFICADO */}
            {selectedEvaluation && (
              <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                <h5 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Tempo disponível
                </h5>
                <p className="text-sm text-purple-800">
                  Até {selectedEvaluation.endDateTime ? 
                    format(parseISO(selectedEvaluation.endDateTime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 
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

      {/* Dialog de Resultados */}
      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resultado da Avaliação</DialogTitle>
            <DialogDescription>
              {selectedEvaluation?.title}
            </DialogDescription>
          </DialogHeader>

          {selectedEvaluation?.result && (
            <div className="space-y-4">
              {/* Score principal */}
              <div className="text-center space-y-2">
                <div className={`text-4xl font-bold ${getPerformanceColor(selectedEvaluation.result.percentage)}`}>
                  {selectedEvaluation.result.percentage}%
                </div>
                <p className="text-muted-foreground">
                  Nota: {selectedEvaluation.result.score}/{selectedEvaluation.maxScore}
                </p>
              </div>

              {/* Detalhes */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-green-600">
                    {selectedEvaluation.result.correctAnswers}
                  </div>
                  <p className="text-sm text-muted-foreground">Acertos</p>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-red-600">
                    {selectedEvaluation.result.wrongAnswers}
                  </div>
                  <p className="text-sm text-muted-foreground">Erros</p>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-gray-600">
                    {selectedEvaluation.result.blankAnswers}
                  </div>
                  <p className="text-sm text-muted-foreground">Em branco</p>
                </div>
              </div>

              {/* Informações adicionais */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Tempo gasto:</strong> {Math.floor(selectedEvaluation.result.timeSpent / 60)}min
                </div>
                <div>
                  <strong>Concluída em:</strong> {format(parseISO(selectedEvaluation.result.completedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </div>
              </div>

              {/* Feedback */}
              <Alert>
                <Trophy className="h-4 w-4" />
                <AlertDescription>
                  {selectedEvaluation.result.percentage >= 80
                    ? "Excelente! Você demonstrou ótimo domínio do conteúdo."
                    : selectedEvaluation.result.percentage >= 60
                      ? "Bom trabalho! Continue estudando para melhorar ainda mais."
                      : "Continue se esforçando! Revise o conteúdo e tire suas dúvidas com o professor."
                  }
                </AlertDescription>
              </Alert>
            </div>
          )}
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
