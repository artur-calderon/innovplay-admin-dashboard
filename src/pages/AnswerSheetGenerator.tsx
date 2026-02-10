import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { AnswerSheetConfig, StudentAnswerSheet, School as SchoolType, Serie, Turma, Estado, Municipio, Gabarito, GabaritosResponse, GenerateResponseData, TaskStatusResult, BatchDownloadResponse, BatchClass } from '@/types/answer-sheet';
import { FormFiltersApiService } from '@/services/formFiltersApi';

type Step = 1 | 2;

export default function AnswerSheetGenerator() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Estados da Etapa 1: Configuração
  // Filtros geográficos
  const [estados, setEstados] = useState<Estado[]>([]);
  const [selectedEstado, setSelectedEstado] = useState('');
  const [selectedMunicipio, setSelectedMunicipio] = useState('');
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [isLoadingEstados, setIsLoadingEstados] = useState(false);
  const [isLoadingMunicipios, setIsLoadingMunicipios] = useState(false);
  
  // Filtros de escola/turma
  const [schools, setSchools] = useState<SchoolType[]>([]);
  const [series, setSeries] = useState<Serie[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedSerie, setSelectedSerie] = useState('');
  const [selectedTurma, setSelectedTurma] = useState('');
  const [provaTitulo, setProvaTitulo] = useState('');
  const [gradeName, setGradeName] = useState<string>('');
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

  // Estados para separação por disciplina
  const [disciplines, setDisciplines] = useState<{id: string; name: string}[]>([]);
  const [isLoadingDisciplines, setIsLoadingDisciplines] = useState(false);
  const [blocksByDiscipline, setBlocksByDiscipline] = useState<Array<{
    block_id: number;
    subject_name: string;
    subject_id: string;
    questions_count: number;
    start_question: number;
    end_question: number;
  }>>([]);

  // Estados da Etapa 2: Geração e Download
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [taskId, setTaskId] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [generatedSheets, setGeneratedSheets] = useState<any[]>([]);
  
  // Novos estados para batch
  const [batchId, setBatchId] = useState<string | null>(null);
  const [batchClasses, setBatchClasses] = useState<BatchClass[]>([]);
  const [totalPdfs, setTotalPdfs] = useState<number>(0);
  const [totalStudents, setTotalStudents] = useState<number>(0);

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
        
        const estadosData = await FormFiltersApiService.getFormFilterStates();
        
        setEstados(estadosData.map(estado => ({
          id: estado.id,
          name: estado.nome
        })));
      } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os dados iniciais.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingEstados(false);
      }
    };
    fetchInitialData();
  }, [toast]);

  // Cleanup do polling interval ao desmontar componente
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

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

  // Carregar séries quando escola for selecionada
  useEffect(() => {
    if (selectedSchool) {
      fetchSeries();
    } else {
      setSeries([]);
      setSelectedSerie('');
      setGradeName('');
      setNoSeriesMessage('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSchool]);

  // Carregar nome da série quando série for selecionada
  useEffect(() => {
    if (selectedSerie) {
      const serieData = series.find(s => s.id === selectedSerie);
      setGradeName(serieData?.name || '');
    } else {
      setGradeName('');
    }
  }, [selectedSerie, series]);

  // Carregar escolas quando município for selecionado
  useEffect(() => {
    if (selectedMunicipio) {
      fetchSchools();
      // Limpar seleções subsequentes
      setSelectedSchool('');
      setSchools([]);
      setSelectedSerie('');
      setSeries([]);
      setSelectedTurma('');
      setTurmas([]);
      setNoSchoolsMessage('');
      setNoSeriesMessage('');
      setNoTurmasMessage('');
    } else {
      setSchools([]);
      setSelectedSchool('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMunicipio]);

  // Carregar turmas quando escola e série forem selecionadas
  useEffect(() => {
    if (selectedSchool && selectedSerie) {
      fetchTurmas();
    } else {
      setTurmas([]);
      setSelectedTurma('');
      setNoTurmasMessage('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSchool, selectedSerie]);

  // Carregar disciplinas quando separateBySubject for ativado
  useEffect(() => {
    if (separateBySubject && disciplines.length === 0) {
      fetchDisciplines();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [separateBySubject]);

  // Limpar blocos quando desativar separateBySubject
  useEffect(() => {
    if (!separateBySubject) {
      setBlocksByDiscipline([]);
    }
  }, [separateBySubject]);

  const fetchDisciplines = async () => {
    try {
      setIsLoadingDisciplines(true);
      const response = await api.get('/subjects');
      setDisciplines(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar disciplinas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as disciplinas.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingDisciplines(false);
    }
  };

  // Funções para gerenciar blocos por disciplina
  const handleAddDisciplineBlock = (disciplineId: string, disciplineName: string) => {
    const currentTotalQuestions = blocksByDiscipline.reduce((sum, block) => sum + block.questions_count, 0);
    
    if (blocksByDiscipline.length >= 4) {
      toast({ 
        title: 'Limite atingido', 
        description: 'Máximo de 4 blocos permitidos.', 
        variant: 'destructive' 
      });
      return;
    }
    
    if (currentTotalQuestions >= totalQuestoes) {
      toast({ 
        title: 'Limite atingido', 
        description: 'Todas as questões já foram distribuídas nos blocos.', 
        variant: 'destructive' 
      });
      return;
    }
    
    const startQuestion = currentTotalQuestions + 1;
    const remainingQuestions = totalQuestoes - currentTotalQuestions;
    const defaultQuestionsCount = Math.min(26, remainingQuestions);
    
    const newBlock = {
      block_id: blocksByDiscipline.length + 1,
      subject_name: disciplineName,
      subject_id: disciplineId,
      questions_count: defaultQuestionsCount,
      start_question: startQuestion,
      end_question: startQuestion + defaultQuestionsCount - 1
    };
    
    setBlocksByDiscipline([...blocksByDiscipline, newBlock]);
  };

  const handleRemoveDisciplineBlock = (blockId: number) => {
    const filteredBlocks = blocksByDiscipline.filter(b => b.block_id !== blockId);
    
    // Recalcular IDs e posições dos blocos
    const updatedBlocks = filteredBlocks.map((block, index) => {
      const previousBlocks = filteredBlocks.slice(0, index);
      const startQuestion = previousBlocks.reduce((sum, b) => sum + b.questions_count, 0) + 1;
      return {
        ...block,
        block_id: index + 1,
        start_question: startQuestion,
        end_question: startQuestion + block.questions_count - 1
      };
    });
    
    setBlocksByDiscipline(updatedBlocks);
  };

  const handleUpdateBlockQuestions = (blockId: number, newCount: number) => {
    const maxPerBlock = 26;
    const validCount = Math.min(Math.max(1, newCount), maxPerBlock);
    
    const blockIndex = blocksByDiscipline.findIndex(b => b.block_id === blockId);
    if (blockIndex === -1) return;
    
    // Calcular quantas questões estão sendo usadas por outros blocos
    const otherBlocksTotal = blocksByDiscipline
      .filter(b => b.block_id !== blockId)
      .reduce((sum, b) => sum + b.questions_count, 0);
    
    // Verificar se a nova contagem não ultrapassa o total de questões disponível
    if (otherBlocksTotal + validCount > totalQuestoes) {
      toast({
        title: 'Limite excedido',
        description: `Você só pode distribuir até ${totalQuestoes} questões no total.`,
        variant: 'destructive'
      });
      return;
    }
    
    // Atualizar blocos recalculando as posições
    const updatedBlocks = blocksByDiscipline.map((block, index) => {
      if (block.block_id === blockId) {
        const previousBlocks = blocksByDiscipline.slice(0, index);
        const startQuestion = previousBlocks.reduce((sum, b) => sum + b.questions_count, 0) + 1;
        return {
          ...block,
          questions_count: validCount,
          start_question: startQuestion,
          end_question: startQuestion + validCount - 1
        };
      }
      
      // Recalcular blocos subsequentes
      if (index > blockIndex) {
        const previousBlocks = updatedBlocks.slice(0, index);
        const startQuestion = previousBlocks.reduce((sum, b) => sum + b.questions_count, 0) + 1;
        return {
          ...block,
          start_question: startQuestion,
          end_question: startQuestion + block.questions_count - 1
        };
      }
      
      return block;
    });
    
    setBlocksByDiscipline(updatedBlocks);
  };

  const fetchMunicipios = async () => {
    if (!selectedEstado) return;
    
    try {
      setIsLoadingMunicipios(true);
      const municipiosData = await FormFiltersApiService.getFormFilterMunicipalities(selectedEstado);
      setMunicipios(municipiosData.map(mun => ({
        id: mun.id,
        name: mun.nome,
        state: selectedEstado
      })));
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
    if (!selectedMunicipio || !selectedEstado) return;
    
    try {
      setIsLoadingSchools(true);
      setNoSchoolsMessage('');
      
      const schoolsData = await FormFiltersApiService.getFormFilterSchools({
        estado: selectedEstado,
        municipio: selectedMunicipio
      });
      
      if (schoolsData.length === 0) {
        setNoSchoolsMessage('Nenhuma escola encontrada para este município.');
      }
      
      setSchools(schoolsData.map(school => ({
        id: school.id,
        name: school.nome
      })));
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
    if (!selectedSchool || !selectedEstado || !selectedMunicipio) return;
    
    try {
      setIsLoadingSeries(true);
      setNoSeriesMessage('');
      
      const seriesData = await FormFiltersApiService.getFormFilterGrades({
        estado: selectedEstado,
        municipio: selectedMunicipio,
        escola: selectedSchool
      });
      
      if (seriesData.length === 0) {
        setNoSeriesMessage('Nenhuma série encontrada para esta escola.');
      }
      
      setSeries(seriesData.map(serie => ({
        id: serie.id,
        name: serie.nome
      })));
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
    if (!selectedSchool || !selectedSerie || !selectedEstado || !selectedMunicipio) return;
    
    try {
      setIsLoadingTurmas(true);
      setNoTurmasMessage('');
      
      const turmasData = await FormFiltersApiService.getFormFilterClasses({
        estado: selectedEstado,
        municipio: selectedMunicipio,
        escola: selectedSchool,
        serie: selectedSerie
      });
      
      setTurmas(turmasData.map(turma => ({
        id: turma.id,
        name: turma.nome
      })));
      
      // Limpar seleção de turma se não houver turmas disponíveis
      if (turmasData.length === 0) {
        setSelectedTurma('');
        setNoTurmasMessage('Nenhuma turma encontrada para esta escola e série.');
      } else {
        // Verificar se a turma selecionada ainda existe na lista
        const turmaExists = turmasData.some((t) => t.id === selectedTurma);
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



  // Função para inferir o escopo automaticamente baseado nos filtros selecionados
  const getInferredScope = useCallback((): 'class' | 'grade' | 'school' | null => {
    if (!selectedSchool) return null;
    
    if (selectedTurma) {
      return 'class';  // Tem turma = escopo class
    } else if (selectedSerie) {
      return 'grade';  // Tem série mas não tem turma = escopo grade
    } else {
      return 'school'; // Tem só escola = escopo school
    }
  }, [selectedSchool, selectedSerie, selectedTurma]);

  const isStep1Valid = () => {
    const hasBaseInfo =
      selectedEstado &&
      selectedMunicipio &&
      selectedSchool &&
      provaTitulo &&
      department;

    if (!hasBaseInfo) {
      return false;
    }

    // Inferir escopo e validar
    const scope = getInferredScope();
    if (!scope) {
      return false;
    }

    // Validações específicas por escopo
    if (scope === 'class') {
      // Para gerar cartões de uma turma, precisa ter turma selecionada
      if (!selectedTurma || turmas.length === 0 || !turmas.some(t => t.id === selectedTurma)) {
        return false;
      }
    } else if (scope === 'grade') {
      // Para gerar cartões de uma série, precisa ter série selecionada
      if (!selectedSerie) {
        return false;
      }
    }
    // Para 'school', não precisa de validações extras além da escola

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

    // Validar blocos por disciplina se estiver ativado
    if (separateBySubject) {
      const validation = validateDisciplineBlocks();
      if (!validation.isValid) {
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
      if (currentStep === 2 && pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (currentStep === 2) {
        setTaskId(null);
        setBatchId(null);
        setBatchClasses([]);
        setGeneratedSheets([]);
        setTotalPdfs(0);
        setTotalStudents(0);
        setGenerationProgress(0);
      }
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  // Função para validar configurações de blocos por disciplina
  const validateDisciplineBlocks = (): { isValid: boolean; warnings: string[] } => {
    const warnings: string[] = [];
    
    if (blocksByDiscipline.length === 0) {
      warnings.push('❌ Adicione pelo menos uma disciplina aos blocos.');
      return { isValid: false, warnings };
    }
    
    if (blocksByDiscipline.length > 4) {
      warnings.push('❌ Máximo de 4 blocos permitidos.');
      return { isValid: false, warnings };
    }
    
    const totalBlockQuestions = blocksByDiscipline.reduce((sum, b) => sum + b.questions_count, 0);
    if (totalBlockQuestions !== totalQuestoes) {
      warnings.push(`❌ A soma das questões nos blocos (${totalBlockQuestions}) deve ser igual ao total de questões (${totalQuestoes}).`);
      return { isValid: false, warnings };
    }
    
    const hasInvalidBlock = blocksByDiscipline.some(b => b.questions_count > 26);
    if (hasInvalidBlock) {
      warnings.push('❌ Máximo de 26 questões por bloco.');
      return { isValid: false, warnings };
    }
    
    const hasInvalidBlockCount = blocksByDiscipline.some(b => b.questions_count <= 0);
    if (hasInvalidBlockCount) {
      warnings.push('❌ Cada bloco deve ter pelo menos 1 questão.');
      return { isValid: false, warnings };
    }
    
    return { isValid: true, warnings };
  };

  // Função para validar configurações de blocos
  const validateBlockSettings = (): { isValid: boolean; warnings: string[] } => {
    const warnings: string[] = [];
    let hasCriticalError = false;

    // Se separar por disciplina, usar validação específica
    if (separateBySubject) {
      return validateDisciplineBlocks();
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

  const startPolling = (taskId: string) => {
    setGenerationProgress(20);

    // Limpar intervalo anterior se existir
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Iniciar polling a cada 2 segundos
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const statusConfig = selectedMunicipio ? { meta: { cityId: selectedMunicipio } } : {};
        const response = await api.get(`/answer-sheets/task/${taskId}/status`, statusConfig);
        const data = response.data;

        console.log("📊 Status do polling:", data.status);

        // Atualizar progresso visual
        if (data.status === 'processing' || data.status === 'pending') {
          setGenerationProgress(prev => Math.min(prev + 5, 80));
          
          // Atualizar progresso por turma se disponível
          if (data.result?.classes) {
            setBatchClasses(data.result.classes);
          }
        }

        // SUCESSO: parar polling e exibir resultado
        if (data.status === 'completed') {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }

          setGenerationProgress(100);
          setIsGenerating(false);

          // Avisos (ex.: turmas puladas por não terem alunos)
          const warnings: string[] = data.warnings ?? [];
          if (warnings.length > 0) {
            toast({
              title: "Avisos na geração",
              description: warnings.join(' '),
              variant: "default",
            });
          }

          // Processar resultado
          const result: TaskStatusResult = data.result;
          
          // Verificar se é batch ou single
          if (result?.scope === 'class') {
            // Comportamento antigo (uma turma)
            setGeneratedSheets(result.sheets || []);
            
            toast({
              title: "✅ Cartões gerados com sucesso!",
              description: `${result.generated_sheets || 0} cartões foram gerados para ${result.total_students || 0} alunos.`,
            });
          } else if (result) {
            // Novo: múltiplas turmas (batch) — total_classes = apenas turmas que geraram PDF
            setBatchId(result.batch_id || null);
            setBatchClasses(result.classes || []);
            setTotalPdfs(result.total_pdfs || 0);
            setTotalStudents(result.total_students || 0);
            
            const skippedCount = result.skipped_classes?.length ?? 0;
            const skippedText = skippedCount > 0
              ? ` ${skippedCount} turma(s) pulada(s) (sem alunos).`
              : '';
            toast({
              title: "✅ Cartões gerados com sucesso!",
              description: `${result.total_pdfs} PDFs gerados para ${result.total_students} alunos em ${result.total_classes} turmas.${skippedText}`,
            });
          }

          // Recarregar lista de gabaritos
          await fetchGabaritos();

          setGenerationProgress(0);
        }

        // ERRO: parar polling e exibir erro
        if (data.status === 'failed') {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }

          setIsGenerating(false);
          setGenerationProgress(0);

          toast({
            title: "❌ Erro ao gerar cartões",
            description: data.error || "Erro desconhecido ao gerar cartões de resposta",
            variant: "destructive",
          });
        }

      } catch (error: any) {
        console.error("Erro ao verificar status da geração:", error);
        
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }

        setIsGenerating(false);
        setGenerationProgress(0);

        toast({
          title: "Erro",
          description: "Erro ao verificar status da geração. Tente novamente.",
          variant: "destructive",
        });
      }
    }, 2000); // Polling a cada 2 segundos

    // Timeout de segurança (20 minutos para turmas grandes)
    setTimeout(() => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

      if (isGenerating) {
        setIsGenerating(false);
        setGenerationProgress(0);
        
        toast({
          title: "⚠️ Timeout",
          description: "A geração está demorando mais do que o esperado. Por favor, verifique a lista de gabaritos ou tente novamente.",
          variant: "destructive",
        });
      }
    }, 20 * 60 * 1000); // 20 minutos
  };

  const handleGenerateCards = async () => {
    // Inferir escopo automaticamente
    const scope = getInferredScope();
    
    if (!scope) {
      toast({
        title: 'Erro',
        description: 'Selecione pelo menos um estado, município e escola.',
        variant: 'destructive',
      });
      return;
    }
    
    // Validações específicas por escopo
    if (scope === 'class' && !selectedTurma) {
      toast({
        title: 'Erro',
        description: 'Para gerar cartões de uma turma, selecione a turma.',
        variant: 'destructive',
      });
      return;
    }
    
    if (scope === 'grade' && !selectedSerie) {
      toast({
        title: 'Erro',
        description: 'Para gerar cartões de uma série, selecione a série.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsGenerating(true);
      setGenerationProgress(10);
      setTaskId(null);
      setBatchId(null);
      setBatchClasses([]);
      setGeneratedSheets([]);
      setTotalPdfs(0);
      setTotalStudents(0);

      const municipioData = municipios.find(m => m.id === selectedMunicipio);
      const schoolData = schools.find(s => s.id === selectedSchool);
      const serieData = series.find(s => s.id === selectedSerie);

      // Preparar payload no formato esperado pelo backend
      const payload: any = {
        num_questions: totalQuestoes,
        correct_answers: gabaritoManual,
        test_data: {
          title: provaTitulo,
          municipality: municipioData?.name || '',
          state: selectedEstado || '',
          department: department,
          institution: schoolData?.name || '',
          grade_name: serieData?.name || '',
        }
      };

      // Adicionar campos baseados no escopo inferido
      if (scope === 'class') {
        payload.class_id = selectedTurma;
      } else if (scope === 'grade') {
        payload.grade_id = selectedSerie;
        payload.school_id = selectedSchool;
      } else if (scope === 'school') {
        payload.school_id = selectedSchool;
      }

      // Adicionar questions_options se necessário
      const questionsOptionsData = buildQuestionsOptions();
      if (questionsOptionsData) {
        payload.questions_options = questionsOptionsData;
      }

      // Configurar blocos
      if (separateBySubject) {
        const validation = validateDisciplineBlocks();
        if (!validation.isValid) {
          toast({ 
            title: 'Erro na configuração de blocos', 
            description: validation.warnings.join(' '), 
            variant: 'destructive' 
          });
          setIsGenerating(false);
          return;
        }
        
        payload.use_blocks = true;
        payload.blocks_config = {
          use_blocks: true,
          num_blocks: blocksByDiscipline.length,
          blocks: blocksByDiscipline.map(block => ({
            block_id: block.block_id,
            subject_name: block.subject_name,
            questions_count: block.questions_count,
            start_question: block.start_question,
            end_question: block.end_question
          }))
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

      // 1. DISPARAR GERAÇÃO (retorna imediatamente com 202)
      const generateConfig = selectedMunicipio
        ? { headers: { 'Content-Type': 'application/json' }, meta: { cityId: selectedMunicipio } }
        : { headers: { 'Content-Type': 'application/json' } };
      const response = await api.post('/answer-sheets/generate', payload, generateConfig);

      // Verificar se a resposta é 202 Accepted (assíncrono)
      if (response.status === 202) {
        const data: GenerateResponseData = response.data;
        setTaskId(data.task_id);

        // Armazenar informações do batch se houver
        if (data.batch_id) {
          setBatchId(data.batch_id);
          setBatchClasses(data.classes || []);
        }

        // Mensagem personalizada por escopo
        const scopeMessages = {
          class: `Os cartões de resposta para 1 turma estão sendo gerados.`,
          grade: `Os cartões de resposta para ${data.classes_count} turmas da série ${data.scope_name} estão sendo gerados.`,
          school: `Os cartões de resposta para ${data.classes_count} turmas da escola ${data.scope_name} estão sendo gerados.`,
        };

        toast({
          title: "⏳ Geração iniciada",
          description: scopeMessages[data.scope] + ` Isso pode levar vários minutos.`,
        });

        // 2. INICIAR POLLING
        startPolling(data.task_id);
      } else {
        // Resposta não esperada
        console.warn('⚠️ Resposta não é 202 Accepted:', response.status);
        
        setIsGenerating(false);
        setGenerationProgress(0);

        toast({
          title: 'Aviso',
          description: 'A geração foi iniciada, mas o formato de resposta não é o esperado. Verifique a lista de gabaritos.',
        });
      }

    } catch (error: any) {
      console.error('❌ Erro ao gerar cartões:', error);
      
      setIsGenerating(false);
      setGenerationProgress(0);

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
      
      // O hook já exibe o toast, mas garantimos que o erro do backend seja exibido corretamente
      // Se o hook não exibiu (erro não HTTP), exibimos aqui
      if (!error.response) {
        const errorMessage = error.message || "Não foi possível processar a correção. Tente novamente.";
        toast({
          title: 'Erro',
          description: errorMessage,
          variant: 'destructive',
        });
      }
      // Se for erro HTTP, o hook já exibiu o toast com error.response?.data?.error
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
      const config = selectedMunicipio ? { meta: { cityId: selectedMunicipio } } : {};
      const response = await api.get<GabaritosResponse>('/answer-sheets/gabaritos', config);
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
  }, [toast, selectedMunicipio]);

  const handleDownloadGabarito = async (gabaritoId: string) => {
    try {
      setDownloadingGabaritoId(gabaritoId);
      
      // 1. Solicitar URL de download (JSON response com URL pré-assinada do MinIO)
      const downloadConfig = selectedMunicipio ? { meta: { cityId: selectedMunicipio } } : {};
      const response = await api.get(`/answer-sheets/gabarito/${gabaritoId}/download`, downloadConfig);

      // 2. Verificar se retornou URL de download
      if (response.data.download_url) {
        // 3. Redirecionar para URL pré-assinada (download direto do MinIO)
        window.location.href = response.data.download_url;

        toast({
          title: 'Download iniciado',
          description: `O arquivo ZIP está sendo baixado. Link expira em ${response.data.expires_in || '1 hora'}.`,
        });
      } else {
        throw new Error('URL de download não disponível');
      }
    } catch (error: any) {
      console.error('Erro ao baixar gabarito:', error);
      
      let errorMessage = 'Não foi possível baixar o gabarito.';
      
      // Tratar erro específico: ZIP ainda não gerado
      if (error.response?.data?.status === 'not_generated') {
        errorMessage = 'Os cartões ainda não foram gerados. Gere primeiro ou aguarde a conclusão da geração.';
      } else if (error.response?.data?.error) {
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
    } finally {
      setDownloadingGabaritoId(null);
    }
  };

  // Nova função para baixar batch completo
  const handleDownloadBatch = async (batchId: string) => {
    try {
      setDownloadingGabaritoId(batchId);
      
      const batchConfig = selectedMunicipio ? { meta: { cityId: selectedMunicipio } } : {};
      const response = await api.get<BatchDownloadResponse>(`/answer-sheets/batch/${batchId}/download`, batchConfig);

      if (response.data.download_url) {
        window.location.href = response.data.download_url;

        toast({
          title: 'Download iniciado',
          description: `Baixando ZIP com ${response.data.classes_count} PDFs. Link expira em ${response.data.expires_in}.`,
        });
      } else {
        throw new Error('URL de download não disponível');
      }
    } catch (error: any) {
      console.error('Erro ao baixar batch:', error);
      
      let errorMessage = 'Não foi possível baixar o batch de gabaritos.';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 404) {
        errorMessage = 'Batch não encontrado.';
      }
      
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
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
      const deleteConfig = selectedMunicipio ? { meta: { cityId: selectedMunicipio } } : {};
      const response = await api.delete(`/answer-sheets/gabarito/${gabaritoId}`, deleteConfig);
      
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
      const multiDeleteConfig = selectedMunicipio
        ? { data: { ids }, meta: { cityId: selectedMunicipio } }
        : { data: { ids } };
      const response = await api.delete('/answer-sheets/gabaritos', multiDeleteConfig);
      
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

  // Função para navegar para a página de resultados
  const handleViewResults = (gabaritoId: string) => {
    navigate(`/app/cartao-resposta/resultados/${gabaritoId}`);
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
                Selecione a escola, série e turma
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* PRIMEIRO: Escola (depende de município) */}
                <div className="space-y-2">
                  <Label htmlFor="school">Escola *</Label>
                  {isLoadingSchools ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <>
                      <Select 
                        value={selectedSchool} 
                        onValueChange={setSelectedSchool}
                        disabled={!selectedMunicipio || schools.length === 0}
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

                {/* SEGUNDO: Série (depende de escola, opcional) */}
                <div className="space-y-2">
                  <Label htmlFor="serie">Série (opcional)</Label>
                  {isLoadingSeries ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <Select 
                          value={selectedSerie} 
                          onValueChange={setSelectedSerie} 
                          disabled={!selectedSchool || series.length === 0}
                        >
                          <SelectTrigger id="serie" className="flex-1">
                            <SelectValue placeholder="Selecione a série (opcional)" />
                          </SelectTrigger>
                          <SelectContent>
                            {series.map(serie => (
                              <SelectItem key={serie.id} value={serie.id}>
                                {serie.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedSerie && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setSelectedSerie('');
                              setSelectedTurma('');
                              setTurmas([]);
                            }}
                            title="Limpar seleção - Voltar para toda a escola"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {noSeriesMessage && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {noSeriesMessage}
                        </p>
                      )}
                      {!selectedSerie && selectedSchool && (
                        <p className="text-xs text-muted-foreground">
                          Deixe vazio para gerar para toda a escola
                        </p>
                      )}
                    </>
                  )}
                </div>

                {selectedSerie && (
                  <div className="space-y-2">
                    <Label htmlFor="turma">Turma (opcional)</Label>
                    {isLoadingTurmas ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <>
                        <div className="flex gap-2">
                          <Select 
                            value={selectedTurma} 
                            onValueChange={setSelectedTurma} 
                            disabled={!selectedSerie || turmas.length === 0}
                          >
                            <SelectTrigger id="turma" className="flex-1">
                              <SelectValue placeholder="Selecione a turma (opcional)" />
                            </SelectTrigger>
                            <SelectContent>
                              {turmas.map(turma => (
                                <SelectItem key={turma.id} value={turma.id}>
                                  {turma.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedTurma && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => setSelectedTurma('')}
                              title="Limpar seleção - Voltar para todas as turmas da série"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {noTurmasMessage && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {noTurmasMessage}
                          </p>
                        )}
                        {!selectedTurma && selectedSerie && turmas.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Deixe vazio para gerar para todas as turmas da série
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Feedback visual do escopo */}
                {selectedSchool && (
                  <div className="md:col-span-2">
                    <Alert>
                      <AlertDescription>
                        {!selectedSerie && !selectedTurma && (
                          <>📚 Gerando cartões para <strong>toda a escola</strong> {schools.find(s => s.id === selectedSchool)?.name}</>
                        )}
                        {selectedSerie && !selectedTurma && (
                          <>📖 Gerando cartões para <strong>todas as turmas da série</strong> {series.find(s => s.id === selectedSerie)?.name}</>
                        )}
                        {selectedTurma && (
                          <>✏️ Gerando cartões para a <strong>turma</strong> {turmas.find(t => t.id === selectedTurma)?.name}</>
                        )}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

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
                <div className="space-y-4 pl-6 border-l-2 border-blue-200 mt-4">
                  <div className="space-y-2">
                    <Label>Disciplinas e Distribuição de Questões</Label>
                    <p className="text-xs text-muted-foreground">
                      Configure quantas questões cada disciplina terá. Máximo de 4 disciplinas, 26 questões por disciplina.
                    </p>
                  </div>
                  
                  {/* Lista de blocos configurados */}
                  {blocksByDiscipline.length > 0 && (
                    <div className="space-y-3">
                      {blocksByDiscipline.map((block) => (
                        <Card key={block.block_id} className="p-4">
                          <div className="flex items-center gap-4">
                            <Badge variant="outline" className="shrink-0">Bloco {block.block_id}</Badge>
                            <div className="flex-1 grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs text-muted-foreground">Disciplina</Label>
                                <p className="font-medium text-sm">{block.subject_name}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Questões</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  max="26"
                                  value={block.questions_count}
                                  onChange={(e) => handleUpdateBlockQuestions(block.block_id, parseInt(e.target.value) || 1)}
                                  className="h-8"
                                />
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground shrink-0">
                              Q{block.start_question}-{block.end_question}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveDisciplineBlock(block.block_id)}
                              className="shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                  
                  {/* Botão para adicionar disciplina */}
                  {blocksByDiscipline.length < 4 && totalQuestoes > 0 && (
                    <div>
                      {isLoadingDisciplines ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Carregando disciplinas...
                        </div>
                      ) : disciplines.length > 0 ? (
                        <Select
                          onValueChange={(value) => {
                            const discipline = disciplines.find(d => d.id === value);
                            if (discipline) {
                              handleAddDisciplineBlock(discipline.id, discipline.name);
                            }
                          }}
                          value=""
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="+ Adicionar Disciplina" />
                          </SelectTrigger>
                          <SelectContent>
                            {disciplines
                              .filter(d => !blocksByDiscipline.some(b => b.subject_id === d.id))
                              .map(discipline => (
                                <SelectItem key={discipline.id} value={discipline.id}>
                                  {discipline.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Nenhuma disciplina disponível para adicionar.
                        </p>
                      )}
                    </div>
                  )}

                  {totalQuestoes === 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Defina a quantidade total de questões antes de configurar os blocos por disciplina.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {/* Resumo e validação */}
                  {totalQuestoes > 0 && (
                    <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total de questões:</span>
                        <span className={`font-semibold ${
                          blocksByDiscipline.reduce((sum, b) => sum + b.questions_count, 0) === totalQuestoes 
                            ? 'text-green-600' 
                            : 'text-orange-600'
                        }`}>
                          {blocksByDiscipline.reduce((sum, b) => sum + b.questions_count, 0)} / {totalQuestoes}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Blocos configurados:</span>
                        <span className="font-semibold">{blocksByDiscipline.length} / 4</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Avisos de validação */}
                  {totalQuestoes > 0 && (() => {
                    const validation = validateDisciplineBlocks();
                    if (validation.warnings.length > 0) {
                      return (
                        <Alert variant={validation.isValid ? "default" : "destructive"}>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="space-y-2">
                              {validation.warnings.map((warning, index) => (
                                <p key={index} className="text-sm">{warning}</p>
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
                
                {/* Mostrar escopo de geração */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Escopo</Label>
                  <p className="font-medium">
                    {selectedTurma && `Turma: ${series.find(s => s.id === selectedSerie)?.name} - ${turmas.find(t => t.id === selectedTurma)?.name}`}
                    {!selectedTurma && selectedSerie && `Série: ${series.find(s => s.id === selectedSerie)?.name} (todas as turmas)`}
                    {!selectedTurma && !selectedSerie && 'Escola inteira (todas as turmas)'}
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
                    {selectedTurma && 'Uma turma'}
                    {!selectedTurma && selectedSerie && 'Série completa'}
                    {!selectedTurma && !selectedSerie && 'Escola inteira'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedTurma && 'Os cartões resposta serão gerados automaticamente para todos os alunos da turma selecionada.'}
                  {!selectedTurma && selectedSerie && 'Os cartões resposta serão gerados automaticamente para todas as turmas da série selecionada. Será gerado 1 PDF por turma.'}
                  {!selectedTurma && !selectedSerie && 'Os cartões resposta serão gerados automaticamente para todas as turmas da escola. Será gerado 1 PDF por turma, organizados em pastas por série.'}
                  {' '}Após a conclusão, você poderá acessá-los na aba "Cartões Gerados".
                </p>
              </div>

              {isGenerating && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>⏳ Gerando cartões PDF em background...</span>
                      <span>{generationProgress}%</span>
                    </div>
                    <Progress value={generationProgress} />
                    <p className="text-xs text-muted-foreground text-center">
                      Isso pode levar vários minutos (~40s por aluno). Não feche esta página.
                    </p>
                  </div>
                  
                  {/* Mostrar progresso por turma para batches */}
                  {batchClasses.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Turmas Processadas</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-48">
                          <ul className="space-y-2">
                            {batchClasses.map((cls, index) => (
                              <li key={cls.gabarito_id || index} className="flex items-center gap-2 text-sm">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span>{cls.grade_name} - {cls.class_name}</span>
                                {cls.total_students && (
                                  <Badge variant="secondary" className="ml-auto">
                                    {cls.total_students} alunos
                                  </Badge>
                                )}
                              </li>
                            ))}
                          </ul>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              <Button
                onClick={handleGenerateCards}
                disabled={isGenerating}
                size="lg"
                className="w-full"
              >
                <Download className="h-5 w-5 mr-2" />
                {isGenerating ? 'Gerando cartões...' : 'Gerar Cartões no Servidor'}
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
                                {gabarito.classes_count != null && gabarito.students_count != null ? (
                                  <>
                                    <Badge variant="secondary" className="flex items-center gap-1">
                                      <Users className="h-3 w-3" />
                                      {gabarito.classes_count} turmas
                                    </Badge>
                                    <Badge variant="secondary">
                                      {gabarito.students_count} alunos
                                    </Badge>
                                  </>
                                ) : (
                                  <>
                                    {gabarito.class_name != null && (
                                      <Badge variant="secondary" className="flex items-center gap-1">
                                        <Users className="h-3 w-3" />
                                        {gabarito.class_name}
                                      </Badge>
                                    )}
                                    {gabarito.grade_name != null && (
                                      <Badge variant="secondary">
                                        {gabarito.grade_name}
                                      </Badge>
                                    )}
                                  </>
                                )}
                                {gabarito.num_questions != null && (
                                  <Badge variant="outline">
                                    {gabarito.num_questions} questões
                                  </Badge>
                                )}
                                {gabarito.use_blocks && (
                                  <Badge variant="outline" className="border-purple-500 text-purple-700">
                                    Com blocos
                                  </Badge>
                                )}
                                {gabarito.is_batch && (
                                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
                                    📦 Batch
                                  </Badge>
                                )}
                                {gabarito.generation_status != null && (
                                  <Badge variant="outline">
                                    {gabarito.generation_status === 'completed' ? 'Concluído' : gabarito.generation_status}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              {gabarito.municipality != null && gabarito.state != null && (
                                <div>
                                  <p className="text-muted-foreground">Localização</p>
                                  <p className="font-medium">{gabarito.municipality}, {gabarito.state}</p>
                                </div>
                              )}
                              {gabarito.creator_name != null && (
                                <div>
                                  <p className="text-muted-foreground">Criado por</p>
                                  <p className="font-medium">{gabarito.creator_name}</p>
                                </div>
                              )}
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
                              {gabarito.institution != null && (
                                <div>
                                  <p className="text-muted-foreground">Instituição</p>
                                  <p className="font-medium">{gabarito.institution}</p>
                                </div>
                              )}
                            </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2 min-w-[140px]">
                            {gabarito.is_batch && gabarito.batch_id ? (
                              <Button
                                onClick={() => handleDownloadBatch(gabarito.batch_id!)}
                                disabled={downloadingGabaritoId === gabarito.batch_id || isDeleting || gabarito.can_download === false}
                                className="w-full bg-purple-600 hover:bg-purple-700"
                              >
                                {downloadingGabaritoId === gabarito.batch_id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Preparando...
                                  </>
                                ) : (
                                  <>
                                    <Download className="h-4 w-4 mr-2" />
                                    Baixar ZIP Completo
                                  </>
                                )}
                              </Button>
                            ) : (
                              <Button
                                onClick={() => handleDownloadGabarito(gabarito.id)}
                                disabled={downloadingGabaritoId === gabarito.id || isDeleting || gabarito.can_download === false}
                                className="w-full"
                              >
                                {downloadingGabaritoId === gabarito.id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Preparando download...
                                  </>
                                ) : (
                                  <>
                                    <Download className="h-4 w-4 mr-2" />
                                    Baixar ZIP
                                  </>
                                )}
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              onClick={() => handleViewResults(gabarito.id)}
                              disabled={isDeleting || downloadingGabaritoId === gabarito.id}
                              className="w-full"
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Visualizar Resultados
                            </Button>
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


