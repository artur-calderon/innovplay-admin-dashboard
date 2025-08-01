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
    ChevronUp,
    ChevronDown,
    Send,
    AlertTriangle,
    CheckCircle,
    Save,
    Home,
    Play,
    Loader2,
    CheckCircle2,
    Pause,
    Info,
    Printer
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { EvaluationTimer } from "../EvaluationTimer";
import { useEvaluation } from "@/hooks/useEvaluation";
import { Question, TestData, TestResults } from "@/types/evaluation-types";

// Função para determinar a cor baseada na performance
const getPerformanceColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-blue-600";
    if (percentage >= 40) return "text-yellow-600";
    return "text-red-600";
};

export default function TakeEvaluation() {
    const { id: evaluationId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [showSubmitDialog, setShowSubmitDialog] = useState(false);
    const [isNavigationMinimized, setIsNavigationMinimized] = useState(false);

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
        submitTest: handleSubmitTest,
        navigateToQuestion
    } = useEvaluation({ testId: evaluationId });

    // ✅ NOVO: Auto-iniciar quando estiver no estado de instruções
    useEffect(() => {
        if (evaluationState === 'instructions' && testData) {
            console.log('🚀 Auto-iniciando avaliação...');
            startTestSession();
        }
    }, [evaluationState, testData, startTestSession]);

    // ✅ Log para debug
    useEffect(() => {
        console.log('TakeEvaluation - Estado atual:', {
            evaluationState,
            testData: testData ? 'carregado' : 'não carregado',
            session: session ? 'existe' : 'não existe'
        });
    }, [evaluationState, testData, session]);

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

    // Loading state - agora também aparece durante a inicialização automática
    if (evaluationState === 'loading' || (evaluationState === 'instructions' && !session)) {
        return (
            <div className="flex items-center justify-center h-screen w-screen bg-gray-50">
                <div className="max-w-md w-full mx-4 text-center">
                    <div className="space-y-4">
                        <Skeleton className="h-96 w-full" />
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Carregando avaliação...</span>
                        </div>
                    </div>
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

    // Results screen - Mostrar resultados imediatos
    if (evaluationState === 'completed' && results) {
        console.log('📊 Avaliação enviada com sucesso, mostrando resultados...');
        
        return (
            <div className="flex items-center justify-center min-h-screen w-screen bg-gray-50 p-4">
                <div className="max-w-lg w-full">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-center">✅ Avaliação Concluída!</CardTitle>
                            <div className="text-center space-y-2">
                                <h2 className="text-xl font-semibold">{testData?.title}</h2>
                                <Badge variant="outline">{testData?.subject.name}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* ✅ Resultados imediatos */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-blue-50 rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {results.correct_answers || 0}/{results.total_questions || 0}
                                    </div>
                                    <div className="text-sm text-blue-700">Acertos</div>
                                </div>
                                <div className="bg-green-50 rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold text-green-600">
                                        {results.score_percentage || 0}%
                                    </div>
                                    <div className="text-sm text-green-700">Desempenho</div>
                                </div>
                            </div>
                            
                            {results.grade && (
                                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                                    <div className="text-2xl font-bold text-yellow-600">
                                        {parseFloat(results.grade).toFixed(1)}/10
                                    </div>
                                    <div className="text-sm text-yellow-700">Nota Final</div>
                                </div>
                            )}

                            {/* Mensagem de sucesso */}
                            <div className="text-center space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
                                <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto" />
                                <div className="space-y-2">
                                    <h3 className="text-lg font-semibold text-green-800">
                                        Avaliação Enviada com Sucesso!
                                    </h3>
                                    <p className="text-green-700">
                                        Seus resultados foram calculados automaticamente.
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-center gap-3">
                                <Button onClick={() => navigate("/aluno/avaliacoes")}>
                                    <Home className="h-4 w-4 mr-2" />
                                    Voltar para Avaliações
                                </Button>
                                <Button 
                                    variant="outline"
                                    onClick={() => window.print()}
                                >
                                    <Printer className="h-4 w-4 mr-2" />
                                    Imprimir
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Active test screen
    if (evaluationState === 'active' && testData && session) {
        // ✅ Verificação adicional para garantir que os dados estão carregados
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

        // ✅ Verificação de segurança para currentQuestion
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
                    <div className="h-full flex flex-col">
                        {/* ✅ Alerta quando pausado - MAIS COMPACTO */}
                        {isPaused && (
                            <div className="px-6 py-3 bg-yellow-50 border-b border-yellow-200">
                                <Alert className="border-yellow-300 bg-yellow-50 py-2">
                                    <Pause className="h-4 w-4" />
                                    <AlertDescription className="text-sm">
                                        ⏸️ <strong>Cronômetro pausado</strong> - Volte para esta aba para continuar
                                    </AlertDescription>
                                </Alert>
                            </div>
                        )}

                        {/* ✅ Navegação ULTRA-COMPACTA em UMA LINHA */}
                        <div className={`px-4 py-3 bg-white border-b border-gray-200 shadow-sm transition-all duration-300 ${isNavigationMinimized ? 'h-12 overflow-hidden' : ''}`}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-sm font-medium text-gray-700">Navegação</h3>
                                    <div className="text-xs text-gray-500">
                                        {Object.keys(answers).length}/{testData.questions.length}
                                    </div>
                                    {isNavigationMinimized && (
                                        <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                                            Minimizada
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setIsNavigationMinimized(!isNavigationMinimized)}
                                        className="px-2 py-1 h-8"
                                        title={isNavigationMinimized ? "Expandir navegação" : "Minimizar navegação"}
                                    >
                                        {isNavigationMinimized ? (
                                            <ChevronDown className="h-3 w-3" />
                                        ) : (
                                            <ChevronUp className="h-3 w-3" />
                                        )}
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => setShowSubmitDialog(true)}
                                        disabled={isTimeUp || isSubmitting}
                                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 h-8"
                                    >
                                        <Send className="h-3 w-3 mr-1" />
                                        Enviar
                                    </Button>
                                </div>
                            </div>
                            
                            {/* ✅ UMA LINHA com ícones mais juntinhos */}
                            <div className={`flex flex-wrap gap-0.5 transition-all duration-300 ${isNavigationMinimized ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                                {testData.questions.map((question, index) => {
                                    const hasAnswer = answers[question.id]?.answer && answers[question.id]?.answer !== "";
                                    const isCurrent = index === currentQuestionIndex;

                                    return (
                                        <button
                                            key={question.id}
                                            className={`
                                                evaluation-navigation-button relative w-8 h-8 rounded text-sm font-medium flex-shrink-0
                                                ${isCurrent 
                                                    ? 'bg-blue-600 text-white ring-2 ring-blue-300 shadow-md' 
                                                    : hasAnswer 
                                                        ? 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200' 
                                                        : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                                                }
                                                ${isTimeUp ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                                            `}
                                            onClick={() => !isTimeUp && navigateToQuestion(index)}
                                            disabled={isTimeUp}
                                        >
                                            {index + 1}
                                            {hasAnswer && !isCurrent && (
                                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ✅ Área principal - MAIS VISÍVEL e PROFISSIONAL */}
                        <div className="flex-1 overflow-y-auto bg-gray-50">
                            <div className="max-w-5xl mx-auto p-6">
                                <Card className="evaluation-question-card question-fade-in">
                                    <CardHeader className="evaluation-question-header">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="bg-white border-blue-300 text-blue-700">
                                                        Questão {currentQuestionIndex + 1}
                                                    </Badge>
                                                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                                        {currentQuestion.points || 1} ponto{(currentQuestion.points || 1) !== 1 ? 's' : ''}
                                                    </Badge>
                                                </div>
                                                <div className="text-sm text-blue-600">
                                                    {testData.questions.length} questões • {testData.duration} minutos
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs text-gray-500 mb-1">Progresso</div>
                                                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-blue-600 transition-all duration-300"
                                                        style={{ 
                                                            width: `${testData.questions.length > 0 ? (Object.keys(answers).length / testData.questions.length) * 100 : 0}%` 
                                                        }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-8 space-y-8">
                                        {/* Conteúdo da questão - MAIS LEGÍVEL */}
                                        <div className="space-y-6">
                                            {/* Primeiro enunciado */}
                                            {(currentQuestion?.formattedText || currentQuestion?.text) && (
                                                <div className="text-lg leading-relaxed text-gray-800">
                                                    <div dangerouslySetInnerHTML={{ __html: currentQuestion?.formattedText || currentQuestion?.text || '' }} />
                                                </div>
                                            )}

                                            {/* Imagens - MELHOR DISPLAY */}
                                            {currentQuestion?.images && Array.isArray(currentQuestion.images) && currentQuestion.images.length > 0 && (
                                                <div className="flex flex-wrap gap-6 my-6">
                                                    {currentQuestion.images.map((image, index) => {
                                                        const imageUrl = typeof image === 'string' ? image : image?.url || image?.src;
                                                        if (!imageUrl) return null;

                                                        return (
                                                            <div key={index} className="max-w-lg">
                                                                <img
                                                                    src={imageUrl}
                                                                    alt={`Imagem ${index + 1} da questão`}
                                                                    className="w-full h-auto rounded-lg border shadow-md"
                                                                    style={{ maxHeight: '500px', objectFit: 'contain' }}
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
                                            {currentQuestion?.secondStatement && 
                                             currentQuestion.secondStatement.trim().length > 0 && (
                                                <div className="text-lg leading-relaxed text-gray-800">
                                                    <div dangerouslySetInnerHTML={{ __html: currentQuestion.secondStatement.trim() }} />
                                                </div>
                                            )}
                                        </div>

                                        {/* Opções de resposta - MAIS DESTACADAS */}
                                        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                                            <QuestionOptions
                                                question={currentQuestion}
                                                answer={answers[currentQuestion?.id]?.answer}
                                                onAnswerChange={(newAnswer) => {
                                                    if (currentQuestion?.id) {
                                                        saveAnswer(currentQuestion.id, newAnswer);
                                                        
                                                        // ✅ Avanço automático após seleção
                                                        // Apenas para questões de múltipla escolha e verdadeiro/falso
                                                        if ((currentQuestion.type === "multiple_choice" || 
                                                             currentQuestion.type === "multipleChoice" ||
                                                             currentQuestion.type === "true_false" || 
                                                             currentQuestion.type === "truefalse") &&
                                                            newAnswer && 
                                                            currentQuestionIndex < testData.questions.length - 1) {
                                                            
                                                            // Delay de 1 segundo para o usuário ver a seleção
                                                            setTimeout(() => {
                                                                navigateToQuestion(currentQuestionIndex + 1);
                                                            }, 1000);
                                                        }
                                                    }
                                                }}
                                                disabled={isTimeUp}
                                            />
                                        </div>

                                        {/* ✅ Navegação mais elegante */}
                                        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                                            <Button
                                                variant="outline"
                                                size="lg"
                                                onClick={() => navigateToQuestion(currentQuestionIndex - 1)}
                                                disabled={currentQuestionIndex === 0 || isTimeUp}
                                                className="px-6"
                                            >
                                                <ChevronLeft className="h-5 w-5 mr-2" />
                                                Questão Anterior
                                            </Button>

                                            <div className="text-sm text-gray-500">
                                                {currentQuestionIndex + 1} de {testData.questions.length}
                                            </div>

                                            <Button
                                                size="lg"
                                                onClick={() => navigateToQuestion(currentQuestionIndex + 1)}
                                                disabled={currentQuestionIndex === testData.questions.length - 1 || isTimeUp}
                                                className="px-6 bg-blue-600 hover:bg-blue-700"
                                            >
                                                Próxima Questão
                                                <ChevronRight className="h-5 w-5 ml-2" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
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
    if (question.type === "multiple_choice" || question.type === "multipleChoice") {
        // Usar options (que existe) ou alternatives (fallback)
        const questionOptions = question.options || question.alternatives || [];

        return (
            <div className="space-y-3">
                <div className="text-sm font-medium text-gray-700 mb-3">
                    Selecione a alternativa correta:
                </div>
                <RadioGroup
                    value={answer || ""}
                    onValueChange={(val) => {
                        // Corrigir: enviar a letra (A, B, C, D...)
                        const index = questionOptions.findIndex((option, idx) => {
                            const optionId = option.id || `option-${idx}`;
                            return optionId === val;
                        });
                        if (index !== -1) {
                            onAnswerChange(String.fromCharCode(65 + index));
                        } else {
                            onAnswerChange("");
                        }
                    }}
                    disabled={disabled}
                >
                    {questionOptions.map((option, index) => {
                        const optionId = option.id || `option-${index}`;
                        const optionText = option.text || option;
                        // Corrigir: marcar como selecionado se answer for a letra
                        const isSelected = answer === String.fromCharCode(65 + index);

                        return (
                            <div
                                key={optionId}
                                className={`flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-all hover:bg-gray-50 ${isSelected
                                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                    : 'border-gray-200 hover:border-gray-300'
                                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                onClick={() => !disabled && onAnswerChange(String.fromCharCode(65 + index))}
                            >
                                <RadioGroupItem
                                    value={optionId}
                                    id={optionId}
                                    className="mt-0.5"
                                    checked={isSelected}
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