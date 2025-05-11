import React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";

// Form schema
const evaluationFormSchema = z.object({
  name: z.string().min(3, "O nome deve ter no mínimo 3 caracteres"),
  school: z.string().min(1, "Selecione uma escola"),
  subject: z.string().min(1, "Selecione uma matéria"),
  classes: z.array(z.string()).min(1, "Selecione pelo menos uma turma"),
});

type EvaluationFormValues = z.infer<typeof evaluationFormSchema>;

// Mock data
const schools = [
  "Escola Municipal João da Silva",
  "Colégio Estadual Maria Santos",
  "Instituto Federal de Educação",
  "Escola Técnica de Artes",
  "Centro Educacional Novo Horizonte"
];

const subjects = [
  "Matemática",
  "Português",
  "Ciências",
  "História",
  "Geografia",
  "Física",
  "Química",
  "Biologia",
  "Inglês",
  "Artes",
  "Educação Física"
];

const classes = [
  "1º Ano A",
  "1º Ano B",
  "2º Ano A",
  "2º Ano B",
  "3º Ano A",
  "3º Ano B",
  "4º Ano A",
  "4º Ano B",
  "5º Ano A",
  "5º Ano B",
  "6º Ano A",
  "6º Ano B",
  "7º Ano A",
  "7º Ano B",
  "8º Ano A",
  "8º Ano B",
  "9º Ano A",
  "9º Ano B",
];

interface EvaluationFormProps {
  onSubmit: (data: any) => void;
  initialValues?: any;
}

export default function EvaluationForm({ onSubmit, initialValues }: EvaluationFormProps) {
  const form = useForm<EvaluationFormValues>({
    resolver: zodResolver(evaluationFormSchema),
    defaultValues: initialValues || {
      name: "",
      school: "",
      subject: "",
      classes: [],
    },
  });

  const handleSubmit = (values: EvaluationFormValues) => {
    // Generate a mock ID for the created evaluation
    const evaluationWithId = {
      ...values,
      id: `eval-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    
    onSubmit(evaluationWithId);
  };

  const selectedClasses = form.watch("classes") || [];
  
  const handleToggleClass = (classItem: string) => {
    const current = form.getValues("classes") || [];
    
    if (current.includes(classItem)) {
      form.setValue("classes", current.filter(c => c !== classItem));
    } else {
      form.setValue("classes", [...current, classItem]);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Avaliação</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Avaliação de Matemática - 1º Bimestre" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="school"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Escola</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma escola" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {schools.map((school) => (
                      <SelectItem key={school} value={school}>
                        {school}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="subject"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Matéria</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma matéria" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="classes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Turmas</FormLabel>
              <div className="space-y-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                    >
                      {selectedClasses.length === 0
                        ? "Selecionar turmas..."
                        : `${selectedClasses.length} turma${selectedClasses.length > 1 ? "s" : ""} selecionada${selectedClasses.length > 1 ? "s" : ""}`}
                      <span className="sr-only">Toggle classes popover</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-4" align="start">
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                      {classes.map((classItem) => (
                        <div
                          key={classItem}
                          className={`flex cursor-pointer items-center rounded-md border p-2 ${
                            selectedClasses.includes(classItem)
                              ? "border-primary bg-primary/10"
                              : "hover:border-primary/50"
                          }`}
                          onClick={() => handleToggleClass(classItem)}
                        >
                          <div className="flex-grow text-sm">{classItem}</div>
                          {selectedClasses.includes(classItem) && <Check className="ml-2 h-4 w-4 text-primary" />}
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <div className="flex flex-wrap gap-2">
                  {selectedClasses.length > 0 ? (
                    selectedClasses.map((classItem) => (
                      <Badge key={classItem} variant="secondary">
                        {classItem}
                        <X
                          className="ml-1 h-3 w-3 cursor-pointer hover:text-destructive"
                          onClick={() => handleToggleClass(classItem)}
                        />
                      </Badge>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">Nenhuma turma selecionada</div>
                  )}
                </div>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" className="flex items-center">
            Próximo
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </form>
    </Form>
  );
}
