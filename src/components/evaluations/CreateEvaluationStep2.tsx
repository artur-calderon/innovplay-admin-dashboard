import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Book } from "lucide-react";
import { Question, Subject } from "./types";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/authContext";
import { useNavigate } from "react-router-dom";
import QuestionFormReadOnly from "./questions/QuestionFormReadOnly";
import QuestionBank from "./questions/QuestionBank";

interface CreateEvaluationStep2Props {
  data: {
    title: string;
    municipalities: string[];
    schools: string[];
    course: string;
    grade: string;
    classId: string;
    type: "AVALIACAO" | "SIMULADO";
    model: "SAEB" | "PROVA" | "AVALIE";
    subjects: Subject[];
    subject: string;
  };
  onBack: () => void;
  // onSubmit: (data: any) => void;
}

export const CreateEvaluationStep2 = ({
  data,
  onBack,
  // onSubmit,
}: CreateEvaluationStep2Props) => {
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<Subject[]>([]);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await api.get("/subjects");
        setSubjectOptions(response.data);
      } catch (error) {
        console.error("Erro ao buscar matérias:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as matérias",
          variant: "destructive",
        });
      }
    };

    fetchSubjects();
  }, [toast]);

  const handleAddQuestion = () => {
    setShowQuestionForm(true);
  };

  const handleAddFromBank = () => {
    setShowQuestionBank(true);
  };

  const handleRemoveQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuestionAdded = (question: Question) => {
    setQuestions((prev) => [...prev, question]);
    setShowQuestionForm(false);
  };

  const handleQuestionSelected = (question: Question) => {
    setQuestions((prev) => [...prev, question]);
    setShowQuestionBank(false);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const response = await api.post("/test", {
        title: data.title,
        municipalities: data.municipalities,
        schools: data.schools,
        course: data.course,
        grade: data.grade,
        class_id: data.classId,
        type: data.type,
        model: data.model,
        subjects: data.subjects,
        subject: data.subject,
        questions: questions,
        created_by: user.id
      });
      const datas = {
        title: data.title,
        municipalities: data.municipalities,
        schools: data.schools,
        course: data.course,
        grade: data.grade,
        class_id: data.classId,
        type: data.type,
        model: data.model,
        subjects: data.subjects,
        subject: data.subject,
        questions: questions,
        created_by: user.id
      }

      console.log(datas)

      toast({
        title: "Sucesso",
        description: "Avaliação criada com sucesso!",
      });

      navigate("/app/avaliacoes");
      // onSubmit(response.data);
    } catch (error) {
      console.error("Erro ao criar avaliação:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a avaliação",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Questões</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleAddFromBank}
          >
            <Book className="h-4 w-4 mr-2" />
            Banco de Questões
          </Button>
          <Button onClick={handleAddQuestion}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Questão
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {showQuestionForm && (
            <QuestionFormReadOnly
              open={showQuestionForm}
              onClose={() => setShowQuestionForm(false)}
              onQuestionAdded={handleQuestionAdded}
              questionNumber={questions.length + 1}
              evaluationData={{
                course: data.course,
                grade: data.grade,
                subject: data.subject,
              }}
            />
          )}

          {showQuestionBank && (
            <QuestionBank
              onClose={() => setShowQuestionBank(false)}
              onSelect={handleQuestionSelected}
              subjects={subjectOptions}
            />
          )}

          {questions.length > 0 ? (
            <div className="space-y-4">
              {questions.map((question, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">
                        Questão {index + 1}
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveQuestion(index)}
                      >
                        Remover
                      </Button>
                    </div>
                    <p className="mt-2">{question.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma questão adicionada
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={onBack}
        >
          Voltar
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || questions.length === 0}
        >
          {loading ? "Salvando..." : "Salvar Avaliação"}
        </Button>
      </div>
    </div>
  );
}; 