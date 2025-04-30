
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

// Form schema
const evaluationSchema = z.object({
  title: z.string().min(3, "Título precisa ter no mínimo 3 caracteres"),
  subject: z.string().min(1, "Selecione uma disciplina"),
  grade: z.string().min(1, "Selecione uma série"),
  questions: z.array(
    z.object({
      text: z.string().min(5, "A questão precisa ter no mínimo 5 caracteres"),
      options: z.array(z.string()).optional(),
      answer: z.string().optional(),
    })
  ).optional(),
});

type EvaluationFormValues = z.infer<typeof evaluationSchema>;

interface EvaluationFormProps {
  initialValues?: {
    title: string;
    subject: string;
    grade: string;
    questions?: Array<{
      text: string;
      options?: string[];
      answer?: string;
    }>;
  };
  onSubmit: (values: EvaluationFormValues) => void;
}

export function EvaluationForm({ initialValues, onSubmit }: EvaluationFormProps) {
  const [questions, setQuestions] = useState<Array<{
    text: string;
    options?: string[];
    answer?: string;
  }>>(initialValues?.questions || []);

  const form = useForm<EvaluationFormValues>({
    resolver: zodResolver(evaluationSchema),
    defaultValues: {
      title: initialValues?.title || "",
      subject: initialValues?.subject || "",
      grade: initialValues?.grade || "",
      questions: questions,
    },
  });

  // Available subject options
  const subjectOptions = [
    "Matemática",
    "Português",
    "Ciências",
    "História",
    "Geografia",
    "Inglês",
    "Artes",
    "Educação Física",
  ];

  // Available grade options
  const gradeOptions = [
    "1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano",
    "6º Ano", "7º Ano", "8º Ano", "9º Ano", 
    "1º Ensino Médio", "2º Ensino Médio", "3º Ensino Médio"
  ];

  const addQuestion = () => {
    const newQuestions = [...questions, { text: "", options: ["", "", "", ""], answer: "" }];
    setQuestions(newQuestions);
    form.setValue("questions", newQuestions);
  };

  const removeQuestion = (index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions);
    form.setValue("questions", newQuestions);
  };

  const updateQuestion = (index: number, field: string, value: string) => {
    const newQuestions = [...questions];
    (newQuestions[index] as any)[field] = value;
    setQuestions(newQuestions);
    form.setValue("questions", newQuestions);
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const newQuestions = [...questions];
    if (!newQuestions[questionIndex].options) {
      newQuestions[questionIndex].options = ["", "", "", ""];
    }
    newQuestions[questionIndex].options![optionIndex] = value;
    setQuestions(newQuestions);
    form.setValue("questions", newQuestions);
  };

  const handleSubmit = (values: EvaluationFormValues) => {
    // Ensure questions array is included
    const finalValues = {
      ...values,
      questions: questions,
    };
    onSubmit(finalValues);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

          <FormField
            control={form.control}
            name="subject"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Disciplina</FormLabel>
                <FormControl>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    {...field}
                  >
                    <option value="">Selecione a disciplina</option>
                    {subjectOptions.map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="grade"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Série</FormLabel>
              <FormControl>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...field}
                >
                  <option value="">Selecione a série</option>
                  {gradeOptions.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="my-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Questões</h3>
            <Button type="button" onClick={addQuestion}>
              <Plus className="mr-2 h-4 w-4" /> Adicionar Questão
            </Button>
          </div>

          {questions.length > 0 ? (
            <div className="space-y-6">
              {questions.map((question, qIndex) => (
                <div key={qIndex} className="p-4 border rounded-lg relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeQuestion(qIndex)}
                    className="absolute top-2 right-2"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Questão {qIndex + 1}</label>
                    <Textarea
                      value={question.text}
                      onChange={(e) => updateQuestion(qIndex, "text", e.target.value)}
                      placeholder="Digite o enunciado da questão"
                      className="min-h-[100px]"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Alternativas</label>
                    {question.options?.map((option, oIndex) => (
                      <div key={oIndex} className="flex items-center gap-2">
                        <span className="w-6 text-center">{String.fromCharCode(65 + oIndex)})</span>
                        <Input
                          value={option}
                          onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                          placeholder={`Alternativa ${String.fromCharCode(65 + oIndex)}`}
                        />
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-1">Resposta Correta</label>
                    <select
                      value={question.answer || ""}
                      onChange={(e) => updateQuestion(qIndex, "answer", e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Selecione a resposta correta</option>
                      {question.options?.map((_, oIndex) => (
                        <option key={oIndex} value={String.fromCharCode(65 + oIndex)}>
                          {String.fromCharCode(65 + oIndex)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Nenhuma questão adicionada ainda. Clique em "Adicionar Questão" para começar.
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={() => form.reset()}>
            Cancelar
          </Button>
          <Button type="submit">Salvar</Button>
        </div>
      </form>
    </Form>
  );
}
