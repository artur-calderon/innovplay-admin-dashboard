import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  ClipboardList,
  Filter,
  RefreshCw,
  MapPin,
  School,
  Upload,
  X,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EvaluationResultsApiService } from "@/services/evaluationResultsApi";
import { api } from "@/lib/api";

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

  // Estados para o modal de upload
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedEvaluationForUpload, setSelectedEvaluationForUpload] = useState<AppliedEvaluation | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<any>(null);

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

  // Funções para o modal de upload
  const openUploadModal = (evaluation: AppliedEvaluation) => {
    setSelectedEvaluationForUpload(evaluation);
    setSelectedFile(null);
    setUploadResult(null);
    setUploadProgress(0);
    setShowUploadModal(true);
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setSelectedEvaluationForUpload(null);
    setSelectedFile(null);
    setUploadResult(null);
    setUploadProgress(0);
    setIsUploading(false);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tipo de arquivo
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Tipo de arquivo inválido",
          description: "Por favor, selecione uma imagem (JPG, PNG ou GIF).",
          variant: "destructive",
        });
        return;
      }

      // Validar tamanho do arquivo (máximo 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 10MB.",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove o prefixo "data:image/...;base64," para obter apenas o base64
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedEvaluationForUpload) {
      toast({
        title: "Erro",
        description: "Selecione um arquivo para fazer upload.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(20);

      // Converter para base64
      const base64Image = await convertToBase64(selectedFile);
      setUploadProgress(50);

      // Fazer a requisição para a API
      const response = await api.post(`/physical-tests/test/${selectedEvaluationForUpload.id}/process-correction`, {
        image: base64Image
      });

      setUploadProgress(100);

      if (response.data) {
        setUploadResult(response.data);
        toast({
          title: "Upload realizado com sucesso!",
          description: `Correção processada. Nota: ${response.data.grade}/${response.data.total_questions}`,
        });
      }

    } catch (error: any) {
      console.error("Erro no upload:", error);
      toast({
        title: "Erro no upload",
        description: error.response?.data?.error || "Erro ao processar a correção da avaliação física.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
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
                       
                       <Button 
                         className="w-full mt-4"
                         variant="outline"
                         onClick={() => openUploadModal(evaluation)}
                       >
                         <ClipboardList className="h-4 w-4 mr-2" />
                         Gerar Resultado de Avaliação Física
                       </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
         </Card>
       )}

       {/* Modal de Upload de Gabarito Físico */}
       <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
         <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
           <DialogHeader>
             <DialogTitle className="flex items-center gap-2">
               <Upload className="h-5 w-5 text-blue-600" />
               Processar Correção de Avaliação Física
             </DialogTitle>
             <div className="text-sm text-muted-foreground">
               {selectedEvaluationForUpload && (
                 <span>
                   <strong>Avaliação:</strong> {selectedEvaluationForUpload.titulo} • 
                   <strong> Escola:</strong> {selectedEvaluationForUpload.escola}
                 </span>
               )}
             </div>
           </DialogHeader>

           <div className="space-y-6">
             {!uploadResult && (
               <>
                 {/* Instruções */}
                 <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                   <h4 className="font-medium text-blue-800 mb-2">Como usar:</h4>
                   <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                     <li>Tire uma foto ou escaneie o gabarito preenchido pelo aluno</li>
                     <li>Certifique-se de que a imagem está clara e bem iluminada</li>
                     <li>O gabarito deve estar completamente visível na imagem</li>
                     <li>Clique em "Selecionar Imagem" e escolha o arquivo</li>
                     <li>Clique em "Processar Correção" para obter o resultado</li>
                   </ol>
                 </div>

                 {/* Upload de Arquivo */}
                 <div className="space-y-4">
                   <Label className="text-sm font-medium">Imagem do Gabarito Preenchido</Label>
                   <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                     <input
                       type="file"
                       accept="image/*"
                       onChange={handleFileSelect}
                       className="hidden"
                       id="gabarito-upload"
                     />
                     <label htmlFor="gabarito-upload" className="cursor-pointer">
                       <Upload className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                       <p className="text-lg font-medium text-gray-700 mb-1">
                         {selectedFile ? selectedFile.name : "Clique para selecionar a imagem do gabarito"}
                       </p>
                       <p className="text-sm text-gray-500">
                         JPG, PNG ou GIF até 10MB
                       </p>
                     </label>
                   </div>
                   
                   {selectedFile && (
                     <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                       <div className="flex items-center gap-2">
                         <CheckCircle className="h-5 w-5 text-green-600" />
                         <span className="text-sm font-medium text-green-800">
                           Arquivo selecionado: {selectedFile.name}
                         </span>
                       </div>
                       <Button
                         variant="ghost"
                         size="sm"
                         onClick={() => setSelectedFile(null)}
                       >
                         <X className="h-4 w-4" />
                       </Button>
                     </div>
                   )}
                 </div>

                 {/* Progress Bar durante upload */}
                 {isUploading && (
                   <div className="space-y-2">
                     <div className="flex items-center justify-between">
                       <span className="text-sm font-medium">Processando correção...</span>
                       <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
                     </div>
                     <Progress value={uploadProgress} className="w-full" />
                   </div>
                 )}
               </>
             )}

             {/* Resultado da Correção */}
             {uploadResult && (
               <div className="space-y-4">
                 <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                   <div className="flex items-center gap-2 mb-3">
                     <CheckCircle className="h-6 w-6 text-green-600" />
                     <h4 className="font-medium text-green-800">Correção Processada com Sucesso!</h4>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4 text-sm">
                     <div>
                       <span className="font-medium text-gray-600">Acertos:</span>
                       <span className="ml-2 text-lg font-bold text-green-600">
                         {uploadResult.correct_answers}/{uploadResult.total_questions}
                       </span>
                     </div>
                     <div>
                       <span className="font-medium text-gray-600">Nota:</span>
                       <span className="ml-2 text-lg font-bold text-blue-600">
                         {uploadResult.grade}
                       </span>
                     </div>
                     <div>
                       <span className="font-medium text-gray-600">Percentual:</span>
                       <span className="ml-2 text-lg font-bold text-purple-600">
                         {uploadResult.score_percentage}%
                       </span>
                     </div>
                     <div>
                       <span className="font-medium text-gray-600">Proficiência:</span>
                       <span className="ml-2 text-lg font-bold text-orange-600">
                         {uploadResult.proficiency}
                       </span>
                     </div>
                   </div>

                   {uploadResult.classification && (
                     <div className="mt-3 p-2 bg-white rounded border">
                       <span className="font-medium text-gray-600">Classificação:</span>
                       <span className="ml-2 font-medium text-gray-800">
                         {uploadResult.classification}
                       </span>
                     </div>
                   )}

                   {uploadResult.answers_detected && uploadResult.answers_detected.length > 0 && (
                     <div className="mt-3">
                       <span className="font-medium text-gray-600 block mb-2">Respostas Detectadas:</span>
                       <div className="flex flex-wrap gap-1">
                         {uploadResult.answers_detected.map((answer: string, index: number) => (
                           <Badge
                             key={index}
                             variant={
                               uploadResult.student_answers && 
                               uploadResult.student_answers[index] === answer 
                                 ? "default" 
                                 : "destructive"
                             }
                             className="text-xs"
                           >
                             Q{index + 1}: {answer}
                           </Badge>
                         ))}
                       </div>
                     </div>
                   )}
                 </div>
               </div>
             )}
           </div>

           <DialogFooter className="gap-2">
             {!uploadResult && (
               <>
                 <Button variant="outline" onClick={closeUploadModal}>
                   Cancelar
                 </Button>
                 <Button 
                   onClick={handleUpload} 
                   disabled={!selectedFile || isUploading}
                   className="bg-blue-600 hover:bg-blue-700"
                 >
                   {isUploading ? (
                     <>
                       <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                       Processando...
                     </>
                   ) : (
                     <>
                       <Upload className="h-4 w-4 mr-2" />
                       Processar Correção
                     </>
                   )}
                 </Button>
               </>
             )}
             
             {uploadResult && (
               <Button onClick={closeUploadModal} className="w-full">
                 Fechar
               </Button>
             )}
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </div>
   );
 }
