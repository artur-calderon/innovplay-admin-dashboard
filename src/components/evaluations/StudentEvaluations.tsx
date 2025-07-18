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
  status: "available" | "not_available" | "not_yet_available" | "expired" | "completed";
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
  const [canStartReason, setCanStartReason] = useState<string>("");

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchStudentEvaluations();
    checkInProgressEvaluation();

    // Atualizar status das avaliações periodicamente
    const interval = setInterval(() => {
      updateEvaluationStatuses();
    }, 60000); // Atualizar a cada minuto

    return () => clearInterval(interval);
  }, []);

  // ✅ CORRIGIDO: Função para atualizar status das avaliações em tempo real
  const updateEvaluationStatuses = async () => {
    try {
      // Buscar status atualizado de todas as avaliações
      const response = await api.get('/test/my-class/tests');
      const updatedTests = response.data.tests || [];

      setEvaluations(currentEvaluations => {
        return currentEvaluations.map(evaluation => {
          // ✅ CORRIGIDO: Verificar se updatedTest existe e usar test_id
          const updatedTest = updatedTests.find((test: any) =>
            test.test_id === evaluation.id
          );
          if (updatedTest && updatedTest.availability && updatedTest.student_status) {
            return {
              ...evaluation,
              availability: updatedTest.availability,
              student_status: updatedTest.student_status
            };
          }
          return evaluation;
        });
      });
    } catch (error) {
      console.error('Erro ao atualizar status das avaliações:', error);
    }
  };

  const fetchStudentEvaluations = async () => {
    console.log('🚀 Iniciando busca de avaliações...');
    try {
      setIsLoading(true);

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
      testsData.forEach((testData: any, index: number) => {
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
      const filteredTests = testsData.filter((testData: any) => {
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
      const evaluationsWithStatus = filteredTests.map((testData: any) => {
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

    } catch (error) {
      console.error("❌ Erro ao buscar avaliações do aluno:", error);
      console.error("Detalhes do erro:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack
      });

      setEvaluations([]);

      toast({
        title: "Erro ao carregar avaliações",
        description: "Não foi possível carregar suas avaliações. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkInProgressEvaluation = () => {
    const inProgress = localStorage.getItem("evaluation_in_progress");
    if (inProgress) {
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
    }
  };

  const handleStartEvaluation = async (evaluation: StudentEvaluation) => {
    setSelectedEvaluation(evaluation);

    // ✅ NOVO: Verificar se pode iniciar usando o endpoint can-start
    try {
      const response = await api.get(`/student-answers/student/${evaluation.id}/can-start`);
      const canStartData = response.data;

      if (canStartData.can_start) {
        setShowInstructions(true);
      } else {
        // ✅ NOVO: Mostrar mensagem de erro usando o reason
        setCanStartReason(canStartData.reason || "Não foi possível iniciar a avaliação");
        toast({
          title: "Não é possível iniciar",
          description: canStartData.reason || "Não foi possível iniciar a avaliação",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao verificar se pode iniciar:", error);
      toast({
        title: "Erro",
        description: "Erro ao verificar disponibilidade da avaliação",
        variant: "destructive",
      });
    }
  };

  const handleConfirmStart = async () => {
    if (!selectedEvaluation) return;

    console.log("🚀 Iniciando avaliação:", {
      evaluationId: selectedEvaluation.id,
      title: selectedEvaluation.title
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
    console.log("🔄 Continuando avaliação:", evaluation.id);

    try {
      // Buscar dados da avaliação usando a API real
      const evaluationResponse = await api.get(`/test/${evaluation.id}/details`);
      const evaluationData = evaluationResponse.data;

      // Salvar os dados da avaliação no sessionStorage
      sessionStorage.setItem("current_evaluation", JSON.stringify(evaluationData));

      console.log("📁 Dados da avaliação carregados:", evaluationData);

      // Redirecionar para tela de avaliação
      window.location.href = `/app/avaliacao/${evaluation.id}/fazer`;

    } catch (error: any) {
      console.error("❌ Erro ao continuar avaliação:", error);

      let errorMessage = "Não foi possível continuar a avaliação";

      if (error.response?.status === 403) {
        errorMessage = "Você não tem permissão para acessar esta avaliação";
      } else if (error.response?.status === 404) {
        errorMessage = "Avaliação não encontrada";
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

  const handleViewResults = async (evaluation: StudentEvaluation) => {
    setSelectedEvaluation(evaluation);
    setShowResults(true);

    // Buscar resultados detalhados do aluno
    try {
      const response = await api.get(`/evaluation-results/${evaluation.id}/student/${user?.id}/results?include_answers=true`);
      console.log('Resultados detalhados:', response.data);

      // Atualizar tanto o selectedEvaluation quanto o estado evaluations
      const updatedEvaluation = { ...evaluation, detailedResults: response.data };
      setSelectedEvaluation(updatedEvaluation);

      setEvaluations(currentEvaluations =>
        currentEvaluations.map(evaluationItem =>
          evaluationItem.id === evaluation.id
            ? updatedEvaluation
            : evaluationItem
        )
      );
    } catch (error) {
      console.error('Erro ao buscar resultados detalhados:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os resultados detalhados",
        variant: "destructive",
      });
    }
  };

  // ✅ NOVO: Função para obter badge baseado no student_status
  const getStatusBadge = (evaluation: StudentEvaluation) => {
    const { student_status } = evaluation;

    if (student_status.has_completed) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Concluída
        </Badge>
      );
    }

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
      case 'expirada':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Expirada
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
            <Eye className="h-3 w-3" />
            Revisada
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Disponível
          </Badge>
        );
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
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Disponíveis</p>
                <p className="text-2xl font-bold text-blue-600">
                  {evaluations.filter(e => e.availability.is_available && !e.student_status.has_completed && e.student_status.can_start).length}
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
                    {format(parseISO(evaluation.startDateTime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </div>

              {/* Resultado se concluída */}
              {evaluation.student_status.has_completed && (
                <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Resultado</span>
                    <Badge
                      variant="secondary"
                      className={`${getPerformanceColor(evaluation.student_status.score || 0)} bg-transparent border`}
                    >
                      {evaluation.student_status.score || 0}%
                    </Badge>
                  </div>
                  {evaluation.student_status.grade && (
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">
                        Nota: {evaluation.student_status.grade}/10
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Ações */}
              <div className="flex gap-2">
                {/* ✅ NOVO: Botão "Iniciar" só mostrar se can_start === true */}
                {evaluation.availability.is_available &&
                  !evaluation.student_status.has_completed &&
                  evaluation.student_status.can_start && (
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => handleStartEvaluation(evaluation)}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Iniciar Avaliação
                    </Button>
                  )}

                {/* ✅ NOVO: Botão "Continuar" se status === "em_andamento" */}
                {evaluation.student_status.status === "em_andamento" && (
                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    onClick={() => handleContinueEvaluation(evaluation)}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Continuar
                  </Button>
                )}

                {/* ✅ NOVO: Botão "Concluída" se has_completed === true */}
                {evaluation.student_status.has_completed && (
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

                {/* ✅ NOVO: Botão "Expirada" se status === "expirada" */}
                {evaluation.student_status.status === "expirada" && (
                  <Button className="flex-1 bg-red-600 hover:bg-red-700" disabled>
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Expirada
                  </Button>
                )}

                {/* ✅ NOVO: Botão "Indisponível" se não pode iniciar */}
                {evaluation.availability.is_available &&
                  !evaluation.student_status.has_completed &&
                  !evaluation.student_status.can_start && (
                    <Button className="flex-1 bg-gray-600 hover:bg-gray-700" disabled>
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
                  <span className="font-medium">Disciplina{selectedEvaluation?.subjects_info && selectedEvaluation.subjects_info.length > 1 ? 's' : ''}:</span>
                  <p>{selectedEvaluation ? getAllSubjects(selectedEvaluation) : ''}</p>
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resultado da Avaliação</DialogTitle>
            <DialogDescription>
              {selectedEvaluation?.title}
            </DialogDescription>
          </DialogHeader>

          {selectedEvaluation?.detailedResults ? (
            <div className="space-y-6">
              {/* Score principal */}
              <div className="text-center space-y-2 p-4 bg-gray-50 rounded-lg">
                <div className={`text-4xl font-bold ${getPerformanceColor(selectedEvaluation.detailedResults.score_percentage)}`}>
                  {selectedEvaluation.detailedResults.score_percentage}%
                </div>
                <p className="text-muted-foreground">
                  Nota: {selectedEvaluation.detailedResults.total_score}/{selectedEvaluation.detailedResults.max_possible_score}
                </p>
              </div>

              {/* Detalhes */}
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-blue-600">
                    {selectedEvaluation.detailedResults.total_questions}
                  </div>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-green-600">
                    {selectedEvaluation.detailedResults.correct_answers}
                  </div>
                  <p className="text-sm text-muted-foreground">Acertos</p>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-red-600">
                    {selectedEvaluation.detailedResults.total_questions - selectedEvaluation.detailedResults.correct_answers}
                  </div>
                  <p className="text-sm text-muted-foreground">Erros</p>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-gray-600">
                    {selectedEvaluation.detailedResults.total_questions - selectedEvaluation.detailedResults.answered_questions}
                  </div>
                  <p className="text-sm text-muted-foreground">Em branco</p>
                </div>
              </div>

              {/* Respostas detalhadas */}
              {selectedEvaluation.detailedResults.answers && selectedEvaluation.detailedResults.answers.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Respostas Detalhadas ({selectedEvaluation.detailedResults.answers.length} questões)</h3>
                  <div className="space-y-4">
                    {selectedEvaluation.detailedResults.answers.map((answer, index) => (
                      <Card key={answer.question_id} className="p-4">
                        <div className="space-y-3">
                          {/* Cabeçalho da questão */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">Questão {answer.question_number}</Badge>
                              <Badge variant="secondary">{answer.question_value} ponto{(answer.question_value !== 1) ? 's' : ''}</Badge>
                              <Badge variant={answer.question_type === 'essay' ? 'default' : 'outline'}>
                                {answer.question_type === 'essay' ? 'Dissertativa' : 'Múltipla Escolha'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              {answer.is_correct === true && (
                                <Badge className="bg-green-100 text-green-800 border-green-300">
                                  ✓ Correta
                                </Badge>
                              )}
                              {answer.is_correct === false && (
                                <Badge className="bg-red-100 text-red-800 border-red-300">
                                  ✗ Incorreta
                                </Badge>
                              )}
                              {answer.is_correct === null && answer.student_answer && (
                                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                                  ⏳ Aguardando correção
                                </Badge>
                              )}
                              {answer.score !== null && (
                                <Badge variant="outline">
                                  {answer.score}/{answer.question_value}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Enunciado da questão */}
                          <div className="text-sm text-gray-700">
                            <div dangerouslySetInnerHTML={{ __html: answer.question_text }} />
                          </div>

                          {/* Resposta do aluno */}
                          <div className="space-y-2">
                            <div className="text-sm font-medium text-gray-700">Sua resposta:</div>
                            {answer.student_answer ? (
                              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                {answer.question_type === 'essay' ? (
                                  <div className="whitespace-pre-wrap">{answer.student_answer}</div>
                                ) : (
                                  <div className="font-medium">Alternativa: {answer.student_answer}</div>
                                )}
                              </div>
                            ) : (
                              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 italic">
                                Questão não respondida
                              </div>
                            )}
                          </div>

                          {/* Feedback do professor (se houver) */}
                          {answer.feedback && (
                            <div className="space-y-2">
                              <div className="text-sm font-medium text-gray-700">Feedback do professor:</div>
                              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                                {answer.feedback}
                              </div>
                            </div>
                          )}

                          {/* Informações adicionais */}
                          <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                            {answer.answered_at && (
                              <div>
                                <span className="font-medium">Respondida em:</span> {format(parseISO(answer.answered_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </div>
                            )}
                            {answer.corrected_at && (
                              <div>
                                <span className="font-medium">Corrigida em:</span> {format(parseISO(answer.corrected_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">Nenhuma resposta detalhada disponível</p>
                </div>
              )}

              {/* Feedback geral */}
              <Alert>
                <Trophy className="h-4 w-4" />
                <AlertDescription>
                  {selectedEvaluation.detailedResults.score_percentage >= 80
                    ? "Excelente! Você demonstrou ótimo domínio do conteúdo."
                    : selectedEvaluation.detailedResults.score_percentage >= 60
                      ? "Bom trabalho! Continue estudando para melhorar ainda mais."
                      : "Continue se esforçando! Revise o conteúdo e tire suas dúvidas com o professor."
                  }
                </AlertDescription>
              </Alert>
            </div>
          ) : selectedEvaluation?.student_status?.score ? (
            <div className="space-y-4">
              {/* Fallback para resultados básicos */}
              <div className="text-center space-y-2">
                <div className={`text-4xl font-bold ${getPerformanceColor(selectedEvaluation.student_status.score)}`}>
                  {selectedEvaluation.student_status.score}%
                </div>
                {selectedEvaluation.student_status.grade && (
                  <p className="text-muted-foreground">
                    Nota: {selectedEvaluation.student_status.grade}/10
                  </p>
                )}
              </div>

              <Alert>
                <Trophy className="h-4 w-4" />
                <AlertDescription>
                  {selectedEvaluation.student_status.score >= 80
                    ? "Excelente! Você demonstrou ótimo domínio do conteúdo."
                    : selectedEvaluation.student_status.score >= 60
                      ? "Bom trabalho! Continue estudando para melhorar ainda mais."
                      : "Continue se esforçando! Revise o conteúdo e tire suas dúvidas com o professor."
                  }
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Carregando resultados...</p>
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
