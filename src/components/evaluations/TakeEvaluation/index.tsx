import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    ChevronLeft,
    ChevronRight,
    Send,
    AlertTriangle,
    Home,
    Play,
    Loader2,
    CheckCircle2,
    Maximize2,
    X
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { EvaluationTimer } from "../EvaluationTimer";
import { useEvaluation } from "@/hooks/useEvaluation";
import { Question } from "@/types/evaluation-types";

export default function TakeEvaluation() {
    const { id: evaluationId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [showSubmitDialog, setShowSubmitDialog] = useState(false);
    const [showCompletionDialog, setShowCompletionDialog] = useState(false);
    const [showFullscreenQuestion, setShowFullscreenQuestion] = useState(false);
    const [hasSeenCompletionDialog, setHasSeenCompletionDialog] = useState(false);
    const [isCompletionDialogClosed, setIsCompletionDialogClosed] = useState(false);
    const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);

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

    // ✅ Verificar se avaliação já foi enviada antes de iniciar
    useEffect(() => {
        if (evaluationState === 'completed' && !results) {
            console.log('⚠️ Avaliação já foi enviada anteriormente - bloqueando acesso');
            toast({
                title: "Acesso Negado",
                description: "Esta avaliação já foi enviada anteriormente. Você será redirecionado.",
                variant: "destructive",
            });
            const timer = setTimeout(() => {
                navigate("/aluno/avaliacoes");
            }, 2000);
            
            return () => clearTimeout(timer);
        }
    }, [evaluationState, results, navigate, toast]);

    // ✅ Auto-iniciar avaliação automaticamente
    useEffect(() => {
        if (evaluationState === 'instructions' && testData && !session) {
            console.log('🚀 Auto-iniciando avaliação...');
            startTestSession();
        }
    }, [evaluationState, testData, session, startTestSession]);

    // ✅ Fechar modal fullscreen com Escape
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && showFullscreenQuestion) {
                console.log('🔒 Fechando modal fullscreen com Escape...');
                setShowFullscreenQuestion(false);
            }
        };

        if (showFullscreenQuestion) {
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [showFullscreenQuestion]);

    // ✅ Limpar estado dos modais quando necessário
    useEffect(() => {
        if (!showFullscreenQuestion && !showCompletionDialog && !showSubmitDialog) {
            // Garantir que o body não tenha scroll bloqueado
            document.body.style.overflow = 'auto';
            document.body.removeAttribute('data-scroll-locked');
            
            // Remover qualquer overlay que possa ter ficado
            const overlays = document.querySelectorAll('[data-state="open"]');
            overlays.forEach(overlay => {
                if (overlay.classList.contains('fixed') && overlay.classList.contains('inset-0')) {
                    overlay.remove();
                }
            });
        }
    }, [showFullscreenQuestion, showCompletionDialog, showSubmitDialog]);

    // ✅ Garantir que apenas um modal esteja aberto por vez
    useEffect(() => {
        if (showFullscreenQuestion) {
            // Se o modal fullscreen está aberto, fechar outros modais
            setShowCompletionDialog(false);
            setShowSubmitDialog(false);
        }
    }, [showFullscreenQuestion]);

    // ✅ Fechar modais quando avaliação for enviada
    useEffect(() => {
        if (evaluationState === 'completed') {
            setShowFullscreenQuestion(false);
            setShowCompletionDialog(false);
            setShowSubmitDialog(false);
            setIsCompletionDialogClosed(false);
        }
    }, [evaluationState]);

    // ✅ Fechar modal fullscreen quando navegar para uma questão
    useEffect(() => {
        if (currentQuestionIndex >= 0 && showFullscreenQuestion) {
            // Se o usuário navegou para uma questão, fechar o modal fullscreen
            setShowFullscreenQuestion(false);
        }
    }, [currentQuestionIndex, showFullscreenQuestion]);

    // Log para debug da questão atual (apenas quando muda)
    useEffect(() => {
        if (currentQuestionIndex >= 0 && shuffledQuestions?.[currentQuestionIndex]) {
            const currentQuestion = shuffledQuestions[currentQuestionIndex];
            console.log('🔍 Questão atual:', {
                index: currentQuestionIndex,
                questionId: currentQuestion?.id,
                currentAnswer: answers[currentQuestion?.id]?.answer,
                questionType: currentQuestion?.type
            });
        }
    }, [currentQuestionIndex, shuffledQuestions, answers]);

    // ✅ Organizar questões por disciplina e embaralhar alternativas
    useEffect(() => {
        if (testData?.questions?.length && shuffledQuestions.length === 0) {
            console.log('🔄 Organizando questões por disciplina...', testData.questions.length);
            
            // Agrupar questões por disciplina
            const questionsBySubject = testData.questions.reduce((acc, question) => {
                const subjectName = question.subject?.name || 'Sem disciplina';
                if (!acc[subjectName]) {
                    acc[subjectName] = [];
                }
                acc[subjectName].push(question);
                return acc;
            }, {} as Record<string, Question[]>);

            console.log('📚 Questões agrupadas por disciplina:', Object.keys(questionsBySubject));

            // Processar questões de cada disciplina
            const processedQuestions: Question[] = [];
            
            Object.entries(questionsBySubject).forEach(([subject, questions]) => {
                console.log(`📖 Processando disciplina: ${subject} (${questions.length} questões)`);
                
                const processedSubjectQuestions = questions.map((q, questionIndex) => {
                    console.log(`Questão ${questionIndex + 1} de ${subject}:`, q.type, q.options?.length);
                    
                    if (
                        ["multiple_choice", "multipleChoice", "multiple_choice"].includes(q.type) &&
                        (q.options || q.alternatives) &&
                        Array.isArray(q.options || q.alternatives) &&
                        (q.options || q.alternatives).length > 0
                    ) {
                        const optionsToShuffle = q.options || q.alternatives || [];
                        const originalOptions = optionsToShuffle.map((opt, index) => ({
                            ...opt,
                            originalIndex: index,
                        }));

                        const shuffledOptions = [...originalOptions].sort(() => Math.random() - 0.5);
                        
                        console.log(`✅ Questão ${questionIndex + 1} de ${subject} embaralhada:`, {
                            original: originalOptions.map((opt, i) => `${String.fromCharCode(65 + i)}: ${opt.text}`),
                            shuffled: shuffledOptions.map((opt, i) => `${String.fromCharCode(65 + i)}: ${opt.text}`)
                        });

                        return {
                            ...q,
                            options: shuffledOptions,
                            alternatives: shuffledOptions, // Manter compatibilidade
                        };
                    }
                    return q;
                });

                processedQuestions.push(...processedSubjectQuestions);
            });

            console.log('🎯 Questões organizadas por disciplina definidas:', processedQuestions.length);
            setShuffledQuestions(processedQuestions);
        }
    }, [testData, shuffledQuestions.length]);





    // ✅ Processar imagens após carregamento do HTML
    useEffect(() => {
        if (currentQuestionIndex >= 0 && testData?.questions?.[currentQuestionIndex]) {
            const timeoutId = setTimeout(() => {
                const questionContent = document.querySelector('.evaluation-question-content');
                if (questionContent) {
                    const images = questionContent.querySelectorAll('img');

                    images.forEach((img) => {
                        const parent = img.parentElement;

                        if (parent && parent.tagName === 'P') {
                            const before = img.previousSibling?.textContent?.trim() || '';
                            const after = img.nextSibling?.textContent?.trim() || '';
                            const hasTextAround = before.length > 0 || after.length > 0;

                            if (hasTextAround) {
                                img.classList.add('inline-image');
                            }
                        }

                        img.onerror = () => {
                            img.style.display = 'none';
                        };
                    });
                }
            }, 100);

            return () => clearTimeout(timeoutId);
        }
    }, [currentQuestionIndex, testData]);

    // ✅ Detectar quando todas as questões são respondidas
    useEffect(() => {
        // Só executar se não foi visto antes E não foi fechado pelo usuário
        if (hasSeenCompletionDialog || isCompletionDialogClosed) {
            return;
        }

        if (shuffledQuestions.length > 0 && Object.keys(answers).length === shuffledQuestions.length) {
            // Verificar se todas as respostas têm conteúdo
            const allAnswered = shuffledQuestions.every(question => {
                const answer = answers[question.id]?.answer;
                return answer && answer.trim() !== '';
            });
            
            if (allAnswered) {
                console.log('🎉 Todas as questões foram respondidas!');
                setShowCompletionDialog(true);
                setHasSeenCompletionDialog(true);
            }
        }
    }, [answers, shuffledQuestions.length, hasSeenCompletionDialog, isCompletionDialogClosed]);

    // ✅ Redirecionamento automático quando avaliação é concluída
    useEffect(() => {
        if (evaluationState === 'completed' && results) {
            console.log('📊 Avaliação enviada com sucesso, redirecionando...');
            const timer = setTimeout(() => {
                navigate("/aluno/avaliacoes");
            }, 2000);
            
            return () => clearTimeout(timer);
        }
    }, [evaluationState, results, navigate]);



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

    // Loading state
    if (evaluationState === 'loading') {
        return (
            <div className="flex items-center justify-center h-screen w-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
                <div className="max-w-lg w-full mx-4 text-center">
                    <Card className="p-8 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                        <div className="space-y-8">
                            {/* Ícone animado */}
                            <div className="flex justify-center">
                                <div className="relative">
                                    <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-blue-600 rounded-full flex items-center justify-center animate-pulse">
                                        <Play className="h-12 w-12 text-white ml-1" />
                                    </div>
                                    {/* Círculos animados */}
                                    <div className="absolute inset-0 rounded-full border-4 border-purple-200 animate-ping"></div>
                                    <div className="absolute inset-0 rounded-full border-4 border-blue-200 animate-ping" style={{ animationDelay: '0.5s' }}></div>
                                </div>
                            </div>

                            {/* Título */}
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold text-gray-800">
                                    Preparando sua avaliação...
                                </h2>
                            </div>

                            {/* Barra de progresso animada */}
                            <div className="space-y-3">
                                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                    <div className="bg-gradient-to-r from-purple-500 to-blue-600 h-full rounded-full animate-pulse" style={{ width: '60%' }}></div>
                                </div>
                                <div className="flex items-center justify-center gap-3">
                                    <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                                    <span className="text-sm font-medium text-gray-700">
                                        Carregando...
                                    </span>
                                </div>
                            </div>

                            {/* Dicas animadas */}
                            <div className="space-y-2">
                                <div className="text-xs text-gray-500 space-y-1">
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                                        <span>Preparando questões...</span>
                                    </div>
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                        <span>Quase pronto!</span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </Card>
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
    if (evaluationState === 'completed') {
        return (
            <div className="flex items-center justify-center min-h-screen w-screen bg-gray-50 p-4">
                <div className="max-w-lg w-full">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-center">
                                {results ? "✅ Avaliação Concluída!" : "⚠️ Avaliação Já Enviada"}
                            </CardTitle>
                            <div className="text-center space-y-2">
                                <h2 className="text-xl font-semibold">{testData?.title}</h2>
                                <Badge variant="outline">{testData?.subject.name}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Mensagem de sucesso ou aviso */}
                            <div className={`text-center space-y-4 p-4 rounded-lg border ${
                                results 
                                    ? 'bg-green-50 border-green-200' 
                                    : 'bg-yellow-50 border-yellow-200'
                            }`}>
                                {results ? (
                                    <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto" />
                                ) : (
                                    <AlertTriangle className="h-8 w-8 text-yellow-600 mx-auto" />
                                )}
                                <div className="space-y-2">
                                    <h3 className={`text-lg font-semibold ${
                                        results ? 'text-green-800' : 'text-yellow-800'
                                    }`}>
                                        {results 
                                            ? "Avaliação Enviada com Sucesso!" 
                                            : "Avaliação Já Foi Enviada Anteriormente"
                                        }
                                    </h3>
                                    <p className={`text-sm ${
                                        results ? 'text-green-700' : 'text-yellow-700'
                                    }`}>
                                        Redirecionando em 2 segundos...
                                    </p>
                                </div>
                            </div>

                            {/* Botão para redirecionamento manual */}
                            <div className="text-center">
                                <Button
                                    onClick={() => navigate("/aluno/avaliacoes")}
                                    className="bg-purple-600 hover:bg-purple-700"
                                >
                                    <Home className="h-4 w-4 mr-2" />
                                    Voltar às Avaliações
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
        if (!shuffledQuestions || shuffledQuestions.length === 0) {
            console.log('⚠️ shuffledQuestions vazio, usando testData.questions como fallback');
            if (testData?.questions?.length) {
                setShuffledQuestions(testData.questions);
                return null; // Aguardar re-render
            }
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
                                <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg">
                                    <p className="text-sm text-purple-800">
                                        <strong>O que fazer:</strong>
                                    </p>
                                    <ul className="list-disc list-inside mt-1 text-sm text-purple-700">
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

        const currentQuestion = shuffledQuestions?.[currentQuestionIndex];

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
<style>
  {`
    /* Imagens principais - tamanho médio/grande com tamanho mínimo */
    .evaluation-question-content img:not(.inline-image) {
        display: block;
        margin: 2rem auto;
        width: auto;
        min-width: 300px;
        max-width: 90%;
        max-height: 450px;
        height: auto;
    }

    /* Imagens inline (pequenas no meio do texto) */
    .evaluation-question-content img.inline-image {
        display: inline-block !important;
        vertical-align: middle !important;
        margin: 0 0.3rem !important;
        max-height: 2.8em !important;
        max-width: 4em !important;
        width: auto !important;
        height: auto !important;
        object-fit: contain !important;
        border-radius: 4px !important;
        box-shadow: 0 1px 6px rgba(0, 0, 0, 0.1) !important;
    }

    /* Ajustes opcionais por alinhamento */
    .evaluation-question-content p[style*="text-align: center"] img:not(.inline-image) {
        max-width: 80% !important;
    }

    .evaluation-question-content p[style*="text-align: right"] img:not(.inline-image) {
        margin: 2rem 0 2rem auto !important;
        max-width: 60% !important;
    }

    .evaluation-question-content p[style*="text-align: left"] img:not(.inline-image) {
        margin: 2rem auto 2rem 0 !important;
        max-width: 60% !important;
    }

    /* Modal fullscreen customizado */
    .fullscreen-modal {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        max-width: 100vw !important;
        max-height: 100vh !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
        transform: none !important;
    }

    /* Line clamp para truncar texto */
    .line-clamp-3 {
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
  `}
</style>



                {/* Header fixo */}
                <div className="bg-white border-b shadow-sm flex-shrink-0">
                    <div className="px-4 py-2">
                        <div className="flex items-center justify-between">
                            {/* Espaço vazio à esquerda para balancear */}
                            <div className="w-32"></div>
                            
                            {/* Conteúdo centralizado */}
                            <div className="flex-1 flex flex-col items-center text-center">
                                <h1 className="text-sm font-semibold">{testData.title}</h1>
                                <div className="text-xs text-muted-foreground">
                                    Questão {currentQuestionIndex + 1} de {shuffledQuestions.length}
                                </div>
                            </div>

                            {/* Timer à direita */}
                            <div className="w-32 flex justify-end">
                                <div className="flex items-center gap-3">
                                    <EvaluationTimer
                                        timeRemaining={timeRemaining}
                                        isTimeUp={isTimeUp}
                                        isPaused={isPaused}
                                        timeLimitMinutes={testData?.duration}
                                        remainingMinutes={session?.remaining_time_minutes}
                                    />

                                    {isSaving && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            Salvando...
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden">
                    <div className="h-full flex">
                        {/* ✅ Navegação lateral */}
                        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
                            {/* Header da navegação */}
                            <div className="p-4 border-b border-gray-200">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-sm font-semibold text-gray-700">Navegação</h3>
                                        <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                            {Object.keys(answers).length}/{shuffledQuestions.length}
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => setShowSubmitDialog(true)}
                                        disabled={isTimeUp || isSubmitting || Object.keys(answers).length < shuffledQuestions.length}
                                        className={`px-3 py-1 h-8 text-xs ${
                                            Object.keys(answers).length >= shuffledQuestions.length
                                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                                : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                        }`}
                                        title={
                                            Object.keys(answers).length < shuffledQuestions.length
                                                ? `Responda todas as ${shuffledQuestions.length} questões primeiro`
                                                : 'Enviar avaliação'
                                        }
                                    >
                                        <Send className="h-3 w-3 mr-1" />
                                        Enviar
                                    </Button>
                                </div>
                                
                                {/* Progresso visual */}
                                <div className="mb-4">
                                    <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                                        <span>Progresso</span>
                                        <span>{Math.round((Object.keys(answers).length / shuffledQuestions.length) * 100)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                        <div 
                                            className="bg-gradient-to-r from-purple-500 to-blue-600 h-full transition-all duration-300 ease-out"
                                            style={{ 
                                                width: `${(Object.keys(answers).length / shuffledQuestions.length) * 100}%` 
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            {/* Grid de navegação */}
                            <div className="flex-1 overflow-y-auto p-4">
                                <div className="grid grid-cols-5 gap-2">
                                    {shuffledQuestions.map((question, index) => {
                                        const hasAnswer = answers[question.id]?.answer && answers[question.id]?.answer !== "";
                                        const isCurrent = index === currentQuestionIndex;

                                        return (
                                            <button
                                                key={question.id}
                                                className={`
                                                    relative w-12 h-12 rounded-lg text-sm font-medium flex items-center justify-center transition-all
                                                    ${isCurrent 
                                                        ? 'bg-purple-600 text-white ring-2 ring-purple-300 shadow-lg scale-105' 
                                                        : hasAnswer 
                                                            ? 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200 hover:scale-105' 
                                                            : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200 hover:scale-105'
                                                    }
                                                    ${isTimeUp ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                                                `}
                                                onClick={() => !isTimeUp && navigateToQuestion(index)}
                                                disabled={isTimeUp}
                                                title={`Questão ${index + 1}${hasAnswer ? ' (Respondida)' : ''}`}
                                            >
                                                {index + 1}
                                                {hasAnswer && !isCurrent && (
                                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-white"></div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* ✅ Área principal - MAIS VISÍVEL e PROFISSIONAL */}
                        <div className="flex-1 overflow-y-auto bg-gray-50">
                            <div className="max-w-4xl mx-auto p-6">
                                <Card className="evaluation-question-card question-fade-in">
                                    <CardHeader className="evaluation-question-header">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="bg-white border-purple-300 text-purple-700">
                                                        Questão {currentQuestionIndex + 1}
                                                    </Badge>
                                                    {currentQuestion?.subject?.name && (
                                                        <Badge variant="outline" className="bg-white border-blue-300 text-blue-700">
                                                            {currentQuestion.subject.name}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setShowFullscreenQuestion(true)}
                                                className="h-8 w-8 p-0"
                                                title="Visualizar questão em tela cheia"
                                            >
                                                <Maximize2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-8 space-y-10">
                                        {/* Conteúdo da Questão */}
                                        <div className="evaluation-question-content space-y-6">
                                            {/* Primeiro Enunciado */}
                                            {(currentQuestion?.formattedText || currentQuestion?.text) && (
                                                <div className="prose max-w-none text-gray-800 text-lg leading-relaxed">
                                                    <div
                                                        dangerouslySetInnerHTML={{
                                                            __html: currentQuestion?.formattedText || currentQuestion?.text || '',
                                                        }}
                                                    />
                                                </div>
                                            )}

                                            {/* Segundo Enunciado */}
                                            {currentQuestion?.secondStatement?.trim() && (
                                                <div className="prose max-w-none text-gray-800 text-lg leading-relaxed">
                                                    <div
                                                        dangerouslySetInnerHTML={{
                                                            __html: currentQuestion.secondStatement.trim(),
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* Opções de Resposta */}
                                        <div className="rounded-2xl border border-gray-200 bg-white shadow p-6">
                                            <QuestionOptions
                                                question={currentQuestion}
                                                answer={answers[currentQuestion?.id]?.answer}
                                                onAnswerChange={(newAnswer) => {
                                                    if (currentQuestion?.id) {
                                                        console.log('💾 Salvando resposta:', {
                                                            questionId: currentQuestion.id,
                                                            answer: newAnswer,
                                                            questionType: currentQuestion.type,
                                                            currentAnswers: Object.keys(answers)
                                                        });
                                                        saveAnswer(currentQuestion.id, newAnswer);

                                                        // Avanço automático
                                                        if (
                                                            ['multiple_choice', 'multipleChoice', 'true_false', 'truefalse'].includes(
                                                                currentQuestion.type,
                                                            ) &&
                                                            newAnswer &&
                                                            currentQuestionIndex < shuffledQuestions.length - 1
                                                        ) {
                                                            setTimeout(() => {
                                                                navigateToQuestion(currentQuestionIndex + 1);
                                                            }, 1000);
                                                        }
                                                    }
                                                }}
                                                disabled={isTimeUp}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* ✅ Navegação SIMPLIFICADA para crianças */}
                                <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        onClick={() => navigateToQuestion(currentQuestionIndex - 1)}
                                        disabled={currentQuestionIndex === 0 || isTimeUp}
                                        className="px-8 py-4 text-lg font-bold border-2 rounded-xl hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        <ChevronLeft className="h-8 w-8 mr-3" />
                                        ← Voltar
                                    </Button>

                                    <div className="text-lg font-bold text-purple-600 bg-purple-50 px-6 py-3 rounded-full">
                                        {currentQuestionIndex + 1} de {shuffledQuestions.length}
                                    </div>

                                    <Button
                                        size="lg"
                                        onClick={() => navigateToQuestion(currentQuestionIndex + 1)}
                                        disabled={currentQuestionIndex === shuffledQuestions.length - 1 || isTimeUp}
                                        className="px-8 py-4 text-lg font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
                                    >
                                        Avançar →
                                        <ChevronRight className="h-8 w-8 ml-3" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                 {/* Dialog de confirmação de envio */}
                 {showSubmitDialog && (
                     <>
                         {/* Overlay com blur ATRÁS */}
                         <div 
                             className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm cursor-pointer"
                             onClick={() => setShowSubmitDialog(false)}
                         />
                         
                         {/* Modal na FRENTE */}
                         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                             <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 sm:mx-0 border border-gray-200 pointer-events-auto">
                                 <div className="p-6 pb-4">
                                     <div className="space-y-4">
                                         <h2 className="text-xl font-bold text-gray-800">Confirmar envio da avaliação</h2>
                                         <div className="space-y-2">
                                             <p className="mb-4">Você tem certeza que deseja enviar sua avaliação?</p>
                                             <div>Questões respondidas: {Object.keys(answers).length} de {shuffledQuestions.length || 0}</div>
                                         </div>
                                     </div>
                                 </div>
                                 <div className="flex gap-3 px-6 pb-6">
                                     <button
                                         className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                                         onClick={() => setShowSubmitDialog(false)}
                                         disabled={isSubmitting}
                                     >
                                         Cancelar
                                     </button>
                                     <button
                                         className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                         onClick={() => {
                                             if (isSubmitting) {
                                                 console.log('⚠️ Tentativa de envio bloqueada - já está enviando');
                                                 return;
                                             }
                                             console.log('🚀 Modal de envio: Enviando avaliação...');
                                             handleSubmitTest(false);
                                         }}
                                         disabled={isSubmitting}
                                     >
                                         {isSubmitting ? "Enviando..." : "Confirmar Envio"}
                                     </button>
                                 </div>
                             </div>
                         </div>
                     </>
                 )}

                 {/* ✅ Dialog de confirmação quando todas as questões são respondidas */}
                 {showCompletionDialog && (
                     <>
                         {/* Overlay com blur ATRÁS */}
                         <div 
                             className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm cursor-pointer"
                             onClick={() => {
                                 setShowCompletionDialog(false);
                                 setHasSeenCompletionDialog(false);
                                 setIsCompletionDialogClosed(true);
                             }}
                         />
                         
                         {/* Modal na FRENTE */}
                         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                             <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 sm:mx-0 border border-gray-200 pointer-events-auto">
                                 <div className="p-6 pb-4">
                                     <div className="text-center space-y-4">
                                         <div className="flex items-center justify-center">
                                             <CheckCircle2 className="h-12 w-12 sm:h-16 sm:w-16 text-green-600" />
                                         </div>
                                         <div className="space-y-2">
                                             <h2 className="text-xl sm:text-2xl font-bold text-green-700">
                                                 Avaliação Concluída
                                             </h2>
                                             <p className="text-base sm:text-lg font-semibold text-gray-800 leading-relaxed">
                                                 Todas as questões foram respondidas com sucesso.
                                             </p>
                                             <p className="text-sm text-gray-600">
                                                 Deseja enviar sua avaliação agora para finalização?
                                             </p>
                                         </div>
                                     </div>
                                 </div>

                                 <div className="flex flex-col sm:flex-row gap-3 px-6 pb-6">
                                     <button
                                         className="w-full sm:w-auto order-2 sm:order-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-lg transition-colors"
                                         onClick={() => {
                                             console.log('🔍 Fechando modal de conclusão para permitir revisão...');
                                             setShowCompletionDialog(false);
                                             setHasSeenCompletionDialog(false);
                                             setIsCompletionDialogClosed(true);
                                         }}
                                     >
                                         <ChevronLeft className="h-4 w-4 mr-2 inline" />
                                         Revisar Respostas
                                     </button>

                                     <button
                                         className="w-full sm:w-auto order-1 sm:order-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-lg hover:shadow-xl"
                                         onClick={() => {
                                             if (isSubmitting) {
                                                 console.log('⚠️ Tentativa de envio bloqueada - já está enviando');
                                                 return;
                                             }
                                             console.log('🚀 Modal de conclusão: Enviando avaliação...');
                                             setShowCompletionDialog(false);
                                             setHasSeenCompletionDialog(false);
                                             setIsCompletionDialogClosed(true);
                                             handleSubmitTest(false);
                                         }}
                                         disabled={isSubmitting}
                                     >
                                         {isSubmitting ? (
                                             <>
                                                 <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                 Enviando...
                                             </>
                                         ) : (
                                             <>
                                                 <Send className="h-4 w-4 mr-2" />
                                                 Confirmar Envio
                                             </>
                                         )}
                                     </button>
                                 </div>
                             </div>
                         </div>
                     </>
                 )}

                {/* ✅ Modal de visualização em tela cheia */}
                {showFullscreenQuestion && (
                    <div 
                        className="fixed inset-0 z-[9999] bg-white"
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            width: '100vw',
                            height: '100vh',
                            zIndex: 9999
                        }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-3 bg-white border-b shadow-sm">
                            <div className="flex items-center gap-4">
                                <h2 className="text-lg font-bold">
                                    Questão {currentQuestionIndex + 1} de {shuffledQuestions.length}
                                </h2>
                                {currentQuestion?.subject?.name && (
                                    <Badge variant="outline" className="bg-purple-50 border-purple-300 text-purple-700">
                                        {currentQuestion.subject.name}
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-gray-600">
                                    {answers[currentQuestion?.id]?.answer ? (
                                        <span className="flex items-center gap-2 text-green-600 font-medium">
                                            <CheckCircle2 className="h-4 w-4" />
                                            Respondida
                                        </span>
                                    ) : (
                                        <span className="text-gray-500">
                                            Não respondida
                                        </span>
                                    )}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowFullscreenQuestion(false)}
                                    className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
                                    title="Fechar visualização"
                                >
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                        
                        {/* Conteúdo principal */}
                        <div className="flex h-[calc(100vh-60px)]">
                            {/* Lado esquerdo - Questão */}
                            <div className="flex-1 bg-white overflow-y-auto">
                                <div className="p-8">
                                    <div className="evaluation-question-content space-y-6">
                                        {/* Primeiro Enunciado */}
                                        {(currentQuestion?.formattedText || currentQuestion?.text) && (
                                            <div className="prose prose-lg max-w-none text-gray-800" style={{ fontSize: '1.25rem', lineHeight: '1.8' }}>
                                                <div
                                                    dangerouslySetInnerHTML={{
                                                        __html: currentQuestion?.formattedText || currentQuestion?.text || '',
                                                    }}
                                                />
                                            </div>
                                        )}

                                        {/* Segundo Enunciado */}
                                        {currentQuestion?.secondStatement?.trim() && (
                                            <div className="prose prose-lg max-w-none text-gray-800 pt-6 mt-6 border-t-2 border-gray-200" style={{ fontSize: '1.25rem', lineHeight: '1.8' }}>
                                                <div
                                                    dangerouslySetInnerHTML={{
                                                        __html: currentQuestion.secondStatement.trim(),
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Divisor vertical */}
                            <div className="w-px bg-gray-300"></div>

                            {/* Lado direito - Alternativas */}
                            <div className="w-1/2 flex flex-col bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
                                <div className="p-8">
                                    <h3 className="text-xl font-bold text-gray-800 mb-6">Alternativas:</h3>
                                    <QuestionOptions
                                        question={currentQuestion}
                                        answer={answers[currentQuestion?.id]?.answer}
                                        onAnswerChange={(answer) => {
                                            saveAnswer(currentQuestion?.id, answer);
                                        }}
                                        disabled={false}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
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
            <div className="space-y-6">
                <div className="text-xl font-bold text-gray-800 mb-6">
                    Selecione a alternativa correta:
                </div>
                <RadioGroup
                    value={(() => {
                        // Converter a letra da resposta (A, B, C, D) para o ID da opção
                        if (!answer) return "";
                        const answerIndex = answer.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
                        const option = questionOptions[answerIndex];
                        return option?.id || `option-${answerIndex}`;
                    })()}
                    onValueChange={(val) => {
                        console.log('🔄 RadioGroup onValueChange:', val);
                        // Encontrar o índice da opção selecionada
                        const index = questionOptions.findIndex(option => {
                            const optionId = option.id || `option-${questionOptions.indexOf(option)}`;
                            return optionId === val;
                        });
                        
                        if (index !== -1) {
                            const correctLetter = String.fromCharCode(65 + index);
                            console.log('📝 Resposta selecionada:', {
                                selectedValue: val,
                                index: index,
                                letter: correctLetter,
                                optionText: questionOptions[index].text
                            });
                            onAnswerChange(correctLetter);
                        } else {
                            console.log('❌ Opção não encontrada:', val);
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
                                className={`flex items-start space-x-4 p-6 rounded-xl border-2 cursor-pointer transition-all hover:bg-gray-50 ${isSelected
                                    ? 'border-purple-500 bg-purple-50 ring-4 ring-purple-200 shadow-lg'
                                    : 'border-gray-300 hover:border-gray-400 hover:shadow-md'
                                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                onClick={() => {
                                    if (!disabled) {
                                        const correctLetter = String.fromCharCode(65 + index);
                                        console.log('🖱️ Click na opção:', {
                                            index: index,
                                            letter: correctLetter,
                                            optionText: optionText
                                        });
                                        onAnswerChange(correctLetter);
                                    }
                                }}
                            >
                                <RadioGroupItem
                                    value={optionId}
                                    id={optionId}
                                    className="mt-1 w-5 h-5"
                                    checked={isSelected}
                                />
                                <Label
                                    htmlFor={optionId}
                                    className="flex-1 cursor-pointer text-lg leading-relaxed"
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="font-bold text-gray-700 min-w-[30px] text-xl">
                                            {String.fromCharCode(65 + index)})
                                        </span>
                                        <div className="text-lg leading-relaxed" dangerouslySetInnerHTML={{ __html: optionText }} />
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
            <div className="space-y-6">
                <div className="text-xl font-bold text-gray-800 mb-6">
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
                                className={`flex items-center space-x-4 p-6 rounded-xl border-2 cursor-pointer transition-all hover:bg-gray-50 ${isSelected
                                    ? 'border-purple-500 bg-purple-50 ring-4 ring-purple-200 shadow-lg'
                                    : 'border-gray-300 hover:border-gray-400 hover:shadow-md'
                                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                onClick={() => !disabled && onAnswerChange(option.id)}
                            >
                                <RadioGroupItem value={option.id} id={option.id} className="w-5 h-5" />
                                <Label htmlFor={option.id} className="flex-1 cursor-pointer font-bold text-lg">
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
                                    ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
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
            <div className="space-y-6">
                <div className="text-xl font-bold text-gray-800 mb-6">
                    Digite sua resposta:
                </div>
                <Textarea
                    placeholder="Digite sua resposta aqui..."
                    value={answer || ""}
                    onChange={(e) => onAnswerChange(e.target.value)}
                    rows={8}
                    disabled={disabled}
                    className="min-h-[200px] resize-none text-lg p-4 border-2 rounded-xl"
                />
                <div className="text-sm text-gray-600 font-medium">
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