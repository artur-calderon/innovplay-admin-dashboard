import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, School, GraduationCap, BookOpen, X, Check, ChevronsUpDown, MapPin, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { CreatePlayTvVideoDTO, PlayTvSchool, PlayTvGrade, PlayTvSubject } from '@/types/playtv';
import { useAuth } from '@/context/authContext';

interface CreatePlayTvVideoFormProps {
  onSuccess: () => void;
  userRole: string;
  userMunicipioId?: string;
  userEscolaId?: string;
  userEstadoId?: string;
  userTurmas?: Array<{ class_id: string; school_id: string; grade_id: string; subject_id?: string }>;
}

export function CreatePlayTvVideoForm({
  onSuccess,
  userRole,
  userMunicipioId,
  userEscolaId,
  userEstadoId,
  userTurmas,
}: CreatePlayTvVideoFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingStates, setIsLoadingStates] = useState(false);
  const [isLoadingMunicipalities, setIsLoadingMunicipalities] = useState(false);
  const [isLoadingSchools, setIsLoadingSchools] = useState(false);
  const [isLoadingGrades, setIsLoadingGrades] = useState(false);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);

  // Estados do formulário
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('');
  const [selectedSchools, setSelectedSchools] = useState<PlayTvSchool[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');

  // Estados dos popovers
  const [openStateCombo, setOpenStateCombo] = useState(false);
  const [openMunicipalityCombo, setOpenMunicipalityCombo] = useState(false);
  const [openSchoolCombo, setOpenSchoolCombo] = useState(false);
  const [openGradeCombo, setOpenGradeCombo] = useState(false);
  const [openSubjectCombo, setOpenSubjectCombo] = useState(false);

  // Listas de opções
  const [states, setStates] = useState<Array<{ id: string; nome: string }>>([]);
  const [municipalities, setMunicipalities] = useState<Array<{ id: string; nome: string }>>([]);
  const [schools, setSchools] = useState<PlayTvSchool[]>([]);
  const [filteredSchools, setFilteredSchools] = useState<PlayTvSchool[]>([]);
  const [grades, setGrades] = useState<PlayTvGrade[]>([]);
  const [subjects, setSubjects] = useState<PlayTvSubject[]>([]);

  // Carregar estados e disciplinas ao montar componente
  useEffect(() => {
    loadStates();
    loadSubjects();
    // Auto-selecionar estado para tecadmin
    if (userRole === 'tecadm' && userEstadoId) {
      setSelectedState(userEstadoId);
    }
  }, [userRole, userEstadoId]);

  // Auto-selecionar município para tecadm quando municípios carregarem
  useEffect(() => {
    if (userRole === 'tecadm' && userMunicipioId && municipalities.length > 0 && !selectedMunicipality) {
      const userMunicipality = municipalities.find(m => m.id === userMunicipioId);
      if (userMunicipality) {
        setSelectedMunicipality(userMunicipioId);
      }
    }
  }, [municipalities, userRole, userMunicipioId, selectedMunicipality]);

  // Carregar municípios quando estado for selecionado
  useEffect(() => {
    if (selectedState) {
      loadMunicipalities(selectedState);
      // Resetar município e escola quando estado mudar (exceto se for tecadm com município pré-definido)
      if (!(userRole === 'tecadm' && userMunicipioId)) {
        setSelectedMunicipality('');
        setSelectedSchools([]);
        setFilteredSchools([]);
        setGrades([]);
        setSelectedGrade('');
      }
    } else {
      setMunicipalities([]);
      if (!(userRole === 'tecadm' && userMunicipioId)) {
        setSelectedMunicipality('');
      }
    }
  }, [selectedState, userRole, userMunicipioId]);

  // Carregar escolas quando município for selecionado
  useEffect(() => {
    if (selectedMunicipality) {
      loadSchools();
      // Resetar escola quando município mudar
      setSelectedSchools([]);
      setGrades([]);
      setSelectedGrade('');
    } else {
      setSchools([]);
      setFilteredSchools([]);
      setSelectedSchools([]);
    }
  }, [selectedMunicipality]);

  // Filtrar escolas baseado no município selecionado ou role do usuário
  useEffect(() => {
    if (userRole === 'professor' && userTurmas && userTurmas.length > 0) {
      // Professor vê apenas escolas das suas turmas
      const allowedSchoolIds = new Set(userTurmas.map(t => t.school_id));
      const filtered = schools.filter(school => allowedSchoolIds.has(school.id));
      setFilteredSchools(filtered);
      
      // Auto-selecionar escolas das turmas do professor
      if (filtered.length > 0 && selectedSchools.length === 0) {
        const uniqueSchools = Array.from(
          new Map(filtered.map(s => [s.id, s])).values()
        );
        setSelectedSchools(uniqueSchools);
      }
    } else if (selectedMunicipality) {
      // Filtrar escolas por município selecionado
      const filtered = schools.filter(school => school.city_id === selectedMunicipality);
      setFilteredSchools(filtered);
    } else if (userRole === 'admin') {
      // Admin vê todas as escolas se não houver município selecionado
      setFilteredSchools(schools);
    } else if (userRole === 'tecadm' && userMunicipioId && schools.length > 0) {
      // Técnico administrativo vê apenas escolas do seu município
      const filtered = schools.filter(school => school.city_id === userMunicipioId);
      setFilteredSchools(filtered);
    } else if ((userRole === 'diretor' || userRole === 'coordenador') && userEscolaId && schools.length > 0) {
      // Diretor/Coordenador vê apenas sua escola
      const filtered = schools.filter(school => school.id === userEscolaId);
      setFilteredSchools(filtered);
      // Auto-selecionar a escola do usuário
      if (filtered.length > 0 && selectedSchools.length === 0) {
        setSelectedSchools([filtered[0]]);
      }
    } else {
      setFilteredSchools(schools);
    }
  }, [schools, selectedMunicipality, userRole, userMunicipioId, userEscolaId, userTurmas, selectedSchools.length]);

  // Carregar séries quando escolas são selecionadas
  useEffect(() => {
    const loadGradesForProfessor = async () => {
      if (userRole === 'professor' && userTurmas && userTurmas.length > 0) {
        // Para professor, usar séries das suas turmas
        setIsLoadingGrades(true);
        try {
          const allowedGradeIds = new Set(userTurmas.map(t => t.grade_id));
          const allGradesResponse = await api.get('/grades/').catch(() => ({ data: [] }));
          const allGrades = allGradesResponse.data || [];
          const filteredGrades = allGrades.filter((grade: { id: string }) => 
            allowedGradeIds.has(grade.id)
          );
          setGrades(filteredGrades);
        } catch (error) {
          console.error('Erro ao carregar séries do professor:', error);
          setGrades([]);
        } finally {
          setIsLoadingGrades(false);
        }
      } else if (selectedSchools.length > 0) {
        loadGradesForSchools();
      } else {
        setGrades([]);
        setSelectedGrade('');
      }
    };

    loadGradesForProfessor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSchools, userRole, userTurmas]);

  const loadStates = async () => {
    setIsLoadingStates(true);
    try {
      const response = await api.get('/city/states');
      const allStates = response.data || [];
      
      // Normalizar estrutura dos dados (pode vir como 'nome' ou 'name')
      const normalizedStates = allStates.map((state: any) => ({
        id: state.id,
        nome: state.nome || state.name || '',
      }));
      
      // Para tecadmin, filtrar apenas seu estado
      if (userRole === 'tecadm' && userEstadoId) {
        setStates(normalizedStates.filter((state: { id: string }) => state.id === userEstadoId));
      } else {
        setStates(normalizedStates);
      }
    } catch (error) {
      console.error('Erro ao carregar estados:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a lista de estados',
        variant: 'destructive',
      });
      setStates([]);
    } finally {
      setIsLoadingStates(false);
    }
  };

  const loadMunicipalities = async (stateId: string) => {
    if (!stateId) return;
    
    setIsLoadingMunicipalities(true);
    try {
      const response = await api.get(`/city/municipalities/state/${stateId}`);
      const municipalitiesData = response.data || [];
      
      // Normalizar estrutura dos dados (pode vir como 'nome' ou 'name')
      const normalizedMunicipalities = municipalitiesData.map((municipality: any) => ({
        id: municipality.id,
        nome: municipality.nome || municipality.name || '',
      }));
      
      setMunicipalities(normalizedMunicipalities);
    } catch (error) {
      console.error('Erro ao carregar municípios:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a lista de municípios',
        variant: 'destructive',
      });
      setMunicipalities([]);
    } finally {
      setIsLoadingMunicipalities(false);
    }
  };

  const loadSchools = async () => {
    setIsLoadingSchools(true);
    try {
      const response = await api.get('/school/');
      const schoolsData = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      setSchools(schoolsData);
    } catch (error) {
      console.error('Erro ao carregar escolas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a lista de escolas',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingSchools(false);
    }
  };

  const loadGradesForSchools = async () => {
    if (selectedSchools.length === 0) return;

    setIsLoadingGrades(true);
    try {
      // Buscar turmas de todas as escolas selecionadas para obter as séries disponíveis
      const classPromises = selectedSchools.map(school =>
        api.get(`/classes/school/${school.id}`).catch(() => ({ data: [] }))
      );
      
      const classResponses = await Promise.all(classPromises);
      const gradeMap = new Map<string, PlayTvGrade>();

      classResponses.forEach(response => {
        const classesData = response.data || [];
        classesData.forEach((classItem: any) => {
          if (classItem.grade && classItem.grade.id && !gradeMap.has(classItem.grade.id)) {
            gradeMap.set(classItem.grade.id, {
              id: classItem.grade.id,
              name: classItem.grade.name || classItem.grade.nome || '',
            });
          }
        });
      });

      const allGrades = Array.from(gradeMap.values());
      setGrades(allGrades);
    } catch (error) {
      console.error('Erro ao carregar séries:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as séries das escolas selecionadas',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingGrades(false);
    }
  };

  const loadSubjects = async () => {
    setIsLoadingSubjects(true);
    try {
      const response = await api.get('/subjects');
      const allSubjects = response.data || [];
      
      // Para professor, filtrar apenas disciplinas das suas turmas (se disponível)
      if (userRole === 'professor' && userTurmas && userTurmas.length > 0) {
        const allowedSubjectIds = userTurmas
          .map(t => t.subject_id)
          .filter((id): id is string => id !== undefined);
        
        if (allowedSubjectIds.length > 0) {
          setSubjects(allSubjects.filter((subject: { id: string }) => 
            allowedSubjectIds.includes(subject.id)
          ));
        } else {
          // Se não tiver subject_id nas turmas, mostrar todas
          setSubjects(allSubjects);
        }
      } else {
        setSubjects(allSubjects);
      }
    } catch (error) {
      console.error('Erro ao carregar disciplinas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a lista de disciplinas',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingSubjects(false);
    }
  };

  const validateUrl = (videoUrl: string): boolean => {
    if (!videoUrl.trim()) return false;
    
    try {
      const url = new URL(videoUrl);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      // Pode ser um iframe HTML ou URL incompleta
      return videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') || videoUrl.includes('<iframe');
    }
  };

  const validateForm = (): boolean => {
    if (!url.trim()) {
      toast({
        title: 'Erro de validação',
        description: 'O link do vídeo é obrigatório',
        variant: 'destructive',
      });
      return false;
    }

    if (!validateUrl(url)) {
      toast({
        title: 'Erro de validação',
        description: 'Por favor, insira uma URL válida',
        variant: 'destructive',
      });
      return false;
    }

    if (!selectedState) {
      toast({
        title: 'Erro de validação',
        description: 'Selecione um estado',
        variant: 'destructive',
      });
      return false;
    }

    if (!selectedMunicipality) {
      toast({
        title: 'Erro de validação',
        description: 'Selecione um município',
        variant: 'destructive',
      });
      return false;
    }

    if (selectedSchools.length === 0) {
      toast({
        title: 'Erro de validação',
        description: 'Selecione pelo menos uma escola',
        variant: 'destructive',
      });
      return false;
    }

    if (!selectedGrade) {
      toast({
        title: 'Erro de validação',
        description: 'Selecione uma série',
        variant: 'destructive',
      });
      return false;
    }

    if (!selectedSubject) {
      toast({
        title: 'Erro de validação',
        description: 'Selecione uma disciplina',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleToggleSchool = (school: PlayTvSchool) => {
    const isSelected = selectedSchools.some(s => s.id === school.id);
    if (isSelected) {
      setSelectedSchools(selectedSchools.filter(s => s.id !== school.id));
    } else {
      setSelectedSchools([...selectedSchools, school]);
    }
  };

  const handleRemoveSchool = (schoolId: string) => {
    setSelectedSchools(selectedSchools.filter(s => s.id !== schoolId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const videoData: CreatePlayTvVideoDTO = {
        url: url.trim(),
        title: title.trim() || undefined,
        schools: selectedSchools.map(s => s.id),
        grade: selectedGrade,
        subject: selectedSubject,
      };

      await api.post('/play-tv/videos', videoData);

      toast({
        title: 'Vídeo cadastrado com sucesso!',
        description: 'O vídeo foi publicado e está disponível para os alunos.',
      });

      // Limpar formulário
      setUrl('');
      setTitle('');
      setSelectedSchools([]);
      setSelectedGrade('');
      setSelectedSubject('');

      onSuccess();
    } catch (error: any) {
      // Mensagem específica para quando o endpoint não existe
      let errorMessage = 'Não foi possível cadastrar o vídeo. Tente novamente.';
      const is404 = error.response?.status === 404 || error.status === 404;
      
      if (is404) {
        errorMessage = 'Endpoint ainda não implementado no backend. Aguarde a implementação da API.';
        // Não logar erro para endpoints que ainda não existem
      } else {
        console.error('Erro ao cadastrar vídeo:', error);
        if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
      }
      
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedGradeData = grades.find(g => g.id === selectedGrade);
  const selectedSubjectData = subjects.find(s => s.id === selectedSubject);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cadastrar Novo Vídeo</CardTitle>
        <CardDescription>
          Adicione um vídeo para os alunos assistirem
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Link do Vídeo */}
          <div className="space-y-2">
            <Label htmlFor="url">
              Link do Vídeo <span className="text-red-500">*</span>
            </Label>
            <Input
              id="url"
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Cole o link do vídeo (YouTube, Vimeo, etc.)
            </p>
          </div>

          {/* Título (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Título do Vídeo (opcional)
            </Label>
            <Input
              id="title"
              placeholder="Título do vídeo"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              {title.length}/100 caracteres
            </p>
          </div>

          {/* Seleção de Estado */}
          <div className="space-y-2">
            <Label>
              Estado <span className="text-red-500">*</span>
            </Label>
            <Popover open={openStateCombo} onOpenChange={setOpenStateCombo}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openStateCombo}
                  className="w-full justify-between"
                  disabled={isLoadingStates || (userRole === 'tecadm' && userEstadoId && states.length === 1)}
                >
                  {selectedState
                    ? states.find(state => state.id === selectedState)?.nome
                    : isLoadingStates
                    ? "Carregando estados..."
                    : "Selecione um estado..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0">
                <Command>
                  <CommandInput placeholder="Buscar estado..." />
                  <CommandEmpty>Nenhum estado encontrado.</CommandEmpty>
                  <CommandGroup className="max-h-[200px] overflow-auto">
                    {states.length > 0 ? (
                      states.map((state) => {
                        const stateName = state.nome || state.name || '';
                        return (
                          <CommandItem
                            key={state.id}
                            value={stateName}
                            onSelect={() => {
                              setSelectedState(state.id);
                              setOpenStateCombo(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedState === state.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span className="flex-1">{stateName}</span>
                          </CommandItem>
                        );
                      })
                    ) : (
                      <CommandItem disabled>
                        <span className="text-muted-foreground">Nenhum estado disponível</span>
                      </CommandItem>
                    )}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Seleção de Município */}
          <div className="space-y-2">
            <Label>
              Município <span className="text-red-500">*</span>
            </Label>
            <Popover open={openMunicipalityCombo} onOpenChange={setOpenMunicipalityCombo}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openMunicipalityCombo}
                  className="w-full justify-between"
                  disabled={isLoadingMunicipalities || !selectedState}
                >
                  {selectedMunicipality
                    ? municipalities.find(municipality => municipality.id === selectedMunicipality)?.nome
                    : !selectedState
                    ? "Selecione um estado primeiro..."
                    : isLoadingMunicipalities
                    ? "Carregando municípios..."
                    : "Selecione um município..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0">
                <Command>
                  <CommandInput placeholder="Buscar município..." />
                  <CommandEmpty>
                    {!selectedState
                      ? "Selecione um estado primeiro"
                      : "Nenhum município encontrado para o estado selecionado"}
                  </CommandEmpty>
                  <CommandGroup className="max-h-[200px] overflow-auto">
                    {municipalities.length > 0 ? (
                      municipalities.map((municipality) => {
                        const municipalityName = municipality.nome || municipality.name || '';
                        return (
                          <CommandItem
                            key={municipality.id}
                            value={municipalityName}
                            onSelect={() => {
                              setSelectedMunicipality(municipality.id);
                              setOpenMunicipalityCombo(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedMunicipality === municipality.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span className="flex-1">{municipalityName}</span>
                          </CommandItem>
                        );
                      })
                    ) : (
                      <CommandItem disabled>
                        <span className="text-muted-foreground">Nenhum município disponível</span>
                      </CommandItem>
                    )}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Seleção de Escolas */}
          <div className="space-y-2">
            <Label>
              Escolas <span className="text-red-500">*</span>
            </Label>
            <Popover open={openSchoolCombo} onOpenChange={setOpenSchoolCombo}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openSchoolCombo}
                  className="w-full justify-between"
                  disabled={isLoadingSchools || !selectedMunicipality}
                >
                  {selectedSchools.length > 0
                    ? `${selectedSchools.length} escola${selectedSchools.length !== 1 ? 's' : ''} selecionada${selectedSchools.length !== 1 ? 's' : ''}`
                    : !selectedMunicipality
                    ? "Selecione um município primeiro..."
                    : "Selecione as escolas..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0">
                <Command>
                  <CommandInput placeholder="Buscar escola..." />
                  <CommandEmpty>
                    {!selectedMunicipality
                      ? "Selecione um município primeiro"
                      : "Nenhuma escola encontrada para o município selecionado"}
                  </CommandEmpty>
                  <CommandGroup className="max-h-[200px] overflow-auto">
                    {filteredSchools.length > 0 ? (
                      filteredSchools.map((school) => {
                        const schoolName = school.name || '';
                        return (
                          <CommandItem
                            key={school.id}
                            value={schoolName}
                            onSelect={() => handleToggleSchool(school)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedSchools.some(s => s.id === school.id) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <School className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span className="flex-1">{schoolName}</span>
                          </CommandItem>
                        );
                      })
                    ) : (
                      <CommandItem disabled>
                        <span className="text-muted-foreground">Nenhuma escola disponível</span>
                      </CommandItem>
                    )}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            
            {/* Escolas selecionadas */}
            {selectedSchools.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedSchools.map((school) => (
                  <Badge key={school.id} variant="secondary" className="flex items-center gap-1">
                    {school.name}
                    <button
                      type="button"
                      onClick={() => handleRemoveSchool(school.id)}
                      className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            {!selectedMunicipality && (
              <p className="text-xs text-muted-foreground">
                Selecione um município para visualizar as escolas disponíveis
              </p>
            )}
            {selectedSchools.length > 0 && (
              <p className="text-xs text-muted-foreground">
                As séries serão filtradas pelas escolas selecionadas
              </p>
            )}
          </div>

          {/* Seleção de Série */}
          <div className="space-y-2">
            <Label>
              Série <span className="text-red-500">*</span>
            </Label>
            <Popover open={openGradeCombo} onOpenChange={setOpenGradeCombo}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openGradeCombo}
                  className="w-full justify-between"
                  disabled={isLoadingGrades || selectedSchools.length === 0}
                >
                  {selectedGrade
                    ? selectedGradeData?.name
                    : selectedSchools.length === 0
                    ? "Selecione escolas primeiro..."
                    : isLoadingGrades
                    ? "Carregando séries..."
                    : "Selecione uma série..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0">
                <Command>
                  <CommandInput placeholder="Buscar série..." />
                  <CommandEmpty>
                    {selectedSchools.length === 0
                      ? "Selecione escolas primeiro"
                      : "Nenhuma série encontrada para as escolas selecionadas"}
                  </CommandEmpty>
                  <CommandGroup className="max-h-[200px] overflow-auto">
                    {grades.length > 0 ? (
                      grades.map((grade) => {
                        const gradeName = grade.name || '';
                        return (
                          <CommandItem
                            key={grade.id}
                            value={gradeName}
                            onSelect={() => {
                              setSelectedGrade(grade.id);
                              setOpenGradeCombo(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedGrade === grade.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <GraduationCap className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span className="flex-1">{gradeName}</span>
                          </CommandItem>
                        );
                      })
                    ) : (
                      <CommandItem disabled>
                        <span className="text-muted-foreground">Nenhuma série disponível</span>
                      </CommandItem>
                    )}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedSchools.length > 0 && grades.length === 0 && !isLoadingGrades && (
              <p className="text-xs text-destructive">
                Nenhuma série encontrada para as escolas selecionadas
              </p>
            )}
          </div>

          {/* Seleção de Disciplina */}
          <div className="space-y-2">
            <Label>
              Disciplina <span className="text-red-500">*</span>
            </Label>
            <Popover open={openSubjectCombo} onOpenChange={setOpenSubjectCombo}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openSubjectCombo}
                  className="w-full justify-between"
                  disabled={isLoadingSubjects}
                >
                  {selectedSubject
                    ? selectedSubjectData?.name
                    : "Selecione uma disciplina..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0">
                <Command>
                  <CommandInput placeholder="Buscar disciplina..." />
                  <CommandEmpty>Nenhuma disciplina encontrada.</CommandEmpty>
                  <CommandGroup className="max-h-[200px] overflow-auto">
                    {subjects.length > 0 ? (
                      subjects.map((subject) => {
                        const subjectName = subject.name || '';
                        return (
                          <CommandItem
                            key={subject.id}
                            value={subjectName}
                            onSelect={() => {
                              setSelectedSubject(subject.id);
                              setOpenSubjectCombo(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedSubject === subject.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <BookOpen className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span className="flex-1">{subjectName}</span>
                          </CommandItem>
                        );
                      })
                    ) : (
                      <CommandItem disabled>
                        <span className="text-muted-foreground">Nenhuma disciplina disponível</span>
                      </CommandItem>
                    )}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Botão de Enviar */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setUrl('');
                setTitle('');
                setSelectedState('');
                setSelectedMunicipality('');
                setSelectedSchools([]);
                setSelectedGrade('');
                setSelectedSubject('');
              }}
              disabled={isSubmitting}
            >
              Limpar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Cadastrar Vídeo
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

