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
import { EvaluationFormData, TeacherSchool } from "./types";

interface CreateEvaluationStep1Props {
  onNext: (data: EvaluationFormData) => void;
}

export function CreateEvaluationStep1({ onNext }: CreateEvaluationStep1Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Form data
  const [title, setTitle] = useState("");
  const [municipalities, setMunicipalities] = useState<string[]>([]);
  const [schools, setSchools] = useState<string[]>([]);
  const [course, setCourse] = useState("");
  const [grade, setGrade] = useState("");
  const [classId, setClassId] = useState("");
  // const [skill, setSkill] = useState("");
  const [model, setModel] = useState<EvaluationFormData['model'] | "">("");
  const [type, setType] = useState<EvaluationFormData['type'] | "">("");
  const [subjects, setSubjects] = useState<EvaluationFormData['subjects']>([]);

  // Options
  const [municipalityOptions, setMunicipalityOptions] = useState<Option[]>([]);
  const [schoolOptions, setSchoolOptions] = useState<Option[]>([]);
  const [courseOptions, setCourseOptions] = useState<Option[]>([]);
  const [gradeOptions, setGradeOptions] = useState<Option[]>([]);
  const [classOptions, setClassOptions] = useState<Option[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<Option[]>([]);

  // Placeholder data for teacher's schools
  const teacherSchools: TeacherSchool[] = [
    {
      id: "1",
      name: "Escola A",
      classes: [
        { id: "1", name: "Turma A", grade: "1º Ano" },
        { id: "2", name: "Turma B", grade: "2º Ano" },
      ],
    },
  ];

  useEffect(() => {
    // TODO: Replace with actual API calls
    setMunicipalityOptions([
      { id: "1", name: "Município A" },
      { id: "2", name: "Município B" },
    ]);
    setSchoolOptions([
      { id: "1", name: "Escola A" },
      { id: "2", name: "Escola B" },
    ]);
    setCourseOptions([
      { id: "1", name: "Ensino Fundamental" },
      { id: "2", name: "Ensino Médio" },
    ]);
    setGradeOptions([
      { id: "1", name: "1º Ano" },
      { id: "2", name: "2º Ano" },
    ]);
    setClassOptions([
      { id: "1", name: "Turma A" },
      { id: "2", name: "Turma B" },
    ]);
    setSubjectOptions([
      { id: "1", name: "Matemática" },
      { id: "2", name: "Português" },
      { id: "3", name: "História" },
    ]);
  }, []);

  const handleSubmit = () => {
    if (user.role === "admin") {
      if (!title || !municipalities.length || !schools.length || !course || !grade || !classId ||  !model || !type) {
        toast({
          title: "Erro",
          description: "Preencha todos os campos obrigatórios",
          variant: "destructive",
        });
        return;
      }

      if (type === "SIMULADO" && (!subjects || subjects.length === 0)) {
        toast({
          title: "Erro",
          description: "Adicione pelo menos uma matéria para o simulado",
          variant: "destructive",
        });
        return;
      }
    } else {
      if (!title || !schools.length || !classId) {
        toast({
          title: "Erro",
          description: "Preencha todos os campos obrigatórios",
          variant: "destructive",
        });
        return;
      }
    }

    const formData: EvaluationFormData = {
      title,
      municipalities,
      schools,
      course,
      grade,
      classId,
      model: model as EvaluationFormData['model'],
      type: type as EvaluationFormData['type'],
      subjects,
    };

    onNext(formData);
  };

  const handleModelChange = (value: string) => {
    setModel(value as EvaluationFormData['model']);
  };

  const handleTypeChange = (value: string) => {
    setType(value as EvaluationFormData['type']);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="title">Título da Avaliação *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Digite o título da avaliação"
          />
        </div>

        {user.role === "admin" ? (
          <>
            <div className="grid gap-2">
              <Label>Municípios *</Label>
              <MultiSelect
                options={municipalityOptions}
                selected={municipalities}
                onChange={setMunicipalities}
                placeholder="Selecione os municípios"
              />
            </div>

            <div className="grid gap-2">
              <Label>Escolas *</Label>
              <MultiSelect
                options={schoolOptions}
                selected={schools}
                onChange={setSchools}
                placeholder="Selecione as escolas"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="course">Curso *</Label>
              <Select value={course} onValueChange={setCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o curso" />
                </SelectTrigger>
                <SelectContent>
                  {courseOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="grade">Série *</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a série" />
                </SelectTrigger>
                <SelectContent>
                  {gradeOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="class">Turma *</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a turma" />
                </SelectTrigger>
                <SelectContent>
                  {classOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* <div className="grid gap-2">
              <Label htmlFor="skill">Habilidade *</Label>
              <Input
                id="skill"
                value={skill}
                onChange={(e) => setSkill(e.target.value)}
                placeholder="Digite a habilidade"
              />
            </div> */}

            <div className="grid gap-2">
              <Label htmlFor="model">Modelo de Prova *</Label>
              <Select value={model} onValueChange={handleModelChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o modelo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAEB">SAEB</SelectItem>
                  <SelectItem value="AVALIE">AVALIE</SelectItem>
                  <SelectItem value="PROVA">PROVA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="type">Tipo *</Label>
              <Select value={type} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SIMULADO">Simulado</SelectItem>
                  <SelectItem value="AVALIACAO">Avaliação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {type === "SIMULADO" && (
              <div className="grid gap-2">
                <Label>Matérias *</Label>
                <SubjectModal
                  subjects={subjects}
                  onSubjectsChange={setSubjects}
                  availableSubjects={subjectOptions}
                />
              </div>
            )}
          </>
        ) : (
          <>
            <div className="grid gap-2">
              <Label>Escolas *</Label>
              <MultiSelect
                options={teacherSchools.map(school => ({ id: school.id, name: school.name }))}
                selected={schools}
                onChange={setSchools}
                placeholder="Selecione as escolas"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="class">Turma *</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a turma" />
                </SelectTrigger>
                <SelectContent>
                  {teacherSchools
                    .flatMap(school => school.classes)
                    .map((classItem) => (
                      <SelectItem key={classItem.id} value={classItem.id}>
                        {classItem.name} - {classItem.grade}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* <div className="grid gap-2">
              <Label htmlFor="skill">Habilidade *</Label>
              <Input
                id="skill"
                value={skill}
                onChange={(e) => setSkill(e.target.value)}
                placeholder="Digite a habilidade"
              />
            </div> */}

            <div className="grid gap-2">
              <Label htmlFor="subject">Disciplina *</Label>
              <Select value={course} onValueChange={setCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a disciplina" />
                </SelectTrigger>
                <SelectContent>
                  {subjectOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </div>

      <Button onClick={handleSubmit} className="w-full">
        Próximo
      </Button>
    </div>
  );
} 