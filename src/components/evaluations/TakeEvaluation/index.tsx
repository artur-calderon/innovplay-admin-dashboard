import React, { useState, useEffect } from "react";
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
  Home,
  Play,
  Loader2,
  CheckCircle2,
  Pause
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { EvaluationTimer } from "../EvaluationTimer";
import { useEvaluation } from "@/hooks/useEvaluation";
import { Question, TestData, TestResults } from "@/types/evaluation-types";

// ✅ NOVO: Error Boundary para capturar erros
class TakeEvaluationErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Erro capturado no TakeEvaluation:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen w-screen bg-gray-50">
          <div className="max-w-md w-full mx-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-4">
                  <div>
                    <strong>Erro inesperado na avaliação</strong>
                  </div>
                  <div className="text-sm">
                    Ocorreu um erro inesperado. Tente recarregar a página.
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.reload()}
                    >
                      Recarregar Página
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.href = "/aluno/avaliacoes"}
                    >
                      Voltar às Avaliações
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function TakeEvaluationContent() {
  const { id: evaluationId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  // ✅ NOVO: Verificação de segurança para evaluationId
  useEffect(() => {
    if (!evaluationId) {
      console.error('ID da avaliação não encontrado');
      toast({
        title: "Erro",
        description: "ID da avaliação não encontrado na URL",
        variant: "destructive",
      });
      navigate("/aluno/avaliacoes");
      return;
    }
  }, [evaluationId, navigate, toast]);

  // Se não há evaluationId, mostrar erro
  if (!evaluationId) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-gray-50">
        <div className="max-w-md w-full mx-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              ID da avaliação não encontrado na URL. Verifique o link e tente novamente.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const {
    evaluationState,
    testData,
    session,
    currentQuestionIndex,
    answers,
    isSubmitting,
    isSaving,
    results,
    timeRemaining,
    isTimeUp,
    isPaused,
    startTestSession,
    saveAnswer,
    submitTest,
    navigateToQuestion
  } = useEvaluation({ testId: evaluationId });

  // ✅ NOVO: Log para debug
  useEffect(() => {
    console.log('TakeEvaluation - Estado atual:', {
      evaluationState,
      testData: testData ? 'carregado' : 'não carregado',
      session: session ? 'existe' : 'não existe'
    });
  }, [evaluationState, testData, session]);

  // Loading state
  if (evaluationState === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-gray-50">
        <div className="max-w-md w-full mx-4">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  // Error state
  if (evaluationState === 'error') {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-gray-50">
        <div className="max-w-md w-full mx-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-4">
                <div>
                  <strong>Erro ao carregar a avaliação</strong>
                </div>
                <div className="text-sm">
                  Possíveis causas:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Problemas de conectividade de rede</li>
                    <li>ID da avaliação inválido: {evaluationId}</li>
                    <li>Tente recarregar a página</li>
                  </ul>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.reload()}
                  >
                    Tentar Novamente
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/aluno/avaliacoes")}
                  >
                    Voltar às Avaliações
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Instructions screen
  if (evaluationState === 'instructions' && testData) {
    return (
      <div className="flex items-center justify-center min-h-screen w-screen bg-gray-50 p-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Instruções da Avaliação</CardTitle>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold">{testData.title}</h2>
              <Badge variant="outline">{testData.subject.name}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 border rounded-lg">
                <Clock className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <div className="font-semibold">
                  {testData?.duration || 60} minutos
                </div>
                <div className="text-sm text-muted-foreground">Tempo disponível</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <div className="font-semibold">{testData.totalQuestions} questões</div>
                <div className="text-sm text-muted-foreground">Total de questões</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <Save className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <div className="font-semibold">Auto-save</div>
                <div className="text-sm text-muted-foreground">Respostas salvas automaticamente</div>
              </div>
            </div>

            <div className="text-center">
              <p className="mb-4">{testData.instructions}</p>

              {/* ✅ NOVO: Informações sobre o cronômetro */}
              {session && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm text-blue-800">
                    <div className="font-medium mb-1">Informações da Sessão:</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="font-medium">Tempo limite:</span> {session.time_limit_minutes} minutos
                      </div>
                      <div>
                        <span className="font-medium">Status:</span> {session.status === 'em_andamento' ? 'Ativo' : 'Pausado'}
                      </div>
                      {session.actual_start_time && (
                        <>
                          <div>
                            <span className="font-medium">Iniciado em:</span> {new Date(session.actual_start_time).toLocaleString('pt-BR')}
                          </div>
                          <div>
                            <span className="font-medium">Tempo restante:</span> {session.remaining_time_minutes} minutos
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={() => navigate("/aluno/avaliacoes")}>
                  <Home className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  onClick={startTestSession}
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Iniciando...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Iniciar Avaliação
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Results screen
  if (evaluationState === 'completed' && results) {
    console.log('📊 Resultados recebidos:', results);

    return (
      <div className="flex items-center justify-center min-h-screen w-screen bg-gray-50 p-4">
        <div className="max-w-2xl w-full">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Resultados da Avaliação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="text-center p-4 border rounded-lg">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <div className="font-semibold text-2xl">{results.correct_answers || 0}/{results.total_questions || 0}</div>
                  <div className="text-sm text-muted-foreground">Acertos</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Badge variant="outline" className="text-lg">
                    {results.score_percentage || 0}%
                  </Badge>
                  <div className="text-sm text-muted-foreground mt-2">Nota Final</div>
                </div>
              </div>

              {results.grade && (
                <div className="text-center p-4 border rounded-lg">
                  <div className="font-semibold text-xl">{results.grade}</div>
                  <div className="text-sm text-muted-foreground">Conceito</div>
                </div>
              )}

              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  {results.answers_saved || 0} de {results.total_questions || 0} questões respondidas
                </p>

                <div className="flex justify-center gap-4">
                  <Button variant="outline" onClick={() => navigate("/aluno/avaliacoes")}>
                    <Home className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                  <Button onClick={() => window.print()}>
                    <Save className="h-4 w-4 mr-2" />
                    Imprimir Resultado
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Active test screen
  if (evaluationState === 'active' && testData && session) {
    // ✅ NOVO: Verificação adicional para garantir que os dados estão carregados
    if (!testData.questions || testData.questions.length === 0) {
      return (
        <div className="container mx-auto px-4 py-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-4">
                <div>
                  <strong>❌ Avaliação sem questões</strong>
                </div>
                <div className="text-sm">
                  <p>Esta avaliação não possui questões cadastradas. Possíveis causas:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>A avaliação foi criada mas não teve questões adicionadas</li>
                    <li>Problema na configuração da avaliação</li>
                    <li>Questões foram removidas ou não estão disponíveis</li>
                  </ul>
                </div>
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>O que fazer:</strong>
                  </p>
                  <ul className="list-disc list-inside mt-1 text-sm text-blue-700">
                    <li>Entre em contato com seu professor</li>
                    <li>Verifique se a avaliação está corretamente configurada</li>
                    <li>Aguarde até que as questões sejam adicionadas</li>
                  </ul>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.reload()}
                  >
                    Tentar Novamente
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/aluno/avaliacoes")}
                  >
                    Voltar às Avaliações
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    const currentQuestion = testData.questions?.[currentQuestionIndex];

    // ✅ NOVO: Verificação de segurança para currentQuestion
    if (!currentQuestion) {
      return (
        <div className="container mx-auto px-4 py-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-4">
                <div>
                  <strong>Erro ao carregar questão</strong>
                </div>
                <div className="text-sm">
                  Questão não encontrada. Possíveis causas:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Índice da questão inválido: {currentQuestionIndex}</li>
                    <li>Total de questões: {testData.questions?.length || 0}</li>
                    <li>Dados da avaliação incompletos</li>
                  </ul>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.reload()}
                  >
                    Tentar Novamente
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/aluno/avaliacoes")}
                  >
                    Voltar às Avaliações
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return (
      <div className="h-screen w-screen bg-gray-50 flex flex-col overflow-hidden">
        {/* Header fixo */}
        <div className="bg-white border-b shadow-sm flex-shrink-0">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-semibold">{testData.title}</h1>
                <div className="text-sm text-muted-foreground">
                  Questão {currentQuestionIndex + 1} de {testData.totalQuestions}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <EvaluationTimer
                  timeRemaining={timeRemaining}
                  isTimeUp={isTimeUp}
                  isPaused={isPaused}
                  timeLimitMinutes={testData?.duration}
                  remainingMinutes={session?.remaining_time_minutes}
                />

                <div className="text-right">
                  <div className="text-sm font-medium">
                    {testData.questions.length > 0 ? Math.round((Object.keys(answers).length / testData.questions.length) * 100) : 0}% concluído
                  </div>
                  <Progress
                    value={testData.questions.length > 0 ? (Object.keys(answers).length / testData.questions.length) * 100 : 0}
                    className="w-24 h-2"
                  />
                </div>

                {isSaving && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="h-full p-4 grid gap-6 lg:grid-cols-5 xl:grid-cols-6 overflow-y-auto">
            {/* ✅ NOVO: Alerta quando pausado */}
            {isPaused && (
              <div className="lg:col-span-5 xl:col-span-6 mb-4">
                <Alert className="border-yellow-300 bg-yellow-50">
                  <Pause className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <div className="flex-1">
                      <span>
                        ⏸️ <strong>Cronômetro pausado</strong> -
                        O timer foi pausado porque você saiu desta aba. Volte para esta aba para continuar.
                      </span>

                      {/* ✅ NOVO: Informações detalhadas do cronômetro */}
                      {session && (
                        <div className="mt-2 text-xs text-yellow-800">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="font-medium">Tempo limite:</span> {session.time_limit_minutes} minutos
                            </div>
                            <div>
                              <span className="font-medium">Tempo restante:</span> {session.remaining_time_minutes} minutos
                            </div>
                            {session.actual_start_time && (
                              <div className="col-span-2">
                                <span className="font-medium">Iniciado em:</span> {new Date(session.actual_start_time).toLocaleString('pt-BR')}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Navegação das questões */}
            <div className="lg:col-span-1 xl:col-span-1">
              <Card className="sticky top-24">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Navegação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-5 gap-2">
                    {testData.questions.map((question, index) => {
                      const hasAnswer = answers[question.id]?.answer && answers[question.id]?.answer !== "";

                      return (
                        <Button
                          key={question.id}
                          variant="outline"
                          size="sm"
                          className={`h-10 relative ${index === currentQuestionIndex ? 'ring-2 ring-blue-500' : ''
                            } ${hasAnswer ? 'bg-green-100 border-green-300' : 'bg-white'
                            }`}
                          onClick={() => navigateToQuestion(index)}
                        >
                          {index + 1}
                          {hasAnswer && (
                            <CheckCircle className="h-3 w-3 absolute -top-1 -right-1 text-green-500" />
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
            <div className="lg:col-span-4 xl:col-span-5">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Badge variant="outline">Questão {currentQuestionIndex + 1}</Badge>
                        <Badge variant="secondary">{currentQuestion.points || 1} ponto{(currentQuestion.points || 1) !== 1 ? 's' : ''}</Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Conteúdo da questão */}
                  <div className="space-y-4">
                    {/* Primeiro enunciado */}
                    {(currentQuestion?.formattedText || currentQuestion?.text) && (
                      <div className="text-base leading-relaxed">
                        <div dangerouslySetInnerHTML={{ __html: currentQuestion?.formattedText || currentQuestion?.text || '' }} />
                      </div>
                    )}

                    {/* Imagens */}
                    {currentQuestion?.images && Array.isArray(currentQuestion.images) && currentQuestion.images.length > 0 && (
                      <div className="flex flex-wrap gap-4 my-4">
                        {currentQuestion.images.map((image, index) => {
                          // Se image é um objeto com url
                          const imageUrl = typeof image === 'string' ? image : image?.url || image?.src;
                          if (!imageUrl) return null;

                          return (
                            <div key={index} className="max-w-md">
                              <img
                                src={imageUrl}
                                alt={`Imagem ${index + 1} da questão`}
                                className="w-full h-auto rounded-lg border shadow-sm"
                                style={{ maxHeight: '400px', objectFit: 'contain' }}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Segundo enunciado */}
                    {(currentQuestion?.secondStatement || currentQuestion?.secondstatement) && (
                      <div className="text-base leading-relaxed">
                        <div dangerouslySetInnerHTML={{ __html: currentQuestion?.secondStatement || currentQuestion?.secondstatement || '' }} />
                      </div>
                    )}
                  </div>

                  {/* Opções de resposta */}
                  <QuestionOptions
                    question={currentQuestion}
                    answer={answers[currentQuestion?.id]?.answer}
                    onAnswerChange={(newAnswer) => {
                      const formattedAnswer = Array.isArray(newAnswer) ? newAnswer.join(',') : (newAnswer || '');
                      if (currentQuestion?.id) {
                        saveAnswer(currentQuestion.id, formattedAnswer);
                      }
                    }}
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
                      disabled={currentQuestionIndex === testData.questions.length - 1 || isTimeUp}
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
              <AlertDialogDescription asChild>
                <div>
                  <p className="mb-4">Você tem certeza que deseja enviar sua avaliação?</p>

                  <div className="space-y-2 mb-4">
                    <div>Questões respondidas: {Object.keys(answers).length} de {testData.questions.length || 0}</div>
                    <div>Tempo restante: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}</div>
                  </div>

                  <div className="text-sm text-orange-600">
                    ⚠️ Após enviar, você não poderá mais alterar suas respostas.
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => submitTest(false)}
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

  return null;
}

// Componente para opções de resposta
function QuestionOptions({
  question,
  answer,
  onAnswerChange,
  disabled
}: {
  question: Question;
  answer?: string;
  onAnswerChange: (answer: string | string[] | null) => void;
  disabled: boolean;
}) {
  if (question.type === "multiple_choice" || question.type === "multipleChoice") {
    // ✅ CORRIGIDO: Usar options (que existe) ou alternatives (fallback)
    const questionOptions = question.options || question.alternatives || [];
    console.log('Opções da questão:', questionOptions);

    return (
      <div className="space-y-3">
        <div className="text-sm font-medium text-gray-700 mb-3">
          Selecione a alternativa correta:
        </div>
        <RadioGroup
          value={answer || ""}
          onValueChange={onAnswerChange}
          disabled={disabled}
        >
          {questionOptions.map((option, index) => {
            const optionId = option.id || `option-${index}`;
            const optionText = option.text || option;
            const isSelected = answer === optionId;
            console.log(`Opção ${index}:`, { optionId, optionText, isSelected, isCorrect: option.isCorrect });

            return (
              <div
                key={optionId}
                className={`flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-all hover:bg-gray-50 ${isSelected
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !disabled && onAnswerChange(optionId)}
              >
                <RadioGroupItem
                  value={optionId}
                  id={optionId}
                  className="mt-0.5"
                />
                <Label
                  htmlFor={optionId}
                  className="flex-1 cursor-pointer text-sm leading-relaxed"
                >
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-gray-600 min-w-[20px]">
                      {String.fromCharCode(65 + index)})
                    </span>
                    <div dangerouslySetInnerHTML={{ __html: optionText }} />
                  </div>
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      </div>
    );
  }

  if (question.type === "true_false" || question.type === "truefalse") {
    return (
      <div className="space-y-3">
        <div className="text-sm font-medium text-gray-700 mb-3">
          Selecione Verdadeiro ou Falso:
        </div>
        <RadioGroup
          value={answer || ""}
          onValueChange={onAnswerChange}
          disabled={disabled}
        >
          {[
            { id: "true", text: "Verdadeiro" },
            { id: "false", text: "Falso" }
          ].map((option) => {
            const isSelected = answer === option.id;

            return (
              <div
                key={option.id}
                className={`flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-all hover:bg-gray-50 ${isSelected
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !disabled && onAnswerChange(option.id)}
              >
                <RadioGroupItem value={option.id} id={option.id} />
                <Label htmlFor={option.id} className="flex-1 cursor-pointer font-medium">
                  {option.text}
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      </div>
    );
  }

  if (question.type === "multiple_answer") {
    const selectedAnswers = answer ? answer.split(',') : [];
    // Usar options (que existe) ou alternatives (fallback)
    const questionOptions = question.options || question.alternatives || [];

    return (
      <div className="space-y-3">
        <div className="text-sm font-medium text-gray-700 mb-3">
          Selecione todas as alternativas corretas:
        </div>
        <div className="space-y-2">
          {questionOptions.map((option, index) => {
            const optionId = option.id || `option-${index}`;
            const optionText = option.text || option;
            const isSelected = selectedAnswers.includes(optionId);

            return (
              <div
                key={optionId}
                className={`flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-all hover:bg-gray-50 ${isSelected
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => {
                  if (!disabled) {
                    const newAnswers = isSelected
                      ? selectedAnswers.filter(id => id !== optionId)
                      : [...selectedAnswers, optionId];
                    onAnswerChange(newAnswers);
                  }
                }}
              >
                <Checkbox
                  id={optionId}
                  checked={isSelected}
                  onCheckedChange={(checked) => {
                    if (!disabled) {
                      const newAnswers = checked
                        ? [...selectedAnswers, optionId]
                        : selectedAnswers.filter(id => id !== optionId);
                      onAnswerChange(newAnswers);
                    }
                  }}
                  disabled={disabled}
                  className="mt-0.5"
                />
                <Label
                  htmlFor={optionId}
                  className="flex-1 cursor-pointer text-sm leading-relaxed"
                >
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-gray-600 min-w-[20px]">
                      {String.fromCharCode(65 + index)})
                    </span>
                    <div dangerouslySetInnerHTML={{ __html: optionText }} />
                  </div>
                </Label>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (question.type === "essay" || question.type === "open" || question.type === "dissertativa" || question.type === "text" || question.type === "short_answer") {
    return (
      <div className="space-y-3">
        <div className="text-sm font-medium text-gray-700 mb-3">
          Digite sua resposta:
        </div>
        <Textarea
          placeholder="Digite sua resposta aqui..."
          value={answer || ""}
          onChange={(e) => onAnswerChange(e.target.value)}
          rows={6}
          disabled={disabled}
          className="min-h-[120px] resize-none"
        />
        <div className="text-xs text-gray-500">
          {answer ? `${answer.length} caracteres` : '0 caracteres'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <div className="text-sm text-gray-600">
        Tipo de questão não suportado: {question.type}
      </div>
    </div>
  );
}

export default function TakeEvaluation() {
  return (
    <TakeEvaluationErrorBoundary>
      <TakeEvaluationContent />
    </TakeEvaluationErrorBoundary>
  );
}