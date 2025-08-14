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
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Usuário - {schoolName}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={handleNameChange}
                  placeholder="Digite o nome completo"
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={formData.email}
                  readOnly
                  className="bg-muted"
                  placeholder="Email será gerado automaticamente"
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  value={formData.password}
                  readOnly
                  className="bg-muted"
                  placeholder="Senha será gerada automaticamente"
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Função *</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                  <SelectTrigger>
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
              
              <div className="space-y-2">
                <Label htmlFor="registration">Matrícula</Label>
                <Input
                  id="registration"
                  value={formData.registration}
                  onChange={(e) => setFormData({...formData, registration: e.target.value})}
                  placeholder="Número de matrícula"
                  disabled={isSubmitting}
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
                />
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
                      Criando...
                    </>
                  ) : (
                    "Criar Usuário"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar usuários..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        
        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger className="w-[180px]">
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredUsers.map((user) => (
                <Card key={user.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      {getRoleIcon(user.role)}
                      {user.name}
                    </CardTitle>
                    <Badge className={getRoleColor(user.role)}>
                      {getRoleDisplayName(user.role)}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {user.email}
                      </p>
                      {user.registration && (
                        <p className="text-sm text-muted-foreground">
                          Matrícula: {user.registration}
                        </p>
                      )}
                      {user.birth_date && (
                        <p className="text-sm text-muted-foreground">
                          Nascimento: {new Date(user.birth_date).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewUser(user.id)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Visualizar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditUser(user.id)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setUserToDelete(user);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Excluir
                      </Button>
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