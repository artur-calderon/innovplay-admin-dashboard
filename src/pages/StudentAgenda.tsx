import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { addDays, addHours, format } from "date-fns";
import { ptBR } from "date-fns/locale";

// FullCalendar imports
import FullCalendar from '@fullcalendar/react';
import { EventInput, EventClickArg, EventContentArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

// FullCalendar styles customizados
import '../styles/fullcalendar.css';

// Interface customizada para eventos do FullCalendar (estudante)
interface StudentEventInput extends EventInput {
  extendedProps: {
    type: 'aula' | 'prova' | 'evento' | 'tarefa';
    description?: string;
    location?: string;
    teacher?: string;
    subject?: string;
  };
}

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

// Função para converter AgendaEvent para StudentEventInput
const convertToStudentCalendarEvent = (event: AgendaEvent): StudentEventInput => ({
  id: event.id,
  title: event.title,
  start: event.startTime.toISOString(),
  end: event.endTime.toISOString(),
  allDay: false,
  extendedProps: {
    type: event.type,
    description: event.description,
    location: event.location,
    teacher: event.teacher,
    subject: event.subject,
  },
});

// Função para renderizar o conteúdo customizado dos eventos (estudante)
function renderStudentEventContent(eventInfo: EventContentArg) {
  const eventType = eventInfo.event.extendedProps.type;
  let eventStyles = {
    bgColor: 'bg-blue-500',
    borderColor: 'border-blue-600',
    textColor: 'text-white'
  };

  switch (eventType) {
    case 'prova':
      eventStyles = { bgColor: 'bg-destructive', borderColor: 'border-destructive', textColor: 'text-destructive-foreground' };
      break;
    case 'evento':
      eventStyles = { bgColor: 'bg-primary', borderColor: 'border-primary', textColor: 'text-primary-foreground' };
      break;
    case 'aula':
      eventStyles = { bgColor: 'bg-blue-600', borderColor: 'border-blue-700', textColor: 'text-white' };
      break;
    case 'tarefa':
      eventStyles = { bgColor: 'bg-amber-500', borderColor: 'border-amber-600', textColor: 'text-amber-950' };
      break;
    default:
      eventStyles = { bgColor: 'bg-secondary', borderColor: 'border-border', textColor: 'text-secondary-foreground' };
  }

  // Check view type for optimized rendering
  const isDayView = eventInfo.view.type.includes('timeGridDay');
  const isWeekView = eventInfo.view.type.includes('timeGridWeek');
  const isMonthView = eventInfo.view.type.includes('dayGridMonth');
  const isTimeGrid = eventInfo.view.type.includes('timeGrid');
  
  return (
    <div className={`${isTimeGrid ? (isDayView ? 'px-3 py-2' : (isWeekView ? 'px-1.5 py-1' : 'px-2 py-1.5')) : (isMonthView ? 'px-1 py-0.5' : 'px-2 py-2')} w-full h-full ${eventStyles.bgColor} ${eventStyles.textColor} ${isTimeGrid ? (isDayView ? 'border-l-4' : (isWeekView ? 'border-l-2' : 'border-l-3')) : (isMonthView ? 'border-l-2' : 'border-l-3')} ${eventStyles.borderColor} ${isTimeGrid ? (isDayView ? 'rounded-lg' : (isWeekView ? 'rounded-sm' : 'rounded-md')) : (isMonthView ? 'rounded-sm' : 'rounded-md')} shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col ${isTimeGrid ? 'justify-center' : 'justify-start'} group cursor-pointer`}>
      <div className={`font-semibold leading-tight ${isTimeGrid ? (isDayView ? 'text-sm sm:text-base font-bold' : (isWeekView ? 'text-[10px] sm:text-xs font-bold' : 'text-xs sm:text-sm')) : (isMonthView ? 'text-[10px] sm:text-xs font-semibold' : 'text-xs sm:text-sm')} truncate ${isTimeGrid ? 'mb-1' : (isMonthView ? 'mb-0' : 'mb-1')}`}>
        {eventInfo.event.title}
      </div>
      {eventInfo.timeText && (
        <div className={`${isTimeGrid ? (isDayView ? 'text-xs sm:text-sm font-semibold' : (isWeekView ? 'text-[8px] sm:text-[10px] font-semibold' : 'text-[10px] sm:text-xs')) : (isMonthView ? 'text-[8px] sm:text-[10px] font-medium' : 'text-[10px] sm:text-xs')} opacity-90 font-medium ${isTimeGrid ? 'mb-1' : (isMonthView ? 'mb-0' : 'mb-1')}`}>
          {eventInfo.timeText}
        </div>
      )}
      {eventInfo.event.extendedProps.subject && (
        <div className={`${isTimeGrid ? (isDayView ? 'text-xs sm:text-sm' : (isWeekView ? 'text-[8px] sm:text-[10px]' : 'text-[10px] sm:text-xs')) : (isMonthView ? 'text-[8px] sm:text-[10px]' : 'text-[10px] sm:text-xs')} opacity-75 truncate italic`}>
          {eventInfo.event.extendedProps.subject}
        </div>
      )}
    </div>
  );
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
      endTime: addHours(new Date(), 4),
      location: 'Sala 101',
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
      subject: 'Português'
    },
    {
      id: '4',
      title: 'Feira de Ciências',
      description: 'Apresentação dos projetos científicos',
      type: 'evento',
      startTime: addDays(addHours(new Date(), 8), 3),
      endTime: addDays(addHours(new Date(), 17), 3),
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
    },
    {
      id: '6',
      title: 'Prova de Matemática',
      description: 'Avaliação de Álgebra Linear',
      type: 'prova',
      startTime: addDays(addHours(new Date(), 14), 1),
      endTime: addDays(addHours(new Date(), 16), 1),
      location: 'Sala 102',
      teacher: 'Prof. Silva',
      subject: 'Matemática'
    },
    {
      id: '7',
      title: 'Seminário de Química',
      description: 'Apresentação sobre Química Orgânica',
      type: 'evento',
      startTime: addDays(addHours(new Date(), 16), 1),
      endTime: addDays(addHours(new Date(), 18), 1),
      location: 'Auditório',
      subject: 'Química'
    },
    {
      id: '8',
      title: 'Entrega de Trabalho',
      description: 'Trabalho de Geografia sobre Climatologia',
      type: 'tarefa',
      startTime: addDays(addHours(new Date(), 8), 2),
      endTime: addDays(addHours(new Date(), 9), 2),
      subject: 'Geografia'
    }
  ]);

  // Converter eventos para o formato do FullCalendar
  const getStudentCalendarEvents = (): StudentEventInput[] => {
    return mockEvents.map(convertToStudentCalendarEvent);
  };

  // Callback para clique em evento (visualizar detalhes)
  const handleStudentEventClick = (clickInfo: EventClickArg) => {
    const eventData = clickInfo.event;
    const extendedProps = eventData.extendedProps;
    
    const eventDetails = `
📅 ${eventData.title}

📚 Tipo: ${extendedProps.type}
${extendedProps.subject ? `📖 Disciplina: ${extendedProps.subject}` : ''}
${extendedProps.teacher ? `👨‍🏫 Professor: ${extendedProps.teacher}` : ''}
${extendedProps.location ? `📍 Local: ${extendedProps.location}` : ''}
${extendedProps.description ? `📝 Descrição: ${extendedProps.description}` : ''}

⏰ Horário: ${format(new Date(eventData.start!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
    `;

    alert(eventDetails);
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">📅 Agenda Acadêmica</h1>
                  <p className="text-muted-foreground">
          Acompanhe suas aulas, provas e eventos acadêmicos
        </p>
      </div>

      {/* Calendário */}
      <Card className="shadow-sm border-border/50">
              <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold tracking-tight">📅 Minha Agenda</CardTitle>
          <CardDescription className="text-muted-foreground/80">
            Visualize suas aulas, provas e eventos em formato de calendário
          </CardDescription>
              </CardHeader>
        <CardContent className="pt-0">
          <div className="fullcalendar-container">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
              }}
              initialView="dayGridMonth"
              locale="pt-br"
              weekends={true}
              events={getStudentCalendarEvents()}
              editable={false}
              selectable={false}
              dayMaxEvents={false}
              dayMaxEventRows={6}
              moreLinkClick="popover"
              eventClick={handleStudentEventClick}
              eventContent={renderStudentEventContent}
              height="auto"
              contentHeight="auto"
              aspectRatio={1.2}
              eventMinHeight={48}
              eventOrder="start,title"
              moreLinkText="mais eventos"
              eventDisplay="block"
              eventOverlap={false}
              slotMinTime="06:00:00"
              slotMaxTime="23:00:00"
              slotDuration="01:00:00"
              slotLabelInterval="01:00:00"
              expandRows={true}
              nowIndicator={true}
              slotLabelFormat={{
                hour: '2-digit',
                minute: '2-digit',
                meridiem: false
              }}
              buttonText={{
                today: 'Hoje',
                month: 'Mês',
                week: 'Semana',
                day: 'Dia'
              }}
              noEventsText="Nenhum evento encontrado"
            />
                </div>
              </CardContent>
            </Card>
    </div>
  );
} 