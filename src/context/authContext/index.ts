import {create} from 'zustand'
import { api } from '@/lib/api'
import { toast } from 'react-toastify'
import axios, { AxiosError } from 'axios'

interface User{
    id:string,
    name:string,
    email:string,
    role:string,
    tenant_id:string,
    registration:string,
    created_at:string,
    updated_at:string,
    phone:string,
    address:string,
    gender:string,
    nationality:string,
    birth_date:string,
}

interface ApiError {
    erro?: string;
    error?: string;
    message?: string;
}

interface AuthContext{
    user:User,
    loading: boolean,
    login: (registration:string, password:string) => void,
    logout: () => Promise<void>,
    setUser: (user:User) => void,
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
    login: async (registration: string, password: string) => {
        set({ loading: true })
        try {
            const response = await api.post("/login/", { registration, password })

            toast.success("Login realizado com sucesso!");

            localStorage.setItem('token', response.data.token)

            axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`

            set({user: response.data.user})

            return response;
        } catch (error: unknown) {
            console.error("Erro no login:", error);
            const axiosError = error as AxiosError<ApiError>;
            const errorMessage = axiosError.response?.data?.erro || axiosError.response?.data?.error || "Erro ao autenticar!";
            toast.error(errorMessage);
            throw error;
        } finally {
            set({ loading: false })
        }
    },
    logout: async () => {
        try {
            await api.post("/logout/")
            localStorage.removeItem('token')
            
            delete axios.defaults.headers.common['Authorization']
            
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

            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            
            const response = await api.get('/persist-user/');
            if (response.data && response.data.user) {
                if (response.data.token) {
                    localStorage.setItem('token', response.data.token);
                    api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
                    axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
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
            delete axios.defaults.headers.common['Authorization'];
            return false;
        }
    }
}))