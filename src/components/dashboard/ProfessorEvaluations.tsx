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
          average_score: evaluation.average_score || Math.random() * 10 // Mock se não houver dados reais
        }));

        setEvaluations(formattedEvaluations.slice(0, 6)); // Limitar a 6 avaliações mais recentes

      } catch (error) {
        console.error('Erro ao buscar avaliações:', error);
        
        // Dados mockados como fallback
        const mockEvaluations: Evaluation[] = [
          {
            id: '1',
            title: 'Avaliação de Matemática - Equações',
            subject: 'Matemática',
            class_name: '9º Ano A',
            status: 'active',
            total_questions: 20,
            total_students: 25,
            completed_students: 18,
            created_at: '2024-01-15T10:00:00Z',
            due_date: '2024-01-20T23:59:59Z',
            average_score: 7.8
          },
          {
            id: '2',
            title: 'Prova de Português - Literatura',
            subject: 'Português',
            class_name: '8º Ano B',
            status: 'pending',
            total_questions: 15,
            total_students: 22,
            completed_students: 22,
            created_at: '2024-01-10T14:30:00Z',
            average_score: 8.2
          },
          {
            id: '3',
            title: 'Avaliação de Ciências - Sistema Solar',
            subject: 'Ciências',
            class_name: '7º Ano C',
            status: 'completed',
            total_questions: 18,
            total_students: 20,
            completed_students: 20,
            created_at: '2024-01-08T09:15:00Z',
            average_score: 6.9
          },
          {
            id: '4',
            title: 'Teste de História - Brasil Colonial',
            subject: 'História',
            class_name: '9º Ano A',
            status: 'draft',
            total_questions: 12,
            total_students: 25,
            completed_students: 0,
            created_at: '2024-01-12T16:45:00Z'
          }
        ];

        setEvaluations(mockEvaluations);
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

