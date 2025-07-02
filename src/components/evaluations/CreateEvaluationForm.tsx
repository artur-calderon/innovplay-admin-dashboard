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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Check, X, Loader2, BookOpen, CheckCheck } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/authContext";

// Schema de validação
const evaluationSchema = z.object({
  name: z.string().min(3, "O nome deve ter no mínimo 3 caracteres"),
  description: z.string().min(3, "A descrição é obrigatória"),
  state: z.string().min(1, "Selecione um estado"),
  municipio: z.string().min(1, "Selecione um município"),
  school: z.string().min(1, "Selecione uma escola"),
  course: z.string().min(1, "Selecione um curso"),
  grade: z.string().min(1, "Selecione uma série"),
  startDateTime: z.string().min(1, "Selecione data e horário de início"),
  endDateTime: z.string().min(1, "Selecione data e horário de término"),
  duration: z.string().min(1, "Informe o tempo de duração"),
  evaluationMode: z.enum(["virtual", "physical"], {
    required_error: "Selecione o modo de avaliação",
  }),
  subjects: z.array(z.string()).min(1, "Selecione pelo menos uma disciplina"),
  classes: z.array(z.string()).min(1, "Selecione pelo menos uma turma"),
}).refine((data) => {
  if (data.startDateTime && data.endDateTime) {
    return new Date(data.endDateTime) > new Date(data.startDateTime);
  }
  return true;
}, {
  message: "A data de término deve ser posterior à data de início",
  path: ["endDateTime"],
});

type EvaluationFormValues = z.infer<typeof evaluationSchema>;

// Tipos para as entidades
interface City {
  id: string;
  name: string;
  state: string;
}

interface School {
  id: string;
  name: string;
  city_id: string;
}

interface Class {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
}

interface EducationStage { 
  id: string; 
  name: string; 
}

interface Grade { 
  id: string; 
  name: string; 
}

// Tipo para o payload da avaliação
interface EvaluationPayload {
  name: string;
  description: string;
  type: string;
  model: string;
  course: string;
  grade: string;
  subjects: string[];
  school: string;
  municipio: string;
  startDateTime: string;
  endDateTime: string;
  duration: string;
  evaluationMode: "virtual" | "physical";
  classes: string[];
  created_by: string;
  questions: unknown[];
}

// Tipo para dados iniciais
interface InitialData {
  title?: string;
  description?: string;
  municipalities?: string[];
  schools?: string[];
  course?: string;
  grade?: string;
  startDateTime?: string;
  endDateTime?: string;
  duration?: string;
  evaluationMode?: "virtual" | "physical";
  subjects?: string[];
  classes?: string[];
}

// Tipo para erro de API
interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

interface CreateEvaluationFormProps {
  onSubmit?: (data: EvaluationPayload) => void;
  initialData?: InitialData;
}

