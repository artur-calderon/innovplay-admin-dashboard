import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/authContext";
import { UserPlus, Eye, Pencil, Trash2, Edit, Loader2, ArrowLeft, Building, Users, GraduationCap, MapPin, Globe, Calendar, Plus, BookOpen, School, Upload, FileSpreadsheet } from "lucide-react";
import { AddUserForm } from "./AddUserForm";
import { CreateClassForm } from "./CreateClassForm";
import { LinkTeacherModal } from "./LinkTeacherModal";
import { LinkStudentModal } from "./LinkStudentModal";
import { ManageClassModal } from "./ManageClassModal";
import { LinkDirectorCoordinatorModal } from "./LinkDirectorCoordinatorModal";
import { ManageSchoolLinksModal } from "./ManageSchoolLinksModal";
import { BulkUploadStudentsModal } from "./BulkUploadStudentsModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import SchoolForm from "./SchoolForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getRoleDisplayName } from "@/lib/constants";

interface City {
  id: string;
  name: string;
  state: string;
  created_at: string;
}

interface School {
  id: string;
  name: string;
  city_id: string;
  address: string;
  domain: string;
  created_at: string;
  city: City;
}

interface Class {
  id: string;
  name: string;
  grade?: string | { id: string; name: string; education_stage: any };
  teachers?: Teacher[];
  students?: Student[];
}

interface Teacher {
  id: string;
  name: string;
  email: string;
  registration?: string;
  birth_date?: string;
  role?: string;
  class_id?: string;
}

interface Student {
  id: string;
  name: string;
  email?: string;
  registration?: string;
  birth_date?: string;
  user?: {
    email: string;
  };
  class_id?: string;
}

