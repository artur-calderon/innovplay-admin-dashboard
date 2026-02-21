import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Loader2, Search, UserPlus, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/authContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Teacher {
  id: string;
  name: string;
  email: string;
  registration?: string;
  role?: string;
}

interface Municipality {
  id: number;
  name: string;
}

interface ApiError {
  response?: {
    data?: {
      error?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface LinkTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  classId: string;
  className: string;
  onSuccess: () => void;
}

export function LinkTeacherModal({
  isOpen,
  onClose,
  schoolId,
  classId,
  className,
  onSuccess,
}: LinkTeacherModalProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("link");
  const [isCreating, setIsCreating] = useState(false);
  const [municipios, setMunicipios] = useState<Municipality[]>([]);
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    senha: "",
    matricula: "",
    birth_date: "",
    city_id: ""
  });
  const { toast } = useToast();
  const { user } = useAuth();

  // Verificar permissões para vincular professores
  const canLinkTeachers = () => {
    if (!user) return false;
    
    // Admin e tecadm podem vincular qualquer professor
    if (['admin', 'tecadm'].includes(user.role)) return true;
    
    // Diretor, coordenador e professor podem vincular professores da sua escola
    return ['diretor', 'coordenador', 'professor'].includes(user.role);
  };

  // Carregar municípios se for admin ou tecadm
  const fetchMunicipios = useCallback(async () => {
    if (['admin', 'tecadm'].includes(user?.role || '')) {
      try {
        const response = await api.get('/city/');
        setMunicipios(response.data || []);
      } catch (error) {
        console.error('Erro ao carregar municípios:', error);
      }
    }
  }, [user?.role]);

  useEffect(() => {
    fetchMunicipios();
  }, [fetchMunicipios]);

