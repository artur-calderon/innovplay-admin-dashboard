import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, FileCheck } from "lucide-react";
import { CreateEvaluationModal } from "@/components/evaluations/CreateEvaluationModal";
import { EvaluationFormData, Question as FormQuestion } from "@/components/evaluations/types";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface Municipality {
    id: string;
    name: string;
}

interface School {
    id: string;
    name: string;
}

interface ApiQuestion {
    id: string;
    text: string;
    formattedText?: string;
    secondStatement?: string;
    [key: string]: unknown;
}

interface AppliedClass {
    class: {
        id: string;
        name: string;
    };
}

interface ApiError {
    response?: {
        status: number;
    };
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
    subjects?: Array<{ id: string; name: string }>;
    subjects_info?: Array<{ id: string; name: string }>;
    grade: {
        id: string;
        name: string;
    } | null;
    municipalities: Municipality[];
    schools: School[];
    type: "AVALIACAO" | "SIMULADO";
    createdAt: string;
    questions: ApiQuestion[];
    time_limit?: string;
    duration?: number;
    classes?: string[];
    applied_classes?: AppliedClass[];
}

const EditEvaluation = () => {
    const { id } = useParams<{ id: string }>();
    const [evaluationData, setEvaluationData] = useState<EvaluationFormData | null>(null);
    const [originalEvaluation, setOriginalEvaluation] = useState<Evaluation | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const { toast } = useToast();
    const navigate = useNavigate();

    // Carregar dados da avaliação existente
    useEffect(() => {
        const fetchEvaluation = async () => {
            if (!id) return;
            
            try {
                setIsLoading(true);
                const response = await api.get(`/test/${id}`);
                const evaluation: Evaluation = response.data;
                setOriginalEvaluation(evaluation);

                // Buscar estado baseado no primeiro município
                let stateName = "";
                if (evaluation.municipalities && evaluation.municipalities.length > 0) {
                    try {
                        const municipalityId = evaluation.municipalities[0].id || evaluation.municipalities[0];
                        const municipalityResponse = await api.get(`/city/${municipalityId}`);
                        stateName = municipalityResponse.data?.state || "";
                    } catch (error) {
                        console.error("Erro ao buscar estado do município:", error);
                    }
                }

                // Buscar questões completas da avaliação
                let questionsData: FormQuestion[] = [];
                try {
                    // Tentar buscar questões do endpoint de questões
                    const questionsResponse = await api.get(`/questions?test_id=${id}`);
                    if (Array.isArray(questionsResponse.data) && questionsResponse.data.length > 0) {
                        questionsData = questionsResponse.data.map((q: any) => ({
                            id: q.id,
                            text: q.text || q.formattedText || '',
                            formattedText: q.formattedText || q.text || '',
                            title: q.title || q.command || '',
                            type: q.type === 'multiple_choice' ? 'multipleChoice' : (q.type === 'open' || q.type === 'essay' ? 'dissertativa' : 'multipleChoice'),
                            subjectId: q.subject?.id || q.subject_id || '',
                            subject: q.subject,
                            grade: q.grade,
                            difficulty: q.difficulty || '',
                            value: q.value || q.points || 0,
                            solution: q.solution || '',
                            formattedSolution: q.formattedSolution || q.solution || '',
                            options: q.alternatives?.map((alt: any) => ({
                                id: alt.id,
                                text: alt.text,
                                isCorrect: alt.isCorrect || false,
                            })) || q.options || [],
                            secondStatement: q.secondStatement || q.secondstatement || '',
                            skills: q.skills || '',
                        })) as FormQuestion[];
                    }
                } catch (error) {
                    console.error("Erro ao buscar questões:", error);
                    // Se falhar, usar questões do evaluation se disponíveis
                    if (evaluation.questions && Array.isArray(evaluation.questions) && evaluation.questions.length > 0) {
                        questionsData = evaluation.questions as unknown as FormQuestion[];
                    }
                }

                // Converter escolas para o formato correto
                const schoolsFormatted = evaluation.schools?.map((s: School | string) => {
                    if (typeof s === 'string') {
                        return { id: s, name: s };
                    }
                    return { id: s.id, name: s.name };
                }) || [];

                // Converter turmas - tentar de applied_classes primeiro, depois de classes
                let classesFormatted: Array<{ id: string; name: string; school?: { id: string; name: string } }> = [];
                
                if (evaluation.applied_classes && evaluation.applied_classes.length > 0) {
                    // Usar applied_classes que tem informações completas
                    classesFormatted = evaluation.applied_classes.map((ac: AppliedClass) => ({
                        id: ac.class.id,
                        name: ac.class.name,
                        school: ac.class.school,
                    }));
                } else if (evaluation.classes && evaluation.classes.length > 0) {
                    // Se não tiver applied_classes, carregar informações das turmas
                    try {
                        const classesPromises = (Array.isArray(evaluation.classes) ? evaluation.classes : [evaluation.classes]).map(async (classId: string) => {
                            try {
                                const classRes = await api.get(`/classes/${classId}`);
                                return {
                                    id: classRes.data.id,
                                    name: classRes.data.name,
                                    school: classRes.data.school ? {
                                        id: classRes.data.school.id,
                                        name: classRes.data.school.name,
                                    } : undefined,
                                };
                            } catch {
                                return { id: classId, name: `Turma ${classId}` };
                            }
                        });
                        classesFormatted = await Promise.all(classesPromises);
                    } catch (error) {
                        console.error("Erro ao carregar informações das turmas:", error);
                    }
                }

                // Converter dados da avaliação para o formato do formulário
                const formData: EvaluationFormData = {
                    title: evaluation.title || "",
                    description: evaluation.description || "",
                    municipalities: evaluation.municipalities?.map((m: Municipality | string) => 
                        typeof m === 'string' ? m : m.id) || [],
                    schools: schoolsFormatted.map(s => s.id),
                    course: evaluation.course?.id || "",
                    grade: evaluation.grade?.id || "",
                    classId: classesFormatted[0]?.id || "",
                    type: evaluation.type || "AVALIACAO",
                    model: (evaluation.model === "SAEB" || evaluation.model === "PROVA" || evaluation.model === "AVALIE") 
                        ? evaluation.model 
                        : "SAEB",
                    subjects: evaluation.subjects || evaluation.subjects_info || (evaluation.subject ? [evaluation.subject] : []),
                    subject: evaluation.subject?.id || "",
                    questions: questionsData,
                    startDateTime: evaluation.time_limit || "",
                    duration: evaluation.duration?.toString() || "",
                    classes: classesFormatted.map(c => c.id),
                    state: stateName,
                    municipality: typeof evaluation.municipalities?.[0] === 'string' 
                        ? evaluation.municipalities[0] 
                        : evaluation.municipalities?.[0]?.id || "",
                    selectedSchools: schoolsFormatted,
                    selectedClasses: classesFormatted,
                };

                // ✅ DEBUG: Log dos dados carregados para edição
                console.log("📋 Dados carregados para edição:", {
                    title: formData.title,
                    grade: formData.grade,
                    selectedSchools: formData.selectedSchools,
                    selectedClasses: formData.selectedClasses,
                    state: formData.state,
                    municipality: formData.municipality,
                    questionsCount: formData.questions?.length || 0,
                    questions: formData.questions
                });

                // ✅ VALIDAÇÃO: Verificar se dados são consistentes
                if (formData.state && formData.state !== 'all' && (!formData.municipality || formData.municipality === 'all')) {
                    console.warn("⚠️ Estado selecionado mas sem município válido, limpando escolas");
                    formData.selectedSchools = [];
                    formData.selectedClasses = [];
                }
                
                if (formData.municipality && formData.municipality !== 'all' && (!formData.state || formData.state === 'all')) {
                    console.warn("⚠️ Município selecionado mas sem estado válido, limpando escolas");
                    formData.selectedSchools = [];
                    formData.selectedClasses = [];
                }

                setEvaluationData(formData);
                setShowModal(true);
            } catch (error) {
                console.error("Erro ao buscar avaliação:", error);
                toast({
                    title: "Erro",
                    description: "Erro ao carregar avaliação",
                    variant: "destructive",
                });
                navigate("/app/avaliacoes");
            } finally {
                setIsLoading(false);
            }
        };

        fetchEvaluation();
    }, [id, toast, navigate]);

    const handleSuccess = () => {
        // Fechar o modal primeiro
        setShowModal(false);
        // Aguardar um pouco para garantir que o modal feche antes de navegar
        setTimeout(() => {
            // Usar replace: true para evitar problemas de navegação e histórico
            navigate(`/app/avaliacao/${id}`, { replace: true });
        }, 100);
    };

    const handleClose = () => {
        setShowModal(false);
        // Usar replace: true para evitar problemas de navegação
        navigate(`/app/avaliacao/${id}`, { replace: true });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                    <p className="text-muted-foreground">Carregando avaliação...</p>
                </div>
            </div>
        );
    }

    if (!originalEvaluation || !evaluationData) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-muted-foreground mb-4">Avaliação não encontrada.</p>
                    <Button onClick={() => navigate("/app/avaliacoes")}>
                        Voltar para Avaliações
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <CreateEvaluationModal
            isOpen={showModal}
            onClose={handleClose}
            onSuccess={handleSuccess}
            evaluationId={id}
            initialData={evaluationData}
        />
    );
};

export default EditEvaluation;