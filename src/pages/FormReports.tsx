import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  BarChart3,
  Users, 
  FileText,
  Filter,
  AlertTriangle,
  TrendingDown,
  WifiOff,
  UserX,
  School,
  ChevronLeft,
  ChevronRight,
  Loader2,
  GraduationCap
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { FormFiltersApiService } from '@/services/formFiltersApi';
import { FormMultiSelect } from '@/components/ui/form-multi-select';
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  LabelList
} from 'recharts';

// Interfaces
interface State {
  id: string;
  name: string;
  uf: string;
}

interface Municipality {
  id: string;
  name: string;
  state: string;
}

interface School {
  id: string;
  name: string;
}

interface Grade {
  id: string;
  name: string;
}

interface Class {
  id: string;
  name: string;
}

interface Student {
  alunoId: string;
  alunoNome: string;
  userId: string;
  dataNascimento?: string;
  escolaId: string;
  escolaNome: string;
  gradeId: string;
  gradeName: string;
  classId?: string;
  className?: string;
  resposta?: string;
}

interface IndexData {
  total: number;
  porcentagem: number;
  alunos: {
    data: Student[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

interface ProfileQuestion {
  textoPergunta: string;
  tipo: string;
  contagem: Record<string, number>;
  totalRespostas: number;
  subperguntas?: Record<string, {
    texto: string;
    contagem: Record<string, number>;
  }>;
}

interface ProfileData {
  nome: string;
  questoes: string[];
  dados: Record<string, ProfileQuestion>;
}

const FormReports = () => {
  const { toast } = useToast();

  // Estados dos filtros
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('all');
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  // Estados dos dados dos filtros
  const [states, setStates] = useState<State[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);

  // Estados de loading
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);

  // Dados do relatório
  const [indicesData, setIndicesData] = useState<any>(null);
  const [profilesData, setProfilesData] = useState<any>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [pollingTaskId, setPollingTaskId] = useState<string | null>(null);
  const [filterDebounce, setFilterDebounce] = useState<NodeJS.Timeout | null>(null);

  // Aba ativa dos perfis
  const [activeTab, setActiveTab] = useState<string>('perfilDemografico');

  // Modal de alunos
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [selectedIndexType, setSelectedIndexType] = useState<string>('');
  const [currentStudentPage, setCurrentStudentPage] = useState(1);
  const [studentsData, setStudentsData] = useState<Student[]>([]);
  const [studentsPagination, setStudentsPagination] = useState<any>(null);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  // Carregar estados iniciais
  useEffect(() => {
    const loadInitialFilters = async () => {
      try {
        setIsLoadingFilters(true);
        const statesData = await FormFiltersApiService.getFormFilterStates();
        if (statesData && statesData.length > 0) {
          setStates(statesData.map(state => ({
            id: state.id,
            name: state.nome,
            uf: state.id
          })));
        }
      } catch (error) {
        console.error("Erro ao carregar filtros iniciais:", error);
        toast({
          title: "Erro ao carregar filtros",
          description: "Não foi possível carregar os filtros. Tente novamente.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingFilters(false);
      }
    };

    loadInitialFilters();
  }, [toast]);

  // Carregar municípios quando estado for selecionado
  useEffect(() => {
    const loadMunicipalities = async () => {
      if (selectedState !== 'all') {
        try {
          setIsLoadingFilters(true);
          setSelectedMunicipality('all');
          setSelectedSchools([]);
          setSelectedGrades([]);
          setSelectedClasses([]);
          
          const municipalitiesData = await FormFiltersApiService.getFormFilterMunicipalities(selectedState);
          setMunicipalities(municipalitiesData.map(municipality => ({
            id: municipality.id,
            name: municipality.nome,
            state: selectedState
          })));
        } catch (error) {
          console.error("Erro ao carregar municípios:", error);
          setMunicipalities([]);
        } finally {
          setIsLoadingFilters(false);
        }
      } else {
        setMunicipalities([]);
        setSelectedMunicipality('all');
        setSelectedSchools([]);
        setSelectedGrades([]);
        setSelectedClasses([]);
      }
    };

    loadMunicipalities();
  }, [selectedState]);

  // Carregar escolas quando município for selecionado
  useEffect(() => {
    const loadSchools = async () => {
      if (selectedState !== 'all' && selectedMunicipality !== 'all') {
        try {
          setIsLoadingFilters(true);
          const schoolsData = await FormFiltersApiService.getFormFilterSchools({
            estado: selectedState,
            municipio: selectedMunicipality
          });
          
          const uniqueSchoolsById = new Map<string, { id: string; name: string }>();
          const uniqueSchoolsByName = new Map<string, string>();
          
          schoolsData.forEach(school => {
            const schoolName = school.nome?.trim() || '';
            const normalizedName = schoolName.toLowerCase().trim();
            
            if (!uniqueSchoolsById.has(school.id) && !uniqueSchoolsByName.has(normalizedName)) {
              uniqueSchoolsById.set(school.id, {
                id: school.id,
                name: schoolName
              });
              uniqueSchoolsByName.set(normalizedName, school.id);
            }
          });
          
          const uniqueSchools = Array.from(uniqueSchoolsById.values()).sort((a, b) => 
            a.name.localeCompare(b.name)
          );
          
          setSchools(uniqueSchools);
        } catch (error) {
          console.error("Erro ao carregar escolas:", error);
          setSchools([]);
        } finally {
          setIsLoadingFilters(false);
        }
      } else {
        setSchools([]);
        setSelectedSchools([]);
      }
    };

    loadSchools();
  }, [selectedMunicipality, selectedState]);

  // Carregar séries quando escola(s) for(em) selecionada(s)
  useEffect(() => {
    const loadGrades = async () => {
      if (selectedState !== 'all' && selectedMunicipality !== 'all' && selectedSchools.length > 0) {
        try {
          setIsLoadingFilters(true);
          const allGradesById = new Map<string, { id: string; name: string }>();
          const allGradesByName = new Map<string, string>();
          
          for (const schoolId of selectedSchools) {
            try {
              const gradesData = await FormFiltersApiService.getFormFilterGrades({
                estado: selectedState,
                municipio: selectedMunicipality,
                escola: schoolId
              });
              gradesData.forEach(grade => {
                const gradeName = grade.nome?.trim() || '';
                const normalizedName = gradeName.toLowerCase().trim();
                
                if (!allGradesById.has(grade.id) && !allGradesByName.has(normalizedName)) {
                  allGradesById.set(grade.id, {
                    id: grade.id,
                    name: gradeName
                  });
                  allGradesByName.set(normalizedName, grade.id);
                }
              });
            } catch (error) {
              console.error(`Erro ao carregar séries da escola ${schoolId}:`, error);
            }
          }
          
          const uniqueGrades = Array.from(allGradesById.values()).sort((a, b) => 
            a.name.localeCompare(b.name)
          );
          
          setGrades(uniqueGrades);
        } catch (error) {
          console.error("Erro ao carregar séries:", error);
          setGrades([]);
        } finally {
          setIsLoadingFilters(false);
        }
      } else {
        setGrades([]);
      }
    };

    loadGrades();
  }, [selectedSchools, selectedState, selectedMunicipality]);

  // Carregar turmas quando série(s) for(em) selecionada(s)
  useEffect(() => {
    const loadClasses = async () => {
      if (selectedState !== 'all' && selectedMunicipality !== 'all' && selectedSchools.length > 0 && selectedGrades.length > 0) {
        try {
          setIsLoadingFilters(true);
          const allClassesById = new Map<string, { id: string; name: string }>();
          const allClassesByName = new Map<string, string>();
          
          for (const schoolId of selectedSchools) {
            for (const gradeId of selectedGrades) {
              try {
                const classesData = await FormFiltersApiService.getFormFilterClasses({
                  estado: selectedState,
                  municipio: selectedMunicipality,
                  escola: schoolId,
                  serie: gradeId
                });
                classesData.forEach(classItem => {
                  const className = classItem.nome?.trim() || '';
                  const normalizedName = className.toLowerCase().trim();
                  
                  if (!allClassesById.has(classItem.id) && !allClassesByName.has(normalizedName)) {
                    allClassesById.set(classItem.id, {
                      id: classItem.id,
                      name: className
                    });
                    allClassesByName.set(normalizedName, classItem.id);
                  }
                });
              } catch (error) {
                console.error(`Erro ao carregar turmas da escola ${schoolId} e série ${gradeId}:`, error);
              }
            }
          }
          
          const uniqueClasses = Array.from(allClassesById.values()).sort((a, b) => 
            a.name.localeCompare(b.name)
          );
          
          setClasses(uniqueClasses);
        } catch (error) {
          console.error("Erro ao carregar turmas:", error);
          setClasses([]);
        } finally {
          setIsLoadingFilters(false);
        }
      } else {
        setClasses([]);
      }
    };

    loadClasses();
  }, [selectedGrades, selectedSchools, selectedState, selectedMunicipality]);


  // Função para buscar relatório agregado (índices e perfis)
  const fetchAggregatedReport = useCallback(async () => {
    if (selectedState === 'all' || selectedMunicipality === 'all' || selectedSchools.length === 0) {
      return;
    }

    setIsLoadingReport(true);
    setIndicesData(null);
    setProfilesData(null);

    try {
      // Construir parâmetros da query
      const params: any = {
        state: selectedState,
        municipio: selectedMunicipality,
        page: 1,
        limit: 20
      };

      if (selectedSchools.length > 0) {
        params.escola = selectedSchools.join(',');
      }

      if (selectedGrades.length > 0) {
        params.serie = selectedGrades.join(',');
      }

      if (selectedClasses.length > 0) {
        params.turma = selectedClasses.join(',');
      }

      // Buscar índices agregados (admin: enviar contexto de cidade)
      const indicesConfig = selectedMunicipality !== 'all' ? { params, meta: { cityId: selectedMunicipality } } : { params };
      const indicesResponse = await api.get('/forms/aggregated/results/indices', indicesConfig);

      if (indicesResponse.status === 200) {
        // Cache pronto
        setIndicesData(indicesResponse.data);
      } else if (indicesResponse.status === 202) {
        // Processando - iniciar polling
        const taskId = indicesResponse.data.taskId;
        setPollingTaskId(taskId);
        setIsPolling(true);
        startPolling(taskId, 'indices');
      }

      // Buscar perfis agregados (admin: enviar contexto de cidade)
      const profilesConfig = selectedMunicipality !== 'all' ? { params, meta: { cityId: selectedMunicipality } } : { params };
      const profilesResponse = await api.get('/forms/aggregated/results/profiles', profilesConfig);

      if (profilesResponse.status === 200) {
        // Cache pronto
        setProfilesData(profilesResponse.data);
      } else if (profilesResponse.status === 202) {
        // Processando - iniciar polling
        const taskId = profilesResponse.data.taskId;
        startPolling(taskId, 'profiles');
      }

    } catch (error: any) {
      console.error("Erro ao buscar relatório:", error);
      
      // Verificar se é 202 (pode estar no catch em algumas versões do axios)
      if (error.response?.status === 202) {
        const taskId = error.response.data.taskId;
        setPollingTaskId(taskId);
        setIsPolling(true);
        startPolling(taskId, 'indices');
      } else {
        toast({
          title: "Erro ao carregar relatório",
          description: error.response?.data?.message || "Não foi possível carregar o relatório.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoadingReport(false);
    }
  }, [selectedState, selectedMunicipality, selectedSchools, selectedGrades, selectedClasses, toast]);

  // Função de polling para verificar status da task
  const startPolling = useCallback((taskId: string, type: 'indices' | 'profiles') => {
    const pollInterval = setInterval(async () => {
      try {
        const statusConfig = selectedMunicipality !== 'all' ? { meta: { cityId: selectedMunicipality } } : {};
        const statusResponse = await api.get(`/forms/aggregated/results/status/${taskId}`, statusConfig);
        const status = statusResponse.data;

        if (status.status === 'completed') {
          clearInterval(pollInterval);
          setIsPolling(false);
          setPollingTaskId(null);
          
          // Resultado pronto
          if (type === 'indices') {
            setIndicesData(status.result);
          } else {
            setProfilesData(status.result);
          }

          toast({
            title: "Relatório processado",
            description: "O relatório foi gerado com sucesso!",
          });
        } else if (status.status === 'failed') {
          clearInterval(pollInterval);
          setIsPolling(false);
          setPollingTaskId(null);
          
          toast({
            title: "Erro ao processar relatório",
            description: status.error || "Ocorreu um erro ao processar o relatório.",
            variant: "destructive",
          });
        }
        // Se status === 'processing', continua esperando
      } catch (error) {
        console.error("Erro ao verificar status da task:", error);
        clearInterval(pollInterval);
        setIsPolling(false);
        setPollingTaskId(null);
      }
    }, 2000); // Polling a cada 2 segundos
  }, [toast]);

  // Buscar relatório automaticamente quando filtros mínimos forem preenchidos
  useEffect(() => {
    // Limpar timeout anterior
    if (filterDebounce) {
      clearTimeout(filterDebounce);
    }

    // Validar que pelo menos 3 filtros estão preenchidos
    const hasMinimumFilters = 
      selectedState !== 'all' && 
      selectedMunicipality !== 'all' && 
      selectedSchools.length > 0;

    if (hasMinimumFilters) {
      // Aguardar 500ms após última mudança de filtro (debounce)
      const timeoutId = setTimeout(() => {
        fetchAggregatedReport();
      }, 500);
      
      setFilterDebounce(timeoutId);
    } else {
      // Limpar dados se filtros mínimos não estão preenchidos
      setIndicesData(null);
      setProfilesData(null);
    }

    return () => {
      if (filterDebounce) {
        clearTimeout(filterDebounce);
      }
    };
  }, [selectedState, selectedMunicipality, selectedSchools, selectedGrades, selectedClasses, fetchAggregatedReport]);

  // Função para abrir modal de alunos
  const handleOpenStudentModal = async (indexType: string, page: number = 1) => {
    if (!indicesData?.indicesConsolidados?.[indexType]) return;

    setSelectedIndexType(indexType);
    setCurrentStudentPage(page);
    setStudentModalOpen(true);
    setIsLoadingStudents(true);

    try {
      // Buscar alunos com paginação
      const params: any = {
        state: selectedState,
        municipio: selectedMunicipality,
        page: page,
        limit: 20
      };

      if (selectedSchools.length > 0) {
        params.escola = selectedSchools.join(',');
      }

      if (selectedGrades.length > 0) {
        params.serie = selectedGrades.join(',');
      }

      if (selectedClasses.length > 0) {
        params.turma = selectedClasses.join(',');
      }

      const listConfig = selectedMunicipality !== 'all' ? { params, meta: { cityId: selectedMunicipality } } : { params };
      const response = await api.get('/forms/aggregated/results/indices', listConfig);

      if (response.status === 200 && response.data.indicesConsolidados?.[indexType]) {
        const indexData = response.data.indicesConsolidados[indexType];
        setStudentsData(indexData.alunos.data);
        setStudentsPagination(indexData.alunos.pagination);
      }
    } catch (error) {
      console.error("Erro ao buscar alunos:", error);
      toast({
        title: "Erro ao carregar alunos",
        description: "Não foi possível carregar a lista de alunos.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingStudents(false);
    }
  };

  // Tradução dos tipos de índices
  const indexTypeTitles: Record<string, { title: string; icon: any; color: string }> = {
    distorcaoIdadeSerie: {
      title: 'Alunos com distorção idade-série',
      icon: AlertTriangle,
      color: 'bg-orange-500'
    },
    historicoReprovacao: {
      title: 'Alunos com histórico de reprovação',
      icon: TrendingDown,
      color: 'bg-red-500'
    },
    semAcessoInternet: {
      title: 'Alunos sem acesso a internet',
      icon: WifiOff,
      color: 'bg-blue-500'
    },
    baixoEngajamentoFamiliar: {
      title: 'Baixo engajamento familiar',
      icon: UserX,
      color: 'bg-purple-500'
    }
  };

  // Tradução das abas de perfis
  const profileTabTitles: Record<string, string> = {
    perfilDemografico: 'Perfil demográfico do estudante',
    contextoFamiliar: 'Contexto Familiar e socioeconômico',
    trajetoriaEscolar: 'Trajetória e contexto escolar',
    ambienteEscolar: 'Percepções sobre o ambiente escolar'
  };

  // Renderizar gráfico de uma questão
  const renderQuestionChart = (questionData: ProfileQuestion, questionId: string) => {
    // Preparar dados para o gráfico
    const chartData = Object.entries(questionData.contagem).map(([label, value]) => ({
      name: label.length > 30 ? label.substring(0, 30) + '...' : label,
      fullName: label,
      valor: value,
      porcentagem: ((value / questionData.totalRespostas) * 100).toFixed(1)
    }));

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

    return (
      <div className="mb-8">
        <h4 className="font-medium text-base mb-4">{questionData.textoPergunta}</h4>
        <div className="w-full h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                interval={0}
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-gray-800 p-3 border rounded-lg shadow-lg">
                        <p className="font-medium text-sm mb-1">{data.fullName}</p>
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                          Respostas: <strong>{data.valor}</strong>
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Porcentagem: <strong>{data.porcentagem}%</strong>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="valor" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
                <LabelList 
                  dataKey="valor" 
                  position="top" 
                  style={{ fontSize: '14px', fontWeight: 'bold', fill: '#374151' }}
                />
              </Bar>
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
          Total de respostas: {questionData.totalRespostas}
        </div>
      </div>
    );
  };

  // Renderizar subperguntas (matriz de seleção)
  const renderSubQuestions = (subperguntas: Record<string, { texto: string; contagem: Record<string, number> }>) => {
    return (
      <div className="space-y-6">
        {Object.entries(subperguntas).map(([subId, subData]) => {
          const chartData = Object.entries(subData.contagem).map(([label, value]) => ({
            name: label,
            valor: value
          }));

          const COLORS = ['#10b981', '#ef4444'];

          return (
            <div key={subId} className="pl-4 border-l-2 border-gray-200 dark:border-gray-700">
              <h5 className="font-medium text-sm mb-3">{subData.texto}</h5>
              <div className="w-full h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="valor" radius={[8, 8, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                      <LabelList 
                        dataKey="valor" 
                        position="top" 
                        style={{ fontSize: '14px', fontWeight: 'bold', fill: '#374151' }}
                      />
                    </Bar>
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            Relatórios de Formulários Socioeconômicos
          </h1>
          <p className="text-muted-foreground mt-2">
            Visualize os resultados dos questionários socioeconômicos aplicados
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Relatório
          </CardTitle>
          <CardDescription>
            Selecione os filtros para gerar o relatório
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Estado */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado *</label>
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
              <label className="text-sm font-medium">Município *</label>
              <Select
                value={selectedMunicipality}
                onValueChange={setSelectedMunicipality}
                disabled={isLoadingFilters || selectedState === 'all'}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    isLoadingFilters 
                      ? "Carregando municípios..." 
                      : municipalities.length === 0 
                        ? "Nenhum município disponível" 
                        : "Selecione o município"
                  } />
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
              <label className="text-sm font-medium">Escola(s) *</label>
              <FormMultiSelect
                options={schools.map(school => ({ id: school.id, name: school.name }))}
                selected={selectedSchools}
                onChange={setSelectedSchools}
                placeholder={selectedSchools.length === 0 ? "Selecione escolas" : `${selectedSchools.length} selecionada(s)`}
              />
            </div>

            {/* Série */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Série(s)</label>
              <FormMultiSelect
                options={grades.map(grade => ({ id: grade.id, name: grade.name }))}
                selected={selectedGrades}
                onChange={setSelectedGrades}
                placeholder={selectedGrades.length === 0 ? "Todas as séries" : `${selectedGrades.length} selecionada(s)`}
              />
            </div>

            {/* Turma */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Turma(s)</label>
              <FormMultiSelect
                options={classes.map(classItem => ({ id: classItem.id, name: classItem.name }))}
                selected={selectedClasses}
                onChange={setSelectedClasses}
                placeholder={selectedClasses.length === 0 ? "Todas as turmas" : `${selectedClasses.length} selecionada(s)`}
              />
            </div>
          </div>

          {/* Loading ou Info */}
          {(isLoadingReport || isPolling) && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  {isPolling ? 'Processando relatório consolidado...' : 'Carregando dados...'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sumário Executivo */}
      {indicesData && indicesData.indicesConsolidados && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Sumário Executivo</h2>
            <p className="text-muted-foreground">
              Principais indicadores socioeconômicos dos alunos
            </p>
            {/* Badge informativo com total de formulários */}
            {indicesData.totalFormularios && (
              <div className="mt-2">
                <Badge variant="outline" className="text-sm">
                  <FileText className="h-3 w-3 mr-1" />
                  {indicesData.totalFormularios} formulário{indicesData.totalFormularios !== 1 ? 's' : ''} incluído{indicesData.totalFormularios !== 1 ? 's' : ''}
                  {indicesData.totalRespostas && ` | ${indicesData.totalRespostas} respostas`}
                </Badge>
              </div>
            )}
          </div>

          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(indicesData.indicesConsolidados).map(([key, data]: [string, any]) => {
              const indexInfo = indexTypeTitles[key];
              if (!indexInfo) return null;

              const Icon = indexInfo.icon;

              return (
                <Card 
                  key={key}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleOpenStudentModal(key)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className={`p-3 rounded-lg ${indexInfo.color}`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <Badge variant="secondary" className="text-lg font-bold">
                        {data.porcentagem.toFixed(1)}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <h3 className="font-semibold text-sm mb-1">{indexInfo.title}</h3>
                    <p className="text-2xl font-bold text-muted-foreground">
                      {data.total} <span className="text-sm font-normal">alunos</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Clique para ver detalhes
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Sistema de Abas com Perfis */}
          {profilesData && profilesData.perfisConsolidados && (
            <Card>
              <CardHeader>
                <CardTitle>Análise Detalhada por Perfil</CardTitle>
                <CardDescription>
                  Visualize as respostas dos alunos organizadas por categoria
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto gap-2">
                    {Object.keys(profilesData.perfisConsolidados).map((profileKey) => (
                      <TabsTrigger 
                        key={profileKey} 
                        value={profileKey}
                        className="text-xs sm:text-sm px-2 py-2 whitespace-normal h-auto min-h-[40px]"
                      >
                        {profileTabTitles[profileKey] || profileKey}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {Object.entries(profilesData.perfisConsolidados).map(([profileKey, profileData]: [string, any]) => (
                    <TabsContent key={profileKey} value={profileKey} className="space-y-6 mt-6">
                      <div>
                        <h3 className="text-xl font-bold mb-4">{profileData.nome}</h3>
                        
                        {/* Renderizar gráficos de cada questão */}
                        {Object.entries(profileData.dados).map(([questionId, questionData]: [string, any]) => (
                          <div key={questionId}>
                            {questionData.tipo === 'multipla_escolha' && questionData.subperguntas ? (
                              <div className="mb-8">
                                <h4 className="font-medium text-base mb-4">{questionData.textoPergunta}</h4>
                                {renderSubQuestions(questionData.subperguntas)}
                              </div>
                            ) : (
                              renderQuestionChart(questionData, questionId)
                            )}
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      )}


      {/* Dialog de Lista de Alunos */}
      <Dialog open={studentModalOpen} onOpenChange={setStudentModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {selectedIndexType && indexTypeTitles[selectedIndexType]?.title}
            </DialogTitle>
            <DialogDescription>
              Lista de alunos identificados nesta categoria
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {isLoadingStudents ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : studentsData.length > 0 ? (
              <div className="space-y-3">
                {studentsData.map((student) => (
                  <Card key={student.alunoId} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-base">{student.alunoNome}</h4>
                        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <School className="h-4 w-4" />
                            <span>{student.escolaNome}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4" />
                            <span>
                              {student.gradeName}
                              {student.className && ` - Turma ${student.className}`}
                            </span>
                          </div>
                          {student.resposta && (
                            <div className="mt-2 p-2 bg-muted rounded text-xs">
                              <strong>Resposta:</strong> {student.resposta}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum aluno encontrado
              </div>
            )}
          </div>

          {/* Paginação */}
          {studentsPagination && studentsPagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Página {studentsPagination.page} de {studentsPagination.totalPages}
                <span className="ml-2">
                  ({studentsPagination.total} alunos no total)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenStudentModal(selectedIndexType, currentStudentPage - 1)}
                  disabled={currentStudentPage === 1 || isLoadingStudents}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenStudentModal(selectedIndexType, currentStudentPage + 1)}
                  disabled={currentStudentPage === studentsPagination.totalPages || isLoadingStudents}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FormReports;
