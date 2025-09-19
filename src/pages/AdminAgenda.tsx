import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Users, AlertCircle, BookOpen, Plus, Edit, Trash2, MapPin, School, Building } from "lucide-react";
import { format, addDays, addHours, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// FullCalendar imports
import FullCalendar from '@fullcalendar/react';
import { EventInput, DateSelectArg, EventClickArg, EventContentArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

// FullCalendar styles customizados
import '../styles/fullcalendar.css';

// Interface customizada para eventos do FullCalendar
interface CustomEventInput extends EventInput {
  extendedProps: {
    type: 'aula' | 'prova' | 'evento' | 'tarefa' | 'reuniao' | 'feriado';
    description?: string;
    location?: string;
    teacher?: string;
    subject?: string;
    scope: 'estado' | 'municipio' | 'escola';
    scopeId: string;
    scopeName: string;
    createdBy: string;
    createdAt: Date;
  };
}

// Interface para dados internos da aplicação
interface AgendaEvent {
  id: string;
  title: string;
  description: string;
  type: 'aula' | 'prova' | 'evento' | 'tarefa' | 'reuniao' | 'feriado';
  startTime: Date;
  endTime: Date;
  location?: string;
  teacher?: string;
  subject?: string;
  scope: 'estado' | 'municipio' | 'escola';
  scopeId: string;
  scopeName: string;
  createdBy: string;
  createdAt: Date;
}

interface ScopeOption {
  id: string;
  name: string;
  type: 'estado' | 'municipio' | 'escola';
}

// Função para converter AgendaEvent para CustomEventInput
const convertToCalendarEvent = (event: AgendaEvent): CustomEventInput => ({
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
    scope: event.scope,
    scopeId: event.scopeId,
    scopeName: event.scopeName,
    createdBy: event.createdBy,
    createdAt: event.createdAt,
  },
});

// Função para renderizar o conteúdo customizado dos eventos
function renderEventContent(eventInfo: EventContentArg) {
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
    case 'feriado':
      eventStyles = { bgColor: 'bg-emerald-600', borderColor: 'border-emerald-700', textColor: 'text-white' };
      break;
    case 'evento':
      eventStyles = { bgColor: 'bg-primary', borderColor: 'border-primary', textColor: 'text-primary-foreground' };
      break;
    case 'aula':
      eventStyles = { bgColor: 'bg-blue-600', borderColor: 'border-blue-700', textColor: 'text-white' };
      break;
    case 'reuniao':
      eventStyles = { bgColor: 'bg-violet-600', borderColor: 'border-violet-700', textColor: 'text-white' };
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
      {eventInfo.event.extendedProps.location && (
        <div className={`${isTimeGrid ? (isDayView ? 'text-xs sm:text-sm' : (isWeekView ? 'text-[8px] sm:text-[10px]' : 'text-[10px] sm:text-xs')) : (isMonthView ? 'text-[8px] sm:text-[10px]' : 'text-[10px] sm:text-xs')} opacity-75 truncate italic`}>
          {eventInfo.event.extendedProps.location}
        </div>
      )}
    </div>
  );
}

