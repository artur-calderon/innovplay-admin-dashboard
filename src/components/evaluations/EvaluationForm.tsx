import React, { useState, useEffect } from "react";
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
import { ArrowRight, Loader2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

// Form schema
const evaluationFormSchema = z.object({
  name: z.string().min(3, "O nome deve ter no mínimo 3 caracteres"),
  school: z.string().min(1, "Selecione uma escola"),
  subject: z.string().min(1, "Selecione uma matéria"),
  classes: z.array(z.string()).min(1, "Selecione pelo menos uma turma"),
});

type EvaluationFormValues = z.infer<typeof evaluationFormSchema>;

interface School {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
}

interface Class {
  id: string;
  name: string;
  school_id: string;
  school?: {
    id: string;
    name: string;
  };
}

interface EvaluationFormData {
  name: string;
  school: string;
  subject: string;
  classes: string[];
  id?: string;
  createdAt?: string;
  schoolName?: string;
  subjectName?: string;
  classesData?: Class[];
}

interface EvaluationFormProps {
  onSubmit: (data: EvaluationFormData) => void;
  initialValues?: Partial<EvaluationFormValues>;
}

export default function EvaluationForm({ onSubmit, initialValues }: EvaluationFormProps) {
  const [schools, setSchools] = useState<School[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<Class[]>([]);
  const [isLoadingSchools, setIsLoadingSchools] = useState(true);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const { toast } = useToast();

  const form = useForm<EvaluationFormValues>({
    resolver: zodResolver(evaluationFormSchema),
    defaultValues: initialValues || {
      name: "",
      school: "",
      subject: "",
      classes: [],
    },
  });

  const selectedSchool = form.watch("school");
  const selectedClasses = form.watch("classes") || [];

  // Fetch initial data
  useEffect(() => {
    fetchSchools();
    fetchSubjects();
  }, []);

  // Filter classes when school changes
  useEffect(() => {
    if (selectedSchool) {
      fetchClassesBySchool(selectedSchool);
    } else {
      setFilteredClasses([]);
      // Clear selected classes when school changes
      form.setValue("classes", []);
    }
  }, [selectedSchool]);

  const fetchSchools = async () => {
    try {
      setIsLoadingSchools(true);
      const response = await api.get("/school");
      setSchools(response.data || []);
    } catch (error) {
      console.error("Erro ao buscar escolas:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar escolas. Verifique sua conexão.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSchools(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      setIsLoadingSubjects(true);
      const response = await api.get("/subjects");
      setSubjects(response.data || []);
    } catch (error) {
      console.error("Erro ao buscar disciplinas:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar disciplinas. Verifique sua conexão.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSubjects(false);
    }
  };

  const fetchClassesBySchool = async (schoolId: string) => {
    try {
      setIsLoadingClasses(true);
      const response = await api.get(`/classes/school/${schoolId}`);
      const classesData = response.data || [];
      setFilteredClasses(classesData);
    } catch (error) {
      console.error("Erro ao buscar turmas:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar turmas da escola selecionada.",
        variant: "destructive",
      });
      setFilteredClasses([]);
    } finally {
      setIsLoadingClasses(false);
    }
  };

  const handleSubmit = (values: EvaluationFormValues) => {
    // Find the selected school and subject names for the response
    const selectedSchoolData = schools.find(s => s.id === values.school);
    const selectedSubjectData = subjects.find(s => s.id === values.subject);
    const selectedClassesData = filteredClasses.filter(c => values.classes.includes(c.id));

    // Generate a mock ID for the created evaluation
    const evaluationWithId = {
      ...values,
      id: `eval-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      schoolName: selectedSchoolData?.name,
      subjectName: selectedSubjectData?.name,
      classesData: selectedClassesData,
    };
    
    onSubmit(evaluationWithId);
  };
  
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
                      <SelectValue placeholder={isLoadingSchools ? "Carregando..." : "Selecione uma escola"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {isLoadingSchools ? (
                      <SelectItem value="loading" disabled>
                        <div className="flex items-center">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Carregando escolas...
                        </div>
                      </SelectItem>
                    ) : schools.length === 0 ? (
                      <SelectItem value="no-schools" disabled>
                        Nenhuma escola encontrada
                      </SelectItem>
                    ) : (
                      schools.map((school) => (
                        <SelectItem key={school.id} value={school.id}>
                          {school.name}
                        </SelectItem>
                      ))
                    )}
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
                      <SelectValue placeholder={isLoadingSubjects ? "Carregando..." : "Selecione uma matéria"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {isLoadingSubjects ? (
                      <SelectItem value="loading" disabled>
                        <div className="flex items-center">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Carregando disciplinas...
                        </div>
                      </SelectItem>
                    ) : subjects.length === 0 ? (
                      <SelectItem value="no-subjects" disabled>
                        Nenhuma disciplina encontrada
                      </SelectItem>
                    ) : (
                      subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))
                    )}
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
                      disabled={!selectedSchool || isLoadingClasses}
                    >
                      {!selectedSchool ? "Selecione uma escola primeiro" :
                       isLoadingClasses ? "Carregando turmas..." :
                       selectedClasses.length === 0
                        ? "Selecionar turmas..."
                        : `${selectedClasses.length} turma${selectedClasses.length > 1 ? "s" : ""} selecionada${selectedClasses.length > 1 ? "s" : ""}`}
                      <span className="sr-only">Toggle classes popover</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-4" align="start">
                    {isLoadingClasses ? (
                      <div className="space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : filteredClasses.length === 0 ? (
                      <div className="text-center text-sm text-muted-foreground py-4">
                        Nenhuma turma encontrada para esta escola
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                        {filteredClasses.map((classItem) => (
                          <div
                            key={classItem.id}
                            className={`flex cursor-pointer items-center rounded-md border p-2 ${
                              selectedClasses.includes(classItem.id)
                                ? "border-primary bg-primary/10"
                                : "hover:border-primary/50"
                            }`}
                            onClick={() => handleToggleClass(classItem.id)}
                          >
                            <div className="flex-grow text-sm">{classItem.name}</div>
                            {selectedClasses.includes(classItem.id) && <Check className="ml-2 h-4 w-4 text-primary" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </PopoverContent>
                </Popover>

                <div className="flex flex-wrap gap-2">
                  {selectedClasses.length > 0 ? (
                    selectedClasses.map((classId) => {
                      const classData = filteredClasses.find(c => c.id === classId);
                      return classData ? (
                        <Badge key={classId} variant="secondary">
                          {classData.name}
                          <X
                            className="ml-1 h-3 w-3 cursor-pointer hover:text-destructive"
                            onClick={() => handleToggleClass(classId)}
                          />
                        </Badge>
                      ) : null;
                    })
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
          <Button 
            type="submit" 
            className="flex items-center"
            disabled={isLoadingSchools || isLoadingSubjects}
          >
            Próximo
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </form>
    </Form>
  );
}
