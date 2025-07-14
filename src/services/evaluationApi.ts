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
            // ✅ REMOVIDO: Console.logs para apresentação
            // console.log('Testando conectividade com a API...');
            // console.log('Base URL:', api.defaults.baseURL);

            const response = await api.get('/');
            // console.log('API está respondendo');
            return true;
        } catch (error) {
            // ✅ REMOVIDO: Console.errors para apresentação
            // console.error('Erro de conectividade:', error);
            // console.error('Verifique se a API está rodando em:', api.defaults.baseURL);
            return false;
        }
    }

    // ✅ NOVO: Buscar informações da sessão do teste
    static async getTestSessionInfo(testId: string): Promise<TestSessionInfo> {
        console.log('Buscando informações da sessão do teste:', testId);

        try {
            const response = await api.get(`/student-answers/test/${testId}/session`);
            console.log('Resposta da API getTestSessionInfo:', response.data);
            return response.data;
        } catch (error: any) {
            // ✅ CORRIGIDO: Tratar erro 404 como caso normal (sem sessão ativa)
            if (error.response?.status === 404) {
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
            console.log('Questões recebidas:', response.data.questions);
            if (response.data.questions && response.data.questions.length > 0) {
                console.log('Primeira questão:', response.data.questions[0]);
                console.log('Primeira questão - alternatives:', response.data.questions[0].alternatives);
                console.log('Primeira questão - options:', response.data.questions[0].options);
            }
            return response.data;
        } catch (error) {
            console.error('Erro ao buscar dados do teste:', error);
            console.error('Detalhes do erro:', error.response?.data);
            throw error;
        }
    }

    // Iniciar sessão de teste (apenas criar a sessão, sem iniciar cronômetro)
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

    // Iniciar cronômetro da sessão (novo endpoint)
    static async startTimer(sessionId: string): Promise<{ message: string; actual_start_time: string; remaining_time_minutes: number; timer_started: boolean }> {
        console.log('Iniciando cronômetro para sessão:', sessionId);

        try {
            const response = await api.post(`/student-answers/sessions/${sessionId}/start-timer`, {});
            console.log('Resposta da API startTimer:', response.data);
            return response.data;
        } catch (error) {
            console.error('Erro ao iniciar cronômetro:', error);
            console.error('Detalhes do erro:', error.response?.data);
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
        console.log('Enviando dados para finalizar teste:', data);
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