  // Buscar professores não vinculados à turma
  const fetchTeachers = useCallback(async () => {
    if (!isOpen) return;
    
    setIsLoading(true);
    try {
      // Determinar endpoint baseado na permissão do usuário
      const canViewAllTeachers = ['admin', 'tecadm'].includes(user?.role || '');
      const endpoint = canViewAllTeachers ? '/teacher' : `/teacher/school/${schoolId}`;
      
      const response = await api.get(endpoint);
      let allTeachers = [];
      
      // Processar dados da mesma forma que AddUserForm
      if (response.data && response.data.professores) {
        // Fallback para estrutura antiga de professores
        allTeachers = response.data.professores.map((prof: Record<string, unknown>) => ({
          id: String((prof.usuario as Record<string, unknown>)?.id || (prof.professor as Record<string, unknown>)?.id || `prof-${Math.random()}`),
          name: String((prof.usuario as Record<string, unknown>)?.name || (prof.professor as Record<string, unknown>)?.name || 'Nome não informado'),
          email: String((prof.usuario as Record<string, unknown>)?.email || (prof.professor as Record<string, unknown>)?.email || 'email@não.informado'),
          registration: String((prof.vinculo_escola as Record<string, unknown>)?.registration || (prof.vinculos_escolares as Record<string, unknown>[])?.[0]?.registration || (prof.usuario as Record<string, unknown>)?.registration || ''),
          role: String((prof.usuario as Record<string, unknown>)?.role || 'professor')
        }));
      } else if (Array.isArray(response.data)) {
        allTeachers = response.data;
      } else {
        allTeachers = [];
      }
      
      // Filtrar apenas professores (não diretores/coordenadores) que não estão na turma
      const availableTeachers = allTeachers.filter((teacher: Record<string, unknown>) => 
        teacher.role === 'professor' && !teacher.class_id
      );

      setTeachers(availableTeachers as Teacher[]);
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      // 404 ou sem usuários com a role: não exibir erro, apenas lista vazia
      if (status === 404 || status === 204) {
        setTeachers([]);
      } else {
        console.error("Erro ao buscar professores:", error);
        toast({
          title: "Erro",
          description: "Erro ao carregar professores disponíveis",
          variant: "destructive",
        });
        setTeachers([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, schoolId, user?.role, toast]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  // Se não tem permissão, não renderizar o modal
  if (!canLinkTeachers()) {
    return null;
  }

  const filteredTeachers = teachers.filter(teacher =>
    teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (teacher.registration && teacher.registration.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleTeacherToggle = (teacherId: string) => {
    setSelectedTeachers(prev => 
      prev.includes(teacherId) 
        ? prev.filter(id => id !== teacherId)
        : [...prev, teacherId]
    );
  };

  const handleLinkTeachers = async () => {
    if (selectedTeachers.length === 0) return;

    setIsLinking(true);
    try {
      // Vincular cada professor selecionado à turma
      const linkPromises = selectedTeachers.map(teacherId =>
        api.post("/teacher-class", {
          teacher_id: teacherId,
          class_id: classId
        })
      );

      await Promise.all(linkPromises);

      toast({
        title: "Sucesso",
        description: `${selectedTeachers.length} professor(es) vinculado(s) à turma com sucesso!`,
      });

      onSuccess();
      onClose();
      setSelectedTeachers([]);
    } catch (error) {
      console.error("Erro ao vincular professores:", error);
      toast({
        title: "Erro",
        description: "Erro ao vincular professores à turma",
        variant: "destructive",
      });
    } finally {
      setIsLinking(false);
    }
  };

  const handleCreateTeacher = async () => {
    if (!formData.nome || !formData.email || !formData.senha || !formData.birth_date) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    // Verificar se precisa de city_id
          if (['admin', 'tecadm'].includes(user?.role || '') && !formData.city_id) {
      toast({
        title: "Erro",
        description: "Selecione um município",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const teacherData = {
        nome: formData.nome,
        email: formData.email,
        senha: formData.senha,
        matricula: formData.matricula || undefined,
        birth_date: formData.birth_date,
        escolas_ids: [schoolId],
        city_id: ['admin', 'tecadm'].includes(user?.role || '') ? formData.city_id : (user as any)?.city_id
      };

      const response = await api.post("/teacher", teacherData);

      toast({
        title: "Sucesso",
        description: "Professor criado com sucesso!",
      });

      // Limpar formulário
      setFormData({
        nome: "",
        email: "",
        senha: "",
        matricula: "",
        birth_date: "",
        city_id: ""
      });

      // Recarregar lista de professores
      onSuccess();
    } catch (error: unknown) {
      console.error("Erro ao criar professor:", error);
      const errorMessage = (error as ApiError)?.response?.data?.error || "Erro ao criar professor";
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

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setFormData({
        nome: "",
        email: "",
        senha: "",
        matricula: "",
        birth_date: "",
        city_id: ""
      });
      setSelectedTeachers([]);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] max-w-6xl h-[95vh] max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-4 sm:px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40">
          <DialogTitle className="flex flex-col sm:flex-row sm:items-center gap-2 text-lg sm:text-xl text-foreground">
            <span className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="font-semibold">Gerenciar Professores</span>
            </span>
            <span className="text-base sm:text-lg font-medium text-blue-700 dark:text-blue-300 sm:ml-2">
              {className}
            </span>
          </DialogTitle>
          <DialogDescription asChild>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Vincule professores existentes ou crie novos para a turma.
              {['admin', 'tecadm'].includes(user?.role || '') && (
                <span className="block mt-1 text-xs text-blue-600 dark:text-blue-400">
                  ⚡ Visualizando todos os professores do sistema
                </span>
              )}
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden px-4 sm:px-6 pb-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 h-auto sm:h-10 p-1 bg-muted/60 rounded-lg my-4">
              <TabsTrigger 
                value="link" 
                className="text-xs sm:text-sm py-2 sm:py-1.5 px-2 sm:px-3 data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:ring-1 data-[state=active]:ring-border rounded-md transition-all"
              >
                <UserPlus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Vincular Usuários</span>
                <span className="xs:hidden">Vincular</span>
              </TabsTrigger>
              <TabsTrigger 
                value="create" 
                className="text-xs sm:text-sm py-2 sm:py-1.5 px-2 sm:px-3 data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:ring-1 data-[state=active]:ring-border rounded-md transition-all"
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Criar Novo Professor</span>
                <span className="xs:hidden">Criar</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="link" className="flex-1 flex flex-col mt-0 overflow-hidden data-[state=inactive]:hidden">
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar professores por nome, email ou matrícula..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 text-sm sm:text-base"
                />
              </div>

              {/* Teachers List */}
              <div className="flex-1 overflow-hidden border border-border rounded-lg bg-card min-h-[400px] max-h-[500px]">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center p-8 h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                    <span className="text-sm sm:text-base text-muted-foreground">Carregando professores...</span>
                  </div>
                ) : filteredTeachers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-6 sm:p-8 h-full">
                    <div className="bg-blue-50 dark:bg-blue-950/40 p-4 rounded-full mb-4">
                      <UserPlus className="h-8 w-8 sm:h-12 sm:w-12 text-blue-400" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold mb-2 text-center">
                      {searchTerm ? "Nenhum professor encontrado" : "Nenhum professor disponível"}
                    </h3>
                    <p className="text-sm sm:text-base text-muted-foreground text-center max-w-sm">
                      {searchTerm 
                        ? "Tente ajustar os termos de busca ou criar um novo professor"
                        : "Todos os professores já estão vinculados a turmas ou crie um novo"
                      }
                    </p>
                  </div>
                ) : (
                  <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-blue-300 dark:scrollbar-thumb-blue-700 scrollbar-track-transparent scroll-smooth">
                    <div className="space-y-2 sm:space-y-3 p-3 sm:p-4">
                      {filteredTeachers.map((teacher) => (
                        <div
                          key={teacher.id}
                          className="flex items-center gap-3 p-3 sm:p-4 border rounded-lg hover:bg-muted transition-colors border-border"
                        >
                          <Checkbox
                            checked={selectedTeachers.includes(teacher.id)}
                            onCheckedChange={() => handleTeacherToggle(teacher.id)}
                            className="flex-shrink-0"
                          />
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 dark:bg-blue-950/30 rounded-full flex items-center justify-center">
                              <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                              <span className="font-medium text-sm sm:text-base truncate text-foreground">{teacher.name}</span>
                              <Badge variant="secondary" className="text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-200 border-blue-200 dark:border-blue-800 w-fit">
                                Professor
                              </Badge>
                            </div>
                            <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
                              <div className="truncate">{teacher.email}</div>
                              {teacher.registration && (
                                <div className="text-muted-foreground/70">Matrícula: {teacher.registration}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 pt-4 border-t bg-gray-50/50 dark:bg-muted px-4 py-3 rounded-b-lg">
                <div className="text-xs sm:text-sm text-gray-600 dark:text-muted-foreground order-2 sm:order-1">
                  <span className="font-medium">{selectedTeachers.length}</span> professor(es) selecionado(s)
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 order-1 sm:order-2">
                  <Button 
                    variant="outline" 
                    onClick={onClose} 
                    disabled={isLinking}
                    className="h-10 order-2 sm:order-1"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleLinkTeachers} 
                    disabled={selectedTeachers.length === 0 || isLinking}
                    className="h-10 bg-blue-600 hover:bg-blue-700 order-1 sm:order-2"
                  >
                    {isLinking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <UserPlus className="mr-2 h-4 w-4" />
                    Vincular ({selectedTeachers.length})
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="create" className="flex-1 flex flex-col mt-0 overflow-hidden data-[state=inactive]:hidden">
              <div className="flex-1 overflow-y-auto border border-border rounded-lg bg-card min-h-[300px] p-4 sm:p-5">
                <p className="text-sm text-muted-foreground mb-4">
                  Preencha os dados. A senha não será exibida após o cadastro.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome" className="text-sm font-medium text-foreground">Nome Completo *</Label>
                    <Input
                      id="nome"
                      placeholder="Digite o nome completo"
                      className="h-11 border-input bg-background focus:ring-2 focus:ring-blue-500"
                      value={formData.nome}
                      onChange={(e) => handleInputChange('nome', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-foreground">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Digite o email"
                      className="h-11 border-input bg-background focus:ring-2 focus:ring-blue-500"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="senha" className="text-sm font-medium text-foreground">Senha *</Label>
                    <Input
                      id="senha"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Digite a senha"
                      className="h-11 border-input bg-background focus:ring-2 focus:ring-blue-500"
                      value={formData.senha}
                      onChange={(e) => handleInputChange('senha', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="matricula" className="text-sm font-medium text-foreground">Matrícula (Opcional)</Label>
                    <Input
                      id="matricula"
                      placeholder="Digite a matrícula"
                      className="h-11 border-input bg-background focus:ring-2 focus:ring-blue-500"
                      value={formData.matricula}
                      onChange={(e) => handleInputChange('matricula', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birth_date" className="text-sm font-medium text-foreground">Data de Nascimento *</Label>
                    <Input
                      id="birth_date"
                      type="date"
                      className="h-11 border-input bg-background focus:ring-2 focus:ring-blue-500"
                      value={formData.birth_date}
                      onChange={(e) => handleInputChange('birth_date', e.target.value)}
                    />
                  </div>
                  {['admin', 'tecadm'].includes(user?.role || '') && (
                    <div className="space-y-2">
                      <Label htmlFor="city_id" className="text-sm font-medium text-foreground">Município *</Label>
                      <Select onValueChange={(value) => handleInputChange('city_id', value)} value={formData.city_id}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Selecione um município" />
                        </SelectTrigger>
                        <SelectContent>
                          {municipios.map((city) => (
                            <SelectItem key={city.id} value={city.id.toString()}>{city.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 pt-4 border-t bg-gray-50/50 dark:bg-muted px-4 py-3 rounded-b-lg">
                <div className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1">
                  Novo professor
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 order-1 sm:order-2">
                  <Button variant="outline" onClick={onClose} disabled={isCreating} className="h-10 order-2 sm:order-1">
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateTeacher}
                    disabled={isCreating}
                    className="h-10 order-1 sm:order-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
                  >
                    {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Criar Professor
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
