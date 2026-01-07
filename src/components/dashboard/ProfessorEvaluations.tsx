import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, 
  Clock, 
  Users, 
  CheckCircle, 
  AlertCircle,
  Plus,
  Eye,
  Edit,
  MoreHorizontal
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/authContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Evaluation {
  id: string;
  title: string;
  subject?: string;
  class_name?: string;
  status: 'draft' | 'active' | 'completed' | 'pending';
  total_questions?: number;
  total_students?: number;
  completed_students?: number;
  created_at: string;
  due_date?: string;
  average_score?: number;
}

export default function ProfessorEvaluations() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEvaluations = async () => {
      if (!user?.id) return;

      try {
        setIsLoading(true);

        // Buscar avaliações do professor
        const response = await api.get('/test/', {
          params: { 
            per_page: 10,
            sort: 'created_at',
            order: 'desc'
          }
        });

        const evaluationsData = response.data?.data || response.data || [];
        
        // Mapear dados para o formato esperado
        const formattedEvaluations: Evaluation[] = evaluationsData.map((evaluation: any) => ({
          id: evaluation.id,
          title: evaluation.title || evaluation.name || 'Avaliação sem título',
          subject: evaluation.subject?.name || evaluation.discipline?.name,
          class_name: evaluation.class?.name || evaluation.turma?.name,
          status: getEvaluationStatus(evaluation),
          total_questions: evaluation.total_questions || evaluation.questions?.length || 0,
          total_students: evaluation.total_students || 0,
          completed_students: evaluation.completed_students || 0,
          created_at: evaluation.created_at,
          due_date: evaluation.due_date || evaluation.deadline,
          average_score: Number(evaluation.average_score ?? 0)
        }));

        setEvaluations(formattedEvaluations.slice(0, 6)); // Limitar a 6 avaliações mais recentes

      } catch (error) {
        console.error('Erro ao buscar avaliações:', error);
        toast({
          title: "Erro ao buscar avaliações",
          description: "Não foi possível carregar as avaliações recentes.",
          variant: "destructive",
        });
        setEvaluations([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvaluations();
  }, [user?.id]);

  const getEvaluationStatus = (evaluation: any): Evaluation['status'] => {
    if (evaluation.status) return evaluation.status;
    if (evaluation.is_active === false && evaluation.completed_students > 0) return 'completed';
    if (evaluation.is_active === true) return 'active';
    if (evaluation.needs_correction) return 'pending';
    return 'draft';
  };

  const getStatusConfig = (status: Evaluation['status']) => {
    switch (status) {
      case 'active':
        return {
          label: 'Ativa',
          color: 'bg-green-100 text-green-800',
          icon: <Clock className="h-3 w-3" />
        };
      case 'completed':
        return {
          label: 'Concluída',
          color: 'bg-blue-100 text-blue-800',
          icon: <CheckCircle className="h-3 w-3" />
        };
      case 'pending':
        return {
          label: 'Pendente',
          color: 'bg-yellow-100 text-yellow-800',
          icon: <AlertCircle className="h-3 w-3" />
        };
      case 'draft':
        return {
          label: 'Rascunho',
          color: 'bg-gray-100 text-gray-800',
          icon: <FileText className="h-3 w-3" />
        };
      default:
        return {
          label: 'Desconhecido',
          color: 'bg-gray-100 text-gray-800',
          icon: <FileText className="h-3 w-3" />
        };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleCreateEvaluation = () => {
    navigate('/app/criar-avaliacao');
  };

  const handleViewEvaluation = (id: string) => {
    navigate(`/app/avaliacoes/${id}`);
  };

  const handleEditEvaluation = (id: string) => {
    navigate(`/app/avaliacoes/${id}/editar`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="flex items-center gap-4 p-3 rounded-lg border">
                <Skeleton className="h-10 w-10 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Avaliações Recentes
        </CardTitle>
        <Button 
          size="sm" 
          onClick={handleCreateEvaluation}
          className="bg-innov-purple hover:bg-innov-purple/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Avaliação
        </Button>
      </CardHeader>
      <CardContent>
        {evaluations.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">Nenhuma avaliação encontrada</p>
            <Button onClick={handleCreateEvaluation}>
              Criar primeira avaliação
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {evaluations.map((evaluation) => {
              const statusConfig = getStatusConfig(evaluation.status);
              const completionRate = evaluation.total_students 
                ? Math.round((evaluation.completed_students! / evaluation.total_students) * 100)
                : 0;

              return (
                <div
                  key={evaluation.id}
                  className="flex items-center gap-4 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div className="p-2 rounded-lg bg-innov-purple/10">
                    <FileText className="h-5 w-5 text-innov-purple" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">
                      {evaluation.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      {evaluation.subject && (
                        <span className="text-xs text-gray-500">
                          {evaluation.subject}
                        </span>
                      )}
                      {evaluation.class_name && (
                        <>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">
                            {evaluation.class_name}
                          </span>
                        </>
                      )}
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">
                        {formatDate(evaluation.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {evaluation.total_students! > 0 && (
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {evaluation.completed_students}/{evaluation.total_students}
                        </div>
                        <div className="text-xs text-gray-500">
                          {completionRate}% concluído
                        </div>
                      </div>
                    )}

                    <Badge className={statusConfig.color}>
                      {statusConfig.icon}
                      <span className="ml-1">{statusConfig.label}</span>
                    </Badge>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewEvaluation(evaluation.id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditEvaluation(evaluation.id)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {evaluations.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <Button 
              variant="ghost" 
              className="w-full"
              onClick={() => navigate('/app/avaliacoes')}
            >
              Ver todas as avaliações
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

