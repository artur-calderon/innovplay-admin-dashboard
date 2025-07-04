// Dados mockados estendidos - 30 alunos e 30 questões completas
import { format, subDays } from 'date-fns';

// Tipos
interface ExtendedStudent {
  id: string;
  name: string;
  email: string;
  grade: string;
  class: string;
  school: string;
  status: 'active' | 'inactive';
  profileType: 'excellent' | 'good' | 'average' | 'struggling' | 'improving';
  characteristics: string[];
  createdAt: string;
}

// 30 Alunos completos
export const allMockStudents: ExtendedStudent[] = [
  // Turma 5A (10 alunos)
  {
    id: "student-1",
    name: "Ana Clara Silva Santos",
    email: "ana.santos@escola.com",
    grade: "5º Ano",
    class: "5A",
    school: "E.M. Dom Pedro II",
    status: "active",
    profileType: "excellent",
    characteristics: ["Participativa", "Organizada", "Líder natural"],
    createdAt: format(subDays(new Date(), 30), "yyyy-MM-dd'T'08:00:00'Z'")
  },
  {
    id: "student-2",
    name: "Bruno Henrique Costa Lima",
    email: "bruno.lima@escola.com",
    grade: "5º Ano",
    class: "5A",
    school: "E.M. Dom Pedro II",
    status: "active",
    profileType: "good",
    characteristics: ["Colaborativo", "Criativo", "Questionador"],
    createdAt: format(subDays(new Date(), 29), "yyyy-MM-dd'T'08:30:00'Z'")
  },
  {
    id: "student-3",
    name: "Carolina Oliveira Pereira",
    email: "carolina.pereira@escola.com",
    grade: "5º Ano",
    class: "5A", 
    school: "E.M. Dom Pedro II",
    status: "active",
    profileType: "average",
    characteristics: ["Esforçada", "Tímida", "Precisa incentivo"],
    createdAt: format(subDays(new Date(), 28), "yyyy-MM-dd'T'09:00:00'Z'")
  },
  {
    id: "student-4",
    name: "Diego Alves Rodrigues",
    email: "diego.rodrigues@escola.com",
    grade: "5º Ano",
    class: "5A",
    school: "E.M. Dom Pedro II",
    status: "active",
    profileType: "struggling",
    characteristics: ["Dispersa facilmente", "Precisa apoio extra"],
    createdAt: format(subDays(new Date(), 27), "yyyy-MM-dd'T'09:30:00'Z'")
  },
  {
    id: "student-5",
    name: "Eduarda Fernandes Martins",
    email: "eduarda.martins@escola.com",
    grade: "5º Ano",
    class: "5A",
    school: "E.M. Dom Pedro II",
    status: "active",
    profileType: "improving",
    characteristics: ["Dedicada", "Melhorando", "Boa memória"],
    createdAt: format(subDays(new Date(), 26), "yyyy-MM-dd'T'10:00:00'Z'")
  },
  {
    id: "student-6",
    name: "Felipe Santos Barbosa",
    email: "felipe.barbosa@escola.com",
    grade: "5º Ano",
    class: "5A",
    school: "E.M. Dom Pedro II",
    status: "active",
    profileType: "excellent",
    characteristics: ["Rápido", "Independente", "Ajuda colegas"],
    createdAt: format(subDays(new Date(), 25), "yyyy-MM-dd'T'10:30:00'Z'")
  },
  {
    id: "student-7",
    name: "Gabriela Reis Souza",
    email: "gabriela.souza@escola.com",
    grade: "5º Ano",
    class: "5A",
    school: "E.M. Dom Pedro II",
    status: "active",
    profileType: "good",
    characteristics: ["Detalhista", "Caprichosa", "Boa escrita"],
    createdAt: format(subDays(new Date(), 24), "yyyy-MM-dd'T'11:00:00'Z'")
  },
  {
    id: "student-8",
    name: "Henrique Cardoso Moreira",
    email: "henrique.moreira@escola.com",
    grade: "5º Ano",
    class: "5A",
    school: "E.M. Dom Pedro II",
    status: "active",
    profileType: "average",
    characteristics: ["Sociável", "Gosta de grupo", "Potencial"],
    createdAt: format(subDays(new Date(), 23), "yyyy-MM-dd'T'11:30:00'Z'")
  },
  {
    id: "student-9",
    name: "Isabela Gomes Teixeira",
    email: "isabela.teixeira@escola.com",
    grade: "5º Ano",
    class: "5A",
    school: "E.M. Dom Pedro II",
    status: "active",
    profileType: "struggling",
    characteristics: ["Falta confiança", "Precisa reforço"],
    createdAt: format(subDays(new Date(), 22), "yyyy-MM-dd'T'12:00:00'Z'")
  },
  {
    id: "student-10",
    name: "João Pedro Almeida Cruz",
    email: "joao.cruz@escola.com",
    grade: "5º Ano",
    class: "5A",
    school: "E.M. Dom Pedro II",
    status: "active",
    profileType: "improving",
    characteristics: ["Persistente", "Curioso", "Aprende fazendo"],
    createdAt: format(subDays(new Date(), 21), "yyyy-MM-dd'T'12:30:00'Z'")
  },
  // Turma 5B (10 alunos)
  {
    id: "student-11",
    name: "Larissa Mendes Rocha",
    email: "larissa.rocha@escola.com",
    grade: "5º Ano",
    class: "5B",
    school: "E.M. Dom Pedro II",
    status: "active",
    profileType: "good",
    characteristics: ["Organizada", "Concentrada", "Gosta leitura"],
    createdAt: format(subDays(new Date(), 20), "yyyy-MM-dd'T'13:00:00'Z'")
  },
  {
    id: "student-12",
    name: "Matheus Ferreira Dias",
    email: "matheus.dias@escola.com",
    grade: "5º Ano",
    class: "5B",
    school: "E.M. Dom Pedro II",
    status: "active",
    profileType: "excellent",
    characteristics: ["Pensamento crítico", "Liderança", "Ensina"],
    createdAt: format(subDays(new Date(), 19), "yyyy-MM-dd'T'13:30:00'Z'")
  },
  {
    id: "student-13",
    name: "Nathalia Ribeiro Castro",
    email: "nathalia.castro@escola.com",
    grade: "5º Ano",
    class: "5B",
    school: "E.M. Dom Pedro II",
    status: "active",
    profileType: "average",
    characteristics: ["Aplicada", "Segue instruções", "Prática"],
    createdAt: format(subDays(new Date(), 18), "yyyy-MM-dd'T'14:00:00'Z'")
  },
  {
    id: "student-14",
    name: "Otávio Monteiro Cunha",
    email: "otavio.cunha@escola.com",
    grade: "5º Ano",
    class: "5B",
    school: "E.M. Dom Pedro II",
    status: "active",
    profileType: "struggling",
    characteristics: ["Dificuldade concentração", "Visual", "Paciência"],
    createdAt: format(subDays(new Date(), 17), "yyyy-MM-dd'T'14:30:00'Z'")
  },
  {
    id: "student-15",
    name: "Priscila Araújo Nunes",
    email: "priscila.nunes@escola.com",
    grade: "5º Ano",
    class: "5B",
    school: "E.M. Dom Pedro II",
    status: "active",
    profileType: "improving",
    characteristics: ["Esforçada", "Seu ritmo", "Criativa"],
    createdAt: format(subDays(new Date(), 16), "yyyy-MM-dd'T'15:00:00'Z'")
  },
  {
    id: "student-16",
    name: "Rafael Campos Lopes",
    email: "rafael.lopes@escola.com",
    grade: "5º Ano",
    class: "5B",
    school: "E.M. Dom Pedro II",
    status: "active",
    profileType: "good",
    characteristics: ["Analítico", "Desafios", "Raciocínio lógico"],
    createdAt: format(subDays(new Date(), 15), "yyyy-MM-dd'T'15:30:00'Z'")
  },
  {
    id: "student-17",
    name: "Sofia Carvalho Freitas",
    email: "sofia.freitas@escola.com",
    grade: "5º Ano",
    class: "5B",
    school: "E.M. Dom Pedro II",
    status: "active",
    profileType: "excellent",
    characteristics: ["Comunicativa", "Autodidata", "Inspira"],
    createdAt: format(subDays(new Date(), 14), "yyyy-MM-dd'T'16:00:00'Z'")
  },
  {
    id: "student-18",
    name: "Thiago Melo Andrade",
    email: "thiago.andrade@escola.com",
    grade: "5º Ano",
    class: "5B",
    school: "E.M. Dom Pedro II",
    status: "active",
    profileType: "average",
    characteristics: ["Participativo", "Exemplos práticos", "Colaborativo"],
    createdAt: format(subDays(new Date(), 13), "yyyy-MM-dd'T'16:30:00'Z'")
  },
  {
    id: "student-19",
    name: "Valentina Pires Correia",
    email: "valentina.correia@escola.com",
    grade: "5º Ano",
    class: "5B",
    school: "E.M. Dom Pedro II",
    status: "active",
    profileType: "struggling",
    characteristics: ["Tímida", "Encorajamento", "Esforçada"],
    createdAt: format(subDays(new Date(), 12), "yyyy-MM-dd'T'17:00:00'Z'")
  },
  {
    id: "student-20",
    name: "William Navarro Silva",
    email: "william.silva@escola.com",
    grade: "5º Ano",
    class: "5B",
    school: "E.M. Dom Pedro II",
    status: "active",
    profileType: "improving",
    characteristics: ["Determinado", "Aprende erros", "Feedback"],
    createdAt: format(subDays(new Date(), 11), "yyyy-MM-dd'T'17:30:00'Z'")
  },
  // Turma 5C (10 alunos)
  {
    id: "student-21",
    name: "Yasmin Torres Ribeiro",
    email: "yasmin.ribeiro@escola.com",
    grade: "5º Ano",
    class: "5C",
    school: "E.M. Dom Pedro II",
    status: "active",
    profileType: "good",
    characteristics: ["Responsável", "Pontual", "Boa memória"],
    createdAt: format(subDays(new Date(), 10), "yyyy-MM-dd'T'08:00:00'Z'")
  },
  {
    id: "student-22",
    name: "Zeca Moraes Santana",
    email: "zeca.santana@escola.com",
    grade: "5º Ano",
    class: "5C",
    school: "E.M. Dom Pedro II",
    status: "active",
    profileType: "average",
    characteristics: ["Sociável", "Conversando", "Potencial"],
    createdAt: format(subDays(new Date(), 9), "yyyy-MM-dd'T'08:30:00'Z'")
  },
  {
    id: "student-23",
    name: "Amanda Costa Ferreira",
    email: "amanda.ferreira@escola.com",
    grade: "5º Ano",
    class: "5C",
    school: "E.M. Dom Pedro II",
    status: "active",
    profileType: "excellent",
    characteristics: ["Autoconfiante", "Líder", "Inspira"],
    createdAt: format(subDays(new Date(), 8), "yyyy-MM-dd'T'09:00:00'Z'")
  },
  {
    id: "student-24",
    name: "Bernardo Lima Santos",
    email: "bernardo.santos@escola.com",
    grade: "5º Ano",
    class: "5C",
    school: "E.M. Dom Pedro II",
    status: "active",
    profileType: "good",
    characteristics: ["Criativo", "Arte", "Colaborativo"],
    createdAt: format(subDays(new Date(), 7), "yyyy-MM-dd'T'09:30:00'Z'")
  },
  {
    id: "student-25",
    name: "Camila Oliveira Rocha",
    email: "camila.rocha@escola.com",
    grade: "5º Ano",
    class: "5C",
    school: "E.M. Dom Pedro II",
    status: "active",
    profileType: "average",
    characteristics: ["Esforçada", "Regras claras", "Dedicada"],
    createdAt: format(subDays(new Date(), 6), "yyyy-MM-dd'T'10:00:00'Z'")
  },
  {
    id: "student-26",
    name: "Daniel Souza Pereira",
    email: "daniel.pereira@escola.com",
    grade: "5º Ano",
    class: "5C",
    school: "E.M. Dom Pedro II",
    status: "active",
    profileType: "struggling",
    characteristics: ["Mais tempo", "Repetição", "Boa vontade"],
    createdAt: format(subDays(new Date(), 5), "yyyy-MM-dd'T'10:30:00'Z'")
  },
  {
    id: "student-27",
    name: "Evelyn Martins Cruz",
    email: "evelyn.cruz@escola.com",
    grade: "5º Ano",
    class: "5C",
    school: "E.M. Dom Pedro II",
    status: "active",
    profileType: "improving",
    characteristics: ["Progresso constante", "Persistente", "Melhora"],
    createdAt: format(subDays(new Date(), 4), "yyyy-MM-dd'T'11:00:00'Z'")
  },
  {
    id: "student-28",
    name: "Fernando Alves Costa",
    email: "fernando.costa@escola.com",
    grade: "5º Ano",
    class: "5C",
    school: "E.M. Dom Pedro II",
    status: "active",
    profileType: "good",
    characteristics: ["Analítico", "Ciências", "Curioso"],
    createdAt: format(subDays(new Date(), 3), "yyyy-MM-dd'T'11:30:00'Z'")
  },
  {
    id: "student-29",
    name: "Giovanna Ribeiro Lopes",
    email: "giovanna.lopes@escola.com",
    grade: "5º Ano",
    class: "5C",
    school: "E.M. Dom Pedro II",
    status: "active",
    profileType: "excellent",
    characteristics: ["Excelente memória", "Rápida", "Perfeccionista"],
    createdAt: format(subDays(new Date(), 2), "yyyy-MM-dd'T'12:00:00'Z'")
  },
  {
    id: "student-30",
    name: "Hugo Cardoso Teixeira",
    email: "hugo.teixeira@escola.com",
    grade: "5º Ano",
    class: "5C",
    school: "E.M. Dom Pedro II",
    status: "active",
    profileType: "average",
    characteristics: ["Esforçado", "Esportes", "Responsável"],
    createdAt: format(subDays(new Date(), 1), "yyyy-MM-dd'T'12:30:00'Z'")
  }
];

// Estatísticas dos 30 alunos
export const studentStats = {
  total: 30,
  byProfile: {
    excellent: 6,  // 20%
    good: 8,       // 27%
    average: 8,    // 27%
    struggling: 4, // 13%
    improving: 4   // 13%
  },
  byClass: {
    '5A': 10,
    '5B': 10,
    '5C': 10
  }
};

export default {
  allMockStudents,
  studentStats
}; 