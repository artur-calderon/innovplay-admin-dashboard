import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";
import { mockEvaluations } from "@/lib/mockData";

interface Evaluation {
  id: string;
  title: string;
  subject?: string | { id: string; name: string };
  createdAt?: string;
  created_at?: string;
  status?: string;
  questions_count?: number;
  questions?: number | { length?: number };
}

export default function RecentEvaluations() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecentEvaluations = async () => {
      try {
        setIsLoading(true);
        
        // Simular delay de carregamento
        await new Promise(resolve => setTimeout(resolve, 600));
        
        // Usar dados mockados das 3 avaliações implementadas + algumas adicionais
        const additionalEvaluations = [
          {
            id: "eval-4",
            title: "Simulado de História - Brasil Colonial",
            subject: "História",
            createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            status: "active",
            questions: 15
          },
          {
            id: "eval-5", 
            title: "Prova de Geografia - Regiões do Brasil",
            subject: "Geografia",
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            status: "completed",
            questions: 12
          }
        ];
        
        const allEvaluations = [
          ...mockEvaluations.map(evaluation => ({
            id: evaluation.id,
            title: evaluation.title,
            subject: evaluation.subject,
            createdAt: evaluation.createdAt,
            status: evaluation.status,
            questions: evaluation.questions
          })),
          ...additionalEvaluations
        ];
        
        // Pegar as 5 avaliações mais recentes
        const recentEvaluations = allEvaluations
          .sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return dateB - dateA;
          })
          .slice(0, 5);
        
        setEvaluations(recentEvaluations);
      } catch (error) {
        console.error("Erro ao buscar avaliações recentes:", error);
        setEvaluations([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentEvaluations();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Avaliações Recentes
          </CardTitle>
          <CardDescription>Últimas avaliações criadas no sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded border">
              <div className="space-y-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Avaliações Recentes
        </CardTitle>
        <CardDescription>Últimas avaliações criadas no sistema</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {evaluations.length > 0 ? (
          evaluations.map((evaluation) => (
            <div key={evaluation.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
              <div className="space-y-1 flex-1">
                <p className="font-medium text-sm line-clamp-1">{evaluation.title}</p>
                <div className="flex items-center gap-3">
                  {evaluation.subject && (
                    <p className="text-xs text-muted-foreground">
                      {typeof evaluation.subject === 'string' 
                        ? evaluation.subject 
                        : evaluation.subject.name || evaluation.subject
                      }
                    </p>
                  )}
                  {(evaluation.questions_count || evaluation.questions) && (
                    <p className="text-xs text-muted-foreground">
                      {evaluation.questions_count || evaluation.questions || 0} questões
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge 
                  variant={
                    evaluation.status === "active" ? "default" :
                    evaluation.status === "correction" ? "secondary" :
                    evaluation.status === "completed" ? "outline" :
                    "outline"
                  }
                  className="text-xs"
                >
                  {evaluation.status === "active" ? "Ativa" :
                   evaluation.status === "correction" ? "Correção" :
                   evaluation.status === "completed" ? "Concluída" :
                   evaluation.status || "Ativa"}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  {new Date(evaluation.createdAt || evaluation.created_at || Date.now()).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma avaliação encontrada
          </p>
        )}
      </CardContent>
    </Card>
  );
}
