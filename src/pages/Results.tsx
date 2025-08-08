import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Filter
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EvaluationResultsApiService } from "@/services/evaluationResultsApi";
import { useAuth } from "@/context/authContext";
import { BarChartComponent, DonutChartComponent } from "@/components/ui/charts";

// Interfaces para os dados da API
interface EvaluationResult {
  id: string;
  titulo: string;
  disciplina: string;
  curso: string;
  serie: string;
  turma?: string;
  escola: string;
  municipio: string;
  estado?: string;
  data_aplicacao: string;
  data_correcao?: string;
  status: 'concluida' | 'em_andamento' | 'pendente' | string;
  total_alunos: number;
  alunos_participantes: number;
  alunos_pendentes?: number;
  alunos_ausentes?: number;
  media_nota: number;
  media_proficiencia: number;
  distribuicao_classificacao: {
    abaixo_do_basico: number;
    basico: number;
    adequado: number;
    avancado: number;
  };
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
    total_avaliacoes: number;
    total_alunos: number;
    alunos_participantes: number;
    alunos_pendentes: number;
    alunos_ausentes: number;
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
    maximo_alcancado?: boolean;
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



// Mapa de status estático (fora do componente)
const getStatusConfig = (status: EvaluationResult['status']) => {
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


  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

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
      const response = await EvaluationResultsApiService.getEvaluationsList(currentPage, perPage, filters);

      // LOG desativado em produção; habilite se necessário
      // console.debug('Resultados - filtros aplicados:', filters, 'resposta:', response);

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
            paginacao: response.resultados_detalhados?.paginacao || {
              page: currentPage,
              per_page: perPage,
              total: 0,
              total_pages: 0
            }
          },
          opcoes_proximos_filtros: response.opcoes_proximos_filtros || {}
        };

        setApiData(normalizedResponse);
      } else {
        setApiData(null);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados. Tente novamente.",
        variant: "destructive",
      });
      setApiData(null);
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
    toast
  ]);

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
          evaluation.status === 'concluida' ? 'Concluída' : evaluation.status === 'em_andamento' ? 'Em Andamento' : 'Pendente'
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

  // Preparar dados para os gráficos
  const prepareChartData = () => {
    if (!apiData) return null;

    // Verificar se os dados necessários existem
    if (!apiData.estatisticas_gerais || !apiData.resultados_por_disciplina) {
      console.warn('Dados incompletos para gráficos:', apiData);
      return null;
    }

    // Dados para gráfico de médias de nota
    const averageScoreData = [
      { name: "Geral", value: apiData.estatisticas_gerais.media_nota_geral || 0 },
      ...apiData.resultados_por_disciplina.map(item => ({
        name: item.disciplina.toUpperCase(),
        value: item.media_nota || 0
      }))
    ];

    // Dados para gráfico de médias de proficiência
    const averageProficiencyData = [
      { name: "Geral", value: apiData.estatisticas_gerais.media_proficiencia_geral || 0 },
      ...apiData.resultados_por_disciplina.map(item => ({
        name: item.disciplina.toUpperCase(),
        value: item.media_proficiencia || 0
      }))
    ];

    // Dados para gráficos de distribuição por disciplina
    const distributionData = apiData.resultados_por_disciplina.map(item => ({
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

  return {
      averageScoreData,
      averageProficiencyData,
    distributionData,
    proficiencyMax,
    };
  };

  const chartData = useMemo(prepareChartData, [apiData, inferStageGroup, getMaxForDiscipline]);

  // Contar filtros selecionados
  const selectedFiltersCount = [
    selectedState !== 'all',
    selectedMunicipality !== 'all',
    selectedEvaluation !== 'all'
  ].filter(Boolean).length;

  // ✅ NOVO: Verificar se todos os filtros obrigatórios estão selecionados
  const allRequiredFiltersSelected = selectedFiltersCount === 3;

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
                Nível: {apiData.nivel_granularidade ? apiData.nivel_granularidade.charAt(0).toUpperCase() + apiData.nivel_granularidade.slice(1) : 'Município'}
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
                     {/* ✅ NOVO: Verificar se há avaliações antes de mostrar gráficos e estatísticas */}
           {(() => {
             const avaliacoesLength = apiData.resultados_detalhados?.avaliacoes?.length || 0;
             const totalAvaliacoes = apiData.estatisticas_gerais?.total_avaliacoes || 0;
             const totalAlunos = apiData.estatisticas_gerais?.total_alunos || 0;

             return avaliacoesLength === 0 || totalAvaliacoes === 0 || totalAlunos === 0;
           })() ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <FileX className="h-8 w-8 text-gray-400" />
                </div>
                                 <h3 className="text-lg font-medium text-gray-900 mb-2">
                   Nenhum resultado para mostrar
                 </h3>
                 <p className="text-gray-600">
                   Não foram encontrados resultados para os filtros selecionados.
                 </p>
              </CardContent>
            </Card>
          ) : (
            <>
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
              {chartData && chartData.averageScoreData && chartData.averageScoreData.length > 0 && (
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

                             {/* Lista de Avaliações */}
               {(() => {
                 const avaliacoesLength = apiData.resultados_detalhados?.avaliacoes?.length || 0;
                 const totalAvaliacoes = apiData.estatisticas_gerais?.total_avaliacoes || 0;
                 const totalAlunos = apiData.estatisticas_gerais?.total_alunos || 0;

                 return avaliacoesLength > 0 && totalAvaliacoes > 0 && totalAlunos > 0;
               })() ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Avaliações Detalhadas</span>
                      <Badge variant="outline">
                          {(apiData.resultados_detalhados?.paginacao?.total || apiData.resultados_detalhados?.avaliacoes?.length || 0)} avaliações
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {(apiData.resultados_detalhados?.avaliacoes || []).map((evaluation, index) => {
                        const statusConfig = getStatusConfig(evaluation.status);
                        const participationRate = evaluation.total_alunos > 0
                          ? (evaluation.alunos_participantes / evaluation.total_alunos) * 100
                          : 0;

                        return (
                          <div key={`${evaluation.id}-${index}`} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                              {/* Informações principais */}
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-lg">{evaluation.titulo}</h3>
                                  <Badge className={statusConfig.color}>
                                    {statusConfig.label}
                                  </Badge>
                                </div>

                                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Badge variant="outline">{evaluation.disciplina || 'Sem disciplina'}</Badge>
                                    <span>•</span>
                                    <span>{evaluation.serie || 'Sem série'}</span>
                                    <span>•</span>
                                    <span>{evaluation.turma || 'Sem turma'}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <School className="h-4 w-4" />
                                    <span>{evaluation.escola || 'Sem escola'}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    <span>{evaluation.municipio || 'Sem município'}, {evaluation.estado || 'Sem estado'}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-6">
                                  <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">
                                      {evaluation.alunos_participantes}/{evaluation.total_alunos} alunos
                                    </span>
                                    <Progress value={participationRate} className="w-20 h-2" />
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <Target className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">
                                      Média: {evaluation.media_nota.toFixed(1)}
                                    </span>
                                    {evaluation.media_nota >= 7 ? (
                                      <TrendingUp className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                                    )}
                                  </div>

                                  {(() => {
                                    const d = new Date(evaluation.data_aplicacao);
                                    if (isNaN(d.getTime())) return null;
                                    return (
                                      <div className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(d, { addSuffix: true, locale: ptBR })}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>

                              {/* Ações */}
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() => handleViewResults(evaluation.id)}
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    handleViewResultsInNewTab(evaluation.id);
                                  }}
                                  title="Clique esquerdo: abrir na mesma guia | Clique direito: abrir em nova guia"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver Resultados
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <FileText className="h-8 w-8 text-gray-400" />
                    </div>
                                         <h3 className="text-lg font-medium text-gray-900 mb-2">
                       Nenhum resultado para mostrar
                     </h3>
                     <p className="text-gray-600 text-center max-w-md">
                       Não foram encontrados resultados para os filtros selecionados. Tente ajustar os filtros ou verificar se existem dados cadastrados para esta seleção.
                     </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
} 