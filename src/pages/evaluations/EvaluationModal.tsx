
import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Evaluation } from "./EvaluationsPage";

const formSchema = z.object({
  title: z.string().min(3, "Título deve ter pelo menos 3 caracteres"),
  subject: z.string().min(1, "Disciplina é obrigatória"),
  grade: z.string().min(1, "Série é obrigatória"),
});

type FormValues = z.infer<typeof formSchema>;

interface QuestionItem {
  id: string;
  text: string;
}

interface EvaluationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: any, questionCount: number) => void;
  editingEvaluation: Evaluation | null;
  selectedQuestionCount?: number;
}

const EvaluationModal = ({
  open,
  onOpenChange,
  onSubmit,
  editingEvaluation,
  selectedQuestionCount = 0,
}: EvaluationModalProps) => {
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [newQuestion, setNewQuestion] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      subject: "",
      grade: "",
    },
  });

  // Update form when editing evaluation changes
  useEffect(() => {
    if (editingEvaluation) {
      form.reset({
        title: editingEvaluation.title,
        subject: editingEvaluation.subject,
        grade: editingEvaluation.grade,
      });
      // In a real app, you would fetch questions for this evaluation
      setQuestions([]);
    } else {
      form.reset({
        title: "",
        subject: "",
        grade: "",
      });
      setQuestions([]);
    }
  }, [editingEvaluation, form]);

  const addQuestion = () => {
    if (newQuestion.trim()) {
      setQuestions([
        ...questions,
        { id: Date.now().toString(), text: newQuestion },
      ]);
      setNewQuestion("");
    }
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const handleSubmit = (values: FormValues) => {
    const questionCount = selectedQuestionCount > 0 
      ? selectedQuestionCount 
      : questions.length;
    
    if (editingEvaluation) {
      onSubmit({
        ...editingEvaluation,
        ...values,
        questions: questionCount,
      }, questionCount);
    } else {
      onSubmit(values, questionCount);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {editingEvaluation ? "Editar Avaliação" : "Criar Nova Avaliação"}
          </DialogTitle>
          <DialogDescription>
            {editingEvaluation
              ? "Atualize os dados da avaliação"
              : "Preencha os dados para criar uma nova avaliação"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título da avaliação</FormLabel>
                  <FormControl>
                    <Input placeholder="Título da avaliação" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Disciplina</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma disciplina" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Matemática">Matemática</SelectItem>
                        <SelectItem value="Português">Português</SelectItem>
                        <SelectItem value="Ciências">Ciências</SelectItem>
                        <SelectItem value="História">História</SelectItem>
                        <SelectItem value="Geografia">Geografia</SelectItem>
                        <SelectItem value="Inglês">Inglês</SelectItem>
                        <SelectItem value="Física">Física</SelectItem>
                        <SelectItem value="Química">Química</SelectItem>
                        <SelectItem value="Biologia">Biologia</SelectItem>
                        <SelectItem value="Artes">Artes</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="grade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Série</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma série" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1º ano">1º ano</SelectItem>
                        <SelectItem value="2º ano">2º ano</SelectItem>
                        <SelectItem value="3º ano">3º ano</SelectItem>
                        <SelectItem value="4º ano">4º ano</SelectItem>
                        <SelectItem value="5º ano">5º ano</SelectItem>
                        <SelectItem value="6º ano">6º ano</SelectItem>
                        <SelectItem value="7º ano">7º ano</SelectItem>
                        <SelectItem value="8º ano">8º ano</SelectItem>
                        <SelectItem value="9º ano">9º ano</SelectItem>
                        <SelectItem value="1º EM">1º EM</SelectItem>
                        <SelectItem value="2º EM">2º EM</SelectItem>
                        <SelectItem value="3º EM">3º EM</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {selectedQuestionCount > 0 ? (
              <div className="bg-green-50 p-4 rounded-md">
                <p>
                  {selectedQuestionCount} questões selecionadas do banco de questões.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Digite uma nova questão"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={addQuestion}
                    disabled={!newQuestion.trim()}
                  >
                    <PlusCircle className="h-4 w-4 mr-1" /> Adicionar
                  </Button>
                </div>

                {questions.length > 0 ? (
                  <div className="border rounded-md divide-y">
                    {questions.map((question, index) => (
                      <div
                        key={question.id}
                        className="flex items-center justify-between p-3"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{index + 1}.</span>
                          <span>{question.text}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeQuestion(question.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Remover</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-4 text-muted-foreground bg-gray-50 rounded-md">
                    Nenhuma questão adicionada ainda.
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingEvaluation ? "Atualizar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EvaluationModal;
