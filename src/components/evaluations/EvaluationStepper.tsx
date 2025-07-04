import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Steps } from "@/components/ui/steps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Check, Save, AlertTriangle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import CreateEvaluationForm from "./CreateEvaluationForm";
import QuestionSelectionStep from "./QuestionSelectionStep";
import { EvaluationFormData, Question } from "./types";
import { api } from "@/lib/api";
import { useAuth } from "@/context/authContext";
import { useEvaluationDraft } from "@/hooks/use-evaluation-draft";

const STEPS = [
  {
    id: 1,
    title: "Configuração Básica",
    description: "Informações gerais da avaliação"
  },
  {
    id: 2,
    title: "Seleção de Questões",
    description: "Adicionar questões do banco"
  },
  {
    id: 3,
    title: "Revisão Final",
    description: "Confirmar e finalizar"
  }
];

interface EvaluationStepperProps {
  mode?: "virtual" | "physical";
  editMode?: boolean;
  evaluationId?: string;
}

export default function EvaluationStepper({ mode = "virtual", editMode = false, evaluationId }: EvaluationStepperProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [evaluationData, setEvaluationData] = useState<EvaluationFormData | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { saveDraft, loadDraft, clearDraft } = useEvaluationDraft();

  // Carregar dados se estiver editando
  useEffect(() => {
    if (editMode && evaluationId) {
      loadExistingEvaluation();
    } else {
      // Tentar carregar rascunho
      const draft = loadDraft();
      if (draft.data) {
        setEvaluationData(draft.data);
        setCurrentStep(draft.step || 1);
        setHasUnsavedChanges(true);
        toast({
          title: "Rascunho carregado",
          description: "Continuando de onde você parou",
        });
      }
    }
  }, [editMode, evaluationId]);

  // Auto-save a cada 30 segundos
  useEffect(() => {
    if (!editMode && evaluationData && hasUnsavedChanges) {
      const interval = setInterval(() => {
        saveDraft(evaluationData, currentStep);
        toast({
          title: "Rascunho salvo automaticamente",
          description: new Date().toLocaleTimeString(),
          duration: 2000,
        });
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [evaluationData, currentStep, hasUnsavedChanges, editMode]);

  const loadExistingEvaluation = async () => {
    if (!evaluationId) return;
    
    try {
      setIsLoading(true);
      const response = await api.get(`/test/${evaluationId}`);
      const evaluation = response.data;
      
      // Converter dados do backend para o formato do formulário
      const formData: EvaluationFormData = {
        title: evaluation.title,
        description: evaluation.description || "",
        municipalities: evaluation.municipalities?.map((m: { id: string }) => m.id) || [],  
        schools: evaluation.schools?.map((s: { id: string }) => s.id) || [],
        course: evaluation.course?.id || "",
        grade: evaluation.grade?.id || "",
        classId: "", // Será preenchido com as classes
        type: evaluation.type || "AVALIACAO",
        model: evaluation.model || "SAEB",
        subjects: evaluation.subjects?.map((s: Subject) => s) || [],
        subject: evaluation.subject?.id || "",
        questions: evaluation.questions || [],
        startDateTime: evaluation.startDateTime || "",
        duration: evaluation.duration || "",
        classes: evaluation.classes?.map((c: { id: string }) => c.id) || []
      };
      
      setEvaluationData(formData);
      setSelectedQuestions(evaluation.questions || []);
      
    } catch (error) {
      console.error("Erro ao carregar avaliação:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a avaliação",
        variant: "destructive",
      });
      navigate("/app/avaliacoes");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep1Complete = (data: EvaluationFormData) => {
    setEvaluationData({ ...data, questions: selectedQuestions });
    setHasUnsavedChanges(true);
    setCurrentStep(2);
    
    toast({
      title: "Configuração salva",
      description: "Agora selecione as questões para a avaliação",
    });
  };

  const handleQuestionsSelected = (questions: Question[]) => {
    setSelectedQuestions(questions);
    if (evaluationData) {
      setEvaluationData({ ...evaluationData, questions });
      setHasUnsavedChanges(true);
    }
  };

  const handleNextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveDraft = () => {
    if (evaluationData) {
      saveDraft(evaluationData, currentStep);
      setHasUnsavedChanges(false);
      toast({
        title: "Rascunho salvo",
        description: "Você pode continuar depois",
      });
    }
  };

  const handleSubmitEvaluation = async () => {
    if (!evaluationData || !user?.id) {
      toast({
        title: "Erro",
        description: "Dados incompletos para criação da avaliação",
        variant: "destructive",
      });
      return;
    }

    if (selectedQuestions.length === 0) {
      toast({
        title: "Atenção",
        description: "Adicione pelo menos uma questão à avaliação",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      
      const payload = {
        title: evaluationData.title,
        description: evaluationData.description,
        type: evaluationData.type,
        model: evaluationData.model,
        course: evaluationData.course,
        grade: evaluationData.grade,
        subjects: evaluationData.subjects.map(s => s.id),
        schools: evaluationData.schools,
        municipalities: evaluationData.municipalities,
        classes: evaluationData.classes,
        questions: selectedQuestions.map(q => q.id),
        startDateTime: evaluationData.startDateTime,
        duration: evaluationData.duration,
        evaluation_mode: mode,
        created_by: user.id,
      };

      let response;
      if (editMode && evaluationId) {
        response = await api.put(`/test/${evaluationId}`, payload);
        toast({
          title: "Avaliação atualizada!",
          description: `"${evaluationData.title}" foi atualizada com sucesso.`,
        });
      } else {
        response = await api.post("/test", payload);
        toast({
          title: "Avaliação criada!",
          description: `"${evaluationData.title}" foi criada com ${selectedQuestions.length} questões.`,
        });
        clearDraft(); // Limpar rascunho apenas na criação
      }
      
      setHasUnsavedChanges(false);
      navigate("/app/avaliacoes");
      
    } catch (error: unknown) {
      console.error("Erro ao salvar avaliação:", error);
      const errorMessage = (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message || 
                          (error as { message?: string })?.message || 
                          "Erro desconhecido";
      toast({
        title: "Erro ao salvar avaliação",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges && !editMode) {
      const shouldSave = window.confirm("Você tem alterações não salvas. Deseja salvar como rascunho?");
      if (shouldSave && evaluationData) {
        saveDraft(evaluationData, currentStep);
        toast({
          title: "Rascunho salvo",
          description: "Você pode continuar depois",
        });
      }
    }
    navigate("/app/avaliacoes");
  };

  // Interceptar saída da página
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && !editMode) {
        e.preventDefault();
        e.returnValue = "Você tem alterações não salvas. Deseja sair mesmo assim?";
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, editMode]);

  if (isLoading) {
    return (
      <div className="container max-w-5xl mx-auto py-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {editMode ? "Editar Avaliação" : "Criar Avaliação"}
          </h1>
          <p className="text-muted-foreground">
            {mode === "virtual" ? "Avaliação Virtual" : "Avaliação Física"} - 
            {editMode ? " Modo de edição" : " Nova avaliação"}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            Etapa {currentStep} de {STEPS.length}
          </Badge>
          {mode === "physical" && (
            <Badge variant="secondary">
              Cartão Resposta
            </Badge>
          )}
          {hasUnsavedChanges && !editMode && (
            <Badge variant="outline" className="text-orange-600 border-orange-300">
              <Save className="h-3 w-3 mr-1" />
              Não salvo
            </Badge>
          )}
        </div>
      </div>

      {/* Progress Steps */}
      <div className="relative">
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex flex-col items-center flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                currentStep > step.id 
                  ? 'bg-green-600 text-white' 
                  : currentStep === step.id 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-500'
              }`}>
                {currentStep > step.id ? <Check className="h-5 w-5" /> : step.id}
              </div>
              <div className="mt-2 text-center max-w-32">
                <p className={`text-sm font-medium ${
                  currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {step.description}
                </p>
              </div>
              {index < STEPS.length - 1 && (
                <div className={`absolute top-5 h-0.5 bg-gray-300 transition-colors ${
                  currentStep > step.id ? 'bg-green-600' : ''
                }`} 
                style={{
                  left: `${((index + 1) * 100 / STEPS.length) - (50 / STEPS.length)}%`,
                  width: `${100 / STEPS.length - 10}%`
                }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content Card */}
      <Card>
        <CardContent className="pt-6">
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Info className="h-5 w-5 text-blue-500" />
                <h3 className="text-lg font-semibold">Configuração da Avaliação</h3>
              </div>
              <CreateEvaluationForm
                onSubmit={handleStep1Complete}
                initialData={evaluationData}
              />
            </div>
          )}
          
          {currentStep === 2 && evaluationData && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Info className="h-5 w-5 text-blue-500" />
                <h3 className="text-lg font-semibold">Seleção de Questões</h3>
              </div>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Avaliação: <strong>{evaluationData.title}</strong> • 
                  Disciplinas: <strong>{evaluationData.subjects.map(s => s.name).join(", ")}</strong> • 
                  Série: <strong>{evaluationData.grade}</strong>
                </AlertDescription>
              </Alert>
              <QuestionSelectionStep
                evaluationData={evaluationData}
                selectedQuestions={selectedQuestions}
                onQuestionsChange={handleQuestionsSelected}
              />
            </div>
          )}
          
          {currentStep === 3 && evaluationData && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <Check className="h-5 w-5 text-green-500" />
                <h3 className="text-lg font-semibold">Revisão Final</h3>
              </div>
              
              {/* Resumo da Avaliação */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Informações Gerais</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Título</label>
                      <p className="text-sm">{evaluationData.title}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Descrição</label>
                      <p className="text-sm">{evaluationData.description || "Sem descrição"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Tipo</label>
                      <Badge variant="outline">{evaluationData.type}</Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Modelo</label>
                      <Badge variant="outline">{evaluationData.model}</Badge>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Questões</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Total de Questões</label>
                      <p className="text-2xl font-bold text-green-600">{selectedQuestions.length}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Disciplinas</label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {evaluationData.subjects.map(subject => (
                          <Badge key={subject.id} variant="secondary" className="text-xs">
                            {subject.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Pontuação Total</label>
                      <p className="text-sm">
                        {selectedQuestions.reduce((sum, q) => sum + parseFloat(q.value || "1"), 0).toFixed(1)} pontos
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {selectedQuestions.length === 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Você precisa adicionar pelo menos uma questão antes de finalizar a avaliação.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Navigation */}
      <div className="flex justify-between items-center pt-4">
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCancel}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          
          {!editMode && hasUnsavedChanges && (
            <Button variant="outline" onClick={handleSaveDraft}>
              <Save className="mr-2 h-4 w-4" />
              Salvar Rascunho
            </Button>
          )}
        </div>
        
        <div className="flex gap-2">
          {currentStep > 1 && (
            <Button variant="outline" onClick={handlePreviousStep}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          )}
          
          {currentStep < STEPS.length ? (
            <Button 
              onClick={handleNextStep} 
              disabled={currentStep === 1 && !evaluationData}
            >
              Próximo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmitEvaluation} 
              disabled={isSaving || selectedQuestions.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSaving ? "Salvando..." : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {editMode ? "Atualizar Avaliação" : "Criar Avaliação"}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}