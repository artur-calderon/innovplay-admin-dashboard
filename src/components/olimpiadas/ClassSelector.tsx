import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { ClassInfo } from '@/types/evaluation-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Check, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
}

interface Grade {
  id: string;
  name: string;
}

interface ClassSelectorProps {
  selectedClasses: ClassInfo[];
  onClassesChange: (classes: ClassInfo[]) => void;
  initialState?: string;
  initialMunicipality?: string;
  initialSchool?: string;
  initialGrade?: string;
}

export function ClassSelector({
  selectedClasses,
  onClassesChange,
  initialState,
  initialMunicipality,
  initialSchool,
  initialGrade,
}: ClassSelectorProps) {
  const { toast } = useToast();
  const [states, setStates] = useState<State[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  
  const [selectedState, setSelectedState] = useState<string>(initialState || '');
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>(initialMunicipality || '');
  const [selectedSchool, setSelectedSchool] = useState<string>(initialSchool || '');
  const [selectedGrade, setSelectedGrade] = useState<string>(initialGrade || '');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(false);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);

  // Carregar estados
  useEffect(() => {
    const loadStates = async () => {
      setLoadingStates(true);
      try {
        const response = await api.get('/city/states');
        setStates(response.data || []);
      } catch (error) {
        console.error('Erro ao carregar estados:', error);
        toast({
          title: 'Erro',
          description: 'Erro ao carregar estados',
          variant: 'destructive',
        });
      } finally {
        setLoadingStates(false);
      }
    };
    loadStates();
  }, [toast]);

  // Carregar municípios quando estado mudar
  useEffect(() => {
    if (!selectedState || selectedState === 'all') {
      setMunicipalities([]);
      setSelectedMunicipality('');
      return;
    }

    setLoadingMunicipalities(true);
    api.get(`/city/municipalities/state/${selectedState}`)
      .then(res => {
        setMunicipalities(res.data || []);
      })
      .catch(err => {
        console.error('Erro ao carregar municípios:', err);
        setMunicipalities([]);
      })
      .finally(() => {
        setLoadingMunicipalities(false);
      });
  }, [selectedState]);

  // Carregar escolas quando município mudar
  useEffect(() => {
    if (!selectedMunicipality || selectedMunicipality === 'all') {
      setSchools([]);
      setSelectedSchool('');
      return;
    }

    setLoadingSchools(true);
    api.get(`/school/city/${selectedMunicipality}`)
      .then(res => {
        setSchools(res.data || []);
      })
      .catch(err => {
        console.error('Erro ao carregar escolas:', err);
        setSchools([]);
      })
      .finally(() => {
        setLoadingSchools(false);
      });
  }, [selectedMunicipality]);

  // Carregar séries quando escola mudar
  useEffect(() => {
    if (!selectedSchool || selectedSchool === 'all') {
      setGrades([]);
      setSelectedGrade('');
      return;
    }

    setLoadingGrades(true);
    api.get(`/classes/school/${selectedSchool}`)
      .then(res => {
        const allClasses = res.data || [];
        // Extrair séries únicas das turmas
        const uniqueGrades = Array.from(
          new Map(
            allClasses
              .map((c: { grade_id?: string; grade?: { id: string; name: string } }) => {
                const gradeId = c.grade_id || c.grade?.id;
                const gradeName = c.grade?.name || 'Série não informada';
                return gradeId ? [gradeId, { id: gradeId, name: gradeName }] : null;
              })
              .filter(Boolean) as [string, Grade][]
          ).values()
        );
        setGrades(uniqueGrades);
      })
      .catch(err => {
        console.error('Erro ao carregar séries:', err);
        setGrades([]);
      })
      .finally(() => {
        setLoadingGrades(false);
      });
  }, [selectedSchool]);

  // Carregar turmas quando filtros estiverem completos
  useEffect(() => {
    if (!selectedSchool || !selectedGrade) {
      setClasses([]);
      return;
    }

    setLoadingClasses(true);
    api.get(`/classes/school/${selectedSchool}`)
      .then(res => {
        const allClasses = res.data || [];
        const filteredClasses = allClasses
          .filter((c: { grade_id?: string; grade?: { id?: string } }) => {
            const classGradeId = c.grade_id || c.grade?.id;
            return String(classGradeId || '').trim() === String(selectedGrade).trim();
          })
          .map((c: { id: string; name: string; school_id?: string }) => ({
            id: c.id,
            name: c.name,
            school: {
              id: c.school_id || selectedSchool,
              name: schools.find(s => s.id === selectedSchool)?.name || '',
            },
          }));
        setClasses(filteredClasses);
      })
      .catch(err => {
        console.error('Erro ao carregar turmas:', err);
        setClasses([]);
      })
      .finally(() => {
        setLoadingClasses(false);
      });
  }, [selectedSchool, selectedGrade, schools]);

  // Filtrar turmas por busca
  const filteredClasses = useMemo(() => {
    if (!searchTerm) return classes;
    return classes.filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.school?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [classes, searchTerm]);

  const handleToggleClass = (classItem: ClassInfo) => {
    const isSelected = selectedClasses.some(c => c.id === classItem.id);
    if (isSelected) {
      onClassesChange(selectedClasses.filter(c => c.id !== classItem.id));
    } else {
      onClassesChange([...selectedClasses, classItem]);
    }
  };

  const isClassSelected = (classId: string) => {
    return selectedClasses.some(c => c.id === classId);
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label>Estado</Label>
          <Select
            value={selectedState}
            onValueChange={setSelectedState}
            disabled={loadingStates}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {states.map((state) => (
                <SelectItem key={state.id} value={state.id}>
                  {state.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Município</Label>
          <Select
            value={selectedMunicipality}
            onValueChange={setSelectedMunicipality}
            disabled={loadingMunicipalities || !selectedState || selectedState === 'all'}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o município" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {municipalities.map((municipality) => (
                <SelectItem key={municipality.id} value={municipality.id}>
                  {municipality.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Escola</Label>
          <Select
            value={selectedSchool}
            onValueChange={setSelectedSchool}
            disabled={loadingSchools || !selectedMunicipality || selectedMunicipality === 'all'}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a escola" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {schools.map((school) => (
                <SelectItem key={school.id} value={school.id}>
                  {school.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Série</Label>
          <Select
            value={selectedGrade}
            onValueChange={setSelectedGrade}
            disabled={loadingGrades || !selectedSchool || selectedSchool === 'all'}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a série" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {grades.map((grade) => (
                <SelectItem key={grade.id} value={grade.id}>
                  {grade.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar turmas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Contador de selecionados */}
      {selectedClasses.length > 0 && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {selectedClasses.length} turma{selectedClasses.length !== 1 ? 's' : ''} selecionada{selectedClasses.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      )}

      {/* Lista de turmas */}
      <div className="max-h-[400px] overflow-y-auto space-y-2">
        {loadingClasses ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-yellow-600" />
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {!selectedSchool || !selectedGrade
              ? 'Selecione estado, município, escola e série para ver as turmas'
              : 'Nenhuma turma encontrada'}
          </div>
        ) : (
          filteredClasses.map((classItem) => {
            const isSelected = isClassSelected(classItem.id);
            return (
              <Card
                key={classItem.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  isSelected
                    ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
                    : 'hover:border-yellow-300'
                }`}
                onClick={() => handleToggleClass(classItem)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <Checkbox checked={isSelected} readOnly />
                      <div className="flex-1">
                        <div className="font-medium">{classItem.name}</div>
                        {classItem.school && (
                          <div className="text-sm text-muted-foreground">
                            {classItem.school.name}
                          </div>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="h-5 w-5 text-yellow-600" />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
