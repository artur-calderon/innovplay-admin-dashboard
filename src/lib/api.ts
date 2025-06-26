import axios from 'axios'


export const api = axios.create({
    baseURL:import.meta.env.VITE_API_BASE_URL
})

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if(token){
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

// Tipos para atalhos rápidos
export interface QuickLink {
    href: string;
    icon: string;
    label: string;
}

export interface UserQuickLinksResponse {
    id: string;
    user_id: string;
    quickLinks: QuickLink[];
}

// Funções da API para atalhos rápidos
export const quickLinksApi = {
    // Buscar atalhos do usuário
    getUserQuickLinks: async (userId: string): Promise<QuickLink[]> => {
        try {
            const response = await api.get<UserQuickLinksResponse>(`/user-quick-links/${userId}`);
            return response.data.quickLinks || [];
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                // Se não existir atalhos, retorna array vazio
                return [];
            }
            throw error;
        }
    },

    // Criar/atualizar atalhos do usuário
    saveUserQuickLinks: async (userId: string, quickLinks: QuickLink[]): Promise<void> => {
        await api.post(`/user-quick-links/${userId}`, { quickLinks });
    },

    // Deletar atalhos do usuário
    deleteUserQuickLinks: async (userId: string): Promise<void> => {
        await api.delete(`/user-quick-links/${userId}`);
    }
};