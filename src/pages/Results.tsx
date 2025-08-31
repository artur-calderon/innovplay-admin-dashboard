import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Download,
  TrendingUp,
  Users,
  FileText,
  FileX,
  Eye,
  AlertTriangle,
  Target,
  Award,
  RefreshCw,
  School,
  MapPin,
  GraduationCap,
  Filter,
  BarChart3,
  PieChart
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { EvaluationResultsApiService } from "@/services/evaluationResultsApi";
import { useAuth } from "@/context/authContext";
import { BarChartComponent, DonutChartComponent } from "@/components/ui/charts";

import type { StudentResult, DetailedReport as DetailedReportType, QuestionWithSkills } from "@/types/results-table";

// Interfaces para os dados da API
interface EvaluationResult {
  id: string;
  titulo: string;
  disciplina: string;
  curso?: string;
  serie?: string;
  turma?: string;
  escola?: string;
  municipio?: string;
  estado?: string;
  data_aplicacao: string;
  // Campos agregados
  total_alunos: number;
  alunos_participantes: number;
  alunos_pendentes?: number;
  alunos_ausentes: number;
  media_nota: number;
  media_proficiencia: number;
  distribuicao_classificacao: {
    abaixo_do_basico: number;
    basico: number;
    adequado: number;
    avancado: number;
  };
  // Opcional: status pode não vir no novo contrato
  status?: 'concluida' | 'em_andamento' | 'pendente' | string;
}

// ✅ NOVO: Interface para a nova estrutura de resposta da API
interface NovaRespostaAPI {
  nivel_granularidade: 'municipio' | 'escola' | 'serie' | 'turma';
  filtros_aplicados: {
    estado: string;
    municipio: string;
    escola: string | null;
    serie: string | null;
    turma: string | null;
    avaliacao: string;
  };
  estatisticas_gerais: {
    tipo: 'municipio' | 'escola' | 'serie' | 'turma';
    nome: string;
    estado: string;
    municipio?: string;
    escola?: string;
    serie?: string;
    total_escolas?: number;
    total_series?: number;
    total_turmas?: number;
    total_avaliacoes: number;
    total_alunos: number;
    alunos_participantes: number;
    alunos_pendentes: number;
    alunos_ausentes: number;
    media_nota_geral: number;
    media_proficiencia_geral: number;
    distribuicao_classificacao_geral: {
      abaixo_do_basico: number;
      basico: number;
      adequado: number;
      avancado: number;
    };
  };
  resultados_por_disciplina: Array<{
    disciplina: string;
    total_alunos: number;
    alunos_participantes: number;
    media_nota: number;
    media_proficiencia: number;
    distribuicao_classificacao: {
      abaixo_do_basico: number;
      basico: number;
      adequado: number;
      avancado: number;
    };
  }>;
  resultados_detalhados: {
    avaliacoes: EvaluationResult[];
    paginacao: {
      page: number;
      per_page: number;
      total: number;
      total_pages: number;
    };
  };
  opcoes_proximos_filtros: {
    escolas?: Array<{ id: string; name: string }>;
    series?: Array<{ id: string; name: string }>;
    turmas?: Array<{ id: string; name: string }>;
  };
  // ✅ NOVO: Campo tabela_detalhada
  tabela_detalhada?: {
    disciplinas: Array<{
      id: string;
      nome: string;
      questoes: Array<{
        numero: number;
        habilidade: string;
        codigo_habilidade: string;
      }>;
      alunos: Array<{
        id: string;
        nome: string;
        escola: string;
        serie: string;
        turma: string;
        respostas_por_questao: Array<{
          questao: number;
          acertou: boolean;
        }>;
        total_acertos: number;
        total_erros: number;
        total_questoes_disciplina: number;
        nivel_proficiencia: string;
        nota: number;
        proficiencia: number;
      }>;
    }>;
  };
}



// Interfaces para os filtros
interface State {
  id: string;
  name: string;
  uf: string;
}

interface Municipality { id: string; name: string; state: string; }

interface School { id: string; name: string; }

interface Grade { id: string; name: string; }

interface Class { id: string; name: string; }

// Tipagem auxiliar para lidar com respostas legadas que usam "data" e "total"
type ResultadosDetalhadosFromAPI = {
  avaliacoes?: EvaluationResult[];
  paginacao?: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
  data?: EvaluationResult[];
  total?: number;
};

// ✅ Info resumida e precisa da avaliação (para exibir no topo dos gráficos)
interface EvaluationInfoSummary {
  id: string;
  titulo: string;
  disciplina?: string;
  disciplinas?: string[];
  curso?: string;
  serie?: string;
  grade_id?: string;
  escola?: string;
  municipio?: string;
  data_aplicacao?: string;
  status: 'concluida' | 'em_andamento' | 'pendente' | string;
  total_alunos: number;
  alunos_participantes: number;
  alunos_ausentes: number;
  media_nota: number;
  media_proficiencia: number;
}

// ✅ NOVO: Interface para questões da avaliação (igual ao DetailedResultsView)
interface Question {
  id: string;
  numero: number;
  texto: string;
  habilidade: string;
  codigo_habilidade: string;
  tipo: 'multipleChoice' | 'open' | 'trueFalse';
  dificuldade: 'Fácil' | 'Médio' | 'Difícil';
  porcentagem_acertos: number;
  porcentagem_erros: number;
  disciplina?: string; // ✅ Adicionado para identificar a disciplina da questão
}

// ✅ NOVO: Interface para skills/habilidades (igual ao DetailedResultsView)
interface Skill {
  id: string | null;
  code: string;
  description: string;
  source: 'database' | 'question';
}

// ✅ NOVO: Interface para relatório detalhado (igual ao DetailedResultsView)
type DetailedReport = DetailedReportType & {
  id?: string;
  disciplina?: string;
  questoes?: Question[];
  skills?: Record<string, any[]>;
  [key: string]: any;
};


// Mapa de status estático (fora do componente)
const getStatusConfig = (status: 'concluida' | 'em_andamento' | 'pendente' | string) => {
  const configs: Record<string, { label: string; color: string }> = {
    concluida: {
      label: "Concluída",
      color: "bg-green-100 text-green-800 border-green-300"
    },
    em_andamento: {
      label: "Em Andamento",
      color: "bg-blue-100 text-blue-800 border-blue-300"
    },
    pendente: {
      label: "Pendente",
      color: "bg-gray-100 text-gray-800 border-gray-300"
    },
    agendada: {
      label: "Agendada",
      color: "bg-yellow-50 text-yellow-600 border-yellow-200"
    },
    'concluído': {
      label: "Concluída",
      color: "bg-green-100 text-green-800 border-green-300"
    },
    'em andamento': {
      label: "Em Andamento",
      color: "bg-blue-100 text-blue-800 border-blue-300"
    },
    'finalizada': {
      label: "Concluída",
      color: "bg-green-100 text-green-800 border-green-300"
    },
    'finalizado': {
      label: "Concluída",
      color: "bg-green-100 text-green-800 border-green-300"
    },
    'agendado': {
      label: "Agendada",
      color: "bg-yellow-50 text-yellow-600 border-yellow-200"
    }
  };

  const config = configs[status] || {
    label: "Desconhecido",
    color: "bg-gray-100 text-gray-800 border-gray-300"
  };

  return config;
};

