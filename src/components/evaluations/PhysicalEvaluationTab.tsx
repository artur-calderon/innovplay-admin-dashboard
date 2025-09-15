import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search,
  ClipboardList,
  Filter,
  RefreshCw,
  MapPin,
  School
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EvaluationResultsApiService } from "@/services/evaluationResultsApi";

// Interfaces reutilizadas da página Results.tsx
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

interface AppliedEvaluation {
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
  status: 'finalized' | 'in_progress' | 'pending' | string;
  total_alunos: number;
  alunos_participantes: number;
  alunos_pendentes: number;
  alunos_ausentes: number;
  media_nota: number;
  media_proficiencia: number;
}

export default function PhysicalEvaluationTab() {
  const [appliedEvaluations, setAppliedEvaluations] = useState<AppliedEvaluation[]>([]);
  const [isLoadingPhysical, setIsLoadingPhysical] = useState(true);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const { toast } = useToast();

  // Estados dos filtros - mesma estrutura da página Results.tsx
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('all');
  const [selectedEvaluation, setSelectedEvaluation] = useState<string>('all');
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Estados dos dados dos filtros
  const [states, setStates] = useState<State[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [evaluationsByMunicipality, setEvaluationsByMunicipality] = useState<Array<{ 
    id: string; 
    titulo: string; 
    disciplina: string; 
    status: string; 
    data_aplicacao: string; 
  }>>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);

  // Carregar filtros iniciais
  useEffect(() => {
    loadInitialFilters();
  }, []);

  // Carregar dados quando filtros mudarem
  useEffect(() => {
    fetchAppliedEvaluations();
  }, [selectedState, selectedMunicipality, selectedEvaluation, selectedSchool, selectedGrade, selectedClass, searchTerm]);

  const loadInitialFilters = async () => {
    try {
      setIsLoadingFilters(true);
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
    }
  };

  const fetchAppliedEvaluations = async () => {
    // Verificar se os filtros obrigatórios estão selecionados (Estado e Município)
    if (selectedState === 'all' || selectedMunicipality === 'all') {
      setAppliedEvaluations([]);
      setIsLoadingPhysical(false);
      return;
    }

    try {
      setIsLoadingPhysical(true);
      
      const filters = {
        estado: selectedState,
        municipio: selectedMunicipality,
        avaliacao: selectedEvaluation !== 'all' ? selectedEvaluation : undefined,
        escola: selectedSchool !== 'all' ? selectedSchool : undefined,
        serie: selectedGrade !== 'all' ? selectedGrade : undefined,
        turma: selectedClass !== 'all' ? selectedClass : undefined,
      };

      // Usar a mesma API da página Results.tsx
      const evaluationsResponse = await EvaluationResultsApiService.getEvaluationsList(1, 100, filters);
      
      if (evaluationsResponse && evaluationsResponse.resultados_detalhados?.avaliacoes) {
        // Filtrar avaliações baseado na seleção específica
        const filteredEvaluations = evaluationsResponse.resultados_detalhados.avaliacoes.filter(evaluation => {
          const matchesSearch = !searchTerm || evaluation.titulo.toLowerCase().includes(searchTerm.toLowerCase());
          
          // Se uma avaliação específica foi selecionada, mostrar ela independente do status
          if (selectedEvaluation !== 'all') {
            return evaluation.id === selectedEvaluation && matchesSearch;
          }
          
          // Caso contrário, filtrar apenas avaliações aplicadas (finalizadas)
          const isFinalized = evaluation.status === 'finalized' || evaluation.status === 'concluida' || evaluation.status === 'finalizada';
          return isFinalized && matchesSearch;
        });

        setAppliedEvaluations(filteredEvaluations);
      } else {
        setAppliedEvaluations([]);
      }
      
    } catch (error) {
      console.error("Erro ao buscar avaliações aplicadas:", error);
      setAppliedEvaluations([]);
      toast({
        title: "Erro ao carregar avaliações aplicadas",
        description: "Não foi possível carregar as avaliações aplicadas. Verifique a conexão com o servidor.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPhysical(false);
    }
  };

  // Carregar municípios quando estado for selecionado
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
          setEvaluationsByMunicipality([]);
          setSelectedMunicipality('all');
          setSelectedEvaluation('all');
          setSelectedSchool('all');
          setSelectedGrade('all');
          setSelectedClass('all');
        } catch (error) {
          console.error("Erro ao carregar municípios:", error);
        } finally {
          setIsLoadingFilters(false);
        }
      } else {
        setMunicipalities([]);
        setEvaluationsByMunicipality([]);
        setSelectedMunicipality('all');
        setSelectedEvaluation('all');
        setSelectedSchool('all');
        setSelectedGrade('all');
        setSelectedClass('all');
      }
    };

    loadMunicipalities();
  }, [selectedState]);

  // Carregar avaliações quando município for selecionado
  useEffect(() => {
    const loadEvaluations = async () => {
      if (selectedMunicipality !== 'all') {
        try {
          setIsLoadingFilters(true);
          const evaluationsData = await EvaluationResultsApiService.getFilterEvaluations({
            estado: selectedState,
            municipio: selectedMunicipality
          });
          setEvaluationsByMunicipality(evaluationsData.map(evaluation => ({
            id: evaluation.id || 'unknown',
            titulo: evaluation.titulo || 'Sem título',
            disciplina: '',
            status: 'concluida',
            data_aplicacao: new Date().toISOString()
          })));
          setSelectedEvaluation('all');
          setSelectedSchool('all');
          setSelectedGrade('all');
          setSelectedClass('all');
        } catch (error) {
          console.error("Erro ao carregar avaliações:", error);
          setEvaluationsByMunicipality([]);
        } finally {
          setIsLoadingFilters(false);
        }
      } else {
        setEvaluationsByMunicipality([]);
        setSelectedEvaluation('all');
        setSelectedSchool('all');
        setSelectedGrade('all');
        setSelectedClass('all');
      }
    };

    loadEvaluations();
  }, [selectedMunicipality, selectedState]);

  // Carregar escolas quando avaliação for selecionada
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
          setSelectedSchool('all');
          setSelectedGrade('all');
          setSelectedClass('all');
        } catch (error) {
          console.error("Erro ao carregar escolas:", error);
          setSchools([]);
        } finally {
          setIsLoadingFilters(false);
        }
      } else {
        setSchools([]);
        setSelectedSchool('all');
        setSelectedGrade('all');
        setSelectedClass('all');
      }
    };

    loadSchools();
  }, [selectedEvaluation, selectedState, selectedMunicipality]);

  // Carregar séries quando escola for selecionada
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
          setSelectedGrade('all');
          setSelectedClass('all');
        } catch (error) {
          console.error("Erro ao carregar séries:", error);
          setGrades([]);
        } finally {
          setIsLoadingFilters(false);
        }
      } else {
        setGrades([]);
        setSelectedGrade('all');
        setSelectedClass('all');
      }
    };

    loadGrades();
  }, [selectedSchool, selectedState, selectedMunicipality, selectedEvaluation]);

  // Carregar turmas quando série for selecionada
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

  const handleRefresh = () => {
    fetchAppliedEvaluations();
  };

  // Verificar se todos os filtros obrigatórios estão selecionados (Estado e Município)
  const allRequiredFiltersSelected = selectedState !== 'all' && selectedMunicipality !== 'all';

  return (
    <div className="space-y-4">
      {/* Filtros para Avaliações Aplicadas - Mesma estrutura da página Results.tsx */}
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

            {/* Avaliações */}
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
                  {Array.isArray(evaluationsByMunicipality) && evaluationsByMunicipality.map(evaluation => (
                    <SelectItem key={evaluation.id || 'unknown'} value={evaluation.id || 'unknown'}>
                      {evaluation.titulo || 'Sem título'}
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

          {/* Busca */}
          <div className="mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar Avaliação</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Digite o nome da avaliação..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* Informação sobre filtros */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700">
              💡 <strong>Hierarquia dos Filtros:</strong> Estado → Município → Avaliação → Escola → Série → Turma
            </p>
            <p className="text-sm text-blue-700 mt-1">
              <strong>Estado</strong> e <strong>Município</strong> são obrigatórios. 
              {selectedEvaluation !== 'all' ? (
                <span> A <strong>avaliação selecionada</strong> será exibida independente do status.</span>
              ) : (
                <span> Apenas avaliações <strong>aplicadas (finalizadas)</strong> serão exibidas.</span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Mensagem quando não há filtros suficientes */}
      {!allRequiredFiltersSelected && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Filter className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Selecione os filtros obrigatórios para continuar
            </h3>
            <p className="text-gray-600 text-center max-w-md">
              Para visualizar as avaliações aplicadas, você precisa selecionar: <strong>Estado</strong> e <strong>Município</strong>. Os demais filtros são opcionais.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading dos dados */}
      {allRequiredFiltersSelected && isLoadingPhysical && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600">Carregando avaliações aplicadas...</p>
          </CardContent>
        </Card>
      )}

      {/* Resumo das Avaliações Aplicadas */}
      {allRequiredFiltersSelected && !isLoadingPhysical && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {appliedEvaluations.length}
              </div>
              <p className="text-sm text-muted-foreground">Avaliações Aplicadas</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {appliedEvaluations.reduce((sum, e) => sum + (e.total_alunos || 0), 0)}
              </div>
              <p className="text-sm text-muted-foreground">Total de Alunos</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">
                {appliedEvaluations.reduce((sum, e) => sum + (e.alunos_participantes || 0), 0)}
              </div>
              <p className="text-sm text-muted-foreground">Participantes</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lista de Avaliações */}
      {allRequiredFiltersSelected && !isLoadingPhysical && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {selectedEvaluation !== 'all' ? 'Avaliação Selecionada' : 'Avaliações Aplicadas'}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {appliedEvaluations.length} {appliedEvaluations.length === 1 ? 'avaliação' : 'avaliações'}
                </Badge>
                <Button variant="outline" size="sm" onClick={handleRefresh}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {appliedEvaluations.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {selectedEvaluation !== 'all' ? 
                    "Nenhuma avaliação encontrada" : 
                    "Nenhuma avaliação aplicada encontrada"
                  }
                </h3>
                <p className="text-gray-600">
                  {searchTerm ? 
                    "Tente ajustar o termo de busca para ver mais resultados." :
                    selectedEvaluation !== 'all' ?
                      "A avaliação selecionada não foi encontrada ou não possui dados." :
                      "Não há avaliações aplicadas para os filtros selecionados."
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {appliedEvaluations.map((evaluation) => (
                  <Card key={evaluation.id} className={`cursor-pointer hover:shadow-lg transition-shadow border-l-4 ${
                  evaluation.status === 'finalized' || evaluation.status === 'concluida' || evaluation.status === 'finalizada'
                    ? 'border-l-green-500' 
                    : evaluation.status === 'em_andamento' || evaluation.status === 'in_progress'
                    ? 'border-l-blue-500'
                    : 'border-l-orange-500'
                }`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base truncate">{evaluation.titulo}</CardTitle>
                        <Badge 
                          variant={
                            evaluation.status === 'finalized' || evaluation.status === 'concluida' || evaluation.status === 'finalizada'
                              ? "default" 
                              : evaluation.status === 'em_andamento' || evaluation.status === 'in_progress'
                              ? "secondary"
                              : "outline"
                          } 
                          className={
                            evaluation.status === 'finalized' || evaluation.status === 'concluida' || evaluation.status === 'finalizada'
                              ? "bg-green-600" 
                              : evaluation.status === 'em_andamento' || evaluation.status === 'in_progress'
                              ? "bg-blue-600"
                              : ""
                          }
                        >
                          {evaluation.status === 'finalized' || evaluation.status === 'concluida' || evaluation.status === 'finalizada'
                            ? "Aplicada"
                            : evaluation.status === 'em_andamento' || evaluation.status === 'in_progress'
                            ? "Em Andamento"
                            : evaluation.status === 'pendente' || evaluation.status === 'pending'
                            ? "Pendente"
                            : evaluation.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {evaluation.disciplina} • {evaluation.serie || 'Série não informada'}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <School className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{evaluation.escola || 'Escola não informada'}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{evaluation.municipio || 'Município não informado'}</span>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        Aplicada em: {evaluation.data_aplicacao ? new Date(evaluation.data_aplicacao).toLocaleDateString('pt-BR') : 'Data não informada'}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Total:</span>
                          <span className="ml-1 font-medium">{evaluation.total_alunos || 0}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Participantes:</span>
                          <span className="ml-1 font-medium text-green-600">{evaluation.alunos_participantes || 0}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Nota Média:</span>
                          <span className="ml-1 font-medium">{(evaluation.media_nota || 0).toFixed(1)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Proficiência:</span>
                          <span className="ml-1 font-medium">{(evaluation.media_proficiencia || 0).toFixed(1)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
