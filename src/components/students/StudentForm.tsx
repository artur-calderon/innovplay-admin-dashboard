import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Form schema
const studentSchema = z.object({
  name: z.string().min(3, "Nome precisa ter no mínimo 3 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  birthDate: z.string().min(1, "Selecione a data de nascimento"),
  grade: z.string().min(1, "Selecione uma série"),
  classroom: z.string().min(1, "Selecione uma turma"),
  school: z.string().min(1, "Selecione uma escola"),
});

type StudentFormValues = z.infer<typeof studentSchema>;

interface Grade {
  id: string;
  name: string;
  education_stage?: {
    id: string;
    name: string;
  };
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

interface School {
  id: string;
  name: string;
}

interface StudentFormProps {
  initialValues?: {
    name: string;
    email?: string;
    birthDate?: string;
    grade: string;
    classroom: string;
    school?: string;
  };
  onSubmit: (values: StudentFormValues) => void;
  onCancel?: () => void;
}

export function StudentForm({ initialValues, onSubmit, onCancel }: StudentFormProps) {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<Class[]>([]);
  const [isLoadingGrades, setIsLoadingGrades] = useState(true);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [isLoadingSchools, setIsLoadingSchools] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: initialValues || {
      name: "",
      email: "",
      password: "",
      birthDate: "",
      grade: "",
      classroom: "",
      school: "",
    },
  });

  const selectedSchool = form.watch("school");

  useEffect(() => {
    fetchGrades();
    fetchSchools();
  }, []);

  // Filter classes when school changes
  useEffect(() => {
    if (selectedSchool) {
      fetchClassesBySchool(selectedSchool);
    } else {
      setFilteredClasses([]);
      form.setValue("classroom", "");
    }
  }, [selectedSchool]);

  const fetchGrades = async () => {
    try {
      setIsLoadingGrades(true);
      const response = await api.get("/grades/");
      setGrades(response.data || []);
    } catch (error) {
      console.error("Erro ao buscar séries:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar séries. Verifique sua conexão.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingGrades(false);
    }
  };

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

  const handleSubmit = async (values: StudentFormValues) => {
    try {
      setIsSubmitting(true);
      await onSubmit(values);
    } catch (error) {
      console.error("Erro ao salvar estudante:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome completo</FormLabel>
              <FormControl>
                <Input placeholder="Nome do aluno" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input 
                  type="email" 
                  placeholder="email@exemplo.com" 
                  {...field} 
                  disabled={isSubmitting} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Senha</FormLabel>
              <FormControl>
                <Input 
                  type="password" 
                  placeholder="Digite uma senha" 
                  {...field} 
                  disabled={isSubmitting} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="birthDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data de nascimento</FormLabel>
              <FormControl>
                <Input type="date" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="school"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Escola</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
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
          name="grade"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Série</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingGrades ? "Carregando..." : "Selecione uma série"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {isLoadingGrades ? (
                    <SelectItem value="loading" disabled>
                      <div className="flex items-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Carregando séries...
                      </div>
                    </SelectItem>
                  ) : grades.length === 0 ? (
                    <SelectItem value="no-grades" disabled>
                      Nenhuma série encontrada
                    </SelectItem>
                  ) : (
                    grades.map((grade) => (
                      <SelectItem key={grade.id} value={grade.id}>
                        {grade.name}
                        {grade.education_stage && (
                          <span className="text-muted-foreground"> - {grade.education_stage.name}</span>
                        )}
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
          name="classroom"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Turma</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value} 
                disabled={isSubmitting || !selectedSchool || isLoadingClasses}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue 
                      placeholder={
                        !selectedSchool ? "Selecione uma escola primeiro" :
                        isLoadingClasses ? "Carregando..." : 
                        "Selecione uma turma"
                      } 
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {isLoadingClasses ? (
                    <SelectItem value="loading" disabled>
                      <div className="flex items-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Carregando turmas...
                      </div>
                    </SelectItem>
                  ) : !selectedSchool ? (
                    <SelectItem value="no-school" disabled>
                      Selecione uma escola primeiro
                    </SelectItem>
                  ) : filteredClasses.length === 0 ? (
                    <SelectItem value="no-classes" disabled>
                      Nenhuma turma encontrada para esta escola
                    </SelectItem>
                  ) : (
                    filteredClasses.map((classroom) => (
                      <SelectItem key={classroom.id} value={classroom.id}>
                        {classroom.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          {onCancel && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
