import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { List, Calendar } from "lucide-react";

interface Evaluation {
  id: string;
  title: string;
  created_at: string;
  type?: string;
  subject?: {
    name: string;
  };
}

export default function RecentEvaluations() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecentEvaluations = async () => {
      try {
        setIsLoading(true);
        
        // Buscar avaliações da API
        const response = await api.get("/test/");
        if (response.data && Array.isArray(response.data)) {
          // Pegar as 5 avaliações mais recentes
          const recentEvaluations = response.data
            .sort((a: any, b: any) => new Date(b.created_at || b.createdAt).getTime() - new Date(a.created_at || a.createdAt).getTime())
            .slice(0, 5)
            .map((evaluation: any) => ({
              id: evaluation.id,
              title: evaluation.title,
              created_at: evaluation.created_at || evaluation.createdAt,
              type: evaluation.type,
              subject: evaluation.subject_rel || evaluation.subject
            }));
          
          setEvaluations(recentEvaluations);
        }
      } catch (error) {
        console.error("Erro ao buscar avaliações recentes:", error);
        // Em caso de erro, deixar lista vazia
        setEvaluations([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentEvaluations();
  }, []);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return "Data inválida";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Últimas Avaliações</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="flex justify-between items-center border-b pb-2">
                <div className="flex flex-col space-y-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : evaluations.length > 0 ? (
          <div className="space-y-4">
            {evaluations.map((evaluation) => (
              <div key={evaluation.id} className="flex justify-between items-center border-b pb-2">
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{evaluation.title}</span>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {evaluation.subject?.name && (
                      <span>{evaluation.subject.name}</span>
                    )}
                    {evaluation.type && (
                      <span>• {evaluation.type}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center text-xs text-gray-500">
                  <Calendar className="h-3 w-3 mr-1" />
                  <span>{formatDate(evaluation.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <List className="h-12 w-12 text-gray-300 mb-2" />
            <p className="text-sm">Nenhuma avaliação cadastrada ainda</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
