import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  FileSpreadsheet, 
  CheckCircle2, 
  XCircle, 
  Minus,
  Eye,
  BarChart3,
  Settings,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  Users,
  Award,
  Brain,
  Lightbulb,
  BookOpen,
  Clock,
  ChartLine,
  PieChart
} from "lucide-react";

import { 
  EvaluationResultsApiService, 
  DetailedReport
} from "@/services/evaluationResultsApi";
import { proficiencyColors, ProficiencyLevel } from "@/types/evaluation-results";

interface DetailedEvaluationReportProps {
  evaluationId: string;
  onBack?: () => void;
}

interface DifficultyAnalysis {
  questionId: string;
  questionNumber: number;
  difficulty: string;
  skill: string;
  successRate: number;
  errorRate: number;
  blankRate: number;
  isProblematic: boolean;
  commonErrors: string[];
  recommendation: string;
}

interface PerformanceInsight {
  type: 'success' | 'warning' | 'error';
  title: string;
  description: string;
  value: number;
  icon: React.ReactNode;
  recommendation?: string;
}

export function DetailedEvaluationReport({ evaluationId, onBack }: DetailedEvaluationReportProps) {
  const [reportData, setReportData] = useState<DetailedReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSkills, setShowSkills] = useState(true);
  const [showPercentages, setShowPercentages] = useState(true);
  const [showQuestionStats, setShowQuestionStats] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [difficultyAnalysis, setDifficultyAnalysis] = useState<DifficultyAnalysis[]>([]);
  const [insights, setInsights] = useState<PerformanceInsight[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchDetailedReport();
  }, [evaluationId]);

  useEffect(() => {
    if (reportData) {
      generateDifficultyAnalysis();
      generateInsights();
    }
  }, [reportData]);

  const fetchDetailedReport = async () => {
    try {
      setIsLoading(true);
      const data = await EvaluationResultsApiService.getDetailedReport(evaluationId);
      setReportData(data);
    } catch (error) {
      console.error("Erro ao buscar relatório detalhado:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o relatório detalhado",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateDifficultyAnalysis = () => {
    if (!reportData) return;

    const analysis = reportData.questions.map(question => {
      const blankRate = 100 - question.successRate - question.errorRate;
      const isProblematic = question.successRate < 50 || question.errorRate > 60;
      
      // Simular erros comuns baseados na taxa de erro
      const commonErrors = [];
      if (question.errorRate > 60) {
        commonErrors.push("Conceito fundamental não compreendido");
      }
      if (question.errorRate > 40) {
        commonErrors.push("Dificuldade na interpretação");
      }
      if (blankRate > 20) {
        commonErrors.push("Questão não foi respondida");
      }

      // Gerar recomendação baseada na análise
      let recommendation = "";
      if (isProblematic) {
        if (question.successRate < 30) {
          recommendation = "Revisão completa do conteúdo necessária";
        } else if (question.successRate < 50) {
          recommendation = "Reforço com exercícios adicionais";
        } else {
          recommendation = "Esclarecimento de dúvidas pontuais";
        }
      } else {
        recommendation = "Manter o bom trabalho";
      }

      return {
        questionId: question.id,
        questionNumber: question.number,
        difficulty: question.difficulty,
        skill: question.skill,
        successRate: question.successRate,
        errorRate: question.errorRate,
        blankRate,
        isProblematic,
        commonErrors,
        recommendation
      };
    });

    setDifficultyAnalysis(analysis);
  };

  const generateInsights = () => {
    if (!reportData) return;

    const insights: PerformanceInsight[] = [];
    
    // Calcular métricas
    const totalStudents = reportData.students.length;
    const avgScore = reportData.students.reduce((sum, s) => sum + s.finalScore, 0) / totalStudents;
    const avgProficiency = reportData.students.reduce((sum, s) => sum + s.proficiency, 0) / totalStudents;
    const successRate = (reportData.students.reduce((sum, s) => sum + s.totalCorrect, 0) / (totalStudents * reportData.evaluation.totalQuestions)) * 100;
    
    // Análise de classificação
    const advanced = reportData.students.filter(s => s.classification.toLowerCase().includes('avançado')).length;
    const adequate = reportData.students.filter(s => s.classification.toLowerCase().includes('adequado')).length;
    const basic = reportData.students.filter(s => s.classification.toLowerCase().includes('básico')).length;
    const belowBasic = reportData.students.filter(s => s.classification.toLowerCase().includes('abaixo')).length;
    
    const highPerformers = (advanced + adequate) / totalStudents * 100;
    const needsSupport = (basic + belowBasic) / totalStudents * 100;
    
    // Questões problemáticas
    const problematicQuestions = reportData.questions.filter(q => q.successRate < 50).length;
    const excellentQuestions = reportData.questions.filter(q => q.successRate > 80).length;

    // Gerar insights baseados na análise
    if (successRate >= 80) {
      insights.push({
        type: 'success',
        title: 'Excelente Performance Geral',
        description: `${successRate.toFixed(1)}% de taxa de acerto`,
        value: successRate,
        icon: <Award className="h-5 w-5" />,
        recommendation: "Manter o nível de ensino e considerar desafios extras"
      });
    } else if (successRate >= 60) {
      insights.push({
        type: 'warning',
        title: 'Performance Satisfatória',
        description: `${successRate.toFixed(1)}% de taxa de acerto`,
        value: successRate,
        icon: <Target className="h-5 w-5" />,
        recommendation: "Focar em melhorias pontuais"
      });
    } else {
      insights.push({
        type: 'error',
        title: 'Performance Precisa Melhorar',
        description: `${successRate.toFixed(1)}% de taxa de acerto`,
        value: successRate,
        icon: <TrendingDown className="h-5 w-5" />,
        recommendation: "Revisão geral do conteúdo necessária"
      });
    }

    if (needsSupport > 50) {
      insights.push({
        type: 'error',
        title: 'Muitos Alunos Precisam de Apoio',
        description: `${needsSupport.toFixed(1)}% dos alunos abaixo do esperado`,
        value: needsSupport,
        icon: <AlertTriangle className="h-5 w-5" />,
        recommendation: "Implementar estratégias de recuperação"
      });
    } else if (needsSupport > 25) {
      insights.push({
        type: 'warning',
        title: 'Alguns Alunos Precisam de Apoio',
        description: `${needsSupport.toFixed(1)}% dos alunos abaixo do esperado`,
        value: needsSupport,
        icon: <Users className="h-5 w-5" />,
        recommendation: "Oferecer suporte adicional"
      });
    }

    if (problematicQuestions > reportData.questions.length * 0.3) {
      insights.push({
        type: 'error',
        title: 'Questões Muito Difíceis',
        description: `${problematicQuestions} questões com baixa taxa de acerto`,
        value: (problematicQuestions / reportData.questions.length) * 100,
        icon: <Brain className="h-5 w-5" />,
        recommendation: "Revisar conteúdo das questões problemáticas"
      });
    }

    if (highPerformers > 70) {
      insights.push({
        type: 'success',
        title: 'Turma de Alto Desempenho',
        description: `${highPerformers.toFixed(1)}% dos alunos com bom desempenho`,
        value: highPerformers,
        icon: <TrendingUp className="h-5 w-5" />,
        recommendation: "Considerar desafios mais avançados"
      });
    }

    setInsights(insights);
  };

  const handleExportPDF = () => {
    toast({
      title: "Exportação PDF iniciada",
      description: "O relatório detalhado será gerado em breve.",
    });
  };

  const handleExportExcel = () => {
    toast({
      title: "Exportação Excel iniciada", 
      description: "A planilha detalhada será gerada em breve.",
    });
  };

  const getClassificationColor = (classification: string): ProficiencyLevel => {
    const normalized = classification.toLowerCase().replace(/\s+/g, '_');
    
    if (normalized.includes('abaixo') || normalized.includes('below')) {
      return 'abaixo_do_basico';
    }
    if (normalized.includes('basico') || normalized.includes('basic')) {
      return 'basico';
    }
    if (normalized.includes('adequado') || normalized.includes('adequate')) {
      return 'adequado';
    }
    if (normalized.includes('avancado') || normalized.includes('advanced')) {
      return 'avancado';
    }
    
    return 'basico';
  };

  const getAnswerIcon = (isCorrect: boolean, isBlank: boolean) => {
    if (isBlank) {
      return <Minus className="h-4 w-4 text-gray-500" />;
    }
    return isCorrect ? 
      <CheckCircle2 className="h-4 w-4 text-green-600" /> : 
      <XCircle className="h-4 w-4 text-red-600" />;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'abaixo do basico':
      case 'abaixo_do_basico':
      case 'below_basic':
        return 'bg-red-100 text-red-800';
      case 'basico':
      case 'básico':
      case 'basic':
        return 'bg-yellow-100 text-yellow-800';
      case 'adequado':
      case 'adequate':
        return 'bg-green-100 text-green-800';
      case 'avancado':
      case 'avançado':
      case 'advanced':
        return 'bg-green-800 text-green-100';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getInsightColor = (type: PerformanceInsight['type']) => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getInsightTextColor = (type: PerformanceInsight['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-800';
      case 'warning':
        return 'text-yellow-800';
      case 'error':
        return 'text-red-800';
      default:
        return 'text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Relatório Detalhado</CardTitle>
          <CardDescription>Carregando dados detalhados da avaliação...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!reportData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Relatório Detalhado</CardTitle>
          <CardDescription>Erro ao carregar dados</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Não foi possível carregar o relatório detalhado da avaliação.
          </p>
          <Button onClick={fetchDetailedReport} className="mt-4">
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header do Relatório */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {onBack && (
                <Button variant="outline" size="sm" onClick={onBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
              )}
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Relatório Detalhado da Avaliação
                </CardTitle>
                <CardDescription>
                  {reportData.evaluation.title} • {reportData.evaluation.subject} • {reportData.evaluation.totalQuestions} questões
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Insights de Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Insights de Performance
          </CardTitle>
          <CardDescription>
            Análise automática dos resultados com recomendações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {insights.map((insight, index) => (
              <Card key={index} className={`${getInsightColor(insight.type)} border-2`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${getInsightTextColor(insight.type)}`}>
                      {insight.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-semibold ${getInsightTextColor(insight.type)}`}>
                        {insight.title}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {insight.description}
                      </p>
                      {insight.recommendation && (
                        <Alert className="mt-3">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            <strong>Recomendação:</strong> {insight.recommendation}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs de Análise */}
      <Card>
        <CardHeader>
          <CardTitle>Análise Detalhada</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="questions">Por Questão</TabsTrigger>
              <TabsTrigger value="students">Por Aluno</TabsTrigger>
              <TabsTrigger value="difficulties">Dificuldades</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Resumo Estatístico */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="text-center p-4 border rounded-lg bg-emerald-50">
                  <div className="text-2xl font-bold text-emerald-700">
                    {reportData.students.filter(s => s.classification.toLowerCase().includes('avançado')).length}
                  </div>
                  <div className="text-sm text-emerald-600 font-medium">Avançado</div>
                  <div className="text-xs text-muted-foreground">
                    {((reportData.students.filter(s => s.classification.toLowerCase().includes('avançado')).length / reportData.students.length) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="text-center p-4 border rounded-lg bg-green-50">
                  <div className="text-2xl font-bold text-green-700">
                    {reportData.students.filter(s => s.classification.toLowerCase().includes('adequado')).length}
                  </div>
                  <div className="text-sm text-green-600 font-medium">Adequado</div>
                  <div className="text-xs text-muted-foreground">
                    {((reportData.students.filter(s => s.classification.toLowerCase().includes('adequado')).length / reportData.students.length) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="text-center p-4 border rounded-lg bg-yellow-50">
                  <div className="text-2xl font-bold text-yellow-700">
                    {reportData.students.filter(s => s.classification.toLowerCase().includes('básico')).length}
                  </div>
                  <div className="text-sm text-yellow-600 font-medium">Básico</div>
                  <div className="text-xs text-muted-foreground">
                    {((reportData.students.filter(s => s.classification.toLowerCase().includes('básico')).length / reportData.students.length) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="text-center p-4 border rounded-lg bg-red-50">
                  <div className="text-2xl font-bold text-red-700">
                    {reportData.students.filter(s => s.classification.toLowerCase().includes('abaixo')).length}
                  </div>
                  <div className="text-sm text-red-600 font-medium">Abaixo do Básico</div>
                  <div className="text-xs text-muted-foreground">
                    {((reportData.students.filter(s => s.classification.toLowerCase().includes('abaixo')).length / reportData.students.length) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 border rounded-lg bg-blue-50">
                  <div className="text-2xl font-bold text-blue-700">
                    {(reportData.students.reduce((sum, s) => sum + s.proficiency, 0) / reportData.students.length).toFixed(0)}
                  </div>
                  <div className="text-sm text-blue-600 font-medium">Proficiência Média</div>
                  <div className="text-xs text-muted-foreground">Escala 0-1000</div>
                </div>
                <div className="text-center p-4 border rounded-lg bg-purple-50">
                  <div className="text-2xl font-bold text-purple-700">
                    {(reportData.students.reduce((sum, s) => sum + s.finalScore, 0) / reportData.students.length).toFixed(1)}
                  </div>
                  <div className="text-sm text-purple-600 font-medium">Nota Média</div>
                  <div className="text-xs text-muted-foreground">Escala 0-10</div>
                </div>
                <div className="text-center p-4 border rounded-lg bg-indigo-50">
                  <div className="text-2xl font-bold text-indigo-700">
                    {((reportData.students.reduce((sum, s) => sum + s.totalCorrect, 0) / (reportData.students.length * reportData.evaluation.totalQuestions)) * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-indigo-600 font-medium">Taxa de Acerto Geral</div>
                  <div className="text-xs text-muted-foreground">Média de acertos</div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="questions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Análise por Questão</CardTitle>
                  <CardDescription>
                    Desempenho geral de cada questão da avaliação
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Questão</TableHead>
                          <TableHead>Dificuldade</TableHead>
                          {showSkills && <TableHead className="max-w-md">Habilidade</TableHead>}
                          <TableHead className="text-center">% Acertos</TableHead>
                          <TableHead className="text-center">% Erros</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.questions.map((question) => {
                          const isProblematic = question.successRate < 50;
                          const isExcellent = question.successRate > 80;
                          
                          return (
                            <TableRow key={question.id}>
                              <TableCell className="font-medium">
                                Q{question.number}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={getDifficultyColor(question.difficulty)}>
                                  {question.difficulty}
                                </Badge>
                              </TableCell>
                              {showSkills && (
                                <TableCell className="max-w-md">
                                  <div className="space-y-1">
                                    <div className="font-medium text-sm">{question.skillCode}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {question.skill}
                                    </div>
                                  </div>
                                </TableCell>
                              )}
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <span className="text-green-700 font-medium">
                                    {question.successRate.toFixed(1)}%
                                  </span>
                                  <div className="w-12 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-green-600 h-2 rounded-full"
                                      style={{ width: `${question.successRate}%` }}
                                    />
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <span className="text-red-700 font-medium">
                                    {question.errorRate.toFixed(1)}%
                                  </span>
                                  <div className="w-12 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-red-600 h-2 rounded-full"
                                      style={{ width: `${question.errorRate}%` }}
                                    />
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                {isProblematic && (
                                  <Badge variant="destructive">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Avançado
                                  </Badge>
                                )}
                                {isExcellent && (
                                  <Badge variant="default">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Ótima
                                  </Badge>
                                )}
                                {!isProblematic && !isExcellent && (
                                  <Badge variant="secondary">
                                    Normal
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="students" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Relatório de Respostas dos Alunos</CardTitle>
                  <CardDescription>
                    Respostas individuais de cada aluno para todas as questões
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <div className="min-w-max">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="sticky left-0 bg-white z-10 min-w-[200px]">
                              Aluno
                            </TableHead>
                            {reportData.questions.map((question) => (
                              <TableHead key={question.id} className="text-center min-w-[80px]">
                                <div className="space-y-1">
                                  <div className="font-medium">Q{question.number}</div>
                                  {showSkills && (
                                    <div className="text-xs text-muted-foreground">
                                      {question.skillCode}
                                    </div>
                                  )}
                                  {showPercentages && (
                                    <div className="text-xs">
                                      <span className="text-green-700">{question.successRate.toFixed(0)}%</span>
                                    </div>
                                  )}
                                </div>
                              </TableHead>
                            ))}
                            <TableHead className="text-center min-w-[100px]">Total Acertos</TableHead>
                            <TableHead className="text-center min-w-[100px]">Proficiência</TableHead>
                            <TableHead className="text-center min-w-[120px]">Classificação</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.students.map((student) => {
                            const classificationLevel = getClassificationColor(student.classification);
                            const colors = proficiencyColors[classificationLevel];
                            
                            return (
                              <TableRow key={student.id}>
                                <TableCell className="sticky left-0 bg-white z-10">
                                  <div className="space-y-1">
                                    <div className="font-medium">{student.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {student.class}
                                    </div>
                                  </div>
                                </TableCell>
                                {reportData.questions.map((question) => {
                                  const answer = student.answers.find(a => a.questionId === question.id);
                                  return (
                                    <TableCell key={question.id} className="text-center">
                                      {answer ? getAnswerIcon(answer.isCorrect, answer.isBlank) : <Minus className="h-4 w-4 text-gray-400" />}
                                    </TableCell>
                                  );
                                })}
                                <TableCell className="text-center font-medium">
                                  <div className="space-y-1">
                                    <div className="text-lg">{student.totalCorrect}</div>
                                    <div className="text-xs text-muted-foreground">
                                      de {reportData.evaluation.totalQuestions}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center font-medium">
                                  <div className="space-y-1">
                                    <div className="text-lg">{student.proficiency.toFixed(0)}</div>
                                    <div className="text-xs text-muted-foreground">
                                      Nota: {student.finalScore.toFixed(1)}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge 
                                    variant="outline" 
                                    className={`${colors.bg} ${colors.text} ${colors.border}`}
                                  >
                                    {student.classification}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="difficulties" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Identificação de Dificuldades
                  </CardTitle>
                  <CardDescription>
                    Análise das questões com maior dificuldade e recomendações
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {difficultyAnalysis
                      .sort((a, b) => a.successRate - b.successRate)
                      .slice(0, 8)
                      .map((analysis, index) => (
                        <Card key={analysis.questionId} className={`${analysis.isProblematic ? 'border-red-200 bg-red-50' : 'bg-green-50 border-green-200'}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <Badge variant="outline" className="font-mono">
                                    Q{analysis.questionNumber}
                                  </Badge>
                                  <Badge variant="outline" className={getDifficultyColor(analysis.difficulty)}>
                                    {analysis.difficulty}
                                  </Badge>
                                  {analysis.isProblematic && (
                                    <Badge variant="destructive">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      Problemática
                                    </Badge>
                                  )}
                                </div>
                                <h4 className="font-medium text-sm mb-2">{analysis.skill}</h4>
                                
                                <div className="grid grid-cols-3 gap-4 mb-3">
                                  <div className="text-center">
                                    <div className="text-lg font-bold text-green-600">
                                      {analysis.successRate.toFixed(1)}%
                                    </div>
                                    <div className="text-xs text-muted-foreground">Acertos</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-lg font-bold text-red-600">
                                      {analysis.errorRate.toFixed(1)}%
                                    </div>
                                    <div className="text-xs text-muted-foreground">Erros</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-lg font-bold text-gray-600">
                                      {analysis.blankRate.toFixed(1)}%
                                    </div>
                                    <div className="text-xs text-muted-foreground">Em branco</div>
                                  </div>
                                </div>

                                {analysis.commonErrors.length > 0 && (
                                  <div className="mb-3">
                                    <h5 className="text-sm font-medium mb-1">Possíveis Dificuldades:</h5>
                                    <ul className="text-xs text-muted-foreground space-y-1">
                                      {analysis.commonErrors.map((error, i) => (
                                        <li key={i} className="flex items-center gap-2">
                                          <div className="w-1 h-1 bg-current rounded-full" />
                                          {error}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                <Alert className="mt-2">
                                  <Lightbulb className="h-4 w-4" />
                                  <AlertDescription className="text-xs">
                                    <strong>Recomendação:</strong> {analysis.recommendation}
                                  </AlertDescription>
                                </Alert>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Controles de Visualização */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Opções de Visualização
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="show-skills"
                checked={showSkills}
                onCheckedChange={setShowSkills}
              />
              <label htmlFor="show-skills" className="text-sm font-medium">
                Mostrar Habilidades
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="show-percentages"
                checked={showPercentages}
                onCheckedChange={setShowPercentages}
              />
              <label htmlFor="show-percentages" className="text-sm font-medium">
                Mostrar Porcentagens
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="show-question-stats"
                checked={showQuestionStats}
                onCheckedChange={setShowQuestionStats}
              />
              <label htmlFor="show-question-stats" className="text-sm font-medium">
                Mostrar Estatísticas das Questões
              </label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 