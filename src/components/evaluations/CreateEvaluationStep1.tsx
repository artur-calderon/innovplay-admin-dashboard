import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus, X, MapPin, School, Users, BookOpen, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/authContext";
import { useToast } from "@/hooks/use-toast";
import { EvaluationFormData } from "./types";

import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "./results/constants";
import { scrollToFirstError, getFieldLabel } from "@/utils/formValidation";

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
  duration: z.string().min(1, "Informe a duração em minutos").regex(/^\d+$/, "Duração deve ser um número")
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

interface Subject {
  id: string;
  name: string;
}

interface ClassInfo {
  id: string;
  name: string;
  school?: {
    id: string;
    name: string;
  };
}

interface State {
  id: string;
  name: string;
}

interface Municipality {
  id: string;
  name: string;
  state_id?: string;
}

interface School {
  id: string;
  name: string;
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
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
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

  // Flag para controlar carregamento inicial de escolas
  const didInitSchools = useRef(false);

  const { toast } = useToast();

  const form = useForm<Step1FormValues>({
    resolver: zodResolver(step1Schema),
    mode: "onSubmit", // Só validar quando submeter
    reValidateMode: "onSubmit", // Só revalidar quando submeter
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      type: initialData?.type || "AVALIACAO",
      model: initialData?.model || "SAEB",
      course: initialData?.course || "",
      grade: initialData?.grade || "",
      state: initialData?.state || "",
      municipality: initialData?.municipality || "",
      selectedSchools: initialData?.selectedSchools || [],
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
  
  // Estados para controlar liberação progressiva
  const title = form.watch("title");
  const type = form.watch("type");
  const model = form.watch("model");
  const duration = form.watch("duration");
  
  // Funções para controlar liberação progressiva
  const isTitleValid = title && title.trim().length >= 3;
  const isBasicInfoValid = isTitleValid && type && model && duration;
  const isCourseValid = isBasicInfoValid && selectedCourse;
  const isGradeValid = isCourseValid && selectedGrade;
  const isLocationValid = isGradeValid && selectedState;
  const isMunicipalityValid = isLocationValid && selectedMunicipality;
  const isSchoolsValid = isMunicipalityValid && selectedSchools.length > 0;
  const isSubjectsValid = isSchoolsValid && selectedSubjects.length > 0;
  const isClassesValid = isSubjectsValid && selectedClasses.length > 0;

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

  // Processar dados iniciais após carregamento
  useEffect(() => {
    if (!loadingData && initialData) {
      if (initialData.state) {
        form.setValue("state", initialData.state);
      }
      if (initialData.municipality) {
        form.setValue("municipality", initialData.municipality);
      }
      if (initialData.selectedSchools && initialData.selectedSchools.length > 0) {
        form.setValue("selectedSchools", initialData.selectedSchools);
      }
      if (initialData.subjects && initialData.subjects.length > 0) {
        form.setValue("subjects", initialData.subjects);
      }
      if (initialData.selectedClasses && initialData.selectedClasses.length > 0) {
        form.setValue("selectedClasses", initialData.selectedClasses);
      }
    }
  }, [loadingData, initialData, form]);

  // Carregar municípios quando estado inicial for definido
  useEffect(() => {
    if (!loadingData && initialData?.state && initialData.state !== 'all' && states.length > 0) {
      const loadMunicipalitiesForInitialState = async () => {
        try {
          const response = await api.get(`/city/municipalities/state/${initialData.state}`);
          setMunicipalities(response.data || []);
          setFilteredMunicipalities(response.data || []);
        } catch (error) {
          console.error("Erro ao carregar municípios do estado inicial:", error);
        }
      };

      loadMunicipalitiesForInitialState();
    } else if (!loadingData && (!initialData?.state || initialData.state === 'all')) {
      setMunicipalities([]);
      setFilteredMunicipalities([]);
      form.setValue("municipality", "", { shouldValidate: true, shouldDirty: true });
    }
  }, [loadingData, initialData?.state, states, form]);

  // Carregar escolas quando município inicial for definido
  useEffect(() => {
    if (
      !didInitSchools.current &&
      !loadingData && 
      initialData?.municipality && 
      initialData.municipality !== 'all' && 
      municipalities.length > 0 &&
      selectedState === initialData?.state
    ) {
      const loadSchoolsForInitialMunicipality = async () => {
        try {
          // ✅ NOVO: Usar rota por série se houver série selecionada
          let schoolsData = [];
          if (initialData?.grade) {
            const response = await api.get(`/school/by-grade/${initialData.grade}`);
            schoolsData = response.data?.schools || [];
          } else {
            const response = await api.get(`/school/city/${initialData.municipality}`);
            schoolsData = response.data || [];
          }
          
          setSchools(schoolsData);
          setFilteredSchools(schoolsData);
        } catch (error) {
          console.error("Erro ao carregar escolas do município inicial:", error);
          setSchools([]);
          setFilteredSchools([]);
        }
      };

      loadSchoolsForInitialMunicipality();
      didInitSchools.current = true;
    } else if (!loadingData && (!initialData?.municipality || initialData.municipality === 'all')) {
      setSchools([]);
      setFilteredSchools([]);
      form.setValue("selectedSchools", [], { shouldValidate: true, shouldDirty: true });
    }
  }, [loadingData, initialData?.municipality, municipalities, initialData?.selectedSchools, form, selectedState, initialData?.state, initialData?.grade]);

  // Carregar turmas quando escolas iniciais forem definidas
  useEffect(() => {
    if (!loadingData && 
        initialData?.selectedSchools && 
        initialData.selectedSchools.length > 0 && 
        initialData?.grade &&
        initialData?.municipality &&
        initialData.municipality !== 'all') {
      
      const loadClassesForInitialSchools = async () => {
        try {
          const allClasses: any[] = [];

          for (const school of initialData.selectedSchools) {
            try {
              const response = await api.get(`/classes/school/${school.id}`);
              const schoolClasses = response.data || [];
              
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
            String(classItem.grade_id) === String(initialData.grade)
          );

          setClasses(filteredClasses);
        } catch (error) {
          console.error("Erro ao carregar turmas das escolas iniciais:", error);
        }
      };

      loadClassesForInitialSchools();
    }
  }, [loadingData, initialData?.selectedSchools, initialData?.grade]);

  // Carregar séries quando curso mudar
  useEffect(() => {
    if (selectedCourse) {
      const loadGrades = async () => {
        try {
          const response = await api.get(`/grades/education-stage/${selectedCourse}`);
          setGrades(response.data || []);

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
        const schoolId = selectedSchools[0].id;
        const response = await api.get(`/classes/school/${schoolId}`);
        const allClasses = response.data || [];

        const filteredClasses = allClasses.filter((classItem: any) =>
          String(classItem.grade_id).trim() === String(selectedGrade).trim()
        );

        setClasses(filteredClasses);

        const currentClasses = form.getValues("selectedClasses");
        if (currentClasses.length > 0) {
          const validClasses = currentClasses.filter(c =>
            filteredClasses.find((cl: { id: string }) => cl.id === c.id)
          );
          form.setValue("selectedClasses", validClasses, { shouldValidate: true, shouldDirty: true });
        } else {
          form.setValue("selectedClasses", [], { shouldValidate: true, shouldDirty: true });
        }
      } catch (error) {
        console.error("Erro ao buscar turmas da escola:", error);
        setClasses([]);
        form.setValue("selectedClasses", []);
      }
    };

    if (!loadingData) {
      fetchFilteredClasses();
    }
  }, [selectedGrade, selectedSchools, selectedMunicipality, form, loadingData, initialData]);

  // Carregar municípios quando estado mudar
  useEffect(() => {
    // Reset da flag de inicialização quando estado muda
    didInitSchools.current = false;
    
    if (selectedState === 'all') {
      setMunicipalities([]);
      setFilteredMunicipalities([]);
      form.setValue("municipality", "all");
      setSchools([]);
      setFilteredSchools([]);
      setClasses([]);
      setNoSchoolsMessage("");
      setNoClassesMessage("");
      form.setValue("selectedSchools", [], { shouldValidate: true, shouldDirty: true });
      form.setValue("selectedClasses", [], { shouldValidate: true, shouldDirty: true });
    } else if (selectedState) {
      form.setValue("municipality", "");
      setSchools([]);
      setFilteredSchools([]);
      setClasses([]);
      setNoSchoolsMessage("");
      setNoClassesMessage("");
      form.setValue("selectedSchools", [], { shouldValidate: true, shouldDirty: true });
      form.setValue("selectedClasses", [], { shouldValidate: true, shouldDirty: true });
      
      // Carregar municípios do novo estado
      api.get(`/city/municipalities/state/${selectedState}`)
        .then(res => {
          setMunicipalities(res.data || []);
          setFilteredMunicipalities(res.data || []);
        })
        .catch(err => {
          console.error("Erro ao carregar municípios:", err);
          setMunicipalities([]);
          setFilteredMunicipalities([]);
        });
    } else if (!selectedState) {
      setMunicipalities([]);
      setFilteredMunicipalities([]);
      form.setValue("municipality", "");
      setSchools([]);
      setFilteredSchools([]);
      setClasses([]);
      setNoSchoolsMessage("");
      setNoClassesMessage("");
      form.setValue("selectedSchools", [], { shouldValidate: true, shouldDirty: true });
      form.setValue("selectedClasses", [], { shouldValidate: true, shouldDirty: true });
    }
  }, [selectedState, form, initialData?.state]);

  // ✅ NOVO: Carregar escolas quando município OU série mudar
  useEffect(() => {
    const loadSchools = async () => {
      // Não carregar se não houver município ou se for 'all'
      if (!selectedMunicipality || selectedMunicipality === 'all') {
        return;
      }

      setSchoolsLoading(true);
      setNoSchoolsMessage("");

      try {
        let schoolsData = [];
        
        // ✅ PRIORIDADE: Se houver série selecionada, buscar apenas escolas com aquela série
        if (selectedGrade) {
          const response = await api.get(`/school/by-grade/${selectedGrade}`);
          schoolsData = response.data?.schools || [];
          
          if (schoolsData.length === 0) {
            setNoSchoolsMessage("Não existem escolas com turmas cadastradas para esta série neste município.");
          }
        } else {
          // Se NÃO houver série, buscar todas as escolas do município
          const response = await api.get(`/school/city/${selectedMunicipality}`);
          schoolsData = response.data || [];
          
          if (schoolsData.length === 0) {
            setNoSchoolsMessage("Não existem escolas cadastradas neste município.");
          }
        }
        
        setSchools(schoolsData);
        setFilteredSchools(schoolsData);

        // Validar e limpar escolas inválidas após fetch
        const currentSchools = form.getValues("selectedSchools");
        if (currentSchools.length > 0) {
          const validSchools = currentSchools.filter(s =>
            schoolsData.find((school: School) => school.id === s.id)
          );
          form.setValue("selectedSchools", validSchools, { shouldValidate: true, shouldDirty: true });
        } else {
          form.setValue("selectedSchools", [], { shouldValidate: true, shouldDirty: true });
        }
      } catch (error) {
        console.error("Erro ao carregar escolas:", error);
        setSchools([]);
        setFilteredSchools([]);
        setNoSchoolsMessage("Erro ao carregar escolas.");
      } finally {
        setSchoolsLoading(false);
      }
    };

    loadSchools();
  }, [selectedMunicipality, selectedGrade, form]);

  // Buscar turmas válidas para admin
  useEffect(() => {
    if (
      user?.role === "admin" &&
      selectedSchools.length > 0 &&
      selectedGrade &&
      selectedMunicipality
    ) {
      setClassesLoading(true);
      setNoClassesMessage("");

      const fetchAllClasses = async () => {
        try {
          const allClasses: any[] = [];

          for (const school of selectedSchools) {
            try {
              const response = await api.get(`/classes/school/${school.id}`);
              const schoolClasses = response.data || [];
              
              const classesWithSchool = schoolClasses.map((classItem: any) => ({
                ...classItem,
                school: { id: school.id, name: school.name }
              }));
              allClasses.push(...classesWithSchool);
            } catch (err) {
              console.error(`Erro ao buscar turmas da escola ${school.name}:`, err);
            }
          }

          const filteredClasses = allClasses.filter((classItem: any) =>
            String(classItem.grade_id) === String(selectedGrade)
          );

          setClasses(filteredClasses);
          
          const currentClasses = form.getValues("selectedClasses");
          if (currentClasses.length > 0) {
            const validClasses = currentClasses.filter(c =>
              filteredClasses.find((cl: { id: string }) => cl.id === c.id)
            );
            form.setValue("selectedClasses", validClasses, { shouldValidate: true, shouldDirty: true });
          } else {
            form.setValue("selectedClasses", [], { shouldValidate: true, shouldDirty: true });
          }
          
          if (filteredClasses.length === 0) {
            setNoClassesMessage("Não existe turma cadastrada para essas escolas, curso e série.");
          }
        } catch (error) {
          console.error("Erro ao buscar turmas das escolas:", error);
          setClasses([]);
          setNoClassesMessage("Erro ao buscar turmas das escolas.");
        } finally {
          setClassesLoading(false);
        }
      };

      fetchAllClasses();
    }
  }, [user?.role, selectedSchools, selectedGrade, selectedMunicipality, initialData?.selectedClasses]);

  // Limpar turmas quando série muda
  useEffect(() => {
    if (!loadingData) {
      form.setValue("selectedClasses", [], { shouldValidate: true, shouldDirty: true });
    }
  }, [selectedGrade, loadingData, initialData?.selectedClasses, form]);

  // Limpar turmas quando escolas mudam
  useEffect(() => {
    if (!loadingData) {
      form.setValue("selectedClasses", [], { shouldValidate: true, shouldDirty: true });
    }
  }, [selectedSchools, loadingData, form]);

  // Limpar turmas quando município muda
  useEffect(() => {
    if (!loadingData) {
      form.setValue("selectedClasses", [], { shouldValidate: true, shouldDirty: true });
    }
  }, [selectedMunicipality, loadingData, form]);

  const handleSubjectToggle = (subject: Subject) => {
    const current = selectedSubjects;
    const exists = current.find(s => s.id === subject.id);

    if (exists) {
      const updated = current.filter(s => s.id !== subject.id);
      form.setValue("subjects", updated);
    } else {
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
      const updated = current.filter(c => c.id !== classItem.id);
      form.setValue("selectedClasses", updated);
    } else {
      const updated = [...current, classItem];
      form.setValue("selectedClasses", updated);
    }
  };

  const handleRemoveClass = (classId: string) => {
    const updated = selectedClasses.filter(c => c.id !== classId);
    form.setValue("selectedClasses", updated);
  };

  const handleSchoolToggle = (school: School) => {
    const current = selectedSchools;
    const exists = current.find(s => s.id === school.id);

    if (exists) {
      const updated = current.filter(s => s.id !== school.id);
      form.setValue("selectedSchools", updated);
    } else {
      const updated = [...current, { id: school.id, name: school.name }];
      form.setValue("selectedSchools", updated);
    }
  };

  const handleRemoveSchool = (schoolId: string) => {
    const updated = selectedSchools.filter(s => s.id !== schoolId);
    form.setValue("selectedSchools", updated);
  };

  const handleSelectAllSchools = () => {
    const schoolsToSelect = filteredSchools.length > 0
      ? filteredSchools.map(s => ({ id: s.id, name: s.name }))
      : schools.map(s => ({ id: s.id, name: s.name }));

    form.setValue("selectedSchools", schoolsToSelect);
    toast({
      title: "Todas as escolas selecionadas",
      description: `${schoolsToSelect.length} escolas foram selecionadas`,
    });
  };

  const handleSelectAllClasses = () => {
    form.setValue("selectedClasses", classes);
    toast({
      title: "Todas as turmas selecionadas",
      description: `${classes.length} turmas foram selecionadas`,
    });
  };

  const onSubmit = async (values: Step1FormValues) => {
    setHasAttemptedSubmit(true);
    
    // Forçar validação do formulário
    const isValid = await form.trigger();
    
    if (!isValid) {
      const errors = form.formState.errors;
      const firstErrorField = Object.keys(errors)[0];
      scrollToFirstError(errors);
      
      toast({
        title: "Campo obrigatório não preenchido",
        description: `Por favor, preencha o campo "${getFieldLabel(firstErrorField)}"`,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);

      const evaluationData: EvaluationFormData = {
        title: values.title,
        description: values.description || "",
        type: values.type,
        model: values.model,
        course: values.course,
        grade: values.grade,
        subjects: values.subjects as Subject[],
        subject: values.subjects[0]?.id || "",
        duration: values.duration,
        state: values.state === "all" ? undefined : values.state,
        municipality: values.municipality === "all" ? undefined : values.municipality,
        municipalities: values.municipality === "all"
          ? []
          : [values.municipality],
        schools: values.selectedSchools.map(s => s.id),
        classes: values.selectedClasses.map(c => c.id),
        selectedSchools: values.selectedSchools as { id: string; name: string; }[],
        selectedClasses: values.selectedClasses as ClassInfo[],
        classId: values.selectedClasses[0]?.id || "",
        questions: initialData?.questions || [],
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
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="h-10 bg-muted rounded"></div>
          <div className="h-4 bg-muted rounded w-1/3"></div>
          <div className="h-10 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Indicador de Progresso */}
      <Card className="bg-gradient-to-r from-blue-50 dark:from-blue-950/30 to-indigo-50 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300">Progresso do Formulário</h3>
            <span className="text-sm text-blue-700 dark:text-blue-400">
              {[
                isTitleValid && type && model && duration,
                isCourseValid,
                isGradeValid,
                isLocationValid,
                isMunicipalityValid,
                isSchoolsValid,
                isSubjectsValid,
                isClassesValid
              ].filter(Boolean).length} de 8 etapas concluídas
            </span>
          </div>
          <div className="grid grid-cols-8 gap-2">
            {[
              { label: "Básico", valid: isTitleValid && type && model && duration },
              { label: "Curso", valid: isCourseValid },
              { label: "Série", valid: isGradeValid },
              { label: "Estado", valid: isLocationValid },
              { label: "Município", valid: isMunicipalityValid },
              { label: "Escolas", valid: isSchoolsValid },
              { label: "Disciplinas", valid: isSubjectsValid },
              { label: "Turmas", valid: isClassesValid }
            ].map((step, index) => (
              <div key={index} className="text-center">
                <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-xs font-medium ${
                  step.valid 
                    ? 'bg-green-500 text-white' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {step.valid ? '✓' : index + 1}
                </div>
                <p className="text-xs mt-1 text-muted-foreground">{step.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Informações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Informações Básicas
          </CardTitle>
          <CardDescription>
            Defina o título, descrição e configurações gerais da avaliação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Título da Avaliação *</Label>
              <Input
                id="title"
                name="title"
                placeholder="Ex: Prova de Matemática - 5º Ano"
                {...form.register("title")}
              />
              {hasAttemptedSubmit && form.formState.errors.title && (
                <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duração (minutos) *</Label>
              <Input
                id="duration"
                name="duration"
                type="number"
                placeholder="60"
                {...form.register("duration")}
              />
              {hasAttemptedSubmit && form.formState.errors.duration && (
                <p className="text-sm text-red-500">{form.formState.errors.duration.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Descreva o objetivo da avaliação..."
              {...form.register("description")}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Avaliação *</Label>
              <Select
                value={form.watch("type")}
                onValueChange={(value) => form.setValue("type", value as "AVALIACAO" | "SIMULADO")}
              >
                <SelectTrigger name="type">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AVALIACAO">Avaliação</SelectItem>
                  <SelectItem value="SIMULADO">Simulado</SelectItem>
                </SelectContent>
              </Select>
              {hasAttemptedSubmit && form.formState.errors.type && (
                <p className="text-sm text-red-500">{form.formState.errors.type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Modelo da Avaliação *</Label>
              <Select
                value={form.watch("model")}
                onValueChange={(value) => form.setValue("model", value as "SAEB" | "PROVA" | "AVALIE")}
              >
                <SelectTrigger name="model">
                  <SelectValue placeholder="Selecione o modelo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAEB">SAEB</SelectItem>
                  <SelectItem value="PROVA">Prova</SelectItem>
                  <SelectItem value="AVALIE">Avalie</SelectItem>
                </SelectContent>
              </Select>
              {hasAttemptedSubmit && form.formState.errors.model && (
                <p className="text-sm text-red-500">{form.formState.errors.model.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Curso e Série */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Curso e Série
          </CardTitle>
          <CardDescription>
            Selecione o curso e a série para a avaliação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="course">Curso *</Label>
              <Select
                value={form.watch("course")}
                onValueChange={(value) => form.setValue("course", value)}
                disabled={!isBasicInfoValid}
              >
                <SelectTrigger name="course">
                  <SelectValue placeholder={isBasicInfoValid ? "Selecione o curso" : "Preencha as informações básicas primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasAttemptedSubmit && form.formState.errors.course && (
                <p className="text-sm text-red-500">{form.formState.errors.course.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="grade">Série *</Label>
              <Select
                value={form.watch("grade")}
                onValueChange={(value) => form.setValue("grade", value)}
                disabled={!isCourseValid}
              >
                <SelectTrigger name="grade">
                  <SelectValue placeholder={isCourseValid ? "Selecione a série" : "Selecione um curso primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {grades.map((grade) => (
                    <SelectItem key={grade.id} value={grade.id}>
                      {grade.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasAttemptedSubmit && form.formState.errors.grade && (
                <p className="text-sm text-red-500">{form.formState.errors.grade.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Localização */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Localização
          </CardTitle>
          <CardDescription>
            Selecione o estado, município e escolas para a avaliação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="state">Estado *</Label>
              <Select
                value={form.watch("state")}
                onValueChange={(value) => form.setValue("state", value)}
                disabled={!isGradeValid}
              >
                <SelectTrigger name="state">
                  <SelectValue placeholder={isGradeValid ? "Selecione o estado" : "Selecione uma série primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os estados</SelectItem>
                  {states.map((state) => (
                    <SelectItem key={state.name} value={state.name}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasAttemptedSubmit && form.formState.errors.state && (
                <p className="text-sm text-red-500">{form.formState.errors.state.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="municipality">Município *</Label>
              <Select
                value={form.watch("municipality")}
                onValueChange={(value) => form.setValue("municipality", value)}
                disabled={!isLocationValid}
              >
                <SelectTrigger name="municipality">
                  <SelectValue placeholder={isLocationValid ? "Selecione o município" : "Selecione um estado primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {selectedState === 'all' ? (
                    <SelectItem value="all">Todos os municípios</SelectItem>
                  ) : (
                    filteredMunicipalities.map((municipality) => (
                      <SelectItem key={municipality.id} value={municipality.id}>
                        {municipality.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {hasAttemptedSubmit && form.formState.errors.municipality && (
                <p className="text-sm text-red-500">{form.formState.errors.municipality.message}</p>
              )}
            </div>
          </div>

          {/* Escolas */}
          <div className={`space-y-2 ${!isMunicipalityValid ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex items-center justify-between">
              <Label>Escolas *</Label>
              {!isMunicipalityValid && (
                <span className="text-sm text-muted-foreground">Selecione um município primeiro</span>
              )}
              {isMunicipalityValid && schools.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllSchools}
                >
                  Selecionar Todas
                </Button>
              )}
            </div>
            
            {schoolsLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span>Carregando escolas...</span>
              </div>
            ) : noSchoolsMessage ? (
              <div className="flex items-center gap-2 p-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <span className="text-yellow-800 dark:text-yellow-400">{noSchoolsMessage}</span>
              </div>
            ) : (
              <div className="grid gap-2 max-h-40 overflow-y-auto">
                {schools.map((school) => (
                  <div key={school.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`school-${school.id}`}
                      checked={selectedSchools.some(s => s.id === school.id)}
                      onCheckedChange={() => handleSchoolToggle(school)}
                    />
                    <Label
                      htmlFor={`school-${school.id}`}
                      className="flex-1 cursor-pointer"
                    >
                      {school.name}
                    </Label>
                  </div>
                ))}
              </div>
            )}

            {hasAttemptedSubmit && form.formState.errors.selectedSchools && (
              <p className="text-sm text-red-500">{form.formState.errors.selectedSchools.message}</p>
            )}
          </div>

          {/* Escolas Selecionadas */}
          {selectedSchools.length > 0 && (
            <div className="space-y-2">
              <Label>Escolas Selecionadas ({selectedSchools.length})</Label>
              <div className="flex flex-wrap gap-2">
                {selectedSchools.map((school) => (
                  <Badge key={school.id} variant="secondary" className="flex items-center gap-1">
                    <School className="h-3 w-3" />
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
        </CardContent>
      </Card>

      {/* Disciplinas */}
      <Card className={!isSchoolsValid ? 'opacity-50 pointer-events-none' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Disciplinas
            {!isSchoolsValid && (
              <span className="text-sm text-muted-foreground ml-2">(Selecione escolas primeiro)</span>
            )}
          </CardTitle>
          <CardDescription>
            Selecione as disciplinas que serão avaliadas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 max-h-40 overflow-y-auto">
            {subjects.map((subject) => (
              <div key={subject.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`subject-${subject.id}`}
                  checked={selectedSubjects.some(s => s.id === subject.id)}
                  onCheckedChange={() => handleSubjectToggle(subject)}
                />
                <Label
                  htmlFor={`subject-${subject.id}`}
                  className="flex-1 cursor-pointer"
                >
                  {subject.name}
                </Label>
              </div>
            ))}
          </div>

          {hasAttemptedSubmit && form.formState.errors.subjects && (
            <p className="text-sm text-red-500">{form.formState.errors.subjects.message}</p>
          )}

          {/* Disciplinas Selecionadas */}
          {selectedSubjects.length > 0 && (
            <div className="space-y-2">
              <Label>Disciplinas Selecionadas ({selectedSubjects.length})</Label>
              <div className="flex flex-wrap gap-2">
                {selectedSubjects.map((subject) => (
                  <Badge key={subject.id} variant="secondary" className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
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
        </CardContent>
      </Card>

      {/* Turmas */}
      <Card className={!isSubjectsValid ? 'opacity-50 pointer-events-none' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Turmas
            {!isSubjectsValid && (
              <span className="text-sm text-muted-foreground ml-2">(Selecione disciplinas primeiro)</span>
            )}
          </CardTitle>
          <CardDescription>
            Selecione as turmas que participarão da avaliação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {classesLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span>Carregando turmas...</span>
            </div>
          ) : noClassesMessage ? (
            <div className="flex items-center gap-2 p-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <span className="text-yellow-800 dark:text-yellow-400">{noClassesMessage}</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <Label>Turmas Disponíveis</Label>
                {classes.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllClasses}
                  >
                    Selecionar Todas
                  </Button>
                )}
              </div>
              
              <div className="grid gap-2 max-h-40 overflow-y-auto">
                {classes.map((classItem) => (
                  <div key={classItem.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`class-${classItem.id}`}
                      checked={selectedClasses.some(c => c.id === classItem.id)}
                      onCheckedChange={() => handleClassToggle(classItem)}
                    />
                    <Label
                      htmlFor={`class-${classItem.id}`}
                      className="flex-1 cursor-pointer"
                    >
                      {classItem.name}
                      {classItem.school && (
                        <span className="text-sm text-muted-foreground ml-2">
                          - {classItem.school.name}
                        </span>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
            </>
          )}

          {hasAttemptedSubmit && form.formState.errors.selectedClasses && (
            <p className="text-sm text-red-500">{form.formState.errors.selectedClasses.message}</p>
          )}

          {/* Turmas Selecionadas */}
          {selectedClasses.length > 0 && (
            <div className="space-y-2">
              <Label>Turmas Selecionadas ({selectedClasses.length})</Label>
              <div className="flex flex-wrap gap-2">
                {selectedClasses.map((classItem) => (
                  <Badge key={classItem.id} variant="secondary" className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {classItem.name}
                    {classItem.school && (
                      <span className="text-xs text-muted-foreground">
                        - {classItem.school.name}
                      </span>
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
        </CardContent>
      </Card>

      {/* Botões de Ação */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              Continuar
              <Plus className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}