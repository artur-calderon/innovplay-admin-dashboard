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

    // ✅ NOVO: Buscar informações da sessão do teste (nova rota)
    static async getTestSessionInfo(testId: string): Promise<TestSessionInfo> {
        console.log('Buscando informações da sessão do teste:', testId);

        try {
            // ✅ CORRIGIDO: Usar o endpoint correto para buscar informações da sessão
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
                subject: response.data.subject,
                duration: response.data.duration,
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

    // ✅ NOVO: Iniciar sessão de teste (nova rota)
    static async startSession(testId: string, timeLimitMinutes: number = 60): Promise<StartSessionResponse> {
        console.log('Iniciando sessão para teste:', testId, 'com tempo limite:', timeLimitMinutes);

        try {
            // ✅ CORRIGIDO: Usar o endpoint correto para iniciar sessão
            const response = await api.post(`/test/${testId}/start-session`, {
                time_limit_minutes: timeLimitMinutes
            });
            console.log('Resposta da API startSession:', response.data);
            return response.data;
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

    // Finalizar teste
    static async submitTest(data: SubmitTestRequest): Promise<SubmitTestResponse> {
        console.log('🚀 Enviando dados para finalizar teste:', {
            sessionId: data.session_id,
            answersCount: data.answers?.length || 0,
            endpoint: '/student-answers/submit'
        });
        
        // ✅ MELHORADO: Implementar retry automático com timeout progressivo
        const maxRetries = 3;
        let lastError: unknown;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 Tentativa ${attempt + 1}/${maxRetries + 1} de envio da avaliação`);
                
                // ✅ NOVO: Timeout progressivo (15s, 30s, 45s)
                const timeout = 15000 + (attempt * 15000);
                const timeoutPromise = new Promise<never>((_, reject) => {
                    setTimeout(() => {
                        reject(new Error(`Timeout de ${timeout}ms excedido na tentativa ${attempt + 1}`));
                    }, timeout);
                });
                
                const requestPromise = api.post('/student-answers/submit', data);
                const response = await Promise.race([requestPromise, timeoutPromise]);
                
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
                        data?: unknown 
                    } 
                };
                console.error(`❌ Erro na tentativa ${attempt + 1}:`, {
                    error: error,
                    response: apiError.response?.data,
                    status: apiError.response?.status,
                    statusText: apiError.response?.statusText,
                    code: apiError.code,
                    message: apiError.message
                });
                
                // ✅ NOVO: Só tentar novamente se for erro de rede/timeout
                // Não tentar novamente para erros 410 (sessão expirada) ou 400 (validação)
                const shouldRetry = attempt < maxRetries && (
                    (apiError.code === 'ECONNABORTED' ||
                    apiError.code === 'ERR_NETWORK' ||
                    apiError.message?.includes('timeout') ||
                    apiError.message?.includes('Timeout') ||
                    (apiError.response?.status !== undefined && apiError.response.status >= 500)) &&
                    apiError.response?.status !== 410 && // ✅ NOVO: Não retry para sessão expirada
                    apiError.response?.status !== 400    // ✅ NOVO: Não retry para erro de validação
                );
                
                if (shouldRetry) {
                    const delay = 2000 * (attempt + 1); // 2s, 4s, 6s
                    console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                
                // Se não deve tentar novamente, quebrar o loop
                break;
            }
        }
        
        // Se chegou aqui, todas as tentativas falharam
        console.error('❌ Todas as tentativas de envio falharam:', lastError);
        throw lastError;
    }
}

// Funções utilitárias para localStorage
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

    // Salvar respostas temporárias
    saveAnswers: (testId: string, answers: Record<string, { question_id: string; answer: string }>) => {
        localStorage.setItem(`test_answers_${testId}`, JSON.stringify(answers));
    },

    // Recuperar respostas temporárias
    getAnswers: (testId: string) => {
        const saved = localStorage.getItem(`test_answers_${testId}`);
        return saved ? JSON.parse(saved) : {};
    },

    // Remover respostas temporárias
    removeAnswers: (testId: string) => {
        localStorage.removeItem(`test_answers_${testId}`);
    }
}; 