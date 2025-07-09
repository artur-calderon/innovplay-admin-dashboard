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

export class EvaluationApiService {
    // Teste de conectividade
    static async testConnection(): Promise<boolean> {
        try {
            console.log('Testando conectividade com a API...');
            console.log('Base URL:', api.defaults.baseURL);

            const response = await api.get('/health');
            console.log('API está respondendo:', response.data);
            return true;
        } catch (error) {
            console.error('Erro de conectividade:', error);
            console.error('Verifique se a API está rodando em:', api.defaults.baseURL);
            return false;
        }
    }

    // Carregar dados do teste
    static async getTestData(testId: string): Promise<TestData> {
        console.log('Chamando API para buscar dados do teste:', testId);
        try {
            // Tentar primeiro o endpoint padrão
            const response = await api.get(`/tests/${testId}`);
            console.log('Resposta da API getTestData:', response.data);
            return response.data;
        } catch (error) {
            console.error('Erro ao buscar dados do teste:', error);
            console.error('Detalhes do erro:', error.response?.data);

            // Se falhar, tentar endpoint alternativo
            try {
                console.log('Tentando endpoint alternativo...');
                const response = await api.get(`/test/${testId}`);
                console.log('Resposta da API getTestData (alternativo):', response.data);
                return response.data;
            } catch (altError) {
                console.error('Erro no endpoint alternativo:', altError);
                throw error; // Re-throw o erro original
            }
        }
    }

    // Iniciar sessão de teste
    static async startSession(data: { test_id: string; time_limit_minutes: number }): Promise<StartSessionResponse> {
        console.log('Iniciando sessão com dados:', data);
        console.log('URL da API:', api.defaults.baseURL);

        try {
            const response = await api.post('/student-answers/sessions/start', data);
            console.log('Resposta da API startSession:', response.data);
            return response.data;
        } catch (error) {
            console.error('Erro ao iniciar sessão:', error);
            console.error('Detalhes do erro:', error.response?.data);
            console.error('Status do erro:', error.response?.status);
            throw error;
        }
    }

    // Verificar status da sessão
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

    // Salvar respostas parciais
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

    // Finalizar teste
    static async submitTest(data: SubmitTestRequest): Promise<SubmitTestResponse> {
        console.log('Finalizando teste com dados:', data);

        try {
            const response = await api.post('/student-answers/submit', data);
            console.log('Resposta da API submitTest:', response.data);
            return response.data;
        } catch (error) {
            console.error('Erro ao finalizar teste:', error);
            console.error('Detalhes do erro:', error.response?.data);
            throw error;
        }
    }

    // Verificar se existe sessão ativa para um teste
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

    // Buscar sessões do usuário logado
    static async getMySessions(): Promise<TestSession[]> {
        const response = await api.get('/student-answers/my-sessions');
        return response.data.sessions || [];
    }

    // Encerrar sessão e marcar avaliação como indisponível
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