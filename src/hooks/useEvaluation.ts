import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/authContext';
import { EvaluationApiService, SessionStorage } from '@/services/evaluationApi';
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

    // Carregar dados do teste
    const loadTestData = useCallback(async () => {
        try {
            setEvaluationState('loading');

            // Testar conectividade primeiro
            const isConnected = await EvaluationApiService.testConnection();
            if (!isConnected) {
                console.warn('API não está disponível, usando dados salvos ou mock');
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

    // Verificar sessão existente
    const checkExistingSession = useCallback(async () => {
        try {
            const savedSession = SessionStorage.getSession(testId);

            if (savedSession) {
                const sessionData = await EvaluationApiService.getSessionStatus(savedSession.session_id);

                if (sessionData.status === 'em_andamento') {
                    setSession(sessionData);
                    setTimeRemaining(sessionData.remaining_time_minutes * 60);
                    setEvaluationState('active');

                    // ✅ NOVO: Verificar se cronômetro foi iniciado (actual_start_time existe)
                    if (sessionData.actual_start_time) {
                        // Cronômetro já foi iniciado - restaurar controle de tempo
                        const sessionStart = new Date(sessionData.actual_start_time);
                        setSessionStartTime(sessionStart);
                        setTotalPausedTime(0); // Reset - tempo pausado não é persistido
                        setIsPaused(false);
                    } else {
                        // Cronômetro ainda não foi iniciado - mostrar como pausado
                        setSessionStartTime(null);
                        setTotalPausedTime(0);
                        setIsPaused(true);
                        
                        toast({
                            title: "⏸️ Cronômetro não iniciado",
                            description: "Clique em 'Iniciar Cronômetro' para começar a contagem",
                            variant: "default",
                        });
                    }

                    // Recuperar respostas salvas
                    const savedAnswers = SessionStorage.getAnswers(testId);
                    setAnswers(savedAnswers);

                    return;
                }
            }

            setEvaluationState('instructions');
        } catch (error) {
            console.error("Erro ao verificar sessão existente:", error);
            setEvaluationState('instructions');
        }
    }, [testId, toast]);

    // Verificar status da sessão
    const checkSessionStatus = useCallback(async () => {
        if (!session?.session_id) return;

        try {
            const statusData = await EvaluationApiService.getSessionStatus(session.session_id);

            setSession(statusData);
            setTimeRemaining(statusData.remaining_time_minutes * 60);

            if (statusData.is_expired || statusData.status === 'expirada') {
                handleTimeUp();
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

            // 1. Primeiro, criar a sessão (sem iniciar cronômetro)
            const sessionData = await EvaluationApiService.startSession({
                test_id: testId,
                time_limit_minutes: testData.duration
            });

            // 2. Depois, iniciar o cronômetro explicitamente
            const timerData = await EvaluationApiService.startTimer(sessionData.session_id);

            const newSession: TestSession = {
                session_id: sessionData.session_id,
                status: 'em_andamento',
                started_at: timerData.actual_start_time,
                remaining_time_minutes: timerData.remaining_time_minutes,
                is_expired: false,
                total_questions: testData.totalQuestions,
                correct_answers: 0,
                score: 0,
                grade: null
            };

            setSession(newSession);
            setTimeRemaining(timerData.remaining_time_minutes * 60);
            setEvaluationState('active');

            // ✅ NOVO: Inicializar controle de tempo individual com o tempo real do cronômetro
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

            // Atualizar sessão com dados do cronômetro
            setSession(prev => prev ? {
                ...prev,
                started_at: timerData.actual_start_time,
                remaining_time_minutes: timerData.remaining_time_minutes
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

    // ✅ NOVO: Controle de visibilidade da página (detectar quando aluno sai da aba)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Aluno saiu da aba - pausar timer
                if (session?.status === 'em_andamento' && !isPaused) {
                    setIsPaused(true);
                    pauseStartTime.current = new Date();
                    console.log('⏸️ Timer pausado - aluno saiu da aba');
                }
            } else {
                // Aluno voltou para a aba - retomar timer
                if (session?.status === 'em_andamento' && isPaused) {
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
    }, [session?.status, isPaused]);

    // ✅ NOVO: Calcular tempo restante baseado na sessão individual
    const calculateRemainingTime = useCallback(() => {
        if (!session || !sessionStartTime || !session.time_limit_minutes) {
            return 0;
        }

        const now = new Date();
        const sessionDuration = now.getTime() - sessionStartTime.getTime();
        const effectiveSessionDuration = sessionDuration - totalPausedTime;
        
        // Se está pausado, não contar o tempo da pausa atual
        let currentPauseDuration = 0;
        if (isPaused && pauseStartTime.current) {
            currentPauseDuration = now.getTime() - pauseStartTime.current.getTime();
        }
        
        const totalEffectiveTime = effectiveSessionDuration - currentPauseDuration;
        const timeLimitMs = session.time_limit_minutes * 60 * 1000;
        const remainingMs = timeLimitMs - totalEffectiveTime;
        
        return Math.max(0, Math.floor(remainingMs / 1000));
    }, [session, sessionStartTime, totalPausedTime, isPaused]);

    // ✅ MODIFICADO: Timer countdown individual por sessão
    useEffect(() => {
        if (session?.status === 'em_andamento' && sessionStartTime && !isPaused) {
            intervalRef.current = setInterval(() => {
                const remaining = calculateRemainingTime();
                setTimeRemaining(remaining);

                if (remaining === 300) { // 5 minutos
                    toast({
                        title: "⏰ Atenção!",
                        description: "Restam apenas 5 minutos",
                        variant: "destructive",
                    });
                }

                if (remaining <= 0) {
                    setIsTimeUp(true);
                    handleTimeUp();
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
    }, [session?.status, sessionStartTime, isPaused, calculateRemainingTime, toast]);

    // Verificar status da sessão periodicamente
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

    // Carregar dados iniciais
    useEffect(() => {
        loadTestData();
    }, [loadTestData]);

    // Verificar sessão existente quando dados carregados
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
            handleSubmitTest(true);
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