import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, X, Plus, Trophy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/context/authContext';
import { OlimpiadaFormData, Subject, ClassInfo } from '@/types/olimpiada-types';
import { OlimpiadasApiService } from '@/services/olimpiadasApi';
import { ClassSelector } from './ClassSelector';
import { EvaluationFormData, Question } from '@/components/evaluations/types';
import { QuestionBank } from '@/components/evaluations/QuestionBank';
import QuestionPreview from '@/components/evaluations/questions/QuestionPreview';
import QuestionFormReadOnly from '@/components/evaluations/questions/QuestionFormReadOnly';
import { Book, Eye, Trash2 } from 'lucide-react';

interface CreateOlimpiadaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  olimpiadaId?: string; // Para modo de edição
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
}

interface Municipality {
  id: string;
  name: string;
}

interface School {
  id: string;
  name: string;
}

export function CreateOlimpiadaModal({
  isOpen,
  onClose,
  onSuccess,
  olimpiadaId,
}: CreateOlimpiadaModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  // Dados básicos
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('60');
  
  // Seleções
  const [course, setCourse] = useState('');
  const [grade, setGrade] = useState('');
  const [state, setState] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<ClassInfo[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [showQuestionPreview, setShowQuestionPreview] = useState(false);
  const [showCreateQuestion, setShowCreateQuestion] = useState(false);
  const [selectedSubjectForQuestion, setSelectedSubjectForQuestion] = useState<string>("");
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  
  // Opções
  const [courses, setCourses] = useState<Course[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Carregar dados iniciais
  useEffect(() => {
    if (!isOpen) return;
    
    const loadInitialData = async () => {
      setLoadingData(true);
      try {
        const [coursesRes, subjectsRes, statesRes] = await Promise.all([
          api.get('/education_stages'),
          api.get('/subjects'),
          api.get('/city/states'),
        ]);
        
        // Filtrar cursos que têm turmas
        // Buscar todas as escolas para verificar quais cursos têm turmas
        const allCourses = coursesRes.data || [];
        const coursesWithClasses = new Set<string>();
        
        try {
          // Buscar todas as escolas (ou pelo menos algumas para verificar)
          // Como não temos município ainda, vamos buscar por estado ou usar endpoint de séries
          // Alternativa: buscar séries e verificar quais cursos têm séries com turmas
          const allGradesRes = await api.get('/grades/');
          const allGrades = allGradesRes.data || [];
          
          // Para cada série, verificar se tem escolas com turmas
          for (const grade of allGrades) {
            try {
              const schoolsRes = await api.get(`/school/by-grade/${grade.id}`);
              if (schoolsRes.data?.schools && schoolsRes.data.schools.length > 0) {
                // Esta série tem turmas, então o curso dela também tem
                if (grade.education_stage_id) {
                  coursesWithClasses.add(grade.education_stage_id);
                }
              }
            } catch (err: any) {
              // Ignorar silenciosamente erros 404 (séries sem turmas)
              // A API converte 404 em Error('Recurso não encontrado no servidor.')
              const errorMessage = err?.message || '';
              const isNotFound = err?.response?.status === 404 || 
                                 errorMessage.includes('não encontrado') || 
                                 errorMessage.includes('not found');
              
              // Apenas logar erros inesperados (não 404)
              if (!isNotFound) {
                console.warn(`Erro ao verificar série ${grade.id}:`, err);
              }
            }
          }
        } catch (err) {
          console.warn('Erro ao verificar cursos com turmas, usando todos:', err);
          // Se der erro, usar todos os cursos
          allCourses.forEach((c: Course) => coursesWithClasses.add(c.id));
        }
        
        // Filtrar apenas cursos que têm turmas
        const filteredCourses = allCourses.filter((c: Course) => 
          coursesWithClasses.has(c.id)
        );
        
        setCourses(filteredCourses);
        setAllSubjects(subjectsRes.data || []);
        setStates(statesRes.data || []);
        
        // Se estiver editando, carregar dados da olimpíada
        if (olimpiadaId) {
          await loadOlimpiadaData(olimpiadaId);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast({
          title: 'Erro',
          description: 'Erro ao carregar dados iniciais',
          variant: 'destructive',
        });
      } finally {
        setLoadingData(false);
      }
    };
    
    loadInitialData();
  }, [isOpen, olimpiadaId, toast]);

  // Carregar séries quando curso mudar
  // Filtrar apenas séries que têm turmas
  useEffect(() => {
    if (!course) {
      setGrades([]);
      setGrade('');
      // Limpar escolas e turmas quando curso mudar
      setSchools([]);
      setSelectedSchools([]);
      setSelectedClasses([]);
      return;
    }
    
    const loadGrades = async () => {
      try {
        const response = await api.get(`/grades/education-stage/${course}`);
        const allGrades = response.data || [];
        
        // Filtrar apenas séries que têm turmas (escolas com turmas daquela série)
        const gradesWithClasses: Grade[] = [];
        
        for (const grade of allGrades) {
          try {
            const schoolsRes = await api.get(`/school/by-grade/${grade.id}`);
            if (schoolsRes.data?.schools && schoolsRes.data.schools.length > 0) {
              // Esta série tem turmas
              gradesWithClasses.push(grade);
            }
          } catch (err: any) {
            // Ignorar silenciosamente erros 404 (séries sem turmas)
            // A API converte 404 em Error('Recurso não encontrado no servidor.')
            const errorMessage = err?.message || '';
            const isNotFound = err?.response?.status === 404 || 
                               errorMessage.includes('não encontrado') || 
                               errorMessage.includes('not found');
            
            // Apenas logar erros inesperados (não 404)
            if (!isNotFound) {
              console.warn(`Erro ao verificar série ${grade.id}:`, err);
            }
          }
        }
        
        setGrades(gradesWithClasses);
      } catch (err) {
        console.error('Erro ao carregar séries:', err);
        setGrades([]);
      }
    };
    
    loadGrades();
  }, [course]);

  // Carregar municípios quando estado mudar
  useEffect(() => {
    // Resetar municípios, escolas e turmas quando estado mudar
    setMunicipalities([]);
    setMunicipality('');
    setSchools([]);
    setSelectedSchools([]);
    setSelectedClasses([]);
    setAvailableClasses([]);
    
    if (!state || state === 'all') {
      setMunicipalities([]);
      return;
    }
    
    api.get(`/city/municipalities/state/${state}`)
      .then(res => setMunicipalities(res.data || []))
      .catch(err => {
        console.error('Erro ao carregar municípios:', err);
        setMunicipalities([]);
      });
  }, [state]);

  // Limpar escolas e turmas quando série mudar
  useEffect(() => {
    if (grade) {
      // Limpar escolas e turmas selecionadas quando série mudar
      setSelectedSchools([]);
      setSelectedClasses([]);
      setAvailableClasses([]);
    }
  }, [grade]);

  // Carregar escolas quando município ou série mudar
  // Se houver série selecionada, buscar apenas escolas com turmas daquela série
  // Mesmo padrão usado em CreateEvaluationStep1.tsx
  useEffect(() => {
    const loadSchools = async () => {
      // Resetar escolas e turmas quando município mudar (antes de carregar novos dados)
      setSchools([]);
      setSelectedSchools([]);
      setSelectedClasses([]);
      setAvailableClasses([]);
      
      // Não carregar se não houver município ou se for 'all'
      if (!municipality || municipality === 'all') {
        setSchools([]);
        return;
      }

      try {
        let schoolsData = [];
        
        // ✅ PRIORIDADE: Se houver série selecionada, buscar apenas escolas com aquela série
        if (grade) {
          const response = await api.get(`/school/by-grade/${grade}`);
          schoolsData = response.data?.schools || [];
          
          // Filtrar escolas pelo município selecionado
          // O endpoint /school/by-grade retorna escolas de todos os municípios
          // Precisamos filtrar apenas as do município selecionado
          if (schoolsData.length > 0) {
            // Buscar todas as escolas do município para comparar
            const municipalitySchoolsResponse = await api.get(`/school/city/${municipality}`);
            const municipalitySchoolIds = (municipalitySchoolsResponse.data || []).map((s: School) => s.id);
            
            // Filtrar apenas escolas que estão no município E têm turmas da série
            schoolsData = schoolsData.filter((school: School) => 
              municipalitySchoolIds.includes(school.id)
            );
          }
        } else {
          // Se NÃO houver série, buscar todas as escolas do município
          const response = await api.get(`/school/city/${municipality}`);
          schoolsData = response.data || [];
        }
        
        setSchools(schoolsData);
        
        // Validar e limpar escolas inválidas após fetch
        if (selectedSchools.length > 0) {
          const validSchools = selectedSchools.filter(schoolId =>
            schoolsData.find((school: School) => school.id === schoolId)
          );
          if (validSchools.length !== selectedSchools.length) {
            setSelectedSchools(validSchools);
            // Limpar turmas se escolas foram removidas
            if (validSchools.length === 0) {
              setSelectedClasses([]);
            }
          }
        }
      } catch (err) {
        console.error('Erro ao carregar escolas:', err);
        setSchools([]);
      }
    };
    
    loadSchools();
  }, [municipality, grade]);

  // Carregar turmas quando escola, série e município estiverem selecionados
  const [availableClasses, setAvailableClasses] = useState<ClassInfo[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  useEffect(() => {
    if (!selectedSchools[0] || !grade || !municipality) {
      setAvailableClasses([]);
      return;
    }

    setLoadingClasses(true);
    api.get(`/classes/school/${selectedSchools[0]}`)
      .then(res => {
        const allClasses = res.data || [];
        const filteredClasses = allClasses
          .filter((c: { grade_id?: string; grade?: { id?: string } }) => {
            const classGradeId = c.grade_id || c.grade?.id;
            return String(classGradeId || '').trim() === String(grade).trim();
          })
          .map((c: { id: string; name: string; school_id?: string }) => ({
            id: c.id,
            name: c.name,
            school: {
              id: c.school_id || selectedSchools[0],
              name: schools.find(s => s.id === selectedSchools[0])?.name || '',
            },
          }));
        setAvailableClasses(filteredClasses);
      })
      .catch(err => {
        console.error('Erro ao carregar turmas:', err);
        setAvailableClasses([]);
      })
      .finally(() => {
        setLoadingClasses(false);
      });
  }, [selectedSchools, grade, municipality, schools]);

  const loadOlimpiadaData = async (id: string) => {
    try {
      const data = await OlimpiadasApiService.getOlimpiada(id);
      
      setTitle(data.title || '');
      setDescription(data.description || '');
      setDuration(String(data.duration || 60));
      setCourse(data.course || '');
      setGrade(data.grade || data.grade_id || '');
      
      if (data.subjects) {
        setSelectedSubjects(Array.isArray(data.subjects) ? data.subjects : [data.subjects]);
      }
      
      if (data.schools) {
        setSelectedSchools(Array.isArray(data.schools) ? data.schools.map((s: { id: string }) => s.id) : [data.schools]);
      }
      
      if (data.questions) {
        // Converter questões para o formato Question
        const questions = Array.isArray(data.questions) 
          ? data.questions.map((q: any) => ({
              id: q.id || q,
              text: q.text || '',
              title: q.title || '',
              type: q.type || 'multipleChoice',
              options: q.options || [],
              subjectId: q.subjectId || q.subject_id || q.subject?.id || '',
            } as Question))
          : [];
        setSelectedQuestions(questions);
      }
    } catch (error) {
      console.error('Erro ao carregar olimpíada:', error);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      // Validar dados básicos
      if (!title || !course || !grade || !state || !municipality || selectedSchools.length === 0 || selectedSubjects.length === 0) {
        toast({
          title: 'Campos obrigatórios',
          description: 'Preencha todos os campos obrigatórios',
          variant: 'destructive',
        });
        return;
      }
      setStep(2);
    } else if (step === 2) {
      // Validar questões
      if (selectedQuestions.length === 0) {
        toast({
          title: 'Questões obrigatórias',
          description: 'Selecione pelo menos uma questão',
          variant: 'destructive',
        });
        return;
      }
      // Validar se todas as disciplinas têm pelo menos uma questão
      const subjectsWithoutQuestions = selectedSubjects.filter(subject => {
        const subjectQuestions = selectedQuestions.filter(q => {
          const questionWithSubjectId = q as { subjectId?: string; subject?: { id?: string }; subject_id?: string };
          return questionWithSubjectId.subjectId === subject.id || 
                 questionWithSubjectId.subject?.id === subject.id ||
                 questionWithSubjectId.subject_id === subject.id;
        });
        return subjectQuestions.length === 0;
      });
      
      if (subjectsWithoutQuestions.length > 0) {
        toast({
          title: 'Questões obrigatórias',
          description: `Adicione pelo menos uma questão para: ${subjectsWithoutQuestions.map(s => s.name).join(', ')}`,
          variant: 'destructive',
        });
        return;
      }
      setStep(3);
    }
  };

  const handleSubmit = async () => {
    if (selectedClasses.length === 0) {
      toast({
        title: 'Turmas obrigatórias',
        description: 'Selecione pelo menos uma turma',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Usar datas padrão (não serão usadas na criação, apenas na aplicação)
      const now = new Date();
      const defaultEndDateTime = new Date(now.getTime() + parseInt(duration, 10) * 60000);

      const formData: OlimpiadaFormData = {
        title,
        description,
        type: 'OLIMPIADA',
        model: 'PROVA',
        course,
        grade,
        subjects: selectedSubjects,
        schools: selectedSchools,
        municipalities: [municipality],
        classes: selectedClasses.map(c => c.id),
        selectedClasses,
        questions: selectedQuestions.map(q => q.id),
        startDateTime: now.toISOString(), // Valor padrão, não será usado
        endDateTime: defaultEndDateTime.toISOString(), // Valor padrão, não será usado
        duration: parseInt(duration, 10),
        evaluation_mode: 'virtual',
        created_by: user?.id,
      };

      if (olimpiadaId) {
        await OlimpiadasApiService.updateOlimpiada(olimpiadaId, formData);
        toast({
          title: 'Olimpíada atualizada!',
          description: 'A olimpíada foi atualizada com sucesso',
        });
      } else {
        await OlimpiadasApiService.createOlimpiada(formData);
        toast({
          title: 'Olimpíada criada e aplicada!',
          description: 'A olimpíada foi criada e aplicada automaticamente para as turmas selecionadas.',
        });
      }

      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Erro ao salvar olimpíada:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar olimpíada',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
      setTitle('');
      setDescription('');
      setDuration('60');
      setCourse('');
    setGrade('');
    setState('');
    setMunicipality('');
    setSelectedSchools([]);
    setSelectedClasses([]);
    setSelectedSubjects([]);
    setSelectedQuestions([]);
    setShowQuestionBank(false);
    setShowQuestionPreview(false);
    setShowCreateQuestion(false);
    setSelectedSubjectForQuestion("");
    setPreviewQuestion(null);
    onClose();
  };

  const evaluationFormData: EvaluationFormData = {
    title,
    description,
    type: 'OLIMPIADA' as any,
    model: 'PROVA',
    course,
    grade,
    subjects: selectedSubjects,
    subject: selectedSubjects.length > 0 ? selectedSubjects[0].id : '',
    schools: selectedSchools,
    municipalities: [municipality],
    classes: selectedClasses.map(c => c.id),
    classId: selectedClasses.length > 0 ? selectedClasses[0].id : '',
    selectedClasses,
    questions: selectedQuestions.map(q => q.id),
    startDateTime: '',
    duration,
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            {olimpiadaId ? 'Editar Olimpíada' : 'Nova Olimpíada'}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && 'Configure os dados básicos da olimpíada'}
            {step === 2 && 'Selecione as questões do banco'}
            {step === 3 && 'Selecione as turmas que participarão da olimpíada'}
          </DialogDescription>
        </DialogHeader>

        {loadingData ? (
          <div className="flex items-center justify-center py-12 flex-1">
            <Loader2 className="h-8 w-8 animate-spin text-yellow-600" />
          </div>
        ) : (
          <div className="space-y-6 flex-1 overflow-y-auto pr-1">
            {/* Step 1: Dados Básicos */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Título *</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Olimpíada de Matemática 2024"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva a olimpíada..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Duração (minutos) *</Label>
                  <Input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    min="1"
                  />
                  <p className="text-xs text-muted-foreground">
                    Tempo máximo que os alunos terão para completar a olimpíada
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Curso *</Label>
                    <Select value={course} onValueChange={setCourse}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o curso" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Série *</Label>
                    <Select value={grade} onValueChange={setGrade} disabled={!course}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a série" />
                      </SelectTrigger>
                      <SelectContent>
                        {grades.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Estado *</Label>
                    <Select value={state} onValueChange={setState}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {states.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Município *</Label>
                    <Select value={municipality} onValueChange={setMunicipality} disabled={!state}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o município" />
                      </SelectTrigger>
                      <SelectContent>
                        {municipalities.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Escolas *</Label>
                  <Select
                    value={selectedSchools[0] || ''}
                    onValueChange={(value) => {
                      setSelectedSchools([value]);
                      // Limpar turmas selecionadas quando escola mudar
                      setSelectedClasses([]);
                    }}
                    disabled={!municipality}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a escola" />
                    </SelectTrigger>
                    <SelectContent>
                      {schools.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>


                <div className="space-y-2">
                  <Label>Disciplinas *</Label>
                  <div className="flex flex-wrap gap-2">
                    {allSubjects.map((subject) => {
                      const isSelected = selectedSubjects.some(s => s.id === subject.id);
                      return (
                        <Badge
                          key={subject.id}
                          variant={isSelected ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedSubjects(selectedSubjects.filter(s => s.id !== subject.id));
                            } else {
                              setSelectedSubjects([...selectedSubjects, subject]);
                            }
                          }}
                        >
                          {subject.name}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}

            {/* Step 2: Seleção de Questões */}
            {step === 2 && (
              <div className="space-y-6" data-section="questions">
                {/* Header com resumo */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Questões da Olimpíada</h3>
                    <p className="text-sm text-muted-foreground">
                      Total: {selectedQuestions.length} questão(ões) selecionada(s)
                    </p>
                  </div>
                </div>

                {/* Questões por disciplina */}
                {selectedSubjects.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Book className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma disciplina selecionada</p>
                    <p className="text-sm">Volte ao passo anterior e selecione pelo menos uma disciplina</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {selectedSubjects.map((subject) => {
                    const subjectQuestions = selectedQuestions.filter(q => {
                      const questionWithSubjectId = q as { subjectId?: string; subject?: { id?: string }; subject_id?: string };
                      return questionWithSubjectId.subjectId === subject.id || 
                             questionWithSubjectId.subject?.id === subject.id ||
                             questionWithSubjectId.subject_id === subject.id;
                    });
                    
                    return (
                      <Card key={subject.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <Book className="h-5 w-5 text-yellow-600" />
                              <h3 className="text-lg font-medium">{subject.name}</h3>
                              <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-300 dark:border-yellow-700">
                                {subjectQuestions.length} questão(ões)
                              </Badge>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedSubjectForQuestion(subject.id);
                                  setShowQuestionBank(true);
                                }}
                                className="border-yellow-300 dark:border-yellow-700 text-yellow-900 dark:text-yellow-100 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Banco de Questões
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedSubjectForQuestion(subject.id);
                                  setShowCreateQuestion(true);
                                }}
                                className="border-yellow-300 dark:border-yellow-700 text-yellow-900 dark:text-yellow-100 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Nova Questão
                              </Button>
                            </div>
                          </div>

                          {/* Lista de questões */}
                          <div className="space-y-3">
                            {subjectQuestions.length === 0 ? (
                              <div className="text-center py-8 text-muted-foreground">
                                <Book className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>Nenhuma questão adicionada para {subject.name}</p>
                                <p className="text-sm">Use os botões acima para adicionar questões</p>
                              </div>
                            ) : (
                              subjectQuestions.map((question, index) => {
                                const questionId = question.id || `temp-${index}`;
                                const globalIndex = selectedQuestions.findIndex(q => q.id === questionId);
                                const displayIndex = globalIndex >= 0 ? globalIndex + 1 : index + 1;
                                return (
                                  <div
                                    key={questionId}
                                    className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50/50 dark:bg-yellow-950/10 border-yellow-200 dark:border-yellow-800"
                                  >
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="secondary" className="bg-yellow-100 dark:bg-yellow-900/30">
                                          #{displayIndex}
                                        </Badge>
                                        <span className="text-sm font-medium">
                                          {question.title || `Questão ${displayIndex}`}
                                        </span>
                                      </div>
                                      <p className="text-sm text-muted-foreground line-clamp-2">
                                        {question.text || "Sem texto disponível"}
                                      </p>
                                      {question.options && question.options.length > 0 && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {question.options.length} alternativas
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={async () => {
                                          try {
                                            const questionId = question.id;
                                            if (questionId && questionId !== 'preview' && !questionId.startsWith('temp-')) {
                                              const response = await api.get(`/questions/${questionId}`);
                                              setPreviewQuestion(response.data);
                                            } else {
                                              setPreviewQuestion(question);
                                            }
                                            setShowQuestionPreview(true);
                                          } catch (error) {
                                            console.error("Erro ao buscar questão:", error);
                                            toast({
                                              title: "Erro",
                                              description: "Não foi possível carregar a questão",
                                              variant: "destructive",
                                            });
                                          }
                                        }}
                                        className="hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          const questionId = question.id;
                                          if (questionId) {
                                            setSelectedQuestions(selectedQuestions.filter(q => q.id !== questionId));
                                            toast({
                                              title: "Questão removida",
                                              description: "Questão removida da olimpíada",
                                            });
                                          }
                                        }}
                                        className="hover:bg-red-100 dark:hover:bg-red-900/30"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Seleção de Turmas */}
            {step === 3 && (
              <div className="space-y-4">
                <ClassSelector
                  selectedClasses={selectedClasses}
                  onClassesChange={setSelectedClasses}
                  initialState={state}
                  initialMunicipality={municipality}
                  initialSchool={selectedSchools[0]}
                  initialGrade={grade}
                />
              </div>
            )}

          </div>
        )}
        {/* Navegação fixa no rodapé do modal */}
        {!loadingData && (
          <div className="flex justify-between pt-4 mt-4 border-t">
            <Button variant="outline" onClick={step > 1 ? () => setStep(step - 1) : handleClose}>
              {step > 1 ? 'Voltar' : 'Cancelar'}
            </Button>
            <div className="flex gap-2">
              {step < 3 && (
                <Button onClick={handleNext}>
                  Próximo
                </Button>
              )}
              {step === 3 && (
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    olimpiadaId ? 'Atualizar' : 'Criar Olimpíada'
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>

      {/* Modais de Questões */}
      <Dialog open={showQuestionBank} onOpenChange={setShowQuestionBank}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Banco de Questões</DialogTitle>
            <DialogDescription>
              Selecione questões do banco para adicionar à olimpíada
            </DialogDescription>
          </DialogHeader>
          <QuestionBank
            open={showQuestionBank}
            subjectId={selectedSubjectForQuestion}
            onQuestionSelected={(question) => {
              // Verificar se a questão já foi adicionada
              if (selectedQuestions.some(q => q.id === question.id)) {
                toast({
                  title: "Questão já adicionada",
                  description: "Esta questão já está na olimpíada",
                  variant: "destructive",
                });
                return;
              }
              setSelectedQuestions([...selectedQuestions, question]);
              toast({
                title: "Questão adicionada",
                description: "Questão adicionada à olimpíada",
              });
            }}
            onClose={() => setShowQuestionBank(false)}
            gradeId={grade}
            gradeName={grades.find(g => g.id === grade)?.name}
            subjects={selectedSubjects}
            selectedSubjectId={selectedSubjectForQuestion}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showQuestionPreview} onOpenChange={setShowQuestionPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Visualizar Questão</DialogTitle>
            <DialogDescription>
              Prévia completa da questão com alternativas e resolução
            </DialogDescription>
          </DialogHeader>
          {previewQuestion && (
            <QuestionPreview
              question={previewQuestion}
              onClose={() => setShowQuestionPreview(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateQuestion} onOpenChange={setShowCreateQuestion}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Nova Questão</DialogTitle>
            <DialogDescription>
              Crie uma nova questão para adicionar à olimpíada
            </DialogDescription>
          </DialogHeader>
          <QuestionFormReadOnly
            open={showCreateQuestion}
            onClose={() => setShowCreateQuestion(false)}
            onQuestionAdded={(question) => {
              setSelectedQuestions([...selectedQuestions, question]);
              setShowCreateQuestion(false);
              toast({
                title: "Questão criada",
                description: "Nova questão adicionada à olimpíada",
              });
            }}
            questionNumber={selectedQuestions.length + 1}
            evaluationData={{
              course: course,
              grade: grade,
              subject: selectedSubjectForQuestion
            }}
          />
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
