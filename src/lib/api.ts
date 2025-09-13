import axios from 'axios'

// Configuração da base URL da API
// Em desenvolvimento, use o proxy do Vite (\"/api\") para evitar CORS
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    // ✅ CORRIGIDO: Timeout inicial menor para requisições rápidas

    withCredentials: false
})

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }

    // ✅ CORRIGIDO: Remover headers de CORS do frontend
    // Os headers de CORS devem ser configurados apenas no backend

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
            // Recurso não encontrado
            throw new Error('Recurso não encontrado no servidor.')
        } else if (error.response?.status >= 500) {
            // Erro do servidor
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
    let lastError: any;
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

        } catch (error: any) {
            lastError = error;

            // Só tentar novamente se for timeout ou erro de rede
            if (attempt < maxRetries && (
                error.code === 'ECONNABORTED' ||
                error.code === 'ERR_NETWORK' ||
                error.message?.includes('timeout') ||
                error.message?.includes('Timeout')
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

    try {
        const result = await Promise.race([requestPromise, timeoutPromise]);
        return result;
    } catch (error) {
        throw error;
    }
};

// Configuração padrão para desenvolvimento
// ✅ REMOVIDO: Console.log para apresentação
// console.log('API Base URL:', BASE_URL);

