import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Clock, ChevronLeft, ChevronRight, Send, Flag, Home, Play, AlertTriangle, CheckCircle, X } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Question {
  id: string;
  number: number;
  type: "multiple_choice" | "true_false" | "essay" | "open" | "textual" | "dissertativa" | string;
  text: string;
  secondStatement?: string; // Segundo enunciado
  images?: Array<{
    id: string;
    name: string;
    type: string;
    url?: string;
    data?: string;
  }>; // Array de imagens
  options?: { id: string; text: string; isCorrect?: boolean; }[];
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

// Componente simples para renderizar HTML das questões
const QuestionContent = ({ content, questionId }: { content: string | null | undefined; questionId: string }) => {
  if (!content || content.trim() === '') {
    return null;
  }

  // Limpar e otimizar o HTML para evitar duplicações
  const cleanContent = content
    // Remover possíveis duplicações no próprio HTML
    .replace(/(<p[^>]*>.*?<\/p>)\s*\1/gi, '$1')
    // Remover parágrafos vazios
    .replace(/<p[^>]*>\s*<\/p>/gi, '')
    // Garantir que imagens tenham estilos corretos
    .replace(/<img([^>]*?)>/g, '<img$1 style="max-width: 100%; height: auto; object-fit: contain; display: block; margin: 1rem 0;">')
    // Limpar espaços extras e quebras de linha desnecessárias
    .replace(/\s+/g, ' ')
    .trim();

  return (
    <span 
      key={`question-content-${questionId}`}
      className="prose prose-sm max-w-none question-content text-base leading-relaxed text-gray-800 block"
      dangerouslySetInnerHTML={{ __html: cleanContent }}
    />
  );
};

export default function DoEvaluation() {
  const { id: evaluationId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [evaluationData, setEvaluationData] = useState<EvaluationData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [questionKey, setQuestionKey] = useState(0); // Para forçar re-renderização

  // Forçar re-renderização quando a questão mudar
  useEffect(() => {
    setQuestionKey(prev => prev + 1);
  }, [currentQuestionIndex]);

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
      const response = await api.get(`/test/${evaluationId}/details`);
      
      // Adaptar os dados do backend para o formato esperado pelo componente
      const adaptedData: EvaluationData = {
        id: response.data.id,
        title: response.data.title,
        subject: { name: response.data.subject?.name || "Disciplina" },
        duration: response.data.time_limit && response.data.time_limit > 0 
          ? Math.ceil(response.data.time_limit / 60) 
          : 60, // 60 minutos padrão se não houver tempo ou for inválido
        questions: response.data.questions?.map((q: any, index: number) => {
          // Processar alternativas do campo 'options'
          let processedOptions = [];
          if (q.options && Array.isArray(q.options)) {
            processedOptions = q.options.map((opt: any, optIndex: number) => {
              return {
                id: String.fromCharCode(97 + optIndex), // a, b, c, d
                text: opt.text || opt,
                isCorrect: opt.isCorrect || false
              };
            });
          }
          
          // Mapear segundo enunciado de diferentes possíveis campos
          const secondStatement = q.secondStatement || q.secondstatement || q.second_statement || '';
          
          // Mapear tipo de questão com mais opções
          let questionType = "multiple_choice"; // padrão
          if (q.question_type === "multipleChoice" || q.question_type === "multiple_choice") {
            questionType = "multiple_choice";
          } else if (q.question_type === "truefalse" || q.question_type === "true_false") {
            questionType = "true_false";
          } else if (q.question_type === "essay" || q.question_type === "open" || q.question_type === "textual" || q.question_type === "dissertativa") {
            questionType = "essay";
          } else if (!processedOptions || processedOptions.length === 0) {
            // Se não tem opções, assume que é dissertativa
            questionType = "essay";
          } else {
            // Manter o tipo original do backend
            questionType = q.question_type || "multiple_choice";
          }
          
          return {
            id: q.id,
            number: index + 1, // Numeração sequencial correta
            type: questionType,
            text: q.formattedText || q.text, // Usar texto formatado se disponível
            secondStatement: secondStatement, // Segundo enunciado com fallbacks
            images: q.images, // Array de imagens
            options: processedOptions,
            points: q.value || 1
          };
        }) || []
      };
      
      setEvaluationData(adaptedData);
      
      // Verificar se há duração válida, senão usar 60 minutos como padrão
      const durationInSeconds = adaptedData.duration && adaptedData.duration > 0 && !isNaN(adaptedData.duration)
        ? adaptedData.duration * 60 
        : 60 * 60; // 60 minutos padrão
      
      setTimeRemaining(durationInSeconds);
      
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
    if (isSubmitting || isSubmitted) return;

    try {
      setIsSubmitting(true);
      setError(null); // Limpar erro anterior
      
      // Obter session_id do sessionStorage se disponível
      const sessionData = sessionStorage.getItem("evaluation_session");
      let session_id = null;
      
      if (sessionData) {
        try {
          const parsed = JSON.parse(sessionData);
          session_id = parsed.session_id;
        } catch (e) {
          console.error("Erro ao fazer parse do sessionStorage:", e);
        }
      }

      // Validar se session_id existe
      if (!session_id) {
        throw new Error("Session ID não encontrado. Recarregue a página e tente novamente.");
      }
      
      // Formattar respostas no formato esperado pelo backend (seguindo padrão dos outros componentes)
      const formattedAnswers = Object.values(answers)
        .filter(answer => answer.answer && answer.answer.trim() !== "") // filtrar respostas vazias
        .filter(answer => answer.questionId && !answer.questionId.startsWith('q')) // filtrar IDs mock (q1, q2, etc)
        .map(answer => ({
          question_id: answer.questionId,
          answer: answer.answer || ""
        }));

      // Dados no formato correto seguindo o padrão de TakeEvaluation.tsx e useEvaluation.ts
      const submissionData = {
        session_id: session_id,
        answers: formattedAnswers
      };

      console.log("📤 Enviando dados da avaliação:", {
        endpoint: "/student-answers/submit",
        session_id,
        totalAnswers: formattedAnswers.length
      });

      console.log("📋 Dados completos sendo enviados:", JSON.stringify(submissionData, null, 2));
      console.log("📋 Respostas formatadas:", JSON.stringify(formattedAnswers, null, 2));

      // Usar o endpoint correto conforme outros componentes
      const response = await api.post("/student-answers/submit", submissionData);
      
      console.log("✅ Resposta do backend:", response.data);
      
      // Marcar como enviada com sucesso
      setIsSubmitted(true);
      
      toast({
        title: "✅ Avaliação enviada com sucesso!",
        description: automatic 
          ? "Sua avaliação foi enviada automaticamente devido ao fim do tempo"
          : "Suas respostas foram salvas com sucesso. Você pode fechar esta janela.",
      });

      // Limpar dados do localStorage
      localStorage.removeItem("evaluation_in_progress");
      sessionStorage.removeItem("current_evaluation");
      sessionStorage.removeItem("evaluation_session");

      // NÃO redirecionar - manter o aluno na página com botão "Concluída"

    } catch (error: any) {
      console.error("❌ ERRO COMPLETO:", error);
      console.error("❌ Error response:", error.response);
      console.error("❌ Error data:", error.response?.data);
      console.error("❌ Error status:", error.response?.status);
      
      let errorMessage = "Não foi possível enviar a avaliação. Tente novamente.";
      
      if (error.message === "Session ID não encontrado. Recarregue a página e tente novamente.") {
        errorMessage = error.message;
      } else if (error.response?.status === 404) {
        errorMessage = "Sessão não encontrada. Recarregue a página e tente novamente.";
      } else if (error.response?.status === 400) {
        const backendError = error.response.data?.error || error.response.data?.message || error.response.data?.detail;
        
        // Tratamento específico para sessão expirada
        if (backendError && backendError.includes("Sessão não está ativa")) {
          errorMessage = "⏰ Sua sessão de avaliação expirou. Para continuar, você precisa recarregar a página e iniciar uma nova sessão.";
        } else if (backendError && backendError.includes("expirada")) {
          errorMessage = "⏰ Sessão expirada. Recarregue a página para continuar.";
        } else {
          errorMessage = backendError || "Dados inválidos para envio. Verifique suas respostas.";
        }
        
        // Tentar identificar campos problemáticos
        console.error("🔍 Análise dos dados enviados:", {
          hasSessionId: !!submissionData.session_id,
          sessionIdType: typeof submissionData.session_id,
          answersCount: submissionData.answers?.length,
          answersFormat: submissionData.answers?.slice(0, 2), // primeiras 2 respostas
          backendError
        });
      } else if (error.response?.status === 410) {
        errorMessage = "Sessão expirada. Recarregue a página para continuar.";
      } else if (error.response?.status === 500) {
        errorMessage = "Erro interno do servidor. Tente novamente em alguns minutos.";
      }
      
      toast({
        title: "Erro no envio",
        description: errorMessage,
        variant: "destructive",
      });
      
      setError(errorMessage);
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
  const questionsAnswered = Object.keys(answers).filter(id => {
    const answer = answers[id]?.answer;
    return answer !== null && answer !== undefined && answer !== "";
  }).length;
  const completionPercentage = evaluationData.questions.length > 0 
    ? (questionsAnswered / evaluationData.questions.length) * 100 
    : 0;

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

      {error && (
        <div className="container mx-auto px-4 py-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {error}
                  {(error.includes("expirou") || error.includes("expirada") || error.includes("Sessão não está ativa")) && (
                    <div className="mt-3">
                      <Button 
                        onClick={() => window.location.reload()} 
                        variant="outline" 
                        size="sm"
                        className="bg-white hover:bg-gray-50"
                      >
                        🔄 Recarregar Página
                      </Button>
                    </div>
                  )}
                </div>
                <Button 
                  onClick={() => setError(null)} 
                  variant="ghost" 
                  size="sm"
                  className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 h-auto"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

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
                    const isSelected = index === currentQuestionIndex;
                    const answerObj = answers[question.id];
                    const isAnswered = !!answerObj && (
                      (question.type === "multiple_choice" || question.type === "true_false")
                        ? answerObj.answer !== null && answerObj.answer !== ""
                        : typeof answerObj.answer === "string" && answerObj.answer.trim().length > 0
                    );
                    const isMarked = answerObj?.isMarked;
                    let buttonClass = "bg-gray-100 border-gray-300 text-gray-500";
                    if (isSelected) {
                      buttonClass = "ring-2 ring-blue-500 bg-blue-50 border-blue-400 text-blue-800";
                    } else if (isAnswered) {
                      buttonClass = "bg-green-100 border-green-300 text-green-800";
                    }
                    return (
                      <Button
                        key={question.id}
                        variant="outline"
                        size="sm"
                        className={`h-10 relative ${buttonClass}`}
                        onClick={() => setCurrentQuestionIndex(index)}
                        disabled={isTimeUp || isSubmitted}
                        aria-label={`Ir para a questão ${index + 1}`}
                        tabIndex={0}
                      >
                        {index + 1}
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
                  disabled={isTimeUp || isSubmitting || isSubmitted}
                >
                  {isSubmitted ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Avaliação Concluída
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      {isSubmitting ? "Enviando..." : "Enviar Avaliação"}
                    </>
                  )}
                </Button>

                {(isTimeUp || isSubmitted) && (
                  <Alert variant={isSubmitted ? "default" : "destructive"}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {isSubmitted 
                        ? "✅ Avaliação enviada com sucesso! Você pode fechar esta janela."
                        : "Tempo esgotado! Clique em 'Enviar Avaliação'"
                      }
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Área principal - Exibição da questão atual */}
          <div className="lg:col-span-3">
            <Card key={`question-card-${currentQuestion.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge variant="outline">Questão {currentQuestion.number}</Badge>
                      <Badge variant="secondary">{currentQuestion.points} ponto{currentQuestion.points !== 1 ? 's' : ''}</Badge>
                    </div>
                    {/* Removido o CardTitle que mostrava o texto da questão duplicado */}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkQuestion(currentQuestion.id)}
                    className={answers[currentQuestion.id]?.isMarked ? 'text-orange-600' : ''}
                    disabled={isTimeUp || isSubmitted}
                  >
                    <Flag className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Enunciado da Questão */}
                <div className="question-content-area" key={`content-${questionKey}`}>
                  <QuestionContent content={currentQuestion.text} questionId={`${currentQuestion.id}-${questionKey}`} />
                  
                  {/* Segundo Enunciado (se existir) */}
                  {currentQuestion.secondStatement && currentQuestion.secondStatement.trim() !== '' && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <QuestionContent content={currentQuestion.secondStatement} questionId={`${currentQuestion.id}-second-${questionKey}`} />
                    </div>
                  )}
                </div>

                {/* Alternativas para questões de múltipla escolha */}
                {currentQuestion.type === "multiple_choice" && currentQuestion.options && currentQuestion.options.length > 0 && (
                  <div className="space-y-4">
                    <div className="pt-2">
                      <h4 className="text-sm font-semibold text-gray-700 mb-4">Selecione uma alternativa:</h4>
                      <RadioGroup 
                        value={answers[currentQuestion.id]?.answer as string || ""} 
                        onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                        disabled={isTimeUp || isSubmitted}
                      >
                        <div className="space-y-3">
                          {currentQuestion.options.map((option, index) => (
                            <Label
                              key={`${option.id}-${questionKey}`}
                              className="alternative-item flex items-start space-x-4 p-4 rounded-xl border bg-white hover:shadow-md transition-all duration-200 cursor-pointer"
                            >
                              <RadioGroupItem
                                value={option.text}
                                id={`${currentQuestion.id}-${option.id}-${questionKey}`}
                                className="mt-1"
                              />
                              <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-semibold shrink-0 transition-all duration-200 bg-gray-50 border-gray-300 text-gray-600">
                                {String.fromCharCode(65 + index)}
                              </div>
                              <div className="flex-1 min-w-0 text-base leading-relaxed text-gray-700">
                                {option.text}
                              </div>
                            </Label>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                )}

                {/* Alternativas para questões Verdadeiro/Falso */}
                {currentQuestion.type === "true_false" && (
                  <div className="space-y-4">
                    <div className="pt-2">
                      <h4 className="text-sm font-semibold text-gray-700 mb-4">Selecione verdadeiro ou falso:</h4>
                      <RadioGroup 
                        value={answers[currentQuestion.id]?.answer as string || ""} 
                        onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                        disabled={isTimeUp || isSubmitted}
                      >
                        <div className="space-y-3">
                          <div key={`true-${questionKey}`} className="alternative-item flex items-start space-x-4 p-4 rounded-xl border bg-white hover:shadow-md transition-all duration-200">
                            <RadioGroupItem value="true" id={`${currentQuestion.id}-true-${questionKey}`} className="mt-1" />
                            <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-semibold shrink-0 transition-all duration-200 bg-gray-50 border-gray-300 text-gray-600">
                              A
                            </div>
                            <Label htmlFor={`${currentQuestion.id}-true-${questionKey}`} className="flex-1 min-w-0 text-base leading-relaxed text-gray-700 cursor-pointer">
                              Verdadeiro
                            </Label>
                          </div>
                          <div key={`false-${questionKey}`} className="alternative-item flex items-start space-x-4 p-4 rounded-xl border bg-white hover:shadow-md transition-all duration-200">
                            <RadioGroupItem value="false" id={`${currentQuestion.id}-false-${questionKey}`} className="mt-1" />
                            <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-semibold shrink-0 transition-all duration-200 bg-gray-50 border-gray-300 text-gray-600">
                              B
                            </div>
                            <Label htmlFor={`${currentQuestion.id}-false-${questionKey}`} className="flex-1 min-w-0 text-base leading-relaxed text-gray-700 cursor-pointer">
                              Falso
                            </Label>
                          </div>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                )}

                {/* Área de resposta para questões dissertativas */}
                {(currentQuestion.type === "essay" || 
                  currentQuestion.type === "open" || 
                  currentQuestion.type === "textual" || 
                  currentQuestion.type === "dissertativa" ||
                  (!currentQuestion.options || currentQuestion.options.length === 0)) && 
                  currentQuestion.type !== "multiple_choice" && 
                  currentQuestion.type !== "true_false" && (
                  <div className="space-y-4">
                    <div className="pt-2">
                      <h4 className="text-sm font-semibold text-gray-700 mb-4">Desenvolva sua resposta:</h4>
                      <div className="answer-area rounded-xl p-6 bg-gray-50 border-2 border-dashed border-gray-300">
                        <Textarea
                          key={`essay-${questionKey}`}
                          id={`essay-${currentQuestion.id}-${questionKey}`}
                          placeholder="Digite sua resposta aqui, demonstrando conhecimento e raciocínio sobre o tema abordado na questão..."
                          value={answers[currentQuestion.id]?.answer as string || ""}
                          onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                          rows={8}
                          disabled={isTimeUp || isSubmitted}
                          className="min-h-[150px] resize-none bg-white border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 text-gray-700 placeholder:text-gray-400"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Mostrar mensagem se não há alternativas para questão de múltipla escolha */}
                {currentQuestion.type === "multiple_choice" && (!currentQuestion.options || currentQuestion.options.length === 0) && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 text-sm">
                      ⚠️ Esta questão de múltipla escolha não possui alternativas definidas.
                    </p>
                  </div>
                )}

                {/* Navegação entre questões */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                    disabled={currentQuestionIndex === 0 || isTimeUp || isSubmitted}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>

                  <div className="text-sm text-muted-foreground">
                    {currentQuestionIndex + 1} de {evaluationData.questions.length}
                  </div>

                  <Button 
                    onClick={() => setCurrentQuestionIndex(Math.min(evaluationData.questions.length - 1, currentQuestionIndex + 1))}
                    disabled={currentQuestionIndex === evaluationData.questions.length - 1 || isTimeUp || isSubmitted}
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
                <div>Questões respondidas: {Object.keys(answers).filter(id => {
                  const answer = answers[id]?.answer;
                  return answer !== null && answer !== undefined && answer !== "";
                }).length} de {evaluationData.questions.length}</div>
                <div>Tempo restante: {formatTime(timeRemaining)}</div>
              </div>

              <div className="mt-4 text-sm text-orange-600">
                ⚠️ Após enviar, você não poderá mais alterar suas respostas e permanecerá nesta página.
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