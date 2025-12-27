import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { 
  ChevronRight, 
  ChevronLeft, 
  Download, 
  CheckCircle, 
  AlertCircle,
  Users,
  School,
} from 'lucide-react';
import { api } from '@/lib/api';
import { AnswerSheetConfig, StudentAnswerSheet, School as SchoolType, Serie, Turma, Student, Estado, Municipio } from '@/types/answer-sheet';

type Step = 1 | 2 | 3;

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

  // Estados da Etapa 2: Seleção de Alunos
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  // Estados da Etapa 3: Prévia e Download
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

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


  const fetchStudents = async () => {
    if (!selectedSchool || !selectedTurma) {
      setStudents([]);
      setSelectedStudents(new Set());
      return;
    }
    
    try {
      setIsLoadingStudents(true);
      // Verificar se a turma pertence à escola selecionada
      const turmaData = turmas.find(t => t.id === selectedTurma);
      if (turmaData && turmaData.escola_id && turmaData.escola_id !== selectedSchool) {
        console.warn('Turma não pertence à escola selecionada');
        setStudents([]);
        setSelectedStudents(new Set());
        return;
      }
      
      // Usar rota que filtra por escola e turma para garantir que apenas alunos da escola selecionada apareçam
      const response = await api.get(`/students/school/${selectedSchool}/class/${selectedTurma}`);
      
      // A resposta pode vir como array direto ou dentro de um objeto
      let studentsData: Student[] = [];
      if (Array.isArray(response.data)) {
        studentsData = response.data;
      } else if (response.data?.students && Array.isArray(response.data.students)) {
        studentsData = response.data.students;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        studentsData = response.data.data;
      }
      
      // Garantir que todos os alunos pertencem à escola selecionada (filtro adicional de segurança)
      const filteredStudents = studentsData.filter((s: Student & { school_id?: string; class_id?: string }) => {
        // Se o aluno tiver school_id, verificar se corresponde
        if (s.school_id && s.school_id !== selectedSchool) {
          return false;
        }
        // Se o aluno tiver class_id, verificar se corresponde à turma selecionada
        if (s.class_id && s.class_id !== selectedTurma) {
          return false;
        }
        return true;
      });
      
      setStudents(filteredStudents);
      // Marcar todos como presentes inicialmente
      setSelectedStudents(new Set(filteredStudents.map((s: Student) => s.id)));
    } catch (error) {
      console.error('Erro ao carregar alunos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os alunos da turma selecionada.',
        variant: 'destructive',
      });
      setStudents([]);
      setSelectedStudents(new Set());
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const isStep1Valid = () => {
    const hasBaseInfo =
      selectedEstado &&
      selectedMunicipio &&
      selectedCurso &&
      selectedSerie &&
      selectedSchool &&
      selectedTurma &&
      provaTitulo;

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

    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 1 && isStep1Valid()) {
      fetchStudents();
      setCurrentStep(2);
    } else if (currentStep === 2 && selectedStudents.size > 0) {
      setCurrentStep(3);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  const toggleStudent = (studentId: string) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const toggleAllStudents = () => {
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(students.map(s => s.id)));
    }
  };

  const invertSelection = () => {
    const newSet = new Set<string>();
    students.forEach(student => {
      if (!selectedStudents.has(student.id)) {
        newSet.add(student.id);
      }
    });
    setSelectedStudents(newSet);
  };


  const getConfig = (): AnswerSheetConfig => {
    const estadoData = estados.find(e => e.name === selectedEstado);
    const municipioData = municipios.find(m => m.id === selectedMunicipio);
    const schoolData = schools.find(s => s.id === selectedSchool);
    const serieData = series.find(s => s.id === selectedSerie);
    const turmaData = turmas.find(t => t.id === selectedTurma);

    return {
      estado: selectedEstado || '',
      estado_sigla: estadoData?.id || '',
      municipio: municipioData?.name || '',
      municipio_id: selectedMunicipio,
      escola_id: selectedSchool,
      escola_nome: schoolData?.name || '',
      serie_id: selectedSerie,
      serie_nome: serieData?.name || '',
      turma_id: selectedTurma,
      turma_nome: turmaData?.name || '',
      prova_titulo: provaTitulo,
      total_questoes: totalQuestoes,
      gabarito: gabaritoManual,
      data_geracao: new Date().toISOString(),
      questoes_detalhes: []
    };
  };

  const handleGenerateCards = async () => {
    try {
      setIsGenerating(true);
      setGenerationProgress(0);

      const config = getConfig();
      const selectedStudentsData: StudentAnswerSheet[] = students
        .filter(s => selectedStudents.has(s.id))
        .map(s => ({
          id: s.id,
          name: s.name,
          email: s.email,
          class_name: s.class_name || config.turma_nome,
          presente: true
        }));

      // Enviar dados para o backend gerar os cartões
      const response = await api.post('/answer-sheets/generate', {
        config,
        students: selectedStudentsData
      });

      // O backend retorna a URL do arquivo ZIP ou faz o download direto
      if (response.data.download_url) {
        // Se o backend retornar URL, fazer download
        window.open(response.data.download_url, '_blank');
      } else if (response.data.file_url) {
        // Alternativa: baixar via URL
        const link = document.createElement('a');
        link.href = response.data.file_url;
        link.download = `cartoes_resposta_${config.turma_nome}_${new Date().toISOString().slice(0, 10)}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      toast({
        title: 'Sucesso!',
        description: `${selectedStudentsData.length} cartões resposta estão sendo gerados pelo servidor.`,
      });
    } catch (error) {
      console.error('Erro ao gerar cartões:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar os cartões resposta. Tente novamente.',
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

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Gerador de Cartões Resposta</h1>
        <p className="text-muted-foreground">
          Configure e gere cartões resposta personalizados para provas físicas
        </p>
      </div>

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
          <span className="font-medium hidden sm:inline">Selecionar Alunos</span>
        </div>
        <ChevronRight className="text-gray-400" />
        <div className={`flex items-center gap-2 ${currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
            currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}>
            3
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

          <div className="flex justify-end">
            <Button
              onClick={handleNextStep}
              disabled={!isStep1Valid()}
              size="lg"
            >
              Próximo: Selecionar Alunos
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Etapa 2: Seleção de Alunos */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Selecionar Alunos Presentes
              </CardTitle>
              <CardDescription>
                Marque os alunos que estão presentes e receberão o cartão resposta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingStudents ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2 pb-4 border-b">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleAllStudents}
                    >
                      {selectedStudents.size === students.length ? 'Desmarcar Todos' : 'Marcar Todos como Presentes'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={invertSelection}
                    >
                      Inverter Seleção
                    </Button>
                    <Badge variant="secondary" className="ml-auto">
                      {selectedStudents.size} de {students.length} selecionados
                    </Badge>
                  </div>

                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {students.map(student => {
                      const isSelected = selectedStudents.has(student.id);
                      return (
                        <div
                          key={student.id}
                          className={`flex items-center justify-between p-4 border rounded-lg transition-colors hover:bg-muted/50 ${
                            isSelected 
                              ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' 
                              : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleStudent(student.id)}
                              id={`student-${student.id}`}
                            />
                            <label
                              htmlFor={`student-${student.id}`}
                              className="flex-1 cursor-pointer"
                            >
                              <div className="font-medium text-foreground">{student.name}</div>
                              {student.class_name && (
                                <div className="text-sm text-muted-foreground">{student.class_name}</div>
                              )}
                            </label>
                            {isSelected ? (
                              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePreviousStep}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Button
              onClick={handleNextStep}
              disabled={selectedStudents.size === 0}
              size="lg"
            >
              Próximo: Gerar Cartões
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Etapa 3: Gerar e Download */}
      {currentStep === 3 && (
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
                  <Label className="text-lg font-semibold">Total de Cartões</Label>
                  <Badge variant="default" className="text-lg px-4 py-2">
                    {selectedStudents.size} cartões
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Os cartões resposta serão gerados pelo servidor e disponibilizados para download.
                </p>
              </div>

              {isGenerating && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Enviando dados para o servidor...</span>
                    <span>Processando...</span>
                  </div>
                  <Progress value={100} className="animate-pulse" />
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
    </div>
  );
}


