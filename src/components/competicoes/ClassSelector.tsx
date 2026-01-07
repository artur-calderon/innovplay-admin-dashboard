import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { 
  Users, 
  School, 
  Search, 
  CheckCircle, 
  X, 
  GraduationCap,
  MapPin,
  Filter,
  Globe,
  RotateCcw,
  Building2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage, getErrorSuggestion } from '@/utils/errorHandler';
import type { ClassSelectorProps, ClassForSelection } from '@/types/competition-types';

export const ClassSelector = ({
  open,
  onClose,
  selectedClasses,
  onClassesSelected,
  filterBySchool,
  filterByGrade
}: ClassSelectorProps) => {
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassForSelection[]>([]);
  const [selected, setSelected] = useState<string[]>(selectedClasses);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [schoolFilter, setSchoolFilter] = useState<string>(filterBySchool || 'all');
  const [gradeFilter, setGradeFilter] = useState<string>(filterByGrade || 'all');
  const [sortBy, setSortBy] = useState<string>('nome');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Carregar turmas quando o modal abrir
  useEffect(() => {
    if (open) {
      setSelected(selectedClasses);
      loadClasses();
    }
  }, [open, selectedClasses]);

  const loadClasses = async () => {
    try {
      setIsLoading(true);
      
      // Buscar todas as escolas primeiro (mesmo método usado em Turmas.tsx)
      let allSchools: any[] = [];
      try {
        // Tentar /school primeiro (singular, como em Turmas.tsx)
        const schoolsResponse = await api.get("/school");
        allSchools = Array.isArray(schoolsResponse.data) 
          ? schoolsResponse.data 
          : Object.values(schoolsResponse.data || {});
        console.log(`Escolas carregadas via /school: ${allSchools.length}`);
      } catch (schoolsError) {
        console.log('Erro ao buscar escolas via /school, tentando /school/:', schoolsError);
        try {
          // Tentar /school/ (com barra)
          const altResponse = await api.get("/school/");
          allSchools = Array.isArray(altResponse.data) 
            ? altResponse.data 
            : Object.values(altResponse.data || {});
          console.log(`Escolas carregadas via /school/: ${allSchools.length}`);
        } catch (altError) {
          console.log('Erro ao buscar escolas via /school/, tentando /schools/:', altError);
          try {
            // Tentar /schools/ (plural) como último recurso
            const pluralResponse = await api.get("/schools/");
            allSchools = Array.isArray(pluralResponse.data) 
              ? pluralResponse.data 
              : Object.values(pluralResponse.data || {});
            console.log(`Escolas carregadas via /schools/: ${allSchools.length}`);
          } catch (pluralError) {
            console.log('Erro ao buscar escolas (todos os endpoints falharam):', pluralError);
            toast({
              title: "Erro",
              description: "Não foi possível carregar as escolas.",
              variant: "destructive",
            });
          }
        }
      }
      
      if (allSchools.length === 0) {
        console.log('Nenhuma escola encontrada, não é possível carregar turmas');
        setClasses([]);
        setIsLoading(false);
        return;
      }
      
      console.log('Exemplo de escola:', allSchools[0]);
      
      // Buscar turmas de todas as escolas (endpoint /classes/school/${schoolId} retorna students_count)
      const turmasPromises = allSchools.map(async (school: any) => {
        try {
          const response = await api.get(`/classes/school/${school.id}`);
          const classes = Array.isArray(response.data) ? response.data : [];
          
          console.log(`Escola ${school.name} (${school.id}): ${classes.length} turmas encontradas`);
          if (classes.length > 0) {
            console.log(`Exemplo de turma da escola ${school.name}:`, {
              id: classes[0].id,
              name: classes[0].name,
              students_count: classes[0].students_count
            });
          }
          
          // Garantir que cada turma tenha o school_id e dados da escola
          return classes.map((classItem: any) => ({
            ...classItem,
            school_id: school.id,
            school: school
          }));
        } catch (error) {
          console.error(`Erro ao buscar turmas da escola ${school.name} (${school.id}):`, error);
          return [];
        }
      });
      
      const turmasArrays = await Promise.all(turmasPromises);
      const allTurmas = turmasArrays.flat();
      
      console.log('Total de turmas carregadas:', allTurmas.length);
      console.log('Exemplo de turma final:', {
        id: allTurmas[0]?.id,
        name: allTurmas[0]?.name,
        school_id: allTurmas[0]?.school_id,
        students_count: allTurmas[0]?.students_count
      });
      
      // Usar allTurmas como response.data para o resto do código
      const response = { data: allTurmas };
      
      // Criar mapa de escolas (já temos allSchools)
      const schoolsData: Record<string, any> = {};
      allSchools.forEach((school: any) => {
        if (school && school.id) {
          schoolsData[school.id] = school;
        }
      });
      console.log('Dados de escolas mapeados:', Object.keys(schoolsData).length);
      
      // Buscar dados de estados e municípios usando os endpoints corretos
      let statesData: Record<string, any> = {};
      let municipalitiesData: Record<string, any> = {};
      let cityToMunicipalityMap: Record<string, string> = {}; // city_id -> municipality_id
      let municipalityNameToStateMap: Record<string, string> = {}; // nome município (uppercase) -> nome estado
      
      try {
        // 1. Tentar buscar estados via endpoint unificado (como em Results.tsx)
        let states: any[] = [];
        try {
          const filterOptionsResponse = await api.get('/evaluation-results/opcoes-filtros');
          if (filterOptionsResponse.data?.estados && Array.isArray(filterOptionsResponse.data.estados)) {
            states = filterOptionsResponse.data.estados;
            console.log(`Estados carregados via /evaluation-results/opcoes-filtros: ${states.length}`);
          }
        } catch (filterError) {
          console.log('Erro ao buscar estados via opcoes-filtros, tentando /city/states:', filterError);
        }
        
        // Fallback: buscar estados via /city/states
        if (states.length === 0) {
          try {
            const statesResponse = await api.get('/city/states');
            states = Array.isArray(statesResponse.data) ? statesResponse.data : [];
            console.log(`Estados carregados via /city/states: ${states.length}`);
          } catch (statesError) {
            console.log('Erro ao buscar estados via /city/states:', statesError);
            // Tentar buscar todos os municípios de uma vez para criar o mapeamento
            try {
              const allMunicipalitiesResponse = await api.get('/city/municipalities');
              const allMunicipalities = Array.isArray(allMunicipalitiesResponse.data) 
                ? allMunicipalitiesResponse.data 
                : [];
              console.log(`Municípios carregados diretamente: ${allMunicipalities.length}`);
              
              // Extrair estados únicos dos municípios
              const uniqueStateIds = new Set<string>();
              allMunicipalities.forEach((municipality: any) => {
                if (municipality.state_id || municipality.estado_id) {
                  uniqueStateIds.add(String(municipality.state_id || municipality.estado_id));
                }
              });
              
              // Buscar estados pelos IDs encontrados
              for (const stateId of uniqueStateIds) {
                try {
                  const stateResponse = await api.get(`/city/states/${stateId}`);
                  if (stateResponse.data) {
                    states.push(stateResponse.data);
                  }
                } catch (err) {
                  console.log(`Erro ao buscar estado ${stateId}:`, err);
                }
              }
              
              // Mapear municípios diretamente
              allMunicipalities.forEach((municipality: any) => {
                if (municipality && municipality.id) {
                  municipalitiesData[municipality.id] = {
                    id: municipality.id,
                    nome: municipality.nome || municipality.name || '',
                    estado_id: municipality.state_id || municipality.estado_id || ''
                  };
                }
              });
            } catch (municipalitiesError) {
              console.log('Erro ao buscar municípios diretamente:', municipalitiesError);
            }
          }
        }
        
        // Mapear estados
        states.forEach((state: any) => {
          if (state && state.id) {
            statesData[state.id] = {
              id: state.id,
              nome: state.nome || state.name || state.sigla || '',
              sigla: state.sigla || state.uf || ''
            };
          }
        });
        console.log(`Total de estados mapeados: ${Object.keys(statesData).length}`);
        
        // 2. Coletar todos os city_ids únicos das escolas
        const cityIds = new Set<string>();
        
        // Coletar das escolas já carregadas (allSchools)
        allSchools.forEach((school: any) => {
          if (school.city_id) {
            cityIds.add(String(school.city_id));
          }
          if (school.municipality_id) {
            cityIds.add(String(school.municipality_id));
          }
        });
        
        // Também coletar do cache de escolas (se disponível)
        Object.values(schoolsData).forEach((school: any) => {
          if (school.city_id) {
            cityIds.add(String(school.city_id));
          }
          if (school.municipality_id) {
            cityIds.add(String(school.municipality_id));
          }
        });
        
        // Também coletar dos dados de turmas (já incluem school)
        (response.data || []).forEach((item: any) => {
          const school = item.school;
          if (school?.city_id) {
            cityIds.add(String(school.city_id));
          }
          if (school?.municipality_id) {
            cityIds.add(String(school.municipality_id));
          }
        });
        
        console.log(`City IDs encontrados nas escolas: ${Array.from(cityIds).length} únicos`);
        
        // 3. Buscar municípios de todos os estados
        console.log(`Buscando municípios de ${Object.keys(statesData).length} estados...`);
        
        const allMunicipalitiesPromises = Object.keys(statesData).map(async (stateId) => {
          try {
            // Tentar primeiro via endpoint unificado
            let municipalities: any[] = [];
            try {
              const filterOptionsResponse = await api.get(`/evaluation-results/opcoes-filtros?estado=${stateId}`);
              if (filterOptionsResponse.data?.municipios && Array.isArray(filterOptionsResponse.data.municipios)) {
                municipalities = filterOptionsResponse.data.municipios;
                console.log(`Estado ${stateId}: ${municipalities.length} municípios via opcoes-filtros`);
              }
            } catch (filterError) {
              // Fallback: usar /city/municipalities/state/${stateId}
              try {
                const municipalitiesResponse = await api.get(`/city/municipalities/state/${stateId}`);
                municipalities = Array.isArray(municipalitiesResponse.data) 
                  ? municipalitiesResponse.data 
                  : [];
                console.log(`Estado ${stateId}: ${municipalities.length} municípios via /city/municipalities/state/${stateId}`);
              } catch (municipalityError) {
                console.log(`Erro ao buscar municípios do estado ${stateId}:`, municipalityError);
              }
            }
            
            municipalities.forEach((municipality: any) => {
              if (municipality && municipality.id) {
                municipalitiesData[municipality.id] = {
                  id: municipality.id,
                  nome: municipality.nome || municipality.name || '',
                  estado_id: stateId
                };
                
                // Verificar se algum city_id corresponde a este municipality_id
                cityIds.forEach(cityId => {
                  if (String(cityId) === String(municipality.id)) {
                    cityToMunicipalityMap[cityId] = municipality.id;
                    console.log(`Mapeado: city_id ${cityId} -> municipality_id ${municipality.id} (${municipality.nome || municipality.name})`);
                  }
                });
              }
            });
          } catch (err) {
            console.log(`Erro ao buscar municípios do estado ${stateId}:`, err);
          }
        });
        
        await Promise.all(allMunicipalitiesPromises);
        
        console.log(`Total de municípios carregados: ${Object.keys(municipalitiesData).length}`);
        console.log(`Mapeamentos city_id -> municipality_id: ${Object.keys(cityToMunicipalityMap).length}`);
        
        // Criar mapeamento reverso: nome do município -> estado (para quando já temos o nome do município)
        Object.values(municipalitiesData).forEach((municipality: any) => {
          if (municipality.nome && municipality.estado_id) {
            const stateName = statesData[municipality.estado_id]?.nome || statesData[municipality.estado_id]?.name || '';
            if (stateName) {
              municipalityNameToStateMap[municipality.nome.toUpperCase()] = stateName;
            }
          }
        });
        console.log(`Mapeamentos nome município -> estado: ${Object.keys(municipalityNameToStateMap).length}`);
      } catch (error) {
        console.log('Erro ao buscar dados de estados e municípios:', error);
      }
      
      // Coletar contagens de alunos (já vêm nos dados de /classes/school/${schoolId})
      let studentsCountData: Record<string, number> = {};
      (response.data || []).forEach((item: any) => {
        const count = item.students_count || item.total_alunos || item.studentsCount || item.totalAlunos;
        if (count !== undefined && count !== null && count !== '') {
          studentsCountData[item.id] = Number(count);
        }
      });
      
      console.log(`Contagens coletadas: ${Object.keys(studentsCountData).length} turmas com contagem`);
      
      // Para turmas sem contagem, buscar individualmente
      const classesWithoutCount = (response.data || []).filter((item: any) => !studentsCountData[item.id]);
      if (classesWithoutCount.length > 0) {
        console.log(`Buscando contagens para ${classesWithoutCount.length} turmas sem contagem...`);
        
        const countPromises = classesWithoutCount.map(async (item: any) => {
          try {
            const studentsResponse = await api.get(`/classes/${item.id}/students`);
            if (Array.isArray(studentsResponse.data)) {
              studentsCountData[item.id] = studentsResponse.data.length;
            }
          } catch (err) {
            console.log(`Erro ao buscar alunos da turma ${item.id}:`, err);
            studentsCountData[item.id] = 0;
          }
        });
        
        await Promise.all(countPromises);
      }
      
      console.log('Contagens finais de alunos:', studentsCountData);
      
      // Log antes de normalizar
      console.log('studentsCountData antes da normalização:', studentsCountData);
      console.log('Total de contagens:', Object.keys(studentsCountData).length);
      
      // Normalizar dados da API com múltiplas tentativas de mapeamento
      const normalizedClasses: ClassForSelection[] = (response.data || []).map((item: Record<string, unknown>) => {
        // Tentar múltiplas formas de acessar os dados
        const school = item.school as Record<string, unknown> | undefined;
        const grade = item.grade as Record<string, unknown> | undefined;
        const schoolId = school?.id as string || item.school_id as string || item.escola_id as string || '';
        
        // Buscar dados da escola no cache se disponível
        const cachedSchool = schoolId ? schoolsData[schoolId] : null;
        
        // Obter city_id da escola (que pode ser na verdade um municipality_id)
        const cityId = 
          cachedSchool?.city_id ||
          school?.city_id as string ||
          (school as any)?.cityId ||
          item.city_id as string ||
          '';
        
        // Buscar municipality_id correspondente
        const municipalityId = cityId ? (cityToMunicipalityMap[cityId] || cityId) : '';
        
        // Buscar dados do município no cache
        const cachedMunicipality = municipalityId ? municipalitiesData[municipalityId] : null;
        
        // Buscar dados do estado através do município
        const stateId = cachedMunicipality?.state_id || cachedMunicipality?.stateId || (cachedMunicipality as any)?.state?.id;
        const cachedState = stateId ? statesData[stateId] : null;
        
        // Estado - usar dados do estado encontrado
        const estado = 
          cachedState?.nome ||
          cachedState?.name ||
          cachedState?.acronym ||
          cachedState?.sigla ||
          (cachedMunicipality as any)?.state?.nome ||
          (cachedMunicipality as any)?.state?.name ||
          (cachedMunicipality as any)?.state?.acronym ||
          cachedMunicipality?.estado ||
          cachedMunicipality?.state ||
          cachedSchool?.state ||
          cachedSchool?.estado ||
          school?.state as string ||
          school?.estado as string ||
          (school as any)?.address?.state as string ||
          item.estado as string ||
          item.state as string ||
          '';
        
        // Município - usar dados do município encontrado
        const municipio = 
          cachedMunicipality?.nome ||
          cachedMunicipality?.name ||
          cachedMunicipality?.municipality ||
          cachedMunicipality?.municipio ||
          cachedSchool?.municipality ||
          cachedSchool?.municipio ||
          cachedSchool?.city ||
          cachedSchool?.cidade ||
          school?.municipality as string ||
          school?.municipio as string ||
          school?.city as string ||
          school?.cidade as string ||
          (school as any)?.address?.city as string ||
          item.municipio as string ||
          item.municipality as string ||
          item.city as string ||
          item.cidade as string ||
          '';
        
        // Se não encontrou estado mas encontrou município, tentar buscar pelo nome do município
        let estadoFinal = estado;
        if (!estadoFinal && municipio) {
          const municipioUpper = municipio.toUpperCase();
          estadoFinal = municipalityNameToStateMap[municipioUpper] || '';
          if (estadoFinal) {
            console.log(`Estado encontrado via mapeamento de município: ${municipio} -> ${estadoFinal}`);
          }
        }
        
        const normalized = {
          id: item.id as string,
          nome: item.name as string || item.nome as string || 'Sem nome',
          serie: grade?.name as string || item.serie as string || item.grade_name as string || 'Série não informada',
          escola: school?.name as string || item.escola as string || item.school_name as string || 'Escola não informada',
          escola_id: school?.id as string || item.escola_id as string || item.school_id as string || '',
          total_alunos: (() => {
            const classId = item.id as string;
            
            // Primeiro, verificar se temos contagem em cache
            if (studentsCountData[classId] !== undefined) {
              return Number(studentsCountData[classId]) || 0;
            }
            
            // Tentar múltiplas formas de acessar a quantidade de alunos
            const studentsCount = 
              item.students_count as number ||
              item.total_alunos as number ||
              item.studentsCount as number ||
              item.totalAlunos as number ||
              item.student_count as number ||
              item.aluno_count as number ||
              (item.students as any[])?.length ||
              (item.alunos as any[])?.length ||
              (item.students as any)?.count ||
              (item.alunos as any)?.count ||
              school?.students_count as number ||
              school?.total_alunos as number ||
              (school as any)?.students?.length ||
              (school as any)?.students?.count ||
              cachedSchool?.students_count ||
              cachedSchool?.total_alunos ||
              (cachedSchool?.students as any[])?.length ||
              (cachedSchool?.students as any)?.count ||
              0;
            
            const finalCount = Number(studentsCount) || 0;
            
            // Log para debug se não encontrar alunos
            if (finalCount === 0) {
              console.log('Turma sem alunos encontrada:', {
                id: classId,
                nome: item.name || item.nome,
                students_count: item.students_count,
                total_alunos: item.total_alunos,
                students: item.students,
                alunos: item.alunos,
                school: school
              });
            }
            
            return finalCount;
          })(),
          municipio: municipio,
          estado: estadoFinal
        };
        
        // Log para debug
        if (normalized.estado || normalized.municipio || cityId) {
          console.log('Turma normalizada:', {
            id: normalized.id,
            nome: normalized.nome,
            escola_id: normalized.escola_id,
            city_id: cityId,
            municipality_id: municipalityId,
            estado: normalized.estado,
            municipio: normalized.municipio,
            escola: normalized.escola,
            municipio_cache: cachedMunicipality ? { 
              id: cachedMunicipality.id, 
              nome: cachedMunicipality.nome || cachedMunicipality.name,
              state_id: cachedMunicipality.state_id 
            } : null,
            estado_cache: cachedState ? { 
              id: cachedState.id, 
              nome: cachedState.nome || cachedState.name,
              sigla: cachedState.sigla || cachedState.acronym 
            } : null,
            escola_cache: cachedSchool ? { 
              id: cachedSchool.id, 
              name: cachedSchool.name,
              city_id: cachedSchool.city_id 
            } : null
          });
        }
        
        return normalized;
      });
      
      console.log('Turmas normalizadas:', normalizedClasses);
      console.log('Estados encontrados:', [...new Set(normalizedClasses.map(c => c.estado).filter(Boolean))]);
      console.log('Municípios encontrados:', [...new Set(normalizedClasses.map(c => c.municipio).filter(Boolean))]);
      
      // Log detalhado sobre quantidade de alunos
      const turmasComAlunos = normalizedClasses.filter(c => c.total_alunos > 0);
      const turmasSemAlunos = normalizedClasses.filter(c => c.total_alunos === 0);
      console.log(`Quantidade de alunos: ${turmasComAlunos.length} turmas com alunos, ${turmasSemAlunos.length} turmas sem alunos`);
      console.log('Contagens de alunos por turma:', normalizedClasses.map(c => ({ 
        id: c.id, 
        nome: c.nome, 
        alunos: c.total_alunos 
      })));
      if (turmasSemAlunos.length > 0) {
        console.log('Turmas sem alunos:', turmasSemAlunos.map(c => ({ 
          id: c.id, 
          nome: c.nome,
          escola_id: c.escola_id,
          dados_originais: (response.data || []).find((item: any) => item.id === c.id)
        })));
      }
      const totalAlunos = normalizedClasses.reduce((sum, c) => sum + c.total_alunos, 0);
      console.log(`Total de alunos em todas as turmas: ${totalAlunos}`);
      
      setClasses(normalizedClasses);
    } catch (error) {
      console.error('Erro ao carregar turmas:', error);
      
      const errorMessage = getErrorMessage(error, "Não foi possível carregar as turmas disponíveis. Tente novamente.");
      const suggestion = getErrorSuggestion(error);
      
      toast({
        title: "Erro ao carregar turmas",
        description: suggestion ? `${errorMessage} ${suggestion}` : errorMessage,
        variant: "destructive",
        duration: 5000,
      });
      setClasses([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Extrair estados, cidades, escolas e séries únicas para filtros
  // IMPORTANTE: Apenas turmas com alunos (total_alunos > 0) são consideradas
  const { uniqueStates, uniqueCities, uniqueSchools, uniqueGrades } = useMemo(() => {
    // Filtrar apenas turmas que têm alunos
    const classesWithStudents = classes.filter(c => c.total_alunos > 0);
    
    // Filtra classes baseado nos filtros já aplicados para mostrar apenas opções disponíveis
    let filteredForCities = classesWithStudents;
    let filteredForSchools = classesWithStudents;
    let filteredForGrades = classesWithStudents;
    
    // Filtrar por estado para mostrar cidades disponíveis
    if (stateFilter !== 'all') {
      filteredForCities = filteredForCities.filter(c => c.estado && c.estado === stateFilter);
      filteredForSchools = filteredForSchools.filter(c => c.estado && c.estado === stateFilter);
      filteredForGrades = filteredForGrades.filter(c => c.estado && c.estado === stateFilter);
    }
    
    // Filtrar por cidade para mostrar escolas disponíveis
    if (cityFilter !== 'all') {
      filteredForSchools = filteredForSchools.filter(c => c.municipio && c.municipio === cityFilter);
      filteredForGrades = filteredForGrades.filter(c => c.municipio && c.municipio === cityFilter);
    }
    
    // Filtrar por escola para mostrar séries disponíveis
    if (schoolFilter !== 'all') {
      filteredForGrades = filteredForGrades.filter(c => c.escola && c.escola === schoolFilter);
    }
    
    // Extrair estados únicos (apenas de turmas com alunos)
    const states = [...new Set(
      classesWithStudents
        .map(c => c.estado)
        .filter((estado): estado is string => Boolean(estado) && estado.trim() !== '')
    )].sort();
    
    // Extrair cidades únicas (apenas de turmas com alunos)
    const cities = [...new Set(
      filteredForCities
        .map(c => c.municipio)
        .filter((municipio): municipio is string => Boolean(municipio) && municipio.trim() !== '')
    )].sort();
    
    // Extrair escolas únicas (apenas escolas que têm turmas com alunos)
    const schools = [...new Set(
      filteredForSchools
        .map(c => c.escola)
        .filter((escola): escola is string => Boolean(escola) && escola.trim() !== '')
    )].sort();
    
    // Extrair séries únicas (apenas séries que têm turmas visíveis com os filtros aplicados)
    const grades = [...new Set(
      filteredForGrades
        .map(c => c.serie)
        .filter((serie): serie is string => Boolean(serie) && serie.trim() !== '')
    )].sort();
    
    console.log('Filtros extraídos (apenas com alunos):', {
      total_turmas: classes.length,
      turmas_com_alunos: classesWithStudents.length,
      estados: states.length,
      cidades: cities.length,
      escolas: schools.length,
      series: grades.length,
      estadosList: states,
      cidadesList: cities,
      escolasList: schools,
      seriesList: grades
    });
    
    return { uniqueStates: states, uniqueCities: cities, uniqueSchools: schools, uniqueGrades: grades };
  }, [classes, stateFilter, cityFilter, schoolFilter]);

  // Filtrar turmas (apenas turmas com alunos)
  const filteredClasses = useMemo(() => {
    let result = classes.filter(turma => {
      // Primeiro, filtrar apenas turmas com alunos
      if (turma.total_alunos === 0) {
        return false;
      }
      
      const matchesSearch = turma.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           turma.escola.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           turma.serie.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (turma.estado || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (turma.municipio || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesState = stateFilter === 'all' || turma.estado === stateFilter;
      const matchesCity = cityFilter === 'all' || turma.municipio === cityFilter;
      const matchesSchool = schoolFilter === 'all' || turma.escola === schoolFilter;
      const matchesGrade = gradeFilter === 'all' || turma.serie === gradeFilter;
      
      return matchesSearch && matchesState && matchesCity && matchesSchool && matchesGrade;
    });

    // Ordenação
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'nome':
          comparison = a.nome.localeCompare(b.nome);
          break;
        case 'alunos':
          comparison = a.total_alunos - b.total_alunos;
          break;
        case 'escola':
          comparison = a.escola.localeCompare(b.escola);
          break;
        case 'serie':
          comparison = a.serie.localeCompare(b.serie);
          break;
        case 'cidade':
          comparison = (a.municipio || '').localeCompare(b.municipio || '');
          break;
        case 'estado':
          comparison = (a.estado || '').localeCompare(b.estado || '');
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [classes, searchTerm, stateFilter, cityFilter, schoolFilter, gradeFilter, sortBy, sortOrder]);

  // Limpar todos os filtros
  const handleClearFilters = () => {
    setSearchTerm('');
    setStateFilter('all');
    setCityFilter('all');
    setSchoolFilter('all');
    setGradeFilter('all');
    setSortBy('nome');
    setSortOrder('asc');
  };

  // Verificar se algum filtro está aplicado
  const hasActiveFilters = searchTerm || stateFilter !== 'all' || cityFilter !== 'all' || schoolFilter !== 'all' || gradeFilter !== 'all';

  // Toggle de ordenação
  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  // Estatísticas de seleção por região
  const selectionStats = useMemo(() => {
    const selectedClasses = classes.filter(c => selected.includes(c.id));
    const states = [...new Set(selectedClasses.map(c => c.estado).filter(Boolean))];
    const cities = [...new Set(selectedClasses.map(c => c.municipio).filter(Boolean))];
    const grades = [...new Set(selectedClasses.map(c => c.serie))];
    const schools = [...new Set(selectedClasses.map(c => c.escola))];
    const totalStudents = selectedClasses.reduce((sum, c) => sum + c.total_alunos, 0);
    
    return { states: states.length, cities: cities.length, grades: grades.length, schools: schools.length, totalStudents };
  }, [classes, selected]);

  // Toggle seleção de turma
  const handleToggle = (classId: string) => {
    setSelected(prev =>
      prev.includes(classId)
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  // Selecionar todas as turmas visíveis
  const handleSelectAll = () => {
    const visibleIds = filteredClasses.map(c => c.id);
    setSelected(prev => {
      const newSelection = [...prev];
      visibleIds.forEach(id => {
        if (!newSelection.includes(id)) {
          newSelection.push(id);
        }
      });
      return newSelection;
    });
  };

  // Desselecionar todas
  const handleDeselectAll = () => {
    const visibleIds = filteredClasses.map(c => c.id);
    setSelected(prev => prev.filter(id => !visibleIds.includes(id)));
  };

  // Confirmar seleção
  const handleConfirm = () => {
    onClassesSelected(selected);
    onClose();
  };

  // Calcular total de alunos selecionados
  const totalSelectedStudents = useMemo(() => {
    return classes
      .filter(c => selected.includes(c.id))
      .reduce((sum, c) => sum + c.total_alunos, 0);
  }, [classes, selected]);

  // Verificar se todas as turmas visíveis estão selecionadas
  const allVisibleSelected = filteredClasses.length > 0 && 
    filteredClasses.every(c => selected.includes(c.id));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Selecionar Turmas para a Competição
          </DialogTitle>
          <DialogDescription>
            Escolha as turmas que poderão participar. Os alunos dessas turmas serão elegíveis para inscrição.
          </DialogDescription>
        </DialogHeader>

        {/* Filtros */}
        <div className="space-y-3 py-3 border-b">
          {/* Primeira linha: Busca e botão limpar */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Buscar turma, escola, estado, município..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {hasActiveFilters && (
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleClearFilters}
                title="Limpar todos os filtros"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Segunda linha: Filtros de Estado, Cidade */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="w-full">
              <Select 
                value={stateFilter} 
                onValueChange={(value) => {
                  setStateFilter(value);
                  // Reset cidade e escola quando mudar estado
                  if (value !== stateFilter) {
                    setCityFilter('all');
                    setSchoolFilter('all');
                  }
                }}
              >
                <SelectTrigger className={`w-full ${stateFilter !== 'all' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : ''}`}>
                  <Globe className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Estados</SelectItem>
                  {uniqueStates.length > 0 ? (
                    uniqueStates.map(state => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-data" disabled>
                      Nenhum estado disponível
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full">
              <Select 
                value={cityFilter} 
                onValueChange={(value) => {
                  setCityFilter(value);
                  // Reset escola quando mudar cidade
                  if (value !== cityFilter) {
                    setSchoolFilter('all');
                  }
                }}
                disabled={stateFilter !== 'all' && uniqueCities.length === 0}
              >
                <SelectTrigger className={`w-full ${cityFilter !== 'all' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : ''}`}>
                  <Building2 className="w-4 h-4 mr-2" />
                  <SelectValue placeholder={stateFilter !== 'all' && uniqueCities.length === 0 ? "Selecione um estado primeiro" : "Cidade"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Cidades</SelectItem>
                  {uniqueCities.length > 0 ? (
                    uniqueCities.map(city => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-data" disabled>
                      {stateFilter !== 'all' ? 'Nenhuma cidade disponível neste estado' : 'Nenhuma cidade disponível'}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Terceira linha: Filtros de Escola, Série */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Select 
              value={schoolFilter} 
              onValueChange={setSchoolFilter}
            >
              <SelectTrigger className={schoolFilter !== 'all' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : ''}>
                <School className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Escola" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Escolas</SelectItem>
                {uniqueSchools.map(school => (
                  <SelectItem key={school} value={school}>
                    {school}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={gradeFilter} 
              onValueChange={setGradeFilter}
            >
              <SelectTrigger className={gradeFilter !== 'all' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : ''}>
                <GraduationCap className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Série" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Séries</SelectItem>
                {uniqueGrades.map(grade => (
                  <SelectItem key={grade} value={grade}>
                    {grade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quarta linha: Ordenação */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ArrowUpDown className="w-4 h-4" />
              <span>Ordenar por:</span>
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nome">Nome</SelectItem>
                <SelectItem value="alunos">Qtd. Alunos</SelectItem>
                <SelectItem value="escola">Escola</SelectItem>
                <SelectItem value="serie">Série</SelectItem>
                <SelectItem value="cidade">Cidade</SelectItem>
                <SelectItem value="estado">Estado</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleSortOrder}
              title={sortOrder === 'asc' ? 'Ordem crescente' : 'Ordem decrescente'}
            >
              {sortOrder === 'asc' ? (
                <ArrowUp className="w-4 h-4" />
              ) : (
                <ArrowDown className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Badges de filtros ativos */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2">
              {stateFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  <Globe className="w-3 h-3" />
                  {stateFilter}
                  <button 
                    onClick={() => { setStateFilter('all'); setCityFilter('all'); setSchoolFilter('all'); }}
                    className="ml-1 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {cityFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  <Building2 className="w-3 h-3" />
                  {cityFilter.length > 15 ? cityFilter.substring(0, 15) + '...' : cityFilter}
                  <button 
                    onClick={() => { setCityFilter('all'); setSchoolFilter('all'); }}
                    className="ml-1 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {schoolFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  <School className="w-3 h-3" />
                  {schoolFilter.length > 15 ? schoolFilter.substring(0, 15) + '...' : schoolFilter}
                  <button 
                    onClick={() => setSchoolFilter('all')}
                    className="ml-1 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {gradeFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  <GraduationCap className="w-3 h-3" />
                  {gradeFilter}
                  <button 
                    onClick={() => setGradeFilter('all')}
                    className="ml-1 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Ações em lote */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={allVisibleSelected}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Selecionar Todas
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeselectAll}
              disabled={!filteredClasses.some(c => selected.includes(c.id))}
            >
              <X className="w-4 h-4 mr-1" />
              Desselecionar
            </Button>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="text-sm text-muted-foreground">
              {filteredClasses.length} turma(s) encontrada(s)
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" />
              Apenas turmas com alunos são exibidas
            </div>
          </div>
        </div>

        {/* Grid de Cards */}
        <div className="flex-1 overflow-y-auto py-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="text-center py-12">
              <Filter className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhuma turma encontrada
              </h3>
              <p className="text-muted-foreground">
                Tente ajustar os filtros de busca.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClasses.map(turma => {
                const isSelected = selected.includes(turma.id);
                
                return (
                  <Card
                    key={turma.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                      isSelected
                        ? 'border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-md'
                        : 'border hover:border-blue-200 dark:hover:border-blue-800'
                    }`}
                    onClick={() => handleToggle(turma.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            isSelected 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                          }`}>
                            <Users className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{turma.nome}</h3>
                            <p className="text-sm text-muted-foreground">{turma.serie}</p>
                          </div>
                        </div>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggle(turma.id)}
                          onClick={(e) => e.stopPropagation()}
                          className={isSelected ? 'border-blue-500 data-[state=checked]:bg-blue-500' : ''}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <School className="w-4 h-4 shrink-0" />
                          <span className="truncate">{turma.escola}</span>
                        </div>
                        
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {turma.estado && (
                            <div className="flex items-center gap-1">
                              <Globe className="w-3 h-3 shrink-0" />
                              <span>{turma.estado}</span>
                            </div>
                          )}
                          {turma.municipio && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span className="truncate">{turma.municipio}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <Badge 
                            variant={isSelected ? "default" : "secondary"} 
                            className={isSelected ? "bg-blue-500" : ""}
                          >
                            <Users className="w-3 h-3 mr-1" />
                            {turma.total_alunos || 0} {turma.total_alunos === 1 ? 'aluno' : 'alunos'}
                          </Badge>
                          
                          {isSelected && (
                            <Badge className="bg-green-500">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Selecionada
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer com resumo e ações */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-4 border-t bg-background">
          <div className="flex flex-wrap items-center gap-4">
            <div className="text-sm">
              <span className="text-muted-foreground">Selecionadas: </span>
              <span className="font-semibold text-blue-600">{selected.length}</span>
              <span className="text-muted-foreground"> turma(s)</span>
            </div>
            <div className="h-4 w-px bg-border hidden md:block" />
            <div className="text-sm">
              <span className="text-muted-foreground">Alunos: </span>
              <span className="font-semibold text-green-600">{totalSelectedStudents}</span>
            </div>
            {selected.length > 0 && (
              <>
                <div className="h-4 w-px bg-border hidden md:block" />
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {selectionStats.states > 0 && (
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {selectionStats.states} estado(s)
                    </span>
                  )}
                  {selectionStats.cities > 0 && (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {selectionStats.cities} cidade(s)
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <School className="w-3 h-3" />
                    {selectionStats.schools} escola(s)
                  </span>
                  <span className="flex items-center gap-1">
                    <GraduationCap className="w-3 h-3" />
                    {selectionStats.grades} série(s)
                  </span>
                </div>
              </>
            )}
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={selected.length === 0}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirmar Seleção ({selected.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClassSelector;

