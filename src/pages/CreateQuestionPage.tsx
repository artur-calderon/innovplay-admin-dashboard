import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, HelpCircle } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Question } from "@/components/evaluations/types";
import { useAuth } from "@/context/authContext";
import QuestionForm from "@/components/evaluations/questions/QuestionForm";

const CreateQuestionPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (questionData: Question) => {
    try {
      setIsLoading(true);
      
      // Debug: verificar os dados recebidos
      console.log('🔍 Debug - Dados recebidos do QuestionForm:', questionData);
      
      // Não criar payload aqui - apenas redirecionar após sucesso
      // O QuestionForm já fez a chamada para a API
      
      toast.success("Questão criada com sucesso! 🎉", {
        description: "A nova questão foi adicionada ao banco de questões",
      });
      navigate("/app/cadastros/questao");
      
    } catch (error) {
      console.error("Erro ao processar questão:", error);
      toast.error("Erro ao processar questão", {
        description: "Tente novamente ou entre em contato com o suporte",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-blue-950/30 dark:via-background dark:to-purple-950/30">
      <div className="container max-w-7xl mx-auto py-8 px-4">
        {/* Header aprimorado */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="outline"
              onClick={() => navigate("/app/cadastros/questao")}
              className="flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:border-blue-300 dark:hover:border-blue-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao Banco de Questões
            </Button>
          </div>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
              <Plus className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <HelpCircle className="w-8 h-8 text-blue-600" />
                Criar Nova Questão
              </h1>
              <p className="text-gray-600 dark:text-muted-foreground text-lg mt-1">
                Adicione uma nova questão ao banco de questões da plataforma
              </p>
            </div>
          </div>


        </div>

        {/* Formulário */}
        <div className="max-w-5xl mx-auto">
          <QuestionForm
            open={true}
            onClose={() => navigate("/app/cadastros/questao")}
            onQuestionAdded={handleSubmit}
          />
        </div>


      </div>
    </div>
  );
};

export default CreateQuestionPage; 