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
import { Check, X, Loader2 } from "lucide-react";
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
  startDateTime: z.string().min(1, "Selecione data e horário"),
  duration: z.string().min(1, "Informe o tempo de duração"),
  subject: z.string().min(1, "Selecione uma disciplina"),
  classes: z.array(z.string()).min(1, "Selecione pelo menos uma turma"),
});

type EvaluationFormValues = z.infer<typeof evaluationSchema>;

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
interface EducationStage { id: string; name: string; }
interface Grade { id: string; name: string; }

interface CreateEvaluationFormProps {
  onSubmit?: (data: any) => void;
  initialData?: any;
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
      duration: initialData?.duration || "",
      subject: initialData?.subject || "",
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
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState<string>("");

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
    api.get(`/school?city_id=${selectedMunicipio}`)
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
      const payload = {
        name: values.name, // Manter o campo como 'name' para compatibilidade com Step1
        description: values.description,
        type: "AVALIACAO",
        model: "SAEB",
        course: values.course,
        grade: values.grade,
        subject: values.subject,
        school: values.school, // Manter como string única
        municipio: values.municipio,
        startDateTime: values.startDateTime,
        duration: values.duration,
        classes: values.classes,
        created_by: user?.id || "",
        questions: [], // será preenchido no passo 2
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
          subject: values.subject,
          schools: [values.school],
          time_limit: values.startDateTime,
          duration: Number(values.duration),
          classes: values.classes,
          created_by: user?.id || "",
          questions: [],
        });
        toast({ title: "Avaliação criada com sucesso!", variant: "default" });
        form.reset();
      }
    } catch (e: any) {
      toast({ title: "Erro ao criar avaliação", description: e?.response?.data?.message || "Erro desconhecido", variant: "destructive" });
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="startDateTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data e Horário de Início</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tempo de Duração (minutos)</FormLabel>
                <FormControl>
                  <Input type="number" min={1} placeholder="Ex: 60" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Matéria/Disciplina</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={loadingSubjects}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingSubjects ? "Carregando..." : "Selecione uma disciplina"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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