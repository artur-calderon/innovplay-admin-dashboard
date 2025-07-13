import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/authContext';
import { TestSessionManager, SessionConfig } from '@/services/TestSessionManager';
import { TestTimer } from '@/services/TestTimer';
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
    const [isPaused, setIsPaused] = useState(false);

    // Referências para as novas classes
    const sessionManagerRef = useRef<TestSessionManager | null>(null);
    const timerRef = useRef<TestTimer | null>(null);

    // Configuração do gerenciador de sessão
    const sessionConfig: SessionConfig = {
        testId,
        onSessionStart: (session: TestSession) => {
            console.log('✅ Sessão iniciada:', session);
            setSession(session);
            setEvaluationState('active');
        },
        onSessionError: (error: any) => {
            console.error('❌ Erro na sessão:', error);
            toast({
                title: "Erro",
                description: "Erro ao gerenciar sessão da avaliação",
                variant: "destructive",
            });
            setEvaluationState('error');
        },
        onTimeUpdate: (remainingSeconds: number) => {
            setTimeRemaining(remainingSeconds);
        },
        onTimeUp: () => {
            setIsTimeUp(true);
            toast({
                title: "⏰ Tempo esgotado!",
                description: "Sua avaliação será enviada automaticamente em 3 segundos",
                variant: "destructive",
            });
        },
        onWarning: (remainingSeconds: number) => {
            toast({
                title: "⏰ Atenção!",
                description: "Restam apenas 5 minutos",
                variant: "destructive",
            });
        },
        onAutoSubmit: () => {
            console.log('🔄 Auto-submit iniciado');
        }
    };

    // Inicializar gerenciador de sessão
    const initializeSessionManager = useCallback(() => {
        if (!sessionManagerRef.current) {
            sessionManagerRef.current = new TestSessionManager(sessionConfig);
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

            const success = await sessionManagerRef.current.initialize();

            if (success) {
                const state = sessionManagerRef.current.getState();
                console.log('📊 Estado da avaliação:', {
                    testData: state.testData,
                    questionsCount: state.testData?.questions?.length,
                    currentQuestionIndex,
                    isActive: state.isActive
                });

                setTestData(state.testData);
                setAnswers(state.answers);

                if (state.isActive) {
                    setEvaluationState('active');
                    const timer = sessionManagerRef.current.getTimer();
                    if (timer) {
                        timerRef.current = timer;
                        setTimeRemaining(timer.getRemainingSeconds());
                        setIsPaused(timer.getState().isPaused);
                    }
                } else {
                    setEvaluationState('instructions');
                }
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
            return;
        }

        try {
            setIsSubmitting(true);
            const success = await sessionManagerRef.current.startSession();

            if (success) {
                const timer = sessionManagerRef.current.getTimer();
                if (timer) {
                    timerRef.current = timer;
                    setTimeRemaining(timer.getRemainingSeconds());
                }

                toast({
                    title: "✅ Avaliação iniciada!",
                    description: "O cronômetro foi iniciado com sucesso",
                });
            }
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
            const success = await sessionManagerRef.current.submitTest();

            if (success) {
                const state = sessionManagerRef.current.getState();
                setResults(state.results);
                setEvaluationState('completed');

                if (!automatic) {
                    toast({
                        title: "✅ Avaliação enviada!",
                        description: "Sua avaliação foi enviada com sucesso",
                    });
                }
            }
        } catch (error) {
            console.error('❌ Erro ao submeter teste:', error);
            toast({
                title: "Erro",
                description: "Não foi possível enviar a avaliação",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    }, [isSubmitting, toast]);

    // Navegar para questão
    const navigateToQuestion = useCallback((index: number) => {
        if (index >= 0 && index < (testData?.questions.length || 0)) {
            setCurrentQuestionIndex(index);
        }
    }, [testData?.questions.length]);

    // Controle de visibilidade da página
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!sessionManagerRef.current) return;

            if (document.hidden) {
                // Aluno saiu da aba
                sessionManagerRef.current.pauseSession();
                setIsPaused(true);
            } else {
                // Aluno voltou para a aba
                sessionManagerRef.current.resumeSessionFromPause();
                setIsPaused(false);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // Inicializar quando o componente montar
    useEffect(() => {
        initializeEvaluation();
    }, [initializeEvaluation]);

    // Limpar recursos quando o componente desmontar
    useEffect(() => {
        return () => {
            if (sessionManagerRef.current) {
                sessionManagerRef.current.destroy();
            }
        };
    }, []);

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
    };
} 