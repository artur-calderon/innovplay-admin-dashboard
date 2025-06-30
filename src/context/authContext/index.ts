import {create} from 'zustand'
import { api } from '@/lib/api'
import { toast } from 'react-toastify'
import axios from 'axios'

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
        } catch (e: any) {
            console.error("Erro no login:", e);
            const errorMessage = e.response?.data?.erro || e.response?.data?.error || "Erro ao autenticar!";
            toast.error(errorMessage);
            throw e;
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
        } catch (e: any) {
            console.error("Erro no logout:", e);
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
        } catch (e: any) {
            console.error('Erro ao persistir usuário:', e);
            localStorage.removeItem('token');
            delete api.defaults.headers.common['Authorization'];
            delete axios.defaults.headers.common['Authorization'];
            return false;
        }
    }
}))