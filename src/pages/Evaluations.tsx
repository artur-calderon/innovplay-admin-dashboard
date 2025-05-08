import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Eye, Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { EvaluationForm } from "@/components/evaluations/EvaluationForm";
import { ReadyEvaluations } from "@/components/evaluations/ReadyEvaluations";
import { QuestionBank } from "@/components/evaluations/QuestionBank";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/authContext";
import StudentEvaluations from "@/components/evaluations/StudentEvaluations";

// Mock data for evaluations
const mockEvaluations = [
  {
    id: "1",
    title: "Avaliação de Matemática - Álgebra",
    subject: "Matemática",
    grade: "9º Ano",
    questionCount: 10,
    creationDate: "2023-05-15",
  },
  {
    id: "2",
    title: "Avaliação de Português - Interpretação de Texto",
    subject: "Português",
    grade: "7º Ano",
    questionCount: 8,
    creationDate: "2023-04-10",
  },
  {
    id: "3",
    title: "Avaliação de Ciências - Sistema Solar",
    subject: "Ciências",
    grade: "6º Ano",
    questionCount: 12,
    creationDate: "2023-06-22",
  },
  {
    id: "4",
    title: "Avaliação de História - Brasil Império",
    subject: "História",
    grade: "8º Ano",
    questionCount: 15,
    creationDate: "2023-03-30",
  },
];

export default function Evaluations() {
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState(mockEvaluations);
  const [activeTab, setActiveTab] = useState("ready");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<any>(null);
  const { toast } = useToast();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  };

  const handleCreateEvaluation = (newEvaluation: any) => {
    const evaluationWithId = {
      ...newEvaluation,
      id: (evaluations.length + 1).toString(),
      creationDate: new Date().toISOString().split("T")[0],
      questionCount: newEvaluation.questions?.length || 0,
    };
    
    setEvaluations([...evaluations, evaluationWithId]);
    setIsCreateDialogOpen(false);
    
    toast({
      title: "Avaliação criada",
      description: `${newEvaluation.title} foi criada com sucesso.`,
    });
  };

  const handleEditEvaluation = (updatedEvaluation: any) => {
    const updatedEvaluations = evaluations.map((evaluation) =>
      evaluation.id === selectedEvaluation.id 
        ? { 
            ...evaluation, 
            ...updatedEvaluation,
            questionCount: updatedEvaluation.questions?.length || evaluation.questionCount
          } 
        : evaluation
    );
    
    setEvaluations(updatedEvaluations);
    setIsEditDialogOpen(false);
    setSelectedEvaluation(null);
    
    toast({
      title: "Avaliação atualizada",
      description: `${updatedEvaluation.title} foi atualizada com sucesso.`,
    });
  };

  const handleDeleteEvaluation = (id: string) => {
    const evaluationToDelete = evaluations.find(evaluation => evaluation.id === id);
    const updatedEvaluations = evaluations.filter((evaluation) => evaluation.id !== id);
    setEvaluations(updatedEvaluations);
    
    toast({
      title: "Avaliação removida",
      description: `${evaluationToDelete?.title} foi removida com sucesso.`,
      variant: "destructive",
    });
  };

  const openEditDialog = (evaluation: any) => {
    setSelectedEvaluation(evaluation);
    setIsEditDialogOpen(true);
  };

  const handleUseReadyEvaluation = (evaluation: any) => {
    toast({
      title: "Avaliação adicionada",
      description: `${evaluation.title} foi adicionada com sucesso.`,
    });
  };

  // Conditionally render teacher view or student view based on user role
  if (user.role === "aluno") {
    return (
      <Layout>
        <StudentEvaluations />
      </Layout>
    );
  }

  // Default view for teachers and admins
  return (
    <Layout>
      <div className="container mx-auto px-2 md:px-4 py-4 md:py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl md:text-2xl font-bold">Avaliações</h1>
        </div>

        <Tabs defaultValue="ready" className="mb-6" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 gap-2">
            <TabsTrigger value="ready">Avaliações Prontas</TabsTrigger>
            <TabsTrigger value="manual">Criar Manualmente</TabsTrigger>
            <TabsTrigger value="questions">Banco de Questões</TabsTrigger>
          </TabsList>

          <TabsContent value="ready" className="pt-4">
            <ReadyEvaluations onUseEvaluation={handleUseReadyEvaluation} />
          </TabsContent>

          <TabsContent value="manual" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Criar Avaliação Manualmente</CardTitle>
                <CardDescription>
                  Crie uma nova avaliação inserindo manualmente as questões
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" /> Criar Nova Avaliação
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[650px] w-[95%] max-w-full sm:w-auto">
                    <DialogHeader>
                      <DialogTitle>Criar Nova Avaliação</DialogTitle>
                    </DialogHeader>
                    <EvaluationForm onSubmit={handleCreateEvaluation} />
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="questions" className="pt-4">
            <QuestionBank onCreateEvaluation={handleCreateEvaluation} />
          </TabsContent>
        </Tabs>

        <div className="bg-white rounded-xl shadow-md overflow-hidden overflow-x-auto">
          <div className="min-w-full">
            <Table>
              <TableCaption>Lista de avaliações cadastradas</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Título</TableHead>
                  <TableHead className="hidden sm:table-cell">Disciplina</TableHead>
                  <TableHead className="hidden md:table-cell">Série</TableHead>
                  <TableHead className="hidden md:table-cell">Nº Questões</TableHead>
                  <TableHead className="hidden lg:table-cell">Data de criação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evaluations.map((evaluation) => (
                  <TableRow key={evaluation.id}>
                    <TableCell className="font-medium">{evaluation.title}</TableCell>
                    <TableCell className="hidden sm:table-cell">{evaluation.subject}</TableCell>
                    <TableCell className="hidden md:table-cell">{evaluation.grade}</TableCell>
                    <TableCell className="hidden md:table-cell">{evaluation.questionCount}</TableCell>
                    <TableCell className="hidden lg:table-cell">{formatDate(evaluation.creationDate)}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(evaluation)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteEvaluation(evaluation.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[650px] w-[95%] max-w-full sm:w-auto">
            <DialogHeader>
              <DialogTitle>Editar Avaliação</DialogTitle>
            </DialogHeader>
            {selectedEvaluation && (
              <EvaluationForm
                initialValues={selectedEvaluation}
                onSubmit={handleEditEvaluation}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
