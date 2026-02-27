import axios from 'axios'

// Permitir meta.cityId nas requisições (para admin tenant context)
declare module 'axios' {
    interface InternalAxiosRequestConfig {
        meta?: { cityId?: string }
    }
}

// Configuração da base URL da API
// Em desenvolvimento, use o proxy do Vite (\"/api\") para evitar CORS
// Remove barra final para evitar URL duplicada (ex: ...com.br//subdomain/check -> 404)
const rawBase = import.meta.env.VITE_API_BASE_URL || '/api'
const BASE_URL = rawBase.replace(/\/+$/, '') || '/api'

export const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    withCredentials: false
})

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }

    // Contexto de município: X-City-ID para backend escopar (admin, tecadm, diretor, coordenador)
    const userJson = localStorage.getItem('user')
    if (userJson) {
        try {
            const user = JSON.parse(userJson) as { role?: string }
            const cityId = (config as typeof config & { meta?: { cityId?: string } }).meta?.cityId
            const role = (user?.role ?? '').toLowerCase()
            const canSendCityId = ['admin', 'tecadm', 'diretor', 'coordenador'].includes(role)
            if (canSendCityId && cityId) {
                config.headers['X-City-ID'] = cityId
            }
        } catch {
            // ignore parse error
        }
    }
    const cfg = config as typeof config & { meta?: unknown }
    if (cfg.meta !== undefined) delete cfg.meta

    return config;
}, (error) => {
    console.error('Erro na requisição:', error)
    return Promise.reject(error)
})

// Interceptor para tratamento de erros
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        // ✅ CORRIGIDO: Melhorar tratamento de erros
        if (error.response?.status === 401) {
            // Token expirado ou inválido
            localStorage.removeItem('token');
            // Redirecionar para login
            window.location.href = '/';
        } else if (error.code === 'ERR_NETWORK') {
            // Erro de rede/CORS
            console.error('Erro de rede/CORS:', error.message)
            throw new Error('Erro de conexão com o servidor. Verifique se o backend está rodando e se não há problemas de CORS.')
        } else if (error.code === 'ECONNABORTED') {
            // ✅ CORRIGIDO: Erro de timeout com mensagem mais específica
            console.error('Timeout na requisição:', error.message)
            throw new Error('A requisição demorou muito para responder. O servidor pode estar sobrecarregado ou processando muitos dados.')
        } else if (error.response?.status === 404) {
            // Recurso não encontrado - preservar SEMPRE o erro original para que o frontend possa acessar error.response.data.message
            return Promise.reject(error);
        } else if (error.response?.status >= 500) {
            // ✅ CORRIGIDO: Preservar erro original para endpoints críticos
            // Endpoints que precisam de tratamento específico de erro
            const url = error.config?.url || '';
            const criticalEndpoints = ['/student-answers/submit', '/student-answers/save-partial', '/answer-sheets/correct-new'];
            
            // Se o erro tem uma mensagem específica no campo 'error', preservar o erro original
            if (error.response?.data?.error) {
                // Preservar o erro original com response para tratamento específico
                return Promise.reject(error);
            }
            
            if (criticalEndpoints.some(endpoint => url.includes(endpoint))) {
                // Preservar o erro original com response para tratamento específico
                return Promise.reject(error);
            }
            
            // Detectar erros de conexão com o banco de dados
            const errorDetails = error.response?.data?.details || '';
            const isDatabaseError = 
                errorDetails.includes('psycopg2.OperationalError') ||
                errorDetails.includes('server closed the connection') ||
                errorDetails.includes('connection unexpectedly') ||
                errorDetails.includes('connection pool') ||
                errorDetails.includes('too many connections');
            
            if (isDatabaseError) {
                console.error('Erro de conexão com o banco de dados:', errorDetails);
                throw new Error('Erro de conexão com o banco de dados. O servidor pode estar sobrecarregado. Tente novamente em alguns instantes.')
            }
            
            // Para outros endpoints, lançar erro genérico
            throw new Error('Erro interno do servidor. Tente novamente mais tarde.')
        }

        return Promise.reject(error);
    }
);

// ✅ NOVA FUNÇÃO: Requisição com retry automático e timeout progressivo
export const apiWithRetry = async <T>(
    requestFn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000,
    maxTimeout: number = 60000
): Promise<T> => {
    let lastError: Error | unknown;
    let currentTimeout = 15000; // Timeout inicial

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            // ✅ CORRIGIDO: Usar timeout progressivo
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`Timeout de ${currentTimeout}ms excedido`));
                }, currentTimeout);
            });

            const requestPromise = requestFn();

            // Race entre a requisição e o timeout
            const result = await Promise.race([requestPromise, timeoutPromise]);
            return result;

        } catch (error: unknown) {
            lastError = error;

            // Só tentar novamente se for timeout ou erro de rede
            const errorObj = error as { code?: string; message?: string };
            if (attempt < maxRetries && (
                errorObj.code === 'ECONNABORTED' ||
                errorObj.code === 'ERR_NETWORK' ||
                errorObj.message?.includes('timeout') ||
                errorObj.message?.includes('Timeout')
            )) {
                await new Promise(resolve => setTimeout(resolve, initialDelay));

                // Aumentar timeout progressivamente
                currentTimeout = Math.min(currentTimeout * 1.5, maxTimeout);
                initialDelay *= 1.5;
                continue;
            }

            throw error;
        }
    }

    throw lastError;
};

// ✅ NOVA FUNÇÃO: Requisição com timeout específico
export const apiWithTimeout = async <T>(
    requestFn: () => Promise<T>,
    timeout: number = 30000
): Promise<T> => {
    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
            reject(new Error(`Timeout de ${timeout}ms excedido`));
        }, timeout);
    });

    const requestPromise = requestFn();

    const result = await Promise.race([requestPromise, timeoutPromise]);
    return result;
};

// Configuração padrão para desenvolvimento
// ✅ REMOVIDO: Console.log para apresentação
// console.log('API Base URL:', BASE_URL);

