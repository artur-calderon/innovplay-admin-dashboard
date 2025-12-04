import { create } from 'zustand'
import { api } from '@/lib/api'
import { toast } from 'react-toastify'
import { AxiosError } from 'axios'
import { loadAndApplySettings } from '@/hooks/useSettings'

export interface AvatarConfig {
    seed?: string;
    flip?: boolean;
    rotate?: number;
    scale?: number;
    radius?: number;
    size?: number;
    backgroundColor?: string[];
    backgroundType?: string[];
    backgroundRotation?: number[];
    translateX?: number;
    translateY?: number;
    clip?: boolean;
    randomizeIds?: boolean;
    beard?: string[];
    beardProbability?: number;
    earrings?: string[];
    earringsColor?: string[];
    earringsProbability?: number;
    eyebrows?: string[];
    eyebrowsColor?: string[];
    eyes?: string[];
    eyesColor?: string[];
    freckles?: string[];
    frecklesColor?: string[];
    frecklesProbability?: number;
    glasses?: string[];
    glassesColor?: string[];
    glassesProbability?: number;
    hair?: string[];
    hairAccessories?: string[];
    hairAccessoriesColor?: string[];
    hairAccessoriesProbability?: number;
    hairColor?: string[];
    head?: string[];
    mouth?: string[];
    mouthColor?: string[];
    nose?: string[];
    noseColor?: string[];
    skinColor?: string[];
}

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
    avatar_config?: AvatarConfig | null,
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
    persistUser: () => Promise<boolean>,
    updateAvatarConfig: (config: AvatarConfig) => Promise<void>,
    fetchUserDetails: (userId: string) => Promise<void>,
}

export const useAuth = create<AuthContext>((set, get) => ({
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
        avatar_config: null,
    },
    setUser: (user) => {
        set({ user })
    },
    fetchUserDetails: async (userId: string) => {
        if (!userId) {
            return;
        }

        try {
            const response = await api.get(`/users/${userId}`);
            const detailedUser = response.data?.user ?? response.data;
            if (detailedUser) {
                set((state) => ({
                    user: {
                        ...state.user,
                        ...detailedUser,
                    }
                }));
            }
        } catch (error) {
            console.error('Erro ao buscar detalhes completos do usuário:', error);
        }
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

            if (response.data.user?.id) {
                await loadAndApplySettings(response.data.user.id)
                await get().fetchUserDetails(response.data.user.id)
            }

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
            localStorage.setItem('token', response.data.token)

            // ✅ CORRIGIDO: Usar a instância da API corretamente
            api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`

            set({ user: response.data.user })

            if (response.data.user?.id) {
                await loadAndApplySettings(response.data.user.id)
                await get().fetchUserDetails(response.data.user.id)
            }

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
            
            // ✅ NOVO: Limpar filtros da página de resultados ao fazer logout
            sessionStorage.removeItem('results_filters')

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
                    avatar_config: null,
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
            if (response.data) {
                const persistedUser = response.data.user ?? response.data;

                if (response.data.token) {
                    localStorage.setItem('token', response.data.token);
                    api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
                }

                if (persistedUser) {
                    set((state) => ({
                        user: {
                            ...state.user,
                            ...persistedUser,
                        }
                    }));

                    const targetId = persistedUser.id;
                    if (targetId) {
                        await loadAndApplySettings(targetId)
                        await get().fetchUserDetails(targetId)
                    }
                    return true;
                }
            }
            return false;
        } catch (error: unknown) {
            console.error('Erro ao persistir usuário:', error);
            localStorage.removeItem('token');
            delete api.defaults.headers.common['Authorization'];
            return false;
        }
    },
    updateAvatarConfig: async (config: AvatarConfig) => {
        try {
            const currentUser = get().user;
            if (!currentUser.id) {
                throw new Error('Usuário não autenticado');
            }

            const response = await api.put(`/users/${currentUser.id}`, {
                avatar_config: config
            });

            if (response.data && response.data.user) {
                set((state) => ({
                    user: {
                        ...state.user,
                        ...response.data.user,
                    }
                }));
                toast.success('Avatar atualizado com sucesso!');
            }
        } catch (error: unknown) {
            console.error('Erro ao atualizar avatar:', error);
            const axiosError = error as AxiosError<ApiError>;
            const errorMessage = axiosError.response?.data?.erro || axiosError.response?.data?.error || 'Erro ao atualizar avatar';
            toast.error(errorMessage);
            throw error;
        }
    }
}))