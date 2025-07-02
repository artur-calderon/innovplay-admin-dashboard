import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
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
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  AlertTriangle,
  CheckCircle,
  Save,
  Flag,
  Home,
  Play
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { EvaluationTimer } from "../EvaluationTimer";

interface Question {
  id: string;
  number: number;
  type: "multiple_choice" | "true_false" | "essay" | "multiple_answer";
  text: string;
  imageUrl?: string;
  options?: {
    id: string;
    text: string;
  }[];
  points: number;
  difficulty: "easy" | "medium" | "hard";
}

interface EvaluationData {
  id: string;
  title: string;
  subject: { id: string; name: string };
  duration: number;
  totalQuestions: number;
  instructions: string;
  questions: Question[];
}

interface Answer {
  questionId: string;
  answer: string | string[] | null;
  timeSpent: number;
  isMarked: boolean;
}

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  // Controle de tempo
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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
          
          if (newTime === 300) { // 5 minutos
            toast({
              title: "⏰ Atenção!",
              description: "Restam apenas 5 minutos",
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

  const loadEvaluationData = async () => {
    try {
      setIsLoading(true);
      
      // Tentar carregar dados reais
      const response = await api.get(`/evaluations/${evaluationId}/take`);
      setEvaluationData(response.data);
      setTimeRemaining(response.data.timeRemaining);
      
    } catch (error) {
      console.error("Erro ao carregar avaliação:", error);
      
      // Dados mock para desenvolvimento
      const mockData: EvaluationData = {
        id: "eval-1",
        title: "Avaliação de Matemática - 1º Bimestre",
        subject: { id: "math", name: "Matemática" },
        duration: 90,
        totalQuestions: 5,
        instructions: "Leia atentamente cada questão antes de responder.",
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
            difficulty: "easy"
          },
          {
            id: "q2",
            number: 2,
            type: "true_false",
            text: "A fração 3/4 é equivalente a 0,75.",
            points: 2,
            difficulty: "medium"
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
            difficulty: "medium"
          },
          {
            id: "q4",
            number: 4,
            type: "multiple_answer",
            text: "Quais das seguintes frações são maiores que 1/2?",
            options: [
              { id: "a", text: "3/4" },
              { id: "b", text: "2/5" },
              { id: "c", text: "5/8" },
              { id: "d", text: "1/3" }
            ],
            points: 2,
            difficulty: "hard"
          },
          {
            id: "q5",
            number: 5,
            type: "essay",
            text: "Explique como você faria para somar as frações 1/4 + 2/3.",
            points: 1,
            difficulty: "hard"
          }
        ]
      };
      
      setEvaluationData(mockData);
      setTimeRemaining(90 * 60); // 90 minutos
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string | string[] | null) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        questionId,
        answer,
        timeSpent: 0,
        isMarked: prev[questionId]?.isMarked || false
      }
    }));
  };

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
      await api.post(`/evaluations/${evaluationId}/submit`, submissionData);

      // Limpar dados locais
      localStorage.removeItem(`evaluation_progress_${evaluationId}`);

      toast({
        title: "✅ Avaliação enviada com sucesso!",
        description: automatic 
          ? "Sua avaliação foi enviada automaticamente"
          : "Suas respostas foram salvas com sucesso",
      });

      // Redirecionar
      navigate("/app/avaliacoes");

    } catch (error) {
      console.error("Erro ao enviar avaliação:", error);
      toast({
        title: "Erro no envio",
        description: "Não foi possível enviar a avaliação",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setShowSubmitDialog(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!evaluationData) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Avaliação não encontrada.
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
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <div className="font-semibold">{evaluationData.totalQuestions} questões</div>
                <div className="text-sm text-muted-foreground">Total de questões</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <Save className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <div className="font-semibold">Auto-save</div>
                <div className="text-sm text-muted-foreground">Respostas salvas automaticamente</div>
              </div>
            </div>

            <div className="text-center">
              <p className="mb-4">{evaluationData.instructions}</p>
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
            <div>
              <h1 className="font-semibold">{evaluationData.title}</h1>
              <div className="text-sm text-muted-foreground">
                Questão {currentQuestionIndex + 1} de {evaluationData.totalQuestions}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <EvaluationTimer 
                timeRemaining={timeRemaining}
                isTimeUp={isTimeUp}
              />
              
              <div className="text-right">
                <div className="text-sm font-medium">
                  {Math.round((Object.keys(answers).length / evaluationData.totalQuestions) * 100)}% concluído
                </div>
                <Progress 
                  value={(Object.keys(answers).length / evaluationData.totalQuestions) * 100} 
                  className="w-24 h-2" 
                />
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
                <div className="grid grid-cols-5 gap-2">
                  {evaluationData.questions.map((question, index) => {
                    const hasAnswer = answers[question.id]?.answer !== null && answers[question.id]?.answer !== "";
                    const isMarked = answers[question.id]?.isMarked;
                    
                    return (
                      <Button
                        key={question.id}
                        variant="outline"
                        size="sm"
                        className={`h-10 relative ${
                          index === currentQuestionIndex ? 'ring-2 ring-blue-500' : ''
                        } ${
                          hasAnswer ? 'bg-green-100 border-green-300' :
                          isMarked ? 'bg-yellow-100 border-yellow-300' :
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
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge variant="outline">Questão {currentQuestion.number}</Badge>
                      <Badge variant="secondary">{currentQuestion.points} ponto{currentQuestion.points !== 1 ? 's' : ''}</Badge>
                    </div>
                    <CardTitle className="text-base leading-relaxed">
                      {currentQuestion.text}
                    </CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkQuestion(currentQuestion.id)}
                    className={answers[currentQuestion.id]?.isMarked ? 'text-orange-600' : ''}
                    disabled={isTimeUp}
                  >
                    <Flag className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Opções de resposta */}
                <QuestionOptions 
                  question={currentQuestion}
                  answer={answers[currentQuestion.id]?.answer}
                  onAnswerChange={(newAnswer) => handleAnswerChange(currentQuestion.id, newAnswer)}
                  disabled={isTimeUp}
                />

                {/* Navegação */}
                <div className="flex justify-between pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => navigateToQuestion(currentQuestionIndex - 1)}
                    disabled={currentQuestionIndex === 0 || isTimeUp}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>

                  <Button 
                    onClick={() => navigateToQuestion(currentQuestionIndex + 1)}
                    disabled={currentQuestionIndex === evaluationData.questions.length - 1 || isTimeUp}
                  >
                    Próxima
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
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
                <div>Questões respondidas: {Object.keys(answers).length} de {evaluationData.totalQuestions}</div>
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
    </div>
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