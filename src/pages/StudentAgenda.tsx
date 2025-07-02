import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, AlertCircle, BookOpen, CalendarDays } from "lucide-react";
import { format, addDays, addHours, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AgendaEvent {
  id: string;
  title: string;
  description: string;
  type: 'aula' | 'prova' | 'evento' | 'tarefa';
  startTime: Date;
  endTime: Date;
  location?: string;
  teacher?: string;
  subject?: string;
}

export default function StudentAgenda() {
  // Dados mockados para implementação futura
  const [mockEvents] = useState<AgendaEvent[]>([
    {
      id: '1',
      title: 'Aula de Matemática',
      description: 'Estudos sobre Geometria Analítica',
      type: 'aula',
      startTime: addHours(new Date(), 2),
      endTime: addHours(new Date(), 3),
      location: 'Sala 201',
      teacher: 'Prof. Silva',
      subject: 'Matemática'
    },
    {
      id: '2',
      title: 'Prova de História',
      description: 'Avaliação sobre Segunda Guerra Mundial',
      type: 'prova',
      startTime: addDays(new Date(), 1),
      endTime: addDays(addHours(new Date(), 2), 1),
      location: 'Sala 105',
      teacher: 'Prof. Santos',
      subject: 'História'
    },
    {
      id: '3',
      title: 'Tarefa de Português',
      description: 'Entrega do ensaio sobre Literatura Brasileira',
      type: 'tarefa',
      startTime: addDays(new Date(), 2),
      endTime: addDays(addHours(new Date(), 1), 2),
      teacher: 'Prof. Costa',
      subject: 'Português'
    },
    {
      id: '4',
      title: 'Feira de Ciências',
      description: 'Apresentação dos projetos científicos da turma',
      type: 'evento',
      startTime: addDays(new Date(), 5),
      endTime: addDays(addHours(new Date(), 4), 5),
      location: 'Auditório Principal'
    },
    {
      id: '5',
      title: 'Aula de Física',
      description: 'Experimentos de Eletromagnetismo',
      type: 'aula',
      startTime: addDays(addHours(new Date(), 10), 1),
      endTime: addDays(addHours(new Date(), 12), 1),
      location: 'Laboratório de Física',
      teacher: 'Prof. Oliveira',
      subject: 'Física'
    }
  ]);

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'aula':
        return <BookOpen className="h-4 w-4 text-blue-500" />;
      case 'prova':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'evento':
        return <Calendar className="h-4 w-4 text-purple-500" />;
      case 'tarefa':
        return <Clock className="h-4 w-4 text-orange-500" />;
      default:
        return <Calendar className="h-4 w-4 text-gray-500" />;
    }
  };

  const getEventTypeBadge = (type: string) => {
    switch (type) {
      case 'aula':
        return <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50">Aula</Badge>;
      case 'prova':
        return <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50">Prova</Badge>;
      case 'evento':
        return <Badge variant="outline" className="text-purple-700 border-purple-300 bg-purple-50">Evento</Badge>;
      case 'tarefa':
        return <Badge variant="outline" className="text-orange-700 border-orange-300 bg-orange-50">Tarefa</Badge>;
      default:
        return <Badge variant="outline">Outro</Badge>;
    }
  };

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Segunda-feira

  // Filtrar eventos por período
  const todayEvents = mockEvents.filter(event => 
    event.startTime.toDateString() === today.toDateString()
  );

  const upcomingEvents = mockEvents.filter(event => 
    event.startTime > today && event.startTime <= addDays(today, 7)
  ).sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">📅 Agenda Acadêmica</h1>
        <p className="text-muted-foreground">
          Acompanhe suas aulas, provas e eventos acadêmicos
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-800 mb-2">
            <AlertCircle className="h-5 w-5" />
            <span className="font-semibold">Em Desenvolvimento</span>
          </div>
          <p className="text-sm text-blue-700">
            Esta funcionalidade está sendo desenvolvida. Os dados mostrados são exemplos para demonstrar 
            o futuro design da agenda acadêmica.
          </p>
        </div>
      </div>

      {/* Resumo do dia */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-blue-600">{todayEvents.length}</div>
                <p className="text-xs text-muted-foreground">Eventos Hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {mockEvents.filter(e => e.type === 'aula').length}
                </div>
                <p className="text-xs text-muted-foreground">Aulas na Semana</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {mockEvents.filter(e => e.type === 'prova').length}
                </div>
                <p className="text-xs text-muted-foreground">Provas Agendadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {mockEvents.filter(e => e.type === 'tarefa').length}
                </div>
                <p className="text-xs text-muted-foreground">Tarefas Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Eventos de hoje */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">📅 Hoje - {format(today, "dd 'de' MMMM", { locale: ptBR })}</h2>
        {todayEvents.length > 0 ? (
          todayEvents.map((event) => (
            <Card key={event.id}>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {getEventTypeIcon(event.type)}
                      {event.title}
                    </CardTitle>
                    <CardDescription>{event.description}</CardDescription>
                  </div>
                  {getEventTypeBadge(event.type)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>
                      {format(event.startTime, "HH:mm")} - {format(event.endTime, "HH:mm")}
                    </span>
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      <span>{event.location}</span>
                    </div>
                  )}
                  {event.subject && (
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      <span>{event.subject}</span>
                    </div>
                  )}
                  {event.teacher && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{event.teacher}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-200" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhum evento hoje
              </h3>
              <p className="text-muted-foreground">
                Aproveite o dia livre para estudar ou descansar!
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Próximos eventos */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">🔜 Próximos Eventos</h2>
        {upcomingEvents.length > 0 ? (
          upcomingEvents.slice(0, 5).map((event) => (
            <Card key={event.id}>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {getEventTypeIcon(event.type)}
                      {event.title}
                    </CardTitle>
                    <CardDescription>{event.description}</CardDescription>
                  </div>
                  {getEventTypeBadge(event.type)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    <span>{format(event.startTime, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>
                      {format(event.startTime, "HH:mm")} - {format(event.endTime, "HH:mm")}
                    </span>
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      <span>{event.location}</span>
                    </div>
                  )}
                  {event.subject && event.teacher && (
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      <span>{event.subject} - {event.teacher}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-200" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhum evento próximo
              </h3>
              <p className="text-muted-foreground">
                Seus próximos eventos aparecerão aqui.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 