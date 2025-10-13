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

  // Buscar usuários disponíveis (diretores ou coordenadores)
  const fetchUsers = useCallback(async () => {
    if (!isOpen) return;

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
          allUsers = response.data[usersKey].map((user: Record<string, unknown>) => ({
            id: String(user.id || ''),
            name: String(user.name || ''),
            email: String(user.email || ''),
            registration: String(user.registration || ''),
            role: String(user.role || '')
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
  }, [isOpen, userType, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Se não tem permissão, não renderizar o modal
  if (!canLinkUsers()) {
    return null;
  }

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
    } catch (error: unknown) {
      console.error("Erro ao criar usuário:", error);
      const errorMessage = (error as ApiError)?.response?.data?.error || "Erro ao criar usuário";
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
      <DialogContent className="w-[95vw] max-w-6xl h-[95vh] max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-4 sm:px-6 py-3 border-b bg-gradient-to-r from-orange-50 to-amber-50">
          <DialogTitle className="flex flex-col sm:flex-row sm:items-center gap-2 text-lg sm:text-xl">
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
              <span className="font-semibold">Gerenciar {userTypeLabel}</span>
            </div>
            <span className="text-base sm:text-lg font-medium text-orange-700 sm:ml-2">
              {schoolName}
            </span>
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base text-gray-600 mt-1">
            <div className="flex flex-col gap-1">
              <span>Vincule {userTypeLabel.toLowerCase()} existentes ou crie novos para a escola</span>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden px-4 sm:px-6 pb-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 h-auto sm:h-10 p-1 bg-gray-100 rounded-lg mt-3 mb-2">
              <TabsTrigger 
                value="link" 
                className="text-xs sm:text-sm py-2 sm:py-1.5 px-2 sm:px-3 data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <Building className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Vincular Usuários</span>
                <span className="xs:hidden">Vincular</span>
              </TabsTrigger>
              <TabsTrigger 
                value="create" 
                className="text-xs sm:text-sm py-2 sm:py-1.5 px-2 sm:px-3 data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Criar Novo {userTypeSingular}</span>
                <span className="xs:hidden">Criar</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="link" className="flex-1 flex flex-col mt-0 overflow-hidden">
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`Buscar ${userTypeLabel.toLowerCase()} por nome, email ou matrícula...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 text-sm sm:text-base"
                />
              </div>

              {/* Users List */}
              <div className="flex-1 overflow-hidden border rounded-lg bg-white min-h-[400px] max-h-[500px]">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center p-8 h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                    <span className="text-sm sm:text-base text-gray-600">Carregando {userTypeLabel.toLowerCase()}...</span>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-6 sm:p-8 h-full">
                    <div className={`${userType === 'diretor' ? 'bg-red-50' : 'bg-orange-50'} p-4 rounded-full mb-4`}>
                      <Building className={`h-8 w-8 sm:h-12 sm:w-12 ${userType === 'diretor' ? 'text-red-400' : 'text-orange-400'}`} />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold mb-2 text-center">
                      {searchTerm ? "Nenhum usuário encontrado" : `Nenhum ${userTypeSingular.toLowerCase()} disponível`}
                    </h3>
                    <p className="text-sm sm:text-base text-gray-500 text-center max-w-sm">
                      {searchTerm 
                        ? "Tente ajustar os termos de busca ou criar um novo usuário"
                        : `Não há ${userTypeLabel.toLowerCase()} cadastrados no sistema ou crie um novo`
                      }
                    </p>
                  </div>
                ) : (
                  <div 
                    className={`h-full overflow-y-auto scrollbar-thin scrollbar-track-transparent scroll-smooth ${
                      userType === 'diretor' 
                        ? 'scrollbar-thumb-red-300 hover:scrollbar-thumb-red-400' 
                        : 'scrollbar-thumb-orange-300 hover:scrollbar-thumb-orange-400'
                    }`}
                  >
                    <div className="space-y-2 sm:space-y-3 p-3 sm:p-4">
                      {filteredUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center gap-3 p-3 sm:p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <Checkbox
                            checked={selectedUsers.includes(user.id)}
                            onCheckedChange={() => handleUserToggle(user.id)}
                            className="flex-shrink-0"
                          />
                          <div className="flex-shrink-0">
                            <div 
                              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                                userType === 'diretor' ? 'bg-red-100' : 'bg-orange-100'
                              }`}
                            >
                              <Building 
                                className={`h-4 w-4 sm:h-5 sm:w-5 ${
                                  userType === 'diretor' ? 'text-red-600' : 'text-orange-600'
                                }`} 
                              />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                              <span className="font-medium text-sm sm:text-base truncate text-gray-900">{user.name}</span>
                              <Badge 
                                variant="secondary" 
                                className={`text-xs w-fit ${
                                  userType === 'diretor' 
                                    ? 'bg-red-50 text-red-700 border-red-200' 
                                    : 'bg-orange-50 text-orange-700 border-orange-200'
                                }`}
                              >
                                {userTypeSingular}
                              </Badge>
                            </div>
                            <div className="text-xs sm:text-sm text-gray-500 space-y-1">
                              <div className="truncate">{user.email}</div>
                              {user.registration && (
                                <div className="text-gray-400">Matrícula: {user.registration}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 pt-4 border-t bg-gray-50/50 px-4 py-3 rounded-b-lg">
                <div className="text-xs sm:text-sm text-gray-600 order-2 sm:order-1">
                  <span className="font-medium">{selectedUsers.length}</span> {userTypeSingular.toLowerCase()}(es) selecionado(s)
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
                    onClick={handleLinkUsers} 
                    disabled={selectedUsers.length === 0 || isLinking}
                    className={`h-10 order-1 sm:order-2 ${
                      userType === 'diretor' 
                        ? 'bg-red-600 hover:bg-red-700' 
                        : 'bg-orange-600 hover:bg-orange-700'
                    }`}
                  >
                    {isLinking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Building className="mr-2 h-4 w-4" />
                    Vincular ({selectedUsers.length})
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="create" className="flex-1 mt-0 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400 pr-2 scroll-smooth">
              <div className="space-y-4 pb-4">
                {/* Header */}
                <div className={`bg-gradient-to-r ${
                  userType === 'diretor' 
                    ? 'from-red-50 via-red-25 to-pink-50' 
                    : 'from-orange-50 via-yellow-25 to-amber-50'
                } p-3 rounded-lg border-l-4 ${
                  userType === 'diretor' ? 'border-red-500' : 'border-orange-500'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      userType === 'diretor' ? 'bg-red-100' : 'bg-orange-100'
                    }`}>
                      <Plus className={`h-5 w-5 ${
                        userType === 'diretor' ? 'text-red-600' : 'text-orange-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className={`font-semibold text-lg ${
                        userType === 'diretor' ? 'text-red-900' : 'text-orange-900'
                      }`}>
                        Criar Novo {userTypeSingular}
                      </h3>
                      <p className={`text-sm ${
                        userType === 'diretor' ? 'text-red-700' : 'text-orange-700'
                      }`}>
                        Preencha as informações para criar um novo {userTypeSingular.toLowerCase()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Formulário */}
                <div className="bg-white rounded-lg border shadow-sm p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Nome Completo */}
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        Nome Completo
                        <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="name"
                        placeholder="Digite o nome completo"
                        className={`h-11 transition-all duration-200 border-gray-300 focus:border-transparent focus:ring-2 ${
                          userType === 'diretor' 
                            ? 'focus:ring-red-500 focus:ring-opacity-50' 
                            : 'focus:ring-orange-500 focus:ring-opacity-50'
                        }`}
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        Email
                        <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="exemplo@email.com"
                        className={`h-11 transition-all duration-200 border-gray-300 focus:border-transparent focus:ring-2 ${
                          userType === 'diretor' 
                            ? 'focus:ring-red-500 focus:ring-opacity-50' 
                            : 'focus:ring-orange-500 focus:ring-opacity-50'
                        }`}
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                      />
                    </div>

                    {/* Senha */}
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        Senha
                        <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Digite uma senha segura"
                        className={`h-11 transition-all duration-200 border-gray-300 focus:border-transparent focus:ring-2 ${
                          userType === 'diretor' 
                            ? 'focus:ring-red-500 focus:ring-opacity-50' 
                            : 'focus:ring-orange-500 focus:ring-opacity-50'
                        }`}
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                      />
                    </div>

                    {/* Matrícula */}
                    <div className="space-y-2">
                      <Label htmlFor="registration" className="text-sm font-medium text-gray-700">
                        Matrícula
                        <span className="text-gray-400 ml-1">(Opcional)</span>
                      </Label>
                      <Input
                        id="registration"
                        placeholder="Digite a matrícula"
                        className={`h-11 transition-all duration-200 border-gray-300 focus:border-transparent focus:ring-2 ${
                          userType === 'diretor' 
                            ? 'focus:ring-red-500 focus:ring-opacity-50' 
                            : 'focus:ring-orange-500 focus:ring-opacity-50'
                        }`}
                        value={formData.registration}
                        onChange={(e) => handleInputChange('registration', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Data de Nascimento */}
                  <div className="mt-4 space-y-2">
                    <Label htmlFor="birth_date" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      Data de Nascimento
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="birth_date"
                      type="date"
                      className={`h-11 w-full max-w-xs transition-all duration-200 border-gray-300 focus:border-transparent focus:ring-2 ${
                        userType === 'diretor' 
                          ? 'focus:ring-red-500 focus:ring-opacity-50' 
                          : 'focus:ring-orange-500 focus:ring-opacity-50'
                      }`}
                      value={formData.birth_date}
                      onChange={(e) => handleInputChange('birth_date', e.target.value)}
                    />
                  </div>
                  
                  {/* Botões */}
                  <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-4 border-t border-gray-200">
                    <Button 
                      variant="outline" 
                      onClick={onClose} 
                      disabled={isCreating}
                      className="order-2 sm:order-1 h-11 border-gray-300 hover:bg-gray-50"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleCreateUser} 
                      disabled={isCreating}
                      className={`order-1 sm:order-2 flex-1 h-11 text-white font-medium shadow-sm transition-all duration-200 ${
                        userType === 'diretor' 
                          ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                          : 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500'
                      } focus:ring-2 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Criando...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Criar {userTypeSingular}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}