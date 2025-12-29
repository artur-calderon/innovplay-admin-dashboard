import { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { api } from '@/lib/api';
import { AnswerSheetConfig, StudentAnswerSheet, School as SchoolType, Serie, Turma, Estado, Municipio } from '@/types/answer-sheet';

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
      
      // Buscar todas as escolas do município
      const response = await api.get(`/school/city/${selectedMunicipio}`);
      const allSchoolsData = response.data?.schools || response.data || [];
      
      // Se não houver série selecionada, mostrar todas as escolas
      if (!selectedSerie) {
        setSchools(allSchoolsData);
        if (allSchoolsData.length === 0) {
          setNoSchoolsMessage('Nenhuma escola encontrada para este município.');
        }
        return;
      }
      
      // Se houver série selecionada, filtrar apenas escolas que têm turmas para essa série
      const schoolsWithTurmas: SchoolType[] = [];
      
      for (const school of allSchoolsData) {
        try {
          // Buscar turmas da escola
          const turmasResponse = await api.get(`/classes/school/${school.id}`);
          const turmasData = turmasResponse.data || [];
          
          // Verificar se há turmas para a série selecionada
          const hasTurmasForSerie = turmasData.some((turma: { grade_id?: string; grade?: { id?: string } }) => {
            const gradeId = turma.grade_id || turma.grade?.id;
            return gradeId === selectedSerie;
          });
          
          if (hasTurmasForSerie) {
            schoolsWithTurmas.push(school);
          }
        } catch (error) {
          // Se der erro ao buscar turmas de uma escola, ignorar essa escola
          console.warn(`Erro ao buscar turmas da escola ${school.id}:`, error);
        }
      }
      
      setSchools(schoolsWithTurmas);
      
      if (schoolsWithTurmas.length === 0) {
        setNoSchoolsMessage('Nenhuma escola encontrada com turmas cadastradas para a série selecionada.');
      }
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
  };

  const handleChangeRespostaQuestao = (numeroQuestao: number, alternativa: string) => {
    const alternativaUpper = alternativa.toUpperCase();
    if (!['A', 'B', 'C', 'D'].includes(alternativaUpper)) {
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
      <Tabs defaultValue="generate" className="space-y-6">
        <TabsList>
          <TabsTrigger value="generate">Gerar Cartões</TabsTrigger>
          <TabsTrigger value="correct">Corrigir Cartões</TabsTrigger>
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

          {/* Card 3: Questões e Gabarito */}
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
                      Selecione a alternativa correta (A, B, C ou D) para cada número de questão.
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
                          <div className="flex gap-2">
                            {['A', 'B', 'C', 'D'].map((alternativa) => {
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
      </Tabs>
    </div>
  );
}


