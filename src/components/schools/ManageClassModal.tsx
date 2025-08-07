import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Loader2, Users, GraduationCap, Trash2, Plus, Eye, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LinkTeacherModal } from "./LinkTeacherModal";
import { LinkStudentModal } from "./LinkStudentModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Teacher {
  id: string;
  name: string;
  email: string;
  registration?: string;
  role?: string;
  class_id?: string;
  vinculo_id?: string;
}

interface Student {
  id: string;
  name: string;
  email?: string;
  registration?: string;
  user?: {
    email: string;
  };
  class_id?: string;
}

interface ClassData {
  id: string;
  name: string;
  grade?: string | { id: string; name: string; education_stage: any };
}

interface ManageClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  classData: ClassData;
  onSuccess: () => void;
}

export function ManageClassModal({
  isOpen,
  onClose,
  schoolId,
  classData,
  onSuccess,
}: ManageClassModalProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [showLinkTeacherModal, setShowLinkTeacherModal] = useState(false);
  const [showLinkStudentModal, setShowLinkStudentModal] = useState(false);
  const [activeTab, setActiveTab] = useState("manage");
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    registration: "",
    birth_date: ""
  });
  const { toast } = useToast();

  // Buscar professores e alunos da turma
  useEffect(() => {
    if (!isOpen) return;

         const fetchClassData = async () => {
       setIsLoading(true);
       try {
         console.log('🔍 Buscando dados da turma:', classData.id);
         
                   // Buscar professores da turma específica
          console.log('📚 Fazendo requisição para professores da turma:', classData.id);
          const teachersResponse = await api.get(`/classes/${classData.id}/teachers`);
          console.log('📚 Response professores:', teachersResponse);
          console.log('📚 Data professores:', teachersResponse.data);
          console.log('📚 URL da requisição:', `/classes/${classData.id}/teachers`);
         
         let classTeachers = [];
         
                   if (teachersResponse.data && teachersResponse.data.professores) {
            console.log('📚 Professores encontrados:', teachersResponse.data.professores);
            classTeachers = teachersResponse.data.professores.map((item: any) => {
              const teacher = {
                id: item.professor?.id || item.usuario?.id,
                name: item.professor?.name || item.usuario?.name,
                email: item.professor?.email || item.usuario?.email,
                registration: item.professor?.registration || item.usuario?.registration,
                role: item.usuario?.role || 'professor',
                class_id: classData.id,
                vinculo_id: item.teacher_class?.id || item.vinculo_turma?.teacher_class_id
              };
              console.log('📚 Professor mapeado:', teacher);
              return teacher;
            });
          } else {
            console.log('⚠️ Nenhum professor encontrado ou estrutura inesperada');
          }

         // Buscar alunos da turma específica
         console.log('👥 Fazendo requisição para alunos...');
         const studentsResponse = await api.get(`/students/classes/${classData.id}`);
         console.log('👥 Response alunos:', studentsResponse);
         console.log('👥 Data alunos:', studentsResponse.data);
         
         const classStudents = Array.isArray(studentsResponse.data) ? studentsResponse.data : [];
         console.log('👥 Alunos processados:', classStudents);

         console.log('✅ Professores finais:', classTeachers);
         console.log('✅ Alunos finais:', classStudents);
         
         setTeachers(classTeachers);
         
         setStudents(classStudents.map((student: any) => ({
           id: student.id,
           name: student.name,
           email: student.email || student.user?.email,
           registration: student.registration,
           user: student.user,
           class_id: student.class_id
         })));
      } catch (error) {
        console.error("Erro ao buscar dados da turma:", error);
        toast({
          title: "Erro",
          description: "Erro ao carregar dados da turma",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchClassData();
  }, [isOpen, schoolId, classData.id, toast]);

  const handleRemoveTeacher = async (teacherId: string) => {
    setIsRemoving(`teacher-${teacherId}`);
    try {
      const teacher = teachers.find(t => t.id === teacherId);
      
      console.log('🗑️ Remover professor da turma:', teacherId);
      console.log('🗑️ Dados do professor:', teacher);
      
      if (teacher?.vinculo_id) {
        // Remover vínculo usando o ID do vínculo
        console.log('🗑️ Removendo vínculo:', teacher.vinculo_id);
        console.log('🗑️ URL da requisição:', `/teacher-class/${teacher.vinculo_id}`);
        await api.delete(`/teacher-class/${teacher.vinculo_id}`);
        console.log('🗑️ Vínculo removido com sucesso via API');
      } else {
        // Fallback: remover apenas do estado local
        console.warn('Vinculo ID não encontrado, removendo apenas do estado local');
      }
      
      setTeachers(prev => prev.filter(teacher => teacher.id !== teacherId));
      
      console.log('✅ Professor removido com sucesso!');
      
      toast({
        title: "Sucesso",
        description: "Professor removido da turma com sucesso!",
      });
      
      onSuccess();
    } catch (error) {
      console.error("Erro ao remover professor:", error);
      toast({
        title: "Erro",
        description: "Erro ao remover professor da turma",
        variant: "destructive",
      });
    } finally {
      setIsRemoving(null);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    setIsRemoving(`student-${studentId}`);
    try {
      console.log('🗑️ Remover aluno da turma:', studentId);
      console.log('🗑️ URL da requisição:', `/classes/${classData.id}/remove_student`);
      
      await api.put(`/classes/${classData.id}/remove_student`, {
        student_id: studentId
      });

      console.log('✅ Aluno removido com sucesso!');

      setStudents(prev => prev.filter(student => student.id !== studentId));
      
      toast({
        title: "Sucesso",
        description: "Aluno removido da turma com sucesso!",
      });
      
      onSuccess();
    } catch (error) {
      console.error("Erro ao remover aluno:", error);
      toast({
        title: "Erro",
        description: "Erro ao remover aluno da turma",
        variant: "destructive",
      });
    } finally {
      setIsRemoving(null);
    }
  };

  const handleLinkSuccess = () => {
    // Recarregar dados da turma
    onSuccess();
  };

  const handleCreateStudent = async () => {
    if (!formData.name || !formData.email || !formData.password || !formData.birth_date) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const studentData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        registration: formData.registration || undefined,
        birth_date: formData.birth_date,
        class_id: classData.id
      };

      const response = await api.post("/students", studentData);

      toast({
        title: "Sucesso",
        description: "Aluno criado e vinculado à turma com sucesso!",
      });

      // Limpar formulário
      setFormData({
        name: "",
        email: "",
        password: "",
        registration: "",
        birth_date: ""
      });

      // Recarregar dados da turma
      handleLinkSuccess();
    } catch (error: any) {
      console.error("Erro ao criar aluno:", error);
      const errorMessage = error.response?.data?.error || "Erro ao criar aluno";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateTeacher = async () => {
    if (!formData.name || !formData.email || !formData.password || !formData.birth_date) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const teacherData = {
        nome: formData.name,
        email: formData.email,
        senha: formData.password,
        matricula: formData.registration || undefined,
        birth_date: formData.birth_date,
        escolas_ids: [schoolId]
      };

      const response = await api.post("/teacher", teacherData);

      toast({
        title: "Sucesso",
        description: "Professor criado com sucesso!",
      });

      // Limpar formulário
      setFormData({
        name: "",
        email: "",
        password: "",
        registration: "",
        birth_date: ""
      });

      // Recarregar dados da turma
      handleLinkSuccess();
    } catch (error: any) {
      console.error("Erro ao criar professor:", error);
      const errorMessage = error.response?.data?.error || "Erro ao criar professor";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Função para gerar email automático baseado no nome
  const generateEmail = (name: string) => {
    if (!name) return "";
    
    const words = name.toLowerCase().split(' ').filter(word => word.length > 0);
    if (words.length === 0) return "";
    
    if (words.length === 1) {
      return `${words[0]}@innovplay.com`;
    }
    
    const initials = words.map(word => word.charAt(0)).join('');
    return `${initials}@innovplay.com`;
  };

  // Função para gerar senha automática baseada no nome
  const generatePassword = (name: string) => {
    if (!name) return "";
    
    const firstName = name.toLowerCase().split(' ')[0];
    return `${firstName}@innovplay`;
  };

  // Atualizar email e senha quando o nome mudar
  const handleNameChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      name: value,
      email: generateEmail(value),
      password: generatePassword(value)
    }));
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Gerenciar Turma: {classData.name}
            </DialogTitle>
            <DialogDescription>
              Visualize e gerencie professores e alunos da turma
              {classData.grade && (
                <span className="ml-2">
                  • Série: <strong>{typeof classData.grade === 'object' && classData.grade !== null ? (classData.grade as any).name : classData.grade}</strong>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="manage">Gerenciar Usuários</TabsTrigger>
                <TabsTrigger value="create-student">Criar Novo Aluno</TabsTrigger>
                <TabsTrigger value="create-teacher">Criar Novo Professor</TabsTrigger>
              </TabsList>

              <TabsContent value="manage" className="flex-1 mt-4">
                {isLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="ml-2">Carregando dados da turma...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                    {/* Teachers Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-blue-600" />
                          Professores ({teachers.length})
                        </h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowLinkTeacherModal(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar
                        </Button>
                      </div>

                      <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                        {teachers.length === 0 ? (
                          <div className="text-center py-8">
                            <GraduationCap className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">Nenhum professor vinculado</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {teachers.map((teacher) => (
                              <div
                                key={teacher.id}
                                className="flex items-center gap-3 p-2 border rounded hover:bg-gray-50"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm truncate">{teacher.name}</div>
                                  <div className="text-xs text-muted-foreground truncate">
                                    {teacher.email}
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => {/* TODO: Ver detalhes do professor */}}
                                  >
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                    onClick={() => handleRemoveTeacher(teacher.id)}
                                    disabled={isRemoving === `teacher-${teacher.id}`}
                                  >
                                    {isRemoving === `teacher-${teacher.id}` ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Students Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium flex items-center gap-2">
                          <Users className="h-4 w-4 text-green-600" />
                          Alunos ({students.length})
                        </h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowLinkStudentModal(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar
                        </Button>
                      </div>

                      <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                        {students.length === 0 ? (
                          <div className="text-center py-8">
                            <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">Nenhum aluno vinculado</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {students.map((student) => (
                              <div
                                key={student.id}
                                className="flex items-center gap-3 p-2 border rounded hover:bg-gray-50"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm truncate">{student.name}</div>
                                  <div className="text-xs text-muted-foreground truncate">
                                    {student.email || student.user?.email}
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => {/* TODO: Ver detalhes do aluno */}}
                                  >
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                    onClick={() => handleRemoveStudent(student.id)}
                                    disabled={isRemoving === `student-${student.id}`}
                                  >
                                    {isRemoving === `student-${student.id}` ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="create-student" className="flex-1 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5 text-green-600" />
                      Criar Novo Aluno
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
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

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="student-name">Nome Completo *</Label>
                        <Input
                          id="student-name"
                          placeholder="Digite o nome completo do aluno"
                          className="text-lg"
                          value={formData.name}
                          onChange={(e) => handleNameChange(e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="student-email">Email (Gerado automaticamente)</Label>
                          <Input
                            id="student-email"
                            placeholder="Email será gerado automaticamente"
                            className="bg-muted font-mono"
                            value={formData.email}
                            readOnly
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="student-password">Senha (Gerada automaticamente)</Label>
                          <Input
                            id="student-password"
                            placeholder="Senha será gerada automaticamente"
                            className="bg-muted font-mono"
                            value={formData.password}
                            readOnly
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="student-registration">Matrícula (Opcional)</Label>
                          <Input
                            id="student-registration"
                            placeholder="Número de matrícula"
                            value={formData.registration}
                            onChange={(e) => handleInputChange('registration', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="student-birthdate">Data de Nascimento *</Label>
                          <Input
                            id="student-birthdate"
                            type="date"
                            value={formData.birth_date}
                            onChange={(e) => handleInputChange('birth_date', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button variant="outline" onClick={onClose} disabled={isCreating}>
                        Cancelar
                      </Button>
                      <Button 
                        onClick={handleCreateStudent} 
                        disabled={isCreating}
                        className="flex-1"
                      >
                        {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Criar Aluno
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="create-teacher" className="flex-1 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5 text-blue-600" />
                      Criar Novo Professor
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="teacher-nome">Nome Completo *</Label>
                        <Input
                          id="teacher-nome"
                          placeholder="Digite o nome completo"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="teacher-email">Email *</Label>
                        <Input
                          id="teacher-email"
                          type="email"
                          placeholder="Digite o email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="teacher-senha">Senha *</Label>
                        <Input
                          id="teacher-senha"
                          type="password"
                          placeholder="Digite a senha"
                          value={formData.password}
                          onChange={(e) => handleInputChange('password', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="teacher-matricula">Matrícula (Opcional)</Label>
                        <Input
                          id="teacher-matricula"
                          placeholder="Digite a matrícula"
                          value={formData.registration}
                          onChange={(e) => handleInputChange('registration', e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="teacher-birth_date">Data de Nascimento *</Label>
                      <Input
                        id="teacher-birth_date"
                        type="date"
                        value={formData.birth_date}
                        onChange={(e) => handleInputChange('birth_date', e.target.value)}
                      />
                    </div>
                    
                    <div className="flex gap-2 pt-4">
                      <Button variant="outline" onClick={onClose} disabled={isCreating}>
                        Cancelar
                      </Button>
                      <Button 
                        onClick={handleCreateTeacher} 
                        disabled={isCreating}
                        className="flex-1"
                      >
                        {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Criar Professor
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Teacher Modal */}
      <LinkTeacherModal
        isOpen={showLinkTeacherModal}
        onClose={() => setShowLinkTeacherModal(false)}
        schoolId={schoolId}
        classId={classData.id}
        className={classData.name}
        onSuccess={handleLinkSuccess}
      />

      {/* Link Student Modal */}
      <LinkStudentModal
        isOpen={showLinkStudentModal}
        onClose={() => setShowLinkStudentModal(false)}
        schoolId={schoolId}
        classId={classData.id}
        className={classData.name}
        onSuccess={handleLinkSuccess}
      />
    </>
  );
}
