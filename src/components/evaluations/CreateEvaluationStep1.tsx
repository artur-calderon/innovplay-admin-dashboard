import { useState, useEffect } from "react";
import { useAuth } from "@/context/authContext";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
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
  const [isLoading, setIsLoading] = useState(false);

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

  useEffect(() => {
    const fetchMunicipalities = async () => {
      try {
        const response = await api.get("/city");
        setMunicipalities(response.data);
        const uniqueStates = Array.from(new Set((response.data as { state: string }[]).map((c) => c.state)));
        setStates(uniqueStates);
      } catch (error) {
        console.error("Erro ao buscar municípios:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os municípios",
          variant: "destructive",
        });
      }
    };

    const fetchCourses = async () => {
      try {
        const response = await api.get("/education_stages");
        setCourses(response.data);
      } catch (error) {
        console.error("Erro ao buscar cursos:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os cursos",
          variant: "destructive",
        });
      }
    };

    const fetchSubjects = async () => {
      try {
        const response = await api.get("/subjects");
        setSubjectOptions(response.data);
      } catch (error) {
        console.error("Erro ao buscar disciplinas:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as disciplinas",
          variant: "destructive",
        });
      }
    };

    fetchMunicipalities();
    fetchCourses();
    fetchSubjects()
  }, [toast]);

  useEffect(() => {
    const fetchSchools = async () => {
      if (formData.municipalities.length > 0) {
        try {
          const schoolsPromises = formData.municipalities.map(municipalityId =>
            api.get(`/school/city/${municipalityId}`)
          );

          const responses = await Promise.all(schoolsPromises);
          const allSchools = responses.flatMap(response => response.data);

          if (allSchools.length === 0) {
            toast({
              title: "Atenção",
              description: "Nenhuma escola encontrada para esta cidade",
              variant: "destructive",
            });
          }

          setSchools(allSchools);
        } catch (error: any) {
          console.error("Erro ao buscar escolas:", error);
          const errorMessage = error.response?.data?.error || error.response?.data?.message || "Não foi possível carregar as escolas";
          toast({
            title: "Erro",
            description: errorMessage,
            variant: "destructive",
          });
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
          console.log(response.data)
          setClasses(response.data);
        } catch (error) {
          console.error("Erro ao buscar turmas:", error);
          toast({
            title: "Erro",
            description: "Não foi possível carregar as turmas",
            variant: "destructive",
          });
        }
      } else {
        setClasses([]);
      }
    };

    fetchClasses();
  }, [formData.grade, formData.schools, toast]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      toast({
        title: "Erro",
        description: "O título é obrigatório",
        variant: "destructive",
      });
      return;
    }
    if (!formData.municipalities.length) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um município",
        variant: "destructive",
      });
      return;
    }
    if (!formData.schools.length) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos uma escola",
        variant: "destructive",
      });
      return;
    }
    if (!formData.course) {
      toast({
        title: "Erro",
        description: "Selecione um curso",
        variant: "destructive",
      });
      return;
    }
    if (!formData.grade) {
      toast({
        title: "Erro",
        description: "Selecione uma série",
        variant: "destructive",
      });
      return;
    }
    if (!formData.subjects.length) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos uma disciplina",
        variant: "destructive",
      });
      return;
    }
    onNext(formData);
  };

  // Filtrar disciplinas baseado na role do usuário
  const getAvailableSubjects = () => {
    if (user.role === 'admin') {
      return subjectOptions;
    } else if (user.role === 'professor' && (user as any).subjects) {
      return subjectOptions.filter(subject =>
        (user as any).subjects.some((userSubject: any) => userSubject.id === subject.id)
      );
    }
    return [];
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Título da Avaliação</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, title: e.target.value }))
            }
            placeholder="Digite o título da avaliação"
          />
        </div>

        <div>
          <Label>Estado</Label>
          <Select
            value={selectedState}
            onValueChange={(value) => {
              setSelectedState(value);
              setFormData((prev) => ({ ...prev, municipalities: [], schools: [] }));
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um estado" />
            </SelectTrigger>
            <SelectContent>
              {states.map((state) => (
                <SelectItem key={state} value={state}>{state}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Municípios</Label>
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
            }}
            placeholder="Selecione um ou mais municípios"
          />
        </div>

        <div>
          <Label>Escolas</Label>
          {schools.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Não há escolas cadastradas nos municípios selecionados
            </div>
          ) : (
            <MultiSelect
              options={[
                { id: "ALL", name: "Todos" },
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
              }}
              placeholder="Selecione uma ou mais escolas"
            />
          )}
        </div>

        <div>
          <Label>Curso</Label>
          <Select
            value={formData.course}
            onValueChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                course: value,
                grade: "",
              }))
            }
          >
            <SelectTrigger>
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
        </div>

        <div>
          <Label>Série</Label>
          <Select
            value={formData.grade}
            onValueChange={(value) => {
              if (value === "ALL") {
                const allIds = grades.map((g) => g.id);
                setFormData((prev) => ({ ...prev, grade: allIds.join(",") }));
              } else {
                setFormData((prev) => ({ ...prev, grade: value }));
              }
            }}
            disabled={!formData.course}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma série" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              {grades.map((grade) => (
                <SelectItem key={grade.id} value={grade.id}>
                  {grade.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Tipo</Label>
          <Select
            value={formData.type}
            onValueChange={(value: "AVALIACAO" | "SIMULADO") =>
              setFormData((prev) => ({ ...prev, type: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AVALIACAO">Avaliação</SelectItem>
              <SelectItem value="SIMULADO">Simulado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Modelo</Label>
          <Select
            value={formData.model}
            onValueChange={(value: "SAEB" | "PROVA" | "AVALIE") =>
              setFormData((prev) => ({ ...prev, model: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SAEB">SAEB</SelectItem>
              <SelectItem value="PROVA">Prova</SelectItem>
              <SelectItem value="AVALIE">Avalie</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Disciplinas</Label>
          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowSubjectModal(true)}
            >
              Adicionar Disciplinas
            </Button>
            {formData.subjects.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {formData.subjects.length} disciplina(s) selecionada(s)
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit">Próximo</Button>
      </div>

      {showSubjectModal && (
        <SubjectModal
          subjects={formData.subjects}
          onSubjectsChange={(subjects) =>
            setFormData((prev) => ({ ...prev, subjects }))
          }
          availableSubjects={getAvailableSubjects()}
          onClose={() => setShowSubjectModal(false)}
        />
      )}
    </form>
  );
}; 