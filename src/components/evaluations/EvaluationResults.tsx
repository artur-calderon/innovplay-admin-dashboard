import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Download,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  BookOpen,
  Target,
  Award,
  AlertCircle
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockApi, EvaluationResult } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";

interface EvaluationResultsProps {
  onBack?: () => void;
}

export default function EvaluationResults({ onBack }: EvaluationResultsProps) {
  const [results, setResults] = useState<EvaluationResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<EvaluationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      setIsLoading(true);
      const data = await mockApi.getEvaluationResults();
      setResults(data);
    } catch (error) {
      console.error("Erro ao buscar resultados:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os resultados",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (resultId: string) => {
    try {
      setIsExporting(true);
      const response = await mockApi.exportResults([resultId]);
      
      if (response.success) {
        toast({
          title: "Exportação realizada!",
          description: "Os resultados foram exportados com sucesso.",
        });
      }
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar os resultados",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
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
      case 'in_progress':
        return 'Em Andamento';
      default:
        return 'Desconhecido';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (selectedResult) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => setSelectedResult(null)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h2 className="text-xl font-bold">{selectedResult.evaluationTitle}</h2>
              <p className="text-sm text-muted-foreground">
                {selectedResult.school} • {selectedResult.grade}
              </p>
            </div>
          </div>
          <Badge className={getStatusColor(selectedResult.status)}>
            {getStatusText(selectedResult.status)}
          </Badge>
        </div>

        {/* Estatísticas Gerais */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Participação</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedResult.completedStudents}</div>
              <p className="text-xs text-muted-foreground">
                de {selectedResult.totalStudents} alunos
              </p>
              <Progress 
                value={(selectedResult.completedStudents / selectedResult.totalStudents) * 100} 
                className="mt-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Média Geral</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedResult.averageScore.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">
                de 10.0 pontos
              </p>
              <Progress 
                value={selectedResult.averageScore * 10} 
                className="mt-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Aprovação</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedResult.passRate}%</div>
              <p className="text-xs text-muted-foreground">
                dos alunos aprovados
              </p>
              <Progress 
                value={selectedResult.passRate} 
                className="mt-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendências</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedResult.pendingStudents}</div>
              <p className="text-xs text-muted-foreground">
                correções pendentes
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detalhes por Tabs */}
        <Tabs defaultValue="students" className="space-y-4">
          <TabsList>
            <TabsTrigger value="students">Alunos</TabsTrigger>
            <TabsTrigger value="questions">Análise de Questões</TabsTrigger>
            <TabsTrigger value="difficulty">Dificuldade</TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Desempenho dos Alunos</CardTitle>
                <CardDescription>
                  Resultados individuais dos {selectedResult.completedStudents} alunos que realizaram a avaliação
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aluno</TableHead>
                      <TableHead>Nota</TableHead>
                      <TableHead>Acertos</TableHead>
                      <TableHead>Erros</TableHead>
                      <TableHead>Em Branco</TableHead>
                      <TableHead>Percentual</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedResult.studentResults.map((student) => (
                      <TableRow key={student.studentId}>
                        <TableCell className="font-medium">{student.studentName}</TableCell>
                        <TableCell>{student.score.toFixed(1)}</TableCell>
                        <TableCell className="text-green-600">{student.correctAnswers}</TableCell>
                        <TableCell className="text-red-600">{student.wrongAnswers}</TableCell>
                        <TableCell className="text-gray-600">{student.blankAnswers}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{student.percentage}%</span>
                            <Progress value={student.percentage} className="w-16" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={student.status === 'passed' ? 'default' : 'destructive'}>
                            {student.status === 'passed' ? 'Aprovado' : 'Reprovado'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="questions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Análise por Questão</CardTitle>
                <CardDescription>
                  Desempenho detalhado de cada questão da avaliação
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedResult.questionAnalysis.map((question, index) => (
                    <div key={question.questionId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">Questão {index + 1}</h4>
                        <Badge variant="outline">
                          {question.difficulty === 'easy' ? 'Fácil' : 
                           question.difficulty === 'medium' ? 'Médio' : 'Difícil'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{question.questionText}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>{question.correctAnswers} acertos</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <span>{question.wrongAnswers} erros</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Minus className="h-4 w-4 text-gray-600" />
                          <span>{question.blankAnswers} em branco</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-blue-600" />
                          <span>{question.successRate.toFixed(1)}% acerto</span>
                        </div>
                      </div>
                      
                      <Progress value={question.successRate} className="mt-3" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="difficulty" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Análise por Dificuldade</CardTitle>
                <CardDescription>
                  Desempenho dos alunos por nível de dificuldade das questões
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <h4 className="font-medium">Questões Fáceis</h4>
                      </div>
                      <div className="text-2xl font-bold">{selectedResult.difficultyAnalysis.easy.total}</div>
                      <p className="text-sm text-muted-foreground">questões</p>
                      <p className="text-sm font-medium text-green-600">
                        {selectedResult.difficultyAnalysis.easy.averageSuccess.toFixed(1)}% de acerto médio
                      </p>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <h4 className="font-medium">Questões Médias</h4>
                      </div>
                      <div className="text-2xl font-bold">{selectedResult.difficultyAnalysis.medium.total}</div>
                      <p className="text-sm text-muted-foreground">questões</p>
                      <p className="text-sm font-medium text-yellow-600">
                        {selectedResult.difficultyAnalysis.medium.averageSuccess.toFixed(1)}% de acerto médio
                      </p>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <h4 className="font-medium">Questões Difíceis</h4>
                      </div>
                      <div className="text-2xl font-bold">{selectedResult.difficultyAnalysis.hard.total}</div>
                      <p className="text-sm text-muted-foreground">questões</p>
                      <p className="text-sm font-medium text-red-600">
                        {selectedResult.difficultyAnalysis.hard.averageSuccess.toFixed(1)}% de acerto médio
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button 
            onClick={() => handleExport(selectedResult.id)}
            disabled={isExporting}
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exportando...' : 'Exportar Resultados'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
              Visualize o desempenho detalhado de todas as avaliações
            </p>
          </div>
        </div>
      </div>

      {/* Lista de Resultados */}
      <div className="space-y-4">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-64" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          results.map((result) => (
            <Card key={result.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">{result.evaluationTitle}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-4 w-4" />
                        {result.subject}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {result.completedStudents}/{result.totalStudents} alunos
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="h-4 w-4" />
                        Média: {result.averageScore.toFixed(1)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Award className="h-4 w-4" />
                        {result.passRate}% aprovação
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Aplicada em: {formatDate(result.appliedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusColor(result.status)}>
                      {getStatusText(result.status)}
                    </Badge>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedResult(result)}
                    >
                      Ver Detalhes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
} 