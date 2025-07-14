import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { EvaluationApiService, SessionStorage } from '@/services/evaluationApi';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/authContext';
import { TestData, TestSession, StudentAnswer, TestResults, EvaluationState, TestSessionInfo } from '@/types/evaluation-types';

interface UseEvaluationProps {
    testId: string;
}

export function useEvaluation({ testId }: UseEvaluationProps) {
    // Estados principais
    const [evaluationState, setEvaluationState] = useState<EvaluationState>('loading');
    const [testData, setTestData] = useState<TestData | null>(null);
    const [session, setSession] = useState<TestSession | null>(null);
    const [sessionInfo, setSessionInfo] = useState<TestSessionInfo | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, StudentAnswer>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [results, setResults] = useState<TestResults | null>(null);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [isTimeUp, setIsTimeUp] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    // Refs
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pauseStartTime = useRef<Date | null>(null);

    // Hooks
    const { toast } = useToast();
    const { user } = useAuth();

    // ✅ CORRIGIDO: Funções principais definidas ANTES dos useEffects que as usam
    const handleSubmitTest = useCallback(async (automatic = false) => {
        if (isSubmitting || !session?.session_id) {
            return;
        }

        try {
            setIsSubmitting(true);

            // ✅ CORRIGIDO: Validar e filtrar respostas com melhor tratamento
            const validAnswers = Object.values(answers).filter(answer => {
                return answer &&
                    typeof answer.question_id === 'string' &&
                    answer.question_id.trim() !== '' &&
                    (typeof answer.answer === 'string' || Array.isArray(answer.answer));
            });

            const answersArray = validAnswers.map(answer => ({
                question_id: answer.question_id,
                answer: Array.isArray(answer.answer) ? answer.answer.join(',') : (answer.answer || '')
            }));

            console.log('Respostas a serem enviadas:', answersArray);

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
            console.log('Resultados recebidos da API:', resultsData);
            setResults(resultsData);
            setEvaluationState('completed');

            // ✅ NOVO: Sincronizar status de finalização com StudentEvaluations
            localStorage.removeItem("evaluation_in_progress");
            localStorage.removeItem("current_evaluation_data");

            // ✅ CORRIGIDO: Marcar avaliação como finalizada para StudentEvaluations (específico por aluno)
            const completedEvaluation = {
                evaluationId: testId,
                studentId: user?.id, // ✅ NOVO: Incluir ID do aluno
                completedAt: new Date().toISOString(),
                results: resultsData
            };
            localStorage.setItem(`evaluation_completed_${testId}_${user?.id}`, JSON.stringify(completedEvaluation));

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
    }, [isSubmitting, session?.session_id, answers, testId, toast, user?.id]);

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

        // ✅ CORRIGIDO: Usar setTimeout para chamar handleSubmitTest de forma segura
        setTimeout(async () => {
            try {
                if (isSubmitting || !session?.session_id) {
                    return;
                }

                setIsSubmitting(true);

                // ✅ CORRIGIDO: Validar e filtrar respostas com melhor tratamento
                const validAnswers = Object.values(answers).filter(answer => {
                    return answer &&
                        typeof answer.question_id === 'string' &&
                        answer.question_id.trim() !== '' &&
                        (typeof answer.answer === 'string' || Array.isArray(answer.answer));
                });

                const answersArray = validAnswers.map(answer => ({
                    question_id: answer.question_id,
                    answer: Array.isArray(answer.answer) ? answer.answer.join(',') : (answer.answer || '')
                }));

                console.log('Respostas a serem enviadas (tempo esgotado):', answersArray);

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
                console.log('Resultados recebidos da API (tempo esgotado):', resultsData);
                setResults(resultsData);
                setEvaluationState('completed');

                // ✅ NOVO: Sincronizar status de finalização com StudentEvaluations
                localStorage.removeItem("evaluation_in_progress");
                localStorage.removeItem("current_evaluation_data");

                // ✅ CORRIGIDO: Marcar avaliação como finalizada para StudentEvaluations (específico por aluno)
                const completedEvaluation = {
                    evaluationId: testId,
                    studentId: user?.id, // ✅ NOVO: Incluir ID do aluno
                    completedAt: new Date().toISOString(),
                    results: resultsData
                };
                localStorage.setItem(`evaluation_completed_${testId}_${user?.id}`, JSON.stringify(completedEvaluation));

                // Limpar dados locais
                SessionStorage.removeSession(testId);
                SessionStorage.removeAnswers(testId);

                // Limpar dados da avaliação do localStorage
                localStorage.removeItem("current_evaluation_data");

                toast({
                    title: "✅ Avaliação enviada com sucesso!",
                    description: "Sua avaliação foi enviada automaticamente",
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
        }, 3000);
    }, [session?.session_id, isTimeUp, toast, isSubmitting, answers, testId, user?.id]);

    // ✅ NOVO: Buscar informações da sessão do teste
    const loadSessionInfo = useCallback(async () => {
        try {
            console.log('Buscando informações da sessão para o teste:', testId);
            const sessionInfoData = await EvaluationApiService.getTestSessionInfo(testId);
            setSessionInfo(sessionInfoData);

            console.log('Informações da sessão carregadas:', sessionInfoData);

            // Se existe uma sessão ativa, configurar o cronômetro
            if (sessionInfoData.session_exists && sessionInfoData.status === 'em_andamento') {
                console.log('🕐 Sessão ativa encontrada, configurando cronômetro...');
                console.log('📊 Dados da sessão:', {
                    session_id: sessionInfoData.session_id,
                    timer_started: sessionInfoData.timer_started,
                    time_limit_minutes: sessionInfoData.time_limit_minutes,
                    remaining_time_minutes: sessionInfoData.remaining_time_minutes,
                    actual_start_time: sessionInfoData.actual_start_time,
                    is_expired: sessionInfoData.is_expired
                });

                // ✅ CORRIGIDO: Usar tempo correto baseado no status do timer
                let initialTime: number;
                if (sessionInfoData.timer_started && sessionInfoData.actual_start_time) {
                    // Timer iniciado - usar tempo restante calculado
                    initialTime = sessionInfoData.remaining_time_minutes * 60;
                    console.log('▶️ Cronômetro já iniciado, tempo restante:', initialTime, 'segundos');
                } else {
                    // Timer não iniciado - usar tempo limite total
                    initialTime = sessionInfoData.time_limit_minutes * 60;
                    console.log('⏸️ Cronômetro não iniciado, tempo limite:', initialTime, 'segundos');
                }

                setTimeRemaining(initialTime);
                setIsPaused(!sessionInfoData.timer_started);

                console.log('⏱️ Tempo inicial configurado:', {
                    remaining_minutes: sessionInfoData.remaining_time_minutes,
                    time_limit_minutes: sessionInfoData.time_limit_minutes,
                    remaining_seconds: initialTime,
                    is_paused: !sessionInfoData.timer_started,
                    timer_started: sessionInfoData.timer_started
                });

                if (!sessionInfoData.timer_started) {
                    toast({
                        title: "⏸️ Cronômetro não iniciado",
                        description: "Clique em 'Iniciar Cronômetro' para começar a contagem",
                        variant: "default",
                    });
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

            // ✅ CORRIGIDO: Caso não há sessão ativa - comportamento normal
            console.log('Nenhuma sessão ativa encontrada - aguardando início da avaliação');
            setEvaluationState('instructions');

        } catch (error) {
            // ✅ CORRIGIDO: Só logar erro se não for 404 (que já foi tratado na API)
            if (error && typeof error === 'object' && 'response' in error && (error as any).response?.status !== 404) {
                console.error('Erro ao carregar informações da sessão:', error);
            }
            setEvaluationState('instructions');
        }
    }, [testId]);

    // Inicializar avaliação
    const initializeEvaluation = useCallback(async () => {
        try {
            setEvaluationState('loading');
            initializeSessionManager();

            if (!sessionManagerRef.current) {
                throw new Error('Gerenciador de sessão não inicializado');
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
                console.log('Dados do teste carregados:', data);
                console.log('Questões carregadas:', data.questions);
                if (data.questions && data.questions.length > 0) {
                    console.log('Primeira questão:', data.questions[0]);
                    console.log('Alternativas da primeira questão:', data.questions[0].alternatives);
                    console.log('Opções da primeira questão:', data.questions[0].options);
                }
                setTestData(data);
                setEvaluationState('instructions');
            } else {
                setEvaluationState('error');
            }
        } catch (error) {
            console.error('❌ Erro ao inicializar avaliação:', error);
            setEvaluationState('error');
        }
    }, [initializeSessionManager]);

    // Iniciar sessão de teste
    const startTestSession = useCallback(async () => {
        if (!sessionManagerRef.current) {
            toast({
                title: "Erro",
                description: "Gerenciador de sessão não inicializado",
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
            // ✅ CORRIGIDO: Só logar erro se não for 404 (que já foi tratado na API)
            if (error && typeof error === 'object' && 'response' in error && (error as any).response?.status !== 404) {
                console.error("Erro ao verificar sessão existente:", error);
            }
            setEvaluationState('instructions');
        }
    }, [loadSessionInfo]);

    // ✅ CORRIGIDO: Verificar status da sessão usando apenas a API
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

                // ✅ CORRIGIDO: Usar apenas dados da API
                const sessionInfoUpdated = await EvaluationApiService.getTestSessionInfo(testId);
                setSessionInfo(sessionInfoUpdated);

                const newSession: TestSession = {
                    session_id: sessionData.session_id,
                    status: 'em_andamento',
                    started_at: sessionData.started_at,
                    actual_start_time: sessionData.actual_start_time,
                    remaining_time_minutes: sessionData.remaining_time_minutes,
                    time_limit_minutes: sessionData.time_limit_minutes,
                    is_expired: false,
                    total_questions: testData.totalQuestions,
                    correct_answers: 0,
                    score: 0,
                    grade: null
                };

                setSession(newSession);
                setTimeRemaining(sessionData.remaining_time_minutes * 60);
                setIsPaused(true); // Cronômetro não iniciado ainda

                // Salvar no localStorage
                SessionStorage.saveSession(testId, {
                    session_id: sessionData.session_id,
                    started_at: sessionData.started_at
                });

                toast({
                    title: "✅ Sessão criada!",
                    description: "Clique em 'Iniciar Cronômetro' para começar a avaliação",
                });

            } else {
                // Sessão já existe, usar dados existentes
                setSessionInfo(sessionInfoData);
                setSession({
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
                });
                setTimeRemaining(sessionInfoData.remaining_time_minutes * 60);
                setIsPaused(!sessionInfoData.timer_started);

                const savedAnswers = SessionStorage.getAnswers(testId);
                setAnswers(savedAnswers);

                if (sessionInfoData.timer_started) {
                    toast({
                        title: "✅ Avaliação retomada!",
                        description: "Continue respondendo suas questões",
                    });
                } else {
                    toast({
                        title: "⏸️ Cronômetro não iniciado",
                        description: "Clique em 'Iniciar Cronômetro' para começar a contagem",
                    });
                }
            }

            setEvaluationState('active');

        } catch (error) {
            console.error('❌ Erro ao iniciar sessão:', error);
            toast({
                title: "Erro",
                description: "Não foi possível iniciar a avaliação",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    }, [toast]);

    // Salvar resposta
    const saveAnswer = useCallback((questionId: string, answer: string) => {
        if (sessionManagerRef.current) {
            sessionManagerRef.current.saveAnswer(questionId, answer);
            setAnswers(sessionManagerRef.current.getAnswers());
        }
    }, []);

    // Submeter teste
    const submitTest = useCallback(async (automatic = false) => {
        if (!sessionManagerRef.current || isSubmitting) {
            return;
        }

        try {
            setIsSubmitting(true);
            console.log('🚀 Iniciando cronômetro manualmente para sessão:', session.session_id);

            const timerData = await EvaluationApiService.startTimer(session.session_id);
            console.log('⏱️ Dados do timer recebidos:', timerData);

            // ✅ MODIFICADO: Atualizar informações da sessão usando a nova rota
            const sessionInfoData = await EvaluationApiService.getTestSessionInfo(testId);
            console.log('📊 Dados da sessão após iniciar timer:', sessionInfoData);
            setSessionInfo(sessionInfoData);

            // Atualizar sessão com dados do cronômetro
            setSession(prev => prev ? {
                ...prev,
                started_at: timerData.actual_start_time,
                remaining_time_minutes: timerData.remaining_time_minutes,
                time_limit_minutes: sessionInfoData.time_limit_minutes
            } : null);

            const newTimeRemaining = timerData.remaining_time_minutes * 60;
            setTimeRemaining(newTimeRemaining);
            setIsPaused(false);

            console.log('✅ Cronômetro iniciado com sucesso:', {
                newTimeRemaining,
                timerStarted: sessionInfoData.timer_started,
                actualStartTime: timerData.actual_start_time
            });

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
            console.error("❌ Erro ao iniciar cronômetro:", error);
            toast({
                title: "Erro",
                description: "Não foi possível enviar a avaliação",
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

            // Salvar no localStorage também
            SessionStorage.saveAnswers(testId, answersToSave);

        } catch (error) {
            console.error("Erro ao salvar respostas:", error);
        } finally {
            setIsSaving(false);
        }
    }, [session?.session_id, testId]);

    // ✅ CORRIGIDO: Salvar respostas automaticamente a cada 30 segundos
    useEffect(() => {
        if (Object.keys(answers).length > 0 && session?.session_id) {
            saveTimeoutRef.current = setTimeout(() => {
                saveAnswers(answers);
            }, 30000);

            return () => {
                if (saveTimeoutRef.current) {
                    clearTimeout(saveTimeoutRef.current);
                }
            };
        }
    }, [answers, saveAnswers]);

    // ✅ CORRIGIDO: Timer countdown usando apenas a API
    useEffect(() => {
        console.log('🕐 Timer useEffect - Condições:', {
            sessionStatus: session?.status,
            isPaused,
            timerStarted: sessionInfo?.timer_started,
            sessionId: session?.session_id,
            timeRemaining: timeRemaining
        });

        // ✅ CORRIGIDO: Verificação mais rigorosa das condições
        const shouldStartTimer = session?.status === 'em_andamento' &&
            !isPaused &&
            sessionInfo?.timer_started === true;

        console.log('🔍 Deve iniciar timer?', shouldStartTimer);

        if (shouldStartTimer) {
            console.log('▶️ Iniciando timer - buscando dados da API a cada segundo');

            intervalRef.current = setInterval(async () => {
                try {
                    // ✅ NOVO: Buscar tempo restante da API a cada segundo
                    console.log('🔄 Buscando tempo restante da API...');
                    const statusData = await EvaluationApiService.getSessionStatus(session.session_id);
                    const remaining = statusData.remaining_time_minutes * 60;

                    console.log('📊 Dados da API:', {
                        remaining_time_minutes: statusData.remaining_time_minutes,
                        remaining_seconds: remaining,
                        is_expired: statusData.is_expired,
                        actual_start_time: statusData.actual_start_time,
                        timer_started: statusData.actual_start_time ? true : false
                    });

                    setTimeRemaining(remaining);
                    setSession(statusData);

                    if (remaining === 300) { // 5 minutos
                        toast({
                            title: "⏰ Atenção!",
                            description: "Restam apenas 5 minutos",
                            variant: "destructive",
                        });
                    }

                    if (remaining <= 0 || statusData.is_expired) {
                        console.log('⏰ Tempo esgotado ou sessão expirada');
                        setIsTimeUp(true);
                        handleTimeUp();
                    }
                } catch (error) {
                    console.error("❌ Erro ao verificar tempo restante:", error);
                }
            }, 1000);
        } else {
            // Limpar interval se pausado ou sessão não ativa
            if (intervalRef.current) {
                console.log('⏸️ Parando timer - condições não atendidas:', {
                    sessionStatus: session?.status,
                    isPaused,
                    timerStarted: sessionInfo?.timer_started
                });
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [session?.status, isPaused, sessionInfo?.timer_started, session?.session_id, toast, handleTimeUp, timeRemaining]);

    // Controle de visibilidade da página
    useEffect(() => {
        const handleVisibilityChange = () => {
            // ✅ CORRIGIDO: Só pausar se o timer já foi iniciado E se a sessão está ativa
            if (document.hidden) {
                // Aluno saiu da aba
                sessionManagerRef.current.pauseSession();
                setIsPaused(true);
            } else {
                // Aluno voltou para a aba - retomar timer apenas se estava pausado
                if (session?.status === 'em_andamento' && isPaused && sessionInfo?.timer_started) {
                    setIsPaused(false);
                    pauseStartTime.current = null;
                    console.log('▶️ Timer retomado - aluno voltou para a aba');
                }
            }
        };

        // ✅ CORRIGIDO: Adicionar listener apenas se a sessão está ativa
        if (session?.status === 'em_andamento') {
            document.addEventListener('visibilitychange', handleVisibilityChange);
            return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
        }
    }, [session?.status, isPaused, sessionInfo?.timer_started]);

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
        submitTest,
        navigateToQuestion,
        handleSubmitTest,
    };
} 