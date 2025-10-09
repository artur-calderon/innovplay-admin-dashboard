import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useAuth } from "@/context/authContext";
import { 
  UserPlus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  Users, 
  GraduationCap, 
  Building2, 
  UserCheck,
  Loader2 
} from "lucide-react";
import { useNavigate } from "react-router-dom";
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

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  registration?: string;
  birth_date?: string;
  city_id?: string;
  created_at?: string;
}

interface InstituicaoUserManagementProps {
  schoolId: string;
  schoolName: string;
  onSuccess?: () => void;
}

// Mapeamento de roles para exibição
import { ROLE_DISPLAY_MAPPING } from "@/lib/constants";

const roleDisplayMapping = ROLE_DISPLAY_MAPPING;

// Helper para obter nome de exibição da role
const getRoleDisplayName = (role: string): string => {
  return ROLE_DISPLAY_MAPPING[role as keyof typeof ROLE_DISPLAY_MAPPING] || role;
};

// Mapeamento de roles para criação
const roleMapping: { [key: string]: string } = {
  "Administrador": "admin",
  "Professor": "professor",
  "Coordenador": "coordenador",
  "Diretor": "diretor",
  "Técnico Administrador": "tecadm",
  "Aluno": "aluno"
};

import { ROLES } from "@/lib/constants";

