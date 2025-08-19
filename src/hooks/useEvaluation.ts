import { useState, useEffect, useCallback, useRef } from 'react';
import { EvaluationApiService } from '@/services/evaluationApi';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/authContext';
import { TestData, TestSession, StudentAnswer, TestResults, EvaluationState } from '@/types/evaluation-types';
import { api } from '@/lib/api';

interface UseEvaluationProps {
    testId: string;
}

export function useEvaluation({ testId }: UseEvaluationProps) {
    // Estados principais
    const [evaluationState, setEvaluationState] = useState<EvaluationState>('loading');
    const [testData, setTestData] = useState<TestData | null>(null);
    const [session, setSession] = useState<TestSession | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, StudentAnswer>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [results, setResults] = useState<TestResults | null>(null);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [isTimeUp, setIsTimeUp] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    // Refs para controle
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    // ✅ REMOVIDO: saveIntervalRef não é mais usado
    // const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const syncTimerRef = useRef<NodeJS.Timeout | null>(null);
    const sessionStartTimeRef = useRef<Date | null>(null);

    const { toast } = useToast();
    const { user } = useAuth();

    // ✅ NOVO: Sincronizar timer com backend
    const syncTimerWithBackend = useCallback(async (elapsedMinutes: number, remainingMinutes: number) => {
        if (!session?.session_id) return;

        try {
            await EvaluationApiService.syncTimer(session.session_id, elapsedMinutes, remainingMinutes);
        } catch (error) {
            console.error('❌ Erro ao sincronizar timer:', error);
        }
    }, [session?.session_id]);

    // ✅ NOVO: Verificar se há sessão ativa
    const checkActiveSession = useCallback(async (): Promise<boolean> => {
        try {
            const sessionInfo = await EvaluationApiService.getTestSessionInfo(testId);

            if (sessionInfo.session_exists && sessionInfo.status === 'em_andamento') {
                // ✅ CORRIGIDO: Usar duration da avaliação em vez de time_limit_minutes da sessão
                const evaluationDuration = testData?.duration || 60; // fallback para 60 minutos

                // Calcular tempo restante baseado no tempo decorrido
                const startTime = new Date(sessionInfo.actual_start_time);
                const now = new Date();
                const elapsedMinutes = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));
                const remainingMinutes = Math.max(0, evaluationDuration - elapsedMinutes);

                // Se o tempo esgotou, finalizar automaticamente
                if (remainingMinutes <= 0) {
                    await handleSubmitTestRef.current(true);
                    return true;
                }

                setSession({
                    session_id: sessionInfo.session_id,
                    status: sessionInfo.status,
                    started_at: sessionInfo.started_at,
                    actual_start_time: sessionInfo.actual_start_time,
                    time_limit_minutes: evaluationDuration, // ✅ Usar duration da avaliação
                    remaining_time_minutes: remainingMinutes,
                    total_questions: sessionInfo.total_questions,
                    correct_answers: sessionInfo.correct_answers,
                    score: sessionInfo.score,
                    grade: sessionInfo.grade,
                    is_expired: remainingMinutes <= 0
                });

                // Configurar timer
                setTimeRemaining(remainingMinutes * 60);
                sessionStartTimeRef.current = startTime;
                setIsPaused(false);
                setEvaluationState('active');

                // Iniciar sincronização de timer
                startTimerSync(sessionInfo.session_id, elapsedMinutes, remainingMinutes);

                toast({
                    title: "🔄 Avaliação retomada!",
                    description: `Continue respondendo suas questões. Tempo restante: ${remainingMinutes} minutos`,
                });

                return true;
            }

            return false;
        } catch (error) {
            return false;
        }
    }, [testId, testData?.duration]);

    // ✅ NOVO: Iniciar sincronização de timer
    const startTimerSync = useCallback((sessionId: string, initialElapsed: number, initialRemaining: number) => {
        // ✅ NOVO: Limpar timer anterior se existir
        if (syncTimerRef.current) {
            clearInterval(syncTimerRef.current);
            syncTimerRef.current = null;
        }

        let elapsedMinutes = initialElapsed;
        let remainingMinutes = initialRemaining;

        // Sincronizar a cada 5 minutos
        syncTimerRef.current = setInterval(async () => {
            // ✅ NOVO: Verificar se ainda está ativo antes de continuar
            if (evaluationState !== 'active' || isSubmitting) {
                if (syncTimerRef.current) {
                    clearInterval(syncTimerRef.current);
                    syncTimerRef.current = null;
                }
                return;
            }

            elapsedMinutes += 5;
            remainingMinutes = Math.max(0, remainingMinutes - 5);

            await syncTimerWithBackend(elapsedMinutes, remainingMinutes);

            // Se o tempo acabou, finalizar
            if (remainingMinutes <= 0) {
                setIsTimeUp(true);
                // ✅ NOVO: Verificar se já foi enviada antes de chamar
                if (!isSubmitting && evaluationState === 'active') {
                    handleSubmitTestRef.current(true);
                }
            }
        }, 5 * 60 * 1000); // 5 minutos
    }, [evaluationState, isSubmitting]); // ✅ NOVO: Adicionar evaluationState como dependência

    // ✅ NOVO: Iniciar sessão de teste
    const startTestSession = useCallback(async (): Promise<void> => {
        if (!testData) return;

        try {
            setIsSaving(true);
            
            // ✅ NOVO: Limpar timers anteriores se existirem
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            // ✅ REMOVIDO: saveIntervalRef não é mais usado
            // if (saveIntervalRef.current) {
            //     clearInterval(saveIntervalRef.current);
            //     saveIntervalRef.current = null;
            // }
            if (syncTimerRef.current) {
                clearInterval(syncTimerRef.current);
                syncTimerRef.current = null;
            }

            // ✅ CORRIGIDO: Usar duration da avaliação em vez de time_limit_minutes da sessão
            const evaluationDuration = testData.duration;

            // Iniciar nova sessão
            const sessionData = await EvaluationApiService.startSession(testId);

            // Configurar sessão
            const newSession: TestSession = {
                session_id: sessionData.session_id,
                status: 'em_andamento',
                started_at: sessionData.started_at,
                actual_start_time: sessionData.actual_start_time,
                time_limit_minutes: evaluationDuration, // ✅ Usar duration da avaliação
                remaining_time_minutes: evaluationDuration, // ✅ Usar duration da avaliação
                total_questions: testData.totalQuestions,
                correct_answers: 0,
                score: 0,
                grade: null,
                is_expired: false
            };

            setSession(newSession);
            setTimeRemaining(evaluationDuration * 60); // ✅ Usar duration da avaliação
            sessionStartTimeRef.current = new Date(sessionData.actual_start_time);
            setIsPaused(false);
            setEvaluationState('active');

            // Iniciar sincronização de timer
            startTimerSync(sessionData.session_id, 0, evaluationDuration); // ✅ Usar duration da avaliação

            // ✅ REMOVIDO: Auto-save está causando dupla execução de savePartialAnswers
            // startAutoSave(sessionData.session_id);

        } catch (error) {
            toast({
                title: "❌ Erro ao iniciar avaliação",
                description: "Não foi possível iniciar a sessão. Tente novamente.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    }, [testData, testId, toast]); // ✅ REMOVIDO: startTimerSync e startAutoSave para evitar dependência circular

    // ✅ NOVO: Salvar resposta
    const saveAnswer = useCallback(async (questionId: string, answer: string | string[] | null): Promise<void> => {
        if (!session || !testData) return;

        try {
            // Encontrar a questão para determinar o tipo
            const question = testData.questions.find(q => q.id === questionId);
            if (!question) return;

            let answerValue: string;

            // Verificar se é questão dissertativa (sem options ou options vazio)
            const isEssayQuestion = question.type === "essay" ||
                question.type === "open" ||
                question.type === "dissertativa" ||
                !question.options ||
                question.options.length === 0;

            if (isEssayQuestion) {
                // Para questões dissertativas, salvar apenas o texto
                answerValue = Array.isArray(answer) ? answer.join(',') : (answer || '');
            } else {
                // Para questões de múltipla escolha, manter formato atual
                answerValue = Array.isArray(answer) ? answer.join(',') : (answer || '');
            }

            // Atualizar estado local
            setAnswers(prev => ({
                ...prev,
                [questionId]: {
                    question_id: questionId,
                    answer: answerValue
                }
            }));

            // Salvar no backend
            await EvaluationApiService.savePartialAnswers({
                session_id: session.session_id,
                answers: [{
                    question_id: questionId,
                    answer: answerValue
                }]
            });

        } catch (error) {
            toast({
                title: "⚠️ Erro ao salvar",
                description: "Sua resposta pode não ter sido salva. Verifique sua conexão.",
                variant: "destructive",
            });
        }
    }, [session, testData, toast]);

    // ✅ NOVO: Salvar automaticamente
    // ✅ REMOVIDO: Auto-save está causando dupla execução de savePartialAnswers
    // const startAutoSave = useCallback((sessionId: string) => {
    //     // ✅ NOVO: Limpar timer anterior se existir
    //     if (saveIntervalRef.current) {
    //         clearInterval(saveIntervalRef.current);
    //         saveIntervalRef.current = null;
    //     }

    //     // Salvar a cada 2 minutos
    //     saveIntervalRef.current = setInterval(async () => {
    //         // ✅ NOVO: Verificar se ainda está ativo antes de continuar
    //         if (evaluationState !== 'active' || isSubmitting) {
    //             if (saveIntervalRef.current) {
    //                 clearInterval(saveIntervalRef.current);
    //                 saveIntervalRef.current = null;
    //             }
    //             return;
    //         }

    //         if (Object.keys(answers).length > 0) {
    //         try {
    //             const answersArray = Object.values(answers);
    //             await EvaluationApiService.savePartialAnswers({
    //                 session_id: sessionId,
    //                 answers: answersArray
    //         });
    //         } catch (error) {
    //             // Erro silencioso no salvamento automático
    //         }
    //         }
    //     }, 2 * 60 * 1000); // 2 minutos
    // }, [answers, evaluationState, isSubmitting]); // ✅ NOVO: Adicionar dependências

    // ✅ NOVO: Submeter avaliação
    const handleSubmitTest = useCallback(async (automatic = false): Promise<void> => {
        // ✅ NOVO: Proteção contra múltiplas chamadas
        if (!session || !testData) return;
        
        // ✅ NOVO: Verificar se já foi enviada
        if (evaluationState === 'completed') {
            console.log('⚠️ Avaliação já foi enviada - bloqueando nova submissão');
            return;
        }
        
        // ✅ NOVO: Verificar se já está enviando
        if (isSubmitting) {
            console.log('⚠️ Avaliação já está sendo enviada - bloqueando nova submissão');
            return;
        }
        
        // ✅ NOVO: Verificar se há respostas para enviar
        if (!answers || Object.keys(answers).length === 0) {
            console.log('⚠️ Não há respostas para enviar');
            toast({
                title: "❌ Nenhuma resposta",
                description: "Não há respostas para enviar. Responda pelo menos uma questão.",
                variant: "destructive",
            });
            return;
        }

        try {
            setIsSubmitting(true);
            
            // ✅ NOVO: Cancelar TODOS os timers IMEDIATAMENTE para evitar chamadas duplicadas
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            // ✅ REMOVIDO: saveIntervalRef não é mais usado
            // if (saveIntervalRef.current) {
            //     clearInterval(saveIntervalRef.current);
            //     saveIntervalRef.current = null;
            // }
            if (syncTimerRef.current) {
                clearInterval(syncTimerRef.current);
                syncTimerRef.current = null;
            }

            const answersArray = Object.values(answers);
            const results = await EvaluationApiService.submitTest({
                session_id: session.session_id,
                answers: answersArray
            });

            // ✅ NOVO: Salvar resultados imediatos
            setResults(results.results);
            setEvaluationState('completed');

            // ✅ NOVO: Limpar dados do localStorage

            // Limpar dados de avaliação em progresso
            localStorage.removeItem("evaluation_in_progress");
            localStorage.removeItem("current_evaluation_data");

            // Limpar dados de sessão
            localStorage.removeItem(`test_session_${testId}`);
            localStorage.removeItem(`test_answers_${testId}`);

            // Limpar dados de avaliação atual
            sessionStorage.removeItem("current_evaluation");
            sessionStorage.removeItem("evaluation_session");

            // ✅ REMOVIDO: Não gerenciar status de conclusão no localStorage
            // O backend controla o status da avaliação através do campo status

            toast({
                title: "✅ Avaliação enviada!",
                description: "Sua avaliação foi enviada com sucesso. Aguarde a correção.",
            });

        } catch (error) {
            // ✅ NOVO: Em caso de erro, permitir nova tentativa
            setEvaluationState('active');
            toast({
                title: "❌ Erro ao finalizar",
                description: "Não foi possível finalizar a avaliação. Tente novamente.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    }, [session, testData, answers, toast, testId, user?.id, evaluationState, isSubmitting]);

    // ✅ NOVO: Ref para evitar dependência circular
    const handleSubmitTestRef = useRef(handleSubmitTest);
    handleSubmitTestRef.current = handleSubmitTest;

    // ✅ NOVO: Timer countdown local
    useEffect(() => {
        if (evaluationState === 'active' && session && !isTimeUp && timeRemaining > 0) {

            timerRef.current = setInterval(() => {
                setTimeRemaining(prev => {
                    const newTime = prev - 1;

                    // Avisos de tempo
                    if (newTime === 300) { // 5 minutos
                        toast({
                            title: "⏰ Atenção!",
                            description: "Restam apenas 5 minutos",
                            variant: "destructive",
                        });
                    }

                    if (newTime <= 0) {
                        setIsTimeUp(true);
                        // ✅ NOVO: Verificar se já foi enviada antes de chamar
                        if (!isSubmitting) {
                            handleSubmitTestRef.current(true);
                        }
                        return 0;
                    }

                    return newTime;
                });
            }, 1000);

            return () => {
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                }
            };
        }
    }, [evaluationState, session, isTimeUp, timeRemaining, toast, isSubmitting]);

    // ✅ NOVO: Controle de visibilidade (pausar timer)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                setIsPaused(true);
            } else {
                setIsPaused(false);
            }
        };

        if (session?.status === 'em_andamento') {
            document.addEventListener('visibilitychange', handleVisibilityChange);
            return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
        }
    }, [session?.status]);

    // ✅ NOVO: Carregar dados iniciais
    useEffect(() => {
        let isMounted = true;
        
        const initializeEvaluation = async () => {
            try {
                if (!isMounted) return;
                
                setEvaluationState('loading');

                // Carregar dados da avaliação usando o endpoint principal
                const data = await EvaluationApiService.getTestData(testId);
                
                if (!isMounted) return;

                // ✅ VERIFICAR: Se há questões na resposta
                if (!data.questions || data.questions.length === 0) {
                    setEvaluationState('error');
                    toast({
                        title: "❌ Avaliação sem questões",
                        description: "Esta avaliação não possui questões cadastradas. Entre em contato com o professor.",
                        variant: "destructive",
                    });
                    return;
                }

                // ✅ CORRIGIDO: Garantir que totalQuestions seja definido
                const processedData = {
                    ...data,
                    totalQuestions: data.totalQuestions || data.total_questions || data.questions.length
                };

                if (!isMounted) return;
                setTestData(processedData);

                // Verificar se há sessão ativa
                const hasActiveSession = await checkActiveSession();

                if (!isMounted) return;
                
                if (!hasActiveSession) {
                    setEvaluationState('instructions');
                } else {
                    // ✅ NOVO: Carregar respostas salvas se há sessão ativa
                    await loadSavedAnswers();
                }

            } catch (error) {
                if (isMounted) {
                    setEvaluationState('error');
                }
            }
        };

        initializeEvaluation();
        
        return () => {
            isMounted = false;
        };
    }, [testId]);

    // ✅ NOVO: Carregar respostas salvas
    const loadSavedAnswers = useCallback(async () => {
        if (!session?.session_id || !testData) return;

        try {
            // Buscar respostas salvas do backend
            const response = await api.get(`/student-answers/sessions/${session.session_id}/answers`);
            const savedAnswers = response.data.answers || [];

            // Processar respostas salvas
            const processedAnswers: Record<string, StudentAnswer> = {};
            
            savedAnswers.forEach((savedAnswer: { question_id: string; answer: string }) => {
                const question = testData.questions.find(q => q.id === savedAnswer.question_id);
                if (!question) return;

                let answerValue = savedAnswer.answer;

                // ✅ CORRIGIDO: Processar respostas de questões dissertativas
                if (question.type === "essay" || 
                    question.type === "open" || 
                    question.type === "dissertativa" ||
                    !question.options ||
                    question.options.length === 0) {
                    
                    // Se a resposta está em formato JSON, extrair o texto
                    try {
                        const parsed = JSON.parse(answerValue);
                        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].text) {
                            answerValue = parsed[0].text;
                        }
                    } catch (e) {
                        // Se não é JSON válido, usar o valor como está
                    }
                }

                processedAnswers[savedAnswer.question_id] = {
                    question_id: savedAnswer.question_id,
                    answer: answerValue
                };
            });

            setAnswers(processedAnswers);

        } catch (error) {
            // Erro silencioso ao carregar respostas
        }
    }, [session?.session_id, testData]);

    // ✅ NOVO: Navegar entre questões
    const navigateToQuestion = useCallback((index: number) => {
        if (index >= 0 && index < (testData?.questions.length || 0)) {
            setCurrentQuestionIndex(index);
        }
    }, [testData?.questions.length]);

    // ✅ NOVO: Cleanup de todos os timers ao desmontar o componente
    useEffect(() => {
        return () => {
            console.log('🧹 Cleanup: Limpando todos os timers ao desmontar');
            
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            
            // ✅ REMOVIDO: saveIntervalRef não é mais usado
            // if (saveIntervalRef.current) {
            //     clearInterval(saveIntervalRef.current);
            //     saveIntervalRef.current = null;
            // }
            
            if (syncTimerRef.current) {
                clearInterval(syncTimerRef.current);
                syncTimerRef.current = null;
            }
        };
    }, []);

    // ✅ NOVO: Limpar todos os timers quando avaliação for completada
    useEffect(() => {
        if (evaluationState === 'completed') {
            console.log('🧹 Limpando todos os timers - avaliação completada');
            
            // Limpar timer local
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            
            // ✅ REMOVIDO: saveIntervalRef não é mais usado
            // if (saveIntervalRef.current) {
            //     clearInterval(saveIntervalRef.current);
            //     saveIntervalRef.current = null;
            // }
            
            // Limpar timer de sincronização
            if (syncTimerRef.current) {
                clearInterval(syncTimerRef.current);
                syncTimerRef.current = null;
            }
        }
    }, [evaluationState]);

    // ✅ NOVO: Ref para evitar dependência circular
    return {
        // Estados
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

        // Ações
        startTestSession,
        saveAnswer,
        submitTest: handleSubmitTest,
        navigateToQuestion,
    };
} 