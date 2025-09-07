import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Users, 
  FileText,
  Calendar,
  Download,
  Filter,
  Eye,
  Building2,
  GraduationCap,
  UserCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  LineChart as RechartsLineChart, 
  Line 
} from 'recharts';

// Tipos para os relatórios
interface FormReport {
  id: string;
  formId: string;
  formTitle: string;
  formType: 'aluno-jovem' | 'aluno-velho' | 'professor' | 'diretor' | 'secretario';
  totalResponses: number;
  completionRate: number;
  createdAt: Date;
  lastResponse: Date;
  status: 'active' | 'completed' | 'draft';
  schools: string[];
}

const FormReports = () => {
  const navigate = useNavigate();
  const [selectedReport, setSelectedReport] = useState<FormReport | null>(null);
  const [chartType, setChartType] = useState<'bar' | 'pie' | 'line'>('bar');

  // Dados mockados dos relatórios
  const mockReports: FormReport[] = [
    {
      id: '1',
      formId: 'form-1',
      formTitle: 'Questionário Socioeconômico - Anos Iniciais 2024',
      formType: 'aluno-jovem',
      totalResponses: 245,
      completionRate: 87.5,
      createdAt: new Date('2024-01-15'),
      lastResponse: new Date('2024-02-10'),
      status: 'active',
      schools: ['Escola Municipal João Silva', 'Escola Estadual Maria Santos']
    },
    {
      id: '2',
      formId: 'form-2',
      formTitle: 'Questionário Socioeconômico - Anos Finais 2024',
      formType: 'aluno-velho',
      totalResponses: 189,
      completionRate: 92.3,
      createdAt: new Date('2024-01-20'),
      lastResponse: new Date('2024-02-12'),
      status: 'active',
      schools: ['Escola Municipal Pedro Costa', 'Escola Estadual Ana Oliveira']
    },
    {
      id: '3',
      formId: 'form-3',
      formTitle: 'Avaliação Docente - 1º Semestre 2024',
      formType: 'professor',
      totalResponses: 45,
      completionRate: 78.9,
      createdAt: new Date('2024-02-01'),
      lastResponse: new Date('2024-02-15'),
      status: 'completed',
      schools: ['Escola Municipal João Silva', 'Escola Estadual Maria Santos', 'Escola Municipal Pedro Costa']
    },
    {
      id: '4',
      formId: 'form-4',
      formTitle: 'Caracterização da Escola - 2024',
      formType: 'diretor',
      totalResponses: 12,
      completionRate: 100,
      createdAt: new Date('2024-02-05'),
      lastResponse: new Date('2024-02-18'),
      status: 'completed',
      schools: ['Escola Municipal João Silva', 'Escola Estadual Maria Santos', 'Escola Municipal Pedro Costa', 'Escola Estadual Ana Oliveira']
    },
    {
      id: '5',
      formId: 'form-5',
      formTitle: 'Gestão Educacional Municipal - 2024',
      formType: 'secretario',
      totalResponses: 8,
      completionRate: 88.9,
      createdAt: new Date('2024-02-10'),
      lastResponse: new Date('2024-02-20'),
      status: 'active',
      schools: ['Secretaria Municipal de Educação']
    }
  ];

  // Dados mockados para gráficos baseados no tipo de questionário
  const getChartDataForForm = (formType: string) => {
    switch (formType) {
      case 'aluno-jovem':
        return [
          { name: 'Renda até 1 SM', value: 35, color: '#FF6B6B' },
          { name: 'Renda 1-2 SM', value: 28, color: '#4ECDC4' },
          { name: 'Renda 2-3 SM', value: 22, color: '#45B7D1' },
          { name: 'Renda 3-5 SM', value: 12, color: '#96CEB4' },
          { name: 'Renda acima de 5 SM', value: 3, color: '#FFEAA7' }
        ];
      case 'aluno-velho':
        return [
          { name: 'Ensino Fundamental', value: 45, color: '#FF9F43' },
          { name: 'Ensino Médio', value: 35, color: '#10AC84' },
          { name: 'Ensino Superior', value: 15, color: '#5F27CD' },
          { name: 'Pós-graduação', value: 5, color: '#00D2D3' }
        ];
      case 'professor':
        return [
          { name: '0-5 anos', value: 15, color: '#A29BFE' },
          { name: '6-10 anos', value: 25, color: '#6C5CE7' },
          { name: '11-15 anos', value: 30, color: '#FD79A8' },
          { name: '16-20 anos', value: 20, color: '#FDCB6E' },
          { name: 'Mais de 20 anos', value: 10, color: '#E17055' }
        ];
      case 'diretor':
        return [
          { name: 'Gestão Pedagógica', value: 40, color: '#FF7675' },
          { name: 'Gestão Administrativa', value: 25, color: '#74B9FF' },
          { name: 'Gestão Financeira', value: 20, color: '#00B894' },
          { name: 'Gestão de Pessoas', value: 10, color: '#FDCB6E' },
          { name: 'Gestão de Infraestrutura', value: 5, color: '#A29BFE' }
        ];
      case 'secretario':
        return [
          { name: 'Gestão Municipal', value: 35, color: '#6366F1' },
          { name: 'Políticas Educacionais', value: 25, color: '#8B5CF6' },
          { name: 'Recursos Financeiros', value: 20, color: '#A855F7' },
          { name: 'Formação Continuada', value: 15, color: '#C084FC' },
          { name: 'Avaliação e Monitoramento', value: 5, color: '#DDD6FE' }
        ];
      default:
        return [
          { name: 'Categoria A', value: 40, color: '#FF6B6B' },
          { name: 'Categoria B', value: 35, color: '#4ECDC4' },
          { name: 'Categoria C', value: 25, color: '#45B7D1' }
        ];
    }
  };

  // Dados específicos por pergunta para diretor (todas as perguntas organizadas por seção)
  const getQuestionDataForDiretor = () => {
    return [
      // Seção: Caracterização Geral da Escola
      {
        id: 'Q001',
        question: 'Indique quais são as etapas educacionais atendidas pela sua escola:',
        type: 'matriz_selecao',
        section: 'Caracterização Geral da Escola',
        data: [
          { name: 'Educação Infantil - Creche (0 a 3 anos)', value: 15, color: '#FF6B6B' },
          { name: 'Educação Infantil - Pré-escola (4 e 5 anos)', value: 25, color: '#4ECDC4' },
          { name: 'Anos Iniciais do Ensino Fundamental', value: 85, color: '#45B7D1' },
          { name: 'Anos Finais do Ensino Fundamental', value: 70, color: '#96CEB4' },
          { name: 'Ensino Médio', value: 30, color: '#FFEAA7' }
        ]
      },
      {
        id: 'Q006',
        question: 'Sua escola é:',
        type: 'selecao_unica',
        section: 'Caracterização Geral da Escola',
        data: [
          { name: 'Pública', value: 90, color: '#FF6B6B' },
          { name: 'Privada', value: 10, color: '#4ECDC4' }
        ]
      },
      
      // Seção: Informações Pessoais e Condições de Trabalho
      {
        id: 'Q007',
        question: 'Qual é o seu sexo?',
        type: 'selecao_unica',
        section: 'Informações Pessoais e Condições de Trabalho',
        data: [
          { name: 'Feminino', value: 65, color: '#FF6B6B' },
          { name: 'Masculino', value: 33, color: '#4ECDC4' },
          { name: 'Não quero declarar', value: 2, color: '#45B7D1' }
        ]
      },
      {
        id: 'Q008',
        question: 'Qual é a sua idade?',
        type: 'slider',
        section: 'Informações Pessoais e Condições de Trabalho',
        data: [
          { name: '18-30 anos', value: 5, color: '#FF6B6B' },
          { name: '31-40 anos', value: 20, color: '#4ECDC4' },
          { name: '41-50 anos', value: 35, color: '#45B7D1' },
          { name: '51-60 anos', value: 30, color: '#96CEB4' },
          { name: '61-70 anos', value: 10, color: '#FFEAA7' }
        ]
      },
      {
        id: 'Q009',
        question: 'Qual é a sua cor ou raça?',
        type: 'selecao_unica',
        section: 'Informações Pessoais e Condições de Trabalho',
        data: [
          { name: 'Branca', value: 50, color: '#FF6B6B' },
          { name: 'Preta', value: 15, color: '#4ECDC4' },
          { name: 'Parda', value: 32, color: '#45B7D1' },
          { name: 'Amarela', value: 2, color: '#96CEB4' },
          { name: 'Indígena', value: 1, color: '#FFEAA7' },
          { name: 'Não quero declarar', value: 0, color: '#A29BFE' }
        ]
      },
      {
        id: 'Q014',
        question: 'Qual é o MAIS ALTO nível de escolaridade que você concluiu?',
        type: 'selecao_unica',
        section: 'Informações Pessoais e Condições de Trabalho',
        data: [
          { name: 'Ensino Fundamental', value: 2, color: '#FF6B6B' },
          { name: 'Ensino Médio', value: 8, color: '#4ECDC4' },
          { name: 'Graduação', value: 45, color: '#45B7D1' },
          { name: 'Especialização', value: 30, color: '#96CEB4' },
          { name: 'Mestrado', value: 12, color: '#FFEAA7' },
          { name: 'Doutorado', value: 3, color: '#A29BFE' }
        ]
      },
      {
        id: 'Q016',
        question: 'Há quantos anos você exerce a função de diretor(a) de escola?',
        type: 'slider',
        section: 'Informações Pessoais e Condições de Trabalho',
        data: [
          { name: '0-2 anos', value: 15, color: '#FF6B6B' },
          { name: '3-5 anos', value: 25, color: '#4ECDC4' },
          { name: '6-10 anos', value: 30, color: '#45B7D1' },
          { name: '11-15 anos', value: 20, color: '#96CEB4' },
          { name: '16-30 anos', value: 10, color: '#FFEAA7' }
        ]
      },
      {
        id: 'Q025',
        question: 'Qual é o seu salário bruto como diretor(a)?',
        type: 'selecao_unica',
        section: 'Informações Pessoais e Condições de Trabalho',
        data: [
          { name: 'Até R$1.320,00', value: 2, color: '#FF6B6B' },
          { name: 'De R$1.320,01 até R$2.640,00', value: 8, color: '#4ECDC4' },
          { name: 'De R$2.640,01 até R$3.960,00', value: 20, color: '#45B7D1' },
          { name: 'De R$3.960,01 até R$5.280,00', value: 30, color: '#96CEB4' },
          { name: 'De R$5.280,01 até R$6.600,00', value: 25, color: '#FFEAA7' },
          { name: 'De R$6.600,01 até R$7.920,00', value: 10, color: '#A29BFE' },
          { name: 'De R$7.920,01 até R$9.240,00', value: 3, color: '#6C5CE7' },
          { name: 'Acima de R$9.240,00', value: 2, color: '#FD79A8' }
        ]
      },
      {
        id: 'Q026',
        question: 'Você possui outra atividade remunerada?',
        type: 'selecao_unica',
        section: 'Informações Pessoais e Condições de Trabalho',
        data: [
          { name: 'Não', value: 60, color: '#FF6B6B' },
          { name: 'Sim', value: 40, color: '#4ECDC4' }
        ]
      },
      
      // Seção: Percepções do(a) Diretor(a)
      {
        id: 'Q027',
        question: 'Indique o quanto concorda ou discorda com as afirmativas abaixo:',
        type: 'matriz_selecao',
        section: 'Percepções do(a) Diretor(a)',
        data: [
          { name: 'Repetir de ano é bom para o(a) estudante que não apresentou desempenho satisfatório', value: 10, color: '#FF6B6B' },
          { name: 'As avaliações externas (municipais, estaduais ou federais) têm direcionado o que deve ser ensinado', value: 70, color: '#4ECDC4' },
          { name: 'As avaliações externas (federal, estadual ou municipal) têm ajudado a melhorar o processo de ensino e aprendizagem', value: 55, color: '#45B7D1' },
          { name: 'A maioria dos estudantes da escola apresenta problemas de aprendizagem', value: 25, color: '#96CEB4' },
          { name: 'Eu acredito que a totalidade dos (as) estudantes da escola são capazes de concluir a Educação Básica e prosseguir seus estudos', value: 80, color: '#FFEAA7' }
        ]
      },
      
      // Seção: Recursos e Infraestrutura
      {
        id: 'Q032',
        question: 'Avalie, abaixo, as condições dos RECURSOS da sua escola:',
        type: 'matriz_selecao_complexa',
        section: 'Recursos e Infraestrutura',
        data: [
          { name: 'Televisão', value: 75, color: '#FF6B6B' },
          { name: 'Projetor multimídia (datashow)', value: 60, color: '#4ECDC4' },
          { name: 'Computador (de mesa ou portátil)', value: 70, color: '#45B7D1' },
          { name: 'Softwares educacionais', value: 45, color: '#96CEB4' },
          { name: 'Internet banda larga', value: 80, color: '#FFEAA7' },
          { name: 'Recursos pedagógicos para atendimento educacional especializado', value: 30, color: '#A29BFE' }
        ]
      },
      {
        id: 'Q055',
        question: 'Indique o quanto concorda ou discorda das afirmativas relativas às condições de funcionamento desta escola neste ano:',
        type: 'matriz_selecao',
        section: 'Recursos e Infraestrutura',
        data: [
          { name: 'Os recursos financeiros foram suficientes', value: 40, color: '#FF6B6B' },
          { name: 'Houve atraso no repasse de recursos financeiros para pagamento de pessoal', value: 30, color: '#4ECDC4' },
          { name: 'O quadro de professores estava completo', value: 60, color: '#45B7D1' },
          { name: 'Havia quantidade suficiente de pessoal de apoio (serviços gerais)', value: 50, color: '#96CEB4' },
          { name: 'Havia quantidade suficiente de pessoal administrativo (secretaria)', value: 55, color: '#FFEAA7' },
          { name: 'Havia quantidade suficiente de pessoal para apoio pedagógico (coordenador e orientador)', value: 45, color: '#A29BFE' },
          { name: 'Recebi apoio da Secretaria de Educação', value: 65, color: '#6C5CE7' },
          { name: 'Os(As) professores(as) foram assíduos(as)', value: 70, color: '#FD79A8' },
          { name: 'As substituições das ausências de professores(as) foram facilmente realizadas', value: 35, color: '#FDCB6E' },
          { name: 'Os(As) estudantes foram assíduos(as)', value: 75, color: '#E17055' },
          { name: 'A comunidade apoiou a gestão da escola', value: 60, color: '#00B894' },
          { name: 'A comunidade executou trabalhos voluntários na escola', value: 25, color: '#74B9FF' },
          { name: 'As famílias contribuíram com o trabalho pedagógico', value: 50, color: '#FF7675' },
          { name: 'Os (as) estudantes com deficiência, transtornos espectro autista ou com altas habilidades/superdotação receberam atendimento educacional especializado (AEE)', value: 40, color: '#A29BFE' },
          { name: 'No início do ano letivo, todos(as) os(as) estudantes receberam os livros didáticos', value: 85, color: '#6C5CE7' }
        ]
      },
      {
        id: 'Q078',
        question: 'O calendário escolar de 2023 foi interrompido durante VÁRIOS DIAS por algum dos eventos abaixo?',
        type: 'matriz_selecao',
        section: 'Recursos e Infraestrutura',
        data: [
          { name: 'Falta de água', value: 15, color: '#FF6B6B' },
          { name: 'Falta de energia', value: 20, color: '#4ECDC4' },
          { name: 'Falta de merenda', value: 5, color: '#45B7D1' },
          { name: 'Greve de professores', value: 10, color: '#96CEB4' },
          { name: 'Episódios de violência', value: 8, color: '#FFEAA7' },
          { name: 'Problemas de infraestrutura predial', value: 12, color: '#A29BFE' },
          { name: 'Paralisação do transporte', value: 15, color: '#6C5CE7' },
          { name: 'Eventos climáticos (inundação, desmoronamento etc.)', value: 10, color: '#FD79A8' },
          { name: 'Eventos comemorativos', value: 5, color: '#FDCB6E' },
          { name: 'Problemas de saúde pública', value: 8, color: '#E17055' },
          { name: 'Outros', value: 3, color: '#00B894' }
        ]
      },
      {
        id: 'Q091',
        question: 'Sobre os episódios listados abaixo, indique a frequência com que ocorreram neste ano, nesta escola:',
        type: 'matriz_selecao',
        section: 'Recursos e Infraestrutura',
        data: [
          { name: 'Atentado à vida', value: 1, color: '#FF6B6B' },
          { name: 'Lesão corporal', value: 3, color: '#4ECDC4' },
          { name: 'Roubo ou furto', value: 12, color: '#45B7D1' },
          { name: 'Tráfico de drogas', value: 2, color: '#96CEB4' },
          { name: 'Permanência de pessoas sob efeito de álcool', value: 5, color: '#FFEAA7' },
          { name: 'Permanência de pessoas sob efeito de drogas', value: 3, color: '#A29BFE' },
          { name: 'Porte de arma (revólver, faca, canivete)', value: 1, color: '#6C5CE7' },
          { name: 'Assédio sexual', value: 1, color: '#FD79A8' },
          { name: 'Discriminação (racial, gênero, orientação sexual, econômica/social, deficiência)', value: 8, color: '#FDCB6E' },
          { name: 'Bullying (ameaças ou ofensas verbais)', value: 20, color: '#E17055' },
          { name: 'Invasão do espaço escolar', value: 2, color: '#00B894' },
          { name: 'Depredação do patrimônio escolar (vandalismo)', value: 6, color: '#74B9FF' },
          { name: 'Tiroteio ou bala perdida', value: 1, color: '#FF7675' }
        ]
      },
      
      // Seção: Gestão e Participação
      {
        id: 'Q110',
        question: 'Há Conselho Escolar na sua escola?',
        type: 'selecao_unica',
        section: 'Gestão e Participação',
        data: [
          { name: 'Não', value: 20, color: '#FF6B6B' },
          { name: 'Sim', value: 80, color: '#4ECDC4' }
        ]
      },
      {
        id: 'Q112',
        question: 'Há Conselho de Classe na sua escola?',
        type: 'selecao_unica',
        section: 'Gestão e Participação',
        data: [
          { name: 'Não', value: 10, color: '#FF6B6B' },
          { name: 'Sim', value: 90, color: '#4ECDC4' }
        ]
      },
      {
        id: 'Q115',
        question: 'Existe Associação de Pais e Mestres-APM (ou caixa escolar) nesta escola?',
        type: 'selecao_unica',
        section: 'Gestão e Participação',
        data: [
          { name: 'Não', value: 15, color: '#FF6B6B' },
          { name: 'Sim', value: 85, color: '#4ECDC4' }
        ]
      },
      {
        id: 'Q121',
        question: 'A escola desenvolve REGULARMENTE trabalhos em conjunto com:',
        type: 'matriz_selecao',
        section: 'Gestão e Participação',
        data: [
          { name: 'Serviços de saúde (postos de saúde)', value: 40, color: '#FF6B6B' },
          { name: 'Serviços de assistência social (CRAS e outros)', value: 30, color: '#4ECDC4' },
          { name: 'Segurança pública (polícia militar, guarda municipal e outros)', value: 25, color: '#45B7D1' },
          { name: 'Conselho Tutelar (Ministério Público e outros)', value: 20, color: '#96CEB4' },
          { name: 'Instituições de apoio ao público-alvo da educação especial (APAE)', value: 15, color: '#FFEAA7' },
          { name: 'Instituições de ensino superior (faculdades, universidades, IFs)', value: 35, color: '#A29BFE' },
          { name: 'Instituições privadas (empresas, ONGs, corporações)', value: 20, color: '#6C5CE7' },
          { name: 'Outros órgãos da prefeitura ou do governo estadual ou federal', value: 45, color: '#FD79A8' }
        ]
      },
      {
        id: 'Q129',
        question: 'Quais as fontes de financiamento da escola?',
        type: 'matriz_selecao',
        section: 'Gestão e Participação',
        data: [
          { name: 'Recursos federais (Programa Dinheiro Direto na Escola etc.)', value: 85, color: '#FF6B6B' },
          { name: 'Recursos estaduais ou municipais', value: 90, color: '#4ECDC4' },
          { name: 'Eventos da escola (festa, rifa etc.)', value: 40, color: '#45B7D1' },
          { name: 'Empresas que apoiam a escola', value: 15, color: '#96CEB4' },
          { name: 'Organizações sem fins lucrativos que apoiam a escola', value: 20, color: '#FFEAA7' },
          { name: 'Contribuições dos familiares dos(as) estudantes', value: 25, color: '#A29BFE' },
          { name: 'Contribuições dos(as) profissionais da escola', value: 10, color: '#6C5CE7' }
        ]
      },
      {
        id: 'Q151',
        question: 'A escola possui Projeto Político-Pedagógico?',
        type: 'selecao_unica',
        section: 'Gestão e Participação',
        data: [
          { name: 'Não', value: 5, color: '#FF6B6B' },
          { name: 'Sim', value: 95, color: '#4ECDC4' }
        ]
      },
      {
        id: 'Q160',
        question: 'Neste ano e nesta escola, todos que solicitaram vagas conseguiram se matricular?',
        type: 'selecao_unica',
        section: 'Gestão e Participação',
        data: [
          { name: 'Não', value: 30, color: '#FF6B6B' },
          { name: 'Sim', value: 70, color: '#4ECDC4' }
        ]
      },
      {
        id: 'Q194',
        question: 'Nesta escola, há projetos com as seguintes temáticas:',
        type: 'matriz_selecao',
        section: 'Gestão e Participação',
        data: [
          { name: 'Ciência e tecnologia', value: 60, color: '#FF6B6B' },
          { name: 'Combate à discriminação', value: 45, color: '#4ECDC4' },
          { name: 'Combate à violência (física, verbal, bullying, dentre outras)', value: 70, color: '#45B7D1' },
          { name: 'Direitos humanos', value: 50, color: '#96CEB4' },
          { name: 'Educação ambiental e consumo sustentável', value: 65, color: '#FFEAA7' },
          { name: 'Educação para o trânsito', value: 40, color: '#A29BFE' },
          { name: 'Mundo do trabalho (direitos, relações, entre outros)', value: 35, color: '#6C5CE7' },
          { name: 'Nutrição e alimentação', value: 55, color: '#FD79A8' },
          { name: 'Promoção da democracia e da cidadania', value: 60, color: '#FDCB6E' },
          { name: 'Uso de drogas', value: 50, color: '#E17055' },
          { name: 'Sexualidade', value: 30, color: '#00B894' }
        ]
      },
      {
        id: 'Q205',
        question: 'Indique se as seguintes ações pedagógicas ocorrem na sua escola:',
        type: 'matriz_selecao',
        section: 'Gestão e Participação',
        data: [
          { name: 'Preparação dos(as) estudantes para os testes de avaliação externos', value: 80, color: '#FF6B6B' },
          { name: 'Inscrição dos(as) estudantes em olímpiadas de conhecimento', value: 45, color: '#4ECDC4' },
          { name: 'Feira de ciências', value: 60, color: '#45B7D1' },
          { name: 'Feira de artes', value: 55, color: '#96CEB4' },
          { name: 'Campeonatos esportivos', value: 70, color: '#FFEAA7' },
          { name: 'Outros', value: 25, color: '#A29BFE' }
        ]
      },
      {
        id: 'Q212',
        question: 'Indique se, neste ano, a equipe escolar recebeu atividades de formação nas seguintes áreas:',
        type: 'matriz_selecao',
        section: 'Gestão e Participação',
        data: [
          { name: 'Conteúdo e compreensão dos conceitos da(s) área(s) de ensino', value: 70, color: '#FF6B6B' },
          { name: 'Avaliação da aprendizagem', value: 75, color: '#4ECDC4' },
          { name: 'Avaliação em larga escala', value: 60, color: '#45B7D1' },
          { name: 'Metodologias de ensino', value: 80, color: '#96CEB4' },
          { name: 'Base Nacional Comum Curricular - BNCC', value: 85, color: '#FFEAA7' },
          { name: 'Gestão da sala de aula', value: 70, color: '#A29BFE' },
          { name: 'Educação Especial', value: 45, color: '#6C5CE7' },
          { name: 'Novas tecnologias educacionais', value: 65, color: '#FD79A8' },
          { name: 'Gestão e administração escolar', value: 55, color: '#FDCB6E' },
          { name: 'Ensino híbrido', value: 40, color: '#E17055' },
          { name: 'Alfabetização e letramento', value: 60, color: '#00B894' },
          { name: 'Gestão democrática', value: 50, color: '#74B9FF' }
        ]
      }
    ];
  };

  // Dados específicos por pergunta para professor (todas as perguntas organizadas por seção)
  const getQuestionDataForProfessor = () => {
    return [
      // Seção: Informações Gerais
      {
        id: 'Q001',
        question: 'Qual é o seu sexo?',
        type: 'selecao_unica',
        section: 'Informações Gerais',
        data: [
          { name: 'Feminino', value: 75, color: '#FF6B6B' },
          { name: 'Masculino', value: 23, color: '#4ECDC4' },
          { name: 'Não quero declarar', value: 2, color: '#45B7D1' }
        ]
      },
      {
        id: 'Q002',
        question: 'Qual é a sua idade?',
        type: 'slider',
        section: 'Informações Gerais',
        data: [
          { name: '18-25 anos', value: 8, color: '#FF6B6B' },
          { name: '26-35 anos', value: 25, color: '#4ECDC4' },
          { name: '36-45 anos', value: 35, color: '#45B7D1' },
          { name: '46-55 anos', value: 25, color: '#96CEB4' },
          { name: '56-70 anos', value: 7, color: '#FFEAA7' }
        ]
      },
      {
        id: 'Q003',
        question: 'Qual é a sua cor ou raça?',
        type: 'selecao_unica',
        section: 'Informações Gerais',
        data: [
          { name: 'Branca', value: 45, color: '#FF6B6B' },
          { name: 'Preta', value: 12, color: '#4ECDC4' },
          { name: 'Parda', value: 40, color: '#45B7D1' },
          { name: 'Amarela', value: 2, color: '#96CEB4' },
          { name: 'Indígena', value: 1, color: '#FFEAA7' },
          { name: 'Não quero declarar', value: 0, color: '#A29BFE' }
        ]
      },
      {
        id: 'Q004',
        question: 'Você possui deficiência, transtorno do espectro autista ou superdotação?',
        type: 'selecao_unica',
        section: 'Informações Gerais',
        data: [
          { name: 'Não', value: 92, color: '#FF6B6B' },
          { name: 'Sim', value: 8, color: '#4ECDC4' }
        ]
      },
      {
        id: 'Q008',
        question: 'Neste ano, o que normalmente você tem feito quando está fora do(s) seu(s) local(is) de trabalho?',
        type: 'matriz_selecao',
        section: 'Informações Gerais',
        data: [
          { name: 'Leio livros não relacionados à educação', value: 35, color: '#FF6B6B' },
          { name: 'Acesso blogs, Youtube, redes sociais', value: 70, color: '#4ECDC4' },
          { name: 'Assisto a filmes', value: 60, color: '#45B7D1' },
          { name: 'Vou a exposições (museus, centros culturais)', value: 25, color: '#96CEB4' },
          { name: 'Assisto a espetáculos (teatro, shows, circo)', value: 30, color: '#FFEAA7' },
          { name: 'Estudo', value: 55, color: '#A29BFE' },
          { name: 'Assisto a telejornal', value: 40, color: '#6C5CE7' }
        ]
      },
      {
        id: 'Q015',
        question: 'Indique o quanto você concorda ou discorda em relação aos seguintes temas envolvendo o seu trabalho como professor(a) da Educação Básica?',
        type: 'matriz_selecao',
        section: 'Informações Gerais',
        data: [
          { name: 'Tornar-me professor(a) foi a realização de um dos meus sonhos', value: 65, color: '#FF6B6B' },
          { name: 'A profissão de professor(a) é valorizada pela sociedade', value: 25, color: '#4ECDC4' },
          { name: 'As vantagens de ser professor(a) superam claramente as desvantagens', value: 45, color: '#45B7D1' },
          { name: 'No geral, estou satisfeito(a) com o meu trabalho de professor(a)', value: 70, color: '#96CEB4' },
          { name: 'Tenho vontade de desistir da profissão', value: 15, color: '#FFEAA7' }
        ]
      },
      
      // Seção: Formação
      {
        id: 'Q020',
        question: 'Qual é o MAIS ALTO nível de escolaridade que você concluiu?',
        type: 'selecao_unica',
        section: 'Formação',
        data: [
          { name: 'Ensino Médio - Magistério', value: 5, color: '#FF6B6B' },
          { name: 'Graduação', value: 60, color: '#4ECDC4' },
          { name: 'Especialização', value: 25, color: '#45B7D1' },
          { name: 'Mestrado', value: 8, color: '#96CEB4' },
          { name: 'Doutorado', value: 2, color: '#FFEAA7' }
        ]
      },
      {
        id: 'Q021',
        question: 'Considerando a carga horária das atividades formativas listadas abaixo, indique de quantas você participou neste ano:',
        type: 'matriz_selecao',
        section: 'Formação',
        data: [
          { name: 'Atividades formativas com menos de 20 horas', value: 40, color: '#FF6B6B' },
          { name: 'Curso com carga horária total de 20 horas até 179 horas', value: 30, color: '#4ECDC4' },
          { name: 'Curso com carga horária total com mais de 180 e menos 360 horas', value: 20, color: '#45B7D1' },
          { name: 'Nenhuma', value: 10, color: '#96CEB4' }
        ]
      },
      {
        id: 'Q037',
        question: 'Para cada um dos temas relacionados abaixo, avalie o grau de necessidade de realização de atividades/cursos voltados para seu desenvolvimento profissional atualmente:',
        type: 'matriz_selecao',
        section: 'Formação',
        data: [
          { name: 'Uso de novas tecnologias de informação e comunicação', value: 85, color: '#FF6B6B' },
          { name: 'Gestão de conflitos', value: 70, color: '#4ECDC4' },
          { name: 'Metodologia de avaliação', value: 75, color: '#45B7D1' },
          { name: 'Metodologia de ensino para o público-alvo da educação especial', value: 60, color: '#96CEB4' },
          { name: 'Utilização de elementos da cultura local na prática pedagógica', value: 55, color: '#FFEAA7' },
          { name: 'Identificação de problemas extraescolares', value: 50, color: '#A29BFE' },
          { name: 'Gestão democrática', value: 45, color: '#6C5CE7' },
          { name: 'Ensino do conteúdo que leciono', value: 40, color: '#FD79A8' },
          { name: 'Desenvolvimento da aprendizagem', value: 65, color: '#FDCB6E' },
          { name: 'Planejamento pedagógico', value: 50, color: '#E17055' },
          { name: 'Recursos e práticas pedagógicas', value: 60, color: '#00B894' }
        ]
      },
      
      // Seção: Experiência e Condições de Trabalho
      {
        id: 'Q048',
        question: 'Há quantos anos você trabalha como professor(a)?',
        type: 'slider',
        section: 'Experiência e Condições de Trabalho',
        data: [
          { name: '0-5 anos', value: 15, color: '#FF6B6B' },
          { name: '6-10 anos', value: 25, color: '#4ECDC4' },
          { name: '11-15 anos', value: 30, color: '#45B7D1' },
          { name: '16-20 anos', value: 20, color: '#96CEB4' },
          { name: '21-30 anos', value: 10, color: '#FFEAA7' }
        ]
      },
      {
        id: 'Q050',
        question: 'Além de ser professor (a), você exerce outra atividade remunerada?',
        type: 'selecao_unica',
        section: 'Experiência e Condições de Trabalho',
        data: [
          { name: 'Não', value: 40, color: '#FF6B6B' },
          { name: 'Sim', value: 60, color: '#4ECDC4' }
        ]
      },
      {
        id: 'Q051',
        question: 'Em quantas escolas você trabalha?',
        type: 'selecao_unica',
        section: 'Experiência e Condições de Trabalho',
        data: [
          { name: 'Apenas nesta', value: 35, color: '#FF6B6B' },
          { name: 'Em 2', value: 45, color: '#4ECDC4' },
          { name: 'Em 3 ou mais', value: 20, color: '#45B7D1' }
        ]
      },
      {
        id: 'Q052',
        question: 'Qual o seu tipo de vínculo trabalhista nesta escola?',
        type: 'selecao_unica',
        section: 'Experiência e Condições de Trabalho',
        data: [
          { name: 'Concursado/efetivo/estável', value: 70, color: '#FF6B6B' },
          { name: 'Contrato temporário', value: 20, color: '#4ECDC4' },
          { name: 'Contrato CLT', value: 8, color: '#45B7D1' },
          { name: 'Outra situação trabalhista', value: 2, color: '#96CEB4' }
        ]
      },
      {
        id: 'Q054',
        question: 'Qual é o seu salário bruto como professor(a)? Indique a faixa salarial em que seu salário se encontra.',
        type: 'selecao_unica',
        section: 'Experiência e Condições de Trabalho',
        data: [
          { name: 'Até R$1.320,00', value: 5, color: '#FF6B6B' },
          { name: 'De R$1.320,01 até R$2.640,00', value: 25, color: '#4ECDC4' },
          { name: 'De R$2.640,01 até R$3.960,00', value: 35, color: '#45B7D1' },
          { name: 'De R$3.960,01 até R$5.280,00', value: 20, color: '#96CEB4' },
          { name: 'De R$5.280,01 até R$6.600,00', value: 10, color: '#FFEAA7' },
          { name: 'De R$6.600,01 até R$7.920,00', value: 3, color: '#A29BFE' },
          { name: 'De R$7.920,01 até R$9.240,00', value: 1, color: '#6C5CE7' },
          { name: 'Acima de R$9.240,00', value: 1, color: '#FD79A8' }
        ]
      },
      {
        id: 'Q056',
        question: 'Esta escola, em seu planejamento, prevê um tempo para atividades como preparação de aulas, reuniões, atendimento aos pais etc?',
        type: 'selecao_unica',
        section: 'Experiência e Condições de Trabalho',
        data: [
          { name: 'Não', value: 40, color: '#FF6B6B' },
          { name: 'Sim', value: 60, color: '#4ECDC4' }
        ]
      },
      {
        id: 'Q057',
        question: 'Em uma semana normal de trabalho, você costuma levar trabalho desta escola para fazer em casa?',
        type: 'selecao_unica',
        section: 'Experiência e Condições de Trabalho',
        data: [
          { name: 'Não', value: 20, color: '#FF6B6B' },
          { name: 'Sim', value: 80, color: '#4ECDC4' }
        ]
      },
      
      // Seção: Práticas Pedagógicas
      {
        id: 'Q076',
        question: 'Indique o quanto você concorda ou discorda em relação aos seguintes temas:',
        type: 'matriz_selecao',
        section: 'Práticas Pedagógicas',
        data: [
          { name: 'Repetir de ano é bom para o(a) estudante que não apresentou desempenho satisfatório', value: 15, color: '#FF6B6B' },
          { name: 'A quantidade de avaliações externas (municipais, estaduais ou federais) é excessiva', value: 70, color: '#4ECDC4' },
          { name: 'As avaliações externas (municipais, estaduais ou federais) têm direcionado o que deve ser ensinado', value: 60, color: '#45B7D1' },
          { name: 'As avaliações externas têm ajudado a melhorar o processo de ensino e aprendizagem', value: 45, color: '#96CEB4' },
          { name: 'A maior parte dos estudantes apresentam problemas de aprendizagem', value: 30, color: '#FFEAA7' }
        ]
      },
      {
        id: 'Q081',
        question: 'Neste ano e nesta escola, indique a frequência com que você desenvolve as seguintes práticas pedagógicas:',
        type: 'matriz_selecao',
        section: 'Práticas Pedagógicas',
        data: [
          { name: 'Propor dever de casa', value: 85, color: '#FF6B6B' },
          { name: 'Corrigir com os(as) estudantes o dever de casa', value: 70, color: '#4ECDC4' },
          { name: 'Desenvolver trabalhos em grupo com os(as) estudantes', value: 80, color: '#45B7D1' },
          { name: 'Solicitar que os(as) estudantes copiem textos e atividades do livro didático ou da lousa', value: 60, color: '#96CEB4' },
          { name: 'Estimular os(as) estudantes a expressarem suas opiniões e a desenvolverem argumentos', value: 75, color: '#FFEAA7' },
          { name: 'Propor situações de aprendizagem que sejam familiares ou de interesse dos(as) estudantes', value: 70, color: '#A29BFE' },
          { name: 'Informar aos(as) estudantes, no início do ano, o que será ensinado ou aprendido', value: 80, color: '#6C5CE7' },
          { name: 'Perguntar aos(as) estudantes o que sabem sobre o tema, ao iniciar um novo conteúdo', value: 65, color: '#FD79A8' },
          { name: 'Trazer temas do cotidiano para serem debatidos em sala de aula', value: 70, color: '#FDCB6E' },
          { name: 'Diversificar as metodologias de ensino conforme as dificuldades dos(as) estudantes', value: 75, color: '#E17055' },
          { name: 'Considerar que os resultados das avaliações indicam o quanto os(as) estudantes aprenderam', value: 85, color: '#00B894' },
          { name: 'Buscar estratégias para melhorar a aprendizagem dos(as) estudantes com menor desempenho', value: 80, color: '#74B9FF' },
          { name: 'Abordar questões sobre desigualdade racial com os(as) estudantes', value: 40, color: '#FF7675' },
          { name: 'Abordar questões sobre desigualdade de gênero com os(as) estudantes', value: 35, color: '#A29BFE' },
          { name: 'Abordar questões sobre bullying e outras formas de violência com os(as) estudantes', value: 60, color: '#6C5CE7' },
          { name: 'Abordar questões relacionadas ao futuro profissional dos(as) estudantes', value: 50, color: '#FD79A8' }
        ]
      },
      {
        id: 'Q097',
        question: 'Há estudantes público-alvo da educação especial nesta escola?',
        type: 'selecao_unica',
        section: 'Práticas Pedagógicas',
        data: [
          { name: 'Não', value: 30, color: '#FF6B6B' },
          { name: 'Sim', value: 70, color: '#4ECDC4' }
        ]
      },
      
      // Seção: Gestão
      {
        id: 'Q100',
        question: 'A escola possui Projeto Político-Pedagógico?',
        type: 'selecao_unica',
        section: 'Gestão',
        data: [
          { name: 'Não', value: 10, color: '#FF6B6B' },
          { name: 'Sim', value: 90, color: '#4ECDC4' }
        ]
      },
      {
        id: 'Q106',
        question: 'Há Conselho de Classe na sua escola?',
        type: 'selecao_unica',
        section: 'Gestão',
        data: [
          { name: 'Não', value: 15, color: '#FF6B6B' },
          { name: 'Sim', value: 85, color: '#4ECDC4' }
        ]
      },
      {
        id: 'Q109',
        question: 'Neste ano e para esta escola, qual dos atores listados abaixo foi o principal responsável pelas seguintes definições pedagógicas:',
        type: 'matriz_selecao',
        section: 'Gestão',
        data: [
          { name: 'Escolha do material didático', value: 60, color: '#FF6B6B' },
          { name: 'Metodologia de ensino', value: 70, color: '#4ECDC4' },
          { name: 'Conteúdos trabalhados em sala', value: 75, color: '#45B7D1' },
          { name: 'Instrumentos para avaliar os(as) estudantes', value: 80, color: '#96CEB4' },
          { name: 'Peso de cada instrumento de avaliação nas notas finais dos(as) estudantes', value: 70, color: '#FFEAA7' },
          { name: 'Seleção de conteúdos usados nas provas', value: 65, color: '#A29BFE' }
        ]
      },
      {
        id: 'Q115',
        question: 'Neste ano, em relação a esta escola, indique o quanto você concorda ou discorda com os seguintes temas:',
        type: 'matriz_selecao',
        section: 'Gestão',
        data: [
          { name: 'O(A) diretor(a) debate as metas educacionais com os(as) professores(as) nas reuniões', value: 60, color: '#FF6B6B' },
          { name: 'O(A) diretor(a) e os(as) professores(as) tratam a qualidade de ensino como uma responsabilidade coletiva', value: 70, color: '#4ECDC4' },
          { name: 'O(A) diretor(a) informa aos(as) professores(as) sobre as possibilidades de aperfeiçoamento profissional', value: 55, color: '#45B7D1' },
          { name: 'O(A) diretor(a) dá atenção especial a aspectos relacionados à aprendizagem dos (as) estudantes', value: 65, color: '#96CEB4' },
          { name: 'O(A) diretor(a) dá atenção especial a aspectos relacionados às normas administrativas', value: 80, color: '#FFEAA7' },
          { name: 'O(A) diretor(a) me anima e me motiva para o trabalho', value: 50, color: '#A29BFE' },
          { name: 'Tenho confiança no(a) diretor(a) como profissional', value: 60, color: '#6C5CE7' },
          { name: 'O(A) diretor(a) e os(as) professores(as) asseguram que as questões relacionadas à qualidade da convivência e gestão de conflitos sejam uma responsabilidade coletiva', value: 55, color: '#FD79A8' }
        ]
      },
      {
        id: 'Q123',
        question: 'Nesta escola e neste ano, indique a frequência em que ocorreu:',
        type: 'matriz_selecao',
        section: 'Gestão',
        data: [
          { name: 'Colaboração da família para superar problemas relacionados aos estudantes', value: 50, color: '#FF6B6B' },
          { name: 'Colaboração entre colegas (feedback, trocas, projetos interdisciplinares)', value: 70, color: '#4ECDC4' },
          { name: 'Colaboração da gestão da instituição para superar dificuldades de sala de aula', value: 60, color: '#45B7D1' },
          { name: 'Apoio da Secretaria de Educação para superar as dificuldades do cotidiano escolar', value: 40, color: '#96CEB4' }
        ]
      },
      
      // Seção: Clima Escolar
      {
        id: 'Q127',
        question: 'Indique o quanto você concorda ou discorda em relação aos seguintes temas envolvendo seus(suas) estudantes nesta escola:',
        type: 'matriz_selecao',
        section: 'Clima Escolar',
        data: [
          { name: 'Respeitam os acordos estabelecidos em sala', value: 60, color: '#FF6B6B' },
          { name: 'São assíduos(as)', value: 70, color: '#4ECDC4' },
          { name: 'São respeitosos(as) comigo', value: 75, color: '#45B7D1' },
          { name: 'São respeitosos(as) com os(as) colegas da turma', value: 65, color: '#96CEB4' },
          { name: 'Expressam diferentes opiniões', value: 55, color: '#FFEAA7' },
          { name: 'Se interessam sobre o que ensinei neste ano', value: 60, color: '#A29BFE' },
          { name: 'Sentem-se motivados(as) para aprender os temas ligados à minha disciplina', value: 55, color: '#6C5CE7' },
          { name: 'São capazes de concluir a Educação Básica e prosseguir seus estudos', value: 70, color: '#FD79A8' }
        ]
      },
      {
        id: 'Q135',
        question: 'Nesta escola, neste ano e com relação aos episódios listados abaixo, indique a frequência com que ocorreram:',
        type: 'matriz_selecao',
        section: 'Clima Escolar',
        data: [
          { name: 'Atentado à vida', value: 2, color: '#FF6B6B' },
          { name: 'Lesão corporal', value: 5, color: '#4ECDC4' },
          { name: 'Roubo ou furto', value: 15, color: '#45B7D1' },
          { name: 'Tráfico de drogas', value: 3, color: '#96CEB4' },
          { name: 'Permanência de pessoas sob efeito de álcool', value: 8, color: '#FFEAA7' },
          { name: 'Permanência de pessoas sob efeito de drogas', value: 5, color: '#A29BFE' },
          { name: 'Porte de arma (revólver, faca, canivete)', value: 2, color: '#6C5CE7' },
          { name: 'Assédio sexual', value: 1, color: '#FD79A8' },
          { name: 'Discriminação (racial, gênero, orientação sexual, econômica/social, deficiência etc)', value: 10, color: '#FDCB6E' },
          { name: 'Bullying (ameaças ou ofensas verbais)', value: 25, color: '#E17055' },
          { name: 'Invasão do espaço escolar', value: 3, color: '#00B894' },
          { name: 'Depredação do patrimônio escolar (vandalismo)', value: 8, color: '#74B9FF' },
          { name: 'Tiroteio ou bala perdida', value: 1, color: '#FF7675' }
        ]
      }
    ];
  };

  // Dados específicos por pergunta para anos finais (todas as 24 perguntas)
  const getQuestionDataForAnosFinais = () => {
    return [
      {
        id: 'q1',
        question: 'Qual é o seu sexo?',
        type: 'selecao_unica',
        data: [
          { name: 'Masculino', value: 48, color: '#FF6B6B' },
          { name: 'Feminino', value: 50, color: '#4ECDC4' },
          { name: 'Não quero declarar', value: 2, color: '#45B7D1' }
        ]
      },
      {
        id: 'q2',
        question: 'Qual é a sua idade?',
        type: 'selecao_unica',
        data: [
          { name: '13 anos ou menos', value: 5, color: '#FF6B6B' },
          { name: '14 anos', value: 20, color: '#4ECDC4' },
          { name: '15 anos', value: 30, color: '#45B7D1' },
          { name: '16 anos', value: 25, color: '#96CEB4' },
          { name: '17 anos', value: 15, color: '#FFEAA7' },
          { name: '18 anos ou mais', value: 5, color: '#A29BFE' }
        ]
      },
      {
        id: 'q3',
        question: 'Qual a língua que seus pais falam com mais frequência em casa?',
        type: 'selecao_unica',
        data: [
          { name: 'Português', value: 96, color: '#00B894' },
          { name: 'Espanhol', value: 2, color: '#74B9FF' },
          { name: 'Língua de Sinais (Libras, etc.)', value: 1, color: '#FF7675' },
          { name: 'Outra língua', value: 1, color: '#FDCB6E' }
        ]
      },
      {
        id: 'q4',
        question: 'Qual é a sua cor ou raça?',
        type: 'selecao_unica',
        data: [
          { name: 'Branca', value: 30, color: '#FF6B6B' },
          { name: 'Preta', value: 18, color: '#4ECDC4' },
          { name: 'Parda', value: 48, color: '#45B7D1' },
          { name: 'Amarela', value: 2, color: '#96CEB4' },
          { name: 'Indígena', value: 1, color: '#FFEAA7' },
          { name: 'Não quero declarar', value: 1, color: '#A29BFE' }
        ]
      },
      {
        id: 'q5',
        question: 'Você possui alguma das seguintes condições?',
        type: 'multipla_escolha',
        data: [
          { name: 'Deficiência', value: 6, color: '#FF6B6B' },
          { name: 'Transtorno do espectro autista', value: 2, color: '#4ECDC4' },
          { name: 'Altas habilidades ou superdotação', value: 4, color: '#45B7D1' },
          { name: 'Não possui nenhuma', value: 88, color: '#96CEB4' }
        ]
      },
      {
        id: 'q6',
        question: 'Quantas pessoas moram na sua casa, contando com você?',
        type: 'selecao_unica',
        data: [
          { name: '2 pessoas', value: 10, color: '#FF6B6B' },
          { name: '3 pessoas', value: 25, color: '#4ECDC4' },
          { name: '4 pessoas', value: 35, color: '#45B7D1' },
          { name: '5 pessoas', value: 20, color: '#96CEB4' },
          { name: '6 pessoas ou mais', value: 10, color: '#FFEAA7' }
        ]
      },
      {
        id: 'q7',
        question: 'Normalmente, quem mora na sua casa?',
        type: 'multipla_escolha',
        data: [
          { name: 'Mãe(s) ou madrasta(s)', value: 88, color: '#FF6B6B' },
          { name: 'Pai(s) ou padrasto(s)', value: 75, color: '#4ECDC4' },
          { name: 'Avó(s)', value: 20, color: '#45B7D1' },
          { name: 'Avô(s)', value: 15, color: '#96CEB4' },
          { name: 'Outros familiares', value: 25, color: '#FFEAA7' }
        ]
      },
      {
        id: 'q8',
        question: 'Qual é a maior escolaridade da sua mãe (ou responsável)?',
        type: 'selecao_unica',
        data: [
          { name: 'Não completou o 5º ano', value: 12, color: '#FF6B6B' },
          { name: 'Ensino Fundamental até o 5º ano', value: 20, color: '#4ECDC4' },
          { name: 'Ensino Fundamental completo', value: 25, color: '#45B7D1' },
          { name: 'Ensino Médio completo', value: 30, color: '#96CEB4' },
          { name: 'Ensino Superior completo', value: 13, color: '#FFEAA7' },
          { name: 'Não sei', value: 0, color: '#A29BFE' }
        ]
      },
      {
        id: 'q9',
        question: 'Qual é a maior escolaridade do seu pai (ou responsável)?',
        type: 'selecao_unica',
        data: [
          { name: 'Não completou o 5º ano', value: 15, color: '#FF6B6B' },
          { name: 'Ensino Fundamental até o 5º ano', value: 25, color: '#4ECDC4' },
          { name: 'Ensino Fundamental completo', value: 20, color: '#45B7D1' },
          { name: 'Ensino Médio completo', value: 25, color: '#96CEB4' },
          { name: 'Ensino Superior completo', value: 10, color: '#FFEAA7' },
          { name: 'Não sei', value: 5, color: '#A29BFE' }
        ]
      },
      {
        id: 'q10',
        question: 'Com que frequência seus pais ou responsáveis costumam:',
        type: 'matriz_selecao',
        data: [
          { name: 'Ler em casa', value: 35, color: '#FF6B6B' },
          { name: 'Conversar sobre a escola', value: 55, color: '#4ECDC4' },
          { name: 'Incentivar você a estudar', value: 65, color: '#45B7D1' },
          { name: 'Incentivar tarefa de casa', value: 45, color: '#96CEB4' },
          { name: 'Incentivar sua presença nas aulas', value: 75, color: '#FFEAA7' },
          { name: 'Ir às reuniões de pais', value: 40, color: '#A29BFE' }
        ]
      },
      {
        id: 'q11',
        question: 'Na rua em que você mora, tem:',
        type: 'multipla_escolha',
        data: [
          { name: 'Asfalto ou calçamento', value: 80, color: '#FF6B6B' },
          { name: 'Água tratada', value: 92, color: '#4ECDC4' },
          { name: 'Iluminação pública', value: 88, color: '#45B7D1' }
        ]
      },
      {
        id: 'q12',
        question: 'Dos itens abaixo, quantos existem na sua casa?',
        type: 'matriz_selecao',
        data: [
          { name: 'Geladeira', value: 97, color: '#FF6B6B' },
          { name: 'Computador/Notebook', value: 50, color: '#4ECDC4' },
          { name: 'Quartos para dormir', value: 88, color: '#45B7D1' },
          { name: 'Televisão', value: 95, color: '#96CEB4' },
          { name: 'Banheiro', value: 99, color: '#FFEAA7' },
          { name: 'Carro', value: 40, color: '#A29BFE' },
          { name: 'Celular com internet', value: 80, color: '#6C5CE7' }
        ]
      },
      {
        id: 'q13',
        question: 'Na sua casa tem:',
        type: 'multipla_escolha',
        data: [
          { name: 'Streaming (Netflix, etc.)', value: 55, color: '#FF6B6B' },
          { name: 'Rede wi-fi', value: 70, color: '#4ECDC4' },
          { name: 'Um quarto só seu', value: 40, color: '#45B7D1' },
          { name: 'Mesa para estudar', value: 65, color: '#96CEB4' },
          { name: 'Forno de micro-ondas', value: 75, color: '#FFEAA7' },
          { name: 'Aspirador de pó', value: 30, color: '#A29BFE' },
          { name: 'Máquina de lavar roupa', value: 70, color: '#6C5CE7' },
          { name: 'Freezer', value: 50, color: '#FD79A8' },
          { name: 'Garagem', value: 40, color: '#FDCB6E' }
        ]
      },
      {
        id: 'q14',
        question: 'Quanto tempo você demora para chegar à sua escola?',
        type: 'selecao_unica',
        data: [
          { name: 'Menos de 30 minutos', value: 55, color: '#FF6B6B' },
          { name: 'Entre 30 min e 1 hora', value: 35, color: '#4ECDC4' },
          { name: 'Mais de uma hora', value: 10, color: '#45B7D1' }
        ]
      },
      {
        id: 'q15',
        question: 'Você utiliza para ir à escola:',
        type: 'multipla_escolha',
        data: [
          { name: 'Transporte gratuito escolar', value: 20, color: '#FF6B6B' },
          { name: 'Passe escolar', value: 25, color: '#4ECDC4' },
          { name: 'Não utiliza', value: 55, color: '#45B7D1' }
        ]
      },
      {
        id: 'q16',
        question: 'Considerando a maior distância, como você chega à escola?',
        type: 'selecao_unica',
        data: [
          { name: 'A pé', value: 35, color: '#FF6B6B' },
          { name: 'Bicicleta', value: 8, color: '#4ECDC4' },
          { name: 'Van/Kombi', value: 12, color: '#45B7D1' },
          { name: 'Ônibus', value: 30, color: '#96CEB4' },
          { name: 'Metrô/Trem', value: 5, color: '#FFEAA7' },
          { name: 'Carro', value: 8, color: '#A29BFE' },
          { name: 'Barco', value: 1, color: '#6C5CE7' },
          { name: 'Motocicleta', value: 1, color: '#FD79A8' },
          { name: 'Outro', value: 0, color: '#FDCB6E' }
        ]
      },
      {
        id: 'q17',
        question: 'Com que idade você entrou na escola?',
        type: 'selecao_unica',
        data: [
          { name: '3 anos ou menos', value: 15, color: '#FF6B6B' },
          { name: '4 ou 5 anos', value: 65, color: '#4ECDC4' },
          { name: '6 ou 7 anos', value: 18, color: '#45B7D1' },
          { name: '8 anos ou mais', value: 2, color: '#96CEB4' }
        ]
      },
      {
        id: 'q18',
        question: 'A partir do 1º ano, em que tipo de escola você estudou?',
        type: 'selecao_unica',
        data: [
          { name: 'Somente em escola pública', value: 88, color: '#FF6B6B' },
          { name: 'Somente em escola particular', value: 8, color: '#4ECDC4' },
          { name: 'Em ambas', value: 4, color: '#45B7D1' }
        ]
      },
      {
        id: 'q19',
        question: 'Você já foi reprovado?',
        type: 'selecao_unica',
        data: [
          { name: 'Não', value: 60, color: '#FF6B6B' },
          { name: 'Sim, uma vez', value: 25, color: '#4ECDC4' },
          { name: 'Sim, duas ou mais vezes', value: 15, color: '#45B7D1' }
        ]
      },
      {
        id: 'q20',
        question: 'Você já abandonou a escola por um ano ou mais?',
        type: 'selecao_unica',
        data: [
          { name: 'Nunca', value: 85, color: '#FF6B6B' },
          { name: 'Sim, uma vez', value: 12, color: '#4ECDC4' },
          { name: 'Sim, duas ou mais vezes', value: 3, color: '#45B7D1' }
        ]
      },
      {
        id: 'q21',
        question: 'Fora da escola, em dias de aula, quanto tempo você usa para:',
        type: 'matriz_selecao',
        data: [
          { name: 'Estudar (lição, etc.)', value: 40, color: '#FF6B6B' },
          { name: 'Cursos extracurriculares', value: 20, color: '#4ECDC4' },
          { name: 'Trabalhar em casa', value: 30, color: '#45B7D1' },
          { name: 'Trabalhar fora de casa', value: 8, color: '#96CEB4' },
          { name: 'Lazer (TV, internet, etc.)', value: 70, color: '#FFEAA7' }
        ]
      },
      {
        id: 'q22',
        question: 'Na sua turma, qual a proporção de professores que:',
        type: 'matriz_selecao',
        data: [
          { name: 'Informam o que será ensinado', value: 75, color: '#FF6B6B' },
          { name: 'Perguntam seu conhecimento prévio', value: 50, color: '#4ECDC4' },
          { name: 'Debatem temas do cotidiano', value: 60, color: '#45B7D1' },
          { name: 'Abordam desigualdade racial', value: 25, color: '#96CEB4' },
          { name: 'Abordam desigualdade de gênero', value: 20, color: '#FFEAA7' },
          { name: 'Abordam bullying e violência', value: 45, color: '#A29BFE' },
          { name: 'Fazem trabalhos em grupo', value: 65, color: '#6C5CE7' },
          { name: 'Falam sobre futuro profissional', value: 40, color: '#FD79A8' }
        ]
      },
      {
        id: 'q23',
        question: 'Sobre sua escola, o quanto você concorda:',
        type: 'matriz_selecao',
        data: [
          { name: 'Me interesso pelo que é ensinado', value: 60, color: '#FF6B6B' },
          { name: 'Me sinto motivado a usar o que aprendi', value: 55, color: '#4ECDC4' },
          { name: 'Há espaço para diferentes opiniões', value: 45, color: '#45B7D1' },
          { name: 'Me sinto seguro(a) na escola', value: 65, color: '#96CEB4' },
          { name: 'Me sinto à vontade para discordar dos professores', value: 35, color: '#FFEAA7' },
          { name: 'Consigo argumentar sobre conteúdos', value: 40, color: '#A29BFE' },
          { name: 'As avaliações refletem o que aprendi', value: 50, color: '#6C5CE7' },
          { name: 'Meus professores acreditam na minha capacidade', value: 70, color: '#FD79A8' },
          { name: 'Meus professores me motivam a continuar os estudos', value: 65, color: '#FDCB6E' }
        ]
      },
      {
        id: 'q24',
        question: 'Quando terminar o Ensino Fundamental, você pretende:',
        type: 'selecao_unica',
        data: [
          { name: 'Somente continuar estudando', value: 45, color: '#FF6B6B' },
          { name: 'Somente trabalhar', value: 15, color: '#4ECDC4' },
          { name: 'Continuar estudando e trabalhar', value: 35, color: '#45B7D1' },
          { name: 'Ainda não sei', value: 5, color: '#96CEB4' }
        ]
      }
    ];
  };

  // Dados específicos por pergunta para anos iniciais (todas as 23 perguntas)
  const getQuestionDataForAnosIniciais = () => {
    return [
      {
        id: 'q1',
        question: 'Qual é o seu sexo?',
        type: 'selecao_unica',
        data: [
          { name: 'Masculino', value: 52, color: '#FF6B6B' },
          { name: 'Feminino', value: 45, color: '#4ECDC4' },
          { name: 'Não quero declarar', value: 3, color: '#45B7D1' }
        ]
      },
      {
        id: 'q2',
        question: 'Qual é a sua idade?',
        type: 'selecao_unica',
        data: [
          { name: '9 anos ou menos', value: 15, color: '#FF6B6B' },
          { name: '10 anos', value: 25, color: '#4ECDC4' },
          { name: '11 anos', value: 30, color: '#45B7D1' },
          { name: '12 anos', value: 20, color: '#96CEB4' },
          { name: '13 anos', value: 8, color: '#FFEAA7' },
          { name: '14 anos ou mais', value: 2, color: '#A29BFE' }
        ]
      },
      {
        id: 'q3',
        question: 'Qual a língua que seus pais falam com mais frequência em casa?',
        type: 'selecao_unica',
        data: [
          { name: 'Português', value: 95, color: '#00B894' },
          { name: 'Espanhol', value: 3, color: '#74B9FF' },
          { name: 'Língua de Sinais (Libras, etc.)', value: 1, color: '#FF7675' },
          { name: 'Outra língua', value: 1, color: '#FDCB6E' }
        ]
      },
      {
        id: 'q4',
        question: 'Qual é a sua cor ou raça?',
        type: 'selecao_unica',
        data: [
          { name: 'Branca', value: 35, color: '#FF6B6B' },
          { name: 'Preta', value: 15, color: '#4ECDC4' },
          { name: 'Parda', value: 45, color: '#45B7D1' },
          { name: 'Amarela', value: 2, color: '#96CEB4' },
          { name: 'Indígena', value: 1, color: '#FFEAA7' },
          { name: 'Não quero declarar', value: 2, color: '#A29BFE' }
        ]
      },
      {
        id: 'q5',
        question: 'Você possui alguma das seguintes condições?',
        type: 'multipla_escolha',
        data: [
          { name: 'Deficiência', value: 8, color: '#FF6B6B' },
          { name: 'Transtorno do espectro autista', value: 3, color: '#4ECDC4' },
          { name: 'Altas habilidades ou superdotação', value: 5, color: '#45B7D1' },
          { name: 'Não possui nenhuma', value: 84, color: '#96CEB4' }
        ]
      },
      {
        id: 'q6',
        question: 'Quantas pessoas moram na sua casa, contando com você?',
        type: 'selecao_unica',
        data: [
          { name: '2 pessoas', value: 8, color: '#FF6B6B' },
          { name: '3 pessoas', value: 20, color: '#4ECDC4' },
          { name: '4 pessoas', value: 35, color: '#45B7D1' },
          { name: '5 pessoas', value: 25, color: '#96CEB4' },
          { name: '6 pessoas ou mais', value: 12, color: '#FFEAA7' }
        ]
      },
      {
        id: 'q7',
        question: 'Normalmente, quem mora na sua casa?',
        type: 'multipla_escolha',
        data: [
          { name: 'Mãe(s) ou madrasta(s)', value: 85, color: '#FF6B6B' },
          { name: 'Pai(s) ou padrasto(s)', value: 70, color: '#4ECDC4' },
          { name: 'Avó(s)', value: 25, color: '#45B7D1' },
          { name: 'Avô(s)', value: 20, color: '#96CEB4' },
          { name: 'Outros familiares', value: 30, color: '#FFEAA7' }
        ]
      },
      {
        id: 'q8',
        question: 'Qual é a maior escolaridade da sua mãe (ou responsável)?',
        type: 'selecao_unica',
        data: [
          { name: 'Não completou o 5º ano', value: 15, color: '#FF6B6B' },
          { name: 'Ensino Fundamental até o 5º ano', value: 25, color: '#4ECDC4' },
          { name: 'Ensino Fundamental completo', value: 30, color: '#45B7D1' },
          { name: 'Ensino Médio completo', value: 25, color: '#96CEB4' },
          { name: 'Ensino Superior completo', value: 5, color: '#FFEAA7' },
          { name: 'Não sei', value: 0, color: '#A29BFE' }
        ]
      },
      {
        id: 'q9',
        question: 'Qual é a maior escolaridade do seu pai (ou responsável)?',
        type: 'selecao_unica',
        data: [
          { name: 'Não completou o 5º ano', value: 20, color: '#FF6B6B' },
          { name: 'Ensino Fundamental até o 5º ano', value: 30, color: '#4ECDC4' },
          { name: 'Ensino Fundamental completo', value: 25, color: '#45B7D1' },
          { name: 'Ensino Médio completo', value: 20, color: '#96CEB4' },
          { name: 'Ensino Superior completo', value: 3, color: '#FFEAA7' },
          { name: 'Não sei', value: 2, color: '#A29BFE' }
        ]
      },
      {
        id: 'q10',
        question: 'Com que frequência seus pais ou responsáveis costumam:',
        type: 'matriz_selecao',
        data: [
          { name: 'Ler em casa', value: 40, color: '#FF6B6B' },
          { name: 'Conversar sobre a escola', value: 60, color: '#4ECDC4' },
          { name: 'Incentivar você a estudar', value: 70, color: '#45B7D1' },
          { name: 'Incentivar tarefa de casa', value: 55, color: '#96CEB4' },
          { name: 'Incentivar sua presença nas aulas', value: 80, color: '#FFEAA7' },
          { name: 'Ir às reuniões de pais', value: 45, color: '#A29BFE' }
        ]
      },
      {
        id: 'q11',
        question: 'Na rua em que você mora, tem:',
        type: 'multipla_escolha',
        data: [
          { name: 'Asfalto ou calçamento', value: 75, color: '#FF6B6B' },
          { name: 'Água tratada', value: 90, color: '#4ECDC4' },
          { name: 'Iluminação pública', value: 85, color: '#45B7D1' }
        ]
      },
      {
        id: 'q12',
        question: 'Dos itens abaixo, quantos existem na sua casa?',
        type: 'matriz_selecao',
        data: [
          { name: 'Geladeira', value: 95, color: '#FF6B6B' },
          { name: 'Computador/Notebook', value: 40, color: '#4ECDC4' },
          { name: 'Quartos para dormir', value: 85, color: '#45B7D1' },
          { name: 'Televisão', value: 90, color: '#96CEB4' },
          { name: 'Banheiro', value: 98, color: '#FFEAA7' },
          { name: 'Carro', value: 35, color: '#A29BFE' },
          { name: 'Celular com internet', value: 70, color: '#6C5CE7' }
        ]
      },
      {
        id: 'q13',
        question: 'Na sua casa tem:',
        type: 'multipla_escolha',
        data: [
          { name: 'Streaming (Netflix, etc.)', value: 45, color: '#FF6B6B' },
          { name: 'Rede wi-fi', value: 60, color: '#4ECDC4' },
          { name: 'Um quarto só seu', value: 30, color: '#45B7D1' },
          { name: 'Mesa para estudar', value: 55, color: '#96CEB4' },
          { name: 'Forno de micro-ondas', value: 70, color: '#FFEAA7' },
          { name: 'Aspirador de pó', value: 25, color: '#A29BFE' },
          { name: 'Máquina de lavar roupa', value: 65, color: '#6C5CE7' },
          { name: 'Freezer', value: 40, color: '#FD79A8' },
          { name: 'Garagem', value: 35, color: '#FDCB6E' }
        ]
      },
      {
        id: 'q14',
        question: 'Quanto tempo você demora para chegar à sua escola?',
        type: 'selecao_unica',
        data: [
          { name: 'Menos de 30 minutos', value: 60, color: '#FF6B6B' },
          { name: 'Entre 30 min e 1 hora', value: 30, color: '#4ECDC4' },
          { name: 'Mais de uma hora', value: 10, color: '#45B7D1' }
        ]
      },
      {
        id: 'q15',
        question: 'Você utiliza para ir à escola:',
        type: 'multipla_escolha',
        data: [
          { name: 'Transporte gratuito escolar', value: 25, color: '#FF6B6B' },
          { name: 'Passe escolar', value: 15, color: '#4ECDC4' },
          { name: 'Não utiliza', value: 60, color: '#45B7D1' }
        ]
      },
      {
        id: 'q16',
        question: 'Considerando a maior distância, como você chega à escola?',
        type: 'selecao_unica',
        data: [
          { name: 'A pé', value: 40, color: '#FF6B6B' },
          { name: 'Bicicleta', value: 5, color: '#4ECDC4' },
          { name: 'Van/Kombi', value: 15, color: '#45B7D1' },
          { name: 'Ônibus', value: 25, color: '#96CEB4' },
          { name: 'Metrô/Trem', value: 3, color: '#FFEAA7' },
          { name: 'Carro', value: 10, color: '#A29BFE' },
          { name: 'Barco', value: 1, color: '#6C5CE7' },
          { name: 'Motocicleta', value: 1, color: '#FD79A8' },
          { name: 'Outro', value: 0, color: '#FDCB6E' }
        ]
      },
      {
        id: 'q17',
        question: 'Com que idade você entrou na escola?',
        type: 'selecao_unica',
        data: [
          { name: '3 anos ou menos', value: 20, color: '#FF6B6B' },
          { name: '4 ou 5 anos', value: 60, color: '#4ECDC4' },
          { name: '6 ou 7 anos', value: 18, color: '#45B7D1' },
          { name: '8 anos ou mais', value: 2, color: '#96CEB4' }
        ]
      },
      {
        id: 'q18',
        question: 'A partir do 1º ano, em que tipo de escola você estudou?',
        type: 'selecao_unica',
        data: [
          { name: 'Somente em escola pública', value: 85, color: '#FF6B6B' },
          { name: 'Somente em escola particular', value: 10, color: '#4ECDC4' },
          { name: 'Em ambas', value: 5, color: '#45B7D1' }
        ]
      },
      {
        id: 'q19',
        question: 'Você já foi reprovado?',
        type: 'selecao_unica',
        data: [
          { name: 'Não', value: 70, color: '#FF6B6B' },
          { name: 'Sim, uma vez', value: 20, color: '#4ECDC4' },
          { name: 'Sim, duas ou mais vezes', value: 10, color: '#45B7D1' }
        ]
      },
      {
        id: 'q20',
        question: 'Você já abandonou a escola por um ano ou mais?',
        type: 'selecao_unica',
        data: [
          { name: 'Nunca', value: 90, color: '#FF6B6B' },
          { name: 'Sim, uma vez', value: 8, color: '#4ECDC4' },
          { name: 'Sim, duas ou mais vezes', value: 2, color: '#45B7D1' }
        ]
      },
      {
        id: 'q21',
        question: 'Fora da escola, em dias de aula, quanto tempo você usa para:',
        type: 'matriz_selecao',
        data: [
          { name: 'Estudar (lição, etc.)', value: 45, color: '#FF6B6B' },
          { name: 'Cursos extracurriculares', value: 15, color: '#4ECDC4' },
          { name: 'Trabalhar em casa', value: 25, color: '#45B7D1' },
          { name: 'Trabalhar fora de casa', value: 5, color: '#96CEB4' },
          { name: 'Lazer (TV, internet, etc.)', value: 60, color: '#FFEAA7' }
        ]
      },
      {
        id: 'q22',
        question: 'Na sua turma, qual a proporção de professores que:',
        type: 'matriz_selecao',
        data: [
          { name: 'Informam o que será ensinado', value: 70, color: '#FF6B6B' },
          { name: 'Perguntam seu conhecimento prévio', value: 45, color: '#4ECDC4' },
          { name: 'Debatem temas do cotidiano', value: 55, color: '#45B7D1' },
          { name: 'Abordam desigualdade racial', value: 20, color: '#96CEB4' },
          { name: 'Abordam desigualdade de gênero', value: 15, color: '#FFEAA7' },
          { name: 'Abordam bullying e violência', value: 40, color: '#A29BFE' },
          { name: 'Fazem trabalhos em grupo', value: 60, color: '#6C5CE7' },
          { name: 'Falam sobre futuro profissional', value: 35, color: '#FD79A8' }
        ]
      },
      {
        id: 'q23',
        question: 'Sobre sua escola, o quanto você concorda:',
        type: 'matriz_selecao',
        data: [
          { name: 'Me interesso pelo que é ensinado', value: 65, color: '#FF6B6B' },
          { name: 'Me sinto motivado a usar o que aprendi', value: 60, color: '#4ECDC4' },
          { name: 'Há espaço para diferentes opiniões', value: 50, color: '#45B7D1' },
          { name: 'Me sinto seguro(a) na escola', value: 70, color: '#96CEB4' },
          { name: 'Me sinto à vontade para discordar dos professores', value: 40, color: '#FFEAA7' },
          { name: 'Consigo argumentar sobre conteúdos', value: 45, color: '#A29BFE' },
          { name: 'As avaliações refletem o que aprendi', value: 55, color: '#6C5CE7' },
          { name: 'Meus professores acreditam na minha capacidade', value: 75, color: '#FD79A8' },
          { name: 'Meus professores me motivam a continuar os estudos', value: 70, color: '#FDCB6E' }
        ]
      }
    ];
  };

  const getFormTypeInfo = (formType: string) => {
    switch (formType) {
      case 'aluno-jovem':
        return { name: 'Aluno (Anos Iniciais)', icon: Users, color: 'bg-blue-500' };
      case 'aluno-velho':
        return { name: 'Aluno (Anos Finais)', icon: GraduationCap, color: 'bg-green-500' };
      case 'professor':
        return { name: 'Professor', icon: UserCheck, color: 'bg-purple-500' };
      case 'diretor':
        return { name: 'Diretor', icon: Building2, color: 'bg-orange-500' };
      case 'secretario':
        return { name: 'Secretário Municipal de Educação', icon: Building2, color: 'bg-indigo-500' };
      default:
        return { name: 'Questionário', icon: FileText, color: 'bg-gray-500' };
    }
  };

  const handleSelectReport = (report: FormReport) => {
    setSelectedReport(report);
  };

  const handleExportReport = () => {
    console.log('Exportando relatório:', selectedReport?.id);
    // Implementar lógica de exportação
  };

  const renderChart = () => {
    if (!selectedReport) return null;

    // Para anos iniciais, sempre mostrar visualização por pergunta
    if (selectedReport.formType === 'aluno-jovem') {
      const questions = getQuestionDataForAnosIniciais();

      return (
        <div className="w-full space-y-8">
          {/* Controles de Visualização */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">
              Análise por Pergunta - Anos Iniciais
            </h3>
            <div className="flex gap-2">
              <Button
                variant={chartType === 'bar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('bar')}
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                Barras
              </Button>
              <Button
                variant={chartType === 'pie' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('pie')}
              >
                <PieChart className="h-4 w-4 mr-1" />
                Pizza
              </Button>
              <Button
                variant={chartType === 'line' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('line')}
              >
                <TrendingUp className="h-4 w-4 mr-1" />
                Linha
              </Button>
            </div>
          </div>

          {/* Todas as Perguntas em Ordem */}
          {questions.map((question, index) => (
            <div key={question.id} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </div>
                <h4 className="text-lg font-medium text-gray-900">
                  {question.question}
                </h4>
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'bar' ? (
                    <RechartsBarChart data={question.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        fontSize={12}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number) => [`${value}%`, 'Percentual']}
                        labelFormatter={(label: string) => `Resposta: ${label}`}
                      />
                      <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                  ) : chartType === 'pie' ? (
                    <RechartsPieChart>
                      <Pie
                        data={question.data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {question.data.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`${value}%`, 'Percentual']} />
                    </RechartsPieChart>
                  ) : (
                    <RechartsLineChart data={question.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        fontSize={12}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number) => [`${value}%`, 'Percentual']}
                        labelFormatter={(label: string) => `Resposta: ${label}`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#3B82F6" 
                        strokeWidth={3}
                        dot={{ fill: '#3B82F6', strokeWidth: 2, r: 6 }}
                      />
                    </RechartsLineChart>
                  )}
                </ResponsiveContainer>
              </div>

              <div className="text-center text-sm text-gray-500">
                {question.data.length} opções de resposta • {question.data.reduce((sum, item) => sum + item.value, 0)}% do total
              </div>

              {/* Separador entre perguntas */}
              {index < questions.length - 1 && (
                <div className="border-t border-gray-200 pt-6"></div>
              )}
            </div>
          ))}
        </div>
      );
    }

    // Para anos finais, sempre mostrar visualização por pergunta
    if (selectedReport.formType === 'aluno-velho') {
      const questions = getQuestionDataForAnosFinais();

      return (
        <div className="w-full space-y-8">
          {/* Controles de Visualização */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">
              Análise por Pergunta - Anos Finais
            </h3>
            <div className="flex gap-2">
              <Button
                variant={chartType === 'bar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('bar')}
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                Barras
              </Button>
              <Button
                variant={chartType === 'pie' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('pie')}
              >
                <PieChart className="h-4 w-4 mr-1" />
                Pizza
              </Button>
              <Button
                variant={chartType === 'line' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('line')}
              >
                <TrendingUp className="h-4 w-4 mr-1" />
                Linha
              </Button>
            </div>
          </div>

          {/* Todas as Perguntas em Ordem */}
          {questions.map((question, index) => (
            <div key={question.id} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </div>
                <h4 className="text-lg font-medium text-gray-900">
                  {question.question}
                </h4>
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'bar' ? (
                    <RechartsBarChart data={question.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        fontSize={12}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number) => [`${value}%`, 'Percentual']}
                        labelFormatter={(label: string) => `Resposta: ${label}`}
                      />
                      <Bar dataKey="value" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                  ) : chartType === 'pie' ? (
                    <RechartsPieChart>
                      <Pie
                        data={question.data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {question.data.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`${value}%`, 'Percentual']} />
                    </RechartsPieChart>
                  ) : (
                    <RechartsLineChart data={question.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        fontSize={12}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number) => [`${value}%`, 'Percentual']}
                        labelFormatter={(label: string) => `Resposta: ${label}`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#10B981" 
                        strokeWidth={3}
                        dot={{ fill: '#10B981', strokeWidth: 2, r: 6 }}
                      />
                    </RechartsLineChart>
                  )}
                </ResponsiveContainer>
              </div>

              <div className="text-center text-sm text-gray-500">
                {question.data.length} opções de resposta • {question.data.reduce((sum, item) => sum + item.value, 0)}% do total
              </div>

              {/* Separador entre perguntas */}
              {index < questions.length - 1 && (
                <div className="border-t border-gray-200 pt-6"></div>
              )}
            </div>
          ))}
        </div>
      );
    }

    // Para professor, sempre mostrar visualização por pergunta
    if (selectedReport.formType === 'professor') {
      const questions = getQuestionDataForProfessor();

      return (
        <div className="w-full space-y-8">
          {/* Controles de Visualização */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">
              Análise por Pergunta - Professor
            </h3>
            <div className="flex gap-2">
              <Button
                variant={chartType === 'bar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('bar')}
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                Barras
              </Button>
              <Button
                variant={chartType === 'pie' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('pie')}
              >
                <PieChart className="h-4 w-4 mr-1" />
                Pizza
              </Button>
              <Button
                variant={chartType === 'line' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('line')}
              >
                <TrendingUp className="h-4 w-4 mr-1" />
                Linha
              </Button>
            </div>
          </div>

          {/* Todas as Perguntas em Ordem */}
          {questions.map((question, index) => (
            <div key={question.id} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 text-purple-800 rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-medium text-gray-900">
                    {question.question}
                  </h4>
                  {question.section && (
                    <p className="text-sm text-purple-600 font-medium">
                      {question.section}
                    </p>
                  )}
                </div>
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'bar' ? (
                    <RechartsBarChart data={question.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        fontSize={12}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number) => [`${value}%`, 'Percentual']}
                        labelFormatter={(label: string) => `Resposta: ${label}`}
                      />
                      <Bar dataKey="value" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                  ) : chartType === 'pie' ? (
                    <RechartsPieChart>
                      <Pie
                        data={question.data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {question.data.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`${value}%`, 'Percentual']} />
                    </RechartsPieChart>
                  ) : (
                    <RechartsLineChart data={question.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        fontSize={12}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number) => [`${value}%`, 'Percentual']}
                        labelFormatter={(label: string) => `Resposta: ${label}`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#8B5CF6" 
                        strokeWidth={3}
                        dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 6 }}
                      />
                    </RechartsLineChart>
                  )}
                </ResponsiveContainer>
              </div>

              <div className="text-center text-sm text-gray-500">
                {question.data.length} opções de resposta • {question.data.reduce((sum, item) => sum + item.value, 0)}% do total
              </div>

              {/* Separador entre perguntas */}
              {index < questions.length - 1 && (
                <div className="border-t border-gray-200 pt-6"></div>
              )}
            </div>
          ))}
        </div>
      );
    }

    // Para diretor, sempre mostrar visualização por pergunta
    if (selectedReport.formType === 'diretor') {
      const questions = getQuestionDataForDiretor();

      return (
        <div className="w-full space-y-8">
          {/* Controles de Visualização */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">
              Análise por Pergunta - Diretor
            </h3>
            <div className="flex gap-2">
              <Button
                variant={chartType === 'bar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('bar')}
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                Barras
              </Button>
              <Button
                variant={chartType === 'pie' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('pie')}
              >
                <PieChart className="h-4 w-4 mr-1" />
                Pizza
              </Button>
              <Button
                variant={chartType === 'line' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('line')}
              >
                <TrendingUp className="h-4 w-4 mr-1" />
                Linha
              </Button>
            </div>
          </div>

          {/* Todas as Perguntas em Ordem */}
          {questions.map((question, index) => (
            <div key={question.id} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-100 text-orange-800 rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-medium text-gray-900">
                    {question.question}
                  </h4>
                  {question.section && (
                    <p className="text-sm text-orange-600 font-medium">
                      {question.section}
                    </p>
                  )}
                </div>
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'bar' ? (
                    <RechartsBarChart data={question.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        fontSize={12}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number) => [`${value}%`, 'Percentual']}
                        labelFormatter={(label: string) => `Resposta: ${label}`}
                      />
                      <Bar dataKey="value" fill="#F97316" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                  ) : chartType === 'pie' ? (
                    <RechartsPieChart>
                      <Pie
                        data={question.data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {question.data.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`${value}%`, 'Percentual']} />
                    </RechartsPieChart>
                  ) : (
                    <RechartsLineChart data={question.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        fontSize={12}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number) => [`${value}%`, 'Percentual']}
                        labelFormatter={(label: string) => `Resposta: ${label}`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#F97316" 
                        strokeWidth={3}
                        dot={{ fill: '#F97316', strokeWidth: 2, r: 6 }}
                      />
                    </RechartsLineChart>
                  )}
                </ResponsiveContainer>
              </div>

              <div className="text-center text-sm text-gray-500">
                {question.data.length} opções de resposta • {question.data.reduce((sum, item) => sum + item.value, 0)}% do total
              </div>

              {/* Separador entre perguntas */}
              {index < questions.length - 1 && (
                <div className="border-t border-gray-200 pt-6"></div>
              )}
            </div>
          ))}
        </div>
      );
    }

    // Para outros tipos de questionário, mostrar visualização geral
    const data = getChartDataForForm(selectedReport.formType);
    const totalResponses = data.reduce((sum, item) => sum + item.value, 0);

    return (
      <div className="w-full">
        <div className="mb-4 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">
            {chartType === 'bar' ? 'Gráfico de Barras' : chartType === 'pie' ? 'Gráfico de Pizza' : 'Gráfico de Linha'}
          </h3>
          <div className="flex gap-2">
            <Button
              variant={chartType === 'bar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('bar')}
            >
              <BarChart3 className="h-4 w-4 mr-1" />
              Barras
            </Button>
            <Button
              variant={chartType === 'pie' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('pie')}
            >
              <PieChart className="h-4 w-4 mr-1" />
              Pizza
            </Button>
            <Button
              variant={chartType === 'line' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('line')}
            >
              <TrendingUp className="h-4 w-4 mr-1" />
              Linha
            </Button>
          </div>
        </div>

        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
              <RechartsBarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [`${value}%`, 'Percentual']}
                  labelFormatter={(label: string) => `Categoria: ${label}`}
                />
                <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </RechartsBarChart>
            ) : chartType === 'pie' ? (
              <RechartsPieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value}%`, 'Percentual']} />
              </RechartsPieChart>
            ) : (
              <RechartsLineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [`${value}%`, 'Percentual']}
                  labelFormatter={(label: string) => `Categoria: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 6 }}
                />
              </RechartsLineChart>
            )}
          </ResponsiveContainer>
        </div>

        <div className="mt-4 text-center text-sm text-gray-500">
          {data.length} categorias • {totalResponses}% do total de respostas
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Relatórios Socioeconômicos</h1>
          <p className="text-gray-600 mt-2">
            Visualize e analise os dados dos questionários socioeconômicos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtrar
          </Button>
          <Button className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Relatórios */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Questionários Disponíveis
              </CardTitle>
              <CardDescription>
                Selecione um questionário para visualizar os relatórios
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockReports.map((report) => {
                const formInfo = getFormTypeInfo(report.formType);
                const IconComponent = formInfo.icon;
                const isSelected = selectedReport?.id === report.id;

                return (
                  <Card
                    key={report.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                      isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleSelectReport(report)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${formInfo.color}`}>
                          <IconComponent className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">
                            {report.formTitle}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {formInfo.name}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {report.totalResponses} respostas
                            </span>
                            <span className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {report.completionRate}%
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge 
                              variant={report.status === 'active' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {report.status === 'active' ? 'Ativo' : 'Concluído'}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {report.createdAt.toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Área de Visualização */}
        <div className="lg:col-span-2">
          {selectedReport ? (
            <div className="space-y-6">
              {/* Informações do Relatório */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5" />
                        {selectedReport.formTitle}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {getFormTypeInfo(selectedReport.formType).name} • 
                        Criado em {selectedReport.createdAt.toLocaleDateString('pt-BR')}
                      </CardDescription>
                    </div>
                    <Button onClick={handleExportReport} className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Exportar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {selectedReport.totalResponses}
                      </div>
                      <div className="text-sm text-blue-800">Total de Respostas</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {selectedReport.completionRate}%
                      </div>
                      <div className="text-sm text-green-800">Taxa de Conclusão</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {selectedReport.schools.length}
                      </div>
                      <div className="text-sm text-purple-800">Escolas Participantes</div>
                    </div>
                  </div>

                  {/* Lista de Escolas */}
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-3">Escolas Participantes</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedReport.schools.map((school, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {school}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Gráfico */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Análise dos Dados
                      </CardTitle>
                      <CardDescription>
                        Visualização dos dados coletados no questionário
                      </CardDescription>
                    </div>
                    {(selectedReport.formType === 'aluno-jovem' || selectedReport.formType === 'aluno-velho' || selectedReport.formType === 'professor' || selectedReport.formType === 'diretor') && (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-600">Análise por Pergunta</span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {renderChart()}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">
                  Selecione um Relatório
                </h3>
                <p className="text-sm text-gray-500 text-center">
                  Escolha um questionário da lista ao lado para visualizar os relatórios e gráficos
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormReports;
