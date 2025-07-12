import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  Download,
  TrendingUp,
  Users,
  FileText,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Target,
  Award,
  RefreshCw,
  Search,
  School,
  MapPin,
  GraduationCap
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ResultsStats {
  totalEvaluations: number;
  totalStudents: number;
  averageScore: number;
  completedEvaluations: number;
  topPerformanceSubject: string;
}

interface EvaluationSummary {
  id: string;
  title: string;
  subject: string;
  school: string;
  municipality: string;
  grade: string;
  totalStudents: number;
  completedStudents: number;
  averageScore: number;
  averageProficiency: number;
  lastEvaluationDate: string;
  proficiencyLevel: 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado';
  status: 'completed' | 'pending' | 'in_progress';
}

// Dados mockados das avaliações
const mockEvaluationsData: EvaluationSummary[] = [
  {
    id: "avaliacao-1",
    title: "Avaliação de Matemática - 3º Ano",
    subject: "Matemática",
    school: "Escola Teste",
    municipality: "São Paulo",
    grade: "3º Ano",
    totalStudents: 45,
    completedStudents: 42,
    averageScore: 7.2,
    averageProficiency: 365,
    lastEvaluationDate: "2024-01-15T10:00:00Z",
    proficiencyLevel: "Adequado",
    status: "completed"
  },
  {
    id: "avaliacao-2", 
    title: "Avaliação de Português - 6º Ano",
    subject: "Português",
    school: "E.M. Professor João Silva",
    municipality: "Rio de Janeiro",
    grade: "6º Ano",
    totalStudents: 38,
    completedStudents: 35,
    averageScore: 8.1,
    averageProficiency: 425,
    lastEvaluationDate: "2024-01-12T14:30:00Z",
    proficiencyLevel: "Avançado",
    status: "completed"
  },
  {
    id: "avaliacao-3",
    title: "Avaliação de História - 1º Ano EM",
    subject: "História",
    school: "Colégio Santa Maria",
    municipality: "Belo Horizonte",
    grade: "1º Ano EM",
    totalStudents: 52,
    completedStudents: 48,
    averageScore: 6.8,
    averageProficiency: 298,
    lastEvaluationDate: "2024-01-18T09:15:00Z",
    proficiencyLevel: "Básico",
    status: "completed"
  },
  {
    id: "avaliacao-4",
    title: "Avaliação de Ciências - 5º Ano",
    subject: "Ciências",
    school: "Escola Teste",
    municipality: "São Paulo",
    grade: "5º Ano",
    totalStudents: 40,
    completedStudents: 38,
    averageScore: 7.8,
    averageProficiency: 385,
    lastEvaluationDate: "2024-01-20T08:30:00Z",
    proficiencyLevel: "Adequado",
    status: "completed"
  },
  {
    id: "avaliacao-5",
    title: "Avaliação de Geografia - 8º Ano",
    subject: "Geografia",
    school: "E.M. Professor João Silva",
    municipality: "Rio de Janeiro",
    grade: "8º Ano",
    totalStudents: 35,
    completedStudents: 32,
    averageScore: 6.5,
    averageProficiency: 312,
    lastEvaluationDate: "2024-01-22T13:45:00Z",
    proficiencyLevel: "Adequado",
    status: "completed"
  }
];

