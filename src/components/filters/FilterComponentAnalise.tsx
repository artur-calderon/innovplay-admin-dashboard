import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Filter } from "lucide-react";
import { EvaluationResultsApiService } from "@/services/evaluationResultsApi";
import { useToast } from "@/hooks/use-toast";

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
}

interface School { 
  id: string; 
  name: string; 
  municipality: string; 
}

interface Evaluation {
  id: string;
  titulo: string;
  disciplina: string;
  status: string;
  data_aplicacao: string;
}

interface FilterComponentAnaliseProps {
  selectedState: string;
  selectedMunicipality: string;
  selectedSchool: string;
  selectedEvaluation: string;
  onStateChange: (state: string) => void;
  onMunicipalityChange: (municipality: string) => void;
  onSchoolChange: (school: string) => void;
  onEvaluationChange: (evaluation: string) => void;
  isLoadingFilters: boolean;
  onLoadingChange: (loading: boolean) => void;
  // Props para hierarquia
  userRole?: string;
  canSelectState?: boolean;
  canSelectMunicipality?: boolean;
  canSelectSchool?: boolean;
  fallbackSchools?: Array<{
    id: string;
    name: string;
    municipalityId?: string;
  }>;
}

export function FilterComponentAnalise({
  selectedState,
  selectedMunicipality,
  selectedSchool,
  selectedEvaluation,
  onStateChange,
  onMunicipalityChange,
  onSchoolChange,
  onEvaluationChange,
  isLoadingFilters,
  onLoadingChange,
  // Props para hierarquia
  userRole,
  canSelectState = true,
  canSelectMunicipality = true,
  canSelectSchool = true,
  fallbackSchools = [],
}: FilterComponentAnaliseProps) {
  const { toast } = useToast();

  // Estados dos dados dos filtros
  const [states, setStates] = useState<State[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [evaluationsByMunicipality, setEvaluationsByMunicipality] = useState<Evaluation[]>([]);
  const normalizedRole = (userRole ?? "").toLowerCase();
  const mustSelectSpecificSchool = ["diretor", "coordenador", "professor"].includes(normalizedRole);
  const onMunicipalityChangeRef = useRef(onMunicipalityChange);
  const onSchoolChangeRef = useRef(onSchoolChange);
  const onEvaluationChangeRef = useRef(onEvaluationChange);

  useEffect(() => {
    onMunicipalityChangeRef.current = onMunicipalityChange;
  }, [onMunicipalityChange]);

  useEffect(() => {
    onSchoolChangeRef.current = onSchoolChange;
  }, [onSchoolChange]);

  useEffect(() => {
    onEvaluationChangeRef.current = onEvaluationChange;
  }, [onEvaluationChange]);

  // Carregar filtros iniciais
  const loadInitialFilters = useCallback(async () => {
    try {
      onLoadingChange(true);
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
      onLoadingChange(false);
    }
  }, [toast, onLoadingChange]);

  useEffect(() => {
    loadInitialFilters();
  }, [loadInitialFilters]);

  // Carregar municípios quando estado for selecionado
  useEffect(() => {
    const loadMunicipalities = async () => {
      if (selectedState !== 'all') {
        try {
          onLoadingChange(true);
          const municipalitiesData = await EvaluationResultsApiService.getFilterMunicipalities(selectedState);
          const formattedMunicipalities = municipalitiesData.map(municipality => ({
            id: municipality.id,
            name: municipality.nome,
            state: selectedState
          }));
          setMunicipalities(formattedMunicipalities);
          setSchools([]);
          setEvaluationsByMunicipality([]);

          const municipalityExists = formattedMunicipalities.some(
            (municipality) => municipality.id === selectedMunicipality
          );

          if (!municipalityExists) {
            onMunicipalityChangeRef.current('all');
            onSchoolChangeRef.current('all');
            onEvaluationChangeRef.current('all');
          }
        } catch (error) {
          console.error("Erro ao carregar municípios:", error);
        } finally {
          onLoadingChange(false);
        }
      } else {
        setMunicipalities([]);
        setSchools([]);
        setEvaluationsByMunicipality([]);
        onMunicipalityChangeRef.current('all');
        onSchoolChangeRef.current('all');
        onEvaluationChangeRef.current('all');
      }
    };

    loadMunicipalities();
  }, [selectedState, onLoadingChange]);

  // Carregar escolas quando município for selecionado
  useEffect(() => {
    const loadSchools = async () => {
      if (selectedMunicipality !== 'all') {
        try {
          onLoadingChange(true);
          const schoolsData = await EvaluationResultsApiService.getFilterSchools(selectedMunicipality);
          let formattedSchools = schoolsData.map(school => ({
            id: school.id,
            name: school.nome ?? (school as any).name,
            municipality: selectedMunicipality
          }));

          if (formattedSchools.length === 0 && fallbackSchools.length > 0) {
            const fallbackMatches = fallbackSchools.filter(
              (school) => !school.municipalityId || school.municipalityId === selectedMunicipality
            );
            formattedSchools = fallbackMatches.map((school) => ({
              id: school.id,
              name: school.name,
              municipality: selectedMunicipality
            }));
          } else if (fallbackSchools.length > 0) {
            const existingIds = new Set(formattedSchools.map((school) => school.id));
            fallbackSchools.forEach((fallbackSchool) => {
              const matchesMunicipality =
                !fallbackSchool.municipalityId || fallbackSchool.municipalityId === selectedMunicipality;
              if (matchesMunicipality && !existingIds.has(fallbackSchool.id)) {
                formattedSchools.push({
                  id: fallbackSchool.id,
                  name: fallbackSchool.name,
                  municipality: selectedMunicipality
                });
              }
            });
          }

          setSchools(formattedSchools);
          setEvaluationsByMunicipality([]);

          if (mustSelectSpecificSchool && formattedSchools.length > 0) {
            const alreadySelected = formattedSchools.some(school => school.id === selectedSchool);
            const schoolToSelect = alreadySelected ? selectedSchool : formattedSchools[0].id;
            onSchoolChangeRef.current(schoolToSelect);
            if (!alreadySelected) {
              onEvaluationChangeRef.current('all');
            }
          } else if (!mustSelectSpecificSchool) {
            const alreadySelected = formattedSchools.some(school => school.id === selectedSchool);
            if (!alreadySelected) {
              onSchoolChangeRef.current('all');
              onEvaluationChangeRef.current('all');
            }
          }
        } catch (error) {
          console.error("Erro ao carregar escolas:", error);
          setSchools([]);
        } finally {
          onLoadingChange(false);
        }
      } else {
        setSchools([]);
        setEvaluationsByMunicipality([]);
        onSchoolChangeRef.current('all');
        onEvaluationChangeRef.current('all');
      }
    };

    loadSchools();
  }, [selectedMunicipality, selectedSchool, onLoadingChange, mustSelectSpecificSchool, fallbackSchools]);

  // Carregar avaliações quando escola for selecionada OU quando escola for "Todas"
  useEffect(() => {
    const loadEvaluations = async () => {
      // ✅ CORREÇÃO: Carregar avaliações quando Estado + Município estão selecionados
      // Independente se escola é "Todas" ou uma escola específica
      if (selectedState !== 'all' && selectedMunicipality !== 'all') {
        try {
          onLoadingChange(true);
          const evaluationsData = await EvaluationResultsApiService.getFilterEvaluations({
            estado: selectedState,
            municipio: selectedMunicipality,
            escola: selectedSchool !== 'all' ? selectedSchool : undefined
          });
          setEvaluationsByMunicipality(evaluationsData.map(evaluation => ({
            id: evaluation.id,
            titulo: evaluation.titulo,
            disciplina: '',
            status: 'concluida',
            data_aplicacao: new Date().toISOString()
          })));
          onEvaluationChangeRef.current('all');
        } catch (error) {
          console.error("Erro ao carregar avaliações:", error);
          setEvaluationsByMunicipality([]);
        } finally {
          onLoadingChange(false);
        }
      } else {
        setEvaluationsByMunicipality([]);
        onEvaluationChangeRef.current('all');
      }
    };

    loadEvaluations();
  }, [selectedState, selectedMunicipality, selectedSchool, onLoadingChange, mustSelectSpecificSchool]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtros
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Estado */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              Estado
              {!canSelectState && (
                <Badge variant="secondary" className="text-xs">Pré-selecionado</Badge>
              )}
            </label>
            <Select
              value={selectedState}
              onValueChange={onStateChange}
              disabled={isLoadingFilters || !canSelectState}
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
            <label className="text-sm font-medium flex items-center gap-2">
              Município
              {!canSelectMunicipality && (
                <Badge variant="secondary" className="text-xs">Pré-selecionado</Badge>
              )}
            </label>
            <Select
              value={selectedMunicipality}
              onValueChange={onMunicipalityChange}
              disabled={isLoadingFilters || selectedState === 'all' || !canSelectMunicipality}
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
            <label className="text-sm font-medium flex items-center gap-2">
              Escola
              {!canSelectSchool && (
                <Badge variant="secondary" className="text-xs">Pré-selecionado</Badge>
              )}
            </label>
            <Select
              value={selectedSchool}
              onValueChange={onSchoolChange}
              disabled={isLoadingFilters || selectedMunicipality === 'all' || !canSelectSchool}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a escola" />
              </SelectTrigger>
              <SelectContent>
                {!mustSelectSpecificSchool && (
                  <SelectItem value="all">Todas</SelectItem>
                )}
                {schools.map(school => (
                  <SelectItem key={school.id} value={school.id}>
                    {school.name}
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
              onValueChange={onEvaluationChange}
              disabled={
                isLoadingFilters ||
                selectedState === 'all' ||
                selectedMunicipality === 'all' ||
                (mustSelectSpecificSchool && selectedSchool === 'all')
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a avaliação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {evaluationsByMunicipality.map(evaluation => (
                  <SelectItem key={evaluation.id} value={evaluation.id}>
                    {evaluation.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Informação sobre filtros */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700">
            💡 <strong>Hierarquia dos Filtros:</strong> Estado → Município → Escola → Avaliação
          </p>
          <p className="text-sm text-blue-700 mt-1">
            <strong>Estado</strong> e <strong>Município</strong> são obrigatórios. Para diretores, coordenadores e professores, a seleção de <strong>Escola</strong> é sempre obrigatória.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
