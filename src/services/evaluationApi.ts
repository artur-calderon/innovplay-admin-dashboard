import { api } from '@/lib/api';
import {
    TestData,
    TestSession,
    SessionStatusResponse,
    StartSessionRequest,
    StartSessionResponse,
    SubmitTestRequest,
    SubmitTestResponse
} from '@/types/evaluation-types';

// ✅ NOVO: Interface para a resposta da rota de sessão
export interface TestSessionInfo {
    session_id: string;
    test_id: string;
    student_id: string;
    status: string;
    started_at: string;
    actual_start_time: string;
    time_limit_minutes: number;
    remaining_time_minutes: number;
    duration_minutes: number;
    is_expired: boolean;
    timer_started: boolean;
    total_questions: number;
    correct_answers: number;
    score: number;
    grade: string;
    session_exists: boolean;
}

/** Request para salvamento parcial de respostas (autosave). */
export interface SavePartialRequest {
    session_id: string;
    answers: { question_id: string; answer: string }[];
}

/** Resposta de GET session answers (para restaurar estado ao retomar). */
export interface GetSessionAnswersResponse {
    session_id: string;
    total_answers?: number;
    answers: Array<{ question_id: string; answer: string; answered_at?: string; is_correct?: boolean; manual_points?: number; feedback?: string }>;
}

/** Resposta de GET active-session/:test_id/with-answers (sessão + respostas em uma chamada ao retomar). */
export interface ActiveSessionWithAnswersResponse extends TestSessionInfo {
    total_answers?: number;
    answers?: Array<{ question_id: string; answer: string; answered_at?: string; is_correct?: boolean; manual_points?: number; feedback?: string }>;
}

/** Corpo da resposta 410 (Gone) em submit e save-partial: sessão expirada/finalizada, com respostas salvas. */
export interface SessionGone410Response {
    error?: string;
    session_id?: string;
    test_id?: string;
    status?: string;
    is_expired?: boolean;
    answers?: Array<{ question_id: string; answer: string; answered_at?: string }>;
    total_answers?: number;
}

