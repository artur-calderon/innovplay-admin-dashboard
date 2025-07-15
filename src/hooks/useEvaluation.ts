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
    const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const syncTimerRef = useRef<NodeJS.Timeout | null>(null);
    const sessionStartTimeRef = useRef<Date | null>(null);

    const { toast } = useToast();
    const { user } = useAuth();

    // ✅ NOVO: Sincronizar timer com backend
    const syncTimerWithBackend = useCallback(async (elapsedMinutes: number, remainingMinutes: number) => {
        if (!session?.session_id) return;

        try {
            await EvaluationApiService.syncTimer(session.session_id, elapsedMinutes, remainingMinutes);
            console.log('⏱️ Timer sincronizado:', { elapsedMinutes, remainingMinutes });
        } catch (error) {
            console.error('❌ Erro ao sincronizar timer:', error);
        }
    }, [session?.session_id]);

    // ✅ NOVO: Verificar se há sessão ativa
    const checkActiveSession = useCallback(async (): Promise<boolean> => {
        try {
            const sessionInfo = await EvaluationApiService.getTestSessionInfo(testId);

            if (sessionInfo.session_exists && sessionInfo.status === 'em_andamento') {
                console.log('🔄 Sessão ativa encontrada:', sessionInfo);

                // ✅ CORRIGIDO: Usar duration da avaliação em vez de time_limit_minutes da sessão
                const evaluationDuration = testData?.duration || 60; // fallback para 60 minutos

                // Calcular tempo restante baseado no tempo decorrido
                const startTime = new Date(sessionInfo.actual_start_time);
                const now = new Date();
                const elapsedMinutes = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));
                const remainingMinutes = Math.max(0, evaluationDuration - elapsedMinutes);

                console.log('⏱️ Tempo calculado:', {
                    elapsedMinutes,
                    remainingMinutes,
                    evaluationDuration,
                    sessionTimeLimit: sessionInfo.time_limit_minutes // pode ser null
                });

                // Se o tempo esgotou, finalizar automaticamente
                if (remainingMinutes <= 0) {
                    console.log('⏰ Tempo esgotado, finalizando avaliação automaticamente');
                    await handleSubmitTest(true);
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
            console.error('❌ Erro ao verificar sessão ativa:', error);
            return false;
        }
    }, [testId, testData?.duration]);

    // ✅ NOVO: Iniciar sincronização de timer
    const startTimerSync = useCallback((sessionId: string, initialElapsed: number, initialRemaining: number) => {
        let elapsedMinutes = initialElapsed;
        let remainingMinutes = initialRemaining;

        // Sincronizar a cada 5 minutos
        syncTimerRef.current = setInterval(async () => {
            elapsedMinutes += 5;
            remainingMinutes = Math.max(0, remainingMinutes - 5);

            await syncTimerWithBackend(elapsedMinutes, remainingMinutes);

            // Se o tempo acabou, finalizar
            if (remainingMinutes <= 0) {
                setIsTimeUp(true);
                handleSubmitTest(true);
            }
        }, 5 * 60 * 1000); // 5 minutos
    }, [syncTimerWithBackend]);

    // ✅ NOVO: Iniciar sessão de teste
    const startTestSession = useCallback(async (): Promise<void> => {
        if (!testData) return;

        try {
            setIsSaving(true);
            console.log('🚀 Iniciando sessão de teste...');

            // ✅ CORRIGIDO: Usar duration da avaliação em vez de time_limit_minutes da sessão
            const evaluationDuration = testData.duration;

            // Iniciar nova sessão
            const sessionData = await EvaluationApiService.startSession(testId);
            console.log('✅ Sessão iniciada:', sessionData);

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

            // Iniciar salvamento automático
            startAutoSave(sessionData.session_id);

            toast({
                title: "🎉 Avaliação iniciada!",
                description: `Você tem ${evaluationDuration} minutos para completar`, // ✅ Usar duration da avaliação
            });

        } catch (error) {
            console.error('❌ Erro ao iniciar sessão:', error);
            toast({
                title: "❌ Erro ao iniciar avaliação",
                description: "Não foi possível iniciar a sessão. Tente novamente.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    }, [testData, testId, toast, startTimerSync]);

    // ✅ NOVO: Salvar resposta
    const saveAnswer = useCallback(async (questionId: string, answer: string | string[] | null): Promise<void> => {
        if (!session) return;

        try {
            // Converter array para string se necessário
            const answerValue = Array.isArray(answer) ? answer.join(',') : (answer || '');

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
            console.error('❌ Erro ao salvar resposta:', error);
            toast({
                title: "⚠️ Erro ao salvar",
                description: "Sua resposta pode não ter sido salva. Verifique sua conexão.",
                variant: "destructive",
            });
        }
    }, [session, toast]);

    // ✅ NOVO: Salvar automaticamente
    const startAutoSave = useCallback((sessionId: string) => {
        // Salvar a cada 2 minutos
        saveIntervalRef.current = setInterval(async () => {
            if (Object.keys(answers).length > 0) {
                try {
                    const answersArray = Object.values(answers);
                    await EvaluationApiService.savePartialAnswers({
                        session_id: sessionId,
                        answers: answersArray
                    });
                    console.log('💾 Salvamento automático realizado');
                } catch (error) {
                    console.error('❌ Erro no salvamento automático:', error);
                }
            }
        }, 2 * 60 * 1000); // 2 minutos
    }, [answers]);

    // ✅ NOVO: Submeter avaliação
    const handleSubmitTest = useCallback(async (automatic = false): Promise<void> => {
        if (!session || !testData) return;

        try {
            setIsSubmitting(true);
            console.log('📤 Submetendo avaliação...');

            const answersArray = Object.values(answers);
            const results = await EvaluationApiService.submitTest({
                session_id: session.session_id,
                answers: answersArray
            });

            setResults(results.results);
            setEvaluationState('completed');

            // ✅ NOVO: Limpar dados do localStorage
            console.log('🧹 Limpando dados do localStorage...');

            // Limpar dados de avaliação em progresso
            localStorage.removeItem("evaluation_in_progress");
            localStorage.removeItem("current_evaluation_data");

            // Limpar dados de sessão
            localStorage.removeItem(`test_session_${testId}`);
            localStorage.removeItem(`test_answers_${testId}`);

            // Limpar dados de avaliação atual
            sessionStorage.removeItem("current_evaluation");
            sessionStorage.removeItem("evaluation_session");

            // ✅ NOVO: Marcar avaliação como finalizada (específico por aluno)
            const completedEvaluation = {
                evaluationId: testId,
                studentId: user?.id,
                completedAt: new Date().toISOString(),
                results: results.results
            };
            localStorage.setItem(`evaluation_completed_${testId}_${user?.id}`, JSON.stringify(completedEvaluation));

            console.log('✅ Dados do localStorage limpos e avaliação marcada como finalizada');

            // Limpar timers
            if (timerRef.current) clearInterval(timerRef.current);
            if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
            if (syncTimerRef.current) clearInterval(syncTimerRef.current);

            toast({
                title: "🎉 Avaliação concluída!",
                description: automatic
                    ? "Sua avaliação foi enviada automaticamente"
                    : `Sua nota: ${results.results.score_percentage}%`,
            });

        } catch (error) {
            console.error('❌ Erro ao submeter avaliação:', error);
            toast({
                title: "❌ Erro ao finalizar",
                description: "Não foi possível finalizar a avaliação. Tente novamente.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    }, [session, testData, answers, toast, testId, user?.id]);

    // ✅ NOVO: Timer countdown local
    useEffect(() => {
        if (evaluationState === 'active' && session && !isTimeUp && timeRemaining > 0) {
            console.log('⏱️ Iniciando timer local...');

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
                        console.log('⏰ Tempo esgotado!');
                        setIsTimeUp(true);
                        handleSubmitTest(true);
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
    }, [evaluationState, session, isTimeUp, timeRemaining, toast, handleSubmitTest]);

    // ✅ NOVO: Controle de visibilidade (pausar timer)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                setIsPaused(true);
                console.log('⏸️ Página oculta - timer pausado');
            } else {
                setIsPaused(false);
                console.log('▶️ Página visível - timer retomado');
            }
        };

        if (session?.status === 'em_andamento') {
            document.addEventListener('visibilitychange', handleVisibilityChange);
            return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
        }
    }, [session?.status]);

    // ✅ NOVO: Carregar dados iniciais
    useEffect(() => {
        const initializeEvaluation = async () => {
            try {
                setEvaluationState('loading');
                console.log('🔄 Inicializando avaliação...');

                // Carregar dados da avaliação usando o endpoint principal
                const data = await EvaluationApiService.getTestData(testId);
                console.log('📋 Dados da avaliação carregados:', data);

                // ✅ VERIFICAR: Se há questões na resposta
                if (!data.questions || data.questions.length === 0) {
                    console.log('❌ Nenhuma questão encontrada na avaliação');
                    console.log('📊 Dados recebidos:', {
                        id: data.id,
                        title: data.title,
                        subject: data.subject?.name,
                        questions: data.questions,
                        questionsLength: data.questions?.length || 0
                    });

                    setEvaluationState('error');
                    toast({
                        title: "❌ Avaliação sem questões",
                        description: "Esta avaliação não possui questões cadastradas. Entre em contato com o professor.",
                        variant: "destructive",
                    });
                    return;
                }

                console.log('✅ Questões encontradas:', data.questions.length);
                setTestData(data);

                // Verificar se há sessão ativa
                const hasActiveSession = await checkActiveSession();

                if (!hasActiveSession) {
                    setEvaluationState('instructions');
                }

            } catch (error) {
                console.error('❌ Erro ao inicializar avaliação:', error);
                setEvaluationState('error');
            }
        };

        initializeEvaluation();
    }, [testId, checkActiveSession, toast]);

    // ✅ NOVO: Navegar entre questões
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
        submitTest: handleSubmitTest,
        navigateToQuestion,
    };
} 