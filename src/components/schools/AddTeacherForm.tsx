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
import { UserPlus, Search } from "lucide-react";
import { useAuth } from "@/context/authContext";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";

interface AddTeacherFormProps {
    schoolId: string;
    schoolName: string;
    classes: {
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

export function AddTeacherForm({ schoolId, schoolName, classes, onSuccess }: AddTeacherFormProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
    const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([]);
    const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        registration: "",
        birthDate: "",
    });

    // Verificar se o usuário tem permissão
    if (user?.role !== "admin" && user?.role !== "tecadmin") {
        return null;
    }

    // Carregar professores ao abrir o modal
    useEffect(() => {
        const fetchTeachers = async () => {
            if (!isOpen) return;

            setIsLoading(true);
            try {
                const response = await api.get(`/teacher/`);
                const teachers = Array.isArray(response.data) ? response.data : [];
                console.log(teachers);
                setAllTeachers(teachers);
                setFilteredTeachers(teachers);
            } catch (error) {
                console.error("Error fetching teachers:", error);
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
    }, [isOpen, schoolId, toast]);

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
                escolas_ids: [schoolId],
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
            console.error("Error creating teacher:", error);
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
            await api.post(`/teacher/${selectedTeacher.id}/schools`, {
                escolas_ids: [schoolId],
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
            console.error("Error linking teacher:", error);
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
            <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                <DialogHeader className="pb-4">
                    <DialogTitle>Adicionar Professor - {schoolName}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
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
                            <MultiSelect
                                options={classes.map((c) => ({ id: c.id, name: c.name }))}
                                selected={selectedClasses}
                                onChange={setSelectedClasses}
                                placeholder="Selecione as turmas"
                            />
                        </div>

                        {!selectedTeacher && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nome</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) =>
                                            setFormData({ ...formData, name: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) =>
                                            setFormData({ ...formData, email: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Senha</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) =>
                                            setFormData({ ...formData, password: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="registration">Matrícula (opcional)</Label>
                                    <Input
                                        id="registration"
                                        value={formData.registration}
                                        onChange={(e) =>
                                            setFormData({ ...formData, registration: e.target.value })
                                        }
                                        placeholder="Digite a matrícula (opcional)"
                                    />
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
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setIsOpen(false)}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={selectedTeacher ? handleLinkTeacher : handleCreateTeacher}
                                disabled={isLoading}
                            >
                                {selectedTeacher ? "Vincular" : "Criar"}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
} 