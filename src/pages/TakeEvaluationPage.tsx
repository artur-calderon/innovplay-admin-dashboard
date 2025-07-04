import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Clock, ChevronLeft, ChevronRight, Send, Flag, Home, AlertTriangle, Loader2 } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useEvaluationStore } from "@/stores/useEvaluationStore"; // Importa o store!
import { Question } from "@/components/evaluations/types";

export default function TakeEvaluationPage() {
    const { id: evaluationId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth(); // Assume que o user.id existe, ou pode usar um ID mockado
    const { toast } = useToast();

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [showSubmitDialog, setShowSubmitDialog] = useState(false);

    // Consumindo o store
    const evaluationStore = useEvaluationStore();

    // Tentar carregar a avaliação do sessionStorage primeiro
    const [evaluationData, setEvaluationData] = useState<any>(null);

    useEffect(() => {
        const savedEvaluation = sessionStorage.getItem("current_evaluation");
        if (savedEvaluation) {
            try {
                const parsedEvaluation = JSON.parse(savedEvaluation);
                setEvaluationData(parsedEvaluation);
                console.log("Avaliação carregada do sessionStorage:", parsedEvaluation);
                console.log("Estrutura da avaliação:", {
                    title: parsedEvaluation.title,
                    questions: parsedEvaluation.questions,
                    tests: parsedEvaluation.tests,
                    hasQuestions: !!parsedEvaluation.questions,
                    hasTests: !!parsedEvaluation.tests
                });
            } catch (error) {
                console.error("Erro ao carregar avaliação do sessionStorage:", error);
            }
        } else {
            // Fallback: tentar buscar do store
            const storeEvaluation = evaluationStore.getEvaluation(evaluationId);
            setEvaluationData(storeEvaluation);
            console.log("Avaliação carregada do store:", storeEvaluation);
        }
    }, [evaluationId, evaluationStore]);

    const startEvaluation = evaluationStore.startEvaluation;
    const answers = (evaluationStore as any).answers || {};
    const status = (evaluationStore as any).status || "";
    const timeRemaining = (evaluationStore as any).timeRemaining || 0;
    const isTimeUp = (evaluationStore as any).isTimeUp || false;
    const error = (evaluationStore as any).error;
    const setAnswer = (evaluationStore as any).setAnswer;
    const toggleMark = (evaluationStore as any).toggleMark;
    const tick = (evaluationStore as any).tick;
    const submitEvaluation = (evaluationStore as any).submitEvaluation;
    const studentId = user?.id || 'mock-student-id';

    // Iniciar avaliação quando os dados estiverem carregados
    useEffect(() => {
        if (evaluationId && studentId && evaluationData) {
            startEvaluation(evaluationId, studentId);
        }
    }, [evaluationId, studentId, evaluationData, startEvaluation]);

    // Lógica do timer
    useEffect(() => {
        if (status === 'in_progress' && !isTimeUp) {
            const interval = setInterval(tick, 1000);
            return () => clearInterval(interval);
        }
    }, [status, isTimeUp, tick]);

    // Notificações e redirecionamento
    useEffect(() => {
        if (timeRemaining === 300) { // 5 minutos
            toast({ title: "⏰ Atenção!", description: "Restam apenas 5 minutos.", variant: "destructive" });
        }
        if (isTimeUp && status !== 'submitting' && status !== 'completed') {
            toast({ title: "⏰ Tempo esgotado!", description: "A avaliação foi enviada automaticamente.", variant: "destructive" });
        }
    }, [timeRemaining, isTimeUp, status, toast]);

    useEffect(() => {
        if (status === 'completed') {
            toast({ title: "✅ Sucesso!", description: "Sua avaliação foi enviada." });
            navigate("/app/avaliacoes");
        }
    }, [status, navigate, toast]);

    // Função para confirmar e enviar
    const handleSubmit = async () => {
        await submitEvaluation(studentId);
        setShowSubmitDialog(false);
    };

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    // --- Renderização Condicional ---

    if (status === 'loading' || status === 'idle' || !evaluationData) {
        return <div className="flex justify-center items-center h-screen gap-2"><Loader2 className="h-6 w-6 animate-spin" /> Carregando avaliação...</div>;
    }

    if (status === 'error' || status === 'forbidden') {
        return (
            <div className="container mx-auto text-center py-10">
                <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
                <h2 className="text-xl font-bold">Ocorreu um problema</h2>
                <p className="text-muted-foreground">{error}</p>
                <Button onClick={() => navigate('/app/avaliacoes')} className="mt-4"><Home className="mr-2 h-4 w-4" /> Voltar</Button>
            </div>
        );
    }

    if (!evaluationData) {
        return <div className="p-4">Nenhuma avaliação encontrada.</div>;
    }

    // A partir daqui, seu JSX completo da tela de avaliação...
    // Ele funcionará perfeitamente com os dados do store mockado.
    // Garante que evaluationData é um objeto antes de acessar .questions

    // Extrair questões da estrutura da API
    const questions: Question[] = (() => {
        if (!evaluationData || typeof evaluationData !== 'object' || Array.isArray(evaluationData)) {
            return [];
        }

        console.log("Estrutura completa da avaliação:", evaluationData);

        // Se a avaliação tem questions diretamente (formato antigo)
        if (Array.isArray((evaluationData as any).questions)) {
            return (evaluationData as any).questions;
        }

        // Se a avaliação tem tests (formato da API)
        if (Array.isArray((evaluationData as any).tests) && (evaluationData as any).tests.length > 0) {
            const test = (evaluationData as any).tests[0];
            console.log("Test encontrado:", test);

            if (Array.isArray(test.questions)) {
                console.log("Questões encontradas no test:", test.questions.length);
                return test.questions;
            }
        }

        // Se a avaliação tem questions dentro de um objeto test
        if ((evaluationData as any).test && Array.isArray((evaluationData as any).test.questions)) {
            return (evaluationData as any).test.questions;
        }

        console.log("Nenhuma estrutura de questões encontrada em:", evaluationData);
        return [];
    })();

    const currentQuestion = questions[currentQuestionIndex];

    // Verificar se há questões e se a questão atual existe
    if (!questions.length || !currentQuestion) {
        return (
            <div className="container mx-auto text-center py-10">
                <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
                <h2 className="text-xl font-bold">Nenhuma questão encontrada</h2>
                <p className="text-muted-foreground">Esta avaliação não possui questões disponíveis.</p>
                <Button onClick={() => navigate('/app/avaliacoes')} className="mt-4">
                    <Home className="mr-2 h-4 w-4" /> Voltar
                </Button>
            </div>
        );
    }

    const answeredCount = Object.values(answers).filter(
        (a: any) => a && (a.answer !== null && a.answer !== '')
    ).length;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header Fixo */}
            <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
                <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                    <div>
                        <h1 className="font-semibold">
                            {(() => {
                                if (!evaluationData || typeof evaluationData !== 'object' || Array.isArray(evaluationData)) {
                                    return '';
                                }

                                // Se tem title diretamente
                                if ((evaluationData as any).title) {
                                    return (evaluationData as any).title;
                                }

                                // Se tem tests e o primeiro test tem title
                                if (Array.isArray((evaluationData as any).tests) && (evaluationData as any).tests.length > 0) {
                                    const test = (evaluationData as any).tests[0];
                                    if (test.test && test.test.title) {
                                        return test.test.title;
                                    }
                                    if (test.test && test.test.description) {
                                        return test.test.description;
                                    }
                                }

                                // Se tem test diretamente
                                if ((evaluationData as any).test && (evaluationData as any).test.title) {
                                    return (evaluationData as any).test.title;
                                }

                                return 'Avaliação';
                            })()}
                        </h1>
                        <div className="text-sm text-muted-foreground">
                            Questão {currentQuestionIndex + 1} de {questions.length}
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Badge variant={timeRemaining <= 300 ? "destructive" : "default"} className={`flex items-center gap-1 font-mono text-lg px-3 py-1 ${timeRemaining <= 60 ? 'animate-pulse' : ''}`}>
                            <Clock className="h-4 w-4" />
                            {isTimeUp ? "ESGOTADO" : formatTime(timeRemaining)}
                        </Badge>
                        <Button className="w-full" onClick={() => setShowSubmitDialog(true)} disabled={isTimeUp || status === 'submitting'}>
                            <Send className="h-4 w-4 mr-2" />
                            Enviar Avaliação
                        </Button>
                    </div>
                </div>
            </div>

            {/* Conteúdo Principal */}
            <div className="container mx-auto px-4 py-6 grid gap-6 lg:grid-cols-4">

                {/* Navegação */}
                <div className="lg:col-span-1">
                    <Card className="sticky top-24">
                        <CardHeader><CardTitle className="text-base">Navegação</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-5 gap-2">
                                {questions.map((q, index) => (
                                    <Button
                                        key={q.id}
                                        variant={currentQuestionIndex === index ? 'default' : answers[q.id]?.answer ? 'secondary' : 'outline'}
                                        size="icon"
                                        className={`relative ${answers[q.id]?.isMarked ? 'ring-2 ring-yellow-400' : ''}`}
                                        onClick={() => setCurrentQuestionIndex(index)}
                                    >
                                        {index + 1}
                                        {answers[q.id]?.isMarked && <Flag className="h-3 w-3 absolute -top-1 -right-1 text-yellow-500 fill-current" />}
                                    </Button>
                                ))}
                            </div>
                            <Progress value={(answeredCount / questions.length) * 100} className="mt-4" />
                            <p className="text-sm text-center text-muted-foreground mt-2">{answeredCount} de {questions.length} respondidas</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Questão Atual */}
                <div className="lg:col-span-3">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-lg leading-relaxed">
                                    {currentQuestion?.text || currentQuestion?.title || "Questão sem texto"}
                                </CardTitle>
                                <Button variant="ghost" size="icon" onClick={() => toggleMark(currentQuestion.id)} disabled={isTimeUp}>
                                    <Flag className={`h-5 w-5 ${answers[currentQuestion.id]?.isMarked ? 'text-yellow-500 fill-current' : 'text-muted-foreground'}`} />
                                </Button>
                            </div>
                            <Badge variant="secondary">{currentQuestion?.value || 1} ponto(s)</Badge>
                        </CardHeader>
                        <CardContent>
                            {/* Renderização da Resposta */}
                            {currentQuestion?.type === "multipleChoice" && Array.isArray((currentQuestion as any)?.options) && (
                                <RadioGroup
                                    value={answers[currentQuestion.id]?.answer as string ?? ""}
                                    onValueChange={(val) => setAnswer(currentQuestion.id, val, studentId)}
                                    disabled={isTimeUp}
                                    className="space-y-2"
                                >
                                    {(currentQuestion as any).options.map((opt: any) => (
                                        <div key={opt.id} className="flex items-center space-x-2 p-3 border rounded-md has-[[data-state=checked]]:bg-blue-50">
                                            <RadioGroupItem value={opt.id} id={`${currentQuestion.id}-${opt.id}`} />
                                            <Label htmlFor={`${currentQuestion.id}-${opt.id}`} className="cursor-pointer text-base">{opt.text}</Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            )}
                            {currentQuestion?.type === "trueFalse" && (
                                <RadioGroup
                                    value={answers[currentQuestion.id]?.answer as string ?? ""}
                                    onValueChange={(val) => setAnswer(currentQuestion.id, val, studentId)}
                                    disabled={isTimeUp}
                                    className="space-y-2"
                                >
                                    <div className="flex items-center space-x-2 p-3 border rounded-md has-[[data-state=checked]]:bg-blue-50">
                                        <RadioGroupItem value="true" id={`${currentQuestion.id}-true`} />
                                        <Label htmlFor={`${currentQuestion.id}-true`} className="cursor-pointer text-base">Verdadeiro</Label>
                                    </div>
                                    <div className="flex items-center space-x-2 p-3 border rounded-md has-[[data-state=checked]]:bg-blue-50">
                                        <RadioGroupItem value="false" id={`${currentQuestion.id}-false`} />
                                        <Label htmlFor={`${currentQuestion.id}-false`} className="cursor-pointer text-base">Falso</Label>
                                    </div>
                                </RadioGroup>
                            )}
                            {currentQuestion?.type === "open" && (
                                <Textarea
                                    value={answers[currentQuestion.id]?.answer as string ?? ""}
                                    onChange={(e) => setAnswer(currentQuestion.id, e.target.value, studentId)}
                                    disabled={isTimeUp}
                                    rows={8}
                                    placeholder="Digite sua resposta aqui..."
                                />
                            )}
                        </CardContent>
                        <div className="flex justify-between p-6 border-t">
                            <Button
                                variant="outline"
                                onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                                disabled={currentQuestionIndex === 0 || isTimeUp}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                            </Button>
                            <Button
                                onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                                disabled={currentQuestionIndex === questions.length - 1 || isTimeUp}
                            >
                                Próxima <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Dialog de Confirmação */}
            <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Envio</AlertDialogTitle>
                        <AlertDialogDescription>
                            Você tem certeza que deseja enviar a avaliação? Esta ação não pode ser desfeita.
                            <div className="mt-4 space-y-1 text-sm text-foreground">
                                <div>Respondidas: {answeredCount} de {questions.length}</div>
                                <div>Tempo Restante: {formatTime(timeRemaining)}</div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={status === 'submitting'}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSubmit} disabled={status === 'submitting'}>
                            {status === 'submitting' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</> : "Confirmar e Enviar"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}