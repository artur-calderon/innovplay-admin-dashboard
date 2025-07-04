import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Clock, ChevronLeft, ChevronRight, Send, Flag, Home, Play, AlertTriangle } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Question {
  id: string;
  number: number;
  type: "multiple_choice" | "true_false" | "essay";
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
  answer: string | null;
  isMarked: boolean;
}

export default function DoEvaluation() {
  const { evaluationId } = useParams<{ evaluationId: string }>();
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
              description: "Restam apenas 5 minutos para finalizar",
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
  }, [timeRemaining, isTimeUp, toast]);

  const loadEvaluationData = async () => {
    try {
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
            text: "Explique como você faria para somar as frações 1/4 + 2/3. Descreva todos os passos.",
            points: 3
          }
        ]
      };
      
      setEvaluationData(mockData);
      setTimeRemaining(90 * 60); // 90 minutos em segundos
    }
  };

  const handleAnswerChange = (questionId: string, answer: string | null) => {
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

      // Enviar respostas para o back-end
      await api.post('/answers', submissionData);

      toast({
        title: "✅ Avaliação enviada com sucesso!",
        description: automatic 
          ? "Sua avaliação foi enviada automaticamente devido ao fim do tempo"
          : "Suas respostas foram salvas com sucesso",
      });

      navigate("/app/avaliacoes");

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

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (!evaluationData) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Carregando avaliação...
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Tela de instruções inicial
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
                <div className="text-sm text-muted-foreground">Salvo automaticamente</div>
              </div>
            </div>

            <div className="prose max-w-none">
              <h3>Instruções Importantes:</h3>
              <ul>
                <li>Leia atentamente cada questão antes de responder</li>
                <li>Você pode navegar entre as questões a qualquer momento</li>
                <li>Use o botão de marcar questão (🚩) para revisões posteriores</li>
                <li>O timer irá contar regressivamente - fique atento ao tempo</li>
                <li>A avaliação será enviada automaticamente quando o tempo acabar</li>
                <li>Após enviar, você não poderá mais alterar suas respostas</li>
              </ul>
            </div>

            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={() => navigate("/")}>
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
  const questionsAnswered = Object.keys(answers).filter(id => answers[id]?.answer !== null && answers[id]?.answer !== "").length;
  const completionPercentage = (questionsAnswered / evaluationData.questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header fixo com informações da avaliação e timer */}
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-semibold">{evaluationData.title}</h1>
              <div className="text-sm text-muted-foreground">
                {evaluationData.subject.name} • Questão {currentQuestionIndex + 1} de {evaluationData.questions.length}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Timer regressivo com alerta visual */}
              <Badge 
                variant={isTimeUp ? "destructive" : timeRemaining <= 300 ? "destructive" : "default"}
                className={`flex items-center gap-1 font-mono text-sm px-3 py-1 ${
                  timeRemaining <= 300 ? 'animate-pulse' : ''
                }`}
              >
                <Clock className="h-4 w-4" />
                {isTimeUp ? "TEMPO ESGOTADO" : formatTime(timeRemaining)}
              </Badge>
              
              {/* Indicador de progresso */}
              <div className="text-right">
                <div className="text-sm font-medium">
                  {Math.round(completionPercentage)}% concluído
                </div>
                <Progress value={completionPercentage} className="w-24 h-2" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Painel de navegação das questões */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Navegação das Questões</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Grid de botões das questões */}
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
                          hasAnswer ? 'bg-green-100 border-green-300 text-green-800' :
                          isMarked ? 'bg-yellow-100 border-yellow-300 text-yellow-800' :
                          'bg-white'
                        }`}
                        onClick={() => setCurrentQuestionIndex(index)}
                        disabled={isTimeUp}
                      >
                        {question.number}
                        {isMarked && (
                          <Flag className="h-3 w-3 absolute -top-1 -right-1 text-orange-500" />
                        )}
                      </Button>
                    );
                  })}
                </div>

                {/* Botão de enviar avaliação */}
                <Button 
                  className="w-full" 
                  onClick={() => setShowSubmitDialog(true)}
                  disabled={isTimeUp || isSubmitting}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Avaliação
                </Button>

                {isTimeUp && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Tempo esgotado! Clique em "Enviar Avaliação"
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Área principal - Exibição da questão atual */}
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
                {/* Questão de múltipla escolha */}
                {currentQuestion.type === "multiple_choice" && (
                  <RadioGroup 
                    value={answers[currentQuestion.id]?.answer as string || ""} 
                    onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                    disabled={isTimeUp}
                  >
                    {currentQuestion.options?.map((option) => (
                      <div key={option.id} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50">
                        <RadioGroupItem value={option.id} id={option.id} />
                        <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                          {option.text}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {/* Questão verdadeiro/falso */}
                {currentQuestion.type === "true_false" && (
                  <RadioGroup 
                    value={answers[currentQuestion.id]?.answer as string || ""} 
                    onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                    disabled={isTimeUp}
                  >
                    <div className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50">
                      <RadioGroupItem value="true" id="true" />
                      <Label htmlFor="true" className="cursor-pointer">✅ Verdadeiro</Label>
                    </div>
                    <div className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50">
                      <RadioGroupItem value="false" id="false" />
                      <Label htmlFor="false" className="cursor-pointer">❌ Falso</Label>
                    </div>
                  </RadioGroup>
                )}

                {/* Questão dissertativa */}
                {currentQuestion.type === "essay" && (
                  <Textarea
                    placeholder="Digite sua resposta aqui..."
                    value={answers[currentQuestion.id]?.answer as string || ""}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    rows={8}
                    disabled={isTimeUp}
                    className="resize-none"
                  />
                )}

                {/* Navegação entre questões */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                    disabled={currentQuestionIndex === 0 || isTimeUp}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>

                  <div className="text-sm text-muted-foreground">
                    {currentQuestionIndex + 1} de {evaluationData.questions.length}
                  </div>

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