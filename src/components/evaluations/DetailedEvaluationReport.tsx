import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  FileSpreadsheet, 
  CheckCircle2, 
  XCircle, 
  Minus,
  Eye,
  EyeOff,
  BarChart3,
  Settings,
  ArrowLeft
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

export function DetailedEvaluationReport({ evaluationId, onBack }: DetailedEvaluationReportProps) {
  const [reportData, setReportData] = useState<DetailedReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSkills, setShowSkills] = useState(true);
  const [showPercentages, setShowPercentages] = useState(true);
  const [showQuestionStats, setShowQuestionStats] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDetailedReport();
  }, [evaluationId]);

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

      {/* Estatísticas das Questões */}
      {showQuestionStats && (
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.questions.map((question) => (
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Relatório de Respostas dos Alunos */}
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

      {/* Resumo Estatístico */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo Estatístico da Avaliação</CardTitle>
        </CardHeader>
        <CardContent>
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
          
          <div className="mt-6 grid gap-4 md:grid-cols-3">
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
        </CardContent>
      </Card>
    </div>
  );
} 