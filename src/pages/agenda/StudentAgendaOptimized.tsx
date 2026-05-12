import React, { useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import { EventInput, EventClickArg, EventApi } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';

import '@/styles/fullcalendar.css';
import { CalendarDays, Loader2 } from 'lucide-react';
import { CalendarApi as CalendarService } from '@/services/calendarApi';
import { EventDetailDialog } from '@/components/agenda/EventDetailDialog';
import { summarizeStoredTargets } from '@/lib/calendarAudience';
import { toast } from 'react-toastify';
import { fetchAuthenticatedDownload } from '@/lib/fetch-authenticated-download';

interface StudentEventInput extends EventInput {
  extendedProps: {
    type?: 'exam' | 'class' | 'assignment' | 'holiday' | 'event';
    subject?: string;
    teacher?: string;
    room?: string;
    description?: string;
    location?: string;
    resources?: unknown[];
    targets?: unknown[];
    [key: string]: unknown;
  };
}

function getStudentEventClassNames(eventInfo: { event: EventApi }) {
  const type = eventInfo.event.extendedProps.type;
  if (type) {
    return [`fc-event-type-${type}`];
  }
  return [];
}

export default function StudentAgendaOptimized() {
  const [currentEvents, setCurrentEvents] = useState<StudentEventInput[]>([]);
  const calendarRef = useRef<FullCalendar>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selected, setSelected] = useState<EventInput | null>(null);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const fetchRequestRef = useRef(0);

  const fetchMyEvents = async (arg: { start: Date; end: Date }) => {
    const requestId = ++fetchRequestRef.current;
    setIsLoadingEvents(true);
    try {
      const items = await CalendarService.listMyEvents(arg.start.toISOString(), arg.end.toISOString());
      if (requestId === fetchRequestRef.current) {
        setCurrentEvents(items as StudentEventInput[]);
      }
    } catch (_) {
      toast.error('Não foi possível carregar seus eventos');
    } finally {
      if (requestId === fetchRequestRef.current) {
        setIsLoadingEvents(false);
      }
    }
  };

  const viewAudienceLines = useMemo(() => {
    const raw = selected?.extendedProps?.targets;
    if (!Array.isArray(raw) || raw.length === 0) return null;
    return summarizeStoredTargets(raw, {}, { neutralSelf: true });
  }, [selected?.extendedProps?.targets]);

  const contextFields = useMemo(() => {
    const ep = selected?.extendedProps as StudentEventInput['extendedProps'] | undefined;
    if (!ep) return undefined;
    return {
      subject: typeof ep.subject === 'string' ? ep.subject : undefined,
      teacher: typeof ep.teacher === 'string' ? ep.teacher : undefined,
      room: typeof ep.room === 'string' ? ep.room : undefined,
    };
  }, [selected?.extendedProps]);

  const handleEventClick = async (clickInfo: EventClickArg) => {
    const e = clickInfo.event;

    setSelected({
      id: e.id,
      title: e.title,
      start: e.startStr,
      end: e.endStr,
      allDay: e.allDay,
      extendedProps: e.extendedProps || {},
    });
    setIsViewOpen(true);
    if (!e.extendedProps?.read) {
      try {
        await CalendarService.markRead(e.id);
      } catch {
        // silenciar
      }
    }
  };

  const handleDownloadFileResource = async (eventId: string, resourceId: string, fileName?: string) => {
    try {
      await fetchAuthenticatedDownload(
        `calendar/events/${eventId}/resources/${resourceId}/download`,
        fileName?.trim() || 'anexo'
      );
    } catch {
      toast.error('Não foi possível baixar o arquivo');
    }
  };

  return (
    <div className="p-4">
      <div className="mb-6 space-y-2 animate-fade-in-up">
        <div className="space-y-1.5">
          <h1
            className="text-2xl sm:text-3xl font-bold tracking-tight flex flex-wrap items-center gap-2 sm:gap-3"
            id="agenda-page-title"
          >
            <span className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 shadow-lg shadow-fuchsia-500/30 transition-transform duration-300 hover:scale-110 shrink-0">
              <CalendarDays className="w-5 h-5 text-white drop-shadow" />
            </span>
            <span className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-500 dark:from-violet-400 dark:via-fuchsia-400 dark:to-pink-400 bg-clip-text text-transparent">
              Minha Agenda
            </span>
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base font-medium">
            Acompanhe seus eventos e atividades escolares
          </p>
        </div>
      </div>

      <div className="bg-card rounded-lg shadow-sm border relative">
        {isLoadingEvents && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-background/70 backdrop-blur-[1px]">
            <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando eventos...
            </div>
          </div>
        )}
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          initialView="dayGridMonth"
          locale={ptBrLocale}
          weekends={true}
          events={currentEvents}
          editable={false}
          selectable={false}
          height="auto"
          dayMaxEvents={3}
          dayMaxEventRows={false}
          moreLinkClick="popover"
          eventMaxStack={3}
          eventOverlap={false}
          eventClick={handleEventClick}
          eventClassNames={getStudentEventClassNames}
          eventOrder="start,title"
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          slotDuration="01:00:00"
          slotLabelInterval="01:00:00"
          expandRows={true}
          nowIndicator={true}
          datesSet={(arg) => fetchMyEvents({ start: new Date(arg.start), end: new Date(arg.end) })}
        />
      </div>

      <EventDetailDialog
        open={isViewOpen}
        onOpenChange={setIsViewOpen}
        selected={selected}
        audienceLines={viewAudienceLines}
        contextFields={contextFields}
        emptyDescriptionHint="Nenhuma descrição foi adicionada a este evento."
        onDownloadFile={handleDownloadFileResource}
      />
    </div>
  );
}
