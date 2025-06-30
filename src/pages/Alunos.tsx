import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Eye, Pencil, Trash2,Search } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/authContext";
import StudentEvaluations from "@/components/evaluations/StudentEvaluations";
import { useDataContext } from "@/context/dataContext";

// Mock data removed - using real API data now

export default function Evaluations() {
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState([]);
  const [activeTab, setActiveTab] = useState("ready");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<any>(null);
  const { toast } = useToast();

  const {getEscolas, escolas} = useDataContext()
  useEffect(()=>{
    getEscolas()
  },[getEscolas])


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


  // Default view for teachers and admins
  return (
    <>
      <div className="container mx-auto px-2 md:px-4 py-4 md:py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl md:text-2xl font-bold">Selecione uma escola para ver os alunos</h1>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Buscar Escolas..."
                // value={searchTerm}
                // onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full"
              />
            </div>
        </div>

        <Tabs defaultValue="ready" className="mb-6" onValueChange={setActiveTab}>
          {/* <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 gap-2">
            <TabsTrigger value="ready">Avaliações Prontas</TabsTrigger>
            <TabsTrigger value="manual">Criar Manualmente</TabsTrigger>
            <TabsTrigger value="questions">Banco de Questões</TabsTrigger>
          </TabsList> */}

          <TabsContent value="ready" className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {escolas.length > 0 ? (
                escolas.map((escola) => (
                    <Card key={escola.id} className="h-full flex flex-col">
                    <CardHeader>
                        <CardTitle className="text-base md:text-lg">{escola.name}</CardTitle>
                        <CardDescription>
                        {escola.domain} | {escola.address}
                        </CardDescription>
                    </CardHeader>
                    {/* <CardContent className="flex-grow">
                        <p className="text-sm text-gray-500">{escola.description}</p>
                        <p className="text-sm font-medium mt-2">
                        {escola.questionCount} questões
                        </p>
                    </CardContent> */}
                    <CardFooter>
                        <Link to={`/app/alunos/${escola.id}`}>
                            <Button 
                            className="w-full sm:w-auto"
                            >
                            Ver Alunos
                            </Button>
                        </Link>    
                    </CardFooter>
                    </Card>
                ))
                ) : (
                <div className="col-span-full text-center py-8 text-gray-500">
                    Voce não está cadastrado(a) em nenhuma escola.
                </div>
            )}
        </div>
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
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="questions" className="pt-4">
            <QuestionBank onCreateEvaluation={handleCreateEvaluation} />
          </TabsContent>
        </Tabs>

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
    </>
  );
}
