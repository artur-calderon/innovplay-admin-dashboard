import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";
import { CreateEvaluationStep1 } from "@/components/evaluations/CreateEvaluationStep1";
import { CreateEvaluationStep2 } from "@/components/evaluations/CreateEvaluationStep2";
import { EvaluationFormData } from "@/components/evaluations/types";
import { useEvaluationDraft } from "@/hooks/use-evaluation-draft";
import { useAuth } from "@/context/authContext";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const CreateEvaluation = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [evaluationData, setEvaluationData] = useState<EvaluationFormData | null>(null);
  const { saveDraft, clearDraft } = useEvaluationDraft();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleNext = (data: EvaluationFormData) => {
    setEvaluationData(data);
    // Salvar rascunho no step 2
    saveDraft(data, 2);
    setCurrentStep(2);
  };

  const handleBack = () => {
    setCurrentStep(1);
    // Salvar rascunho no step 1 se houver dados
    if (evaluationData) {
      saveDraft(evaluationData, 1);
    }
  };

  const handleEvaluationComplete = () => {
    // Limpar rascunho quando avaliação for criada com sucesso
    clearDraft();
    toast({
      title: "Sucesso",
      description: "Avaliação criada e rascunho removido",
    });
  };

  const handleCancel = () => {
    if (evaluationData?.title) {
      // Salvar rascunho antes de sair
      saveDraft(evaluationData, currentStep);
      toast({
        title: "Rascunho salvo",
        description: "Seus dados foram salvos. Você pode continuar depois.",
      });
    }
    navigate("/app/avaliacoes");
  };

  // Interceptar tentativa de sair da página
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (evaluationData?.title) {
        saveDraft(evaluationData, currentStep);
        e.preventDefault();
        e.returnValue = "Você tem alterações não salvas. Deseja sair mesmo assim?";
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [evaluationData, currentStep, saveDraft]);

  return (
    <div className="container max-w-5xl mx-auto py-6">
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
            <h1 className="text-2xl font-bold">Criar Avaliação</h1>
            <p className="text-muted-foreground">
              Crie uma nova avaliação com questões do banco de questões
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              Etapa {currentStep} de 2
            </Badge>
            {evaluationData?.title && (
              <Badge variant="secondary">
                <Save className="h-3 w-3 mr-1" />
                Salvamento automático ativo
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
            <CreateEvaluationStep1 onNext={handleNext} />
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
            <h3 className="font-medium text-blue-900 mb-2">💡 Dicas</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Seus dados são salvos automaticamente a cada 30 segundos</li>
              <li>• Você pode usar o botão "Salvar Rascunho" para salvar manualmente</li>
              <li>• Todos os campos marcados com * são obrigatórios</li>
            </ul>
          </CardContent>
        </Card>
      )}

      {currentStep === 2 && (
        <Card className="mt-4 bg-green-50 border-green-200">
          <CardContent className="pt-4">
            <h3 className="font-medium text-green-900 mb-2">📚 Sobre as questões</h3>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• Use o filtro por disciplina para encontrar questões específicas</li>
              <li>• Você pode visualizar as questões antes de adicionar</li>
              <li>• Questões duplicadas não serão adicionadas</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CreateEvaluation;
