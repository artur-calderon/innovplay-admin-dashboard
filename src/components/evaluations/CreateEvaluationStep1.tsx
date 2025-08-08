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
import { Loader2, Plus, X, Calendar, Clock, Info, AlertTriangle, Users, MapPin } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EvaluationFormData, Subject, ClassInfo } from "./types";
// Removido import de mockData - usando dados reais da API
import { useAuth } from "@/context/authContext";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "./results/constants";

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
  state: z.string().min(1, "Selecione um estado"),
  municipality: z.string().min(1, "Selecione um município"),
  selectedSchools: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })).min(1, "Selecione pelo menos uma escola"),
  subjects: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })).min(1, "Selecione pelo menos uma disciplina"),
  selectedClasses: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })).min(1, "Selecione pelo menos uma turma"),
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

interface State {
  id: string;
  name: string;
  uf: string;
}

interface Municipality {
  id: string;
  name: string;
  state_id: string;
}

interface School {
  id: string;
  name: string;
  municipality_id: string;
  address?: string;
}

export function CreateEvaluationStep1({ onNext, initialData }: CreateEvaluationStep1Props) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const { user } = useAuth();

  // Novo estado para escolas filtradas (apenas admin)
  const [filteredSchools, setFilteredSchools] = useState<School[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [noSchoolsMessage, setNoSchoolsMessage] = useState("");
  const [noClassesMessage, setNoClassesMessage] = useState("");

  // Novo estado para municípios filtrados
  const [filteredMunicipalities, setFilteredMunicipalities] = useState<Municipality[]>([]);

  // Novo estado para loading das turmas
  const [classesLoading, setClassesLoading] = useState(false);

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
      state: "",
      municipality: "",
      selectedSchools: [],
      subjects: initialData?.subjects || [],
      selectedClasses: initialData?.selectedClasses || [],
      duration: initialData?.duration || "60",
    },
  });

  const selectedCourse = form.watch("course");
  const selectedGrade = form.watch("grade");
  const selectedState = form.watch("state");
  const selectedMunicipality = form.watch("municipality");
  const selectedSchools = form.watch("selectedSchools");
  const selectedSubjects = form.watch("subjects");
  const selectedClasses = form.watch("selectedClasses");

  // Carregar dados iniciais
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoadingData(true);

        // Buscar cursos (education stages)
        const coursesRes = await api.get("/education_stages");
        setCourses(coursesRes.data || []);

        // Buscar disciplinas
        const subjectsRes = await api.get("/subjects");
        setSubjects(subjectsRes.data || []);

        // Buscar estados
        const statesRes = await api.get("/city/states");
        setStates(statesRes.data || []);

      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast({
          title: "Erro",
          description: ERROR_MESSAGES.NETWORK_ERROR,
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

  // Carregar turmas filtradas da API quando série, escola ou município mudar
  useEffect(() => {
    const fetchFilteredClasses = async () => {
      if (!selectedGrade || selectedSchools.length === 0 || !selectedMunicipality) {
        setClasses([]);
        form.setValue("selectedClasses", []);
        return;
      }

      try {
        // Usar o endpoint existente /classes/school/{schoolId} para buscar todas as turmas da escola
        const schoolId = selectedSchools[0].id;
        const response = await api.get(`/classes/school/${schoolId}`);
        const allClasses = response.data || [];

        // Filtrar turmas por série no frontend (comparação por string, sem espaços)
        const filteredClasses = allClasses.filter((classItem: any) =>
          String(classItem.grade_id).trim() === String(selectedGrade).trim()
        );

        setClasses(filteredClasses);

        // Limpar turmas selecionadas se não estiverem na nova lista
        const currentClasses = form.getValues("selectedClasses");
        if (currentClasses.length > 0) {
          const validClasses = currentClasses.filter(c =>
            filteredClasses.find((cl: { id: string }) => cl.id === c.id)
          );
          form.setValue("selectedClasses", validClasses);
        }
      } catch (error) {
        setClasses([]);
        form.setValue("selectedClasses", []);
        console.error("Erro ao buscar turmas da escola:", error);

        // Fallback: usar dados vazios se a API falhar
        setClasses([]);
      }
    };

    fetchFilteredClasses();
  }, [selectedGrade, selectedSchools, selectedMunicipality, form]);

  // Carregar municípios quando estado mudar
  useEffect(() => {
    if (selectedState === 'all') {
      setMunicipalities([]); // só mostra opção 'Todos os municípios'
      setFilteredMunicipalities([]);
      form.setValue("municipality", "all");
      setSchools([]);
      setFilteredSchools([]);
      setClasses([]);
      setNoSchoolsMessage("");
      setNoClassesMessage("");
      form.setValue("selectedSchools", []);
      form.setValue("selectedClasses", []);
    } else if (selectedState) {
      // Buscar municípios do estado selecionado
      api.get(`/city/municipalities/state/${selectedState}`)
        .then(res => {
          setMunicipalities(res.data || []);
          setFilteredMunicipalities(res.data || []);
        })
        .catch(() => {
          setMunicipalities([]);
          setFilteredMunicipalities([]);
        });
      form.setValue("municipality", "");
      setSchools([]);
      setFilteredSchools([]);
      setClasses([]);
      setNoSchoolsMessage("");
      setNoClassesMessage("");
      form.setValue("selectedSchools", []);
      form.setValue("selectedClasses", []);
    } else {
      setMunicipalities([]);
      setFilteredMunicipalities([]);
      form.setValue("municipality", "");
      setSchools([]);
      setFilteredSchools([]);
      setClasses([]);
      setNoSchoolsMessage("");
      setNoClassesMessage("");
      form.setValue("selectedSchools", []);
      form.setValue("selectedClasses", []);
    }
  }, [selectedState]);

  // Carregar escolas quando município mudar
  useEffect(() => {
    if (!selectedMunicipality) {
      setSchools([]);
      setFilteredSchools([]);
      setClasses([]);
      setNoSchoolsMessage("");
      setNoClassesMessage("");
      form.setValue("selectedSchools", []);
      form.setValue("selectedClasses", []);
      return;
    }

    if (selectedMunicipality === 'all') {
      setSchoolsLoading(true);
      setNoSchoolsMessage("");
      setFilteredSchools([]);
      setClasses([]);
      setNoClassesMessage("");
      form.setValue("selectedSchools", []);
      form.setValue("selectedClasses", []);

      if (user?.role === "admin" && selectedCourse && selectedGrade) {
        // Buscar todas as escolas de todos os municípios e filtrar por curso e série
        api.get(`/school`).then(async (res) => {
          const allSchools = res.data || [];
          const validSchools: School[] = [];
          for (const school of allSchools) {
            try {
              const turmasRes = await api.get(`/classes/school/${school.id}`);
              const turmas = turmasRes.data || [];
              const hasValidClass = turmas.some((t: any) => String(t.grade_id) === String(selectedGrade));
              if (hasValidClass) {
                validSchools.push(school);
              }
            } catch (err) { }
          }
          setFilteredSchools(validSchools);
          if (validSchools.length === 0) {
            setNoSchoolsMessage("Nenhuma escola encontrada com turma para o curso e série selecionados.");
          }
        }).catch(() => {
          setFilteredSchools([]);
          setNoSchoolsMessage("Erro ao buscar escolas.");
        }).finally(() => setSchoolsLoading(false));
      } else {
        // Para não-admin, buscar todas as escolas
        api.get(`/school`).then((res) => {
          setSchools(res.data || []);
        }).catch(() => {
          setSchools([]);
          setNoSchoolsMessage("Erro ao buscar escolas.");
        }).finally(() => setSchoolsLoading(false));
      }
    } else if (selectedMunicipality) {
      setSchools([]);
      setFilteredSchools([]);
      setClasses([]);
      setNoSchoolsMessage("");
      setNoClassesMessage("");
      form.setValue("selectedSchools", []);
      form.setValue("selectedClasses", []);

      if (user?.role === "admin" && selectedCourse && selectedGrade) {
        // Fluxo para admin: filtrar escolas por curso e série
        setSchoolsLoading(true);
        api.get(`/school/city/${selectedMunicipality}`)
          .then(async (response) => {
            const allSchools = response.data || [];
            const validSchools: School[] = [];

            for (const school of allSchools) {
              try {
                const turmasRes = await api.get(`/classes/school/${school.id}`);
                const turmas = turmasRes.data || [];
                // Verifica se tem turma com a série selecionada
                const hasValidClass = turmas.some((t: any) => String(t.grade_id) === String(selectedGrade));
                if (hasValidClass) {
                  validSchools.push(school);
                }
              } catch (err) {
                // Ignorar erro de escola específica
              }
            }

            setFilteredSchools(validSchools);
            if (validSchools.length === 0) {
              setNoSchoolsMessage("Nenhuma escola encontrada com turma para o curso e série selecionados.");
            }
          })
          .catch(() => {
            setFilteredSchools([]);
            setNoSchoolsMessage("Erro ao buscar escolas.");
          })
          .finally(() => setSchoolsLoading(false));
      } else {
        // Fluxo para outros usuários: buscar todas as escolas do município
        const loadSchoolsForNonAdmin = async () => {
          try {
            const response = await api.get(`/school/city/${selectedMunicipality}`);
            setSchools(response.data || []);
            // Limpar escolas selecionadas se não estiverem na nova lista
            const currentSchools = form.getValues("selectedSchools");
            if (currentSchools.length > 0) {
              const validSchools = currentSchools.filter(s =>
                response.data.find((school: School) => school.id === s.id)
              );
              form.setValue("selectedSchools", validSchools);
            }
          } catch (error) {
            console.error("Erro ao carregar escolas:", error);
            setSchools([]);
          }
        };
        loadSchoolsForNonAdmin();
      }
    }
  }, [selectedMunicipality, selectedGrade, selectedCourse, user?.role, form]);

  // Novo fluxo: Buscar turmas válidas para admin
  useEffect(() => {
    if (
      user?.role === "admin" &&
      selectedSchools.length > 0 &&
      selectedGrade &&
      selectedMunicipality
    ) {
      setClassesLoading(true);
      setNoClassesMessage("");

      // Buscar turmas de todas as escolas selecionadas
      const fetchAllClasses = async () => {
        try {
          const allClasses: any[] = [];

          for (const school of selectedSchools) {
            try {
              const response = await api.get(`/classes/school/${school.id}`);
              const schoolClasses = response.data || [];
              // Adicionar informação da escola em cada turma
              const classesWithSchool = schoolClasses.map((classItem: any) => ({
                ...classItem,
                school: { id: school.id, name: school.name }
              }));
              allClasses.push(...classesWithSchool);
            } catch (err) {
              console.error(`Erro ao buscar turmas da escola ${school.name}:`, err);
            }
          }

          // Filtrar turmas por série
          const filteredClasses = allClasses.filter((classItem: any) =>
            String(classItem.grade_id) === String(selectedGrade)
          );

          setClasses(filteredClasses);
          if (filteredClasses.length === 0) {
            setNoClassesMessage("Não existe turma cadastrada para essas escolas, curso e série.");
          }
        } catch (error) {
          setClasses([]);
          setNoClassesMessage("Erro ao buscar turmas das escolas.");
        } finally {
          setClassesLoading(false);
        }
      };

      fetchAllClasses();
    }
  }, [user?.role, selectedSchools, selectedGrade, selectedMunicipality]);

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

  const handleClassToggle = (classItem: ClassInfo) => {
    const current = selectedClasses;
    const exists = current.find(c => c.id === classItem.id);

    if (exists) {
      // Remover turma
      const updated = current.filter(c => c.id !== classItem.id);
      form.setValue("selectedClasses", updated);
    } else {
      // Adicionar turma
      const updated = [...current, classItem];
      form.setValue("selectedClasses", updated);
    }
  };

  const handleRemoveClass = (classId: string) => {
    const updated = selectedClasses.filter(c => c.id !== classId);
    form.setValue("selectedClasses", updated);
  };

  const handleSelectAllSubjects = () => {
    form.setValue("subjects", subjects);
    toast({
      title: "Todas as disciplinas selecionadas",
      description: `${subjects.length} disciplinas foram selecionadas`,
    });
  };

  const handleSelectAllClasses = () => {
    form.setValue("selectedClasses", classes);
    toast({
      title: "Todas as turmas selecionadas",
      description: `${classes.length} turmas foram selecionadas`,
    });
  };

  const handleSchoolToggle = (school: School) => {
    const current = selectedSchools;
    const exists = current.find(s => s.id === school.id);

    if (exists) {
      // Remover escola
      const updated = current.filter(s => s.id !== school.id);
      form.setValue("selectedSchools", updated);
    } else {
      // Adicionar escola
      const updated = [...current, { id: school.id, name: school.name }];
      form.setValue("selectedSchools", updated);
    }
  };

  const handleRemoveSchool = (schoolId: string) => {
    const updated = selectedSchools.filter(s => s.id !== schoolId);
    form.setValue("selectedSchools", updated);
  };

  const handleSelectAllSchools = () => {
    // Para admin, usar filteredSchools; para outros, usar schools
    const schoolsToSelect = user?.role === "admin"
      ? filteredSchools.map(s => ({ id: s.id, name: s.name }))
      : schools.map(s => ({ id: s.id, name: s.name }));

    form.setValue("selectedSchools", schoolsToSelect);
    toast({
      title: "Todas as escolas selecionadas",
      description: `${schoolsToSelect.length} escolas foram selecionadas`,
    });
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
        subjects: values.subjects as Subject[],
        subject: values.subjects[0]?.id || "", // Para compatibilidade
        duration: values.duration,
        // Tratar estado e município "all"
        state: values.state === "all" ? undefined : values.state,
        municipality: values.municipality === "all" ? undefined : values.municipality,
        // Usar apenas os arrays de IDs para a API
        municipalities: values.municipality === "all"
          ? [] // Se "all", enviar array vazio ou todos os municípios
          : [values.municipality],
        schools: values.selectedSchools.map(s => s.id),
        classes: values.selectedClasses.map(c => c.id),
        // Manter objetos completos para uso no frontend
        selectedSchools: values.selectedSchools as { id: string; name: string; }[],
        selectedClasses: values.selectedClasses as ClassInfo[],
        // Para compatibilidade (primeiro item)
        classId: values.selectedClasses[0]?.id || "",
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

            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
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

        {/* Localização */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-red-500" />
              Localização
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">Todos os estados</SelectItem>
                        {states.map((state) => (
                          <SelectItem key={state.id} value={state.id}>
                            {state.name} ({state.uf})
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
                name="municipality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Município *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={!selectedState}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={!selectedState ? "Selecione um estado primeiro" : "Selecione o município"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">Todos os municípios</SelectItem>
                        {filteredMunicipalities.map((municipality) => (
                          <SelectItem key={municipality.id} value={municipality.id}>
                            {municipality.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Escolas */}
            <FormField
              control={form.control}
              name="selectedSchools"
              render={() => (
                <FormItem>
                  <FormLabel>Selecione as escolas *</FormLabel>
                  <FormDescription>
                    Escolha as escolas onde a avaliação será aplicada
                  </FormDescription>

                  {/* Escolas Selecionadas */}
                  {selectedSchools.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Escolas selecionadas:</Label>
                      <div className="flex flex-wrap gap-2">
                        {selectedSchools.map((school) => (
                          <Badge
                            key={school.id}
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            {school.name}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 hover:bg-transparent"
                              onClick={() => handleRemoveSchool(school.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Botão Selecionar Todas */}
                  {(user?.role === "admin" ? filteredSchools.length > 0 : schools.length > 0) && (
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAllSchools}
                        disabled={selectedSchools.length === (user?.role === "admin" ? filteredSchools.length : schools.length) || !selectedMunicipality}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Selecionar Todas ({user?.role === "admin" ? filteredSchools.length : schools.length})
                      </Button>
                    </div>
                  )}

                  {/* Lista de Escolas Disponíveis */}
                  {selectedMunicipality ? (
                    <>
                      {user?.role === "admin" ? (
                        schoolsLoading ? (
                          <div className="text-center py-4">Carregando escolas...</div>
                        ) : filteredSchools.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
                            {filteredSchools.map((school) => {
                              const isSelected = selectedSchools.find(s => s.id === school.id);
                              return (
                                <div key={school.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={school.id}
                                    checked={!!isSelected}
                                    onCheckedChange={() => handleSchoolToggle(school)}
                                  />
                                  <Label
                                    htmlFor={school.id}
                                    className="text-sm cursor-pointer flex-1"
                                  >
                                    <div className="flex flex-col">
                                      <span>{school.name}</span>
                                      {school.address && (
                                        <span className="text-xs text-muted-foreground">
                                          {school.address}
                                        </span>
                                      )}
                                    </div>
                                  </Label>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="col-span-full text-center text-muted-foreground py-4">
                            {noSchoolsMessage || "Nenhuma escola encontrada neste município"}
                          </div>
                        )
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
                          {schools.length > 0 ? (
                            schools.map((school) => {
                              const isSelected = selectedSchools.find(s => s.id === school.id);
                              return (
                                <div key={school.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={school.id}
                                    checked={!!isSelected}
                                    onCheckedChange={() => handleSchoolToggle(school)}
                                  />
                                  <Label
                                    htmlFor={school.id}
                                    className="text-sm cursor-pointer flex-1"
                                  >
                                    <div className="flex flex-col">
                                      <span>{school.name}</span>
                                      {school.address && (
                                        <span className="text-xs text-muted-foreground">
                                          {school.address}
                                        </span>
                                      )}
                                    </div>
                                  </Label>
                                </div>
                              );
                            })
                          ) : (
                            <div className="col-span-full text-center text-muted-foreground py-4">
                              Nenhuma escola encontrada neste município
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="border rounded-md p-6 text-center text-muted-foreground">
                      Selecione um município para carregar as escolas disponíveis
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
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

                  {/* Botão Selecionar Todas */}
                  {subjects.length > 0 && (
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAllSubjects}
                        disabled={selectedSubjects.length === subjects.length}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Selecionar Todas ({subjects.length})
                      </Button>
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

        {/* Turmas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-500" />
              Turmas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="selectedClasses"
              render={() => (
                <FormItem>
                  <FormLabel>Selecione as turmas *</FormLabel>
                  <FormDescription>
                    Escolha as turmas que participarão desta avaliação
                  </FormDescription>

                  {/* Turmas Selecionadas */}
                  {selectedClasses.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Turmas selecionadas:</Label>
                      <div className="flex flex-wrap gap-2">
                        {selectedClasses.map((classItem: ClassInfo) => (
                          <Badge
                            key={classItem.id}
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            {classItem.grade?.name ? `${classItem.grade.name} ${classItem.name}` : classItem.name}
                            {classItem.students_count !== undefined && (
                              <span className="text-xs ml-1">({classItem.students_count} alunos)</span>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 hover:bg-transparent"
                              onClick={() => handleRemoveClass(classItem.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Botão Selecionar Todas */}
                  {classes.length > 0 && (
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAllClasses}
                        disabled={selectedClasses.length === classes.length || !selectedGrade}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Selecionar Todas ({classes.length})
                      </Button>
                    </div>
                  )}

                  {/* Lista de Turmas Disponíveis */}
                  {selectedGrade ? (
                    <>
                      {classesLoading ? (
                        <div className="text-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                          <span className="text-sm text-muted-foreground">Carregando turmas...</span>
                        </div>
                      ) : noClassesMessage ? (
                        <div className="col-span-full text-center text-muted-foreground py-4">
                          {noClassesMessage}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
                          {classes.length > 0 ? (
                            classes.map((classItem: ClassInfo) => {
                              const isSelected = selectedClasses.find(c => c.id === classItem.id);
                              return (
                                <div key={classItem.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={classItem.id}
                                    checked={!!isSelected}
                                    onCheckedChange={() => handleClassToggle(classItem)}
                                  />
                                  <Label
                                    htmlFor={classItem.id}
                                    className="text-sm cursor-pointer flex-1"
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-medium">
                                        {classItem.grade?.name ? `${classItem.grade.name} ${classItem.name}` : classItem.name}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {classItem.school?.name || "Escola não definida"}
                                      </span>
                                      {classItem.students_count !== undefined && (
                                        <span className="text-xs text-muted-foreground">
                                          {classItem.students_count} alunos
                                        </span>
                                      )}
                                    </div>
                                  </Label>
                                </div>
                              );
                            })
                          ) : (
                            <div className="col-span-full text-center text-muted-foreground py-4">
                              Nenhuma turma encontrada para esta série
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="border rounded-md p-6 text-center text-muted-foreground">
                      Selecione uma série para carregar as turmas disponíveis
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Validações Finais */}
        {selectedSubjects.length === 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Você precisa selecionar pelo menos uma disciplina antes de continuar.
            </AlertDescription>
          </Alert>
        )}

        {selectedClasses.length === 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Você precisa selecionar pelo menos uma turma antes de continuar.
            </AlertDescription>
          </Alert>
        )}

        {selectedSchools.length === 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Você precisa selecionar pelo menos uma escola antes de continuar.
            </AlertDescription>
          </Alert>
        )}

        {/* Botão de Submit */}
        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            disabled={isLoading || selectedSubjects.length === 0 || selectedClasses.length === 0 || selectedSchools.length === 0}
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