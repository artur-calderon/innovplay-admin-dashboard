import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Book, Eye, Trash2, Plus } from "lucide-react";
import { EvaluationData, Question, Subject } from "./types";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { QuestionBank } from "./QuestionBank";
import QuestionPreview from "./questions/QuestionPreview";
import QuestionFormReadOnly from "./questions/QuestionFormReadOnly";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEvaluationActions, useQuestions, useQuestionActions } from "@/stores/useEvaluationStore";
import { api } from "@/lib/api";
import { useAuth } from "@/context/authContext";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "./results/constants";

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
    selectedClasses?: { id: string; name: string; school?: { id: string; name: string; } }[];
    selectedSchools?: { id: string; name: string; }[];
    subject: string;
    description?: string;
    startDateTime?: string;
    endDateTime?: string;
    duration?: string;
    classes?: string[];
    municipality?: string;
    questions?: Question[];
  };
  onBack: () => void;
  onComplete?: (updatedQuestions?: Question[]) => void;
  editMode?: boolean;
  evaluationId?: string;
}

interface QuestionsBySubject {
  [subjectId: string]: Question[];
}

export const CreateEvaluationStep2 = ({
  data,
  onBack,
  onComplete,
  editMode = false,
  evaluationId,
}: CreateEvaluationStep2Props) => {
  const [loading, setLoading] = useState(false);
  const [questionsBySubject, setQuestionsBySubject] = useState<QuestionsBySubject>({});
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [showQuestionPreview, setShowQuestionPreview] = useState(false);
  const [showCreateQuestion, setShowCreateQuestion] = useState(false);
  const [selectedSubjectForQuestion, setSelectedSubjectForQuestion] = useState<string>("");
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Usar o store para criação de avaliação
  const { createEvaluation } = useEvaluationActions();
  const allQuestions = useQuestions();
  const { setQuestions, clearQuestions, addQuestion } = useQuestionActions();

  // Carregar questões existentes quando entrar na edição
  useEffect(() => {
    if (data.questions && data.questions.length > 0) {
      setQuestions(data.questions);
    } else {
      clearQuestions();
    }
  }, [data.questions, setQuestions, clearQuestions]);

  // Inicializar estrutura de questões por disciplina
  useEffect(() => {
    const initialQuestionsBySubject: QuestionsBySubject = {};
    data.subjects.forEach(subject => {
      initialQuestionsBySubject[subject.id] = [];
    });
    setQuestionsBySubject(initialQuestionsBySubject);
  }, [data.subjects]);

  // Atualizar questionsBySubject quando questões do store mudarem
  useEffect(() => {
    if (allQuestions.length > 0) {
      const updatedQuestionsBySubject: QuestionsBySubject = {};
      data.subjects.forEach(subject => {
        const subjectQuestions = allQuestions.filter(q => {
          return q.subjectId === subject.id || 
                 q.subject?.id === subject.id ||
                 (q as any).subject_id === subject.id;
        });
        
        updatedQuestionsBySubject[subject.id] = subjectQuestions;
      });
      setQuestionsBySubject(updatedQuestionsBySubject);
    }
  }, [allQuestions, data.subjects]);

  const handleAddFromBank = (subjectId: string) => {
    setSelectedSubjectForQuestion(subjectId);
    setShowQuestionBank(true);
  };

  const handleCreateNewQuestion = (subjectId: string) => {
    setSelectedSubjectForQuestion(subjectId);
    setShowCreateQuestion(true);
  };

  const handleQuestionCreated = (question: Question) => {
    addQuestion(question);
    
    setShowCreateQuestion(false);
    toast({
      title: "Questão criada",
      description: "Nova questão adicionada à avaliação",
    });
  };

  const handleQuestionSelected = (question: Question) => {
    addQuestion(question);
    
    toast({
      title: "Questão adicionada",
      description: "Questão adicionada à avaliação",
    });
  };

  const handleRemoveQuestion = (questionId: string) => {
    const updatedQuestions = allQuestions.filter(q => q.id !== questionId);
    setQuestions(updatedQuestions);
    
    toast({
      title: "Questão removida",
      description: "Questão removida da avaliação",
    });
  };

  const handleViewQuestion = async (question: Question) => {
    try {
      if (question.id && question.id !== 'preview') {
        const response = await api.get(`/questions/${question.id}`);
        setPreviewQuestion(response.data);
      } else {
        setPreviewQuestion(question);
      }
      setShowQuestionPreview(true);
    } catch (error) {
      console.error("Erro ao buscar questão:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a questão",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado",
          variant: "destructive",
        });
        return;
      }

      if (allQuestions.length === 0) {
        toast({
          title: "Erro",
          description: "Adicione pelo menos uma questão à avaliação",
          variant: "destructive",
        });
        return;
      }

      // Validar se todas as questões têm alternativas válidas
      const invalidQuestions = allQuestions.filter(q => {
        if (q.type === 'multipleChoice' && (!q.options || q.options.length === 0)) return true;
        if (q.type === 'multipleChoice' && !q.options.some(opt => opt.isCorrect)) return true;
        return false;
      });

      if (invalidQuestions.length > 0) {
        toast({
          title: "Erro de Validação",
          description: `${invalidQuestions.length} questão(ões) não têm alternativas ou resposta correta definida`,
          variant: "destructive",
        });
        return;
      }

      // ✅ CORREÇÃO: Se estiver em modo de edição, delegar para o EditEvaluation
      if (editMode && onComplete) {
        console.log("📝 Modo de edição: delegando questões para EditEvaluation");
        onComplete(allQuestions);
        return;
      }

      // ✅ CORREÇÃO: Fluxo de criação (apenas quando não estiver editando)
      const backendEvaluationData = {
        title: data.title,
        description: data.description || "",
        type: data.type,
        model: data.model,
        course: data.course,
        grade: data.grade,
        subject: data.subject,
        time_limit: data.startDateTime || new Date().toISOString(),
        end_time: data.endDateTime || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        duration: data.duration ? parseInt(data.duration, 10) : 60,
        evaluation_mode: "virtual",
        municipalities: data.municipalities || [],
        schools: data.selectedSchools?.map(s => s.id) || data.schools || [],
        classes: data.selectedClasses?.map(c => c.id) || data.classes || [],
        subjects: data.subjects.map(subject => subject.id),
        subjects_info: data.subjects.map(subject => ({
          subject: subject.id,
          weight: Math.round(100 / data.subjects.length)
        })),
        created_by: user?.id || "",
        questions: allQuestions.map((question, index) => {
          if (question.id && question.id !== 'preview') {
            return {
              id: question.id,
              number: index + 1
            };
          }

          return {
            number: index + 1,
            text: question.text,
            formattedText: question.formattedText || question.text,
             subjectId: question.subjectId,
             title: question.title,
             description: question.title,
             command: question.title,
             subtitle: question.title,
             secondStatement: question.secondStatement || '',
             options: question.options?.map((opt, optIndex) => ({
               id: String.fromCharCode(65 + optIndex),
               text: opt.text,
               isCorrect: opt.isCorrect
             })) || [],
             skills: question.skills || [],
             grade: question.grade?.id || data.grade,
             difficulty: question.difficulty,
             solution: question.solution || "",
             formattedSolution: question.formattedSolution || question.solution || "",
             type: question.type === 'multipleChoice' ? 'multiple_choice' : 'open',
             value: question.value || 0,
             topics: [],
             educationStageId: data.course,
             created_by: user?.id || "",
             lastModifiedBy: user?.id || ""
          };
        })
      };

      const response = await api.post("/test", backendEvaluationData);
      
      if (response.status === 201 || response.status === 200) {
        toast({
          title: SUCCESS_MESSAGES.EVALUATION_CREATED,
          description: `Avaliação "${data.title}" criada com sucesso!`,
        });

        clearQuestions();

        // 🔧 CORREÇÃO: Sempre redirecionar para página inicial
        navigate("/app/avaliacoes");
      }
    } catch (error: any) {
      console.error("Erro ao criar avaliação:", error);
      
      let errorMessage = ERROR_MESSAGES.EVALUATION_CREATE_FAILED;
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Erro ao criar avaliação",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTotalQuestions = () => {
    return allQuestions.length;
  };

  const getQuestionsForSubject = (subjectId: string) => {
    return allQuestions.filter(q => {
      return q.subjectId === subjectId || 
             q.subject?.id === subjectId ||
             (q as any).subject_id === subjectId;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header com resumo */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Questões da Avaliação</h2>
          <p className="text-sm text-muted-foreground">
            Total: {getTotalQuestions()} questão(ões) selecionada(s)
          </p>
        </div>
      </div>

      {/* Questões por disciplina */}
      <div className="space-y-6">
        {data.subjects.map((subject) => {
          const subjectQuestions = getQuestionsForSubject(subject.id);
          
          return (
            <Card key={subject.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Book className="h-5 w-5" />
                    <h3 className="text-lg font-medium">{subject.name}</h3>
                    <Badge variant="outline">
                      {subjectQuestions.length} questão(ões)
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddFromBank(subject.id)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Banco de Questões
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCreateNewQuestion(subject.id)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Nova Questão
                    </Button>
                  </div>
                </div>

                {/* Lista de questões */}
                <div className="space-y-3">
                  {subjectQuestions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Book className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma questão adicionada para {subject.name}</p>
                      <p className="text-sm">Use os botões acima para adicionar questões</p>
                    </div>
                  ) : (
                    subjectQuestions.map((question, index) => (
                      <div
                        key={question.id || index}
                        className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary">#{index + 1}</Badge>
                            <span className="text-sm font-medium">
                              {question.title || `Questão ${index + 1}`}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {question.text || "Sem texto disponível"}
                          </p>
                          {question.options && question.options.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {question.options.length} alternativas
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
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
                            onClick={() => handleRemoveQuestion(question.id || "")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Botões de ação */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={loading || getTotalQuestions() === 0}
        >
          {loading ? (editMode ? "Salvando..." : "Criando...") : (editMode ? "Salvar Alterações" : "Finalizar Avaliação")}
        </Button>
      </div>

      {/* Modais */}
      <Dialog open={showQuestionBank} onOpenChange={setShowQuestionBank}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Banco de Questões</DialogTitle>
            <DialogDescription>
              Selecione questões do banco para adicionar à avaliação
            </DialogDescription>
          </DialogHeader>
          <QuestionBank
            open={showQuestionBank}
            subjectId={selectedSubjectForQuestion}
            onQuestionSelected={handleQuestionSelected}
            onClose={() => setShowQuestionBank(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showQuestionPreview} onOpenChange={setShowQuestionPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Visualizar Questão</DialogTitle>
            <DialogDescription>
              Prévia completa da questão com alternativas e resolução
            </DialogDescription>
          </DialogHeader>
          {previewQuestion && (
            <QuestionPreview
              question={previewQuestion}
              onClose={() => setShowQuestionPreview(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateQuestion} onOpenChange={setShowCreateQuestion}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Nova Questão</DialogTitle>
            <DialogDescription>
              Crie uma nova questão para adicionar à avaliação
            </DialogDescription>
          </DialogHeader>
          <QuestionFormReadOnly
            open={showCreateQuestion}
            onClose={() => setShowCreateQuestion(false)}
            onQuestionAdded={handleQuestionCreated}
            questionNumber={getTotalQuestions() + 1}
            evaluationData={{
              course: data.course,
              grade: data.grade,
              subject: selectedSubjectForQuestion
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};