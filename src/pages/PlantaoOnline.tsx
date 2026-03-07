import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/authContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Headset, RefreshCw, School, GraduationCap, BookOpen, Eye, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { CreatePlantaoForm } from '@/components/plantao/CreatePlantaoForm';
import { PlantaoList } from '@/components/plantao/PlantaoList';
import { PlantaoOnline, PlantaoFilters } from '@/types/plantao';
import { getUserHierarchyContext } from '@/utils/userHierarchy';

export default function PlantaoOnline() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [plantoes, setPlantoes] = useState<PlantaoOnline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('visualizar');
  const [filters, setFilters] = useState<PlantaoFilters>({});
  const [schools, setSchools] = useState<Array<{ id: string; name: string }>>([]);
  const [grades, setGrades] = useState<Array<{ id: string; name: string }>>([]);
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([]);
  const [userContext, setUserContext] = useState<{
    municipio_id?: string;
    escola_id?: string;
    estado_id?: string;
    turmas?: Array<{ class_id: string; school_id: string; grade_id: string; subject_id?: string }>;
  }>({});
  const [isLoadingContext, setIsLoadingContext] = useState(true);

  // Verificar permissões
  const allowedRoles = useMemo(() => ['admin', 'professor', 'diretor', 'coordenador', 'tecadm'], []);
  const canCreate = allowedRoles.includes(user.role);

  const loadUserContext = useCallback(async () => {
    setIsLoadingContext(true);
    try {
      const context = await getUserHierarchyContext(user.id, user.role);
      
      // Buscar estado ID se tiver município com state
      let estadoId: string | undefined;
      if (context.municipality?.state) {
        try {
          const statesResponse = await api.get('/city/states');
          const states = statesResponse.data || [];
          const state = states.find((s: { nome: string }) => s.nome === context.municipality?.state);
          estadoId = state?.id;
        } catch (error) {
          console.error('Erro ao buscar estado:', error);
        }
      }

      // Converter turmas do professor para o formato esperado
      const turmas = context.classes?.map(c => ({
        class_id: c.class_id,
        school_id: c.school_id,
        grade_id: c.grade_id,
        subject_id: undefined, // Turmas podem não ter subject_id direto
      })) || [];

      setUserContext({
        municipio_id: context.municipality?.id,
        escola_id: context.school?.id,
        estado_id: estadoId,
        turmas,
      });
    } catch (error) {
      console.error('Erro ao carregar contexto do usuário:', error);
      setUserContext({});
    } finally {
      setIsLoadingContext(false);
    }
  }, [user.id, user.role]);

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
    loadUserContext();
  }, [user.id, user.role, allowedRoles, toast, navigate, loadUserContext]);

  useEffect(() => {
    if (!isLoadingContext && allowedRoles.includes(user.role)) {
      loadPlantoes();
      loadFilterOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.role, filters, isLoadingContext, allowedRoles]);

  const loadFilterOptions = async () => {
    try {
      // Carregar escolas, séries e disciplinas para filtros em paralelo
      const [schoolsRes, subjectsRes, gradesRes] = await Promise.all([
        api.get('/school/').catch(() => ({ data: [] })),
        api.get('/subjects').catch(() => ({ data: [] })),
        api.get('/grades/').catch(() => ({ data: [] })),
      ]);

      setSchools(Array.isArray(schoolsRes.data) ? schoolsRes.data : (schoolsRes.data?.data || []));
      setSubjects(subjectsRes.data || []);
      // Sempre carregar todas as séries disponíveis
      setGrades(gradesRes.data || []);
    } catch (error) {
      console.error('Erro ao carregar opções de filtro:', error);
    }
  };

  const loadPlantoes = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.school) params.append('school', filters.school);
      if (filters.grade) params.append('grade', filters.grade);
      if (filters.subject) params.append('subject', filters.subject);

      const response = await api.get(`/plantao-online?${params.toString()}`);
      let allPlantoes = response.data || [];

      // Filtrar plantões baseado no role
      allPlantoes = filterPlantoesByRole(allPlantoes);

      setPlantoes(allPlantoes);
    } catch (err) {
      const error = err as {
        response?: {
          status?: number;
          data?: {
            message?: string;
          };
        };
        message?: string;
      };
      // Se o endpoint não existir (404), apenas definir lista vazia sem mostrar erro
      const is404 = error.response?.status === 404 || 
                    error.message?.includes('não encontrado') ||
                    error.message?.includes('Not Found');
      
      if (is404) {
        setPlantoes([]);
        // Não logar erro para 404 em endpoints que podem não estar implementados ainda
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
  };

  const filterPlantoesByRole = (plantoes: PlantaoOnline[]): PlantaoOnline[] => {
    if (user.role === 'admin') {
      return plantoes;
    }

    if (user.role === 'tecadm' && userContext.municipio_id) {
      // Tecadmin vê plantões do seu município
      return plantoes.filter(plantao => 
        plantao.schools.some(school => {
          // O backend deve filtrar corretamente
          return true;
        })
      );
    }

    if ((user.role === 'diretor' || user.role === 'coordenador') && userContext.escola_id) {
      return plantoes.filter(plantao => 
        plantao.schools.some(school => school.id === userContext.escola_id)
      );
    }

    if (user.role === 'professor' && userContext.turmas && userContext.turmas.length > 0) {
      const allowedSchoolIds = new Set(userContext.turmas.map(t => t.school_id));
      const allowedGradeIds = new Set(userContext.turmas.map(t => t.grade_id));
      
      return plantoes.filter(plantao => 
        plantao.schools.some(school => allowedSchoolIds.has(school.id)) &&
        allowedGradeIds.has(plantao.grade.id)
      );
    }

    return plantoes;
  };

  const canDeletePlantao = (plantao: PlantaoOnline): boolean => {
    if (user.role === 'admin') {
      return true;
    }

    if (user.role === 'coordenador' || user.role === 'professor') {
      return false;
    }

    if (user.role === 'tecadm' && userContext.municipio_id) {
      // Tecadmin pode deletar plantões do seu município
      return plantao.schools.length > 0;
    }

    if ((user.role === 'diretor') && userContext.escola_id) {
      return plantao.schools.some(school => school.id === userContext.escola_id);
    }

    return false;
  };

  const handleDeletePlantao = async (plantaoId: string) => {
    if (!confirm('Tem certeza que deseja excluir este plantão online?')) return;

    try {
      await api.delete(`/plantao-online/${plantaoId}`);
      toast({
        title: 'Sucesso',
        description: 'Plantão online excluído com sucesso.',
      });
      loadPlantoes();
    } catch (err) {
      const error = err as {
        response?: {
          data?: {
            message?: string;
          };
        };
      };
      console.error('Erro ao excluir plantão:', error);
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Não foi possível excluir o plantão online.',
        variant: 'destructive',
      });
    }
  };

  const handlePlantaoClick = (plantao: PlantaoOnline) => {
    // Abrir link da reunião em nova aba
    window.open(plantao.link, '_blank');
  };

  const handleRefresh = () => {
    loadPlantoes();
  };

  const handlePlantaoCreated = () => {
    loadPlantoes();
    setActiveTab('visualizar');
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header — mobile: título/desc alinhados, botão centralizado abaixo */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex flex-wrap items-center gap-2 sm:gap-3">
            <Headset className="w-7 h-7 sm:w-8 sm:h-8 text-primary shrink-0" />
            Plantão Online
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {canCreate
              ? 'Gerencie e cadastre plantões online para os alunos'
              : 'Visualize os plantões online disponíveis'}
          </p>
        </div>
        <div className="flex justify-center w-full sm:w-auto sm:justify-end">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Tabs */}
      {canCreate && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="visualizar" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Visualizar Plantões
            </TabsTrigger>
            <TabsTrigger value="cadastrar" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Cadastrar Plantão
            </TabsTrigger>
          </TabsList>

          <TabsContent value="visualizar" className="space-y-6 mt-6">
            {/* Filtros */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <School className="h-5 w-5" />
                  Filtros
                </CardTitle>
                <CardDescription>Filtre os plantões por escola, série ou disciplina</CardDescription>
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

            {/* Lista de Plantões */}
            <PlantaoList 
              plantoes={plantoes} 
              isLoading={isLoading} 
              onPlantaoClick={handlePlantaoClick}
              onDeletePlantao={handleDeletePlantao}
              userRole={user.role}
              canDeletePlantao={canDeletePlantao}
            />
          </TabsContent>

          <TabsContent value="cadastrar">
            <CreatePlantaoForm
              onSuccess={handlePlantaoCreated}
              userRole={user.role}
              userMunicipioId={userContext.municipio_id}
              userEscolaId={userContext.escola_id}
              userEstadoId={userContext.estado_id}
              userTurmas={userContext.turmas}
            />
          </TabsContent>
        </Tabs>
      )}

      {!canCreate && (
        <>
          {/* Filtros - overflow-visible para não cortar no mobile */}
          <Card className="overflow-visible">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <School className="h-5 w-5" />
                Filtros
              </CardTitle>
              <CardDescription>Filtre os plantões por escola, série ou disciplina</CardDescription>
            </CardHeader>
            <CardContent className="overflow-visible">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full min-w-0">
                <div className="space-y-2 min-w-0">
                  <label className="text-sm font-medium">Escola</label>
                  <Select
                    value={filters.school || 'all'}
                    onValueChange={(value) => {
                      setFilters({
                        ...filters,
                        school: value === 'all' ? undefined : value,
                      });
                    }}
                  >
                    <SelectTrigger className="w-full min-w-0">
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

                <div className="space-y-2 min-w-0">
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
                    <SelectTrigger className="w-full min-w-0">
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

                <div className="space-y-2 min-w-0">
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
                    <SelectTrigger className="w-full min-w-0">
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

          {/* Lista de Plantões */}
          <PlantaoList 
            plantoes={plantoes} 
            isLoading={isLoading} 
            onPlantaoClick={handlePlantaoClick}
            onDeletePlantao={handleDeletePlantao}
            userRole={user.role}
            canDeletePlantao={canDeletePlantao}
          />
        </>
      )}
    </div>
  );
}
