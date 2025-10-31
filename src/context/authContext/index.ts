import { create } from 'zustand'
import { api } from '@/lib/api'
import { toast } from 'react-toastify'
import { AxiosError } from 'axios'

interface User {
    id: string,
    name: string,
    email: string,
    role: string,
    tenant_id: string,
    registration: string,
    created_at: string,
    updated_at: string,
    phone: string,
    address: string,
    gender: string,
    nationality: string,
    birth_date: string,
}

interface ApiError {
    erro?: string;
    error?: string;
    message?: string;
}

interface AuthContext {
    user: User,
    loading: boolean,
    login: (registration: string, password: string) => Promise<any>,
    autoLogin: () => Promise<any>,
    logout: () => Promise<void>,
    setUser: (user: User) => void,
    persistUser: () => Promise<boolean>
}

export const useAuth = create<AuthContext>((set) => ({
    loading: false,
    user: {
        id: '',
        name: '',
        registration: '',
        email: '',
        role: '',
        tenant_id: '',
        created_at: '',
        updated_at: '',
        phone: '',
        address: '',
        gender: '',
        nationality: '',
        birth_date: '',
    },
    setUser: (user) => {
        set({ user })
    },
    autoLogin: async () => {
        set({ loading: true })
        try {
            const response = await api.post("/login/", {
                registration: "moises@innovplay.com",
                password: "12345678"
            })

            toast.success("Login automático realizado com sucesso!");

            localStorage.setItem('token', response.data.token)

            // ✅ CORRIGIDO: Usar a instância da API corretamente
            api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`

            set({ user: response.data.user })

            return response;
        } catch (error: unknown) {
            console.error("Erro no login automático:", error);
            const axiosError = error as AxiosError<ApiError>;

            // ✅ CORRIGIDO: Melhorar tratamento de erros de CORS
            if (axiosError.code === 'ERR_NETWORK') {
                toast.error("Erro de conexão com o servidor. Verifique se o backend está rodando em http://localhost:5000");
            } else {
                const errorMessage = axiosError.response?.data?.erro || axiosError.response?.data?.error || "Erro ao autenticar!";
                toast.error(errorMessage);
            }
            throw error;
        } finally {
            set({ loading: false })
        }
    },
    login: async (registration: string, password: string) => {
        set({ loading: true })
        try {
            const response = await api.post("/login/", { registration, password })

            toast.success("Login realizado com sucesso!", {
                autoClose: 3000, // 3 segundos para sucesso
            });
            console.log(response.data)
            localStorage.setItem('token', response.data.token)

            // ✅ CORRIGIDO: Usar a instância da API corretamente
            api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`

            set({ user: response.data.user })

            // Adicionar um pequeno delay para o toast ser visível
            await new Promise(resolve => setTimeout(resolve, 1000));

            return response;
        } catch (error: unknown) {
            console.error("Erro no login:", error);
            // Removido o toast automático para evitar duplicação
            // O componente de Login agora trata os erros especificamente
            throw error;
        } finally {
            set({ loading: false })
        }
    },
    logout: async () => {
        try {
            await api.post("/logout/")
            localStorage.removeItem('token')

            // ✅ CORRIGIDO: Usar a instância da API corretamente
            delete api.defaults.headers.common['Authorization']

            // Resetar tema, fonte e tamanho de fonte para padrões no DOM apenas
            // NÃO limpar localStorage - as configurações devem permanecer salvas para quando o usuário fizer login novamente
            try {
                document.documentElement.classList.remove('dark');
                document.documentElement.style.setProperty('--app-font-family', 'Inter');
                document.documentElement.style.setProperty('--app-font-size', '100%');
                if (document.body) {
                    document.body.style.fontFamily = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif';
                    document.body.style.fontSize = '100%';
                }
            } catch (error) {
                console.warn("Erro ao resetar estilos:", error);
            }

            set({
                user: {
                    id: '',
                    name: '',
                    registration: '',
                    email: '',
                    role: '',
                    tenant_id: '',
                    created_at: '',
                    updated_at: '',
                    phone: '',
                    address: '',
                    gender: '',
                    nationality: '',
                    birth_date: '',
                }
            })
            window.location.href = '/';
        } catch (error: unknown) {
            console.error("Erro no logout:", error);
            toast.error("Não foi possível deslogar");
        }
    },
    persistUser: async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                return false;
            }

            // ✅ CORRIGIDO: Usar a instância da API corretamente
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            const response = await api.get('/persist-user/');
            if (response.data && response.data.user) {
                if (response.data.token) {
                    localStorage.setItem('token', response.data.token);
                    api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
                }

                set((state) => ({
                    user: {
                        ...state.user,
                        ...response.data.user,
                    }
                }));
                return true;
            }
            return false;
        } catch (error: unknown) {
            console.error('Erro ao persistir usuário:', error);
            localStorage.removeItem('token');
            delete api.defaults.headers.common['Authorization'];
            return false;
        }
    }
}))