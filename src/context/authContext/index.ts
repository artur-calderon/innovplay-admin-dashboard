import {create} from 'zustand'
import { api } from '@/lib/api'
import { toast } from 'react-toastify'

interface User{
    id:string,
    nome:string,
    email:string,
    role:string,
    tenant_id:string,
    matricula:string
}

interface AuthContext{
    user:User,
    loading: boolean,
    login: (matricula:string, senha:string) => void,
    logout: () => Promise<void>,
    setUser: (user:User) => void
}


export const useAuth =  create<AuthContext>((set) =>{
    return {
        loading:false,
        user: {
            id: '',
            nome: '',
            matricula:'',
            email:'',
            role:'',
            tenant_id:''

        },
        setUser:(user)=>{
            set({user})
        },
        login: async (matricula: string, senha: string) => {
            set({ loading: true })
            try
            {
                const response = await api.post("/login/",{matricula, senha})
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
                        nome: '',
                        matricula:'',
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