import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Trash2, Play } from "lucide-react";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Interfaces based on the provided JSON structure
interface Author {
  id: string;
  name: string;
}

interface QuestionOption {
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  number: number;
  text: string;
  formattedText?: string;
  type: string;
  value: number;
  difficulty: string;
  skills: string[];
  options?: QuestionOption[];
  solution: string;
  subjectId?: string; // ID da matéria da questão
}

interface Subject {
  id: string;
  name: string;
}

interface Evaluation {
  id: string;
  title: string;
  description: string | null;
  course: {
    id: string;
    name: string;
  } | null;
  model: string;
  subject: {
    id: string;
    name: string;
  };
  subjects_info?: Subject[]; // Array de matérias da avaliação
  grade: {
    id: string;
    name: string;
  } | null;
  max_score: number | null;
  createdBy: Author;
  createdAt: string;
  questions: Question[];
  municipalities?: any[]; // Assuming a new field
  schools?: any[]; // Assuming a new field
}

// Interface para questões agrupadas por matéria
interface QuestionsBySubject {
  [subjectId: string]: {
    subject: Subject;
    questions: Question[];
  };
}

export default function ViewEvaluation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    const fetchEvaluation = async () => {
      if (!id) return;
      try {
        const response = await api.get(`/test/${id}`);
        setEvaluation(response.data);
      } catch (error) {
        console.error("Erro ao buscar avaliação:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvaluation();
  }, [id]);

  const handleEdit = () => {
    navigate(`/app/avaliacao/${id}/editar`);
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!id) return;

    try {
      setIsDeleting(true);
      await api.delete(`/test/${id}`);

      toast({
        title: "Sucesso",
        description: "Avaliação excluída com sucesso!",
      });

      navigate("/app/avaliacoes");
    } catch (error) {
      console.error("Erro ao excluir avaliação:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a avaliação",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleApply = () => {
    navigate(`/app/avaliacao/${id}/aplicar`);
  };

  // Função para agrupar questões por matéria
  const groupQuestionsBySubject = (): QuestionsBySubject => {
    if (!evaluation) return {};

    const questionsBySubject: QuestionsBySubject = {};

    // Se temos subjects_info, usamos para criar a estrutura
    if (evaluation.subjects_info && evaluation.subjects_info.length > 0) {
      evaluation.subjects_info.forEach(subject => {
        questionsBySubject[subject.id] = {
          subject,
          questions: []
        };
      });

      // Distribuir questões pelas matérias
      evaluation.questions.forEach(question => {
        if (question.subjectId && questionsBySubject[question.subjectId]) {
          questionsBySubject[question.subjectId].questions.push(question);
        } else {
          // Se não tem subjectId ou não encontrou a matéria, coloca na primeira
          const firstSubjectId = Object.keys(questionsBySubject)[0];
          if (firstSubjectId) {
            questionsBySubject[firstSubjectId].questions.push(question);
          }
        }
      });
    } else {
      // Fallback para avaliações antigas com apenas uma matéria
      questionsBySubject[evaluation.subject.id] = {
        subject: evaluation.subject,
        questions: evaluation.questions
      };
    }

    return questionsBySubject;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-1/2" />
          <div className="space-x-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-36" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle><Skeleton className="h-6 w-1/3" /></CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle><Skeleton className="h-6 w-1/3" /></CardTitle></CardHeader>
            <CardContent><Skeleton className="h-20 w-full" /></CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader><CardTitle><Skeleton className="h-6 w-1/3" /></CardTitle></CardHeader>
          <CardContent><Skeleton className="h-40 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  if (!evaluation) {
    return <div className="container mx-auto py-6 text-center">Avaliação não encontrada.</div>;
  }

  const questionsBySubject = groupQuestionsBySubject();
  const totalQuestions = evaluation.questions.length;
  const subjectsCount = evaluation.subjects_info?.length || 1;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Cabeçalho com título e botões de ação */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{evaluation.title}</h1>
        <div className="space-x-2">
          <Button variant="outline" onClick={handleEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button variant="outline" onClick={handleDelete} disabled={isDeleting}>
            <Trash2 className="h-4 w-4 mr-2 text-red-500" />
            {isDeleting ? "Excluindo..." : "Excluir"}
          </Button>
          <Button onClick={handleApply}>
            <Play className="h-4 w-4 mr-2" />
            Aplicar Avaliação
          </Button>
        </div>
      </div>

      {/* Informações da Avaliação */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações Gerais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Curso</label>
              <p>{evaluation.course?.name || 'Não informado'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Matérias</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {evaluation.subjects_info && evaluation.subjects_info.length > 0 ? (
                  evaluation.subjects_info.map((subject) => (
                    <Badge key={subject.id} variant="outline">
                      {subject.name}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline">
                    {evaluation.subject?.name || 'Não informado'}
                  </Badge>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Série</label>
              <p>{evaluation.grade?.name || 'Não informada'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Número de Questões</label>
              <p>{totalQuestions}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Data de Criação</label>
              <p>{new Date(evaluation.createdAt).toLocaleDateString('pt-BR')}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Criado por</label>
              <p>{evaluation.createdBy?.name || 'Não informado'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Novo card com informações de municípios e escolas */}
        <Card>
          <CardHeader>
            <CardTitle>Municípios e Escolas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Municípios</label>
              <ul className="list-disc list-inside">
                {(evaluation.municipalities && evaluation.municipalities.length > 0)
                  ? evaluation.municipalities.map((m: any, idx: number) => (
                    <li key={m.id || m.name || idx}>{m.name || m}</li>
                  ))
                  : <li>Não informado</li>}
              </ul>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Escolas</label>
              <ul className="list-disc list-inside">
                {(evaluation.schools && evaluation.schools.length > 0)
                  ? evaluation.schools.map((s: any, idx: number) => (
                    <li key={s.id || s.name || idx}>{s.name || s}</li>
                  ))
                  : <li>Não informado</li>}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Questões por Matéria */}
      <div className="space-y-6">
        {Object.entries(questionsBySubject).map(([subjectId, subjectData]) => (
          <Card key={subjectId}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>{subjectData.subject.name}</span>
                <Badge variant="secondary">
                  {subjectData.questions.length} questão{subjectData.questions.length !== 1 ? 'ões' : ''}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {subjectData.questions.map((question, index) => (
                  <div key={question.id} className="border rounded-lg p-4">
                    <h3 className="font-medium mb-2">Questão {question.number || index + 1}</h3>
                    <div className="mb-4" dangerouslySetInnerHTML={{ __html: question.formattedText || question.text }}></div>
                    <div className="space-y-2">
                      {question.options && question.options.map((option, optionIndex) => (
                        <div
                          key={optionIndex}
                          className={`p-2 rounded ${option.isCorrect
                            ? "bg-green-50 border border-green-200"
                            : "bg-gray-50"
                            }`}
                        >
                          <div dangerouslySetInnerHTML={{ __html: option.text }}></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a avaliação "{evaluation?.title}"?
              Esta ação não pode ser desfeita e todas as questões associadas serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 