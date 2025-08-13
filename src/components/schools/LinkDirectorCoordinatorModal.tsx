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
import { Loader2, Search, UserPlus, Building, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/authContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRoleDisplayName } from "@/lib/constants";

interface User {
  id: string;
  name: string;
  email: string;
  registration?: string;
  role?: string;
}

interface LinkDirectorCoordinatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  schoolName: string;
  userType: 'diretor' | 'coordenador';
  onSuccess: () => void;
}

export function LinkDirectorCoordinatorModal({
  isOpen,
  onClose,
  schoolId,
  schoolName,
  userType,
  onSuccess,
}: LinkDirectorCoordinatorModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("link");
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    registration: "",
    birth_date: ""
  });
  const { toast } = useToast();
  const { user } = useAuth();

  // Verificar permissões para vincular diretores/coordenadores
  const canLinkUsers = () => {
    if (!user) return false;
    
    // Apenas admin e tecadm podem vincular diretores e coordenadores
    return ['admin', 'tecadm'].includes(user.role);
  };

  // Se não tem permissão, não renderizar o modal
  if (!canLinkUsers()) {
    return null;
  }

  // Buscar usuários disponíveis (diretores ou coordenadores)
  useEffect(() => {
    if (!isOpen) return;

    const fetchUsers = async () => {
      setIsLoading(true);
      try {
              
        // Buscar usuários baseado no tipo
        let endpoint;
        if (userType === 'diretor') {
          endpoint = '/teacher/directors';
        } else {
          endpoint = '/teacher/coordinators';
        }
        
        
        const response = await api.get(endpoint);

        
        let allUsers = [];
        
        // Processar dados da resposta
        const usersKey = userType === 'diretor' ? 'diretores' : 'coordenadores';

        
        if (response.data && response.data[usersKey]) {
          if (Array.isArray(response.data[usersKey])) {
            allUsers = response.data[usersKey].map((user: any) => ({
              id: user.id,
              name: user.name,
              email: user.email,
              registration: user.registration,
              role: user.role
            }));
          }
        } else if (Array.isArray(response.data)) {
          allUsers = response.data;
        }
        setUsers(allUsers);
      } catch (error) {
        console.error("Erro ao buscar usuários:", error);
        toast({
          title: "Erro",
          description: "Erro ao carregar usuários disponíveis",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [isOpen, schoolId, userType, toast]);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.registration && user.registration.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleUserToggle = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleLinkUsers = async () => {
    if (selectedUsers.length === 0) return;

    setIsLinking(true);
    try {
      // Vincular cada usuário selecionado à escola
      const linkPromises = selectedUsers.map(userId =>
        api.post("/managers/school-link", {
          user_id: userId,
          school_id: schoolId
        })
      );
      await Promise.all(linkPromises);

      toast({
        title: "Sucesso",
        description: `${selectedUsers.length} ${userType === 'diretor' ? 'diretor(es)' : 'coordenador(es)'} vinculado(s) à escola com sucesso!`,
      });

      onSuccess();
      onClose();
      setSelectedUsers([]);
    } catch (error) {
      console.error("Erro ao vincular usuários:", error);
      toast({
        title: "Erro",
        description: "Erro ao vincular usuários à escola",
        variant: "destructive",
      });
    } finally {
      setIsLinking(false);
    }
  };

  const handleCreateUser = async () => {
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
      const userData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: userType,
        registration: formData.registration || undefined,
        birth_date: formData.birth_date
      };

      const response = await api.post("/managers", userData);

      toast({
        title: "Sucesso",
        description: `${userType === 'diretor' ? 'Diretor' : 'Coordenador'} criado com sucesso!`,
      });

      // Limpar formulário
      setFormData({
        name: "",
        email: "",
        password: "",
        registration: "",
        birth_date: ""
      });

      // Recarregar lista de usuários
      onSuccess();
    } catch (error: any) {
      console.error("Erro ao criar usuário:", error);
      const errorMessage = error.response?.data?.error || "Erro ao criar usuário";
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

  const userTypeLabel = userType === 'diretor' ? 'Diretores' : 'Coordenadores';
  const userTypeSingular = userType === 'diretor' ? 'Diretor' : 'Coordenador';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-orange-600" />
            Gerenciar {userTypeLabel} da Escola
          </DialogTitle>
          <DialogDescription>
            Vincule {userTypeLabel.toLowerCase()} existentes ou crie novos para a escola <strong>{schoolName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="link">Vincular Usuários</TabsTrigger>
              <TabsTrigger value="create">Criar Novo {userTypeSingular}</TabsTrigger>
            </TabsList>

            <TabsContent value="link" className="flex-1 flex flex-col mt-4">
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`Buscar ${userTypeLabel.toLowerCase()} por nome, email ou matrícula...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Users List */}
              <div className="flex-1 overflow-y-auto border rounded-lg">
                {isLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="ml-2">Carregando {userTypeLabel.toLowerCase()}...</span>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center p-8">
                    <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {searchTerm ? "Nenhum usuário encontrado" : `Nenhum ${userTypeSingular.toLowerCase()} disponível`}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {searchTerm 
                        ? "Tente ajustar os termos de busca"
                        : `Não há ${userTypeLabel.toLowerCase()} cadastrados no sistema`
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 p-4">
                    {filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={() => handleUserToggle(user.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm truncate">{user.name}</span>
                            <Badge variant="secondary" className="text-xs">{userTypeLabel}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div className="truncate">{user.email}</div>
                            {user.registration && (
                              <div>Matrícula: {user.registration}</div>
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
                  {selectedUsers.length} {userTypeSingular.toLowerCase()}(es) selecionado(s)
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onClose} disabled={isLinking}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleLinkUsers} 
                    disabled={selectedUsers.length === 0 || isLinking}
                  >
                    {isLinking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Vincular ({selectedUsers.length})
                  </Button>
                </div>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="create" className="flex-1 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5 text-green-600" />
                    Criar Novo {userTypeSingular}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome Completo *</Label>
                      <Input
                        id="name"
                        placeholder="Digite o nome completo"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
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
                      <Label htmlFor="password">Senha *</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Digite a senha"
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="registration">Matrícula (Opcional)</Label>
                      <Input
                        id="registration"
                        placeholder="Digite a matrícula"
                        value={formData.registration}
                        onChange={(e) => handleInputChange('registration', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="birth_date">Data de Nascimento *</Label>
                    <Input
                      id="birth_date"
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
                      onClick={handleCreateUser} 
                      disabled={isCreating}
                      className="flex-1"
                    >
                      {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Criar {userTypeSingular}
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
