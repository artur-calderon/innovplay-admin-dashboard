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
  Zap
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
  }, []);

  const fetchStudentEvaluations = async () => {
    try {
      setIsLoading(true);

      // Buscar a turma do aluno
      const classResponse = await api.get(`/students/${user?.id}/class`);
      const studentClass: StudentClass = classResponse.data;

      console.log('Resposta da API de turma:', classResponse);
      console.log('Dados da turma:', studentClass);

      if (!studentClass || !studentClass.id) {
        setEvaluations([]);
        toast({
          title: "Nenhuma turma encontrada",
          description: "Você não está matriculado em nenhuma turma no momento.",
          variant: "default",
        });
        return;
      }

      // Buscar todas as avaliações da turma usando o class_id
      try {
        const evaluationsResponse = await api.get(`/test/class/${studentClass.id}/tests/complete`);
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
            id: testData.class_test_info.class_test_id,
            title: testData.test.title || testData.test.description,
            description: testData.test.description,
            subject: testData.test.subject || { id: 'default', name: 'Disciplina' },
            grade: testData.test.grade,
            course: { id: testData.test.course, name: 'Curso' },
            startDateTime: testData.class_test_info.application,
            endDateTime: testData.class_test_info.expiration,
            duration: testData.test.duration || 60, // em minutos
            totalQuestions: testData.total_questions,
            maxScore: testData.total_value,
            type: testData.test.type || 'AVALIACAO',
            model: testData.test.model || 'SAEB',
            status: determineEvaluationStatus({
              startDateTime: testData.class_test_info.application,
              endDateTime: testData.class_test_info.expiration,
              availability: testData.availability,
              class_test_info: testData.class_test_info
            }),
            // Adicionar dados adicionais se disponíveis
            questions: testData.questions,
            availability: testData.availability,
            class_test_info: testData.class_test_info
          };

          return evaluation;
        });

        setEvaluations(evaluationsWithStatus);
      } catch (evaluationsError) {
        console.error(`Erro ao buscar avaliações da turma ${studentClass.id}:`, evaluationsError);
        setEvaluations([]);
        toast({
          title: "Erro ao carregar avaliações",
          description: "Não foi possível carregar as avaliações da turma.",
          variant: "destructive",
        });
      }

      // setEvaluations já é chamado dentro do try/catch acima

    } catch (error) {
      console.error("Erro ao buscar turma ou avaliações:", error);

      // Usar dados mock para desenvolvimento
      const mockEvaluations = getMockEvaluations();
      setEvaluations(mockEvaluations);

      toast({
        title: "Modo de demonstração",
        description: "Exibindo dados de exemplo. Backend não disponível.",
        variant: "default",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const determineEvaluationStatus = (evaluation: any): StudentEvaluation["status"] => {
    const now = new Date();
    const startDate = parseISO(evaluation.startDateTime);
    const endDate = evaluation.endDateTime ? parseISO(evaluation.endDateTime) : null;

    // Verificar se já foi completada
    if (evaluation.result) {
      return "completed";
    }

    // Verificar se está em progresso
    if (evaluation.currentProgress) {
      return "in_progress";
    }

    // Usar informações de disponibilidade da API se disponível
    if (evaluation.availability) {
      if (evaluation.availability.status === 'not_available') {
        return "pending";
      }
      if (evaluation.availability.status === 'available') {
        return "available";
      }
      if (evaluation.availability.status === 'expired') {
        return "expired";
      }
    }

    // Verificar se expirou
    if (endDate && isAfter(now, endDate)) {
      return "expired";
    }

    // Verificar se está disponível
    if (isAfter(now, startDate)) {
      return "available";
    }

    // Ainda não começou
    return "pending";
  };

  const checkInProgressEvaluation = () => {
    const inProgress = localStorage.getItem("evaluation_in_progress");
    if (inProgress) {
      try {
        const data = JSON.parse(inProgress);
        setCurrentTaking(data);
      } catch (error) {
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

    try {
      // Tentar iniciar avaliação no backend
      try {
        const response = await api.post(`/evaluations/${selectedEvaluation.id}/start`);
      } catch (apiError) {
        // Se o backend não estiver disponível, continuar com dados mock
        console.log("Backend não disponível, usando modo mock");
      }

      const takingData: EvaluationTaking = {
        evaluationId: selectedEvaluation.id,
        currentQuestion: 0,
        answers: {},
        timeRemaining: selectedEvaluation.duration * 60, // converter para segundos
        startedAt: new Date().toISOString(),
      };

      // Salvar no localStorage para persistência
      localStorage.setItem("evaluation_in_progress", JSON.stringify(takingData));
      setCurrentTaking(takingData);

      // Buscar os dados completos da avaliação da API antes de redirecionar
      try {
        // Usar o class_test_id da avaliação para buscar os dados completos
        const evaluationResponse = await api.get(`/test/${selectedEvaluation.id}/details`);
        const evaluationData = evaluationResponse.data;

        // Salvar os dados completos da avaliação no sessionStorage
        sessionStorage.setItem("current_evaluation", JSON.stringify(evaluationData));
        console.log("Dados da avaliação salvos:", evaluationData);
      } catch (apiError) {
        console.error("Erro ao buscar dados da avaliação:", apiError);
        // Fallback: salvar apenas os dados básicos
        sessionStorage.setItem("current_evaluation", JSON.stringify(selectedEvaluation));
      }

      setShowInstructions(false);
      setConfirmStart(false);

      toast({
        title: "Avaliação iniciada!",
        description: `Você tem ${selectedEvaluation.duration} minutos para completar`,
      });

      // Redirecionar para tela de avaliação
      window.location.href = `/app/avaliacao/${selectedEvaluation.id}/fazer`;

    } catch (error) {
      console.error("Erro ao iniciar avaliação:", error);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar a avaliação",
        variant: "destructive",
      });
    }
  };

  const handleContinueEvaluation = async (evaluation: StudentEvaluation) => {
    try {
      // Buscar os dados completos da avaliação da API
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
        <h1 className="text-2xl font-bold">Minhas Avaliações</h1>
        <p className="text-muted-foreground">
          Acompanhe suas avaliações agendadas e resultados
        </p>
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
      {currentTaking && (
        <Alert className="border-blue-200 bg-blue-50">
          <Timer className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              Você tem uma avaliação em progresso.
              <strong className="ml-1">
                {evaluations.find(e => e.id === currentTaking.evaluationId)?.title}
              </strong>
            </span>
            <Button
              size="sm"
              onClick={() => handleContinueEvaluation(evaluations.find(e => e.id === currentTaking.evaluationId)!)}
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
                    className="flex-1"
                    onClick={() => handleStartEvaluation(evaluation)}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Iniciar
                  </Button>
                )}

                {evaluation.status === "in_progress" && (
                  <Button
                    className="flex-1"
                    variant="secondary"
                    onClick={() => handleContinueEvaluation(evaluation)}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Continuar
                  </Button>
                )}

                {evaluation.status === "completed" && (
                  <Button
                    className="flex-1"
                    variant="outline"
                    onClick={() => handleViewResults(evaluation)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Resultado
                  </Button>
                )}

                {evaluation.status === "pending" && (
                  <Button className="flex-1" variant="secondary" disabled>
                    <Calendar className="h-4 w-4 mr-2" />
                    Agendada
                  </Button>
                )}

                {evaluation.status === "expired" && (
                  <Button className="flex-1" variant="destructive" disabled>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Instruções da Avaliação</DialogTitle>
            <DialogDescription>
              {selectedEvaluation?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <Target className="h-4 w-4" />
              <AlertDescription>
                Leia atentamente todas as instruções antes de iniciar a avaliação.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Duração:</strong> {selectedEvaluation?.duration} minutos
                </div>
                <div>
                  <strong>Questões:</strong> {selectedEvaluation?.totalQuestions}
                </div>
                <div>
                  <strong>Disciplina:</strong> {selectedEvaluation?.subject.name}
                </div>
                <div>
                  <strong>Tipo:</strong> {selectedEvaluation?.type}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Regras importantes:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                  <li>Uma vez iniciada, a avaliação não pode ser pausada</li>
                  <li>O tempo é cronometrado automaticamente</li>
                  <li>Você pode navegar entre as questões livremente</li>
                  <li>Certifique-se de ter uma conexão estável com a internet</li>
                  <li>Revise suas respostas antes de finalizar</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowInstructions(false)}>
                Cancelar
              </Button>
              <Button onClick={() => setConfirmStart(true)}>
                <Zap className="h-4 w-4 mr-2" />
                Iniciar Avaliação
              </Button>
            </div>
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
