import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Book, Eye, Trash2, Plus } from "lucide-react";
import { Question, Subject } from "./types";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/authContext";
import { useNavigate } from "react-router-dom";
import QuestionBank from "./questions/QuestionBank";
import QuestionPreview from "./questions/QuestionPreview";
import QuestionForm from "./questions/QuestionForm";
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
    description?: string;
    startDateTime?: string;
    duration?: string;
    classes?: string[];
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
  const [showCreateQuestion, setShowCreateQuestion] = useState(false);
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
      description: "A questão foi removida da avaliação",
    });
  };

  const handleQuestionSelected = (question: Question) => {
    if (selectedSubjectForQuestion) {
      // Verificar se a questão pertence à disciplina selecionada
      if (question.subject?.id !== selectedSubjectForQuestion) {
        toast({
          title: "Erro",
          description: "Esta questão não pertence à disciplina selecionada",
          variant: "destructive",
        });
        return;
      }

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

      // Validar dados obrigatórios antes de enviar
      if (!data.title || data.title.trim() === "") {
        toast({
          title: "Erro",
          description: "Título da avaliação é obrigatório",
          variant: "destructive",
        });
        return;
      }

      if (!data.course || !data.grade || !data.subject) {
        toast({
          title: "Erro",
          description: "Curso, série e disciplina são obrigatórios",
          variant: "destructive",
        });
        return;
      }

      // Preparar dados para envio
      const allQuestions = Object.entries(questionsBySubject).flatMap(([subjectId, questions]) =>
        questions.map(question => ({
          id: question.id,
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

      // Montar payload conforme backend espera
      const payload = {
        title: data.title.trim(),
        description: data.description?.trim() || "Avaliação criada via painel",
        type: data.type,
        model: data.model,
        course: data.course,
        grade: data.grade,
        subject: data.subject, // Para compatibilidade (primeira disciplina)
        subjects: data.subjects?.map(s => s.id) || [], // Múltiplas disciplinas
        subjects_info: data.subjects || [], // Informações completas das disciplinas
        municipalities: data.municipalities || [],
        schools: Array.isArray(data.schools) ? data.schools : [data.schools],
        time_limit: data.startDateTime,
        duration: data.duration ? Number(data.duration) : undefined,
        questions: allQuestions,
        created_by: user?.id || "",
        classes: data.classes || []
      };

      console.log("📤 Enviando payload para criar avaliação:", payload);
      const response = await api.post("/test", payload);
      const evaluationId = response.data.id;
      console.log("✅ Avaliação criada com ID:", evaluationId);

      // ✅ Aplicar automaticamente às turmas selecionadas
      if (data.classes && data.classes.length > 0) {
        console.log("🎯 Aplicando avaliação às turmas:", data.classes);
        console.log("📅 Data de aplicação:", data.startDateTime);
        
        const classApplications = data.classes.map(classId => ({
          class_id: classId,
          application: data.startDateTime || new Date().toISOString(),
          expiration: null // Pode ser configurado no futuro
        }));

        console.log("📋 Payload de aplicação às turmas:", {
          classes: classApplications
        });

        try {
          const applyResponse = await api.post(`/test/${evaluationId}/apply`, {
            classes: classApplications
          });
          console.log("✅ Resposta da aplicação às turmas:", applyResponse.data);
          console.log("✅ Avaliação aplicada às turmas com sucesso");
          
          // ✅ Mostrar toast de sucesso com detalhes
          toast({
            title: "Sucesso!",
            description: `Avaliação criada e aplicada a ${data.classes.length} turma${data.classes.length > 1 ? 's' : ''}!`,
          });
          
        } catch (applyError) {
          console.error("❌ Erro ao aplicar avaliação às turmas:", applyError);
          console.error("❌ Detalhes do erro:", applyError.response?.data);
          
          // Tentar aplicar uma por uma se falhou em lote
          console.log("🔄 Tentando aplicar turmas individualmente...");
          let successCount = 0;
          
          for (const classId of data.classes) {
            try {
              await api.post(`/test/${evaluationId}/apply`, {
                classes: [{
                  class_id: classId,
                  application: data.startDateTime || new Date().toISOString(),
                  expiration: null
                }]
              });
              successCount++;
              console.log(`✅ Turma ${classId} aplicada com sucesso`);
            } catch (individualError) {
              console.error(`❌ Erro ao aplicar turma ${classId}:`, individualError.response?.data);
            }
          }
          
          if (successCount > 0) {
            toast({
              title: "Avaliação criada",
              description: `Avaliação criada e aplicada a ${successCount} de ${data.classes.length} turmas.`,
            });
          } else {
            toast({
              title: "Avaliação criada",
              description: "Avaliação criada, mas houve erro ao aplicar às turmas. Aplique manualmente.",
              variant: "default",
            });
          }
        }
      } else {
        console.log("⚠️ Nenhuma turma selecionada para aplicar a avaliação");
        toast({
          title: "Sucesso",
          description: "Avaliação criada com sucesso!",
        });
      }

      // Chamar callback de conclusão se fornecido
      if (onComplete) {
        onComplete();
      }

      navigate("/app/avaliacoes");
    } catch (error) {
      console.error("Erro ao criar avaliação:", error);
      toast({
        title: "Erro",
        description: error?.response?.data?.message || "Não foi possível criar a avaliação",
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
        <div>
          <h2 className="text-2xl font-bold">Questões por Disciplina</h2>
          <div className="text-sm text-muted-foreground mt-1">
            {data.subjects && data.subjects.length > 0 ? (
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

      {/* Resumo das disciplinas */}
      {data.subjects && data.subjects.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Book className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-blue-900">Resumo das Disciplinas</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {data.subjects.map((subject) => {
                const subjectQuestions = questionsBySubject[subject.id] || [];
                return (
                  <div key={subject.id} className="bg-white rounded-lg p-3 border border-blue-200">
                    <div className="font-medium text-sm text-gray-900 truncate" title={subject.name}>
                      {subject.name}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {subjectQuestions.length} questões
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                      <div 
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                        style={{ 
                          width: subjectQuestions.length > 0 ? '100%' : '0%' 
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          {data.subjects && data.subjects.length > 0 ? (
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
                          <p className="text-sm text-muted-foreground mt-1">
                            {subjectQuestions.length === 0 
                              ? "Adicione questões para esta disciplina"
                              : `${subjectQuestions.length} questão${subjectQuestions.length > 1 ? 'ões' : ''} adicionada${subjectQuestions.length > 1 ? 's' : ''} para ${subject.name}`
                            }
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCreateNewQuestion(subject.id)}
                            className="flex items-center gap-2 hover:bg-green-50 hover:border-green-300"
                          >
                            <Plus className="h-4 w-4" />
                            Nova Questão
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddFromBank(subject.id)}
                            className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-300"
                          >
                            <Book className="h-4 w-4" />
                            Banco: {subject.name}
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
                                            {question.value} pts
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
                          <p className="text-xs mt-1">Use os botões "Nova Questão" ou "Banco de Questões" para adicionar questões</p>
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

      {/* Modal para criar nova questão */}
      <Dialog open={showCreateQuestion} onOpenChange={setShowCreateQuestion}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Nova Questão</DialogTitle>
          </DialogHeader>
          <QuestionForm
            open={showCreateQuestion}
            onClose={() => {
              setShowCreateQuestion(false);
              setSelectedSubjectForQuestion("");
            }}
            onQuestionAdded={handleQuestionCreated}
          />
        </DialogContent>
      </Dialog>

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