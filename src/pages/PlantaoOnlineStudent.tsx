import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/authContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Headset, RefreshCw, BookOpen, Loader2, ExternalLink, Copy, Calendar, Link as LinkIcon, GraduationCap, School } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { PlantaoOnline } from '@/types/plantao';

interface ApiError {
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
  message?: string;
}

export default function PlantaoOnlineStudent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [plantoes, setPlantoes] = useState<PlantaoOnline[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStudentInfo, setIsLoadingStudentInfo] = useState(true);
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('Todas');
  const [studentGrade, setStudentGrade] = useState<string | null>(null);
  const [studentSchool, setStudentSchool] = useState<string | null>(null);

  const loadPlantoes = useCallback(async () => {
    setIsLoading(true);
    try {
      // Passar parâmetros para o backend fazer a filtragem
      // O backend já filtra automaticamente por grade e school para alunos
      const params = new URLSearchParams();
      if (selectedSubject !== 'Todas') {
        // Encontrar o ID da disciplina pelo nome
        const subjectObj = subjects.find(s => s.name === selectedSubject);
        if (subjectObj) {
          params.append('subject', subjectObj.id);
        }
      }
      // Passar grade como parâmetro para garantir filtragem no backend
      if (studentGrade) {
        params.append('grade', studentGrade);
      }

      const response = await api.get(`/plantao-online/student?${params.toString()}`);
      // O backend já filtra por grade e school para alunos, então não precisa filtrar no frontend
      setPlantoes(response.data || []);
    } catch (err) {
      const error = err as ApiError;
      // Se o endpoint não existir (404), apenas definir lista vazia sem mostrar erro
      const is404 = error.response?.status === 404 || 
                    error.message?.includes('não encontrado') ||
                    error.message?.includes('Not Found');
      
      if (is404) {
        setPlantoes([]);
        return;
      }
      
      console.error('Erro ao carregar plantões:', error);
      toast({
        title: 'Erro',
        description: error.response?.data?.message || error.message || 'Não foi possível carregar os plantões online.',
        variant: 'destructive',
      });
      setPlantoes([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSubject, studentGrade, subjects, toast]);

  const loadStudentInfo = useCallback(async () => {
    setIsLoadingStudentInfo(true);
    try {
      // Buscar informações do aluno usando o endpoint /students/me
      const response = await api.get('/students/me');
      const studentData = response.data;

      // O endpoint retorna os dados formatados com grade_id e school_id
      if (studentData.grade_id) {
        setStudentGrade(studentData.grade_id);
      }
      if (studentData.school_id) {
        setStudentSchool(studentData.school_id);
      }

      // Se não encontrar na resposta direta, tentar buscar via turma ou grade
      if (!studentData.grade_id && studentData.class_id) {
        try {
          const classResponse = await api.get(`/classes/${studentData.class_id}`);
          const classData = classResponse.data;
          if (classData.grade_id) {
            setStudentGrade(classData.grade_id);
          }
          if (classData.school_id) {
            setStudentSchool(classData.school_id);
          }
        } catch (classError) {
          console.error('Erro ao buscar dados da turma:', classError);
        }
      } else if (!studentData.grade_id && studentData.grade?.id) {
        // Tentar usar o objeto grade se disponível
        setStudentGrade(studentData.grade.id);
      }

      // Se ainda não tiver grade_id, mostrar mensagem ao usuário
      if (!studentData.grade_id && !studentData.grade?.id) {
        toast({
          title: 'Atenção',
          description: 'Sua série não está cadastrada. Entre em contato com o administrador.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      const error = err as ApiError;
      console.error('Erro ao carregar informações do aluno:', error);
      
      // Se for erro 404, o aluno pode não ter registro completo
      if (error.response?.status === 404) {
        toast({
          title: 'Erro',
          description: 'Seus dados não foram encontrados. Entre em contato com o administrador.',
          variant: 'destructive',
        });
      } else if (error.response?.status === 500) {
        toast({
          title: 'Erro',
          description: 'Erro ao carregar seus dados. Tente novamente mais tarde.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoadingStudentInfo(false);
    }
  }, [toast]);

  const loadSubjects = useCallback(async () => {
    try {
      const response = await api.get('/subjects');
      setSubjects(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar disciplinas:', error);
    }
  }, []);

  // Verificar permissões e carregar dados iniciais
  useEffect(() => {
    if (user.role !== 'aluno') {
      toast({
        title: 'Acesso Negado',
        description: 'Esta página é apenas para alunos.',
        variant: 'destructive',
      });
      navigate('/aluno');
      return;
    }

    loadStudentInfo();
    loadSubjects();
  }, [user.role, navigate, toast, loadStudentInfo, loadSubjects]);

  // Carregar plantões quando a série do aluno estiver disponível ou quando o filtro de disciplina mudar
  useEffect(() => {
    if (!isLoadingStudentInfo) {
      loadPlantoes();
    }
  }, [studentGrade, selectedSubject, loadPlantoes, isLoadingStudentInfo]);

  const handleCopyLink = async (link: string, title?: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast({
        title: 'Link copiado',
        description: `Link do plantão ${title ? `"${title}"` : ''} copiado para a área de transferência!`,
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

  const handleOpenLink = (link: string) => {
    window.open(link, '_blank');
  };

  const handleRefresh = () => {
    loadPlantoes();
  };

  // Filtrar plantões por disciplina
  const filterPlantoesBySubject = (plantoesList: PlantaoOnline[]) => {
    if (selectedSubject === 'Todas') {
      return plantoesList;
    }
    return plantoesList.filter((plantao) => plantao.subject?.name === selectedSubject);
  };

  // Agrupar plantões por disciplina
  const groupPlantoesBySubject = (plantoesList: PlantaoOnline[]) => {
    const grouped: Record<string, PlantaoOnline[]> = {};

    plantoesList.forEach((plantao) => {
      const subject = plantao.subject?.name || 'Sem Disciplina';
      if (!grouped[subject]) {
        grouped[subject] = [];
      }
      grouped[subject].push(plantao);
    });

    return grouped;
  };

  const filteredPlantoes = filterPlantoesBySubject(plantoes);
  const groupedPlantoes = groupPlantoesBySubject(filteredPlantoes);

  if (isLoading || isLoadingStudentInfo) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mr-2" />
          <span>Carregando plantões...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Headset className="w-8 h-8 text-blue-600" />
            Plantão Online
          </h2>
          <p className="text-muted-foreground">Acesse os links de plantão online compartilhados pelos seus professores</p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={isLoading} size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Filtro por Disciplina - Layout Dinâmico */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedSubject === 'Todas' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedSubject('Todas')}
        >
          Todas as Disciplinas
        </Button>
        {subjects.map((subject) => (
          <Button
            key={subject.id}
            variant={selectedSubject === subject.name ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedSubject(subject.name)}
          >
            {subject.name}
          </Button>
        ))}
      </div>

      {plantoes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Headset className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Nenhum plantão encontrado</h3>
            <p className="text-muted-foreground">
              Nenhum plantão online disponível no momento. Aguarde seu professor adicionar plantões.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Plantões agrupados por disciplina */}
          {Object.entries(groupedPlantoes).map(([subject, subjectPlantoes]) => (
            subjectPlantoes.length > 0 && (
              <div key={subject} className="space-y-4">
                <div className="flex items-center gap-3 pb-2 border-b">
                  <BookOpen className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-semibold">{subject}</h3>
                  <Badge variant="secondary">{subjectPlantoes.length} plantão{subjectPlantoes.length !== 1 ? 'ões' : ''}</Badge>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {subjectPlantoes.map((plantao) => (
                    <Card
                      key={plantao.id}
                      className="group hover:shadow-xl transition-all duration-200 border-2 hover:border-primary/30"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                            <Headset className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg font-bold line-clamp-2 leading-tight mb-2">
                              {plantao.title}
                            </CardTitle>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs font-medium">
                                {plantao.subject?.name || 'Sem disciplina'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Link da reunião - melhorado */}
                        <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center gap-2 mb-2">
                            <LinkIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Link da Reunião</p>
                          </div>
                          <p className="text-xs break-all font-mono text-blue-900 dark:text-blue-100 bg-white dark:bg-gray-900 p-2 rounded border">
                            {plantao.link}
                          </p>
                        </div>

                        {/* Informações do plantão - melhorado */}
                        <div className="space-y-2.5">
                          {plantao.grade && (
                            <div className="flex items-center gap-2 text-sm">
                              <div className="p-1.5 bg-muted rounded">
                                <GraduationCap className="w-3.5 h-3.5 text-muted-foreground" />
                              </div>
                              <span className="font-medium">{plantao.grade.name}</span>
                            </div>
                          )}
                          
                          {plantao.schools.length > 0 && (
                            <div className="flex items-start gap-2 text-sm">
                              <div className="p-1.5 bg-muted rounded mt-0.5">
                                <School className="w-3.5 h-3.5 text-muted-foreground" />
                              </div>
                              <div className="flex-1">
                                {plantao.schools.length === 1 ? (
                                  <span className="font-medium">{plantao.schools[0].name}</span>
                                ) : (
                                  <span className="font-medium">{plantao.schools.length} escolas</span>
                                )}
                              </div>
                            </div>
                          )}

                          {plantao.created_at && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <div className="p-1.5 bg-muted rounded">
                                <Calendar className="w-3.5 h-3.5" />
                              </div>
                              <span>{new Date(plantao.created_at).toLocaleDateString('pt-BR', { 
                                day: '2-digit', 
                                month: 'short', 
                                year: 'numeric' 
                              })}</span>
                            </div>
                          )}
                          
                          {plantao.created_by && (
                            <div className="flex items-center gap-2 text-sm">
                              <div className="p-1.5 bg-muted rounded">
                                <span className="text-xs">👤</span>
                              </div>
                              <span className="text-muted-foreground">
                                Professor <strong className="text-foreground">{plantao.created_by.name}</strong>
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Botões de ação - melhorado */}
                        <div className="flex flex-col gap-2 pt-3 border-t">
                          <Button
                            onClick={() => handleOpenLink(plantao.link)}
                            className="w-full"
                            size="sm"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Entrar na Reunião
                          </Button>
                          <Button
                            onClick={() => handleCopyLink(plantao.link, plantao.title)}
                            variant="outline"
                            className="w-full"
                            size="sm"
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copiar Link
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          ))}

          {/* Mensagem quando não há plantões na disciplina selecionada */}
          {filteredPlantoes.length === 0 && plantoes.length > 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Headset className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Nenhum plantão encontrado</h3>
                <p className="text-muted-foreground">
                  Não há plantões disponíveis para a disciplina selecionada.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
