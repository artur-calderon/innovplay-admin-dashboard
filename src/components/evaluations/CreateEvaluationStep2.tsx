import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Book, Eye, Trash2 } from "lucide-react";
import { Question, Subject } from "./types";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/authContext";
import { useNavigate } from "react-router-dom";
import QuestionBank from "./questions/QuestionBank";
import QuestionPreview from "./questions/QuestionPreview";
import { Badge } from "@/components/ui/badge";
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
  onComplete?: () => void;
}

interface QuestionsBySubject {
  [subjectId: string]: Question[];
}

export const CreateEvaluationStep2 = ({
  data,
  onBack,
  onComplete,
}: CreateEvaluationStep2Props) => {
  const [loading, setLoading] = useState(false);
  const [questionsBySubject, setQuestionsBySubject] = useState<QuestionsBySubject>({});
  const [subjectOptions, setSubjectOptions] = useState<Subject[]>([]);
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [showQuestionPreview, setShowQuestionPreview] = useState(false);
  const [selectedSubjectForQuestion, setSelectedSubjectForQuestion] = useState<string>("");
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
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

  const handleAddFromBank = (subjectId: string) => {
    setSelectedSubjectForQuestion(subjectId);
    setShowQuestionBank(true);
  };

  const handleRemoveQuestion = (subjectId: string, questionIndex: number) => {
    setQuestionsBySubject(prev => ({
      ...prev,
      [subjectId]: prev[subjectId].filter((_, i) => i !== questionIndex)
    }));
    toast({
      title: "Questão removida",
      description: "A questão foi removida da avaliação",
    });
  };

  const handleQuestionSelected = (question: Question) => {
    if (selectedSubjectForQuestion) {
      // Verificar se a questão já foi adicionada para evitar duplicatas
      const currentQuestions = questionsBySubject[selectedSubjectForQuestion] || [];
      const isAlreadyAdded = currentQuestions.some(q => q.id === question.id);
      
      if (isAlreadyAdded) {
        toast({
          title: "Atenção",
          description: "Esta questão já foi adicionada a esta disciplina",
          variant: "destructive",
        });
        return;
      }

      setQuestionsBySubject(prev => ({
        ...prev,
        [selectedSubjectForQuestion]: [...(prev[selectedSubjectForQuestion] || []), question]
      }));
      
      toast({
        title: "Questão adicionada",
        description: "A questão foi adicionada à avaliação",
      });
    }
  };

  const handleViewQuestion = (question: Question) => {
    setPreviewQuestion(question);
    setShowQuestionPreview(true);
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

      if (allQuestions.length === 0) {
        toast({
          title: "Erro",
          description: "Adicione pelo menos uma questão à avaliação",
          variant: "destructive",
        });
        return;
      }

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

      // Chamar callback de conclusão se fornecido
      if (onComplete) {
        onComplete();
      }

      navigate("/app/avaliacoes");
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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Fácil': return 'bg-green-100 text-green-800';
      case 'Médio': return 'bg-yellow-100 text-yellow-800';
      case 'Difícil': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'multipleChoice': return 'Múltipla Escolha';
      case 'open': return 'Dissertativa';
      default: return type;
    }
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
                          <span className="ml-2 text-sm text-muted-foreground">
                            ({subjectQuestions.length} questão{subjectQuestions.length !== 1 ? 'ões' : ''})
                          </span>
                        </h3>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddFromBank(subject.id)}
                          >
                            <Book className="h-4 w-4 mr-2" />
                            Banco de Questões
                          </Button>
                        </div>
                      </div>

                      {subjectQuestions.length > 0 ? (
                        <div className="space-y-3">
                          {subjectQuestions.map((question, index) => (
                            <Card key={index} className="bg-muted/30">
                              <CardContent className="pt-4">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h4 className="text-sm font-medium">
                                        Questão {index + 1}
                                      </h4>
                                      <div className="flex gap-1">
                                        {question.difficulty && (
                                          <Badge className={`text-xs ${getDifficultyColor(question.difficulty)}`}>
                                            {question.difficulty}
                                          </Badge>
                                        )}
                                        <Badge variant="outline" className="text-xs">
                                          {getTypeLabel(question.type)}
                                        </Badge>
                                        {question.value && (
                                          <Badge variant="outline" className="text-xs">
                                            {question.value} pt{parseFloat(question.value) !== 1 ? 's' : ''}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                      {question.title || question.text}
                                    </p>
                                    {question.subject && (
                                      <Badge variant="secondary" className="text-xs mt-1">
                                        {question.subject.name}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleViewQuestion(question)}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveQuestion(subject.id, index)}
                                      className="text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground text-sm bg-muted/30 rounded-lg">
                          <Book className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>Nenhuma questão adicionada para esta disciplina</p>
                          <p className="text-xs mt-1">Use o botão "Banco de Questões" para adicionar questões</p>
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

      {/* Banco de Questões */}
      <QuestionBank
        open={showQuestionBank}
        onClose={() => {
          setShowQuestionBank(false);
          setSelectedSubjectForQuestion("");
        }}
        onSelect={handleQuestionSelected}
        subjects={subjectOptions}
        selectedSubjectId={selectedSubjectForQuestion}
      />

      {/* Preview de questão */}
      <Dialog open={showQuestionPreview} onOpenChange={setShowQuestionPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Visualizar Questão</DialogTitle>
          </DialogHeader>
          {previewQuestion && (
            <QuestionPreview question={previewQuestion} />
          )}
        </DialogContent>
      </Dialog>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={loading}
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