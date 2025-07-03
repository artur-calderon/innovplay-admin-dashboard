import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  AlertTriangle,
  CheckCircle,
  List,
  Grid3X3,
  Save,
  Flag,
  Home,
  Play
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { EvaluationTimer } from "./EvaluationTimer";

// Interfaces
interface Question {
  id: string;
  number: number;
  type: "multiple_choice" | "true_false" | "essay" | "multiple_answer";
  text: string;
  imageUrl?: string;
  options?: {
    id: string;
    text: string;
    imageUrl?: string;
  }[];
  correctAnswer?: string | string[];
  points: number;
  difficulty: "easy" | "medium" | "hard";
  subject: string;
  skill: string;
}

interface EvaluationData {
  id: string;
  title: string;
  description: string;
  subject: { id: string; name: string };
  duration: number; // em minutos
  totalQuestions: number;
  maxScore: number;
  instructions: string;
  questions: Question[];
  startedAt: string;
  timeRemaining: number; // em segundos
}

interface Answer {
  questionId: string;
  answer: string | string[] | null;
  timeSpent: number;
  isMarked: boolean;
}

type DisplayMode = "one_by_one" | "all_questions";

export default function TakeEvaluation() {
  const { evaluationId } = useParams<{ evaluationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // Estados principais
  const [evaluationData, setEvaluationData] = useState<EvaluationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [displayMode, setDisplayMode] = useState<DisplayMode>("one_by_one");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saving" | "saved" | "error" | null>(null);

  // Controle de tempo
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const questionStartTimeRef = useRef<number>(Date.now());
  const lastAutoSaveRef = useRef<number>(Date.now());

  // Carregar dados da avaliação
  useEffect(() => {
    if (evaluationId) {
      loadEvaluationData();
    }
  }, [evaluationId]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining > 0 && !isTimeUp) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1;
          
          // Avisos de tempo
          if (newTime === 300) { // 5 minutos
            setShowTimeWarning(true);
            toast({
              title: "⏰ Atenção!",
              description: "Restam apenas 5 minutos para finalizar a avaliação",
              variant: "destructive",
            });
          } else if (newTime === 60) { // 1 minuto
            toast({
              title: "⚠️ Último minuto!",
              description: "A avaliação será enviada automaticamente em 1 minuto",
              variant: "destructive",
            });
          }
          
          if (newTime <= 0) {
            setIsTimeUp(true);
            handleTimeUp();
            return 0;
          }
          
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timeRemaining, isTimeUp]);

  // Auto-save a cada 30 segundos
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (Date.now() - lastAutoSaveRef.current > 30000) { // 30 segundos
        autoSaveProgress();
      }
    }, 5000); // Verificar a cada 5 segundos

    return () => clearInterval(autoSaveInterval);
  }, [answers]);

  const loadEvaluationData = async () => {
    try {
      setIsLoading(true);
      
      // Verificar se há progresso salvo
      const savedProgress = localStorage.getItem(`evaluation_progress_${evaluationId}`);
      
      const [evaluationResponse, progressResponse] = await Promise.all([
        api.get(`/evaluations/${evaluationId}/take`),
        savedProgress ? Promise.resolve({ data: JSON.parse(savedProgress) }) : api.get(`/evaluations/${evaluationId}/progress`)
      ]);

      const evaluation = evaluationResponse.data;
      const progress = progressResponse?.data;

      // Restaurar progresso se existir
      if (progress?.answers) {
        setAnswers(progress.answers);
        setCurrentQuestionIndex(progress.currentQuestionIndex || 0);
        setTimeRemaining(progress.timeRemaining || evaluation.timeRemaining);
      } else {
        setTimeRemaining(evaluation.timeRemaining);
      }

      setEvaluationData(evaluation);
      
    } catch (error) {
      console.error("Erro ao carregar avaliação:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a avaliação",
        variant: "destructive",
      });
      
      // Dados mock para desenvolvimento
      setEvaluationData(getMockEvaluationData());
      setTimeRemaining(90 * 60); // 90 minutos
    } finally {
      setIsLoading(false);
    }
  };

  const autoSaveProgress = async () => {
    if (!evaluationData) return;

    try {
      setAutoSaveStatus("saving");
      
      const progressData = {
        evaluationId: evaluationData.id,
        answers,
        currentQuestionIndex,
        timeRemaining,
        lastUpdate: new Date().toISOString()
      };

      // Salvar localmente
      localStorage.setItem(`evaluation_progress_${evaluationId}`, JSON.stringify(progressData));

      // Tentar salvar no servidor
      await api.post(`/evaluations/${evaluationId}/save-progress`, progressData);
      
      setAutoSaveStatus("saved");
      lastAutoSaveRef.current = Date.now();
      
      setTimeout(() => setAutoSaveStatus(null), 2000);
      
    } catch (error) {
      console.error("Erro no auto-save:", error);
      setAutoSaveStatus("error");
      setTimeout(() => setAutoSaveStatus(null), 3000);
    }
  };

  const handleAnswerChange = useCallback((questionId: string, answer: string | string[] | null) => {
    const timeSpent = Date.now() - questionStartTimeRef.current;
    
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        questionId,
        answer,
        timeSpent: (prev[questionId]?.timeSpent || 0) + timeSpent,
        isMarked: prev[questionId]?.isMarked || false
      }
    }));

    questionStartTimeRef.current = Date.now();
  }, []);

  const handleMarkQuestion = (questionId: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        questionId,
        answer: prev[questionId]?.answer || null,
        timeSpent: prev[questionId]?.timeSpent || 0,
        isMarked: !prev[questionId]?.isMarked
      }
    }));
  };

  const navigateToQuestion = (index: number) => {
    if (index >= 0 && index < (evaluationData?.questions.length || 0)) {
      setCurrentQuestionIndex(index);
      questionStartTimeRef.current = Date.now();
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < (evaluationData?.questions.length || 0) - 1) {
      navigateToQuestion(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      navigateToQuestion(currentQuestionIndex - 1);
    }
  };

  const handleTimeUp = () => {
    toast({
      title: "⏰ Tempo esgotado!",
      description: "A avaliação será enviada automaticamente",
      variant: "destructive",
    });
    
    setTimeout(() => {
      handleSubmitEvaluation(true);
    }, 3000);
  };

  const handleSubmitEvaluation = async (automatic = false) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      
      // Preparar dados para envio
      const submissionData = {
        evaluationId: evaluationData?.id,
        studentId: user?.id,
        answers: Object.values(answers).map(answer => ({
          questionId: answer.questionId,
          answer: answer.answer,
          timeSpent: answer.timeSpent,
          isMarked: answer.isMarked
        })),
        timeSpent: (evaluationData?.duration || 0) * 60 - timeRemaining,
        submittedAt: new Date().toISOString(),
        automatic
      };

      // Enviar para o backend
      const response = await api.post(`/evaluations/${evaluationId}/submit`, submissionData);

      // Limpar dados locais
      localStorage.removeItem(`evaluation_progress_${evaluationId}`);
      localStorage.removeItem("evaluation_in_progress");

      toast({
        title: "✅ Avaliação enviada com sucesso!",
        description: automatic 
          ? "Sua avaliação foi enviada automaticamente devido ao fim do tempo"
          : "Suas respostas foram salvas com sucesso",
      });

      // Redirecionar para resultados ou página inicial
      navigate("/app/avaliacoes", { 
        state: { 
          message: "Avaliação concluída com sucesso!",
          evaluationId: evaluationData?.id
        }
      });

    } catch (error) {
      console.error("Erro ao enviar avaliação:", error);
      toast({
        title: "Erro no envio",
        description: "Não foi possível enviar a avaliação. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setShowSubmitDialog(false);
    }
  };

  const getCompletionPercentage = () => {
    if (!evaluationData) return 0;
    const answeredQuestions = Object.keys(answers).filter(
      id => answers[id]?.answer !== null && answers[id]?.answer !== ""
    ).length;
    return (answeredQuestions / evaluationData.questions.length) * 100;
  };

  const getQuestionStatus = (questionId: string) => {
    const answer = answers[questionId];
    if (!answer || answer.answer === null || answer.answer === "") {
      return "unanswered";
    }
    if (answer.isMarked) {
      return "marked";
    }
    return "answered";
  };

  const getMockEvaluationData = (): EvaluationData => ({
    id: "eval-1",
    title: "Avaliação de Matemática - 1º Bimestre",
    description: "Avaliação sobre números decimais e frações",
    subject: { id: "math", name: "Matemática" },
    duration: 90,
    totalQuestions: 5,
    maxScore: 10,
    instructions: "Leia atentamente cada questão antes de responder. Você pode navegar entre as questões e marcar questões para revisão.",
    questions: [
      {
        id: "q1",
        number: 1,
        type: "multiple_choice",
        text: "Qual é o resultado da operação 2,5 + 3,7?",
        options: [
          { id: "a", text: "5,2" },
          { id: "b", text: "6,2" },
          { id: "c", text: "6,1" },
          { id: "d", text: "5,3" }
        ],
        points: 2,
        difficulty: "easy",
        subject: "Matemática",
        skill: "Operações com decimais"
      },
      {
        id: "q2",
        number: 2,
        type: "true_false",
        text: "A fração 3/4 é equivalente a 0,75.",
        points: 2,
        difficulty: "medium",
        subject: "Matemática",
        skill: "Equivalência de frações"
      },
      {
        id: "q3",
        number: 3,
        type: "multiple_choice",
        text: "Em uma pizza dividida em 8 fatias iguais, se João comeu 3 fatias, que fração da pizza ele comeu?",
        options: [
          { id: "a", text: "3/8" },
          { id: "b", text: "3/5" },
          { id: "c", text: "5/8" },
          { id: "d", text: "8/3" }
        ],
        points: 3,
        difficulty: "medium",
        subject: "Matemática",
        skill: "Frações no cotidiano"
      },
      {
        id: "q4",
        number: 4,
        type: "multiple_answer",
        text: "Quais das seguintes frações são maiores que 1/2? (Marque todas as corretas)",
        options: [
          { id: "a", text: "3/4" },
          { id: "b", text: "2/5" },
          { id: "c", text: "5/8" },
          { id: "d", text: "1/3" }
        ],
        points: 2,
        difficulty: "hard",
        subject: "Matemática",
        skill: "Comparação de frações"
      },
      {
        id: "q5",
        number: 5,
        type: "essay",
        text: "Explique como você faria para somar as frações 1/4 + 2/3. Descreva todos os passos.",
        points: 1,
        difficulty: "hard",
        subject: "Matemática",
        skill: "Operações com frações"
      }
    ],
    startedAt: new Date().toISOString(),
    timeRemaining: 90 * 60
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!evaluationData) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Avaliação não encontrada ou não disponível.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Tela de instruções
  if (showInstructions) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Instruções da Avaliação</CardTitle>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold">{evaluationData.title}</h2>
              <Badge variant="outline">{evaluationData.subject.name}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 border rounded-lg">
                <Clock className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <div className="font-semibold">{evaluationData.duration} minutos</div>
                <div className="text-sm text-muted-foreground">Tempo disponível</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <List className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <div className="font-semibold">{evaluationData.totalQuestions} questões</div>
                <div className="text-sm text-muted-foreground">Total de questões</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <div className="font-semibold">{evaluationData.maxScore} pontos</div>
                <div className="text-sm text-muted-foreground">Pontuação máxima</div>
              </div>
            </div>

            <div className="prose max-w-none">
              <h3>Instruções Importantes:</h3>
              <ul>
                <li>Leia atentamente cada questão antes de responder</li>
                <li>Você pode navegar entre as questões a qualquer momento</li>
                <li>Use o botão de marcar questão para revisões posteriores</li>
                <li>Suas respostas são salvas automaticamente</li>
                <li>O timer irá contar regressivamente - fique atento ao tempo</li>
                <li>A avaliação será enviada automaticamente quando o tempo acabar</li>
              </ul>
              
              {evaluationData.instructions && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4>Instruções específicas:</h4>
                  <p>{evaluationData.instructions}</p>
                </div>
              )}
            </div>

            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={() => navigate("/app/avaliacoes")}>
                <Home className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={() => setShowInstructions(false)} size="lg">
                <Play className="h-4 w-4 mr-2" />
                Iniciar Avaliação
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = evaluationData.questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header fixo */}
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="font-semibold">{evaluationData.title}</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{evaluationData.subject.name}</span>
                  <span>•</span>
                  <span>Questão {currentQuestionIndex + 1} de {evaluationData.totalQuestions}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Status do auto-save */}
              {autoSaveStatus && (
                <div className="flex items-center gap-1 text-sm">
                  {autoSaveStatus === "saving" && (
                    <>
                      <Save className="h-4 w-4 animate-spin text-blue-600" />
                      <span className="text-blue-600">Salvando...</span>
                    </>
                  )}
                  {autoSaveStatus === "saved" && (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">Salvo</span>
                    </>
                  )}
                  {autoSaveStatus === "error" && (
                    <>
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="text-red-600">Erro ao salvar</span>
                    </>
                  )}
                </div>
              )}

              {/* Timer */}
              <EvaluationTimer 
                timeRemaining={timeRemaining}
                isTimeUp={isTimeUp}
                showWarning={showTimeWarning}
              />

              {/* Progresso */}
              <div className="text-right">
                <div className="text-sm font-medium">
                  {Math.round(getCompletionPercentage())}% concluído
                </div>
                <Progress value={getCompletionPercentage()} className="w-24 h-2" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Navegação das questões */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Navegação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Modo de visualização */}
                <Tabs value={displayMode} onValueChange={(value) => setDisplayMode(value as DisplayMode)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="one_by_one" className="text-xs">
                      <List className="h-3 w-3 mr-1" />
                      Uma por vez
                    </TabsTrigger>
                    <TabsTrigger value="all_questions" className="text-xs">
                      <Grid3X3 className="h-3 w-3 mr-1" />
                      Todas
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Grid de questões */}
                <div className="grid grid-cols-5 gap-2">
                  {evaluationData.questions.map((question, index) => {
                    const status = getQuestionStatus(question.id);
                    const isMarked = answers[question.id]?.isMarked;
                    
                    return (
                      <Button
                        key={question.id}
                        variant="outline"
                        size="sm"
                        className={`h-10 relative ${
                          index === currentQuestionIndex ? 'ring-2 ring-blue-500' : ''
                        } ${
                          status === 'answered' ? 'bg-green-100 border-green-300' :
                          status === 'marked' ? 'bg-yellow-100 border-yellow-300' :
                          'bg-white'
                        }`}
                        onClick={() => navigateToQuestion(index)}
                      >
                        {question.number}
                        {isMarked && (
                          <Flag className="h-3 w-3 absolute -top-1 -right-1 text-orange-500" />
                        )}
                      </Button>
                    );
                  })}
                </div>

                {/* Legenda */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                    <span>Respondida</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
                    <span>Marcada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-white border border-gray-300 rounded"></div>
                    <span>Não respondida</span>
                  </div>
                </div>

                {/* Botão de enviar */}
                <Button 
                  className="w-full" 
                  onClick={() => setShowSubmitDialog(true)}
                  disabled={isTimeUp || isSubmitting}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Avaliação
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Área principal */}
          <div className="lg:col-span-3">
            {displayMode === "one_by_one" ? (
              <QuestionCard 
                question={currentQuestion}
                answer={answers[currentQuestion.id]}
                onAnswerChange={handleAnswerChange}
                onMarkQuestion={handleMarkQuestion}
                onNext={handleNextQuestion}
                onPrevious={handlePreviousQuestion}
                canGoNext={currentQuestionIndex < evaluationData.questions.length - 1}
                canGoPrevious={currentQuestionIndex > 0}
                isTimeUp={isTimeUp}
              />
            ) : (
              <AllQuestionsView 
                questions={evaluationData.questions}
                answers={answers}
                onAnswerChange={handleAnswerChange}
                onMarkQuestion={handleMarkQuestion}
                isTimeUp={isTimeUp}
              />
            )}
          </div>
        </div>
      </div>

      {/* Dialog de confirmação de envio */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar envio da avaliação</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem certeza que deseja enviar sua avaliação? 
              
              <div className="mt-4 space-y-2">
                <div>Questões respondidas: {Object.keys(answers).filter(id => answers[id]?.answer !== null && answers[id]?.answer !== "").length} de {evaluationData.totalQuestions}</div>
                <div>Tempo restante: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}</div>
              </div>

              <div className="mt-4 text-sm text-orange-600">
                ⚠️ Após enviar, você não poderá mais alterar suas respostas.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleSubmitEvaluation(false)}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Enviando..." : "Confirmar Envio"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Warning de tempo */}
      <Dialog open={showTimeWarning} onOpenChange={setShowTimeWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <Clock className="h-5 w-5" />
              Atenção: Tempo Limitado
            </DialogTitle>
            <DialogDescription>
              Restam poucos minutos para finalizar sua avaliação. 
              Revise suas respostas e envie quando estiver pronto.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => setShowTimeWarning(false)}>
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente para exibir uma questão
function QuestionCard({ 
  question, 
  answer, 
  onAnswerChange, 
  onMarkQuestion, 
  onNext, 
  onPrevious, 
  canGoNext, 
  canGoPrevious,
  isTimeUp 
}: {
  question: Question;
  answer?: Answer;
  onAnswerChange: (questionId: string, answer: string | string[] | null) => void;
  onMarkQuestion: (questionId: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  isTimeUp: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <Badge variant="outline">Questão {question.number}</Badge>
              <Badge variant="secondary">{question.points} ponto{question.points !== 1 ? 's' : ''}</Badge>
              <Badge 
                variant="outline" 
                className={
                  question.difficulty === 'easy' ? 'border-green-300 text-green-700' :
                  question.difficulty === 'medium' ? 'border-yellow-300 text-yellow-700' :
                  'border-red-300 text-red-700'
                }
              >
                {question.difficulty === 'easy' ? 'Avançado' : 
                 question.difficulty === 'medium' ? 'Adequado' : 
                 question.difficulty === 'basic' ? 'Básico' : 'Abaixo do Básico'}
              </Badge>
            </div>
            <CardTitle className="text-base leading-relaxed">
              {question.text}
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMarkQuestion(question.id)}
            className={answer?.isMarked ? 'text-orange-600' : ''}
            disabled={isTimeUp}
          >
            <Flag className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {question.imageUrl && (
          <img 
            src={question.imageUrl} 
            alt="Imagem da questão" 
            className="max-w-full h-auto rounded-lg border"
          />
        )}

        {/* Opções de resposta */}
        <QuestionOptions 
          question={question}
          answer={answer?.answer}
          onAnswerChange={(newAnswer) => onAnswerChange(question.id, newAnswer)}
          disabled={isTimeUp}
        />

        {/* Navegação */}
        <div className="flex justify-between pt-4">
          <Button 
            variant="outline" 
            onClick={onPrevious}
            disabled={!canGoPrevious || isTimeUp}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>

          <Button 
            onClick={onNext}
            disabled={!canGoNext || isTimeUp}
          >
            Próxima
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Componente para opções de resposta
function QuestionOptions({ 
  question, 
  answer, 
  onAnswerChange, 
  disabled 
}: {
  question: Question;
  answer?: string | string[] | null;
  onAnswerChange: (answer: string | string[] | null) => void;
  disabled: boolean;
}) {
  if (question.type === "multiple_choice") {
    return (
      <RadioGroup 
        value={answer as string || ""} 
        onValueChange={onAnswerChange}
        disabled={disabled}
      >
        {question.options?.map((option) => (
          <div key={option.id} className="flex items-center space-x-2">
            <RadioGroupItem value={option.id} id={option.id} />
            <Label htmlFor={option.id} className="flex-1 cursor-pointer">
              {option.text}
              {option.imageUrl && (
                <img 
                  src={option.imageUrl} 
                  alt="Opção" 
                  className="mt-2 max-w-xs h-auto rounded border"
                />
              )}
            </Label>
          </div>
        ))}
      </RadioGroup>
    );
  }

  if (question.type === "true_false") {
    return (
      <RadioGroup 
        value={answer as string || ""} 
        onValueChange={onAnswerChange}
        disabled={disabled}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="true" id="true" />
          <Label htmlFor="true" className="cursor-pointer">Verdadeiro</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="false" id="false" />
          <Label htmlFor="false" className="cursor-pointer">Falso</Label>
        </div>
      </RadioGroup>
    );
  }

  if (question.type === "multiple_answer") {
    const selectedAnswers = Array.isArray(answer) ? answer : [];
    
    return (
      <div className="space-y-2">
        {question.options?.map((option) => (
          <div key={option.id} className="flex items-center space-x-2">
            <Checkbox 
              id={option.id}
              checked={selectedAnswers.includes(option.id)}
              onCheckedChange={(checked) => {
                const newAnswers = checked
                  ? [...selectedAnswers, option.id]
                  : selectedAnswers.filter(id => id !== option.id);
                onAnswerChange(newAnswers);
              }}
              disabled={disabled}
            />
            <Label htmlFor={option.id} className="flex-1 cursor-pointer">
              {option.text}
            </Label>
          </div>
        ))}
      </div>
    );
  }

  if (question.type === "essay") {
    return (
      <Textarea
        placeholder="Digite sua resposta aqui..."
        value={answer as string || ""}
        onChange={(e) => onAnswerChange(e.target.value)}
        rows={6}
        disabled={disabled}
      />
    );
  }

  return null;
}

// Componente para visualizar todas as questões
function AllQuestionsView({ 
  questions, 
  answers, 
  onAnswerChange, 
  onMarkQuestion,
  isTimeUp 
}: {
  questions: Question[];
  answers: Record<string, Answer>;
  onAnswerChange: (questionId: string, answer: string | string[] | null) => void;
  onMarkQuestion: (questionId: string) => void;
  isTimeUp: boolean;
}) {
  return (
    <div className="space-y-6">
      {questions.map((question) => (
        <QuestionCard
          key={question.id}
          question={question}
          answer={answers[question.id]}
          onAnswerChange={onAnswerChange}
          onMarkQuestion={onMarkQuestion}
          onNext={() => {}}
          onPrevious={() => {}}
          canGoNext={false}
          canGoPrevious={false}
          isTimeUp={isTimeUp}
        />
      ))}
    </div>
  );
} 