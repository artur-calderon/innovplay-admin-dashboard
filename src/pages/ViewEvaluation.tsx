import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Trash2, Play } from "lucide-react";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

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
  grade: {
    id: string;
    name: string;
  } | null;
  max_score: number | null;
  createdBy: Author;
  createdAt: string;
  questions: Question[];
}

export default function ViewEvaluation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    // Implementar lógica de exclusão
    console.log("Excluir avaliação:", id);
  };

  const handleApply = () => {
    navigate(`/app/avaliacao/${id}/aplicar`);
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
          <Button variant="outline" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2 text-red-500" />
            Excluir
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
              <label className="text-sm font-medium text-gray-500">Disciplina</label>
              <p>{evaluation.subject?.name || 'Não informado'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Série</label>
              <p>{evaluation.grade?.name || 'Não informada'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Número de Questões</label>
              <p>{evaluation.questions?.length || 0}</p>
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

        <Card>
          <CardHeader>
            <CardTitle>Descrição</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{evaluation.description || 'Nenhuma descrição fornecida.'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Questões */}
      <Card>
        <CardHeader>
          <CardTitle>Questões</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {evaluation.questions && evaluation.questions.map((question, index) => (
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
    </div>
  );
} 