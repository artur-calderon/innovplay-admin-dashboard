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
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Loader2, Search, UserPlus, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/authContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Teacher {
  id: string;
  name: string;
  email: string;
  registration?: string;
  role?: string;
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
  const [municipios, setMunicipios] = useState<any[]>([]);
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
    
    // Admin pode vincular qualquer professor
    if (user.role === 'admin') return true;
    
    // Diretor, coordenador e professor podem vincular professores da sua escola
    return ['diretor', 'coordenador', 'professor'].includes(user.role);
  };

  // Se não tem permissão, não renderizar o modal
  if (!canLinkTeachers()) {
    return null;
  }

  // Carregar municípios se for admin
  useEffect(() => {
    if (user?.role === 'admin') {
      const fetchMunicipios = async () => {
        try {
          const response = await api.get('/cities');
          setMunicipios(response.data || []);
        } catch (error) {
          console.error('Erro ao carregar municípios:', error);
        }
      };
      fetchMunicipios();
    }
  }, [user?.role]);

  // Buscar professores não vinculados à turma
  useEffect(() => {
    if (!isOpen) return;

    const fetchTeachers = async () => {
      setIsLoading(true);
      try {
        // Determinar endpoint baseado na permissão do usuário
        const canViewAllTeachers = user?.role === 'admin';
        const endpoint = canViewAllTeachers ? '/teacher' : `/teacher/school/${schoolId}`;
        
        const response = await api.get(endpoint);
        let allTeachers = [];
        
        // Processar dados da mesma forma que AddUserForm
        if (response.data && response.data.professores) {
          // Fallback para estrutura antiga de professores
          allTeachers = response.data.professores.map((prof: any) => ({
            id: prof.usuario?.id || prof.professor?.id || `prof-${Math.random()}`,
            name: prof.usuario?.name || prof.professor?.name || 'Nome não informado',
            email: prof.usuario?.email || prof.professor?.email || 'email@não.informado',
            registration: prof.vinculo_escola?.registration || prof.vinculos_escolares?.[0]?.registration || prof.usuario?.registration,
            role: prof.usuario?.role || 'professor'
          }));
        } else if (Array.isArray(response.data)) {
          allTeachers = response.data;
        } else {
          allTeachers = [];
        }
        
        console.log('👨‍🏫 Todos os professores carregados:', allTeachers);
        
        // Filtrar apenas professores (não diretores/coordenadores) que não estão na turma
        const availableTeachers = allTeachers.filter((teacher: any) => 
          teacher.role === 'professor' && !teacher.class_id
        );

        console.log('👨‍🏫 Professores disponíveis para vincular:', availableTeachers);
        setTeachers(availableTeachers);
      } catch (error) {
        console.error("Erro ao buscar professores:", error);
        toast({
          title: "Erro",
          description: "Erro ao carregar professores disponíveis",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeachers();
  }, [isOpen, schoolId, user?.role, toast]);

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
      console.log('🔗 Vincular professores à turma:', classId);
      console.log('🔗 Professores selecionados:', selectedTeachers);
      
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
    if (user?.role === 'admin' && !formData.city_id) {
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
        city_id: user?.role === 'admin' ? formData.city_id : user?.city_id
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            Gerenciar Professores da Turma
          </DialogTitle>
          <DialogDescription>
            Vincule professores existentes ou crie novos para a turma <strong>{className}</strong>
            {user?.role === 'admin' && (
              <span className="block mt-1 text-xs text-blue-600">
                ⚡ Visualizando todos os professores do sistema
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="link">Vincular Usuários</TabsTrigger>
              <TabsTrigger value="create">Criar Novo Professor</TabsTrigger>
            </TabsList>

            <TabsContent value="link" className="flex-1 flex flex-col mt-4">
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar professores por nome, email ou matrícula..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Teachers List */}
              <div className="flex-1 overflow-y-auto border rounded-lg">
                {isLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="ml-2">Carregando professores...</span>
                  </div>
                ) : filteredTeachers.length === 0 ? (
                  <div className="text-center p-8">
                    <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {searchTerm ? "Nenhum professor encontrado" : "Nenhum professor disponível"}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {searchTerm 
                        ? "Tente ajustar os termos de busca"
                        : "Todos os professores já estão vinculados a turmas"
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 p-4">
                    {filteredTeachers.map((teacher) => (
                      <div
                        key={teacher.id}
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Checkbox
                          checked={selectedTeachers.includes(teacher.id)}
                          onCheckedChange={() => handleTeacherToggle(teacher.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm truncate">{teacher.name}</span>
                            <Badge variant="secondary" className="text-xs">Professor</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div className="truncate">{teacher.email}</div>
                            {teacher.registration && (
                              <div>Matrícula: {teacher.registration}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  {selectedTeachers.length} professor(es) selecionado(s)
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onClose} disabled={isLinking}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleLinkTeachers} 
                    disabled={selectedTeachers.length === 0 || isLinking}
                  >
                    {isLinking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Vincular ({selectedTeachers.length})
                  </Button>
                </div>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="create" className="flex-1 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5 text-green-600" />
                    Criar Novo Professor
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome Completo *</Label>
                      <Input
                        id="nome"
                        placeholder="Digite o nome completo"
                        value={formData.nome}
                        onChange={(e) => handleInputChange('nome', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Digite o email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="senha">Senha *</Label>
                      <Input
                        id="senha"
                        type="password"
                        placeholder="Digite a senha"
                        value={formData.senha}
                        onChange={(e) => handleInputChange('senha', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="matricula">Matrícula (Opcional)</Label>
                      <Input
                        id="matricula"
                        placeholder="Digite a matrícula"
                        value={formData.matricula}
                        onChange={(e) => handleInputChange('matricula', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="birth_date">Data de Nascimento *</Label>
                      <Input
                        id="birth_date"
                        type="date"
                        value={formData.birth_date}
                        onChange={(e) => handleInputChange('birth_date', e.target.value)}
                      />
                    </div>
                    {user?.role === 'admin' && (
                      <div className="space-y-2">
                        <Label htmlFor="city_id">Município *</Label>
                        <Select onValueChange={(value) => handleInputChange('city_id', value)} value={formData.city_id}>
                          <SelectTrigger>
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
      </DialogContent>
    </Dialog>
  );
}
