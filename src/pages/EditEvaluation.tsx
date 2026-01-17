import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Save, Loader2, FileCheck } from "lucide-react";
import { CreateEvaluationStep1 } from "@/components/evaluations/CreateEvaluationStep1";
import { CreateEvaluationStep2 } from "@/components/evaluations/CreateEvaluationStep2";
import { EvaluationFormData, Question as FormQuestion, Question } from "@/components/evaluations/types";
import { useAuth } from "@/context/authContext";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useQuestionActions } from "@/stores/useEvaluationStore";
import { useEvaluations } from "@/hooks/use-cache";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "@/components/evaluations/results/constants";

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
    const [currentStep, setCurrentStep] = useState(1);
    const [evaluationData, setEvaluationData] = useState<EvaluationFormData | null>(null);
    const [originalEvaluation, setOriginalEvaluation] = useState<Evaluation | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { clearQuestions } = useQuestionActions();
    const { invalidateAfterCRUD } = useEvaluations();

    // Limpar questões do store ao sair da página
    useEffect(() => {
        return () => {
            clearQuestions();
        };
    }, [clearQuestions]);

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
            } catch (error) {
                console.error("Erro ao buscar avaliação:", error);
                toast({
                    title: "Erro",
                    description: ERROR_MESSAGES.EVALUATION_LOAD_FAILED,
                    variant: "destructive",
                });
                navigate("/app/avaliacoes");
            } finally {
                setIsLoading(false);
            }
        };

        fetchEvaluation();
    }, [id, toast, navigate]);

    const handleNext = (data: EvaluationFormData) => {
        // Preservar questões originais ao ir para Step2
        const updatedData = {
            ...data,
            questions: evaluationData?.questions || [],
        };
        setEvaluationData(updatedData);
        setCurrentStep(2);
    };

    const handleBack = () => {
        setCurrentStep(1);
    };

    // Função para confirmar exclusão antes de recriar
    const confirmDeletion = async (testId: string, maxAttempts = 10, delayMs = 500): Promise<boolean> => {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                await api.get(`/test/${testId}`);
                // Se chegou aqui, a avaliação ainda existe
                if (attempt === maxAttempts) {
                    console.warn(`Avaliação ${testId} ainda existe após ${maxAttempts} tentativas`);
                    return false;
                }
                // Aguardar antes da próxima tentativa
                await new Promise(resolve => setTimeout(resolve, delayMs));
            } catch (error: unknown) {
                // Se for 404/410, a exclusão foi bem-sucedida
                if ((error as ApiError)?.response?.status === 404 || (error as ApiError)?.response?.status === 410) {
                    console.log(`Avaliação ${testId} confirmada como excluída na tentativa ${attempt}`);
                    return true;
                }
                // Outros erros são tratados como falha
                console.error(`Erro ao verificar exclusão da avaliação ${testId}:`, error);
                return false;
            }
        }
        return false;
    };

    const handleEvaluationComplete = async (updatedQuestions?: Question[]) => {
        if (!evaluationData || !id) return;

        try {
            setIsSaving(true);

            // Usar questões atualizadas se fornecidas, senão usar as do evaluationData
            const finalQuestions = updatedQuestions || evaluationData.questions || [];

            // Atualizar dados básicos via PUT
            await api.put(`/test/${id}`, {
                title: evaluationData.title,
                description: evaluationData.description,
                municipalities: evaluationData.municipalities,
                schools: evaluationData.schools,
                course: evaluationData.course,
                grade: evaluationData.grade,
                type: evaluationData.type,
                model: evaluationData.model,
                subjects: evaluationData.subjects,
                subject: evaluationData.subject,
                time_limit: evaluationData.startDateTime,
                duration: evaluationData.duration ? parseInt(evaluationData.duration) : undefined,
                classes: evaluationData.classes,
            });

            // Verificar se questões mudaram para decidir entre PUT ou delete+recreate
            if (finalQuestions && finalQuestions.length > 0) {
                const originalQuestions = originalEvaluation?.questions || [];
                const questionsChanged = JSON.stringify(originalQuestions) !== JSON.stringify(finalQuestions);
                
                if (questionsChanged) {
                    console.log("🔄 Questões alteradas detectadas, iniciando recriação segura...");
                    
                    const currentEvalResponse = await api.get(`/test/${id}`);
                    const currentEval = currentEvalResponse.data;
                    
                    const completePayload = {
                        title: evaluationData.title,
                        description: evaluationData.description,
                        municipalities: evaluationData.municipalities,
                        schools: evaluationData.schools,
                        course: evaluationData.course,
                        grade: evaluationData.grade,
                        type: evaluationData.type,
                        model: evaluationData.model,
                        subjects: evaluationData.subjects,
                        subject: evaluationData.subject,
                        time_limit: evaluationData.startDateTime,
                        duration: evaluationData.duration ? parseInt(evaluationData.duration) : undefined,
                        classes: evaluationData.classes,
                        questions: finalQuestions,
                        created_by: currentEval.created_by || user.id,
                        max_score: currentEval.max_score,
                        evaluation_mode: currentEval.evaluation_mode,
                        intructions: currentEval.intructions
                    };

                    // 1. Excluir avaliação existente
                    console.log(`🗑️ Excluindo avaliação ${id}...`);
                    await api.delete(`/test/${id}`);
                    
                    // 2. Confirmar exclusão antes de recriar
                    console.log("⏳ Confirmando exclusão...");
                    const deletionConfirmed = await confirmDeletion(id);
                    
                    if (!deletionConfirmed) {
                        toast({
                            title: "Erro",
                            description: ERROR_MESSAGES.EVALUATION_DELETE_FAILED,
                            variant: "destructive",
                        });
                        return;
                    }
                    
                    // 3. Recriar avaliação
                    console.log("🔄 Recriando avaliação...");
                    const newEvalResponse = await api.post('/test', completePayload);
                    const newEvalId = newEvalResponse.data.test_id || newEvalResponse.data.id;
                    
                    // 4. Invalidar caches
                    console.log("🗑️ Invalidando caches...");
                    await invalidateAfterCRUD();
                    
                    toast({
                        title: SUCCESS_MESSAGES.EVALUATION_UPDATED,
                        description: SUCCESS_MESSAGES.QUESTIONS_SAVED,
                    });

                    navigate(`/app/avaliacao/${newEvalId}`);
                    return;
                }
            }

            // Invalidar caches após atualização
            await invalidateAfterCRUD();
            
            toast({
                title: SUCCESS_MESSAGES.EVALUATION_UPDATED,
                description: SUCCESS_MESSAGES.EVALUATION_UPDATED,
            });

            navigate(`/app/avaliacao/${id}`);
        } catch (error) {
            console.error("Erro ao atualizar avaliação:", error);
            toast({
                title: "Erro",
                description: ERROR_MESSAGES.EVALUATION_UPDATE_FAILED,
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
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
            {/* Aviso destacado no topo */}
            <div className="mb-6 p-4 bg-amber-100 border-2 border-amber-300 rounded-lg">
                <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-lg">⚠</span>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-amber-900">Modo de Edição Ativo</h3>
                        <p className="text-amber-800">
                            Você está editando a avaliação <strong>"{originalEvaluation.title}"</strong>. 
                            Algumas alterações podem afetar avaliações já aplicadas às turmas.
                        </p>
                    </div>
                </div>
            </div>

            <div className="mb-6">
                <Button
                    variant="ghost"
                    onClick={handleCancel}
                    className="mb-4"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                </Button>
                
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                          <FileCheck className="w-8 h-8 text-blue-600" />
                          Editar Avaliação
                        </h1>
                        <p className="text-muted-foreground">
                            Edite as informações da avaliação "{originalEvaluation.title}"
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Badge variant="outline">
                            Etapa {currentStep} de 2
                        </Badge>
                        {isSaving && (
                            <Badge variant="secondary">
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Salvando...
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Barra de progresso */}
                <div className="mt-4">
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                            }`}>
                                1
                            </div>
                            <span className={`ml-2 text-sm ${currentStep >= 1 ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                                Configuração
                            </span>
                        </div>
                        
                        <div className={`flex-1 h-1 rounded ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
                        
                        <div className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                            }`}>
                                2
                            </div>
                            <span className={`ml-2 text-sm ${currentStep >= 2 ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                                Questões
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <Card>
                <CardContent className="pt-6">
                    {currentStep === 1 && (
                        <CreateEvaluationStep1 
                            onNext={handleNext}
                            initialData={evaluationData}
                        />
                    )}

                    {currentStep === 2 && evaluationData && (
                        <CreateEvaluationStep2
                            data={evaluationData}
                            onBack={handleBack}
                            onComplete={handleEvaluationComplete}
                            editMode={true}
                            evaluationId={id}
                        />
                    )}
                </CardContent>
            </Card>

            {/* Informações de ajuda */}
            {currentStep === 1 && (
                <Card className="mt-4 bg-blue-50 border-blue-200">
                    <CardContent className="pt-4">
                        <h3 className="font-medium text-blue-900 mb-2">💡 Dicas para Edição</h3>
                        <ul className="text-sm text-blue-800 space-y-1">
                            <li>• Todos os campos marcados com * são obrigatórios</li>
                            <li>• Alterações em município/escola podem afetar turmas selecionadas</li>
                            <li>• Verifique cuidadosamente os dados antes de prosseguir</li>
                        </ul>
                    </CardContent>
                </Card>
            )}

            {currentStep === 2 && (
                <Card className="mt-4 bg-green-50 border-green-200">
                    <CardContent className="pt-4">
                        <h3 className="font-medium text-green-900 mb-2">📚 Editando questões</h3>
                        <ul className="text-sm text-green-800 space-y-1">
                            <li>• Você pode adicionar, remover ou reordenar questões</li>
                            <li>• Use o filtro por disciplina para encontrar questões específicas</li>
                            <li>• Questões duplicadas não serão adicionadas</li>
                        </ul>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default EditEvaluation;