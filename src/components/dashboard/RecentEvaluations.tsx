import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";

interface Evaluation {
  id: string;
  title: string;
  subject?: string;
  created_at: string;
  status?: string;
  questions_count?: number;
}

export default function RecentEvaluations() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecentEvaluations = async () => {
      try {
        setIsLoading(true);
        const response = await api.get<Evaluation[]>("/test/");
        const allEvaluations = response.data || [];
        
        // Pegar as 5 avaliações mais recentes
        const recentEvaluations = allEvaluations
          .sort((a: Evaluation, b: Evaluation) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
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
              <div className="space-y-1">
                <p className="font-medium text-sm line-clamp-1">{evaluation.title}</p>
                {evaluation.subject && (
                  <p className="text-xs text-muted-foreground">{evaluation.subject}</p>
                )}
                {evaluation.questions_count && (
                  <p className="text-xs text-muted-foreground">{evaluation.questions_count} questões</p>
                )}
              </div>
              <Badge variant="outline" className="text-xs">
                {evaluation.status || "Ativa"}
              </Badge>
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
