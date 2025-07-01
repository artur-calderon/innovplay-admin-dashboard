import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Play, CheckCircle, AlertCircle, Book, Users, Timer, CalendarDays } from "lucide-react";
import { format, isAfter, isBefore, addMinutes, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ScheduledEvaluation {
  id: string;
  title: string;
  description?: string;
  subject: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  evaluation_mode: 'virtual' | 'physical';
  status: 'upcoming' | 'available' | 'in_progress' | 'completed' | 'expired';
  score?: number;
  total_questions: number;
  class_name?: string;
  teacher_name?: string;
}

export default function StudentAgenda() {
  const [evaluations, setEvaluations] = useState<ScheduledEvaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchStudentEvaluations();
    
    // Atualizar o tempo atual a cada minuto
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const fetchStudentEvaluations = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/student/evaluations/agenda");
      setEvaluations(response.data || []);
    } catch (error) {
      console.error("Erro ao buscar agenda:", error);
      // Dados simulados para demonstração
      setEvaluations([
        {
          id: "1",
          title: "Avaliação de Matemática - Frações",
          description: "Avaliação sobre operações com frações e números decimais",
          subject: "Matemática",
          scheduled_date: "2024-01-20",
          start_time: "14:00",
          end_time: "15:30",
          duration_minutes: 90,
          evaluation_mode: "virtual",
          status: "available",
          total_questions: 15,
          class_name: "5º Ano A",
          teacher_name: "Prof. Maria Silva"
        },
        {
          id: "2",
          title: "Prova de Português - Interpretação",
          description: "Prova sobre interpretação de texto e gramática",
          subject: "Português",
          scheduled_date: "2024-01-22",
          start_time: "08:00",
          end_time: "09:30",
          duration_minutes: 90,
          evaluation_mode: "physical",
          status: "upcoming",
          total_questions: 20,
          class_name: "5º Ano A",
          teacher_name: "Prof. João Santos"
        },
        {
          id: "3",
          title: "Simulado SAEB - Matemática",
          description: "Simulado preparatório para o SAEB",
          subject: "Matemática",
          scheduled_date: "2024-01-18",
          start_time: "09:00",
          end_time: "11:00",
          duration_minutes: 120,
          evaluation_mode: "virtual",
          status: "completed",
          score: 8.5,
          total_questions: 25,
          class_name: "5º Ano A",
          teacher_name: "Prof. Maria Silva"
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartEvaluation = async (evaluationId: string) => {
    try {
      const response = await api.post(`/student/evaluations/${evaluationId}/start`);
      toast({
        title: "Avaliação iniciada!",
        description: "Boa sorte na sua avaliação!",
      });
      navigate(`/app/avaliacao/${evaluationId}/responder`);
    } catch (error) {
      toast({
        title: "Erro ao iniciar avaliação",
        description: "Não foi possível iniciar a avaliação. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const getStatusInfo = (evaluation: ScheduledEvaluation) => {
    switch (evaluation.status) {
      case 'completed':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: CheckCircle,
          label: 'Concluída',
          description: evaluation.score ? `Nota: ${evaluation.score}` : 'Aguardando correção'
        };
      case 'available':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: Play,
          label: 'Disponível',
          description: 'Clique para iniciar'
        };
      case 'in_progress':
        return {
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          icon: Timer,
          label: 'Em andamento',
          description: 'Continue sua avaliação'
        };
      case 'expired':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: AlertCircle,
          label: 'Expirada',
          description: 'Prazo encerrado'
        };
      default: {
        const scheduledDateTime = parseISO(`${evaluation.scheduled_date}T${evaluation.start_time}`);
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: Calendar,
          label: 'Agendada',
          description: `Inicia em ${format(scheduledDateTime, "dd/MM 'às' HH:mm", { locale: ptBR })}`
        };
      }
    }
  };

  const getEvaluationsByStatus = () => {
    const upcoming = evaluations.filter(e => e.status === 'upcoming');
    const available = evaluations.filter(e => ['available', 'in_progress'].includes(e.status));
    const completed = evaluations.filter(e => e.status === 'completed');
    const expired = evaluations.filter(e => e.status === 'expired');

    return { upcoming, available, completed, expired };
  };

  const { upcoming, available, completed, expired } = getEvaluationsByStatus();

  const EvaluationCard = ({ evaluation }: { evaluation: ScheduledEvaluation }) => {
    const statusInfo = getStatusInfo(evaluation);
    const StatusIcon = statusInfo.icon;

    return (
      <Card className="transition-all duration-200 hover:shadow-md">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold line-clamp-1">
                {evaluation.title}
              </CardTitle>
              <CardDescription className="mt-1 line-clamp-2">
                {evaluation.description}
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
              <span>{evaluation.subject}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{evaluation.class_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span>{format(parseISO(evaluation.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{evaluation.start_time} - {evaluation.end_time}</span>
            </div>
          </div>

          {/* Detalhes adicionais */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{evaluation.total_questions} questões</span>
              <span>{evaluation.duration_minutes} min</span>
              <span className="capitalize">{evaluation.evaluation_mode}</span>
              {evaluation.teacher_name && <span>{evaluation.teacher_name}</span>}
            </div>
            
            {/* Ações */}
            <div className="flex gap-2">
              {evaluation.status === 'available' && evaluation.evaluation_mode === 'virtual' && (
                <Button 
                  size="sm"
                  onClick={() => handleStartEvaluation(evaluation.id)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Play className="h-4 w-4 mr-1" />
                  Iniciar
                </Button>
              )}
              {evaluation.status === 'in_progress' && (
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/app/avaliacao/${evaluation.id}/responder`)}
                >
                  Continuar
                </Button>
              )}
              {evaluation.status === 'completed' && evaluation.score && (
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/app/avaliacao/${evaluation.id}/resultado`)}
                >
                  Ver Resultado
                </Button>
              )}
              {evaluation.evaluation_mode === 'physical' && evaluation.status === 'upcoming' && (
                <Badge variant="outline" className="text-xs">
                  Prova Presencial
                </Badge>
              )}
            </div>
          </div>
          
          {/* Status description */}
          <div className="text-xs text-muted-foreground">
            {statusInfo.description}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
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
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Agenda de Avaliações</h1>
        <p className="text-muted-foreground">
          Acompanhe suas avaliações agendadas e realize-as no horário marcado
        </p>
      </div>

      {/* Resumo rápido */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-blue-600">{available.length}</div>
                <p className="text-xs text-muted-foreground">Disponíveis</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-600" />
              <div>
                <div className="text-2xl font-bold text-gray-600">{upcoming.length}</div>
                <p className="text-xs text-muted-foreground">Agendadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-600">{completed.length}</div>
                <p className="text-xs text-muted-foreground">Concluídas</p>
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="available">
            Disponíveis ({available.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            Agendadas ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Concluídas ({completed.length})
          </TabsTrigger>
          <TabsTrigger value="expired">
            Expiradas ({expired.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-4">
          {available.length > 0 ? (
            available.map((evaluation) => (
              <EvaluationCard key={evaluation.id} evaluation={evaluation} />
            ))
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <Play className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">Nenhuma avaliação disponível no momento</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          {upcoming.length > 0 ? (
            upcoming.map((evaluation) => (
              <EvaluationCard key={evaluation.id} evaluation={evaluation} />
            ))
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">Nenhuma avaliação agendada</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completed.length > 0 ? (
            completed.map((evaluation) => (
              <EvaluationCard key={evaluation.id} evaluation={evaluation} />
            ))
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">Nenhuma avaliação concluída</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="expired" className="space-y-4">
          {expired.length > 0 ? (
            expired.map((evaluation) => (
              <EvaluationCard key={evaluation.id} evaluation={evaluation} />
            ))
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">Nenhuma avaliação expirada</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 