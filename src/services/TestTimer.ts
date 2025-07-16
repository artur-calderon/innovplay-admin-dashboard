export interface TimerConfig {
    timeLimitMinutes: number;
    onTimeUpdate?: (remainingSeconds: number) => void;
    onTimeUp?: () => void;
    onWarning?: (remainingSeconds: number) => void;
}

export interface TimerState {
    isRunning: boolean;
    isPaused: boolean;
    remainingSeconds: number;
    totalPausedTime: number;
    sessionStartTime: Date | null;
    pauseStartTime: Date | null;
}

export class TestTimer {
    private config: TimerConfig;
    private state: TimerState;
    private intervalId: NodeJS.Timeout | null = null;
    private warningThreshold = 300; // 5 minutos

    constructor(config: TimerConfig) {
        this.config = config;
        this.state = {
            isRunning: false,
            isPaused: false,
            remainingSeconds: config.timeLimitMinutes * 60,
            totalPausedTime: 0,
            sessionStartTime: null,
            pauseStartTime: null
        };
    }

    // Iniciar o cronômetro
    start(sessionStartTime?: Date): void {
        if (this.state.isRunning) {
            console.warn('Timer já está rodando');
            return;
        }

        this.state.sessionStartTime = sessionStartTime || new Date();
        this.state.isRunning = true;
        this.state.isPaused = false;
        this.state.totalPausedTime = 0;
        this.state.pauseStartTime = null;

        console.log('⏰ Timer iniciado:', {
            sessionStartTime: this.state.sessionStartTime.toISOString(),
            timeLimitMinutes: this.config.timeLimitMinutes,
            remainingSeconds: this.state.remainingSeconds
        });

        this.startInterval();
    }

    // Pausar o cronômetro
    pause(): void {
        if (!this.state.isRunning || this.state.isPaused) {
            return;
        }

        this.state.isPaused = true;
        this.state.pauseStartTime = new Date();
        this.stopInterval();

        console.log('⏸️ Timer pausado');
    }

    // Retomar o cronômetro
    resume(): void {
        if (!this.state.isRunning || !this.state.isPaused) {
            return;
        }

        if (this.state.pauseStartTime) {
            const pauseDuration = new Date().getTime() - this.state.pauseStartTime.getTime();
            this.state.totalPausedTime += pauseDuration;
            this.state.pauseStartTime = null;
        }

        this.state.isPaused = false;
        this.startInterval();

        console.log('▶️ Timer retomado');
    }

    // Parar o cronômetro
    stop(): void {
        this.state.isRunning = false;
        this.state.isPaused = false;
        this.stopInterval();

        console.log('⏹️ Timer parado');
    }

    // Atualizar tempo restante (para sincronização com API)
    updateRemainingTime(remainingSeconds: number): void {
        this.state.remainingSeconds = Math.max(0, remainingSeconds);

        console.log('⏰ Tempo atualizado:', {
            remainingSeconds: this.state.remainingSeconds,
            isRunning: this.state.isRunning,
            isPaused: this.state.isPaused
        });
    }

    // Obter estado atual
    getState(): TimerState {
        return { ...this.state };
    }

    // Obter tempo restante em segundos
    getRemainingSeconds(): number {
        return this.state.remainingSeconds;
    }

    // Obter tempo restante formatado
    getFormattedTime(): string {
        const hours = Math.floor(this.state.remainingSeconds / 3600);
        const minutes = Math.floor((this.state.remainingSeconds % 3600) / 60);
        const seconds = this.state.remainingSeconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    // Verificar se o tempo expirou
    isTimeUp(): boolean {
        return this.state.remainingSeconds <= 0;
    }

    // Verificar se está próximo do fim
    isWarningTime(): boolean {
        return this.state.remainingSeconds <= this.warningThreshold;
    }

    // Calcular tempo restante baseado no tempo real
    private calculateRemainingTime(): number {
        if (!this.state.sessionStartTime) {
            return this.config.timeLimitMinutes * 60;
        }

        const now = new Date();
        const sessionDuration = now.getTime() - this.state.sessionStartTime.getTime();
        const effectiveSessionDuration = sessionDuration - this.state.totalPausedTime;

        // Se está pausado, não contar o tempo da pausa atual
        let currentPauseDuration = 0;
        if (this.state.isPaused && this.state.pauseStartTime) {
            currentPauseDuration = now.getTime() - this.state.pauseStartTime.getTime();
        }

        const totalEffectiveTime = effectiveSessionDuration - currentPauseDuration;
        const timeLimitMs = this.config.timeLimitMinutes * 60 * 1000;
        const remainingMs = timeLimitMs - totalEffectiveTime;

        return Math.max(0, Math.floor(remainingMs / 1000));
    }

    // Iniciar o intervalo de atualização
    private startInterval(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }

        this.intervalId = setInterval(() => {
            if (!this.state.isPaused) {
                this.state.remainingSeconds = this.calculateRemainingTime();

                // Notificar mudança de tempo
                if (this.config.onTimeUpdate) {
                    this.config.onTimeUpdate(this.state.remainingSeconds);
                }

                // Verificar aviso de tempo
                if (this.state.remainingSeconds === this.warningThreshold && this.config.onWarning) {
                    this.config.onWarning(this.state.remainingSeconds);
                }

                // Verificar se o tempo expirou
                if (this.state.remainingSeconds <= 0) {
                    this.stop();
                    if (this.config.onTimeUp) {
                        this.config.onTimeUp();
                    }
                }
            }
        }, 1000);
    }

    // Parar o intervalo de atualização
    private stopInterval(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    // Limpar recursos
    destroy(): void {
        this.stop();
    }
} 