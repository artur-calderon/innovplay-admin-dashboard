import { EvaluationApiService, TestSessionInfo } from './evaluationApi';
import { TestTimer, TimerConfig } from './TestTimer';
import { TestData, TestSession, StudentAnswer, TestResults } from '@/types/evaluation-types';

export interface SessionConfig {
    testId: string;
    onSessionStart?: (session: TestSession) => void;
    onSessionError?: (error: any) => void;
    onTimeUpdate?: (remainingSeconds: number) => void;
    onTimeUp?: () => void;
    onWarning?: (remainingSeconds: number) => void;
    onAutoSubmit?: () => void;
}

export interface SessionState {
    isActive: boolean;
    isPaused: boolean;
    sessionInfo: TestSessionInfo | null;
    testData: TestData | null;
    answers: Record<string, StudentAnswer>;
    results: TestResults | null;
}

export class TestSessionManager {
    private config: SessionConfig;
    private state: SessionState;
    private timer: TestTimer | null = null;
    private syncInterval: NodeJS.Timeout | null = null;
    private saveTimeout: NodeJS.Timeout | null = null;

    constructor(config: SessionConfig) {
        this.config = config;
        this.state = {
            isActive: false,
            isPaused: false,
            sessionInfo: null,
            testData: null,
            answers: {},
            results: null
        };
    }

    // Inicializar a sessão
    async initialize(): Promise<boolean> {
        try {
            console.log('🔄 Inicializando sessão para teste:', this.config.testId);

            // 1. Verificar se existe sessão ativa
            const sessionInfo = await this.checkExistingSession();

            // 2. Carregar dados do teste
            const testData = await this.loadTestData();

            // 3. Configurar timer
            this.setupTimer(testData.duration);

            // 4. Se há sessão ativa, configurar timer
            if (sessionInfo && sessionInfo.session_exists) {
                await this.resumeSession(sessionInfo);
            }

            return true;
        } catch (error) {
            console.error('❌ Erro ao inicializar sessão:', error);
            this.config.onSessionError?.(error);
            return false;
        }
    }

    // Verificar sessão existente
    private async checkExistingSession(): Promise<TestSessionInfo | null> {
        try {
            const sessionInfo = await EvaluationApiService.getTestSessionInfo(this.config.testId);
            this.state.sessionInfo = sessionInfo;

            console.log('📋 Sessão existente encontrada:', {
                sessionExists: sessionInfo.session_exists,
                status: sessionInfo.status,
                timerStarted: sessionInfo.timer_started
            });

            return sessionInfo;
        } catch (error) {
            console.log('📋 Nenhuma sessão existente encontrada');
            return null;
        }
    }

    // Carregar dados do teste
    private async loadTestData(): Promise<TestData> {
        const testData = await EvaluationApiService.getTestData(this.config.testId);
        this.state.testData = testData;

        console.log('📚 Dados do teste carregados:', {
            title: testData.title,
            duration: testData.duration,
            totalQuestions: testData.totalQuestions
        });

        return testData;
    }

    // Configurar timer
    private setupTimer(durationMinutes: number): void {
        const timerConfig: TimerConfig = {
            timeLimitMinutes: durationMinutes,
            onTimeUpdate: (remainingSeconds: number) => {
                this.config.onTimeUpdate?.(remainingSeconds);
            },
            onTimeUp: () => {
                console.log('⏰ Tempo esgotado!');
                this.config.onTimeUp?.();
                this.autoSubmit();
            },
            onWarning: (remainingSeconds: number) => {
                console.log('⚠️ Aviso: 5 minutos restantes');
                this.config.onWarning?.(remainingSeconds);
            }
        };

        this.timer = new TestTimer(timerConfig);
    }

    // Retomar sessão existente
    private async resumeSession(sessionInfo: TestSessionInfo): Promise<void> {
        if (!this.timer) return;

        console.log('🔄 Retomando sessão existente');

        // Configurar timer com dados da sessão
        if (sessionInfo.timer_started && sessionInfo.actual_start_time) {
            const sessionStartTime = new Date(sessionInfo.actual_start_time);
            this.timer.start(sessionStartTime);
            this.timer.updateRemainingTime(sessionInfo.remaining_time_minutes * 60);
        } else {
            // ✅ CORRIGIDO: Usar duration do testData em vez de time_limit_minutes da sessão
            const duration = this.state.testData?.duration || 60; // fallback para 60 minutos
            this.timer.updateRemainingTime(duration * 60);
        }

        this.state.isActive = true;
        this.startSyncInterval();

        this.config.onSessionStart?.(this.createTestSession(sessionInfo));
    }

    // Iniciar nova sessão
    async startSession(): Promise<boolean> {
        try {
            console.log('🚀 Iniciando nova sessão');

            // 1. Criar sessão no backend
            const sessionResponse = await EvaluationApiService.startSession(this.config.testId);

            // 2. Atualizar informações da sessão
            const sessionInfo = await EvaluationApiService.getTestSessionInfo(this.config.testId);
            this.state.sessionInfo = sessionInfo;

            // 3. Iniciar timer
            if (this.timer) {
                this.timer.start();
            }

            this.state.isActive = true;
            this.startSyncInterval();

            console.log('✅ Sessão iniciada com sucesso');
            this.config.onSessionStart?.(this.createTestSession(sessionInfo));

            return true;
        } catch (error) {
            console.error('❌ Erro ao iniciar sessão:', error);
            this.config.onSessionError?.(error);
            return false;
        }
    }

