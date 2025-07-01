import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Clock, CheckCircle, AlertCircle } from "lucide-react";

interface Subject {
  id: string;
  name: string;
}

interface Grade {
  id: string;
  name: string;
}

interface Creator {
  id: string;
  name: string;
}

interface ApplicationInfo {
  class_test_id: string;
  application: string;
  expiration: string;
  current_time: string;
}

interface Availability {
  is_available: boolean;
  status: string;
}

interface SubjectInfo {
  subject: string;
  questions: number;
}

interface Test {
  test_id: string;
  title: string;
  description: string;
  type: "AVALIACAO" | "SIMULADO";
  subject: Subject | null;
  grade: Grade;
  intructions: string;
  max_score: number;
  time_limit: string;
  course: string;
  model: string;
  subjects_info: SubjectInfo[] | null;
  status: "em_andamento" | "agendada" | "concluida";
  creator: Creator;
  total_questions: number;
  application_info: ApplicationInfo;
  availability: Availability;
}

interface Student {
  id: string;
  name: string;
  user_id: string;
}

interface School {
  id: string;
  name: string;
}

interface Class {
  id: string;
  name: string;
  school: School;
  grade: Grade;
}

interface MyClassTestsResponse {
  student: Student;
  class: Class;
  total_tests: number;
  tests: Test[];
}

export default function StudentEvaluations() {
  const [activeTab, setActiveTab] = useState("pending");

  // Buscar avaliações do aluno
  const { data: response, isLoading } = useQuery<MyClassTestsResponse>({
    queryKey: ["my-class-tests"],
    queryFn: async () => {
      const response = await api.get("/test/my-class/tests");
      return response.data;
    },
  });

  // Filtrar avaliações por status
  const pendingTests = response?.tests.filter(test =>
    test.status === "em_andamento" || test.status === "agendada"
  ) || [];

  const completedTests = response?.tests.filter(test =>
    test.status === "concluida"
  ) || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "em_andamento":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "agendada":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "concluida":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "em_andamento":
        return "Em Andamento";
      case "agendada":
        return "Agendada";
      case "concluida":
        return "Concluída";
      default:
        return status;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "em_andamento":
        return "default";
      case "agendada":
        return "secondary";
      case "concluida":
        return "outline";
      default:
        return "default";
    }
  };

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
        {response && (
          <div className="mt-2 text-sm text-muted-foreground">
            <p>Aluno: {response.student.name}</p>
            <p>Turma: {response.class.name} - {response.class.school.name}</p>
            <p>Total de avaliações: {response.total_tests}</p>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pendentes ({pendingTests.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Concluídas ({completedTests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingTests.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Não há avaliações pendentes no momento.
                </p>
              </CardContent>
            </Card>
          ) : (
            pendingTests.map((test) => (
              <Card key={test.test_id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {getStatusIcon(test.status)}
                        {test.title}
                      </CardTitle>
                      <CardDescription>{test.description}</CardDescription>
                    </div>
                    <Badge variant={getStatusBadgeVariant(test.status)}>
                      {getStatusText(test.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Tipo:</span> {test.type}
                      </div>
                      <div>
                        <span className="font-medium">Disciplina:</span> {test.subject?.name || "Múltiplas"}
                      </div>
                      <div>
                        <span className="font-medium">Questões:</span> {test.total_questions}
                      </div>
                      <div>
                        <span className="font-medium">Pontuação Máxima:</span> {test.max_score}
                      </div>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>
                        Início: {format(new Date(test.application_info.application), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                      <span>
                        Término: {format(new Date(test.application_info.expiration), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <Button
                      className="w-full"
                      disabled={!test.availability.is_available}
                    >
                      {test.availability.is_available ? "Iniciar Avaliação" : "Aguardando Disponibilidade"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedTests.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Você ainda não completou nenhuma avaliação.
                </p>
              </CardContent>
            </Card>
          ) : (
            completedTests.map((test) => (
              <Card key={test.test_id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {getStatusIcon(test.status)}
                        {test.title}
                      </CardTitle>
                      <CardDescription>{test.description}</CardDescription>
                    </div>
                    <Badge variant={getStatusBadgeVariant(test.status)}>
                      {getStatusText(test.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Tipo:</span> {test.type}
                      </div>
                      <div>
                        <span className="font-medium">Disciplina:</span> {test.subject?.name || "Múltiplas"}
                      </div>
                      <div>
                        <span className="font-medium">Questões:</span> {test.total_questions}
                      </div>
                      <div>
                        <span className="font-medium">Pontuação Máxima:</span> {test.max_score}
                      </div>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>
                        Concluída em: {format(new Date(test.application_info.expiration), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
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
