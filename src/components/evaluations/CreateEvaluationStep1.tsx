import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, X, Calendar, Clock, Info, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EvaluationFormData, Subject } from "./types";

// Schema de validação simplificado e mais robusto
const step1Schema = z.object({
  title: z.string().min(3, "O título deve ter no mínimo 3 caracteres").max(100, "Título muito longo"),
  description: z.string().optional(),
  type: z.enum(["AVALIACAO", "SIMULADO"], {
    required_error: "Selecione o tipo da avaliação",
  }),
  model: z.enum(["SAEB", "PROVA", "AVALIE"], {
    required_error: "Selecione o modelo da avaliação",
  }),
  course: z.string().min(1, "Selecione um curso"),
  grade: z.string().min(1, "Selecione uma série"),
  subjects: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })).min(1, "Selecione pelo menos uma disciplina"),
  startDateTime: z.string().min(1, "Selecione a data e hora de início"),
  duration: z.string().min(1, "Informe a duração em minutos").regex(/^\d+$/, "Duração deve ser um número"),
});

type Step1FormValues = z.infer<typeof step1Schema>;

interface CreateEvaluationStep1Props {
  onNext: (data: EvaluationFormData) => void;
  initialData?: EvaluationFormData | null;
}

interface Course {
  id: string;
  name: string;
}

interface Grade {
  id: string;
  name: string;
}

export function CreateEvaluationStep1({ onNext, initialData }: CreateEvaluationStep1Props) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  
  const { toast } = useToast();

  const form = useForm<Step1FormValues>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      type: initialData?.type || "AVALIACAO",
      model: initialData?.model || "SAEB",
      course: initialData?.course || "",
      grade: initialData?.grade || "",
      subjects: initialData?.subjects || [],
      startDateTime: initialData?.startDateTime || "",
      duration: initialData?.duration || "60",
    },
  });

  const selectedCourse = form.watch("course");
  const selectedSubjects = form.watch("subjects");

  // Carregar dados iniciais
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoadingData(true);
        const [coursesRes, subjectsRes] = await Promise.all([
          api.get("/education_stages"),
          api.get("/subjects")
        ]);
        
        setCourses(coursesRes.data || []);
        setSubjects(subjectsRes.data || []);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast({
          title: "Erro",
          description: "Erro ao carregar dados. Verifique sua conexão.",
          variant: "destructive",
        });
      } finally {
        setLoadingData(false);
      }
    };

    loadInitialData();
  }, [toast]);

  // Carregar séries quando curso mudar
  useEffect(() => {
    if (selectedCourse) {
      const loadGrades = async () => {
        try {
          const response = await api.get(`/grades/education-stage/${selectedCourse}`);
          setGrades(response.data || []);
          
          // Limpar série selecionada se não estiver na nova lista
          const currentGrade = form.getValues("grade");
          if (currentGrade && !response.data.find((g: Grade) => g.id === currentGrade)) {
            form.setValue("grade", "");
          }
        } catch (error) {
          console.error("Erro ao carregar séries:", error);
          setGrades([]);
        }
      };

      loadGrades();
    } else {
      setGrades([]);
      form.setValue("grade", "");
    }
  }, [selectedCourse, form]);

  const handleSubjectToggle = (subject: Subject) => {
    const current = selectedSubjects;
    const exists = current.find(s => s.id === subject.id);
    
    if (exists) {
      // Remover disciplina
      const updated = current.filter(s => s.id !== subject.id);
      form.setValue("subjects", updated);
    } else {
      // Adicionar disciplina
      const updated = [...current, subject];
      form.setValue("subjects", updated);
    }
  };

  const handleRemoveSubject = (subjectId: string) => {
    const updated = selectedSubjects.filter(s => s.id !== subjectId);
    form.setValue("subjects", updated);
  };

  const onSubmit = async (values: Step1FormValues) => {
    try {
      setIsLoading(true);
      
      // Converter para o formato esperado pelo stepper
      const evaluationData: EvaluationFormData = {
        title: values.title,
        description: values.description || "",
        type: values.type,
        model: values.model,
        course: values.course,
        grade: values.grade,
        subjects: values.subjects,
        subject: values.subjects[0]?.id || "", // Para compatibilidade
        startDateTime: values.startDateTime,
        duration: values.duration,
        municipalities: [],
        schools: [],
        classes: [],
        classId: "",
        questions: [],
      };

      onNext(evaluationData);
    } catch (error) {
      console.error("Erro no Step 1:", error);
      toast({
        title: "Erro",
        description: "Erro ao processar dados do formulário",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500" />
              Informações Básicas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título da Avaliação *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Avaliação de Matemática - 1º Bimestre"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Este título será exibido para os alunos
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Breve descrição sobre a avaliação..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Configurações da Avaliação */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-500" />
              Configurações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="AVALIACAO">Avaliação</SelectItem>
                        <SelectItem value="SIMULADO">Simulado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o modelo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="SAEB">SAEB</SelectItem>
                        <SelectItem value="PROVA">Prova Tradicional</SelectItem>
                        <SelectItem value="AVALIE">Avalie</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="course"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Curso *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o curso" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {courses.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.name}
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
                name="grade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Série *</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={!selectedCourse}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={!selectedCourse ? "Selecione um curso primeiro" : "Selecione a série"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {grades.map((grade) => (
                          <SelectItem key={grade.id} value={grade.id}>
                            {grade.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDateTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data e Hora de Início *</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Quando a avaliação ficará disponível
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duração (minutos) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="300"
                        placeholder="60"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Tempo limite para realização
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Disciplinas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-purple-500" />
              Disciplinas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="subjects"
              render={() => (
                <FormItem>
                  <FormLabel>Selecione as disciplinas *</FormLabel>
                  <FormDescription>
                    Escolha as disciplinas que farão parte desta avaliação
                  </FormDescription>
                  
                  {/* Disciplinas Selecionadas */}
                  {selectedSubjects.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Disciplinas selecionadas:</Label>
                      <div className="flex flex-wrap gap-2">
                        {selectedSubjects.map((subject) => (
                          <Badge
                            key={subject.id}
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            {subject.name}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 hover:bg-transparent"
                              onClick={() => handleRemoveSubject(subject.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Lista de Disciplinas Disponíveis */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
                    {subjects.map((subject) => {
                      const isSelected = selectedSubjects.find(s => s.id === subject.id);
                      return (
                        <div key={subject.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={subject.id}
                            checked={!!isSelected}
                            onCheckedChange={() => handleSubjectToggle(subject)}
                          />
                          <Label
                            htmlFor={subject.id}
                            className="text-sm cursor-pointer flex-1"
                          >
                            {subject.name}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Validação Final */}
        {selectedSubjects.length === 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Você precisa selecionar pelo menos uma disciplina antes de continuar.
            </AlertDescription>
          </Alert>
        )}

        {/* Botão de Submit */}
        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            disabled={isLoading || selectedSubjects.length === 0}
            className="min-w-32"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validando...
              </>
            ) : (
              "Continuar"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
} 