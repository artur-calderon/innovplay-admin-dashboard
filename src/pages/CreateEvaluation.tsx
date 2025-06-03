import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { CreateEvaluationStep1 } from "@/components/evaluations/CreateEvaluationStep1";
import { CreateEvaluationStep2 } from "@/components/evaluations/CreateEvaluationStep2";
import { EvaluationFormData } from "@/components/evaluations/types";

const CreateEvaluation = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [evaluationData, setEvaluationData] = useState<EvaluationFormData | null>(null);
  const navigate = useNavigate();

  const handleNext = (data: EvaluationFormData) => {
    setEvaluationData(data);
    setCurrentStep(2);
  };

  const handleBack = () => {
    setCurrentStep(1);
  };

  const handleSubmit = (data: EvaluationFormData) => {
    // TODO: Save evaluation data to backend
    console.log("Final evaluation data:", data);
    navigate("/app/avaliacoes");
  };

  return (
    <div className="container max-w-5xl mx-auto py-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/app/avaliacoes")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold">Criar Avaliação</h1>
        <p className="text-muted-foreground">
          Crie uma nova avaliação com questões personalizadas ou do banco de questões
        </p>
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
              onSubmit={handleSubmit}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateEvaluation;
