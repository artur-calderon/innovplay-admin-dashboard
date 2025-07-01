import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Search, Edit, Trash2, Users, Building, Loader2, AlertCircle, UserPlus, X, Eye, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface School {
  id: string;
  name: string;
}

interface Grade {
  id: string;
  name: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
  registration?: string;
  birth_date?: string;
}

interface Turma {
  id: string;
  name: string;
  school_id: string;
  grade_id?: string;
  students_count?: number;
  school?: {
    id: string;
    name: string;
  };
  grade?: {
    id: string;
    name: string;
  };
}

interface FormData {
  name: string;
  school_id: string;
  grade_id?: string;
}

interface AddStudentFormData {
  name: string;
  email: string;
  registration: string;
  birthDate: string;
}

export default function Turmas() {
  const [searchTerm, setSearchTerm] = useState("");
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Turma | null>(null);
  const [deletingItem, setDeletingItem] = useState<Turma | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    school_id: "",
    grade_id: "",
  });

  // Estados para gerenciar alunos
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [addStudentForm, setAddStudentForm] = useState<AddStudentFormData>({
    name: "",
    email: "",
    registration: "",
    birthDate: "",
  });
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [updatingCounters, setUpdatingCounters] = useState<Set<string>>(new Set());

  const { toast } = useToast();

  useEffect(() => {
    fetchTurmas();
    fetchSchools();
    fetchGrades();
  }, []);

  // Buscar alunos quando uma turma é selecionada para edição
  useEffect(() => {
    if (editingItem?.id) {
      fetchStudentsByClass(editingItem.id);
    }
  }, [editingItem]);

  const fetchTurmas = async () => {
    try {
      setIsLoading(true);
      
      // Buscar todas as escolas primeiro
      const schoolsResponse = await api.get("/school");
      const allSchools = schoolsResponse.data || [];
      
      // Buscar turmas de todas as escolas com contador de alunos
      const turmasPromises = allSchools.map(async (school: School) => {
        try {
          const response = await api.get(`/classes/school/${school.id}`);
          return response.data || [];
        } catch (error) {
          console.error(`Erro ao buscar turmas da escola ${school.name}:`, error);
          return [];
        }
      });
      
      const turmasArrays = await Promise.all(turmasPromises);
      const allTurmas = turmasArrays.flat();
      
      setTurmas(allTurmas);
    } catch (error) {
      console.error("Erro ao buscar turmas:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar turmas. Verifique sua conexão.",
        variant: "destructive",
      });
      setTurmas([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      const response = await api.get("/school");
      setSchools(response.data || []);
    } catch (error) {
      console.error("Erro ao buscar escolas:", error);
    }
  };

  const fetchGrades = async () => {
    try {
      const response = await api.get("/grades/");
      setGrades(response.data || []);
    } catch (error) {
      console.error("Erro ao buscar séries:", error);
    }
  };

  const fetchStudentsByClass = async (classId: string) => {
    try {
      setIsLoadingStudents(true);
      const response = await api.get(`/classes/${classId}/students`);
      setStudents(response.data || []);
    } catch (error) {
      console.error("Erro ao buscar alunos da turma:", error);
      // Fallback: tentar buscar por escola
      if (editingItem?.school_id) {
        try {
          const fallbackResponse = await api.get(`/students/school/${editingItem.school_id}/class/${classId}`);
          setStudents(fallbackResponse.data || []);
        } catch (fallbackError) {
          console.error("Erro no fallback:", fallbackError);
          setStudents([]);
        }
      }
    } finally {
      setIsLoadingStudents(false);
    }
  };

  // Função para atualizar contador de uma turma específica
  const updateClassStudentCount = async (classId: string, schoolId: string) => {
    try {
      setUpdatingCounters(prev => new Set(prev).add(classId));
      
      const response = await api.get(`/classes/school/${schoolId}`);
      const schoolClasses = response.data || [];
      const updatedClass = schoolClasses.find((c: Turma) => c.id === classId);
      
      if (updatedClass) {
        setTurmas(prevTurmas => 
          prevTurmas.map(turma => 
            turma.id === classId 
              ? { ...turma, students_count: updatedClass.students_count }
              : turma
          )
        );
        
        // Atualizar também o item sendo editado se for o mesmo
        if (editingItem?.id === classId) {
          setEditingItem(prev => prev ? { ...prev, students_count: updatedClass.students_count } : null);
        }
      }
    } catch (error) {
      console.error("Erro ao atualizar contador de alunos:", error);
    } finally {
      setUpdatingCounters(prev => {
        const newSet = new Set(prev);
        newSet.delete(classId);
        return newSet;
      });
    }
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({ name: "", school_id: "", grade_id: "" });
    setStudents([]);
    setIsModalOpen(true);
  };

  const openEditModal = (item: Turma) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      school_id: item.school_id,
      grade_id: item.grade_id || "",
    });
    setIsModalOpen(true);
  };

  const openDeleteDialog = (item: Turma) => {
    setDeletingItem(item);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (!formData.school_id) {
      toast({
        title: "Erro",
        description: "Escola é obrigatória",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      const payload = {
        name: formData.name,
        school_id: formData.school_id,
        grade_id: formData.grade_id || null,
      };
      
      if (editingItem) {
        // Atualizar turma existente
        await api.put(`/classes/${editingItem.id}`, payload);
        toast({
          title: "Sucesso",
          description: "Turma atualizada com sucesso!",
        });
      } else {
        // Criar nova turma
        await api.post("/classes", payload);
        toast({
          title: "Sucesso",
          description: "Turma criada com sucesso!",
        });
      }
      
      setIsModalOpen(false);
      fetchTurmas(); // Recarregar a lista
    } catch (error: any) {
      console.error("Erro ao salvar turma:", error);
      toast({
        title: "Erro",
        description: error.response?.data?.error || "Erro ao salvar turma",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;

    try {
      setIsSubmitting(true);
      await api.delete(`/classes/${deletingItem.id}`);
      toast({
        title: "Sucesso",
        description: "Turma excluída com sucesso!",
      });
      setIsDeleteDialogOpen(false);
      setDeletingItem(null);
      fetchTurmas(); // Recarregar a lista
    } catch (error: any) {
      console.error("Erro ao excluir turma:", error);
      toast({
        title: "Erro",
        description: error.response?.data?.error || "Erro ao excluir turma",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateEmail = (fullName: string) => {
    const names = fullName.toLowerCase().split(" ");
    const initials = names.map(name => name[0]).join("");
    return `${initials}@innovplay.com`;
  };

  const generatePassword = (fullName: string) => {
    const firstName = fullName.split(" ")[0].toLowerCase();
    return `${firstName}@innovplay`;
  };

  const handleAddStudent = async () => {
    if (!addStudentForm.name || !addStudentForm.birthDate || !editingItem) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsAddingStudent(true);
      
      const studentData = {
        name: addStudentForm.name,
        email: addStudentForm.email || generateEmail(addStudentForm.name),
        password: generatePassword(addStudentForm.name),
        registration: addStudentForm.registration || undefined,
        birth_date: addStudentForm.birthDate,
        class_id: editingItem.id,
        grade_id: editingItem.grade_id,
        city_id: editingItem.school_id, // Usando school_id como city_id (ajustar conforme API)
      };

      await api.post("/students", studentData);
      
      toast({
        title: "Sucesso",
        description: "Aluno adicionado com sucesso!",
      });

      // Limpar formulário
      setAddStudentForm({
        name: "",
        email: "",
        registration: "",
        birthDate: "",
      });

      // Recarregar lista de alunos
      fetchStudentsByClass(editingItem.id);
      // Atualizar contador de alunos de forma mais eficiente
      updateClassStudentCount(editingItem.id, editingItem.school_id);
    } catch (error: any) {
      console.error("Erro ao adicionar aluno:", error);
      toast({
        title: "Erro",
        description: error.response?.data?.error || "Erro ao adicionar aluno",
        variant: "destructive",
      });
    } finally {
      setIsAddingStudent(false);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!editingItem) return;

    try {
      await api.put(`/classes/${editingItem.id}/remove_student`, { student_id: studentId });
      setStudents(students.filter(student => student.id !== studentId));
      // Atualizar contador de alunos de forma mais eficiente
      updateClassStudentCount(editingItem.id, editingItem.school_id);
      toast({
        title: "Sucesso",
        description: "Aluno removido da turma com sucesso",
      });
    } catch (error: any) {
      console.error("Erro ao remover aluno:", error);
      toast({
        title: "Erro",
        description: error.response?.data?.error || "Erro ao remover aluno da turma",
        variant: "destructive",
      });
    }
  };

  const filteredTurmas = turmas.filter(turma =>
    turma.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (turma.school?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (turma.grade?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-5 w-48" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="flex items-center space-x-2">
          <Skeleton className="h-10 w-64" />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-4 w-24" />
                  <div className="flex gap-2 mt-4">
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciar Turmas</h1>
          <p className="text-muted-foreground">
            Cadastre e gerencie as turmas das escolas
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Nova Turma
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar turmas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button
          variant="outline"
          onClick={fetchTurmas}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Atualizar"
          )}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredTurmas.map((turma) => (
          <Card key={turma.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600" />
                {turma.name}
              </CardTitle>
              <Badge variant="default">
                Ativa
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {turma.school?.name || "Escola não definida"}
                  </p>
                </div>
                {turma.grade && (
                  <div>
                    <p className="text-sm">
                      <strong>Série:</strong> {turma.grade.name}
                    </p>
                  </div>
                )}
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    {updatingCounters.has(turma.id) ? (
                      <div className="flex items-center space-x-1">
                        <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                        <span className="text-sm text-blue-600">Atualizando...</span>
                      </div>
                    ) : (
                      <span className="text-sm">{turma.students_count || 0} alunos</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openEditModal(turma)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => updateClassStudentCount(turma.id, turma.school_id)}
                    disabled={updatingCounters.has(turma.id)}
                    title="Atualizar contador de alunos"
                  >
                    <RefreshCw className={`h-3 w-3 ${updatingCounters.has(turma.id) ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openDeleteDialog(turma)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Excluir
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTurmas.length === 0 && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchTerm ? "Nenhuma turma encontrada" : "Nenhuma turma cadastrada"}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm 
                ? "Tente ajustar sua pesquisa" 
                : "Comece criando sua primeira turma no sistema"}
            </p>
            {!searchTerm && (
              <Button onClick={openCreateModal}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Nova Turma
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal Criar/Editar com Tabs */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Editar Turma" : "Nova Turma"}
            </DialogTitle>
            <DialogDescription>
              {editingItem 
                ? "Atualize as informações da turma e gerencie os alunos" 
                : "Preencha os dados para criar uma nova turma"}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info">Informações da Turma</TabsTrigger>
              <TabsTrigger value="students" disabled={!editingItem}>
                Alunos ({students.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="info" className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Turma *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: 5º Ano A"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school">Escola *</Label>
                  <Select 
                    value={formData.school_id} 
                    onValueChange={(value) => setFormData({...formData, school_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma escola" />
                    </SelectTrigger>
                    <SelectContent>
                      {schools.filter(school => school.id && school.name).map((school) => (
                        <SelectItem key={school.id} value={school.id}>
                          {school.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grade">Série (Opcional)</Label>
                  <Select 
                    value={formData.grade_id || "none"} 
                    onValueChange={(value) => setFormData({...formData, grade_id: value === "none" ? "" : value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma série" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma série</SelectItem>
                      {grades.filter(grade => grade.id && grade.name).map((grade) => (
                        <SelectItem key={grade.id} value={grade.id}>
                          {grade.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      editingItem ? "Atualizar" : "Criar"
                    )}
                  </Button>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="students" className="space-y-4">
              {editingItem && (
                <div className="space-y-6">
                  {/* Formulário para adicionar aluno */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5" />
                        Adicionar Novo Aluno
                      </CardTitle>
                      <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <p className="font-medium text-blue-800 mb-2">📧 Credenciais Automáticas:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div>
                            <p><strong>Email:</strong> Iniciais do nome + "@innovplay.com"</p>
                            <p className="text-blue-600 font-mono">Ex: "João Silva" → jss@innovplay.com</p>
                          </div>
                          <div>
                            <p><strong>Senha:</strong> Primeiro nome + "@innovplay"</p>
                            <p className="text-blue-600 font-mono">Ex: "João Silva" → joão@innovplay</p>
                          </div>
                        </div>
                        <p className="text-xs mt-2 text-blue-600 font-medium">✨ As credenciais aparecerão automaticamente conforme você digita o nome</p>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-4">
                        {/* Nome - Campo principal em destaque */}
                        <div className="space-y-2">
                          <Label htmlFor="student-name">Nome Completo *</Label>
                          <Input
                            id="student-name"
                            value={addStudentForm.name}
                            onChange={(e) => {
                              const name = e.target.value;
                              setAddStudentForm({
                                ...addStudentForm, 
                                name,
                                email: name ? generateEmail(name) : ""
                              });
                            }}
                            placeholder="Digite o nome completo do aluno"
                            disabled={isAddingStudent}
                            className="text-lg"
                          />
                        </div>
                        
                        {/* Credenciais geradas automaticamente */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="student-email">Email (Gerado automaticamente)</Label>
                            <Input
                              id="student-email"
                              value={addStudentForm.email}
                              readOnly
                              className="bg-muted font-mono"
                              placeholder="Email será gerado automaticamente"
                              disabled={isAddingStudent}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="student-password">Senha (Gerada automaticamente)</Label>
                            <Input
                              id="student-password"
                              value={addStudentForm.name ? generatePassword(addStudentForm.name) : ""}
                              readOnly
                              className="bg-muted font-mono"
                              placeholder="Senha será gerada automaticamente"
                              disabled={isAddingStudent}
                            />
                          </div>
                        </div>
                        
                        {/* Campos adicionais */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="student-registration">Matrícula (Opcional)</Label>
                            <Input
                              id="student-registration"
                              value={addStudentForm.registration}
                              onChange={(e) => setAddStudentForm({...addStudentForm, registration: e.target.value})}
                              placeholder="Número de matrícula"
                              disabled={isAddingStudent}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="student-birthdate">Data de Nascimento *</Label>
                            <Input
                              id="student-birthdate"
                              type="date"
                              value={addStudentForm.birthDate}
                              onChange={(e) => setAddStudentForm({...addStudentForm, birthDate: e.target.value})}
                              disabled={isAddingStudent}
                            />
                          </div>
                        </div>
                      </div>
                      <Button 
                        onClick={handleAddStudent}
                        disabled={isAddingStudent}
                        className="w-full"
                      >
                        {isAddingStudent ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Adicionando...
                          </>
                        ) : (
                          <>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Adicionar Aluno
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Lista de alunos */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Alunos da Turma ({students.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isLoadingStudents ? (
                        <div className="space-y-2">
                          <Skeleton className="h-12 w-full" />
                          <Skeleton className="h-12 w-full" />
                          <Skeleton className="h-12 w-full" />
                        </div>
                      ) : students.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                          <p>Nenhum aluno cadastrado nesta turma</p>
                          <p className="text-sm">Use o formulário acima para adicionar alunos</p>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nome</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Matrícula</TableHead>
                              <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {students.map((student) => (
                              <TableRow key={student.id}>
                                <TableCell className="font-medium">{student.name}</TableCell>
                                <TableCell>{student.email}</TableCell>
                                <TableCell>{student.registration || "-"}</TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRemoveStudent(student.id)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a turma "{deletingItem?.name}"? 
              Esta ação não pode ser desfeita e todos os alunos associados serão removidos da turma.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 