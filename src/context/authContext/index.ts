import {create} from 'zustand'
import { api } from '@/lib/api'
import { toast } from 'react-toastify'

interface User{
    id:string,
    name:string,
    email:string,
    role:string,
    tenant_id:string,
    registration:string
}

interface AuthContext{
    user:User,
    loading: boolean,
    login: (registration:string, password:string) => void,
    logout: () => Promise<void>,
    setUser: (user:User) => void
}


export const useAuth =  create<AuthContext>((set) =>{
    return {
        loading:false,
        user: {
            id: '',
            name: '',
            registration:'',
            email:'',
            role:'',
            tenant_id:''

        },
        setUser:(user)=>{
            set({user})
        },
        login: async (registration: string, password: string) => {
            set({ loading: true })
            try
            {
                const response = await api.post("/login/",{registration, password})
                toast.success("Login realizado com sucesso!");
                set({user: response.data.usuario})
                return response;

            }catch(e){
                toast.error("Erro ao autenticar!")
            }finally{
                set({loading: false})
            }
        },

        logout: async () =>{
            try{
                await api.post("/logout/")
                set({
                    user:{
                        id: '',
                        name: '',
                        registration:'',
                        email:'',
                        role:'',
                        tenant_id:''
                    }
                })
            }catch(e){
                toast.error("Não foi possivel deslogar",e)
            }
        }
    }
})