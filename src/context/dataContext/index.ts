import { create} from 'zustand'
import { api } from '@/lib/api'
import {toast} from 'react-toastify'
import { useAuth } from '../authContext'


interface AlunnoProps{
    id: string
    nome : string 
    email : string 
    senha_hash : string
    usuario_id : string
    profile_picture: string 
    birth_date: string 
    matricula: string 
    criado_em : string
    education_stage_id: string 
    grade_id: string 
    turma_id: string 
    escola_id: string 
}


interface AvaliacaoProp {
    id :string;
    titulo: string
    descricao :string
    tipo :string
    assunto :string
    grade_level :string
    status:string
    total_points:0.0,
    time_limit:string
    passing_score:DoubleRange;
    random_questions:boolean
    show_results_immediately : boolean
    allow_review:boolean
    instructions:string
    data_aplicacao:string
    escola_id :string
    created_by :string
    criado_em: string
}

interface QuestoesProp{
    id: string;
    title: string
    description: string;
    resource_type: string;
    resource_content: string  // Pode ser texto ou caminho de imagem
    command: string //Enunciado principal
    question_type: string //'multiplaescolha', 'verdadeirofalso', 'dissertativa'
    subject: string //Matéria
    grade_level: string //Série ou ano escolar
    difficulty_level: string // Ex: fácil, médio, difícil
    status: string //'active', 'inactive'
    correct_answer:string //Pode ser string, boolean ou texto dissertativo
    tags: string[] //Lista de tags
    avaliacao_id: string
    alternativas: string //json
    escola_id: string
    created_by: string //ID do criador (usuário)
    criado_em: string
}

interface EscolasProp{
    id:string
    name: string
    city_id:string
    address: string
    domain: string
    created_at: string
    city: {
        id: string;
        name: string;
        state: string;
        created_at: string;
    }
}

interface MunicipioProps{
    id:string
    name: string
    state:string
    domain:string
    city_id:string
    created_at:string
}

interface GradesProp{
    id: string;
    name: string;
    education_stage_id: string
}

interface EducationStageProps{
    id:string
    name:string
}

interface DataProps {
    avaliacoes: AvaliacaoProp,
    questoes: QuestoesProp,
    escolas: EscolasProp[],
    grades: GradesProp,
    educationStages: EducationStageProps,
    municipios: MunicipioProps,
    alunos: AlunnoProps,
    getEscolas: (id?: string) => Promise<EscolasProp | EscolasProp[] | null>;
    getMunicipios: () => void;
}

export const useDataContext = create<DataProps>(set => {
    return{
        avaliacoes:{
            id :"",
            titulo: "",
            descricao :"",
            tipo :"",
            assunto :"",
            grade_level :"",
            status:"",
            total_points:0.0,
            time_limit:"",
            passing_score:0.0,
            random_questions:false,
            show_results_immediately : false,
            allow_review:false,
            instructions:"",
            data_aplicacao:"",
            escola_id :"",
            created_by :"",
            criado_em: "",
        },
        questoes:{
            id: "", 
            title: "", 
            description: "", 
            resource_type: "", 
            resource_content: "", 
            command: "", 
            question_type: "", 
            subject: "",
            grade_level: "",
            difficulty_level: "",
            status: "", 
            correct_answer:"", 
            tags: [], 
            avaliacao_id: "",
            alternativas: "", 
            escola_id: "",
            created_by: "", 
            criado_em: "",
        },
        escolas:[],
        grades:{
            id: "",
            name: "",
            education_stage_id: "",
        },
        educationStages:{
            id:"",
            name:"",
        },
        municipios:{
            id:"",
            name: "",
            state:"",
            domain:"",
            city_id:"",
            created_at:"",
        }, 
        alunos:{
        id: '',
        nome : '', 
        email : '', 
        senha_hash : '',
        usuario_id : '',
        profile_picture: '', 
        birth_date: '', 
        matricula: '', 
        criado_em : '',
        education_stage_id: '', 
        grade_id: '', 
        turma_id: '', 
        escola_id: '', 
        },

        getAvaliacoes: async () => {
            try {
                
                const response = await api.get("/test/")
                set({avaliacoes: response.data})
            } catch (error) {
                toast.error("Erro ao receber avaliacoes", error)
            }
        },

        getEscolas: async (id?: string) => {
            try {
                const endpoint = id ? `/school/${id}` : "/school";
                const response = await api.get(endpoint);
                
                if (id) {
                    // If fetching a single school, return it directly
                    return response.data;
                } else {
                    // If fetching all schools, update the state
                    set({ escolas: response.data });
                    return response.data;
                }
            } catch (e) {
                toast.error("Erro ao buscar escolas!", e);
                return null;
            }
        },
        getMunicipios: async () => {
            try{
                const response = await api.get("/city/")
                set({municipios: response.data})

            }catch(e) {
                toast.error("Erro ao buscar minicipios", e)
            }
        }
    }
})
