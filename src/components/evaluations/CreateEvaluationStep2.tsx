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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

interface QuestionsBySubject {
  [subjectId: string]: Question[];
}

export const CreateEvaluationStep2 = ({
  data,
  onBack,
  // onSubmit,
}: CreateEvaluationStep2Props) => {
  const [loading, setLoading] = useState(false);
  const [questionsBySubject, setQuestionsBySubject] = useState<QuestionsBySubject>({});
  const [subjectOptions, setSubjectOptions] = useState<Subject[]>([]);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [selectedSubjectForQuestion, setSelectedSubjectForQuestion] = useState<string>("");
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await api.get("/subjects");
        setSubjectOptions(response.data);
      } catch (error) {
        console.error("Erro ao buscar disciplinas:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as disciplinas",
          variant: "destructive",
        });
      }
    };

    fetchSubjects();
  }, [toast]);

  // Inicializar estrutura de questões por disciplina
  useEffect(() => {
    console.log("Initializing questionsBySubject with subjects:", data.subjects);
    const initialQuestionsBySubject: QuestionsBySubject = {};
    data.subjects.forEach(subject => {
      initialQuestionsBySubject[subject.id] = [];
    });
    console.log("Initial questionsBySubject state:", initialQuestionsBySubject);
    setQuestionsBySubject(initialQuestionsBySubject);
  }, [data.subjects]);

  const handleAddQuestion = (subjectId: string) => {
    setSelectedSubjectForQuestion(subjectId);
    setShowQuestionForm(true);
  };

  const handleAddFromBank = (subjectId: string) => {
    setSelectedSubjectForQuestion(subjectId);
    setShowQuestionBank(true);
  };

  const handleRemoveQuestion = (subjectId: string, questionIndex: number) => {
    setQuestionsBySubject(prev => ({
      ...prev,
      [subjectId]: prev[subjectId].filter((_, i) => i !== questionIndex)
    }));
  };

  const handleQuestionAdded = (question: Question) => {
    if (selectedSubjectForQuestion) {
      setQuestionsBySubject(prev => ({
        ...prev,
        [selectedSubjectForQuestion]: [...(prev[selectedSubjectForQuestion] || []), question]
      }));
    }
    setShowQuestionForm(false);
    setSelectedSubjectForQuestion("");
  };

  const handleQuestionSelected = (question: Question) => {
    if (selectedSubjectForQuestion) {
      setQuestionsBySubject(prev => ({
        ...prev,
        [selectedSubjectForQuestion]: [...(prev[selectedSubjectForQuestion] || []), question]
      }));
    }
    setShowQuestionBank(false);
    setSelectedSubjectForQuestion("");
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Preparar dados para envio
      const allQuestions = Object.entries(questionsBySubject).flatMap(([subjectId, questions]) =>
        questions.map(question => ({
          ...question,
          subject_id: subjectId
        }))
      );

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
        questions: allQuestions,
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
        questions: allQuestions,
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

  const getTotalQuestions = () => {
    return Object.values(questionsBySubject).reduce((total, questions) => total + questions.length, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Questões por Disciplina</h2>
        <div className="text-sm text-muted-foreground">
          Total: {getTotalQuestions()} questão(ões)
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {showQuestionBank && (
            <QuestionBank
              onClose={() => {
                setShowQuestionBank(false);
                setSelectedSubjectForQuestion("");
              }}
              onSelect={handleQuestionSelected}
              subjects={subjectOptions}
            />
          )}

          {data.subjects.length > 0 ? (
            <div className="space-y-6">
              {data.subjects.map((subject) => {
                const subjectQuestions = questionsBySubject[subject.id] || [];
                return (
                  <Card key={subject.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">
                          {subject.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddFromBank(subject.id)}
                          >
                            <Book className="h-4 w-4 mr-2" />
                            Banco
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleAddQuestion(subject.id)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Nova Questão
                          </Button>
                        </div>
                      </div>

                      {subjectQuestions.length > 0 ? (
                        <div className="space-y-3">
                          {subjectQuestions.map((question, index) => (
                            <Card key={index} className="bg-muted/50">
                              <CardContent className="pt-4">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-medium">
                                    Questão {index + 1}
                                  </h4>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveQuestion(subject.id, index)}
                                  >
                                    Remover
                                  </Button>
                                </div>
                                <p className="mt-2 text-sm">{question.title}</p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                          Nenhuma questão adicionada para esta disciplina
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma disciplina selecionada
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showQuestionForm} onOpenChange={(open) => {
        if (!open) {
          setShowQuestionForm(false);
          setSelectedSubjectForQuestion("");
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Nova Questão</DialogTitle>
          </DialogHeader>
          {showQuestionForm && (
            <QuestionFormReadOnly
              open={showQuestionForm}
              onClose={() => {
                setShowQuestionForm(false);
                setSelectedSubjectForQuestion("");
              }}
              onQuestionAdded={handleQuestionAdded}
              questionNumber={(questionsBySubject[selectedSubjectForQuestion]?.length || 0) + 1}
              evaluationData={{
                course: data.course,
                grade: data.grade,
                subject: selectedSubjectForQuestion,
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={onBack}
        >
          Voltar
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || getTotalQuestions() === 0}
        >
          {loading ? "Salvando..." : "Salvar Avaliação"}
        </Button>
      </div>
    </div>
  );
}; 