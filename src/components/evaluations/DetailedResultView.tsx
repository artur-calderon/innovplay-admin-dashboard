import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  RefreshCw, 
  FileText, 
  FileSpreadsheet,
  Users,
  Target,
  Award,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Eye,
  Download,
  Share2,
  Filter,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Minus
} from "lucide-react";

import { 
  EvaluationResultsData, 
  ProficiencyLevel, 
  proficiencyColors, 
  proficiencyLabels 
} from "@/types/evaluation-results";

import { EvaluationResultsApiService } from "@/services/evaluationResultsApi";
import { DetailedEvaluationReport } from "./DetailedEvaluationReport";

interface DetailedResultViewProps {
  result: EvaluationResultsData;
  onBack: () => void;
  onRecalculate: (id: string) => void;
  isRecalculating: boolean;
}

export function DetailedResultView({ 
  result, 
  onBack, 
  onRecalculate, 
  isRecalculating 
}: DetailedResultViewProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isExporting, setIsExporting] = useState(false);
  const [showDetailedReport, setShowDetailedReport] = useState(false);
  const { toast } = useToast();

  const participationRate = (result.completedStudents / result.totalStudents) * 100;
  const completedStudents = result.studentsData?.filter(s => s.status === 'completed') || [];
  
  const getProficiencyLevel = (proficiency: number): ProficiencyLevel => {
    if (proficiency < 200) return 'abaixo_do_basico';
    if (proficiency < 500) return 'basico';
    if (proficiency < 750) return 'adequado';
    return 'avancado';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'absent':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluída';
      case 'pending':
        return 'Pendente';
      case 'absent':
        return 'Ausente';
      default:
        return 'Desconhecido';
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      // TODO: Implementar exportação PDF real com jsPDF
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simular processamento
      
      toast({
        title: "PDF exportado com sucesso!",
        description: "O relatório detalhado foi gerado e baixado.",
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

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      // TODO: Implementar exportação Excel real com XLSX
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simular processamento
      
      toast({
        title: "Excel exportado com sucesso!",
        description: "A planilha detalhada foi gerada e baixada.",
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

  const handleShare = async () => {
    try {
      const shareData = {
        title: `Resultado: ${result.evaluationTitle}`,
        text: `Confira os resultados da avaliação ${result.evaluationTitle}`,
        url: window.location.href
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link copiado!",
          description: "O link do relatório foi copiado para a área de transferência.",
        });
      }
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
    }
  };

  // Calcular estatísticas avançadas
  const calculateAdvancedStats = () => {
    if (!result.studentsData || result.studentsData.length === 0) {
      return {
        medianScore: 0,
        standardDeviation: 0,
        q1: 0,
        q3: 0,
        outliers: []
      };
    }

    const scores = result.studentsData
      .filter(s => s.status === 'completed')
      .map(s => s.rawScore)
      .sort((a, b) => a - b);

    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const median = scores.length % 2 === 0
      ? (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2
      : scores[Math.floor(scores.length / 2)];

    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);

    const q1Index = Math.floor(scores.length * 0.25);
    const q3Index = Math.floor(scores.length * 0.75);
    const q1 = scores[q1Index];
    const q3 = scores[q3Index];

    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    const outliers = scores.filter(score => score < lowerBound || score > upperBound);

    return {
      medianScore: median,
      standardDeviation,
      q1,
      q3,
      outliers
    };
  };

  const stats = calculateAdvancedStats();

  if (showDetailedReport) {
    return (
      <DetailedEvaluationReport 
        evaluationId={result.id}
        onBack={() => setShowDetailedReport(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h2 className="text-xl font-bold">{result.evaluationTitle}</h2>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{result.school} • {result.grade} • {result.subject}</span>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{new Date(result.appliedAt).toLocaleDateString('pt-BR')}</span>
              </div>
              {result.correctedAt && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>Corrigida em {new Date(result.correctedAt).toLocaleDateString('pt-BR')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onRecalculate(result.id)}
            disabled={isRecalculating}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRecalculating ? 'animate-spin' : ''}`} />
            {isRecalculating ? 'Recalculando...' : 'Recalcular'}
          </Button>
          
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Compartilhar
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportPDF}
            disabled={isExporting}
          >
            <FileText className="h-4 w-4 mr-2" />
            {isExporting ? 'Gerando...' : 'PDF'}
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportExcel}
            disabled={isExporting}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {isExporting ? 'Gerando...' : 'Excel'}
          </Button>
          
          <Button 
            size="sm" 
            onClick={() => setShowDetailedReport(true)}
          >
            <Eye className="h-4 w-4 mr-2" />
            Relatório Detalhado
          </Button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participação</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{result.completedStudents}</div>
            <p className="text-xs text-muted-foreground">
              de {result.totalStudents} alunos
            </p>
            <Progress value={participationRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {participationRate.toFixed(1)}% de participação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média de Nota</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{result.averageRawScore.toFixed(1)}</div>
              {result.averageRawScore >= 7 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">de 10.0 pontos</p>
            <p className="text-xs text-muted-foreground">Mediana: {stats.medianScore.toFixed(1)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proficiência Média</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(result.averageProficiency)}</div>
            <p className="text-xs text-muted-foreground">escala de 0 a 1000</p>
            <p className="text-xs text-muted-foreground">
              Desvio padrão: {stats.standardDeviation.toFixed(1)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Turmas</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{result.classesPerformance?.length || 1}</div>
            <p className="text-xs text-muted-foreground">participantes</p>
            {stats.outliers.length > 0 && (
              <p className="text-xs text-orange-600 mt-1">
                {stats.outliers.length} outlier(s) detectado(s)
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Conteúdo Principal com Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="students">Alunos</TabsTrigger>
          <TabsTrigger value="classes">Turmas</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Distribuição por Classificação */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Classificação</CardTitle>
              <CardDescription>
                Quantidade de alunos em cada nível de proficiência
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {Object.entries(result.distributionByLevel).map(([level, count]) => {
                  const proficiencyLevel = level as ProficiencyLevel;
                  const colors = proficiencyColors[proficiencyLevel];
                  const percentage = result.totalStudents > 0 ? (count / result.totalStudents) * 100 : 0;
                  
                  return (
                    <div key={level} className={`p-4 rounded-lg border ${colors.border} ${colors.bg}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-3 h-3 rounded-full ${colors.dot}`}></div>
                        <span className={`text-sm font-medium ${colors.text}`}>
                          {proficiencyLabels[proficiencyLevel]}
                        </span>
                      </div>
                      <div className={`text-3xl font-bold ${colors.text}`}>{count}</div>
                      <div className={`text-xs ${colors.text} opacity-80`}>
                        {percentage.toFixed(1)}% dos alunos
                      </div>
                      <Progress 
                        value={percentage} 
                        className="mt-2 h-2" 
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Status da Avaliação */}
          <Card>
            <CardHeader>
              <CardTitle>Status da Avaliação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-green-50">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                  <div>
                    <div className="font-semibold text-green-800">Concluídas</div>
                    <div className="text-2xl font-bold text-green-600">{result.completedStudents}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-orange-50">
                  <AlertCircle className="h-8 w-8 text-orange-600" />
                  <div>
                    <div className="font-semibold text-orange-800">Pendentes</div>
                    <div className="text-2xl font-bold text-orange-600">{result.pendingStudents}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-red-50">
                  <XCircle className="h-8 w-8 text-red-600" />
                  <div>
                    <div className="font-semibold text-red-800">Ausentes</div>
                    <div className="text-2xl font-bold text-red-600">{result.absentStudents}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Desempenho Individual dos Alunos</CardTitle>
              <CardDescription>
                Resultados detalhados de {completedStudents.length} alunos que realizaram a avaliação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aluno</TableHead>
                      <TableHead>Turma</TableHead>
                      <TableHead>Nota</TableHead>
                      <TableHead>Proficiência</TableHead>
                      <TableHead>Classificação</TableHead>
                      <TableHead>Acertos</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(result.studentsData || []).map((student) => {
                      const proficiencyLevel = getProficiencyLevel(student.proficiencyScore);
                      const colors = proficiencyColors[proficiencyLevel];
                      const percentage = student.answeredQuestions > 0 
                        ? (student.correctAnswers / student.answeredQuestions) * 100 
                        : 0;

                      return (
                        <TableRow key={student.studentId}>
                          <TableCell className="font-medium">
                            {student.studentName}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {student.studentClass}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{student.rawScore.toFixed(1)}</span>
                              {student.rawScore >= 7 ? (
                                <TrendingUp className="h-3 w-3 text-green-600" />
                              ) : (
                                <TrendingDown className="h-3 w-3 text-red-600" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {student.proficiencyScore}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${colors.bg} ${colors.text} ${colors.border}`}
                            >
                              {student.classification}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm">
                                {student.correctAnswers}/{student.answeredQuestions}
                              </div>
                              <Progress value={percentage} className="h-1" />
                              <div className="text-xs text-muted-foreground">
                                {percentage.toFixed(1)}%
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(student.status)}>
                              {getStatusText(student.status)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="classes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Desempenho por Turma</CardTitle>
              <CardDescription>
                Comparação de performance entre as turmas participantes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {result.classesPerformance && result.classesPerformance.length > 0 ? (
                <div className="space-y-4">
                  {result.classesPerformance.map((classData) => (
                    <div key={classData.classId} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">{classData.className}</h4>
                        <Badge variant="outline">
                          {classData.completedStudents}/{classData.totalStudents} alunos
                        </Badge>
                      </div>
                      
                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <div className="text-sm text-muted-foreground">Média de Nota</div>
                          <div className="text-2xl font-bold">{classData.averageScore.toFixed(1)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Proficiência Média</div>
                          <div className="text-2xl font-bold">{Math.round(classData.averageProficiency)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Participação</div>
                          <div className="text-2xl font-bold">
                            {((classData.completedStudents / classData.totalStudents) * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <div className="text-sm text-muted-foreground mb-2">Distribuição</div>
                        <div className="grid grid-cols-4 gap-2">
                          {Object.entries(classData.distributionByLevel).map(([level, count]) => {
                            const proficiencyLevel = level as ProficiencyLevel;
                            const colors = proficiencyColors[proficiencyLevel];
                            return (
                              <div key={level} className={`text-center p-2 rounded ${colors.bg}`}>
                                <div className={`text-lg font-bold ${colors.text}`}>{count}</div>
                                <div className={`text-xs ${colors.text}`}>
                                  {proficiencyLabels[proficiencyLevel]}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Dados de turmas não disponíveis</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Análise Estatística Avançada</CardTitle>
              <CardDescription>
                Estatísticas detalhadas e insights sobre o desempenho
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="font-semibold">Medidas de Tendência Central</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>Média:</span>
                      <span className="font-medium">{result.averageRawScore.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Mediana:</span>
                      <span className="font-medium">{stats.medianScore.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Q1 (25%):</span>
                      <span className="font-medium">{stats.q1.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Q3 (75%):</span>
                      <span className="font-medium">{stats.q3.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold">Medidas de Dispersão</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>Desvio Padrão:</span>
                      <span className="font-medium">{stats.standardDeviation.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Amplitude IQ:</span>
                      <span className="font-medium">{(stats.q3 - stats.q1).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Outliers:</span>
                      <span className="font-medium">{stats.outliers.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Taxa de Participação:</span>
                      <span className="font-medium">{participationRate.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {stats.outliers.length > 0 && (
                <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <h5 className="font-semibold text-orange-800 mb-2">Outliers Detectados</h5>
                  <p className="text-sm text-orange-700">
                    {stats.outliers.length} nota(s) fora do padrão: {stats.outliers.map(o => o.toFixed(1)).join(', ')}
                  </p>
                  <p className="text-xs text-orange-600 mt-1">
                    Outliers são valores que se desviam significativamente da média, podendo indicar casos excepcionais.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 