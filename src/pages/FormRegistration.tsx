import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Users, 
  GraduationCap, 
  UserCheck, 
  Building2, 
  Plus, 
  Calendar,
  Target,
  Shield,
  Filter,
  Search,
  Check,
  X,
  CheckSquare,
  Square,
  Send,
  Loader2,
  Trash2,
  RotateCcw,
  Eye,
  FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FormType } from '@/types/forms';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { FormMultiSelect, FormOption } from '@/components/ui/form-multi-select';
import { useToast } from '@/hooks/use-toast';
import { FormFiltersApiService } from '@/services/formFiltersApi';
import { api } from '@/lib/api';
import { 
  questionsAlunoJovem, 
  questionsAlunoVelho, 
  professorQuestions, 
  diretorQuestions, 
  secretarioQuestions 
} from '@/data/formsData';
import { Question } from '@/types/forms';

// IDs de Education Stages pré-definidos para cada tipo de formulário
const EDUCATION_STAGE_IDS_BY_FORM_TYPE: Record<string, string[]> = {
  'aluno-jovem': [
    'd1142d12-ed98-46f4-ae78-62c963371464', // Educação Infantil
    '614b7d10-b758-42ec-a04e-86f78dc7740a', // Anos Iniciais
    '63cb6876-3221-4fa2-89e8-a82ad1733032', // EJA (filtrar períodos 1-5)
  ],
  'aluno-velho': [
    'c78fcd8e-00a1-485d-8c03-70bcf59e3025', // Anos Finais
    '63cb6876-3221-4fa2-89e8-a82ad1733032', // EJA (filtrar períodos 6-9)
  ],
};

// Função para determinar o tipo de formulário baseado na série
const determineFormTypeFromGrade = async (gradeId: string): Promise<string | null> => {
  if (!gradeId || gradeId === 'all') return null;

  try {
    // Buscar informações da série usando a nova rota de formulários
    const grade = await FormFiltersApiService.getFormGradeDetails(gradeId);

    if (!grade || (!grade.name && !grade.nome)) return null;

    const gradeName = (grade.name || grade.nome || '').toLowerCase();
    const educationStageId = grade.education_stage_id || grade.educationStageId;

    // Verificar por education stage ID
    if (educationStageId) {
      // Anos Iniciais
      if (EDUCATION_STAGE_IDS_BY_FORM_TYPE['aluno-jovem'].includes(educationStageId)) {
        // Se for EJA, verificar período
        if (educationStageId === '63cb6876-3221-4fa2-89e8-a82ad1733032') {
          // EJA: verificar se é período 1-5 (aluno-jovem) ou 6-9 (aluno-velho)
          const periodoMatch = gradeName.match(/(\d+)[°º]/);
          if (periodoMatch) {
            const periodo = parseInt(periodoMatch[1], 10);
            return periodo >= 1 && periodo <= 5 ? 'aluno-jovem' : 'aluno-velho';
          }
          // Se não conseguir determinar, verificar pelo nome
          if (/[1-5][°º]/.test(gradeName) || gradeName.includes('período 1') || gradeName.includes('período 2') || 
              gradeName.includes('período 3') || gradeName.includes('período 4') || gradeName.includes('período 5')) {
            return 'aluno-jovem';
          }
          return 'aluno-velho';
        }
        return 'aluno-jovem';
      }
      // Anos Finais
      if (EDUCATION_STAGE_IDS_BY_FORM_TYPE['aluno-velho'].includes(educationStageId)) {
        return 'aluno-velho';
      }
    }

    // Fallback: verificar pelo nome da série
    // Anos Iniciais (1º ao 5º ano, Educação Infantil)
    if (
      /^(1|2|3|4|5)[°º]/.test(gradeName) ||
      gradeName.includes('infantil') ||
      gradeName.includes('inicial') ||
      gradeName.includes('iniciais') ||
      (gradeName.includes('eja') && /[1-5][°º]/.test(gradeName))
    ) {
      return 'aluno-jovem';
    }

    // Anos Finais (6º ao 9º ano)
    if (
      /^(6|7|8|9)[°º]/.test(gradeName) ||
      gradeName.includes('final') ||
      gradeName.includes('finais') ||
      (gradeName.includes('eja') && /[6-9][°º]/.test(gradeName))
    ) {
      return 'aluno-velho';
    }

    return null;
  } catch (error) {
    console.error('Erro ao determinar tipo de formulário pela série:', error);
    return null;
  }
};

// Interfaces para os filtros
interface State {
  id: string;
  name: string;
  uf: string;
}

interface Municipality {
  id: string;
  name: string;
  state: string;
}

interface School {
  id: string;
  name: string;
}

interface Grade {
  id: string;
  name: string;
}

interface Class {
  id: string;
  name: string;
}

