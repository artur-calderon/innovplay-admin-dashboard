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
import type { ProcessedEvolutionData } from '@/components/evolution/EvolutionCharts';
import { processComparisonData } from '@/utils/evolutionDataProcessor';

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

  // Resetar município quando estado mudar, mas manter avaliações selecionadas
  useEffect(() => {
    setSelectedMunicipality('all');
    setSelectedSchool('all');
  }, [selectedState]);

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
      // Visibilidade de gráficos agora é controlada localmente em EvolutionCharts

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

  // Controles de visibilidade agora são por gráfico, definidos em EvolutionCharts

  // Função para formatar data
  const formatDate = (dateString: string) => {
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
            <div className={`grid gap-6 ${selectedEvaluationsForComparison.length >= 2 ? 'grid-cols-1 lg:grid-cols-4' : 'grid-cols-1 lg:grid-cols-3'}`}>
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

              {/* Escola - Mostrar apenas quando houver 2+ avaliações selecionadas */}
              {selectedEvaluationsForComparison.length >= 2 && (
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    Escola (Opcional)
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      Filtro opcional
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
                  <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    Filtro opcional - pode comparar sem selecionar escola
                  </div>
                </div>
              )}
            </div>

            {/* Seção de Avaliações com design profissional */}
            {selectedState !== 'all' && selectedMunicipality !== 'all' && (
              <div className="mt-8 pt-6 border-t border-border">
                <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Avaliações Disponíveis</h3>
                    <p className="text-sm text-muted-foreground">
                      Selecione as avaliações para comparação
                      {selectedEvaluationsForComparison.length >= 2 && (
                        <span className="ml-2 text-blue-600 dark:text-blue-400 font-medium">
                          • Filtro de escolas disponível
                        </span>
                      )}
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
                    {!isLoadingFilters && availableEvaluationsForPicker.length > 0 && (
                      <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                        {availableEvaluationsForPicker.length} encontrada(s)
                      </Badge>
                    )}
                  </div>
                </div>

                {isLoadingFilters ? (
                  <div className="flex items-center justify-center py-12 border-2 border-dashed border-border rounded-xl bg-muted/50">
                    <div className="text-center">
                      <RefreshCw className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">Carregando avaliações...</p>
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
                              ? 'bg-gradient-to-br from-green-50 dark:from-green-950/30 to-emerald-50 dark:to-emerald-950/30 border-green-300 dark:border-green-800 shadow-green-100 dark:shadow-green-950/30 shadow-lg' 
                              : isInvalid
                              ? 'bg-gradient-to-br from-red-50 dark:from-red-950/30 to-rose-50 dark:to-rose-950/30 border-red-300 dark:border-red-800 opacity-60'
                              : 'bg-card border-border hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg hover:shadow-blue-100 dark:hover:shadow-blue-950/30'
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
                              <div className="w-6 h-6 bg-muted rounded-full group-hover:bg-blue-500 dark:group-hover:bg-blue-600 transition-colors"></div>
                            )}
                          </div>

                          <div className="pr-8">
                            <h4 className="font-semibold text-foreground text-sm leading-tight mb-2">
                              {evaluation.titulo}
                            </h4>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                {formatDate(evaluation.data_aplicacao)}
                              </div>
                              {isInvalid && (
                                <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
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
                                className="w-full bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400 border-green-300 dark:border-green-800 hover:bg-green-200 dark:hover:bg-green-950/40"
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
                                    ? 'bg-muted text-muted-foreground border-border' 
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
                  <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-border rounded-xl bg-muted/50">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                      <TrendingUp className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h4 className="text-lg font-medium text-foreground mb-2">Nenhuma avaliação encontrada</h4>
                    <p className="text-sm text-muted-foreground text-center max-w-sm">
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
          <Card className="shadow-lg border-0 bg-card/90 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center justify-between text-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 dark:bg-white/10 rounded-lg">
                    <Users className="h-6 w-6" />
                  </div>
                  <span>Avaliações Selecionadas</span>
                </div>
                <Badge variant="secondary" className="bg-white/20 dark:bg-white/10 text-white border-white/30 dark:border-white/20">
                  {selectedEvaluationsForComparison.length} avaliações
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
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
              
              <div className="pt-4 border-t border-border">
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
                  <p className="text-center text-sm text-muted-foreground mt-3">
                    Selecione pelo menos 2 avaliações para iniciar a comparação
                  </p>
                )}
                
                {selectedEvaluationsForComparison.length >= 2 && schools.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium">
                        Filtro de escolas disponível ({schools.length} escola{schools.length !== 1 ? 's' : ''})
                      </span>
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Você pode opcionalmente filtrar por escola específica ou comparar todas as escolas
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}




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

