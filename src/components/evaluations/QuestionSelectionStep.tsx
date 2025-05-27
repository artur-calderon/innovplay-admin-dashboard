import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import QuestionForm from "./questions/QuestionForm";
import { QuestionBank } from "@/components/evaluations/QuestionBank";
import { Plus, Trash2, Search } from "lucide-react";

interface QuestionSelectionStepProps {
  evaluationId: string;
  selectedQuestions: any[];
  onAddQuestions: (questions: any[]) => void;
  onRemoveQuestion: (questionId: string) => void;
}

export default function QuestionSelectionStep({
  evaluationId,
  selectedQuestions,
  onAddQuestions,
  onRemoveQuestion,
}: QuestionSelectionStepProps) {
  const [activeTab, setActiveTab] = useState("selected");
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isQuestionBankDialogOpen, setIsQuestionBankDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredQuestions = selectedQuestions.filter(
    (q) => q.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateQuestion = (questionData: any) => {
    // In a real app, you would save the question to the database
    // and then add it to the selected questions
    const newQuestion = {
      id: `question-${Math.random().toString(36).substr(2, 9)}`,
      ...questionData,
      createdAt: new Date().toISOString(),
    };
    
    onAddQuestions([newQuestion]);
    setIsFormDialogOpen(false);
  };

  const handleAddQuestionsFromBank = (evaluationData: any) => {
    // This function is called by the QuestionBank component
    // with the selected questions to add
    if (evaluationData && evaluationData.questions) {
      const questionsToAdd = evaluationData.questions.map((q: any, index: number) => ({
        id: `bank-q-${Math.random().toString(36).substr(2, 9)}`,
        text: q.text,
        options: q.options,
        answer: q.answer,
        createdAt: new Date().toISOString(),
        type: q.options ? "Múltipla escolha" : "Discursiva",
        difficulty: ["Fácil", "Médio", "Difícil"][Math.floor(Math.random() * 3)],
      }));
      
      onAddQuestions(questionsToAdd);
      setIsQuestionBankDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="selected">
            Questões Selecionadas ({selectedQuestions.length})
          </TabsTrigger>
          <TabsTrigger value="add">Adicionar Questões</TabsTrigger>
        </TabsList>
        
        <TabsContent value="selected" className="pt-4">
          <div className="mb-4 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar questões..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
          
          {filteredQuestions.length > 0 ? (
            <div className="space-y-4">
              {filteredQuestions.map((question, index) => (
                <Card key={question.id} className="overflow-hidden">
                  <CardHeader className="bg-muted/50 py-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        Questão {index + 1}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => onRemoveQuestion(question.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <p className="text-sm">{question.text}</p>
                    
                    {question.options && question.options.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {question.options.map((option: string, i: number) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                              question.answer === String.fromCharCode(65 + i) 
                                ? "border-green-500 bg-green-500 text-white" 
                                : "border-gray-300"
                            }`}>
                              {String.fromCharCode(65 + i)}
                            </div>
                            <p className="text-sm">{option}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="mt-3 flex flex-wrap gap-2">
                      {question.type && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                          {question.type}
                        </span>
                      )}
                      {question.difficulty && (
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-800">
                          {question.difficulty}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
              <p className="text-muted-foreground">
                {selectedQuestions.length === 0
                  ? "Nenhuma questão selecionada. Adicione questões para a avaliação."
                  : "Nenhuma questão encontrada com o termo de busca."}
              </p>
              {selectedQuestions.length === 0 && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setActiveTab("add")}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Questões
                </Button>
              )}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="add" className="pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-6">
                <Dialog open={isQuestionBankDialogOpen} onOpenChange={setIsQuestionBankDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Search className="mr-2 h-4 w-4" />
                      Selecionar do Banco de Questões
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>Banco de Questões</DialogTitle>
                    </DialogHeader>
                    <QuestionBank onCreateEvaluation={handleAddQuestionsFromBank} />
                  </DialogContent>
                </Dialog>
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Selecione questões já existentes no banco de questões para adicionar à avaliação.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-6">
                <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Plus className="mr-2 h-4 w-4" />
                      Criar Nova Questão
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      {/* <DialogTitle>Criar Nova Questão</DialogTitle> */}
                    </DialogHeader>
                    <div className="mt-4">
                      <QuestionForm onSubmit={handleCreateQuestion} />
                    </div>
                  </DialogContent>
                </Dialog>
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Crie uma nova questão para adicionar à avaliação e ao banco de questões.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