export default function SchoolDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [school, setSchool] = useState<School | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [directors, setDirectors] = useState<Teacher[]>([]);
  const [coordinators, setCoordinators] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLoadingSchool, setIsLoadingSchool] = useState(true);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [selectedDirectors, setSelectedDirectors] = useState<string[]>([]);
  const [selectedCoordinators, setSelectedCoordinators] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [showManageClassModal, setShowManageClassModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [classTeachers, setClassTeachers] = useState<{[key: string]: Teacher[]}>({});
  const [classStudents, setClassStudents] = useState<{[key: string]: Student[]}>({});
  const [showLinkDirectorModal, setShowLinkDirectorModal] = useState(false);
  const [showLinkCoordinatorModal, setShowLinkCoordinatorModal] = useState(false);
  const [showManageSchoolLinksModal, setShowManageSchoolLinksModal] = useState(false);
  const [showLinkTeacherModal, setShowLinkTeacherModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);

  useEffect(() => {
    const fetchSchool = async () => {
      if (!id) return;
      setIsLoadingSchool(true);
      try {
        const response = await api.get(`/school/${id}`);
        setSchool(response.data);
      } catch (error) {
        console.error("Error fetching school:", error);
        toast({
          title: "Erro",
          description: user.role === 'professor' 
            ? "Você não tem acesso a esta instituição ou ela não existe" 
            : "Escola não encontrada",
          variant: "destructive",
        });
        navigate("/app/cadastros/instituicao");
      } finally {
        setIsLoadingSchool(false);
      }
    };

    fetchSchool();
  }, [id, navigate, toast]);

  // Carregar turmas da escola
  useEffect(() => {
    const fetchClasses = async () => {
      if (!id) return;
      
      setIsLoadingClasses(true);
      try {
        console.log('🏫 Buscando turmas da escola:', id);
        const response = await api.get(`/classes/school/${id}`);
        console.log('🏫 Response turmas:', response);
        console.log('🏫 Data turmas:', response.data);
        const classesData = response.data || [];
        setClasses(classesData);
        
        // Buscar professores e alunos de cada turma
        if (classesData.length > 0) {
          await fetchClassDetails(classesData);
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
        setClasses([]);
      } finally {
        setIsLoadingClasses(false);
      }
    };

    fetchClasses();
  }, [id]);

  // Função para buscar detalhes de professores e alunos de cada turma
  const fetchClassDetails = async (classesData: Class[]) => {
    const teachersData: {[key: string]: Teacher[]} = {};
    const studentsData: {[key: string]: Student[]} = {};

    try {
      // Buscar dados de todas as turmas em paralelo
      const promises = classesData.map(async (classItem) => {
        try {
          // Buscar professores da turma
          const teachersResponse = await api.get(`/classes/${classItem.id}/teachers`);
          let classTeachers = [];
          
          if (teachersResponse.data && teachersResponse.data.professores) {
            classTeachers = teachersResponse.data.professores.map((item: any) => ({
              id: item.professor?.id || item.usuario?.id,
              name: item.professor?.name || item.usuario?.name,
              email: item.professor?.email || item.usuario?.email,
              registration: item.professor?.registration || item.usuario?.registration,
              role: item.usuario?.role || 'professor',
              class_id: classItem.id,
              vinculo_id: item.teacher_class?.id || item.vinculo_turma?.teacher_class_id
            }));
          }
          
          // Buscar alunos da turma
          const studentsResponse = await api.get(`/students/classes/${classItem.id}`);
          const classStudents = Array.isArray(studentsResponse.data) ? studentsResponse.data.map((student: any) => ({
            id: student.id,
            name: student.name,
            email: student.email || student.user?.email,
            registration: student.registration,
            user: student.user,
            class_id: student.class_id
          })) : [];

          return {
            classId: classItem.id,
            teachers: classTeachers,
            students: classStudents
          };
        } catch (error) {
          console.error(`Erro ao buscar detalhes da turma ${classItem.id}:`, error);
          return {
            classId: classItem.id,
            teachers: [],
            students: []
          };
        }
      });

      const results = await Promise.all(promises);
      
      // Organizar dados por turma
      results.forEach(({ classId, teachers, students }) => {
        teachersData[classId] = teachers;
        studentsData[classId] = students;
      });

      setClassTeachers(teachersData);
      setClassStudents(studentsData);
      
      console.log('📊 Dados das turmas carregados:', { teachersData, studentsData });
    } catch (error) {
      console.error('Erro ao buscar detalhes das turmas:', error);
    }
  };

  useEffect(() => {
    const fetchTeachers = async () => {
      if (!id) return;

      try {
        console.log('👨‍🏫 Buscando professores da escola:', id);
        const response = await api.get(`/school-teacher`);
        console.log('👨‍🏫 Response professores:', response);
        console.log('👨‍🏫 Data professores:', response.data);
        console.log('👨‍🏫 RETORNO COMPLETO DA API /school-teacher:', JSON.stringify(response.data, null, 2));
        
        // A API retorna um objeto com 'vinculos', não um array direto
        const vinculos = response.data?.vinculos || [];
        console.log('👨‍🏫 Vínculos encontrados:', vinculos);
        
        // Mapear os vínculos para o formato esperado pelo componente
        const allTeachers = vinculos.map(vinculo => ({
          id: vinculo.professor.id,
          name: vinculo.professor.name,
          email: vinculo.professor.email,
          registration: vinculo.registration,
          school_id: vinculo.school_id,
          teacher_id: vinculo.teacher_id,
          role: 'professor' // Assumindo que todos são professores
        }));
        
        console.log('👨‍🏫 Todos os professores mapeados:', allTeachers);
        
        // Filtrar apenas professores da escola específica
        const teachers = allTeachers.filter(teacher => 
          teacher.school_id === id
        );
        
        console.log('👨‍🏫 Professores filtrados para a escola:', teachers);
        
        setTeachers(teachers);
      } catch (error) {
        console.error("Error fetching teachers:", error);
        toast({
          title: "Erro",
          description: "Erro ao carregar professores",
          variant: "destructive",
        });
        setTeachers([]);
      }
    };

    fetchTeachers();
  }, [id, toast]);

  // Buscar managers da escola
  useEffect(() => {
    const fetchSchoolManagers = async () => {
      if (!id) return;

      try {
        console.log('🔗 Buscando managers da escola:', id);
        const response = await api.get(`/managers/school/${id}`);
        console.log('🔗 Response managers:', response);
        console.log('🔗 Data managers:', response.data);
        
        if (response.data && response.data.managers) {
          console.log('🔗 Managers da escola:', response.data.managers);
          
          // Separar por tipo de usuário
          const schoolDirectors = response.data.managers.filter((manager: any) => 
            manager.user?.role === 'diretor'
          );
          const schoolCoordinators = response.data.managers.filter((manager: any) => 
            manager.user?.role === 'coordenador'
          );
          
          console.log('🔗 Diretores da escola:', schoolDirectors);
          console.log('🔗 Coordenadores da escola:', schoolCoordinators);
          
          // Atualizar estados com os dados dos managers
          const directorsData = schoolDirectors.map((manager: any) => ({
            id: manager.user.id,
            name: manager.user.name,
            email: manager.user.email,
            registration: manager.user.registration,
            role: manager.user.role
          }));
          
          const coordinatorsData = schoolCoordinators.map((manager: any) => ({
            id: manager.user.id,
            name: manager.user.name,
            email: manager.user.email,
            registration: manager.user.registration,
            role: manager.user.role
          }));
          
          setDirectors(directorsData);
          setCoordinators(coordinatorsData);
        }
      } catch (error) {
        console.error("Error fetching school managers:", error);
      }
    };

    fetchSchoolManagers();
  }, [id, toast]);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!id) return;

      try {
        console.log('👥 Buscando alunos da escola:', id);
        const response = await api.get(`/students/school/${id}`);
        console.log('👥 Response alunos:', response);
        console.log('👥 Data alunos:', response.data);
        
        const allStudents = Array.isArray(response.data) ? response.data : [];
        console.log('👥 Todos os alunos:', allStudents);
        
        setStudents(allStudents);
      } catch (error) {
        console.error("Error fetching students:", error);
        toast({
          title: "Erro",
          description: "Erro ao carregar alunos",
          variant: "destructive",
        });
        setStudents([]);
      }
    };

    fetchStudents();
  }, [id, toast]);

  const handleRemoveTeacher = async (teacherId: string) => {
    if (!id) return;

    try {
      await api.delete(`/school-teacher/${teacherId}`);
      toast({
        title: "Sucesso",
        description: "Professor removido com sucesso.",
      });
      
      // Recarregar lista de professores
      const response = await api.get(`/school-teacher`);
      const vinculos = response.data?.vinculos || [];
      const allTeachers = vinculos.map(vinculo => ({
        id: vinculo.professor.id,
        name: vinculo.professor.name,
        email: vinculo.professor.email,
        registration: vinculo.registration,
        school_id: vinculo.school_id,
        teacher_id: vinculo.teacher_id,
        role: 'professor'
      }));
      const teachers = allTeachers.filter(teacher => 
        teacher.school_id === id
      );
      setTeachers(teachers);
    } catch (error) {
      console.error("Erro ao remover professor:", error);
      toast({
        title: "Erro",
        description: "Erro ao remover professor",
        variant: "destructive",
      });
    }
  };

  if (isLoadingSchool) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando detalhes da instituição...</p>
        </div>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="text-center py-8">
        <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {user.role === 'professor' ? "Instituição não encontrada" : "Escola não encontrada"}
        </h2>
        <p className="text-gray-500 mb-4">
          {user.role === 'professor' 
            ? "A instituição que você está procurando não existe ou você não tem acesso a ela. Entre em contato com o diretor ou coordenador da sua escola."
            : "A escola que você está procurando não existe ou foi removida."}
        </p>
        <Button onClick={() => navigate("/app/cadastros/instituicao")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Instituições
        </Button>
      </div>
    );
  }





  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <Button
            variant="outline"
            onClick={() => navigate("/app/cadastros/instituicao")}
            className="shrink-0 w-full sm:w-auto"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2 break-words">
              <Building className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 flex-shrink-0" />
              <span className="truncate">{school.name}</span>
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              {school.city.name} - {school.city.state}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{directors.length + coordinators.length + teachers.length + students.length}</div>
            <p className="text-xs text-muted-foreground">
              {directors.length + coordinators.length + teachers.length + students.length === 1 ? 'usuário cadastrado' : 'usuários cadastrados'}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Turmas</CardTitle>
            <BookOpen className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classes.length}</div>
            <p className="text-xs text-muted-foreground">
              {classes.length === 1 ? 'turma ativa' : 'turmas ativas'}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Professores</CardTitle>
            <GraduationCap className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teachers.length}</div>
            <p className="text-xs text-muted-foreground">
              {teachers.filter(teacher => !teacher.class_id).length} sem turma
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Badge variant="default" className="text-xs">
              Ativa
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">✓</div>
            <p className="text-xs text-muted-foreground">
              Instituição ativa
            </p>
          </CardContent>
        </Card>
      </div>

      {/* School Information */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Building className="h-5 w-5 text-orange-600" />
              Informações da Instituição
            </CardTitle>
            {(user.role === 'admin' || user.role === 'tecadm' || user.role === 'diretor' || user.role === 'coordenador') && (
              <Button onClick={() => setIsEditDialogOpen(true)} variant="outline" size="sm" className="w-full sm:w-auto">
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Building className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-500">Nome da Instituição</p>
                  <p className="text-sm text-gray-900 break-words">{school.name}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-500">Localização</p>
                  <p className="text-sm text-gray-900 break-words">{school.city.name} - {school.city.state}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-500">Endereço</p>
                  <p className="text-sm text-gray-900 break-words">{school.address || "Não informado"}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Globe className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-500">Domínio</p>
                  <p className="text-sm text-gray-900 break-words">{school.domain || "Não informado"}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="classes">Turmas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* School Management Section */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
                          <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Building className="h-5 w-5 text-red-600" />
                  Gestão da Escola
                </CardTitle>
                <CardDescription>
                  Diretores e coordenadores responsáveis pela gestão da instituição
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {(user.role === 'admin' || user.role === 'tecadm' || user.role === 'diretor' || user.role === 'coordenador') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkUploadModal(true)}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Importar Alunos
                  </Button>
                )}
                {(user.role === 'admin' || user.role === 'tecadm' || user.role === 'diretor' || user.role === 'coordenador') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowManageSchoolLinksModal(true)}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Gerenciar
                  </Button>
                )}
              </div>
            </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Directors */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Users className="h-4 w-4 text-red-600" />
                    Diretores ({directors.length})
                  </h4>
                  {(user.role === 'admin' || user.role === 'tecadm' || user.role === 'diretor' || user.role === 'coordenador') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowLinkDirectorModal(true)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Adicionar
                    </Button>
                  )}
                </div>
                {directors.length === 0 ? (
                  <div className="text-center py-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Nenhum diretor cadastrado</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {directors.map((director) => (
                      <div key={director.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{director.name}</div>
                          <div className="text-xs text-muted-foreground">{director.email}</div>
                        </div>
                        <Badge variant="outline" className="text-xs">Diretor</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Coordinators */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Users className="h-4 w-4 text-orange-600" />
                    Coordenadores ({coordinators.length})
                  </h4>
                  {(user.role === 'admin' || user.role === 'tecadm' || user.role === 'diretor' || user.role === 'coordenador') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowLinkCoordinatorModal(true)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Adicionar
                    </Button>
                  )}
                </div>
                {coordinators.length === 0 ? (
                  <div className="text-center py-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Nenhum coordenador cadastrado</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {coordinators.map((coordinator) => (
                      <div key={coordinator.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{coordinator.name}</div>
                          <div className="text-xs text-muted-foreground">{coordinator.email}</div>
                        </div>
                        <Badge variant="outline" className="text-xs">Coordenador</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Classes Overview */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <BookOpen className="h-5 w-5 text-green-600" />
                Turmas da Escola
              </CardTitle>
              <CardDescription>
                Turmas onde professores e alunos são vinculados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingClasses ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Carregando turmas...</p>
                </div>
              ) : classes.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma turma cadastrada</h3>
                                     <p className="text-muted-foreground mb-4 text-sm">Crie turmas para organizar professores e alunos</p>
                   {(user.role === 'admin' || user.role === 'tecadm' || user.role === 'diretor' || user.role === 'coordenador') && (
                     <CreateClassForm
                       schoolId={school.id}
                       schoolName={school.name}
                       onSuccess={() => {
                         // Recarregar turmas
                         window.location.reload();
                       }}
                     />
                   )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {classes.map((classItem) => {
                    return (
                      <div key={classItem.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-sm">{classItem.name}</h4>
                          {classItem.grade && (
                            <Badge variant="secondary" className="text-xs">
                              {typeof classItem.grade === 'object' && classItem.grade !== null ? (classItem.grade as any).name : classItem.grade}
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="h-3 w-3" />
                            <span>Professores: {classTeachers[classItem.id]?.length || 0}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3" />
                            <span>Alunos: {classStudents[classItem.id]?.length || 0}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="classes" className="space-y-6">
          {/* Classes Management */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <BookOpen className="h-5 w-5 text-green-600" />
                    Gerenciamento de Turmas
                  </CardTitle>
                  <CardDescription>
                    Organize professores e alunos por turmas
                  </CardDescription>
                </div>
                                 {(user.role === 'admin' || user.role === 'tecadm' || user.role === 'diretor' || user.role === 'coordenador') && (
                                   <CreateClassForm
                                     schoolId={school.id}
                                     schoolName={school.name}
                                     onSuccess={() => {
                                       // Recarregar turmas
                                       window.location.reload();
                                     }}
                                   />
                                 )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingClasses ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Carregando turmas...</p>
                </div>
              ) : classes.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma turma cadastrada</h3>
                  <p className="text-muted-foreground mb-4 text-sm">Crie turmas para organizar professores e alunos</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {classes.map((classItem) => {
                    return (
                      <div key={classItem.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="font-medium text-lg">{classItem.name}</h4>
                            {classItem.grade && (
                              <p className="text-sm text-muted-foreground">
                                Série: {typeof classItem.grade === 'object' && classItem.grade !== null ? (classItem.grade as any).name : classItem.grade}
                              </p>
                            )}
                          </div>
                          {(user.role === 'admin' || user.role === 'tecadm' || user.role === 'diretor' || user.role === 'coordenador') && (
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedClass(classItem);
                                  setShowManageClassModal(true);
                                }}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Gerenciar
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Teachers in this class */}
                          <div>
                            <h5 className="font-medium text-sm mb-3 flex items-center gap-2">
                              <GraduationCap className="h-4 w-4 text-blue-600" />
                              Professores ({classTeachers[classItem.id]?.length || 0})
                            </h5>
                            <div className="border rounded-lg p-3 max-h-32 overflow-y-auto">
                              {classTeachers[classItem.id]?.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center">
                                  Nenhum professor vinculado
                                </p>
                              ) : (
                                <div className="space-y-1">
                                  {classTeachers[classItem.id]?.slice(0, 3).map((teacher) => (
                                    <div key={teacher.id} className="text-xs text-muted-foreground truncate">
                                      {teacher.name}
                                    </div>
                                  ))}
                                  {classTeachers[classItem.id]?.length > 3 && (
                                    <div className="text-xs text-blue-600">
                                      +{classTeachers[classItem.id].length - 3} mais
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Students in this class */}
                          <div>
                            <h5 className="font-medium text-sm mb-3 flex items-center gap-2">
                              <Users className="h-4 w-4 text-green-600" />
                              Alunos ({classStudents[classItem.id]?.length || 0})
                            </h5>
                            <div className="border rounded-lg p-3 max-h-32 overflow-y-auto">
                              {classStudents[classItem.id]?.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center">
                                  Nenhum aluno vinculado
                                </p>
                              ) : (
                                <div className="space-y-1">
                                  {classStudents[classItem.id]?.slice(0, 3).map((student) => (
                                    <div key={student.id} className="text-xs text-muted-foreground truncate">
                                      {student.name}
                                    </div>
                                  ))}
                                  {classStudents[classItem.id]?.length > 3 && (
                                    <div className="text-xs text-blue-600">
                                      +{classStudents[classItem.id].length - 3} mais
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>


        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      {isEditDialogOpen && (
        <SchoolForm
          school={school}
          onClose={() => setIsEditDialogOpen(false)}
          onSave={(updatedSchool) => {
            if (school) {
              setSchool({ ...school, ...updatedSchool });
            }
            setIsEditDialogOpen(false);
          }}
        />
      )}

      {/* Manage Class Modal */}
      {showManageClassModal && selectedClass && (
        <ManageClassModal
          isOpen={showManageClassModal}
          onClose={() => {
            setShowManageClassModal(false);
            setSelectedClass(null);
          }}
          schoolId={school.id}
          classData={selectedClass}
          onSuccess={() => {
            // Recarregar dados das turmas
            if (classes.length > 0) {
              fetchClassDetails(classes);
            }
          }}
        />
      )}

      {/* Link Director Modal */}
      <LinkDirectorCoordinatorModal
        isOpen={showLinkDirectorModal}
        onClose={() => setShowLinkDirectorModal(false)}
        schoolId={school.id}
        schoolName={school.name}
        userType="diretor"
        onSuccess={() => {
          // Recarregar dados da escola
          window.location.reload();
        }}
      />

      {/* Link Coordinator Modal */}
      <LinkDirectorCoordinatorModal
        isOpen={showLinkCoordinatorModal}
        onClose={() => setShowLinkCoordinatorModal(false)}
        schoolId={school.id}
        schoolName={school.name}
        userType="coordenador"
        onSuccess={() => {
          // Recarregar dados da escola
          window.location.reload();
        }}
      />

      {/* Manage School Links Modal */}
      <ManageSchoolLinksModal
        isOpen={showManageSchoolLinksModal}
        onClose={() => setShowManageSchoolLinksModal(false)}
        schoolId={school.id}
        schoolName={school.name}
        onSuccess={() => {
          // Recarregar dados da escola
          window.location.reload();
        }}
      />

      {/* Bulk Upload Students Modal */}
      {showBulkUploadModal && (
        <BulkUploadStudentsModal
          isOpen={showBulkUploadModal}
          onClose={() => setShowBulkUploadModal(false)}
          schoolId={school.id}
          schoolName={school.name}
          onSuccess={() => {
            // Recarregar dados da escola
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}