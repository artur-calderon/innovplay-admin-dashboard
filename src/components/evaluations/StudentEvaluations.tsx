
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Mock data for available evaluations
const availableEvaluations = [
  {
    id: "1",
    title: "Avaliação de Matemática - Funções do 2º Grau",
    subject: "Matemática",
    dueDate: "2025-05-20",
    questionCount: 15,
    duration: "60 minutos",
  },
  {
    id: "2",
    title: "Avaliação de Português - Interpretação de Texto",
    subject: "Português",
    dueDate: "2025-05-18",
    questionCount: 10,
    duration: "45 minutos",
  },
  {
    id: "3",
    title: "Avaliação de Biologia - Sistema Digestório",
    subject: "Biologia",
    dueDate: "2025-05-25",
    questionCount: 12,
    duration: "50 minutos",
  },
];

// Mock data for completed evaluations
const completedEvaluations = [
  {
    id: "101",
    title: "Avaliação de História - Revolução Industrial",
    subject: "História",
    completionDate: "2025-04-10",
    score: 8.5,
    maxScore: 10,
  },
  {
    id: "102",
    title: "Avaliação de Física - Leis de Newton",
    subject: "Física",
    completionDate: "2025-04-15",
    score: 7.0,
    maxScore: 10,
  },
  {
    id: "103",
    title: "Avaliação de Geografia - Climas do Brasil",
    subject: "Geografia",
    completionDate: "2025-04-22",
    score: 9.0,
    maxScore: 10,
  },
  {
    id: "104",
    title: "Avaliação de Química - Tabela Periódica",
    subject: "Química",
    completionDate: "2025-05-01",
    score: 6.5,
    maxScore: 10,
  },
];

export default function StudentEvaluations() {
  const [activeTab, setActiveTab] = useState("available");
  const { toast } = useToast();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  };

  const handleStartEvaluation = (evaluation: any) => {
    toast({
      title: "Avaliação iniciada",
      description: `Você iniciou a avaliação: ${evaluation.title}`,
    });
  };

  const handleViewEvaluation = (evaluation: any) => {
    toast({
      title: "Visualizando avaliação",
      description: `Detalhes da avaliação: ${evaluation.title}`,
    });
  };

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="container mx-auto px-2 md:px-4 py-4 md:py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl md:text-2xl font-bold">Minhas Avaliações</h1>
      </div>

      <Tabs defaultValue="available" className="mb-6" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 gap-2">
          <TabsTrigger value="available">Avaliações Disponíveis</TabsTrigger>
          <TabsTrigger value="completed">Avaliações Realizadas</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Avaliações para Realizar</CardTitle>
              <CardDescription>
                Lista de avaliações disponíveis para você realizar
              </CardDescription>
            </CardHeader>
            <CardContent>
              {availableEvaluations.length > 0 ? (
                <div className="bg-white rounded-xl shadow-md overflow-hidden overflow-x-auto">
                  <div className="min-w-full">
                    <Table>
                      <TableCaption>Total de {availableEvaluations.length} avaliações disponíveis</TableCaption>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[250px]">Título</TableHead>
                          <TableHead className="hidden sm:table-cell">Disciplina</TableHead>
                          <TableHead className="hidden md:table-cell">Data Limite</TableHead>
                          <TableHead className="hidden lg:table-cell">Questões</TableHead>
                          <TableHead className="hidden lg:table-cell">Duração</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {availableEvaluations.map((evaluation) => (
                          <TableRow key={evaluation.id}>
                            <TableCell className="font-medium">{evaluation.title}</TableCell>
                            <TableCell className="hidden sm:table-cell">{evaluation.subject}</TableCell>
                            <TableCell className="hidden md:table-cell">
                              <Badge variant="outline">{formatDate(evaluation.dueDate)}</Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">{evaluation.questionCount}</TableCell>
                            <TableCell className="hidden lg:table-cell">{evaluation.duration}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                onClick={() => handleStartEvaluation(evaluation)}
                                variant="default"
                                size="sm"
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                Realizar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Não há avaliações disponíveis no momento.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Avaliações Realizadas</CardTitle>
              <CardDescription>
                Histórico de avaliações que você já realizou
              </CardDescription>
            </CardHeader>
            <CardContent>
              {completedEvaluations.length > 0 ? (
                <div className="bg-white rounded-xl shadow-md overflow-hidden overflow-x-auto">
                  <div className="min-w-full">
                    <Table>
                      <TableCaption>Total de {completedEvaluations.length} avaliações realizadas</TableCaption>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[250px]">Título</TableHead>
                          <TableHead className="hidden sm:table-cell">Disciplina</TableHead>
                          <TableHead className="hidden md:table-cell">Data de Realização</TableHead>
                          <TableHead className="hidden lg:table-cell">Nota</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {completedEvaluations.map((evaluation) => (
                          <TableRow key={evaluation.id}>
                            <TableCell className="font-medium">{evaluation.title}</TableCell>
                            <TableCell className="hidden sm:table-cell">{evaluation.subject}</TableCell>
                            <TableCell className="hidden md:table-cell">{formatDate(evaluation.completionDate)}</TableCell>
                            <TableCell className={`hidden lg:table-cell font-semibold ${getScoreColor(evaluation.score, evaluation.maxScore)}`}>
                              {evaluation.score.toFixed(1)}/{evaluation.maxScore}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                onClick={() => handleViewEvaluation(evaluation)}
                                variant="ghost"
                                size="sm"
                              >
                                <Eye className="h-4 w-4" />
                                <span className="ml-1 hidden sm:inline">Ver Detalhes</span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Você ainda não realizou nenhuma avaliação.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
