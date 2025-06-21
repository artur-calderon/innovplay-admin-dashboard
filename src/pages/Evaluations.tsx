import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Eye, Pencil, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
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
import EvaluationForm from "@/components/evaluations/EvaluationForm";
import { ReadyEvaluations } from "@/components/evaluations/ReadyEvaluations";
import { QuestionBank } from "@/components/evaluations/QuestionBank";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/authContext";
import StudentEvaluations from "@/components/evaluations/StudentEvaluations";



export default function Evaluations() {
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState<any[]>([]);
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


  // Conditionally render teacher view or student view based on user role
  if (user.role === "aluno") {
    return (
      <>
        <StudentEvaluations />
      </>
    );
  }

  // Default view for teachers and admins
  return (
    <>
      <div className="container mx-auto px-2 md:px-4 py-4 md:py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl md:text-2xl font-bold">Avaliações</h1>
        </div>

        <Tabs defaultValue="ready" className="mb-6" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 gap-2">
            <TabsTrigger value="ready">Minhas Avaliações</TabsTrigger>
            <TabsTrigger value="manual">Criar Manualmente</TabsTrigger>
          </TabsList>

          <TabsContent value="ready" className="pt-4">
            <ReadyEvaluations />
          </TabsContent>

          <TabsContent value="manual" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Criar Avaliação Manualmente</CardTitle>
                <CardDescription>
                  Crie uma nova avaliação inserindo manualmente as questões
                </CardDescription>
              </CardHeader>
              <CardContent >
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} >
                  <Link to="/app/criar-avaliacao">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" /> Criar Nova Avaliação
                    </Button>

                  </Link>
                  {/* <DialogTrigger asChild>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[650px] w-[105%]  max-w-full sm:w-auto">
                    <DialogHeader>
                      <DialogTitle>Criar Nova Avaliação</DialogTitle>
                    </DialogHeader>
                    <EvaluationForm onSubmit={handleCreateEvaluation} />
                  </DialogContent> */}
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>

          {/* <TabsContent value="questions" className="pt-4">
            <QuestionBank onCreateEvaluation={handleCreateEvaluation} />
          </TabsContent> */}
        </Tabs>
      </div>
    </>
  );
}
