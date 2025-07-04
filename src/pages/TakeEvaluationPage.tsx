import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Clock, ChevronLeft, ChevronRight, Send, Flag, Home, Play } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Question {
  id: string;
  number: number;
  type: "multiple_choice" | "true_false" | "essay" | "multiple_answer";
  text: string;
  options?: { id: string; text: string; }[];
  points: number;
}

interface EvaluationData {
  id: string;
  title: string;
  subject: { name: string };
  duration: number;
  questions: Question[];
}

interface Answer {
  questionId: string;
  answer: string | string[] | null;
  isMarked: boolean;
}

export default function TakeEvaluationPage() {
  const { id: evaluationId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [evaluationData, setEvaluationData] = useState<EvaluationData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadEvaluationData();
  }, [evaluationId]);

  useEffect(() => {
    if (timeRemaining > 0 && !isTimeUp) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1;
          
          if (newTime === 300) {
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
      // Tentar carregar dados reais
      const response = await api.get(`/evaluations/${evaluationId}/take`);
      setEvaluationData(response.data);
      setTimeRemaining(response.data.timeRemaining);
    } catch (error) {
      // Dados mock para desenvolvimento
      const mockData: EvaluationData = {
        id: "eval-1",
        title: "Avaliação de Matemática - 1º Bimestre",
        subject: { name: "Matemática" },
        duration: 90,
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
            points: 2
          },
          {
            id: "q2",
            number: 2,
            type: "true_false",
            text: "A fração 3/4 é equivalente a 0,75.",
            points: 2
          },
          {
            id: "q3",
            number: 3,
            type: "essay",
            text: "Explique como você faria para somar as frações 1/4 + 2/3.",
            points: 3
          }
        ]
      };
      
      setEvaluationData(mockData);
      setTimeRemaining(90 * 60); // 90 minutos
    }
  };

  const handleAnswerChange = (questionId: string, answer: string | string[] | null) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        questionId,
        answer,
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
        isMarked: !prev[questionId]?.isMarked
      }
    }));
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
        answers: Object.values(answers),
        submittedAt: new Date().toISOString(),
        automatic
      };

      // Enviar para o backend - POST /answers
      await api.post(`/evaluations/${evaluationId}/answers`, submissionData);

      toast({
        title: "✅ Avaliação enviada com sucesso!",
        description: automatic 
          ? "Sua avaliação foi enviada automaticamente"
          : "Suas respostas foram salvas",
      });

      navigate("/app/avaliacoes");

    } catch (error) {
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

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (!evaluationData) {
    return <div className="p-4">Carregando avaliação...</div>;
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
                <div className="font-semibold">{evaluationData.questions.length} questões</div>
                <div className="text-sm text-muted-foreground">Total de questões</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="font-semibold">Auto-save</div>
                <div className="text-sm text-muted-foreground">Respostas salvas automaticamente</div>
              </div>
            </div>

            <div className="text-center">
              <p className="mb-4">Leia atentamente cada questão antes de responder. Você pode navegar entre as questões e marcar questões para revisão.</p>
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
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-semibold">{evaluationData.title}</h1>
              <div className="text-sm text-muted-foreground">
                Questão {currentQuestionIndex + 1} de {evaluationData.questions.length}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Badge 
                variant={timeRemaining <= 300 ? "destructive" : "default"}
                className={`flex items-center gap-1 font-mono text-sm px-3 py-1 ${
                  timeRemaining <= 300 ? 'animate-pulse' : ''
                }`}
              >
                <Clock className="h-4 w-4" />
                {isTimeUp ? "TEMPO ESGOTADO" : formatTime(timeRemaining)}
              </Badge>
              
              <div className="text-right">
                <div className="text-sm font-medium">
                  {Math.round((Object.keys(answers).length / evaluationData.questions.length) * 100)}% concluído
                </div>
                <Progress 
                  value={(Object.keys(answers).length / evaluationData.questions.length) * 100} 
                  className="w-24 h-2" 
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Navegação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
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
                        onClick={() => setCurrentQuestionIndex(index)}
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
                {currentQuestion.type === "multiple_choice" && (
                  <RadioGroup 
                    value={answers[currentQuestion.id]?.answer as string || ""} 
                    onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                    disabled={isTimeUp}
                  >
                    {currentQuestion.options?.map((option) => (
                      <div key={option.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={option.id} id={option.id} />
                        <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                          {option.text}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {currentQuestion.type === "true_false" && (
                  <RadioGroup 
                    value={answers[currentQuestion.id]?.answer as string || ""} 
                    onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                    disabled={isTimeUp}
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
                )}

                {currentQuestion.type === "essay" && (
                  <Textarea
                    placeholder="Digite sua resposta aqui..."
                    value={answers[currentQuestion.id]?.answer as string || ""}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    rows={6}
                    disabled={isTimeUp}
                  />
                )}

                <div className="flex justify-between pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                    disabled={currentQuestionIndex === 0 || isTimeUp}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>

                  <Button 
                    onClick={() => setCurrentQuestionIndex(Math.min(evaluationData.questions.length - 1, currentQuestionIndex + 1))}
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

      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar envio da avaliação</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem certeza que deseja enviar sua avaliação?
              
              <div className="mt-4 space-y-2">
                <div>Questões respondidas: {Object.keys(answers).length} de {evaluationData.questions.length}</div>
                <div>Tempo restante: {formatTime(timeRemaining)}</div>
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