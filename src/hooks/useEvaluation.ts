import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/authContext';
import { EvaluationApiService, SessionStorage, TestSessionInfo } from '@/services/evaluationApi';
import {
    TestData,
    TestSession,
    StudentAnswer,
    TestResults,
    EvaluationState
} from '@/types/evaluation-types';

interface UseEvaluationProps {
    testId: string;
}

export function useEvaluation({ testId }: UseEvaluationProps) {
    const { user } = useAuth();
    const { toast } = useToast();

    // Estados principais
    const [evaluationState, setEvaluationState] = useState<EvaluationState>('loading');
    const [testData, setTestData] = useState<TestData | null>(null);
    const [session, setSession] = useState<TestSession | null>(null);
    const [sessionInfo, setSessionInfo] = useState<TestSessionInfo | null>(null); // ✅ NOVO: informações da sessão
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, StudentAnswer>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [results, setResults] = useState<TestResults | null>(null);

    // Controle de tempo individual por sessão
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [isTimeUp, setIsTimeUp] = useState(false);
    const [isPaused, setIsPaused] = useState(false); // ✅ NOVO: controle de pausa
    const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null); // ✅ NOVO: início da sessão
    const [totalPausedTime, setTotalPausedTime] = useState(0); // ✅ NOVO: tempo total pausado
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const statusCheckRef = useRef<NodeJS.Timeout | null>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pauseStartTime = useRef<Date | null>(null); // ✅ NOVO: início da pausa atual

    // ✅ NOVO: Buscar informações da sessão do teste
    const loadSessionInfo = useCallback(async () => {
        try {
            console.log('Buscando informações da sessão para o teste:', testId);
            const sessionInfoData = await EvaluationApiService.getTestSessionInfo(testId);
            setSessionInfo(sessionInfoData);

            console.log('Informações da sessão carregadas:', sessionInfoData);

            // Se existe uma sessão ativa, configurar o cronômetro
            if (sessionInfoData.session_exists && sessionInfoData.status === 'em_andamento') {
                console.log('Sessão ativa encontrada, configurando cronômetro...');

                // ✅ AJUSTE FINAL: Nunca usar testData.duration
                const isNovaSessao = !sessionInfoData.timer_started;
                const minutos = isNovaSessao
                    ? sessionInfoData.time_limit_minutes
                    : sessionInfoData.remaining_time_minutes;
                setTimeRemaining((minutos || 1) * 60);

                if (sessionInfoData.timer_started && sessionInfoData.actual_start_time) {
                    const sessionStart = new Date(sessionInfoData.actual_start_time);
                    setSessionStartTime(sessionStart);
                    setTotalPausedTime(0);
                    setIsPaused(false);

                    console.log('Cronômetro já iniciado, tempo restante:', minutos * 60, 'segundos');
                } else {
                    setSessionStartTime(null);
                    setTotalPausedTime(0);
                    setIsPaused(false);

                    console.log('Cronômetro não iniciado, aguardando início manual');

                    if (!sessionInfoData.timer_started) {
                        toast({
                            title: "⏸️ Cronômetro não iniciado",
                            description: "Clique em 'Iniciar Cronômetro' para começar a contagem",
                            variant: "default",
                        });
                    }
                }

                const sessionData: TestSession = {
                    session_id: sessionInfoData.session_id,
                    status: sessionInfoData.status as 'em_andamento' | 'finalizada' | 'expirada',
                    started_at: sessionInfoData.started_at,
                    actual_start_time: sessionInfoData.actual_start_time,
                    remaining_time_minutes: sessionInfoData.remaining_time_minutes,
                    time_limit_minutes: sessionInfoData.time_limit_minutes,
                    is_expired: sessionInfoData.is_expired,
                    total_questions: sessionInfoData.total_questions,
                    correct_answers: sessionInfoData.correct_answers,
                    score: sessionInfoData.score,
                    grade: sessionInfoData.grade
                };

                setSession(sessionData);
                setEvaluationState('active');

                const savedAnswers = SessionStorage.getAnswers(testId);
                setAnswers(savedAnswers);

                return;
            }

            setEvaluationState('instructions');

        } catch (error) {
            console.error('Erro ao carregar informações da sessão:', error);
            setEvaluationState('instructions');
        }
    }, [testId, toast]);

    // Carregar dados do teste
    const loadTestData = useCallback(async () => {
        try {
            setEvaluationState('loading');

            // Testar conectividade primeiro
            const isConnected = await EvaluationApiService.testConnection();
            if (!isConnected) {
                // ✅ REMOVIDO: Console.warn para apresentação
                // console.warn('API não está disponível, usando dados salvos ou mock');
            }

            // Primeiro, verificar se há dados salvos no localStorage
            const savedData = localStorage.getItem("current_evaluation_data");
            if (savedData) {
                try {
                    const parsedData = JSON.parse(savedData);

                    // Verificar se os dados são para o teste atual
                    if (parsedData.id === testId) {

                        // Converter dados salvos para o formato TestData
                        const testData: TestData = {
                            id: parsedData.id,
                            title: parsedData.title,
                            subject: parsedData.subject,
                            duration: parsedData.duration,
                            totalQuestions: parsedData.totalQuestions,
                            instructions: parsedData.instructions,
                            questions: parsedData.questions || []
                        };

                        // Se há dados de sessão, criar uma sessão inicial
                        if (parsedData.session_id) {
                            const initialSession: TestSession = {
                                session_id: parsedData.session_id,
                                status: 'em_andamento',
                                started_at: parsedData.started_at,
                                remaining_time_minutes: parsedData.duration,
                                is_expired: false,
                                total_questions: parsedData.totalQuestions,
                                correct_answers: 0,
                                score: 0,
                                grade: null
                            };
                            setSession(initialSession);
                            setTimeRemaining(parsedData.duration * 60);
                        }

                        setTestData(testData);
                        setEvaluationState('instructions');
                        return;
                    }
                } catch (parseError) {
                    console.error("Erro ao parsear dados salvos:", parseError);
                }
            }

            // Se não há dados salvos e API está disponível, buscar da API
            if (isConnected) {
                const data = await EvaluationApiService.getTestData(testId);
                setTestData(data);
                setEvaluationState('instructions');
            } else {
                // Usar dados mock se API não estiver disponível
                throw new Error('API não disponível');
            }

        } catch (error) {
            console.error("Erro ao carregar dados do teste:", error);
            toast({
                title: "Erro",
                description: "Não foi possível carregar a avaliação. Verifique sua conexão e tente novamente.",
                variant: "destructive",
            });
            setEvaluationState('error');
        }
    }, [testId, toast]);

    // ✅ MODIFICADO: Verificar sessão existente usando a nova rota
    const checkExistingSession = useCallback(async () => {
        try {
            // Usar a nova rota para buscar informações da sessão
            await loadSessionInfo();
        } catch (error) {
            console.error("Erro ao verificar sessão existente:", error);
            setEvaluationState('instructions');
        }
    }, [loadSessionInfo]);

    // Verificar status da sessão
    const checkSessionStatus = useCallback(async () => {
        if (!session?.session_id) return;

        try {
            const statusData = await EvaluationApiService.getSessionStatus(session.session_id);

            setSession(statusData);
            setTimeRemaining(statusData.remaining_time_minutes * 60);

            if (statusData.is_expired || statusData.status === 'expirada') {
                // ✅ CORRIGIDO: Apenas marcar como expirado, a lógica será tratada no useEffect do timer
                setIsTimeUp(true);
            }
        } catch (error) {
            console.error("Erro ao verificar status da sessão:", error);
        }
    }, [session?.session_id]);

    // Iniciar sessão de teste
    const startTestSession = useCallback(async () => {
        if (!testData) return;

        try {
            setIsSubmitting(true);

            // ✅ MODIFICADO: Usar a nova rota para buscar informações da sessão
            const sessionInfoData = await EvaluationApiService.getTestSessionInfo(testId);

            if (!sessionInfoData.session_exists) {
                // Se não existe sessão, criar uma nova
                const sessionData = await EvaluationApiService.startSession({
                    test_id: testId,
                    time_limit_minutes: testData.duration
                });

                // Iniciar o cronômetro explicitamente
                const timerData = await EvaluationApiService.startTimer(sessionData.session_id);

                // ✅ CORRIGIDO: Atualizar sessionInfo com os dados mais recentes
                const updatedSessionInfo = await EvaluationApiService.getTestSessionInfo(testId);
                setSessionInfo(updatedSessionInfo);

                const newSession: TestSession = {
                    session_id: sessionData.session_id,
                    status: 'em_andamento',
                    started_at: timerData.actual_start_time,
                    actual_start_time: timerData.actual_start_time,
                    remaining_time_minutes: timerData.remaining_time_minutes,
                    time_limit_minutes: testData.duration, // ✅ NOVO: usar duração do teste
                    is_expired: false,
                    total_questions: testData.totalQuestions,
                    correct_answers: 0,
                    score: 0,
                    grade: null
                };

                setSession(newSession);
                setTimeRemaining(timerData.remaining_time_minutes * 60);
                setEvaluationState('active');

                // ✅ CORRIGIDO: Inicializar controle de tempo individual com o tempo real do cronômetro
                setSessionStartTime(new Date(timerData.actual_start_time));
                setTotalPausedTime(0);
                setIsPaused(false);

                // Salvar sessão no localStorage
                SessionStorage.saveSession(testId, {
                    session_id: sessionData.session_id,
                    started_at: timerData.actual_start_time
                });

                toast({
                    title: "✅ Avaliação iniciada!",
                    description: "O cronômetro foi iniciado com sucesso",
                });
            } else {
                // Se já existe uma sessão, usar os dados existentes
                const sessionData: TestSession = {
                    session_id: sessionInfoData.session_id,
                    status: sessionInfoData.status as 'em_andamento' | 'finalizada' | 'expirada',
                    started_at: sessionInfoData.started_at,
                    actual_start_time: sessionInfoData.actual_start_time,
                    remaining_time_minutes: sessionInfoData.remaining_time_minutes,
                    time_limit_minutes: sessionInfoData.time_limit_minutes,
                    is_expired: sessionInfoData.is_expired,
                    total_questions: sessionInfoData.total_questions,
                    correct_answers: sessionInfoData.correct_answers,
                    score: sessionInfoData.score,
                    grade: sessionInfoData.grade
                };

                setSession(sessionData);
                setSessionInfo(sessionInfoData);
                setTimeRemaining(sessionInfoData.remaining_time_minutes * 60);
                setEvaluationState('active');

                // ✅ CORRIGIDO: Configurar controle de tempo baseado no status do timer
                if (sessionInfoData.timer_started && sessionInfoData.actual_start_time) {
                    setSessionStartTime(new Date(sessionInfoData.actual_start_time));
                    setTotalPausedTime(0);
                    setIsPaused(false);
                } else {
                    // ✅ CORRIGIDO: Não pausar automaticamente, apenas aguardar início manual
                    setSessionStartTime(null);
                    setTotalPausedTime(0);
                    setIsPaused(false); // ✅ MUDANÇA: Não pausar automaticamente
                }

                toast({
                    title: "✅ Sessão recuperada!",
                    description: "Sua sessão de avaliação foi carregada",
                });
            }

        } catch (error) {
            console.error("Erro ao iniciar sessão:", error);
            toast({
                title: "Erro",
                description: "Não foi possível iniciar a avaliação",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    }, [testData, user, testId, toast]);

    // ✅ NOVO: Iniciar cronômetro manualmente (para sessões existentes)
    const startTimerManually = useCallback(async () => {
        if (!session?.session_id) return;

        try {
            setIsSubmitting(true);

            const timerData = await EvaluationApiService.startTimer(session.session_id);

            // ✅ MODIFICADO: Atualizar informações da sessão usando a nova rota
            const sessionInfoData = await EvaluationApiService.getTestSessionInfo(testId);
            setSessionInfo(sessionInfoData);

            // Atualizar sessão com dados do cronômetro
            setSession(prev => prev ? {
                ...prev,
                started_at: timerData.actual_start_time,
                remaining_time_minutes: timerData.remaining_time_minutes,
                time_limit_minutes: sessionInfoData.time_limit_minutes
            } : null);

            setTimeRemaining(timerData.remaining_time_minutes * 60);

            // Inicializar controle de tempo
            setSessionStartTime(new Date(timerData.actual_start_time));
            setTotalPausedTime(0);
            setIsPaused(false);

            // Atualizar localStorage
            SessionStorage.saveSession(testId, {
                session_id: session.session_id,
                started_at: timerData.actual_start_time
            });

            toast({
                title: "▶️ Cronômetro iniciado!",
                description: "A contagem de tempo foi iniciada",
            });

        } catch (error) {
            console.error("Erro ao iniciar cronômetro:", error);
            toast({
                title: "Erro",
                description: "Não foi possível iniciar o cronômetro",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    }, [session?.session_id, testId, toast]);

    // Salvar respostas
    const saveAnswers = useCallback(async (answersToSave: Record<string, StudentAnswer>) => {
        if (!session?.session_id || Object.keys(answersToSave).length === 0) return;

        try {
            setIsSaving(true);

            const answersArray = Object.values(answersToSave).map(answer => ({
                question_id: answer.question_id,
                answer: answer.answer
            }));

            await EvaluationApiService.savePartialAnswers({
                session_id: session.session_id,
                answers: answersArray
            });

            // Salvar no localStorage como backup
            SessionStorage.saveAnswers(testId, answersToSave);

        } catch (error) {
            console.error("Erro ao salvar respostas:", error);
            toast({
                title: "Aviso",
                description: "Não foi possível salvar as respostas automaticamente",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    }, [session?.session_id, testId, toast]);

    // Auto-save com debounce
    useEffect(() => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        if (Object.keys(answers).length > 0) {
            saveTimeoutRef.current = setTimeout(() => {
                saveAnswers(answers);
            }, 2000);
        }

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [answers, saveAnswers]);

    // ✅ NOVO: Calcular tempo restante baseado na sessão individual
    const calculateRemainingTime = useCallback(() => {
        // ✅ CORRIGIDO: Usar diretamente o remaining_time_minutes da API
        if (sessionInfo?.remaining_time_minutes !== undefined) {
            return sessionInfo.remaining_time_minutes * 60;
        }

        // Fallback para cálculo local se não há dados da API
        if (!session || !sessionStartTime) {
            return 0;
        }

        const timeLimitMinutes = session.time_limit_minutes || sessionInfo?.time_limit_minutes || 60;
        const timeLimitMs = timeLimitMinutes * 60 * 1000;

        const now = new Date();
        const sessionDuration = now.getTime() - sessionStartTime.getTime();
        const effectiveSessionDuration = sessionDuration - totalPausedTime;

        // Se está pausado, não contar o tempo da pausa atual
        let currentPauseDuration = 0;
        if (isPaused && pauseStartTime.current) {
            currentPauseDuration = now.getTime() - pauseStartTime.current.getTime();
        }

        const totalEffectiveTime = effectiveSessionDuration - currentPauseDuration;
        const remainingMs = timeLimitMs - totalEffectiveTime;

        return Math.max(0, Math.floor(remainingMs / 1000));
    }, [session, sessionInfo, sessionStartTime, totalPausedTime, isPaused]);

    // ✅ MODIFICADO: Timer countdown individual por sessão
    useEffect(() => {
        if (session?.status === 'em_andamento' && !isPaused) {
            intervalRef.current = setInterval(() => {
                const remaining = calculateRemainingTime();
                setTimeRemaining(remaining);

                // ✅ CORRIGIDO: Sincronizar com a API a cada 30 segundos
                if (sessionInfo?.session_id && Math.floor(remaining / 30) % 30 === 0) {
                    checkSessionStatus();
                }

                if (remaining === 300) { // 5 minutos
                    toast({
                        title: "⏰ Atenção!",
                        description: "Restam apenas 5 minutos",
                        variant: "destructive",
                    });
                }

                if (remaining <= 0) {
                    setIsTimeUp(true);
                    // handleTimeUp(); // This function is no longer needed here
                }
            }, 1000);
        } else {
            // Limpar interval se pausado ou sessão não ativa
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [session?.status, sessionStartTime, isPaused, calculateRemainingTime, toast, sessionInfo?.session_id, checkSessionStatus]);

    // Timer decrementa localmente
    useEffect(() => {
        if (session?.status === 'em_andamento' && !isPaused && timeRemaining > 0) {
            const interval = setInterval(() => {
                setTimeRemaining(prev => Math.max(0, prev - 1));
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [session?.status, isPaused, timeRemaining]);

    // Sincronizar com a API a cada 30 segundos
    useEffect(() => {
        if (session?.status === 'em_andamento') {
            const syncInterval = setInterval(() => {
                checkSessionStatus();
            }, 30000);
            return () => clearInterval(syncInterval);
        }
    }, [session?.status, checkSessionStatus]);

    // ✅ CORRIGIDO: Controle de visibilidade da página (detectar quando aluno sai da aba)
    useEffect(() => {
        const handleVisibilityChange = () => {
            // ✅ CORRIGIDO: Só pausar se o timer já foi iniciado
            if (document.hidden) {
                // Aluno saiu da aba - pausar timer apenas se já foi iniciado
                if (session?.status === 'em_andamento' && !isPaused && sessionInfo?.timer_started) {
                    setIsPaused(true);
                    pauseStartTime.current = new Date();
                    console.log('⏸️ Timer pausado - aluno saiu da aba');
                }
            } else {
                // Aluno voltou para a aba - retomar timer apenas se estava pausado
                if (session?.status === 'em_andamento' && isPaused && sessionInfo?.timer_started) {
                    if (pauseStartTime.current) {
                        const pauseDuration = new Date().getTime() - pauseStartTime.current.getTime();
                        setTotalPausedTime(prev => prev + pauseDuration);
                        pauseStartTime.current = null;
                    }
                    setIsPaused(false);
                    console.log('▶️ Timer retomado - aluno voltou para a aba');
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [session?.status, isPaused, sessionInfo?.timer_started]);

    // ✅ MODIFICADO: Verificar status da sessão periodicamente
    useEffect(() => {
        if (session?.session_id && session.status === 'em_andamento') {
            statusCheckRef.current = setInterval(() => {
                checkSessionStatus();
            }, 30000); // A cada 30 segundos
        }

        return () => {
            if (statusCheckRef.current) {
                clearInterval(statusCheckRef.current);
            }
        };
    }, [session?.session_id, session?.status, checkSessionStatus]);

    // ✅ MODIFICADO: Carregar dados iniciais
    useEffect(() => {
        loadTestData();
    }, [loadTestData]);

    // ✅ MODIFICADO: Verificar sessão existente quando dados carregados
    useEffect(() => {
        if (testData && user) {
            checkExistingSession();
        }
    }, [testData, user, checkExistingSession]);

    const handleAnswerChange = useCallback((questionId: string, answer: string | string[] | null) => {
        const formattedAnswer = Array.isArray(answer) ? answer.join(',') : (answer || '');

        setAnswers(prev => ({
            ...prev,
            [questionId]: {
                question_id: questionId,
                answer: formattedAnswer
            }
        }));
    }, []);

    const navigateToQuestion = useCallback((index: number) => {
        if (index >= 0 && index < (testData?.questions.length || 0)) {
            setCurrentQuestionIndex(index);
        }
    }, [testData?.questions.length]);

    const handleTimeUp = useCallback(async () => {
        // ✅ NOVO: Verificar se realmente é desta sessão
        if (!session?.session_id || isTimeUp) {
            return; // Evitar múltiplas execuções
        }

        console.log(`⏰ Tempo esgotado para sessão ${session.session_id}`);

        toast({
            title: "⏰ Tempo esgotado!",
            description: "Sua avaliação será enviada automaticamente em 3 segundos",
            variant: "destructive",
        });

        // ✅ NOVO: Pausar timer e limpar intervals
        setIsPaused(true);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        setTimeout(() => {
            // handleSubmitTest(true); // This function is no longer needed here
        }, 3000);
    }, [session?.session_id, isTimeUp, toast]);

    const handleSubmitTest = useCallback(async (automatic = false) => {
        if (isSubmitting || !session?.session_id) {
            return;
        }

        try {
            setIsSubmitting(true);

            // Validar e filtrar respostas
            const validAnswers = Object.values(answers).filter(answer => {
                return answer &&
                    typeof answer.question_id === 'string' &&
                    answer.question_id.trim() !== '' &&
                    typeof answer.answer === 'string';
            });

            const answersArray = validAnswers.map(answer => ({
                question_id: answer.question_id,
                answer: answer.answer || ''
            }));

            const submitData = {
                session_id: session.session_id,
                answers: answersArray
            };

            const response = await EvaluationApiService.submitTest(submitData);

            // Encerrar a sessão para marcar a avaliação como indisponível
            try {
                await EvaluationApiService.endSession(session.session_id);
            } catch (endSessionError) {
                console.error('Erro ao encerrar sessão:', endSessionError);
                // Não falhar o envio se o encerramento falhar
            }

            const resultsData = response.results;
            setResults(resultsData);
            setEvaluationState('completed');

            // Limpar dados locais
            SessionStorage.removeSession(testId);
            SessionStorage.removeAnswers(testId);

            // Limpar dados da avaliação do localStorage
            localStorage.removeItem("current_evaluation_data");

            toast({
                title: "✅ Avaliação enviada com sucesso!",
                description: automatic
                    ? "Sua avaliação foi enviada automaticamente"
                    : "Suas respostas foram salvas com sucesso",
            });

        } catch (error) {
            console.error("Erro ao enviar avaliação:", error);
            toast({
                title: "Erro no envio",
                description: "Não foi possível enviar a avaliação",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    }, [isSubmitting, session?.session_id, answers, testId, toast]);

    return {
        // Estados
        evaluationState,
        testData,
        session,
        sessionInfo, // ✅ NOVO: informações da sessão
        currentQuestionIndex,
        answers,
        isSubmitting,
        isSaving,
        results,
        timeRemaining,
        isTimeUp,
        isPaused, // ✅ NOVO: estado de pausa

        // Ações
        startTestSession,
        startTimerManually, // ✅ NOVO: função para iniciar cronômetro manualmente
        handleAnswerChange,
        navigateToQuestion,
        handleSubmitTest,
        loadTestData
    };
} 