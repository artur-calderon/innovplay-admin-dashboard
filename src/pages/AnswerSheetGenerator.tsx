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
  Eye,
  CheckCircle, 
  AlertCircle,
  Users,
  FileText,
  School,
  Plus,
  Trash2,
  Book
} from 'lucide-react';
import { api } from '@/lib/api';
import { AnswerSheetConfig, StudentAnswerSheet, School as SchoolType, Serie, Turma, Student, Estado, Municipio } from '@/types/answer-sheet';
import { Question, Subject } from '@/components/evaluations/types';
import { QuestionBank } from '@/components/evaluations/QuestionBank';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import QuestionPreview from '@/components/evaluations/questions/QuestionPreview';

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
  
  // Estados para seleção de questões
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [selectedSubjectForQuestion, setSelectedSubjectForQuestion] = useState<string>("");
  const [selectedDisciplinas, setSelectedDisciplinas] = useState<Subject[]>([]);
  const [availableDisciplinas, setAvailableDisciplinas] = useState<Subject[]>([]);
  const [isLoadingDisciplinas, setIsLoadingDisciplinas] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [showQuestionPreview, setShowQuestionPreview] = useState(false);

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
        
        const [estadosRes, cursosRes, disciplinasRes] = await Promise.all([
          api.get('/city/states'),
          api.get('/education_stages'),
          api.get('/subjects')
        ]);
        
        setEstados(estadosRes.data || []);
        setCursos(cursosRes.data || []);
        setAvailableDisciplinas(disciplinasRes.data || []);
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
    } else {
      setMunicipios([]);
      setSelectedMunicipio('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEstado]);

  // Carregar séries quando curso for selecionado
  useEffect(() => {
    if (selectedCurso) {
      fetchSeries();
    } else {
      setSeries([]);
      setSelectedSerie('');
      setGradeName('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCurso]);

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
      // Se tiver série selecionada, busca por série, senão por município
      const response = selectedSerie 
        ? await api.get(`/school/by-grade/${selectedSerie}`)
        : await api.get(`/school/city/${selectedMunicipio}`);
      
      const schoolsData = response.data?.schools || response.data || [];
      setSchools(schoolsData);
    } catch (error) {
      console.error('Erro ao carregar escolas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as escolas.',
        variant: 'destructive',
      });
      setSchools([]);
    } finally {
      setIsLoadingSchools(false);
    }
  };

  const fetchSeries = async () => {
    if (!selectedCurso) return;
    
    try {
      setIsLoadingSeries(true);
      const response = await api.get(`/grades/education-stage/${selectedCurso}`);
      const seriesData = response.data || [];
      setSeries(seriesData);
    } catch (error) {
      console.error('Erro ao carregar séries:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as séries.',
        variant: 'destructive',
      });
      setSeries([]);
    } finally {
      setIsLoadingSeries(false);
    }
  };

  const fetchTurmas = async () => {
    if (!selectedSchool) return;
    
    try {
      setIsLoadingTurmas(true);
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
    } catch (error) {
      console.error('Erro ao carregar turmas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as turmas.',
        variant: 'destructive',
      });
      setTurmas([]);
    } finally {
      setIsLoadingTurmas(false);
    }
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

  const handleQuestionSelected = (question: Question) => {
    // Verificar se a questão já foi adicionada
    const isDuplicate = selectedQuestions.some(q => q.id === question.id);
    
    if (isDuplicate) {
      toast({
        title: "Questão já adicionada",
        description: "Esta questão já está na lista.",
        variant: "destructive",
      });
      return;
    }

    setSelectedQuestions(prev => [...prev, question]);
    toast({
      title: "Questão adicionada",
      description: `Total: ${selectedQuestions.length + 1} questões`
    });
  };

  const handleRemoveQuestion = (questionId: string) => {
    setSelectedQuestions(prev => prev.filter(q => q.id !== questionId));
    toast({
      title: "Questão removida",
      description: `Total: ${selectedQuestions.length - 1} questões`
    });
  };

  const getQuestionsForSubject = (subjectId: string) => {
    return selectedQuestions.filter(q => {
      const questionWithSubjectId = q as { subjectId?: string; subject?: { id?: string }; subject_id?: string };
      return questionWithSubjectId.subjectId === subjectId || 
             questionWithSubjectId.subject?.id === subjectId ||
             questionWithSubjectId.subject_id === subjectId;
    });
  };

  const handleViewQuestion = (question: Question) => {
    setPreviewQuestion(question);
    setShowQuestionPreview(true);
  };

  const toggleDisciplina = (disciplina: Subject) => {
    setSelectedDisciplinas(prev => {
      const exists = prev.find(d => d.id === disciplina.id);
      if (exists) {
        return prev.filter(d => d.id !== disciplina.id);
      }
      return [...prev, disciplina];
    });
  };

  const isStep1Valid = () => {
    return selectedEstado &&
           selectedMunicipio &&
           selectedCurso &&
           selectedSerie &&
           selectedSchool && 
           selectedTurma && 
           provaTitulo && 
           selectedDisciplinas.length > 0 &&
           selectedQuestions.length > 0;
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

    // Gerar gabarito automaticamente das questões
    const gabaritoAuto: Record<number, 'A' | 'B' | 'C' | 'D'> = {};
    
    selectedQuestions.forEach((question, index) => {
      const correctOption = question.options?.find(opt => opt.isCorrect);
      if (correctOption) {
        // Pegar letra da alternativa correta
        const optionIndex = question.options?.indexOf(correctOption) || 0;
        const letter = correctOption.id || String.fromCharCode(65 + optionIndex);
        gabaritoAuto[index + 1] = letter.charAt(0).toUpperCase() as 'A' | 'B' | 'C' | 'D';
      }
    });

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
      total_questoes: selectedQuestions.length,
      gabarito: gabaritoAuto,
      data_geracao: new Date().toISOString(),
      questoes_detalhes: selectedQuestions.map((q, i) => ({
        numero: i + 1,
        id: q.id,
        disciplina: q.subject?.name || selectedDisciplinas.find(d => d.id === q.subjectId)?.name || ''
      }))
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
                    <Select value={selectedSerie} onValueChange={setSelectedSerie} disabled={!selectedCurso}>
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
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="school">Escola *</Label>
                  {isLoadingSchools ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
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
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="turma">Turma *</Label>
                  {isLoadingTurmas ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select value={selectedTurma} onValueChange={setSelectedTurma} disabled={!selectedSchool}>
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Book className="h-5 w-5" />
                Disciplinas
              </CardTitle>
              <CardDescription>
                Selecione as disciplinas para a prova
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingDisciplinas ? (
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {availableDisciplinas.map(disciplina => {
                    const isSelected = selectedDisciplinas.some(d => d.id === disciplina.id);
                    return (
                      <div
                        key={disciplina.id}
                        className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                          isSelected 
                            ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-500 dark:border-blue-400 shadow-sm' 
                            : 'hover:bg-muted dark:hover:bg-muted/50 border-border hover:border-primary/50 hover:shadow-sm'
                        }`}
                        onClick={() => toggleDisciplina(disciplina)}
                      >
                        <Checkbox
                          id={`disc-${disciplina.id}`}
                          checked={isSelected}
                          onCheckedChange={() => toggleDisciplina(disciplina)}
                        />
                        <Label
                          htmlFor={`disc-${disciplina.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          {disciplina.name}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              )}
              {selectedDisciplinas.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {selectedDisciplinas.map(disc => (
                    <Badge key={disc.id} variant="default">
                      {disc.name}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Questões por disciplina */}
          <div className="space-y-6">
            {selectedDisciplinas.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Questões
                  </CardTitle>
                  <CardDescription>
                    Selecione disciplinas e questões do banco
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma disciplina selecionada</p>
                    <p className="text-sm">Selecione as disciplinas acima para começar</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              selectedDisciplinas.map((subject) => {
                const subjectQuestions = getQuestionsForSubject(subject.id);
                
                return (
                  <Card key={subject.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Book className="h-5 w-5" />
                          <h3 className="text-lg font-medium">{subject.name}</h3>
                          <Badge variant="outline">
                            {subjectQuestions.length} questão(ões)
                          </Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedSubjectForQuestion(subject.id);
                            setShowQuestionBank(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Banco de Questões
                        </Button>
                      </div>

                      {/* Lista de questões */}
                      <div className="space-y-3">
                        {subjectQuestions.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Book className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>Nenhuma questão adicionada para {subject.name}</p>
                            <p className="text-sm">Use o botão acima para adicionar questões</p>
                          </div>
                        ) : (
                          subjectQuestions.map((question, index) => {
                            // Calcular número global da questão
                            const globalIndex = selectedQuestions.findIndex(q => q.id === question.id) + 1;
                            
                            return (
                              <div
                                key={question.id || index}
                                className="flex items-center justify-between p-3 border rounded-lg bg-muted"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="secondary">#{globalIndex}</Badge>
                                    <span className="text-sm font-medium">
                                      {question.title || `Questão ${globalIndex}`}
                                    </span>
                                  </div>
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {question.text || "Sem texto disponível"}
                                  </p>
                                  {question.options && question.options.length > 0 && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {question.options.length} alternativas
                                    </p>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleViewQuestion(question)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveQuestion(question.id || "")}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

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
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Questões</Label>
                  <p className="font-medium">{selectedQuestions.length} questões</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Disciplinas</Label>
                  <p className="font-medium">{selectedDisciplinas.map(d => d.name).join(', ')}</p>
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


      {/* Modal do Banco de Questões */}
      <QuestionBank
        open={showQuestionBank}
        subjectId={selectedSubjectForQuestion || selectedDisciplinas[0]?.id || null}
        onQuestionSelected={handleQuestionSelected}
        onClose={() => {
          setShowQuestionBank(false);
          setSelectedSubjectForQuestion("");
        }}
        gradeId={selectedSerie}
        gradeName={gradeName}
        subjects={selectedDisciplinas}
        selectedSubjectId={selectedSubjectForQuestion || selectedDisciplinas[0]?.id}
      />

      {/* Modal de Prévia de Questão */}
      <Dialog open={showQuestionPreview} onOpenChange={setShowQuestionPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Visualizar Questão</DialogTitle>
            <DialogDescription>
              Prévia completa da questão com alternativas
            </DialogDescription>
          </DialogHeader>
          {previewQuestion && (
            <QuestionPreview
              question={previewQuestion}
              onClose={() => setShowQuestionPreview(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


