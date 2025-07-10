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
  GitCompare,
  Calculator,
  GraduationCap,
  School
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
  calculateProficiency,
  getProficiencyTableInfo
} from "@/types/evaluation-results";

// Importar o novo serviço da API
import { EvaluationResultsApiService } from "@/services/evaluationResultsApi";

// Importar componentes auxiliares
import { FilterPanel } from "./FilterPanel";
import { ResultsTable, ResultsTableSkeleton } from "./ResultsTable";
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
  
  // ✅ NOVOS ESTADOS: Usando os tipos importados
  const [allStudentsData, setAllStudentsData] = useState<StudentProficiency[]>([]);
  const [classesPerformance, setClassesPerformance] = useState<ClassPerformance[]>([]);
  const [proficiencyAnalysis, setProficiencyAnalysis] = useState<{
    distribution: Record<ProficiencyLevel, number>;
    averageByLevel: Record<ProficiencyLevel, number>;
    topPerformers: StudentProficiency[];
    needsAttention: StudentProficiency[];
  } | null>(null);
  
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

  // ✅ NOVO EFEITO: Analisar dados quando resultados mudarem
  useEffect(() => {
    if (filteredResults.length > 0) {
      analyzeProficiencyData();
      extractClassesPerformance();
    }
  }, [filteredResults]);

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
      
      // ✅ NOVO: Carregar dados dos alunos para análise
      await loadStudentsData(evaluationsData.results);
      
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

  // ✅ NOVA FUNÇÃO: Carregar dados dos alunos para análise
  const loadStudentsData = async (evaluations: EvaluationResultsData[]) => {
    try {
      const allStudents: StudentProficiency[] = [];
      
      for (const evaluation of evaluations) {
        if (evaluation.status === 'completed') {
          // Usar studentsData já carregado se disponível
          if (evaluation.studentsData && evaluation.studentsData.length > 0) {
            allStudents.push(...evaluation.studentsData);
          } else {
            // Buscar dados dos alunos via API
            const students = await EvaluationResultsApiService.getStudents(evaluation.id, filters);
            allStudents.push(...students);
          }
        }
      }
      
      setAllStudentsData(allStudents);
    } catch (error) {
      console.error("Erro ao carregar dados dos alunos:", error);
    }
  };

  // ✅ NOVA FUNÇÃO: Analisar dados de proficiência usando os tipos importados
  const analyzeProficiencyData = () => {
    if (allStudentsData.length === 0) return;

    // Distribuição por nível
    const distribution: Record<ProficiencyLevel, number> = {
      abaixo_do_basico: 0,
      basico: 0,
      adequado: 0,
      avancado: 0
    };

    // Média por nível
    const scoresByLevel: Record<ProficiencyLevel, number[]> = {
      abaixo_do_basico: [],
      basico: [],
      adequado: [],
      avancado: []
    };

    allStudentsData.forEach(student => {
      distribution[student.proficiencyLevel]++;
      scoresByLevel[student.proficiencyLevel].push(student.rawScore);
    });

    const averageByLevel: Record<ProficiencyLevel, number> = {
      abaixo_do_basico: scoresByLevel.abaixo_do_basico.length > 0 
        ? scoresByLevel.abaixo_do_basico.reduce((a, b) => a + b, 0) / scoresByLevel.abaixo_do_basico.length 
        : 0,
      basico: scoresByLevel.basico.length > 0 
        ? scoresByLevel.basico.reduce((a, b) => a + b, 0) / scoresByLevel.basico.length 
        : 0,
      adequado: scoresByLevel.adequado.length > 0 
        ? scoresByLevel.adequado.reduce((a, b) => a + b, 0) / scoresByLevel.adequado.length 
        : 0,
      avancado: scoresByLevel.avancado.length > 0 
        ? scoresByLevel.avancado.reduce((a, b) => a + b, 0) / scoresByLevel.avancado.length 
        : 0
    };

    // Top performers (10% melhores)
    const sortedStudents = [...allStudentsData].sort((a, b) => b.proficiencyScore - a.proficiencyScore);
    const topCount = Math.max(1, Math.ceil(allStudentsData.length * 0.1));
    const topPerformers = sortedStudents.slice(0, topCount);

    // Alunos que precisam de atenção (abaixo do básico + básico com nota baixa)
    const needsAttention = allStudentsData.filter(student => 
      student.proficiencyLevel === 'abaixo_do_basico' || 
      (student.proficiencyLevel === 'basico' && student.rawScore < 6)
    );

    setProficiencyAnalysis({
      distribution,
      averageByLevel,
      topPerformers,
      needsAttention
    });
  };

  // ✅ NOVA FUNÇÃO: Extrair dados de performance das turmas
  const extractClassesPerformance = () => {
    const classesMap = new Map<string, ClassPerformance>();

    filteredResults.forEach(result => {
      if (result.classesPerformance) {
        result.classesPerformance.forEach(classData => {
          const existing = classesMap.get(classData.classId);
          if (!existing) {
            classesMap.set(classData.classId, classData);
          }
        });
      }
    });

    setClassesPerformance(Array.from(classesMap.values()));
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

  // ✅ NOVA FUNÇÃO: Simular cálculo de proficiência para demonstrar uso do calculateProficiency
  const handleSimulateProficiency = (score: number) => {
    // Simular com diferentes cenários para demonstrar as P.M oficiais
    const scenarios = [
      { grade: '3º Ano', subject: 'Português', course: 'Anos Iniciais', pm: 350 },
      { grade: '3º Ano', subject: 'Matemática', course: 'Anos Iniciais', pm: 375 },
      { grade: '6º Ano', subject: 'História', course: 'Anos Finais', pm: 400 },
      { grade: '6º Ano', subject: 'Matemática', course: 'Anos Finais', pm: 425 },
      { grade: '1º Ano EM', subject: 'Física', course: 'Ensino Médio', pm: 400 },
      { grade: '1º Ano EM', subject: 'Matemática', course: 'Ensino Médio', pm: 425 }
    ];
    
    const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    const result = calculateProficiency(score, 20, randomScenario.grade, randomScenario.subject, randomScenario.course);
    
    // Calcular a fórmula manualmente para mostrar
    const calculatedScore = Math.round((score / 10) * randomScenario.pm);
    
    toast({
      title: "Simulação de Proficiência",
      description: `${randomScenario.grade} - ${randomScenario.subject} | P.M=${randomScenario.pm} | Nota ${score} → (${score}/10 × ${randomScenario.pm}) = ${calculatedScore} pts (${result.classification})`,
      duration: 6000,
    });
  };

  // ✅ NOVA FUNÇÃO: Mostrar informações das tabelas de proficiência
  const handleShowTableInfo = () => {
    const examples = [
      { grade: '3º Ano', subject: 'Matemática' },
      { grade: '3º Ano', subject: 'Português' },
      { grade: '6º Ano', subject: 'Matemática' },
      { grade: '6º Ano', subject: 'História' },
      { grade: '1º Ano EM', subject: 'Matemática' },
      { grade: '1º Ano EM', subject: 'Física' }
    ];
    
    const example = examples[Math.floor(Math.random() * examples.length)];
    const tableInfo = getProficiencyTableInfo(example.grade, example.subject);
    
    const tableDetails = Object.entries(tableInfo.table).map(([level, range]) => 
      `${proficiencyLabels[level as ProficiencyLevel]}: ${range.min}-${range.max}`
    ).join(' | ');
    
    toast({
      title: `${tableInfo.tableName}`,
      description: `${example.grade} - ${example.subject} | ${tableInfo.pmDescription} | ${tableDetails}`,
      duration: 8000,
    });
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

  // ✅ ESTATÍSTICAS: Usando os dados de alunos
  const totalStudentsAnalyzed = allStudentsData.length;
  const averageStudentScore = allStudentsData.length > 0
    ? allStudentsData.reduce((sum, s) => sum + s.rawScore, 0) / allStudentsData.length
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
          
          {/* ✅ NOVO: Botão de simulação de proficiência */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleSimulateProficiency(7.5)}
          >
            <Calculator className="h-4 w-4 mr-2" />
            Simular
          </Button>
          
          {/* ✅ NOVO: Botão para mostrar informações das tabelas */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleShowTableInfo}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Tabelas
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

      {/* ✅ NOVA SEÇÃO: Análise de Proficiência usando os tipos importados */}
      {proficiencyAnalysis && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Object.entries(proficiencyAnalysis.distribution).map(([level, count]) => {
            const proficiencyLevel = level as ProficiencyLevel;
            const colors = proficiencyColors[proficiencyLevel];
            const percentage = totalStudentsAnalyzed > 0 ? (count / totalStudentsAnalyzed) * 100 : 0;
            const averageScore = proficiencyAnalysis.averageByLevel[proficiencyLevel];
            
            return (
              <Card key={level} className={`border-l-4 ${colors.border}`}>
                <CardHeader className="pb-2">
                  <CardTitle className={`text-sm font-medium ${colors.text}`}>
                    {proficiencyLabels[proficiencyLevel]}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${colors.text}`}>{count}</div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {percentage.toFixed(1)}% dos alunos
                  </p>
                  <Progress value={percentage} className="h-2 mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Média: {averageScore.toFixed(1)}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Cards de Estatísticas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
            <CardTitle className="text-sm font-medium">Alunos Analisados</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {isLoading ? <Skeleton className="h-8 w-16" /> : totalStudentsAnalyzed}
            </div>
            <p className="text-xs text-muted-foreground">
              Média: {averageStudentScore.toFixed(1)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Turmas Participantes</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {isLoading ? <Skeleton className="h-8 w-16" /> : classesPerformance.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Classes analisadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ✅ NOVA SEÇÃO: Insights usando StudentProficiency */}
      {proficiencyAnalysis && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-600" />
                Top Performers
              </CardTitle>
              <CardDescription>
                {proficiencyAnalysis.topPerformers.length} melhores alunos (10% do total)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {proficiencyAnalysis.topPerformers.slice(0, 5).map((student, index) => (
                  <div key={student.studentId} className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                      <span className="font-medium text-sm">{student.studentName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${proficiencyColors[student.proficiencyLevel].bg} ${proficiencyColors[student.proficiencyLevel].text}`}>
                        {student.proficiencyScore}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{student.rawScore.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
                {proficiencyAnalysis.topPerformers.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{proficiencyAnalysis.topPerformers.length - 5} mais...
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                Precisam de Atenção
              </CardTitle>
              <CardDescription>
                {proficiencyAnalysis.needsAttention.length} alunos abaixo do esperado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {proficiencyAnalysis.needsAttention.slice(0, 5).map((student) => (
                  <div key={student.studentId} className="flex items-center justify-between p-2 bg-orange-50 rounded">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{student.studentName}</span>
                      <Badge variant="outline" className="text-xs">{student.studentClass}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${proficiencyColors[student.proficiencyLevel].bg} ${proficiencyColors[student.proficiencyLevel].text}`}>
                        {proficiencyLabels[student.proficiencyLevel]}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{student.rawScore.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
                {proficiencyAnalysis.needsAttention.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{proficiencyAnalysis.needsAttention.length - 5} mais...
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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

 