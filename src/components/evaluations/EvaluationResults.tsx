import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Filter, 
  Download, 
  FileText, 
  Users, 
  Target, 
  Award, 
  AlertCircle, 
  Eye,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  FileSpreadsheet,
  X,
  RefreshCw,
  GitCompare
} from "lucide-react";

// Importar os novos tipos
import { 
  EvaluationResultsData, 
  ResultsFilters, 
  StudentProficiency, 
  ClassPerformance,
  ProficiencyLevel,
  proficiencyColors,
  proficiencyLabels,
  calculateProficiency
} from "@/types/evaluation-results";

// Importar o novo serviço da API
import { EvaluationResultsApiService } from "@/services/evaluationResultsApi";

// Importar componentes auxiliares
import { FilterPanel } from "./FilterPanel";
import { ResultsTable, ResultsTableSkeleton } from "./ResultsTable";
import { BackendStatus } from "./BackendStatus";
import { DetailedResultView } from "./DetailedResultView";
import { ExportManager, useAdvancedExport } from "./ExportManager";
import { ComparisonView } from "./ComparisonView";

interface EvaluationResultsProps {
  onBack?: () => void;
}

export default function EvaluationResults({ onBack }: EvaluationResultsProps) {
  // Estados principais
  const [results, setResults] = useState<EvaluationResultsData[]>([]);
  const [selectedResult, setSelectedResult] = useState<EvaluationResultsData | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [filters, setFilters] = useState<ResultsFilters>({});
  const [filteredResults, setFilteredResults] = useState<EvaluationResultsData[]>([]);
  
  // Estados para filtros
  const [availableCourses, setAvailableCourses] = useState<string[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [availableSchools, setAvailableSchools] = useState<string[]>([]);
  
  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [perPage] = useState(10);
  
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState(true);
  
  // Hook para exportação avançada
  const { handleExport: handleAdvancedExport } = useAdvancedExport();

  // Carregamento inicial
  useEffect(() => {
    Promise.all([
      fetchResults(),
      fetchFilterOptions()
    ]);
  }, []);

  // Aplicar filtros (recarregar da API quando filtros mudarem)
  useEffect(() => {
    setCurrentPage(1); // Reset para primeira página
    fetchResults();
  }, [filters]);

  // Recarregar quando a página mudar
  useEffect(() => {
    fetchResults();
  }, [currentPage]);

  const fetchResults = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [evaluationsData, filterOptionsData] = await Promise.all([
        EvaluationResultsApiService.getEvaluations(
          filters, 
          currentPage, 
          perPage
        ),
        EvaluationResultsApiService.getFilterOptions()
      ]);

      setResults(evaluationsData.results);
      setFilteredResults(evaluationsData.results);
      setTotalResults(evaluationsData.total);
      setTotalPages(evaluationsData.totalPages);
      
      // ✅ CORRIGIDO: Usar o indicador de conectividade retornado pelo serviço
      setIsBackendConnected(evaluationsData.isBackendConnected);
      
      console.log('🔍 Status de conectividade:', {
        isBackendConnected: evaluationsData.isBackendConnected,
        totalResults: evaluationsData.total,
        resultsCount: evaluationsData.results.length
      });

    } catch (error) {
      console.error("Erro ao buscar resultados:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os resultados das avaliações",
        variant: "destructive",
      });
      
      // Em caso de erro, usar lista vazia
      setResults([]);
      setFilteredResults([]);
      setTotalResults(0);
      setTotalPages(1);
      setIsBackendConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const options = await EvaluationResultsApiService.getFilterOptions();
      setAvailableCourses(options.courses);
      setAvailableSubjects(options.subjects);
      setAvailableClasses(options.classes);
      setAvailableSchools(options.schools);
    } catch (error) {
      console.error("Erro ao buscar opções de filtros:", error);
      // Em caso de erro, manter arrays vazios (já são o padrão)
    }
  };

  const handleRecalculateEvaluation = async (evaluationId: string) => {
    try {
      setIsRecalculating(true);
      
      const result = await EvaluationResultsApiService.recalculateEvaluation(evaluationId);
      
      if (result.success) {
        toast({
          title: "Recálculo realizado com sucesso!",
          description: result.message,
        });
        
        // Recarregar os dados
        await fetchResults();
        
        // Se estiver na visualização detalhada, recarregar também
        if (selectedResult && selectedResult.id === evaluationId) {
          const updatedResults = filteredResults.find(r => r.id === evaluationId);
          if (updatedResults) {
            setSelectedResult(updatedResults);
          }
        }
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("Erro ao recalcular avaliação:", error);
      toast({
        title: "Erro no recálculo",
        description: (error as Error).message || "Não foi possível recalcular a avaliação",
        variant: "destructive",
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleExportPDF = async (resultId?: string) => {
    try {
      setIsExporting(true);
      // TODO: Implementar exportação PDF real
      toast({
        title: "Exportação PDF iniciada",
        description: "O relatório será gerado em breve.",
      });
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: "Não foi possível gerar o PDF",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async (resultId?: string) => {
    try {
      setIsExporting(true);
      // TODO: Implementar exportação Excel real
      toast({
        title: "Exportação Excel iniciada",
        description: "A planilha será gerada em breve.",
      });
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: "Não foi possível gerar a planilha",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleViewDetails = async (result: EvaluationResultsData) => {
    try {
      setIsLoading(true);
      
      // Carregar dados dos alunos para a visualização detalhada
      const studentsData = await EvaluationResultsApiService.getStudents(result.id, filters);
      
      // Atualizar o resultado com os dados dos alunos
      const resultWithStudents = {
        ...result,
        studentsData
      };
      
      setSelectedResult(resultWithStudents);
    } catch (error) {
      console.error("Erro ao carregar detalhes:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os detalhes da avaliação",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Estatísticas gerais
  const totalEvaluations = totalResults;
  const completedEvaluations = filteredResults.filter(r => r.status === 'completed').length;
  const pendingEvaluations = filteredResults.filter(r => r.status === 'pending').length;
  const averageProficiency = filteredResults.length > 0 
    ? filteredResults.reduce((sum, r) => sum + r.averageProficiency, 0) / filteredResults.length 
    : 0;

  // Se está visualizando resultado específico
  if (selectedResult) {
    return <DetailedResultView 
      result={selectedResult} 
      onBack={() => setSelectedResult(null)}
      onRecalculate={handleRecalculateEvaluation}
      isRecalculating={isRecalculating}
    />;
  }

  // Se está visualizando comparação
  if (showComparison) {
    return <ComparisonView 
      results={filteredResults}
      onBack={() => setShowComparison(false)}
    />;
  }

  return (
    <div className="space-y-6">
      {/* Status do Backend */}
      <BackendStatus 
        isConnected={isBackendConnected} 
        onRetry={() => fetchResults()}
      />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          )}
          <div>
            <h2 className="text-xl font-bold">Resultados das Avaliações</h2>
            <p className="text-sm text-muted-foreground">
              Acompanhe o desempenho detalhado com proficiência e classificação
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* Filtros */}
          <FilterPanel 
            filters={filters}
            onFiltersChange={setFilters}
            availableCourses={availableCourses}
            availableSubjects={availableSubjects}
            availableClasses={availableClasses}
            availableSchools={availableSchools}
          />
          
          {/* Botão de atualizar */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchResults}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          
          {/* Botão de comparação */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowComparison(true)}
            disabled={filteredResults.length < 2}
          >
            <GitCompare className="h-4 w-4 mr-2" />
            Comparar
          </Button>
          
          {/* Exportações */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleExportPDF()}
            disabled={isExporting}
          >
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleExportExcel()}
            disabled={isExporting}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
          
          {/* Exportação Avançada */}
          <ExportManager 
            results={filteredResults}
            onExport={(options) => handleAdvancedExport(filteredResults, options)}
          />
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Avaliações</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-16" /> : totalEvaluations}</div>
            <p className="text-xs text-muted-foreground">
              {completedEvaluations} concluídas • {pendingEvaluations} pendentes
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avaliações Concluídas</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isLoading ? <Skeleton className="h-8 w-16" /> : completedEvaluations}
            </div>
            <p className="text-xs text-muted-foreground">
              Com resultados disponíveis
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Correções Pendentes</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {isLoading ? <Skeleton className="h-8 w-16" /> : pendingEvaluations}
            </div>
            <p className="text-xs text-muted-foreground">
              Aguardando correção
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proficiência Média</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {isLoading ? <Skeleton className="h-8 w-16" /> : Math.round(averageProficiency)}
            </div>
            <p className="text-xs text-muted-foreground">
              Escala de 0 a 1000
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Resultados */}
      <Card>
        <CardHeader>
          <CardTitle>Resultados das Avaliações</CardTitle>
          <CardDescription>
            {totalEvaluations} avaliação(ões) encontrada(s) • Página {currentPage} de {totalPages}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ResultsTableSkeleton />
          ) : (
            <>
              <ResultsTable 
                results={filteredResults}
                onViewDetails={handleViewDetails}
                onExportPDF={handleExportPDF}
                onExportExcel={handleExportExcel}
              />
              
              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {(currentPage - 1) * perPage + 1} a {Math.min(currentPage * perPage, totalResults)} de {totalResults} resultados
                  </p>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1 || isLoading}
                    >
                      Anterior
                    </Button>
                    
                    <span className="text-sm">
                      Página {currentPage} de {totalPages}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages || isLoading}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

 