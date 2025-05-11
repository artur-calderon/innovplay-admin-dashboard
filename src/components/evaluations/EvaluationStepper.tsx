import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Steps } from "@/components/ui/steps";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import EvaluationForm from "./EvaluationForm";
import QuestionSelectionStep from "./QuestionSelectionStep";

const STEPS = ["Detalhes da Avaliação", "Adicionar Questões"];

export default function EvaluationStepper() {
  const [currentStep, setCurrentStep] = useState(0);
  const [evaluationData, setEvaluationData] = useState<any>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<any[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleNextStep = (data?: any) => {
    if (currentStep === 0 && data) {
      // Save evaluation data and move to next step
      setEvaluationData(data);
      toast({
        title: "Avaliação criada com sucesso!",
        description: "Agora você pode adicionar questões à avaliação.",
      });
    }
    
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final submit
      handleSubmitEvaluation();
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmitEvaluation = () => {
    // Here we would save all the data to the backend
    
    toast({
      title: "Avaliação finalizada com sucesso!",
      description: `Avaliação "${evaluationData?.name}" criada com ${selectedQuestions.length} questões.`,
    });
    
    // Redirect to evaluations page
    navigate("/app/avaliacoes");
  };

  const handleAddQuestions = (questions: any[]) => {
    setSelectedQuestions([...selectedQuestions, ...questions]);
    toast({
      title: "Questões adicionadas",
      description: `${questions.length} questões adicionadas à avaliação.`,
    });
  };

  const handleRemoveQuestion = (questionId: string) => {
    setSelectedQuestions(selectedQuestions.filter(q => q.id !== questionId));
    toast({
      title: "Questão removida",
      description: "A questão foi removida da avaliação.",
      variant: "destructive",
    });
  };

  return (
    <div className="space-y-6">
      <Steps steps={STEPS} currentStep={currentStep} />
      
      <Card className="mt-6">
        <CardContent className="pt-6">
          {currentStep === 0 && (
            <EvaluationForm 
              onSubmit={handleNextStep} 
              initialValues={evaluationData} 
            />
          )}
          
          {currentStep === 1 && (
            <QuestionSelectionStep 
              evaluationId={evaluationData?.id || "temp-id"} 
              selectedQuestions={selectedQuestions}
              onAddQuestions={handleAddQuestions}
              onRemoveQuestion={handleRemoveQuestion}
            />
          )}
        </CardContent>
      </Card>
      
      <div className="flex justify-between pt-4">
        {currentStep > 0 ? (
          <Button
            variant="outline"
            onClick={handlePreviousStep}
            className="flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => navigate("/app/avaliacoes")}
            className="flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
        )}
        
        {currentStep === STEPS.length - 1 ? (
          <Button onClick={handleSubmitEvaluation} className="flex items-center">
            <Check className="mr-2 h-4 w-4" />
            Finalizar Avaliação
          </Button>
        ) : null}
      </div>
    </div>
  );
}