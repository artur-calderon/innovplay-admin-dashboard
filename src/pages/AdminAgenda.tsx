import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, CalendarDays, Clock, Users, AlertCircle, BookOpen, Plus, Edit, Trash2, MapPin, School, Building } from "lucide-react";
import { format, addDays, addHours, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarApi } from "@/services/calendarApi";
import { toLocalOffsetISO } from "@/utils/date";
import { toast } from 'react-toastify';
import { api } from '@/lib/api';

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
  type: 'estado' | 'municipio' | 'escola' | 'serie' | 'turma';
}

// Conversor local removido (eventos vêm do backend já no formato do FullCalendar)

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
  // Opções dinâmicas (sem mocks)
  const [stateOptions, setStateOptions] = useState<ScopeOption[]>([]);
  const [cityOptions, setCityOptions] = useState<ScopeOption[]>([]);
  const [schoolOptions, setSchoolOptions] = useState<ScopeOption[]>([]);
  const [gradeOptions, setGradeOptions] = useState<ScopeOption[]>([]);
  const [classOptions, setClassOptions] = useState<ScopeOption[]>([]);
  const [fcEvents, setFcEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedScope, setSelectedScope] = useState<'estado' | 'municipio' | 'escola' | 'serie' | 'turma'>('estado');
  const [selectedScopeId, setSelectedScopeId] = useState<string>('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedEventForView, setSelectedEventForView] = useState<any | null>(null);
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
        return stateOptions;
      case 'municipio':
        return cityOptions;
      case 'escola':
        return schoolOptions;
      case 'serie':
        return gradeOptions;
      case 'turma':
        return classOptions;
      default:
        return [];
    }
  };

  // Carregar escolas (existe rota GET /school)
  useEffect(() => {
    const loadSchools = async () => {
      try {
        const res = await api.get('/school');
        const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setSchoolOptions(
          data.map((s: any) => ({ id: String(s.id), name: s.name || s.nome, type: 'escola' }))
        );
      } catch (_) {}
    };
    loadSchools();
  }, []);

  // Removido filtro local: backend já retorna a lista consolidada

  // Busca eventos do backend para preencher o FullCalendar
  const fetchEvents = useCallback(async (startISO: string, endISO: string) => {
    try {
      setIsLoading(true);
      const list = await CalendarApi.listEvents(startISO, endISO);
      setFcEvents(list);
    } catch (error) {
      // TODO: opcionalmente exibir toast de erro
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Callback para clique em data (criar novo evento)
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [createdEventTitle, setCreatedEventTitle] = useState<string>("");
  const [isRecipientsOpen, setIsRecipientsOpen] = useState(false);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [recipientsPage, setRecipientsPage] = useState(1);
  const [recipientsPerPage, setRecipientsPerPage] = useState(50);
  const [recipientsTotal, setRecipientsTotal] = useState(0);

  const loadRecipients = async (eventId: string, page = 1, perPage = 50) => {
    try {
      const data = await CalendarApi.listRecipients(eventId, page, perPage);
      setRecipients(data.items || []);
      setRecipientsPage(data.page || page);
      setRecipientsPerPage(data.per_page || perPage);
      setRecipientsTotal(data.total || 0);
      setIsRecipientsOpen(true);
    } catch (_) {
      toast.error('Não foi possível carregar os destinatários');
    }
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    if (!selectedScopeId) {
      setIsWarningOpen(true);
      // Limpar seleção no calendário
      selectInfo.view.calendar.unselect();
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

  // Clique em evento -> abre modal de visualização/ações
  const handleEventClick = (clickInfo: EventClickArg) => {
    const eventData = clickInfo.event;
    setSelectedEventForView({
      id: eventData.id,
      title: eventData.title,
      start: eventData.startStr,
      end: eventData.endStr,
      extendedProps: eventData.extendedProps || {},
    });
    setIsViewDialogOpen(true);
  };

  const refetchCurrentRange = async () => {
    const api = calendarRef.current?.getApi();
    if (api) {
      const view = api.view;
      const startISOView = new Date(view.activeStart).toISOString();
      const endISOView = new Date(view.activeEnd).toISOString();
      await fetchEvents(startISOView, endISOView);
    }
  };

  const handlePublishEvent = async (eventId: string) => {
    try {
      await CalendarApi.publishEvent(eventId);
      await refetchCurrentRange();
      setIsSuccessOpen(true);
      setCreatedEventTitle('Evento publicado');
      toast.success('Evento publicado');
    } catch (_) { toast.error('Erro ao publicar evento'); }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await CalendarApi.deleteEvent(eventId);
      setIsViewDialogOpen(false);
      await refetchCurrentRange();
      setIsSuccessOpen(true);
      setCreatedEventTitle('Evento removido');
      toast.success('Evento excluído');
    } catch (_) { toast.error('Erro ao excluir evento'); }
  };

  const getEventTypeColor = (type: AgendaEvent['type']) => {
    const colors = {
      aula: 'bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400',
      prova: 'bg-destructive/10 text-destructive',
      evento: 'bg-primary/10 text-primary',
      tarefa: 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-400',
      reuniao: 'bg-orange-100 dark:bg-orange-950/30 text-orange-800 dark:text-orange-400',
      feriado: 'bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400',
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

  const handleCreateEvent = async () => {
    const scopeOption = getScopeOptions().find(opt => opt.id === formData.scopeId);
    if (!scopeOption) return;

    // Mapear escopo para API
    const scopeMap: Record<string, 'CITY' | 'SCHOOL' | 'GRADE' | 'CLASS'> = {
      estado: 'CITY', // sem seleção de estado real por enquanto; manter CITY como aproximação
      municipio: 'CITY',
      escola: 'SCHOOL',
      serie: 'GRADE',
      turma: 'CLASS',
    };

    const visibility_scope = scopeMap[formData.scope] || 'SCHOOL';
    const targets = [{ target_type: visibility_scope, target_id: formData.scopeId }];

    // Converter datas para ISO com timezone local (assumindo America/Sao_Paulo)
    const tz = 'America/Sao_Paulo';
    const startISO = toLocalOffsetISO(new Date(formData.startTime));
    const endISO = toLocalOffsetISO(new Date(formData.endTime));

    try {
      const created = await CalendarApi.createEvent({
        title: formData.title,
        description: formData.description,
        location: formData.location,
        start_at: startISO,
        end_at: endISO,
        all_day: false,
        timezone: tz,
        visibility_scope,
        targets,
        is_published: true,
        recurrence_rule: null,
      });

      setIsCreateDialogOpen(false);
      resetForm();
      setCreatedEventTitle(created.title || 'Evento criado');
      setIsSuccessOpen(true);
      toast.success('Evento criado e publicado');

      // Refetch eventos no range atual
      const api = calendarRef.current?.getApi();
      if (api) {
        const view = api.view;
        const startISOView = new Date(view.activeStart).toISOString();
        const endISOView = new Date(view.activeEnd).toISOString();
        await fetchEvents(startISOView, endISOView);
      }
    } catch (e) {
      toast.error('Erro ao criar evento');
    }
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

  const handleUpdateEvent = async () => {
    if (!editingEvent) return;

    const scopeMap: Record<string, 'CITY' | 'SCHOOL' | 'GRADE' | 'CLASS'> = {
      estado: 'CITY',
      municipio: 'CITY',
      escola: 'SCHOOL',
      serie: 'GRADE',
      turma: 'CLASS',
    };

    const visibility_scope = scopeMap[formData.scope] || 'SCHOOL';
    const targets = [{ target_type: visibility_scope, target_id: formData.scopeId }];
    const tz = 'America/Sao_Paulo';
    const startISO = toLocalOffsetISO(new Date(formData.startTime));
    const endISO = toLocalOffsetISO(new Date(formData.endTime));

    try {
      await CalendarApi.updateEvent(editingEvent.id, {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        start_at: startISO,
        end_at: endISO,
        all_day: false,
        timezone: tz,
        visibility_scope,
        targets,
      });

      setIsEditDialogOpen(false);
      setEditingEvent(null);
      resetForm();
      await refetchCurrentRange();
      setIsSuccessOpen(true);
      setCreatedEventTitle('Evento atualizado');
    } catch (_) { toast.error('Erro ao atualizar evento'); }
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
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-800 dark:text-blue-400 mb-2">
            <AlertCircle className="h-5 w-5" />
            <span className="font-semibold">Em Desenvolvimento</span>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-400">
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
                    <SelectItem value="serie">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Série
                      </div>
                    </SelectItem>
                    <SelectItem value="turma">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Turma
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
                events={fcEvents}
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
                datesSet={(arg) => {
                  const startISO = new Date(arg.start).toISOString();
                  const endISO = new Date(arg.end).toISOString();
                  fetchEvents(startISO, endISO);
                }}
              />
          </div>
        </CardContent>
      </Card>

      {/* Dialog de visualização/ações */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedEventForView?.title || 'Evento'}</DialogTitle>
            <DialogDescription>
              {selectedEventForView?.extendedProps?.description || 'Sem descrição'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            {selectedEventForView?.extendedProps?.location && (
              <div>Local: {selectedEventForView.extendedProps.location}</div>
            )}
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Fechar</Button>
            {selectedEventForView && (
              <>
                <Button variant="secondary" onClick={() => {
                  setIsViewDialogOpen(false);
                  setEditingEvent({
                    id: selectedEventForView.id,
                    title: selectedEventForView.title,
                    description: selectedEventForView.extendedProps?.description || '',
                    type: 'evento',
                    startTime: new Date(selectedEventForView.start),
                    endTime: new Date(selectedEventForView.end || selectedEventForView.start),
                    location: selectedEventForView.extendedProps?.location || '',
                    teacher: '',
                    subject: '',
                    scope: 'escola',
                    scopeId: '',
                    scopeName: '',
                    createdBy: '',
                    createdAt: new Date(),
                  });
                  setFormData({
                    title: selectedEventForView.title,
                    description: selectedEventForView.extendedProps?.description || '',
                    type: 'evento',
                    startTime: selectedEventForView.start?.slice(0,16) || '',
                    endTime: selectedEventForView.end?.slice(0,16) || '',
                    location: selectedEventForView.extendedProps?.location || '',
                    teacher: '',
                    subject: '',
                    scope: 'escola',
                    scopeId: '',
                  });
                  setIsEditDialogOpen(true);
                }}>
                  <Edit className="h-4 w-4 mr-2" />Editar
                </Button>
                <Button onClick={() => handlePublishEvent(selectedEventForView.id)}>Publicar</Button>
                <Button variant="destructive" onClick={() => handleDeleteEvent(selectedEventForView.id)}>
                  <Trash2 className="h-4 w-4 mr-2" />Excluir
                </Button>
                <Button onClick={() => loadRecipients(selectedEventForView.id)}>Destinatários</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Aviso de seleção obrigatória */}
      <Dialog open={isWarningOpen} onOpenChange={setIsWarningOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Selecione o escopo e a entidade</DialogTitle>
            <DialogDescription>
              Para criar um evento, escolha primeiro o escopo (Estado, Município ou Escola) e a entidade correspondente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setIsWarningOpen(false)}>Entendi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de sucesso na criação */}
      <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Evento criado</DialogTitle>
            <DialogDescription>
              {createdEventTitle} foi criado com sucesso e publicado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setIsSuccessOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Destinatários do evento */}
      <Dialog open={isRecipientsOpen} onOpenChange={setIsRecipientsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Destinatários</DialogTitle>
            <DialogDescription>Usuários que receberam este evento</DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-auto space-y-2">
            {recipients.length === 0 && (
              <div className="text-sm text-muted-foreground">Nenhum destinatário encontrado</div>
            )}
            {recipients.map((r) => (
              <div key={`${r.user_id}`} className="flex items-center justify-between p-2 border rounded">
                <div className="text-sm">
                  <div className="font-medium">{r.user_id}</div>
                  <div className="text-muted-foreground">{r.role_snapshot}</div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {r.read_at ? `Lido: ${new Date(r.read_at).toLocaleString()}` : 'Não lido'}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-muted-foreground">
              Página {recipientsPage} de {Math.max(1, Math.ceil(recipientsTotal / recipientsPerPage))}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={recipientsPage <= 1 || !selectedEventForView}
                onClick={() => selectedEventForView && loadRecipients(selectedEventForView.id, recipientsPage - 1, recipientsPerPage)}
              >Anterior</Button>
              <Button
                variant="outline"
                disabled={recipientsPage >= Math.ceil(recipientsTotal / recipientsPerPage) || !selectedEventForView}
                onClick={() => selectedEventForView && loadRecipients(selectedEventForView.id, recipientsPage + 1, recipientsPerPage)}
              >Próxima</Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsRecipientsOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
