import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { CreateEvaluationStep1 } from "@/components/evaluations/CreateEvaluationStep1";
import { CreateEvaluationStep2 } from "@/components/evaluations/CreateEvaluationStep2";
import { EvaluationFormData } from "@/components/evaluations/types";
import { useAuth } from "@/context/authContext";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

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
    subjects_info?: Array<{ id: string; name: string }>;
    grade: {
        id: string;
        name: string;
    } | null;
    municipalities: any[];
    schools: any[];
    type: "AVALIACAO" | "SIMULADO";
    createdAt: string;
    questions: any[];
    time_limit?: string;
    duration?: number;
    classes?: string[];
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

    // Carregar dados da avaliação existente
    useEffect(() => {
        const fetchEvaluation = async () => {
            if (!id) return;
            
            try {
                setIsLoading(true);
                const response = await api.get(`/test/${id}`);
                const evaluation: Evaluation = response.data;
                setOriginalEvaluation(evaluation);

                                 // Converter dados da avaliação para o formato do formulário
                 const formData: EvaluationFormData = {
                     title: evaluation.title || "",
                     description: evaluation.description || "",
                     municipalities: evaluation.municipalities?.map((m: any) => m.id || m) || [],
                     schools: evaluation.schools?.map((s: any) => s.id || s) || [],
                     course: evaluation.course?.id || "",
                     grade: evaluation.grade?.id || "",
                     classId: "", // não usado no novo fluxo
                     type: evaluation.type || "AVALIACAO",
                     model: (evaluation.model === "SAEB" || evaluation.model === "PROVA" || evaluation.model === "AVALIE") 
                         ? evaluation.model 
                         : "SAEB",
                     subjects: evaluation.subjects_info || (evaluation.subject ? [evaluation.subject] : []),
                     subject: evaluation.subject?.id || "",
                     questions: evaluation.questions || [],
                     startDateTime: evaluation.time_limit || "",
                     duration: evaluation.duration?.toString() || "",
                     classes: evaluation.classes || [],
                 };

                setEvaluationData(formData);
            } catch (error) {
                console.error("Erro ao buscar avaliação:", error);
                toast({
                    title: "Erro",
                    description: "Não foi possível carregar os dados da avaliação",
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
        setEvaluationData(data);
        setCurrentStep(2);
    };

    const handleBack = () => {
        setCurrentStep(1);
    };

    const handleEvaluationComplete = async () => {
        if (!evaluationData || !id) return;

        try {
            setIsSaving(true);

            // Atualizar avaliação no backend
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
                questions: evaluationData.questions,
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
                        <h1 className="text-2xl font-bold">Editar Avaliação</h1>
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