import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Eye, Pencil, Trash2, TrendingUp, Users, FileText, Clock, Calendar, BarChart3, ClipboardList, Download, ExternalLink, PlayCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import EvaluationForm from "@/components/evaluations/EvaluationForm";
import { ReadyEvaluations } from "@/components/evaluations/ReadyEvaluations";
import { QuestionBank } from "@/components/evaluations/QuestionBank";
import EvaluationResults from "@/components/evaluations/EvaluationResults";
import EvaluationReport from "@/components/evaluations/EvaluationReport";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/authContext";
import StudentEvaluations from "@/components/evaluations/StudentEvaluations";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mockApi } from "@/lib/mockData";

interface EvaluationStats {
  total: number;
  thisMonth: number;
  totalQuestions: number;
  averageQuestions: number;
  virtualEvaluations: number;
  physicalEvaluations: number;
  completedEvaluations: number;
  pendingResults: number;
}

export default function Evaluations() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("ready");
  const [showResults, setShowResults] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [stats, setStats] = useState<EvaluationStats>({
    total: 0,
    thisMonth: 0,
    totalQuestions: 0,
    averageQuestions: 0,
    virtualEvaluations: 0,
    physicalEvaluations: 0,
    completedEvaluations: 0,
    pendingResults: 0
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user.role !== "aluno") {
      fetchStats();
    }
  }, [user.role]);

  const fetchStats = async () => {
    try {
      setIsLoadingStats(true);
      
      // Buscar estatísticas das avaliações (API real)
      const [evaluationsRes, questionsRes] = await Promise.all([
        api.get("/test"),
        api.get("/questions/")
      ]);

      const evaluations = evaluationsRes.data || [];
      const questions = questionsRes.data || [];

      // Buscar dados dos resultados (mock)
      const resultsData = await mockApi.getEvaluationResults();
      const completedResults = resultsData.filter(result => result.status === 'completed');
      const pendingResults = resultsData.filter(result => result.status === 'pending');

      // Calcular estatísticas
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const thisMonthEvaluations = evaluations.filter((evaluation: any) => {
        const evalDate = new Date(evaluation.createdAt);
        return evalDate.getMonth() === currentMonth && evalDate.getFullYear() === currentYear;
      });

      const totalQuestions = evaluations.reduce((sum: number, evaluation: any) => {
        return sum + (evaluation.questions?.length || 0);
      }, 0);

      // Estatísticas por tipo (assumindo que temos campo evaluation_mode no futuro)
      const virtualEvaluations = evaluations.filter((evaluation: any) => evaluation.evaluation_mode === 'virtual').length;
      const physicalEvaluations = evaluations.filter((evaluation: any) => evaluation.evaluation_mode === 'physical').length;

      setStats({
        total: evaluations.length,
        thisMonth: thisMonthEvaluations.length,
        totalQuestions: questions.length,
        averageQuestions: evaluations.length > 0 ? Math.round(totalQuestions / evaluations.length) : 0,
        virtualEvaluations: virtualEvaluations || Math.floor(evaluations.length * 0.7), // Fallback
        physicalEvaluations: physicalEvaluations || Math.ceil(evaluations.length * 0.3), // Fallback
        completedEvaluations: completedResults.length, // Usando dados mock
        pendingResults: pendingResults.length // Usando dados mock
      });

    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
      // Se houver erro na API, usar apenas dados mock
      try {
        const resultsData = await mockApi.getEvaluationResults();
        const completedResults = resultsData.filter(result => result.status === 'completed');
        const pendingResults = resultsData.filter(result => result.status === 'pending');
        
        setStats({
          total: resultsData.length,
          thisMonth: 1,
          totalQuestions: 50,
          averageQuestions: 15,
          virtualEvaluations: Math.floor(resultsData.length * 0.7),
          physicalEvaluations: Math.ceil(resultsData.length * 0.3),
          completedEvaluations: completedResults.length,
          pendingResults: pendingResults.length
        });
      } catch (mockError) {
        console.error("Erro ao buscar dados mock:", mockError);
      }
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Handlers for results actions
  const handleViewResults = () => {
    setShowResults(true);
  };

  const handleCorrectNow = () => {
    toast({
      title: "Correção iniciada",
      description: "Redirecionando para a tela de correção...",
    });
    navigate("/app/avaliacoes/correcao");
  };

  const handleGenerateReport = () => {
    setShowReport(true);
  };

  const handleExportAll = async () => {
    try {
      const allResults = await mockApi.getEvaluationResults();
      const allIds = allResults.map(result => result.id);
      const response = await mockApi.exportResults(allIds);
      
      if (response.success) {
        toast({
          title: "Exportação concluída!",
          description: "Todos os resultados foram exportados com sucesso.",
        });
      }
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar os resultados",
        variant: "destructive",
      });
    }
  };

  // Conditionally render teacher view or student view based on user role
  if (user.role === "aluno") {
    return <StudentEvaluations />;
  }

  // If showing results, render the EvaluationResults component
  if (showResults) {
    return <EvaluationResults onBack={() => setShowResults(false)} />;
  }

  // If showing report, render the EvaluationReport component
  if (showReport) {
    return <EvaluationReport onBack={() => setShowReport(false)} />;
  }

  // Default view for teachers and admins
  return (
    <div className="container mx-auto px-2 md:px-4 py-4 md:py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Central de Avaliações</h1>
          <p className="text-muted-foreground">
            Gerencie avaliações virtuais, físicas e acompanhe resultados
          </p>
        </div>
      </div>

      {/* Estatísticas Melhoradas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Avaliações
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingStats ? <Skeleton className="h-8 w-16" /> : stats.total}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.virtualEvaluations} virtuais • {stats.physicalEvaluations} físicas
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Este Mês
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingStats ? <Skeleton className="h-8 w-16" /> : stats.thisMonth}
            </div>
            <p className="text-xs text-muted-foreground">
              Avaliações criadas
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Resultados
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingStats ? <Skeleton className="h-8 w-16" /> : stats.completedEvaluations}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingResults} pendentes de correção
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Banco de Questões
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingStats ? <Skeleton className="h-8 w-16" /> : stats.totalQuestions}
            </div>
            <p className="text-xs text-muted-foreground">
              Média: {stats.averageQuestions} por avaliação
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Expandidas */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 gap-2">
          <TabsTrigger value="ready" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Minhas Avaliações
          </TabsTrigger>
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Criar Nova
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Resultados
          </TabsTrigger>
          <TabsTrigger value="physical" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Cartão Resposta
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ready" className="space-y-4">
          <ReadyEvaluations />
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Criar Avaliação Virtual */}
            <Card className="border-blue-200 bg-blue-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700">
                  <Calendar className="h-5 w-5" />
                  Avaliação Virtual
                </CardTitle>
                <CardDescription>
                  Crie avaliações online com agendamento automático e correção instantânea
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/app/criar-avaliacao?mode=virtual">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Avaliação Virtual
                  </Button>
                </Link>
              </CardContent>
              <CardFooter>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    ✓ Agendamento automático
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ✓ Timer e controle de tempo
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ✓ Correção instantânea
                  </p>
                </div>
              </CardFooter>
            </Card>

            {/* Criar Avaliação Física */}
            <Card className="border-green-200 bg-green-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <ClipboardList className="h-5 w-5" />
                  Avaliação Física
                </CardTitle>
                <CardDescription>
                  Crie avaliações impressas com sistema de cartão resposta digital
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/app/criar-avaliacao?mode=physical">
                  <Button className="w-full bg-green-600 hover:bg-green-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Avaliação Física
                  </Button>
                </Link>
              </CardContent>
              <CardFooter>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    ✓ Gabarito digital
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ✓ Aplicação em sala
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ✓ Correção por admin
                  </p>
                </div>
              </CardFooter>
            </Card>
          </div>

          {/* Guia Rápido Atualizado */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Tipos de Avaliação
              </CardTitle>
              <CardDescription>
                Escolha o melhor formato para sua necessidade
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3 p-4 border border-blue-200 rounded-lg bg-blue-50/20">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <h3 className="font-medium text-blue-700">Avaliação Virtual</h3>
                  </div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Ideal para avaliações remotas</li>
                    <li>• Agendamento com liberação automática</li>
                    <li>• Timer e controle de tempo</li>
                    <li>• Correção e resultados instantâneos</li>
                    <li>• Anti-trapaça básico</li>
                  </ul>
                </div>
                
                <div className="space-y-3 p-4 border border-green-200 rounded-lg bg-green-50/20">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-green-600" />
                    <h3 className="font-medium text-green-700">Avaliação Física</h3>
                  </div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Ideal para provas presenciais</li>
                    <li>• Impressão da avaliação</li>
                    <li>• Aplicação em sala de aula</li>
                    <li>• Cartão resposta digital</li>
                    <li>• Correção manual pelo professor</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <div className="space-y-4">
            {/* Header de Resultados */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Resultados das Avaliações</h2>
                <p className="text-sm text-muted-foreground">
                  Acompanhe o desempenho e gere relatórios
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportAll}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Tudo
                </Button>
              </div>
            </div>

            {/* Cards de Resultados */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Avaliações Concluídas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.completedEvaluations}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Com resultados disponíveis
                  </p>
                  <Button variant="outline" size="sm" className="w-full mt-3" onClick={handleViewResults}>
                    Ver Resultados
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Correções Pendentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{stats.pendingResults}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Aguardando correção
                  </p>
                  <Button variant="outline" size="sm" className="w-full mt-3" onClick={handleCorrectNow}>
                    Corrigir Agora
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Relatórios</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.completedEvaluations + stats.pendingResults}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Relatórios disponíveis
                  </p>
                  <Button variant="outline" size="sm" className="w-full mt-3" onClick={handleGenerateReport}>
                    Gerar Relatório
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Placeholder para lista de resultados */}
            <Card>
              <CardHeader>
                <CardTitle>Resultados Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p>Sistema de resultados em desenvolvimento</p>
                  <p className="text-sm">Em breve você poderá visualizar estatísticas detalhadas</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="physical" className="space-y-4">
          <div className="space-y-4">
            {/* Header de Cartão Resposta */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Cartão Resposta Digital</h2>
                <p className="text-sm text-muted-foreground">
                  Preencha gabaritos de avaliações físicas
                </p>
              </div>
            </div>

            {/* Seletor de Avaliação Física */}
            <Card>
              <CardHeader>
                <CardTitle>Selecionar Avaliação Física</CardTitle>
                <CardDescription>
                  Escolha uma avaliação para preencher os cartões resposta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Avaliação:</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma avaliação física" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="eval1">Prova de Matemática - 5º Ano</SelectItem>
                        <SelectItem value="eval2">Avaliação de Português - 3º Ano</SelectItem>
                        <SelectItem value="eval3">Simulado SAEB - Ensino Médio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Escola:</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a escola" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="school1">E.M. João Silva</SelectItem>
                        <SelectItem value="school2">E.E. Maria Santos</SelectItem>
                        <SelectItem value="school3">Colégio Dom Pedro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Button className="w-full">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Abrir Cartão Resposta
                </Button>
              </CardContent>
            </Card>

            {/* Instruções */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Como Usar o Cartão Resposta
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                        1
                      </div>
                      <div>
                        <p className="text-sm font-medium">Selecione a avaliação</p>
                        <p className="text-xs text-muted-foreground">Escolha a prova física aplicada</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-medium">
                        2
                      </div>
                      <div>
                        <p className="text-sm font-medium">Selecione a escola</p>
                        <p className="text-xs text-muted-foreground">Escola onde a prova foi aplicada</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-medium">
                        3
                      </div>
                      <div>
                        <p className="text-sm font-medium">Preencha os gabaritos</p>
                        <p className="text-xs text-muted-foreground">Marque as respostas de cada aluno</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-medium">
                        4
                      </div>
                      <div>
                        <p className="text-sm font-medium">Resultados automáticos</p>
                        <p className="text-xs text-muted-foreground">Notas calculadas automaticamente</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
