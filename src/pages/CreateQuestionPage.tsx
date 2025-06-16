import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
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
      const response = await api.post("/question", {
        title: questionData.title,
        text: questionData.text,
        second_statement: questionData.secondStatement,
        type: questionData.type,
        subject: questionData.subject,
        grade: questionData.grade,
        difficulty: questionData.difficulty,
        value: questionData.value,
        solution: questionData.solution,
        skills: questionData.skills,
        topics: questionData.topics,
        options: questionData.options,
        created_by: user.id
      });

      toast.success("Questão criada com sucesso!");
      navigate("/app/cadastros/questao");
    } catch (error) {
      console.error("Erro ao criar questão:", error);
      toast.error("Erro ao criar questão");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-5xl mx-auto py-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/app/cadastros/questao")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold">Criar Questão</h1>
        <p className="text-muted-foreground">
          Crie uma nova questão para o banco de questões
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <QuestionForm
            open={true}
            onClose={() => navigate("/app/cadastros/questao")}
            subjectId={null}
            onQuestionAdded={handleSubmit}
            questionNumber={0}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateQuestionPage; 