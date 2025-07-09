import React, { useState } from "react";
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
  CheckCircle2
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { EvaluationTimer } from "../EvaluationTimer";
import { useEvaluation } from "@/hooks/useEvaluation";
import { Question, TestData, TestResults } from "@/types/evaluation-types";

export default function TakeEvaluation() {
  const { evaluationId } = useParams<{ evaluationId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  console.log('=== DEBUG: TakeEvaluation - Params ===');
  console.log('evaluationId from params:', evaluationId);

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
    startTestSession,
    handleAnswerChange,
    navigateToQuestion,
    handleSubmitTest
  } = useEvaluation({ testId: evaluationId! });

  // Debug logs
  console.log('=== DEBUG: TakeEvaluation Component ===');
  console.log('evaluationId:', evaluationId);
  console.log('session:', session);
  console.log('session?.session_id:', session?.session_id);
  console.log('evaluationState:', evaluationState);

  // Loading state
  if (evaluationState === 'loading') {
    return (
      <div className="container mx-auto px-4 py-6">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Error state
  if (evaluationState === 'error') {
    return (
      <div className="container mx-auto px-4 py-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Erro ao carregar a avaliação. Tente novamente.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Instructions screen
  if (evaluationState === 'instructions' && testData) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
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
                <div className="font-semibold">{testData.duration} minutos</div>
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
    return (
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Resultados da Avaliação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="text-center p-4 border rounded-lg">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <div className="font-semibold text-2xl">{results.correct_answers}/{results.total_questions}</div>
                <div className="text-sm text-muted-foreground">Acertos</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <Badge variant="outline" className="text-lg">
                  {results.score_percentage}%
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
                {results.answers_saved} de {results.total_questions} questões respondidas
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
    );
  }

  // Active test screen
  if (evaluationState === 'active' && testData && session) {
    const currentQuestion = testData.questions[currentQuestionIndex];

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header fixo */}
        <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
          <div className="container mx-auto px-4 py-3">
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
                />

                <div className="text-right">
                  <div className="text-sm font-medium">
                    {Math.round((Object.keys(answers).length / testData.totalQuestions) * 100)}% concluído
                  </div>
                  <Progress
                    value={(Object.keys(answers).length / testData.totalQuestions) * 100}
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
                          {question.number}
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
              <AlertDialogDescription>
                Você tem certeza que deseja enviar sua avaliação?

                <div className="mt-4 space-y-2">
                  <div>Questões respondidas: {Object.keys(answers).length} de {testData.totalQuestions}</div>
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
                onClick={() => handleSubmitTest(false)}
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
  if (question.type === "multiple_choice") {
    return (
      <RadioGroup
        value={answer || ""}
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
        value={answer || ""}
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
    const selectedAnswers = answer ? answer.split(',') : [];

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
        value={answer || ""}
        onChange={(e) => onAnswerChange(e.target.value)}
        rows={6}
        disabled={disabled}
      />
    );
  }

  return null;
} 