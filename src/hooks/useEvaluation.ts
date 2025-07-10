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

    // Controle de tempo
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [isTimeUp, setIsTimeUp] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const statusCheckRef = useRef<NodeJS.Timeout | null>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
                    console.log("=== DEBUG: loadTestData - Dados salvos encontrados ===");
                    console.log("parsedData:", parsedData);
                    console.log("parsedData.id:", parsedData.id);
                    console.log("testId:", testId);
                    console.log("parsedData.session_id:", parsedData.session_id);

                    // Verificar se os dados são para o teste atual
                    if (parsedData.id === testId) {
                        console.log("Dados correspondem ao teste atual");

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
                            console.log("Criando sessão inicial com session_id:", parsedData.session_id);
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
                            console.log("Sessão inicial criada:", initialSession);
                        } else {
                            console.log("Nenhum session_id encontrado nos dados salvos");
                        }

                        setTestData(testData);
                        setEvaluationState('instructions');
                        return;
                    } else {
                        console.log("Dados não correspondem ao teste atual");
                    }
                } catch (parseError) {
                    console.error("Erro ao parsear dados salvos:", parseError);
                }
            } else {
                console.log("Nenhum dado salvo encontrado no localStorage");
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

            // Dados mock para desenvolvimento
            const mockData: TestData = {
                id: "test-1",
                title: "Avaliação de Matemática - 1º Bimestre",
                subject: { id: "math", name: "Matemática" },
                duration: 60,
                totalQuestions: 5,
                instructions: "Leia atentamente cada questão antes de responder. Você tem 60 minutos para completar a avaliação.",
                questions: [
                    {
                        id: "q1",
                        number: 1,
                        type: "multiple_choice",
                        text: "Qual é o resultado da operação 2,5 + 3,7?",
                        options: [
                            { id: "a", text: "5,2" },
                            { id: "b", text: "6,2" },
                            { id: "c", text: "6,1" },
                            { id: "d", text: "5,3" }
                        ],
                        points: 2,
                        difficulty: "easy"
                    },
                    {
                        id: "q2",
                        number: 2,
                        type: "true_false",
                        text: "A fração 3/4 é equivalente a 0,75.",
                        points: 2,
                        difficulty: "medium"
                    },
                    {
                        id: "q3",
                        number: 3,
                        type: "multiple_choice",
                        text: "Em uma pizza dividida em 8 fatias iguais, se João comeu 3 fatias, que fração da pizza ele comeu?",
                        options: [
                            { id: "a", text: "3/8" },
                            { id: "b", text: "3/5" },
                            { id: "c", text: "5/8" },
                            { id: "d", text: "8/3" }
                        ],
                        points: 3,
                        difficulty: "medium"
                    },
                    {
                        id: "q4",
                        number: 4,
                        type: "multiple_answer",
                        text: "Quais das seguintes frações são maiores que 1/2?",
                        options: [
                            { id: "a", text: "3/4" },
                            { id: "b", text: "2/5" },
                            { id: "c", text: "5/8" },
                            { id: "d", text: "1/3" }
                        ],
                        points: 2,
                        difficulty: "hard"
                    },
                    {
                        id: "q5",
                        number: 5,
                        type: "essay",
                        text: "Explique como você faria para somar as frações 1/4 + 2/3.",
                        points: 1,
                        difficulty: "hard"
                    }
                ]
            };

            setTestData(mockData);
            setEvaluationState('instructions');
        }
    }, [testId, toast]);

    // Verificar sessão existente
    const checkExistingSession = useCallback(async () => {
        try {
            console.log('=== DEBUG: checkExistingSession ===');
            console.log('Verificando sessão existente para teste:', testId);

            const savedSession = SessionStorage.getSession(testId);
            console.log('Sessão salva encontrada:', savedSession);
            console.log('testId usado para buscar sessão:', testId);

            if (savedSession) {
                console.log('Verificando status da sessão:', savedSession.session_id);

                const sessionData = await EvaluationApiService.getSessionStatus(savedSession.session_id);
                console.log('Status da sessão:', sessionData);

                if (sessionData.status === 'em_andamento') {
                    console.log('Sessão em andamento, ativando avaliação');
                    setSession(sessionData);
                    setTimeRemaining(sessionData.remaining_time_minutes * 60);
                    setEvaluationState('active');

                    // Recuperar respostas salvas
                    const savedAnswers = SessionStorage.getAnswers(testId);
                    console.log('Respostas salvas recuperadas:', savedAnswers);
                    setAnswers(savedAnswers);

                    return;
                } else {
                    console.log('Sessão não está em andamento, status:', sessionData.status);
                }
            } else {
                console.log('Nenhuma sessão salva encontrada');
                console.log('Chaves no localStorage:', Object.keys(localStorage));
                console.log('Chaves que começam com test_session_:', Object.keys(localStorage).filter(key => key.startsWith('test_session_')));
            }

            setEvaluationState('instructions');
        } catch (error) {
            console.error("Erro ao verificar sessão existente:", error);
            setEvaluationState('instructions');
        }
    }, [testId]);

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

            console.log('=== DEBUG: startTestSession ===');
            console.log('Iniciando sessão para teste:', testId);
            console.log('Dados do teste:', testData);

            const sessionData = await EvaluationApiService.startSession({
                test_id: testId,
                time_limit_minutes: testData.duration
            });

            console.log('Sessão iniciada:', sessionData);

            const newSession: TestSession = {
                session_id: sessionData.session_id,
                status: 'em_andamento',
                started_at: sessionData.started_at,
                remaining_time_minutes: sessionData.remaining_time_minutes,
                is_expired: false,
                total_questions: testData.totalQuestions,
                correct_answers: 0,
                score: 0,
                grade: null
            };

            console.log('Nova sessão criada:', newSession);

            setSession(newSession);
            setTimeRemaining(sessionData.remaining_time_minutes * 60);
            setEvaluationState('active');

            // Salvar sessão no localStorage
            SessionStorage.saveSession(testId, {
                session_id: sessionData.session_id,
                started_at: sessionData.started_at
            });

            console.log('Sessão salva no SessionStorage');

            toast({
                title: "✅ Sessão iniciada!",
                description: "A avaliação foi iniciada com sucesso",
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

    // Timer countdown
    useEffect(() => {
        if (timeRemaining > 0 && !isTimeUp && session?.status === 'em_andamento') {
            intervalRef.current = setInterval(() => {
                setTimeRemaining(prev => {
                    const newTime = prev - 1;

                    if (newTime === 300) { // 5 minutos
                        toast({
                            title: "⏰ Atenção!",
                            description: "Restam apenas 5 minutos",
                            variant: "destructive",
                        });
                    }

                    if (newTime <= 0) {
                        setIsTimeUp(true);
                        handleTimeUp();
                        return 0;
                    }

                    return newTime;
                });
            }, 1000);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [timeRemaining, isTimeUp, session?.status, toast]);

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
        console.log('=== DEBUG: useEffect checkExistingSession ===');
        console.log('testData:', testData);
        console.log('user:', user);

        if (testData && user) {
            console.log('Chamando checkExistingSession...');
            checkExistingSession();
        } else {
            console.log('Não chamando checkExistingSession - testData ou user não disponível');
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
        toast({
            title: "⏰ Tempo esgotado!",
            description: "A avaliação será enviada automaticamente",
            variant: "destructive",
        });

        setTimeout(() => {
            handleSubmitTest(true);
        }, 3000);
    }, [toast]);

    const handleSubmitTest = useCallback(async (automatic = false) => {
        console.log('=== DEBUG: handleSubmitTest ===');
        console.log('isSubmitting:', isSubmitting);
        console.log('session:', session);
        console.log('session?.session_id:', session?.session_id);
        console.log('answers:', answers);

        if (isSubmitting || !session?.session_id) {
            console.error('Não é possível enviar: isSubmitting =', isSubmitting, 'session_id =', session?.session_id);
            return;
        }

        try {
            setIsSubmitting(true);

            console.log('Enviando avaliação com session_id:', session.session_id);
            console.log('Respostas:', answers);

            const answersArray = Object.values(answers).map(answer => ({
                question_id: answer.question_id,
                answer: answer.answer
            }));

            console.log('Respostas formatadas:', answersArray);

            const response = await EvaluationApiService.submitTest({
                session_id: session.session_id,
                answers: answersArray
            });

            console.log('Resposta do envio:', response);

            // Encerrar a sessão para marcar a avaliação como indisponível
            try {
                await EvaluationApiService.endSession(session.session_id);
                console.log('Sessão encerrada com sucesso');
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

        // Ações
        startTestSession,
        handleAnswerChange,
        navigateToQuestion,
        handleSubmitTest,
        loadTestData
    };
} 