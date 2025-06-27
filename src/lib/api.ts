import axios from 'axios'


export const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL
})

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config;
})

// Interceptor para tratamento de erros (opcional, mas recomendado)
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Token expirado ou inválido
            localStorage.removeItem('token');
            // Redirecionar para login ou tentar renovar o token
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

