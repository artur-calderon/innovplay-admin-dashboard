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

                // Converter dados da avaliação para o formato do formulário
                const formData: EvaluationFormData = {
                    title: evaluation.title || "",
                    description: evaluation.description || "",
                    municipalities: evaluation.municipalities?.map((m: Municipality | string) => 
                        typeof m === 'string' ? m : m.id) || [],
                    schools: evaluation.schools?.map((s: School | string) => 
                        typeof s === 'string' ? s : s.id) || [],
                    course: evaluation.course?.id || "",
                    grade: evaluation.grade?.id || "",
                    classId: "",
                    type: evaluation.type || "AVALIACAO",
                    model: (evaluation.model === "SAEB" || evaluation.model === "PROVA" || evaluation.model === "AVALIE") 
                        ? evaluation.model 
                        : "SAEB",
                    subjects: evaluation.subjects || evaluation.subjects_info || (evaluation.subject ? [evaluation.subject] : []),
                    subject: evaluation.subject?.id || "",
                    questions: (evaluation.questions || []) as unknown as FormQuestion[],
                    startDateTime: evaluation.time_limit || "",
                    duration: evaluation.duration?.toString() || "",
                    classes: evaluation.classes || [],
                    state: stateName,
                    municipality: typeof evaluation.municipalities?.[0] === 'string' 
                        ? evaluation.municipalities[0] 
                        : evaluation.municipalities?.[0]?.id || "",
                    selectedSchools: evaluation.schools || [],
                    selectedClasses: evaluation.applied_classes?.map((ac: AppliedClass) => ac.class) || [],
                };

                // ✅ DEBUG: Log dos dados carregados para edição
                console.log("📋 Dados carregados para edição:", {
                    title: formData.title,
                    grade: formData.grade,
                    selectedSchools: formData.selectedSchools,
                    selectedClasses: formData.selectedClasses,
                    state: formData.state,
                    municipality: formData.municipality
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
        setShowModal(false);
        navigate(`/app/avaliacao/${id}`);
    };

    const handleClose = () => {
        setShowModal(false);
        navigate(`/app/avaliacao/${id}`);
    };

    if (isLoading) {
        return (
            <div className="container max-w-5xl mx-auto py-6">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                        <p className="text-muted-foreground">Carregando avaliação...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!originalEvaluation || !evaluationData) {
        return (
            <div className="container max-w-5xl mx-auto py-6">
                <div className="text-center">
                    <p className="text-muted-foreground">Avaliação não encontrada.</p>
                    <Button onClick={() => navigate("/app/avaliacoes")} className="mt-4">
                        Voltar para Avaliações
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="container max-w-5xl mx-auto py-6">
            <div className="mb-6">
                <Button
                    variant="ghost"
                    onClick={handleClose}
                    className="mb-4"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                </Button>
                
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <FileCheck className="w-8 h-8 text-blue-600" />
                        Editar Avaliação
                    </h1>
                    <p className="text-muted-foreground">
                        {originalEvaluation ? `Edite as informações da avaliação "${originalEvaluation.title}"` : 'Carregando...'}
                    </p>
                </div>
            </div>

            {showModal && evaluationData && (
                <CreateEvaluationModal
                    isOpen={showModal}
                    onClose={handleClose}
                    onSuccess={handleSuccess}
                    evaluationId={id}
                    initialData={evaluationData}
                />
            )}
        </div>
    );
};

export default EditEvaluation;