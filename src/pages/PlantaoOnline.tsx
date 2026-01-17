import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/authContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect, Option } from '@/components/ui/multi-select';
import { Headset, Copy, ExternalLink, Link as LinkIcon, Users, CheckCircle2, Loader2, AlertCircle, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { createGoogleMeetLink } from '@/services/googleMeetService';

interface Class {
  id: string;
  name: string;
  school_id?: string;
  school_name?: string;
  grade_id?: string;
  grade_name?: string;
}

interface Student {
  id: string;
  name: string;
  email?: string;
  class_id: string;
}

interface School {
  id: string;
  name: string;
}

interface Grade {
  id: string;
  name: string;
}

export default function PlantaoOnline() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [meetLink, setMeetLink] = useState<string>('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  // Estados de filtros
  const [filters, setFilters] = useState({
    school: '',
    grade: '',
  });
  const [schools, setSchools] = useState<School[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);

  // Verificar permissões
  const allowedRoles = ['admin', 'professor', 'diretor', 'coordenador', 'tecadm'];

  // Carregar escolas e séries para filtros
  useEffect(() => {
    const loadFilters = async () => {
      setIsLoadingFilters(true);
      try {
        // Para diretor, coordenador e professor, buscar apenas a escola do usuário
        if (['diretor', 'coordenador', 'professor'].includes(user.role)) {
          let userSchoolId: string | null = null;
          let userSchoolName: string | null = null;

          try {
            // Buscar dados do usuário
            const userResponse = await api.get(`/users/${user.id}`);
            const userData = userResponse.data;

            // Para professor, buscar via turmas
            if (user.role === 'professor') {
              try {
                const teacherResponse = await api.get(`/teacher/${user.id}`);
                const teacherData = teacherResponse.data;
                if (teacherData.turmas && teacherData.turmas.length > 0) {
                  // Pegar a escola da primeira turma (assumindo que professor tem apenas uma escola)
                  const firstClass = teacherData.turmas[0];
                  userSchoolId = firstClass.school_id;
                  userSchoolName = firstClass.school_name || firstClass.escola_nome;
                }
              } catch (error) {
                console.error('Erro ao buscar escola do professor:', error);
              }
            } 
            // Para diretor e coordenador, buscar via endpoint específico
            else if (['diretor', 'coordenador'].includes(user.role)) {
              try {
                const schoolResponse = await api.get(`/users/school/${user.id}`).catch(() => ({ data: null }));
                const schoolData = schoolResponse?.data?.school || schoolResponse?.data || null;
                userSchoolId = schoolData?.id || schoolData?.school_id || schoolData?.school?.id;
                userSchoolName = schoolData?.name || schoolData?.nome || schoolData?.school?.name;
                
                // Se não encontrou, tentar via city_id
                if (!userSchoolId && userData.city_id) {
                  const schoolsResponse = await api.get('/school/');
                  const allSchools = Array.isArray(schoolsResponse.data) 
                    ? schoolsResponse.data 
                    : (schoolsResponse.data?.data || []);
                  const municipalitySchools = allSchools.filter(
                    (school: any) => school.city_id === userData.city_id
                  );
                  if (municipalitySchools.length === 1) {
                    userSchoolId = municipalitySchools[0].id;
                    userSchoolName = municipalitySchools[0].name || municipalitySchools[0].nome;
                  }
                }
              } catch (error) {
                console.error('Erro ao buscar escola do diretor/coordenador:', error);
              }
            }

            // Se encontrou a escola, definir apenas ela
            if (userSchoolId && userSchoolName) {
              setSchools([{
                id: userSchoolId,
                name: userSchoolName,
              }]);
              // Pré-selecionar a escola automaticamente
              setTimeout(() => {
                setFilters((prevFilters) => ({
                  ...prevFilters,
                  school: userSchoolId!,
                }));
              }, 0);
            } else {
              setSchools([]);
            }
          } catch (error) {
            console.error('Erro ao buscar escola do usuário:', error);
            setSchools([]);
          }
        } else if (user.role === 'tecadm') {
          // Para tecadm, buscar escolas do município do usuário
          try {
            const userResponse = await api.get(`/users/${user.id}`);
            const userData = userResponse.data;

            if (userData.city_id) {
              // Buscar todas as escolas
              const schoolsResponse = await api.get('/school/');
              const allSchools = Array.isArray(schoolsResponse.data) 
                ? schoolsResponse.data 
                : (schoolsResponse.data?.data || []);
              
              // Filtrar escolas do município do tecadm
              const municipalitySchools = allSchools.filter(
                (school: any) => school.city_id === userData.city_id
              );

              setSchools(municipalitySchools.map((s: any) => ({
                id: s.id,
                name: s.name || s.nome,
              })));
            } else {
              setSchools([]);
            }
          } catch (error) {
            console.error('Erro ao buscar escolas do município do tecadm:', error);
            setSchools([]);
          }
        } else {
          // Para admin, carregar todas as escolas
          const schoolsResponse = await api.get('/school/');
          const schoolsData = Array.isArray(schoolsResponse.data) 
            ? schoolsResponse.data 
            : (schoolsResponse.data?.data || []);
          setSchools(schoolsData.map((s: any) => ({
            id: s.id,
            name: s.name || s.nome,
          })));
        }
      } catch (error) {
        console.error('Erro ao carregar filtros:', error);
      } finally {
        setIsLoadingFilters(false);
      }
    };

    if (allowedRoles.includes(user.role)) {
      loadFilters();
    }
  }, [user.id, user.role]);

  // Carregar séries da escola selecionada
  useEffect(() => {
    const loadGradesForSchool = async () => {
      if (!filters.school) {
        setGrades([]);
        return;
      }

      setIsLoadingFilters(true);
      try {
        // Buscar turmas da escola para obter as séries disponíveis
        const classesResponse = await api.get(`/classes/school/${filters.school}`);
        const classesData = Array.isArray(classesResponse.data) 
          ? classesResponse.data 
          : (classesResponse.data?.data || []);
        
        // Extrair séries únicas das turmas
        const gradeMap = new Map<string, Grade>();
        classesData.forEach((classItem: any) => {
          if (classItem.grade && classItem.grade.id && !gradeMap.has(classItem.grade.id)) {
            gradeMap.set(classItem.grade.id, {
              id: classItem.grade.id,
              name: classItem.grade.name || classItem.grade.nome || classItem.grade.name || '',
            });
          }
        });

        setGrades(Array.from(gradeMap.values()));
      } catch (error) {
        console.error('Erro ao carregar séries da escola:', error);
        setGrades([]);
      } finally {
        setIsLoadingFilters(false);
      }
    };

    loadGradesForSchool();
  }, [filters.school]);

  // Carregar turmas do professor
  useEffect(() => {
    const loadClasses = async () => {
      if (!user.id || !allowedRoles.includes(user.role)) return;

      setIsLoadingClasses(true);
      try {
        if (user.role === 'professor') {
          // Buscar turmas do professor
          const response = await api.get(`/teacher/${user.id}`);
          const teacherData = response.data;
          if (teacherData.turmas && Array.isArray(teacherData.turmas)) {
            const classesData = teacherData.turmas.map((turma: any) => ({
              id: turma.id,
              name: turma.name || turma.nome || `Turma ${turma.id}`,
              school_id: turma.school_id,
              school_name: turma.school_name || turma.escola_nome,
              grade_id: turma.grade_id || turma.grade?.id,
              grade_name: turma.grade_name || turma.grade?.name || turma.grade?.nome,
            }));
            setClasses(classesData);
          }
        } else {
          // Para outros roles, buscar todas as turmas (ou filtrar por escola se necessário)
          const response = await api.get('/classes');
          const classesData = Array.isArray(response.data) 
            ? response.data 
            : (response.data?.data || []);
          setClasses(classesData.map((c: any) => ({
            id: c.id,
            name: c.name || c.nome || `Turma ${c.id}`,
            school_id: c.school_id,
            school_name: c.school_name || c.escola_nome,
            grade_id: c.grade_id || c.grade?.id,
            grade_name: c.grade_name || c.grade?.name || c.grade?.nome,
          })));
        }
      } catch (error) {
        console.error('Erro ao carregar turmas:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar as turmas. Tente novamente.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingClasses(false);
      }
    };

    loadClasses();
  }, [user.id, user.role, toast]);

  // Carregar alunos das turmas selecionadas
  useEffect(() => {
    const loadStudents = async () => {
      if (selectedClasses.length === 0) {
        setStudents([]);
        return;
      }

      setIsLoadingStudents(true);
      try {
        const studentPromises = selectedClasses.map(async (classId) => {
          try {
            const response = await api.get(`/students/classes/${classId}`);
            const studentsData = Array.isArray(response.data) ? response.data : [];
            return studentsData.map((student: any) => ({
              id: student.id,
              name: student.name || student.nome,
              email: student.email || student.user?.email,
              class_id: classId,
            }));
          } catch (error) {
            console.error(`Erro ao carregar alunos da turma ${classId}:`, error);
            return [];
          }
        });

        const studentsArrays = await Promise.all(studentPromises);
        const allStudents = studentsArrays.flat();
        setStudents(allStudents);
      } catch (error) {
        console.error('Erro ao carregar alunos:', error);
        setStudents([]);
      } finally {
        setIsLoadingStudents(false);
      }
    };

    loadStudents();
  }, [selectedClasses]);

  // Filtrar turmas baseado nos filtros
  const filteredClasses = useMemo(() => {
    let filtered = classes;

    // Filtro por escola (obrigatório)
    if (!filters.school || filters.school === 'all') {
      return [];
    }
    filtered = filtered.filter((c) => c.school_id === filters.school);

    // Filtro por série (obrigatório)
    if (!filters.grade || filters.grade === 'all') {
      return [];
    }
    filtered = filtered.filter((c) => c.grade_id === filters.grade);

    return filtered;
  }, [classes, filters.school, filters.grade]);

  // Opções de turmas para o MultiSelect (após filtros)
  const classOptions: Option[] = useMemo(() => {
    return filteredClasses.map((c) => ({
      id: c.id,
      name: c.school_name ? `${c.name} - ${c.school_name}` : c.name,
    }));
  }, [filteredClasses]);

  // Agrupar alunos por turma
  const studentsByClass = useMemo(() => {
    const grouped: Record<string, Student[]> = {};
    students.forEach((student) => {
      if (!grouped[student.class_id]) {
        grouped[student.class_id] = [];
      }
      grouped[student.class_id].push(student);
    });
    return grouped;
  }, [students]);

  const generateMeetLink = async () => {
    setIsGeneratingLink(true);
    try {
      // Criar título baseado nas turmas selecionadas
      const classesNames = classes
        .filter(c => selectedClasses.includes(c.id))
        .map(c => c.name)
        .join(', ');
      
      const title = classesNames 
        ? `Plantão Online - ${classesNames}`
        : 'Plantão Online';

      // Criar descrição com informações das turmas e alunos
      const description = selectedClasses.length > 0
        ? `Plantão online para ${selectedClasses.length} ${selectedClasses.length === 1 ? 'turma' : 'turmas'}.\nAlunos: ${students.length}`
        : 'Plantão online criado pelo sistema Afirme Play';

      // Criar evento no Google Calendar com Meet
      const meetLink = await createGoogleMeetLink(title, description);
      
      setMeetLink(meetLink);
      
      toast({
        title: 'Link gerado',
        description: 'Link do Google Meet criado com sucesso!',
      });
    } catch (error: any) {
      console.error('Erro ao gerar link do Meet:', error);
      
      let errorMessage = 'Não foi possível gerar o link do Google Meet.';
      
      if (error.response?.status === 404) {
        errorMessage = 'Endpoint não implementado no backend. Entre em contato com o administrador.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Autenticação com Google necessária. Entre em contato com o administrador.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Erro no servidor ao criar link do Meet. Tente novamente mais tarde.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'Erro ao gerar link',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopyLink = async () => {
    if (!meetLink) {
      toast({
        title: 'Erro',
        description: 'Nenhum link disponível para copiar.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(meetLink);
      toast({
        title: 'Link copiado',
        description: 'Link do Google Meet copiado para a área de transferência!',
      });
    } catch (error) {
      console.error('Erro ao copiar link:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível copiar o link. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleCopyLinkWithMessage = async () => {
    if (!meetLink) {
      toast({
        title: 'Erro',
        description: 'Nenhum link disponível para copiar.',
        variant: 'destructive',
      });
      return;
    }

    const message = `Olá! Aqui está o link para o plantão online:\n\n${meetLink}\n\nEspero você lá!`;
    
    try {
      await navigator.clipboard.writeText(message);
      toast({
        title: 'Mensagem copiada',
        description: 'Link e mensagem copiados para compartilhar!',
      });
    } catch (error) {
      console.error('Erro ao copiar mensagem:', error);
      handleCopyLink();
    }
  };

  const handleOpenLink = () => {
    if (!meetLink) {
      toast({
        title: 'Erro',
        description: 'Nenhum link disponível para abrir.',
        variant: 'destructive',
      });
      return;
    }

    window.open(meetLink, '_blank');
  };

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="container mx-auto py-6 px-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <p>Você não tem permissão para acessar esta página.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Headset className="w-8 h-8 text-blue-600" />
            Plantão Online
          </h1>
          <p className="text-muted-foreground">
            Gere e compartilhe links do Google Meet para realizar videochamadas com seus alunos
          </p>
        </div>
      </div>

      {/* Card de Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
          <CardDescription>
            Filtre turmas e alunos para facilitar a seleção
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Filtro por Escola */}
            <div className="space-y-2">
              <Label>Escola</Label>
              {['diretor', 'coordenador', 'professor'].includes(user.role) && schools.length === 1 ? (
                // Para diretor, coordenador e professor, mostrar apenas a escola (readonly)
                <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted">
                  <span className="text-sm font-medium">{schools[0].name}</span>
                </div>
              ) : (
                <Select
                  value={filters.school || ''}
                  onValueChange={(value) => {
                    setFilters({
                      ...filters,
                      school: value,
                      grade: '', // Reset série ao mudar escola
                    });
                    // Limpar seleção de turmas quando mudar escola
                    setSelectedClasses([]);
                  }}
                  disabled={isLoadingFilters}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma escola" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.map((school) => (
                      <SelectItem key={school.id} value={school.id}>
                        {school.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Filtro por Série */}
            <div className="space-y-2">
              <Label>Série</Label>
              <Select
                value={filters.grade || ''}
                onValueChange={(value) => {
                  setFilters({
                    ...filters,
                    grade: value,
                  });
                  // Limpar seleção de turmas quando mudar série
                  setSelectedClasses([]);
                }}
                disabled={isLoadingFilters || !filters.school}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingFilters ? "Carregando séries..." : filters.school ? "Selecione uma série" : "Selecione uma escola primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {grades.length === 0 && filters.school ? (
                    <SelectItem value="no-grades" disabled>
                      Nenhuma série encontrada
                    </SelectItem>
                  ) : (
                    grades.map((grade) => (
                      <SelectItem key={grade.id} value={grade.id}>
                        {grade.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Botão para limpar filtros */}
          {(filters.school || filters.grade) && (
            <div className="mt-4 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilters({
                    school: '',
                    grade: '',
                  });
                  setSelectedClasses([]);
                }}
              >
                Limpar Filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card principal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5" />
            Link do Google Meet
          </CardTitle>
          <CardDescription>
            Insira um link do Google Meet ou gere um novo link para compartilhar com seus alunos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Campo de input para o link */}
          <div className="space-y-2">
            <Label htmlFor="meet-link">Link do Google Meet</Label>
            <div className="flex gap-2">
              <Input
                id="meet-link"
                type="url"
                placeholder="https://meet.google.com/xxx-xxxx-xxx"
                value={meetLink}
                onChange={(e) => setMeetLink(e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={generateMeetLink}
                disabled={isGeneratingLink}
                className="whitespace-nowrap"
              >
                {isGeneratingLink ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  'Gerar Link'
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Você pode inserir um link manualmente ou clicar em "Gerar Link" para criar um link do Google Meet usando a API do Google Calendar
            </p>
          </div>

          {/* Seleção de turmas */}
          <div className="space-y-2">
            <Label>Turmas para compartilhar</Label>
            {isLoadingClasses ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando turmas...
              </div>
            ) : classes.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="w-4 h-4" />
                Nenhuma turma disponível
              </div>
            ) : !filters.school ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 border rounded-lg bg-muted">
                <AlertCircle className="w-4 h-4" />
                Selecione uma escola primeiro para escolher as turmas
              </div>
            ) : !filters.grade ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 border rounded-lg bg-muted">
                <AlertCircle className="w-4 h-4" />
                Selecione uma série primeiro para escolher as turmas
              </div>
            ) : filteredClasses.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 border rounded-lg bg-muted">
                <AlertCircle className="w-4 h-4" />
                Nenhuma turma encontrada para a escola e série selecionadas
              </div>
            ) : (
              <MultiSelect
                options={classOptions}
                selected={selectedClasses}
                onChange={setSelectedClasses}
                placeholder="Selecione as turmas que receberão o link"
                label=""
                mode="popover"
              />
            )}
          </div>

          {/* Preview de alunos */}
          {selectedClasses.length > 0 && (
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="font-medium">
                    {students.length} {students.length === 1 ? 'aluno receberá' : 'alunos receberão'} o link
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedClasses.length} {selectedClasses.length === 1 ? 'turma selecionada' : 'turmas selecionadas'}
                    {filteredClasses.length !== classes.length && (
                      <span className="ml-2">
                        (de {classes.length} turmas disponíveis)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {isLoadingStudents ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Carregando alunos...
                </div>
              ) : students.length > 0 ? (
                <div className="space-y-2">
                  <Separator />
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-3 pr-4">
                      {Object.entries(studentsByClass).map(([classId, classStudents]) => {
                        const classInfo = classes.find((c) => c.id === classId);
                        return (
                          <div key={classId} className="space-y-1">
                            <p className="text-sm font-medium text-blue-600">
                              {classInfo?.name || `Turma ${classId}`}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {classStudents.map((student) => (
                                <Badge key={student.id} variant="secondary" className="text-xs">
                                  {student.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="w-4 h-4" />
                  Nenhum aluno encontrado nas turmas selecionadas
                </div>
              )}
            </div>
          )}

          {/* Botões de ação */}
          {meetLink && (
            <div className="space-y-3 pt-4 border-t">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleCopyLink}
                  className="flex-1"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Link
                </Button>
                <Button
                  onClick={handleCopyLinkWithMessage}
                  variant="outline"
                  className="flex-1"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Link com Mensagem
                </Button>
                <Button
                  onClick={handleOpenLink}
                  variant="outline"
                  className="flex-1"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir no Google Meet
                </Button>
              </div>

              {/* Link exibido */}
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">Link gerado:</p>
                <p className="text-sm text-muted-foreground break-all">{meetLink}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card de instruções */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Como compartilhar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="space-y-2">
            <p className="font-medium text-foreground">Passo a passo:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Selecione as turmas que receberão o link do plantão online</li>
              <li>Gere ou insira um link do Google Meet</li>
              <li>Use "Copiar Link com Mensagem" para copiar uma mensagem pronta para compartilhar</li>
              <li>Compartilhe o link pelos canais de comunicação disponíveis (WhatsApp, Email, Plataforma, etc.)</li>
            </ol>
          </div>
          <Separator />
          <div className="space-y-2">
            <p className="font-medium text-foreground">Dicas:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>O link pode ser compartilhado com múltiplas turmas ao mesmo tempo</li>
              <li>Você pode copiar apenas o link ou o link com uma mensagem pré-formatada</li>
              <li>Os alunos das turmas selecionadas aparecerão no preview acima</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
