import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/authContext";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useEvaluationDraft } from "@/hooks/use-evaluation-draft";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect, Option } from "@/components/ui/multi-select";
import { SubjectModal } from "./SubjectModal";
import { EvaluationFormData, TeacherSchool, Subject } from "./types";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Save, AlertCircle, Clock, CheckCircle, Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface Grade {
  id: string;
  name: string;
}

interface City {
  id: string;
  name: string;
  state: string;
  created_at: string;
}

interface School {
  id: string;
  name: string;
  domain: string;
  address: string;
  city_id: string;
  created_at: string;
  students_count: number;
  classes_count: number;
  city: City;
}

interface Class {
  id: string;
  name: string;
  grade_id: string;
  grade: Grade;
  school_id: string;
  school: School;
}

interface CreateEvaluationStep1Props {
  onNext: (data: EvaluationFormData) => void;
}

export const CreateEvaluationStep1 = ({ onNext }: CreateEvaluationStep1Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { hasDraft, saveDraft, loadDraft, clearDraft, getDraftInfo } = useEvaluationDraft();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSchools, setIsLoadingSchools] = useState(false);
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<EvaluationFormData>({
    title: "",
    municipalities: [],
    schools: [],
    course: "",
    grade: "",
    classId: "",
    type: "AVALIACAO" as const,
    model: "SAEB" as const,
    subjects: [],
    subject: "",
    questions: [],
  });

  const [municipalities, setMunicipalities] = useState<{ id: string; name: string; state: string }[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [selectedState, setSelectedState] = useState<string>("");
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<Subject[]>([]);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [gradesMap, setGradesMap] = useState<Record<string, string>>({});

  // Verificar rascunho na inicialização
  useEffect(() => {
    if (hasDraft) {
      setShowDraftDialog(true);
    }
  }, [hasDraft]);

  // Salvamento automático a cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      if (formData.title.trim()) {
        saveDraft(formData, 1);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [formData, saveDraft]);

  const handleLoadDraft = () => {
    const draft = loadDraft();
    if (draft) {
      setFormData(draft.data);
      toast({
        title: "Rascunho carregado",
        description: "Seus dados foram restaurados com sucesso",
      });
    }
    setShowDraftDialog(false);
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setShowDraftDialog(false);
  };

  // Lógica de campos condicionais
  const isFieldEnabled = useCallback((field: string) => {
    switch (field) {
      case 'title':
        return true; // Sempre habilitado
      case 'state':
        return formData.title.trim().length > 0;
      case 'municipalities':
        return selectedState.length > 0;
      case 'schools':
        return formData.municipalities.length > 0;
      case 'course':
        return formData.schools.length > 0;
      case 'grade':
        return formData.course.length > 0;
      case 'type':
      case 'model':
        return formData.grade.length > 0;
      case 'subjects':
        return formData.grade.length > 0 && formData.type.length > 0 && formData.model.length > 0;
      default:
        return false;
    }
  }, [formData, selectedState]);

  const getFieldStatus = useCallback((field: string) => {
    if (!isFieldEnabled(field)) return 'disabled';
    
    switch (field) {
      case 'title':
        return formData.title.trim().length > 0 ? 'completed' : 'current';
      case 'state':
        return selectedState.length > 0 ? 'completed' : 'current';
      case 'municipalities':
        return formData.municipalities.length > 0 ? 'completed' : 'current';
      case 'schools':
        return formData.schools.length > 0 ? 'completed' : 'current';
      case 'course':
        return formData.course.length > 0 ? 'completed' : 'current';
      case 'grade':
        return formData.grade.length > 0 ? 'completed' : 'current';
      case 'type':
        return formData.type.length > 0 ? 'completed' : 'current';
      case 'model':
        return formData.model.length > 0 ? 'completed' : 'current';
      case 'subjects':
        return formData.subjects.length > 0 ? 'completed' : 'current';
      default:
        return 'current';
    }
  }, [formData, selectedState]);

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "O título é obrigatório";
    }

    if (!selectedState) {
      newErrors.state = "Selecione um estado";
    }

    if (!formData.municipalities.length) {
      newErrors.municipalities = "Selecione pelo menos um município";
    }

    if (!formData.schools.length) {
      newErrors.schools = "Selecione pelo menos uma escola";
    }

    if (!formData.course) {
      newErrors.course = "Selecione um curso";
    }

    if (!formData.grade) {
      newErrors.grade = "Selecione uma série";
    }

    if (!formData.subjects.length) {
      newErrors.subjects = "Selecione pelo menos uma disciplina";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, selectedState]);

  const fetchWithRetry = async (url: string, retries = 3): Promise<unknown> => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await api.get(url);
        return response.data;
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        const [municipalitiesData, coursesData, subjectsData] = await Promise.all([
          fetchWithRetry("/city"),
          fetchWithRetry("/education_stages"),
          fetchWithRetry("/subjects")
        ]);

        setMunicipalities(municipalitiesData as { id: string; name: string; state: string }[]);
        const uniqueStates = Array.from(new Set((municipalitiesData as { state: string }[]).map((c) => c.state)));
        setStates(uniqueStates);
        
        setCourses(coursesData as { id: string; name: string }[]);
        setSubjectOptions(subjectsData as Subject[]);
      } catch (error) {
        console.error("Erro ao buscar dados iniciais:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados iniciais. Tente novamente.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [toast]);

  useEffect(() => {
    const fetchSchools = async () => {
      if (formData.municipalities.length > 0) {
        try {
          setIsLoadingSchools(true);
          
          // Log para debug
          console.log('Buscando escolas para', formData.municipalities.length, 'município(s)');
          
          const schoolsPromises = formData.municipalities.map(async (municipalityId) => {
            try {
              console.log('Buscando escolas para município:', municipalityId);
              const response = await api.get(`/school/city/${municipalityId}`);
              return response.data;
            } catch (error) {
              console.error('Erro ao buscar escolas para município', municipalityId, ':', error.response?.status || error.message);
              
              // Se o erro for 404 (não encontrou escolas), retorna array vazio
              if (error.response?.status === 404) {
                return [];
              }
              
              // Para outros erros, re-throw para ser capturado no catch principal
              throw error;
            }
          });

          const responses = await Promise.all(schoolsPromises);
          const allSchools = responses.flat(); // Achatar array de arrays

          console.log('Total de escolas encontradas:', allSchools.length);

          if (allSchools.length === 0) {
            toast({
              title: "Atenção",
              description: "Nenhuma escola encontrada para os municípios selecionados",
              variant: "default",
            });
          } else {
            toast({
              title: "Sucesso",
              description: `${allSchools.length} escola(s) encontrada(s)`,
            });
          }

          setSchools(allSchools);
        } catch (error) {
          console.error("Erro ao buscar escolas:", error);
          
          let errorMessage = "Não foi possível carregar as escolas";
          
          if (error.response) {
            // Erro de resposta HTTP
            const status = error.response.status;
            const data = error.response.data;
            
            if (status === 401) {
              errorMessage = "Sessão expirada. Faça login novamente.";
            } else if (status === 403) {
              errorMessage = "Você não tem permissão para acessar as escolas destes municípios";
            } else if (status === 500) {
              errorMessage = "Erro interno do servidor. Tente novamente em alguns minutos.";
            } else {
              errorMessage = data?.error || data?.message || errorMessage;
            }
          } else if (error.request) {
            // Erro de rede
            errorMessage = "Erro de conexão. Verifique sua internet e tente novamente.";
          }
          
          toast({
            title: "Erro",
            description: errorMessage,
            variant: "destructive",
          });
          setSchools([]);
        } finally {
          setIsLoadingSchools(false);
        }
      } else {
        setSchools([]);
      }
    };

    fetchSchools();
  }, [formData.municipalities, toast]);

  useEffect(() => {
    const fetchGrades = async () => {
      if (formData.course) {
        try {
          const response = await api.get(`/grades/education-stage/${formData.course}`);
          setGrades(response.data);
          const gradesMap: Record<string, string> = {};
          response.data.forEach((grade: Grade) => {
            gradesMap[grade.id] = grade.name;
          });
          setGradesMap(gradesMap);
        } catch (error) {
          console.error("Erro ao buscar séries:", error);
          toast({
            title: "Erro",
            description: "Não foi possível carregar as séries",
            variant: "destructive",
          });
          setGrades([]);
          setGradesMap({});
        }
      } else {
        setGrades([]);
        setGradesMap({});
      }
    };

    fetchGrades();
  }, [formData.course, toast]);

  useEffect(() => {
    const fetchClasses = async () => {
      if (formData.grade && formData.schools.length > 0) {
        try {
          const response = await api.get("/classes", {
            params: {
              grade: formData.grade,
              schools: formData.schools.join(","),
            },
          });
          setClasses(response.data);
        } catch (error) {
          console.error("Erro ao buscar turmas:", error);
          toast({
            title: "Erro",
            description: "Não foi possível carregar as turmas",
            variant: "destructive",
          });
          setClasses([]);
        }
      } else {
        setClasses([]);
      }
    };

    fetchClasses();
  }, [formData.grade, formData.schools, toast]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Salvar como rascunho antes de prosseguir
      saveDraft(formData, 1);
      onNext(formData);
    } else {
      // Verificar se há erros específicos de carregamento de dados
      const hasDataLoadingIssues = schools.length === 0 && formData.municipalities.length > 0;
      
      if (hasDataLoadingIssues) {
        toast({
          title: "Erro de carregamento",
          description: "Não foi possível carregar as escolas. Tente selecionar outros municípios ou verifique sua conexão.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro na validação",
          description: "Por favor, corrija os erros antes de continuar",
          variant: "destructive",
        });
      }
    }
  };

  const handleSaveDraft = () => {
    saveDraft(formData, 1);
    toast({
      title: "Rascunho salvo",
      description: "Seus dados foram salvos com sucesso",
    });
  };

  // Filtrar disciplinas baseado na role do usuário
  const getAvailableSubjects = () => {
    if (user.role === 'admin') {
      return subjectOptions;
    } else if (user.role === 'professor' && 'subjects' in user && Array.isArray(user.subjects)) {
      return subjectOptions.filter(subject =>
        (user.subjects as { id: string }[]).some((userSubject) => userSubject.id === subject.id)
      );
    }
    return [];
  };

  const renderFieldLabel = (label: string, field: string, required = true) => {
    const status = getFieldStatus(field);
    const enabled = isFieldEnabled(field);
    
    return (
      <div className="flex items-center gap-2">
        <Label className={cn(
          "flex items-center gap-2",
          !enabled && "text-muted-foreground",
          status === 'completed' && "text-green-600"
        )}>
          {status === 'completed' && <CheckCircle className="h-4 w-4" />}
          {!enabled && <Lock className="h-4 w-4" />}
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
        {!enabled && (
          <span className="text-xs text-muted-foreground">
            (Preencha o campo anterior)
          </span>
        )}
      </div>
    );
  };

  const draftInfo = getDraftInfo();

  const canProceed = formData.title.trim() && 
                   selectedState && 
                   formData.municipalities.length > 0 && 
                   formData.schools.length > 0 && 
                   formData.course && 
                   formData.grade && 
                   formData.subjects.length > 0;

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informações do rascunho */}
        {hasDraft && draftInfo && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Rascunho salvo em {new Date(draftInfo.timestamp).toLocaleString()}
              <Button
                variant="link"
                size="sm"
                onClick={() => setShowDraftDialog(true)}
                className="h-auto p-0 ml-2"
              >
                Carregar rascunho
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Progresso do preenchimento */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <h3 className="font-medium text-blue-900 mb-3">📋 Progresso do Preenchimento</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {[
                { field: 'title', label: 'Título' },
                { field: 'state', label: 'Estado' },
                { field: 'municipalities', label: 'Municípios' },
                { field: 'schools', label: 'Escolas' },
                { field: 'course', label: 'Curso' },
                { field: 'grade', label: 'Série' },
                { field: 'type', label: 'Tipo' },
                { field: 'subjects', label: 'Disciplinas' }
              ].map(({ field, label }) => {
                const status = getFieldStatus(field);
                return (
                  <div key={field} className={cn(
                    "flex items-center gap-2 p-2 rounded",
                    status === 'completed' && "bg-green-100 text-green-800",
                    status === 'current' && "bg-yellow-100 text-yellow-800",
                    status === 'disabled' && "bg-gray-100 text-gray-500"
                  )}>
                    {status === 'completed' && <CheckCircle className="h-4 w-4" />}
                    {status === 'disabled' && <Lock className="h-4 w-4" />}
                    {status === 'current' && <div className="h-4 w-4 rounded-full border-2 border-current" />}
                    <span className="text-xs font-medium">{label}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Título */}
          <div>
            {renderFieldLabel("Título da Avaliação", "title")}
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, title: e.target.value }));
                if (errors.title) setErrors(prev => ({ ...prev, title: "" }));
              }}
              placeholder="Digite o título da avaliação"
              className={cn(
                errors.title && "border-red-500",
                getFieldStatus('title') === 'completed' && "border-green-500"
              )}
            />
            {errors.title && (
              <p className="text-sm text-red-500 mt-1">{errors.title}</p>
            )}
          </div>

          {/* Estado */}
          <div>
            {renderFieldLabel("Estado", "state")}
            <Select
              value={selectedState}
              onValueChange={(value) => {
                setSelectedState(value);
                setFormData((prev) => ({ ...prev, municipalities: [], schools: [] }));
                if (errors.state) setErrors(prev => ({ ...prev, state: "" }));
              }}
              disabled={!isFieldEnabled('state')}
            >
              <SelectTrigger className={cn(
                errors.state && "border-red-500",
                getFieldStatus('state') === 'completed' && "border-green-500",
                !isFieldEnabled('state') && "opacity-50"
              )}>
                <SelectValue placeholder="Selecione um estado" />
              </SelectTrigger>
              <SelectContent>
                {states.map((state) => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.state && (
              <p className="text-sm text-red-500 mt-1">{errors.state}</p>
            )}
          </div>

          {/* Municípios */}
          <div>
            {renderFieldLabel("Municípios", "municipalities")}
            {!isFieldEnabled('municipalities') ? (
              <div className="p-3 border rounded-lg bg-gray-50 text-muted-foreground text-sm">
                <Lock className="h-4 w-4 inline mr-2" />
                Selecione um estado primeiro
              </div>
            ) : (
              <MultiSelect
                options={
                  [
                    { id: "ALL", name: "Todos" },
                    ...municipalities
                      .filter((m) => !selectedState || m.state === selectedState)
                      .map((m) => ({ id: m.id, name: m.name })),
                  ]
                }
                selected={formData.municipalities}
                onChange={(selected) => {
                  if (selected.includes("ALL")) {
                    const allIds = municipalities
                      .filter((m) => !selectedState || m.state === selectedState)
                      .map((m) => m.id);
                    setFormData((prev) => ({
                      ...prev,
                      municipalities: allIds,
                      schools: [],
                    }));
                  } else {
                    setFormData((prev) => ({
                      ...prev,
                      municipalities: selected,
                      schools: [],
                    }));
                  }
                  if (errors.municipalities) setErrors(prev => ({ ...prev, municipalities: "" }));
                }}
                placeholder="Selecione um ou mais municípios"
                className={cn(
                  errors.municipalities && "border-red-500",
                  getFieldStatus('municipalities') === 'completed' && "border-green-500"
                )}
              />
            )}
            {errors.municipalities && (
              <p className="text-sm text-red-500 mt-1">{errors.municipalities}</p>
            )}
          </div>

          {/* Escolas */}
          <div>
            {renderFieldLabel("Escolas", "schools")}
            {!isFieldEnabled('schools') ? (
              <div className="p-3 border rounded-lg bg-gray-50 text-muted-foreground text-sm">
                <Lock className="h-4 w-4 inline mr-2" />
                Selecione os municípios primeiro
              </div>
            ) : isLoadingSchools ? (
              <div className="p-3 border rounded-lg bg-blue-50 text-blue-700 text-sm">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  Carregando escolas...
                </div>
              </div>
            ) : schools.length === 0 ? (
              <div className="text-sm text-muted-foreground p-3 border rounded-lg bg-gray-50">
                Nenhuma escola encontrada nos municípios selecionados
              </div>
            ) : (
              <MultiSelect
                options={[
                  { id: "ALL", name: "Todas" },
                  ...schools.map((s) => ({ id: s.id, name: s.name })),
                ]}
                selected={formData.schools}
                onChange={(selected) => {
                  if (selected.includes("ALL")) {
                    const allIds = schools.map((s) => s.id);
                    setFormData((prev) => ({ ...prev, schools: allIds }));
                  } else {
                    setFormData((prev) => ({ ...prev, schools: selected }));
                  }
                  if (errors.schools) setErrors(prev => ({ ...prev, schools: "" }));
                }}
                placeholder="Selecione uma ou mais escolas"
                className={cn(
                  errors.schools && "border-red-500",
                  getFieldStatus('schools') === 'completed' && "border-green-500"
                )}
              />
            )}
            {errors.schools && (
              <p className="text-sm text-red-500 mt-1">{errors.schools}</p>
            )}
          </div>

          {/* Curso */}
          <div>
            {renderFieldLabel("Curso", "course")}
            <Select
              value={formData.course}
              onValueChange={(value) => {
                setFormData((prev) => ({
                  ...prev,
                  course: value,
                  grade: "",
                }));
                if (errors.course) setErrors(prev => ({ ...prev, course: "" }));
              }}
              disabled={!isFieldEnabled('course')}
            >
              <SelectTrigger className={cn(
                errors.course && "border-red-500",
                getFieldStatus('course') === 'completed' && "border-green-500",
                !isFieldEnabled('course') && "opacity-50"
              )}>
                <SelectValue placeholder="Selecione um curso" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.course && (
              <p className="text-sm text-red-500 mt-1">{errors.course}</p>
            )}
          </div>

          {/* Série */}
          <div>
            {renderFieldLabel("Série", "grade")}
            <Select
              value={formData.grade}
              onValueChange={(value) => {
                if (value === "ALL") {
                  const allIds = grades.map((g) => g.id);
                  setFormData((prev) => ({ ...prev, grade: allIds.join(",") }));
                } else {
                  setFormData((prev) => ({ ...prev, grade: value }));
                }
                if (errors.grade) setErrors(prev => ({ ...prev, grade: "" }));
              }}
              disabled={!isFieldEnabled('grade')}
            >
              <SelectTrigger className={cn(
                errors.grade && "border-red-500",
                getFieldStatus('grade') === 'completed' && "border-green-500",
                !isFieldEnabled('grade') && "opacity-50"
              )}>
                <SelectValue placeholder="Selecione uma série" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas</SelectItem>
                {grades.map((grade) => (
                  <SelectItem key={grade.id} value={grade.id}>
                    {grade.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.grade && (
              <p className="text-sm text-red-500 mt-1">{errors.grade}</p>
            )}
          </div>

          {/* Tipo e Modelo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              {renderFieldLabel("Tipo", "type")}
              <Select
                value={formData.type}
                onValueChange={(value: "AVALIACAO" | "SIMULADO") =>
                  setFormData((prev) => ({ ...prev, type: value }))
                }
                disabled={!isFieldEnabled('type')}
              >
                <SelectTrigger className={cn(
                  getFieldStatus('type') === 'completed' && "border-green-500",
                  !isFieldEnabled('type') && "opacity-50"
                )}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AVALIACAO">Avaliação</SelectItem>
                  <SelectItem value="SIMULADO">Simulado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              {renderFieldLabel("Modelo", "model")}
              <Select
                value={formData.model}
                onValueChange={(value: "SAEB" | "PROVA" | "AVALIE") =>
                  setFormData((prev) => ({ ...prev, model: value }))
                }
                disabled={!isFieldEnabled('model')}
              >
                <SelectTrigger className={cn(
                  getFieldStatus('model') === 'completed' && "border-green-500",
                  !isFieldEnabled('model') && "opacity-50"
                )}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAEB">SAEB</SelectItem>
                  <SelectItem value="PROVA">Prova</SelectItem>
                  <SelectItem value="AVALIE">Avalie</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Disciplinas */}
          <div>
            {renderFieldLabel("Disciplinas", "subjects")}
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSubjectModal(true)}
                className={cn(
                  errors.subjects && "border-red-500",
                  getFieldStatus('subjects') === 'completed' && "border-green-500"
                )}
                disabled={!isFieldEnabled('subjects')}
              >
                {!isFieldEnabled('subjects') && <Lock className="h-4 w-4 mr-2" />}
                Adicionar Disciplinas
              </Button>
              {formData.subjects.length > 0 && (
                <span className="text-sm text-green-600 font-medium">
                  ✓ {formData.subjects.length} disciplina(s) selecionada(s)
                </span>
              )}
            </div>
            {errors.subjects && (
              <p className="text-sm text-red-500 mt-1">{errors.subjects}</p>
            )}
          </div>
        </div>

        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            disabled={!formData.title.trim()}
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar Rascunho
          </Button>
          
          <Button 
            type="submit" 
            disabled={isLoading || !canProceed}
            className={cn(
              !canProceed && "opacity-50"
            )}
          >
            {isLoading ? "Carregando..." : "Próximo"}
            {!canProceed && <Lock className="h-4 w-4 ml-2" />}
          </Button>
        </div>

        {showSubjectModal && (
          <SubjectModal
            subjects={formData.subjects}
            onSubjectsChange={(subjects) => {
              setFormData((prev) => ({ ...prev, subjects }));
              if (errors.subjects) setErrors(prev => ({ ...prev, subjects: "" }));
            }}
            availableSubjects={getAvailableSubjects()}
            onClose={() => setShowSubjectModal(false)}
          />
        )}
      </form>

      <AlertDialog open={showDraftDialog} onOpenChange={setShowDraftDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rascunho encontrado</AlertDialogTitle>
            <AlertDialogDescription id="draft-dialog-description">
              Você tem um rascunho salvo de "{draftInfo?.title}" em {draftInfo && new Date(draftInfo.timestamp).toLocaleString()}. 
              Deseja carregar os dados ou começar uma nova avaliação?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDiscardDraft}>
              Começar nova avaliação
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleLoadDraft}>
              Carregar rascunho
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}; 