export default function Results() {
  const { id: evaluationId } = useParams<{ id: string }>();
  const [stats, setStats] = useState<ResultsStats>({
    totalEvaluations: 0,
    totalStudents: 0,
    averageScore: 0,
    completedEvaluations: 0,
    topPerformanceSubject: '',
  });
  const [evaluationsList, setEvaluationsList] = useState<EvaluationSummary[]>([]);
  const [filteredEvaluations, setFilteredEvaluations] = useState<EvaluationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [evaluationId]);

  // Filtrar avaliações baseado nos filtros
  useEffect(() => {
    let filtered = evaluationsList;

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(evaluation => 
        evaluation.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        evaluation.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        evaluation.school.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(evaluation => evaluation.status === statusFilter);
    }

    // Filtro por disciplina
    if (subjectFilter !== 'all') {
      filtered = filtered.filter(evaluation => evaluation.subject === subjectFilter);
    }

    setFilteredEvaluations(filtered);
  }, [evaluationsList, searchTerm, statusFilter, subjectFilter]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([fetchResultsStats(), fetchEvaluationsList()]);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchResultsStats = async () => {
    try {
      // Simular carregamento de dados da API
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const totalStudents = mockEvaluationsData.reduce((sum, evaluation) => sum + evaluation.totalStudents, 0);
      const totalCompletedStudents = mockEvaluationsData.reduce((sum, evaluation) => sum + evaluation.completedStudents, 0);
      const averageScore = mockEvaluationsData.reduce((sum, evaluation) => sum + evaluation.averageScore, 0) / mockEvaluationsData.length;
      const completedEvaluations = mockEvaluationsData.filter(e => e.status === 'completed').length;
      
      // Encontrar a disciplina com melhor desempenho
      const subjectScores = mockEvaluationsData.reduce((acc, evaluation) => {
        if (!acc[evaluation.subject]) {
          acc[evaluation.subject] = { total: 0, count: 0 };
        }
        acc[evaluation.subject].total += evaluation.averageScore;
        acc[evaluation.subject].count += 1;
        return acc;
      }, {} as Record<string, { total: number; count: number }>);
      
      const topSubject = Object.entries(subjectScores).reduce((best, [subject, data]) => {
        const average = data.total / data.count;
        return average > best.average ? { subject, average } : best;
      }, { subject: '', average: 0 });

      setStats({
        totalEvaluations: mockEvaluationsData.length,
        totalStudents: totalCompletedStudents,
        averageScore: averageScore,
        completedEvaluations: completedEvaluations,
        topPerformanceSubject: topSubject.subject,
      });
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
    }
  };

  const fetchEvaluationsList = async () => {
    try {
      // Simular carregamento de dados da API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (evaluationId) {
        // Se há um ID específico, filtrar apenas essa avaliação
        const specificEvaluation = mockEvaluationsData.filter(evaluation => evaluation.id === evaluationId);
        setEvaluationsList(specificEvaluation);
      } else {
        setEvaluationsList(mockEvaluationsData);
      }
    } catch (error) {
      console.error("Erro ao buscar avaliações:", error);
    }
  };

  const getStatusConfig = (status: EvaluationSummary['status']) => {
    const configs = {
      completed: { 
        label: "Concluída", 
        color: "bg-green-100 text-green-800 border-green-300" 
      },
      in_progress: { 
        label: "Em Andamento", 
        color: "bg-blue-100 text-blue-800 border-blue-300" 
      },
      pending: { 
        label: "Pendente", 
        color: "bg-gray-100 text-gray-800 border-gray-300" 
      },
    };
    return configs[status];
  };

  const getProficiencyColor = (proficiency: string) => {
    switch (proficiency) {
      case 'Avançado': return 'bg-green-100 text-green-800 border-green-300';
      case 'Adequado': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Básico': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Abaixo do Básico': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const handleViewResults = (evaluationId: string) => {
    navigate(`/app/avaliacao/${evaluationId}/resultados`);
  };

  const handleExportResults = async (evaluationId?: string) => {
    try {
      const XLSX = await import('xlsx');
      const { saveAs } = await import('file-saver');
      
      const dataToExport = evaluationId 
        ? filteredEvaluations.filter(e => e.id === evaluationId)
        : filteredEvaluations;
      
      if (dataToExport.length === 0) {
        toast({
          title: "Nenhum dado para exportar",
          description: "Não há avaliações para gerar a planilha",
          variant: "destructive",
        });
        return;
      }
      
      // Criar dados da planilha
      const worksheetData = [
        ['Avaliação', 'Disciplina', 'Escola', 'Série', 'Município', 'Participantes', 'Média', 'Proficiência', 'Status'],
        ...dataToExport.map(evaluation => [
          evaluation.title,
          evaluation.subject,
          evaluation.school,
          evaluation.grade,
          evaluation.municipality,
          `${evaluation.completedStudents}/${evaluation.totalStudents}`,
          evaluation.averageScore.toFixed(1),
          evaluation.averageProficiency,
          evaluation.status === 'completed' ? 'Concluída' : evaluation.status === 'in_progress' ? 'Em Andamento' : 'Pendente'
        ])
      ];
      
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Avaliações');
      
      const fileName = `resultados-avaliacoes-${new Date().toISOString().split('T')[0]}.xlsx`;
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      saveAs(blob, fileName);
      
      toast({
        title: "Exportação concluída!",
        description: "Os resultados foram exportados com sucesso.",
      });
    } catch (error) {
      console.error("Erro na exportação:", error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar os resultados",
        variant: "destructive",
      });
    }
  };

  const uniqueSubjects = [...new Set(evaluationsList.map(e => e.subject))];
  const isSpecificEvaluation = Boolean(evaluationId);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {isSpecificEvaluation ? 'Resultado da Avaliação' : 'Resultados das Avaliações'}
          </h1>
          <p className="text-muted-foreground">
            {isSpecificEvaluation 
              ? `Análise detalhada dos resultados da avaliação`
              : 'Acompanhe o desempenho das avaliações e gere relatórios'
            }
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fetchData()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button onClick={() => handleExportResults()}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Tudo
          </Button>
        </div>
      </div>

      {/* Estatísticas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              Total de Avaliações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {isLoading ? <Skeleton className="h-8 w-16" /> : stats.totalEvaluations}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.completedEvaluations} concluídas
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-green-600" />
              Alunos Participantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isLoading ? <Skeleton className="h-8 w-16" /> : stats.totalStudents}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Realizaram avaliações
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-600" />
              Média Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {isLoading ? <Skeleton className="h-8 w-16" /> : `${stats.averageScore.toFixed(1)}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Desempenho médio
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4 text-orange-600" />
              Melhor Disciplina
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold text-orange-600">
              {isLoading ? <Skeleton className="h-6 w-20" /> : stats.topPerformanceSubject}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Maior média de desempenho
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Busca */}
      {!isSpecificEvaluation && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome da avaliação, disciplina ou escola..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="completed">Concluída</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                </SelectContent>
              </Select>
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Disciplina" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Disciplinas</SelectItem>
                  {uniqueSubjects.map(subject => (
                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Avaliações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              {isSpecificEvaluation ? 'Detalhes da Avaliação' : 'Avaliações'}
            </span>
            <Badge variant="outline">
              {filteredEvaluations.length} {filteredEvaluations.length === 1 ? 'avaliação' : 'avaliações'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-20" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredEvaluations.length > 0 ? (
            <div className="space-y-4">
              {filteredEvaluations.map((evaluation) => {
                const statusConfig = getStatusConfig(evaluation.status);
                const participationRate = evaluation.totalStudents > 0 
                  ? (evaluation.completedStudents / evaluation.totalStudents) * 100 
                  : 0;

                return (
                  <div key={evaluation.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      {/* Informações principais */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{evaluation.title}</h3>
                          <Badge className={statusConfig.color}>
                            {statusConfig.label}
                          </Badge>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Badge variant="outline">{evaluation.subject}</Badge>
                            <span>•</span>
                            <span>{evaluation.grade}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <School className="h-4 w-4" />
                            <span>{evaluation.school}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>{evaluation.municipality}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {evaluation.completedStudents}/{evaluation.totalStudents} alunos
                            </span>
                            <Progress value={participationRate} className="w-20 h-2" />
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              Média: {evaluation.averageScore.toFixed(1)}
                            </span>
                            {evaluation.averageScore >= 7 ? (
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-orange-600" />
                            )}
                          </div>
                          
                          <Badge className={getProficiencyColor(evaluation.proficiencyLevel)}>
                            {evaluation.proficiencyLevel}
                          </Badge>
                          
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(evaluation.lastEvaluationDate), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => handleViewResults(evaluation.id)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Resultados
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => handleExportResults(evaluation.id)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Exportar
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhuma avaliação encontrada
              </h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all' || subjectFilter !== 'all'
                  ? 'Tente ajustar os filtros para ver mais resultados.'
                  : 'Ainda não há avaliações com resultados disponíveis.'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 