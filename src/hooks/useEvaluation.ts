import { useState, useEffect, useCallback, useRef } from 'react';
import { EvaluationApiService, SessionGone410Response } from '@/services/evaluation/evaluationApi';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/authContext';
import { TestData, TestSession, StudentAnswer, TestResults, EvaluationState, SubmitTestResponse } from '@/types/evaluation-types';

interface UseEvaluationProps {
    testId: string;
}

/** Converte respostas do backend (410 ou GET answers) no formato do estado (com parse de essay). */
function processSavedAnswersIntoState(
    questions: TestData['questions'],
    savedAnswers: Array<{ question_id: string; answer: string }>
): Record<string, StudentAnswer> {
    const processed: Record<string, StudentAnswer> = {};
    savedAnswers.forEach((saved) => {
        const question = questions?.find((q) => q.id === saved.question_id);
        if (!question) return;
        let answerValue = saved.answer;
        if (question.type === 'essay' || question.type === 'open' || question.type === 'dissertativa' || !question.options?.length) {
            try {
                const parsed = JSON.parse(answerValue);
                if (Array.isArray(parsed)?.length && parsed[0]?.text) answerValue = parsed[0].text;
            } catch { /* usar valor como está */ }
        }
        processed[saved.question_id] = { question_id: saved.question_id, answer: answerValue };
    });
    return processed;
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
    const [isSavingPartial, setIsSavingPartial] = useState(false);
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
    const initializingRef = useRef(false);
    const savePartialTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const answersRef = useRef<Record<string, StudentAnswer>>({});
    const sessionRef = useRef<TestSession | null>(null);

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

    // ✅ NOVO: Verificar se há sessão ativa (retorna active e sessionId para carregar respostas ao retomar)
    const checkActiveSession = useCallback(async (): Promise<{ active: boolean; sessionId?: string }> => {
        try {
            const sessionInfo = await EvaluationApiService.getTestSessionInfo(testId);

            if (sessionInfo.session_exists && sessionInfo.status === 'em_andamento') {
                // ✅ NOVO: Validar se a sessão pertence ao teste atual
                if (sessionInfo.test_id && sessionInfo.test_id !== testId) {
                    console.error('❌ Sessão ativa encontrada pertence a outro teste:', {
                        requestedTestId: testId,
                        sessionTestId: sessionInfo.test_id,
                        sessionId: sessionInfo.session_id
                    });

                    toast({
                        title: "⚠️ Sessão inválida detectada",
                        description: "Foi encontrada uma sessão de outro teste. Limpando e iniciando nova sessão...",
                        variant: "destructive",
                    });

                    return { active: false };
                }

                // Duração total da prova: sempre duration ou duration_minutes (API), em minutos.
                const evaluationDuration = testData?.duration ?? testData?.duration_minutes ?? 60;

                const startTime = new Date(sessionInfo.actual_start_time);
                const elapsedMinutes = Math.max(0, Math.floor((Date.now() - startTime.getTime()) / (1000 * 60)));
                const remainingMinutes = Math.min(evaluationDuration, Math.max(0, evaluationDuration - elapsedMinutes));

                // ✅ CORRIGIDO: Não chamar handleSubmitTest automaticamente aqui
                if (remainingMinutes <= 0) {
                    setIsTimeUp(true);
                    return { active: true, sessionId: sessionInfo.session_id };
                }

                setSession({
                    session_id: sessionInfo.session_id,
                    status: sessionInfo.status,
                    started_at: sessionInfo.started_at,
                    actual_start_time: sessionInfo.actual_start_time,
                    time_limit_minutes: evaluationDuration,
                    remaining_time_minutes: remainingMinutes,
                    total_questions: sessionInfo.total_questions,
                    correct_answers: sessionInfo.correct_answers,
                    score: sessionInfo.score,
                    grade: sessionInfo.grade,
                    is_expired: remainingMinutes <= 0
                });

                setTimeRemaining(remainingMinutes * 60);
                sessionStartTimeRef.current = startTime;
                setIsPaused(false);
                setEvaluationState('active');

                startTimerSync(sessionInfo.session_id, elapsedMinutes, remainingMinutes);

                return { active: true, sessionId: sessionInfo.session_id };
            }

            return { active: false };
        } catch (error) {
            console.error('❌ Erro ao verificar sessão ativa:', error);
            return { active: false };
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [testId, testData?.duration, toast]); // ✅ REMOVIDO: startTimerSync para evitar dependência circular

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

            // ✅ CORRIGIDO: Não chamar handleSubmitTest automaticamente aqui
            // Deixar o timer local gerenciar isso para evitar duplicação
            if (remainingMinutes <= 0) {
                setIsTimeUp(true);
                // Não submeter automaticamente - deixar o timer local fazer isso
            }
        }, 5 * 60 * 1000); // 5 minutos
    }, [evaluationState, isSubmitting, syncTimerWithBackend]); // ✅ CORRIGIDO: Adicionar syncTimerWithBackend como dependência

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

            // Duração da prova em minutos (só duration/duration_minutes do teste)
            const evaluationDuration = testData.duration ?? testData.duration_minutes ?? 60;

            // Iniciar nova sessão com a duração da avaliação
            const sessionData = await EvaluationApiService.startSession(testId, evaluationDuration);

            // ✅ NOVO: Validar se a sessão retornada pertence ao teste atual
            if (sessionData.test_id && sessionData.test_id !== testId) {
                console.error('❌ Sessão retornada não pertence ao teste atual:', {
                    requestedTestId: testId,
                    returnedTestId: sessionData.test_id,
                    sessionId: sessionData.session_id
                });
                
                toast({
                    title: "❌ Erro de sessão",
                    description: "A sessão retornada pertence a outro teste. Limpando e tentando novamente...",
                    variant: "destructive",
                });
                
                // Limpar sessão antiga e tentar novamente
                setSession(null);
                setEvaluationState('instructions');
                setIsSaving(false);
                
                // Tentar novamente após um pequeno delay
                setTimeout(async () => {
                    try {
                        const retrySessionData = await EvaluationApiService.startSession(testId);
                        if (retrySessionData.test_id && retrySessionData.test_id !== testId) {
                            throw new Error('Sessão ainda pertence a outro teste após retry');
                        }
                        // Se chegou aqui, a sessão é válida - continuar com o fluxo normal
                        const newSession: TestSession = {
                            session_id: retrySessionData.session_id,
                            status: 'em_andamento',
                            started_at: retrySessionData.started_at,
                            actual_start_time: retrySessionData.actual_start_time,
                            time_limit_minutes: evaluationDuration,
                            remaining_time_minutes: evaluationDuration,
                            total_questions: testData.totalQuestions,
                            correct_answers: 0,
                            score: 0,
                            grade: null,
                            is_expired: false
                        };
                        setSession(newSession);
                        setTimeRemaining(evaluationDuration * 60);
                        sessionStartTimeRef.current = new Date(retrySessionData.actual_start_time);
                        setIsPaused(false);
                        setEvaluationState('active');
                        startTimerSync(retrySessionData.session_id, 0, evaluationDuration);
                    } catch (retryError) {
                        console.error('❌ Erro ao tentar novamente:', retryError);
                        toast({
                            title: "❌ Erro ao iniciar avaliação",
                            description: "Não foi possível iniciar uma sessão válida. Recarregue a página e tente novamente.",
                            variant: "destructive",
                        });
                        setEvaluationState('error');
                    }
                }, 1000);
                return;
            }

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
            console.error('❌ Erro ao iniciar sessão:', error);
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            
            // ✅ NOVO: Mensagem mais específica para erro de sessão de outro teste
            if (errorMessage.includes('pertence a outro teste')) {
                toast({
                    title: "❌ Erro de sessão",
                    description: "Foi detectada uma sessão de outro teste. Recarregue a página para iniciar uma nova sessão.",
                    variant: "destructive",
                });
                setEvaluationState('error');
            } else {
                toast({
                    title: "❌ Erro ao iniciar avaliação",
                    description: "Não foi possível iniciar a sessão. Tente novamente.",
                    variant: "destructive",
                });
            }
        } finally {
            setIsSaving(false);
        }
    }, [testData, testId, toast, startTimerSync]); // ✅ ADICIONADO: startTimerSync necessário para retry

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

            // Autosave na API com debounce (2,5 s)
            if (savePartialTimeoutRef.current) {
                clearTimeout(savePartialTimeoutRef.current);
                savePartialTimeoutRef.current = null;
            }
            const DEBOUNCE_MS = 4000;
            savePartialTimeoutRef.current = setTimeout(async () => {
                savePartialTimeoutRef.current = null;
                const currentSession = sessionRef.current;
                const currentAnswers = answersRef.current;
                if (!currentSession?.session_id || Object.keys(currentAnswers).length === 0) return;

                const answersArray = Object.values(currentAnswers).map(a => ({ question_id: a.question_id, answer: a.answer }));

                const doSave = async (): Promise<void> => {
                    await EvaluationApiService.savePartialAnswers({
                        session_id: currentSession.session_id,
                        answers: answersArray
                    });
                };

                setIsSavingPartial(true);
                try {
                    await doSave();
                } catch (firstError: unknown) {
                    const res = (firstError as { response?: { status?: number; data?: SessionGone410Response } })?.response;
                    if (res?.status === 410 && res?.data?.answers && testData?.questions) {
                        const processed = processSavedAnswersIntoState(testData.questions, res.data.answers);
                        setAnswers(processed);
                        setIsTimeUp(true);
                        setEvaluationState('expired');
                        toast({
                            title: 'Sessão expirada ou já finalizada',
                            description: 'Estas foram suas respostas salvas.',
                            variant: 'default'
                        });
                    } else {
                        try {
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            await doSave();
                        } catch (secondError: unknown) {
                            const res2 = (secondError as { response?: { status?: number; data?: SessionGone410Response } })?.response;
                            if (res2?.status === 410 && res2?.data?.answers && testData?.questions) {
                                const processed = processSavedAnswersIntoState(testData.questions, res2.data.answers);
                                setAnswers(processed);
                                setIsTimeUp(true);
                                setEvaluationState('expired');
                                toast({
                                    title: 'Sessão expirada ou já finalizada',
                                    description: 'Estas foram suas respostas salvas.',
                                    variant: 'default'
                                });
                            } else {
                                toast({
                                    title: "Conexão",
                                    description: "Respostas serão salvas quando a conexão voltar.",
                                    variant: "default"
                                });
                            }
                        }
                    }
                } finally {
                    setIsSavingPartial(false);
                }
            }, DEBOUNCE_MS);

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
        // ✅ NOVO: Proteção contra múltiplas chamadas simultâneas
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

        // ✅ NOVO: Verificar se há sessão válida
        if (!session.session_id) {
            console.log('⚠️ Sessão inválida - bloqueando submissão');
            toast({
                title: "❌ Sessão inválida",
                description: "Sua sessão de avaliação não é válida. Recarregue a página.",
                variant: "destructive",
            });
            return;
        }

        // ✅ NOVO: Validar período de disponibilidade antes de submeter
        if (testData.startDateTime && testData.endDateTime) {
            const now = new Date();
            const startDate = new Date(testData.startDateTime);
            const endDate = new Date(testData.endDateTime);

            console.log('🔍 Validação de período de disponibilidade:', {
                now: now.toISOString(),
                startDateTime: testData.startDateTime,
                endDateTime: testData.endDateTime,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                isAfterStart: now >= startDate,
                isBeforeEnd: now <= endDate,
                isPeriodValid: now >= startDate && now <= endDate
            });

            if (now < startDate) {
                console.error('❌ Avaliação ainda não começou');
                toast({
                    title: "⏰ Avaliação não iniciada",
                    description: "O período de disponibilidade desta avaliação ainda não começou.",
                    variant: "destructive",
                });
                setEvaluationState('error');
                return;
            }

            if (now > endDate) {
                console.error('❌ Período de disponibilidade expirado');
                toast({
                    title: "⏰ Período expirado",
                    description: "O período de disponibilidade desta avaliação expirou. Não é possível submeter respostas.",
                    variant: "destructive",
                });
                setIsTimeUp(true);
                setEvaluationState('expired');
                return;
            }
        }
        
        // ✅ MELHORADO: Validação completa dos dados antes do envio
        if (!answers || Object.keys(answers).length === 0) {
            console.log('⚠️ Não há respostas para enviar');
            toast({
                title: "❌ Nenhuma resposta",
                description: "Não há respostas para enviar. Responda pelo menos uma questão.",
                variant: "destructive",
            });
            return;
        }

        // ✅ NOVO: Validar estrutura das respostas
        const answersArray = Object.values(answers);
        const invalidAnswers = answersArray.filter(answer => 
            !answer || 
            !answer.question_id || 
            !answer.answer || 
            answer.answer.trim() === ''
        );
        
        if (invalidAnswers.length > 0) {
            console.error('❌ Respostas inválidas encontradas:', invalidAnswers);
            toast({
                title: "❌ Dados inválidos",
                description: "Algumas respostas estão corrompidas. Recarregue a página e tente novamente.",
                variant: "destructive",
            });
            return;
        }

        // ✅ NOVO: Validar se todas as respostas têm question_id válido
        const questionIds = testData.questions.map(q => q.id);
        const invalidQuestionIds = answersArray.filter(answer => 
            !questionIds.includes(answer.question_id)
        );
        
        if (invalidQuestionIds.length > 0) {
            console.error('❌ Question IDs inválidos encontrados:', invalidQuestionIds);
            toast({
                title: "❌ Dados corrompidos",
                description: "Algumas respostas referenciam questões inválidas. Recarregue a página.",
                variant: "destructive",
            });
            return;
        }

        console.log('✅ Validação dos dados concluída:', {
            totalAnswers: answersArray.length,
            validAnswers: answersArray.length - invalidAnswers.length,
            sessionId: session.session_id,
            testId: testId
        });

        // ✅ NOVO: Validar sessão e sincronizar timer com backend antes de submeter
        try {
            const sessionInfo = await EvaluationApiService.getTestSessionInfo(testId);
            
            console.log('🔍 Validação de sessão antes de submeter:', {
                sessionExists: sessionInfo.session_exists,
                sessionId: sessionInfo.session_id,
                testId: sessionInfo.test_id,
                status: sessionInfo.status,
                isExpired: sessionInfo.is_expired,
                remainingTimeMinutes: sessionInfo.remaining_time_minutes,
                localTimeRemaining: Math.floor(timeRemaining / 60)
            });
            
            if (sessionInfo.session_exists && sessionInfo.test_id && sessionInfo.test_id !== testId) {
                console.error('❌ Sessão não pertence ao teste atual antes de submeter:', {
                    requestedTestId: testId,
                    sessionTestId: sessionInfo.test_id,
                    sessionId: sessionInfo.session_id
                });
                toast({
                    title: "❌ Sessão inválida",
                    description: "A sessão não pertence a este teste. Recarregue a página para iniciar uma nova sessão.",
                    variant: "destructive",
                });
                setEvaluationState('error');
                return;
            }
            
            if (sessionInfo.session_exists && sessionInfo.session_id !== session.session_id) {
                console.warn('⚠️ Session ID não corresponde:', {
                    currentSessionId: session.session_id,
                    backendSessionId: sessionInfo.session_id
                });
            }
            
            // ✅ NOVO: Verificar se a sessão expirou no backend
            if (sessionInfo.session_exists && (sessionInfo.is_expired || sessionInfo.remaining_time_minutes <= 0)) {
                console.error('❌ Sessão expirada no backend:', {
                    isExpired: sessionInfo.is_expired,
                    remainingTimeMinutes: sessionInfo.remaining_time_minutes,
                    sessionId: sessionInfo.session_id
                });
                toast({
                    title: "⏰ Tempo esgotado",
                    description: "O tempo limite foi excedido. Não é possível submeter respostas.",
                    variant: "destructive",
                });
                setIsTimeUp(true);
                setEvaluationState('expired');
                return;
            }
        } catch (error) {
            // Se getTestSessionInfo falhar (404), pode ser que a sessão não existe mais
            const apiError = error as { response?: { status?: number } };
            if (apiError.response?.status === 404) {
                console.warn('⚠️ Sessão não encontrada no backend antes de submeter');
                toast({
                    title: "⚠️ Sessão não encontrada",
                    description: "A sessão não foi encontrada no servidor. Recarregue a página.",
                    variant: "destructive",
                });
                setEvaluationState('error');
                return;
            }
            // ✅ NOVO: Parar se receber erro 410 (sessão expirada)
            if (apiError.response?.status === 410) {
                console.error('❌ Sessão expirada (410) ao verificar antes de submeter');
                toast({
                    title: "⏰ Sessão expirada",
                    description: "A sessão expirou. Não é possível submeter respostas.",
                    variant: "destructive",
                });
                setIsTimeUp(true);
                setEvaluationState('expired');
                return;
            }
            // Para outros erros, continuar tentando submeter
            console.warn('⚠️ Erro ao verificar sessão antes de submeter:', error);
        }

        // ✅ NOVO: Declarar results fora do try para evitar problemas de escopo
        let results: SubmitTestResponse | null = null;

        try {
            console.log('🚀 Iniciando submissão da avaliação...', {
                automatic,
                evaluationState,
                isSubmitting,
                answersCount: Object.keys(answers).length
            });
            
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
            console.log('📤 Enviando respostas para o backend:', {
                sessionId: session.session_id,
                answersCount: answersArray.length,
                answersPreview: answersArray.map(a => ({
                    question_id: a.question_id,
                    answer: a.answer,
                    hasAnswer: !!a.answer
                }))
            });

            // Enviar save-partial antes do submit (tempo acabou ou saiu da tela: backend recebe o que está em memória)
            try {
                await EvaluationApiService.savePartialAnswers({
                    session_id: session.session_id,
                    answers: answersArray.map(a => ({ question_id: a.question_id, answer: a.answer }))
                });
            } catch (flushError: unknown) {
                const res = (flushError as { response?: { status?: number; data?: SessionGone410Response } })?.response;
                if (res?.status === 410 && res?.data?.answers && testData?.questions) {
                    const processed = processSavedAnswersIntoState(testData.questions, res.data.answers);
                    setAnswers(processed);
                    setIsTimeUp(true);
                    setEvaluationState('expired');
                    localStorage.removeItem(`test_session_${testId}`);
                    localStorage.removeItem(`test_answers_${testId}`);
                    sessionStorage.removeItem('current_evaluation');
                    sessionStorage.removeItem('evaluation_session');
                    toast({
                        title: 'Sessão expirada ou já finalizada',
                        description: 'Estas foram suas respostas salvas.',
                        variant: 'default'
                    });
                    return;
                }
            }

            // ✅ NOVO: Log detalhado antes do envio para debug
            console.log('🔍 Dados que serão enviados:', {
                session_id: session.session_id,
                answers: answersArray,
                testId: testId,
                user: user?.id,
                timestamp: new Date().toISOString()
            });
            
            results = await EvaluationApiService.submitTest({
                session_id: session.session_id,
                test_id: testId, // ✅ Incluir test_id para o backend identificar o tipo
                answers: answersArray
            });

            console.log('✅ Resposta do backend recebida:', results);

            // ✅ CORRIGIDO: Verificar se a resposta é válida baseada no status HTTP, não no campo results
            // A API pode retornar status 201 sem o campo results em algumas situações
            if (!results) {
                console.error('❌ Resposta inválida do backend - dados vazios');
                throw new Error('Resposta inválida do backend - dados vazios');
            }

            // ✅ NOVO: Criar resultados padrão se não existirem
            // O backend retorna dados diretamente no objeto, não dentro de results
            let finalResults = results.results;
            if (!finalResults) {
                console.log('⚠️ Campo results não encontrado, criando resultados padrão a partir dos dados diretos');
                // O backend retorna os dados diretamente no objeto (compatibilidade)
                const responseData = results as SubmitTestResponse & Record<string, unknown>;
                finalResults = {
                    total_questions: (responseData.total_questions as number) ?? 0,
                    correct_answers: (responseData.correct_answers as number) ?? 0,
                    score_percentage: (responseData.score_percentage as number) ?? 0,
                    grade: String((responseData.grade as string | number) ?? 'N/A'),
                    answers_saved: Object.keys(answers).length
                };
            }

            // ✅ NOVO: Salvar resultados (padrão ou da API)
            setResults(finalResults);
            console.log('✅ Definindo estado como completed e resultados:', {
                results: finalResults,
                evaluationState: 'completed'
            });
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
            console.error('❌ Erro ao submeter avaliação:', error);
            
            // ✅ MELHORADO: Log detalhado do erro para debug
            console.error('🔍 Detalhes completos do erro:', {
                message: error.message,
                code: error.code,
                response: error.response?.data,
                status: error.response?.status,
                statusText: error.response?.statusText,
                url: error.config?.url,
                method: error.config?.method,
                timeout: error.config?.timeout,
                stack: error.stack,
                sessionId: session?.session_id,
                answersCount: Object.keys(answers).length,
                testId: testId
            });
            
            // ✅ NOVO: Verificar se já foi enviada com sucesso antes
            if (results) {
                console.log('⚠️ Erro em tentativa duplicada - avaliação já foi enviada com sucesso');
                // Não alterar o estado nem mostrar erro, pois já foi enviada
                return;
            }

            // ✅ MELHORADO: Verificar tipos de erro mais específicos
            // Verificar se o erro tem response (erro do axios) ou é um erro genérico
            const hasResponse = 'response' in error && error.response !== undefined;
            const errorStatus = hasResponse ? error.response?.status : undefined;
            const errorData = hasResponse ? error.response?.data : undefined;
            
            const isNetworkError = !hasResponse || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || error.code === 'ERR_CANCELED';
            const isTimeoutError =
                error.code === 'ECONNABORTED' ||
                error.code === 'ERR_CANCELED' ||
                error.message?.toLowerCase().includes('timeout') ||
                error.message?.toLowerCase().includes('canceled');
            const isValidationError = errorStatus === 400;
            const isServerError = errorStatus !== undefined && errorStatus >= 500;
            const isNotFoundError = errorStatus === 404;
            const isForbiddenError = errorStatus === 403;
            const isGoneError = errorStatus === 410; // ✅ NOVO: Sessão expirada ou tempo limite excedido
            
            // ✅ NOVO: Verificar se é erro genérico do interceptor (sem response mas com mensagem específica)
            const isGenericServerError = !hasResponse && error.message?.includes('Erro interno do servidor');

            if (isGoneError) {
                // ✅ MELHORADO: Tratamento específico para erro 410 (sessão expirada ou inválida)
                console.log('⚠️ Sessão expirada (410) - avaliação ou tempo limite expirado');
                
                // ✅ NOVO: Parar TODOS os timers imediatamente
                console.log('🛑 Parando todos os timers após erro 410...');
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }
                if (syncTimerRef.current) {
                    clearInterval(syncTimerRef.current);
                    syncTimerRef.current = null;
                }
                
                // ✅ NOVO: Log detalhado da resposta de erro
                console.log('🔍 Detalhes do erro 410:', {
                    errorData: errorData,
                    errorDataString: JSON.stringify(errorData),
                    errorDataKeys: errorData ? Object.keys(errorData as Record<string, unknown>) : [],
                    fullError: error
                });
                
                // ✅ NOVO: Verificar se o erro é por sessão de outro teste
                const errorMessageFromServer = (errorData as { error?: string; message?: string; detail?: string })?.error || 
                    (errorData as { error?: string; message?: string; detail?: string })?.message ||
                    (errorData as { error?: string; message?: string; detail?: string })?.detail ||
                    (typeof errorData === 'string' ? errorData : '') ||
                    '';
                
                console.log('📝 Mensagem de erro do servidor:', errorMessageFromServer);
                
                const isSessionMismatch = errorMessageFromServer.toLowerCase().includes('teste') || 
                    errorMessageFromServer.toLowerCase().includes('test') ||
                    errorMessageFromServer.toLowerCase().includes('sessão') ||
                    errorMessageFromServer.toLowerCase().includes('session') ||
                    errorMessageFromServer.toLowerCase().includes('outro') ||
                    errorMessageFromServer.toLowerCase().includes('diferente');
                
                let userMessage: string;
                let userTitle: string;
                
                if (isSessionMismatch) {
                    userTitle = "❌ Sessão inválida";
                    userMessage = "A sessão usada pertence a outro teste. Isso pode acontecer se você iniciou outra avaliação anteriormente. Recarregue a página para iniciar uma nova sessão.";
                    console.error('❌ Erro 410: Sessão de outro teste detectada', {
                        sessionId: session?.session_id,
                        testId: testId,
                        errorMessage: errorMessageFromServer
                    });
                } else {
                    // Sessão expirada/finalizada: usar mensagem amigável e, se vieram respostas no 410, exibir
                    userTitle = "Sessão expirada ou já finalizada";
                    userMessage = "Estas foram suas respostas salvas.";
                    console.log('⏰ Erro 410: Sessão expirada ou finalizada', {
                        sessionId: session?.session_id,
                        testId: testId,
                        hasAnswersInResponse: !!(errorData as SessionGone410Response)?.answers
                    });
                }

                const data410 = errorData as SessionGone410Response | undefined;
                if (data410?.answers && testData?.questions) {
                    const processed = processSavedAnswersIntoState(testData.questions, data410.answers);
                    setAnswers(processed);
                }
                
                toast({
                    title: userTitle,
                    description: userMessage,
                    variant: "default",
                });
                
                setIsTimeUp(true);
                setEvaluationState('expired');
                localStorage.removeItem(`test_session_${testId}`);
                localStorage.removeItem(`test_answers_${testId}`);
                sessionStorage.removeItem("current_evaluation");
                sessionStorage.removeItem("evaluation_session");
                return;
            } else if (isNetworkError || isTimeoutError) {
                // ✅ Verificar erros de rede/timeout antes de erros genéricos do servidor
                console.log('⚠️ Erro de rede/timeout - permitindo nova tentativa');
                const errorMessage = isTimeoutError 
                    ? "A requisição demorou muito para responder. O servidor pode estar processando muitos dados."
                    : "Erro de conexão com o servidor. Verifique sua internet.";
                
                toast({
                    title: "❌ Erro de conexão",
                    description: errorMessage,
                    variant: "destructive",
                });
            } else if (isGenericServerError || isServerError) {
                // ✅ NOVO: Tratamento para erro genérico do servidor (500+)
                console.log('⚠️ Erro do servidor (500+) - pode ser temporário');
                const serverErrorMessage = hasResponse && errorData 
                    ? (errorData as { error?: string; message?: string })?.error || 
                      (errorData as { error?: string; message?: string })?.message ||
                      "Erro interno do servidor. Tente novamente em alguns instantes."
                    : error.message || "Erro interno do servidor. Tente novamente em alguns instantes.";
                
                toast({
                    title: "❌ Erro do servidor",
                    description: serverErrorMessage,
                    variant: "destructive",
                });
            } else if (isValidationError) {
                console.log('⚠️ Erro de validação (400) - pode ser duplicação');
                toast({
                    title: "⚠️ Avaliação já enviada",
                    description: "Esta avaliação já foi enviada anteriormente.",
                    variant: "destructive",
                });
                // Marcar como completed para evitar novas tentativas
                setEvaluationState('completed');
                return;
            } else if (isNotFoundError) {
                console.log('⚠️ Avaliação não encontrada (404)');
                toast({
                    title: "❌ Avaliação não encontrada",
                    description: "A avaliação não foi encontrada no servidor. Recarregue a página.",
                    variant: "destructive",
                });
            } else if (isForbiddenError) {
                console.log('⚠️ Sem permissão (403)');
                toast({
                    title: "❌ Sem permissão",
                    description: "Você não tem permissão para enviar esta avaliação.",
                    variant: "destructive",
                });
            } else {
                console.log('⚠️ Erro desconhecido - permitindo nova tentativa');
                toast({
                    title: "❌ Erro inesperado",
                    description: "Tente novamente ou entre em contato com o suporte.",
                    variant: "destructive",
                });
            }
            
            // ✅ NOVO: Em caso de erro em primeira tentativa, permitir nova tentativa
            setEvaluationState('active');
        } finally {
            setIsSubmitting(false);
        }
    }, [session, testData, answers, toast, testId, user?.id, evaluationState, isSubmitting]);

    // ✅ NOVO: Ref para evitar dependência circular
    const handleSubmitTestRef = useRef(handleSubmitTest);
    handleSubmitTestRef.current = handleSubmitTest;
    const isSubmittingRef = useRef(isSubmitting);
    isSubmittingRef.current = isSubmitting;
    const evaluationStateRef = useRef(evaluationState);
    evaluationStateRef.current = evaluationState;

    // ✅ NOVO: Timer countdown local (interval criado uma vez por sessão ativa, não a cada segundo)
    useEffect(() => {
        if (evaluationState === 'active' && session && !isTimeUp && timeRemaining > 0) {

            timerRef.current = setInterval(() => {
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
                        if (!isSubmittingRef.current && evaluationStateRef.current === 'active') {
                            console.log('⏰ Tempo esgotado - submetendo avaliação automaticamente');
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
    }, [evaluationState, session, isTimeUp, toast]);

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

    // Refs para o callback de debounce do save-partial (evitar closure stale)
    useEffect(() => {
        answersRef.current = answers;
    }, [answers]);
    useEffect(() => {
        sessionRef.current = session;
    }, [session]);

    // Limpar timeout do save-partial ao sair do estado active
    useEffect(() => {
        if (evaluationState !== 'active' && savePartialTimeoutRef.current) {
            clearTimeout(savePartialTimeoutRef.current);
            savePartialTimeoutRef.current = null;
        }
    }, [evaluationState]);

    // ✅ NOVO: Carregar dados iniciais
    useEffect(() => {
        if (initializingRef.current) return;
        initializingRef.current = true;

        let isMounted = true;

        const initializeEvaluation = async () => {
            try {
                if (!isMounted) return;
                
                // ✅ NOVO: Limpar estado anterior que possa estar incorreto
                setEvaluationState('loading');
                setResults(null);
                setSession(null);
                setAnswers({});
                
                // ✅ NOVO: Limpar dados incorretos do localStorage que possam estar causando problemas
                localStorage.removeItem("evaluation_in_progress");
                localStorage.removeItem("current_evaluation_data");
                localStorage.removeItem(`test_session_${testId}`);
                localStorage.removeItem(`test_answers_${testId}`);
                sessionStorage.removeItem("current_evaluation");
                sessionStorage.removeItem("evaluation_session");
                
                console.log('🧹 Dados do localStorage limpos para evitar conflitos');
                console.log('🔄 Iniciando carregamento da avaliação...');

                // Carregar em paralelo: dados da prova + sessão com respostas (uma round-trip a menos ao reabrir)
                const [data, activeSessionWithAnswers] = await Promise.all([
                    EvaluationApiService.getTestData(testId),
                    EvaluationApiService.getActiveSessionWithAnswers(testId).catch(() => null)
                ]);

                if (!isMounted) return;

                console.log('📊 Dados da avaliação carregados:', {
                    testId,
                    hasQuestions: !!data.questions,
                    questionsCount: data.questions?.length || 0,
                    evaluationState: 'loading'
                });

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
                console.log('✅ Dados da avaliação definidos no estado');

                if (!isMounted) return;

                // with-answers já veio em paralelo com getTestData
                if (activeSessionWithAnswers?.session_id && (activeSessionWithAnswers.session_exists !== false) && activeSessionWithAnswers.status === 'em_andamento') {
                    const evaluationDuration = processedData.duration ?? processedData.duration_minutes ?? 60;
                    const startTime = new Date(activeSessionWithAnswers.actual_start_time || activeSessionWithAnswers.started_at);
                    const elapsedMinutes = Math.max(0, Math.floor((Date.now() - startTime.getTime()) / (1000 * 60)));
                    const remainingMinutes = Math.min(evaluationDuration, Math.max(0, evaluationDuration - elapsedMinutes));

                    setSession({
                        session_id: activeSessionWithAnswers.session_id,
                        status: activeSessionWithAnswers.status,
                        started_at: activeSessionWithAnswers.started_at,
                        actual_start_time: activeSessionWithAnswers.actual_start_time,
                        time_limit_minutes: evaluationDuration,
                        remaining_time_minutes: remainingMinutes,
                        total_questions: activeSessionWithAnswers.total_questions ?? processedData.questions?.length ?? 0,
                        correct_answers: activeSessionWithAnswers.correct_answers ?? 0,
                        score: activeSessionWithAnswers.score ?? 0,
                        grade: activeSessionWithAnswers.grade ?? '',
                        is_expired: remainingMinutes <= 0
                    });
                    setTimeRemaining(remainingMinutes * 60);
                    sessionStartTimeRef.current = startTime;
                    setIsPaused(false);
                    if (remainingMinutes <= 0) setIsTimeUp(true);
                    setEvaluationState('active');
                    startTimerSync(activeSessionWithAnswers.session_id, elapsedMinutes, remainingMinutes);

                    const savedAnswers = activeSessionWithAnswers.answers ?? [];
                    const processedAnswers: Record<string, StudentAnswer> = {};
                    savedAnswers.forEach((saved: { question_id: string; answer: string }) => {
                        const question = processedData.questions?.find((q: { id: string }) => q.id === saved.question_id);
                        if (!question) return;
                        let answerValue = saved.answer;
                        if (question.type === 'essay' || question.type === 'open' || question.type === 'dissertativa' || !question.options?.length) {
                            try {
                                const parsed = JSON.parse(answerValue);
                                if (Array.isArray(parsed)?.length && parsed[0]?.text) answerValue = parsed[0].text;
                            } catch { /* usar valor como está */ }
                        }
                        processedAnswers[saved.question_id] = { question_id: saved.question_id, answer: answerValue };
                    });
                    setAnswers(processedAnswers);
                    return;
                }

                // Fallback: sem with-answers ou 404 — verificar sessão e carregar respostas em duas chamadas
                const { active: hasActiveSession, sessionId } = await checkActiveSession();
                if (!isMounted) return;
                if (!hasActiveSession) {
                    console.log('📝 Nenhuma sessão ativa encontrada - definindo estado como instructions');
                    setEvaluationState('instructions');
                } else {
                    console.log('🔄 Sessão ativa encontrada - definindo estado como active');
                    if (sessionId) await loadSavedAnswers(sessionId);
                }

            } catch (error) {
                if (isMounted) {
                    console.error('❌ Erro ao carregar dados da avaliação:', error);
                    setEvaluationState('error');
                }
            }
        };

        initializeEvaluation();

        return () => {
            isMounted = false;
            initializingRef.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [testId]); // ✅ CORRIGIDO: checkActiveSession e loadSavedAnswers são chamados dentro do useEffect, não precisam estar nas dependências

    // ✅ Carregar respostas salvas (GET /student-answers/session/<id>/answers) para restaurar estado ao retomar
    const loadSavedAnswers = useCallback(async (sessionIdParam?: string) => {
        const sid = sessionIdParam ?? session?.session_id;
        if (!sid || !testData) return;

        try {
            const data = await EvaluationApiService.getSessionAnswers(sid);
            const savedAnswers = data.answers || [];

            const processedAnswers: Record<string, StudentAnswer> = {};

            savedAnswers.forEach((savedAnswer: { question_id: string; answer: string }) => {
                const question = testData.questions.find(q => q.id === savedAnswer.question_id);
                if (!question) return;

                let answerValue = savedAnswer.answer;

                if (question.type === "essay" ||
                    question.type === "open" ||
                    question.type === "dissertativa" ||
                    !question.options ||
                    question.options.length === 0) {
                    try {
                        const parsed = JSON.parse(answerValue);
                        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].text) {
                            answerValue = parsed[0].text;
                        }
                    } catch {
                        // usar valor como está
                    }
                }

                processedAnswers[savedAnswer.question_id] = {
                    question_id: savedAnswer.question_id,
                    answer: answerValue
                };
            });

            setAnswers(processedAnswers);
        } catch {
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

            if (syncTimerRef.current) {
                clearInterval(syncTimerRef.current);
                syncTimerRef.current = null;
            }

            if (savePartialTimeoutRef.current) {
                clearTimeout(savePartialTimeoutRef.current);
                savePartialTimeoutRef.current = null;
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

            // Limpar timeout do save-partial
            if (savePartialTimeoutRef.current) {
                clearTimeout(savePartialTimeoutRef.current);
                savePartialTimeoutRef.current = null;
            }
        }
    }, [evaluationState]);

    // ✅ NOVO: Log para debug do estado da avaliação
    useEffect(() => {
        console.log('🔍 Hook useEvaluation - Estado mudou:', {
            evaluationState,
            hasResults: !!results,
            resultsData: results,
            isSubmitting
        });
    }, [evaluationState, results, isSubmitting]);

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
        isSavingPartial,
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