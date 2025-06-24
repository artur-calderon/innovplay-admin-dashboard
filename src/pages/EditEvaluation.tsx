import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { MultiSelect, Option } from "@/components/ui/multi-select";
import { EvaluationFormData, Subject } from "@/components/evaluations/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Grade {
    id: string;
    name: string;
}

interface City {
    id: string;
    name: string;
    state: string;
}

interface School {
    id: string;
    name: string;
    domain: string;
    address: string;
    city_id: string;
    created_at: string;
    students_count: number;
    classes_count: number;
    city: City;
}

interface Evaluation {
    id: string;
    title: string;
    description: string | null;
    course: {
        id: string;
        name: string;
    } | null;
    model: string;
    subject: {
        id: string;
        name: string;
    };
    subjects_info?: Subject[];
    grade: {
        id: string;
        name: string;
    } | null;
    municipalities: any[];
    schools: any[];
    type: "AVALIACAO" | "SIMULADO";
    createdAt: string;
    questions: any[];
}

export default function EditEvaluation() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState<EvaluationFormData>({
        title: "",
        municipalities: [],
        schools: [],
        course: "",
        grade: "",
        classId: "",
        type: "AVALIACAO" as const,
        model: "SAEB" as const,
        subjects: [],
        subject: "",
        questions: [],
    });

    const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
    const [municipalities, setMunicipalities] = useState<{ id: string; name: string; state: string }[]>([]);
    const [states, setStates] = useState<string[]>([]);
    const [selectedState, setSelectedState] = useState<string>("");
    const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
    const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);
    const [grades, setGrades] = useState<Grade[]>([]);

    // Carregar dados da avaliação
    useEffect(() => {
        const fetchEvaluation = async () => {
            if (!id) return;
            try {
                setIsLoading(true);
                const response = await api.get(`/test/${id}`);
                const evaluationData = response.data;
                setEvaluation(evaluationData);

                // Preencher formulário com dados da avaliação
                setFormData({
                    title: evaluationData.title || "",
                    municipalities: evaluationData.municipalities?.map((m: any) => m.id || m) || [],
                    schools: evaluationData.schools?.map((s: any) => s.id || s) || [],
                    course: evaluationData.course?.id || "",
                    grade: evaluationData.grade?.id || "",
                    classId: evaluationData.class_id || "",
                    type: evaluationData.type || "AVALIACAO",
                    model: evaluationData.model || "SAEB",
                    subjects: evaluationData.subjects_info || [],
                    subject: evaluationData.subject?.id || "",
                    questions: evaluationData.questions || [],
                });

                // Definir estado selecionado baseado nos municípios
                if (evaluationData.municipalities?.length > 0) {
                    const firstMunicipality = evaluationData.municipalities[0];
                    if (firstMunicipality.state) {
                        setSelectedState(firstMunicipality.state);
                    }
                }
            } catch (error) {
                console.error("Erro ao buscar avaliação:", error);
                toast({
                    title: "Erro",
                    description: "Não foi possível carregar os dados da avaliação",
                    variant: "destructive",
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchEvaluation();
    }, [id, toast]);

    // Carregar dados de referência
    useEffect(() => {
        const fetchReferenceData = async () => {
            try {
                const [municipalitiesResponse, coursesResponse] = await Promise.all([
                    api.get("/city"),
                    api.get("/education_stages"),
                ]);

                setMunicipalities(municipalitiesResponse.data);
                const uniqueStates = Array.from(new Set((municipalitiesResponse.data as { state: string }[]).map((c) => c.state)));
                setStates(uniqueStates);
                setCourses(coursesResponse.data);
            } catch (error) {
                console.error("Erro ao buscar dados de referência:", error);
                toast({
                    title: "Erro",
                    description: "Não foi possível carregar os dados de referência",
                    variant: "destructive",
                });
            }
        };

        fetchReferenceData();
    }, [toast]);

    // Carregar escolas quando municípios mudarem
    useEffect(() => {
        const fetchSchools = async () => {
            if (formData.municipalities.length === 0) {
                setSchools([]);
                return;
            }

            try {
                const response = await api.get("/school", {
                    params: { municipalities: formData.municipalities.join(",") },
                });
                setSchools(response.data);
            } catch (error) {
                console.error("Erro ao buscar escolas:", error);
                setSchools([]);
            }
        };

        fetchSchools();
    }, [formData.municipalities]);

    // Carregar séries quando curso mudar
    useEffect(() => {
        const fetchGrades = async () => {
            if (!formData.course) {
                setGrades([]);
                return;
            }

            try {
                const response = await api.get(`/grades/education-stage/${formData.course}`);
                setGrades(response.data);
            } catch (error) {
                console.error("Erro ao buscar séries:", error);
                setGrades([]);
            }
        };

        fetchGrades();
    }, [formData.course]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.title) {
            toast({
                title: "Erro",
                description: "O título é obrigatório",
                variant: "destructive",
            });
            return;
        }

        if (!formData.municipalities.length) {
            toast({
                title: "Erro",
                description: "Selecione pelo menos um município",
                variant: "destructive",
            });
            return;
        }

        if (!formData.schools.length) {
            toast({
                title: "Erro",
                description: "Selecione pelo menos uma escola",
                variant: "destructive",
            });
            return;
        }

        if (!formData.course) {
            toast({
                title: "Erro",
                description: "Selecione um curso",
                variant: "destructive",
            });
            return;
        }

        if (!formData.grade) {
            toast({
                title: "Erro",
                description: "Selecione uma série",
                variant: "destructive",
            });
            return;
        }

        try {
            setIsSaving(true);

            const response = await api.put(`/test/${id}`, {
                title: formData.title,
                municipalities: formData.municipalities,
                schools: formData.schools,
                course: formData.course,
                grade: formData.grade,
                class_id: formData.classId,
                type: formData.type,
                model: formData.model,
                subjects: evaluation.subjects_info || [evaluation.subject],
                subject: evaluation.subject?.id || evaluation.subjects_info?.[0]?.id || "",
            });

            toast({
                title: "Sucesso",
                description: "Avaliação atualizada com sucesso!",
            });

            navigate(`/app/avaliacao/${id}`);
        } catch (error) {
            console.error("Erro ao atualizar avaliação:", error);
            toast({
                title: "Erro",
                description: "Não foi possível atualizar a avaliação",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="container mx-auto py-6">
                <div className="text-center">Carregando avaliação...</div>
            </div>
        );
    }

    if (!evaluation) {
        return (
            <div className="container mx-auto py-6">
                <div className="text-center">Avaliação não encontrada.</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6">
            <div className="mb-6">
                <Button
                    variant="ghost"
                    onClick={() => navigate(`/app/avaliacao/${id}`)}
                    className="mb-4"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                </Button>
                <h1 className="text-2xl font-bold">Editar Avaliação</h1>
                <p className="text-muted-foreground">
                    Edite as informações da avaliação. Para editar questões, acesse "Cadastros &gt; Questões".
                </p>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <Label htmlFor="title">Título da Avaliação</Label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                                placeholder="Digite o título da avaliação"
                            />
                        </div>

                        <div>
                            <Label>Estado</Label>
                            <Select value={selectedState} onValueChange={setSelectedState}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione um estado" />
                                </SelectTrigger>
                                <SelectContent>
                                    {states.map((state) => (
                                        <SelectItem key={state} value={state}>
                                            {state}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Municípios</Label>
                            {municipalities.length === 0 ? (
                                <div className="text-sm text-muted-foreground">
                                    Não há municípios cadastrados
                                </div>
                            ) : (
                                <MultiSelect
                                    options={municipalities
                                        .filter((m) => !selectedState || m.state === selectedState)
                                        .map((m) => ({ id: m.id, name: m.name }))}
                                    selected={formData.municipalities}
                                    onChange={(selected) => {
                                        setFormData((prev) => ({ ...prev, municipalities: selected, schools: [] }));
                                    }}
                                    placeholder="Selecione um ou mais municípios"
                                />
                            )}
                        </div>

                        <div>
                            <Label>Escolas</Label>
                            {schools.length === 0 ? (
                                <div className="text-sm text-muted-foreground">
                                    Não há escolas cadastradas nos municípios selecionados
                                </div>
                            ) : (
                                <MultiSelect
                                    options={[
                                        { id: "ALL", name: "Todos" },
                                        ...schools.map((s) => ({ id: s.id, name: s.name })),
                                    ]}
                                    selected={formData.schools}
                                    onChange={(selected) => {
                                        if (selected.includes("ALL")) {
                                            const allIds = schools.map((s) => s.id);
                                            setFormData((prev) => ({ ...prev, schools: allIds }));
                                        } else {
                                            setFormData((prev) => ({ ...prev, schools: selected }));
                                        }
                                    }}
                                    placeholder="Selecione uma ou mais escolas"
                                />
                            )}
                        </div>

                        <div>
                            <Label>Curso</Label>
                            <Select
                                value={formData.course}
                                onValueChange={(value) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        course: value,
                                        grade: "",
                                    }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione um curso" />
                                </SelectTrigger>
                                <SelectContent>
                                    {courses.map((course) => (
                                        <SelectItem key={course.id} value={course.id}>
                                            {course.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Série</Label>
                            <Select
                                value={formData.grade}
                                onValueChange={(value) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        grade: value,
                                    }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione uma série" />
                                </SelectTrigger>
                                <SelectContent>
                                    {grades.map((grade) => (
                                        <SelectItem key={grade.id} value={grade.id}>
                                            {grade.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Tipo</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(value: "AVALIACAO" | "SIMULADO") =>
                                    setFormData((prev) => ({ ...prev, type: value }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="AVALIACAO">Avaliação</SelectItem>
                                    <SelectItem value="SIMULADO">Simulado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Modelo</Label>
                            <Select
                                value={formData.model}
                                onValueChange={(value: "SAEB" | "PROVA" | "AVALIE") =>
                                    setFormData((prev) => ({ ...prev, model: value }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="SAEB">SAEB</SelectItem>
                                    <SelectItem value="PROVA">Prova</SelectItem>
                                    <SelectItem value="AVALIE">Avalie</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Informações não editáveis */}
                        <div className="border rounded-lg p-4 bg-gray-50">
                            <h3 className="font-medium mb-3">Informações não editáveis</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Disciplinas</label>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {evaluation.subjects_info && evaluation.subjects_info.length > 0 ? (
                                            evaluation.subjects_info.map((subject) => (
                                                <Badge key={subject.id} variant="outline">
                                                    {subject.name}
                                                </Badge>
                                            ))
                                        ) : (
                                            <Badge variant="outline">
                                                {evaluation.subject?.name || 'Não informado'}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Para alterar as disciplinas, exclua esta avaliação e crie uma nova.
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Questões</label>
                                    <p className="text-sm">{evaluation.questions?.length || 0} questões</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Para editar questões individuais, acesse "Cadastros &gt; Questões".
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate(`/app/avaliacao/${id}`)}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isSaving}>
                                <Save className="mr-2 h-4 w-4" />
                                {isSaving ? "Salvando..." : "Salvar Alterações"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
} 