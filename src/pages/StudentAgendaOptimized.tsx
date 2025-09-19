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

// Dados mockados para o aluno com datas dinâmicas
const studentEvents: StudentEventInput[] = [
  // Eventos passados
  {
    id: '1',
    title: 'Aula de Matemática',
    start: getDateTimeRelative(-5, 14, 0), // 5 dias atrás
    end: getDateTimeRelative(-5, 16, 0),
    extendedProps: {
      type: 'class',
      subject: 'Matemática',
      teacher: 'Prof. João Silva',
      room: 'Sala 101'
    }
  },
  {
    id: '2',
    title: 'Prova de Física',
    start: getDateTimeRelative(-3, 8, 0), // 3 dias atrás
    end: getDateTimeRelative(-3, 10, 0),
    extendedProps: {
      type: 'exam',
      subject: 'Física',
      teacher: 'Prof. Maria Santos',
      room: 'Sala 102'
    }
  },
  {
    id: '3',
    title: 'Aula de Química',
    start: getDateTimeRelative(-2, 10, 0), // 2 dias atrás
    end: getDateTimeRelative(-2, 12, 0),
    extendedProps: {
      type: 'class',
      subject: 'Química',
      teacher: 'Prof. Pedro Oliveira',
      room: 'Laboratório de Química'
    }
  },
  
  // Eventos hoje
  {
    id: '4',
    title: 'Aula de Biologia',
    start: getDateTimeRelative(0, 10, 0), // Hoje
    end: getDateTimeRelative(0, 12, 0),
    extendedProps: {
      type: 'class',
      subject: 'Biologia',
      teacher: 'Prof. Roberto Alves',
      room: 'Laboratório de Biologia'
    }
  },
  {
    id: '5',
    title: 'Aula de Inglês',
    start: getDateTimeRelative(0, 14, 0), // Hoje
    end: getDateTimeRelative(0, 16, 0),
    extendedProps: {
      type: 'class',
      subject: 'Inglês',
      teacher: 'Prof. Sarah Johnson',
      room: 'Sala 105'
    }
  },
  {
    id: '6',
    title: 'Evento Cultural',
    start: getDateTimeRelative(0, 19, 0), // Hoje à noite
    end: getDateTimeRelative(0, 21, 0),
    extendedProps: {
      type: 'event',
      subject: 'Apresentação Cultural',
      room: 'Auditório'
    }
  },
  
  // Eventos futuros próximos
  {
    id: '8',
    title: 'Aula de Educação Física',
    start: getDateTimeRelative(1, 14, 0), // Amanhã
    end: getDateTimeRelative(1, 16, 0),
    extendedProps: {
      type: 'class',
      subject: 'Educação Física',
      teacher: 'Prof. Marcos Silva',
      room: 'Quadra de Esportes'
    }
  },
  {
    id: '9',
    title: 'Trabalho de História',
    start: getDateTimeRelative(2, 9, 0), // Depois de amanhã
    end: getDateTimeRelative(2, 11, 0),
    extendedProps: {
      type: 'assignment',
      subject: 'História',
      teacher: 'Prof. Carlos Lima',
      room: 'Sala 203'
    }
  },
  {
    id: '10',
    title: 'Aula de Português',
    start: getDateTimeRelative(2, 14, 0), // Depois de amanhã
    end: getDateTimeRelative(2, 16, 0),
    extendedProps: {
      type: 'class',
      subject: 'Português',
      teacher: 'Prof. Ana Costa',
      room: 'Sala 102'
    }
  },
  {
    id: '11',
    title: 'Prova de Geografia',
    start: getDateRelative(3), // 3 dias (dia inteiro)
    allDay: true,
    extendedProps: {
      type: 'exam',
      subject: 'Geografia',
      teacher: 'Prof. Lucia Mendes',
      room: 'Sala 104'
    }
  },
  {
    id: '12',
    title: 'Aula de Literatura',
    start: getDateTimeRelative(3, 14, 0), // 3 dias
    end: getDateTimeRelative(3, 16, 0),
    extendedProps: {
      type: 'class',
      subject: 'Literatura',
      teacher: 'Prof. Ana Costa',
      room: 'Sala 103'
    }
  },
  {
    id: '13',
    title: 'Trabalho de Matemática',
    start: getDateTimeRelative(4, 10, 0), // 4 dias
    end: getDateTimeRelative(4, 12, 0),
    extendedProps: {
      type: 'assignment',
      subject: 'Matemática',
      teacher: 'Prof. João Silva',
      room: 'Sala 101'
    }
  },
  {
    id: '14',
    title: 'Prova de Química',
    start: getDateRelative(5), // 5 dias (dia inteiro)
    allDay: true,
    extendedProps: {
      type: 'exam',
      subject: 'Química',
      teacher: 'Prof. Pedro Oliveira',
      room: 'Laboratório de Química'
    }
  },
  {
    id: '15',
    title: 'Feriado Nacional',
    start: getDateRelative(7), // 7 dias (dia inteiro)
    allDay: true,
    extendedProps: {
      type: 'holiday'
    }
  },
  
  // Eventos mais distantes
  {
    id: '16',
    title: 'Aula de Filosofia',
    start: getDateTimeRelative(8, 16, 0), // 8 dias
    end: getDateTimeRelative(8, 18, 0),
    extendedProps: {
      type: 'class',
      subject: 'Filosofia',
      teacher: 'Prof. Paulo Santos',
      room: 'Sala 106'
    }
  },
  {
    id: '17',
    title: 'Trabalho de Biologia',
    start: getDateTimeRelative(10, 9, 0), // 10 dias
    end: getDateTimeRelative(10, 11, 0),
    extendedProps: {
      type: 'assignment',
      subject: 'Biologia',
      teacher: 'Prof. Roberto Alves',
      room: 'Laboratório de Biologia'
    }
  },
  {
    id: '18',
    title: 'Prova de Literatura',
    start: getDateRelative(12), // 12 dias (dia inteiro)
    allDay: true,
    extendedProps: {
      type: 'exam',
      subject: 'Literatura',
      teacher: 'Prof. Ana Costa',
      room: 'Sala 103'
    }
  },
  {
    id: '19',
    title: 'Aula de Sociologia',
    start: getDateTimeRelative(12, 14, 0), // 12 dias
    end: getDateTimeRelative(12, 16, 0),
    extendedProps: {
      type: 'class',
      subject: 'Sociologia',
      teacher: 'Prof. Marina Lima',
      room: 'Sala 107'
    }
  },
  {
    id: '20',
    title: 'Evento Esportivo',
    start: getDateTimeRelative(14, 14, 0), // 14 dias
    end: getDateTimeRelative(14, 18, 0),
    extendedProps: {
      type: 'event',
      subject: 'Campeonato de Futebol',
      room: 'Quadra de Esportes'
    }
  },
  {
    id: '21',
    title: 'Trabalho de Inglês',
    start: getDateTimeRelative(15, 10, 0), // 15 dias
    end: getDateTimeRelative(15, 12, 0),
    extendedProps: {
      type: 'assignment',
      subject: 'Inglês',
      teacher: 'Prof. Sarah Johnson',
      room: 'Sala 105'
    }
  },
  {
    id: '22',
    title: 'Prova de História',
    start: getDateRelative(17), // 17 dias (dia inteiro)
    allDay: true,
    extendedProps: {
      type: 'exam',
      subject: 'História',
      teacher: 'Prof. Carlos Lima',
      room: 'Sala 203'
    }
  },
  
  // Eventos que abrangem vários dias
  {
    id: '23',
    title: 'Semana de Avaliações',
    start: getDateRelative(20), // 20 dias
    end: getDateRelative(24), // Termina em 24 dias
    allDay: true,
    extendedProps: {
      type: 'exam',
      subject: 'Avaliações Bimestrais',
      room: 'Várias salas'
    }
  },
  {
    id: '24',
    title: 'Workshop de Ciências',
    start: getDateRelative(25), // 25 dias
    end: getDateRelative(27), // Termina em 27 dias
    allDay: true,
    extendedProps: {
      type: 'event',
      subject: 'Workshop de Ciências',
      room: 'Laboratório de Ciências'
    }
  }
];

// Função para obter classes CSS baseadas no tipo de evento
function getStudentEventClassNames(eventInfo: { event: EventApi }) {
  const type = eventInfo.event.extendedProps.type;
  if (type) {
    return [`fc-event-type-${type}`];
  }
  return [];
}

export default function StudentAgendaOptimized() {
  const [currentEvents, setCurrentEvents] = useState<StudentEventInput[]>(studentEvents);
  const calendarRef = useRef<FullCalendar>(null);

  const handleEventClick = (clickInfo: EventClickArg) => {
    const { title, extendedProps } = clickInfo.event;
    const details = `
      Evento: ${title}
      Tipo: ${extendedProps.type}
      Disciplina: ${extendedProps.subject || 'N/A'}
      Professor: ${extendedProps.teacher || 'N/A'}
      Sala: ${extendedProps.room || 'N/A'}
    `;
    alert(`Detalhes do Evento:\n\n${details}`);
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
        />
      </div>
    </div>
  );
}
