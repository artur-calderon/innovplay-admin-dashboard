import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { addDays, addHours, format } from "date-fns";
import { ptBR } from "date-fns/locale";

// FullCalendar imports
import FullCalendar from '@fullcalendar/react';
import { EventInput, EventClickArg, EventContentArg, DatesSetArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

// FullCalendar styles customizados
import '../styles/fullcalendar.css';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarApi as CalendarService } from "@/services/calendarApi";
import { toast } from 'react-toastify';

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
      // Cor roxa padrão do sistema para eventos sem tipo específico
      eventStyles = { bgColor: 'bg-[#8b5cf6]', borderColor: 'border-[#7c3aed]', textColor: 'text-white' };
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
  
  const calendarRef = useRef<FullCalendar>(null);
  const [fcEvents, setFcEvents] = useState<StudentEventInput[]>([]);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventInput | null>(null);

  const fetchMyEvents = async (range: DatesSetArg) => {
    try {
      const startISO = new Date(range.start).toISOString();
      const endISO = new Date(range.end).toISOString();
      const items = await CalendarService.listMyEvents(startISO, endISO);
      setFcEvents(items as StudentEventInput[]);
    } catch (_) {
      toast.error('Não foi possível carregar seus eventos');
    }
  };

  // Helper para verificar se a string de data contém informação de hora
  const hasTimeInfo = (dateStr: string | undefined): boolean => {
    if (!dateStr) return false;
    // Verifica se contém 'T' (formato ISO) ou ':' (formato de hora)
    return dateStr.includes('T') || (dateStr.includes(':') && dateStr.length > 10);
  };

  // Callback para clique em evento (visualizar detalhes)
  const handleStudentEventClick = async (clickInfo: EventClickArg) => {
    const eventData = clickInfo.event;

    setSelectedEvent({
      id: eventData.id,
      title: eventData.title,
      start: eventData.startStr,
      end: eventData.endStr,
      allDay: eventData.allDay,
      extendedProps: eventData.extendedProps || {},
    });
    setIsViewOpen(true);
    // marcar como lido
    if (!eventData.extendedProps?.read) {
      try { await CalendarService.markRead(eventData.id); } catch { /* noop */ }
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 min-h-screen">
      {/* Header — gamificado (padrão Resultados) */}
      <div className="space-y-2 animate-fade-in-up">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3" id="agenda-page-title">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 shadow-lg shadow-fuchsia-500/30 transition-transform duration-300 hover:scale-110">
            <Calendar className="w-5 h-5 text-white drop-shadow" />
          </span>
          <span className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-500 dark:from-violet-400 dark:via-fuchsia-400 dark:to-pink-400 bg-clip-text text-transparent">
            Agenda Acadêmica
          </span>
        </h1>
        <p className="text-muted-foreground font-medium">
          Acompanhe suas aulas, provas e eventos acadêmicos
        </p>
      </div>

      {/* Calendário */}
      <Card className="shadow-sm border-2 border-violet-200/50 dark:border-violet-500/30 rounded-2xl overflow-hidden bg-gradient-to-br from-violet-500/5 to-transparent transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/10 animate-fade-in-up">
              <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold tracking-tight">📅 Minha Agenda</CardTitle>
          <CardDescription className="text-muted-foreground/80">
            Visualize suas aulas, provas e eventos em formato de calendário
          </CardDescription>
              </CardHeader>
        <CardContent className="pt-0">
          <div className="fullcalendar-container">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
              }}
              initialView="dayGridMonth"
              locale="pt-br"
              weekends={true}
              events={fcEvents}
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
              datesSet={fetchMyEvents}
            />
                </div>
              </CardContent>
            </Card>
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
            <DialogDescription>
              {selectedEvent?.extendedProps?.description || 'Sem descrição'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            {selectedEvent?.extendedProps?.subject && (
              <div>
                <strong>Disciplina:</strong> {selectedEvent.extendedProps.subject}
              </div>
            )}
            {selectedEvent?.extendedProps?.teacher && (
              <div>
                <strong>Professor:</strong> {selectedEvent.extendedProps.teacher}
              </div>
            )}
            {selectedEvent?.extendedProps?.location && (
              <div>
                <strong>Local:</strong> {selectedEvent.extendedProps.location}
              </div>
            )}
            {selectedEvent?.start && (
              <div>
                <strong>
                  {hasTimeInfo(selectedEvent.start as string) ? 'Início:' : 'Data:'}
                </strong>{' '}
                {hasTimeInfo(selectedEvent.start as string)
                  ? format(new Date(selectedEvent.start as string), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                  : format(new Date(selectedEvent.start as string), "dd/MM/yyyy", { locale: ptBR })
                }
              </div>
            )}
            {selectedEvent?.end && hasTimeInfo(selectedEvent.end as string) && (
              <div>
                <strong>Fim:</strong>{' '}
                {format(new Date(selectedEvent.end as string), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </div>
            )}
            {selectedEvent?.end && !hasTimeInfo(selectedEvent.end as string) && (
              <div>
                <strong>Até:</strong>{' '}
                {format(new Date(selectedEvent.end as string), "dd/MM/yyyy", { locale: ptBR })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsViewOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 