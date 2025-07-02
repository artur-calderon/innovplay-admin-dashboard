import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Play, CheckCircle, AlertCircle, Book, Users, Timer, CalendarDays, School } from "lucide-react";
import { format, isAfter, isBefore, addMinutes, parseISO, differenceInMinutes, differenceInHours, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/authContext";

interface ScheduledEvaluation {
  id: string;
  title: string;
  description?: string;
  subject: {
  id: string;
  name: string;
  };
  time_limit: string; // Data/hora de início no formato ISO
  end_time?: string; // Data/hora de término no formato ISO
  duration: number; // Duração em minutos
  evaluation_mode?: 'virtual' | 'physical';
  status?: 'upcoming' | 'available' | 'in_progress' | 'completed' | 'expired';
  score?: number;
  questions: any[];
  school: {
  id: string;
  name: string;
  };
  grade: {
  id: string;
  name: string;
  };
  course: {
  id: string;
  name: string;
  };
  createdBy: {
  id: string;
  name: string;
  };
  createdAt: string;
  // Campos calculados localmente
  calculatedStatus?: 'upcoming' | 'available' | 'expired';
  timeToStart?: string;
  timeToEnd?: string;
}

export default function StudentEvaluations() {
  const [evaluations, setEvaluations] = useState<ScheduledEvaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [hasError, setHasError] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchStudentEvaluations();
    
    // Atualizar o tempo atual a cada 30 segundos para controle preciso
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      updateEvaluationStatuses();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchStudentEvaluations = async () => {
    try {
      setIsLoading(true);
      
      if (!user?.id) {
        console.error("Usuário não identificado");
        setEvaluations([]);
        setHasError(true);
        return;
      }
      
      // Buscar avaliações do aluno logado
      const response = await api.get(`/test/student/${user.id}`);
      const rawEvaluations = response.data || [];
      
      // Log apenas se houver erro de desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        console.log(`📊 Recebidas ${rawEvaluations.length} avaliações do backend`);
      }
      
      // Processar e calcular status das avaliações
      const processedEvaluations = rawEvaluations.map((evaluation: any) => 
        processEvaluation(evaluation)
      );
      
      setEvaluations(processedEvaluations);
      setHasError(false);
      setLastFetchTime(new Date());
    } catch (error: any) {
      console.error("Erro ao buscar avaliações:", error);
      
      // Verificar se é erro 404 (nenhuma avaliação encontrada)
      if (error?.response?.status === 404) {
        setEvaluations([]);
        setHasError(false); // 404 não é erro real
        setLastFetchTime(new Date());
      } else if (error?.response?.status === 500) {
        setHasError(true);
        setEvaluations([]);
        
        toast({
          title: "Erro no servidor",
          description: "Problema temporário no servidor. Tente novamente em alguns minutos.",
          variant: "destructive",
        });
      } else {
        setHasError(true);
        if (evaluations.length === 0) {
          setEvaluations([]);
        }
        
        const errorMessage = error?.response?.data?.error || error?.response?.data?.details || error?.message;
        
        toast({
          title: "Erro ao carregar avaliações",
          description: errorMessage || 'Não foi possível carregar suas avaliações.',
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const processEvaluation = (evaluation: any): ScheduledEvaluation => {
    const startDateTime = parseISO(evaluation.time_limit);
    // Se end_time estiver disponível, usar ele; senão, calcular baseado na duração
    const endDateTime = evaluation.end_time 
      ? parseISO(evaluation.end_time)
      : addMinutes(startDateTime, evaluation.duration);
    
    // Usar end_time do backend se disponível, senão calcular pela duração
    
    const now = new Date();
    
    let calculatedStatus: 'upcoming' | 'available' | 'expired' = 'upcoming';
    let timeToStart = '';
    let timeToEnd = '';
    
    if (isAfter(now, endDateTime)) {
      calculatedStatus = 'expired';
    } else if (isAfter(now, startDateTime)) {
      calculatedStatus = 'available';
      timeToEnd = formatTimeRemaining(differenceInMinutes(endDateTime, now));
    } else {
      calculatedStatus = 'upcoming';
      timeToStart = formatTimeRemaining(differenceInMinutes(startDateTime, now));
    }
    
    return {
      ...evaluation,
      calculatedStatus,
      timeToStart,
      timeToEnd,
      evaluation_mode: evaluation.evaluation_mode || 'virtual'
    };
  };

  const updateEvaluationStatuses = () => {
    setEvaluations(prevEvaluations => 
      prevEvaluations.map(evaluation => processEvaluation(evaluation))
    );
  };

  const formatTimeRemaining = (minutes: number): string => {
    if (minutes < 0) return 'Expirado';
    
    const days = Math.floor(minutes / (24 * 60));
    const hours = Math.floor((minutes % (24 * 60)) / 60);
    const mins = minutes % 60;
    
    if (days > 0) {
      return `${days}d ${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h ${mins}m`;
    } else {
      return `${mins}m`;
    }
  };

  const handleStartEvaluation = async (evaluationId: string) => {
    try {
      // Verificar se a avaliação pode ser iniciada
      const evaluation = evaluations.find(e => e.id === evaluationId);
      if (!evaluation || evaluation.calculatedStatus !== 'available') {
        toast({
          title: "Avaliação não disponível",
          description: "Esta avaliação ainda não pode ser iniciada.",
          variant: "destructive",
        });
        return;
      }

      // Iniciar a avaliação (endpoint pode não existir ainda)
      try {
        await api.post(`/test/${evaluationId}/start`);
      } catch (apiError) {
        console.log("Endpoint de iniciar avaliação não implementado ainda");
      }
      
      toast({
        title: "Avaliação iniciada!",
        description: "Boa sorte na sua avaliação!",
      });
      
      // Navegar para a página de realizar avaliação (a ser implementada)
      navigate(`/aluno/avaliacao/${evaluationId}/realizar`);
    } catch (error) {
      toast({
        title: "Erro ao iniciar avaliação",
        description: "Não foi possível iniciar a avaliação. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const getStatusInfo = (evaluation: ScheduledEvaluation) => {
    switch (evaluation.calculatedStatus) {
      case 'available':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: Play,
          label: 'Disponível',
          description: evaluation.timeToEnd ? `Termina em ${evaluation.timeToEnd}` : 'Clique para iniciar'
        };
      case 'expired':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: AlertCircle,
          label: 'Expirada',
          description: 'Prazo encerrado'
        };
      default: {
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: Calendar,
          label: 'Agendada',
          description: evaluation.timeToStart ? `Inicia em ${evaluation.timeToStart}` : 'Aguardando horário'
        };
      }
    }
  };

  const getEvaluationsByStatus = () => {
    const upcoming = evaluations.filter(e => e.calculatedStatus === 'upcoming');
    const available = evaluations.filter(e => e.calculatedStatus === 'available');
    const expired = evaluations.filter(e => e.calculatedStatus === 'expired');

    return { upcoming, available, expired };
  };

  const { upcoming, available, expired } = getEvaluationsByStatus();

  const EvaluationCard = ({ evaluation }: { evaluation: ScheduledEvaluation }) => {
    const statusInfo = getStatusInfo(evaluation);
    const StatusIcon = statusInfo.icon;
    const startDateTime = parseISO(evaluation.time_limit);
    const endDateTime = evaluation.end_time 
      ? parseISO(evaluation.end_time)
      : addMinutes(startDateTime, evaluation.duration);

    return (
      <Card className="transition-all duration-200 hover:shadow-md">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold line-clamp-1">
                {evaluation.title}
              </CardTitle>
              <CardDescription className="mt-1 line-clamp-2">
                {evaluation.description || "Avaliação agendada"}
              </CardDescription>
            </div>
            <Badge className={`ml-3 ${statusInfo.color} flex items-center gap-1`}>
              <StatusIcon className="h-3 w-3" />
              {statusInfo.label}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Informações da avaliação */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Book className="h-4 w-4 text-muted-foreground" />
              <span>{evaluation.subject?.name || 'Disciplina'}</span>
            </div>
            <div className="flex items-center gap-2">
              <School className="h-4 w-4 text-muted-foreground" />
              <span>{evaluation.school?.name || 'Escola'}</span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span>{format(startDateTime, "dd/MM/yyyy", { locale: ptBR })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {format(startDateTime, "HH:mm", { locale: ptBR })} - {format(endDateTime, "HH:mm", { locale: ptBR })}
              </span>
            </div>
          </div>

          {/* Informações adicionais */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{evaluation.questions?.length || 0} questões</span>
            <span>{evaluation.duration} min</span>
            <span className="capitalize">{evaluation.evaluation_mode || 'virtual'}</span>
            <span>{evaluation.grade?.name}</span>
            {evaluation.createdBy?.name && <span>Prof. {evaluation.createdBy.name}</span>}
          </div>

          {/* Status e countdown */}
          {evaluation.calculatedStatus === 'upcoming' && evaluation.timeToStart && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-blue-800">
                <Timer className="h-4 w-4" />
                <span className="font-medium">Inicia em: {evaluation.timeToStart}</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                A avaliação será liberada automaticamente no horário agendado
              </p>
            </div>
          )}

          {evaluation.calculatedStatus === 'available' && evaluation.timeToEnd && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-800">
                <Timer className="h-4 w-4" />
                <span className="font-medium">Tempo restante: {evaluation.timeToEnd}</span>
              </div>
              <p className="text-xs text-green-600 mt-1">
                Você pode iniciar a avaliação agora
              </p>
            </div>
          )}

          {/* Ações */}
          <div className="flex justify-between items-center pt-2 border-t">
            <div className="text-xs text-muted-foreground">
              {statusInfo.description}
            </div>
            
            <div className="flex gap-2">
              {evaluation.calculatedStatus === 'available' && evaluation.evaluation_mode === 'virtual' && (
                <Button 
                  size="sm"
                  onClick={() => handleStartEvaluation(evaluation.id)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Play className="h-4 w-4 mr-1" />
                  Fazer Avaliação
                </Button>
              )}
              
              {evaluation.evaluation_mode === 'physical' && (
                <Badge variant="outline" className="text-xs">
                  📝 Prova Presencial
                </Badge>
              )}
              
              {evaluation.calculatedStatus === 'upcoming' && (
                <Badge variant="secondary" className="text-xs">
                  ⏰ Aguardando
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        
        {/* Skeleton para cards de resumo */}
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <div>
                    <Skeleton className="h-8 w-8 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Skeleton para lista de avaliações */}
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-8 w-20 ml-auto" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
      <div>
          <h2 className="text-3xl font-bold tracking-tight">📚 Minhas Avaliações</h2>
        <p className="text-muted-foreground">
            Acompanhe suas avaliações agendadas e realize-as no período disponível
          </p>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-xs text-muted-foreground">
              Atualizado automaticamente • Última atualização: {format(currentTime, "HH:mm:ss")}
            </p>
            {hasError && (
              <Badge variant="destructive" className="text-xs">
                <AlertCircle className="h-3 w-3 mr-1" />
                Erro de conexão
              </Badge>
            )}
            {lastFetchTime && !hasError && (
              <Badge variant="secondary" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Sincronizado
              </Badge>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchStudentEvaluations}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <Timer className="h-4 w-4 animate-spin" />
          ) : (
            <Calendar className="h-4 w-4" />
          )}
          {isLoading ? "Atualizando..." : "Atualizar"}
        </Button>
      </div>

      {/* Resumo rápido */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-600">{available.length}</div>
                <p className="text-xs text-muted-foreground">Disponíveis Agora</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-blue-600">{upcoming.length}</div>
                <p className="text-xs text-muted-foreground">Agendadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <div>
                <div className="text-2xl font-bold text-red-600">{expired.length}</div>
                <p className="text-xs text-muted-foreground">Expiradas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de avaliações */}
      <Tabs defaultValue="available" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="available" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Disponíveis ({available.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Agendadas ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="expired" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Expiradas ({expired.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-4">
          {available.length > 0 ? (
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-green-800 mb-2">
                  <Play className="h-5 w-5" />
                  <span className="font-semibold">Avaliações Liberadas</span>
                </div>
                <p className="text-sm text-green-700">
                  Você tem {available.length} avaliações disponíveis para realizar agora.
                  Clique em "Fazer Avaliação" para iniciar.
                </p>
              </div>
              {available.map((evaluation) => (
                <EvaluationCard key={evaluation.id} evaluation={evaluation} />
              ))}
            </>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <Play className="h-16 w-16 mx-auto mb-4 text-green-200" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhuma avaliação disponível
                </h3>
                <p className="text-muted-foreground mb-4">
                  Não há avaliações liberadas para realização no momento.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          {upcoming.length > 0 ? (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-blue-800 mb-2">
                  <Calendar className="h-5 w-5" />
                  <span className="font-semibold">Próximas Avaliações</span>
                </div>
                <p className="text-sm text-blue-700">
                  Você tem {upcoming.length} avaliações agendadas.
                  Elas serão liberadas automaticamente no horário marcado.
                </p>
              </div>
              {upcoming.map((evaluation) => (
                <EvaluationCard key={evaluation.id} evaluation={evaluation} />
              ))}
            </>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <Calendar className="h-16 w-16 mx-auto mb-4 text-blue-200" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhuma avaliação agendada
                </h3>
                <p className="text-muted-foreground mb-4">
                  Você não possui avaliações programadas para os próximos dias.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="expired" className="space-y-4">
          {expired.length > 0 ? (
            <>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-red-800 mb-2">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-semibold">Avaliações Expiradas</span>
                </div>
                <p className="text-sm text-red-700">
                  Estas avaliações não estão mais disponíveis para realização.
                </p>
              </div>
              {expired.map((evaluation) => (
                <EvaluationCard key={evaluation.id} evaluation={evaluation} />
              ))}
            </>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-200" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhuma avaliação expirada
                </h3>
                <p className="text-muted-foreground">
                  Você não perdeu nenhuma avaliação até o momento.
                </p>
                </CardContent>
              </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