    // Pausar sessão (quando aluno sai da aba)
    pauseSession(): void {
        if (this.timer) {
            this.timer.pause();
        }
        this.state.isPaused = true;
        console.log('⏸️ Sessão pausada');
    }

    // Retomar sessão (quando aluno volta para a aba)
    resumeSessionFromPause(): void {
        if (this.timer) {
            this.timer.resume();
        }
        this.state.isPaused = false;
        console.log('▶️ Sessão retomada');
    }

    // Salvar resposta
    saveAnswer(questionId: string, answer: string): void {
        this.state.answers[questionId] = {
            question_id: questionId,
            answer: answer
        };

        // Auto-save com debounce
        this.scheduleAutoSave();
    }

    // Submeter avaliação
    async submitTest(): Promise<boolean> {
        try {
            console.log('📤 Submetendo avaliação');

            if (!this.state.sessionInfo) {
                throw new Error('Nenhuma sessão ativa');
            }

            const answersArray = Object.values(this.state.answers).map(answer => ({
                question_id: answer.question_id,
                answer: answer.answer
            }));

            const submitData = {
                session_id: this.state.sessionInfo.session_id,
                answers: answersArray
            };

            const results = await EvaluationApiService.submitTest(submitData);
            // Converter SubmitTestResponse para TestResults
            this.state.results = {
                total_questions: results.results.total_questions,
                correct_answers: results.results.correct_answers,
                score_percentage: results.results.score_percentage,
                grade: results.results.grade,
                answers_saved: results.results.answers_saved
            };

            // Limpar recursos
            this.cleanup();

            console.log('✅ Avaliação submetida com sucesso');
            return true;
        } catch (error) {
            console.error('❌ Erro ao submeter avaliação:', error);
            this.config.onSessionError?.(error);
            return false;
        }
    }

    // Auto-submit quando tempo expira
    private async autoSubmit(): Promise<void> {
        console.log('⏰ Auto-submit: tempo expirou');
        this.config.onAutoSubmit?.();

        // Aguardar 3 segundos antes de submeter
        setTimeout(async () => {
            await this.submitTest();
        }, 3000);
    }

    // Iniciar sincronização periódica
    private startSyncInterval(): void {
        this.syncInterval = setInterval(async () => {
            try {
                if (this.state.sessionInfo) {
                    const sessionInfo = await EvaluationApiService.getTestSessionInfo(this.config.testId);
                    this.state.sessionInfo = sessionInfo;

                    // Sincronizar timer se necessário
                    if (this.timer && sessionInfo.remaining_time_minutes !== undefined) {
                        this.timer.updateRemainingTime(sessionInfo.remaining_time_minutes * 60);
                    }
                }
            } catch (error) {
                console.error('❌ Erro na sincronização:', error);
            }
        }, 30000); // A cada 30 segundos
    }

    // Agendar auto-save
    private scheduleAutoSave(): void {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        this.saveTimeout = setTimeout(async () => {
            await this.performAutoSave();
        }, 2000); // 2 segundos de debounce
    }

    // Executar auto-save (respostas vão apenas no submit; sem localStorage para não ficar redundante)
    private async performAutoSave(): Promise<void> {
        if (!this.state.sessionInfo || Object.keys(this.state.answers).length === 0) {
            return;
        }
        // Persistência de respostas é feita apenas via API no fluxo useEvaluation/TakeEvaluation
    }

    // Criar objeto TestSession
    private createTestSession(sessionInfo: TestSessionInfo): TestSession {
        return {
            session_id: sessionInfo.session_id,
            status: sessionInfo.status as 'em_andamento' | 'finalizada' | 'expirada',
            started_at: sessionInfo.started_at,
            actual_start_time: sessionInfo.actual_start_time,
            remaining_time_minutes: sessionInfo.remaining_time_minutes,
            time_limit_minutes: sessionInfo.time_limit_minutes,
            is_expired: sessionInfo.is_expired,
            total_questions: sessionInfo.total_questions,
            correct_answers: sessionInfo.correct_answers,
            score: sessionInfo.score,
            grade: sessionInfo.grade
        };
    }

    // Limpar recursos
    private cleanup(): void {
        if (this.timer) {
            this.timer.destroy();
        }

        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }

        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        this.state.isActive = false;
        this.state.isPaused = false;

        console.log('🧹 Recursos limpos');
    }

    // Obter estado atual
    getState(): SessionState {
        return { ...this.state };
    }

    // Obter timer
    getTimer(): TestTimer | null {
        return this.timer;
    }

    // Obter respostas
    getAnswers(): Record<string, StudentAnswer> {
        return { ...this.state.answers };
    }

    // Destruir gerenciador
    destroy(): void {
        this.cleanup();
    }
} 