export class EvaluationApiService {
    // Teste de conectividade
    static async testConnection(): Promise<boolean> {
        try {
            const response = await api.get('/');
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * GET /test/:id/session-info — informações da sessão (com sessão ativa).
     * Front usa duration/duration_minutes só do teste (getTestData) para o cronômetro.
     * Verificação backend: resposta deve incluir duration_minutes (e/ou duration) com valor da prova em minutos (ex.: 67).
     */
    static async getTestSessionInfo(testId: string): Promise<TestSessionInfo> {
        console.log('Buscando informações da sessão do teste:', testId);

        try {
            const response = await api.get(`/test/${testId}/session-info`);
            console.log('Resposta da API getTestSessionInfo:', response.data);
            return response.data;
        } catch (error: unknown) {
            // ✅ CORRIGIDO: Tratar erro 404 como caso normal (sem sessão ativa)
            const apiError = error as { response?: { status?: number; data?: unknown } };
            if (apiError.response?.status === 404) {
                console.log('Nenhuma sessão ativa encontrada para este teste');

                // Retornar resposta estruturada indicando que não há sessão
                const noSessionResponse: TestSessionInfo = {
                    session_id: '',
                    test_id: testId,
                    student_id: '',
                    status: 'nao_iniciada',
                    started_at: '',
                    actual_start_time: '',
                    time_limit_minutes: 0,
                    remaining_time_minutes: 0,
                    duration_minutes: 0,
                    is_expired: false,
                    timer_started: false,
                    total_questions: 0,
                    correct_answers: 0,
                    score: 0,
                    grade: '',
                    session_exists: false
                };

                return noSessionResponse;
            }

            // Para outros erros, continuar lançando exceção
            console.error('Erro ao buscar informações da sessão:', error);
            console.error('Detalhes do erro:', apiError.response?.data);
            throw error;
        }
    }

    // Carregar dados do teste
    static async getTestData(testId: string): Promise<TestData> {
        console.log('Chamando API para buscar dados do teste:', testId);
        try {
            // ✅ CORRIGIDO: Usar o endpoint correto para buscar dados do teste
            const response = await api.get(`/test/${testId}/details`);
            console.log('Resposta da API getTestData:', response.data);

            // ✅ NOVO: Log detalhado da resposta
            console.log('📊 Estrutura da resposta:', {
                id: response.data.id,
                title: response.data.title,
                type: response.data.type, // ✅ Verificar se é OLIMPIADA
                subject: response.data.subject,
                duration: response.data.duration,
                durationIsNull: response.data.duration === null, // ✅ Diagnosticar duration null
                durationIsUndefined: response.data.duration === undefined, // ✅ Diagnosticar duration undefined
                durationValue: response.data.duration,
                totalQuestions: response.data.totalQuestions,
                total_questions: response.data.total_questions, // Verificar se existe este campo
                questions: response.data.questions,
                questionsLength: response.data.questions?.length || 0,
                instructions: response.data.instructions
            });

            return response.data;
        } catch (error) {
            console.error('Erro ao buscar dados do teste:', error);
            console.error('Detalhes do erro:', error.response?.data);
            throw error;
        }
    }

    /**
     * POST /test/:id/start-session — inicia sessão com time_limit_minutes = duração da prova.
     * Front envia duration/duration_minutes do teste (ex.: 67). Não usar janela application/expiration como duração.
     * Verificação backend: resposta deve incluir duration_minutes (e/ou duration) com o mesmo valor (ex.: 67).
     */
    static async startSession(testId: string, timeLimitMinutes: number = 60): Promise<StartSessionResponse> {
        console.log('Iniciando sessão para teste:', testId, 'com tempo limite:', timeLimitMinutes);

        try {
            const response = await api.post(`/test/${testId}/start-session`, {
                time_limit_minutes: timeLimitMinutes
            });
            console.log('Resposta da API startSession:', response.data);
            
            const sessionData = response.data;
            
            // ✅ NOVO: Log detalhado para debug
            console.log('🔍 Validação de sessão:', {
                requestedTestId: testId,
                returnedTestId: sessionData.test_id,
                hasTestId: !!sessionData.test_id,
                sessionId: sessionData.session_id,
                message: sessionData.message
            });
            
            // ✅ NOVO: Validar se a sessão retornada pertence ao teste solicitado
            if (sessionData.test_id && sessionData.test_id !== testId) {
                console.error('❌ Sessão retornada pertence a outro teste:', {
                    requestedTestId: testId,
                    returnedTestId: sessionData.test_id,
                    sessionId: sessionData.session_id
                });
                throw new Error(`A sessão retornada (${sessionData.session_id}) pertence a outro teste (${sessionData.test_id}). Teste solicitado: ${testId}`);
            }
            
            // ✅ NOVO: Se test_id não foi retornado, verificar via getTestSessionInfo
            if (!sessionData.test_id && sessionData.session_id) {
                console.log('⚠️ test_id não retornado na resposta, verificando via getTestSessionInfo...');
                try {
                    const sessionInfo = await this.getTestSessionInfo(testId);
                    if (sessionInfo.session_exists && sessionInfo.test_id && sessionInfo.test_id !== testId) {
                        console.error('❌ Sessão verificada pertence a outro teste:', {
                            requestedTestId: testId,
                            sessionTestId: sessionInfo.test_id,
                            sessionId: sessionInfo.session_id
                        });
                        throw new Error(`A sessão verificada (${sessionInfo.session_id}) pertence a outro teste (${sessionInfo.test_id}). Teste solicitado: ${testId}`);
                    }
                } catch (error) {
                    // Se getTestSessionInfo falhar (404), é normal - sessão ainda não existe
                    if ((error as { response?: { status?: number } }).response?.status !== 404) {
                        throw error;
                    }
                }
            }
            
            return sessionData;
        } catch (error) {
            console.error('Erro ao iniciar sessão:', error);
            console.error('Detalhes do erro:', error.response?.data);
            console.error('Status do erro:', error.response?.status);
            throw error;
        }
    }



    // ✅ NOVO: Sincronizar timer com backend
    static async syncTimer(sessionId: string, elapsedMinutes: number, remainingMinutes: number): Promise<void> {
        console.log('Sincronizando timer:', { sessionId, elapsedMinutes, remainingMinutes });

        try {
            await api.patch(`/student-answers/sessions/${sessionId}/timer`, {
                elapsed_minutes: elapsedMinutes,
                remaining_minutes: remainingMinutes
            });
            console.log('Timer sincronizado com sucesso');
        } catch (error) {
            console.error('Erro ao sincronizar timer:', error);
            console.error('Detalhes do erro:', error.response?.data);
            throw error;
        }
    }

    // ✅ NOVO: Verificar status da sessão
    static async getSessionStatus(sessionId: string): Promise<SessionStatusResponse> {
        console.log('Verificando status da sessão:', sessionId);

        try {
            const response = await api.get(`/student-answers/sessions/${sessionId}/status`);
            console.log('Status da sessão:', response.data);
            return response.data;
        } catch (error: unknown) {
            const apiError = error as { response?: { data?: unknown } };
            console.error('Erro ao verificar status da sessão:', error);
            console.error('Detalhes do erro:', apiError.response?.data);
            throw error;
        }
    }

    // ✅ TEMPORÁRIO: Encerrar sessão sem submeter respostas
    static async endSession(sessionId: string, reason: 'finished' | 'timeout' | 'manual' = 'manual'): Promise<{
        message: string;
        session_id: string;
        status: string;
        submitted_at: string;
        duration_minutes: number;
        total_questions: number;
        correct_answers: number;
        score: number;
        grade: number;
    }> {
        console.log('Encerrando sessão sem submeter respostas:', { sessionId, reason });

        try {
            const response = await api.post(`/student-answers/sessions/${sessionId}/end`, {
                reason
            });
            console.log('Sessão encerrada com sucesso:', response.data);
            return response.data;
        } catch (error: unknown) {
            const apiError = error as { response?: { data?: unknown; status?: number } };
            console.error('Erro ao encerrar sessão:', error);
            console.error('Detalhes do erro:', apiError.response?.data);
            throw error;
        }
    }

    // Finalizar teste
    static async submitTest(data: SubmitTestRequest): Promise<SubmitTestResponse> {
        console.log('🚀 Enviando dados para finalizar teste:', {
            sessionId: data.session_id,
            testId: data.test_id,
            answersCount: data.answers?.length || 0,
            endpoint: '/student-answers/submit'
        });

        const maxRetries = 3;
        let lastError: unknown;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            let abortController: AbortController | null = null;
            let timeoutId: ReturnType<typeof setTimeout> | null = null;

            try {
                console.log(`🔄 Tentativa ${attempt + 1}/${maxRetries + 1} de envio da avaliação`);

                abortController = new AbortController();
                const timeoutMs = 15000 + attempt * 15000; // 15s, 30s, 45s, 60s

                timeoutId = setTimeout(() => {
                    abortController?.abort();
                }, timeoutMs);

                // ✅ Montar payload com test_id se disponível
                const payload = {
                    session_id: data.session_id,
                    ...(data.test_id && { test_id: data.test_id }), // Incluir test_id para o backend identificar o tipo
                    answers: data.answers
                };

                console.log('📤 Payload completo sendo enviado:', payload);

                const response = await api.post('/student-answers/submit', payload, {
                    signal: abortController.signal,
                    timeout: timeoutMs
                });

                console.log('✅ Resposta da API submitTest recebida:', {
                    status: response.status,
                    statusText: response.statusText,
                    data: response.data,
                    hasResults: !!response.data?.results,
                    attempt: attempt + 1
                });

                return response.data;
            } catch (error: unknown) {
                lastError = error;
                const apiError = error as {
                    code?: string;
                    message?: string;
                    response?: {
                        status?: number;
                        statusText?: string;
                        data?: unknown;
                    };
                };

                console.error(`❌ Erro na tentativa ${attempt + 1}:`, {
                    error,
                    response: apiError.response?.data,
                    status: apiError.response?.status,
                    statusText: apiError.response?.statusText,
                    code: apiError.code,
                    message: apiError.message
                });

                const status = apiError.response?.status;
                const wasAborted = apiError.code === 'ERR_CANCELED';
                const isTimeout = apiError.code === 'ECONNABORTED' || wasAborted || apiError.message?.toLowerCase().includes('timeout');
                const isNetworkIssue = apiError.code === 'ERR_NETWORK' || !apiError.response;
                const isServerError = status !== undefined && status >= 500;

                const shouldRetry = attempt < maxRetries &&
                    (isTimeout || isNetworkIssue || isServerError) &&
                    status !== 400 &&
                    status !== 410;

                if (shouldRetry) {
                    const delay = 2000 * (attempt + 1); // 2s, 4s, 6s
                    console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }

                break;
            } finally {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
            }
        }

        console.error('❌ Todas as tentativas de envio falharam:', lastError);
        throw lastError;
    }

    /** Autosave: salvar respostas parciais (debounce no front). */
    static async savePartialAnswers(params: SavePartialRequest): Promise<void> {
        const { session_id, answers } = params;
        await api.post('/student-answers/save-partial', { session_id, answers }, { timeout: 10000 });
    }

    /** Buscar respostas já gravadas da sessão (para restaurar estado ao retomar). */
    static async getSessionAnswers(sessionId: string): Promise<GetSessionAnswersResponse> {
        const response = await api.get(`/student-answers/session/${sessionId}/answers`);
        return response.data;
    }

    /**
     * Retomar prova: uma única chamada devolve sessão + respostas (recomendado ao retomar).
     * GET /student-answers/active-session/:test_id/with-answers
     * @returns dados da sessão e respostas, ou null se 404 (sem sessão ativa) / 410 (expirada)
     */
    static async getActiveSessionWithAnswers(testId: string): Promise<ActiveSessionWithAnswersResponse | null> {
        try {
            const response = await api.get<ActiveSessionWithAnswersResponse>(`/student-answers/active-session/${testId}/with-answers`);
            return response.data ?? null;
        } catch (error: unknown) {
            const apiError = error as { response?: { status?: number } };
            if (apiError.response?.status === 404 || apiError.response?.status === 410) {
                return null;
            }
            throw error;
        }
    }
}

// Funções utilitárias para localStorage (apenas sessão; respostas vão só para a API)
export const SessionStorage = {
    // Salvar sessão no localStorage
    saveSession: (testId: string, sessionData: { session_id: string; started_at: string }) => {
        localStorage.setItem(`test_session_${testId}`, JSON.stringify(sessionData));
    },

    // Recuperar sessão do localStorage
    getSession: (testId: string) => {
        const saved = localStorage.getItem(`test_session_${testId}`);
        return saved ? JSON.parse(saved) : null;
    },

    // Remover sessão do localStorage
    removeSession: (testId: string) => {
        localStorage.removeItem(`test_session_${testId}`);
    },
}; 