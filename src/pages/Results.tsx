import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Download,
  TrendingUp,
  Users,
  FileText,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Target,
  Award,
  RefreshCw,
  Search,
  School,
  MapPin,
  GraduationCap,
  BarChart3,
  Filter
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EvaluationResultsApiService } from "@/services/evaluationResultsApi";
import { useAuth } from "@/context/authContext";
import { BarChartComponent, DonutChartComponent } from "@/components/ui/charts";

// Interfaces para os dados da API
interface EvaluationResult {
  id: string;
  class_test_id?: string;
  titulo: string;
  disciplina: string;
  curso: string;
  serie: string;
  grade_id?: string;
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

interface MunicipioGeral {
  nome: string;
  estado: string;
  total_escolas: number;
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
}

interface ResultadoPorDisciplina {
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
}

interface ApiResponse {
  municipio_geral: MunicipioGeral;
  resultados_por_disciplina: ResultadoPorDisciplina[];
  resultados_detalhados: {
    data: EvaluationResult[];
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}

// Interfaces para os filtros
interface State {
  id: string;
  name: string;
  uf: string;
}

interface Municipality {
  id: string;
  name: string;
  state: string;
  created_at: string;
}

interface School {
  id: string;
  name: string;
  city: {
    id: string;
    name: string;
    state: string;
  };
  students_count: number;
  classes_count: number;
}

interface Grade {
  id: string;
  name: string;
  education_stage_id: string;
  education_stage: {
    id: string;
    name: string;
  };
}

interface Class {
  id: string;
  name: string;
  school: {
    id: string;
    name: string;
  };
  grade: {
    id: string;
    name: string;
  };
}

// ✅ NOVO: Interface para avaliações da escola
interface SchoolEvaluation {
  id: string;
  titulo: string;
  disciplina: string;
  status: string;
  data_aplicacao: string;
}

export default function Results() {
  const { id: evaluationId } = useParams<{ id: string }>();
  const { user, autoLogin } = useAuth();
  const [apiData, setApiData] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Estados dos filtros
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('all');
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  // ✅ NOVO: Estado para avaliação selecionada
  const [selectedEvaluation, setSelectedEvaluation] = useState<string>('all');

  // Estados dos dados dos filtros
  const [states, setStates] = useState<State[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  // ✅ NOVO: Estado para avaliações da escola
  const [schoolEvaluations, setSchoolEvaluations] = useState<SchoolEvaluation[]>([]);

  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

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
  }, [autoLogin]);

