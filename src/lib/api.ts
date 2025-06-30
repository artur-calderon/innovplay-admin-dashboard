import axios from 'axios'

// Configuração da base URL da API
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

export const api = axios.create({
    baseURL: BASE_URL
})

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config;
})

// Interceptor para tratamento de erros
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Token expirado ou inválido
            localStorage.removeItem('token');
            // Redirecionar para login
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

// Configuração padrão para desenvolvimento
console.log('API Base URL:', BASE_URL);

