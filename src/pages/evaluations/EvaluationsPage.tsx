
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { FileText, FileSearch, Check, Eye, Pencil, Trash2 } from "lucide-react";
import EvaluationModal from "./EvaluationModal";
import { toast } from "@/hooks/use-toast";

// Sample data
const initialEvaluations = [
  {
    id: "1",
    title: "Avaliação de Matemática - Funções",
    subject: "Matemática",
    grade: "9º ano",
    questions: 10,
    createdAt: "2023-09-15T14:30:00",
  },
  {
    id: "2",
    title: "Avaliação de Português - Interpretação",
    subject: "Português",
    grade: "7º ano",
    questions: 15,
    createdAt: "2023-08-20T09:15:00",
  },
  {
    id: "3",
    title: "Ciências - Sistema Solar",
    subject: "Ciências",
    grade: "5º ano",
    questions: 8,
    createdAt: "2023-10-05T11:30:00",
  },
];

const premadeEvaluations = [
  {
    id: "p1",
    title: "Matemática Básica",
    subject: "Matemática",
    grade: "6º ano",
    questions: 15,
    description: "Avaliação completa de operações básicas",
  },
  {
    id: "p2",
    title: "Português - Gramática",
    subject: "Português",
    grade: "7º ano",
    questions: 20,
    description: "Avaliação de regras gramaticais e ortografia",
  },
  {
    id: "p3",
    title: "Ciências da Natureza",
    subject: "Ciências",
    grade: "5º ano",
    questions: 12,
    description: "Avaliação sobre ecossistemas e meio ambiente",
  },
];

const questionBank = [
  {
    id: "q1",
    text: "Quanto é 2+2?",
    level: "Fácil",
    grade: "3º ano",
    subject: "Matemática",
    difficulty: 1,
    weight: 1.0,
  },
  {
    id: "q2",
    text: "Quem escreveu Dom Casmurro?",
    level: "Médio",
    grade: "8º ano",
    subject: "Literatura",
    difficulty: 2,
    weight: 1.5,
  },
  {
    id: "q3",
    text: "Qual a capital do Brasil?",
    level: "Fácil",
    grade: "4º ano",
    subject: "Geografia",
    difficulty: 1,
    weight: 1.0,
  },
  {
    id: "q4",
    text: "Calcule a derivada de f(x) = x²",
    level: "Difícil",
    grade: "3º EM",
    subject: "Matemática",
    difficulty: 3,
    weight: 2.0,
  },
];

export interface Evaluation {
  id: string;
  title: string;
  subject: string;
  grade: string;
  questions: number;
  createdAt: string;
}

