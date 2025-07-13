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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEvaluationActions, useQuestions } from "@/stores/useEvaluationStore";
import { api } from "@/lib/api";
import { useAuth } from "@/context/authContext";

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
  const allQuestions = useQuestions(); // Pegar questões do store

  // Inicializar estrutura de questões por disciplina
  useEffect(() => {
    const initialQuestionsBySubject: QuestionsBySubject = {};
    data.subjects.forEach(subject => {
      initialQuestionsBySubject[subject.id] = [];
    });
    setQuestionsBySubject(initialQuestionsBySubject);
  }, [data.subjects]);

  const handleAddFromBank = (subjectId: string) => {
    setSelectedSubjectForQuestion(subjectId);
    setShowQuestionBank(true);
  };

  const handleCreateNewQuestion = (subjectId: string) => {
    setSelectedSubjectForQuestion(subjectId);
    setShowCreateQuestion(true);
  };

  const handleQuestionCreated = (question: Question) => {
    if (selectedSubjectForQuestion) {
      setQuestionsBySubject(prev => ({
        ...prev,
        [selectedSubjectForQuestion]: [...(prev[selectedSubjectForQuestion] || []), question]
      }));

      toast({
        title: "Questão criada e adicionada",
        description: "A nova questão foi criada e adicionada à avaliação com sucesso!",
      });
    }
    setShowCreateQuestion(false);
    setSelectedSubjectForQuestion("");
  };

  const handleRemoveQuestion = (subjectId: string, questionIndex: number) => {
    setQuestionsBySubject(prev => ({
      ...prev,
      [subjectId]: prev[subjectId].filter((_, i) => i !== questionIndex)
    }));
    toast({
      title: "Questão removida",
      description: "A questão foi removida da avaliação.",
    });
  };

  const handleQuestionSelected = (question: Question) => {
    if (selectedSubjectForQuestion) {
      if (question.subject?.id !== selectedSubjectForQuestion) {
        toast({
          title: "Erro",
          description: "Esta questão não pertence à disciplina selecionada.",
          variant: "destructive",
        });
        return;
      }

      const currentQuestions = questionsBySubject[selectedSubjectForQuestion] || [];
      const isAlreadyAdded = currentQuestions.some(q => q.id === question.id);

      if (isAlreadyAdded) {
        toast({
          title: "Atenção",
          description: "Esta questão já foi adicionada a esta disciplina.",
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
        description: "A questão foi adicionada à avaliação.",
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

      if (!user) {
        toast({
          title: "Erro de Autenticação",
          description: "Você precisa estar logado para criar uma avaliação.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!data.title || data.title.trim() === "") {
        toast({
          title: "Erro de Validação",
          description: "O título da avaliação é obrigatório.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!data.course || !data.grade || !data.subjects || data.subjects.length === 0) {
        toast({
          title: "Erro de Validação",
          description: "Curso, série e disciplina são obrigatórios.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const allQuestions = Object.values(questionsBySubject).flat();

      if (allQuestions.length === 0) {
        toast({
          title: "Erro de Validação",
          description: "Adicione pelo menos uma questão à avaliação.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }



      // Estruturar dados da avaliação no formato que o backend espera
      const backendEvaluationData = {
        title: data.title.trim(),
        description: data.description?.trim() || "Avaliação criada via painel administrativo",
        type: data.type,
        model: data.model,
        course: data.course,
        created_by: user?.id || "",
        subject: data.subjects[0]?.id || data.subject, // Disciplina principal
        grade: data.grade,
        grade_id: data.grade,
        intructions: "Leia atentamente cada questão antes de responder",
        max_score: allQuestions.reduce((total, q) => total + (q.value || 0), 0),
        time_limit: data.endDateTime || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        end_time: data.endDateTime || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        evaluation_mode: "virtual",
        municipalities: data.municipalities || [],
        schools: data.selectedSchools?.map(s => s.id) || data.schools || [],
        subjects_info: data.subjects.map(subject => ({
          subject: subject.id,
          weight: Math.round(100 / data.subjects.length) // Peso igual para todas as disciplinas
        })),
        questions: allQuestions.map((question, index) => {
          // Se a questão já tem ID (vem do banco), usar apenas id e number
          if (question.id && question.id !== 'preview') {
            return {
              id: question.id,
              number: index + 1
            };
          }

          // Se é uma nova questão, enviar todos os dados
          return {
            number: index + 1,
            text: question.text,
            formattedText: question.formattedText || question.text,
            subjectId: question.subjectId,
            subject_id: question.subjectId,
            title: question.title,
            description: question.title,
            command: question.title,
            subtitle: question.title,
            options: question.options?.map((opt, optIndex) => ({
              text: opt.text,
              value: String.fromCharCode(65 + optIndex) // A, B, C, D...
            })) || [],
            skills: question.skills || [],
            grade: { id: question.grade?.id || data.grade },
            difficulty: question.difficulty,
            solution: question.options?.find(opt => opt.isCorrect)?.text || "",
            formattedSolution: question.formattedSolution || question.solution || "",
            type: question.type === 'multipleChoice' ? 'multiple_choice' : 'open',
            value: question.value || 0,
            topics: [],
            created_by: user?.id || ""
          };
        })
      };

      // ✅ REMOVIDO: Console.log para apresentação
      // console.log("📤 Criando avaliação com dados no formato do backend:", {
      //   ...backendEvaluationData,
      //   totalQuestions: allQuestions.length,
      //   selectedClasses: data.selectedClasses?.map(c => c.name),
      //   selectedSchools: data.selectedSchools?.map(s => s.name)
      // });

      // Criar avaliação no backend usando o endpoint correto
      const response = await api.post("/test", backendEvaluationData);
      const newEvaluation = response.data;
      console.log("✅ Avaliação criada com ID:", newEvaluation.id);

      const selectedClassesCount = data.selectedClasses?.length || 0;
      const questionsCount = allQuestions.length;

      toast({
        title: "🎉 Sucesso!",
        description: `Avaliação criada com ${questionsCount} questões para ${selectedClassesCount || 'todas as'} turma${selectedClassesCount > 1 ? 's' : ''}!`,
      });

      if (onComplete) {
        onComplete();
      }

      // Redirecionar para lista de avaliações
      navigate("/app/avaliacoes");

    } catch (error) {
      console.error("❌ Erro ao criar avaliação:", error);
      toast({
        title: "Erro Inesperado",
        description: "Não foi possível criar a avaliação. Verifique o console para mais detalhes.",
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
      case 'Avançado': return 'bg-green-800 text-green-100';
      case 'Adequado': return 'bg-green-100 text-green-800';
      case 'Básico': return 'bg-yellow-100 text-yellow-800';
      case 'Abaixo do Básico': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'multipleChoice': return 'Múltipla Escolha';
      case 'open': return 'Dissertativa';
      case 'trueFalse': return 'Verdadeiro/Falso';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">📝 Questões por Disciplina</h2>
          <div className="text-sm text-muted-foreground mt-1">
            {data.subjects?.length > 0 ? (
              <>
                <span className="font-medium">{data.subjects.length} disciplina{data.subjects.length > 1 ? 's' : ''} selecionada{data.subjects.length > 1 ? 's' : ''}:</span>
                <span className="ml-2">
                  {data.subjects.map((subject, index) => (
                    <span key={subject.id}>
                      {subject.name}
                      {index < data.subjects.length - 1 && ", "}
                    </span>
                  ))}
                </span>
              </>
            ) : (
              "Nenhuma disciplina selecionada"
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">
            {getTotalQuestions()}
          </div>
          <div className="text-sm text-muted-foreground">
            questões totais
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {data.subjects?.length > 0 ? (
            <div className="space-y-6">
              {data.subjects.map((subject) => {
                const subjectQuestions = questionsBySubject[subject.id] || [];
                return (
                  <Card key={subject.id}>
                    <CardContent className="pt-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        <div>
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Book className="h-5 w-5 text-primary" />
                            {subject.name}
                            <Badge variant="secondary" className="text-xs">
                              {subjectQuestions.length} questões
                            </Badge>
                          </h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCreateNewQuestion(subject.id)}
                            className="flex items-center gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            Nova Questão
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddFromBank(subject.id)}
                            className="flex items-center gap-2"
                          >
                            <Book className="h-4 w-4" />
                            Banco de Questões
                          </Button>
                        </div>
                      </div>

                      {subjectQuestions.length > 0 ? (
                        <div className="space-y-3">
                          {subjectQuestions.map((question, index) => (
                            <Card key={question.id || index} className="bg-muted/30">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground line-clamp-2 mb-2">
                                      {question.title || question.text}
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      <Badge className={getDifficultyColor(question.difficulty)} variant="secondary">
                                        {question.difficulty}
                                      </Badge>
                                      <Badge variant="outline">
                                        {getTypeLabel(question.type)}
                                      </Badge>
                                      <Badge variant="outline">
                                        {question.value} pt{question.value !== 1 ? 's' : ''}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleViewQuestion(question)}>
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveQuestion(subject.id, index)} className="text-destructive hover:text-destructive">
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
                          <div className="flex flex-col items-center gap-2">
                            <Book className="h-8 w-8 text-muted-foreground/50" />
                            <p>Nenhuma questão adicionada para {subject.name}.</p>
                            <p className="text-xs">Use os botões acima para adicionar questões.</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <div className="flex flex-col items-center gap-2">
                <Book className="h-12 w-12 text-muted-foreground/50" />
                <p>Nenhuma disciplina selecionada.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreateQuestion} onOpenChange={setShowCreateQuestion}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Nova Questão</DialogTitle>
          </DialogHeader>
          <QuestionFormReadOnly
            open={showCreateQuestion}
            onClose={() => {
              setShowCreateQuestion(false);
              setSelectedSubjectForQuestion("");
            }}
            onQuestionAdded={handleQuestionCreated}
            questionNumber={questionsBySubject[selectedSubjectForQuestion]?.length + 1 || 1}
            evaluationData={{
              course: data.course,
              grade: data.grade,
              subject: selectedSubjectForQuestion
            }}
          />
        </DialogContent>
      </Dialog>

      <QuestionBank
        open={showQuestionBank}
        onClose={() => {
          setShowQuestionBank(false);
          setSelectedSubjectForQuestion("");
        }}
        subjectId={selectedSubjectForQuestion || null}
        onQuestionSelected={handleQuestionSelected}
      />

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

      <div className="flex justify-between items-center gap-2 pt-4 border-t">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={loading}
        >
          ← Voltar
        </Button>

        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            {getTotalQuestions() > 0 ? (
              <span className="flex items-center gap-2">
                ✅ <strong>{getTotalQuestions()}</strong> questões adicionadas
              </span>
            ) : (
              <span className="text-orange-600">⚠️ Adicione pelo menos uma questão</span>
            )}
          </div>
          <Button
            onClick={handleSubmit}
            disabled={loading || getTotalQuestions() === 0}
            className="min-w-32"
          >
            {loading ? "Criando..." : "🚀 Criar Avaliação"}
          </Button>
        </div>
      </div>
    </div>
  );
};
