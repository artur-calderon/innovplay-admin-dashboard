import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, X, Plus, Trophy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/context/authContext';
import { OlimpiadaFormData, Subject, ClassInfo } from '@/types/olimpiada-types';
import { ClassSelector } from './ClassSelector';
import QuestionSelectionStep from '@/components/evaluations/QuestionSelectionStep';
import { EvaluationFormData, Question } from '@/components/evaluations/types';

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
  const [startDateTime, setStartDateTime] = useState('');
  
  // Seleções
  const [course, setCourse] = useState('');
  const [grade, setGrade] = useState('');
  const [state, setState] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<ClassInfo[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  
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
        
        setCourses(coursesRes.data || []);
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
  useEffect(() => {
    if (!course) {
      setGrades([]);
      return;
    }
    
    api.get(`/grades/education-stage/${course}`)
      .then(res => setGrades(res.data || []))
      .catch(err => {
        console.error('Erro ao carregar séries:', err);
        setGrades([]);
      });
  }, [course]);

  // Carregar municípios quando estado mudar
  useEffect(() => {
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

  // Carregar escolas quando município mudar
  useEffect(() => {
    if (!municipality || municipality === 'all') {
      setSchools([]);
      return;
    }
    
    api.get(`/school/city/${municipality}`)
      .then(res => setSchools(res.data || []))
      .catch(err => {
        console.error('Erro ao carregar escolas:', err);
        setSchools([]);
      });
  }, [municipality]);

  const loadOlimpiadaData = async (id: string) => {
    try {
      const response = await api.get(`/test/${id}`);
      const data = response.data;
      
      setTitle(data.title || '');
      setDescription(data.description || '');
      setDuration(String(data.duration || 60));
      setStartDateTime(data.startDateTime || data.time_limit || '');
      setCourse(data.course || '');
      setGrade(data.grade || data.grade_id || '');
      
      if (data.subjects) {
        setSelectedSubjects(Array.isArray(data.subjects) ? data.subjects : [data.subjects]);
      }
      
      if (data.schools) {
        setSelectedSchools(Array.isArray(data.schools) ? data.schools.map((s: { id: string }) => s.id) : [data.schools]);
      }
      
      if (data.questions) {
        setSelectedQuestions(Array.isArray(data.questions) ? data.questions.map((q: { id: string }) => q.id) : []);
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
        questions: selectedQuestions,
        startDateTime,
        duration: parseInt(duration, 10),
        evaluation_mode: 'virtual',
        created_by: user?.id,
      };

      if (olimpiadaId) {
        await api.put(`/test/${olimpiadaId}`, {
          ...formData,
          type: 'OLIMPIADA',
        });
        toast({
          title: 'Olimpíada atualizada!',
          description: 'A olimpíada foi atualizada com sucesso',
        });
      } else {
        await api.post('/test', {
          ...formData,
          type: 'OLIMPIADA',
        });
        toast({
          title: 'Olimpíada criada!',
          description: 'A olimpíada foi criada com sucesso',
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
    setStartDateTime('');
    setCourse('');
    setGrade('');
    setState('');
    setMunicipality('');
    setSelectedSchools([]);
    setSelectedClasses([]);
    setSelectedSubjects([]);
    setSelectedQuestions([]);
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
    schools: selectedSchools,
    municipalities: [municipality],
    classes: selectedClasses.map(c => c.id),
    selectedClasses,
    questions: [],
    startDateTime,
    duration,
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            {olimpiadaId ? 'Editar Olimpíada' : 'Nova Olimpíada'}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && 'Configure os dados básicos da olimpíada'}
            {step === 2 && 'Selecione as questões do banco'}
            {step === 3 && 'Selecione as turmas que participarão'}
          </DialogDescription>
        </DialogHeader>

        {loadingData ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-yellow-600" />
          </div>
        ) : (
          <div className="space-y-6">
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Duração (minutos) *</Label>
                    <Input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      min="1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data/Hora de Início</Label>
                    <Input
                      type="datetime-local"
                      value={startDateTime}
                      onChange={(e) => setStartDateTime(e.target.value)}
                    />
                  </div>
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
                    onValueChange={(value) => setSelectedSchools([value])}
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
              <div className="space-y-4">
                <QuestionSelectionStep
                  evaluationData={evaluationFormData}
                  selectedQuestions={selectedQuestions.map(id => ({ id, text: '', type: 'multipleChoice' } as Question))}
                  onQuestionsChange={(questions) => setSelectedQuestions(questions.map(q => q.id))}
                />
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

            {/* Navegação */}
            <div className="flex justify-between pt-4 border-t">
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
