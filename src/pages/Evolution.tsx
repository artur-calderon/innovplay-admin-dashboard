import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Users, Target, Award, Filter, RefreshCw, Download, Plus, X, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/authContext';
import { EvaluationResultsApiService } from '@/services/evaluationResultsApi';
import { EvaluationComparisonApiService, ComparisonResponse, ComparisonFilterOptions } from '@/services/evaluationComparisonApi';
import { EvolutionCharts } from '@/components/evolution/EvolutionCharts';
import { processComparisonData, ProcessedEvolutionData } from '@/utils/evolutionDataProcessor';

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
  data_aplicacao: string;
}

export default function Evolution() {
  const { autoLogin } = useAuth();
  const { toast } = useToast();

  // Estados dos filtros (simplificados)
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('all');
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  
  // Estados do carrinho de avaliações
  const [selectedEvaluationsForComparison, setSelectedEvaluationsForComparison] = useState<Evaluation[]>([]);
  const [availableEvaluationsForPicker, setAvailableEvaluationsForPicker] = useState<Evaluation[]>([]);
  const [selectedEvaluationToPick, setSelectedEvaluationToPick] = useState<string>('all');
  const [invalidEvaluationIds, setInvalidEvaluationIds] = useState<Set<string>>(new Set());

  // Estados dos dados dos filtros
  const [states, setStates] = useState<State[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [schools, setSchools] = useState<School[]>([]);

  // Estados de loading e dados
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [isLoadingComparison, setIsLoadingComparison] = useState(false);
  const [comparisonData, setComparisonData] = useState<ComparisonResponse | null>(null);
  const [processedData, setProcessedData] = useState<ProcessedEvolutionData | null>(null);
  const [comparisonError, setComparisonError] = useState<string | null>(null);

  // Carregar filtros iniciais usando nova API unificada
  const loadInitialFilters = useCallback(async () => {
    try {
      setIsLoadingFilters(true);

      const response = await EvaluationComparisonApiService.getComparisonFilterOptions();
      setStates(response.opcoes.estados?.map(state => ({
        id: state.id,
        name: state.nome,
        uf: state.id
      })) || []);
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

  // Função para adicionar avaliação ao carrinho com validação preventiva
  const handleAddEvaluation = useCallback(async (evaluationId: string) => {
    const evaluation = availableEvaluationsForPicker.find(e => e.id === evaluationId);
    if (!evaluation) return;
    
    // Verificar se já foi adicionada
    if (selectedEvaluationsForComparison.some(e => e.id === evaluationId)) {
      toast({
        title: "Avaliação já adicionada",
        description: "Esta avaliação já está na lista de comparação.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Estratégia de validação inteligente:
      if (selectedEvaluationsForComparison.length === 0) {
        // Primeira avaliação - validar se tem resultados fazendo uma chamada de teste
        // Usar uma abordagem diferente: tentar comparar com ela mesma (pode falhar, mas vamos capturar o erro específico)
        try {
          // Tentar uma comparação que sabemos que vai falhar por "mínimo 2", mas vai validar se tem resultados
          console.log('🔍 Validando primeira avaliação:', evaluationId);
          await EvaluationComparisonApiService.compareEvaluations([evaluationId]);
        } catch (validationError: unknown) {
          console.log('🔍 Erro na validação da primeira avaliação:', validationError);
          let validationErrorMessage = '';
          
          // Extrair mensagem de erro do backend
          if (validationError && typeof validationError === 'object' && 'response' in validationError) {
            const axiosError = validationError as { response?: { data?: { error?: string } } };
            validationErrorMessage = axiosError.response?.data?.error || '';
          } else if (validationError instanceof Error) {
            validationErrorMessage = validationError.message;
          }
          
          // Se o erro é "mínimo 2 avaliações", significa que a avaliação tem resultados
          if (validationErrorMessage.includes('Mínimo de 2 avaliações')) {
            // Avaliação tem resultados - adicionar
            setSelectedEvaluationsForComparison(prev => [...prev, evaluation]);
            toast({
              title: "Avaliação adicionada",
              description: `"${evaluation.titulo}" foi adicionada à comparação.`,
            });
            return;
          } else if (validationErrorMessage.includes('não possui resultados calculados')) {
            // Avaliação não tem resultados - marcar como inválida
            setInvalidEvaluationIds(prev => new Set(prev).add(evaluationId));
            toast({
              title: "Avaliação sem resultados",
              description: "Esta avaliação ainda não possui resultados calculados. Aguarde o processamento.",
              variant: "destructive",
            });
            return;
          } else {
            // Outro tipo de erro - tratar como erro geral
            throw validationError;
          }
        }
      } else {
        // Já há avaliações - validar se pode comparar com a primeira
        const testIds = [selectedEvaluationsForComparison[0].id, evaluationId];
        console.log('🔍 Validando avaliação subsequente:', evaluationId, 'com:', selectedEvaluationsForComparison[0].id);
        await EvaluationComparisonApiService.compareEvaluations(testIds);
        
        // Se passou, adicionar
        setSelectedEvaluationsForComparison(prev => [...prev, evaluation]);
        toast({
          title: "Avaliação adicionada",
          description: `"${evaluation.titulo}" foi adicionada à comparação.`,
        });
      }
    } catch (error: unknown) {
      let errorMessage = '';
      
      // Extrair mensagem de erro do backend
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: string } } };
        errorMessage = axiosError.response?.data?.error || '';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      if (errorMessage.includes('não possui resultados calculados')) {
        // Marcar como inválida
        setInvalidEvaluationIds(prev => new Set(prev).add(evaluationId));
        
        toast({
          title: "Avaliação sem resultados",
          description: "Esta avaliação ainda não possui resultados calculados. Aguarde o processamento.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao adicionar",
          description: errorMessage || "Não foi possível adicionar esta avaliação.",
          variant: "destructive",
        });
      }
    }
  }, [availableEvaluationsForPicker, selectedEvaluationsForComparison, toast]);

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
          setMunicipalities(response.opcoes.municipios?.map(municipality => ({
            id: municipality.id,
            name: municipality.nome,
            state: selectedState
          })) || []);
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
        setSelectedMunicipality('all');
        setSelectedSchool('all');
      }
    };

    loadMunicipalities();
  }, [selectedState, toast]);

  // Carregar avaliações quando município for selecionado usando nova API
  useEffect(() => {
    const loadEvaluations = async () => {
      if (selectedState !== 'all' && selectedMunicipality !== 'all') {
        try {
          setIsLoadingFilters(true);
          const response = await EvaluationComparisonApiService.getComparisonFilterOptions({
            estado: selectedState,
            municipio: selectedMunicipality
          });
          const mappedEvaluations = response.opcoes.avaliacoes?.map(evaluation => ({
            id: evaluation.id || `temp-${Date.now()}-${Math.random()}`,
            titulo: evaluation.titulo || 'Sem título',
            disciplina: '',
            status: 'concluida',
            data_aplicacao: new Date().toISOString()
          })) || [];
          setAvailableEvaluationsForPicker(mappedEvaluations);
        } catch (error) {
          console.error("Erro ao carregar avaliações:", error);
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
        setAvailableEvaluationsForPicker([]);
      }
    };

    loadEvaluations();
  }, [selectedState, selectedMunicipality, toast]);

  // Carregar escolas quando houver 2+ avaliações selecionadas (opcional/condicional)
  useEffect(() => {
    const loadSchoolsForComparison = async () => {
      if (selectedState !== 'all' && selectedMunicipality !== 'all' && selectedEvaluationsForComparison.length >= 2) {
        try {
          setIsLoadingFilters(true);
          const evaluationIds = selectedEvaluationsForComparison.map(e => e.id);
          const response = await EvaluationComparisonApiService.getComparisonFilterOptions({
            estado: selectedState,
            municipio: selectedMunicipality,
            avaliacoes: evaluationIds.join(',')
          });
          setSchools(response.opcoes.escolas?.map(school => ({
            id: school.id,
            name: school.nome
          })) || []);
        } catch (error) {
          console.error("Erro ao carregar escolas:", error);
          setSchools([]);
        } finally {
          setIsLoadingFilters(false);
        }
      } else {
        setSchools([]);
        setSelectedSchool('all');
      }
    };

    loadSchoolsForComparison();
  }, [selectedState, selectedMunicipality, selectedEvaluationsForComparison, toast]);


  // Função para comparar avaliações
  const handleCompareEvaluations = async () => {
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

      const evaluationIds = selectedEvaluationsForComparison.map(e => e.id);
      console.log('IDs finais para comparação:', evaluationIds);

      const comparison = await EvaluationComparisonApiService.compareEvaluations(evaluationIds);
      setComparisonData(comparison);

      // Processar dados para os gráficos
      const processed = processComparisonData(comparison);
      setProcessedData(processed);

      toast({
        title: "Comparação realizada com sucesso!",
        description: `Comparando ${comparison.total_evaluations} avaliações com ${comparison.total_comparisons} comparações.`,
      });
    } catch (error) {
      console.error('Erro ao comparar avaliações:', error);
      
      // Extrair mensagem de erro do backend
      const errorMessage = error.response?.data?.error || error.message || 'Erro desconhecido';
      
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
  };

  // Função para formatar data
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return 'Data não informada';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header com design melhorado */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full mb-4">
            <TrendingUp className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Análise de Evolução
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
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
          {comparisonData && (
            <Button 
              onClick={() => console.log('Exportar dados')}
              className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar Relatório
            </Button>
          )}
        </div>

        {/* Filtros com design melhorado */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-white/20 rounded-lg">
                <Filter className="h-6 w-6" />
              </div>
              Configurar Filtros de Busca
            </CardTitle>
            <CardDescription className="text-blue-100">
              Selecione os critérios para encontrar as avaliações que deseja comparar
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className={`grid gap-6 ${selectedEvaluationsForComparison.length >= 2 ? 'grid-cols-1 lg:grid-cols-4' : 'grid-cols-1 lg:grid-cols-3'}`}>
              {/* Estado */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Estado
                </label>
                <Select
                  value={selectedState}
                  onValueChange={setSelectedState}
                  disabled={isLoadingFilters}
                >
                  <SelectTrigger className="h-12 border-2 border-gray-200 hover:border-blue-300 focus:border-blue-500 transition-colors">
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
                  <div className="text-xs text-green-600 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    Estado selecionado
                  </div>
                )}
              </div>

              {/* Município */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  Município
                </label>
                <Select
                  value={selectedMunicipality}
                  onValueChange={setSelectedMunicipality}
                  disabled={isLoadingFilters || selectedState === 'all'}
                >
                  <SelectTrigger className="h-12 border-2 border-gray-200 hover:border-indigo-300 focus:border-indigo-500 transition-colors">
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
                  <div className="text-xs text-blue-600 flex items-center gap-1">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Carregando municípios...
                  </div>
                )}
                {selectedMunicipality !== 'all' && selectedState !== 'all' && (
                  <div className="text-xs text-green-600 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    Município selecionado
                  </div>
                )}
              </div>

              {/* Escola - Mostrar apenas quando houver 2+ avaliações selecionadas */}
              {selectedEvaluationsForComparison.length >= 2 && (
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    Escola (Opcional)
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      Filtro opcional
                    </span>
                  </label>
                  <Select
                    value={selectedSchool}
                    onValueChange={setSelectedSchool}
                    disabled={isLoadingFilters || selectedMunicipality === 'all'}
                  >
                    <SelectTrigger className="h-12 border-2 border-gray-200 hover:border-purple-300 focus:border-purple-500 transition-colors">
                      <SelectValue placeholder={
                        isLoadingFilters ? "Carregando..." : 
                        selectedMunicipality === 'all' ? "Selecione o município primeiro" :
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
                    <div className="text-xs text-green-600 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      Escola selecionada
                    </div>
                  )}
                  <div className="text-xs text-blue-600 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    Filtro opcional - pode comparar sem selecionar escola
                  </div>
                </div>
              )}
            </div>

            {/* Seção de Avaliações com design profissional */}
            {selectedState !== 'all' && selectedMunicipality !== 'all' && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Avaliações Disponíveis</h3>
                    <p className="text-sm text-gray-600">
                      Selecione as avaliações para comparação
                      {selectedEvaluationsForComparison.length >= 2 && (
                        <span className="ml-2 text-blue-600 font-medium">
                          • Filtro de escolas disponível
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                  <div className="flex items-center gap-3">
                    {isLoadingFilters && (
                      <div className="flex items-center gap-2 text-blue-600">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Carregando...</span>
                      </div>
                    )}
                    {!isLoadingFilters && availableEvaluationsForPicker.length > 0 && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {availableEvaluationsForPicker.length} encontrada(s)
                      </Badge>
                    )}
                  </div>
                </div>

                {isLoadingFilters ? (
                  <div className="flex items-center justify-center py-12 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50">
                    <div className="text-center">
                      <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
                      <p className="text-sm text-gray-600">Carregando avaliações...</p>
                    </div>
                  </div>
                ) : availableEvaluationsForPicker.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto pr-2">
                    {availableEvaluationsForPicker.map((evaluation) => {
                      const isAlreadyAdded = selectedEvaluationsForComparison.some(e => e.id === evaluation.id);
                      const isInvalid = invalidEvaluationIds.has(evaluation.id);
                      
                      return (
                        <div 
                          key={evaluation.id} 
                          className={`group relative p-4 rounded-xl border-2 transition-all duration-200 ${
                            isAlreadyAdded 
                              ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 shadow-green-100 shadow-lg' 
                              : isInvalid
                              ? 'bg-gradient-to-br from-red-50 to-rose-50 border-red-300 opacity-60'
                              : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-100'
                          }`}
                        >
                          {/* Status indicator */}
                          <div className="absolute top-3 right-3">
                            {isAlreadyAdded ? (
                              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                <Check className="h-4 w-4 text-white" />
                              </div>
                            ) : isInvalid ? (
                              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                                <AlertCircle className="h-4 w-4 text-white" />
                              </div>
                            ) : (
                              <div className="w-6 h-6 bg-gray-300 rounded-full group-hover:bg-blue-500 transition-colors"></div>
                            )}
                          </div>

                          <div className="pr-8">
                            <h4 className="font-semibold text-gray-900 text-sm leading-tight mb-2">
                              {evaluation.titulo}
                            </h4>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                {formatDate(evaluation.data_aplicacao)}
                              </div>
                              {isInvalid && (
                                <div className="flex items-center gap-1 text-xs text-red-600">
                                  <AlertCircle className="h-3 w-3" />
                                  Sem resultados calculados
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="mt-4">
                            {isAlreadyAdded ? (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="w-full bg-green-100 text-green-800 border-green-300 hover:bg-green-200"
                                disabled
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Adicionada
                              </Button>
                            ) : (
                              <Button 
                                onClick={() => handleAddEvaluation(evaluation.id)}
                                size="sm"
                                variant={isInvalid ? "outline" : "default"}
                                disabled={isInvalid}
                                className={`w-full ${
                                  isInvalid 
                                    ? 'bg-gray-100 text-gray-500 border-gray-300' 
                                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
                                }`}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                {isInvalid ? 'Indisponível' : 'Adicionar'}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                      <TrendingUp className="h-8 w-8 text-gray-400" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Nenhuma avaliação encontrada</h4>
                    <p className="text-sm text-gray-600 text-center max-w-sm">
                      Tente ajustar os filtros ou verifique se existem avaliações para os critérios selecionados.
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card de Avaliações Selecionadas com design profissional */}
        {selectedEvaluationsForComparison.length > 0 && (
          <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center justify-between text-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Users className="h-6 w-6" />
                  </div>
                  <span>Avaliações Selecionadas</span>
                </div>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  {selectedEvaluationsForComparison.length} avaliação(ões)
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {selectedEvaluationsForComparison.map((evaluation, index) => (
                  <div 
                    key={evaluation.id} 
                    className="group relative p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 hover:border-blue-300 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 text-sm leading-tight mb-1">
                            {evaluation.titulo}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                            {formatDate(evaluation.data_aplicacao)}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveEvaluation(evaluation.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-100 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <Button 
                  className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  onClick={handleCompareEvaluations}
                  disabled={selectedEvaluationsForComparison.length < 2 || isLoadingComparison}
                >
                  {isLoadingComparison ? (
                    <>
                      <RefreshCw className="h-5 w-5 mr-3 animate-spin" />
                      Processando Comparação...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-5 w-5 mr-3" />
                      Iniciar Análise de Evolução ({selectedEvaluationsForComparison.length} avaliações)
                    </>
                  )}
                </Button>
                
                {selectedEvaluationsForComparison.length < 2 && (
                  <p className="text-center text-sm text-gray-500 mt-3">
                    Selecione pelo menos 2 avaliações para iniciar a comparação
                  </p>
                )}
                
                {selectedEvaluationsForComparison.length >= 2 && schools.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-700">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium">
                        Filtro de escolas disponível ({schools.length} escola{schools.length !== 1 ? 's' : ''})
                      </span>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      Você pode opcionalmente filtrar por escola específica ou comparar todas as escolas
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <h4 className="font-medium text-yellow-800 mb-2">Debug Info:</h4>
            <div className="text-sm text-yellow-700 space-y-1">
              <p>Estado: {selectedState} | Município: {selectedMunicipality} | Escola: {selectedSchool}</p>
              <p>Avaliações disponíveis: {availableEvaluationsForPicker.length}</p>
              <p>Avaliações selecionadas: {selectedEvaluationsForComparison.length}</p>
              <p>Avaliações inválidas: {invalidEvaluationIds.size}</p>
              <p>Escolas disponíveis: {schools.length}</p>
              <p>Loading: {isLoadingFilters ? 'SIM' : 'NÃO'}</p>
            </div>
            <div className="mt-2 space-x-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={async () => {
                  try {
                    console.log('Testando nova API de filtros...');
                    const response = await EvaluationComparisonApiService.getComparisonFilterOptions();
                    console.log('Resposta completa:', response);
                    console.log('Estados:', response.opcoes.estados);
                    toast({ title: "Nova API funcionando", description: `${response.opcoes.estados?.length || 0} estados encontrados` });
                  } catch (error) {
                    console.error('Erro no teste:', error);
                    toast({ title: "Erro no teste", description: "Erro ao carregar estados", variant: "destructive" });
                  }
                }}
              >
                Testar Nova API
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={async () => {
                  if (selectedState !== 'all') {
                    try {
                      console.log('Testando API de municípios...');
                      const response = await EvaluationComparisonApiService.getComparisonFilterOptions({
                        estado: selectedState
                      });
                      console.log('Municípios:', response.opcoes.municipios);
                      toast({ title: "Municípios carregados", description: `${response.opcoes.municipios?.length || 0} municípios encontrados` });
                    } catch (error) {
                      console.error('Erro no teste:', error);
                      toast({ title: "Erro no teste", description: "Erro ao carregar municípios", variant: "destructive" });
                    }
                  } else {
                    toast({ title: "Selecione um estado primeiro", variant: "destructive" });
                  }
                }}
              >
                Testar Municípios
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={async () => {
                  if (selectedState !== 'all' && selectedMunicipality !== 'all') {
                    try {
                      console.log('Testando API de avaliações...');
                      const response = await EvaluationComparisonApiService.getComparisonFilterOptions({
                        estado: selectedState,
                        municipio: selectedMunicipality
                      });
                      console.log('Avaliações:', response.opcoes.avaliacoes);
                      toast({ title: "Avaliações carregadas", description: `${response.opcoes.avaliacoes?.length || 0} avaliações encontradas` });
                    } catch (error) {
                      console.error('Erro no teste:', error);
                      toast({ title: "Erro no teste", description: "Erro ao carregar avaliações", variant: "destructive" });
                    }
                  } else {
                    toast({ title: "Selecione estado e município primeiro", variant: "destructive" });
                  }
                }}
              >
                Testar Avaliações
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={async () => {
                  if (selectedEvaluationsForComparison.length >= 2) {
                    try {
                      console.log('Testando API de escolas...');
                      const evaluationIds = selectedEvaluationsForComparison.map(e => e.id);
                      const response = await EvaluationComparisonApiService.getComparisonFilterOptions({
                        estado: selectedState,
                        municipio: selectedMunicipality,
                        avaliacoes: evaluationIds.join(',')
                      });
                      console.log('Escolas:', response.opcoes.escolas);
                      toast({ title: "Escolas carregadas", description: `${response.opcoes.escolas?.length || 0} escolas encontradas` });
                    } catch (error) {
                      console.error('Erro no teste de escolas:', error);
                      toast({ title: "Erro no teste", description: "Erro ao carregar escolas", variant: "destructive" });
                    }
                  } else {
                    toast({ title: "Selecione pelo menos 2 avaliações primeiro", variant: "destructive" });
                  }
                }}
              >
                Testar Escolas
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={async () => {
                  if (selectedEvaluationsForComparison.length > 0) {
                    try {
                      console.log('Testando API de comparação...');
                      const allIds = selectedEvaluationsForComparison.map(e => e.id);
                      console.log('IDs para teste:', allIds);
                      const comparison = await EvaluationComparisonApiService.compareEvaluations(allIds);
                      console.log('Comparação:', comparison);
                      toast({ title: "Comparação testada", description: "API de comparação funcionou!" });
                    } catch (error) {
                      console.error('Erro no teste de comparação:', error);
                      toast({ title: "Erro no teste", description: "Erro na API de comparação", variant: "destructive" });
                    }
                  } else {
                    toast({ title: "Selecione avaliações primeiro", variant: "destructive" });
                  }
                }}
              >
                Testar Comparação
              </Button>
            </div>
          </CardContent>
        </Card>
      )}



        {/* Loading dos dados com design melhorado */}
        {isLoadingComparison && (
          <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mb-6">
                  <RefreshCw className="h-10 w-10 animate-spin text-white" />
                </div>
                <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full opacity-20 animate-pulse"></div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Processando Análise</h3>
              <p className="text-gray-600 text-center max-w-md">
                Estamos comparando suas avaliações e gerando insights detalhados. Isso pode levar alguns momentos...
              </p>
            </CardContent>
          </Card>
        )}

        {/* Erro na comparação com design melhorado */}
        {comparisonError && (
          <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 bg-gradient-to-r from-red-500 to-rose-500 rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Erro na Análise
              </h3>
              <p className="text-gray-600 text-center max-w-md mb-6">
                {comparisonError}
              </p>
              <Button 
                variant="outline" 
                onClick={() => setComparisonError(null)}
                className="border-red-300 text-red-600 hover:bg-red-50"
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

