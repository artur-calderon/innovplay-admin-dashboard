import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/authContext";
import { UserPlus, Eye, Pencil, Trash2, Edit, Loader2, ArrowLeft, Building, Users, GraduationCap, MapPin, Globe, Calendar, Plus } from "lucide-react";
import { AddUserForm } from "./AddUserForm";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";

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



interface Teacher {
  id: string;
  name: string;
  email: string;
  registration?: string;
  birth_date?: string;
  role?: string;
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
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLoadingSchool, setIsLoadingSchool] = useState(true);
  const [selectedDirectors, setSelectedDirectors] = useState<string[]>([]);
  const [selectedCoordinators, setSelectedCoordinators] = useState<string[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

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



  useEffect(() => {
    const fetchTeachers = async () => {
      if (!id) return;

      try {
        const response = await api.get(`/teacher/school/${id}`);
        const allTeachers = Array.isArray(response.data) ? response.data : [];
        
        // Separar professores por role
        const teachers = allTeachers.filter(teacher => teacher.role === 'professor');
        const directors = allTeachers.filter(teacher => teacher.role === 'diretor');
        const coordinators = allTeachers.filter(teacher => teacher.role === 'coordenador');
        
        setTeachers(teachers);
        setDirectors(directors);
        setCoordinators(coordinators);
      } catch (error) {
        console.error("Error fetching teachers:", error);
        toast({
          title: "Erro",
          description: "Erro ao carregar professores",
          variant: "destructive",
        });
        setTeachers([]);
        setDirectors([]);
        setCoordinators([]);
      }
    };

    fetchTeachers();
  }, [id, toast]);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!id) return;

      try {
        const response = await api.get(`/students/school/${id}`);
        setStudents(Array.isArray(response.data) ? response.data : []);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
            {(user.role === 'admin' || user.role === 'tecadmin') && (
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

      {/* Directors Section */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Users className="h-5 w-5 text-red-600" />
              Diretores ({directors.length})
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <AddUserForm
                schoolId={school.id}
                schoolName={school.name}
                userType="diretor"
                onSuccess={() => {
                  // Recarregar dados da escola
                  window.location.reload();
                }}
              />
              {selectedDirectors.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {/* TODO: Implementar edição em massa */}}
                    className="text-xs"
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Editar ({selectedDirectors.length})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {/* TODO: Implementar exclusão em massa */}}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Excluir ({selectedDirectors.length})
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {directors.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum diretor cadastrado</h3>
              <p className="text-muted-foreground mb-4 text-sm sm:text-base">Adicione diretores para gerenciar a instituição</p>
            </div>
          ) : (
            <div className="space-y-2">
              {directors.map((director) => (
                <div key={director.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                  <Checkbox
                    checked={selectedDirectors.includes(director.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedDirectors([...selectedDirectors, director.id]);
                      } else {
                        setSelectedDirectors(selectedDirectors.filter(id => id !== director.id));
                      }
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                      <span className="font-medium text-sm truncate">{director.name}</span>
                      <span className="text-xs text-muted-foreground sm:hidden">{director.email}</span>
                    </div>
                    <div className="hidden sm:block text-xs text-muted-foreground truncate">
                      {director.email}
                    </div>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>{director.registration || "Sem matrícula"}</span>
                      {director.birth_date && (
                        <span>• {new Date(director.birth_date).toLocaleDateString("pt-BR")}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/app/diretor/${director.id}`)}
                      className="h-7 w-7 p-0 sm:h-8 sm:w-8"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    {(user.role === 'admin' || user.role === 'tecadmin') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/app/diretor/${director.id}/editar`)}
                        className="h-7 w-7 p-0 sm:h-8 sm:w-8"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                    {(user.role === 'admin' || user.role === 'tecadmin') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {/* TODO: Implementar exclusão */}}
                        className="h-7 w-7 p-0 sm:h-8 sm:w-8 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coordinators Section */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Users className="h-5 w-5 text-orange-600" />
              Coordenadores ({coordinators.length})
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <AddUserForm
                schoolId={school.id}
                schoolName={school.name}
                userType="coordenador"
                onSuccess={() => {
                  // Recarregar dados da escola
                  window.location.reload();
                }}
              />
              {selectedCoordinators.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {/* TODO: Implementar edição em massa */}}
                    className="text-xs"
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Editar ({selectedCoordinators.length})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {/* TODO: Implementar exclusão em massa */}}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Excluir ({selectedCoordinators.length})
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {coordinators.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum coordenador cadastrado</h3>
              <p className="text-muted-foreground mb-4 text-sm sm:text-base">Adicione coordenadores para gerenciar a instituição</p>
            </div>
          ) : (
            <div className="space-y-2">
              {coordinators.map((coordinator) => (
                <div key={coordinator.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                  <Checkbox
                    checked={selectedCoordinators.includes(coordinator.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedCoordinators([...selectedCoordinators, coordinator.id]);
                      } else {
                        setSelectedCoordinators(selectedCoordinators.filter(id => id !== coordinator.id));
                      }
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                      <span className="font-medium text-sm truncate">{coordinator.name}</span>
                      <span className="text-xs text-muted-foreground sm:hidden">{coordinator.email}</span>
                    </div>
                    <div className="hidden sm:block text-xs text-muted-foreground truncate">
                      {coordinator.email}
                    </div>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>{coordinator.registration || "Sem matrícula"}</span>
                      {coordinator.birth_date && (
                        <span>• {new Date(coordinator.birth_date).toLocaleDateString("pt-BR")}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/app/coordenador/${coordinator.id}`)}
                      className="h-7 w-7 p-0 sm:h-8 sm:w-8"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    {(user.role === 'admin' || user.role === 'tecadmin' || user.role === 'diretor') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/app/coordenador/${coordinator.id}/editar`)}
                        className="h-7 w-7 p-0 sm:h-8 sm:w-8"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                    {(user.role === 'admin' || user.role === 'tecadmin' || user.role === 'diretor') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {/* TODO: Implementar exclusão */}}
                        className="h-7 w-7 p-0 sm:h-8 sm:w-8 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Teachers Section */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Users className="h-5 w-5 text-blue-600" />
              Professores ({teachers.length})
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <AddUserForm
                schoolId={school.id}
                schoolName={school.name}
                userType="professor"
                onSuccess={() => {
                  // Recarregar dados da escola
                  window.location.reload();
                }}
              />
              {selectedTeachers.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {/* TODO: Implementar edição em massa */}}
                    className="text-xs"
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Editar ({selectedTeachers.length})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {/* TODO: Implementar exclusão em massa */}}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Excluir ({selectedTeachers.length})
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {teachers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum professor cadastrado</h3>
              <p className="text-muted-foreground mb-4 text-sm sm:text-base">Adicione professores para começar a gerenciar a instituição</p>
            </div>
          ) : (
            <div className="space-y-2">
              {teachers.map((teacher) => (
                <div key={teacher.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                  <Checkbox
                    checked={selectedTeachers.includes(teacher.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedTeachers([...selectedTeachers, teacher.id]);
                      } else {
                        setSelectedTeachers(selectedTeachers.filter(id => id !== teacher.id));
                      }
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                      <span className="font-medium text-sm truncate">{teacher.name}</span>
                      <span className="text-xs text-muted-foreground sm:hidden">{teacher.email}</span>
                    </div>
                    <div className="hidden sm:block text-xs text-muted-foreground truncate">
                      {teacher.email}
                    </div>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>{teacher.registration || "Sem matrícula"}</span>
                      {teacher.birth_date && (
                        <span>• {new Date(teacher.birth_date).toLocaleDateString("pt-BR")}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/app/professor/${teacher.id}`)}
                      className="h-7 w-7 p-0 sm:h-8 sm:w-8"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    {(user.role === 'admin' || user.role === 'tecadmin' || user.role === 'diretor' || user.role === 'coordenador') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/app/professor/${teacher.id}/editar`)}
                        className="h-7 w-7 p-0 sm:h-8 sm:w-8"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                    {(user.role === 'admin' || user.role === 'tecadmin' || user.role === 'diretor' || user.role === 'coordenador') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {/* TODO: Implementar exclusão */}}
                        className="h-7 w-7 p-0 sm:h-8 sm:w-8 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>



      {/* Students Section */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Users className="h-5 w-5 text-purple-600" />
              Alunos ({students.length})
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <AddUserForm
                schoolId={school.id}
                schoolName={school.name}
                userType="aluno"
                onSuccess={() => {
                  // Recarregar dados da escola
                  window.location.reload();
                }}
              />
              {selectedStudents.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {/* TODO: Implementar edição em massa */}}
                    className="text-xs"
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Editar ({selectedStudents.length})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {/* TODO: Implementar exclusão em massa */}}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Excluir ({selectedStudents.length})
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum aluno cadastrado</h3>
              <p className="text-muted-foreground mb-4 text-sm sm:text-base">Adicione alunos para começar a gerenciar a instituição</p>
            </div>
          ) : (
            <div className="space-y-2">
              {students.map((student) => (
                <div key={student.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                  <Checkbox
                    checked={selectedStudents.includes(student.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedStudents([...selectedStudents, student.id]);
                      } else {
                        setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                      }
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                      <span className="font-medium text-sm truncate">{student.name}</span>
                      <span className="text-xs text-muted-foreground sm:hidden">{student.email || student.user?.email}</span>
                    </div>
                    <div className="hidden sm:block text-xs text-muted-foreground truncate">
                      {student.email || student.user?.email}
                    </div>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>{student.registration || "Sem matrícula"}</span>
                      {student.birth_date && (
                        <span>• {new Date(student.birth_date).toLocaleDateString("pt-BR")}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/app/aluno/${student.id}`)}
                      className="h-7 w-7 p-0 sm:h-8 sm:w-8"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    {user.role !== 'aluno' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/app/aluno/${student.id}/editar`)}
                        className="h-7 w-7 p-0 sm:h-8 sm:w-8"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                    {user.role !== 'aluno' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {/* TODO: Implementar exclusão */}}
                        className="h-7 w-7 p-0 sm:h-8 sm:w-8 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}