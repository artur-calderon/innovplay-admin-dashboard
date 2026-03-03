import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Download,
  Users,
  FileX,
  Eye,
  RefreshCw,
  School,
  MapPin,
  Filter,
  Search,
  BarChart3,
  BookOpen,
  Check
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EvaluationResultsApiService } from "@/services/evaluationResultsApi";
import { useAuth } from "@/context/authContext";
import { getUserHierarchyContext } from "@/utils/userHierarchy";
import { ResultsCharts } from "@/components/evaluations/ResultsCharts";
import { ClassStatistics } from "@/components/evaluations/ClassStatistics";
import { StudentRanking } from "@/components/evaluations/StudentRanking";
import { ResultsTable } from "@/components/evaluations/results-table/ResultsTable";
import type { DisciplineStatsMap } from "@/components/evaluations/StudentBulletin";
import { saveBulletinStatsToStorage } from "@/components/evaluations/utils/bulletinStorage";

import { cn } from "@/lib/utils";
import { DisciplineTables } from "@/components/evaluations/DisciplineTables";
import { StudentCard } from "@/components/evaluations/StudentCard";
import { QuestionData as TableQuestionData, DetailedReport as TableDetailedReport } from "@/types/results-table";

// Interfaces para os dados da API - Nova estrutura baseada na implementação real
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
  status: 'finalized' | 'in_progress' | 'pending' | string;
  // Campos agregados
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

interface TabelaDetalhada {
  disciplinas: Array<{
    id: string;
    nome: string;
    questoes: Array<{
      numero: number;
      habilidade: string;
      codigo_habilidade: string;
      question_id: string;
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
        respondeu: boolean;
        resposta: string;
      }>;
      total_acertos: number;
      total_erros: number;
      total_respondidas: number;
      total_questoes_disciplina: number;
      nivel_proficiencia: string;
      nota: number;
      proficiencia: number;
    }>;
  }>;
  geral?: {
    alunos: Array<{
      id: string;
      nome: string;
      escola: string;
      serie: string;
      turma: string;
      nota_geral: number;
      proficiencia_geral: number;
      nivel_proficiencia_geral: string;
      total_acertos_geral: number;
      total_questoes_geral: number;
      total_respondidas_geral: number;
      total_em_branco_geral: number;
      percentual_acertos_geral: number;
      status_geral: string;
    }>;
  };
}

// Importar tipos do serviço
import type { NovaRespostaAPI, RankingItem } from '@/services/evaluationResultsApi';

// ✅ NOVO: Interfaces para tipagem correta
interface RankingItemWithAluno {
  aluno_id: string;
  nome: string;
  turma: string;
  escola?: string;
  serie?: string;
  nota_geral: number;
  proficiencia_geral: number;
  classificacao_geral: string;
  total_questoes: number;
  total_acertos: number;
}

interface DetailedReportAluno {
  id: string;
  nome: string;
  turma: string;
  nota_final: number;
  proficiencia: number;
  classificacao: string;
  total_acertos: number;
  total_erros: number;
  total_em_branco: number;
  respostas?: Array<{ tempo_gasto: number }>;
  status: string;
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

// Tipagem auxiliar para lidar com respostas legadas que usam "data" e "total"
interface ResultadosDetalhadosFromAPI {
  avaliacoes?: EvaluationResult[];
  paginacao?: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
  data?: EvaluationResult[];
  total?: number;
}

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

// Tipo para StageGroup
type StageGroup = "group1" | "group2";

// Mapa de status estático (fora do componente)
const getStatusConfig = (status: 'concluida' | 'em_andamento' | 'pendente' | string) => {
  const configs: Record<string, { label: string; color: string }> = {
    concluida: {
      label: "Concluída",
      color: "bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400 border-green-300 dark:border-green-800"
    },
    em_andamento: {
      label: "Em Andamento",
      color: "bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400 border-blue-300 dark:border-blue-800"
    },
    pendente: {
      label: "Pendente",
      color: "bg-muted text-foreground border-border"
    },
    agendada: {
      label: "Agendada",
      color: "bg-yellow-50 dark:bg-yellow-950/30 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800"
    },
    'concluído': {
      label: "Concluída",
      color: "bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400 border-green-300 dark:border-green-800"
    },
    'em andamento': {
      label: "Em Andamento",
      color: "bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400 border-blue-300 dark:border-blue-800"
    },
    'finalizada': {
      label: "Concluída",
      color: "bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400 border-green-300 dark:border-green-800"
    },
    'finalizado': {
      label: "Concluída",
      color: "bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400 border-green-300 dark:border-green-800"
    },
    'agendado': {
      label: "Agendada",
      color: "bg-yellow-50 dark:bg-yellow-950/30 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800"
    }
  };

  const config = configs[status] || {
    label: "Desconhecido",
    color: "bg-muted text-foreground border-border"
  };

  return config;
};

// Interface para o relatório detalhado
interface DetailedReport {
  avaliacao: {
    id: string;
    titulo: string;
    disciplina: string;
    serie?: string;
    turma?: string;
    escola?: string;
    municipio?: string;
    estado?: string;
    data_aplicacao: string;
  };
  alunos: Array<{
    id: string;
    nome: string;
    turma: string;
    nota_final: number;
    proficiencia: number;
    classificacao: 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado';
    total_acertos: number;
    total_erros: number;
    total_em_branco: number;
    status: 'concluida' | 'pendente';
    respostas: Array<{
      tempo_gasto: number;
    }>;
  }>;
}

// Interface para resposta de alunos da API
interface StudentResponse {
  id: string;
  nome: string;
  turma: string;
  nota: number;
  proficiencia: number;
  classificacao: 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado';
  questoes_respondidas: number;
  acertos: number;
  erros: number;
  em_branco: number;
  tempo_gasto: number;
  status: 'concluida' | 'pendente';
}

// Interface simples para o relatório detalhado (evitando conflitos)
interface SimpleDetailedReport {
  avaliacao: {
    id: string;
    titulo: string;
    disciplina: string;
    total_questoes?: number;
    serie?: string;
    turma?: string;
    escola?: string;
    municipio?: string;
    estado?: string;
    data_aplicacao: string;
  };
  // Opcional: algumas respostas podem trazer a lista de questoes
  questoes?: Array<{
    numero: number;
  }>;
  alunos: Array<{
    id: string;
    nome: string;
    turma: string;
    nota_final: number;
    proficiencia: number;
    classificacao: 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado';
    total_acertos: number;
    total_erros: number;
    total_em_branco: number;
    status: 'concluida' | 'pendente';
    respostas: Array<{
      tempo_gasto: number;
      // Opcional para inferência do total de questões
      questao_numero?: number;
    }>;
  }>;
}

export default function Results() {
  const { autoLogin, user } = useAuth();

  const [apiData, setApiData] = useState<NovaRespostaAPI | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Chave para persistência dos filtros no localStorage
  const FILTERS_STORAGE_KEY = 'results_filters';
  
  // ✅ NOVO: Ref para controlar se já carregamos os filtros do storage
  const filtersLoadedFromStorageRef = useRef(false);
  
  // ✅ NOVO: Ref para controlar se estamos restaurando filtros (evita resets em cascata)
  const isRestoringFiltersRef = useRef(false);

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
  const [evaluationInfo, setEvaluationInfo] = useState<EvaluationInfoSummary | null>(null);

  // Turmas do professor (quando role === 'professor'): usadas para filtrar estatísticas e lista quando turma não está selecionada
  const [professorClassNames, setProfessorClassNames] = useState<Set<string>>(new Set());

  // Estados para controles da tabela

  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');


  // ✅ CORRIGIDO: Carregar alunos faltosos = alunos selecionados para a avaliação (no escopo) que não participaram
  const loadAbsentStudents = useCallback(async () => {
    if (!selectedEvaluation || selectedEvaluation === 'all') {
      setAbsentStudents([]);
      return;
    }

    try {
      setIsLoadingAbsentStudents(true);

      const selectedSchoolName = selectedSchool !== 'all' && schools.length > 0
        ? schools.find(s => s.id === selectedSchool)?.name
        : null;
      const selectedGradeName = selectedGrade !== 'all' && grades.length > 0
        ? grades.find(g => g.id === selectedGrade)?.name
        : null;
      const selectedClassName = selectedClass !== 'all' && classes.length > 0
        ? classes.find(c => c.id === selectedClass)?.name
        : null;

      // Participantes = quem respondeu ao menos uma questão (ranking + tabela_detalhada)
      const participatingIds = new Set<string>();
      if (apiData?.ranking?.length) {
        apiData.ranking.forEach((item: RankingItemWithAluno) => participatingIds.add(item.aluno_id));
      }
      if (apiData?.tabela_detalhada?.disciplinas?.length) {
        apiData.tabela_detalhada.disciplinas.forEach((d: { alunos: Array<{ id: string; respostas_por_questao?: Array<{ respondeu: boolean }> }> }) => {
          d.alunos.forEach((aluno: { id: string; respostas_por_questao?: Array<{ respondeu: boolean }> }) => {
            const participou = aluno.respostas_por_questao?.some((r: { respondeu: boolean }) => r.respondeu);
            if (participou) participatingIds.add(aluno.id);
          });
        });
      }

      // Lista de selecionados no escopo atual (com filtros para performance e correção)
      const filters: { municipio?: string; escola?: string; serie?: string; turma?: string } = {};
      if (selectedMunicipality && selectedMunicipality !== 'all') filters.municipio = selectedMunicipality;
      if (selectedSchool && selectedSchool !== 'all') filters.escola = selectedSchool;
      if (selectedGrade && selectedGrade !== 'all') filters.serie = selectedGrade;
      if (selectedClass && selectedClass !== 'all') filters.turma = selectedClass;

      const selectedStudentsResponse = await EvaluationResultsApiService.getStudentsByEvaluation(
        selectedEvaluation,
        Object.keys(filters).length > 0 ? filters : undefined
      );

      if (!selectedStudentsResponse || selectedStudentsResponse.length === 0) {
        setAbsentStudents([]);
        return;
      }

      const escolaNome =
        selectedSchoolName ||
        evaluationInfo?.escola ||
        apiData?.estatisticas_gerais?.escola ||
        'Escola não informada';
      const serieNome =
        selectedGradeName ||
        evaluationInfo?.serie ||
        apiData?.estatisticas_gerais?.serie ||
        'Série não informada';

      const absentStudentsList = selectedStudentsResponse
        .filter((s: { id: string; turma?: string }) => {
          if (selectedClassName && s.turma !== selectedClassName) return false;
          return !participatingIds.has(s.id);
        })
        .map((s: { id: string; nome: string; turma?: string; escola?: string; serie?: string }) => ({
          id: s.id,
          nome: s.nome,
          turma: s.turma ?? '',
          escola: s.escola || escolaNome,
          serie: s.serie || serieNome
        }))
        .sort((a: { nome: string }, b: { nome: string }) => a.nome.localeCompare(b.nome));

      setAbsentStudents(absentStudentsList);
    } catch (error) {
      console.error('Erro ao carregar alunos faltosos:', error);
      setAbsentStudents([]);
    } finally {
      setIsLoadingAbsentStudents(false);
    }
  }, [selectedEvaluation, apiData, evaluationInfo, schools, grades, classes, selectedSchool, selectedGrade, selectedClass, selectedMunicipality]);

  // Handler para mostrar modal de alunos faltosos (abre o modal na hora e carrega os dados dentro)
  const handleViewAbsent = useCallback(() => {
    setShowAbsentStudentsModal(true);
    setAbsentStudents([]);
    loadAbsentStudents();
  }, [loadAbsentStudents]);


  

  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<string | null>(null);
  const [studentDetailedAnswers, setStudentDetailedAnswers] = useState<{
    student: {
      id: string;
      nome: string;
      turma: string;
      nota: number;
      proficiencia: number;
      classificacao: string;
    };
    answers: Array<{
      question_id: string;
      question_number: number;
      question_text: string;
      is_correct: boolean;
      score: number;
    }>;
  } | null>(null);
  const [isLoadingStudentAnswers, setIsLoadingStudentAnswers] = useState(false);

  // ✅ NOVO: Estados para modal de alunos faltosos
  const [showAbsentStudentsModal, setShowAbsentStudentsModal] = useState(false);
  const [absentStudents, setAbsentStudents] = useState<Array<{
    id: string;
    nome: string;
    turma: string;
    escola: string;
    serie: string;
  }>>([]);
  const [isLoadingAbsentStudents, setIsLoadingAbsentStudents] = useState(false);

  // Estados de paginação
  const currentPage = 1;
  const perPage = 10;

  // Extrai nome de disciplina de respostas variadas (string ou objeto)
  const extractSubjectName = useCallback((subject: unknown): string => {
    if (typeof subject === 'string') return subject;
    if (subject && typeof subject === 'object') {
      const possible = subject as { name?: string; nome?: string };
      return possible.name || possible.nome || '';
    }
    return '';
  }, []);

  // ✅ NOVO: Função para salvar filtros no sessionStorage
  const saveFiltersToStorage = useCallback(() => {
    try {
      const filters = {
        selectedState,
        selectedMunicipality,
        selectedEvaluation,
        selectedSchool,
        selectedGrade,
        selectedClass,
        timestamp: Date.now()
      };
      sessionStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
    } catch (error) {
      console.error('Erro ao salvar filtros no sessionStorage:', error);
    }
  }, [selectedState, selectedMunicipality, selectedEvaluation, selectedSchool, selectedGrade, selectedClass]);

  // ✅ NOVO: Função para carregar e validar filtros do sessionStorage
  const loadFiltersFromStorage = useCallback((): {
    selectedState: string;
    selectedMunicipality: string;
    selectedEvaluation: string;
    selectedSchool: string;
    selectedGrade: string;
    selectedClass: string;
  } | null => {
    try {
      // Tentar primeiro sessionStorage
      let stored = sessionStorage.getItem(FILTERS_STORAGE_KEY);
      
      // Se não encontrar no sessionStorage, tentar migrar do localStorage (uma vez)
      if (!stored) {
        const oldStored = localStorage.getItem(FILTERS_STORAGE_KEY);
        if (oldStored) {
          // Migrar do localStorage para sessionStorage
          sessionStorage.setItem(FILTERS_STORAGE_KEY, oldStored);
          localStorage.removeItem(FILTERS_STORAGE_KEY);
          stored = oldStored;
        }
      }
      
      if (!stored) return null;

      const filters = JSON.parse(stored);
      
      // ✅ VALIDAÇÃO: Verificar estrutura básica e valores válidos
      // Aceita "all" como valor válido (é o valor padrão)
      if (
        typeof filters.selectedState === 'string' &&
        typeof filters.selectedMunicipality === 'string' &&
        typeof filters.selectedEvaluation === 'string' &&
        typeof filters.selectedSchool === 'string' &&
        typeof filters.selectedGrade === 'string' &&
        typeof filters.selectedClass === 'string'
      ) {
        // Retornar filtros validados (aceita "all" e outros valores)
        return {
          selectedState: filters.selectedState || 'all',
          selectedMunicipality: filters.selectedMunicipality || 'all',
          selectedEvaluation: filters.selectedEvaluation || 'all',
          selectedSchool: filters.selectedSchool || 'all',
          selectedGrade: filters.selectedGrade || 'all',
          selectedClass: filters.selectedClass || 'all'
        };
      }
      
      // Se a validação falhar, limpar dados inválidos do sessionStorage
      sessionStorage.removeItem(FILTERS_STORAGE_KEY);
      return null;
    } catch (error) {
      console.error('Erro ao carregar filtros do sessionStorage:', error);
      // Limpar dados corrompidos
      try {
        sessionStorage.removeItem(FILTERS_STORAGE_KEY);
        // Também limpar do localStorage caso exista
        localStorage.removeItem(FILTERS_STORAGE_KEY);
      } catch (cleanupError) {
        console.error('Erro ao limpar storage:', cleanupError);
      }
      return null;
    }
  }, []);

  // ✅ NOVO: Salvar filtros no localStorage sempre que mudarem
  useEffect(() => {
    // Não salvar se ainda não carregamos os filtros do storage (evita salvar na primeira renderização)
    if (!filtersLoadedFromStorageRef.current) {
      return;
    }
    
    // Salvar filtros quando mudarem
    saveFiltersToStorage();
  }, [selectedState, selectedMunicipality, selectedEvaluation, selectedSchool, selectedGrade, selectedClass, saveFiltersToStorage]);

  // Carregar filtros iniciais
  const loadInitialFilters = useCallback(async () => {
    try {
      setIsLoadingFilters(true);

      const statesData = await EvaluationResultsApiService.getFilterStates();
      console.log('Estados carregados:', statesData);
      
      if (statesData && statesData.length > 0) {
        setStates(statesData.map(state => ({
          id: state.id,
          name: state.nome,
          uf: state.id
        })));
      } else {
        console.warn('Nenhum estado foi retornado pela API');
        setStates([]);
      }
    } catch (error) {
      console.error("Erro ao carregar filtros iniciais:", error);
      toast({
        title: "Erro ao carregar filtros",
        description: "Não foi possível carregar os filtros. Tente novamente.",
        variant: "destructive",
      });
      setStates([]);
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
      
      // ✅ NOVO: Carregar filtros salvos do sessionStorage antes de carregar filtros iniciais
      const savedFilters = loadFiltersFromStorage();
      if (savedFilters) {
        // Marcar que estamos restaurando filtros (evita resets em cascata)
        isRestoringFiltersRef.current = true;
        
        // Definir todos os filtros de uma vez
        setSelectedState(savedFilters.selectedState);
        setSelectedMunicipality(savedFilters.selectedMunicipality);
        setSelectedEvaluation(savedFilters.selectedEvaluation);
        setSelectedSchool(savedFilters.selectedSchool);
        setSelectedGrade(savedFilters.selectedGrade);
        setSelectedClass(savedFilters.selectedClass);
        
        // Aguardar todos os useEffects e chamadas assíncronas serem executados antes de desabilitar a flag
        // Usar múltiplos requestAnimationFrame e timeout para garantir que todas as requisições foram concluídas
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(() => {
              isRestoringFiltersRef.current = false;
            }, 1500);
          });
        });
      }
      
