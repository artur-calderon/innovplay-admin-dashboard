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
import { UserPlus, Search, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/authContext";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { getRoleDisplayName } from "@/lib/constants";

interface AddTeacherFormProps {
    schoolId: string;
    schoolName: string;
    classes?: {
        id: string;
        name: string;
    }[];
    onSuccess?: () => void;
}

interface Teacher {
    id: string;
    name: string;
    email: string;
    registration?: string;
    birth_date?: string;
}

export function AddTeacherForm({ schoolId, schoolName, classes = [], onSuccess }: AddTeacherFormProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
    const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([]);
    const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        registration: "",
        birthDate: "",
    });

    // Carregar professores ao abrir o modal
    useEffect(() => {
        const fetchTeachers = async () => {
            if (!isOpen || !user || (user.role !== "admin" && user.role !== "tecadm")) return;

            setIsLoading(true);
            try {
                const response = await api.get(`/teacher/`);
                const teachers = Array.isArray(response.data) ? response.data : [];
                setAllTeachers(teachers);
                setFilteredTeachers(teachers);
            } catch (error) {
                toast({
                    title: "Erro",
                    description: "Erro ao carregar professores",
                    variant: "destructive",
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchTeachers();
    }, [isOpen, schoolId, toast, user]);

    // Filtrar professores quando o termo de busca mudar
    useEffect(() => {
        if (!searchTerm) {
            setFilteredTeachers(allTeachers);
            return;
        }

        const filtered = allTeachers.filter((teacher) =>
            teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            teacher.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (teacher.registration && teacher.registration.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        setFilteredTeachers(filtered);
    }, [searchTerm, allTeachers]);

    // Verificar se o usuário tem permissão
    if (!user || (user.role !== "admin" && user.role !== "tecadm")) {
        return null;
    }

    const handleTeacherSelect = (teacherId: string) => {
        const teacher = allTeachers.find((t) => t.id === teacherId);
        if (teacher) {
            setSelectedTeacher(teacher);
            setFormData({
                name: teacher.name,
                email: teacher.email,
                password: "",
                registration: teacher.registration || "",
                birthDate: teacher.birth_date || "",
            });
        }
    };

    const handleCreateTeacher = async () => {
        setIsLoading(true);
        try {
            const response = await api.post("/teacher", {
                ...formData,
                matricula: formData.registration || undefined,
            });

            // Vincular professor à escola
            await api.post("/school-teacher", {
                teacher_id: response.data.id,
                school_id: schoolId
            });

            if (selectedClasses.length > 0) {
                await api.post(`/teacher/${response.data.id}/classes`, {
                    classes_ids: selectedClasses,
                });
            }

            toast({
                title: "Sucesso",
                description: "Professor criado com sucesso",
            });
            setIsOpen(false);
            onSuccess?.();
        } catch (error) {
            toast({
                title: "Erro",
                description: "Erro ao criar professor",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleLinkTeacher = async () => {
        if (!selectedTeacher) return;
        setIsLoading(true);
        try {
            await api.post("/school-teacher", {
                teacher_id: selectedTeacher.id,
                school_id: schoolId
            });

            if (selectedClasses.length > 0) {
                await api.post(`/teacher/${selectedTeacher.id}/classes`, {
                    classes_ids: selectedClasses,
                });
            }

            toast({
                title: "Sucesso",
                description: "Professor vinculado com sucesso",
            });
            setIsOpen(false);
            onSuccess?.();
        } catch (error) {
            toast({
                title: "Erro",
                description: "Erro ao vincular professor",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Adicionar Professor
                </Button>
            </DialogTrigger>
            <DialogContent className="w-full max-w-[95vw] sm:max-w-2xl lg:max-w-3xl max-h-[95vh] overflow-hidden flex flex-col">
                <DialogHeader className="pb-3 border-b">
                    <DialogTitle className="text-lg sm:text-xl">Adicionar Professor - {schoolName}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Buscar Professor</Label>
                            <Input
                                placeholder="Digite o nome, email ou matrícula..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {filteredTeachers.length > 0 && (
                            <div className="space-y-2">
                                <Label>Professores encontrados</Label>
                                <Select
                                    value={selectedTeacher?.id}
                                    onValueChange={handleTeacherSelect}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione um professor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredTeachers.map((teacher) => (
                                            <SelectItem key={teacher.id} value={teacher.id}>
                                                {teacher.name} - {teacher.email}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Turmas</Label>
                            {classes && classes.length > 0 ? (
                                <MultiSelect
                                    options={classes.map((c) => ({ id: c.id, name: c.name }))}
                                    selected={selectedClasses}
                                    onChange={setSelectedClasses}
                                    placeholder="Selecione as turmas"
                                />
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    Nenhuma turma disponível para seleção
                                </p>
                            )}
                        </div>

                        {!selectedTeacher && (
                            <div className="space-y-4 bg-gray-50 p-4 rounded-lg border">
                                <h3 className="font-semibold text-sm text-gray-700 mb-3">Criar Novo Professor</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="flex items-center gap-1">
                                            Nome
                                            <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) =>
                                                setFormData({ ...formData, name: e.target.value })
                                            }
                                            placeholder="Nome completo"
                                            className="h-11"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="flex items-center gap-1">
                                            Email
                                            <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) =>
                                                setFormData({ ...formData, email: e.target.value })
                                            }
                                            placeholder="email@exemplo.com"
                                            className="h-11"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password" className="flex items-center gap-1">
                                            Senha
                                            <span className="text-red-500">*</span>
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="password"
                                                type={showPassword ? "text" : "password"}
                                                value={formData.password}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, password: e.target.value })
                                                }
                                                placeholder="Digite uma senha"
                                                className="h-11 pr-10"
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
                                            onChange={(e) =>
                                                setFormData({ ...formData, registration: e.target.value })
                                            }
                                            placeholder="Número de matrícula"
                                            className="h-11"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="birthDate">Data de Nascimento</Label>
                                    <Input
                                        id="birthDate"
                                        type="date"
                                        value={formData.birthDate}
                                        onChange={(e) =>
                                            setFormData({ ...formData, birthDate: e.target.value })
                                        }
                                        className="h-11 max-w-xs"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
                            <Button 
                                variant="outline" 
                                onClick={() => setIsOpen(false)}
                                className="order-2 sm:order-1 h-11"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={selectedTeacher ? handleLinkTeacher : handleCreateTeacher}
                                disabled={isLoading}
                                className="order-1 sm:order-2 h-11"
                            >
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {selectedTeacher ? "Vincular Professor" : "Criar Professor"}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
} 