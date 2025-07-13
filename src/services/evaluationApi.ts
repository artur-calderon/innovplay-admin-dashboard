import { api } from '@/lib/api';
import {
    TestData,
    TestSession,
    SessionStatusResponse,
    StartSessionRequest,
    StartSessionResponse,
    SavePartialRequest,
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
            const response = await api.get(`/test/${testId}/session-info`);
            console.log('Resposta da API getTestSessionInfo:', response.data);
            return response.data;
        } catch (error) {
            console.error('Erro ao buscar informações da sessão:', error);
            console.error('Detalhes do erro:', error.response?.data);
            throw error;
        }
    }

    // Carregar dados do teste
    static async getTestData(testId: string): Promise<TestData> {
        console.log('Chamando API para buscar dados do teste:', testId);
        try {
            const response = await api.get(`/test/${testId}/details`);
            console.log('Resposta da API getTestData:', response.data);
            return response.data;
        } catch (error) {
            console.error('Erro ao buscar dados do teste:', error);
            console.error('Detalhes do erro:', error.response?.data);
            throw error;
        }
    }

    // ✅ NOVO: Iniciar sessão de teste (nova rota)
    static async startSession(testId: string): Promise<StartSessionResponse> {
        console.log('Iniciando sessão para teste:', testId);

        try {
            const response = await api.post(`/test/${testId}/start-session`);
            console.log('Resposta da API startSession:', response.data);
            return response.data;
        } catch (error) {
            console.error('Erro ao iniciar sessão:', error);
            console.error('Detalhes do erro:', error.response?.data);
            console.error('Status do erro:', error.response?.status);
            throw error;
        }
    }

    // ✅ NOVO: Submeter respostas (nova rota)
    static async submitTest(testId: string, data: SubmitTestRequest): Promise<SubmitTestResponse> {
        try {
            const response = await api.post(`/test/${testId}/submit`, data);
            return response.data;
        } catch (error) {
            console.error('Erro ao finalizar teste:', error);
            console.error('Detalhes do erro:', error.response?.data);
            throw error;
        }
    }

    // ✅ MANTIDO: Salvar respostas parciais (para auto-save)
    static async savePartialAnswers(data: SavePartialRequest): Promise<void> {
        console.log('Salvando respostas parciais:', data);

        try {
            await api.post('/student-answers/save-partial', data);
            console.log('Respostas salvas com sucesso');
        } catch (error) {
            console.error('Erro ao salvar respostas parciais:', error);
            console.error('Detalhes do erro:', error.response?.data);
            throw error;
        }
    }

    // ✅ MANTIDO: Verificar status da sessão (para sincronização)
    static async getSessionStatus(sessionId: string): Promise<SessionStatusResponse> {
        console.log('Verificando status da sessão:', sessionId);

        try {
            const response = await api.get(`/student-answers/sessions/${sessionId}/status`);
            console.log('Resposta da API getSessionStatus:', response.data);
            return response.data;
        } catch (error) {
            console.error('Erro ao verificar status da sessão:', error);
            console.error('Detalhes do erro:', error.response?.data);
            throw error;
        }
    }

    // ✅ MANTIDO: Verificar se existe sessão ativa para um teste
    static async checkActiveSession(testId: string): Promise<TestSession | null> {
        try {
            const response = await api.get(`/student-answers/active-session/${testId}`);
            return response.data;
        } catch (error) {
            if (error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    }

    // ✅ MANTIDO: Buscar sessões do usuário logado
    static async getMySessions(): Promise<TestSession[]> {
        const response = await api.get('/student-answers/my-sessions');
        return response.data.sessions || [];
    }

    // ✅ MANTIDO: Encerrar sessão e marcar avaliação como indisponível
    static async endSession(sessionId: string): Promise<void> {
        console.log('Encerrando sessão:', sessionId);

        try {
            const response = await api.post(`/student-answers/sessions/${sessionId}/end`, {});
            console.log('Sessão encerrada:', response.data);
        } catch (error) {
            console.error('Erro ao encerrar sessão:', error);
            console.error('Detalhes do erro:', error.response?.data);
            throw error;
        }
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