export default function AdminAgenda() {
  // Estados mockados
  const [mockStates] = useState<ScopeOption[]>([
    { id: '1', name: 'São Paulo', type: 'estado' },
    { id: '2', name: 'Rio de Janeiro', type: 'estado' },
    { id: '3', name: 'Minas Gerais', type: 'estado' },
  ]);

  const [mockCities] = useState<ScopeOption[]>([
    { id: '1', name: 'São Paulo - SP', type: 'municipio' },
    { id: '2', name: 'Santos - SP', type: 'municipio' },
    { id: '3', name: 'Campinas - SP', type: 'municipio' },
    { id: '4', name: 'Rio de Janeiro - RJ', type: 'municipio' },
    { id: '5', name: 'Niterói - RJ', type: 'municipio' },
  ]);

  const [mockSchools] = useState<ScopeOption[]>([
    { id: '1', name: 'E.E. Professor João Silva', type: 'escola' },
    { id: '2', name: 'E.E. Maria Santos', type: 'escola' },
    { id: '3', name: 'E.E. Carlos Alberto', type: 'escola' },
    { id: '4', name: 'E.E. Ana Paula', type: 'escola' },
  ]);

  // Eventos mockados
  const [mockEvents] = useState<AgendaEvent[]>([
    {
      id: '1',
      title: 'Reunião Pedagógica Estadual',
      description: 'Reunião para alinhamento das diretrizes pedagógicas do estado',
      type: 'reuniao',
      startTime: new Date(2024, 5, 15, 9, 0),
      endTime: new Date(2024, 5, 15, 12, 0),
      location: 'Secretaria de Educação - SP',
      scope: 'estado',
      scopeId: '1',
      scopeName: 'São Paulo',
      createdBy: 'Admin Sistema',
      createdAt: new Date(2024, 5, 1),
    },
    {
      id: '2',
      title: 'Prova SAEB Municipal',
      description: 'Aplicação da prova SAEB para todas as escolas do município',
      type: 'prova',
      startTime: new Date(2024, 5, 20, 8, 0),
      endTime: new Date(2024, 5, 20, 12, 0),
      scope: 'municipio',
      scopeId: '1',
      scopeName: 'São Paulo - SP',
      createdBy: 'Coordenador Regional',
      createdAt: new Date(2024, 5, 5),
    },
    {
      id: '3',
      title: 'Festa Junina Escolar',
      description: 'Festa junina da escola com apresentações dos alunos',
      type: 'evento',
      startTime: new Date(2024, 5, 24, 14, 0),
      endTime: new Date(2024, 5, 24, 18, 0),
      location: 'Pátio da Escola',
      scope: 'escola',
      scopeId: '1',
      scopeName: 'E.E. Professor João Silva',
      createdBy: 'Diretor da Escola',
      createdAt: new Date(2024, 5, 10),
    },
    {
      id: '4',
      title: 'Capacitação de Professores',
      description: 'Capacitação sobre novas metodologias de ensino',
      type: 'aula',
      startTime: new Date(2024, 5, 28, 8, 0),
      endTime: new Date(2024, 5, 28, 17, 0),
      location: 'Auditório Municipal',
      scope: 'municipio',
      scopeId: '2',
      scopeName: 'Santos - SP',
      createdBy: 'Coordenador Pedagógico',
      createdAt: new Date(2024, 5, 12),
    },
  ]);

  const [events, setEvents] = useState<AgendaEvent[]>(mockEvents);
  const [selectedScope, setSelectedScope] = useState<'estado' | 'municipio' | 'escola'>('estado');
  const [selectedScopeId, setSelectedScopeId] = useState<string>('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AgendaEvent | null>(null);
  const calendarRef = useRef<FullCalendar>(null);

  // Formulário para criar/editar evento
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'evento' as AgendaEvent['type'],
    startTime: '',
    endTime: '',
    location: '',
    teacher: '',
    subject: '',
    scope: 'estado' as AgendaEvent['scope'],
    scopeId: '',
  });

  const getScopeOptions = () => {
    switch (selectedScope) {
      case 'estado':
        return mockStates;
      case 'municipio':
        return mockCities;
      case 'escola':
        return mockSchools;
      default:
        return [];
    }
  };

  const getFilteredEvents = () => {
    if (!selectedScopeId) return events;
    return events.filter(event => 
      event.scope === selectedScope && event.scopeId === selectedScopeId
    );
  };

  // Converter eventos filtrados para o formato do FullCalendar
  const getCalendarEvents = (): CustomEventInput[] => {
    return getFilteredEvents().map(convertToCalendarEvent);
  };

  // Callback para clique em data (criar novo evento)
  const handleDateSelect = (selectInfo: DateSelectArg) => {
    if (!selectedScopeId) {
      alert('Por favor, selecione um escopo e entidade antes de criar eventos.');
      return;
    }

    const scopeOption = getScopeOptions().find(opt => opt.id === selectedScopeId);
    if (!scopeOption) return;

    // Preencher o formulário com os dados da data selecionada
    const startDate = new Date(selectInfo.start);
    const endDate = new Date(selectInfo.end);
    
    setFormData({
      title: '',
      description: '',
      type: 'evento',
      startTime: format(startDate, "yyyy-MM-dd'T'HH:mm"),
      endTime: format(endDate, "yyyy-MM-dd'T'HH:mm"),
      location: '',
      teacher: '',
      subject: '',
      scope: selectedScope,
      scopeId: selectedScopeId,
    });

    setIsCreateDialogOpen(true);
    
    // Limpar seleção no calendário
    selectInfo.view.calendar.unselect();
  };

  // Callback para clique em evento (visualizar/editar)
  const handleEventClick = (clickInfo: EventClickArg) => {
    const eventData = clickInfo.event;
    const extendedProps = eventData.extendedProps;
    
    const eventDetails = `
Evento: ${eventData.title}
Tipo: ${extendedProps.type}
Escopo: ${extendedProps.scopeName}
Local: ${extendedProps.location || 'N/A'}
Descrição: ${extendedProps.description || 'N/A'}
Criado por: ${extendedProps.createdBy}
    `;

    if (confirm(`${eventDetails}\n\nDeseja editar este evento?`)) {
      // Encontrar o evento original
      const originalEvent = events.find(e => e.id === eventData.id);
      if (originalEvent) {
        handleEditEvent(originalEvent);
      }
    }
  };

  const getEventTypeColor = (type: AgendaEvent['type']) => {
    const colors = {
      aula: 'bg-blue-100 text-blue-800',
      prova: 'bg-destructive/10 text-destructive',
      evento: 'bg-primary/10 text-primary',
      tarefa: 'bg-yellow-100 text-yellow-800',
      reuniao: 'bg-orange-100 text-orange-800',
      feriado: 'bg-green-100 text-green-800',
    };
    return colors[type] || 'bg-muted text-muted-foreground';
  };

  const getEventTypeIcon = (type: AgendaEvent['type']) => {
    const icons = {
      aula: BookOpen,
      prova: AlertCircle,
      evento: Calendar,
      tarefa: Clock,
      reuniao: Users,
      feriado: CalendarDays,
    };
    return icons[type] || Calendar;
  };

  const handleCreateEvent = () => {
    const scopeOption = getScopeOptions().find(opt => opt.id === formData.scopeId);
    if (!scopeOption) return;

    const newEvent: AgendaEvent = {
      id: Date.now().toString(),
      title: formData.title,
      description: formData.description,
      type: formData.type,
      startTime: new Date(formData.startTime),
      endTime: new Date(formData.endTime),
      location: formData.location,
      teacher: formData.teacher,
      subject: formData.subject,
      scope: formData.scope,
      scopeId: formData.scopeId,
      scopeName: scopeOption.name,
      createdBy: 'Usuário Atual',
      createdAt: new Date(),
    };

    setEvents([...events, newEvent]);
    setIsCreateDialogOpen(false);
    resetForm();
  };

  const handleEditEvent = (event: AgendaEvent) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description,
      type: event.type,
      startTime: format(event.startTime, "yyyy-MM-dd'T'HH:mm"),
      endTime: format(event.endTime, "yyyy-MM-dd'T'HH:mm"),
      location: event.location || '',
      teacher: event.teacher || '',
      subject: event.subject || '',
      scope: event.scope,
      scopeId: event.scopeId,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateEvent = () => {
    if (!editingEvent) return;

    const scopeOption = getScopeOptions().find(opt => opt.id === formData.scopeId);
    if (!scopeOption) return;

    const updatedEvent: AgendaEvent = {
      ...editingEvent,
      title: formData.title,
      description: formData.description,
      type: formData.type,
      startTime: new Date(formData.startTime),
      endTime: new Date(formData.endTime),
      location: formData.location,
      teacher: formData.teacher,
      subject: formData.subject,
      scope: formData.scope,
      scopeId: formData.scopeId,
      scopeName: scopeOption.name,
    };

    setEvents(events.map(e => e.id === editingEvent.id ? updatedEvent : e));
    setIsEditDialogOpen(false);
    setEditingEvent(null);
    resetForm();
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents(events.filter(e => e.id !== eventId));
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'evento',
      startTime: '',
      endTime: '',
      location: '',
      teacher: '',
      subject: '',
      scope: 'estado',
      scopeId: '',
    });
  };


  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">📅 Agenda Administrativa</h1>
        <p className="text-muted-foreground">
          Gerencie eventos por estado, município e escola
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-800 mb-2">
            <AlertCircle className="h-5 w-5" />
            <span className="font-semibold">Em Desenvolvimento</span>
          </div>
          <p className="text-sm text-blue-700">
            Esta funcionalidade está sendo desenvolvida. Os dados mostrados são exemplos para demonstrar 
            o futuro design da agenda administrativa.
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Escopo</CardTitle>
          <CardDescription>
            Selecione o escopo e a entidade para visualizar eventos específicos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scope">Escopo</Label>
              <Select value={selectedScope} onValueChange={(value: 'estado' | 'municipio' | 'escola') => {
                setSelectedScope(value);
                setSelectedScopeId('');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o escopo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="estado">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Estado
                    </div>
                  </SelectItem>
                  <SelectItem value="municipio">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Município
                    </div>
                  </SelectItem>
                  <SelectItem value="escola">
                    <div className="flex items-center gap-2">
                      <School className="h-4 w-4" />
                      Escola
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="scopeId">Entidade</Label>
              <Select value={selectedScopeId} onValueChange={setSelectedScopeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a entidade" />
                </SelectTrigger>
                <SelectContent>
                  {getScopeOptions().map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botão para criar evento */}
      <div className="flex justify-end">
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Evento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Novo Evento</DialogTitle>
              <DialogDescription>
                Preencha os dados do evento que será exibido para alunos e professores
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Título do evento"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo</Label>
                  <Select value={formData.type} onValueChange={(value: AgendaEvent['type']) => setFormData({...formData, type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aula">Aula</SelectItem>
                      <SelectItem value="prova">Prova</SelectItem>
                      <SelectItem value="evento">Evento</SelectItem>
                      <SelectItem value="tarefa">Tarefa</SelectItem>
                      <SelectItem value="reuniao">Reunião</SelectItem>
                      <SelectItem value="feriado">Feriado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Descrição do evento"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Data/Hora Início</Label>
                  <Input
                    id="startTime"
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">Data/Hora Fim</Label>
                  <Input
                    id="endTime"
                    type="datetime-local"
                    value={formData.endTime}
                    onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Local</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    placeholder="Local do evento"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scope">Escopo</Label>
                  <Select value={formData.scope} onValueChange={(value: AgendaEvent['scope']) => setFormData({...formData, scope: value, scopeId: ''})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="estado">Estado</SelectItem>
                      <SelectItem value="municipio">Município</SelectItem>
                      <SelectItem value="escola">Escola</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="scopeId">Entidade</Label>
                <Select value={formData.scopeId} onValueChange={(value) => setFormData({...formData, scopeId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a entidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {getScopeOptions().map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateEvent}>
                Criar Evento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Calendário de eventos */}
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold tracking-tight">
            📅 Calendário de Eventos {selectedScopeId ? `- ${getScopeOptions().find(opt => opt.id === selectedScopeId)?.name}` : ''}
          </CardTitle>
          {!selectedScopeId && (
            <CardDescription className="text-muted-foreground/80">
              Selecione um escopo e entidade para visualizar e criar eventos
            </CardDescription>
          )}
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
                events={getCalendarEvents()}
                editable={false}
                selectable={selectedScopeId !== ''}
                selectMirror={true}
                dayMaxEvents={false}
                dayMaxEventRows={6}
                moreLinkClick="popover"
                eventMinHeight={48}
                eventOrder="start,title"
                aspectRatio={1.2}
                moreLinkText="mais eventos"
                eventDisplay="block"
                eventOverlap={false}
                eventConstraint="businessHours"
                slotMinTime="06:00:00"
                slotMaxTime="23:00:00"
                slotDuration="01:00:00"
                slotLabelInterval="01:00:00"
                expandRows={true}
                nowIndicator={true}
                height="auto"
                contentHeight="auto"
                select={handleDateSelect}
                eventClick={handleEventClick}
                eventContent={renderEventContent}
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

      {/* Dialog de edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Evento</DialogTitle>
            <DialogDescription>
              Edite os dados do evento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Título</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Título do evento"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-type">Tipo</Label>
                <Select value={formData.type} onValueChange={(value: AgendaEvent['type']) => setFormData({...formData, type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aula">Aula</SelectItem>
                    <SelectItem value="prova">Prova</SelectItem>
                    <SelectItem value="evento">Evento</SelectItem>
                    <SelectItem value="tarefa">Tarefa</SelectItem>
                    <SelectItem value="reuniao">Reunião</SelectItem>
                    <SelectItem value="feriado">Feriado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Descrição do evento"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-startTime">Data/Hora Início</Label>
                <Input
                  id="edit-startTime"
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-endTime">Data/Hora Fim</Label>
                <Input
                  id="edit-endTime"
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-location">Local</Label>
                <Input
                  id="edit-location"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="Local do evento"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-scope">Escopo</Label>
                <Select value={formData.scope} onValueChange={(value: AgendaEvent['scope']) => setFormData({...formData, scope: value, scopeId: ''})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="estado">Estado</SelectItem>
                    <SelectItem value="municipio">Município</SelectItem>
                    <SelectItem value="escola">Escola</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-scopeId">Entidade</Label>
              <Select value={formData.scopeId} onValueChange={(value) => setFormData({...formData, scopeId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a entidade" />
                </SelectTrigger>
                <SelectContent>
                  {getScopeOptions().map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateEvent}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