const CreateEvaluationForm: React.FC<CreateEvaluationFormProps> = ({ onSubmit, initialData }) => {
  const form = useForm<EvaluationFormValues>({
    resolver: zodResolver(evaluationSchema),
    defaultValues: {
      name: initialData?.title || "",
      description: initialData?.description || "",
      state: "",
      municipio: initialData?.municipalities?.[0] || "",
      school: initialData?.schools?.[0] || "",
      course: initialData?.course || "",
      grade: initialData?.grade || "",
      startDateTime: initialData?.startDateTime || "",
      endDateTime: initialData?.endDateTime || "",
      duration: initialData?.duration || "",
      evaluationMode: initialData?.evaluationMode || "virtual",
      subjects: initialData?.subjects || [],
      classes: initialData?.classes || [],
    },
  });

  const { toast } = useToast();
  const { user } = useAuth();

  // Estados
  const [cities, setCities] = useState<City[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [municipios, setMunicipios] = useState<City[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [educationStages, setEducationStages] = useState<EducationStage[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);

  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedMunicipio, setSelectedMunicipio] = useState<string>("");
  const [selectedSchool, setSelectedSchool] = useState<string>("");
  const selectedClasses = form.watch("classes") || [];
  const selectedSubjects = form.watch("subjects") || [];
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState<string>("");

  // Watch dos campos de data para calcular duração total
  const startDateTime = form.watch("startDateTime");
  const endDateTime = form.watch("endDateTime");

  // Função para calcular a duração total do período
  const calculateTotalPeriod = () => {
    if (!startDateTime || !endDateTime) return null;
    
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    
    if (end <= start) return null;
    
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffDays > 0) {
      return `${diffDays} dia${diffDays > 1 ? 's' : ''} e ${diffHours}h${diffMinutes}min`;
    } else if (diffHours > 0) {
      return `${diffHours}h${diffMinutes}min`;
    } else {
      return `${diffMinutes} minutos`;
    }
  };

  // Buscar cidades (para estados e municípios)
  useEffect(() => {
    setLoadingCities(true);
    api.get("/city")
      .then(res => {
        setCities(res.data);
        setStates(Array.from(new Set(res.data.map((c: City) => c.state))));
      })
      .catch(() => toast({ title: "Erro", description: "Erro ao carregar cidades", variant: "destructive" }))
      .finally(() => setLoadingCities(false));
  }, []);

  // Filtrar municípios pelo estado
  useEffect(() => {
    setMunicipios(cities.filter(c => c.state === selectedState));
    setSelectedMunicipio("");
    setSchools([]);
    setSelectedSchool("");
    setClasses([]);
    form.setValue("municipio", "");
    form.setValue("school", "");
    form.setValue("classes", []);
  }, [selectedState, cities]);

  // Buscar escolas ao selecionar município
  useEffect(() => {
    if (!selectedMunicipio) return;
    setLoadingSchools(true);
    api.get(`/school/city/${selectedMunicipio}`)
      .then(res => setSchools(res.data))
      .catch(() => toast({ title: "Erro", description: "Erro ao carregar escolas", variant: "destructive" }))
      .finally(() => setLoadingSchools(false));
    setSelectedSchool("");
    setClasses([]);
    form.setValue("school", "");
    form.setValue("classes", []);
  }, [selectedMunicipio]);

  // Buscar turmas ao selecionar escola
  useEffect(() => {
    if (!selectedSchool) return;
    setLoadingClasses(true);
    api.get(`/classes/school/${selectedSchool}`)
      .then(res => setClasses(res.data))
      .catch(() => toast({ title: "Erro", description: "Erro ao carregar turmas", variant: "destructive" }))
      .finally(() => setLoadingClasses(false));
    form.setValue("classes", []);
  }, [selectedSchool]);

  // Buscar disciplinas
  useEffect(() => {
    setLoadingSubjects(true);
    api.get("/subjects")
      .then(res => setSubjects(res.data))
      .catch(() => toast({ title: "Erro", description: "Erro ao carregar disciplinas", variant: "destructive" }))
      .finally(() => setLoadingSubjects(false));
  }, []);

  // Buscar cursos (education stages)
  useEffect(() => {
    api.get("/education_stages")
      .then(res => setEducationStages(res.data))
      .catch(() => toast({ title: "Erro", description: "Erro ao carregar cursos", variant: "destructive" }));
  }, []);

  // Buscar séries ao selecionar curso
  useEffect(() => {
    if (!selectedCourse) return setGrades([]);
    api.get(`/grades/education-stage/${selectedCourse}`)
      .then(res => setGrades(res.data))
      .catch(() => toast({ title: "Erro", description: "Erro ao carregar séries", variant: "destructive" }));
    setSelectedGrade("");
    form.setValue("grade", "");
  }, [selectedCourse]);

  const handleToggleClass = (classId: string) => {
    const current = form.getValues("classes") || [];
    if (current.includes(classId)) {
      form.setValue("classes", current.filter((c) => c !== classId));
    } else {
      form.setValue("classes", [...current, classId]);
    }
  };

  const handleToggleSubject = (subjectId: string) => {
    const current = form.getValues("subjects") || [];
    if (current.includes(subjectId)) {
      form.setValue("subjects", current.filter((s) => s !== subjectId));
    } else {
      form.setValue("subjects", [...current, subjectId]);
    }
  };

  const handleSelectAllSubjects = () => {
    const allSubjectIds = subjects.map(s => s.id);
    const current = form.getValues("subjects") || [];
    
    if (current.length === subjects.length) {
      // Se todos estão selecionados, desmarcar todos
      form.setValue("subjects", []);
      toast({ title: "Disciplinas desmarcadas", description: "Todas as disciplinas foram desmarcadas", variant: "default" });
    } else {
      // Selecionar todos
      form.setValue("subjects", allSubjectIds);
      toast({ title: "Disciplinas selecionadas", description: `${subjects.length} disciplinas selecionadas`, variant: "default" });
    }
  };

  const handleStateChange = (stateId: string) => {
    setSelectedState(stateId);
    form.setValue("state", stateId);
  };

  const handleMunicipioChange = (municipioId: string) => {
    setSelectedMunicipio(municipioId);
    form.setValue("municipio", municipioId);
  };

  const handleSchoolChange = (schoolId: string) => {
    setSelectedSchool(schoolId);
    form.setValue("school", schoolId);
  };

  const handleCourseChange = (courseId: string) => {
    setSelectedCourse(courseId);
    form.setValue("course", courseId);
  };

  const handleGradeChange = (gradeId: string) => {
    setSelectedGrade(gradeId);
    form.setValue("grade", gradeId);
  };

  const handleSubmit = async (values: EvaluationFormValues) => {
    setLoading(true);
    try {
      const payload: EvaluationPayload = {
        name: values.name,
        description: values.description,
        type: "AVALIACAO",
        model: "SAEB",
        course: values.course,
        grade: values.grade,
        subjects: values.subjects,
        school: values.school,
        municipio: values.municipio,
        startDateTime: values.startDateTime,
        endDateTime: values.endDateTime,
        duration: values.duration,
        evaluationMode: values.evaluationMode,
        classes: values.classes,
        created_by: user?.id || "",
        questions: [],
      };
      
      if (onSubmit) {
        onSubmit(payload);
      } else {
        // Se não há onSubmit (modo standalone), criar diretamente
        await api.post("/test", {
          title: values.name,
          description: values.description,
          type: "AVALIACAO",
          model: "SAEB",
          course: values.course,
          grade: values.grade,
          subjects: values.subjects,
          schools: [values.school],
          time_limit: values.startDateTime,
          end_time: values.endDateTime,
          duration: Number(values.duration),
          evaluation_mode: values.evaluationMode,
          classes: values.classes,
          created_by: user?.id || "",
          questions: [],
        });
        toast({ title: "Avaliação criada com sucesso!", variant: "default" });
        form.reset();
      }
    } catch (error: unknown) {
      const apiError = error as ApiError;
      const errorMessage = apiError?.response?.data?.message || apiError?.message || "Erro desconhecido";
      toast({ 
        title: "Erro ao criar avaliação", 
        description: errorMessage, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 max-w-xl mx-auto">
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
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Input placeholder="Breve descrição da avaliação" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="state"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estado</FormLabel>
              <Select onValueChange={handleStateChange} value={selectedState} disabled={loadingCities}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingCities ? "Carregando..." : "Selecione um estado"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {states.map((uf) => (
                    <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="municipio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Município</FormLabel>
              <Select onValueChange={handleMunicipioChange} value={selectedMunicipio} disabled={!selectedState || loadingCities}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingCities ? "Carregando..." : "Selecione um município"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {municipios.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Select onValueChange={handleSchoolChange} value={selectedSchool} disabled={!selectedMunicipio || loadingSchools}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingSchools ? "Carregando..." : "Selecione uma escola"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {schools.map((school) => (
                    <SelectItem key={school.id} value={school.id}>{school.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="course"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Curso</FormLabel>
              <Select onValueChange={handleCourseChange} value={selectedCourse}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um curso" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {educationStages.map((course) => (
                    <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
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
              <FormLabel>Série</FormLabel>
              <Select onValueChange={handleGradeChange} value={selectedGrade} disabled={!selectedCourse}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={!selectedCourse ? "Selecione um curso primeiro" : "Selecione uma série"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {grades.map((grade) => (
                    <SelectItem key={grade.id} value={grade.id}>{grade.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-800 mb-3">
              Período de Disponibilidade da Avaliação
            </h3>
            <p className="text-xs text-blue-600 mb-4">
              Configure quando a avaliação ficará disponível para os alunos realizarem
            </p>
            
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDateTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Data e Horário de Início</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} className="text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDateTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Data e Horário de Término</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} className="text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {calculateTotalPeriod() && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-800">
                    Período de disponibilidade: {calculateTotalPeriod()}
                  </span>
                </div>
                <p className="text-xs text-green-600 mt-1">
                  A avaliação ficará disponível para os alunos durante este período
                </p>
              </div>
            )}
          </div>
          
          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tempo de Duração Individual (minutos)</FormLabel>
                <FormControl>
                  <Input type="number" min={1} placeholder="Ex: 60" {...field} />
                </FormControl>
                <FormMessage />
                <p className="text-xs text-muted-foreground mt-1">
                  Tempo que cada aluno terá para completar a avaliação uma vez iniciada
                </p>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="evaluationMode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Modo de Avaliação</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o modo de avaliação" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="virtual">
                      <div className="flex items-center gap-2">
                        <span>💻</span>
                        <div>
                          <div className="font-medium">Virtual (Online)</div>
                          <div className="text-xs text-muted-foreground">Realizada no computador</div>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="physical">
                      <div className="flex items-center gap-2">
                        <span>📝</span>
                        <div>
                          <div className="font-medium">Presencial (Papel)</div>
                          <div className="text-xs text-muted-foreground">Realizada no papel fisicamente</div>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
                <p className="text-xs text-muted-foreground mt-1">
                  Escolha como a avaliação será realizada pelos alunos
                </p>
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="subjects"
          render={() => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Matérias/Disciplinas</FormLabel>
                {subjects.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAllSubjects}
                    disabled={loadingSubjects}
                    className="text-xs h-6 px-2"
                  >
                    <CheckCheck className="h-3 w-3 mr-1" />
                    {selectedSubjects.length === subjects.length ? "Desmarcar Todas" : "Selecionar Todas"}
                  </Button>
                )}
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between" disabled={loadingSubjects}>
                    {loadingSubjects ? (
                      <span className="flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Carregando...</span>
                    ) : selectedSubjects.length === 0
                      ? (
                        <span className="flex items-center">
                          <BookOpen className="mr-2 h-4 w-4" />
                          Selecionar disciplinas...
                        </span>
                      )
                      : (
                        <span className="flex items-center">
                          <BookOpen className="mr-2 h-4 w-4" />
                          {selectedSubjects.length} disciplina{selectedSubjects.length > 1 ? "s" : ""} selecionada{selectedSubjects.length > 1 ? "s" : ""}
                        </span>
                      )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-4" align="start">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-sm font-medium">Selecionar Disciplinas</span>
                      <Badge variant="outline" className="text-xs">
                        {selectedSubjects.length}/{subjects.length}
                      </Badge>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAllSubjects}
                        className="flex-1 text-xs"
                      >
                        <CheckCheck className="h-3 w-3 mr-1" />
                        {selectedSubjects.length === subjects.length ? "Desmarcar Todas" : "Selecionar Todas"}
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                      {subjects.map((subject) => (
                        <div
                          key={subject.id}
                          className={`flex cursor-pointer items-center rounded-md border p-2 transition-colors ${
                            selectedSubjects.includes(subject.id) 
                              ? "border-primary bg-primary/10 text-primary" 
                              : "hover:border-primary/50 hover:bg-muted/50"
                          }`}
                          onClick={() => handleToggleSubject(subject.id)}
                        >
                          <div className="flex-grow text-sm">{subject.name}</div>
                          {selectedSubjects.includes(subject.id) && <Check className="ml-2 h-4 w-4 text-primary" />}
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedSubjects.length > 0 ? (
                  selectedSubjects.map((subjectId) => {
                    const subjectObj = subjects.find((s) => s.id === subjectId);
                    return (
                      <Badge key={subjectId} variant="secondary" className="hover:bg-secondary/80">
                        <BookOpen className="h-3 w-3 mr-1" />
                        {subjectObj?.name || subjectId}
                        <X 
                          className="ml-1 h-3 w-3 cursor-pointer hover:text-destructive" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSubject(subjectId);
                          }} 
                        />
                      </Badge>
                    );
                  })
                ) : (
                  <div className="text-sm text-muted-foreground flex items-center">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Nenhuma disciplina selecionada
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Selecione uma ou mais disciplinas para esta avaliação
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="classes"
          render={() => (
            <FormItem>
              <FormLabel>Turmas</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between" disabled={!selectedSchool || loadingClasses}>
                    {loadingClasses ? (
                      <span className="flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Carregando...</span>
                    ) : selectedClasses.length === 0
                      ? "Selecionar turmas..."
                      : `${selectedClasses.length} turma${selectedClasses.length > 1 ? "s" : ""} selecionada${selectedClasses.length > 1 ? "s" : ""}`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-4" align="start">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {classes.map((classItem) => (
                      <div
                        key={classItem.id}
                        className={`flex cursor-pointer items-center rounded-md border p-2 ${selectedClasses.includes(classItem.id) ? "border-primary bg-primary/10" : "hover:border-primary/50"}`}
                        onClick={() => handleToggleClass(classItem.id)}
                      >
                        <div className="flex-grow text-sm">{classItem.name}</div>
                        {selectedClasses.includes(classItem.id) && <Check className="ml-2 h-4 w-4 text-primary" />}
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedClasses.length > 0 ? (
                  selectedClasses.map((classId) => {
                    const classObj = classes.find((c) => c.id === classId);
                    return (
                      <Badge key={classId} variant="secondary">
                        {classObj?.name || classId}
                        <X className="ml-1 h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => handleToggleClass(classId)} />
                      </Badge>
                    );
                  })
                ) : (
                  <div className="text-sm text-muted-foreground">Nenhuma turma selecionada</div>
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" className="flex items-center" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Criar Avaliação
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default CreateEvaluationForm; 