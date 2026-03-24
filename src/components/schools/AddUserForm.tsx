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
import { UserPlus, Search, Plus, Users, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useEmailCheck, generatePasswordFromName } from "@/hooks/useEmailCheck";
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
import { getRoleDisplayName } from "@/lib/constants";

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
    city_id?: string;
}

const USER_TYPE_CONFIG = {
    professor: {
        title: "Professor",
        apiEndpoint: "/teacher",
        fetchEndpoint: "/teacher",
        linkEndpoint: "/teacher",
        schoolsEndpoint: "/teacher",
        classesEndpoint: "/teacher",
        role: "professor",
        color: "blue",
        responseKey: "professores",
        requiredFields: ["name", "email", "password"],
        optionalFields: ["registration", "birthDate"],
        dataMapping: {
            name: "nome",
            email: "email",
            password: "senha",
            registration: "matricula",
            birthDate: "birth_date"
        },
        requiresCityId: false
    },
    diretor: {
        title: "Diretor",
        apiEndpoint: "/teacher/directors",
        fetchEndpoint: "/teacher/directors",
        linkEndpoint: "/teacher",
        schoolsEndpoint: "/teacher",
        classesEndpoint: "/teacher",
        role: "diretor",
        color: "red",
        responseKey: "diretores",
        requiredFields: ["name", "email", "password", "registration"],
        optionalFields: ["birthDate"],
        dataMapping: {
            name: "nome",
            email: "email",
            password: "senha",
            registration: "matricula",
            birthDate: "birth_date"
        },
        requiresCityId: true
    },
    coordenador: {
        title: "Coordenador",
        apiEndpoint: "/teacher/coordinators",
        fetchEndpoint: "/teacher/coordinators",
        linkEndpoint: "/teacher",
        schoolsEndpoint: "/teacher",
        classesEndpoint: "/teacher",
        role: "coordenador",
        color: "orange",
        responseKey: "coordenadores",
        requiredFields: ["name", "email", "password", "registration"],
        optionalFields: ["birthDate"],
        dataMapping: {
            name: "nome",
            email: "email",
            password: "senha",
            registration: "matricula",
            birthDate: "birth_date"
        },
        requiresCityId: true
    },
    aluno: {
        title: "Aluno",
        apiEndpoint: "/students",
        fetchEndpoint: "/students/",
        linkEndpoint: "/students",
        schoolsEndpoint: "/students",
        classesEndpoint: "/students",
        role: "aluno",
        color: "green",
        responseKey: null,
        requiredFields: ["name", "email", "password"],
        optionalFields: ["registration", "birthDate", "classId", "gradeId"],
        dataMapping: {
            name: "name",
            email: "email",
            password: "password",
            registration: "registration",
            birthDate: "birth_date",
            classId: "class_id",
            gradeId: "grade_id"
        },
        requiresCityId: false
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
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        registration: "",
        birthDate: "",
        classId: "",
        gradeId: "",
    });

    const config = USER_TYPE_CONFIG[userType];

    const { checkedEmail, isChecking, isAvailable } = useEmailCheck(formData.name, activeTab === "new");

    // Sincronizar email e senha com formData quando nome muda na aba "novo"
    useEffect(() => {
        if (activeTab !== "new") return;
        if (checkedEmail) {
            setFormData(prev => ({ ...prev, email: checkedEmail }));
        }
    }, [checkedEmail, activeTab]);

    useEffect(() => {
        if (activeTab !== "new") return;
        if (formData.name) {
            setFormData(prev => ({ ...prev, password: generatePasswordFromName(prev.name) }));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.name, activeTab]);

    // Verificar permissões baseadas no role do usuário e tipo de usuário a ser adicionado
    const canAddUser = () => {
        if (!user) return false;
        
        // Permitir que admin e tecadm vejam todos os usuários
if (user.role === 'admin' || user.role === 'tecadm') return true;
        
        switch (userType) {
            case 'diretor':
                return user.role === 'admin' || user.role === 'tecadm';
            case 'coordenador':
                return user.role === 'admin' || user.role === 'tecadm' || user.role === 'diretor';
            case 'professor':
                return user.role === 'admin' || user.role === 'tecadm' || user.role === 'diretor' || user.role === 'coordenador';
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
                        response = await api.get(config.fetchEndpoint);
                        users = Array.isArray(response.data) ? response.data : response.data?.alunos ?? response.data?.students ?? [];
                    } else {
                        response = await api.get(config.fetchEndpoint);
                        if (response.data && config.responseKey && response.data[config.responseKey]) {
                            users = response.data[config.responseKey];
                        } else if (Array.isArray(response.data)) {
                            users = response.data;
                        } else {
                            users = [];
                        }
                    }
                } catch (firstError: unknown) {
                    const status = (firstError as { response?: { status?: number } })?.response?.status;
                    // 404/204 = nenhum usuário com a role; não exibir erro
                    if (status === 404 || status === 204) {
                        users = [];
                    } else {
                        try {
                            response = await api.get('/users/');
                            users = Array.isArray(response?.data) ? response.data : [];
                        } catch {
                            users = [];
                        }
                    }
                }

                const usersToShow = Array.isArray(users) ? users : [];
                setAllUsers(usersToShow);
                setFilteredUsers(usersToShow);
            } catch (error: unknown) {
                const status = (error as { response?: { status?: number } })?.response?.status;
                if (status !== 404 && status !== 204) {
                    console.error(`Error fetching ${userType}:`, error);
                    toast({
                        title: "Erro",
                        description: `Erro ao carregar ${config.title.toLowerCase()}s`,
                        variant: "destructive",
                    });
                }
                setAllUsers([]);
                setFilteredUsers([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUsers();
    }, [isOpen, config.fetchEndpoint, config.role, userType, toast]);

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
                classId: "",
                gradeId: "",
            });
        }
    };

    const handleCreateUser = async () => {
        setIsLoading(true);
        try {
            // Mapear dados conforme a estrutura esperada pela API
            const mappedData: any = {};
            
            // Mapear campos usando a configuração
            Object.entries(config.dataMapping).forEach(([formKey, apiKey]) => {
                if (formData[formKey as keyof typeof formData]) {
                    mappedData[apiKey] = formData[formKey as keyof typeof formData];
                }
            });

            // Adicionar campos específicos baseado no tipo
            if (userType === 'aluno') {
                // Para alunos, adicionar class_id e grade_id se fornecidos
                if (formData.classId) mappedData.class_id = formData.classId;
                if (formData.gradeId) mappedData.grade_id = formData.gradeId;
            } else {
                // Para professores, diretores e coordenadores
                mappedData.escolas_ids = [schoolId];
                
                // Adicionar city_id se necessário
                if (config.requiresCityId) {
                    // Se o usuário atual é admin ou tecadm, permitir especificar city_id
                    // Se é diretor, usar o próprio city_id
                    if (['admin', 'tecadm'].includes(user?.role || '')) {
                        // TODO: Adicionar campo para city_id no formulário
                        // Por enquanto, usar o city_id da escola
                        mappedData.city_id = schoolId; // Placeholder
                    } else {
                        // Usar city_id do usuário atual se disponível
                        mappedData.city_id = (user as any)?.city_id;
                    }
                }
            }

            const response = await api.post(config.apiEndpoint, mappedData);

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
            if (userType === 'diretor' || userType === 'coordenador') {
                await api.post("/managers/link-to-school", {
                    user_id: selectedUser.id,
                    school_id: schoolId,
                });
            } else if (userType === 'professor') {
                await api.post("/school-teacher", {
                    school_id: schoolId,
                    teacher_id: (selectedUser as { teacher_id?: string }).teacher_id ?? selectedUser.id,
                });
            } else if (userType === 'aluno') {
                await api.post(`${config.schoolsEndpoint}/${selectedUser.id}/schools`, {
                    escola_id: schoolId,
                });
            } else {
                toast({
                    title: "Erro",
                    description: `Vínculo não suportado para o perfil ${config.title}`,
                    variant: "destructive",
                });
                return;
            }

            toast({
                title: "Sucesso",
                description: `${config.title} vinculado com sucesso`,
            });
            setIsOpen(false);
            onSuccess?.();
        } catch (error) {
            console.error(`Error linking ${userType}:`, error);
            const msg = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
            toast({
                title: "Erro",
                description: msg || `Erro ao vincular ${config.title.toLowerCase()}`,
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
            classId: "",
            gradeId: "",
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
                                {filteredUsers.map((user, index) => (
                                    <div
                                        key={user.id || `user-${index}`}
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
                                <Label htmlFor="email" className="text-sm text-gray-600">Email (Gerado automaticamente)</Label>
                                <div className="relative">
                                    <Input
                                        id="email"
                                        value={formData.email}
                                        readOnly
                                        className="bg-gray-50 border-gray-200 font-mono cursor-not-allowed pr-8"
                                        placeholder="Será gerado ao digitar o nome"
                                    />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                        {isChecking && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                                        {!isChecking && isAvailable === true && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                        {!isChecking && isAvailable === false && <AlertCircle className="h-4 w-4 text-amber-500" />}
                                    </div>
                                </div>
                                {!isChecking && isAvailable === false && (
                                    <p className="text-xs text-amber-600">Email original em uso. Usando sugestão disponível.</p>
                                )}
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-sm text-gray-600">Senha (Gerada automaticamente)</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={formData.password}
                                        readOnly
                                        className="bg-gray-50 border-gray-200 font-mono cursor-not-allowed pr-10"
                                        placeholder="Será gerada ao digitar o nome"
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        onClick={() => setShowPassword(!showPassword)}
                                        aria-label={showPassword ? "Ocultar senha" : "Ver senha"}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
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
                            
                            {userType === 'aluno' && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="classId">Turma (opcional)</Label>
                                        <Input
                                            id="classId"
                                            value={formData.classId}
                                            onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                                            placeholder="ID da turma"
                                        />
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <Label htmlFor="gradeId">Série (opcional)</Label>
                                        <Input
                                            id="gradeId"
                                            value={formData.gradeId}
                                            onChange={(e) => setFormData({ ...formData, gradeId: e.target.value })}
                                            placeholder="ID da série"
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                onClick={handleCreateUser}
                                disabled={isLoading || config.requiredFields.some(field => !formData[field as keyof typeof formData])}
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