export default function Results() {
  const { autoLogin } = useAuth();
  const [apiData, setApiData] = useState<NovaRespostaAPI | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Estados dos filtros
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('all');
  const [selectedEvaluation, setSelectedEvaluation] = useState<string>('all');
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');

  // Estados dos dados dos filtros
  const [states, setStates] = useState<State[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [evaluationsByMunicipality, setEvaluationsByMunicipality] = useState<Array<{ id: string; titulo: string; disciplina: string; status: string; data_aplicacao: string }>>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [evaluationInfo, setEvaluationInfo] = useState<EvaluationInfoSummary | null>(null);

  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Estados para a aba Proficiência
  const [visibleFields, setVisibleFields] = useState({
    turma: true,
    habilidade: true,
    questoes: true,
    percentualTurma: true,
    total: true,
    nota: true,
    proficiencia: true,
    nivel: true
  });
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('nome');
  const [sortDirection, setSortDirection] = useState<string>('asc');
  const [showOnlyCompleted, setShowOnlyCompleted] = useState(true);

  // ✅ Extrai nome de disciplina de respostas variadas (string ou objeto)
  const extractSubjectName = useCallback((subject: unknown): string => {
    if (typeof subject === 'string') return subject;
    if (subject && typeof subject === 'object') {
      const possible = subject as { name?: string; nome?: string };
      return possible.name || possible.nome || '';
    }
    return '';
  }, []);

  // ✅ NOVO: Estados para dados da avaliação (igual ao DetailedResultsView)
  const [questions, setQuestions] = useState<Question[]>([]);
  const [skillsMapping, setSkillsMapping] = useState<Record<string, string>>({});
  const [skillsBySubject, setSkillsBySubject] = useState<Record<string, Skill[]>>({});
  const [detailedReport, setDetailedReport] = useState<DetailedReport | null>(null);

  // ✅ NOVO: Estados para dados dos alunos (igual ao DetailedResultsView)
  const [students, setStudents] = useState<StudentResult[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [studentDetailedAnswers, setStudentDetailedAnswers] = useState<Record<string, any>>({});

  // ✅ NOVO: Estados para respostas detalhadas dos alunos (igual ao DetailedResultsView)
  const [studentResponses, setStudentResponses] = useState<Record<string, Array<{
    questao_id: string;
    questao_numero: number;
    resposta_correta: boolean;
    resposta_em_branco: boolean;
    tempo_gasto: number;
  }>>>({});

  // ✅ NOVO: Estado para dados da tabela detalhada
  const [tabelaDetalhada, setTabelaDetalhada] = useState<any>(null);

  // Carregar filtros iniciais
  const loadInitialFilters = useCallback(async () => {
    try {
      setIsLoadingFilters(true);
      // ✅ NOVO: Usar a nova rota de estados
      const statesData = await EvaluationResultsApiService.getFilterStates();
      setStates(statesData.map(state => ({
        id: state.id,
        name: state.nome,
        uf: state.id
      })));
    } catch (error) {
      console.error("Erro ao carregar filtros iniciais:", error);
      toast({
        title: "Erro ao carregar filtros",
        description: "Não foi possível carregar os filtros. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingFilters(false);
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const initializeData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        try {
          await autoLogin();
        } catch (error) {
          console.error("Erro no login automático:", error);
          toast({
            title: "Erro de Autenticação",
            description: "Não foi possível fazer login automático. Verifique suas credenciais.",
            variant: "destructive",
          });
          return;
        }
      }
      await loadInitialFilters();
    };

    initializeData();
  }, [autoLogin, loadInitialFilters, toast]);

  // Helpers de reset em cascata
  const resetAfterGrade = useCallback(() => {
    setSelectedClass('all');
    setClasses([]);
  }, []);

  const resetAfterSchool = useCallback(() => {
    setSelectedGrade('all');
    setGrades([]);
    resetAfterGrade();
  }, [resetAfterGrade]);

  const resetAfterEvaluation = useCallback(() => {
    setSelectedSchool('all');
    setSchools([]);
    resetAfterSchool();
  }, [resetAfterSchool]);

  const resetAfterState = useCallback(() => {
    setSelectedMunicipality('all');
    setSelectedEvaluation('all');
    resetAfterEvaluation();
  }, [resetAfterEvaluation]);

  // ✅ NOVO: Carregar municípios quando estado for selecionado
  useEffect(() => {
    const loadMunicipalities = async () => {
      if (selectedState !== 'all') {
        try {
          setIsLoadingFilters(true);
          const municipalitiesData = await EvaluationResultsApiService.getFilterMunicipalities(selectedState);
          setMunicipalities(municipalitiesData.map(municipality => ({
            id: municipality.id,
            name: municipality.nome,
            state: selectedState
          })));
          // ✅ Reset em cascata
          setEvaluationsByMunicipality([]);
          resetAfterState();
        } catch (error) {
          console.error("Erro ao carregar municípios:", error);
        } finally {
          setIsLoadingFilters(false);
        }
      } else {
        setMunicipalities([]);
        setEvaluationsByMunicipality([]);
        resetAfterState();
      }
    };

    loadMunicipalities();
  }, [selectedState, resetAfterState]);

  // ✅ NOVO: Carregar avaliações quando município for selecionado
  useEffect(() => {
    const loadEvaluations = async () => {
      if (selectedMunicipality !== 'all') {
        try {
          setIsLoadingFilters(true);
          // ✅ NOVO: Usar a nova rota de avaliações com estado e município
          const evaluationsData = await EvaluationResultsApiService.getFilterEvaluations({
            estado: selectedState,
            municipio: selectedMunicipality
          });
          setEvaluationsByMunicipality(evaluationsData.map(evaluation => ({
            id: evaluation.id,
            titulo: evaluation.titulo,
            disciplina: '',
            status: 'concluida',
            data_aplicacao: new Date().toISOString()
          })));

          // ✅ Reset em cascata
          resetAfterEvaluation();
        } catch (error) {
          console.error("Erro ao carregar avaliações:", error);
          setEvaluationsByMunicipality([]);
        } finally {
          setIsLoadingFilters(false);
        }
      } else {
        setEvaluationsByMunicipality([]);
        resetAfterEvaluation();
      }
    };

    loadEvaluations();
  }, [selectedMunicipality, selectedState, resetAfterEvaluation]);

  // ✅ NOVO: Carregar escolas quando avaliação for selecionada
  useEffect(() => {
    const loadSchools = async () => {
      if (selectedEvaluation !== 'all') {
        try {
          setIsLoadingFilters(true);
          const schoolsData = await EvaluationResultsApiService.getFilterSchoolsByEvaluation({
            estado: selectedState,
            municipio: selectedMunicipality,
            avaliacao: selectedEvaluation
          });
          setSchools(schoolsData.map(school => ({
            id: school.id,
            name: school.nome
          })));

          // Reset em cascata
          resetAfterSchool();
        } catch (error) {
          console.error("Erro ao carregar escolas:", error);
          setSchools([]);
        } finally {
          setIsLoadingFilters(false);
        }
      } else {
        setSchools([]);
        resetAfterSchool();
      }
    };

    loadSchools();
  }, [selectedEvaluation, selectedState, selectedMunicipality, resetAfterSchool]);

  // ✅ NOVO: Carregar séries quando escola for selecionada
  useEffect(() => {
    const loadGrades = async () => {
      if (selectedSchool !== 'all') {
        try {
          setIsLoadingFilters(true);
          const gradesData = await EvaluationResultsApiService.getFilterGradesByEvaluation({
            estado: selectedState,
            municipio: selectedMunicipality,
            avaliacao: selectedEvaluation,
            escola: selectedSchool
          });
          setGrades(gradesData.map(grade => ({
            id: grade.id,
            name: grade.nome
          })));

          // Reset em cascata
          resetAfterGrade();
        } catch (error) {
          console.error("Erro ao carregar séries:", error);
          setGrades([]);
        } finally {
          setIsLoadingFilters(false);
        }
      } else {
        setGrades([]);
        resetAfterGrade();
      }
    };

    loadGrades();
  }, [selectedSchool, selectedState, selectedMunicipality, selectedEvaluation, resetAfterGrade]);

  // ✅ NOVO: Carregar turmas quando série for selecionada
  useEffect(() => {
    const loadClasses = async () => {
      if (selectedGrade !== 'all') {
        try {
          setIsLoadingFilters(true);
          const classesData = await EvaluationResultsApiService.getFilterClassesByEvaluation({
            estado: selectedState,
            municipio: selectedMunicipality,
            avaliacao: selectedEvaluation,
            escola: selectedSchool,
            serie: selectedGrade
          });
          setClasses(classesData.map(classItem => ({
            id: classItem.id,
            name: classItem.nome
          })));

          // Resetar seleção dependente
          setSelectedClass('all');
        } catch (error) {
          console.error("Erro ao carregar turmas:", error);
          setClasses([]);
        } finally {
          setIsLoadingFilters(false);
        }
      } else {
        setClasses([]);
        setSelectedClass('all');
      }
    };

    loadClasses();
  }, [selectedGrade, selectedState, selectedMunicipality, selectedEvaluation, selectedSchool]);

  

  const loadData = useCallback(async () => {
    // ✅ NOVO: Verificar se os 3 filtros obrigatórios estão selecionados
    const filtrosObrigatorios = [
      selectedState !== 'all',
      selectedMunicipality !== 'all',
      selectedEvaluation !== 'all'
    ];

    if (filtrosObrigatorios.filter(Boolean).length < 3) {
      setApiData(null);
      setTabelaDetalhada(null);
      return;
    }

    try {
      setIsLoadingData(true);
      const filters = {
        estado: selectedState !== 'all' ? selectedState : undefined,
        municipio: selectedMunicipality !== 'all' ? selectedMunicipality : undefined,
        avaliacao: selectedEvaluation,
          escola: selectedSchool !== 'all' ? selectedSchool : undefined,
          serie: selectedGrade !== 'all' ? selectedGrade : undefined,
          turma: selectedClass !== 'all' ? selectedClass : undefined,
      };

            // ✅ NOVO: Usar a rota correta /evaluation-results/avaliacoes
      console.log('🔍 LOG - Chamando API getEvaluationsList com filtros:', filters);
      const response = await EvaluationResultsApiService.getEvaluationsList(currentPage, perPage, filters);
      console.log('🔍 LOG - Resposta bruta da API:', response);
      console.log('🔍 LOG - Tipo da resposta:', typeof response);
      console.log('🔍 LOG - Keys da resposta:', response ? Object.keys(response) : 'null');
      
      // ✅ NOVO: Normalizar a estrutura da resposta para compatibilidade
      if (response) {
        // ✅ NOVO: Garantir que a estrutura seja compatível com a interface NovaRespostaAPI
        const normalizedResponse = {
          nivel_granularidade: response.nivel_granularidade || 'municipio',
          filtros_aplicados: response.filtros_aplicados || {
            estado: selectedState,
            municipio: selectedMunicipality,
            escola: selectedSchool !== 'all' ? selectedSchool : null,
            serie: selectedGrade !== 'all' ? selectedGrade : null,
            turma: selectedClass !== 'all' ? selectedClass : null,
            avaliacao: selectedEvaluation
          },
          estatisticas_gerais: response.estatisticas_gerais || {
            tipo: 'municipio',
            nome: 'Dados gerais',
            estado: selectedState,
            total_avaliacoes: 0,
            total_alunos: 0,
            alunos_participantes: 0,
            alunos_pendentes: 0,
            alunos_ausentes: 0,
            media_nota_geral: 0,
            media_proficiencia_geral: 0,
            distribuicao_classificacao_geral: {
              abaixo_do_basico: 0,
              basico: 0,
              adequado: 0,
              avancado: 0
            }
          },
          resultados_por_disciplina: response.resultados_por_disciplina || [],
          resultados_detalhados: {
            avaliacoes: response.resultados_detalhados?.avaliacoes ||
                       (response.resultados_detalhados as ResultadosDetalhadosFromAPI)?.data ||
                       [],
            paginacao: {
              page: (response.resultados_detalhados?.paginacao as any)?.page || currentPage,
              per_page: (response.resultados_detalhados?.paginacao as any)?.per_page || perPage,
              total: (response.resultados_detalhados?.paginacao as any)?.total || 0,
              total_pages: (response.resultados_detalhados?.paginacao as any)?.total_pages || 0
            }
          },
          opcoes_proximos_filtros: {
            escolas: response.opcoes_proximos_filtros?.escolas?.map((escola: any) => ({
              id: escola.id,
              name: escola.name || escola.nome || ''
            })) || [],
            series: response.opcoes_proximos_filtros?.series?.map((serie: any) => ({
              id: serie.id,
              name: serie.name || serie.nome || ''
            })) || [],
            turmas: response.opcoes_proximos_filtros?.turmas?.map((turma: any) => ({
              id: turma.id,
              name: turma.name || turma.nome || ''
            })) || []
          },
          // ✅ NOVO: Incluir tabela_detalhada
          tabela_detalhada: (response as any).tabela_detalhada || null
        };

        console.log('🔍 LOG - Dados normalizados para apiData:', normalizedResponse);
        console.log('🔍 LOG - Campo tabela_detalhada encontrado:', !!normalizedResponse.tabela_detalhada);
        if (normalizedResponse.tabela_detalhada) {
          console.log('🔍 LOG - Conteúdo da tabela_detalhada:', normalizedResponse.tabela_detalhada);
          console.log('🔍 LOG - Disciplinas na tabela:', normalizedResponse.tabela_detalhada.disciplinas?.length || 0);
          if (normalizedResponse.tabela_detalhada.disciplinas?.length > 0) {
            console.log('🔍 LOG - Primeira disciplina:', normalizedResponse.tabela_detalhada.disciplinas[0]);
            console.log('🔍 LOG - Questões da primeira disciplina:', normalizedResponse.tabela_detalhada.disciplinas[0].questoes?.length || 0);
            console.log('🔍 LOG - Alunos da primeira disciplina:', normalizedResponse.tabela_detalhada.disciplinas[0].alunos?.length || 0);
          }
        }
        setApiData(normalizedResponse);
        
        // ✅ NOVO: Extrair dados da tabela detalhada
        if (normalizedResponse.tabela_detalhada) {
          setTabelaDetalhada(normalizedResponse.tabela_detalhada);
          
          // ✅ NOVO: Processar questões e alunos da tabela detalhada
          processTabelaDetalhada(normalizedResponse.tabela_detalhada);
        }

        // ✅ Construir resumo preciso da avaliação selecionada (se houver)
        if (selectedEvaluation !== 'all') {
          // Tentar consolidar a partir da primeira avaliação retornada (quando nível >= escola)
          const firstEval = normalizedResponse.resultados_detalhados?.avaliacoes?.[0];
          const status = firstEval?.status || (normalizedResponse.estatisticas_gerais ? (normalizedResponse.estatisticas_gerais.tipo ? 'concluida' : 'pendente') : 'pendente');

          // Fallbacks a partir das estatísticas e filtros
          const resumo: EvaluationInfoSummary = {
            id: String(firstEval?.id || selectedEvaluation),
            titulo: String(firstEval?.titulo || 'Avaliação'),
            disciplina: firstEval?.disciplina,
            curso: firstEval?.curso,
            serie: firstEval?.serie || normalizedResponse.estatisticas_gerais?.serie,
            escola: firstEval?.escola || normalizedResponse.estatisticas_gerais?.escola,
            municipio: firstEval?.municipio || normalizedResponse.estatisticas_gerais?.municipio,
            data_aplicacao: firstEval?.data_aplicacao,
            status: status as EvaluationInfoSummary['status'],
            total_alunos: firstEval?.total_alunos ?? normalizedResponse.estatisticas_gerais?.total_alunos ?? 0,
            alunos_participantes: firstEval?.alunos_participantes ?? normalizedResponse.estatisticas_gerais?.alunos_participantes ?? 0,
            alunos_ausentes: firstEval?.alunos_ausentes ?? 0,
            media_nota: firstEval?.media_nota ?? normalizedResponse.estatisticas_gerais?.media_nota_geral ?? 0,
            media_proficiencia: firstEval?.media_proficiencia ?? normalizedResponse.estatisticas_gerais?.media_proficiencia_geral ?? 0,
          };

          // ✅ Consolidar TODAS as disciplinas: resultados_por_disciplina + disciplina da primeira avaliação + opções da avaliação
          const subjectsFromResults = (normalizedResponse.resultados_por_disciplina || [])
            .map(d => extractSubjectName(d.disciplina as unknown))
            .filter(Boolean);
          const singleSubject = extractSubjectName(firstEval?.disciplina as unknown);
          // Buscar também as disciplinas listadas nas opções de filtros da avaliação
          const filterOptions = await EvaluationResultsApiService.getFilterOptionsForEvaluation(String(selectedEvaluation));
          const subjectsFromOptions = (filterOptions?.subjects || [])
            .map(s => extractSubjectName(s as unknown))
            .filter(Boolean);

          const allSubjects = Array.from(new Set([
            ...subjectsFromResults,
            ...subjectsFromOptions,
            ...(singleSubject ? [singleSubject] : []),
          ]));
          if (allSubjects.length > 0) {
            resumo.disciplinas = allSubjects;
          }

          setEvaluationInfo(resumo);
        } else {
          setEvaluationInfo(null);
        }
      } else {
        setApiData(null);
        setEvaluationInfo(null);
        setTabelaDetalhada(null);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados. Tente novamente.",
        variant: "destructive",
      });
      setApiData(null);
      setEvaluationInfo(null);
      setTabelaDetalhada(null);
    } finally {
      setIsLoadingData(false);
    }
  }, [
    selectedState,
    selectedMunicipality,
    selectedEvaluation,
    currentPage,
    perPage,
    selectedSchool,
    selectedGrade,
    selectedClass,
    toast,
    extractSubjectName
  ]);

  // ✅ NOVO: Função para processar dados da tabela detalhada
  const processTabelaDetalhada = useCallback((tabelaData: any) => {
    console.log('🔍 LOG - processTabelaDetalhada chamada com:', tabelaData);
    
    if (!tabelaData || !tabelaData.disciplinas || tabelaData.disciplinas.length === 0) {
      console.log('🔍 LOG - Tabela detalhada vazia ou inválida');
      setQuestions([]);
      setStudents([]);
      setStudentResponses({});
      return;
    }

    // ✅ CORRIGIDO: Extrair TODAS as questões de TODAS as disciplinas
    const todasQuestoes: Question[] = [];
    const questoesPorDisciplina = new Map<string, Question[]>();
    
    console.log('🔍 LOG - Processando questões de todas as disciplinas...');
    
    tabelaData.disciplinas.forEach((disciplina: any, discIndex: number) => {
      console.log(`🔍 LOG - Disciplina ${discIndex + 1}: ${disciplina.nome} com ${disciplina.questoes?.length || 0} questões`);
      
      if (disciplina.questoes && Array.isArray(disciplina.questoes)) {
        const questoesDisciplina = disciplina.questoes.map((q: any) => ({
          id: `questao-${q.numero}`,
          numero: q.numero,
          texto: `Questão ${q.numero}`,
          habilidade: q.habilidade,
          codigo_habilidade: q.codigo_habilidade,
          tipo: 'multipleChoice',
          dificuldade: 'Médio',
          porcentagem_acertos: 0,
          porcentagem_erros: 0,
          disciplina: disciplina.nome // ✅ Adicionar nome da disciplina para referência
        }));
        
        questoesPorDisciplina.set(disciplina.nome, questoesDisciplina);
        todasQuestoes.push(...questoesDisciplina);
        
        console.log(`🔍 LOG - Questões da disciplina ${disciplina.nome}:`, questoesDisciplina);
      }
    });
    
    // ✅ Ordenar questões por número
    todasQuestoes.sort((a, b) => a.numero - b.numero);
    
    console.log('🔍 LOG - Total de questões encontradas:', todasQuestoes.length);
    console.log('🔍 LOG - Questões ordenadas:', todasQuestoes);
    console.log('🔍 LOG - Questões por disciplina:', Object.fromEntries(questoesPorDisciplina));
    
    setQuestions(todasQuestoes);

    // ✅ CORRIGIDO: Extrair alunos e consolidar respostas de TODAS as disciplinas
    const todosAlunos: StudentResult[] = [];
    const respostasAlunos: Record<string, Array<{
      questao_id: string;
      questao_numero: number;
      resposta_correta: boolean;
      resposta_em_branco: boolean;
      tempo_gasto: number;
    }>> = {};

    console.log('🔍 LOG - Processando disciplinas para extrair alunos...');
    
    // ✅ Primeiro: coletar todos os alunos únicos
    const alunosUnicos = new Map<string, any>();
    
    tabelaData.disciplinas.forEach((disciplina: any, discIndex: number) => {
      console.log(`🔍 LOG - Processando disciplina ${discIndex + 1}:`, disciplina.nome, 'com', disciplina.alunos?.length || 0, 'alunos');
      
      if (disciplina.alunos) {
        disciplina.alunos.forEach((aluno: any) => {
          if (!alunosUnicos.has(aluno.id)) {
            alunosUnicos.set(aluno.id, {
              ...aluno,
              respostas_consolidadas: []
            });
          }
          
          // ✅ Adicionar respostas desta disciplina ao aluno
          if (aluno.respostas_por_questao) {
            const alunoConsolidado = alunosUnicos.get(aluno.id);
            alunoConsolidado.respostas_consolidadas.push(...aluno.respostas_por_questao);
          }
        });
      }
    });

    // ✅ Segundo: processar alunos consolidados
    alunosUnicos.forEach((aluno, alunoId) => {
      console.log(`🔍 LOG - Processando aluno consolidado: ${aluno.nome} com ${aluno.respostas_consolidadas.length} respostas`);
      
      // ✅ Calcular totais consolidados
      const totalAcertos = aluno.respostas_consolidadas.filter((r: any) => r.acertou).length;
      const totalErros = aluno.respostas_consolidadas.filter((r: any) => !r.acertou).length;
      const totalQuestoes = todasQuestoes.length;
      
      const studentResult: StudentResult = {
        id: aluno.id,
        nome: aluno.nome,
        turma: aluno.turma,
        nota: aluno.nota,
        proficiencia: aluno.proficiencia,
        classificacao: aluno.nivel_proficiencia as any,
        questoes_respondidas: totalQuestoes,
        acertos: totalAcertos,
        erros: totalErros,
        em_branco: totalQuestoes - totalAcertos - totalErros,
        tempo_gasto: 0,
        status: 'concluida'
      };
      
      todosAlunos.push(studentResult);

      // ✅ Processar respostas consolidadas por questão
      respostasAlunos[aluno.id] = aluno.respostas_consolidadas.map((resposta: any) => ({
        questao_id: `questao-${resposta.questao}`,
        questao_numero: resposta.questao,
        resposta_correta: resposta.acertou,
        resposta_em_branco: false, // Assumindo que todas as questões foram respondidas
        tempo_gasto: 0
      }));
      
      console.log(`🔍 LOG - Aluno ${aluno.nome}: ${totalAcertos} acertos, ${totalErros} erros de ${totalQuestoes} questões`);
    });

    console.log('🔍 LOG - Processamento concluído:');
    console.log('🔍 LOG - Total de alunos processados:', todosAlunos.length);
    console.log('🔍 LOG - Total de respostas processadas:', Object.keys(respostasAlunos).length);
    console.log('🔍 LOG - Primeiros 3 alunos:', todosAlunos.slice(0, 3));
    console.log('🔍 LOG - Respostas consolidadas:', respostasAlunos);
    
    setStudents(todosAlunos);
    setStudentResponses(respostasAlunos);
  }, []);

  // Carregar dados quando filtros obrigatórios mudarem
  useEffect(() => {
    loadData();
  }, [selectedState, selectedMunicipality, selectedEvaluation, currentPage, perPage, loadData]);

  // ✅ NOVO: Carregar dados quando filtros opcionais mudarem (apenas se os obrigatórios estiverem selecionados)
  useEffect(() => {
    if (selectedState !== 'all' && selectedMunicipality !== 'all' && selectedEvaluation !== 'all') {
      loadData();
    }
  }, [selectedSchool, selectedGrade, selectedClass, selectedState, selectedMunicipality, selectedEvaluation, loadData]);

  const handleViewResults = (evaluationId: string) => {
    navigate(`/app/avaliacao/${evaluationId}/resultados-detalhados`);
  };

  const handleViewResultsInNewTab = (evaluationId: string) => {
    const url = `/app/avaliacao/${evaluationId}/resultados-detalhados`;
    window.open(url, '_blank');
  };

  const handleExportResults = async () => {
    try {
      const XLSX = await import('xlsx');
      const { saveAs } = await import('file-saver');

      if (!apiData || (!apiData.resultados_detalhados?.avaliacoes?.length) || (apiData.estatisticas_gerais?.total_avaliacoes || 0) === 0) {
        toast({
          title: "Nenhum dado para exportar",
          description: "Não há avaliações para gerar a planilha",
          variant: "destructive",
        });
        return;
      }

      const worksheetData = [
        ['Avaliação', 'Disciplina', 'Escola', 'Série', 'Turma', 'Município', 'Estado', 'Participantes', 'Média', 'Proficiência', 'Status'],
        ...(apiData.resultados_detalhados?.avaliacoes || []).map(evaluation => [
          evaluation.titulo || 'Sem título',
          evaluation.disciplina || 'Sem disciplina',
          evaluation.escola || 'Sem escola',
          evaluation.serie || 'Sem série',
          evaluation.turma || 'Sem turma',
          evaluation.municipio || 'Sem município',
          evaluation.estado || 'Sem estado',
          `${evaluation.alunos_participantes || 0}/${evaluation.total_alunos || 0}`,
          (evaluation.media_nota || 0).toFixed(1),
          (evaluation.media_proficiencia || 0).toFixed(1),
          'Concluída' // Status padrão para nova estrutura
        ])
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Avaliações');

      const fileName = `resultados-avaliacoes-${new Date().toISOString().split('T')[0]}.xlsx`;
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      saveAs(blob, fileName);

      toast({
        title: "Exportação concluída!",
        description: "Os resultados foram exportados com sucesso.",
      });
    } catch (error) {
      console.error("Erro na exportação:", error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar os resultados",
        variant: "destructive",
      });
    }
  };

  // Descobre se a disciplina é Matemática
  const isMath = useCallback((name?: string) => (name || "").toLowerCase().includes("matem"), []);

  // Infere o grupo do nível (group1 = EI/AI/EJA/Especial; group2 = AF/EM)
  // Usa: série selecionada, estatísticas gerais, ou a primeira avaliação da lista
  type StageGroup = "group1" | "group2";
  const inferStageGroup = useCallback((): StageGroup => {
    const names = [
      grades.find(g => g.id === selectedGrade)?.name,
      apiData?.estatisticas_gerais?.serie,
      apiData?.resultados_detalhados?.avaliacoes?.[0]?.serie,
    ]
      .filter(Boolean)
      .map((s: string) => s.toLowerCase());

    const has = (re: RegExp) => names.some(n => re.test(n));

    if (has(/infantil|eja|especial/)) return "group1";
    if (has(/\b(1º|1o|1°|1)\s*ano\b|\b(2º|2o|2°|2)\s*ano\b|\b(3º|3o|3°|3)\s*ano\b|\b(4º|4o|4°|4)\s*ano\b|\b(5º|5o|5°|5)\s*ano\b/) && !has(/m[eé]dio/)) {
      return "group1";
    }
    return "group2";
  }, [grades, selectedGrade, apiData]);

  // Retorna o teto por disciplina x grupo
  const getMaxForDiscipline = useCallback((discipline: string, group: StageGroup) => {
    if (group === "group1") return isMath(discipline) ? 375 : 350; // AI/EI/EJA/Especial
    return isMath(discipline) ? 425 : 400; // AF/EM
  }, [isMath]);

  // ✅ Normalizador de status para manter o tipo estrito
  const normalizeStatus = useCallback((status: string | undefined): 'concluida' | 'em_andamento' | 'pendente' => {
    if (status === 'concluida' || status === 'em_andamento' || status === 'pendente') return status;
    return 'pendente';
  }, []);

  // Preparar dados para os gráficos
  const prepareChartData = () => {
    if (!apiData) return null;

    // Verificar se os dados necessários existem
    if (!apiData.estatisticas_gerais || !apiData.resultados_por_disciplina) {
      console.warn('Dados incompletos para gráficos:', apiData);
      return null;
    }

    console.log('Preparando dados para gráficos:', {
      estatisticas_gerais: apiData.estatisticas_gerais,
      resultados_por_disciplina: apiData.resultados_por_disciplina
    });

    // Dados para gráfico de médias de nota
    const averageScoreData = [
      { name: "Geral", value: apiData.estatisticas_gerais.media_nota_geral || 0 },
      ...apiData.resultados_por_disciplina.map((item) => ({
        name: item.disciplina.toUpperCase(),
        value: item.media_nota || 0
      }))
    ];

    // Dados para gráfico de médias de proficiência
    const averageProficiencyData = [
      { name: "Geral", value: apiData.estatisticas_gerais.media_proficiencia_geral || 0 },
      ...apiData.resultados_por_disciplina.map((item) => ({
        name: item.disciplina.toUpperCase(),
        value: item.media_proficiencia || 0
      }))
    ];

    // Dados para gráficos de distribuição por disciplina
    const distributionData = apiData.resultados_por_disciplina.map((item) => ({
      disciplina: item.disciplina,
      data: [
        { name: "Abaixo do Básico", value: item.distribuicao_classificacao?.abaixo_do_basico || 0 },
        { name: "Básico", value: item.distribuicao_classificacao?.basico || 0 },
        { name: "Adequado", value: item.distribuicao_classificacao?.adequado || 0 },
        { name: "Avançado", value: item.distribuicao_classificacao?.avancado || 0 }
      ]
    }));
  
  // >>> NOVO: teto dinâmico da proficiência
  const group = inferStageGroup();
  const profMaxCandidates = (apiData.resultados_por_disciplina.length
    ? apiData.resultados_por_disciplina.map(d => getMaxForDiscipline(d.disciplina, group))
    : [getMaxForDiscipline("outras", group)]);

  const proficiencyMax = Math.max(...profMaxCandidates);

  const result = {
      averageScoreData,
      averageProficiencyData,
    distributionData,
    proficiencyMax,
    };

    console.log('Dados dos gráficos preparados:', result);
    return result;
  };

  const chartData = useMemo(prepareChartData, [apiData, inferStageGroup, getMaxForDiscipline]);

  // ✅ NOVO: Função para buscar dados detalhados da avaliação (igual ao DetailedResultsView)
  const loadEvaluationDetails = useCallback(async () => {
    if (!selectedEvaluation || selectedEvaluation === 'all') {
      setQuestions([]);
      setSkillsMapping({});
      setSkillsBySubject({});
      setDetailedReport(null);
      return;
    }

    try {
      // ✅ Buscar relatório detalhado da avaliação
      const detailedResponse = await EvaluationResultsApiService.getDetailedReport(selectedEvaluation);
      
      if (detailedResponse) {
        setDetailedReport(detailedResponse);
        
        // ✅ Extrair questões da avaliação
        if (detailedResponse.questoes && Array.isArray(detailedResponse.questoes)) {
          setQuestions(detailedResponse.questoes);
        }
        
        // ✅ Extrair skills/habilidades
        if ((detailedResponse as any).skills) {
          const skillsMap: Record<string, string> = {};
          const skillsBySubj: Record<string, Skill[]> = {};
          
          Object.entries((detailedResponse as any).skills).forEach(([subject, skills]) => {
            if (Array.isArray(skills)) {
              skillsBySubj[subject] = skills.map((skill: any) => ({
                id: skill.id,
                code: skill.code || skill.codigo,
                description: skill.description || skill.descricao,
                source: skill.source || 'database'
              }));
              
              // Mapear UUID -> código real
              skills.forEach((skill: any) => {
                if (skill.id && skill.code) {
                  skillsMap[skill.id] = skill.code;
                }
              });
            }
          });
          
          setSkillsMapping(skillsMap);
          setSkillsBySubject(skillsBySubj);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar detalhes da avaliação:", error);
      setQuestions([]);
      setSkillsMapping({});
      setSkillsBySubject({});
      setDetailedReport(null);
    }
  }, [selectedEvaluation]);

  // ✅ NOVO: Carregar detalhes da avaliação quando avaliação for selecionada
  useEffect(() => {
    if (selectedEvaluation !== 'all') {
      loadEvaluationDetails();
    } else {
      setQuestions([]);
      setSkillsMapping({});
      setSkillsBySubject({});
      setDetailedReport(null);
    }
  }, [selectedEvaluation, loadEvaluationDetails]);

  // ✅ NOVO: Função para buscar dados dos alunos (igual ao DetailedResultsView)
  const loadStudentsData = useCallback(async () => {
    if (!selectedEvaluation || selectedEvaluation === 'all') {
      setStudents([]);
      return;
    }

    try {
      setIsLoadingStudents(true);
      
      // ✅ Usar a mesma API que funcionava no DetailedResultsView
      const studentsResponse = await EvaluationResultsApiService.getStudentsByEvaluation(selectedEvaluation);
      
      if (studentsResponse && Array.isArray(studentsResponse)) {
        // ✅ Transformar para o formato StudentResult correto
        const transformedStudents: StudentResult[] = studentsResponse.map((student: any) => ({
          id: student.id || String(Math.random()),
          nome: student.nome || student.name || 'Aluno sem nome',
          turma: student.turma || student.class || 'Turma não informada',
          nota: student.nota || student.grade || student.total_score || 0,
          total_score: student.total_score || student.nota || 0,
          grade: student.grade || student.nota || 0,
          proficiencia: student.proficiencia || student.proficiency || 0,
          proficiency: student.proficiency || student.proficiencia || 0,
          classificacao: student.classificacao || student.classification || 'Adequado',
          classification: student.classification || student.classificacao || 'Adequado',
          correct_answers: student.correct_answers || student.acertos || 0,
          questoes_respondidas: student.questoes_respondidas || student.total_questions || 10,
          acertos: student.acertos || student.correct_answers || 0,
          erros: student.erros || student.wrong_answers || 0,
          em_branco: student.em_branco || student.blank_answers || 0,
          tempo_gasto: student.tempo_gasto || student.time_spent || 0,
          status: student.status === 'concluida' || student.status === 'completed' ? 'concluida' : 'pendente'
        }));

        setStudents(transformedStudents);
        
        // ✅ Simular respostas detalhadas (como no DetailedResultsView)
        const detailedAnswers: Record<string, any> = {};
        transformedStudents.forEach((student) => {
          detailedAnswers[student.id] = {
            test_id: selectedEvaluation,
            student_id: student.id,
            student_name: student.nome,
            total_questions: student.questoes_respondidas,
            answered_questions: student.acertos + student.erros,
            correct_answers: student.acertos,
            score_percentage: (student.acertos / student.questoes_respondidas) * 100,
            total_score: student.nota,
            max_possible_score: student.questoes_respondidas,
            grade: student.nota,
            proficiencia: student.proficiencia,
            classificacao: student.classificacao,
            status: student.status === 'pendente' ? 'nao_respondida' : 'concluida',
            answers: []
          };
        });
        setStudentDetailedAnswers(detailedAnswers);
      } else {
        setStudents([]);
        setStudentDetailedAnswers({});
      }
    } catch (error) {
      console.error("Erro ao carregar dados dos alunos:", error);
      setStudents([]);
      setStudentDetailedAnswers({});
    } finally {
      setIsLoadingStudents(false);
    }
  }, [selectedEvaluation]);

  // ✅ NOVO: Carregar dados dos alunos quando avaliação for selecionada
  useEffect(() => {
    if (selectedEvaluation !== 'all') {
      loadStudentsData();
    } else {
      setStudents([]);
      setStudentDetailedAnswers({});
    }
  }, [selectedEvaluation, loadStudentsData]);

  // ✅ CORRIGIDO: Preparar dados para a tabela de alunos (igual ao DetailedResultsView)
  const prepareTableData = useMemo(() => {
    if (!students || students.length === 0) return [];

    // ✅ Retornar os dados reais dos alunos com campos obrigatórios
    return students.map((student) => ({
      id: student.id,
      nome: student.nome,
      turma: student.turma,
      nota: student.nota,
      proficiencia: student.proficiencia,
      classificacao: student.classificacao,
      acertos: student.acertos,
      total_questoes: student.questoes_respondidas,
      status: student.status,
      tempo_gasto: student.tempo_gasto,
      // ✅ Campos obrigatórios da interface StudentResult
      questoes_respondidas: student.questoes_respondidas,
      erros: student.erros,
      em_branco: student.em_branco
    }));
  }, [students]);

  // Contar filtros selecionados
  const selectedFiltersCount = [
    selectedState !== 'all',
    selectedMunicipality !== 'all',
    selectedEvaluation !== 'all'
  ].filter(Boolean).length;

  // ✅ NOVO: Verificar se todos os filtros obrigatórios estão selecionados
  const allRequiredFiltersSelected = selectedFiltersCount === 3;

  // ✅ NOVO: Calcular % da turma para cada questão (igual ao DetailedResultsView)
  const calculateClassPercentage = useCallback((questionNumber: number) => {
    if (!students.length || !studentResponses) return 0;
    
    let correctAnswers = 0;
    let totalAnswers = 0;
    
    Object.values(studentResponses).forEach((responses) => {
      const response = responses.find(r => r.questao_numero === questionNumber);
      if (response && !response.resposta_em_branco) {
        totalAnswers++;
        if (response.resposta_correta) {
          correctAnswers++;
        }
      }
    });
    
    return totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;
  }, [students, studentResponses]);

  // ✅ NOVO: Verificar se aluno acertou a questão (igual ao DetailedResultsView)
  const getStudentQuestionResult = useCallback((studentId: string, questionNumber: number) => {
    const responses = studentResponses[studentId];
    if (!responses) return { isCorrect: false, isBlank: true };
    
    const response = responses.find(r => r.questao_numero === questionNumber);
    if (!response) return { isCorrect: false, isBlank: true };
    
    return {
      isCorrect: response.resposta_correta,
      isBlank: response.resposta_em_branco
    };
  }, [studentResponses]);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Resultados das Avaliações</h1>
          <p className="text-muted-foreground">
            Acompanhe o desempenho das avaliações e gere relatórios
          </p>
          {apiData && (
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Nível: {apiData.estatisticas_gerais?.tipo ? apiData.estatisticas_gerais.tipo.charAt(0).toUpperCase() + apiData.estatisticas_gerais.tipo.slice(1) : 'Município'}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {apiData.estatisticas_gerais?.nome || 'Dados gerais'}
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => loadData()} disabled={isLoadingData}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingData ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          {apiData && (
            <Button onClick={() => handleExportResults()}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Estado */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <Select
                value={selectedState}
                onValueChange={setSelectedState}
                disabled={isLoadingFilters}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {states.map(state => (
                    <SelectItem key={state.id} value={state.id}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Município */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Município</label>
              <Select
                value={selectedMunicipality}
                onValueChange={setSelectedMunicipality}
                disabled={isLoadingFilters || selectedState === 'all'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o município" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {municipalities.map(municipality => (
                    <SelectItem key={municipality.id} value={municipality.id}>
                      {municipality.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ✅ NOVO: Avaliações */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Avaliações</label>
              <Select
                value={selectedEvaluation}
                onValueChange={setSelectedEvaluation}
                disabled={isLoadingFilters || selectedMunicipality === 'all'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a avaliação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {(() => {
                    if (!Array.isArray(evaluationsByMunicipality)) {
                      console.error('❌ ERRO: evaluationsByMunicipality não é array no render');
                      return null;
                    }

                    return evaluationsByMunicipality.map(evaluation => {
                      return (
                        <SelectItem key={evaluation.id} value={evaluation.id}>
                          {evaluation.titulo}
                        </SelectItem>
                      );
                    });
                  })()}
                </SelectContent>
              </Select>
            </div>

            {/* Escola */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Escola</label>
              <Select
                value={selectedSchool}
                onValueChange={setSelectedSchool}
                disabled={isLoadingFilters || selectedEvaluation === 'all'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a escola" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {schools.map(school => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Série */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Série</label>
              <Select
                value={selectedGrade}
                onValueChange={setSelectedGrade}
                disabled={isLoadingFilters || selectedSchool === 'all'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a série" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {grades.map(grade => (
                    <SelectItem key={grade.id} value={grade.id}>
                      {grade.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Turma */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Turma</label>
              <Select
                value={selectedClass}
                onValueChange={setSelectedClass}
                disabled={isLoadingFilters || selectedGrade === 'all'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a turma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {classes.map(classItem => (
                    <SelectItem key={classItem.id} value={classItem.id}>
                      {classItem.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Informação sobre filtros */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700">
              💡 <strong>Hierarquia dos Filtros:</strong> Estado → Município → Avaliação → Escola → Série → Turma
            </p>
            <p className="text-sm text-blue-700 mt-1">
              Os três primeiros filtros são obrigatórios. Escola, Série e Turma são opcionais e podem ser "Todos".
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Mensagem quando não há filtros suficientes */}
      {!allRequiredFiltersSelected && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Filter className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Selecione os três filtros obrigatórios para continuar
            </h3>
            <p className="text-gray-600 text-center max-w-md">
              Para visualizar os resultados das avaliações, você precisa selecionar: <strong>Estado</strong>, <strong>Município</strong> e <strong>Avaliação</strong>. Os filtros Escola, Série e Turma são opcionais e podem ser "Todos".
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading dos dados */}
      {allRequiredFiltersSelected && isLoadingData && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600">Carregando dados...</p>
          </CardContent>
        </Card>
      )}

      {/* Gráficos e Dados */}
      {allRequiredFiltersSelected && !isLoadingData && apiData && (
        <>
          {/* ✅ Informações da Avaliação (resumo) */}
          {evaluationInfo && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Informações da Avaliação</span>
                  <Badge className={getStatusConfig(normalizeStatus(evaluationInfo.status)).color}>
                    {evaluationInfo.status === 'concluida' ? 'Concluída' : evaluationInfo.status === 'em_andamento' ? 'Em Andamento' : 'Pendente'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Disciplinas</div>
                    <div className="font-semibold">
                      {evaluationInfo.disciplinas && evaluationInfo.disciplinas.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {evaluationInfo.disciplinas.map((disc, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">{disc}</Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-700">{evaluationInfo.disciplina || 'Disciplina não informada'}</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Série</div>
                    <div className="font-semibold">{evaluationInfo.serie || 'Série não informada'}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Escola</div>
                    <div className="font-semibold">{evaluationInfo.escola || 'Escola não informada'}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Município</div>
                    <div className="font-semibold">{evaluationInfo.municipio || 'Município não informado'}</div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Total de Alunos</div>
                    <div className="text-2xl font-bold text-blue-600">{evaluationInfo.total_alunos}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Participantes</div>
                    <div className="text-2xl font-bold text-green-600">{evaluationInfo.alunos_participantes}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Faltosos</div>
                    <div className="text-2xl font-bold text-red-600">{evaluationInfo.alunos_ausentes}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Taxa de Participação</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {evaluationInfo.total_alunos > 0 ? ((evaluationInfo.alunos_participantes / evaluationInfo.total_alunos) * 100).toFixed(1) : '0.0'}%
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Nota Geral</div>
                    <div className="text-2xl font-bold text-purple-600">{evaluationInfo.media_nota.toFixed(1)}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Proficiência</div>
                    <div className="text-2xl font-bold text-orange-600">{Number(evaluationInfo.media_proficiencia || 0).toFixed(1)}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Taxa de Conclusão</div>
                    <div className="text-2xl font-bold text-green-600">
                      {evaluationInfo.total_alunos > 0 ? ((evaluationInfo.alunos_participantes / evaluationInfo.total_alunos) * 100).toFixed(1) : '0.0'}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ✅ NOVO: Sistema de Abas */}
          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="proficiencia" className="flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                Proficiência
              </TabsTrigger>
              <TabsTrigger value="ranking" className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                Ranking
              </TabsTrigger>
            </TabsList>

            {/* Aba Dashboard */}
            <TabsContent value="dashboard" className="space-y-6 mt-6">
              {/* Estatísticas Gerais */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      Total de Avaliações
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {apiData.estatisticas_gerais.total_avaliacoes}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {apiData.estatisticas_gerais.tipo === 'municipio' && `${apiData.estatisticas_gerais.total_escolas} escolas`}
                      {apiData.estatisticas_gerais.tipo === 'escola' && `${apiData.estatisticas_gerais.total_series} séries`}
                      {apiData.estatisticas_gerais.tipo === 'serie' && `${apiData.estatisticas_gerais.total_turmas} turmas`}
                      {apiData.estatisticas_gerais.tipo === 'turma' && 'Nível máximo'}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-green-600" />
                      Alunos Participantes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {apiData.estatisticas_gerais.alunos_participantes}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      de {apiData.estatisticas_gerais.total_alunos} total
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Target className="h-4 w-4 text-purple-600" />
                      Média Geral
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      {apiData.estatisticas_gerais.media_nota_geral.toFixed(1)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Nota média
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Award className="h-4 w-4 text-orange-600" />
                      Proficiência Geral
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {apiData.estatisticas_gerais.media_proficiencia_geral.toFixed(1)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Proficiência média
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Gráficos */}
              {(() => {
                const shouldShowCharts = chartData && chartData.averageScoreData && chartData.averageScoreData.length > 0;
                console.log('Condição para mostrar gráficos:', {
                  chartData: !!chartData,
                  averageScoreData: !!chartData?.averageScoreData,
                  averageScoreDataLength: chartData?.averageScoreData?.length,
                  shouldShowCharts
                });
                return shouldShowCharts;
              })() && (
                <div className="space-y-6">
                  {/* Gráficos de Médias */}
                  <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                      <CardContent className="pt-6">
                        <BarChartComponent
                          data={chartData.averageScoreData}
                          title="Média de Nota"
                          subtitle="Média de Nota (Geral + Disciplinas)"
                          color="#22c55e"
                          yAxisDomain={[0, 10]}
                          yAxisLabel="Nota"
                        />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <BarChartComponent
                          data={chartData.averageProficiencyData}
                          title="Média de Proficiência"
                          subtitle="Média de Proficiência (Geral + Disciplinas)"
                          color="#15803d"
                          yAxisDomain={[0, chartData.proficiencyMax]}
                          yAxisLabel="Proficiência"
                        />
                      </CardContent>
                    </Card>
                  </div>

                  {/* Gráficos de Distribuição */}
                  {chartData.distributionData && chartData.distributionData.length > 0 && (
                    <div className="grid gap-6 md:grid-cols-2">
                      {chartData.distributionData.map((item, index) => (
                        <Card key={index}>
                          <CardContent className="pt-6">
                            <DonutChartComponent
                              data={item.data}
                              title={item.disciplina.toUpperCase()}
                              subtitle="Distribuição de Desempenho"
                            />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

                        {/* Aba Proficiência */}
            <TabsContent value="proficiencia" className="space-y-6 mt-6">
              {/* ✅ NOVO: Loading state para dados dos alunos */}
              {isLoadingStudents && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mb-4" />
                    <p className="text-gray-600">Carregando dados dos alunos...</p>
                  </CardContent>
                </Card>
              )}

              {/* ✅ NOVO: Mensagem quando não há dados da tabela detalhada */}
              {!isLoadingStudents && (!tabelaDetalhada || !tabelaDetalhada.disciplinas || tabelaDetalhada.disciplinas.length === 0) && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <Users className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Nenhum dado encontrado
                    </h3>
                    <p className="text-gray-600 text-center max-w-md">
                      {selectedEvaluation === 'all' 
                        ? 'Selecione uma avaliação para ver os dados dos alunos.'
                        : 'Não há dados registrados nesta avaliação ou os dados ainda estão sendo carregados.'
                      }
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* ✅ NOVO: Tabelas separadas por disciplina */}
              {!isLoadingStudents && tabelaDetalhada && tabelaDetalhada.disciplinas && tabelaDetalhada.disciplinas.length > 0 && (
                <>
                  {tabelaDetalhada.disciplinas.map((disciplina: any, discIndex: number) => {
                    // ✅ Calcular % da turma para cada questão desta disciplina
                    const calculateDisciplinaClassPercentage = (questaoNumero: number) => {
                      if (!disciplina.alunos || disciplina.alunos.length === 0) return 0;
                      
                      let correctAnswers = 0;
                      let totalAnswers = 0;
                      
                      disciplina.alunos.forEach((aluno: any) => {
                        const resposta = aluno.respostas_por_questao?.find((r: any) => r.questao === questaoNumero);
                        if (resposta && resposta.respondeu) {
                          totalAnswers++;
                          if (resposta.acertou) {
                            correctAnswers++;
                          }
                        }
                      });
                      
                      return totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;
                    };

                    // ✅ Verificar se aluno acertou questão específica desta disciplina
                    const getStudentDisciplinaQuestionResult = (alunoId: string, questaoNumero: number) => {
                      const aluno = disciplina.alunos.find((a: any) => a.id === alunoId);
                      if (!aluno) return { isCorrect: false, isBlank: true };
                      
                      const resposta = aluno.respostas_por_questao?.find((r: any) => r.questao === questaoNumero);
                      if (!resposta) return { isCorrect: false, isBlank: true };
                      
                      return {
                        isCorrect: resposta.acertou,
                        isBlank: !resposta.respondeu
                      };
                    };

                    return (
                      <Card key={disciplina.id || discIndex}>
                        <CardHeader>
                          <CardTitle className="text-lg text-center">
                            {disciplina.nome}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 pt-0">
                          {disciplina.alunos && disciplina.alunos.length > 0 && disciplina.questoes && disciplina.questoes.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse border border-gray-300">
                                <thead>
                                  {/* Header principal */}
                                  <tr className="bg-gray-50">
                                    <th className="border border-gray-300 px-3 py-2 text-left font-medium text-gray-700">
                                      Aluno
                                    </th>
                                    {disciplina.questoes.map((questao: any) => (
                                      <th key={questao.numero} className="border border-gray-300 px-2 py-2 text-center font-medium text-gray-700 min-w-[60px]">
                                        Q{questao.numero}
                                      </th>
                                    ))}
                                    <th className="border border-gray-300 px-3 py-2 text-center font-medium text-gray-700">
                                      Total
                                    </th>
                                    <th className="border border-gray-300 px-3 py-2 text-center font-medium text-gray-700">
                                      Nota
                                    </th>
                                    <th className="border border-gray-300 px-3 py-2 text-center font-medium text-gray-700">
                                      Proficiência
                                    </th>
                                    <th className="border border-gray-300 px-3 py-2 text-center font-medium text-gray-700">
                                      Nível
                                    </th>
                                  </tr>
                                  
                                  {/* Sub-header: Habilidades */}
                                  <tr className="bg-blue-50">
                                    <th className="border border-gray-300 px-3 py-2 text-left font-medium text-blue-700">
                                      Habilidade
                                    </th>
                                    {disciplina.questoes.map((questao: any) => (
                                      <th key={questao.numero} className="border border-gray-300 px-2 py-2 text-center font-medium text-blue-700 text-xs">
                                        {questao.codigo_habilidade !== 'N/A' ? questao.codigo_habilidade : questao.habilidade}
                                      </th>
                                    ))}
                                    <th className="border border-gray-300 px-3 py-2 text-center font-medium text-blue-700">
                                      -
                                    </th>
                                    <th className="border border-gray-300 px-3 py-2 text-center font-medium text-blue-700">
                                      -
                                    </th>
                                    <th className="border border-gray-300 px-3 py-2 text-center font-medium text-blue-700">
                                      -
                                    </th>
                                    <th className="border border-gray-300 px-3 py-2 text-center font-medium text-blue-700">
                                      -
                                    </th>
                                  </tr>
                                  
                                  {/* Sub-header: % da Turma */}
                                  <tr className="bg-green-50">
                                    <th className="border border-gray-300 px-3 py-2 text-left font-medium text-green-700">
                                      % Turma
                                    </th>
                                    {disciplina.questoes.map((questao: any) => {
                                      const classPercentage = calculateDisciplinaClassPercentage(questao.numero);
                                      return (
                                        <th key={questao.numero} className="border border-gray-300 px-2 py-2 text-center font-medium text-green-700 text-xs">
                                          {classPercentage}%
                                        </th>
                                      );
                                    })}
                                    <th className="border border-gray-300 px-3 py-2 text-center font-medium text-green-700">
                                      -
                                    </th>
                                    <th className="border border-gray-300 px-3 py-2 text-center font-medium text-green-700">
                                      -
                                    </th>
                                    <th className="border border-gray-300 px-3 py-2 text-center font-medium text-green-700">
                                      -
                                    </th>
                                    <th className="border border-gray-300 px-3 py-2 text-center font-medium text-green-700">
                                      -
                                    </th>
                                  </tr>
                                </thead>
                                
                                <tbody>
                                  {disciplina.alunos.map((aluno: any) => (
                                    <tr key={aluno.id} className="hover:bg-gray-50">
                                      {/* Nome do Aluno */}
                                      <td className="border border-gray-300 px-3 py-2 font-medium text-gray-900">
                                        {aluno.nome}
                                      </td>
                                      
                                      {/* Resultados por Questão */}
                                      {disciplina.questoes.map((questao: any) => {
                                        const result = getStudentDisciplinaQuestionResult(aluno.id, questao.numero);
                                        return (
                                          <td key={questao.numero} className="border border-gray-300 px-2 py-2 text-center">
                                            {result.isCorrect ? (
                                              <span className="text-green-600 text-lg">✅</span>
                                            ) : (
                                              <span className="text-red-600 text-lg">❌</span>
                                            )}
                                          </td>
                                        );
                                      })}
                                      
                                      {/* Total de Acertos */}
                                      <td className="border border-gray-300 px-3 py-2 text-center font-medium">
                                        {aluno.total_acertos}
                                      </td>
                                      
                                      {/* Nota */}
                                      <td className="border border-gray-300 px-3 py-2 text-center font-medium">
                                        {aluno.nota.toFixed(1)}
                                      </td>
                                      
                                      {/* Proficiência */}
                                      <td className="border border-gray-300 px-3 py-2 text-center font-medium">
                                        {aluno.proficiencia}
                                      </td>
                                      
                                      {/* Nível */}
                                      <td className="border border-gray-300 px-3 py-2 text-center">
                                        <Badge 
                                          className={`${
                                            aluno.nivel_proficiencia === 'Abaixo do Básico' ? 'bg-red-100 text-red-800 border-red-300' :
                                            aluno.nivel_proficiencia === 'Básico' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                                            aluno.nivel_proficiencia === 'Adequado' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                            'bg-green-100 text-green-800 border-green-300'
                                          }`}
                                        >
                                          {aluno.nivel_proficiencia}
                                        </Badge>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <p className="text-gray-600">Nenhum dado encontrado para {disciplina.nome}</p>
                            </div>
                          )}
                          
                          {/* Legenda */}
                          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Legenda:</h4>
                            <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                              <div className="flex items-center gap-2">
                                <span className="text-green-600 text-lg">✅</span>
                                <span>Acertou a questão</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-red-600 text-lg">❌</span>
                                <span>Errou a questão</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </>
              )}
            </TabsContent>

            {/* Aba Ranking */}
            <TabsContent value="ranking" className="space-y-6 mt-6">
              {/* ✅ NOVO: Loading state para dados do ranking */}
              {isLoadingStudents && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mb-4" />
                    <p className="text-gray-600">Carregando ranking dos alunos...</p>
                  </CardContent>
                </Card>
              )}

              {/* ✅ NOVO: Mensagem quando não há dados para ranking */}
              {!isLoadingStudents && (!tabelaDetalhada || !tabelaDetalhada.disciplinas || tabelaDetalhada.disciplinas.length === 0) && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <Award className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Nenhum dado encontrado para ranking
                    </h3>
                    <p className="text-gray-600 text-center max-w-md">
                      {selectedEvaluation === 'all' 
                        ? 'Selecione uma avaliação para ver o ranking dos alunos.'
                        : 'Não há dados registrados nesta avaliação ou os dados ainda estão sendo carregados.'
                      }
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* ✅ NOVO: Ranking dos alunos */}
              {!isLoadingStudents && tabelaDetalhada && tabelaDetalhada.disciplinas && tabelaDetalhada.disciplinas.length > 0 && (
                <>
                  {/* Ranking Geral */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-xl font-bold text-gray-800">
                        Ranking Geral
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-300">
                          <thead>
                            <tr className="bg-yellow-500">
                              <th className="border border-gray-300 px-4 py-3 text-center font-bold text-gray-800">
                                #
                              </th>
                              <th className="border border-gray-300 px-4 py-3 text-left font-bold text-gray-800">
                                Aluno
                              </th>
                              <th className="border border-gray-300 px-4 py-3 text-center font-bold text-gray-800">
                                Acertos
                              </th>
                              <th className="border border-gray-300 px-4 py-3 text-center font-bold text-gray-800">
                                Nota
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              // ✅ Consolidar todos os alunos de todas as disciplinas
                              const todosAlunosRanking: Array<{
                                id: string;
                                nome: string;
                                escola: string;
                                serie: string;
                                turma: string;
                                total_acertos: number;
                                total_respondidas: number;
                                nota: number;
                                proficiencia: number;
                                nivel_proficiencia: string;
                              }> = [];

                              tabelaDetalhada.disciplinas.forEach((disciplina: any) => {
                                if (disciplina.alunos && Array.isArray(disciplina.alunos)) {
                                  disciplina.alunos.forEach((aluno: any) => {
                                    // ✅ Verificar se o aluno já foi adicionado (evitar duplicatas)
                                    const alunoExistente = todosAlunosRanking.find(a => a.id === aluno.id);
                                    if (!alunoExistente) {
                                      todosAlunosRanking.push({
                                        id: aluno.id,
                                        nome: aluno.nome,
                                        escola: aluno.escola || 'Escola não informada',
                                        serie: aluno.serie || 'Série não informada',
                                        turma: aluno.turma || 'Turma não informada',
                                        total_acertos: aluno.total_acertos || 0,
                                        total_respondidas: aluno.total_respondidas || 0,
                                        nota: aluno.nota || 0,
                                        proficiencia: aluno.proficiencia || 0,
                                        nivel_proficiencia: aluno.nivel_proficiencia || 'Adequado'
                                      });
                                    }
                                  });
                                }
                              });

                              // ✅ Ordenar por nota (decrescente) e depois por acertos (decrescente)
                              const rankingOrdenado = todosAlunosRanking.sort((a, b) => {
                                if (b.nota !== a.nota) {
                                  return b.nota - a.nota;
                                }
                                return b.total_acertos - a.total_acertos;
                              });

                              // ✅ Retornar as linhas da tabela
                              return rankingOrdenado.map((aluno, index) => (
                                <tr key={aluno.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100`}>
                                  <td className="border border-gray-300 px-4 py-3 text-center font-bold text-orange-600">
                                    {index + 1}
                                  </td>
                                  <td className="border border-gray-300 px-4 py-3 font-medium text-gray-900">
                                    {aluno.nome.toUpperCase()}
                                  </td>
                                  <td className="border border-gray-300 px-4 py-3 text-center font-bold text-green-600">
                                    {aluno.total_acertos}
                                  </td>
                                  <td className="border border-gray-300 px-4 py-3 text-center font-bold text-blue-600">
                                    {aluno.nota.toFixed(2).replace('.', ',')}
                                  </td>
                                </tr>
                              ));
                            })()}
                          </tbody>
                        </table>
                      </div>

                      {/* ✅ Informações adicionais do ranking */}
                      {(() => {
                        const totalAlunos = tabelaDetalhada.disciplinas.reduce((total: number, disciplina: any) => {
                          return total + (disciplina.alunos?.length || 0);
                        }, 0);

                        const mediaGeral = tabelaDetalhada.disciplinas.reduce((total: number, disciplina: any) => {
                          return total + (disciplina.alunos?.reduce((sum: number, aluno: any) => sum + (aluno.nota || 0), 0) || 0);
                        }, 0) / totalAlunos;

                        return (
                          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="text-2xl font-bold text-blue-600">{totalAlunos}</div>
                              <div className="text-sm text-blue-700">Total de Alunos</div>
                            </div>
                            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                              <div className="text-2xl font-bold text-green-600">{mediaGeral.toFixed(2).replace('.', ',')}</div>
                              <div className="text-sm text-green-700">Média Geral</div>
                            </div>
                            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                              <div className="text-2xl font-bold text-purple-600">
                                {tabelaDetalhada.disciplinas.length}
                              </div>
                              <div className="text-sm text-purple-700">Disciplinas Avaliadas</div>
                            </div>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>

                  {/* ✅ Ranking por Disciplina */}
                  {tabelaDetalhada.disciplinas.map((disciplina: any, discIndex: number) => {
                    if (!disciplina.alunos || disciplina.alunos.length === 0) return null;

                    // ✅ Ordenar alunos desta disciplina por nota e acertos
                    const rankingDisciplina = [...disciplina.alunos].sort((a: any, b: any) => {
                      if (b.nota !== a.nota) {
                        return b.nota - a.nota;
                      }
                      return b.total_acertos - a.total_acertos;
                    });

                    return (
                      <Card key={`ranking-${disciplina.id || discIndex}`}>
                        <CardHeader>
                          <CardTitle className="text-lg text-center text-gray-700">
                            Ranking - {disciplina.nome}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 pt-0">
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-300">
                              <thead>
                                <tr className="bg-blue-500">
                                  <th className="border border-gray-300 px-4 py-3 text-center font-bold text-white">
                                    #
                                  </th>
                                  <th className="border border-gray-300 px-4 py-3 text-left font-bold text-white">
                                    Aluno
                                  </th>
                                  <th className="border border-gray-300 px-4 py-3 text-center font-bold text-white">
                                    Acertos
                                  </th>
                                  <th className="border border-gray-300 px-4 py-3 text-center font-bold text-white">
                                    Nota
                                  </th>
                                  <th className="border border-gray-300 px-4 py-3 text-center font-bold text-white">
                                    Proficiência
                                  </th>
                                  <th className="border border-gray-300 px-4 py-3 text-center font-bold text-white">
                                    Nível
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {rankingDisciplina.map((aluno: any, index: number) => (
                                  <tr key={aluno.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100`}>
                                    <td className="border border-gray-300 px-4 py-3 text-center font-bold text-blue-600">
                                      {index + 1}
                                    </td>
                                    <td className="border border-gray-300 px-4 py-3 font-medium text-gray-900">
                                      {aluno.nome.toUpperCase()}
                                    </td>
                                    <td className="border border-gray-300 px-4 py-3 text-center font-bold text-green-600">
                                      {aluno.total_acertos}
                                    </td>
                                    <td className="border border-gray-300 px-4 py-3 text-center font-bold text-purple-600">
                                      {aluno.nota.toFixed(2).replace('.', ',')}
                                    </td>
                                    <td className="border border-gray-300 px-4 py-3 text-center font-medium">
                                      {aluno.proficiencia}
                                    </td>
                                    <td className="border border-gray-300 px-4 py-3 text-center">
                                      <Badge 
                                        className={`${
                                          aluno.nivel_proficiencia === 'Abaixo do Básico' ? 'bg-red-100 text-red-800 border-red-300' :
                                          aluno.nivel_proficiencia === 'Básico' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                                          aluno.nivel_proficiencia === 'Adequado' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                          'bg-green-100 text-green-800 border-green-300'
                                        }`}
                                      >
                                        {aluno.nivel_proficiencia}
                                      </Badge>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* ✅ Estatísticas da disciplina */}
                          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="text-lg font-bold text-blue-600">{disciplina.alunos.length}</div>
                              <div className="text-xs text-blue-700">Alunos</div>
                            </div>
                            <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                              <div className="text-lg font-bold text-green-600">
                                {(disciplina.alunos.reduce((sum: number, aluno: any) => sum + (aluno.nota || 0), 0) / disciplina.alunos.length).toFixed(2).replace('.', ',')}
                              </div>
                              <div className="text-xs text-green-700">Média</div>
                            </div>
                            <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                              <div className="text-lg font-bold text-orange-600">
                                {disciplina.alunos.reduce((sum: number, aluno: any) => sum + (aluno.total_acertos || 0), 0)}
                              </div>
                              <div className="text-xs text-orange-700">Total Acertos</div>
                            </div>
                            <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                              <div className="text-lg font-bold text-purple-600">
                                {disciplina.questoes?.length || 0}
                              </div>
                              <div className="text-xs text-purple-700">Questões</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
} 