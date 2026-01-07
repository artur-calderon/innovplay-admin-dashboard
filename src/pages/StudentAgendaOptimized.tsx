import React, { useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import { EventInput, DateSelectArg, EventClickArg, EventApi } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';

// Importe a folha de estilos personalizada
import '../styles/fullcalendar.css';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarApi as CalendarService } from "@/services/calendarApi";
import { toast } from 'react-toastify';

// Interface para eventos do aluno
interface StudentEventInput extends EventInput {
  extendedProps: {
    type: 'exam' | 'class' | 'assignment' | 'holiday' | 'event';
    subject?: string;
    teacher?: string;
    room?: string;
  };
}

// Função para obter a data atual no formato YYYY-MM-DD
const getTodayStr = () => new Date().toISOString().replace(/T.*$/, '');

// Função para obter uma data relativa (em dias)
const getDateRelative = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().replace(/T.*$/, '');
};

// Função para obter uma data/hora relativa
const getDateTimeRelative = (days: number, hour: number, minute: number = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

// Removidos eventos mockados; eventos virão da API

// Função para obter classes CSS baseadas no tipo de evento
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

  const fetchMyEvents = async (arg: { start: Date; end: Date }) => {
    try {
      const items = await CalendarService.listMyEvents(arg.start.toISOString(), arg.end.toISOString());
      setCurrentEvents(items as StudentEventInput[]);
    } catch (_) {
      toast.error('Não foi possível carregar seus eventos');
    }
  };

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
      try { await CalendarService.markRead(e.id); } catch {}
    }
  };

  return (
    <div className="p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Minha Agenda</h1>
        <p className="text-gray-600">Acompanhe seus eventos e atividades escolares</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          initialView="dayGridMonth"
          locale={ptBrLocale}
          weekends={true}
          events={currentEvents}
          editable={false}
          selectable={false}
          
          // --- CONFIGURAÇÃO DE TAMANHO E EVENTOS ---
          height="auto" // Permite que a altura do calendário se ajuste ao conteúdo
          dayMaxEvents={3} // Mostra até 3 eventos por dia, depois mostra "mais"
          dayMaxEventRows={false} // Permite expansão além do limite
          moreLinkClick="popover" // Mostra eventos extras em popover
          // Configurações específicas para semana e dia
          eventMaxStack={3} // Máximo de eventos empilhados em semana/dia
          eventOverlap={false} // Evita sobreposição de eventos
          // -------------------------------------------
          
          eventClick={handleEventClick}
          eventClassNames={getStudentEventClassNames}
          // Configurações otimizadas para múltiplos eventos
          eventMinHeight={48}
          eventOrder="start,title"
          // Configurações para visualizações de tempo
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          slotDuration="01:00:00"
          slotLabelInterval="01:00:00"
          expandRows={true}
          nowIndicator={true}
          datesSet={(arg) => fetchMyEvents({ start: new Date(arg.start), end: new Date(arg.end) })}
        />
      </div>
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selected?.title}</DialogTitle>
            <DialogDescription>{selected?.extendedProps?.description || 'Sem descrição'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            {selected?.extendedProps?.subject && (<div>Disciplina: {selected.extendedProps.subject}</div>)}
            {selected?.extendedProps?.teacher && (<div>Professor: {selected.extendedProps.teacher}</div>)}
            {selected?.extendedProps?.room && (<div>Local: {selected.extendedProps.room}</div>)}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsViewOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
