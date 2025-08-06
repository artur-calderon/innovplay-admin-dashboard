import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { UserPlus, Search, Plus, Users } from "lucide-react";
import { useAuth } from "@/context/authContext";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface AddUserFormProps {
    schoolId: string;
    schoolName: string;
    userType: 'professor' | 'diretor' | 'coordenador' | 'aluno';
    onSuccess?: () => void;
}

interface User {
    id: string;
    name: string;
    email: string;
    registration?: string;
    birth_date?: string;
    role?: string;
}

const USER_TYPE_CONFIG = {
    professor: {
        title: "Professor",
        apiEndpoint: "/users",
        linkEndpoint: "/teacher",
        schoolsEndpoint: "/teacher",
        classesEndpoint: "/teacher",
        role: "professor",
        color: "blue"
    },
    diretor: {
        title: "Diretor",
        apiEndpoint: "/users",
        linkEndpoint: "/teacher",
        schoolsEndpoint: "/teacher",
        classesEndpoint: "/teacher",
        role: "diretor",
        color: "red"
    },
    coordenador: {
        title: "Coordenador",
        apiEndpoint: "/users",
        linkEndpoint: "/teacher",
        schoolsEndpoint: "/teacher",
        classesEndpoint: "/teacher",
        role: "coordenador",
        color: "orange"
    },
    aluno: {
        title: "Aluno",
        apiEndpoint: "/users",
        linkEndpoint: "/students",
        schoolsEndpoint: "/students",
        classesEndpoint: "/students",
        role: "aluno",
        color: "green"
    }
};