const EvaluationsPage = () => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>(initialEvaluations);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvaluation, setEditingEvaluation] = useState<Evaluation | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  
  const handleCreateEvaluation = (evaluation: Omit<Evaluation, "id" | "createdAt" | "questions">, questions: number) => {
    const newEvaluation: Evaluation = {
      ...evaluation,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      questions,
    };
    
    setEvaluations([newEvaluation, ...evaluations]);
    toast({
      title: "Avaliação criada",
      description: `${evaluation.title} foi criada com sucesso.`,
    });
    setIsModalOpen(false);
  };

  const handleUpdateEvaluation = (updatedEvaluation: Evaluation) => {
    setEvaluations(evaluations.map(e => 
      e.id === updatedEvaluation.id ? updatedEvaluation : e
    ));
    toast({
      title: "Avaliação atualizada",
      description: `${updatedEvaluation.title} foi atualizada com sucesso.`,
    });
    setEditingEvaluation(null);
    setIsModalOpen(false);
  };

  const handleDeleteEvaluation = (id: string) => {
    const evaluationToDelete = evaluations.find(e => e.id === id);
    if (evaluationToDelete) {
      setEvaluations(evaluations.filter(e => e.id !== id));
      toast({
        title: "Avaliação removida",
        description: `${evaluationToDelete.title} foi removida com sucesso.`,
      });
    }
  };

  const handleViewEvaluation = (evaluation: Evaluation) => {
    toast({
      title: "Visualizando avaliação",
      description: `${evaluation.title}`,
    });
    // In a real app, this would navigate to a detail view
  };

  const handleUsePreMadeEvaluation = (evaluation: any) => {
    const newEvaluation: Evaluation = {
      ...evaluation,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    
    setEvaluations([newEvaluation, ...evaluations]);
    toast({
      title: "Avaliação adicionada",
      description: `${evaluation.title} foi adicionada com sucesso.`,
    });
  };

  const toggleQuestionSelection = (id: string) => {
    if (selectedQuestions.includes(id)) {
      setSelectedQuestions(selectedQuestions.filter(qId => qId !== id));
    } else {
      setSelectedQuestions([...selectedQuestions, id]);
    }
  };

  const handleCreateFromQuestionBank = () => {
    if (selectedQuestions.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos uma questão.",
        variant: "destructive",
      });
      return;
    }
    
    setIsModalOpen(true);
    // The modal will handle creating the evaluation with the selected questions
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Avaliações</h1>
      
      <Tabs defaultValue="premade" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="premade">Avaliações Prontas</TabsTrigger>
          <TabsTrigger value="manual">Criar Manualmente</TabsTrigger>
          <TabsTrigger value="questionbank">Banco de Questões</TabsTrigger>
        </TabsList>
        
        <TabsContent value="premade" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {premadeEvaluations.map((evaluation) => (
              <Card key={evaluation.id}>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <h3 className="text-lg font-bold">{evaluation.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {evaluation.subject} - {evaluation.grade} - {evaluation.questions} questões
                    </p>
                    <p className="mt-2">{evaluation.description}</p>
                  </div>
                  <Button 
                    onClick={() => handleUsePreMadeEvaluation(evaluation)} 
                    className="w-full"
                  >
                    <Check className="mr-2 h-4 w-4" /> Usar Avaliação
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="manual" className="space-y-4">
          <Button onClick={() => {
            setEditingEvaluation(null);
            setIsModalOpen(true);
          }}>
            <FileText className="mr-2 h-4 w-4" /> Criar Nova Avaliação
          </Button>
        </TabsContent>
        
        <TabsContent value="questionbank" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Questões Disponíveis</h3>
            <Button 
              onClick={handleCreateFromQuestionBank}
              disabled={selectedQuestions.length === 0}
            >
              Criar Avaliação com Questões Selecionadas ({selectedQuestions.length})
            </Button>
          </div>
          
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30px]">Sel.</TableHead>
                  <TableHead>Questão</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead>Série</TableHead>
                  <TableHead>Disciplina</TableHead>
                  <TableHead>Dificuldade</TableHead>
                  <TableHead>Peso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questionBank.map((question) => (
                  <TableRow key={question.id}>
                    <TableCell>
                      <input 
                        type="checkbox" 
                        checked={selectedQuestions.includes(question.id)}
                        onChange={() => toggleQuestionSelection(question.id)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{question.text}</TableCell>
                    <TableCell>{question.level}</TableCell>
                    <TableCell>{question.grade}</TableCell>
                    <TableCell>{question.subject}</TableCell>
                    <TableCell>{question.difficulty}</TableCell>
                    <TableCell>{question.weight}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Avaliações Criadas</h2>
        
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Disciplina</TableHead>
                <TableHead>Série</TableHead>
                <TableHead>Nº Questões</TableHead>
                <TableHead>Data de criação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evaluations.length > 0 ? (
                evaluations.map((evaluation) => (
                  <TableRow key={evaluation.id}>
                    <TableCell className="font-medium">{evaluation.title}</TableCell>
                    <TableCell>{evaluation.subject}</TableCell>
                    <TableCell>{evaluation.grade}</TableCell>
                    <TableCell>{evaluation.questions}</TableCell>
                    <TableCell>{formatDate(evaluation.createdAt)}</TableCell>
                    <TableCell className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleViewEvaluation(evaluation)}>
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">Visualizar</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          setEditingEvaluation(evaluation);
                          setIsModalOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Editar</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeleteEvaluation(evaluation.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Excluir</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Nenhuma avaliação cadastrada ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      
      <EvaluationModal 
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmit={editingEvaluation ? handleUpdateEvaluation : handleCreateEvaluation}
        editingEvaluation={editingEvaluation}
        selectedQuestionCount={selectedQuestions.length}
      />
    </div>
  );
};

export default EvaluationsPage;
