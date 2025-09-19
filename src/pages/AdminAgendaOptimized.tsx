import React, { useState, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import { EventInput, DateSelectArg, EventClickArg, EventApi } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';

// Importe a folha de estilos personalizada
import '../styles/fullcalendar.css';

// Interface atualizada para corresponder às classes CSS
interface CustomEventInput extends EventInput {
  extendedProps: {
    type: 'exam' | 'event' | 'holiday' | 'class' | 'meeting' | 'task';
    description?: string;
    location?: string;
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

// Dados iniciais de exemplo com datas dinâmicas
const eventosIniciais: CustomEventInput[] = [
  // Eventos passados
  {
    id: '1',
    title: 'Reunião de Coordenação',
    start: getDateTimeRelative(-7, 9, 0), // 7 dias atrás
    end: getDateTimeRelative(-7, 11, 0),
    extendedProps: {
      type: 'meeting',
      description: 'Reunião de coordenação pedagógica mensal',
      location: 'Sala de Coordenação'
    }
  },
  {
    id: '2',
    title: 'Aula de Matemática',
    start: getDateTimeRelative(-5, 14, 0), // 5 dias atrás
    end: getDateTimeRelative(-5, 16, 0),
    extendedProps: {
      type: 'class',
      description: 'Aula de Matemática - 3º ano',
      location: 'Sala 101'
    }
  },
  {
    id: '3',
    title: 'Prova de Física',
    start: getDateTimeRelative(-3, 8, 0), // 3 dias atrás
    end: getDateTimeRelative(-3, 10, 0),
    extendedProps: {
      type: 'exam',
      description: 'Prova de Física - 2º ano',
      location: 'Sala 102'
    }
  },
  
  // Eventos hoje
  {
    id: '4',
    title: 'Aula de Química',
    start: getDateTimeRelative(0, 10, 0), // Hoje
    end: getDateTimeRelative(0, 12, 0),
    extendedProps: {
      type: 'class',
      description: 'Aula de Química - 1º ano',
      location: 'Laboratório de Química'
    }
  },
  {
    id: '5',
    title: 'Reunião de Pais',
    start: getDateTimeRelative(0, 19, 0), // Hoje à noite
    end: getDateTimeRelative(0, 21, 0),
    extendedProps: {
      type: 'meeting',
      description: 'Reunião de pais e mestres',
      location: 'Auditório Principal'
    }
  },
  
  // Eventos futuros próximos
  {
    id: '7',
    title: 'Aula de Biologia',
    start: getDateTimeRelative(1, 14, 0), // Amanhã
    end: getDateTimeRelative(1, 16, 0),
    extendedProps: {
      type: 'class',
      description: 'Aula de Biologia - 2º ano',
      location: 'Laboratório de Biologia'
    }
  },
  {
    id: '8',
    title: 'Trabalho de História',
    start: getDateTimeRelative(2, 9, 0), // Depois de amanhã
    end: getDateTimeRelative(2, 11, 0),
    extendedProps: {
      type: 'task',
      description: 'Apresentação de trabalho de História',
      location: 'Sala 203'
    }
  },
  {
    id: '9',
    title: 'Aula de Português',
    start: getDateTimeRelative(2, 14, 0), // Depois de amanhã
    end: getDateTimeRelative(2, 16, 0),
    extendedProps: {
      type: 'class',
      description: 'Aula de Português - 1º ano',
      location: 'Sala 104'
    }
  },
  {
    id: '10',
    title: 'Evento Cultural',
    start: getDateTimeRelative(3, 19, 0), // 3 dias
    end: getDateTimeRelative(3, 21, 0),
    extendedProps: {
      type: 'event',
      description: 'Apresentação cultural da escola',
      location: 'Auditório Principal'
    }
  },
  {
    id: '11',
    title: 'Prova de Geografia',
    start: getDateRelative(4), // 4 dias (dia inteiro)
    allDay: true,
    extendedProps: {
      type: 'exam',
      description: 'Prova de Geografia - 1º ano',
      location: 'Sala 105'
    }
  },
  {
    id: '12',
    title: 'Aula de Educação Física',
    start: getDateTimeRelative(4, 8, 0), // 4 dias (mesmo dia da prova)
    end: getDateTimeRelative(4, 10, 0),
    extendedProps: {
      type: 'class',
      description: 'Aula de Educação Física - 2º ano',
      location: 'Quadra de Esportes'
    }
  },
  {
    id: '13',
    title: 'Reunião Pedagógica',
    start: getDateTimeRelative(5, 14, 0), // 5 dias
    end: getDateTimeRelative(5, 17, 0),
    extendedProps: {
      type: 'meeting',
      description: 'Reunião pedagógica mensal',
      location: 'Sala de Reuniões'
    }
  },
  {
    id: '14',
    title: 'Aula de Inglês',
    start: getDateTimeRelative(5, 16, 0), // 5 dias
    end: getDateTimeRelative(5, 18, 0),
    extendedProps: {
      type: 'class',
      description: 'Aula de Inglês - 3º ano',
      location: 'Sala 106'
    }
  },
  {
    id: '15',
    title: 'Feriado Nacional',
    start: getDateRelative(7), // 7 dias (dia inteiro)
    allDay: true,
    extendedProps: {
      type: 'holiday',
      description: 'Feriado Nacional'
    }
  },
  
  // Eventos mais distantes
  {
    id: '16',
    title: 'Prova de Literatura',
    start: getDateRelative(10), // 10 dias (dia inteiro)
    allDay: true,
    extendedProps: {
      type: 'exam',
      description: 'Prova de Literatura - 2º ano',
      location: 'Sala 103'
    }
  },
  {
    id: '17',
    title: 'Aula de Filosofia',
    start: getDateTimeRelative(10, 14, 0), // 10 dias
    end: getDateTimeRelative(10, 16, 0),
    extendedProps: {
      type: 'class',
      description: 'Aula de Filosofia - 3º ano',
      location: 'Sala 107'
    }
  },
  {
    id: '18',
    title: 'Trabalho de Química',
    start: getDateTimeRelative(12, 9, 0), // 12 dias
    end: getDateTimeRelative(12, 11, 0),
    extendedProps: {
      type: 'task',
      description: 'Experimento de Química',
      location: 'Laboratório de Química'
    }
  },
  {
    id: '19',
    title: 'Evento Esportivo',
    start: getDateTimeRelative(14, 14, 0), // 14 dias
    end: getDateTimeRelative(14, 18, 0),
    extendedProps: {
      type: 'event',
      description: 'Campeonato interno de futebol',
      location: 'Quadra de Esportes'
    }
  },
  {
    id: '20',
    title: 'Reunião de Professores',
    start: getDateTimeRelative(15, 14, 0), // 15 dias
    end: getDateTimeRelative(15, 16, 0),
    extendedProps: {
      type: 'meeting',
      description: 'Reunião de planejamento pedagógico',
      location: 'Sala de Professores'
    }
  },
  
  // Eventos que abrangem vários dias
  {
    id: '21',
    title: 'Semana de Avaliações',
    start: getDateRelative(20), // 20 dias
    end: getDateRelative(24), // Termina em 24 dias
    allDay: true,
    extendedProps: {
      type: 'exam',
      description: 'Semana de avaliações bimestrais',
      location: 'Várias salas'
    }
  },
  {
    id: '22',
    title: 'Workshop de Tecnologia',
    start: getDateRelative(25), // 25 dias
    end: getDateRelative(27), // Termina em 27 dias
    allDay: true,
    extendedProps: {
      type: 'event',
      description: 'Workshop intensivo sobre tecnologia educacional',
      location: 'Laboratório de Informática'
    }
  }
];

// Função para obter classes CSS baseadas no tipo de evento
function getEventClassNames(eventInfo: { event: EventApi }) {
  const type = eventInfo.event.extendedProps.type;
  if (type) {
    return [`fc-event-type-${type}`];
  }
  return [];
}

export default function AdminAgendaOptimized() {
  const [currentEvents, setCurrentEvents] = useState<CustomEventInput[]>(eventosIniciais);
  const calendarRef = useRef<FullCalendar>(null);

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    let title = prompt('Por favor, insira um título para o novo evento')?.trim();
    let calendarApi = selectInfo.view.calendar;

    calendarApi.unselect(); // Limpa a seleção

    if (title) {
      const newEvent: CustomEventInput = {
        id: String(Date.now()),
        title,
        start: selectInfo.startStr,
        end: selectInfo.endStr,
        allDay: selectInfo.allDay,
        extendedProps: {
          type: 'event', // Tipo padrão para novos eventos
        },
      };
      setCurrentEvents([...currentEvents, newEvent]);
    }
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const { title, extendedProps } = clickInfo.event;
    const details = `
      Evento: ${title}
      Tipo: ${extendedProps.type}
      Local: ${extendedProps.location || 'N/A'}
      Descrição: ${extendedProps.description || 'N/A'}
    `;
    if (confirm(`Deseja remover o evento '${title}'?\n\nDetalhes:\n${details}`)) {
      clickInfo.event.remove(); // Remove o evento da UI
      setCurrentEvents(currentEvents.filter(event => event.id !== clickInfo.event.id));
    }
  };

  return (
    <div className="p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Agenda Administrativa</h1>
        <p className="text-gray-600">Gerencie eventos e atividades da instituição</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
          }}
          initialView="dayGridMonth"
          locale={ptBrLocale} // Define o idioma para português do Brasil
          weekends={true}
          events={currentEvents}
          editable={true}
          selectable={true}
          selectMirror={true}
          
          // --- CONFIGURAÇÃO DE TAMANHO E EVENTOS ---
          height="auto" // Permite que a altura do calendário se ajuste ao conteúdo
          dayMaxEvents={3} // Mostra até 3 eventos por dia, depois mostra "mais"
          dayMaxEventRows={false} // Permite expansão além do limite
          moreLinkClick="popover" // Mostra eventos extras em popover
          // Configurações específicas para semana e dia
          eventMaxStack={3} // Máximo de eventos empilhados em semana/dia
          eventOverlap={false} // Evita sobreposição de eventos
          // -------------------------------------------
          
          select={handleDateSelect}
          eventClick={handleEventClick}
          eventClassNames={getEventClassNames} // Hook para adicionar classes dinâmicas
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
        />
      </div>
    </div>
  );
}
