import { useState, useEffect } from 'react';
import { useAuth } from '@/context/authContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, RefreshCw, Tv, School, GraduationCap, BookOpen, Trash2, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { CreatePlayTvVideoForm } from '@/components/playtv/CreatePlayTvVideoForm';
import { VideoList } from '@/components/playtv/VideoList';
import { PlayTvVideo, PlayTvFilters } from '@/types/playtv';

export default function PlayTvManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [videos, setVideos] = useState<PlayTvVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('visualizar');
  const [filters, setFilters] = useState<PlayTvFilters>({});
  const [schools, setSchools] = useState<Array<{ id: string; name: string }>>([]);
  const [grades, setGrades] = useState<Array<{ id: string; name: string }>>([]);
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([]);

  // Verificar permissões
  const allowedRoles = ['admin', 'professor', 'diretor', 'coordenador', 'tecadm'];
  const canCreate = allowedRoles.includes(user.role);

  useEffect(() => {
    if (!allowedRoles.includes(user.role)) {
      toast({
        title: 'Acesso Negado',
        description: 'Você não tem permissão para acessar esta página.',
        variant: 'destructive',
      });
      navigate('/app');
      return;
    }
    loadVideos();
    loadFilterOptions();
  }, [user.role, filters]);

  const loadFilterOptions = async () => {
    try {
      // Carregar escolas, séries e disciplinas para filtros
      const [schoolsRes, subjectsRes] = await Promise.all([
        api.get('/school/').catch(() => ({ data: [] })),
        api.get('/subjects').catch(() => ({ data: [] })),
      ]);

      setSchools(Array.isArray(schoolsRes.data) ? schoolsRes.data : (schoolsRes.data?.data || []));
      setSubjects(subjectsRes.data || []);

      // Carregar séries se houver escola selecionada
      if (filters.school) {
        try {
          const classesRes = await api.get(`/classes/school/${filters.school}`);
          const classesData = classesRes.data || [];
          const gradeMap = new Map<string, { id: string; name: string }>();
          
          classesData.forEach((classItem: any) => {
            if (classItem.grade && classItem.grade.id && !gradeMap.has(classItem.grade.id)) {
              gradeMap.set(classItem.grade.id, {
                id: classItem.grade.id,
                name: classItem.grade.name || classItem.grade.nome || classItem.grade.name,
              });
            }
          });
          
          setGrades(Array.from(gradeMap.values()));
        } catch (error) {
          console.error('Erro ao carregar séries:', error);
          setGrades([]);
        }
      } else {
        const gradesRes = await api.get('/grades/').catch(() => ({ data: [] }));
        setGrades(gradesRes.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar opções de filtro:', error);
    }
  };

  const loadVideos = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.school) params.append('school', filters.school);
      if (filters.grade) params.append('grade', filters.grade);
      if (filters.subject) params.append('subject', filters.subject);

      const response = await api.get(`/play-tv/videos?${params.toString()}`);
      setVideos(response.data || []);
    } catch (error: any) {
      // Se o endpoint não existir (404), apenas definir lista vazia sem mostrar erro
      // O interceptor transforma o erro, então verificamos a mensagem ou o status original
      const is404 = error.response?.status === 404 || 
                    error.message?.includes('não encontrado') ||
                    error.message?.includes('Not Found');
      
      if (is404) {
        setVideos([]);
        // Não logar erro para 404 em endpoints que podem não estar implementados ainda
        return;
      }
      
      console.error('Erro ao carregar vídeos:', error);
      toast({
        title: 'Erro',
        description: error.response?.data?.message || error.message || 'Não foi possível carregar os vídeos.',
        variant: 'destructive',
      });
      setVideos([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm('Tem certeza que deseja excluir este vídeo?')) return;

    try {
      await api.delete(`/play-tv/videos/${videoId}`);
      toast({
        title: 'Sucesso',
        description: 'Vídeo excluído com sucesso.',
      });
      loadVideos();
    } catch (error: any) {
      console.error('Erro ao excluir vídeo:', error);
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Não foi possível excluir o vídeo.',
        variant: 'destructive',
      });
    }
  };

  const handleVideoClick = (video: PlayTvVideo) => {
    navigate(`/app/play-tv/${video.id}`);
  };

  const handleRefresh = () => {
    loadVideos();
  };

  const handleVideoCreated = () => {
    loadVideos();
    setActiveTab('visualizar');
  };

  // Obter IDs do contexto do usuário (similar ao padrão de Avisos)
  const getUserContext = () => {
    // TODO: Integrar com API quando disponível para obter município/escola do usuário
    return {
      municipio_id: user.role === 'tecadm' ? undefined : undefined,
      escola_id: ['diretor', 'coordenador', 'professor'].includes(user.role) ? undefined : undefined,
    };
  };

  const userContext = getUserContext();

  return (
    <div className="container mx-auto py-8 px-4 space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-4 border-b">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
            <Tv className="w-10 h-10 text-blue-600" />
            Play TV
          </h1>
          <p className="text-muted-foreground text-lg">
            {canCreate
              ? 'Gerencie e cadastre vídeos educacionais para os alunos'
              : 'Visualize os vídeos disponíveis'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading} className="shadow-sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Tabs */}
      {canCreate && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="visualizar">
              <Eye className="w-4 h-4 mr-2" />
              Visualizar Vídeos
            </TabsTrigger>
            <TabsTrigger value="cadastrar">
              <Plus className="w-4 h-4 mr-2" />
              Cadastrar Vídeo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="visualizar" className="space-y-6 mt-6">
            {/* Filtros */}
            <Card className="shadow-sm border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <School className="w-5 h-5 text-primary" />
                  Filtros
                </CardTitle>
                <CardDescription>Filtre os vídeos por escola, série ou disciplina</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Escola</label>
                    <Select
                      value={filters.school || 'all'}
                      onValueChange={(value) => {
                        setFilters({
                          ...filters,
                          school: value === 'all' ? undefined : value,
                          grade: undefined, // Reset série ao mudar escola
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todas as escolas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as escolas</SelectItem>
                        {schools.map((school) => (
                          <SelectItem key={school.id} value={school.id}>
                            {school.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Série</label>
                    <Select
                      value={filters.grade || 'all'}
                      onValueChange={(value) =>
                        setFilters({
                          ...filters,
                          grade: value === 'all' ? undefined : value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todas as séries" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as séries</SelectItem>
                        {grades.map((grade) => (
                          <SelectItem key={grade.id} value={grade.id}>
                            {grade.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Disciplina</label>
                    <Select
                      value={filters.subject || 'all'}
                      onValueChange={(value) =>
                        setFilters({
                          ...filters,
                          subject: value === 'all' ? undefined : value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todas as disciplinas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as disciplinas</SelectItem>
                        {subjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lista de Vídeos */}
            <VideoList 
              videos={videos} 
              isLoading={isLoading} 
              onVideoClick={handleVideoClick}
              onDeleteVideo={handleDeleteVideo}
              userRole={user.role}
            />
          </TabsContent>

          <TabsContent value="cadastrar">
            <CreatePlayTvVideoForm
              onSuccess={handleVideoCreated}
              userRole={user.role}
              userMunicipioId={userContext.municipio_id}
              userEscolaId={userContext.escola_id}
            />
          </TabsContent>
        </Tabs>
      )}

      {!canCreate && (
        <>
          {/* Filtros */}
          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <School className="w-5 h-5 text-primary" />
                Filtros
              </CardTitle>
              <CardDescription>Filtre os vídeos por escola, série ou disciplina</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Escola</label>
                  <Select
                    value={filters.school || 'all'}
                    onValueChange={(value) => {
                      setFilters({
                        ...filters,
                        school: value === 'all' ? undefined : value,
                        grade: undefined,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as escolas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as escolas</SelectItem>
                      {schools.map((school) => (
                        <SelectItem key={school.id} value={school.id}>
                          {school.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Série</label>
                  <Select
                    value={filters.grade || 'all'}
                    onValueChange={(value) =>
                      setFilters({
                        ...filters,
                        grade: value === 'all' ? undefined : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as séries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as séries</SelectItem>
                      {grades.map((grade) => (
                        <SelectItem key={grade.id} value={grade.id}>
                          {grade.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Disciplina</label>
                  <Select
                    value={filters.subject || 'all'}
                    onValueChange={(value) =>
                      setFilters({
                        ...filters,
                        subject: value === 'all' ? undefined : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as disciplinas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as disciplinas</SelectItem>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Vídeos */}
          <VideoList 
            videos={videos} 
            isLoading={isLoading} 
            onVideoClick={handleVideoClick}
            onDeleteVideo={handleDeleteVideo}
            userRole={user.role}
          />
        </>
      )}
    </div>
  );
}