  // Carregar filtros iniciais
  const loadInitialFilters = async () => {
    try {
      setIsLoadingFilters(true);
      const [statesData, gradesData] = await Promise.all([
        EvaluationResultsApiService.getStates(),
        EvaluationResultsApiService.getGrades()
      ]);

      setStates(statesData);
      setGrades(gradesData);
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
  };

  // Carregar municípios quando estado for selecionado
  useEffect(() => {
    const loadMunicipalities = async () => {
      if (selectedState !== 'all') {
        try {
          setIsLoadingFilters(true);
          const municipalitiesData = await EvaluationResultsApiService.getMunicipalitiesByState(selectedState);
          setMunicipalities(municipalitiesData);
          // Resetar seleções dependentes
          setSelectedMunicipality('all');
          setSelectedSchool('all');
          setSelectedClass('all');
          setSchools([]);
          setClasses([]);
          // ✅ NOVO: Resetar avaliação também
          setSelectedEvaluation('all');
          setSchoolEvaluations([]);
        } catch (error) {
          console.error("Erro ao carregar municípios:", error);
        } finally {
          setIsLoadingFilters(false);
        }
      } else {
        setMunicipalities([]);
        setSelectedMunicipality('all');
        setSelectedSchool('all');
        setSelectedClass('all');
        setSchools([]);
        setClasses([]);
        // ✅ NOVO: Resetar avaliação também
        setSelectedEvaluation('all');
        setSchoolEvaluations([]);
      }
    };

    loadMunicipalities();
  }, [selectedState]);

  // Carregar escolas quando município for selecionado
  useEffect(() => {
    const loadSchools = async () => {
      if (selectedMunicipality !== 'all') {
        try {
          setIsLoadingFilters(true);
          const schoolsData = await EvaluationResultsApiService.getSchoolsByCity(selectedMunicipality);
          setSchools(schoolsData);
          // Resetar seleções dependentes
          setSelectedSchool('all');
          setSelectedClass('all');
          setClasses([]);
          // ✅ NOVO: Resetar avaliação também
          setSelectedEvaluation('all');
          setSchoolEvaluations([]);
        } catch (error) {
          console.error("Erro ao carregar escolas:", error);
        } finally {
          setIsLoadingFilters(false);
        }
      } else {
        setSchools([]);
        setSelectedSchool('all');
        setSelectedClass('all');
        setClasses([]);
        // ✅ NOVO: Resetar avaliação também
        setSelectedEvaluation('all');
        setSchoolEvaluations([]);
      }
    };

    loadSchools();
  }, [selectedMunicipality]);

  // Carregar turmas quando escola for selecionada
  useEffect(() => {
    const loadClasses = async () => {
      if (selectedSchool !== 'all') {
        try {
          setIsLoadingFilters(true);
          const classesData = await EvaluationResultsApiService.getClassesBySchool(selectedSchool);
          setClasses(classesData);
          setSelectedClass('all');
        } catch (error) {
          console.error("Erro ao carregar turmas:", error);
        } finally {
          setIsLoadingFilters(false);
        }
      } else {
        setClasses([]);
        setSelectedClass('all');
      }
    };

    loadClasses();
  }, [selectedSchool]);

  // ✅ NOVO: Carregar avaliações quando escola for selecionada
  useEffect(() => {
    const loadEvaluations = async () => {
      if (selectedSchool !== 'all') {
        try {
          setIsLoadingFilters(true);

          const evaluationsData = await EvaluationResultsApiService.getEvaluationsBySchool(selectedSchool);

          // ✅ CORREÇÃO: Garantir que seja sempre um array
          const finalData = Array.isArray(evaluationsData) ? evaluationsData : [];

          setSchoolEvaluations(finalData);
          setSelectedEvaluation('all');

        } catch (error) {
          console.error("❌ ERRO ao carregar avaliações:", error);
          setSchoolEvaluations([]);
        } finally {
          setIsLoadingFilters(false);
        }
      } else {
        setSchoolEvaluations([]);
        setSelectedEvaluation('all');
      }
    };

    loadEvaluations();
  }, [selectedSchool]);

  // Carregar dados quando filtros mudarem
  useEffect(() => {
    if (!isLoading) {
      loadData();
    }
  }, [selectedState, selectedMunicipality, selectedSchool, selectedGrade, selectedClass, selectedEvaluation, currentPage, perPage]);

  const loadData = async () => {
    // Verificar se pelo menos 2 filtros estão selecionados
    const selectedFilters = [
      selectedState !== 'all',
      selectedMunicipality !== 'all',
      selectedSchool !== 'all',
      selectedGrade !== 'all',
      selectedClass !== 'all',
      selectedEvaluation !== 'all'
    ].filter(Boolean);

    if (selectedFilters.length < 2) {
      setApiData(null);
      return;
    }

    try {
      setIsLoadingData(true);
      const filters = {
        estado: selectedState !== 'all' ? selectedState : undefined,
        municipio: selectedMunicipality !== 'all' ? selectedMunicipality : undefined,
        escola: selectedSchool !== 'all' ? selectedSchool : undefined,
        serie: selectedGrade !== 'all' ? selectedGrade : undefined,
        turma: selectedClass !== 'all' ? selectedClass : undefined,
        // ✅ NOVO: Adicionar filtro de avaliação
        avaliacao: selectedEvaluation !== 'all' ? selectedEvaluation : undefined,
      };

      const response = await EvaluationResultsApiService.getEvaluationsList(currentPage, perPage, filters);

      // ✅ LOG: Mostrar como os dados estão sendo processados no componente
      console.log('🎯 LOG - Dados processados no componente Results:');
      console.log('🔧 Filtros aplicados:', filters);
      console.log('📥 Resposta da API:', response);
      console.log('📊 Tipo da resposta:', typeof response);
      console.log('🏗️ Estrutura da resposta:', response ? Object.keys(response) : 'null');

      setApiData(response as any);
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
  };

  const handleViewResults = (evaluationId: string) => {
    navigate(`/app/avaliacao/${evaluationId}/resultados-detalhados`);
  };

  const handleExportResults = async () => {
    try {
      const XLSX = await import('xlsx');
      const { saveAs } = await import('file-saver');

      if (!apiData || !apiData.resultados_detalhados.data.length) {
        toast({
          title: "Nenhum dado para exportar",
          description: "Não há avaliações para gerar a planilha",
          variant: "destructive",
        });
        return;
      }

      const worksheetData = [
        ['Avaliação', 'Disciplina', 'Escola', 'Série', 'Turma', 'Município', 'Estado', 'Participantes', 'Média', 'Proficiência', 'Status'],
        ...apiData.resultados_detalhados.data.map(evaluation => [
          evaluation.titulo,
          evaluation.disciplina,
          evaluation.escola,
          evaluation.serie,
          evaluation.turma,
          evaluation.municipio,
          evaluation.estado,
          `${evaluation.alunos_participantes}/${evaluation.total_alunos}`,
          evaluation.media_nota.toFixed(1),
          evaluation.media_proficiencia.toFixed(1),
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

  const getStatusConfig = (status: EvaluationResult['status']) => {
    const configs = {
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
        color: "bg-yellow-100 text-yellow-800 border-yellow-300"
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
        color: "bg-yellow-100 text-yellow-800 border-yellow-300"
      }
    };

    const config = configs[status] || {
      label: "Desconhecido",
      color: "bg-gray-100 text-gray-800 border-gray-300"
    };

    return config;
  };

  // Preparar dados para os gráficos
  const prepareChartData = () => {
    if (!apiData) return null;

    // Verificar se os dados necessários existem
    if (!apiData.municipio_geral || !apiData.resultados_por_disciplina) {
      console.warn('Dados incompletos para gráficos:', apiData);
      return null;
    }

    // Dados para gráfico de médias de nota
    const averageScoreData = [
      { name: "Geral", value: apiData.municipio_geral.media_nota_geral || 0 },
      ...apiData.resultados_por_disciplina.map(item => ({
        name: item.disciplina.toUpperCase(),
        value: item.media_nota || 0
      }))
    ];

    // Dados para gráfico de médias de proficiência
    const averageProficiencyData = [
      { name: "Geral", value: apiData.municipio_geral.media_proficiencia_geral || 0 },
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

    return {
      averageScoreData,
      averageProficiencyData,
      distributionData
    };
  };

  const chartData = prepareChartData();

  // Contar filtros selecionados
  const selectedFiltersCount = [
    selectedState !== 'all',
    selectedMunicipality !== 'all',
    selectedSchool !== 'all',
    selectedGrade !== 'all',
    selectedClass !== 'all',
    selectedEvaluation !== 'all'
  ].filter(Boolean).length;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Resultados das Avaliações</h1>
          <p className="text-muted-foreground">
            Acompanhe o desempenho das avaliações e gere relatórios
          </p>
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

            {/* Escola */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Escola</label>
              <Select
                value={selectedSchool}
                onValueChange={setSelectedSchool}
                disabled={isLoadingFilters || selectedMunicipality === 'all'}
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

            {/* ✅ NOVO: Avaliações */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Avaliações</label>
              <Select
                value={selectedEvaluation}
                onValueChange={setSelectedEvaluation}
                disabled={isLoadingFilters || selectedSchool === 'all'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a avaliação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {(() => {
                    if (!Array.isArray(schoolEvaluations)) {
                      console.error('❌ ERRO: schoolEvaluations não é array no render');
                      return null;
                    }

                    return schoolEvaluations.map(evaluation => {
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

            {/* Série */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Série</label>
              <Select
                value={selectedGrade}
                onValueChange={setSelectedGrade}
                disabled={isLoadingFilters}
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
                disabled={isLoadingFilters || selectedSchool === 'all'}
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
              💡 Selecione no mínimo dois filtros para visualizar os dados.
              {selectedFiltersCount > 0 && (
                <span className="ml-2 font-medium">
                  Filtros selecionados: {selectedFiltersCount}
                </span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Mensagem quando não há filtros suficientes */}
      {selectedFiltersCount < 2 && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Filter className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Selecione no mínimo dois filtros para continuar
            </h3>
            <p className="text-gray-600 text-center max-w-md">
              Para visualizar os resultados das avaliações, você precisa selecionar pelo menos dois filtros (Estado, Município, Escola, Avaliações, Série ou Turma).
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading dos dados */}
      {selectedFiltersCount >= 2 && isLoadingData && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600">Carregando dados...</p>
          </CardContent>
        </Card>
      )}

      {/* Gráficos e Dados */}
      {selectedFiltersCount >= 2 && !isLoadingData && apiData && (
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
                  {apiData.municipio_geral.total_avaliacoes}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {apiData.municipio_geral.total_escolas} escolas
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
                  {apiData.municipio_geral.alunos_participantes}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  de {apiData.municipio_geral.total_alunos} total
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
                  {apiData.municipio_geral.media_nota_geral.toFixed(1)}
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
                  {apiData.municipio_geral.media_proficiencia_geral.toFixed(1)}
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
                      yAxisDomain={[0, 1000]}
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
          {apiData.resultados_detalhados.data.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Avaliações Detalhadas</span>
                  <Badge variant="outline">
                    {apiData.resultados_detalhados.total} avaliações
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {apiData.resultados_detalhados.data.map((evaluation, index) => {
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
                                <Badge variant="outline">{evaluation.disciplina}</Badge>
                                <span>•</span>
                                <span>{evaluation.serie}</span>
                                <span>•</span>
                                <span>{evaluation.turma}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <School className="h-4 w-4" />
                                <span>{evaluation.escola}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                <span>{evaluation.municipio}, {evaluation.estado}</span>
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

                              <div className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(evaluation.data_aplicacao), {
                                  addSuffix: true,
                                  locale: ptBR
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Ações */}
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => handleViewResults(evaluation.id)}
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
          )}
        </>
      )}
    </div>
  );
} 