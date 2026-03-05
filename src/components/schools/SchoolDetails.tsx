import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/authContext";
import { UserPlus, Eye, Pencil, Trash2, Edit, Loader2, ArrowLeft, Building, Users, GraduationCap, MapPin, Globe, Calendar, Plus, BookOpen, School, Upload, FileSpreadsheet, MoveRight } from "lucide-react";
import { AddUserForm } from "./AddUserForm";
import { CreateClassForm } from "./CreateClassForm";
import { LinkTeacherModal } from "./LinkTeacherModal";
import { LinkStudentModal } from "./LinkStudentModal";
import { ManageClassModal } from "./ManageClassModal";
import { LinkDirectorCoordinatorModal } from "./LinkDirectorCoordinatorModal";
import { ManageSchoolLinksModal } from "./ManageSchoolLinksModal";
import { BulkUploadStudentsModal } from "./BulkUploadStudentsModal";
import { PasswordReportModal } from "./PasswordReportModal";
import { SchoolCoursesTab } from "./SchoolCoursesTab";
import { InstituicaoDisciplinasTab } from "./InstituicaoDisciplinasTab";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [showPasswordReportModal, setShowPasswordReportModal] = useState(false);
  
  // Estados para gerenciamento de turmas
  const [showDeleteClassDialog, setShowDeleteClassDialog] = useState(false);
  const [showMoveClassDialog, setShowMoveClassDialog] = useState(false);
  const [classToDelete, setClassToDelete] = useState<Class | null>(null);
  const [classToMove, setClassToMove] = useState<Class | null>(null);
  const [targetSchoolId, setTargetSchoolId] = useState<string>("");
  const [availableSchools, setAvailableSchools] = useState<School[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    const fetchSchool = async () => {
      if (!id) return;
      setIsLoadingSchool(true);
      try {
        const response = await api.get(`/school/${id}`);
        setSchool(response.data);
      } catch (error) {
        toast({
          title: "Erro",
          description: user.role === 'professor' 
            ? "Você não tem acesso a esta instituição ou ela não existe" 
            : "Escola não encontrada",
          variant: "destructive",
        });
        navigate("/app/cadastros/gestao");
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
        const response = await api.get(`/classes/school/${id}`);
        const classesData = response.data || [];
        setClasses(classesData);
        
        // Buscar professores e alunos de cada turma
        if (classesData.length > 0) {
          await fetchClassDetails(classesData);
        }
      } catch (error) {
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
    } catch (error) {
      // Silenciar erro ao buscar detalhes das turmas
    }
  };

  useEffect(() => {
    const fetchTeachers = async () => {
      if (!id) return;

      try {
        const response = await api.get(`/school-teacher`);
        const vinculos = response.data?.vinculos || [];
        const allTeachers = vinculos.reduce((acc: any[], vinculo: any) => {
          const professor = vinculo?.professor;
          if (!professor) return acc;

          acc.push({
            id: professor.id,
            name: professor.name,
            email: professor.email,
            registration: vinculo.registration,
            school_id: vinculo.school_id,
            teacher_id: vinculo.teacher_id,
            role: "professor",
          });

          return acc;
        }, []);
        const teachers = allTeachers.filter(teacher => teacher.school_id === id);
        setTeachers(teachers);
      } catch (error) {
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
        const response = await api.get(`/managers/school/${id}`);
        if (response.data && response.data.managers) {
          const schoolDirectors = response.data.managers.filter((manager: any) =>
            manager.user?.role === 'diretor'
          );
          const schoolCoordinators = response.data.managers.filter((manager: any) =>
            manager.user?.role === 'coordenador'
          );
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
        // Silenciar erro ao carregar managers
      }
    };

    fetchSchoolManagers();
  }, [id, toast]);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!id) return;

      try {
        const response = await api.get(`/students/school/${id}`);
        const allStudents = Array.isArray(response.data) ? response.data : [];
        setStudents(allStudents);
      } catch (error) {
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
      toast({
        title: "Erro",
        description: "Erro ao remover professor",
        variant: "destructive",
      });
    }
  };

  // Buscar escolas disponíveis do mesmo município
  const fetchAvailableSchools = async () => {
    if (!school) return;

    try {
      const response = await api.get("/school");
      const allSchools = response.data || [];
      
      // Filtrar escolas do mesmo município, exceto a escola atual
      const filteredSchools = allSchools.filter(
        (s: School) => s.city_id === school.city_id && s.id !== school.id
      );
      
      setAvailableSchools(filteredSchools);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar escolas disponíveis",
        variant: "destructive",
      });
    }
  };

  // Excluir turma
  const handleDeleteClass = async () => {
    if (!classToDelete) return;

    setIsDeleting(true);
    try {
      await api.delete(`/classes/${classToDelete.id}`);
      
      toast({
        title: "Sucesso",
        description: "Turma excluída com sucesso",
      });
      
      // Recarregar turmas
      window.location.reload();
    } catch (error: unknown) {
      let errorTitle = "Erro ao excluir";
      let errorMessage = "Ocorreu um erro ao excluir a turma";

      // Verificar se é um erro do Axios com resposta
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { 
          response?: { 
            status?: number;
            data?: { 
              mensagem?: string; 
              erro?: string;
              message?: string;
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
          } else if (data.message) {
            errorMessage = data.message;
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
      setShowDeleteClassDialog(false);
      setClassToDelete(null);
    }
  };

  // Mover turma para outra escola
  const handleMoveClass = async () => {
    if (!classToMove || !targetSchoolId) return;

    setIsMoving(true);
    try {
      const response = await api.put(`/classes/${classToMove.id}`, {
        school_id: targetSchoolId
      });
      
      let successMessage = "Turma movida com sucesso";
      
      // Verificar se houve renomeação automática
      if (response.data?.auto_renamed) {
        successMessage = `Turma movida e renomeada de "${response.data.auto_renamed.old_name}" para "${response.data.auto_renamed.new_name}" (nome já existia na escola destino)`;
      }
      
      toast({
        title: "Sucesso",
        description: successMessage,
      });
      
      // Recarregar turmas
      window.location.reload();
    } catch (error: unknown) {
      let errorTitle = "Erro ao mover turma";
      let errorMessage = "Ocorreu um erro ao mover a turma";

      // Verificar se é um erro do Axios com resposta
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { 
          response?: { 
            status?: number;
            data?: { 
              mensagem?: string; 
              erro?: string;
              error?: string;
              details?: string;
            } 
          } 
        };
        
        if (axiosError.response?.data) {
          const data = axiosError.response.data;
          
          if (data.details) {
            errorMessage = data.details;
            errorTitle = data.error || "Erro ao mover turma";
          } else if (data.mensagem) {
            errorMessage = data.mensagem;
            errorTitle = data.erro || "Erro ao mover turma";
          } else if (data.erro) {
            errorMessage = data.erro;
          } else if (data.error) {
            errorMessage = data.error;
          }
        }
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsMoving(false);
      setShowMoveClassDialog(false);
      setClassToMove(null);
      setTargetSchoolId("");
    }
  };

  // Abrir diálogo de mover turma
  const handleOpenMoveClassDialog = async (classItem: Class) => {
    setClassToMove(classItem);
    await fetchAvailableSchools();
    setShowMoveClassDialog(true);
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
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {user.role === 'professor' ? "Instituição não encontrada" : "Escola não encontrada"}
        </h2>
        <p className="text-muted-foreground mb-4">
          {user.role === 'professor' 
            ? "A instituição que você está procurando não existe ou você não tem acesso a ela. Entre em contato com o diretor ou coordenador da sua escola."
            : "A escola que você está procurando não existe ou foi removida."}
        </p>
        <Button onClick={() => navigate("/app/cadastros/gestao")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Gestão Escolar
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
            onClick={() => navigate("/app/cadastros/gestao")}
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
                  <p className="text-sm font-medium text-muted-foreground">Nome da Instituição</p>
                  <p className="text-sm text-foreground break-words">{school.name}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Localização</p>
                  <p className="text-sm text-foreground break-words">{school.city.name} - {school.city.state}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Endereço</p>
                  <p className="text-sm text-foreground break-words">{school.address || "Não informado"}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Globe className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Domínio</p>
                  <p className="text-sm text-foreground break-words">{school.domain || "Não informado"}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="classes">Turmas</TabsTrigger>
          <TabsTrigger value="courses">Cursos</TabsTrigger>
          <TabsTrigger value="disciplinas">Disciplinas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* School Management Section */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
                          <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Building className="h-5 w-5 text-red-600" />
                  Gestão Escolar
                </CardTitle>
                <CardDescription>
                  Diretores e coordenadores responsáveis pela gestão da instituição
                </CardDescription>
              </div>
              <div className="flex gap-2 flex-wrap">
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
                {(user.role === 'admin' || user.role === 'tecadm' || user.role === 'diretor' || user.role === 'coordenador' || user.role === 'professor') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPasswordReportModal(true)}
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Relatório de Senhas
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
                  <div className="text-center py-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Nenhum diretor cadastrado</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {directors.map((director) => (
                      <div key={director.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted border-border">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{director.name}</div>
                          {user.role !== 'professor' && (
                            <div className="text-xs text-muted-foreground">{director.email}</div>
                          )}
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
                  <div className="text-center py-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Nenhum coordenador cadastrado</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {coordinators.map((coordinator) => (
                      <div key={coordinator.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted border-border">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{coordinator.name}</div>
                          {user.role !== 'professor' && (
                            <div className="text-xs text-muted-foreground">{coordinator.email}</div>
                          )}
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
                              <div className="text-sm text-muted-foreground">
                                <p>
                                  Série: {typeof classItem.grade === 'object' && classItem.grade !== null ? (classItem.grade as any).name : classItem.grade}
                                </p>
                                {typeof classItem.grade === 'object' && classItem.grade !== null && (classItem.grade as any).education_stage && (
                                  <p className="text-xs text-muted-foreground">
                                    Curso: {(classItem.grade as any).education_stage.name}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                          {(user.role === 'admin' || user.role === 'tecadm' || user.role === 'diretor' || user.role === 'coordenador') && (
                            <div className="flex gap-2 flex-wrap">
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
                              
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleOpenMoveClassDialog(classItem)}
                                title="Mover turma para outra escola"
                              >
                                <MoveRight className="h-4 w-4 mr-2" />
                                Mover
                              </Button>
                              
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setClassToDelete(classItem);
                                  setShowDeleteClassDialog(true);
                                }}
                                className="text-red-600 hover:text-red-700"
                                title="Excluir turma"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
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

        <TabsContent value="courses" className="space-y-6">
          <SchoolCoursesTab schoolId={school.id} schoolName={school.name} />
        </TabsContent>

        <TabsContent value="disciplinas" className="space-y-6">
          <InstituicaoDisciplinasTab />
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
      {showManageClassModal && selectedClass && school && (
        <ManageClassModal
          isOpen={showManageClassModal}
          onClose={() => {
            setShowManageClassModal(false);
            setSelectedClass(null);
          }}
          schoolId={school.id}
          classData={selectedClass}
          onSuccess={() => {
            if (classes.length > 0) {
              fetchClassDetails(classes);
            }
          }}
          schoolCityId={school.city_id}
        />
      )}

      {/* Link Director Modal */}
      <LinkDirectorCoordinatorModal
        isOpen={showLinkDirectorModal}
        onClose={() => setShowLinkDirectorModal(false)}
        schoolId={school.id}
        schoolName={school.name}
        schoolCityId={school.city_id}
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
        schoolCityId={school.city_id}
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
          schoolAddress={school.address}
          schoolState={school.city.state}
          schoolMunicipality={school.city.name}
          onSuccess={() => {
            // Recarregar dados da escola
            window.location.reload();
          }}
        />
      )}

      {/* Password Report Modal */}
      {showPasswordReportModal && school && (
        <PasswordReportModal
          isOpen={showPasswordReportModal}
          onClose={() => setShowPasswordReportModal(false)}
          schoolId={school.id}
          schoolName={school.name}
          cityId={school.city_id}
          classes={classes}
        />
      )}

      {/* Delete Class Dialog */}
      <AlertDialog open={showDeleteClassDialog} onOpenChange={setShowDeleteClassDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão de Turma</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a turma <strong>{classToDelete?.name}</strong>?
              <br /><br />
              Esta ação não pode ser desfeita. Todos os alunos e professores serão desvinculados da turma.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClass}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir Turma"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Move Class Dialog */}
      <Dialog open={showMoveClassDialog} onOpenChange={setShowMoveClassDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Mover Turma para Outra Escola</DialogTitle>
            <DialogDescription>
              Mova a turma <strong>{classToMove?.name}</strong> para outra escola do mesmo município.
              <br /><br />
              Os alunos da turma serão automaticamente transferidos para a nova escola.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Escola de destino</label>
              <Select
                value={targetSchoolId}
                onValueChange={setTargetSchoolId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma escola" />
                </SelectTrigger>
                <SelectContent>
                  {availableSchools.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Nenhuma outra escola disponível no mesmo município
                    </div>
                  ) : (
                    availableSchools.map((school) => (
                      <SelectItem key={school.id} value={school.id}>
                        {school.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {availableSchools.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Apenas escolas do mesmo município ({school?.city.name}) estão disponíveis
                </p>
              )}
            </div>

            {targetSchoolId && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Atenção:</strong> Se já existir uma turma com o mesmo nome na escola destino, 
                  a turma será automaticamente renomeada (ex: "5º Ano A" → "5º Ano A (2)").
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowMoveClassDialog(false);
                setClassToMove(null);
                setTargetSchoolId("");
              }}
              disabled={isMoving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleMoveClass}
              disabled={!targetSchoolId || isMoving}
            >
              {isMoving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Movendo...
                </>
              ) : (
                <>
                  <MoveRight className="h-4 w-4 mr-2" />
                  Mover Turma
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}