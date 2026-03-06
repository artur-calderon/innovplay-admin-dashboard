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
import { Calendar } from 'lucide-react';
import { CalendarApi as CalendarService } from "@/services/calendarApi";
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

  // Helper para verificar se a string de data contém informação de hora
  const hasTimeInfo = (dateStr: string | undefined): boolean => {
    if (!dateStr) return false;
    // Verifica se contém 'T' (formato ISO) ou ':' (formato de hora)
    return dateStr.includes('T') || (dateStr.includes(':') && dateStr.length > 10);
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
      try { 
        await CalendarService.markRead(e.id); 
      } catch {
        // Silenciar erro ao marcar como lido
      }
    }
  };

  return (
    <div className="p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 mb-2">
          <Calendar className="w-8 h-8 text-primary" />
          Minha Agenda
        </h1>
        <p className="text-muted-foreground">Acompanhe seus eventos e atividades escolares</p>
      </div>

      <div className="bg-card rounded-lg shadow-sm border">
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
        <DialogContent className="max-w-md w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>{selected?.title}</DialogTitle>
            <DialogDescription>{selected?.extendedProps?.description || 'Sem descrição'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            {selected?.extendedProps?.subject && (
              <div>
                <strong>Disciplina:</strong> {selected.extendedProps.subject}
              </div>
            )}
            {selected?.extendedProps?.teacher && (
              <div>
                <strong>Professor:</strong> {selected.extendedProps.teacher}
              </div>
            )}
            {selected?.extendedProps?.location && (
              <div>
                <strong>Local:</strong> {selected.extendedProps.location}
              </div>
            )}
            {selected?.extendedProps?.room && !selected?.extendedProps?.location && (
              <div>
                <strong>Local:</strong> {selected.extendedProps.room}
              </div>
            )}
            {selected?.start && (
              <div>
                <strong>
                  {hasTimeInfo(selected.start as string) ? 'Início:' : 'Data:'}
                </strong>{' '}
                {hasTimeInfo(selected.start as string)
                  ? format(new Date(selected.start as string), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                  : format(new Date(selected.start as string), "dd/MM/yyyy", { locale: ptBR })
                }
              </div>
            )}
            {selected?.end && hasTimeInfo(selected.end as string) && (
              <div>
                <strong>Fim:</strong>{' '}
                {format(new Date(selected.end as string), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </div>
            )}
            {selected?.end && !hasTimeInfo(selected.end as string) && (
              <div>
                <strong>Até:</strong>{' '}
                {format(new Date(selected.end as string), "dd/MM/yyyy", { locale: ptBR })}
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