      // Marcar que os filtros foram carregados do storage
      filtersLoadedFromStorageRef.current = true;
      
      await loadInitialFilters();
    };

    initializeData();
  }, [autoLogin, loadInitialFilters, toast, loadFiltersFromStorage]);

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
          // ✅ CORRIGIDO: Não resetar em cascata se estamos restaurando filtros
          if (!isRestoringFiltersRef.current) {
            setEvaluationsByMunicipality([]);
            resetAfterState();
          }
        } catch (error) {
          console.error("Erro ao carregar municípios:", error);
        } finally {
          setIsLoadingFilters(false);
        }
      } else {
        setMunicipalities([]);
        setEvaluationsByMunicipality([]);
        // ✅ CORRIGIDO: Não resetar em cascata se estamos restaurando filtros
        if (!isRestoringFiltersRef.current) {
          resetAfterState();
        }
      }
    };

    loadMunicipalities();
  }, [selectedState, resetAfterState]);

  // Carregar avaliações quando município for selecionado
  useEffect(() => {
    const loadEvaluations = async () => {
      // Só carregar avaliações se Estado e Município estiverem selecionados
      if (selectedState !== 'all' && selectedMunicipality !== 'all') {
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

          // ✅ CORRIGIDO: Não resetar em cascata se estamos restaurando filtros
          if (!isRestoringFiltersRef.current) {
            resetAfterEvaluation();
          }
        } catch (error) {
          console.error("Erro ao carregar avaliações:", error);
          setEvaluationsByMunicipality([]);
        } finally {
          setIsLoadingFilters(false);
        }
      } else {
        setEvaluationsByMunicipality([]);
        // ✅ CORRIGIDO: Não resetar em cascata se estamos restaurando filtros
        if (!isRestoringFiltersRef.current) {
          resetAfterEvaluation();
        }
      }
    };

    loadEvaluations();
  }, [selectedMunicipality, selectedState, resetAfterEvaluation]);

  // Carregar escolas quando avaliação for selecionada
  useEffect(() => {
    const loadSchools = async () => {
      // Só carregar escolas se os 3 filtros obrigatórios estiverem selecionados
      if (selectedState !== 'all' && selectedMunicipality !== 'all' && selectedEvaluation !== 'all') {
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

          // ✅ CORRIGIDO: Não resetar em cascata se estamos restaurando filtros
          if (!isRestoringFiltersRef.current) {
            resetAfterSchool();
          }
        } catch (error) {
          console.error("Erro ao carregar escolas:", error);
          setSchools([]);
        } finally {
          setIsLoadingFilters(false);
        }
      } else {
        setSchools([]);
        // ✅ CORRIGIDO: Não resetar em cascata se estamos restaurando filtros
        if (!isRestoringFiltersRef.current) {
          resetAfterSchool();
        }
      }
    };

    loadSchools();
  }, [selectedEvaluation, selectedState, selectedMunicipality, resetAfterSchool]);

  // Carregar séries quando escola for selecionada
  useEffect(() => {
    const loadGrades = async () => {
      // Só carregar séries se os 3 filtros obrigatórios estiverem selecionados
      if (selectedState !== 'all' && selectedMunicipality !== 'all' && selectedEvaluation !== 'all' && selectedSchool !== 'all') {
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

          // ✅ CORRIGIDO: Não resetar em cascata se estamos restaurando filtros
          if (!isRestoringFiltersRef.current) {
            resetAfterGrade();
          }
        } catch (error) {
          console.error("Erro ao carregar séries:", error);
          setGrades([]);
        } finally {
          setIsLoadingFilters(false);
        }
      } else {
        setGrades([]);
        // ✅ CORRIGIDO: Não resetar em cascata se estamos restaurando filtros
        if (!isRestoringFiltersRef.current) {
          resetAfterGrade();
        }
      }
    };

    loadGrades();
  }, [selectedSchool, selectedState, selectedMunicipality, selectedEvaluation, resetAfterGrade]);

  // Carregar turmas quando série for selecionada
  useEffect(() => {
    const loadClasses = async () => {
      // Só carregar turmas se os 3 filtros obrigatórios estiverem selecionados
      if (selectedState !== 'all' && selectedMunicipality !== 'all' && selectedEvaluation !== 'all' && selectedSchool !== 'all' && selectedGrade !== 'all') {
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

          // ✅ CORRIGIDO: Não resetar seleção dependente se estamos restaurando filtros
          if (!isRestoringFiltersRef.current) {
            setSelectedClass('all');
          }
        } catch (error) {
          console.error("Erro ao carregar turmas:", error);
          setClasses([]);
        } finally {
          setIsLoadingFilters(false);
        }
      } else {
        setClasses([]);
        // ✅ CORRIGIDO: Não resetar seleção dependente se estamos restaurando filtros
        if (!isRestoringFiltersRef.current) {
          setSelectedClass('all');
        }
      }
    };

    loadClasses();
  }, [selectedGrade, selectedState, selectedMunicipality, selectedEvaluation, selectedSchool]);

  // ✅ NOVO: Refs para debounce
  const loadAllDataTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadStudentsDataTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ NOVA IMPLEMENTAÇÃO: CARREGAMENTO SIMPLIFICADO COM A NOVA API UNIFICADA
  const loadAllData = useCallback(async () => {

    try {
      setIsLoadingData(true);
      setIsTableReady(false);
      
      const filters = {
        estado: selectedState,
        municipio: selectedMunicipality,
        avaliacao: selectedEvaluation !== 'all' ? selectedEvaluation : undefined,
        escola: selectedSchool !== 'all' ? selectedSchool : undefined,
        serie: selectedGrade !== 'all' ? selectedGrade : undefined,
        turma: selectedClass !== 'all' ? selectedClass : undefined,
      };

      // 🚀 CARREGAMENTO UNIFICADO: Uma única chamada para a nova API
      const evaluationsResponse = await EvaluationResultsApiService.getEvaluationsList(currentPage, perPage, filters);
      
   
      if (evaluationsResponse) {
        setApiData(evaluationsResponse);

        // ✅ CORRIGIDO: Usar APENAS dados de estatisticas_gerais do backend
        if (selectedEvaluation !== 'all' && evaluationsResponse.estatisticas_gerais) {
          const resumo: EvaluationInfoSummary = {
            id: selectedEvaluation,
            titulo: evaluationsResponse.estatisticas_gerais.nome || 'Avaliação',
            status: 'pendente',
            total_alunos: evaluationsResponse.estatisticas_gerais.total_alunos,
            alunos_participantes: evaluationsResponse.estatisticas_gerais.alunos_participantes,
            alunos_ausentes: evaluationsResponse.estatisticas_gerais.alunos_ausentes,
            media_nota: evaluationsResponse.estatisticas_gerais.media_nota_geral,
            media_proficiencia: evaluationsResponse.estatisticas_gerais.media_proficiencia_geral,
            escola: selectedSchool === 'all' 
              ? 'Todas as Escolas' 
              : evaluationsResponse.estatisticas_gerais.escola,
            municipio: evaluationsResponse.estatisticas_gerais.municipio,
            serie: evaluationsResponse.estatisticas_gerais.serie,
          };

        // Coletar disciplinas dos resultados por disciplina
        const subjectsFromResults = evaluationsResponse.resultados_por_disciplina
          .map(d => {
            const subject = d.disciplina;
            if (typeof subject === 'string') return subject;
            if (subject && typeof subject === 'object') {
              const possible = subject as { name?: string; nome?: string };
              return possible.name || possible.nome || '';
            }
            return '';
          })
          .filter(Boolean);
          
          if (subjectsFromResults.length > 0) {
            resumo.disciplinas = subjectsFromResults;
            resumo.disciplina = subjectsFromResults[0];
          }

          setEvaluationInfo(resumo);
        } else {
          setEvaluationInfo(null);
        }
      } else {
        setApiData(null);
        setEvaluationInfo(null);
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
    } finally {
      setIsLoadingData(false);
    }
  }, [
    selectedState,
    selectedMunicipality,
    selectedEvaluation,
    selectedSchool,
    selectedGrade,
    selectedClass,
    toast,
    currentPage,
    perPage
  ]);

  // Usuários com restrição: obrigatório selecionar Escola. Admin e tecadmin usam o mesmo fluxo (Estado, Município, Avaliação).
  const isRestrictedUser = user?.role === 'professor' ||
                          user?.role === 'diretor' ||
                          user?.role === 'coordenador';

  // Verificar se é professor especificamente (para mensagens específicas)
  const isProfessor = user?.role === 'professor';

  // Carregar turmas do professor para filtrar estatísticas/lista quando turma não está selecionada
  useEffect(() => {
    if (user?.role !== 'professor' || !user?.id) {
      setProfessorClassNames(new Set());
      return;
    }
    let cancelled = false;
    getUserHierarchyContext(user.id, user.role).then((ctx) => {
      if (cancelled) return;
      const names = (ctx.classes ?? [])
        .map((c) => (c.class_name ?? '').trim())
        .filter(Boolean);
      setProfessorClassNames(new Set(names));
    }).catch(() => {
      if (!cancelled) setProfessorClassNames(new Set());
    });
    return () => { cancelled = true; };
  }, [user?.id, user?.role]);

  // ✅ Carregar dados quando os filtros obrigatórios estiverem preenchidos.
  // Admin e tecadmin: Estado, Município e Avaliação. Professor/diretor/coordenador: + Escola obrigatória.
  useEffect(() => {
    const requiredFiltersFilled = selectedState !== 'all' && 
                                 selectedMunicipality !== 'all' && 
                                 selectedEvaluation !== 'all' &&
                                 (!isRestrictedUser || selectedSchool !== 'all');
    
    if (!requiredFiltersFilled) {
      // ✅ CORRIGIDO: Só limpar dados se realmente não temos os filtros mínimos
      // Não limpar se apenas estamos mudando filtros opcionais (escola, série, turma)
      const hasMinimumFilters = selectedState !== 'all' && 
                                selectedMunicipality !== 'all' && 
                                selectedEvaluation !== 'all';
      
      if (!hasMinimumFilters) {
        // Só limpar se não temos os filtros mínimos obrigatórios
        setApiData(null);
        setEvaluationInfo(null);
      }
      return;
    }
    
    // Limpar timeout anterior
    if (loadAllDataTimeoutRef.current) {
      clearTimeout(loadAllDataTimeoutRef.current);
    }
    
    // Criar novo timeout com debounce de 500ms
    loadAllDataTimeoutRef.current = setTimeout(() => {
      loadAllData();
    }, 500);
    
    // Cleanup function
    return () => {
      if (loadAllDataTimeoutRef.current) {
        clearTimeout(loadAllDataTimeoutRef.current);
      }
    };
  }, [loadAllData, selectedState, selectedMunicipality, selectedEvaluation, selectedSchool, isRestrictedUser]);

  const handleExportResults = async () => {
    try {
      const XLSX = await import('xlsx');
      const { saveAs } = await import('file-saver');

      // ✅ CORRIGIDO: Usar tabela_detalhada filtrada se disponível, caso contrário usar resultados_detalhados
      if (!apiData) {
        toast({
          title: "Nenhum dado para exportar",
          description: "Não há dados disponíveis para gerar a planilha",
          variant: "destructive",
        });
        return;
      }

      // Obter nomes correspondentes aos IDs dos filtros
      const selectedSchoolName = selectedSchool !== 'all' ? schools.find(s => s.id === selectedSchool)?.name : null;
      const selectedGradeName = selectedGrade !== 'all' ? grades.find(g => g.id === selectedGrade)?.name : null;
      const selectedClassName = selectedClass !== 'all' ? classes.find(c => c.id === selectedClass)?.name : null;

      let worksheetData: (string | number)[][] = [];

      // Se há filtros específicos e tabela_detalhada disponível, usar dados filtrados
      if ((selectedClassName || selectedGradeName || selectedSchoolName) && apiData.tabela_detalhada?.disciplinas?.length) {
        // Coletar alunos únicos que atendem aos filtros
        const alunosMap = new Map<string, {
          id: string;
          nome: string;
          turma: string;
          serie: string;
          escola: string;
          nota: number;
          proficiencia: number;
          acertos: number;
          total_questoes: number;
        }>();

        apiData.tabela_detalhada.disciplinas.forEach(disciplina => {
          disciplina.alunos.forEach(aluno => {
            // Aplicar filtros
            if (selectedClassName && aluno.turma !== selectedClassName) return;
            if (selectedGradeName && aluno.serie !== selectedGradeName) return;
            if (selectedSchoolName && aluno.escola !== selectedSchoolName) return;

            // Verificar se participou
            const participou = aluno.respostas_por_questao.some(resposta => resposta.respondeu);
            if (!participou) return;

            if (!alunosMap.has(aluno.id)) {
              alunosMap.set(aluno.id, {
                id: aluno.id,
                nome: aluno.nome,
                turma: aluno.turma,
                serie: aluno.serie,
                escola: aluno.escola,
                nota: aluno.nota,
                proficiencia: aluno.proficiencia,
                acertos: aluno.total_acertos,
                total_questoes: aluno.total_questoes_disciplina
              });
            } else {
              // Consolidar dados de múltiplas disciplinas
              const existing = alunosMap.get(aluno.id)!;
              existing.acertos += aluno.total_acertos;
              existing.total_questoes += aluno.total_questoes_disciplina;
            }
          });
        });

        const alunosArray = Array.from(alunosMap.values());
        const totalAlunos = alunosArray.length;
        const participantes = alunosArray.length; // Todos já são participantes
        const mediaNota = alunosArray.length > 0
          ? alunosArray.reduce((sum, a) => sum + a.nota, 0) / alunosArray.length
          : 0;
        const mediaProficiencia = alunosArray.length > 0
          ? alunosArray.reduce((sum, a) => sum + a.proficiencia, 0) / alunosArray.length
          : 0;

        worksheetData = [
          ['Avaliação', 'Disciplina', 'Escola', 'Série', 'Turma', 'Município', 'Estado', 'Participantes', 'Média', 'Proficiência', 'Status'],
          [
            evaluationInfo?.titulo || 'Avaliação',
            evaluationInfo?.disciplina || evaluationInfo?.disciplinas?.join(', ') || 'Disciplina',
            selectedSchoolName || evaluationInfo?.escola || 'Escola',
            selectedGradeName || evaluationInfo?.serie || 'Série',
            selectedClassName || 'Turma',
            evaluationInfo?.municipio || 'Município',
            apiData.estatisticas_gerais?.estado || 'Estado',
            `${participantes}/${totalAlunos}`,
            mediaNota.toFixed(1),
            mediaProficiencia.toFixed(1),
            'Concluída'
          ]
        ];

        // Adicionar linha por aluno se necessário
        if (alunosArray.length > 0) {
          worksheetData.push(['']); // Linha em branco
          worksheetData.push(['Alunos Detalhados']);
          worksheetData.push(['Nome', 'Turma', 'Série', 'Escola', 'Nota', 'Proficiência', 'Acertos', 'Total Questões']);
          alunosArray.forEach(aluno => {
            worksheetData.push([
              aluno.nome,
              aluno.turma,
              aluno.serie,
              aluno.escola,
              aluno.nota.toFixed(1),
              aluno.proficiencia.toFixed(1),
              aluno.acertos,
              aluno.total_questoes
            ]);
          });
        }
      } else {
        // Fallback: usar resultados_detalhados se disponível
        if (!apiData.resultados_detalhados?.avaliacoes?.length) {
          toast({
            title: "Nenhum dado para exportar",
            description: "Não há avaliações para gerar a planilha",
            variant: "destructive",
          });
          return;
        }

        worksheetData = [
          ['Avaliação', 'Disciplina', 'Escola', 'Série', 'Turma', 'Município', 'Estado', 'Participantes', 'Média', 'Proficiência', 'Status'],
          ...(apiData.resultados_detalhados.avaliacoes || []).map(evaluation => [
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
            'Concluída'
          ])
        ];
      }

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
  const inferStageGroup = useCallback((): StageGroup => {
    const names: string[] = [
      grades.find(g => g.id === selectedGrade)?.name,
      apiData?.estatisticas_gerais?.serie,
      apiData?.resultados_detalhados?.avaliacoes?.[0]?.serie,
    ]
      .filter(Boolean)
      .map((s) => (s as string).toLowerCase());

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

  // Normalizador de status para manter o tipo estrito
  const normalizeStatus = useCallback((status: string | undefined): 'concluida' | 'em_andamento' | 'pendente' => {
    if (status === 'concluida' || status === 'em_andamento' || status === 'pendente') return status;
    return 'pendente';
  }, []);

  // Verificar se todos os filtros obrigatórios estão selecionados
  // Para todos: Estado, Município e Avaliação são obrigatórios
  // Para professores, diretores e coordenadores: Escola também é obrigatória
  const allRequiredFiltersSelected = selectedState !== 'all' && 
                                    selectedMunicipality !== 'all' && 
                                    selectedEvaluation !== 'all' &&
                                    (!isRestrictedUser || selectedSchool !== 'all');

  // Estados para dados reais dos alunos (como no DetailedResultsView)
  const [students, setStudents] = useState<Array<{
    id: string;
    nome: string;
    turma: string;
    nota: number;
    proficiencia: number;
    classificacao: 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado';
    questoes_respondidas: number;
    acertos: number;
    erros: number;
    em_branco: number;
    tempo_gasto: number;
    status: 'concluida' | 'pendente';
  }>>([]);
  
  const [detailedReport, setDetailedReport] = useState<SimpleDetailedReport | null>(null);
  const [questionsWithSkills, setQuestionsWithSkills] = useState<Array<{
    id: string;
    number: number;
    text: string;
    formattedText: string;
    alternatives?: Array<{
      id: string;
      text: string;
      isCorrect: boolean;
    }>;
    skills: string[];
    difficulty: 'Fácil' | 'Médio' | 'Difícil';
    solution: string;
    type: 'multipleChoice' | 'open' | 'trueFalse';
    value: number;
    subject: {
      id: string;
      name: string;
    };
    grade: {
      id: string;
      name: string;
    };
  }>>([]);
  
  const [skillsMapping, setSkillsMapping] = useState<Record<string, string>>({});
  const [skillsBySubject, setSkillsBySubject] = useState<Record<string, Array<{
    id: string | null;
    code: string;
    description: string;
    source: 'database' | 'question';
  }>>>({});
  
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isTableReady, setIsTableReady] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [loadingDetails, setLoadingDetails] = useState<{
    detailedReport: boolean;
    questionsWithSkills: boolean;
    skills: boolean;
    students: boolean;
  }>({
    detailedReport: false,
    questionsWithSkills: false,
    skills: false,
    students: false
  });

    // ✅ CORRIGIDO: Consolidar dados por aluno (evitar duplicatas)
  const processTableData = useCallback(() => {
    if (!apiData?.tabela_detalhada?.disciplinas?.length) {
      return {
        students: [],
        questions: [],
        totalQuestions: 0
      };
    }

    // ✅ Agrupar alunos por ID para evitar duplicatas
    const studentsMap = new Map<string, {
      id: string;
      nome: string;
      turma: string;
      escola?: string;
      serie?: string;
      nota: number;
      proficiencia: number;
      classificacao: 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado';
      questoes_respondidas: number;
      acertos: number;
      erros: number;
      em_branco: number;
      tempo_gasto: number;
      status: 'concluida' | 'pendente';
      respostas: Array<{
        questao_id: string;
        questao_numero: number;
        resposta_correta: boolean;
        resposta_em_branco: boolean;
        tempo_gasto: number;
      }>;
    }>();

    // Professor sem turma selecionada: só incluir alunos das turmas do professor
    const isProfessorNoClass = user?.role === 'professor' && selectedClass === 'all' && professorClassNames.size > 0;

    // ✅ Processar cada disciplina e consolidar dados por aluno
    apiData.tabela_detalhada.disciplinas.forEach(disciplina => {
      disciplina.alunos.forEach(aluno => {
        if (isProfessorNoClass && !professorClassNames.has((aluno.turma ?? '').trim())) return;

        // ✅ CORRIGIDO: Verificar se o aluno respondeu pelo menos uma questão
        const hasAnsweredAnyQuestion = aluno.respostas_por_questao.some(resposta => resposta.respondeu);
        
        // ✅ NOVO: Só incluir alunos que responderam pelo menos uma questão
        if (!hasAnsweredAnyQuestion) {
          return; // Pular alunos que não responderam nenhuma questão
        }

        if (!studentsMap.has(aluno.id)) {
          // Primeira vez vendo este aluno - criar entrada
          studentsMap.set(aluno.id, {
            id: aluno.id,
            nome: aluno.nome,
            turma: aluno.turma,
            escola: aluno.escola ?? undefined,
            serie: aluno.serie ?? undefined,
            nota: aluno.nota,
            proficiencia: aluno.proficiencia,
            classificacao: aluno.nivel_proficiencia as 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado',
            questoes_respondidas: aluno.total_respondidas,
            acertos: aluno.total_acertos,
            erros: aluno.total_erros,
            em_branco: aluno.total_questoes_disciplina - aluno.total_respondidas,
            tempo_gasto: 0,
            status: 'concluida' as const,
            respostas: aluno.respostas_por_questao.map(resposta => ({
              questao_id: `q${resposta.questao}`,
              questao_numero: resposta.questao,
              resposta_correta: resposta.acertou,
              resposta_em_branco: !resposta.respondeu,
              tempo_gasto: 0
            }))
          });
        } else {
          // Aluno já existe - consolidar dados
          const existingStudent = studentsMap.get(aluno.id)!;
          
          // Somar acertos, erros e questões respondidas
          existingStudent.acertos += aluno.total_acertos;
          existingStudent.erros += aluno.total_erros;
          existingStudent.questoes_respondidas += aluno.total_respondidas;
          existingStudent.em_branco += (aluno.total_questoes_disciplina - aluno.total_respondidas);
          
          // Adicionar respostas desta disciplina
          const newRespostas = aluno.respostas_por_questao.map(resposta => ({
            questao_id: `q${resposta.questao}`,
            questao_numero: resposta.questao,
            resposta_correta: resposta.acertou,
            resposta_em_branco: !resposta.respondeu,
            tempo_gasto: 0
          }));
          
          existingStudent.respostas.push(...newRespostas);
        }
      });
    });

    // ✅ Usar questões exatamente como vêm do backend
    const allQuestions = apiData.tabela_detalhada.disciplinas.flatMap(disciplina => 
      disciplina.questoes.map(questao => ({
        id: questao.question_id,
        numero: questao.numero,
        habilidade: questao.habilidade,
        codigo_habilidade: questao.codigo_habilidade,
        question_id: questao.question_id
      }))
    );

    return {
      students: Array.from(studentsMap.values()),
      questions: allQuestions.sort((a, b) => a.numero - b.numero),
      totalQuestions: allQuestions.length
    };
  }, [apiData, user?.role, selectedClass, professorClassNames]);

  // ✅ NOVO: Processar dados do ranking usando tabela_detalhada.geral
  const processRankingData = useCallback(() => {
    const isProfessorNoClass = user?.role === 'professor' && selectedClass === 'all' && professorClassNames.size > 0;

    // Prioridade 1: Usar dados da tabela_detalhada.geral (mesma fonte da visão geral)
    const tabelaDetalhada = apiData?.tabela_detalhada as TabelaDetalhada | undefined;
    if (tabelaDetalhada?.geral?.alunos?.length) {
      return tabelaDetalhada.geral.alunos
        .filter(aluno => {
          if (isProfessorNoClass && !professorClassNames.has((aluno.turma ?? '').trim())) return false;
          // Verificar se o aluno respondeu pelo menos uma questão
          if (!apiData?.tabela_detalhada?.disciplinas?.length) {
            return true; // Fallback: incluir todos se não temos dados de disciplinas
          }
          
          return tabelaDetalhada.disciplinas.some(disciplina => {
            const disciplinaAluno = disciplina.alunos.find(a => a.id === aluno.id);
            if (!disciplinaAluno) return false;
            return disciplinaAluno.respostas_por_questao.some(resposta => resposta.respondeu);
          });
        })
        .map(aluno => ({
          id: aluno.id,
          nome: aluno.nome,
          turma: aluno.turma || 'N/A',
          escola: aluno.escola ?? '',
          serie: aluno.serie ?? '',
          nota: aluno.nota_geral,
          proficiencia: aluno.proficiencia_geral,
          classificacao: aluno.nivel_proficiencia_geral as 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado',
          questoes_respondidas: aluno.total_respondidas_geral,
          acertos: aluno.total_acertos_geral,
          erros: aluno.total_questoes_geral - aluno.total_acertos_geral,
          em_branco: aluno.total_em_branco_geral,
          tempo_gasto: 0,
          status: 'concluida' as const
        }));
    }
    
    // Prioridade 2: Fallback para apiData.ranking se tabela_detalhada.geral não disponível
    if (apiData?.ranking?.length) {
      return apiData.ranking
        .filter((item: RankingItemWithAluno) => {
          if (isProfessorNoClass && !professorClassNames.has((item.turma ?? '').trim())) return false;
          if (!apiData?.tabela_detalhada?.disciplinas?.length) {
            return true;
          }
          return apiData.tabela_detalhada.disciplinas.some(disciplina => {
            const disciplinaAluno = disciplina.alunos.find(a => a.id === item.aluno_id);
            if (!disciplinaAluno) return false;
            return disciplinaAluno.respostas_por_questao.some(resposta => resposta.respondeu);
          });
        })
        .map((item: RankingItemWithAluno) => ({
          id: item.aluno_id,
          nome: item.nome,
          turma: item.turma || 'N/A',
          escola: item.escola ?? '',
          serie: item.serie ?? '',
          nota: item.nota_geral || 0,
          proficiencia: item.proficiencia_geral || 0,
          classificacao: item.classificacao_geral as 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado',
          questoes_respondidas: item.total_questoes || 0,
          acertos: item.total_acertos || 0,
          erros: (item.total_questoes || 0) - (item.total_acertos || 0),
          em_branco: 0,
          tempo_gasto: 0,
          status: 'concluida' as const
        }));
    }

    return [];
  }, [apiData, user?.role, selectedClass, professorClassNames]);

  // ✅ NOVA IMPLEMENTAÇÃO: Processar dados dos alunos da tabela_detalhada da nova API
  const loadStudentsData = useCallback(async () => {
    // ✅ MODIFICADO: Permitir carregamento quando avaliação específica estiver selecionada
    if (selectedEvaluation === 'all' || !apiData) {
      setStudents([]);
      setDetailedReport(null);
      setQuestionsWithSkills([]);
      setSkillsMapping({});
      setSkillsBySubject({});
      setIsTableReady(false);
      setLoadingStep('');
      setLoadingProgress(0);
      setLoadingDetails({
        detailedReport: false,
        questionsWithSkills: false,
        skills: false,
        students: false
      });
      return;
    }

    try {
      setIsLoadingStudents(true);
      setIsTableReady(false);
      setLoadingStep('Processando dados dos alunos...');
      setLoadingProgress(20);

      // ✅ NOVO: Usar dados da tabela_detalhada se disponível
      if (apiData.tabela_detalhada?.disciplinas?.length) {
        setLoadingStep('Processando dados da tabela detalhada...');
        setLoadingProgress(50);
        
        // Usar a função processTableData para obter dados estruturados
        const tableData = processTableData();
        setStudents(tableData.students);
        setLoadingProgress(80);
      } else {
        // ✅ FALLBACK: Usar dados do ranking se disponível (já filtrados)
        if (apiData.ranking?.length) {
          setLoadingStep('Processando dados do ranking...');
          setLoadingProgress(50);
          
          // ✅ CORRIGIDO: Usar a função processRankingData que já filtra alunos que responderam
          const studentsFromRanking = processRankingData();
          
          setStudents(studentsFromRanking);
          setLoadingProgress(80);
        } else {
          // ✅ ÚLTIMO FALLBACK: Tentar carregar dados detalhados separadamente
          setLoadingStep('Buscando dados detalhados...');
          setLoadingProgress(30);
          
          try {
            const detailedReportResponse = await EvaluationResultsApiService.getDetailedReport(selectedEvaluation);
            
            if (detailedReportResponse && detailedReportResponse.alunos) {
              const transformedStudents = detailedReportResponse.alunos.map((aluno: DetailedReportAluno) => ({
            id: aluno.id,
            nome: aluno.nome,
            turma: aluno.turma,
            nota: aluno.nota_final,
                proficiencia: aluno.proficiencia,
            classificacao: aluno.classificacao as 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado',
            questoes_respondidas: aluno.total_acertos + aluno.total_erros + aluno.total_em_branco,
            acertos: aluno.total_acertos,
            erros: aluno.total_erros,
            em_branco: aluno.total_em_branco,
                tempo_gasto: aluno.respostas?.reduce((total: number, resp: { tempo_gasto: number }) => total + resp.tempo_gasto, 0) || 0,
            status: (aluno.status === 'concluida' ? 'concluida' : 'pendente') as 'concluida' | 'pendente'
              }));
        
        setStudents(transformedStudents);
        setLoadingProgress(80);
      } else {
              setStudents([]);
            }
                } catch (error) {
          setStudents([]);
        }
        }
      }
      
      // Marcar tabela como pronta
      setIsTableReady(true);
      setLoadingProgress(100);
      setLoadingStep('Dados carregados com sucesso!');

      // ✅ OTIMIZADO: Removidas chamadas em background desnecessárias
      
    } catch (error) {
      console.error('Erro ao carregar dados dos alunos:', error);
      setStudents([]);
      setIsTableReady(false);
      setLoadingStep('Erro no carregamento');
      setLoadingProgress(0);
    } finally {
      setIsLoadingStudents(false);
      // Pequeno delay para mostrar a etapa final
      setTimeout(() => {
        setLoadingStep('');
        setLoadingProgress(0);
      }, 1000);
    }
  }, [selectedEvaluation, apiData, processTableData, processRankingData]);

  // ✅ OTIMIZADO: Carregar dados dos alunos quando a avaliação mudar com debounce
  useEffect(() => {
    // Limpar timeout anterior
    if (loadStudentsDataTimeoutRef.current) {
      clearTimeout(loadStudentsDataTimeoutRef.current);
    }
    
    // Criar novo timeout com debounce de 300ms
    loadStudentsDataTimeoutRef.current = setTimeout(() => {
      loadStudentsData();
    }, 300);
    
    // Cleanup function
    return () => {
      if (loadStudentsDataTimeoutRef.current) {
        clearTimeout(loadStudentsDataTimeoutRef.current);
      }
    };
  }, [loadStudentsData]);

  // ✅ REMOVIDO: loadExtraData que estava causando chamadas desnecessárias

    // ✅ CORRIGIDO: Usar APENAS dados do backend sem geração de dados simulados
  const transformedStudents = useMemo(() => {
    // Prioridade 1: Dados da tabela_detalhada (mais completos)
    const tableData = processTableData();
    if (tableData.students.length > 0) {
      return tableData.students;
    }
    
    // Prioridade 2: Dados do ranking (já processados)
    const rankingData = processRankingData();
    if (rankingData.length > 0) {
      return rankingData;
    }
    
    // Prioridade 3: Dados carregados separadamente (fallback)
    if (students.length > 0) {
      return students;
    }
    
    // ✅ REMOVIDO: Geração de dados simulados - usar apenas dados do backend
    return [];
  }, [students, processTableData, processRankingData]);

  // Filtrar estudantes baseado nos filtros
  const filteredStudents = useMemo(() => {
    return transformedStudents.sort((a, b) => a.nome.localeCompare(b.nome));
  }, [transformedStudents]);

  const buildDisciplineStatsForStudent = useCallback((studentId: string): DisciplineStatsMap | null => {
    const tabelaDetalhada = apiData?.tabela_detalhada as TabelaDetalhada | undefined;
    if (!tabelaDetalhada?.disciplinas?.length) {
      return null;
    }

    const stats: DisciplineStatsMap = {};

    tabelaDetalhada.disciplinas.forEach((disciplina) => {
      if (!disciplina?.nome) return;
      const aluno = disciplina.alunos?.find((item) => item.id === studentId);
      if (!aluno) return;

      stats[disciplina.nome] = {
        nota: Number(aluno.nota ?? 0),
        proficiencia: Number(aluno.proficiencia ?? 0),
        totalQuestions: Number(aluno.total_questoes_disciplina ?? disciplina.questoes?.length ?? 0),
        correctAnswers: Number(aluno.total_acertos ?? 0)
      };
    });

    const geralAluno = tabelaDetalhada.geral?.alunos?.find((item) => item.id === studentId);
    if (geralAluno) {
      stats.GERAL = {
        nota: Number(geralAluno.nota_geral ?? 0),
        proficiencia: Number(geralAluno.proficiencia_geral ?? 0),
        totalQuestions: Number(geralAluno.total_questoes_geral ?? 0),
        correctAnswers: Number(geralAluno.total_acertos_geral ?? 0)
      };
    }

    return Object.keys(stats).length > 0 ? stats : null;
  }, [apiData]);

  // ✅ NOVO: Função para carregar respostas detalhadas de um aluno
  const handleLoadStudentAnswers = useCallback(async (studentId: string) => {
    if (!selectedEvaluation || selectedEvaluation === 'all') return;
    
    setIsLoadingStudentAnswers(true);
    setSelectedStudentForDetails(studentId);
    
    try {
      const answers = await EvaluationResultsApiService.getStudentDetailedAnswers(
        selectedEvaluation,
        studentId
      );
      
      if (answers) {
        setStudentDetailedAnswers(answers);
      }
    } catch (error) {
      console.error('Erro ao carregar respostas detalhadas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as respostas detalhadas.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingStudentAnswers(false);
    }
  }, [selectedEvaluation, toast]);

  // Função para visualizar detalhes do estudante (adaptada)
  const handleViewStudentDetails = (studentId: string) => {
    if (selectedEvaluation && selectedEvaluation !== 'all') {
      const stats = buildDisciplineStatsForStudent(studentId);
      if (stats && Object.keys(stats).length > 0) {
        saveBulletinStatsToStorage(selectedEvaluation, studentId, stats);
      }
      // Carregar respostas detalhadas antes de navegar
      handleLoadStudentAnswers(studentId);
      const path = `/app/avaliacao/${selectedEvaluation}/aluno/${studentId}/resultados`;
      if (stats && Object.keys(stats).length > 0) {
        navigate(path, { state: { disciplineStats: stats } });
      } else {
        navigate(path);
      }
    }
  };

  // ✅ NOVO: Função para abrir página detalhada em nova guia
  const handleOpenInNewTab = (studentId: string) => {
    if (selectedEvaluation && selectedEvaluation !== 'all') {
      const stats = buildDisciplineStatsForStudent(studentId);
      if (stats && Object.keys(stats).length > 0) {
        saveBulletinStatsToStorage(selectedEvaluation, studentId, stats);
      }
      const url = `/app/avaliacao/${selectedEvaluation}/aluno/${studentId}/resultados`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Total de questões calculado a partir das fontes disponíveis
  const computedTotalQuestions = useMemo(() => {
    // 1) Valor explícito na avaliação, se existir
    const byEvaluation = detailedReport?.avaliacao?.total_questoes;
    if (typeof byEvaluation === 'number' && byEvaluation > 0) return byEvaluation;

    // 2) Lista de questões vinda no relatório detalhado
    const byReportQuestions = detailedReport?.questoes?.length;
    if (typeof byReportQuestions === 'number' && byReportQuestions > 0) return byReportQuestions;

    // 3) Lista de questões com skills
    if (questionsWithSkills.length > 0) return questionsWithSkills.length;

    // 4) Inferir pelo maior questao_numero nas respostas dos alunos do relatório
    if (detailedReport?.alunos?.length) {
      const maxFromAnswers = detailedReport.alunos.reduce((globalMax, aluno) => {
        const localMax = (aluno.respostas || []).reduce((m, r) => {
          const n = typeof r.questao_numero === 'number' ? r.questao_numero : 0;
          return n > m ? n : m;
        }, 0);
        return localMax > globalMax ? localMax : globalMax;
      }, 0);
      if (maxFromAnswers > 0) return maxFromAnswers;
    }

    // 5) Fallback: inferir pelo maior total por aluno
    //    Regra:
    //    - Se o campo questoes_respondidas já representa o total da avaliação, use-o
    //    - Caso contrário, use a soma acertos+erros+em_branco (quando disponível)
    if (students.length > 0) {
      const maxFromStudents = students.reduce((currentMax, student) => {
        const fromQuestoesRespondidas = Number(student.questoes_respondidas || 0);
        const fromSum = Number((student.acertos || 0) + (student.erros || 0) + (student.em_branco || 0));
        const candidate = Math.max(fromQuestoesRespondidas, fromSum);
        return candidate > currentMax ? candidate : currentMax;
      }, 0);
      if (maxFromStudents > 0) return maxFromStudents;
    }

    return 0;
  }, [detailedReport, questionsWithSkills, students]);

  // Tipos auxiliares para normalização
  type IncomingQuestion = {
    id?: string;
    numero: number;
    texto?: string;
    habilidade?: string;
    codigo_habilidade?: string;
    tipo?: 'multipleChoice' | 'open' | 'trueFalse';
    dificuldade?: 'Fácil' | 'Médio' | 'Difícil';
    porcentagem_acertos?: number;
    porcentagem_erros?: number;
  };

  const normalizedQuestoes = useMemo<TableQuestionData[] | undefined>(() => {
    if (!detailedReport?.questoes) return undefined;
    return (detailedReport.questoes as unknown as IncomingQuestion[]).map((q) => ({
      id: q.id ?? String(q.numero),
      numero: q.numero,
      texto: q.texto ?? '',
      habilidade: q.habilidade ?? '',
      codigo_habilidade: q.codigo_habilidade ?? '',
      tipo: q.tipo ?? 'multipleChoice',
      dificuldade: q.dificuldade ?? 'Médio',
      porcentagem_acertos: q.porcentagem_acertos ?? 0,
      porcentagem_erros: q.porcentagem_erros ?? 0,
    }));
  }, [detailedReport?.questoes]);

  const normalizedDetailedReport = useMemo<TableDetailedReport | undefined>(() => {
    if (!detailedReport) return undefined;
    const totalQ = detailedReport.avaliacao.total_questoes ?? normalizedQuestoes?.length ?? computedTotalQuestions ?? 0;
    return {
      avaliacao: {
        id: detailedReport.avaliacao.id,
        titulo: detailedReport.avaliacao.titulo,
        disciplina: detailedReport.avaliacao.disciplina,
        total_questoes: totalQ,
      },
      questoes: normalizedQuestoes ?? [],
      alunos: detailedReport.alunos.map((a) => ({
        id: a.id,
        nome: a.nome,
        turma: a.turma,
        respostas: (a.respostas || []).map((r) => ({
          questao_id: String(r.questao_numero ?? ''),
          questao_numero: r.questao_numero ?? 0,
          resposta_correta: false,
          resposta_em_branco: true,
          tempo_gasto: r.tempo_gasto ?? 0,
        })),
        total_acertos: a.total_acertos,
        total_erros: a.total_erros,
        total_em_branco: a.total_em_branco,
        nota_final: a.nota_final,
        proficiencia: a.proficiencia,
        classificacao: a.classificacao,
        status: a.status === 'concluida' ? 'concluida' : 'nao_respondida',
      })),
    };
  }, [detailedReport, normalizedQuestoes, computedTotalQuestions]);

  // ✅ CORRIGIDO: Calcular estatísticas respeitando filtros selecionados
  const derivedStats = useMemo(() => {
    // Professor sem turma selecionada: usar apenas alunos das turmas do professor (não mostrar dados de outras turmas)
    const isProfessorWithoutClass = user?.role === 'professor' && selectedClass === 'all' && professorClassNames.size > 0;
    if (isProfessorWithoutClass && apiData?.tabela_detalhada?.disciplinas?.length) {
      const alunosMap = new Map<string, { id: string; nome: string; turma: string; serie: string; escola: string; nota: number; proficiencia: number; participou: boolean }>();
      apiData.tabela_detalhada.disciplinas.forEach(disciplina => {
        disciplina.alunos.forEach(aluno => {
          const turmaNorm = (aluno.turma ?? '').trim();
          if (!professorClassNames.has(turmaNorm)) return;
          const participou = aluno.respostas_por_questao?.some(resposta => resposta.respondeu) ?? false;
          if (!alunosMap.has(aluno.id)) {
            alunosMap.set(aluno.id, {
              id: aluno.id,
              nome: aluno.nome,
              turma: aluno.turma,
              serie: aluno.serie,
              escola: aluno.escola,
              nota: aluno.nota,
              proficiencia: aluno.proficiencia,
              participou
            });
          }
        });
      });
      const alunosArray = Array.from(alunosMap.values());
      const participantes = alunosArray.filter(a => a.participou);
      const totalAlunos = alunosArray.length;
      const ausentes = totalAlunos - participantes.length;
      const mediaNota = participantes.length > 0 ? participantes.reduce((sum, a) => sum + a.nota, 0) / participantes.length : 0;
      const mediaProficiencia = participantes.length > 0 ? participantes.reduce((sum, a) => sum + a.proficiencia, 0) / participantes.length : 0;
      return { totalAlunos, participantes: participantes.length, ausentes, mediaNota, mediaProficiencia };
    }

    // Se há filtros específicos selecionados, calcular estatísticas filtradas
    const hasSpecificFilters = selectedClass !== 'all' || selectedGrade !== 'all' || selectedSchool !== 'all';
    
    // ✅ CORRIGIDO: Só calcular estatísticas filtradas se temos os nomes dos filtros disponíveis
    if (hasSpecificFilters && apiData?.tabela_detalhada?.disciplinas?.length) {
      // Obter nomes correspondentes aos IDs dos filtros (com verificação de disponibilidade)
      const selectedSchoolName = selectedSchool !== 'all' && schools.length > 0
        ? schools.find(s => s.id === selectedSchool)?.name 
        : null;
      const selectedGradeName = selectedGrade !== 'all' && grades.length > 0
        ? grades.find(g => g.id === selectedGrade)?.name 
        : null;
      const selectedClassName = selectedClass !== 'all' && classes.length > 0
        ? classes.find(c => c.id === selectedClass)?.name 
        : null;
      
      // ✅ CORRIGIDO: Se filtro de escola está selecionado mas nome não está disponível, usar fallback
      // Ou se temos estatisticas_gerais válidas (não zeradas), preferir usar elas
      const hasValidStats = apiData?.estatisticas_gerais && 
                            (apiData.estatisticas_gerais.total_alunos > 0 || 
                             apiData.estatisticas_gerais.alunos_participantes > 0);
      
      if ((selectedSchool !== 'all' && !selectedSchoolName) || hasValidStats) {
        // Usar dados gerais do backend quando não temos o nome da escola ainda ou quando temos stats válidas
        const totalAlunos = apiData?.estatisticas_gerais?.total_alunos || 0;
        const participantes = apiData?.estatisticas_gerais?.alunos_participantes || 0;
        const ausentes = apiData?.estatisticas_gerais?.alunos_ausentes || 0;
        const mediaNota = apiData?.estatisticas_gerais?.media_nota_geral || 0;
        const mediaProficiencia = apiData?.estatisticas_gerais?.media_proficiencia_geral || 0;
        return { totalAlunos, participantes, ausentes, mediaNota, mediaProficiencia };
      }
      
      // Coletar todos os alunos únicos que atendem aos filtros
      const alunosMap = new Map<string, {
        id: string;
        nome: string;
        turma: string;
        serie: string;
        escola: string;
        nota: number;
        proficiencia: number;
        participou: boolean;
      }>();
      
      apiData.tabela_detalhada.disciplinas.forEach(disciplina => {
        disciplina.alunos.forEach(aluno => {
          // Aplicar filtros (apenas se os nomes estão disponíveis)
          if (selectedClassName && aluno.turma !== selectedClassName) return;
          if (selectedGradeName && aluno.serie !== selectedGradeName) return;
          if (selectedSchoolName && aluno.escola !== selectedSchoolName) return;
          
          // Verificar se participou (respondeu pelo menos uma questão)
          const participou = aluno.respostas_por_questao.some(resposta => resposta.respondeu);
          
          if (!alunosMap.has(aluno.id)) {
            alunosMap.set(aluno.id, {
              id: aluno.id,
              nome: aluno.nome,
              turma: aluno.turma,
              serie: aluno.serie,
              escola: aluno.escola,
              nota: aluno.nota,
              proficiencia: aluno.proficiencia,
              participou
            });
          }
        });
      });
      
      const alunosArray = Array.from(alunosMap.values());
      const participantes = alunosArray.filter(a => a.participou);
      const totalAlunos = alunosArray.length;
      const ausentes = totalAlunos - participantes.length;
      
      // Calcular médias apenas dos participantes
      const mediaNota = participantes.length > 0
        ? participantes.reduce((sum, a) => sum + a.nota, 0) / participantes.length
        : 0;
      const mediaProficiencia = participantes.length > 0
        ? participantes.reduce((sum, a) => sum + a.proficiencia, 0) / participantes.length
        : 0;
      
      return { totalAlunos, participantes: participantes.length, ausentes, mediaNota, mediaProficiencia };
    }
    
    // Fallback: usar dados gerais do backend quando não há filtros específicos
    const totalAlunos = apiData?.estatisticas_gerais?.total_alunos || 0;
    const participantes = apiData?.estatisticas_gerais?.alunos_participantes || 0;
    const ausentes = apiData?.estatisticas_gerais?.alunos_ausentes || 0;
    const mediaNota = apiData?.estatisticas_gerais?.media_nota_geral || 0;
    const mediaProficiencia = apiData?.estatisticas_gerais?.media_proficiencia_geral || 0;

    return { totalAlunos, participantes, ausentes, mediaNota, mediaProficiencia };
  }, [apiData, selectedClass, selectedGrade, selectedSchool, schools, grades, classes, user?.role, professorClassNames]);

  // Disciplinas derivadas unificando múltiplas fontes
  const derivedSubjects = useMemo(() => {
    const set = new Set<string>();
    if (Array.isArray(evaluationInfo?.disciplinas)) {
      evaluationInfo!.disciplinas!.forEach(s => { if (s) set.add(String(s)); });
    }
    if (evaluationInfo?.disciplina) set.add(String(evaluationInfo.disciplina));
    if (Array.isArray(apiData?.resultados_por_disciplina)) {
      apiData!.resultados_por_disciplina.forEach(d => {
        const name = extractSubjectName(d.disciplina as unknown);
        if (name) set.add(name);
      });
    }

    if (Array.isArray(questionsWithSkills) && questionsWithSkills.length > 0) {
      questionsWithSkills.forEach(q => {
        const name = q.subject?.name;
        if (name) set.add(name);
      });
    }
    return Array.from(set);
  }, [evaluationInfo, apiData, questionsWithSkills, extractSubjectName]);

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            Resultados das Avaliações
          </h1>
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
          <Button variant="outline" onClick={() => loadAllData()} disabled={isLoadingData}>
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



      {/* Filtros - overflow-visible e grid responsivo para não cortar no mobile */}
      <Card className="overflow-visible">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-visible">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 w-full min-w-0">
            {/* Estado */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <Select
                value={selectedState}
                onValueChange={setSelectedState}
                disabled={isLoadingFilters}
              >
                <SelectTrigger className="w-full min-w-0">
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
                <SelectTrigger className="w-full min-w-0">
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
                <SelectTrigger className="w-full min-w-0">
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
              <label className="text-sm font-medium">
                Escola
                {isRestrictedUser && <span className="text-red-500 ml-1">*</span>}
              </label>
              <Select
                value={selectedSchool}
                onValueChange={setSelectedSchool}
                disabled={isLoadingFilters || selectedEvaluation === 'all'}
              >
                <SelectTrigger className={cn("w-full min-w-0", isRestrictedUser && selectedSchool === 'all' && "border-red-300 focus:border-red-500")}>
                  <SelectValue placeholder={isRestrictedUser ? "Selecione a escola (obrigatório)" : "Selecione a escola"} />
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
              {isRestrictedUser && selectedSchool === 'all' && (
                <p className="text-xs text-red-600">
                  Escola é obrigatória para {isProfessor ? 'professores' : 'diretores e coordenadores'}
                </p>
              )}
            </div>

            {/* Série */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Série</label>
              <Select
                value={selectedGrade}
                onValueChange={setSelectedGrade}
                disabled={isLoadingFilters || selectedSchool === 'all'}
              >
                <SelectTrigger className="w-full min-w-0">
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
                <SelectTrigger className="w-full min-w-0">
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
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-400">
              💡 <strong>Hierarquia dos Filtros:</strong> Estado → Município → Avaliação → Escola → Série → Turma
            </p>
            <p className="text-sm text-blue-700 mt-1">
              {isRestrictedUser ? (
                <>
                  <strong>Estado</strong>, <strong>Município</strong>, <strong>Avaliação</strong> e <strong>Escola</strong> são obrigatórios para {isProfessor ? 'professores' : 'diretores e coordenadores'}. Série e Turma são opcionais e podem ser "Todos".
                </>
              ) : (
                <>
                  <strong>Estado</strong>, <strong>Município</strong> e <strong>Avaliação</strong> são obrigatórios. Escola, Série e Turma são opcionais e podem ser "Todos".
                </>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Mensagem quando não há filtros suficientes */}
      {!allRequiredFiltersSelected && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Filter className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Selecione os filtros obrigatórios para continuar
            </h3>
            <p className="text-gray-600 text-center max-w-md">
              {isRestrictedUser ? (
                <>
                  Para visualizar os resultados das avaliações, você precisa selecionar: <strong>Estado</strong>, <strong>Município</strong>, <strong>Avaliação</strong> e <strong>Escola</strong>. Os filtros Série e Turma são opcionais e podem ser "Todos".
                </>
              ) : (
                <>
                  Para visualizar os resultados das avaliações, você precisa selecionar: <strong>Estado</strong>, <strong>Município</strong> e <strong>Avaliação</strong>. Os filtros Escola, Série e Turma são opcionais e podem ser "Todos".
                </>
              )}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading dos dados */}
      {allRequiredFiltersSelected && isLoadingData && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400 mb-4" />
            <p className="text-muted-foreground">Carregando dados...</p>
          </CardContent>
        </Card>
      )}

      {/* Gráficos e Dados */}
      {allRequiredFiltersSelected && !isLoadingData && apiData && (
        <>
          {/* Informações da Avaliação (resumo) */}
          {evaluationInfo && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>
                  <span>Informações da Avaliação</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Disciplinas</div>
                    <div className="font-semibold">
                      {derivedSubjects.length > 0 ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">{derivedSubjects[0]}</Badge>
                          {derivedSubjects.length > 1 && (
                            <Badge
                              variant="outline"
                              className="text-xs"
                              title={derivedSubjects.slice(1).join(', ')}
                            >
                              +{derivedSubjects.length - 1}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-foreground">{evaluationInfo?.disciplina || 'Disciplina não informada'}</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Série</div>
                    <div className="font-semibold">
                      {evaluationInfo?.serie || 
                       apiData?.estatisticas_gerais?.serie || 
                       (selectedGrade !== 'all' ? grades.find(g => g.id === selectedGrade)?.name : null) ||
                       (apiData?.opcoes_proximos_filtros?.series?.length === 1 
                         ? apiData.opcoes_proximos_filtros.series[0].name 
                         : 'Série não informada')}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Escola</div>
                    <div className="font-semibold">
                      {evaluationInfo?.escola || (selectedSchool === 'all' ? 'Todas as Escolas' : 'Escola não informada')}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Município</div>
                    <div className="font-semibold">{evaluationInfo?.municipio || 'Município não informado'}</div>
                  </div>
                </div>

                <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6 mt-6">
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Total de Alunos</div>
                    <div className="text-2xl font-bold text-blue-600">{derivedStats.totalAlunos}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Participantes</div>
                    <div className="text-2xl font-bold text-green-600">{derivedStats.participantes}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-muted-foreground">Faltosos</div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleViewAbsent}
                        className="h-7 px-2 text-xs text-red-600 hover:text-red-700 dark:hover:text-red-400"
                        aria-label="Ver faltosos"
                        disabled={!isRestrictedUser && derivedStats.ausentes === 0}
                      >
                        Ver faltosos
                      </Button>
                    </div>
                    <div className="text-2xl font-bold text-red-600">{derivedStats.ausentes}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Taxa de Participação</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {derivedStats.totalAlunos > 0 ? ((derivedStats.participantes / derivedStats.totalAlunos) * 100).toFixed(1) : '0.0'}%
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Nota Geral</div>
                    <div className="text-2xl font-bold text-purple-600">{Number(derivedStats.mediaNota || 0).toFixed(1)}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Proficiência</div>
                    <div className="text-2xl font-bold text-orange-600">{Number(derivedStats.mediaProficiencia || 0).toFixed(1)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Verificar se há avaliações detalhadas disponíveis */}
          {(() => {
            const avaliacoesLength = apiData.resultados_detalhados?.avaliacoes?.length || 0;
            const dataLength = (apiData.resultados_detalhados as ResultadosDetalhadosFromAPI)?.data?.length || 0;
            // Mostrar conteúdo se houver avaliações detalhadas, independente das estatísticas gerais
            return (avaliacoesLength === 0 && dataLength === 0);
          })() ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <FileX className="h-8 w-8 text-muted-foreground" />
                </div>
                                 <h3 className="text-lg font-medium text-foreground mb-2">
                   Nenhum resultado para mostrar
                 </h3>
                 <p className="text-muted-foreground">
                   Não foram encontrados resultados para os filtros selecionados.
                 </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Abas com diferentes visualizações */}
              <Tabs defaultValue="charts" className="w-full">
                <TabsList className={`grid w-full ${selectedEvaluation !== 'all' ? 'grid-cols-4' : 'grid-cols-3'}`}>
                  <TabsTrigger value="charts">Gráficos</TabsTrigger>
                  <TabsTrigger value="tables">Tabelas</TabsTrigger>
                  <TabsTrigger value="statistics">Estatísticas</TabsTrigger>
                  {selectedEvaluation !== 'all' && (
                    <TabsTrigger value="ranking">Ranking</TabsTrigger>
                  )}
                </TabsList>



                <TabsContent value="charts" className="space-y-6">
                  
                  {apiData && apiData.estatisticas_gerais && apiData.resultados_por_disciplina ? (
                    (() => {
                      const hasSpecificFilters = selectedClass !== 'all' || selectedGrade !== 'all' || selectedSchool !== 'all';
                      const media_nota_geral = hasSpecificFilters
                        ? derivedStats.mediaNota
                        : (apiData.estatisticas_gerais?.media_nota_geral ??
                            (apiData.resultados_por_disciplina?.length
                              ? apiData.resultados_por_disciplina.reduce((sum, item) => sum + (Number(item.media_nota) || 0), 0) / apiData.resultados_por_disciplina.length
                              : 0));
                      const media_proficiencia_geral = hasSpecificFilters
                        ? derivedStats.mediaProficiencia
                        : (apiData.estatisticas_gerais?.media_proficiencia_geral ??
                            (apiData.resultados_por_disciplina?.length
                              ? apiData.resultados_por_disciplina.reduce((sum, item) => sum + (Number(item.media_proficiencia) || 0), 0) / apiData.resultados_por_disciplina.length
                              : 0));
                      return (
                        <ResultsCharts
                          apiData={{
                            estatisticas_gerais: {
                              ...apiData.estatisticas_gerais,
                              media_nota_geral,
                              media_proficiencia_geral
                            },
                            resultados_por_disciplina: apiData.resultados_por_disciplina
                          }}
                          evaluationInfo={evaluationInfo ? {
                            id: evaluationInfo?.id || '',
                            titulo: evaluationInfo?.titulo || '',
                            disciplina: (evaluationInfo?.disciplinas && evaluationInfo.disciplinas.length > 0)
                              ? evaluationInfo.disciplinas[0]
                              : (evaluationInfo?.disciplina || ''),
                            serie: evaluationInfo?.serie || '',
                            escola: evaluationInfo?.escola || '',
                            municipio: evaluationInfo?.municipio || '',
                            data_aplicacao: evaluationInfo?.data_aplicacao || '',
                            total_alunos: evaluationInfo?.total_alunos || 0,
                            alunos_participantes: evaluationInfo?.alunos_participantes || 0,
                            alunos_ausentes: evaluationInfo?.alunos_ausentes || 0,
                            media_nota: evaluationInfo?.media_nota || 0,
                            media_proficiencia: evaluationInfo?.media_proficiencia || 0
                          } : null}
                          inferStageGroup={inferStageGroup}
                          getMaxForDiscipline={getMaxForDiscipline}
                        />
                      );
                    })()
                  ) : (
                    <Card>
                      <CardContent className="text-center py-12">
                        <p className="text-muted-foreground">Não há dados suficientes para gerar os gráficos.</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="tables" className="space-y-6" id="results-tables">
                  {selectedEvaluation === 'all' ? (
                    // Estado inicial: Nenhuma avaliação selecionada
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-16">
                        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-950/30 rounded-full flex items-center justify-center mb-6">
                          <BookOpen className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-foreground mb-3">
                          Selecione uma Avaliação
                        </h3>
                        <p className="text-muted-foreground text-center max-w-md mb-6">
                          Para visualizar os resultados detalhados dos alunos, é necessário selecionar uma avaliação específica nos filtros acima.
                        </p>
                        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 max-w-md">
                          <div className="flex items-start gap-3">
                            <div className="w-5 h-5 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-white text-xs font-bold">!</span>
                            </div>
                            <div className="text-sm text-blue-800 dark:text-blue-400">
                              <strong>Por que essa restrição?</strong><br />
                              Isso garante maior estabilidade, carregamento mais rápido e dados sempre precisos.
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    // Conteúdo normal da tabela quando avaliação está selecionada
                    <>


                  {/* Tabela de Resultados */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Resultados dos Alunos</span>
                        <Badge variant="outline">
                          {filteredStudents.length} {filteredStudents.length === 1 ? 'aluno' : 'alunos'}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* Loading State */}
                      {isLoadingStudents && (
                        <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 dark:from-blue-950/30 to-indigo-50 dark:to-indigo-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="text-center space-y-4">
                            {/* Spinner animado */}
                            <div className="relative mx-auto w-16 h-16">
                              <div className="absolute inset-0 rounded-full border-4 border-blue-200 dark:border-blue-800"></div>
                              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 dark:border-t-blue-400 animate-spin"></div>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-6 h-6 bg-blue-600 dark:bg-blue-500 rounded-full"></div>
                              </div>
                            </div>
                            
                            {/* Texto do passo atual */}
                            <div className="space-y-2">
                              <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-400">
                                {loadingStep}
                              </h3>
                              
                              {/* Barra de progresso */}
                              <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                                  style={{ width: `${loadingProgress}%` }}
                                ></div>
                              </div>
                              <p className="text-sm text-blue-600 dark:text-blue-400">{loadingProgress}%</p>
                            </div>
                            
                            {/* Indicadores de status */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${loadingDetails.detailedReport ? 'bg-blue-500 animate-pulse' : 'bg-muted-foreground'}`}></div>
                                <span className="text-xs text-muted-foreground">Relatório</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${loadingDetails.questionsWithSkills ? 'bg-blue-500 animate-pulse' : 'bg-muted-foreground'}`}></div>
                                <span className="text-xs text-muted-foreground">Questões</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${loadingDetails.skills ? 'bg-blue-500 animate-pulse' : 'bg-muted-foreground'}`}></div>
                                <span className="text-xs text-muted-foreground">Skills</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${loadingDetails.students ? 'bg-blue-500 animate-pulse' : 'bg-muted-foreground'}`}></div>
                                <span className="text-xs text-muted-foreground">Alunos</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {filteredStudents.length > 0 ? (
                        <>


                          {/* Toggle entre Tabela e Cards */}
                          <div className="mb-4 flex justify-end">
                            <div className="flex items-center gap-1 border rounded-lg p-1">
                              <Button
                                variant={viewMode === 'table' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('table')}
                                className="h-8 px-3"
                              >
                                <BarChart3 className="h-4 w-4 mr-1" />
                                Tabela
                              </Button>
                              <Button
                                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('cards')}
                                className="h-8 px-3"
                              >
                                <Users className="h-4 w-4 mr-1" />
                                Cards
                              </Button>
                            </div>
                          </div>

                          {/* Estado de carregamento inicial */}
                          {!isTableReady && (
                            <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
                              <div className="flex items-center gap-3">
                                <div className="w-4 h-4 bg-yellow-500 dark:bg-yellow-600 rounded-full animate-pulse"></div>
                                <span className="text-sm text-yellow-700 dark:text-yellow-400">
                                  Preparando dados para exibição...
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Conteúdo baseado no modo de visualização */}
                          {viewMode === 'table' ? (
                            isTableReady && !isLoadingStudents && apiData?.tabela_detalhada ? (
                              <DisciplineTables
                                tabelaDetalhada={{
                                  disciplinas: apiData.tabela_detalhada.disciplinas,
                                  geral: apiData.tabela_detalhada.geral ? {
                                    alunos: apiData.tabela_detalhada.geral.alunos.map(aluno => ({
                                      id: aluno.id,
                                      nome: aluno.nome,
                                      escola: aluno.escola || '',
                                      serie: aluno.serie || '',
                                      turma: aluno.turma || '',
                                      nota_geral: aluno.nota_geral || 0,
                                      proficiencia_geral: aluno.proficiencia_geral || 0,
                                      nivel_proficiencia_geral: aluno.nivel_proficiencia_geral || '',
                                      total_acertos_geral: aluno.total_acertos_geral || 0,
                                      total_questoes_geral: aluno.total_questoes_geral || 0,
                                      total_respondidas_geral: aluno.total_respondidas_geral || 0,
                                      total_em_branco_geral: aluno.total_em_branco_geral || 0,
                                      percentual_acertos_geral: aluno.percentual_acertos_geral || 0,
                                      status_geral: aluno.status_geral || ''
                                    }))
                                  } : undefined
                                }}
                                onViewStudentDetails={handleViewStudentDetails}
                                onOpenInNewTab={handleOpenInNewTab}
                              />
                            ) : (
                              <div className="text-center py-12">
                                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-950/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
                                </div>
                                <h3 className="text-lg font-semibold text-foreground mb-2">
                                  Carregando tabelas por disciplina...
                                </h3>
                                <p className="text-muted-foreground">
                                  Aguarde enquanto finalizamos o processamento dos dados.
                                </p>
                              </div>
                            )
                          ) : (
                            /* Visão em Cards Melhorada */
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                              {filteredStudents.map((student, index) => (
                                <StudentCard
                                  key={`${student.id}-${index}`}
                                  student={student}
                                  totalQuestions={computedTotalQuestions || student.questoes_respondidas || 0}
                                  subjects={derivedSubjects}
                                  onViewDetails={handleViewStudentDetails}
                                />
                              ))}
                            </div>
              )}
            </>
                      ) : (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                            <BarChart3 className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <h3 className="text-lg font-semibold text-foreground mb-2">
                            Nenhum dado encontrado
                          </h3>
                          <p className="text-muted-foreground">
                            Não há dados disponíveis para exibir na tabela.
                          </p>
                        </div>
                      )}
                    </CardContent>
                                     </Card>
                    </>
                  )}
                 </TabsContent>

                <TabsContent value="statistics" className="space-y-6">
                  <ClassStatistics apiData={apiData ? (() => {
                    const hasSpecificFilters = selectedClass !== 'all' || selectedGrade !== 'all' || selectedSchool !== 'all';
                    const base = {
                      ...apiData,
                      tabela_detalhada: apiData.tabela_detalhada ? {
                        ...apiData.tabela_detalhada,
                        geral: apiData.tabela_detalhada.geral ? {
                          alunos: apiData.tabela_detalhada.geral.alunos.map(aluno => ({
                            id: aluno.id,
                            nome: aluno.nome,
                            turma: aluno.turma || '',
                            nivel_proficiencia_geral: aluno.nivel_proficiencia_geral || '',
                            nota_geral: aluno.nota_geral || 0,
                            proficiencia_geral: aluno.proficiencia_geral || 0,
                            total_acertos_geral: aluno.total_acertos_geral || 0,
                            total_erros_geral: (aluno.total_questoes_geral || 0) - (aluno.total_acertos_geral || 0) - (aluno.total_em_branco_geral || 0),
                            total_respondidas_geral: aluno.total_respondidas_geral || 0
                          }))
                        } : undefined
                      } : undefined
                    };
                    if (hasSpecificFilters && apiData.estatisticas_gerais) {
                      base.estatisticas_gerais = {
                        ...apiData.estatisticas_gerais,
                        total_alunos: derivedStats.totalAlunos,
                        alunos_participantes: derivedStats.participantes,
                        alunos_ausentes: derivedStats.ausentes,
                        media_nota_geral: derivedStats.mediaNota,
                        media_proficiencia_geral: derivedStats.mediaProficiencia
                      };
                    }
                    return base;
                  })() : null} />
                </TabsContent>

                {selectedEvaluation !== 'all' && (
                  <TabsContent value="ranking" className="space-y-6">
                    {/* Usar sempre a mesma lista da página (tabela/cards): evita ranking vazio ao filtrar por escola/turma/série */}
                    <StudentRanking
                      students={filteredStudents}
                      maxStudents={100}
                    />
                  </TabsContent>
                )}
              </Tabs>
            </>
          )}
        </>
      )}

      {/* ✅ NOVO: Modal de Alunos Faltosos */}
      <Dialog open={showAbsentStudentsModal} onOpenChange={setShowAbsentStudentsModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-red-600" />
              Alunos Faltosos
              {evaluationInfo && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  - {evaluationInfo.titulo}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[60vh]">
            {isLoadingAbsentStudents ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 dark:border-red-500"></div>
                  <span className="text-muted-foreground">Carregando lista de alunos faltosos...</span>
                </div>
              </div>
            ) : absentStudents.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-red-500 dark:bg-red-400 rounded-full"></div>
                    <span className="font-semibold text-red-800 dark:text-red-400">
                      {absentStudents.length} {absentStudents.length === 1 ? 'aluno faltoso' : 'alunos faltosos'}
                    </span>
                  </div>
                  <p className="text-sm text-red-700 dark:text-red-400">
                    Estes alunos foram selecionados para a avaliação mas não a realizaram.
                  </p>
                </div>
                
                <div className="grid gap-3">
                  {absentStudents.map((aluno) => (
                    <div key={aluno.id} className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-red-100 dark:bg-red-950/30 rounded-full flex items-center justify-center">
                          <span className="text-red-600 dark:text-red-400 font-semibold text-sm">
                            {aluno.nome.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{aluno.nome}</div>
                          <div className="text-sm text-muted-foreground">
                            {aluno.turma} • {aluno.escola} • {aluno.serie}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-red-600 dark:text-red-400 border-red-300 dark:border-red-800">
                        Faltoso
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-950/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Nenhum aluno faltoso
                </h3>
                <p className="text-muted-foreground">
                  Todos os alunos realizaram a avaliação.
                </p>
              </div>
            )}
          </div>
          
          <div className="flex justify-end pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setShowAbsentStudentsModal(false)}
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 