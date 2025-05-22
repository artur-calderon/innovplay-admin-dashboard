import { create} from 'zustand'
import { api } from '@/lib/api'
import {toast} from 'react-toastify'


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
    nome: string
    municipio_id:string
    enderec: string
    dominio: string
    criado_em: string

}

interface MunicipioProps{
    id:string
    nome: string
    estado:string
    criado_em:string
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
    escolas: EscolasProp,
    grades: GradesProp,
    educationStages: EducationStageProps,
    municipios: MunicipioProps,
    alunos: AlunnoProps,
    getEscolas:() => void;
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
        escolas:{
            id:"",
            nome: "",
            municipio_id:"",
            enderec: "",
            dominio: "",
            criado_em: "",
        },
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
            nome: "",
            estado:"",
            criado_em:"",
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
                const response = await api.get("/tests/")
                set({avaliacoes: response.data})
            } catch (error) {
                toast.error("Erro ao receber avaliacoes", error)
            }
        },

        getEscolas:async ()=>{
            try
            {
                const response = await api.get("/school/")
                set({escolas:response.data})

            }catch(e){
              toast.error("Erro ao buscar escolas!",e)  
            }
        },
    }
})
