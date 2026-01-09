import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TrendingUp, Users, Target, Award, Filter, RefreshCw, Download, Plus, X, Check, AlertCircle, Search, Calendar, List, Table } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/authContext';
import { api } from '@/lib/api';
import { EvaluationResultsApiService } from '@/services/evaluationResultsApi';
import { EvaluationComparisonApiService, ComparisonResponse } from '@/services/evaluationComparisonApi';
import { EvolutionCharts } from '@/components/evolution/EvolutionCharts';
import type { ProcessedEvolutionData } from '@/components/evolution/EvolutionCharts';
import { processComparisonData } from '@/utils/evolutionDataProcessor';
import { generateEvolutionPDFFromHTML } from '@/utils/evolutionPdfService';

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

interface Evaluation {
  id: string;
  titulo: string;
  disciplina: string;
  status: string;
  data_aplicacao: string | null;
  escola?: string | null;
  serie?: string | null;
  turma?: string | null;
}

export default function Evolution() {
  const { autoLogin } = useAuth();
  const { toast } = useToast();

  // Estados dos filtros (simplificados)
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('all');
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [periodStart, setPeriodStart] = useState<string>('');
  const [periodEnd, setPeriodEnd] = useState<string>('');
  const [evaluationSearch, setEvaluationSearch] = useState<string>('');
  
  // Estados do carrinho de avaliações
  const [selectedEvaluationsForComparison, setSelectedEvaluationsForComparison] = useState<Evaluation[]>([]);
  const [availableEvaluationsForPicker, setAvailableEvaluationsForPicker] = useState<Evaluation[]>([]);
  const [selectedEvaluationToPick, setSelectedEvaluationToPick] = useState<string>('all');
  const [invalidEvaluationIds, setInvalidEvaluationIds] = useState<Set<string>>(new Set());

  // Estados dos dados dos filtros
  const [states, setStates] = useState<State[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);

  // Estados de loading e dados
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [isLoadingComparison, setIsLoadingComparison] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [comparisonData, setComparisonData] = useState<ComparisonResponse | null>(null);
  const [processedData, setProcessedData] = useState<ProcessedEvolutionData | null>(null);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  
  // Ref para evitar chamadas duplicadas de comparação automática
  const lastComparisonIdsRef = useRef<string>('');

  // Carregar filtros iniciais usando nova API unificada com fallback
  const loadInitialFilters = useCallback(async () => {
    try {
      setIsLoadingFilters(true);

      // Tentar primeiro a API de comparação
      try {
        const response = await EvaluationComparisonApiService.getComparisonFilterOptions();
        if (response.opcoes?.estados?.length > 0) {
          setStates(response.opcoes.estados.map(state => ({
            id: state.id,
            name: state.nome,
            uf: state.id
          })));
          return;
        }
      } catch (comparisonError) {
        console.warn("API de comparação falhou, tentando fallback:", comparisonError);
      }

      // Fallback: usar API de resultados
      const statesData = await EvaluationResultsApiService.getFilterStates();
      setStates(statesData.map(state => ({
        id: state.id,
        name: state.nome,
        uf: state.id
      })));
    } catch (error) {
      console.error("Erro ao carregar filtros iniciais:", error);
      toast({
        title: "Erro ao carregar filtros",
        description: "Não foi possível carregar os filtros. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingFilters(false);
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const initializeData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        try {
          await autoLogin();
        } catch (error) {
          console.error("Erro no login automático:", error);
          toast({
            title: "Erro de Autenticação",
            description: "Não foi possível fazer login automático. Verifique suas credenciais.",
            variant: "destructive",
          });
          return;
        }
      }
      await loadInitialFilters();
    };

    initializeData();
  }, [autoLogin, loadInitialFilters, toast]);

  // Limite máximo de avaliações para comparação (suportado pelo sistema)
  const MAX_EVALUATIONS = 10;

  // Função para adicionar avaliação ao carrinho (validação acontece apenas quando há 2+ avaliações)
  const handleAddEvaluation = useCallback((evaluationId: string) => {
    const evaluation = availableEvaluationsForPicker.find(e => e.id === evaluationId);
    if (!evaluation) return;
    
    // Adicionar diretamente ao carrinho com verificação atômica dentro do setState
    // Isso previne race conditions em cliques rápidos
    setSelectedEvaluationsForComparison(prev => {
      // Verificar limite máximo
      if (prev.length >= MAX_EVALUATIONS) {
        toast({
          title: "Limite de avaliações atingido",
          description: `Você pode comparar no máximo ${MAX_EVALUATIONS} avaliações por vez. Remova uma avaliação antes de adicionar outra.`,
          variant: "destructive",
        });
        return prev; // Retornar estado inalterado
      }
      
      // Verificar duplicata dentro do setState (garantido que usa o estado mais recente)
      if (prev.some(e => e.id === evaluationId)) {
        // Se já existe, retornar estado inalterado e mostrar toast
        toast({
          title: "Avaliação já adicionada",
          description: "Esta avaliação já está na lista de comparação.",
          variant: "destructive",
        });
        return prev; // Retornar estado inalterado
      }
      
      // Se não existe, adicionar e mostrar toast de sucesso
      const newState = [...prev, evaluation];
      const remaining = MAX_EVALUATIONS - newState.length;
      const message = prev.length === 0
        ? `"${evaluation.titulo}" foi adicionada à comparação. Selecione mais uma avaliação para comparar.${remaining > 0 ? ` (${remaining} restantes)` : ''}`
        : `"${evaluation.titulo}" foi adicionada à comparação.${remaining > 0 ? ` (${remaining} restantes)` : ' (limite atingido)'}`;
      
      toast({
        title: "Avaliação adicionada",
        description: message,
      });
      
      return newState;
    });
  }, [availableEvaluationsForPicker, toast]);

  // Função para remover avaliação do carrinho
  const handleRemoveEvaluation = useCallback((evaluationId: string) => {
    setSelectedEvaluationsForComparison(prev => prev.filter(e => e.id !== evaluationId));
    
    toast({
      title: "Avaliação removida",
      description: "A avaliação foi removida da comparação.",
    });
  }, [toast]);

  // Carregar municípios quando estado for selecionado usando nova API
  useEffect(() => {
    const loadMunicipalities = async () => {
      if (selectedState !== 'all') {
        try {
          setIsLoadingFilters(true);
          const response = await EvaluationComparisonApiService.getComparisonFilterOptions({
            estado: selectedState
          });
          const newMunicipalities = response.opcoes.municipios?.map(municipality => ({
            id: municipality.id,
            name: municipality.nome,
            state: selectedState
          })) || [];
          
          setMunicipalities(newMunicipalities);
          
          // Só resetar município se o município atual não existir mais na nova lista
          const currentMunicipalityExists = newMunicipalities.some(m => m.id === selectedMunicipality);
          if (!currentMunicipalityExists && selectedMunicipality !== 'all') {
            setSelectedMunicipality('all');
            setSelectedSchool('all');
            setSelectedGrade('all');
            setSelectedClass('all');
          }
        } catch (error) {
          console.error("Erro ao carregar municípios:", error);
          toast({
            title: "Erro ao carregar municípios",
            description: "Não foi possível carregar os municípios. Tente novamente.",
            variant: "destructive",
          });
        } finally {
          setIsLoadingFilters(false);
        }
      } else {
        setMunicipalities([]);
        // Só resetar se realmente mudou para 'all'
        if (selectedMunicipality !== 'all') {
          setSelectedMunicipality('all');
        }
        if (selectedSchool !== 'all') {
          setSelectedSchool('all');
        }
        if (selectedGrade !== 'all') {
          setSelectedGrade('all');
        }
        if (selectedClass !== 'all') {
          setSelectedClass('all');
        }
      }
    };

    loadMunicipalities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedState, toast]);

  // Carregar avaliações quando município for selecionado (com filtros opcionais de escola, série e turma)
  useEffect(() => {
    const loadEvaluations = async () => {
      if (selectedState !== 'all' && selectedMunicipality !== 'all') {
        try {
          setIsLoadingFilters(true);
          
          // Construir filtros para a API
          const filters: {
            estado: string;
            municipio: string;
            escola?: string;
            serie?: string;
            turma?: string;
          } = {
            estado: selectedState,
            municipio: selectedMunicipality
          };
          
          if (selectedSchool !== 'all') {
            filters.escola = selectedSchool;
          }
          if (selectedGrade !== 'all') {
            filters.serie = selectedGrade;
          }
          if (selectedClass !== 'all') {
            filters.turma = selectedClass;
          }
          
          console.log('🔍 Carregando avaliações para:', filters);
          
          // Tentar primeiro a API de comparação
          let comparisonResponse;
          try {
            comparisonResponse = await EvaluationComparisonApiService.getComparisonFilterOptions({
              estado: selectedState,
              municipio: selectedMunicipality
            });
            console.log('✅ Resposta da API de comparação:', comparisonResponse);
          } catch (comparisonError) {
            console.warn('⚠️ Erro na API de comparação, tentando API de resultados:', comparisonError);
            comparisonResponse = null;
          }
          
          // Se a API de comparação retornou avaliações, usar elas
          if (comparisonResponse?.opcoes?.avaliacoes && comparisonResponse.opcoes.avaliacoes.length > 0) {
            console.log(`📊 ${comparisonResponse.opcoes.avaliacoes.length} avaliações encontradas na API de comparação`);
            console.log('🆔 IDs da API de comparação:', comparisonResponse.opcoes.avaliacoes.map(a => ({ id: String(a.id).trim(), titulo: a.titulo })));
            
            // Tentar buscar detalhes completos (data_aplicacao) da API de resultados com filtros
            let evaluationsWithDetails: Evaluation[] = [];
            try {
              const detailedResponse = await EvaluationResultsApiService.getEvaluationsList(1, 100, filters);
              
              if (detailedResponse?.resultados_detalhados?.avaliacoes) {
                console.log('🆔 IDs da API de resultados:', detailedResponse.resultados_detalhados.avaliacoes.map(e => ({ id: String(e.id).trim(), titulo: e.titulo })));
                
                // Normalizar IDs para comparação (ambos como string, removendo espaços e convertendo para minúsculas para comparação mais robusta)
                const comparisonIds = new Set(
                  comparisonResponse.opcoes.avaliacoes.map(a => String(a.id).trim().toLowerCase())
                );
                
                evaluationsWithDetails = detailedResponse.resultados_detalhados.avaliacoes
                  .filter(evaluation => {
                    // Excluir olimpíadas
                    const type = evaluation.type || evaluation.tipo;
                    const title = evaluation.titulo || evaluation.title || '';
                    const isOlimpiada = type === 'OLIMPIADA' || 
                                       title.includes('[OLIMPÍADA]') || 
                                       title.toUpperCase().includes('OLIMPÍADA');
                    if (isOlimpiada) {
                      return false;
                    }
                    
                    const evalId = String(evaluation.id).trim().toLowerCase();
                    const found = comparisonIds.has(evalId);
                    if (!found) {
                      console.log(`⚠️ ID não encontrado na comparação: ${evaluation.id} (${evaluation.titulo})`);
                    }
                    return found;
                  })
                  .map(evaluation => ({
                    id: evaluation.id,
                    titulo: evaluation.titulo || 'Sem título',
                    disciplina: evaluation.disciplina || '',
                    status: evaluation.status || 'concluida',
                    data_aplicacao: evaluation.data_aplicacao || new Date().toISOString(),
                    escola: evaluation.escola || null,
                    serie: evaluation.serie || null,
                    turma: evaluation.turma || null,
                  }));
                
                console.log(`✅ ${evaluationsWithDetails.length} avaliações mapeadas com detalhes da API de resultados`);
              }
            } catch (detailError) {
              console.warn('⚠️ Erro ao buscar detalhes:', detailError);
            }
            
            // Se não encontrou detalhes ou encontrou menos do que esperado, usar dados básicos da API de comparação
            if (evaluationsWithDetails.length < comparisonResponse.opcoes.avaliacoes.length) {
              console.log(`⚠️ Apenas ${evaluationsWithDetails.length} de ${comparisonResponse.opcoes.avaliacoes.length} avaliações tiveram detalhes encontrados`);
              console.log('📋 Usando dados da API de comparação diretamente para as avaliações faltantes');
              
              // Criar um mapa dos detalhes encontrados (usar lowercase para comparação)
              const detailsMap = new Map(
                evaluationsWithDetails.map(e => [String(e.id).trim().toLowerCase(), e])
              );
              
              // Mapear todas as avaliações da API de comparação, usando detalhes quando disponíveis
              // Filtrar olimpíadas primeiro
              const filteredComparisonEvaluations = comparisonResponse.opcoes.avaliacoes.filter(evaluation => {
                const type = evaluation.type || evaluation.tipo;
                const title = evaluation.titulo || evaluation.title || '';
                const isOlimpiada = type === 'OLIMPIADA' || 
                                   title.includes('[OLIMPÍADA]') || 
                                   title.toUpperCase().includes('OLIMPÍADA');
                return !isOlimpiada;
              });
              
              const mappedEvaluations = filteredComparisonEvaluations.map(evaluation => {
                const evalId = String(evaluation.id).trim().toLowerCase();
                const existingDetail = detailsMap.get(evalId);
                
                if (existingDetail) {
                  return existingDetail;
                }
                
                // Se não tem detalhes, usar dados básicos da API de comparação
                // Usar data padrão para garantir que apareça mesmo sem filtro de período
                return {
                  id: evaluation.id,
                  titulo: evaluation.titulo || 'Sem título',
                  disciplina: '',
                  status: 'concluida',
                  data_aplicacao: new Date().toISOString(), // Data padrão para garantir exibição
                  escola: null,
                  serie: null,
                  turma: null,
                };
              });
              
              console.log(`✅ ${mappedEvaluations.length} avaliações mapeadas (combinando detalhes e dados básicos)`);
              
              // Tentar buscar datas faltantes individualmente (mas não bloquear se falhar)
              const evaluationsWithDates = await Promise.allSettled(
                mappedEvaluations.map(async (evaluation) => {
                  // Se já tem data válida, não buscar novamente
                  if (evaluation.data_aplicacao && evaluation.data_aplicacao !== new Date().toISOString()) {
                    return evaluation;
                  }
                  
                  try {
                    const detailResponse = await EvaluationResultsApiService.getEvaluationById(evaluation.id);
                    if (detailResponse?.data_aplicacao) {
                      return {
                        ...evaluation,
                        data_aplicacao: detailResponse.data_aplicacao
                      };
                    }
                  } catch (error) {
                    console.warn(`⚠️ Erro ao buscar data da avaliação ${evaluation.id}:`, error);
                  }
                  
                  // Retornar com data padrão se não conseguir buscar
                  return evaluation;
                })
              );
              
              // Extrair resultados bem-sucedidos ou usar o valor padrão
              const finalEvaluations = evaluationsWithDates.map((result, index) => {
                if (result.status === 'fulfilled') {
                  return result.value;
                } else {
                  // Se falhou, usar a avaliação original com data padrão
                  return mappedEvaluations[index];
                }
              });
              
              console.log(`📋 Definindo ${finalEvaluations.length} avaliações em availableEvaluationsForPicker`);
              console.log('📋 Avaliações finais:', finalEvaluations.map(e => ({ id: e.id, titulo: e.titulo, data: e.data_aplicacao })));
              setAvailableEvaluationsForPicker(finalEvaluations);
            } else {
              // Todas as avaliações tiveram detalhes encontrados
              console.log(`📋 Definindo ${evaluationsWithDetails.length} avaliações com detalhes completos em availableEvaluationsForPicker`);
              console.log('📋 Avaliações com detalhes:', evaluationsWithDetails.map(e => ({ id: e.id, titulo: e.titulo, data: e.data_aplicacao })));
              setAvailableEvaluationsForPicker(evaluationsWithDetails);
            }
            
            // Log adicional para confirmar que foi definido
            console.log('✅ availableEvaluationsForPicker atualizado com', comparisonResponse.opcoes.avaliacoes.length, 'avaliações');
          } else {
            // Se a API de comparação não retornou avaliações, tentar API de resultados diretamente com filtros
            console.log('⚠️ API de comparação não retornou avaliações, tentando API de resultados...');
            try {
              const detailedResponse = await EvaluationResultsApiService.getEvaluationsList(1, 100, filters);
              
              if (detailedResponse?.resultados_detalhados?.avaliacoes) {
                // Filtrar apenas avaliações com status concluída/finalizada E excluir olimpíadas
                const evaluationsWithResults = detailedResponse.resultados_detalhados.avaliacoes
                  .filter(evaluation => {
                    // Excluir olimpíadas
                    const type = evaluation.type || evaluation.tipo;
                    const title = evaluation.titulo || evaluation.title || '';
                    const isOlimpiada = type === 'OLIMPIADA' || 
                                       title.includes('[OLIMPÍADA]') || 
                                       title.toUpperCase().includes('OLIMPÍADA');
                    if (isOlimpiada) {
                      return false;
                    }
                    
                    const status = (evaluation.status || '').toLowerCase();
                    return status === 'concluida' || status === 'finalized' || status === 'finalizada';
                  })
                  .map(evaluation => ({
                    id: evaluation.id,
                    titulo: evaluation.titulo || 'Sem título',
                    disciplina: evaluation.disciplina || '',
                    status: evaluation.status || 'concluida',
                    data_aplicacao: evaluation.data_aplicacao || new Date().toISOString(),
                    escola: evaluation.escola || null,
                    serie: evaluation.serie || null,
                    turma: evaluation.turma || null,
                  }));
                
                console.log(`✅ ${evaluationsWithResults.length} avaliações encontradas na API de resultados`);
                setAvailableEvaluationsForPicker(evaluationsWithResults);
              } else {
                console.warn('⚠️ Nenhuma avaliação encontrada na API de resultados');
                setAvailableEvaluationsForPicker([]);
              }
            } catch (resultsError) {
              console.error('❌ Erro ao buscar avaliações da API de resultados:', resultsError);
              setAvailableEvaluationsForPicker([]);
            }
          }
        } catch (error) {
          console.error("❌ Erro ao carregar avaliações:", error);
          setAvailableEvaluationsForPicker([]);
          toast({
            title: "Erro ao carregar avaliações",
            description: "Não foi possível carregar as avaliações. Tente novamente.",
            variant: "destructive",
          });
        } finally {
          setIsLoadingFilters(false);
        }
      } else {
        // Só limpar avaliações se realmente mudou para 'all'
        if (selectedState === 'all' || selectedMunicipality === 'all') {
          setAvailableEvaluationsForPicker([]);
        }
      }
    };

    loadEvaluations();
  }, [selectedState, selectedMunicipality, selectedSchool, selectedGrade, selectedClass, toast]);

  // Filtrar avaliações por período e busca
  // Nota: Os filtros de escola/série/turma já são aplicados pela API em loadEvaluations
  const filteredEvaluations = useMemo(() => {
    let filtered = [...availableEvaluationsForPicker];
    
    console.log('🔍 Filtros aplicados:', { 
      total: availableEvaluationsForPicker.length,
      periodStart, 
      periodEnd, 
      evaluationSearch,
      filteredAntes: filtered.length 
    });

    // Filtro por período - só aplicar se houver filtro ativo
    if (periodStart) {
      const startDate = new Date(periodStart);
      startDate.setHours(0, 0, 0, 0); // Iniciar no início do dia
      filtered = filtered.filter(evaluation => {
        // Se não tem data_aplicacao e há filtro de período, remover
        if (!evaluation.data_aplicacao) {
          console.log(`⚠️ Avaliação ${evaluation.id} sem data_aplicacao removida pelo filtro de período`);
          return false;
        }
        const evalDate = new Date(evaluation.data_aplicacao);
        evalDate.setHours(0, 0, 0, 0); // Comparar apenas a data, ignorando hora
        return evalDate >= startDate;
      });
    }

    if (periodEnd) {
      const endDate = new Date(periodEnd);
      endDate.setHours(23, 59, 59, 999); // Incluir o dia inteiro
      filtered = filtered.filter(evaluation => {
        // Se não tem data_aplicacao e há filtro de período, remover
        if (!evaluation.data_aplicacao) {
          return false;
        }
        const evalDate = new Date(evaluation.data_aplicacao);
        return evalDate <= endDate;
      });
    }

    // Filtro por busca
    if (evaluationSearch.trim()) {
      const searchLower = evaluationSearch.toLowerCase().trim();
      filtered = filtered.filter(evaluation =>
        evaluation.titulo.toLowerCase().includes(searchLower)
      );
    }

    console.log('✅ filteredEvaluations:', { 
      antes: availableEvaluationsForPicker.length,
      depois: filtered.length,
      avaliacoes: filtered.map(e => ({ id: e.id, titulo: e.titulo, data: e.data_aplicacao }))
    });

    return filtered;
  }, [availableEvaluationsForPicker, periodStart, periodEnd, evaluationSearch]);

  // Debug: Log quando availableEvaluationsForPicker mudar
  useEffect(() => {
    console.log('📊 availableEvaluationsForPicker atualizado:', {
      length: availableEvaluationsForPicker.length,
      avaliacoes: availableEvaluationsForPicker.map(e => ({
        id: e.id,
        titulo: e.titulo,
        data_aplicacao: e.data_aplicacao
      }))
    });
  }, [availableEvaluationsForPicker]);

  // Carregar escolas quando município for selecionado (independente das avaliações)
  useEffect(() => {
    const loadSchoolsForComparison = async () => {
      if (selectedState !== 'all' && selectedMunicipality !== 'all') {
        try {
          setIsLoadingFilters(true);

          // Buscar todas as escolas e filtrar pelo município selecionado
          const schoolsResponse = await api.get('/school/');
          const allSchools = Array.isArray(schoolsResponse.data)
            ? schoolsResponse.data
            : (schoolsResponse.data?.data || []);

          const municipalitySchools = allSchools
            .filter((school: { city_id?: string; municipio_id?: string; municipio?: { id?: string } }) => {
              const cityId =
                school.city_id ||
                school.municipio_id ||
                school.municipio?.id;
              return String(cityId) === String(selectedMunicipality);
            })
            .map((school: { id: string; name?: string; nome?: string }) => ({
              id: school.id,
              name: school.name || school.nome,
            }));

          setSchools(municipalitySchools);
        } catch (error) {
          console.error("Erro ao carregar escolas:", error);
          setSchools([]);
        } finally {
          setIsLoadingFilters(false);
        }
      } else {
        setSchools([]);
        if (selectedMunicipality === 'all') {
          setSelectedSchool('all');
          setSelectedGrade('all');
          setSelectedClass('all');
        }
      }
    };

    loadSchoolsForComparison();
  }, [selectedState, selectedMunicipality]);

  // Carregar séries quando escola for selecionada (usando turmas da escola)
  useEffect(() => {
    const loadGrades = async () => {
      if (selectedSchool !== 'all') {
        try {
          setIsLoadingFilters(true);
          // Buscar turmas da escola para extrair as séries disponíveis
          const classesResponse = await api.get(`/classes/school/${selectedSchool}`);
          const classesData = Array.isArray(classesResponse.data)
            ? classesResponse.data
            : (classesResponse.data?.data || []);

          const gradeMap = new Map<string, Grade>();
          classesData.forEach((classItem: { grade?: { id?: string; name?: string; nome?: string } }) => {
            const grade = classItem.grade;
            if (grade && grade.id && !gradeMap.has(grade.id)) {
              gradeMap.set(grade.id, {
                id: grade.id,
                name: grade.name || grade.nome || '',
              });
            }
          });

          const extractedGrades = Array.from(gradeMap.values());
          setGrades(extractedGrades);

          // Resetar série e turma se a série atual não existir mais
          const currentGradeExists = extractedGrades.some(g => g.id === selectedGrade);
          if (!currentGradeExists && selectedGrade !== 'all') {
            setSelectedGrade('all');
            setSelectedClass('all');
          }
        } catch (error) {
          console.error("Erro ao carregar séries:", error);
          setGrades([]);
          setSelectedGrade('all');
          setSelectedClass('all');
        } finally {
          setIsLoadingFilters(false);
        }
      } else {
        setGrades([]);
        setSelectedGrade('all');
        setSelectedClass('all');
      }
    };

    loadGrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSchool, toast]);

  // Carregar turmas quando série for selecionada (filtrando turmas da escola pela série)
  useEffect(() => {
    const loadClasses = async () => {
      if (selectedSchool !== 'all' && selectedGrade !== 'all') {
        try {
          setIsLoadingFilters(true);
          const response = await api.get(`/classes/school/${selectedSchool}`);
          const classesData = Array.isArray(response.data)
            ? response.data
            : (response.data?.data || []);

          const filteredClasses = classesData
            .filter((classItem: { grade_id?: string; grade?: { id?: string } }) => {
              const gradeId = classItem.grade_id || classItem.grade?.id;
              return String(gradeId) === String(selectedGrade);
            })
            .map((classItem: { id: string; name?: string; nome?: string }) => ({
              id: classItem.id,
              name: classItem.name || classItem.nome || `Turma ${classItem.id}`,
            }));

          setClasses(filteredClasses);
          
          // Resetar turma se a turma atual não existir mais
          const currentClassExists = filteredClasses.some(c => c.id === selectedClass);
          if (!currentClassExists && selectedClass !== 'all') {
            setSelectedClass('all');
          }
        } catch (error) {
          console.error("Erro ao carregar turmas:", error);
          setClasses([]);
          setSelectedClass('all');
        } finally {
          setIsLoadingFilters(false);
        }
      } else {
        setClasses([]);
        setSelectedClass('all');
      }
    };

    loadClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSchool, selectedGrade, toast]);

  // Função para comparar avaliações
  const handleCompareEvaluations = useCallback(async () => {
    if (selectedEvaluationsForComparison.length < 2) {
      toast({
        title: "Selecione pelo menos 2 avaliações",
        description: "Para comparar, você precisa adicionar pelo menos 2 avaliações.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoadingComparison(true);
      setComparisonError(null);

      // Remover duplicatas usando Set para garantir IDs únicos
      const evaluationIds = Array.from(
        new Set(selectedEvaluationsForComparison.map(e => e.id))
      );
      console.log('IDs finais para comparação:', evaluationIds);

      const comparison = await EvaluationComparisonApiService.compareEvaluations(evaluationIds);
      setComparisonData(comparison);

      // Processar dados para os gráficos
      const processed = processComparisonData(comparison);
      console.log('📊 Dados processados:', {
        totalEvaluations: comparison.total_evaluations,
        evaluationNames: processed.evaluationNames,
        evaluationNamesCount: processed.evaluationNames.length,
        generalData: processed.generalData,
      });
      setProcessedData(processed);
      // Visibilidade de gráficos agora é controlada localmente em EvolutionCharts

      toast({
        title: "Comparação realizada com sucesso!",
        description: `Comparando ${comparison.total_evaluations} avaliações com ${comparison.total_comparisons} comparações.`,
      });
    } catch (error: unknown) {
      console.error('Erro ao comparar avaliações:', error);
      
      // Extrair mensagem de erro do backend
      let errorMessage = 'Erro desconhecido';
      if (error && typeof error === 'object') {
        if ('response' in error) {
          const axiosError = error as { response?: { data?: { error?: string } } };
          errorMessage = axiosError.response?.data?.error || '';
        }
        if ('message' in error && typeof error.message === 'string') {
          errorMessage = error.message;
        }
      }
      
      if (errorMessage.includes('não possui resultados calculados')) {
        setComparisonError('Avaliação sem resultados calculados');
        toast({
          title: "Avaliação sem resultados",
          description: "Uma ou mais avaliações selecionadas ainda não possuem resultados calculados. Selecione apenas avaliações finalizadas.",
          variant: "destructive",
        });
      } else if (errorMessage.includes('Avaliação')) {
        setComparisonError(errorMessage);
        toast({
          title: "Erro na avaliação",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        setComparisonError('Erro ao carregar dados de comparação');
        toast({
          title: "Erro na comparação",
          description: "Não foi possível comparar as avaliações. Tente novamente.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoadingComparison(false);
    }
  }, [selectedEvaluationsForComparison, toast]);

  // Carregar gráficos automaticamente quando houver 2+ avaliações selecionadas
  useEffect(() => {
    const autoCompare = async () => {
      if (selectedEvaluationsForComparison.length >= 2) {
        // Criar uma string única com os IDs ordenados para comparar
        const currentIds = selectedEvaluationsForComparison
          .map(e => e.id)
          .sort()
          .join(',');
        
        // Evitar chamadas duplicadas
        if (currentIds === lastComparisonIdsRef.current || isLoadingComparison) {
          return;
        }
        
        lastComparisonIdsRef.current = currentIds;
        
        // Aguardar um pequeno delay para evitar múltiplas chamadas rápidas
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Verificar novamente se ainda temos 2+ avaliações (pode ter mudado durante o delay)
        if (selectedEvaluationsForComparison.length >= 2) {
          try {
            await handleCompareEvaluations();
          } catch (error: unknown) {
            // Se a comparação falhar, tentar identificar avaliações inválidas
            // e removê-las automaticamente
            console.error('Erro na comparação automática:', error);
            
            // Extrair mensagem de erro
            let errorMessage = '';
            if (error && typeof error === 'object') {
              if ('response' in error) {
                const axiosError = error as { response?: { data?: { error?: string } } };
                errorMessage = axiosError.response?.data?.error || '';
              }
              if ('message' in error && typeof error.message === 'string') {
                errorMessage = error.message;
              }
            }
            
            // Se o erro menciona avaliações sem resultados, tentar identificar quais
            if (errorMessage.includes('não possui resultados calculados') || 
                errorMessage.includes('sem resultados')) {
              // Marcar todas como potencialmente inválidas e deixar o usuário decidir
              // ou tentar validar uma por uma (mais complexo, deixamos o usuário remover manualmente)
              console.warn('Uma ou mais avaliações podem não ter resultados calculados');
            }
          }
        }
      } else {
        // Limpar dados quando houver menos de 2 avaliações
        setComparisonData(null);
        setProcessedData(null);
        setComparisonError(null);
        lastComparisonIdsRef.current = '';
      }
    };

    autoCompare();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEvaluationsForComparison.length]);

  // Controles de visibilidade agora são por gráfico, definidos em EvolutionCharts

  // Função para formatar data
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Data não disponível';
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return 'Data não informada';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header com design melhorado */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full mb-4">
            <TrendingUp className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Análise de Evolução
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Compare múltiplas avaliações e acompanhe a evolução dos resultados ao longo do tempo com insights detalhados.
          </p>
        </div>

        {/* Controles de ação */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()} 
            disabled={isLoadingComparison}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingComparison ? 'animate-spin' : ''}`} />
            Atualizar Dados
          </Button>
          
          {/* Botão para ver avaliações selecionadas */}
          {selectedEvaluationsForComparison.length > 0 && (
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant="outline"
                  className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-0"
                >
                  <List className="h-4 w-4 mr-2" />
                  Avaliações Selecionadas ({selectedEvaluationsForComparison.length})
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    Avaliações Selecionadas
                  </DialogTitle>
                  <DialogDescription>
                    {selectedEvaluationsForComparison.length} de {MAX_EVALUATIONS} avaliação(ões) selecionada(s) para comparação
                    {selectedEvaluationsForComparison.length >= MAX_EVALUATIONS && (
                      <span className="block mt-1 text-amber-600 dark:text-amber-400 text-xs">
                        Limite máximo atingido. Remova uma avaliação para adicionar outra.
                      </span>
                    )}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedEvaluationsForComparison.map((evaluation, index) => (
                      <div 
                        key={evaluation.id} 
                        className="group relative p-4 bg-gradient-to-br from-blue-50 dark:from-blue-950/30 to-indigo-50 dark:to-indigo-950/30 rounded-xl border-2 border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-foreground text-sm leading-tight mb-1">
                                {evaluation.titulo}
                              </h4>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {formatDate(evaluation.data_aplicacao)}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveEvaluation(evaluation.id)}
                            className="hover:bg-red-100 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {selectedEvaluationsForComparison.length < 2 && (
                    <div className="pt-4 border-t border-border">
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground">
                          Selecione pelo menos 2 avaliações para iniciar a comparação automática
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
          
          {comparisonData && processedData && (
            <>
              <Button 
                onClick={async () => {
                  if (!processedData || !comparisonData) {
                    toast({
                      title: "Dados insuficientes",
                      description: "Não há dados disponíveis para gerar o relatório.",
                      variant: "destructive",
                    });
                    return;
                  }

                  try {
                    setIsGeneratingPDF(true);
                    
                    // Preparar informações dos filtros
                    // Extrair escolas únicas das avaliações selecionadas
                    const uniqueSchools = new Map<string, { id?: string; name: string }>();
                    
                    selectedEvaluationsForComparison.forEach(evaluation => {
                      if (evaluation.escola) {
                        // Se já não existe, adicionar
                        if (!uniqueSchools.has(evaluation.escola)) {
                          // Tentar encontrar na lista de escolas carregadas
                          const foundSchool = schools.find(s => s.id === evaluation.escola || s.name === evaluation.escola);
                          uniqueSchools.set(evaluation.escola, {
                            id: foundSchool?.id,
                            name: foundSchool?.name || evaluation.escola
                          });
                        }
                      }
                    });
                    
                    const schoolsArray = Array.from(uniqueSchools.values());
                    
                    const filterInfo = {
                      state: selectedState !== 'all' 
                        ? states.find(s => s.id === selectedState) 
                          ? { id: selectedState, name: states.find(s => s.id === selectedState)!.name }
                          : undefined
                        : undefined,
                      municipality: selectedMunicipality !== 'all'
                        ? municipalities.find(m => m.id === selectedMunicipality)
                          ? { id: selectedMunicipality, name: municipalities.find(m => m.id === selectedMunicipality)!.name }
                          : undefined
                        : undefined,
                      // Manter escola única para compatibilidade se apenas uma escola foi selecionada manualmente
                      school: selectedSchool !== 'all' && schoolsArray.length <= 1
                        ? schools.find(s => s.id === selectedSchool)
                          ? { id: selectedSchool, name: schools.find(s => s.id === selectedSchool)!.name }
                          : undefined
                        : undefined,
                      // Adicionar array de escolas quando houver múltiplas
                      schools: schoolsArray.length > 0 ? schoolsArray : undefined,
                      grade: selectedGrade !== 'all'
                        ? grades.find(g => g.id === selectedGrade)
                          ? { id: selectedGrade, name: grades.find(g => g.id === selectedGrade)!.name }
                          : undefined
                        : undefined,
                      class: selectedClass !== 'all'
                        ? classes.find(c => c.id === selectedClass)
                          ? { id: selectedClass, name: classes.find(c => c.id === selectedClass)!.name }
                          : undefined
                        : undefined,
                      periodStart: periodStart || undefined,
                      periodEnd: periodEnd || undefined,
                    };
                    
                    await generateEvolutionPDFFromHTML(
                      processedData,
                      comparisonData,
                      processedData.evaluationNames,
                      filterInfo
                    );
                    toast({
                      title: "PDF gerado com sucesso!",
                      description: "O relatório foi salvo no seu dispositivo.",
                    });
                  } catch (error) {
                    console.error('Erro ao gerar PDF:', error);
                    toast({
                      title: "Erro ao gerar PDF",
                      description: "Não foi possível gerar o relatório. Tente novamente.",
                      variant: "destructive",
                    });
                  } finally {
                    setIsGeneratingPDF(false);
                  }
                }}
                disabled={isGeneratingPDF || isExportingExcel || !processedData || !comparisonData}
                className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <Download className={`h-4 w-4 mr-2 ${isGeneratingPDF ? 'animate-spin' : ''}`} />
                {isGeneratingPDF ? 'Gerando PDF...' : 'Exportar PDF'}
              </Button>
              
              <Button 
                onClick={async () => {
                  // Validar se há avaliações selecionadas
                  if (selectedEvaluationsForComparison.length < 2) {
                    toast({
                      title: "Selecione pelo menos 2 avaliações",
                      description: "Para exportar, você precisa ter pelo menos 2 avaliações selecionadas.",
                      variant: "destructive",
                    });
                    return;
                  }

                  try {
                    setIsExportingExcel(true);

                    // Preparar payload com os IDs das avaliações selecionadas
                    // Remover duplicatas usando Set para garantir IDs únicos
                    const uniqueTestIds = Array.from(
                      new Set(selectedEvaluationsForComparison.map(e => e.id))
                    );
                    
                    const payload = {
                      test_ids: uniqueTestIds,
                    };

                    // Fazer requisição POST para o backend
                    const response = await api.post('/test/evolution/export-excel', payload, {
                      responseType: 'blob',
                    });

                    // Criar blob a partir da resposta
                    const blob = new Blob([response.data], {
                      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    });

                    // Extrair nome do arquivo do header Content-Disposition ou usar padrão
                    const contentDisposition = response.headers['content-disposition'];
                    let fileName = `exportacao-evolucao-${new Date().toISOString().split('T')[0]}.xlsx`;
                    
                    if (contentDisposition) {
                      const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                      if (fileNameMatch && fileNameMatch[1]) {
                        fileName = fileNameMatch[1].replace(/['"]/g, '');
                      }
                    }

                    // Criar link temporário e fazer download
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', fileName);
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    window.URL.revokeObjectURL(url);

                    toast({
                      title: "Excel exportado com sucesso!",
                      description: `Arquivo gerado com sucesso para ${selectedEvaluationsForComparison.length} avaliação(ões).`,
                    });
                  } catch (error: any) {
                    console.error('Erro ao exportar Excel:', error);

                    // Tratar erro que pode vir como blob
                    let errorMessage = "Não foi possível exportar as avaliações.";

                    if (error.response?.data instanceof Blob) {
                      try {
                        const text = await error.response.data.text();
                        const errorData = JSON.parse(text);
                        errorMessage = errorData.message || errorMessage;
                      } catch {
                        // Se não conseguir parsear, usar mensagem padrão
                      }
                    } else if (error.response?.data?.message) {
                      errorMessage = error.response.data.message;
                    } else if (error.response?.status === 400) {
                      errorMessage = "Dados inválidos para exportação.";
                    } else if (error.response?.status === 404) {
                      errorMessage = "Rota de exportação não encontrada.";
                    } else if (error.response?.status === 500) {
                      errorMessage = "Erro interno do servidor ao gerar o arquivo.";
                    }

                    toast({
                      title: "Erro ao exportar Excel",
                      description: errorMessage,
                      variant: "destructive",
                    });
                  } finally {
                    setIsExportingExcel(false);
                  }
                }}
                disabled={isGeneratingPDF || isExportingExcel || selectedEvaluationsForComparison.length < 2}
                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <Table className={`h-4 w-4 mr-2 ${isExportingExcel ? 'animate-spin' : ''}`} />
                {isExportingExcel ? 'Exportando...' : 'Exportar Excel'}
              </Button>
            </>
          )}
        </div>

        {/* Filtros com design melhorado */}
        <Card className="shadow-lg border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-white/20 dark:bg-white/10 rounded-lg">
                <Filter className="h-6 w-6" />
              </div>
              Configurar Filtros de Busca
            </CardTitle>
            <CardDescription className="text-blue-100 dark:text-blue-300">
              Selecione os critérios para encontrar as avaliações que deseja comparar
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3 xl:grid-cols-5">
              {/* Estado */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Estado
                </label>
                <Select
                  value={selectedState}
                  onValueChange={setSelectedState}
                  disabled={isLoadingFilters}
                >
                  <SelectTrigger className="h-12 border-2 border-border hover:border-blue-300 dark:hover:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 transition-colors">
                    <SelectValue placeholder="Selecione um estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os estados</SelectItem>
                    {states.map(state => (
                      <SelectItem key={state.id} value={state.id}>
                        {state.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedState !== 'all' && (
                  <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    Estado selecionado
                  </div>
                )}
              </div>

              {/* Município */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  Município
                </label>
                <Select
                  value={selectedMunicipality}
                  onValueChange={setSelectedMunicipality}
                  disabled={isLoadingFilters || selectedState === 'all'}
                >
                  <SelectTrigger className="h-12 border-2 border-border hover:border-indigo-300 dark:hover:border-indigo-600 focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors">
                    <SelectValue placeholder={
                      isLoadingFilters ? "Carregando..." : 
                      selectedState === 'all' ? "Selecione o estado primeiro" :
                      "Selecione um município"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os municípios</SelectItem>
                    {municipalities.map(municipality => (
                      <SelectItem key={municipality.id} value={municipality.id}>
                        {municipality.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isLoadingFilters && selectedState !== 'all' && (
                  <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Carregando municípios...
                  </div>
                )}
                {selectedMunicipality !== 'all' && selectedState !== 'all' && (
                  <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    Município selecionado
                  </div>
                )}
              </div>

              {/* Escola - Sempre visível */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  Escola
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    Opcional
                  </span>
                </label>
                <Select
                  value={selectedSchool}
                  onValueChange={setSelectedSchool}
                  disabled={isLoadingFilters || selectedMunicipality === 'all'}
                >
                  <SelectTrigger className="h-12 border-2 border-border hover:border-purple-300 dark:hover:border-purple-600 focus:border-purple-500 dark:focus:border-purple-400 transition-colors">
                    <SelectValue placeholder={
                      isLoadingFilters ? "Carregando..." : 
                      selectedMunicipality === 'all' ? "Selecione o município primeiro" :
                      schools.length === 0 ? "Nenhuma escola encontrada" :
                      "Selecione uma escola (opcional)"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as escolas</SelectItem>
                    {schools.map(school => (
                      <SelectItem key={school.id} value={school.id}>
                        {school.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSchool !== 'all' && selectedMunicipality !== 'all' && (
                  <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    Escola selecionada
                  </div>
                )}
                {schools.length === 0 && selectedMunicipality !== 'all' && !isLoadingFilters && (
                  <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                    Nenhuma escola encontrada para este município
                  </div>
                )}
              </div>

              {/* Série */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                  Série
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    Opcional
                  </span>
                </label>
                <Select
                  value={selectedGrade}
                  onValueChange={setSelectedGrade}
                  disabled={isLoadingFilters || selectedSchool === 'all'}
                >
                  <SelectTrigger className="h-12 border-2 border-border hover:border-teal-300 dark:hover:border-teal-600 focus:border-teal-500 dark:focus:border-teal-400 transition-colors">
                    <SelectValue placeholder={
                      isLoadingFilters ? "Carregando..." : 
                      selectedSchool === 'all' ? "Selecione a escola primeiro" :
                      grades.length === 0 ? "Nenhuma série encontrada" :
                      "Selecione uma série (opcional)"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as séries</SelectItem>
                    {grades.map(grade => (
                      <SelectItem key={grade.id} value={grade.id}>
                        {grade.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedGrade !== 'all' && selectedSchool !== 'all' && (
                  <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    Série selecionada
                  </div>
                )}
                {grades.length === 0 && selectedSchool !== 'all' && !isLoadingFilters && (
                  <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                    Nenhuma série encontrada para esta escola
                  </div>
                )}
              </div>

              {/* Turma */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                  Turma
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    Opcional
                  </span>
                </label>
                <Select
                  value={selectedClass}
                  onValueChange={setSelectedClass}
                  disabled={isLoadingFilters || selectedGrade === 'all'}
                >
                  <SelectTrigger className="h-12 border-2 border-border hover:border-cyan-300 dark:hover:border-cyan-600 focus:border-cyan-500 dark:focus:border-cyan-400 transition-colors">
                    <SelectValue placeholder={
                      isLoadingFilters ? "Carregando..." : 
                      selectedGrade === 'all' ? "Selecione a série primeiro" :
                      classes.length === 0 ? "Nenhuma turma encontrada" :
                      "Selecione uma turma (opcional)"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as turmas</SelectItem>
                    {classes.map(classItem => (
                      <SelectItem key={classItem.id} value={classItem.id}>
                        {classItem.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedClass !== 'all' && selectedGrade !== 'all' && (
                  <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    Turma selecionada
                  </div>
                )}
                {classes.length === 0 && selectedGrade !== 'all' && !isLoadingFilters && (
                  <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                    Nenhuma turma encontrada para esta série
                  </div>
                )}
              </div>
            </div>

            {/* Filtro de Período */}
            {selectedState !== 'all' && selectedMunicipality !== 'all' && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <h3 className="text-sm font-semibold text-foreground">Filtro por Período</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Data Início</label>
                      <Input
                        type="date"
                        value={periodStart}
                        onChange={(e) => setPeriodStart(e.target.value)}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Data Fim</label>
                      <Input
                        type="date"
                        value={periodEnd}
                        onChange={(e) => setPeriodEnd(e.target.value)}
                        min={periodStart}
                        className="h-10"
                      />
                    </div>
                  </div>
                  {(periodStart || periodEnd) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPeriodStart('');
                        setPeriodEnd('');
                      }}
                      className="text-xs"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Limpar período
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Seção de Avaliações com design moderno */}
            {selectedState !== 'all' && selectedMunicipality !== 'all' && (
              <div className="mt-8 pt-6 border-t border-border">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg">
                      <Target className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Avaliações Disponíveis</h3>
                      <p className="text-sm text-muted-foreground">
                        Selecione as avaliações para comparação
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isLoadingFilters && (
                      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Carregando...</span>
                      </div>
                    )}
                    {!isLoadingFilters && filteredEvaluations.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                          {filteredEvaluations.length} encontrada(s)
                        </Badge>
                        {selectedEvaluationsForComparison.length > 0 && (
                          <Badge variant="outline" className="bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                            {selectedEvaluationsForComparison.length}/{MAX_EVALUATIONS} selecionada(s)
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Busca de avaliações */}
                {!isLoadingFilters && availableEvaluationsForPicker.length > 0 && (
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Buscar avaliações por nome..."
                        value={evaluationSearch}
                        onChange={(e) => setEvaluationSearch(e.target.value)}
                        className="pl-9 h-10"
                      />
                    </div>
                  </div>
                )}

                {isLoadingFilters ? (
                  <div className="flex items-center justify-center py-12 border-2 border-dashed border-border rounded-xl bg-muted/50">
                    <div className="text-center">
                      <RefreshCw className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">Carregando avaliações...</p>
                    </div>
                  </div>
                ) : filteredEvaluations.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                    {filteredEvaluations.map((evaluation) => {
                      const isAlreadyAdded = selectedEvaluationsForComparison.some(e => e.id === evaluation.id);
                      const isInvalid = invalidEvaluationIds.has(evaluation.id);
                      
                      return (
                        <div
                          key={evaluation.id}
                          className={`group relative p-4 rounded-lg border transition-all duration-200 ${
                            isAlreadyAdded
                              ? 'bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-800'
                              : isInvalid
                              ? 'bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-800 opacity-60'
                              : selectedEvaluationsForComparison.length >= MAX_EVALUATIONS
                              ? 'bg-muted/50 border-border opacity-50 cursor-not-allowed'
                              : 'bg-card border-border hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={isAlreadyAdded}
                              disabled={isInvalid || (!isAlreadyAdded && selectedEvaluationsForComparison.length >= MAX_EVALUATIONS)}
                              onCheckedChange={(checked) => {
                                if (checked && !isAlreadyAdded) {
                                  handleAddEvaluation(evaluation.id);
                                } else if (!checked && isAlreadyAdded) {
                                  handleRemoveEvaluation(evaluation.id);
                                }
                              }}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-foreground text-sm leading-tight mb-1">
                                    {evaluation.titulo}
                                  </h4>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(evaluation.data_aplicacao)}
                                  </div>
                                </div>
                                {isAlreadyAdded && (
                                  <Badge variant="outline" className="bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400 border-green-300 dark:border-green-800">
                                    <Check className="h-3 w-3 mr-1" />
                                    Selecionada
                                  </Badge>
                                )}
                                {isInvalid && (
                                  <Badge variant="outline" className="bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-400 border-red-300 dark:border-red-800">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Sem resultados
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-border rounded-xl bg-muted/50">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                      <TrendingUp className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h4 className="text-lg font-medium text-foreground mb-2">Nenhuma avaliação encontrada</h4>
                    <p className="text-sm text-muted-foreground text-center max-w-sm">
                      {evaluationSearch || periodStart || periodEnd
                        ? 'Tente ajustar os filtros de busca ou período.'
                        : 'Tente ajustar os filtros ou verifique se existem avaliações para os critérios selecionados.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>




        {/* Loading dos dados com design melhorado */}
        {isLoadingComparison && (
          <Card className="shadow-lg border-0 bg-card/90 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mb-6">
                  <RefreshCw className="h-10 w-10 animate-spin text-white" />
                </div>
                <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full opacity-20 animate-pulse"></div>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Processando Análise</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Estamos comparando suas avaliações e gerando insights detalhados. Isso pode levar alguns momentos...
              </p>
            </CardContent>
          </Card>
        )}

        {/* Erro na comparação com design melhorado */}
        {comparisonError && (
          <Card className="shadow-lg border-0 bg-card/90 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 bg-gradient-to-r from-red-500 to-rose-500 rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Erro na Análise
              </h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                {comparisonError}
              </p>
              <Button 
                variant="outline" 
                onClick={() => setComparisonError(null)}
                className="border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                Tentar Novamente
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Gráficos de Evolução */}
        {processedData && (
          <EvolutionCharts 
            data={processedData} 
            isLoading={isLoadingComparison}
          />
        )}
      </div>
    </div>
  );
}