const FormRegistration = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Estados dos filtros
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('all');
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]); // Array vazio = "Todas"
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]); // Array vazio = "Todas"
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]); // Array vazio = "Todas"

  // Estados dos dados dos filtros
  const [states, setStates] = useState<State[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  
  // Debug: Log quando municípios mudarem
  useEffect(() => {
    console.log('Estado de municípios atualizado:', municipalities.length, municipalities);
  }, [municipalities]);
  const [schools, setSchools] = useState<School[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);

  // Estados de loading
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);

  // Estado para tipo de formulário determinado pela série
  const [determinedFormType, setDeterminedFormType] = useState<string | null>(null);
  const [isDeterminingFormType, setIsDeterminingFormType] = useState(false);

  // Estados para formulários disponíveis baseados em escola e município
  const [availableFormTypes, setAvailableFormTypes] = useState<string[]>([]);
  const [selectedFormType, setSelectedFormType] = useState<string | null>(null);

  // Estados para informações do formulário (editáveis pelo usuário)
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formInstructions, setFormInstructions] = useState<string>('');
  const [formDeadline, setFormDeadline] = useState<string>('');

  // Estados para o editor de perguntas
  const [showQuestionEditor, setShowQuestionEditor] = useState(false);
  const [selectedFormTypeForEditor, setSelectedFormTypeForEditor] = useState<string | null>(null);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [searchQuestionTerm, setSearchQuestionTerm] = useState('');
  const [viewingQuestion, setViewingQuestion] = useState<Question | null>(null);

  // Ref para controlar resets em cascata
  const isRestoringFiltersRef = useRef(false);

  // Carregar estados iniciais
  useEffect(() => {
    const loadInitialFilters = async () => {
      try {
        setIsLoadingFilters(true);
        const statesData = await FormFiltersApiService.getFormFilterStates();
        if (statesData && statesData.length > 0) {
          setStates(statesData.map(state => ({
            id: state.id,
            name: state.nome,
            uf: state.id
          })));
        }
      } catch (error) {
        console.error("Erro ao carregar filtros iniciais:", error);
        toast({
          title: "Erro ao carregar filtros",
          description: "Não foi possível carregar os filtros. Tente novamente.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingFilters(false);
      }
    };

    loadInitialFilters();
  }, [toast]);

  // Helpers de reset em cascata
  const resetAfterMunicipality = useCallback(() => {
    setSelectedSchools([]);
    setSchools([]);
    resetAfterSchool();
  }, []);

  const resetAfterSchool = useCallback(() => {
    setSelectedGrades([]);
    setGrades([]);
    resetAfterGrade();
  }, []);

  const resetAfterGrade = useCallback(() => {
    setSelectedClasses([]);
    setClasses([]);
    setDeterminedFormType(null);
    // Não limpar availableFormTypes e selectedFormType aqui
    // Eles serão gerenciados pelos useEffects específicos baseados nos filtros selecionados
  }, []);

  const resetAfterState = useCallback(() => {
    // Não limpar municípios aqui, apenas resetar seleção
    // Os municípios serão carregados pelo useEffect
    setSelectedMunicipality('all');
    resetAfterMunicipality();
  }, [resetAfterMunicipality]);

  // Carregar municípios quando estado for selecionado
  useEffect(() => {
    const loadMunicipalities = async () => {
      if (selectedState !== 'all') {
        try {
          setIsLoadingFilters(true);
          
          // Resetar seleção de município antes de carregar novos (se não estiver restaurando)
          if (!isRestoringFiltersRef.current) {
            setSelectedMunicipality('all');
            resetAfterMunicipality();
          }
          
          const municipalitiesData = await FormFiltersApiService.getFormFilterMunicipalities(selectedState);
          console.log('Municípios recebidos da API:', municipalitiesData);
          
          const mappedMunicipalities = municipalitiesData.map(municipality => ({
            id: municipality.id,
            name: municipality.nome,
            state: selectedState
          }));
          
          console.log('Municípios mapeados:', mappedMunicipalities);
          console.log('Quantidade de municípios:', mappedMunicipalities.length);
          setMunicipalities(mappedMunicipalities);
        } catch (error) {
          console.error("Erro ao carregar municípios:", error);
          setMunicipalities([]);
        } finally {
          setIsLoadingFilters(false);
        }
      } else {
        setMunicipalities([]);
        if (!isRestoringFiltersRef.current) {
          resetAfterState();
        }
      }
    };

    loadMunicipalities();
  }, [selectedState, resetAfterState, resetAfterMunicipality]);

  // Carregar escolas quando município for selecionado
  useEffect(() => {
    const loadSchools = async () => {
      if (selectedState !== 'all' && selectedMunicipality !== 'all') {
        try {
          setIsLoadingFilters(true);
          const schoolsData = await FormFiltersApiService.getFormFilterSchools({
            estado: selectedState,
            municipio: selectedMunicipality
          });
          
          // Remover duplicatas por ID e por nome
          const uniqueSchoolsById = new Map<string, { id: string; name: string }>();
          const uniqueSchoolsByName = new Map<string, string>();
          
          schoolsData.forEach(school => {
            const schoolName = school.nome?.trim() || '';
            const normalizedName = schoolName.toLowerCase().trim();
            
            if (!uniqueSchoolsById.has(school.id) && !uniqueSchoolsByName.has(normalizedName)) {
              uniqueSchoolsById.set(school.id, {
                id: school.id,
                name: schoolName
              });
              uniqueSchoolsByName.set(normalizedName, school.id);
            }
          });
          
          // Converter para array e ordenar por nome
          const uniqueSchools = Array.from(uniqueSchoolsById.values()).sort((a, b) => 
            a.name.localeCompare(b.name)
          );
          
          setSchools(uniqueSchools);
          // Não resetar seleções automaticamente - permitir múltiplas seleções
        } catch (error) {
          console.error("Erro ao carregar escolas:", error);
          setSchools([]);
        } finally {
          setIsLoadingFilters(false);
        }
      } else {
        setSchools([]);
        if (!isRestoringFiltersRef.current) {
          setSelectedSchools([]);
        }
      }
    };

    loadSchools();
  }, [selectedMunicipality, selectedState]);

  // Carregar séries quando escola(s) for(em) selecionada(s)
  useEffect(() => {
    const loadGrades = async () => {
      if (selectedState !== 'all' && selectedMunicipality !== 'all' && selectedSchools.length > 0) {
        try {
          setIsLoadingFilters(true);
          // Carregar séries para todas as escolas selecionadas
          // Se múltiplas escolas, fazer requisições e unir resultados
          const allGradesById = new Map<string, { id: string; name: string }>();
          const allGradesByName = new Map<string, string>(); // Para detectar duplicatas por nome
          
          for (const schoolId of selectedSchools) {
            try {
              const gradesData = await FormFiltersApiService.getFormFilterGrades({
                estado: selectedState,
                municipio: selectedMunicipality,
                escola: schoolId
              });
              gradesData.forEach(grade => {
                const gradeName = grade.nome?.trim() || '';
                // Verificar se já existe por ID ou por nome (normalizado)
                const normalizedName = gradeName.toLowerCase().trim();
                
                if (!allGradesById.has(grade.id) && !allGradesByName.has(normalizedName)) {
                  allGradesById.set(grade.id, {
                    id: grade.id,
                    name: gradeName
                  });
                  allGradesByName.set(normalizedName, grade.id);
                }
              });
            } catch (error) {
              console.error(`Erro ao carregar séries da escola ${schoolId}:`, error);
            }
          }
          
          // Converter para array e ordenar por nome
          const uniqueGrades = Array.from(allGradesById.values()).sort((a, b) => 
            a.name.localeCompare(b.name)
          );
          
          setGrades(uniqueGrades);
        } catch (error) {
          console.error("Erro ao carregar séries:", error);
          setGrades([]);
        } finally {
          setIsLoadingFilters(false);
        }
      } else {
        // Se nenhuma escola selecionada, limpar séries
        setGrades([]);
      }
    };

    loadGrades();
  }, [selectedSchools, selectedState, selectedMunicipality]);

  // Carregar turmas quando série(s) for(em) selecionada(s)
  useEffect(() => {
    const loadClasses = async () => {
      if (selectedState !== 'all' && selectedMunicipality !== 'all' && selectedSchools.length > 0 && selectedGrades.length > 0) {
        try {
          setIsLoadingFilters(true);
          // Carregar turmas para todas as combinações escola-série selecionadas
          const allClassesById = new Map<string, { id: string; name: string }>();
          const allClassesByName = new Map<string, string>(); // Para detectar duplicatas por nome
          
          for (const schoolId of selectedSchools) {
            for (const gradeId of selectedGrades) {
              try {
                const classesData = await FormFiltersApiService.getFormFilterClasses({
                  estado: selectedState,
                  municipio: selectedMunicipality,
                  escola: schoolId,
                  serie: gradeId
                });
                classesData.forEach(classItem => {
                  const className = classItem.nome?.trim() || '';
                  // Verificar se já existe por ID ou por nome (normalizado)
                  const normalizedName = className.toLowerCase().trim();
                  
                  if (!allClassesById.has(classItem.id) && !allClassesByName.has(normalizedName)) {
                    allClassesById.set(classItem.id, {
                      id: classItem.id,
                      name: className
                    });
                    allClassesByName.set(normalizedName, classItem.id);
                  }
                });
              } catch (error) {
                console.error(`Erro ao carregar turmas da escola ${schoolId} e série ${gradeId}:`, error);
              }
            }
          }
          
          // Converter para array e ordenar por nome
          const uniqueClasses = Array.from(allClassesById.values()).sort((a, b) => 
            a.name.localeCompare(b.name)
          );
          
          setClasses(uniqueClasses);
        } catch (error) {
          console.error("Erro ao carregar turmas:", error);
          setClasses([]);
        } finally {
          setIsLoadingFilters(false);
        }
      } else {
        setClasses([]);
      }
    };

    loadClasses();
  }, [selectedGrades, selectedSchools, selectedState, selectedMunicipality]);

  // Determinar formulários disponíveis quando escola(s) for(em) selecionada(s) (sem série)
  useEffect(() => {
    if (selectedState !== 'all' && selectedMunicipality !== 'all' && selectedSchools.length > 0 && selectedGrades.length === 0) {
      // Quando escola(s) está(ão) selecionada(s) mas série não, mostrar professor e diretor
      const expected = ['professor', 'diretor'];
      setAvailableFormTypes(prev => {
        // Só atualizar se for diferente do esperado
        if (JSON.stringify(prev.sort()) !== JSON.stringify(expected.sort())) {
          return expected;
        }
        return prev;
      });
      setDeterminedFormType(null); // Limpar tipo determinado pela série
      // Se há múltiplos tipos, não selecionar automaticamente (usuário deve escolher)
      // Mas manter a seleção atual se já existir
    } else if (selectedGrades.length > 0) {
      // Se série(s) foi(foram) selecionada(s), limpar formulários disponíveis por escola
      setAvailableFormTypes([]);
      setSelectedFormType(null);
    } else if (selectedSchools.length === 0 && selectedState !== 'all' && selectedMunicipality !== 'all') {
      // Se escola foi deselecionada mas município ainda está selecionado, não limpar aqui
      // (será tratado pelo useEffect do município)
    } else if (selectedState === 'all' || selectedMunicipality === 'all') {
      // Limpar apenas se os filtros obrigatórios não estiverem selecionados
      setAvailableFormTypes([]);
      setSelectedFormType(null);
    }
  }, [selectedState, selectedMunicipality, selectedSchools, selectedGrades]);

  // Determinar formulários disponíveis quando município for selecionado (sem escola)
  useEffect(() => {
    if (selectedState !== 'all' && selectedMunicipality !== 'all' && selectedSchools.length === 0) {
      // Quando município está selecionado mas escola não, mostrar secretário
      const expected = ['secretario'];
      setAvailableFormTypes(prev => {
        // Só atualizar se for diferente do esperado
        if (JSON.stringify(prev.sort()) !== JSON.stringify(expected.sort())) {
          return expected;
        }
        return prev;
      });
      setDeterminedFormType(null); // Limpar tipo determinado pela série
      // Selecionar automaticamente quando há apenas um tipo disponível
      setSelectedFormType('secretario');
    } else if (selectedSchools.length > 0) {
      // Se escola foi selecionada, o useEffect acima já vai tratar de definir professor/diretor
      // Não limpar aqui para evitar conflitos
    } else if (selectedState === 'all' || selectedMunicipality === 'all') {
      // Limpar quando filtros obrigatórios não estão selecionados
      setAvailableFormTypes([]);
      setSelectedFormType(null);
    }
  }, [selectedState, selectedMunicipality, selectedSchools]);

  // Determinar tipo de formulário quando série(s) for(em) selecionada(s)
  useEffect(() => {
    const determineFormType = async () => {
      if (selectedGrades.length > 0) {
        setIsDeterminingFormType(true);
        try {
          // Se houver múltiplas séries, verificar tipos de todas
          const formTypes = new Set<string>();
          
          for (const gradeId of selectedGrades) {
            const formType = await determineFormTypeFromGrade(gradeId);
            if (formType) {
              formTypes.add(formType);
            }
          }
          
          // Se todas as séries têm o mesmo tipo, usar esse tipo
          // Se houver tipos diferentes, não determinar automaticamente
          if (formTypes.size === 1) {
            setDeterminedFormType(Array.from(formTypes)[0]);
            setAvailableFormTypes([]);
            setSelectedFormType(null);
          } else if (formTypes.size > 1) {
            // Múltiplos tipos - mostrar opções ou avisar conflito
            setDeterminedFormType(null);
            setAvailableFormTypes(Array.from(formTypes));
            setSelectedFormType(null);
          } else {
            setDeterminedFormType(null);
          }
        } catch (error) {
          console.error('Erro ao determinar tipo de formulário:', error);
          setDeterminedFormType(null);
        } finally {
          setIsDeterminingFormType(false);
        }
      } else {
        setDeterminedFormType(null);
      }
    };

    determineFormType();
  }, [selectedGrades]);

  // Preencher campos com valores sugeridos quando o tipo de formulário for determinado (série) ou selecionado (escola/município)
  useEffect(() => {
    const formTypeToUse = determinedFormType || selectedFormType;
    if (formTypeToUse) {
      const formData = getFormData(formTypeToUse);
      if (formData) {
        // Preencher apenas se os campos estiverem vazios (para não sobrescrever edições do usuário)
        setFormTitle(prev => prev.trim() ? prev : formData.name);
        setFormDescription(prev => prev.trim() ? prev : (formData.description || ''));
      }
    } else {
      // Limpar campos apenas se não houver tipos disponíveis E não houver tipo selecionado
      // Não limpar se houver tipos disponíveis aguardando seleção
      if (!availableFormTypes.length && !determinedFormType && !selectedFormType) {
        setFormTitle('');
        setFormDescription('');
        setFormInstructions('');
        setFormDeadline('');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [determinedFormType, selectedFormType, availableFormTypes.length]);

  // Função para obter dados do formulário baseado no tipo
  const getFormData = useCallback((formType: string) => {
    switch (formType) {
      case 'aluno-jovem':
        return {
          name: 'Aluno (Anos Iniciais)',
          description: 'Questionário socioeconômico para estudantes dos anos iniciais do Ensino Fundamental (1° ao 5° ano), EJA 1° ao 5° período e Educação Infantil.',
          questions: questionsAlunoJovem,
          icon: Users,
          color: 'bg-blue-500'
        };
      case 'aluno-velho':
        return {
          name: 'Aluno (Anos Finais)',
          description: 'Questionário socioeconômico para estudantes dos anos finais do Ensino Fundamental (6° ao 9° ano) e EJA 6° ao 9° período.',
          questions: questionsAlunoVelho,
          icon: GraduationCap,
          color: 'bg-green-500'
        };
      case 'professor':
        return {
          name: 'Professor',
          description: 'Questionário de caracterização e condições de trabalho para professores da Educação Básica.',
          questions: professorQuestions,
          icon: UserCheck,
          color: 'bg-purple-500'
        };
      case 'diretor':
        return {
          name: 'Diretor',
          description: 'Questionário de caracterização da escola e condições de gestão para diretores escolares.',
          questions: diretorQuestions,
          icon: Building2,
          color: 'bg-orange-500'
        };
      case 'secretario':
        return {
          name: 'Secretário Municipal de Educação',
          description: 'Questionário de caracterização e gestão educacional para secretários municipais de educação.',
          questions: secretarioQuestions,
          icon: Shield,
          color: 'bg-indigo-500'
        };
      default:
        return null;
    }
  }, []);

  // Função para abrir editor de perguntas
  const handleOpenQuestionEditor = (formType: string) => {
    const formData = getFormData(formType);
    if (!formData) return;

    setSelectedFormTypeForEditor(formType);
    setAvailableQuestions(formData.questions);
    // Inicializar com todas as perguntas selecionadas
    setSelectedQuestionIds(new Set(formData.questions.map(q => q.id)));
    setSearchQuestionTerm('');
    setShowQuestionEditor(true);
  };

  // Função para alternar seleção de pergunta
  const toggleQuestionSelection = (questionId: string) => {
    setSelectedQuestionIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  // Função para selecionar/deselecionar todas as perguntas
  const toggleAllQuestions = () => {
    if (selectedQuestionIds.size === filteredQuestions.length) {
      setSelectedQuestionIds(new Set());
    } else {
      setSelectedQuestionIds(new Set(filteredQuestions.map(q => q.id)));
    }
  };

  // Função para restaurar todas as perguntas
  const restoreAllQuestions = () => {
    setSelectedQuestionIds(new Set(availableQuestions.map(q => q.id)));
  };

  // Filtrar perguntas por termo de busca
  const filteredQuestions = useMemo(() => {
    if (!searchQuestionTerm.trim()) {
      return availableQuestions;
    }
    const term = searchQuestionTerm.toLowerCase();
    return availableQuestions.filter(q => {
      const text = (q.texto || q.text || '').toLowerCase();
      return text.includes(term);
    });
  }, [availableQuestions, searchQuestionTerm]);

  // Função para enviar formulário
  const handleSendForm = async () => {
    const formTypeToUse = determinedFormType || selectedFormType;
    
    if (!formTypeToUse) {
      toast({
        title: "Erro",
        description: "Selecione um tipo de formulário ou uma série para determinar o tipo.",
        variant: "destructive",
      });
      return;
    }

    if (selectedState === 'all' || selectedMunicipality === 'all' || selectedSchools.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione Estado, Município e pelo menos uma Escola para enviar o formulário.",
        variant: "destructive",
      });
      return;
    }

    // Preparar payload
    const formData = getFormData(formTypeToUse);
    if (!formData) return;

    // Usar perguntas selecionadas ou todas se não houver seleção específica
    const questionsToSend = selectedQuestionIds.size > 0 && selectedFormTypeForEditor === formTypeToUse
      ? formData.questions.filter(q => selectedQuestionIds.has(q.id))
      : formData.questions;

    // Normalizar perguntas para o formato do backend (formato da API)
    const normalizedQuestions = questionsToSend.map((q, index) => {
      const baseQuestion: any = {
        id: q.id,
        text: q.texto || q.text || '',
        type: q.tipo || q.type || 'selecao_unica',
        required: q.obrigatoria !== undefined ? q.obrigatoria : true,
        order: index + 1
      };

      // Adicionar opções se existirem
      if (q.opcoes || q.options) {
        baseQuestion.options = q.opcoes || q.options || [];
      }

      // Adicionar sub-perguntas se existirem
      if (q.subPerguntas || q.subQuestions) {
        baseQuestion.subQuestions = (q.subPerguntas || q.subQuestions || []).map((sp: any) => ({
          id: sp.id,
          text: sp.texto || sp.text || ''
        }));
      }

      // Adicionar campos opcionais se existirem
      if (q.min !== undefined) baseQuestion.min = q.min;
      if (q.max !== undefined) baseQuestion.max = q.max;
      if (q.dependsOn) baseQuestion.dependsOn = q.dependsOn;

      return baseQuestion;
    });

    // Validar título (obrigatório)
    if (!formTitle.trim()) {
      toast({
        title: "Erro",
        description: "O título do formulário é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    // Preparar payload no formato correto da API
    const payload: any = {
      formType: formTypeToUse,
      title: formTitle.trim(),
      questions: normalizedQuestions
    };

    // Adicionar campos opcionais apenas se tiverem valor
    if (formDescription.trim()) {
      payload.description = formDescription.trim();
    }

    if (formInstructions.trim()) {
      payload.instructions = formInstructions.trim();
    }

    // Adicionar deadline se fornecido (formato ISO 8601)
    if (formDeadline.trim()) {
      try {
        // Converter para ISO 8601 se necessário
        const deadlineDate = new Date(formDeadline);
        if (!isNaN(deadlineDate.getTime())) {
          payload.deadline = deadlineDate.toISOString();
        }
      } catch (error) {
        console.error('Erro ao processar data de expiração:', error);
      }
    }

    // Adicionar seleções (arrays) - backend processa múltiplos destinatários usando apenas selected*
    payload.selectedSchools = selectedSchools.length > 0 ? selectedSchools : [];
    payload.selectedGrades = selectedGrades.length > 0 ? selectedGrades : [];
    payload.selectedClasses = selectedClasses.length > 0 ? selectedClasses : [];

    // Adicionar filtros com escopo hierárquico comum
    payload.filters = {
      estado: selectedState,           // Do filtro de navegação
      municipio: selectedMunicipality  // Do filtro de navegação
      // NÃO colocar escola/série/turma (pois podem ser múltiplas)
    };

    // Campos padrão
    payload.isActive = true;

    try {
      // Enviar para o backend usando a rota correta (admin: enviar contexto de cidade)
      const postConfig = selectedMunicipality !== 'all' ? { meta: { cityId: selectedMunicipality } } : {};
      const response = await api.post('/forms', payload, postConfig);
      
      const recipientsCount = response.data?.recipientsCount;
      const message = recipientsCount 
        ? `Formulário criado e enviado com sucesso! ${recipientsCount} destinatário${recipientsCount !== 1 ? 's' : ''} notificado${recipientsCount !== 1 ? 's' : ''}.`
        : "Formulário criado com sucesso!";
      
      toast({
        title: "Sucesso!",
        description: message,
      });

      // Limpar seleções após sucesso (opcional)
      // setSelectedState('all');
      // setSelectedMunicipality('all');
      // setSelectedSchool('all');
      // setSelectedGrade('all');
      // setSelectedClass('all');
      // setDeterminedFormType(null);
    } catch (error: any) {
      console.error('Erro ao enviar formulário:', error);
      toast({
        title: "Erro ao enviar formulário",
        description: error.response?.data?.message || "Não foi possível enviar o formulário. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Dados mockados dos tipos de questionários (para exibição quando não há série selecionada)
  const formTypes: FormType[] = [
    {
      id: 'aluno-jovem',
      name: 'Aluno (Anos Iniciais)',
      description: 'Questionário socioeconômico para estudantes dos anos iniciais do Ensino Fundamental (1° ao 5° ano), EJA 1° ao 5° período e Educação Infantil.',
      targetAudience: 'Estudantes de 6 a 11 anos',
      educationLevel: 'Anos Iniciais, EJA Inicial, Educação Infantil',
      questions: [],
      icon: 'Users',
      color: 'bg-blue-500',
      ageRange: '6-11 anos',
      gradeRange: '1° ao 5° ano',
      specialBadge: 'Infantil'
    },
    {
      id: 'aluno-velho',
      name: 'Aluno (Anos Finais)',
      description: 'Questionário socioeconômico para estudantes dos anos finais do Ensino Fundamental (6° ao 9° ano) e EJA 6° ao 9° período.',
      targetAudience: 'Estudantes de 12 a 17 anos',
      educationLevel: 'Anos Finais, EJA Avançado',
      questions: [],
      icon: 'GraduationCap',
      color: 'bg-green-500',
      ageRange: '12-17 anos',
      gradeRange: '6° ao 9° ano',
      specialBadge: 'Adolescente'
    },
    {
      id: 'professor',
      name: 'Professor',
      description: 'Questionário de caracterização e condições de trabalho para professores da Educação Básica.',
      targetAudience: 'Professores da Educação Básica',
      educationLevel: 'Todos os níveis',
      questions: [],
      icon: 'UserCheck',
      color: 'bg-purple-500'
    },
    {
      id: 'diretor',
      name: 'Diretor',
      description: 'Questionário de caracterização da escola e condições de gestão para diretores escolares.',
      targetAudience: 'Diretores de escolas',
      educationLevel: 'Todos os níveis',
      questions: [],
      icon: 'Building2',
      color: 'bg-orange-500'
    },
    {
      id: 'secretario',
      name: 'Secretário Municipal de Educação',
      description: 'Questionário de caracterização e gestão educacional para secretários municipais de educação.',
      targetAudience: 'Secretários Municipais de Educação',
      educationLevel: 'Gestão Municipal',
      questions: [],
      icon: 'Shield',
      color: 'bg-indigo-500'
    }
  ];

  const getIcon = (iconName: string) => {
    const icons = {
      Users,
      GraduationCap,
      UserCheck,
      Building2,
      Shield
    };
    return icons[iconName as keyof typeof icons] || Users;
  };

  // Função para formatar o tipo de pergunta de forma legível
  const formatQuestionType = (tipo: string | undefined): string => {
    if (!tipo) return '';
    
    const typeMap: Record<string, string> = {
      'selecao_unica': 'Seleção Única',
      'multipla_escolha': 'Múltipla Escolha',
      'matriz_selecao': 'Matriz de Seleção',
      'textarea': 'Texto Livre',
      'slider': 'Slider',
      'multipleChoice': 'Múltipla Escolha',
      'open': 'Texto Aberto',
      'trueFalse': 'Verdadeiro/Falso'
    };
    
    return typeMap[tipo.toLowerCase()] || tipo;
  };

  // Obter dados do formulário determinado ou selecionado
  const formDataToShow = determinedFormType || selectedFormType;
  const determinedFormData = formDataToShow ? getFormData(formDataToShow) : null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            Cadastro de Questionários
          </h1>
          <p className="text-muted-foreground mt-2">
            Selecione os filtros para determinar o público-alvo e configure o questionário
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Destinatários
          </CardTitle>
          <CardDescription>
            Selecione Estado, Município, Escola e Série para determinar o tipo de formulário
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Estado */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado *</label>
              <Select
                value={selectedState}
                onValueChange={setSelectedState}
                disabled={isLoadingFilters}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {states.map(state => (
                    <SelectItem key={state.id} value={state.id}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Município */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Município *</label>
              <Select
                key={`municipality-${selectedState}-${municipalities.length}`}
                value={selectedMunicipality}
                onValueChange={setSelectedMunicipality}
                disabled={isLoadingFilters || selectedState === 'all'}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    isLoadingFilters 
                      ? "Carregando municípios..." 
                      : municipalities.length === 0 
                        ? "Nenhum município disponível" 
                        : "Selecione o município"
                  } />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {municipalities.length > 0 ? (
                    municipalities.map(municipality => (
                      <SelectItem key={municipality.id} value={municipality.id}>
                        {municipality.name}
                      </SelectItem>
                    ))
                  ) : (
                    !isLoadingFilters && selectedState !== 'all' && (
                      <SelectItem value="no-data" disabled>
                        Nenhum município encontrado
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
              {municipalities.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {municipalities.length} município{municipalities.length !== 1 ? 's' : ''} disponível{municipalities.length !== 1 ? 'eis' : ''}
                </p>
              )}
            </div>

            {/* Escola */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Escola(s) *</label>
              <FormMultiSelect
                options={schools.map(school => ({ id: school.id, name: school.name }))}
                selected={selectedSchools}
                onChange={setSelectedSchools}
                placeholder={selectedSchools.length === 0 ? "Selecione escolas" : `${selectedSchools.length} selecionada(s)`}
              />
              {selectedSchools.length === 0 && selectedMunicipality !== 'all' && (
                <p className="text-xs text-muted-foreground">
                  Selecione pelo menos uma escola
                </p>
              )}
            </div>

            {/* Série */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Série(s)</label>
              <FormMultiSelect
                options={grades.map(grade => ({ id: grade.id, name: grade.name }))}
                selected={selectedGrades}
                onChange={setSelectedGrades}
                placeholder={selectedGrades.length === 0 ? "Selecione séries (opcional)" : `${selectedGrades.length} selecionada(s)`}
              />
              {selectedSchools.length > 0 && selectedGrades.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Deixe vazio para enviar a todas as séries
                </p>
              )}
            </div>

            {/* Turma */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Turma(s)</label>
              <FormMultiSelect
                options={classes.map(classItem => ({ id: classItem.id, name: classItem.name }))}
                selected={selectedClasses}
                onChange={setSelectedClasses}
                placeholder={selectedClasses.length === 0 ? "Selecione turmas (opcional)" : `${selectedClasses.length} selecionada(s)`}
              />
              {selectedGrades.length > 0 && selectedClasses.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Deixe vazio para enviar a todas as turmas
                </p>
              )}
            </div>
          </div>

          {/* Informação sobre filtros */}
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-400">
              💡 <strong>Hierarquia dos Filtros:</strong> Estado → Município → Escola → Série → Turma
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
              <strong>Estado</strong> e <strong>Município</strong> são obrigatórios. Você pode selecionar <strong>múltiplas Escolas, Séries e Turmas</strong>.
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
              Deixe <strong>Série</strong> ou <strong>Turma</strong> vazios para enviar a todas.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Seleção de tipo de formulário quando escola está selecionada */}
      {availableFormTypes.length > 0 && selectedGrades.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Selecione o Tipo de Formulário
            </CardTitle>
            <CardDescription>
              {availableFormTypes.length === 1 
                ? 'Um tipo de formulário está disponível para esta seleção.'
                : 'Selecione o tipo de formulário que deseja criar.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableFormTypes.map((formType) => {
                const formData = getFormData(formType);
                if (!formData) return null;
                
                const Icon = formData.icon;
                const isSelected = selectedFormType === formType;
                
                return (
                  <Card
                    key={formType}
                    className={`cursor-pointer transition-all ${
                      isSelected
                        ? 'border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                        : 'border hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedFormType(formType)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-lg ${formData.color}`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{formData.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {formData.description}
                          </p>
                        </div>
                        {isSelected && (
                          <Check className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulário determinado pela série OU selecionado manualmente */}
      {formDataToShow && determinedFormData && (
        <Card className="border-2 border-blue-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${determinedFormData.color}`}>
                  <determinedFormData.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle>{determinedFormData.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {determinedFormData.description}
                  </CardDescription>
                </div>
              </div>
              {isDeterminingFormType && (
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Campos de informações do formulário */}
              <div className="space-y-4 border-b pb-4">
                <div className="space-y-2">
                  <Label htmlFor="form-title" className="text-sm font-medium">
                    Título do Formulário <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="form-title"
                    placeholder="Digite o título do formulário"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full"
                  />
                  {!formTitle.trim() && (
                    <p className="text-xs text-muted-foreground">
                      Sugestão: {determinedFormData.name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="form-description" className="text-sm font-medium">
                    Descrição
                  </Label>
                  <Input
                    id="form-description"
                    placeholder="Digite a descrição do formulário (opcional)"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full"
                  />
                  {!formDescription.trim() && (
                    <p className="text-xs text-muted-foreground">
                      Sugestão: {determinedFormData.description}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="form-instructions" className="text-sm font-medium">
                    Instruções
                  </Label>
                  <textarea
                    id="form-instructions"
                    placeholder="Digite as instruções para preenchimento do formulário (opcional)"
                    value={formInstructions}
                    onChange={(e) => setFormInstructions(e.target.value)}
                    className="w-full min-h-[80px] px-3 py-2 text-sm border border-input bg-background rounded-md ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="form-deadline" className="text-sm font-medium">
                    Data de Expiração
                  </Label>
                  <Input
                    id="form-deadline"
                    type="datetime-local"
                    placeholder="Selecione a data e hora de expiração (opcional)"
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                    className="w-full"
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  {formDeadline && (
                    <p className="text-xs text-muted-foreground">
                      O formulário expirará em: {new Date(formDeadline).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Target className="h-4 w-4" />
                <span>
                  Total de perguntas: {
                    selectedQuestionIds.size > 0 && selectedFormTypeForEditor === formDataToShow
                      ? selectedQuestionIds.size
                      : determinedFormData.questions.length
                  }
                  {selectedQuestionIds.size > 0 && selectedFormTypeForEditor === formDataToShow && (
                    <span className="text-muted-foreground ml-1">
                      (de {determinedFormData.questions.length} disponíveis)
                    </span>
                  )}
                </span>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleOpenQuestionEditor(formDataToShow)}
                  className="flex items-center gap-2"
                >
                  <CheckSquare className="h-4 w-4" />
                  Editar Perguntas
                </Button>
                <Button
                  onClick={handleSendForm}
                  className="flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  Enviar Formulário
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mensagem quando não há série selecionada mas escola está selecionada */}
      {selectedGrades.length === 0 && selectedState !== 'all' && selectedMunicipality !== 'all' && selectedSchools.length > 0 && availableFormTypes.length === 0 && !selectedFormType && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Filter className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Selecione um Tipo de Formulário
            </h3>
            <p className="text-muted-foreground text-center max-w-md">
              Com a escola selecionada, você pode criar formulários para <strong>Professores</strong> ou <strong>Diretores</strong>. 
              Selecione uma série para criar formulários para alunos.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Mensagem quando município está selecionado mas escola não */}
      {selectedState !== 'all' && selectedMunicipality !== 'all' && selectedSchools.length === 0 && availableFormTypes.length === 0 && !selectedFormType && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Filter className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Formulário de Secretário Disponível
            </h3>
            <p className="text-muted-foreground text-center max-w-md">
              Com o município selecionado, você pode criar um formulário para <strong>Secretário Municipal de Educação</strong>.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Mensagem quando não há filtros suficientes */}
      {(selectedState === 'all' || selectedMunicipality === 'all' || selectedSchools.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Filter className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Selecione os filtros obrigatórios
            </h3>
            <p className="text-muted-foreground text-center max-w-md">
              Para criar um questionário, você precisa selecionar: <strong>Estado</strong>, <strong>Município</strong> e pelo menos uma <strong>Escola</strong>.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dialog de Editor de Perguntas */}
      <Dialog open={showQuestionEditor} onOpenChange={setShowQuestionEditor}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Editor de Perguntas
            </DialogTitle>
            <DialogDescription>
              Selecione as perguntas que deseja incluir no questionário. 
              {selectedFormTypeForEditor && (
                <span className="ml-1">
                  Total: {availableQuestions.length} perguntas disponíveis
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col space-y-4">
            {/* Barra de busca e ações */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar perguntas..."
                  value={searchQuestionTerm}
                  onChange={(e) => setSearchQuestionTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAllQuestions}
                className="flex items-center gap-2"
              >
                {selectedQuestionIds.size === filteredQuestions.length ? (
                  <>
                    <Square className="h-4 w-4" />
                    Desmarcar Todas
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-4 w-4" />
                    Marcar Todas
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={restoreAllQuestions}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Restaurar Todas
              </Button>
            </div>

            {/* Contador de seleção */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {selectedQuestionIds.size} de {filteredQuestions.length} perguntas selecionadas
              </span>
              {selectedQuestionIds.size < filteredQuestions.length && (
                <Badge variant="outline">
                  {filteredQuestions.length - selectedQuestionIds.size} removidas
                </Badge>
              )}
            </div>

            {/* Lista de perguntas */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {filteredQuestions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma pergunta encontrada
                </div>
              ) : (
                filteredQuestions.map((question) => {
                  const isSelected = selectedQuestionIds.has(question.id);
                  const questionText = question.texto || question.text || '';
                  const questionType = question.tipo || question.type || '';
                  const formattedType = formatQuestionType(questionType);

                  return (
                    <div
                      key={question.id}
                      className={`p-4 border rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700'
                          : 'bg-card dark:bg-card border-gray-200 dark:border-border hover:bg-muted dark:hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div 
                          className="mt-1 cursor-pointer"
                          onClick={() => toggleQuestionSelection(question.id)}
                        >
                          {isSelected ? (
                            <CheckSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Square className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => toggleQuestionSelection(question.id)}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-muted-foreground">
                              {question.id}
                            </span>
                            {question.obrigatoria !== false && (
                              <Badge variant="outline" className="text-xs">
                                Obrigatória
                              </Badge>
                            )}
                            {formattedType && (
                              <Badge variant="secondary" className="text-xs">
                                {formattedType}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-foreground dark:text-gray-100 line-clamp-2">
                            {questionText}
                          </p>
                          {(question.subPerguntas || question.subQuestions) && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {question.subPerguntas?.length || question.subQuestions?.length || 0} sub-pergunta{(question.subPerguntas?.length || question.subQuestions?.length || 0) !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingQuestion(question);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Rodapé com ações */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {selectedQuestionIds.size > 0 ? (
                <span>
                  {selectedQuestionIds.size} pergunta{selectedQuestionIds.size !== 1 ? 's' : ''} será{selectedQuestionIds.size === 1 ? '' : 'ão'} enviada{selectedQuestionIds.size === 1 ? '' : 's'}
                </span>
              ) : (
                <span className="text-red-600 dark:text-red-400">
                  Nenhuma pergunta selecionada
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowQuestionEditor(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  setShowQuestionEditor(false);
                  toast({
                    title: "Perguntas atualizadas",
                    description: `${selectedQuestionIds.size} pergunta(s) selecionada(s)`,
                  });
                }}
                disabled={selectedQuestionIds.size === 0}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para visualizar detalhes da pergunta */}
      <Dialog open={!!viewingQuestion} onOpenChange={() => setViewingQuestion(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Detalhes da Pergunta
            </DialogTitle>
            <DialogDescription>
              Visualização completa da pergunta e suas opções
            </DialogDescription>
          </DialogHeader>

          {viewingQuestion && (
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {/* ID e Tipo */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {viewingQuestion.id}
                </span>
                {viewingQuestion.obrigatoria !== false && (
                  <Badge variant="outline" className="text-xs">
                    Obrigatória
                  </Badge>
                )}
                {(viewingQuestion.tipo || viewingQuestion.type) && (
                  <Badge variant="secondary" className="text-xs">
                    {formatQuestionType(viewingQuestion.tipo || viewingQuestion.type)}
                  </Badge>
                )}
              </div>

              {/* Texto da Pergunta */}
              <div>
                <Label className="text-sm font-medium text-foreground dark:text-gray-300 mb-2 block">
                  Pergunta:
                </Label>
                <p className="text-base text-foreground dark:text-gray-100">
                  {viewingQuestion.texto || viewingQuestion.text || 'Sem texto'}
                </p>
              </div>

              {/* Opções */}
              {(viewingQuestion.opcoes || viewingQuestion.options) && (
                <div>
                  <Label className="text-sm font-medium text-foreground dark:text-gray-300 mb-2 block">
                    Opções de Resposta:
                  </Label>
                  <div className="space-y-2">
                    {(viewingQuestion.opcoes || viewingQuestion.options || []).map((opcao: string, index: number) => (
                      <div
                        key={index}
                        className="p-2 bg-muted dark:bg-card rounded border border-gray-200 dark:border-border"
                      >
                        <span className="text-sm text-foreground dark:text-gray-300">
                          {index + 1}. {opcao}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sub-perguntas */}
              {(viewingQuestion.subPerguntas || viewingQuestion.subQuestions) && (
                <div>
                  <Label className="text-sm font-medium text-foreground dark:text-gray-300 mb-2 block">
                    Sub-perguntas:
                  </Label>
                  <div className="space-y-2">
                    {(viewingQuestion.subPerguntas || viewingQuestion.subQuestions || []).map((subPergunta: any, index: number) => (
                      <div
                        key={subPergunta.id || index}
                        className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded border border-blue-200 dark:border-blue-800"
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                            {subPergunta.id || `Sub-${index + 1}`}:
                          </span>
                          <span className="text-sm text-foreground dark:text-gray-300">
                            {subPergunta.texto || subPergunta.text || 'Sem texto'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Informações adicionais */}
              <div className="pt-4 border-t space-y-2">
                <div className="text-xs text-muted-foreground">
                  <strong>Tipo:</strong> {formatQuestionType(viewingQuestion.tipo || viewingQuestion.type) || 'Não especificado'}
                </div>
                {viewingQuestion.obrigatoria !== undefined && (
                  <div className="text-xs text-muted-foreground">
                    <strong>Obrigatória:</strong> {viewingQuestion.obrigatoria ? 'Sim' : 'Não'}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setViewingQuestion(null)}
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FormRegistration;