export function AddUserForm({ schoolId, schoolName, userType, onSuccess }: AddUserFormProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [activeTab, setActiveTab] = useState("existing");
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        registration: "",
        birthDate: "",
    });

    const config = USER_TYPE_CONFIG[userType];

    // Verificar permissões baseadas no role do usuário e tipo de usuário a ser adicionado
    const canAddUser = () => {
        if (!user) return false;
        
        // Permitir que admin e tecadmin vejam todos os usuários
        if (user.role === 'admin' || user.role === 'tecadmin') return true;
        
        switch (userType) {
            case 'diretor':
                return user.role === 'admin' || user.role === 'tecadmin';
            case 'coordenador':
                return user.role === 'admin' || user.role === 'tecadmin' || user.role === 'diretor';
            case 'professor':
                return user.role === 'admin' || user.role === 'tecadmin' || user.role === 'diretor' || user.role === 'coordenador';
            case 'aluno':
                return user.role !== 'aluno';
            default:
                return false;
        }
    };

    if (!canAddUser()) {
        return null;
    }

    // Carregar usuários existentes ao abrir o modal
    useEffect(() => {
        const fetchUsers = async () => {
            if (!isOpen) return;

            setIsLoading(true);
            try {
                // Buscar usuários baseado no tipo
                let response;
                let users = [];
                
                try {
                    if (userType === 'aluno') {
                        response = await api.get('/students/');
                    } else {
                        response = await api.get('/teacher/');
                    }
                    
                    users = Array.isArray(response.data) ? response.data : [];
                } catch (error) {
                    console.log('First endpoint failed, trying alternative...');
                    // Tentar endpoint alternativo
                    try {
                        response = await api.get('/users/');
                        users = Array.isArray(response.data) ? response.data : [];
                    } catch (secondError) {
                        console.log('Both endpoints failed');
                        users = [];
                    }
                }
                
                // Mostrar todos os usuários disponíveis para permitir vinculação
                const usersToShow = users;
                
                // Log para debug
                console.log(`Found ${usersToShow.length} users for ${userType}`);
                if (usersToShow.length === 0) {
                    console.log('No users found. This might be because:');
                    console.log('1. The API endpoint is not working');
                    console.log('2. There are no users in the system');
                    console.log('3. The user does not have permission to view users');
                    
                    // Mostrar dados de exemplo para testar a interface
                    if (process.env.NODE_ENV === 'development') {
                        const mockUsers = [
                            {
                                id: '1',
                                name: 'João Silva',
                                email: 'joao.silva@email.com',
                                registration: '12345',
                                role: config.role
                            },
                            {
                                id: '2',
                                name: 'Maria Santos',
                                email: 'maria.santos@email.com',
                                registration: '67890',
                                role: config.role
                            }
                        ];
                        console.log('Using mock data for development');
                        setAllUsers(mockUsers);
                        setFilteredUsers(mockUsers);
                        return;
                    }
                }
                
                setAllUsers(usersToShow);
                setFilteredUsers(usersToShow);
            } catch (error) {
                console.error(`Error fetching ${userType}:`, error);
                toast({
                    title: "Erro",
                    description: `Erro ao carregar ${config.title.toLowerCase()}s`,
                    variant: "destructive",
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchUsers();
    }, [isOpen, config.apiEndpoint, config.role, userType, toast]);

    // Filtrar usuários quando o termo de busca mudar
    useEffect(() => {
        if (!searchTerm) {
            setFilteredUsers(allUsers);
            return;
        }

        const filtered = allUsers.filter((user) =>
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.registration && user.registration.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        setFilteredUsers(filtered);
    }, [searchTerm, allUsers]);

    const handleUserSelect = (userId: string) => {
        const selected = allUsers.find((u) => u.id === userId);
        if (selected) {
            setSelectedUser(selected);
            setFormData({
                name: selected.name,
                email: selected.email,
                password: "",
                registration: selected.registration || "",
                birthDate: selected.birth_date || "",
            });
        }
    };

    const handleCreateUser = async () => {
        setIsLoading(true);
        try {
            const userData = {
                ...formData,
                role: config.role,
                matricula: formData.registration || undefined,
            };

            // Adicionar escolas_ids apenas se não for aluno
            if (userType !== 'aluno') {
                userData.escolas_ids = [schoolId];
            } else {
                userData.escola_id = schoolId;
            }

            const response = await api.post(config.apiEndpoint, userData);

            toast({
                title: "Sucesso",
                description: `${config.title} criado com sucesso`,
            });
            setIsOpen(false);
            onSuccess?.();
        } catch (error) {
            console.error(`Error creating ${userType}:`, error);
            toast({
                title: "Erro",
                description: `Erro ao criar ${config.title.toLowerCase()}`,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleLinkUser = async () => {
        if (!selectedUser) return;
        setIsLoading(true);
        try {
            if (userType !== 'aluno') {
                await api.post(`${config.schoolsEndpoint}/${selectedUser.id}/schools`, {
                    escolas_ids: [schoolId],
                });
            } else {
                await api.post(`${config.schoolsEndpoint}/${selectedUser.id}/schools`, {
                    escola_id: schoolId,
                });
            }

            toast({
                title: "Sucesso",
                description: `${config.title} vinculado com sucesso`,
            });
            setIsOpen(false);
            onSuccess?.();
        } catch (error) {
            console.error(`Error linking ${userType}:`, error);
            toast({
                title: "Erro",
                description: `Erro ao vincular ${config.title.toLowerCase()}`,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: "",
            email: "",
            password: "",
            registration: "",
            birthDate: "",
        });
        setSelectedUser(null);
        setSearchTerm("");
        setActiveTab("existing");
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) resetForm();
        }}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs">
                    <Plus className="h-3 w-3 mr-1" />
                    Adicionar {config.title}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader className="pb-4">
                    <DialogTitle className="flex items-center gap-2">
                        <Users className={`h-5 w-5 text-${config.color}-600`} />
                        Adicionar {config.title} - {schoolName}
                    </DialogTitle>
                </DialogHeader>
                
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="existing">Usuário Existente</TabsTrigger>
                        <TabsTrigger value="new">Novo Usuário</TabsTrigger>
                    </TabsList>

                    <TabsContent value="existing" className="space-y-4">
                        <div className="space-y-2">
                            <Label>Buscar {config.title}</Label>
                            <Input
                                placeholder={`Digite o nome, email ou matrícula...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {isLoading ? (
                            <div className="text-center py-4">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
                                <p className="text-sm text-muted-foreground mt-2">Carregando...</p>
                            </div>
                        ) : filteredUsers.length > 0 ? (
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {filteredUsers.map((user) => (
                                    <div
                                        key={user.id}
                                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                                            selectedUser?.id === user.id ? 'bg-blue-50 border-blue-200' : ''
                                        }`}
                                        onClick={() => handleUserSelect(user.id)}
                                    >
                                        <div className="flex-1">
                                            <div className="font-medium text-sm">{user.name}</div>
                                            <div className="text-xs text-muted-foreground">{user.email}</div>
                                            {user.registration && (
                                                <div className="text-xs text-muted-foreground">
                                                    Matrícula: {user.registration}
                                                </div>
                                            )}
                                        </div>
                                        <Badge variant="outline" className="text-xs">
                                            {user.role || config.role}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                                                 ) : (
                             <div className="text-center py-4">
                                 <p className="text-sm text-muted-foreground">
                                     {searchTerm ? "Nenhum usuário encontrado" : "Nenhum usuário disponível no sistema"}
                                 </p>
                                 <p className="text-xs text-muted-foreground mt-1">
                                     Use a aba "Novo Usuário" para criar um novo {config.title.toLowerCase()}
                                 </p>
                             </div>
                         )}

                        {selectedUser && (
                            <div className="border-t pt-4">
                                <div className="flex justify-end gap-2">
                                    <Button
                                        onClick={handleLinkUser}
                                        disabled={isLoading}
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        {isLoading ? "Vinculando..." : `Vincular ${config.title}`}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="new" className="space-y-4">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Digite o nome completo"
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="exemplo@email.com"
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="password">Senha</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="Mínimo 6 caracteres"
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="registration">Matrícula (opcional)</Label>
                                <Input
                                    id="registration"
                                    value={formData.registration}
                                    onChange={(e) => setFormData({ ...formData, registration: e.target.value })}
                                    placeholder="Digite a matrícula"
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="birthDate">Data de Nascimento</Label>
                                <Input
                                    id="birthDate"
                                    type="date"
                                    value={formData.birthDate}
                                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                onClick={handleCreateUser}
                                disabled={isLoading || !formData.name || !formData.email || !formData.password}
                            >
                                {isLoading ? "Criando..." : `Criar ${config.title}`}
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
} 