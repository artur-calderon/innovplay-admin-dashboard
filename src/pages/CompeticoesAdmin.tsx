import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Trophy, 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  Users, 
  Clock, 
  Calendar, 
  Coins, 
  CheckCircle, 
  PlayCircle, 
  PauseCircle,
  BarChart3,
  RefreshCw,
  AlertCircle,
  Copy,
  ArrowLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/authContext';
import { CompetitionsApiService } from '@/services/competitionsApi';
import { CompetitionAdminPanel } from '@/components/competicoes/CompetitionAdminPanel';
import { getErrorMessage, getErrorSuggestion } from '@/utils/errorHandler';
import type { Competition, CompetitionStatus, CompetitionFormData } from '@/types/competition-types';

const CompeticoesAdmin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [disciplinaFilter, setDisciplinaFilter] = useState<string>('all');

  // Estatísticas
  const [stats, setStats] = useState({
    total: 0,
    ativas: 0,
    finalizadas: 0,
    totalParticipantes: 0,
    totalMoedas: 0
  });

  // Carregar competições
  useEffect(() => {
    loadCompetitions();
  }, []);

  const loadCompetitions = async () => {
    try {
      setIsLoading(true);
      const data = await CompetitionsApiService.listAllCompetitions();
      setCompetitions(data);
      
      // Calcular estatísticas
      setStats({
        total: data.length,
        ativas: data.filter(c => c.status === 'aberta' || c.status === 'em_andamento').length,
        finalizadas: data.filter(c => c.status === 'finalizada').length,
        totalParticipantes: data.reduce((sum, c) => sum + (c.participantes_atual || 0), 0),
        totalMoedas: data.reduce((sum, c) => sum + c.recompensas.ouro + c.recompensas.prata + c.recompensas.bronze + (c.recompensas.participacao || 0), 0)
      });
    } catch (error: unknown) {
      // ✅ MELHORADO: Tratar erro 500 como "sem dados" para endpoints de listagem
      const axiosError = error as { response?: { status?: number; data?: { message?: string } } };
      const is500Error = axiosError.response?.status === 500;
      
      if (is500Error) {
        const errorMessage = axiosError.response?.data?.message || '';
        const isEmptyError = errorMessage.toLowerCase().includes('nenhum') || 
                           errorMessage.toLowerCase().includes('não encontrado') ||
                           errorMessage.toLowerCase().includes('empty') ||
                           errorMessage.toLowerCase().includes('no data') ||
                           errorMessage === '';
        
        if (isEmptyError) {
          // Não há competições no sistema ainda - não é um erro real
          console.info('Nenhuma competição encontrada no sistema.');
          setCompetitions([]);
          setStats({
            total: 0,
            ativas: 0,
            finalizadas: 0,
            totalParticipantes: 0,
            totalMoedas: 0
          });
          // Não mostrar toast de erro quando simplesmente não há dados
          setIsLoading(false);
          return;
        }
      }
      
      // Para erros reais, mostrar mensagem de erro
      console.error('Erro ao carregar competições:', error);
      setCompetitions([]);
      setStats({
        total: 0,
        ativas: 0,
        finalizadas: 0,
        totalParticipantes: 0,
        totalMoedas: 0
      });
      
      const errorMessage = getErrorMessage(error, "Não foi possível carregar as competições. Tente novamente.");
      const suggestion = getErrorSuggestion(error);
      
      toast({
        title: "Erro ao carregar",
        description: suggestion ? `${errorMessage} ${suggestion}` : errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar competições
  const filteredCompetitions = competitions.filter(competition => {
    const matchesSearch = competition.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (competition.disciplina_nome || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || competition.status === statusFilter;
    const matchesDisciplina = disciplinaFilter === 'all' || competition.disciplina_id === disciplinaFilter;
    
    return matchesSearch && matchesStatus && matchesDisciplina;
  });

  // Handlers
  const handleCreateSuccess = (competition: Competition) => {
    setShowForm(false);
    setEditingCompetition(null);
    setViewMode('list');
    loadCompetitions();
    toast({
      title: "Competição criada!",
      description: `A competição "${competition.titulo}" foi criada com sucesso.`,
    });
  };

  const handleEditCompetition = (competition: Competition) => {
    setEditingCompetition(competition);
    setShowForm(true);
    setViewMode('form');
    // Scroll para o formulário
    setTimeout(() => {
      document.getElementById('competition-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleNewCompetition = () => {
    setEditingCompetition(null);
    setShowForm(true);
    setViewMode('form');
    // Scroll para o formulário
    setTimeout(() => {
      document.getElementById('competition-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingCompetition(null);
    setViewMode('list');
  };

  const handleDeleteCompetition = async (competition: Competition) => {
    if (!confirm(`Tem certeza que deseja excluir a competição "${competition.titulo}"?`)) {
      return;
    }

    try {
      await CompetitionsApiService.deleteCompetition(competition.id);
      toast({
        title: "Competição excluída",
        description: "A competição foi excluída com sucesso.",
      });
      loadCompetitions();
    } catch (error) {
      console.error('Erro ao excluir competição:', error);
      
      const errorMessage = getErrorMessage(error, "Não foi possível excluir a competição.");
      const suggestion = getErrorSuggestion(error);
      
      toast({
        title: "Erro ao excluir",
        description: suggestion ? `${errorMessage} ${suggestion}` : errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const handleFinalizeCompetition = async (competition: Competition) => {
    if (!confirm(`Deseja finalizar a competição "${competition.titulo}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      await CompetitionsApiService.finalizeCompetition(competition.id);
      toast({
        title: "Competição finalizada",
        description: "A competição foi finalizada e os prêmios serão distribuídos.",
      });
      loadCompetitions();
    } catch (error) {
      console.error('Erro ao finalizar competição:', error);
      
      const errorMessage = getErrorMessage(error, "Não foi possível finalizar a competição.");
      const suggestion = getErrorSuggestion(error);
      
      toast({
        title: "Erro ao finalizar",
        description: suggestion ? `${errorMessage} ${suggestion}` : errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const handleViewResults = (competitionId: string) => {
    navigate(`/app/competicoes/${competitionId}/resultados`);
  };

  const handleDuplicateCompetition = async (competition: Competition) => {
    try {
      // Criar uma cópia da competição com novo título
      const duplicatedData: CompetitionFormData = {
        titulo: `${competition.titulo} (Cópia)`,
        disciplina_id: competition.disciplina_id,
        dataInicio: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 dias
        dataFim: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // +14 dias
        duracao: competition.duracao,
        maxParticipantes: competition.max_participantes,
        recompensas: competition.recompensas,
        turmas: competition.turmas,
        questoes: competition.questoes,
        modo_selecao: competition.questoes.length > 0 ? 'manual' : 'automatico',
        quantidade_questoes: competition.total_questoes || competition.questoes.length,
        dificuldades: competition.dificuldade ? [competition.dificuldade] : ['Abaixo do Básico', 'Básico', 'Adequado', 'Avançado'],
        descricao: competition.descricao,
        instrucoes: competition.instrucoes,
        icone: competition.icone,
        cor: competition.cor
      };

      const newCompetition = await CompetitionsApiService.createCompetition(duplicatedData);
      toast({
        title: "Competição duplicada!",
        description: `A competição "${newCompetition.titulo}" foi criada com sucesso.`,
      });
      loadCompetitions();
    } catch (error) {
      console.error('Erro ao duplicar competição:', error);
      
      const errorMessage = getErrorMessage(error, "Não foi possível duplicar a competição.");
      const suggestion = getErrorSuggestion(error);
      
      toast({
        title: "Erro ao duplicar",
        description: suggestion ? `${errorMessage} ${suggestion}` : errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  // Formatar tempo restante
  const formatTimeRemaining = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date.getTime() - now.getTime();

    if (diff <= 0) return 'Encerrado';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }

    return `${hours}h ${minutes}m`;
  };

  // Obter configuração do status
  const getStatusConfig = (status: CompetitionStatus) => {
    const configs: Record<CompetitionStatus, { label: string; color: string; icon: React.ReactNode }> = {
      agendada: {
        label: 'Agendada',
        color: 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-400',
        icon: <Calendar className="w-3 h-3" />
      },
      aberta: {
        label: 'Aberta',
        color: 'bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400',
        icon: <PlayCircle className="w-3 h-3" />
      },
      em_andamento: {
        label: 'Em Andamento',
        color: 'bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400',
        icon: <Clock className="w-3 h-3" />
      },
      finalizada: {
        label: 'Finalizada',
        color: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400',
        icon: <CheckCircle className="w-3 h-3" />
      }
    };

    return configs[status] || configs.agendada;
  };

  // Extrair disciplinas únicas
  const uniqueDisciplinas = [...new Set(competitions.map(c => c.disciplina_id))];

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl space-y-6">
      {/* Formulário de Criação/Edição - Integrado na página */}
      {viewMode === 'form' && (
        <div id="competition-form" className="space-y-6">
          <Card className="border-2 border-blue-200 dark:border-blue-800">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-950/50 border-b">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-blue-600" />
                {editingCompetition ? 'Editar Competição' : 'Nova Competição'}
              </CardTitle>
              <CardDescription>
                {editingCompetition 
                  ? 'Atualize as informações da competição abaixo'
                  : 'Preencha os dados abaixo para criar uma nova competição'}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <CompetitionAdminPanel
                editingCompetition={editingCompetition || undefined}
                onSuccess={handleCreateSuccess}
                onCancel={handleCancelForm}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lista de Competições */}
      {viewMode === 'list' && (
        <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Trophy className="w-8 h-8 text-blue-600" />
            Gerenciar Competições
          </h1>
          <p className="text-muted-foreground">Crie e gerencie competições semanais</p>
        </div>
        <div className="flex items-center gap-2">
          {viewMode === 'form' && (
            <Button variant="outline" onClick={handleCancelForm}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Lista
            </Button>
          )}
          <Button variant="outline" onClick={loadCompetitions} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          {viewMode === 'list' && (
            <Button onClick={handleNewCompetition}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Competição
            </Button>
          )}
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 dark:from-blue-950/30 to-blue-100 dark:to-blue-950/40 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</div>
            <div className="text-xs text-blue-700 dark:text-blue-400">Total</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 dark:from-green-950/30 to-green-100 dark:to-green-950/40 border-green-200 dark:border-green-800">
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <PlayCircle className="w-5 h-5 text-white" />
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.ativas}</div>
            <div className="text-xs text-green-700 dark:text-green-400">Ativas</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-50 dark:from-gray-800/30 to-gray-100 dark:to-gray-800/40 border-gray-200 dark:border-gray-700">
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.finalizadas}</div>
            <div className="text-xs text-gray-700 dark:text-gray-400">Finalizadas</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 dark:from-purple-950/30 to-purple-100 dark:to-purple-950/40 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.totalParticipantes}</div>
            <div className="text-xs text-purple-700 dark:text-purple-400">Participantes</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 dark:from-yellow-950/30 to-yellow-100 dark:to-yellow-950/40 border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <Coins className="w-5 h-5 text-white" />
            </div>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.totalMoedas}</div>
            <div className="text-xs text-yellow-700 dark:text-yellow-400">Moedas em Prêmios</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative md:col-span-2">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Buscar competição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="agendada">Agendada</SelectItem>
                <SelectItem value="aberta">Aberta</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="finalizada">Finalizada</SelectItem>
              </SelectContent>
            </Select>

            <Select value={disciplinaFilter} onValueChange={setDisciplinaFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Disciplina" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Disciplinas</SelectItem>
                {uniqueDisciplinas.map(disciplina => (
                  <SelectItem key={disciplina} value={disciplina}>
                    {disciplina}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Competições */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredCompetitions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
              <Trophy className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">Nenhuma competição encontrada</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm || statusFilter !== 'all' || disciplinaFilter !== 'all'
                ? 'Tente ajustar os filtros de busca.'
                : 'Crie sua primeira competição para começar!'}
            </p>
            {!searchTerm && statusFilter === 'all' && disciplinaFilter === 'all' && (
              <Button onClick={handleNewCompetition}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Competição
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompetitions.map((competition) => {
            const statusConfig = getStatusConfig(competition.status);
            
            return (
              <Card key={competition.id} className="hover:shadow-lg transition-all duration-300 border-2">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 ${competition.cor || 'bg-blue-500'} rounded-full flex items-center justify-center text-2xl`}>
                        {competition.icone || '🏆'}
                      </div>
                      <div>
                        <CardTitle className="text-lg leading-tight">{competition.titulo}</CardTitle>
                        <Badge variant="outline" className="text-xs mt-1">
                          {competition.disciplina_nome || competition.disciplina_id}
                        </Badge>
                      </div>
                    </div>
                    <Badge className={statusConfig.color}>
                      <span className="flex items-center gap-1">
                        {statusConfig.icon}
                        {statusConfig.label}
                      </span>
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span>{competition.participantes_atual || 0}/{competition.max_participantes}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>{competition.duracao}min</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>{new Date(competition.data_inicio).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-yellow-500" />
                      <span className="text-yellow-600 font-medium">{competition.recompensas.ouro}</span>
                    </div>
                  </div>

                  {/* Tempo restante */}
                  {competition.status !== 'finalizada' && (
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-2 text-center">
                      <span className="text-xs text-blue-700 dark:text-blue-400">
                        {competition.status === 'agendada' ? 'Inicia em: ' : 'Termina em: '}
                        <strong>
                          {formatTimeRemaining(
                            competition.status === 'agendada' 
                              ? competition.data_inicio 
                              : competition.data_fim
                          )}
                        </strong>
                      </span>
                    </div>
                  )}

                  {/* Ações */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewResults(competition.id)}
                    >
                      <BarChart3 className="w-4 h-4 mr-1" />
                      Resultados
                    </Button>
                    
                    {competition.status !== 'finalizada' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditCompetition(competition)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Concluída
                      </Button>
                    )}

                    {/* Botão de Duplicar */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="col-span-2"
                      onClick={() => handleDuplicateCompetition(competition)}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Duplicar Competição
                    </Button>

                    {(competition.status === 'aberta' || competition.status === 'em_andamento') && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="col-span-2"
                        onClick={() => handleFinalizeCompetition(competition)}
                      >
                        <PauseCircle className="w-4 h-4 mr-1" />
                        Finalizar Competição
                      </Button>
                    )}

                    {competition.status === 'agendada' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="col-span-2"
                        onClick={() => handleDeleteCompetition(competition)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Excluir
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default CompeticoesAdmin;