export function InstituicaoUserManagement({ schoolId, schoolName, onSuccess }: InstituicaoUserManagementProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Estados principais
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  
  // Estados do formulário
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "",
    registration: "",
    birthDate: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verificar permissões
  if (!user || (user.role !== "admin" && user.role !== "diretor" && user.role !== "coordenador")) {
    return null;
  }

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Buscar usuários da instituição
      const response = await api.get(`/users/school/${schoolId}`);
      const usersData = response.data || [];
      
      // Filtrar apenas usuários que não são alunos
      const filteredUsers = usersData.filter((user: User) => 
        user.role !== "aluno" && user.role !== "admin"
      );
      
      setUsers(filteredUsers);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar usuários da instituição",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [schoolId]);

  const generateEmail = (fullName: string) => {
    const names = fullName.toLowerCase().split(" ");
    const initials = names.map(name => name[0]).join("");
    return `${initials}@${schoolName.toLowerCase().replace(/\s+/g, '')}.com`;
  };

  const generatePassword = (fullName: string) => {
    const firstName = fullName.split(" ")[0].toLowerCase();
    return `${firstName}@${schoolName.toLowerCase().replace(/\s+/g, '')}`;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setFormData({
      ...formData,
      name: newName,
      email: generateEmail(newName),
      password: generatePassword(newName),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.role) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const userData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: roleMapping[formData.role],
        registration: formData.registration || undefined,
        birth_date: formData.birthDate || undefined,
        city_id: schoolId, // Usar schoolId como city_id
      };

      await api.post("/admin/criar-usuario", userData);
      
      toast({
        title: "Sucesso",
        description: "Usuário criado com sucesso",
      });
      
      setIsModalOpen(false);
      setFormData({
        name: "",
        email: "",
        password: "",
        role: "",
        registration: "",
        birthDate: "",
      });
      
      fetchUsers();
      onSuccess?.();
    } catch (error: unknown) {
      console.error("Erro ao criar usuário:", error);
      let errorMessage = "Erro ao criar usuário";
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: string } } };
        if (axiosError.response?.data?.error) {
          errorMessage = axiosError.response.data.error;
        }
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setIsSubmitting(true);
      await api.delete(`/users/${userToDelete.id}`);
      
      toast({
        title: "Sucesso",
        description: "Usuário excluído com sucesso",
      });
      
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error: unknown) {
      console.error("Erro ao excluir usuário:", error);
      let errorMessage = "Erro ao excluir usuário";
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: string } } };
        if (axiosError.response?.data?.error) {
          errorMessage = axiosError.response.data.error;
        }
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewUser = (userId: string) => {
    navigate(`/app/usuario/${userId}`);
  };

  const handleEditUser = (userId: string) => {
    navigate(`/app/usuario/${userId}/editar`);
  };

  // Filtrar usuários
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.registration && user.registration.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = selectedRole === "all" || user.role === selectedRole;
    
    return matchesSearch && matchesRole;
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "professor":
        return <GraduationCap className="h-4 w-4" />;
      case "coordenador":
        return <UserCheck className="h-4 w-4" />;
      case "diretor":
        return <Building2 className="h-4 w-4" />;
      case "tecadm":
        return <Users className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "professor":
        return "bg-blue-100 text-blue-800";
      case "coordenador":
        return "bg-green-100 text-green-800";
      case "diretor":
        return "bg-purple-100 text-purple-800";
      case "tecadm":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gerenciar Usuários</h2>
          <p className="text-muted-foreground">
            Gerencie professores, coordenadores e diretores da instituição
          </p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Adicionar Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="w-full max-w-[95vw] sm:max-w-2xl lg:max-w-3xl max-h-[95vh] overflow-hidden flex flex-col">
            <DialogHeader className="pb-3 border-b">
              <DialogTitle className="text-lg sm:text-xl">Adicionar Novo Usuário - {schoolName}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 py-4">
              {/* Info Box */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <p className="font-semibold text-blue-800 text-sm mb-2">ℹ️ Geração Automática</p>
                <p className="text-xs text-blue-700">
                  O email e senha serão gerados automaticamente com base no nome completo do usuário.
                </p>
              </div>

              {/* Nome e Função */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-1">
                    Nome Completo
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={handleNameChange}
                    placeholder="Digite o nome completo"
                    disabled={isSubmitting}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role" className="flex items-center gap-1">
                    Função
                    <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Selecione uma função" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.filter(role => role !== "Administrador" && role !== "Aluno").map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Email e Senha Gerados */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm text-gray-600">Email (Gerado automaticamente)</Label>
                  <Input
                    id="email"
                    value={formData.email}
                    readOnly
                    className="bg-gray-50 border-gray-200 font-mono h-11 cursor-not-allowed"
                    placeholder="Email será gerado"
                    disabled={isSubmitting}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm text-gray-600">Senha (Gerada automaticamente)</Label>
                  <Input
                    id="password"
                    value={formData.password}
                    readOnly
                    className="bg-gray-50 border-gray-200 font-mono h-11 cursor-not-allowed"
                    placeholder="Senha será gerada"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              
              {/* Matrícula e Data */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="registration">Matrícula (opcional)</Label>
                  <Input
                    id="registration"
                    value={formData.registration}
                    onChange={(e) => setFormData({...formData, registration: e.target.value})}
                    placeholder="Número de matrícula"
                    disabled={isSubmitting}
                    className="h-11"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="birthDate">Data de Nascimento</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
                    disabled={isSubmitting}
                    className="h-11"
                  />
                </div>
              </div>
              
              {/* Botões */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="order-2 sm:order-1 h-11"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="order-1 sm:order-2 h-11"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Criar Usuário
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar usuários por nome, email ou matrícula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11"
          />
        </div>
        
        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger className="w-full sm:w-[200px] h-11">
            <SelectValue placeholder="Filtrar por função" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as funções</SelectItem>
            <SelectItem value="professor">Professores</SelectItem>
            <SelectItem value="coordenador">Coordenadores</SelectItem>
            <SelectItem value="diretor">Diretores</SelectItem>
            <SelectItem value="tecadm">Técnicos administrativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          {filteredUsers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm || selectedRole !== "all" 
                    ? "Nenhum usuário encontrado" 
                    : "Nenhum usuário cadastrado"}
                </h3>
                <p className="text-muted-foreground text-center">
                  {searchTerm || selectedRole !== "all"
                    ? "Tente ajustar sua pesquisa ou filtros"
                    : "Comece adicionando o primeiro usuário da instituição"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredUsers.map((user) => (
                <Card key={user.id} className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <div className="flex-shrink-0 mt-0.5">
                        {getRoleIcon(user.role)}
                      </div>
                      <CardTitle className="text-base sm:text-lg font-semibold truncate">
                        {user.name}
                      </CardTitle>
                    </div>
                    <Badge className={`${getRoleColor(user.role)} text-xs flex-shrink-0 ml-2`}>
                      {getRoleDisplayName(user.role)}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <p className="text-sm text-muted-foreground truncate" title={user.email}>
                        {user.email}
                      </p>
                      {user.registration && (
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Matrícula:</span> {user.registration}
                        </p>
                      )}
                      {user.birth_date && (
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Nascimento:</span> {new Date(user.birth_date).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewUser(user.id)}
                        className="w-full justify-start h-9"
                      >
                        <Eye className="h-3 w-3 mr-2" />
                        Visualizar
                      </Button>
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditUser(user.id)}
                          className="h-9"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          <span className="hidden sm:inline">Editar</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setUserToDelete(user);
                            setIsDeleteDialogOpen(true);
                          }}
                          className="text-red-600 hover:text-red-700 h-9"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          <span className="hidden sm:inline">Excluir</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário "{userToDelete?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteUser}
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