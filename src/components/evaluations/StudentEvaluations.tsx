import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2 } from "lucide-react";

interface Evaluation {
  id: number;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  status: "pending" | "completed";
  score?: number;
}

export default function StudentEvaluations() {
  const [activeTab, setActiveTab] = useState("pending");

  // Buscar avaliações do aluno
  const { data: evaluations, isLoading } = useQuery<Evaluation[]>({
    queryKey: ["student-evaluations"],
    queryFn: async () => {
      const response = await api.get("/aluno/avaliacoes");
      return response.data;
    },
  });

  // Filtrar avaliações pendentes e concluídas
  const pendingEvaluations = evaluations?.filter(evaluation => evaluation.status === "pending") || [];
  const completedEvaluations = evaluations?.filter(evaluation => evaluation.status === "completed") || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Avaliações</h2>
        <p className="text-muted-foreground">
          Visualize suas avaliações pendentes e concluídas
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pendentes ({pendingEvaluations.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Concluídas ({completedEvaluations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingEvaluations.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Não há avaliações pendentes no momento.
                </p>
              </CardContent>
            </Card>
          ) : (
            pendingEvaluations.map((evaluation) => (
              <Card key={evaluation.id}>
                <CardHeader>
                  <CardTitle>{evaluation.title}</CardTitle>
                  <CardDescription>{evaluation.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col space-y-4">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>
                        Início: {format(new Date(evaluation.start_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </span>
                      <span>
                        Término: {format(new Date(evaluation.end_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </span>
                    </div>
                    <Button className="w-full">Iniciar Avaliação</Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedEvaluations.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Você ainda não completou nenhuma avaliação.
                </p>
              </CardContent>
            </Card>
          ) : (
            completedEvaluations.map((evaluation) => (
              <Card key={evaluation.id}>
                <CardHeader>
                  <CardTitle>{evaluation.title}</CardTitle>
                  <CardDescription>{evaluation.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col space-y-4">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>
                        Realizada em: {format(new Date(evaluation.end_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </span>
                      <span className="font-medium">
                        Nota: {evaluation.score}
                      </span>
                    </div>
                    <Button variant="outline" className="w-full">
                      Ver Resultado
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
