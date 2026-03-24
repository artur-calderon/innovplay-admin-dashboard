import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/authContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Search, Trash2, Building, Loader2, GraduationCap, Settings, School, Users } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import SchoolForm from "@/components/schools/SchoolForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Turmas from "@/pages/Turmas";
import { InstituicaoUsersTab } from "@/components/schools/InstituicaoUsersTab";
import { getUserHierarchyContext } from "@/utils/userHierarchy";

interface City {
  id: string;
  name: string;
  state: string;
}

interface CityWithSlug extends City {
  slug?: string;
}

interface Instituicao {
  id: string;
  name: string;
  address?: string;
  domain?: string;
  city_id?: string;
  city?: {
    id: string;
    name: string;
    state: string;
  };
  created_at?: string;
}

interface Class {
  id: string;
  name: string;
  school_id: string;
  grade_id: string;
  grade?: {
    id: string;
    name: string;
  };
}

interface Teacher {
  id: string;
  name: string;
  email: string;
  registration?: string;
  birth_date?: string;
}

interface Student {
  id: string;
  name: string;
  registration?: string;
  birth_date?: string;
  user?: {
    email: string;
  };
}

export default function Gestao() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [instituicoes, setInstituicoes] = useState<Instituicao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedInstituicao, setSelectedInstituicao] = useState<Instituicao | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [instituicaoToDelete, setInstituicaoToDelete] = useState<Instituicao | null>(null);
  const [selectedInstituicaoForDetails, setSelectedInstituicaoForDetails] = useState<Instituicao | null>(null);
  
  // Estados para detalhes da instituição
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  // Estados para responsividade
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [sortBy, setSortBy] = useState<'name' | 'city' | 'domain'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  // Filtros: Estado, Município e Escola
  const [selectedState, setSelectedState] = useState<string>("ALL");
  const [selectedCityId, setSelectedCityId] = useState<string>("ALL");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("ALL");
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<string>(
    tabParam === "turmas" ? "turmas" : tabParam === "usuarios" ? "usuarios" : "instituicoes"
  );
  const [selectedUsersCityId, setSelectedUsersCityId] = useState<string>("");
  const [citiesWithSlug, setCitiesWithSlug] = useState<CityWithSlug[]>([]);
  const [domainCityId, setDomainCityId] = useState<string>("");

  useEffect(() => {
    if (tabParam === "turmas") setActiveTab("turmas");
    else if (tabParam === "usuarios") setActiveTab("usuarios");
  }, [tabParam]);

  const { toast } = useToast();

  // Buscar cidades com slug para detectar município do subdomínio
  useEffect(() => {
    api.get("/city/").then((res) => {
      let list = res.data || [];
      if (user.role !== "admin") {
        list = list.filter((c: CityWithSlug) => c.id === user.tenant_id);
      }
      setCitiesWithSlug(Array.isArray(list) ? list : []);
    }).catch(() => setCitiesWithSlug([]));
  }, [user.role, user.tenant_id]);

  // Detectar município pelo subdomínio (jiparana.afirmeplay.com.br ou jiparana.localhost)
  useEffect(() => {
    if (typeof window === "undefined" || !citiesWithSlug.length) return;
    const hostname = window.location.hostname;
    const parts = hostname.split(".");
    const first = (parts[0] || "").toLowerCase();
    const reserved = ["www", "localhost", "127", "app"];
    const isSubdomain = parts.length >= 2 && first && !reserved.includes(first);
    const subdomain = isSubdomain ? first : "";
    if (!subdomain) {
      setDomainCityId("");
      return;
    }
    const city = citiesWithSlug.find((c) => (c.slug || "").toLowerCase() === subdomain);
    if (city) {
      setDomainCityId(city.id);
      setSelectedUsersCityId(city.id);
    } else {
      setDomainCityId("");
    }
  }, [citiesWithSlug]);

  // Professor: definir município da escola como padrão na aba Usuários (evita "Nenhum município definido")
  useEffect(() => {
    if (user?.role !== "professor" || !user?.id) return;
    let cancelled = false;
    getUserHierarchyContext(user.id, user.role).then((ctx) => {
      if (cancelled) return;
      const cityId = ctx.municipality?.id ?? ctx.school?.municipality_id ?? "";
      if (cityId) {
        setSelectedUsersCityId((prev) => (prev ? prev : cityId));
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [user?.id, user?.role]);

  const fetchInstituicoes = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/school");
      setInstituicoes(response.data);
    } catch (error) {
      console.error("Erro ao buscar instituições:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar instituições",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const fetchInstituicaoDetails = useCallback(async (schoolId: string) => {
    setIsLoadingDetails(true);
    try {
      // Buscar turmas
      const classesResponse = await api.get(`/classes/school/${schoolId}`);
      setClasses(classesResponse.data || []);

      // Buscar professores
      const teachersResponse = await api.get(`/teacher/school/${schoolId}`);
      setTeachers(Array.isArray(teachersResponse.data) ? teachersResponse.data : []);

      // Buscar alunos
      const studentsResponse = await api.get(`/students/school/${schoolId}`);
      setStudents(studentsResponse.data || []);
    } catch (error) {
      console.error("Erro ao buscar detalhes da instituição:", error);
      toast({
        title: "Erro",
        description: user.role === 'professor' 
          ? "Erro ao carregar detalhes da sua instituição" 
          : "Erro ao carregar detalhes da instituição",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDetails(false);
    }
  }, [toast, user.role]);

  useEffect(() => {
    fetchInstituicoes();
  }, [fetchInstituicoes]);

  useEffect(() => {
    if (selectedInstituicaoForDetails) {
      fetchInstituicaoDetails(selectedInstituicaoForDetails.id);
    }
  }, [selectedInstituicaoForDetails, fetchInstituicaoDetails]);

  const handleSaveInstituicao = async (instituicao: Partial<Instituicao>) => {
    setIsSaving(true);
    try {
      if (!instituicao.name?.trim() || !instituicao.address?.trim() || !instituicao.city_id) {
        toast({
          title: "Campos obrigatórios",
          description: "Informe nome, endereço e município antes de salvar.",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      if (selectedInstituicao) {
        // Atualizar instituição existente
        const response = await api.put(`/school/${selectedInstituicao.id}`, instituicao);
        setInstituicoes(instituicoes.map(i => i.id === selectedInstituicao.id ? response.data : i));
        toast({
          title: "Sucesso",
          description: "Instituição atualizada com sucesso",
        });
      } else {
        // Adicionar nova instituição
        const response = await api.post("/school", instituicao);
        await fetchInstituicoes(); // Recarrega a lista completa
        toast({
          title: "Sucesso",
          description: "Instituição criada com sucesso",
        });
      }
      setIsAddDialogOpen(false);
      setSelectedInstituicao(null);
    } catch (error: unknown) {
      console.error("Erro ao salvar instituição:", error);
      let errorMessage = "Erro ao salvar instituição";

      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { campos_faltantes?: string[] } } };
        if (axiosError.response?.data?.campos_faltantes) {
          const campos = axiosError.response.data.campos_faltantes.join(", ");
          errorMessage = `Campos obrigatórios faltando: ${campos}`;
        }
      }

      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteInstituicao = async (instituicaoId: string) => {
    setIsDeleting(true);
    try {
      await api.delete(`/school/${instituicaoId}`);
      await fetchInstituicoes(); // Recarrega a lista completa
      setInstituicaoToDelete(null);
      setIsDeleteDialogOpen(false);
      toast({
        title: "Sucesso",
        description: "Instituição excluída com sucesso",
      });
    } catch (error: unknown) {
      console.error("Erro ao excluir instituição:", error);
      
      let errorTitle = "Erro ao excluir";
      let errorMessage = "Ocorreu um erro ao excluir a instituição";

      // Verificar se é um erro do Axios com resposta
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { 
          response?: { 
            status?: number;
            data?: { 
              mensagem?: string; 
              erro?: string;
              dependencias?: {
                turmas?: number;
                professores?: number;
                alunos?: number;
              }
            } 
          } 
        };
        
        if (axiosError.response?.data) {
          const data = axiosError.response.data;
          
          // Se houver mensagem específica do backend, usar ela
          if (data.mensagem) {
            errorMessage = data.mensagem;
            errorTitle = data.erro || "Não é possível excluir";
          } else if (data.erro) {
            errorMessage = data.erro;
          }
        }
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewInstituicao = (instituicaoId: string) => {
    navigate(`/app/escola/${instituicaoId}`);
  };

  const handleManageDetails = (instituicao: Instituicao) => {
    setSelectedInstituicaoForDetails(instituicao);
  };

  const handleTeacherAdded = () => {
    if (selectedInstituicaoForDetails) {
      fetchInstituicaoDetails(selectedInstituicaoForDetails.id);
    }
  };

  const handleStudentAdded = () => {
    if (selectedInstituicaoForDetails) {
      fetchInstituicaoDetails(selectedInstituicaoForDetails.id);
    }
  };

  // Função para ordenar instituições
  const sortInstituicoes = (data: Instituicao[]) => {
    return [...data].sort((a, b) => {
      let aValue = '';
      let bValue = '';

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'city':
          aValue = (a.city?.name || '').toLowerCase();
          bValue = (b.city?.name || '').toLowerCase();
          break;
        case 'domain':
          aValue = (a.domain || '').toLowerCase();
          bValue = (b.domain || '').toLowerCase();
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
  };

  // Opções disponíveis para filtros
  const availableStates: string[] = Array.from(
    new Set(
      instituicoes
        .map((i) => i.city?.state)
        .filter((s): s is string => Boolean(s))
    )
  ).sort();

  const availableCities: City[] = (() => {
    const map = new Map<string, City>();
    for (const inst of instituicoes) {
      if (inst.city && (selectedState === 'ALL' || inst.city.state === selectedState)) {
        map.set(inst.city.id, inst.city);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  })();

  const availableSchools: Instituicao[] = instituicoes
    .filter((i) => (selectedState === 'ALL' || i.city?.state === selectedState))
    .filter((i) => (selectedCityId === 'ALL' || i.city_id === selectedCityId))
    .sort((a, b) => a.name.localeCompare(b.name));

  const filteredAndSortedInstituicoes = sortInstituicoes(
    instituicoes
      .filter((instituicao) =>
        instituicao.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (instituicao.address || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (instituicao.domain || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (instituicao.city?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter((i) => (selectedState === 'ALL' || i.city?.state === selectedState))
      .filter((i) => (selectedCityId === 'ALL' || i.city_id === selectedCityId))
      .filter((i) => (selectedSchoolId === 'ALL' || i.id === selectedSchoolId))
  );

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-5 w-48" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Skeleton className="h-10 w-full sm:w-64" />
          <Skeleton className="h-10 w-24" />
        </div>

        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-6 w-12" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-4 w-24" />
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header unificado — mobile: título/desc alinhados */}
      <div className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex flex-wrap items-center gap-2 sm:gap-3">
          <School className="w-7 h-7 sm:w-8 sm:h-8 text-primary shrink-0" />
          Gestão Escolar
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base max-w-2xl">
          Gerencie escolas, turmas e usuários (alunos, professores, diretores e coordenadores) em um só lugar.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3 h-11 bg-muted/50">
          <TabsTrigger value="instituicoes" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            <span className="hidden sm:inline">Escolas</span>
          </TabsTrigger>
          <TabsTrigger value="turmas" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            <span className="hidden sm:inline">Turmas</span>
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Usuários</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="instituicoes" className="space-y-6 mt-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <p className="text-muted-foreground text-sm">
              Liste as instituições de ensino, filtre por estado e município e acesse o gerenciamento completo em &quot;Gerenciar&quot;.
            </p>
            {(user.role === 'admin' || user.role === 'tecadm') && (
              <Button onClick={() => setIsAddDialogOpen(true)} className="w-full sm:w-auto shrink-0">
                <PlusCircle className="h-4 w-4 mr-2" />
                Nova Instituição
              </Button>
            )}
          </div>

      {/* Search and Filters */}
      <div className="space-y-3 sm:space-y-4">
        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar instituições por nome, cidade ou domínio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11"
          />
        </div>

        {/* Filters Row */}
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Location Filters */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1">
            <Select
              value={selectedState}
              onValueChange={(value) => {
                setSelectedState(value);
                setSelectedCityId('ALL');
                setSelectedSchoolId('ALL');
              }}
            >
              <SelectTrigger className="h-10 w-full sm:w-auto sm:min-w-[140px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Estados</SelectItem>
                {availableStates.map((state) => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedCityId}
              onValueChange={(value) => {
                setSelectedCityId(value);
                setSelectedSchoolId('ALL');
              }}
              disabled={availableCities.length === 0}
            >
              <SelectTrigger className="h-10 w-full sm:w-auto sm:min-w-[160px]">
                <SelectValue placeholder="Município" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Municípios</SelectItem>
                {availableCities.map((city) => (
                  <SelectItem key={city.id} value={city.id}>{city.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedSchoolId}
              onValueChange={(value) => setSelectedSchoolId(value)}
              disabled={availableSchools.length === 0}
            >
              <SelectTrigger className="h-10 w-full sm:w-auto sm:min-w-[160px]">
                <SelectValue placeholder="Escola" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas as Escolas</SelectItem>
                {availableSchools.map((sch) => (
                  <SelectItem key={sch.id} value={sch.id}>{sch.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort and View Options */}
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Select value={sortBy} onValueChange={(value: 'name' | 'city' | 'domain') => setSortBy(value)}>
              <SelectTrigger className="h-10 w-auto min-w-[140px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Nome</SelectItem>
                <SelectItem value="city">Cidade</SelectItem>
                <SelectItem value="domain">Domínio</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="h-10 w-10 p-0 flex-shrink-0"
              title={sortOrder === 'asc' ? 'Ordenação Crescente' : 'Ordenação Decrescente'}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
              className="h-10 px-4"
            >
              {viewMode === 'cards' ? 'Tabela' : 'Cards'}
            </Button>
            
            <Button
              variant="outline"
              onClick={fetchInstituicoes}
              disabled={isLoading}
              className="h-10 px-4"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Atualizar"
              )}
            </Button>
          </div>
        </div>
      </div>

             {/* Content */}
       <div className="space-y-4">
          {/* View Mode Toggle */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {filteredAndSortedInstituicoes.length} {filteredAndSortedInstituicoes.length === 1 ? 'instituição encontrada' : 'instituições encontradas'}
            </p>
          </div>

          {/* Cards View */}
                     {viewMode === 'cards' && (
             <div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
              {filteredAndSortedInstituicoes.map((instituicao) => (
                                 <Card key={instituicao.id} className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
                   <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                     <CardTitle className="text-base md:text-lg font-semibold flex items-start gap-2 min-w-0 flex-1">
                       <Building className="h-4 w-4 md:h-5 md:w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                       <span className="break-words">{instituicao.name}</span>
                     </CardTitle>
                     <Badge variant="default" className="text-xs flex-shrink-0 ml-2">
                       Ativa
                     </Badge>
                   </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          {instituicao.city?.name ? `${instituicao.city.name} - ${instituicao.city.state}` : "Localização não definida"}
                        </p>
                        {instituicao.domain && (
                          <p className="text-xs md:text-sm text-muted-foreground">
                            Domínio: {instituicao.domain}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 md:gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewInstituicao(instituicao.id)}
                          className="text-xs h-7 md:h-8"
                        >
                                                     <Settings className="h-3 w-3 mr-1" />
                           <span className="hidden sm:inline">Gerenciar</span>
                        </Button>

                        {user.role === 'admin' && (
                          <>

                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setInstituicaoToDelete(instituicao);
                                setIsDeleteDialogOpen(true);
                              }}
                              className="text-xs h-7 md:h-8 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              <span className="hidden sm:inline">Excluir</span>
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Instituição</TableHead>
                      <TableHead>Cidade</TableHead>
                      <TableHead>Domínio</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedInstituicoes.map((instituicao) => (
                      <TableRow key={instituicao.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-orange-600" />
                            {instituicao.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          {instituicao.city?.name ? `${instituicao.city.name} - ${instituicao.city.state}` : "-"}
                        </TableCell>
                        <TableCell>{instituicao.domain || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                                                         <Button 
                               variant="outline" 
                               size="sm"
                               onClick={() => handleViewInstituicao(instituicao.id)}
                             >
                               <Settings className="h-3 w-3" />
                             </Button>

                            {user.role === 'admin' && (
                              <>

                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    setInstituicaoToDelete(instituicao);
                                    setIsDeleteDialogOpen(true);
                                  }}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredAndSortedInstituicoes.length === 0 && !isLoading && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <Building className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-center">
                  {searchTerm 
                    ? "Nenhuma instituição encontrada" 
                    : user.role === 'professor' 
                      ? "Você não está cadastrado em uma instituição!"
                      : "Nenhuma instituição cadastrada"}
                </h3>
                <p className="text-muted-foreground text-center mb-4 max-w-md">
                  {searchTerm 
                    ? "Tente ajustar sua pesquisa ou verificar os filtros aplicados" 
                    : user.role === 'professor'
                      ? "Entre em contato com o diretor ou coordenador da sua escola para visualizar a sua escola"
                      : "Não há instituições cadastradas no sistema."}
                </p>
                {!searchTerm && (user.role === 'admin' || user.role === 'tecadm') && (
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Nova Instituição
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
        </TabsContent>

        <TabsContent value="turmas" className="mt-6">
          <Turmas embedded />
        </TabsContent>

        <TabsContent value="usuarios" className="mt-6">
          <InstituicaoUsersTab
            cityId={
              user.role === "tecadm"
                ? (user.tenant_id ?? null)
                : (selectedUsersCityId || null)
            }
            cities={(citiesWithSlug.length > 0 ? citiesWithSlug : availableCities).map((c) => ({ id: c.id, name: c.name }))}
            selectedCityId={selectedUsersCityId}
            onCityChange={setSelectedUsersCityId}
            isAdmin={user.role === "admin"}
          />
        </TabsContent>
      </Tabs>

      {/* Add/Edit Escola Dialog (página Gestão Escolar) */}
      {(isAddDialogOpen || selectedInstituicao) && (
        <SchoolForm
          school={selectedInstituicao ? {
            id: selectedInstituicao.id,
            name: selectedInstituicao.name,
            city_id: selectedInstituicao.city_id || '',
            address: selectedInstituicao.address || '',
            domain: selectedInstituicao.domain || '',
            created_at: selectedInstituicao.created_at || '',
            city: selectedInstituicao.city ? {
              id: selectedInstituicao.city.id,
              name: selectedInstituicao.city.name,
              state: selectedInstituicao.city.state,
              created_at: ''
            } : { id: '', name: '', state: '', created_at: '' }
          } : undefined}
          onClose={() => {
            setIsAddDialogOpen(false);
            setSelectedInstituicao(null);
          }}
          onSave={handleSaveInstituicao}
          isLoading={isSaving}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => {
        if (!open && !isDeleting) {
          setIsDeleteDialogOpen(false);
          setInstituicaoToDelete(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a
              instituição {instituicaoToDelete?.name} e removerá os dados associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setInstituicaoToDelete(null);
                setIsDeleteDialogOpen(false);
              }}
              disabled={isDeleting}
            >
              Cancelar
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => instituicaoToDelete && handleDeleteInstituicao(instituicaoToDelete.id)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 