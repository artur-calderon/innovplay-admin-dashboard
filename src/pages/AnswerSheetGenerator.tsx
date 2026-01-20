import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAnswerSheetCorrection } from '@/hooks/useAnswerSheetCorrection';
import { 
  ChevronRight, 
  ChevronLeft, 
  Download, 
  CheckCircle, 
  AlertCircle,
  Users,
  School,
  FileText,
  Images,
  Upload,
  X,
  RefreshCw,
  Clock,
  Loader2,
  Trash2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { AnswerSheetConfig, StudentAnswerSheet, School as SchoolType, Serie, Turma, Estado, Municipio, Gabarito, GabaritosResponse } from '@/types/answer-sheet';

type Step = 1 | 2;

export default function AnswerSheetGenerator() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const { toast } = useToast();

  // Estados da Etapa 1: Configuração
  // Filtros geográficos
  const [estados, setEstados] = useState<Estado[]>([]);
  const [selectedEstado, setSelectedEstado] = useState('');
  const [selectedMunicipio, setSelectedMunicipio] = useState('');
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [isLoadingEstados, setIsLoadingEstados] = useState(false);
  const [isLoadingMunicipios, setIsLoadingMunicipios] = useState(false);
  
  // Filtros de escola/turma
  const [cursos, setCursos] = useState<Array<{id: string; name: string}>>([]);
  const [selectedCurso, setSelectedCurso] = useState('');
  const [schools, setSchools] = useState<SchoolType[]>([]);
  const [series, setSeries] = useState<Serie[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedSerie, setSelectedSerie] = useState('');
  const [selectedTurma, setSelectedTurma] = useState('');
  const [provaTitulo, setProvaTitulo] = useState('');
  const [gradeName, setGradeName] = useState<string>('');
  const [isLoadingCursos, setIsLoadingCursos] = useState(false);
  const [isLoadingSchools, setIsLoadingSchools] = useState(false);
  const [isLoadingSeries, setIsLoadingSeries] = useState(false);
  const [isLoadingTurmas, setIsLoadingTurmas] = useState(false);
  
  // Estados para feedback visual
  const [noSchoolsMessage, setNoSchoolsMessage] = useState<string>('');
  const [noTurmasMessage, setNoTurmasMessage] = useState<string>('');
  const [noSeriesMessage, setNoSeriesMessage] = useState<string>('');

  // Configuração de questões e gabarito manual
  const [totalQuestoes, setTotalQuestoes] = useState<number>(0);
  const [gabaritoManual, setGabaritoManual] = useState<Record<number, 'A' | 'B' | 'C' | 'D'>>({});
  const [department, setDepartment] = useState<string>('Secretaria Municipal de Educação');
  
  // Estados para alternativas personalizadas
  const [questionsOptions, setQuestionsOptions] = useState<Record<number, ('A' | 'B' | 'C' | 'D')[]>>({});
  const [useGlobalAlternatives, setUseGlobalAlternatives] = useState<boolean>(true);
  const [globalAlternatives, setGlobalAlternatives] = useState<('A' | 'B' | 'C' | 'D')[]>(['A', 'B', 'C', 'D']);
  const [editingQuestionAlternatives, setEditingQuestionAlternatives] = useState<number | null>(null);

  // Estados para configuração de blocos
  const [useBlocks, setUseBlocks] = useState(false);
  const [numBlocks, setNumBlocks] = useState(2);
  const [questionsPerBlock, setQuestionsPerBlock] = useState(5);
  const [separateBySubject, setSeparateBySubject] = useState(false);

  // Estados da Etapa 2: Geração e Download
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  // Estados para correção
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isProcessingSingle, setIsProcessingSingle] = useState(false);
  const [correctionProgress, setCorrectionProgress] = useState(0);
  const [showBatchCorrectionDialog, setShowBatchCorrectionDialog] = useState(false);
  const [batchImages, setBatchImages] = useState<{ file: File; preview: string }[]>([]);
  const batchFileInputRef = useRef<HTMLInputElement>(null);

  // Hook para correção em lote
  const {
    isProcessing: isBatchProcessing,
    isCompleted: isBatchCompleted,
    progress: batchProgress,
    error: batchError,
    startSingleCorrection,
    startBatchCorrection,
    reset: resetBatchCorrection,
  } = useAnswerSheetCorrection();

  // Estados para cartões gerados
  const [gabaritos, setGabaritos] = useState<Gabarito[]>([]);
  const [isLoadingGabaritos, setIsLoadingGabaritos] = useState(false);
  const [downloadingGabaritoId, setDownloadingGabaritoId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('generate');
  const [selectedGabaritos, setSelectedGabaritos] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'single' | 'multiple'>('single');
  const [gabaritoToDelete, setGabaritoToDelete] = useState<string | null>(null);

  // Carregar dados iniciais ao montar
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoadingEstados(true);
        setIsLoadingCursos(true);
        
        const [estadosRes, cursosRes] = await Promise.all([
          api.get('/city/states'),
          api.get('/education_stages'),
        ]);
        
        setEstados(estadosRes.data || []);
        setCursos(cursosRes.data || []);
      } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os dados iniciais.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingEstados(false);
        setIsLoadingCursos(false);
      }
    };
    fetchInitialData();
  }, [toast]);

  // Carregar municípios quando estado for selecionado
  useEffect(() => {
    if (selectedEstado) {
      fetchMunicipios();
      // Limpar seleções subsequentes
      setSelectedMunicipio('');
      setMunicipios([]);
      setSelectedSchool('');
      setSchools([]);
      setSelectedSerie('');
      setSeries([]);
      setSelectedTurma('');
      setTurmas([]);
      setNoSchoolsMessage('');
      setNoTurmasMessage('');
      setNoSeriesMessage('');
    } else {
      setMunicipios([]);
      setSelectedMunicipio('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEstado]);

  // Carregar séries quando curso ou município forem selecionados
  useEffect(() => {
    if (selectedCurso) {
      fetchSeries();
    } else {
      setSeries([]);
      setSelectedSerie('');
      setGradeName('');
      setNoSeriesMessage('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCurso, selectedMunicipio]);

  // Carregar nome da série quando série for selecionada
  useEffect(() => {
    if (selectedSerie) {
      const serieData = series.find(s => s.id === selectedSerie);
      setGradeName(serieData?.name || '');
    } else {
      setGradeName('');
    }
  }, [selectedSerie, series]);

  // Carregar escolas quando município ou série forem selecionados
  useEffect(() => {
    if (selectedMunicipio) {
      fetchSchools();
      // Limpar seleções subsequentes
      setSelectedSchool('');
      setSchools([]);
      setSelectedTurma('');
      setTurmas([]);
      setNoSchoolsMessage('');
      setNoTurmasMessage('');
    } else {
      setSchools([]);
      setSelectedSchool('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMunicipio, selectedSerie]);

  // Carregar turmas quando escola for selecionada
  useEffect(() => {
    if (selectedSchool) {
      fetchTurmas();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSchool]);

  const fetchMunicipios = async () => {
    if (!selectedEstado) return;
    
    try {
      setIsLoadingMunicipios(true);
      const response = await api.get(`/city/municipalities/state/${selectedEstado}`);
      const municipiosData = response.data || [];
      setMunicipios(municipiosData);
    } catch (error) {
      console.error('Erro ao carregar municípios:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os municípios.',
        variant: 'destructive',
      });
      setMunicipios([]);
    } finally {
      setIsLoadingMunicipios(false);
    }
  };

  const fetchSchools = async () => {
    if (!selectedMunicipio) return;
    
    try {
      setIsLoadingSchools(true);
      setNoSchoolsMessage('');
      
      let schoolsData: SchoolType[] = [];
      
      // ✅ PRIORIDADE: Se houver série selecionada, buscar apenas escolas com aquela série
      if (selectedSerie) {
        try {
          const response = await api.get(`/school/by-grade/${selectedSerie}`);
          schoolsData = response.data?.schools || [];
          
          // Filtrar escolas pelo município selecionado
          // O endpoint /school/by-grade retorna escolas de todos os municípios
          // Precisamos filtrar apenas as do município selecionado
          if (schoolsData.length > 0) {
            // Buscar todas as escolas do município para comparar
            const municipalitySchoolsResponse = await api.get(`/school/city/${selectedMunicipio}`);
            const municipalitySchoolIds = (municipalitySchoolsResponse.data?.schools || municipalitySchoolsResponse.data || []).map((s: SchoolType) => s.id);
            
            // Filtrar apenas escolas que estão no município E têm turmas da série
            schoolsData = schoolsData.filter((school: SchoolType) => 
              municipalitySchoolIds.includes(school.id)
            );
          }
          
          if (schoolsData.length === 0) {
            setNoSchoolsMessage('Nenhuma escola encontrada com turmas cadastradas para esta série neste município.');
          }
        } catch (err: any) {
          // Ignorar silenciosamente erros 404 (séries sem escolas com turmas)
          const errorMessage = err?.message || '';
          const isNotFound = err?.response?.status === 404 || 
                             errorMessage.includes('não encontrado') || 
                             errorMessage.includes('not found');
          
          if (isNotFound) {
            setNoSchoolsMessage('Nenhuma escola encontrada com turmas cadastradas para esta série neste município.');
            schoolsData = [];
          } else {
            throw err;
          }
        }
      } else {
        // Se NÃO houver série, buscar todas as escolas do município
        const response = await api.get(`/school/city/${selectedMunicipio}`);
        schoolsData = response.data?.schools || response.data || [];
        
        if (schoolsData.length === 0) {
          setNoSchoolsMessage('Nenhuma escola encontrada para este município.');
        }
      }
      
      setSchools(schoolsData);
    } catch (error) {
      console.error('Erro ao carregar escolas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as escolas.',
        variant: 'destructive',
      });
      setSchools([]);
      setNoSchoolsMessage('Erro ao carregar escolas.');
    } finally {
      setIsLoadingSchools(false);
    }
  };

  const fetchSeries = async () => {
    if (!selectedCurso) return;
    
    try {
      setIsLoadingSeries(true);
      setNoSeriesMessage('');
      
      // Buscar todas as séries do curso
      const response = await api.get(`/grades/education-stage/${selectedCurso}`);
      const allSeriesData = response.data || [];
      
      // Se não houver município selecionado, mostrar todas as séries
      if (!selectedMunicipio) {
        setSeries(allSeriesData);
        return;
      }
      
      // Buscar todas as escolas do município para verificar quais séries têm turmas
      const schoolsResponse = await api.get(`/school/city/${selectedMunicipio}`);
      const allSchoolsData = schoolsResponse.data?.schools || schoolsResponse.data || [];
      
      // Criar um Set com IDs de séries que têm turmas
      const seriesWithTurmas = new Set<string>();
      
      for (const school of allSchoolsData) {
        try {
          // Buscar turmas da escola
          const turmasResponse = await api.get(`/classes/school/${school.id}`);
          const turmasData = turmasResponse.data || [];
          
          // Adicionar IDs de séries que têm turmas
          turmasData.forEach((turma: { grade_id?: string; grade?: { id?: string } }) => {
            const gradeId = turma.grade_id || turma.grade?.id;
            if (gradeId) {
              seriesWithTurmas.add(gradeId);
            }
          });
        } catch (error) {
          // Se der erro ao buscar turmas de uma escola, ignorar essa escola
          console.warn(`Erro ao buscar turmas da escola ${school.id}:`, error);
        }
      }
      
      // Filtrar séries que têm turmas
      const filteredSeries = allSeriesData.filter((serie: Serie) => 
        seriesWithTurmas.has(serie.id)
      );
      
      setSeries(filteredSeries);
      
      if (filteredSeries.length === 0) {
        setNoSeriesMessage('Nenhuma série encontrada com turmas cadastradas para este município.');
      }
    } catch (error) {
      console.error('Erro ao carregar séries:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as séries.',
        variant: 'destructive',
      });
      setSeries([]);
      setNoSeriesMessage('Erro ao carregar séries.');
    } finally {
      setIsLoadingSeries(false);
    }
  };

  const fetchTurmas = async () => {
    if (!selectedSchool) return;
    
    try {
      setIsLoadingTurmas(true);
      setNoTurmasMessage('');
      
      const response = await api.get(`/classes/school/${selectedSchool}`);
      let turmasData = response.data || [];
      
      // Filtrar por série se tiver selecionada
      if (selectedSerie && turmasData.length > 0) {
        turmasData = turmasData.filter((turma: { grade_id?: string; grade?: { id?: string } }) => {
          const gradeId = turma.grade_id || turma.grade?.id;
          return gradeId === selectedSerie;
        });
      }
      
      setTurmas(turmasData);
      
      // Limpar seleção de turma se não houver turmas disponíveis
      if (turmasData.length === 0) {
        setSelectedTurma('');
        setNoTurmasMessage('Nenhuma turma encontrada para esta escola e série.');
      } else {
        // Verificar se a turma selecionada ainda existe na lista
        const turmaExists = turmasData.some((t: Turma) => t.id === selectedTurma);
        if (!turmaExists) {
          setSelectedTurma('');
        }
      }
    } catch (error) {
      console.error('Erro ao carregar turmas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as turmas.',
        variant: 'destructive',
      });
      setTurmas([]);
      setSelectedTurma('');
      setNoTurmasMessage('Erro ao carregar turmas.');
    } finally {
      setIsLoadingTurmas(false);
    }
  };


  const handleChangeTotalQuestoes = (value: string) => {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      setTotalQuestoes(0);
      setGabaritoManual({});
      setQuestionsOptions({});
      return;
    }

    const safeTotal = Math.min(parsed, 200);
    setTotalQuestoes(safeTotal);

    setGabaritoManual(prev => {
      const updated: Record<number, 'A' | 'B' | 'C' | 'D'> = {};
      for (let i = 1; i <= safeTotal; i += 1) {
        if (prev[i]) {
          updated[i] = prev[i];
        }
      }
      return updated;
    });

    // Limpar/resetar questionsOptions quando número de questões muda
    setQuestionsOptions(prev => {
      const updated: Record<number, ('A' | 'B' | 'C' | 'D')[]> = {};
      for (let i = 1; i <= safeTotal; i += 1) {
        if (prev[i]) {
          updated[i] = prev[i];
        }
      }
      return updated;
    });
  };

  const handleChangeRespostaQuestao = (numeroQuestao: number, alternativa: string) => {
    const alternativaUpper = alternativa.toUpperCase();
    if (!['A', 'B', 'C', 'D'].includes(alternativaUpper)) {
      return;
    }

    // Obter alternativas disponíveis para esta questão
    const availableAlternatives = useGlobalAlternatives
      ? globalAlternatives
      : (questionsOptions[numeroQuestao] || ['A', 'B', 'C', 'D']);

    // Validar se a alternativa está disponível para esta questão
    if (!availableAlternatives.includes(alternativaUpper as 'A' | 'B' | 'C' | 'D')) {
      toast({
        title: 'Alternativa inválida',
        description: `A alternativa ${alternativaUpper} não está disponível para a questão ${numeroQuestao}.`,
        variant: 'destructive',
      });
      return;
    }

    setGabaritoManual(prev => ({
      ...prev,
      [numeroQuestao]: alternativaUpper as 'A' | 'B' | 'C' | 'D',
    }));
  };

  const handleClearGabarito = () => {
    setGabaritoManual({});
  };

  // Funções para gerenciar alternativas
  const getAvailableAlternatives = (questionNumber: number): ('A' | 'B' | 'C' | 'D')[] => {
    if (useGlobalAlternatives) {
      return globalAlternatives;
    }
    return questionsOptions[questionNumber] || ['A', 'B', 'C', 'D'];
  };

  const handleToggleGlobalAlternative = (alternative: 'A' | 'B' | 'C' | 'D', checked: boolean) => {
    if (checked) {
      // Adicionar alternativa
      if (globalAlternatives.length >= 4) {
        toast({
          title: 'Erro',
          description: 'Máximo de 4 alternativas (A, B, C, D).',
          variant: 'destructive',
        });
        return;
      }
      const newAlternatives = [...globalAlternatives, alternative].sort() as ('A' | 'B' | 'C' | 'D')[];
      setGlobalAlternatives(newAlternatives);
    } else {
      // Remover alternativa
      if (globalAlternatives.length <= 2) {
        toast({
          title: 'Erro',
          description: 'Selecione pelo menos 2 alternativas.',
          variant: 'destructive',
        });
        return;
      }
      const newAlternatives = globalAlternatives.filter(alt => alt !== alternative);
      setGlobalAlternatives(newAlternatives);
      
      // Limpar respostas que usam a alternativa removida
      setGabaritoManual(prev => {
        const updated = { ...prev };
        let clearedCount = 0;
        for (let i = 1; i <= totalQuestoes; i += 1) {
          if (updated[i] === alternative) {
            delete updated[i];
            clearedCount++;
          }
        }
        if (clearedCount > 0) {
          toast({
            title: 'Respostas removidas',
            description: `${clearedCount} questão(ões) tiveram a resposta removida pois a alternativa não está mais disponível.`,
            variant: 'default',
          });
        }
        return updated;
      });
    }
  };

  const handleToggleQuestionAlternative = (questionNumber: number, alternative: 'A' | 'B' | 'C' | 'D', checked: boolean) => {
    const currentAlternatives = questionsOptions[questionNumber] || ['A', 'B', 'C', 'D'];
    
    if (checked) {
      // Adicionar alternativa
      if (currentAlternatives.length >= 4) {
        toast({
          title: 'Erro',
          description: 'Máximo de 4 alternativas (A, B, C, D).',
          variant: 'destructive',
        });
        return;
      }
      const newAlternatives = [...currentAlternatives, alternative].sort() as ('A' | 'B' | 'C' | 'D')[];
      setQuestionsOptions(prev => ({
        ...prev,
        [questionNumber]: newAlternatives,
      }));
    } else {
      // Remover alternativa
      if (currentAlternatives.length <= 2) {
        toast({
          title: 'Erro',
          description: 'Selecione pelo menos 2 alternativas.',
          variant: 'destructive',
        });
        return;
      }
      const newAlternatives = currentAlternatives.filter(alt => alt !== alternative);
      setQuestionsOptions(prev => ({
        ...prev,
        [questionNumber]: newAlternatives,
      }));
      
      // Limpar resposta se usar a alternativa removida
      const currentAnswer = gabaritoManual[questionNumber];
      if (currentAnswer === alternative) {
        setGabaritoManual(prev => {
          const updated = { ...prev };
          delete updated[questionNumber];
          return updated;
        });
        toast({
          title: 'Resposta removida',
          description: `A resposta da questão ${questionNumber} foi removida pois a alternativa não está mais disponível.`,
          variant: 'default',
        });
      }
    }
  };

  const handleApplyGlobalToAll = () => {
    if (globalAlternatives.length < 2) {
      toast({
        title: 'Erro',
        description: 'Selecione pelo menos 2 alternativas antes de aplicar.',
        variant: 'destructive',
      });
      return;
    }
    
    // Aplicar alternativas globais a todas as questões
    const newOptions: Record<number, ('A' | 'B' | 'C' | 'D')[]> = {};
    for (let i = 1; i <= totalQuestoes; i += 1) {
      newOptions[i] = [...globalAlternatives];
    }
    setQuestionsOptions(newOptions);
    setUseGlobalAlternatives(false);
    
    // Limpar respostas inválidas
    setGabaritoManual(prev => {
      const updated = { ...prev };
      let clearedCount = 0;
      for (let i = 1; i <= totalQuestoes; i += 1) {
        if (updated[i] && !globalAlternatives.includes(updated[i])) {
          delete updated[i];
          clearedCount++;
        }
      }
      if (clearedCount > 0) {
        toast({
          title: 'Respostas removidas',
          description: `${clearedCount} questão(ões) tiveram a resposta removida pois não está mais disponível.`,
          variant: 'default',
        });
      }
      return updated;
    });
    
    toast({
      title: 'Alternativas aplicadas',
      description: `Alternativas globais aplicadas a todas as ${totalQuestoes} questões.`,
    });
  };

  const buildQuestionsOptions = (): Record<string, string[]> | undefined => {
    // Se modo global e todas questões têm padrão ['A', 'B', 'C', 'D'], pode omitir
    const sortedGlobal = [...globalAlternatives].sort();
    if (useGlobalAlternatives && JSON.stringify(sortedGlobal) === JSON.stringify(['A', 'B', 'C', 'D'])) {
      return undefined; // Omitir do payload (backend usa padrão)
    }

    // Se modo individual, verificar se todas têm o mesmo padrão
    if (!useGlobalAlternatives) {
      const allDefault = Array.from({ length: totalQuestoes }, (_, i) => {
        const num = i + 1;
        const options = questionsOptions[num] || ['A', 'B', 'C', 'D'];
        const sortedOptions = [...options].sort();
        return JSON.stringify(sortedOptions) === JSON.stringify(['A', 'B', 'C', 'D']);
      }).every(Boolean);

      if (allDefault) {
        return undefined; // Omitir do payload
      }
    }

    // Construir objeto com chaves como strings
    const result: Record<string, string[]> = {};
    for (let i = 1; i <= totalQuestoes; i += 1) {
      const alternatives = useGlobalAlternatives
        ? globalAlternatives
        : (questionsOptions[i] || ['A', 'B', 'C', 'D']);
      result[i.toString()] = [...alternatives];
    }
    return result;
  };



  const isStep1Valid = () => {
    const hasBaseInfo =
      selectedEstado &&
      selectedMunicipio &&
      selectedCurso &&
      selectedSerie &&
      selectedSchool &&
      selectedTurma &&
      provaTitulo &&
      department;

    if (!hasBaseInfo) {
      return false;
    }

    // Verificar se há turmas disponíveis e se a turma selecionada existe
    if (turmas.length === 0 || !turmas.some(t => t.id === selectedTurma)) {
      return false;
    }

    if (totalQuestoes <= 0) {
      return false;
    }

    for (let i = 1; i <= totalQuestoes; i += 1) {
      if (!gabaritoManual[i]) {
        return false;
      }
      
      // Validar que a resposta está nas alternativas disponíveis
      const availableAlternatives = useGlobalAlternatives
        ? globalAlternatives
        : (questionsOptions[i] || ['A', 'B', 'C', 'D']);
      
      if (!availableAlternatives.includes(gabaritoManual[i])) {
        return false; // Resposta inválida
      }
    }

    // Validar configurações de blocos se estiverem ativadas
    if (useBlocks && !separateBySubject) {
      if (numBlocks <= 0 || questionsPerBlock <= 0) {
        return false;
      }
    }

    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 1 && isStep1Valid()) {
      setCurrentStep(2);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  // Função para validar configurações de blocos
  const validateBlockSettings = (): { isValid: boolean; warnings: string[] } => {
    const warnings: string[] = [];
    let hasCriticalError = false;

    // Se separar por disciplina, não precisa validar configurações de blocos
    if (separateBySubject) {
      return { isValid: true, warnings: [] };
    }

    if (!useBlocks) {
      return { isValid: true, warnings: [] };
    }

    // Validar quantidade de blocos vs questões totais
    if (totalQuestoes > 0) {
      const totalQuestionsNeeded = numBlocks * questionsPerBlock;

      if (numBlocks > totalQuestoes) {
        warnings.push(
          `⚠️ A quantidade de blocos (${numBlocks}) é maior que o número total de questões (${totalQuestoes}). ` +
          `Isso pode resultar em blocos vazios ou com poucas questões. Considere reduzir a quantidade de blocos.`
        );
      }

      if (questionsPerBlock > totalQuestoes) {
        warnings.push(
          `⚠️ A quantidade de questões por bloco (${questionsPerBlock}) é maior que o número total de questões (${totalQuestoes}). ` +
          `Cada bloco terá no máximo ${totalQuestoes} questões. Considere reduzir a quantidade de questões por bloco.`
        );
      }

      if (totalQuestionsNeeded > totalQuestoes) {
        warnings.push(
          `⚠️ A configuração atual (${numBlocks} blocos × ${questionsPerBlock} questões = ${totalQuestionsNeeded} questões) ` +
          `ultrapassa o número total de questões (${totalQuestoes}). ` +
          `Os blocos serão ajustados automaticamente para distribuir as questões disponíveis.`
        );
      }

      if (numBlocks > 0 && questionsPerBlock > 0 && totalQuestionsNeeded < totalQuestoes) {
        const remainingQuestions = totalQuestoes - totalQuestionsNeeded;
        if (remainingQuestions > 0) {
          warnings.push(
            `ℹ️ Com a configuração atual, restarão ${remainingQuestions} questão(ões) sem distribuir nos blocos. ` +
            `Considere ajustar a quantidade de blocos ou questões por bloco para aproveitar todas as questões.`
          );
        }
      }

      // Validações críticas que impedem a geração
      if (numBlocks <= 0 || questionsPerBlock <= 0) {
        hasCriticalError = true;
        warnings.push(
          `❌ A quantidade de blocos e questões por bloco deve ser maior que zero.`
        );
      }
    } else {
      warnings.push(
        `ℹ️ Informe a quantidade de questões antes de configurar os blocos.`
      );
    }

    return { isValid: !hasCriticalError, warnings };
  };

  const handleGenerateCards = async () => {
    if (!selectedTurma) {
      toast({
        title: 'Erro',
        description: 'Selecione uma turma antes de gerar os cartões.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsGenerating(true);
      setGenerationProgress(0);

      const municipioData = municipios.find(m => m.id === selectedMunicipio);
      const schoolData = schools.find(s => s.id === selectedSchool);
      const serieData = series.find(s => s.id === selectedSerie);
      const turmaData = turmas.find(t => t.id === selectedTurma);

      // Preparar payload no formato esperado pelo backend
      const payload: any = {
        class_id: selectedTurma,
        num_questions: totalQuestoes,
        correct_answers: gabaritoManual,
        test_data: {
          title: provaTitulo,
          municipality: municipioData?.name || '',
          state: selectedEstado || 'ALAGOAS',
          department: department,
          institution: schoolData?.name || '',
          grade_name: serieData?.name || '',
        }
      };

      // Adicionar questions_options se necessário
      const questionsOptionsData = buildQuestionsOptions();
      if (questionsOptionsData) {
        payload.questions_options = questionsOptionsData;
      }

      // Configurar blocos
      if (separateBySubject) {
        payload.use_blocks = true;
        payload.blocks_config = {
          separate_by_subject: true
        };
      } else if (useBlocks) {
        payload.use_blocks = true;
        payload.blocks_config = {
          num_blocks: numBlocks,
          questions_per_block: questionsPerBlock,
          separate_by_subject: false
        };
      } else {
        payload.use_blocks = false;
      }

      // Simular progresso
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Enviar dados para o backend gerar os cartões
      // O backend agora retorna um arquivo ZIP diretamente
      const response = await api.post('/answer-sheets/generate', payload, {
        responseType: 'blob', // Esperar um arquivo binário (ZIP)
      });

      clearInterval(progressInterval);
      setGenerationProgress(95);

      console.log('📦 Resposta do backend (ZIP):', {
        type: response.data.type,
        size: response.data.size,
        sizeMB: (response.data.size / 1024 / 1024).toFixed(2)
      });

      // Verificar se a resposta é um Blob válido
      if (response.data instanceof Blob) {
        setGenerationProgress(98);
        
        // Verificar se o blob não está vazio
        if (response.data.size === 0) {
          throw new Error('O arquivo ZIP recebido está vazio. Verifique se os cartões foram gerados corretamente.');
        }

        // Criar URL para o blob
        const url = window.URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        
        // Sanitizar nome da turma para o nome do arquivo
        const sanitizedTurmaName = (turmaData?.name || 'turma')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9\s]/g, '')
          .replace(/\s+/g, '_');
        
        // Sanitizar título da prova para o nome do arquivo
        const sanitizedProvaTitle = provaTitulo
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9\s]/g, '')
          .replace(/\s+/g, '_')
          .substring(0, 50); // Limitar tamanho
        
        // Tentar extrair o nome do arquivo do header Content-Disposition se disponível
        const contentDisposition = response.headers['content-disposition'] || response.headers['Content-Disposition'];
        let zipFileName = `cartoes_resposta_${sanitizedProvaTitle}_${sanitizedTurmaName}_${new Date().toISOString().slice(0, 10)}.zip`;
        
        if (contentDisposition) {
          console.log('📋 Content-Disposition header:', contentDisposition);
          // Tentar diferentes padrões de Content-Disposition
          // Padrão 1: filename="arquivo.zip"
          // Padrão 2: filename*=UTF-8''arquivo.zip
          // Padrão 3: filename=arquivo.zip
          let fileNameMatch = contentDisposition.match(/filename\*?=['"]?([^'";\n]+)['"]?/i);
          if (!fileNameMatch) {
            fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
          }
          
          if (fileNameMatch && fileNameMatch[1]) {
            let extractedFileName = fileNameMatch[1].replace(/['"]/g, '');
            // Decodificar URI se necessário (para formato filename*=UTF-8''...)
            if (extractedFileName.startsWith("UTF-8''")) {
              extractedFileName = extractedFileName.replace(/^UTF-8''/, '');
            }
            try {
              zipFileName = decodeURIComponent(extractedFileName);
            } catch (e) {
              // Se falhar, usar o nome extraído sem decodificar
              zipFileName = extractedFileName;
            }
            console.log('📋 Nome do arquivo extraído do header:', zipFileName);
          }
        }
        
        link.download = zipFileName;
        
        console.log(`📥 Iniciando download: ${zipFileName} (${(response.data.size / 1024 / 1024).toFixed(2)} MB)`);
        
        // Adicionar link ao DOM temporariamente
        document.body.appendChild(link);
        
        // Tentar fazer download
        try {
          link.click();
          console.log('✅ Download iniciado com sucesso');
        } catch (downloadError) {
          console.error('❌ Erro ao iniciar download automático:', downloadError);
          // Fallback: abrir em nova aba
          window.open(url, '_blank');
          toast({
            title: 'Download iniciado',
            description: 'O arquivo ZIP foi aberto em uma nova aba. Se o download não iniciar automaticamente, clique com o botão direito e selecione "Salvar como".',
          });
        }
        
        // Remover link após um pequeno delay para garantir que o download foi iniciado
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }, 100);

        setGenerationProgress(100);


        toast({
          title: 'Sucesso!',
          description: `Cartões resposta foram gerados e estão sendo baixados (${(response.data.size / 1024 / 1024).toFixed(2)} MB).`,
        });
      } else {
        console.error('❌ Resposta do servidor não é um arquivo ZIP válido:', {
          dataType: typeof response.data,
          isBlob: response.data instanceof Blob,
          data: response.data
        });
        throw new Error('O servidor não retornou um arquivo ZIP válido. Verifique a resposta do servidor.');
      }
    } catch (error: any) {
      console.error('❌ Erro completo ao gerar cartões:', error);
      console.error('❌ Erro response:', error.response);
      console.error('❌ Erro data:', error.response?.data);
      console.error('❌ Erro message:', error.message);
      
      let errorMessage = 'Não foi possível gerar os cartões resposta.';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.status) {
        errorMessage = `Erro ${error.response.status}: ${error.response.statusText || 'Erro ao comunicar com o servidor'}`;
      }
      
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  const totalQuestoesRespondidas = totalQuestoes
    ? Array.from({ length: totalQuestoes }, (_, index) => index + 1).filter(
        numeroQuestao => !!gabaritoManual[numeroQuestao],
      ).length
    : 0;
  const totalQuestoesPendentes = totalQuestoes > 0 ? totalQuestoes - totalQuestoesRespondidas : 0;


  // Funções de correção
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcessSingleCorrection = async () => {
    if (!uploadedImage) {
      toast({
        title: 'Erro',
        description: 'Selecione uma imagem para corrigir.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsProcessingSingle(true);
      setCorrectionProgress(0);

      // Converter imagem para base64
      const base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(uploadedImage);
      });

      // Simular progresso
      const progressInterval = setInterval(() => {
        setCorrectionProgress(prev => Math.min(prev + 15, 90));
      }, 300);

      // O backend identifica o gabarito automaticamente pelo QR code na imagem
      const result = await startSingleCorrection(base64Image);

      clearInterval(progressInterval);
      setCorrectionProgress(100);

      setUploadedImage(null);
      setPreviewImage(null);
    } catch (error: any) {
      console.error('Erro ao processar correção:', error);
    } finally {
      setIsProcessingSingle(false);
      setCorrectionProgress(0);
    }
  };

  const handleBatchImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const maxImages = 10;
    const remainingSlots = maxImages - batchImages.length;
    const filesToAdd = files.slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      toast({
        title: 'Limite de imagens',
        description: `Máximo de ${maxImages} imagens por lote. Apenas ${remainingSlots} imagens foram adicionadas.`,
        variant: 'destructive',
      });
    }

    const newImages = await Promise.all(
      filesToAdd.map(async (file) => {
        const preview = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        return { file, preview };
      })
    );

    setBatchImages(prev => [...prev, ...newImages]);
    
    if (batchFileInputRef.current) {
      batchFileInputRef.current.value = '';
    }
  };

  const handleRemoveBatchImage = (index: number) => {
    setBatchImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleClearBatchImages = () => {
    setBatchImages([]);
  };

  const handleStartBatchCorrection = async () => {
    if (batchImages.length === 0) {
      toast({
        title: 'Erro',
        description: 'Selecione pelo menos uma imagem.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const base64Images = batchImages.map(img => img.preview);
      // O backend identifica o gabarito automaticamente pelo QR code nas imagens
      await startBatchCorrection(base64Images);
    } catch (error) {
      console.error('Erro ao iniciar correção em lote:', error);
    }
  };

  const handleCloseBatchDialog = () => {
    if (!isBatchProcessing) {
      setShowBatchCorrectionDialog(false);
      setBatchImages([]);
      resetBatchCorrection();
    }
  };

  // Funções para gerenciar cartões gerados
  const fetchGabaritos = useCallback(async () => {
    try {
      setIsLoadingGabaritos(true);
      const response = await api.get<GabaritosResponse>('/answer-sheets/gabaritos');
      setGabaritos(response.data.gabaritos || []);
    } catch (error: any) {
      console.error('Erro ao carregar gabaritos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os cartões gerados.',
        variant: 'destructive',
      });
      setGabaritos([]);
    } finally {
      setIsLoadingGabaritos(false);
    }
  }, [toast]);

  const handleDownloadGabarito = async (gabaritoId: string) => {
    try {
      setDownloadingGabaritoId(gabaritoId);
      setDownloadProgress(0);
      
      // Simular progresso inicial
      setDownloadProgress(10);
      
      const response = await api.get(`/answer-sheets/gabarito/${gabaritoId}/download`, {
        responseType: 'blob',
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setDownloadProgress(Math.min(percentCompleted, 90));
          } else {
            // Se não tiver total, incrementar gradualmente
            setDownloadProgress(prev => Math.min(prev + 10, 80));
          }
        },
      });
      
      setDownloadProgress(95);

      if (response.data instanceof Blob && response.data.size > 0) {
        const url = window.URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        
        // Tentar extrair o nome do arquivo do header Content-Disposition
        const contentDisposition = response.headers['content-disposition'] || response.headers['Content-Disposition'];
        let zipFileName = `gabarito_${gabaritoId}.zip`;
        
        if (contentDisposition) {
          let fileNameMatch = contentDisposition.match(/filename\*?=['"]?([^'";\n]+)['"]?/i);
          if (!fileNameMatch) {
            fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
          }
          
          if (fileNameMatch && fileNameMatch[1]) {
            let extractedFileName = fileNameMatch[1].replace(/['"]/g, '');
            if (extractedFileName.startsWith("UTF-8''")) {
              extractedFileName = extractedFileName.replace(/^UTF-8''/, '');
            }
            try {
              zipFileName = decodeURIComponent(extractedFileName);
            } catch (e) {
              zipFileName = extractedFileName;
            }
          }
        }
        
        link.download = zipFileName;
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }, 100);

        setDownloadProgress(100);
        
        toast({
          title: 'Sucesso!',
          description: `Download do gabarito iniciado (${(response.data.size / 1024 / 1024).toFixed(2)} MB).`,
        });
        
        // Resetar progresso após um pequeno delay para mostrar 100%
        setTimeout(() => {
          setDownloadProgress(0);
        }, 500);
      } else {
        throw new Error('O arquivo recebido está vazio ou é inválido.');
      }
    } catch (error: any) {
      console.error('Erro ao baixar gabarito:', error);
      
      let errorMessage = 'Não foi possível baixar o gabarito.';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 403) {
        errorMessage = 'Você não tem permissão para acessar este gabarito.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Gabarito não encontrado.';
      } else if (error.response?.status === 400) {
        errorMessage = 'Gabarito não possui turma associada.';
      }
      
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
      
      setDownloadProgress(0);
    } finally {
      setDownloadingGabaritoId(null);
    }
  };

  // Carregar gabaritos quando a aba "generated" for selecionada
  useEffect(() => {
    if (activeTab === 'generated') {
      fetchGabaritos();
    }
  }, [activeTab, fetchGabaritos]);

  // Funções de exclusão
  const handleDeleteGabarito = async (gabaritoId: string) => {
    try {
      setIsDeleting(true);
      const response = await api.delete(`/answer-sheets/gabarito/${gabaritoId}`);
      
      toast({
        title: 'Sucesso!',
        description: response.data?.message || 'Gabarito excluído com sucesso.',
      });
      
      // Remover da lista local
      setGabaritos(prev => prev.filter(g => g.id !== gabaritoId));
      // Remover da seleção se estiver selecionado
      setSelectedGabaritos(prev => {
        const newSet = new Set(prev);
        newSet.delete(gabaritoId);
        return newSet;
      });
    } catch (error: any) {
      console.error('Erro ao excluir gabarito:', error);
      
      let errorMessage = 'Não foi possível excluir o gabarito.';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 403) {
        errorMessage = 'Você não tem permissão para excluir este gabarito.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Gabarito não encontrado.';
      }
      
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setGabaritoToDelete(null);
    }
  };

  const handleDeleteMultipleGabaritos = async () => {
    if (selectedGabaritos.size === 0) return;
    
    try {
      setIsDeleting(true);
      const ids = Array.from(selectedGabaritos);
      const response = await api.delete('/answer-sheets/gabaritos', {
        data: { ids },
      });
      
      const data = response.data;
      const deletedCount = data.deleted_count || 0;
      const requestedCount = data.requested_count || ids.length;
      
      if (deletedCount > 0) {
        toast({
          title: 'Sucesso!',
          description: data.message || `${deletedCount} gabarito(s) excluído(s) com sucesso.`,
        });
        
        // Remover gabaritos excluídos da lista local
        if (data.deleted_ids && Array.isArray(data.deleted_ids)) {
          setGabaritos(prev => prev.filter(g => !data.deleted_ids.includes(g.id)));
        } else {
          // Se não retornar IDs, remover todos os selecionados
          setGabaritos(prev => prev.filter(g => !ids.includes(g.id)));
        }
        
        // Limpar seleção
        setSelectedGabaritos(new Set());
      }
      
      if (data.not_found_or_unauthorized_ids && data.not_found_or_unauthorized_ids.length > 0) {
        toast({
          title: 'Atenção',
          description: `${deletedCount} excluído(s), mas ${data.not_found_or_unauthorized_ids.length} não puderam ser excluídos (sem permissão ou não encontrados).`,
          variant: 'default',
        });
      }
    } catch (error: any) {
      console.error('Erro ao excluir gabaritos:', error);
      
      let errorMessage = 'Não foi possível excluir os gabaritos.';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleToggleSelectGabarito = (gabaritoId: string) => {
    setSelectedGabaritos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(gabaritoId)) {
        newSet.delete(gabaritoId);
      } else {
        newSet.add(gabaritoId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedGabaritos.size === gabaritos.length) {
      setSelectedGabaritos(new Set());
    } else {
      setSelectedGabaritos(new Set(gabaritos.map(g => g.id)));
    }
  };

  const handleOpenDeleteDialog = (gabaritoId?: string) => {
    if (gabaritoId) {
      setDeleteMode('single');
      setGabaritoToDelete(gabaritoId);
    } else {
      setDeleteMode('multiple');
      setGabaritoToDelete(null);
    }
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    if (deleteMode === 'single' && gabaritoToDelete) {
      handleDeleteGabarito(gabaritoToDelete);
    } else if (deleteMode === 'multiple') {
      handleDeleteMultipleGabaritos();
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Gerador de Cartões Resposta</h1>
        <p className="text-muted-foreground">
          Configure e gere cartões resposta personalizados para provas físicas
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="generate">Gerar Cartões</TabsTrigger>
          <TabsTrigger value="correct">Corrigir Cartões</TabsTrigger>
          <TabsTrigger value="generated">Cartões Gerados</TabsTrigger>
        </TabsList>

        {/* Tab: Gerar Cartões */}
        <TabsContent value="generate" className="space-y-6">

      {/* Stepper */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
            currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}>
            1
          </div>
          <span className="font-medium hidden sm:inline">Configurar</span>
        </div>
        <ChevronRight className="text-gray-400" />
        <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
            currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}>
            2
          </div>
          <span className="font-medium hidden sm:inline">Gerar</span>
        </div>
      </div>

      {/* Etapa 1: Configuração */}
      {currentStep === 1 && (
        <div className="space-y-6">
          {/* Card 1: Localização */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <School className="h-5 w-5" />
                Localização
              </CardTitle>
              <CardDescription>
                Selecione o estado e município
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="estado">Estado *</Label>
                  {isLoadingEstados ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select value={selectedEstado} onValueChange={setSelectedEstado}>
                      <SelectTrigger id="estado">
                        <SelectValue placeholder="Selecione o estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {estados.map(estado => (
                          <SelectItem key={estado.id} value={estado.name}>
                            {estado.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="municipio">Município *</Label>
                  {isLoadingMunicipios ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select 
                      value={selectedMunicipio} 
                      onValueChange={setSelectedMunicipio}
                      disabled={!selectedEstado}
                    >
                      <SelectTrigger id="municipio">
                        <SelectValue placeholder="Selecione o município" />
                      </SelectTrigger>
                      <SelectContent>
                        {municipios.map(municipio => (
                          <SelectItem key={municipio.id} value={municipio.id}>
                            {municipio.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Escola e Turma */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <School className="h-5 w-5" />
                Informações da Prova
              </CardTitle>
              <CardDescription>
                Selecione o curso, série, escola e turma
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="curso">Curso *</Label>
                  {isLoadingCursos ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select 
                      value={selectedCurso} 
                      onValueChange={setSelectedCurso}
                      disabled={!selectedMunicipio}
                    >
                      <SelectTrigger id="curso">
                        <SelectValue placeholder="Selecione o curso" />
                      </SelectTrigger>
                      <SelectContent>
                        {cursos.map(curso => (
                          <SelectItem key={curso.id} value={curso.id}>
                            {curso.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serie">Série *</Label>
                  {isLoadingSeries ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <>
                      <Select 
                        value={selectedSerie} 
                        onValueChange={setSelectedSerie} 
                        disabled={!selectedCurso || !selectedMunicipio || series.length === 0}
                      >
                        <SelectTrigger id="serie">
                          <SelectValue placeholder="Selecione a série" />
                        </SelectTrigger>
                        <SelectContent>
                          {series.map(serie => (
                            <SelectItem key={serie.id} value={serie.id}>
                              {serie.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {noSeriesMessage && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {noSeriesMessage}
                        </p>
                      )}
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="school">Escola *</Label>
                  {isLoadingSchools ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <>
                      <Select 
                        value={selectedSchool} 
                        onValueChange={setSelectedSchool}
                        disabled={!selectedSerie}
                      >
                        <SelectTrigger id="school">
                          <SelectValue placeholder="Selecione a escola" />
                        </SelectTrigger>
                        <SelectContent>
                          {schools.map(school => (
                            <SelectItem key={school.id} value={school.id}>
                              {school.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {noSchoolsMessage && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {noSchoolsMessage}
                        </p>
                      )}
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="turma">Turma *</Label>
                  {isLoadingTurmas ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <>
                      <Select 
                        value={selectedTurma} 
                        onValueChange={setSelectedTurma} 
                        disabled={!selectedSchool || turmas.length === 0}
                      >
                        <SelectTrigger id="turma">
                          <SelectValue placeholder="Selecione a turma" />
                        </SelectTrigger>
                        <SelectContent>
                          {turmas.map(turma => (
                            <SelectItem key={turma.id} value={turma.id}>
                              {turma.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {noTurmasMessage && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {noTurmasMessage}
                        </p>
                      )}
                    </>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="prova">Nome da Prova *</Label>
                  <Input
                    id="prova"
                    placeholder="Ex: Prova de Matemática - 1º Bimestre"
                    value={provaTitulo}
                    onChange={(e) => setProvaTitulo(e.target.value)}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="department">Secretaria/Departamento *</Label>
                  <Input
                    id="department"
                    placeholder="Ex: Secretaria Municipal de Educação"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Nome da secretaria ou departamento responsável pela prova.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Alternativas Disponíveis */}
          {totalQuestoes > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">
                    A
                  </span>
                  Alternativas Disponíveis
                </CardTitle>
                <CardDescription>
                  Configure quais alternativas estarão disponíveis no cartão resposta (mínimo 2, máximo D)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="use-global-alternatives"
                    checked={useGlobalAlternatives}
                    onCheckedChange={(checked) => {
                      setUseGlobalAlternatives(checked === true);
                      if (checked === true) {
                        // Limpar configurações individuais ao voltar para global
                        setQuestionsOptions({});
                      }
                    }}
                  />
                  <Label htmlFor="use-global-alternatives" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Aplicar as mesmas alternativas a todas as questões
                  </Label>
                </div>

                {useGlobalAlternatives ? (
                  <div className="space-y-4 pl-6 border-l-2 border-purple-200">
                    <div className="space-y-2">
                      <Label>Alternativas Globais</Label>
                      <div className="flex gap-4">
                        {(['A', 'B', 'C', 'D'] as const).map((alt) => (
                          <div key={alt} className="flex items-center space-x-2">
                            <Checkbox
                              id={`global-alt-${alt}`}
                              checked={globalAlternatives.includes(alt)}
                              onCheckedChange={(checked) => handleToggleGlobalAlternative(alt, checked === true)}
                              disabled={!globalAlternatives.includes(alt) && globalAlternatives.length >= 4}
                            />
                            <Label
                              htmlFor={`global-alt-${alt}`}
                              className="text-sm font-medium cursor-pointer"
                            >
                              {alt}
                            </Label>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {globalAlternatives.length < 2 && (
                          <span className="text-red-500">Selecione pelo menos 2 alternativas.</span>
                        )}
                        {globalAlternatives.length >= 2 && (
                          <span className="text-green-600">
                            {globalAlternatives.length} alternativa(s) selecionada(s): {globalAlternatives.join(', ')}
                          </span>
                        )}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleApplyGlobalToAll}
                      disabled={globalAlternatives.length < 2}
                    >
                      Aplicar a todas as questões
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 pl-6 border-l-2 border-purple-200">
                    <Label>Modo Individual</Label>
                    <p className="text-xs text-muted-foreground">
                      Configure alternativas específicas para cada questão usando o botão "Configurar" em cada questão abaixo.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Card 4: Questões e Gabarito */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                  Q
                </span>
                Questões e Gabarito
              </CardTitle>
              <CardDescription>
                Informe a quantidade de questões da prova e selecione a alternativa correta de cada uma
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start">
                <div className="space-y-2">
                  <Label htmlFor="total-questoes">Quantidade de Questões *</Label>
                  <Input
                    id="total-questoes"
                    type="number"
                    min={1}
                    max={200}
                    value={totalQuestoes || ''}
                    onChange={(event) => handleChangeTotalQuestoes(event.target.value)}
                    placeholder="Ex: 10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Máximo de 200 questões por prova.
                  </p>
                </div>

                {totalQuestoes > 0 && (
                  <div className="space-y-2 rounded-md border bg-muted/50 p-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Status do gabarito
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-xs">
                        Total: <span className="ml-1 font-semibold">{totalQuestoes}</span>
                      </Badge>
                      <Badge variant="default" className="bg-emerald-600 text-xs hover:bg-emerald-600">
                        Respondidas:{' '}
                        <span className="ml-1 font-semibold">{totalQuestoesRespondidas}</span>
                      </Badge>
                      <Badge
                        variant={totalQuestoesPendentes === 0 ? 'secondary' : 'outline'}
                        className={`text-xs ${
                          totalQuestoesPendentes === 0
                            ? 'border-emerald-500 text-emerald-600'
                            : 'border-amber-500 text-amber-600'
                        }`}
                      >
                        Pendentes:{' '}
                        <span className="ml-1 font-semibold">{totalQuestoesPendentes}</span>
                      </Badge>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={handleClearGabarito}
                      >
                        Limpar gabarito
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {totalQuestoes > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      Gabarito ({totalQuestoes} questão(ões))
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Selecione a alternativa correta para cada número de questão. As alternativas disponíveis podem ser personalizadas acima.
                    </p>
                  </div>

                  <div className="max-h-[360px] space-y-3 overflow-y-auto rounded-md border bg-background/40 p-3">
                    {Array.from({ length: totalQuestoes }, (_, index) => {
                      const numeroQuestao = index + 1;
                      const respostaSelecionada = gabaritoManual[numeroQuestao] || '';

                      return (
                        <div
                          key={numeroQuestao}
                          className="flex items-center justify-between gap-3 rounded-md border bg-muted/60 px-3 py-2 shadow-sm transition-colors hover:border-blue-500 hover:bg-muted dark:hover:border-blue-400 dark:hover:bg-slate-800/80"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">#{numeroQuestao}</Badge>
                            <span className="text-sm font-medium">
                              Questão {numeroQuestao}
                            </span>
                          </div>
                          <div className="flex gap-2 items-center">
                            {getAvailableAlternatives(numeroQuestao).map((alternativa) => {
                              const isAtiva = respostaSelecionada === alternativa;
                              return (
                                <button
                                  key={alternativa}
                                  type="button"
                                  onClick={() =>
                                    handleChangeRespostaQuestao(numeroQuestao, alternativa)
                                  }
                                  aria-pressed={isAtiva}
                                  aria-label={`Marcar alternativa ${alternativa} na questão ${numeroQuestao}`}
                                  className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                                    isAtiva
                                      ? 'border-blue-600 bg-blue-600 text-white shadow-sm dark:border-blue-400 dark:bg-blue-500'
                                      : 'border-border bg-background text-foreground hover:border-blue-400 hover:bg-blue-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-blue-400 dark:hover:bg-blue-950'
                                  }`}
                                >
                                  {alternativa}
                                </button>
                              );
                            })}
                            {!useGlobalAlternatives && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 px-2 text-xs ml-2"
                                onClick={() => setEditingQuestionAlternatives(numeroQuestao)}
                              >
                                Configurar
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {Array.from({ length: totalQuestoes }, (_, index) => index + 1).some(
                    (numeroQuestao) => !gabaritoManual[numeroQuestao],
                  ) && (
                    <p className="text-xs text-red-500">
                      Preencha o gabarito de todas as questões para continuar.
                    </p>
                  )}
                </div>
              )}

              {/* Dialog para configurar alternativas individuais */}
              <Dialog open={editingQuestionAlternatives !== null} onOpenChange={(open) => {
                if (!open) setEditingQuestionAlternatives(null);
              }}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      Configurar Alternativas - Questão {editingQuestionAlternatives}
                    </DialogTitle>
                    <DialogDescription>
                      Selecione quais alternativas estarão disponíveis para esta questão (mínimo 2).
                    </DialogDescription>
                  </DialogHeader>
                  {editingQuestionAlternatives !== null && (
                    <div className="space-y-4 py-4">
                      <div className="flex gap-4">
                        {(['A', 'B', 'C', 'D'] as const).map((alt) => {
                          const currentAlternatives = questionsOptions[editingQuestionAlternatives] || ['A', 'B', 'C', 'D'];
                          const isChecked = currentAlternatives.includes(alt);
                          return (
                            <div key={alt} className="flex items-center space-x-2">
                              <Checkbox
                                id={`question-${editingQuestionAlternatives}-alt-${alt}`}
                                checked={isChecked}
                                onCheckedChange={(checked) => 
                                  handleToggleQuestionAlternative(editingQuestionAlternatives, alt, checked === true)
                                }
                                disabled={!isChecked && currentAlternatives.length >= 4}
                              />
                              <Label
                                htmlFor={`question-${editingQuestionAlternatives}-alt-${alt}`}
                                className="text-sm font-medium cursor-pointer"
                              >
                                {alt}
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {(() => {
                          const currentAlternatives = questionsOptions[editingQuestionAlternatives] || ['A', 'B', 'C', 'D'];
                          if (currentAlternatives.length < 2) {
                            return <span className="text-red-500">Selecione pelo menos 2 alternativas.</span>;
                          }
                          return (
                            <span className="text-green-600">
                              {currentAlternatives.length} alternativa(s) selecionada(s): {currentAlternatives.join(', ')}
                            </span>
                          );
                        })()}
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            // Resetar para padrão
                            setQuestionsOptions(prev => {
                              const updated = { ...prev };
                              delete updated[editingQuestionAlternatives!];
                              return updated;
                            });
                            setEditingQuestionAlternatives(null);
                          }}
                        >
                          Usar Padrão (A, B, C, D)
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setEditingQuestionAlternatives(null)}
                        >
                          Fechar
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Card 4: Configuração de Blocos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">
                  B
                </span>
                Configuração de Blocos
              </CardTitle>
              <CardDescription>
                Configure como as questões serão organizadas nos cartões resposta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Opção de usar blocos */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="use-blocks"
                  checked={useBlocks}
                  onCheckedChange={(checked) => {
                    if (checked === true) {
                      setUseBlocks(true);
                      setSeparateBySubject(false);
                    } else {
                      setUseBlocks(false);
                    }
                  }}
                />
                <Label htmlFor="use-blocks" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Separar avaliações em blocos
                </Label>
              </div>

              {/* Opção de separar por disciplina */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="separate-by-subject"
                  checked={separateBySubject}
                  onCheckedChange={(checked) => {
                    if (checked === true) {
                      setSeparateBySubject(true);
                      setUseBlocks(false);
                    } else {
                      setSeparateBySubject(false);
                    }
                  }}
                />
                <Label htmlFor="separate-by-subject" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Separar por disciplina (1 bloco por disciplina)
                </Label>
              </div>

              {separateBySubject && (
                <p className="text-xs text-muted-foreground pl-6">
                  Quando ativado, cada disciplina terá seu próprio bloco.
                </p>
              )}

              {/* Configurações de blocos (apenas se useBlocks estiver ativado) */}
              {useBlocks && (
                <div className="space-y-4 pl-6 border-l-2 border-gray-200">
                  <div className="space-y-2">
                    <Label htmlFor="num-blocks">Quantidade de Blocos</Label>
                    <Input
                      id="num-blocks"
                      type="number"
                      min="1"
                      value={numBlocks}
                      onChange={(e) => setNumBlocks(parseInt(e.target.value) || 2)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Número de blocos que serão criados para cada cartão.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="questions-per-block">Questões por Bloco</Label>
                    <Input
                      id="questions-per-block"
                      type="number"
                      min="1"
                      value={questionsPerBlock}
                      onChange={(e) => setQuestionsPerBlock(parseInt(e.target.value) || 5)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Quantidade de questões que cada bloco deve conter.
                    </p>
                  </div>

                  {/* Avisos de validação */}
                  {(() => {
                    const validation = validateBlockSettings();
                    if (validation.warnings.length > 0) {
                      return (
                        <Alert variant={validation.isValid ? "default" : "destructive"}>
                          <AlertDescription>
                            <div className="space-y-2">
                              {validation.warnings.map((warning, index) => (
                                <p key={index} className="text-sm">
                                  {warning}
                                </p>
                              ))}
                            </div>
                          </AlertDescription>
                        </Alert>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={handleNextStep}
              disabled={!isStep1Valid()}
              size="lg"
            >
              Próximo: Gerar Cartões
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Etapa 2: Gerar e Download */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Gerar Cartões Resposta
              </CardTitle>
              <CardDescription>
                Revise as informações e gere os cartões em PDF
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Resumo */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Localização</Label>
                  <p className="font-medium">
                    {selectedEstado} - {municipios.find(m => m.id === selectedMunicipio)?.name}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Escola</Label>
                  <p className="font-medium">{schools.find(s => s.id === selectedSchool)?.name}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Turma</Label>
                  <p className="font-medium">
                    {series.find(s => s.id === selectedSerie)?.name} - {turmas.find(t => t.id === selectedTurma)?.name}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Prova</Label>
                  <p className="font-medium">{provaTitulo}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-lg font-semibold">Geração de Cartões</Label>
                  <Badge variant="default" className="text-lg px-4 py-2">
                    Todos os alunos da turma
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Os cartões resposta serão gerados automaticamente para todos os alunos da turma selecionada e disponibilizados para download em um arquivo ZIP.
                </p>
              </div>

              {isGenerating && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Gerando cartões resposta...</span>
                    <span>{generationProgress}%</span>
                  </div>
                  <Progress value={generationProgress} />
                </div>
              )}

              <Button
                onClick={handleGenerateCards}
                disabled={isGenerating}
                size="lg"
                className="w-full"
              >
                <Download className="h-5 w-5 mr-2" />
                {isGenerating ? 'Enviando para o servidor...' : 'Gerar Cartões no Servidor'}
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-start">
            <Button
              variant="outline"
              onClick={handlePreviousStep}
              disabled={isGenerating}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>
        </div>
      )}
        </TabsContent>

        {/* Tab: Corrigir Cartões */}
        <TabsContent value="correct" className="space-y-6">
          {/* Correção Única */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Correção Única
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="image-upload">Imagem do Cartão Resposta Preenchido</Label>
                <Input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">
                  Faça upload de uma foto do cartão resposta preenchido pelo aluno.
                </p>
              </div>

              {previewImage && (
                <div className="space-y-4">
                  <div>
                    <Label>Preview da Imagem</Label>
                    <div className="mt-2 border rounded-lg p-4">
                      <img
                        src={previewImage}
                        alt="Preview"
                        className="max-w-full h-auto max-h-64 mx-auto"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleProcessSingleCorrection}
                    disabled={isProcessingSingle}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {isProcessingSingle ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Processando... {correctionProgress}%
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Processar Correção
                      </>
                    )}
                  </Button>

                  {isProcessingSingle && (
                    <div className="space-y-2">
                      <Progress value={correctionProgress} className="w-full" />
                      <p className="text-sm text-muted-foreground text-center">
                        Analisando imagem e processando correção...
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Correção em Lote */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Images className="h-5 w-5" />
                Correção em Lote
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Processe múltiplos cartões resposta de uma vez. Selecione várias imagens de cartões preenchidos
                e o sistema irá corrigir todas automaticamente.
              </p>
              
              <Dialog open={showBatchCorrectionDialog} onOpenChange={(open) => {
                if (!open && !isBatchProcessing) {
                  handleCloseBatchDialog();
                } else if (open) {
                  setShowBatchCorrectionDialog(true);
                }
              }}>
                <DialogTrigger asChild>
                  <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Iniciar Correção em Lote
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Images className="h-5 w-5" />
                      Correção em Lote
                    </DialogTitle>
                    <DialogDescription>
                      Selecione múltiplas imagens de cartões resposta para processar de uma vez.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    {/* Upload de imagens */}
                    {!isBatchProcessing && !isBatchCompleted && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="batch-image-upload">Selecionar Imagens</Label>
                          <div className="flex gap-2">
                            <Input
                              id="batch-image-upload"
                              ref={batchFileInputRef}
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handleBatchImageUpload}
                              className="cursor-pointer flex-1"
                            />
                            {batchImages.length > 0 && (
                              <Button
                                variant="outline"
                                onClick={handleClearBatchImages}
                                className="text-red-600 border-red-600 hover:bg-red-50"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Máximo de 10 imagens por lote. Formatos aceitos: JPG, PNG, GIF, WebP.
                          </p>
                        </div>

                        {/* Preview das imagens selecionadas */}
                        {batchImages.length > 0 && (
                          <div className="space-y-2">
                            <Label>{batchImages.length} imagem(ns) selecionada(s)</Label>
                            <ScrollArea className="h-48 border rounded-lg p-2">
                              <div className="grid grid-cols-4 gap-2">
                                {batchImages.map((img, index) => (
                                  <div key={index} className="relative group">
                                    <img
                                      src={img.preview}
                                      alt={`Preview ${index + 1}`}
                                      className="w-full h-24 object-cover rounded border"
                                    />
                                    <button
                                      onClick={() => handleRemoveBatchImage(index)}
                                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                    <span className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1 rounded">
                                      {index + 1}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </div>
                        )}

                        {/* Botão para iniciar */}
                        <Button
                          onClick={handleStartBatchCorrection}
                          disabled={batchImages.length === 0}
                          className="w-full bg-purple-600 hover:bg-purple-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Iniciar Correção ({batchImages.length} cartões)
                        </Button>
                      </>
                    )}

                    {/* Erro */}
                    {batchError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{batchError}</AlertDescription>
                      </Alert>
                    )}

                    {/* Progresso */}
                    {(isBatchProcessing || isBatchCompleted) && batchProgress && (
                      <div className="space-y-4">
                        {/* Header de status */}
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            {isBatchCompleted ? (
                              <>
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                <span className="font-medium text-green-600">Concluído!</span>
                              </>
                            ) : (
                              <>
                                <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                                <span className="font-medium">Processando...</span>
                              </>
                            )}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {batchProgress.completed}/{batchProgress.total} ({batchProgress.percentage.toFixed(0)}%)
                          </span>
                        </div>

                        {/* Barra de progresso */}
                        <Progress value={batchProgress.percentage} className="w-full h-3" />

                        {/* Lista de itens */}
                        <ScrollArea className="h-64 border rounded-lg">
                          <div className="p-2 space-y-1">
                            {Object.entries(batchProgress.items || {}).map(([index, item]) => (
                              <div
                                key={index}
                                className={`flex items-center justify-between p-2 rounded text-sm ${
                                  item.status === 'pending' ? 'bg-gray-100' :
                                  item.status === 'processing' ? 'bg-yellow-50 border border-yellow-200' :
                                  item.status === 'done' ? 'bg-green-50 border border-green-200' :
                                  'bg-red-50 border border-red-200'
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  {item.status === 'pending' && <Clock className="h-4 w-4 text-gray-400" />}
                                  {item.status === 'processing' && <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />}
                                  {item.status === 'done' && <CheckCircle className="h-4 w-4 text-green-500" />}
                                  {item.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                                  <span>
                                    {item.status === 'pending' && `Cartão ${Number(index) + 1} - Aguardando...`}
                                    {item.status === 'processing' && `Cartão ${Number(index) + 1} - Processando...`}
                                    {item.status === 'done' && (item.student_name || `Cartão ${Number(index) + 1}`)}
                                    {item.status === 'error' && `Cartão ${Number(index) + 1} - Erro`}
                                  </span>
                                </span>
                                {item.status === 'done' && (
                                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                                    {item.correct}/{item.total} ({item.percentage?.toFixed(0)}%)
                                  </Badge>
                                )}
                                {item.status === 'error' && item.error && (
                                  <span className="text-xs text-red-600 max-w-[200px] truncate">
                                    {item.error}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>

                        {/* Resumo final */}
                        {isBatchCompleted && (
                          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="space-y-1">
                              <p className="text-sm font-medium">Resumo da Correção</p>
                              <div className="flex gap-4 text-sm">
                                <span className="text-green-600">
                                  ✅ Sucesso: {batchProgress.successful}
                                </span>
                                {batchProgress.failed > 0 && (
                                  <span className="text-red-600">
                                    ❌ Falhas: {batchProgress.failed}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button onClick={handleCloseBatchDialog}>
                              Fechar
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Cartões Gerados */}
        <TabsContent value="generated" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Cartões Gerados
                  </CardTitle>
                  <CardDescription>
                    Visualize, baixe e exclua os cartões resposta que você gerou
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {selectedGabaritos.size > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleOpenDeleteDialog()}
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir ({selectedGabaritos.size})
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchGabaritos}
                    disabled={isLoadingGabaritos}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingGabaritos ? 'animate-spin' : ''}`} />
                    Atualizar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingGabaritos ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : gabaritos.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-muted-foreground mb-2">
                    Nenhum cartão gerado ainda
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Os cartões que você gerar aparecerão aqui
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Header com seleção múltipla */}
                  {gabaritos.length > 0 && (
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="select-all"
                          checked={selectedGabaritos.size === gabaritos.length && gabaritos.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                        <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                          Selecionar todos ({selectedGabaritos.size}/{gabaritos.length})
                        </Label>
                      </div>
                      {selectedGabaritos.size > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedGabaritos(new Set())}
                        >
                          Limpar seleção
                        </Button>
                      )}
                    </div>
                  )}
                  
                  {gabaritos.map((gabarito) => (
                    <Card 
                      key={gabarito.id} 
                      className={`hover:shadow-md transition-shadow ${
                        selectedGabaritos.has(gabarito.id) ? 'ring-2 ring-blue-500' : ''
                      }`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <Checkbox
                              id={`select-${gabarito.id}`}
                              checked={selectedGabaritos.has(gabarito.id)}
                              onCheckedChange={() => handleToggleSelectGabarito(gabarito.id)}
                              className="mt-1"
                            />
                            <div className="flex-1 space-y-3">
                            <div>
                              <h3 className="text-lg font-semibold mb-1">{gabarito.title}</h3>
                              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                                <Badge variant="secondary" className="flex items-center gap-1">
                                  <School className="h-3 w-3" />
                                  {gabarito.school_name}
                                </Badge>
                                <Badge variant="secondary" className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {gabarito.class_name}
                                </Badge>
                                <Badge variant="secondary">
                                  {gabarito.grade_name}
                                </Badge>
                                <Badge variant="outline">
                                  {gabarito.num_questions} questões
                                </Badge>
                                {gabarito.use_blocks && (
                                  <Badge variant="outline" className="border-purple-500 text-purple-700">
                                    Com blocos
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Localização</p>
                                <p className="font-medium">{gabarito.municipality}, {gabarito.state}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Criado por</p>
                                <p className="font-medium">{gabarito.creator_name}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Data de criação</p>
                                <p className="font-medium">
                                  {new Date(gabarito.created_at).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Instituição</p>
                                <p className="font-medium">{gabarito.institution}</p>
                              </div>
                            </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2 min-w-[140px]">
                            <Button
                              onClick={() => handleDownloadGabarito(gabarito.id)}
                              disabled={downloadingGabaritoId === gabarito.id || isDeleting}
                              className="w-full"
                            >
                              {downloadingGabaritoId === gabarito.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Baixando... {downloadProgress > 0 && `${downloadProgress}%`}
                                </>
                              ) : (
                                <>
                                  <Download className="h-4 w-4 mr-2" />
                                  Baixar ZIP
                                </>
                              )}
                            </Button>
                            {downloadingGabaritoId === gabarito.id && downloadProgress > 0 && (
                              <div className="space-y-1">
                                <Progress value={downloadProgress} className="h-2" />
                                <p className="text-xs text-center text-muted-foreground">
                                  Preparando download...
                                </p>
                              </div>
                            )}
                            <Button
                              variant="destructive"
                              onClick={() => handleOpenDeleteDialog(gabarito.id)}
                              disabled={isDeleting || downloadingGabaritoId === gabarito.id}
                              className="w-full"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Diálogo de confirmação de exclusão */}
          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  Confirmar Exclusão
                </DialogTitle>
                <DialogDescription>
                  {deleteMode === 'single' ? (
                    <>
                      Tem certeza que deseja excluir este gabarito? Esta ação não pode ser desfeita.
                    </>
                  ) : (
                    <>
                      Tem certeza que deseja excluir {selectedGabaritos.size} gabarito(s) selecionado(s)? 
                      Esta ação não pode ser desfeita.
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteDialog(false);
                    setGabaritoToDelete(null);
                  }}
                  disabled={isDeleting}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}


