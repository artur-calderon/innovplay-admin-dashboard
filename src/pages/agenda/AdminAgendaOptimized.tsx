import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import { DateSelectArg, EventApi, EventClickArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import '@/styles/fullcalendar.css';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormMultiSelect, FormOption } from "@/components/ui/form-multi-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Edit, Trash2, AlertCircle, Calendar, Link2, Plus, Paperclip, Download, X } from 'lucide-react';
import { CalendarApi as CalendarService, type CalendarTargetsResponse, type CalendarTarget } from "@/services/calendarApi";
import { toLocalOffsetISO } from "@/utils/date";
import { toast } from 'react-toastify';
import { useAuth } from "@/context/authContext";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CustomEventInput extends EventInput {
  extendedProps: {
    description?: string;
    location?: string;
    [key: string]: any;
  };
}

interface EventLinkResource {
  id?: string;
  type: 'link';
  title: string;
  url: string;
  sort_order?: number;
}

interface EventFileResource {
  id: string;
  type: 'file';
  title: string;
  file_name?: string;
  mime_type?: string;
  size_bytes?: number;
  sort_order?: number;
}

function getEventClassNames(eventInfo: { event: EventApi }) {
  const type = eventInfo.event.extendedProps.type as string | undefined;
  return type ? [`fc-event-type-${type}`] : [];
}

export default function AdminAgendaOptimized() {
  const { user } = useAuth();
  const [currentEvents, setCurrentEvents] = useState<CustomEventInput[]>([]);
  const calendarRef = useRef<FullCalendar>(null);

  // Proteção contra eventos duplicados no FullCalendar (mobile)
  const lastOpenTimeRef = useRef<number>(0);

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [createdTitle, setCreatedTitle] = useState('');
  const [selected, setSelected] = useState<EventInput | null>(null);

  // Estados para targets da API
  const [targetsData, setTargetsData] = useState<CalendarTargetsResponse>({});
  const [isLoadingTargets, setIsLoadingTargets] = useState(false);

  // Estados separados para cada nível de seleção (agora arrays para múltiplos)
  const [selectedMunicipioIds, setSelectedMunicipioIds] = useState<string[]>([]);
  const [selectedEscolaIds, setSelectedEscolaIds] = useState<string[]>([]);
  const [selectedTurmaIds, setSelectedTurmaIds] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    startTime: '',
    endTime: '',
    allDay: false,
    scope: 'SCHOOL' as 'CITY' | 'SCHOOL' | 'GRADE' | 'CLASS' | 'USER',
    scopeId: '',
  });
  const [createLinkResources, setCreateLinkResources] = useState<EventLinkResource[]>([]);
  const [editLinkResources, setEditLinkResources] = useState<EventLinkResource[]>([]);
  const [pendingCreateFiles, setPendingCreateFiles] = useState<File[]>([]);
  const [pendingEditFiles, setPendingEditFiles] = useState<File[]>([]);

  const fetchEvents = useCallback(async (startISO: string, endISO: string) => {
    try {
      const list = await CalendarService.listEvents(startISO, endISO);
      setCurrentEvents(list as CustomEventInput[]);
    } catch (_) {
      toast.error('Não foi possível carregar os eventos');
    }
  }, []);

  // Carregar targets quando abrir o modal
  useEffect(() => {
    const loadTargets = async () => {
      if (!isCreateOpen && !isEditOpen) {
        resetTargetsForm();
        return;
      }

      setIsLoadingTargets(true);
      try {
        const data = await CalendarService.getTargets();
        setTargetsData(data);
      } catch (error) {
        console.error('Erro ao carregar targets:', error);
        toast.error('Erro ao carregar opções de destinatário');
      } finally {
        setIsLoadingTargets(false);
      }
    };

    loadTargets();
  }, [isCreateOpen, isEditOpen]);

  // Resetar formulário de targets
  const resetTargetsForm = () => {
    setSelectedMunicipioIds([]);
    setSelectedEscolaIds([]);
    setSelectedTurmaIds([]);
    setTargetsData({});
  };

  // Filtrar escolas baseado nos municípios selecionados usando city_id diretamente
  const filteredEscolas = useMemo(() => {
    if (!targetsData.escolas || targetsData.escolas.length === 0) {
      return [];
    }

    // Se não há municípios selecionados, mostrar todas as escolas
    if (selectedMunicipioIds.length === 0) {
      return targetsData.escolas;
    }

    // Filtrar escolas que pertencem a qualquer um dos municípios selecionados
    return targetsData.escolas.filter(escola =>
      escola.city_id && selectedMunicipioIds.includes(escola.city_id)
    );
  }, [targetsData.escolas, selectedMunicipioIds]);

  // Filtrar turmas baseado nos municípios e escolas selecionados
  const filteredTurmas = useMemo(() => {
    if (!targetsData.turmas || targetsData.turmas.length === 0) {
      return [];
    }

    let turmas = targetsData.turmas;

    // Se há escolas selecionadas, filtrar por escolas (prioridade)
    if (selectedEscolaIds.length > 0) {
      turmas = turmas.filter(t => t.escola_id && selectedEscolaIds.includes(t.escola_id));
    }
    // Se há municípios selecionados mas não há escolas, filtrar por municípios
    else if (selectedMunicipioIds.length > 0) {
      // Obter IDs de escolas dos municípios selecionados usando city_id
      const escolasDosMunicipios = targetsData.escolas?.filter(e =>
        e.city_id && selectedMunicipioIds.includes(e.city_id)
      ) || [];
      const escolasIds = new Set(escolasDosMunicipios.map(e => e.id));

      // Filtrar turmas de escolas dos municípios
      turmas = turmas.filter(t => t.escola_id && escolasIds.has(t.escola_id));
    }

    return turmas;
  }, [targetsData.turmas, targetsData.escolas, selectedEscolaIds, selectedMunicipioIds]);


  // Construir targets para a API baseado nos targets selecionados (múltiplos)
  const buildEventTargets = (): {
    visibility_scope: 'MUNICIPALITY' | 'SCHOOL' | 'GRADE' | 'CLASS' | 'USER';
    targets: Array<{ target_type: 'ALL' | 'MUNICIPALITY' | 'SCHOOL' | 'GRADE' | 'CLASS' | 'USER'; target_id?: string }>;
  } => {
    if (user?.role === 'aluno' && user?.id) {
      return {
        visibility_scope: 'USER',
        targets: [{ target_type: 'USER', target_id: user.id }],
      };
    }

    // Prioridade: Turmas > Escolas > Municípios

    // Se há turmas selecionadas, usar apenas turmas
    if (selectedTurmaIds.length > 0) {
      const turmasSelecionadas = targetsData.turmas?.filter(t =>
        selectedTurmaIds.includes(t.id)
      ) || [];

      if (turmasSelecionadas.length > 0) {
        return {
          visibility_scope: 'CLASS',
          targets: turmasSelecionadas.map(turma => ({
            target_type: 'CLASS' as const,
            target_id: turma.id
          }))
        };
      }
    }

    // Se há escolas selecionadas (e não é professor), usar apenas escolas
    if (selectedEscolaIds.length > 0 && user?.role !== 'professor') {
      const escolasSelecionadas = targetsData.escolas?.filter(e =>
        selectedEscolaIds.includes(e.id)
      ) || [];

      if (escolasSelecionadas.length > 0) {
        return {
          visibility_scope: 'SCHOOL',
          targets: escolasSelecionadas.map(escola => ({
            target_type: 'SCHOOL' as const,
            target_id: escola.id
          }))
        };
      }
    }

    // Para Diretor/Coordenador: se não há turmas selecionadas mas há turmas disponíveis,
    // significa que quer enviar para toda a escola
    // Neste caso, precisamos obter a escola_id das turmas disponíveis
    if ((user?.role === 'diretor' || user?.role === 'coordenador') &&
      selectedTurmaIds.length === 0 &&
      targetsData.turmas &&
      targetsData.turmas.length > 0) {
      // Obter escola_id das turmas disponíveis (devem ser todas da mesma escola)
      const escolaIds = new Set(
        targetsData.turmas
          .map(t => t.escola_id)
          .filter((id): id is string => !!id)
      );

      // Se há apenas uma escola, enviar para ela
      if (escolaIds.size === 1) {
        const escolaId = Array.from(escolaIds)[0];
        return {
          visibility_scope: 'SCHOOL',
          targets: [{
            target_type: 'SCHOOL' as const,
            target_id: escolaId
          }]
        };
      }
    }

    // Se há municípios selecionados, usar municípios
    if (selectedMunicipioIds.length > 0) {
      const municipiosSelecionados = targetsData.municipios?.filter(m =>
        selectedMunicipioIds.includes(m.id)
      ) || [];

      if (municipiosSelecionados.length > 0) {
        return {
          visibility_scope: 'MUNICIPALITY',
          targets: municipiosSelecionados.map(municipio => ({
            target_type: 'MUNICIPALITY' as const,
            target_id: municipio.id
          }))
        };
      }
    }

    if (user?.role === 'admin' || user?.role === 'tecadm') {
      return {
        visibility_scope: 'MUNICIPALITY',
        targets: [{ target_type: 'ALL' }],
      };
    }

    throw new Error('Nenhum target selecionado');
  };

  // Validar formulário
  const validateEventForm = (): boolean => {
    if (!formData.title.trim()) {
      toast.error('Título é obrigatório');
      return false;
    }

    if (!formData.startTime || !formData.endTime) {
      toast.error('Data de início e fim são obrigatórias');
      return false;
    }

    // Validar que professor só pode selecionar turmas (CLASS)
    if (user?.role === 'professor') {
      if (selectedTurmaIds.length === 0) {
        toast.error('Professores só podem criar eventos para turmas específicas. Selecione pelo menos uma turma.');
        return false;
      }
    }
    // Para Diretor/Coordenador: pode não selecionar turmas (enviará para toda a escola)
    // ou selecionar turmas específicas
    else if (user?.role === 'diretor' || user?.role === 'coordenador') {
      // Não precisa validar - se não há turmas selecionadas, enviará para toda a escola
      // Se há turmas selecionadas, enviará apenas para essas turmas
    }
    // Para outros roles (Admin, Tecadm), deve ter pelo menos um target selecionado
    else if (user?.role !== 'admin' && user?.role !== 'tecadm') {
      if (selectedTurmaIds.length === 0 && selectedEscolaIds.length === 0 && selectedMunicipioIds.length === 0) {
        toast.error('Selecione pelo menos um destinatário');
        return false;
      }
    }

    return true;
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    // Proteção contra eventos duplicados no mobile (debounce de 300ms)
    const now = Date.now();
    if (now - lastOpenTimeRef.current < 300) {
      return;
    }

    lastOpenTimeRef.current = now;

    const start = new Date(selectInfo.start);
    const end = new Date(selectInfo.end);
    setFormData((f) => ({
      ...f,
      title: '',
      description: '',
      location: '',
      startTime: start.toISOString().slice(0, 16),
      endTime: end.toISOString().slice(0, 16),
      allDay: !!selectInfo.allDay,
    }));

    setIsCreateOpen(true);
    selectInfo.view.calendar.unselect();
  };

  // Handler para dateClick (fallback para mobile onde select pode não funcionar)
  const handleDateClick = (clickInfo: DateClickArg) => {
    // Proteção contra eventos duplicados no mobile (debounce de 300ms)
    const now = Date.now();
    if (now - lastOpenTimeRef.current < 300) {
      return;
    }

    lastOpenTimeRef.current = now;

    // Criar um intervalo de 1 dia (início e fim do mesmo dia)
    const start = new Date(clickInfo.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(clickInfo.date);
    end.setHours(23, 59, 59, 999);

    setFormData((f) => ({
      ...f,
      title: '',
      description: '',
      location: '',
      startTime: start.toISOString().slice(0, 16),
      endTime: end.toISOString().slice(0, 16),
      allDay: clickInfo.allDay,
    }));

    setIsCreateOpen(true);
  };

  // Helper para verificar se a string de data contém informação de hora
  const hasTimeInfo = (dateStr: string | undefined): boolean => {
    if (!dateStr) return false;
    // Verifica se contém 'T' (formato ISO) ou ':' (formato de hora)
    return dateStr.includes('T') || (dateStr.includes(':') && dateStr.length > 10);
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
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
  };

  const refetchCurrentRange = async () => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    const view = api.view;
    await fetchEvents(new Date(view.activeStart).toISOString(), new Date(view.activeEnd).toISOString());
  };

  const createEvent = async () => {
    if (!validateEventForm()) return;

    const { visibility_scope, targets } = buildEventTargets();

    try {
      const startISO = toLocalOffsetISO(new Date(formData.startTime));
      const endISO = toLocalOffsetISO(new Date(formData.endTime));

      // Verificar se há hora nos campos (se contém 'T' e ':' após a data)
      const hasTimeInStart = hasTimeInfo(formData.startTime);
      const hasTimeInEnd = hasTimeInfo(formData.endTime);
      const hasTime = hasTimeInStart || hasTimeInEnd;

      // Se houver hora, forçar all_day: false
      const allDayValue = hasTime ? false : !!formData.allDay;

      const created = await CalendarService.createEvent({
        title: formData.title,
        description: formData.description,
        location: formData.location,
        start_at: startISO,
        end_at: endISO,
        all_day: allDayValue,
        timezone: 'America/Sao_Paulo',
        visibility_scope,
        targets,
        resources: createLinkResources
          .filter((item) => item.title.trim() && item.url.trim())
          .map((item, index) => ({
            id: item.id,
            type: 'link',
            title: item.title.trim(),
            url: item.url.trim(),
            sort_order: index,
          })),
        is_published: true,
        recurrence_rule: null,
      });

      if (pendingCreateFiles.length > 0 && created.id) {
        for (let i = 0; i < pendingCreateFiles.length; i += 1) {
          const file = pendingCreateFiles[i];
          await CalendarService.uploadEventFileResource(String(created.id), {
            file,
            title: file.name,
            sort_order: i,
          });
        }
      }

      setIsCreateOpen(false);
      resetTargetsForm();
      setCreateLinkResources([]);
      setPendingCreateFiles([]);
      setFormData({
        title: '',
        description: '',
        location: '',
        startTime: '',
        endTime: '',
        allDay: false,
        scope: 'SCHOOL',
        scopeId: '',
      });
      setCreatedTitle(created.title || 'Evento criado');
      setIsSuccessOpen(true);
      await refetchCurrentRange();
      toast.success('Evento criado e publicado');
    } catch (error) {
      console.error('Erro ao criar evento:', error);
      toast.error('Erro ao criar evento');
    }
  };

  const openEditFromSelected = () => {
    if (!selected) return;
    const eventTargets = Array.isArray(selected.extendedProps?.targets)
      ? selected.extendedProps.targets
      : [];
    const eventResources = Array.isArray(selected.extendedProps?.resources)
      ? selected.extendedProps.resources
      : [];
    const linkResources = eventResources.filter((r: any) => r?.type === 'link');
    setSelectedMunicipioIds(
      eventTargets
        .filter((t: any) => t?.target_type === 'MUNICIPALITY' && t?.target_id)
        .map((t: any) => String(t.target_id))
    );
    setSelectedEscolaIds(
      eventTargets
        .filter((t: any) => t?.target_type === 'SCHOOL' && t?.target_id)
        .map((t: any) => String(t.target_id))
    );
    setSelectedTurmaIds(
      eventTargets
        .filter((t: any) => t?.target_type === 'CLASS' && t?.target_id)
        .map((t: any) => String(t.target_id))
    );
    setFormData({
      title: String(selected.title || ''),
      description: selected.extendedProps?.description || '',
      location: selected.extendedProps?.location || '',
      startTime: (selected.start as string)?.slice(0, 16) || '',
      endTime: (selected.end as string)?.slice(0, 16) || '',
      allDay: !!selected.allDay,
      scope: 'SCHOOL',
      scopeId: '',
    });
    setEditLinkResources(
      linkResources.map((link: any, index: number) => ({
        id: link.id,
        type: 'link',
        title: String(link.title || ''),
        url: String(link.url || ''),
        sort_order: typeof link.sort_order === 'number' ? link.sort_order : index,
      }))
    );
    setPendingEditFiles([]);
    setIsEditOpen(true);
  };

  const updateEvent = async () => {
    if (!selected?.id) return;
    try {
      const startISO = toLocalOffsetISO(new Date(formData.startTime));
      const endISO = toLocalOffsetISO(new Date(formData.endTime));

      // Verificar se há hora nos campos
      const hasTimeInStart = hasTimeInfo(formData.startTime);
      const hasTimeInEnd = hasTimeInfo(formData.endTime);
      const hasTime = hasTimeInStart || hasTimeInEnd;

      // Se houver hora, forçar all_day: false
      const allDayValue = hasTime ? false : !!formData.allDay;
      const { visibility_scope, targets } = buildEventTargets();

      await CalendarService.updateEvent(String(selected.id), {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        start_at: startISO,
        end_at: endISO,
        all_day: allDayValue,
        timezone: 'America/Sao_Paulo',
        visibility_scope,
        targets,
        resources: editLinkResources
          .filter((item) => item.title.trim() && item.url.trim())
          .map((item, index) => ({
            id: item.id,
            type: 'link',
            title: item.title.trim(),
            url: item.url.trim(),
            sort_order: index,
          })),
      });

      if (pendingEditFiles.length > 0) {
        for (let i = 0; i < pendingEditFiles.length; i += 1) {
          const file = pendingEditFiles[i];
          await CalendarService.uploadEventFileResource(String(selected.id), {
            file,
            title: file.name,
            sort_order: i,
          });
        }
      }
      setIsEditOpen(false);
      setIsViewOpen(false);
      setPendingEditFiles([]);
      await refetchCurrentRange();
      toast.success('Evento atualizado');
    } catch (_) { toast.error('Erro ao atualizar evento'); }
  };

  const getSelectedResources = () => {
    const resources = Array.isArray(selected?.extendedProps?.resources)
      ? selected?.extendedProps?.resources
      : [];
    return resources;
  };

  const selectedResources = getSelectedResources();
  const selectedLinkResources = selectedResources.filter((item: any) => item?.type === 'link');
  const selectedFileResources = selectedResources.filter((item: any) => item?.type === 'file') as EventFileResource[];

  const addLinkResource = (isEdit = false) => {
    const newItem: EventLinkResource = { type: 'link', title: '', url: '' };
    if (isEdit) {
      setEditLinkResources((prev) => [...prev, newItem]);
      return;
    }
    setCreateLinkResources((prev) => [...prev, newItem]);
  };

  const updateLinkResource = (index: number, field: 'title' | 'url', value: string, isEdit = false) => {
    const setter = isEdit ? setEditLinkResources : setCreateLinkResources;
    setter((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  };

  const removeLinkResource = (index: number, isEdit = false) => {
    const setter = isEdit ? setEditLinkResources : setCreateLinkResources;
    setter((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleDownloadFileResource = async (eventId: string, resourceId: string) => {
    try {
      const data = await CalendarService.getEventResourceDownloadUrl(eventId, resourceId);
      window.open(data.download_url, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Não foi possível gerar o link de download');
    }
  };

  const handleDeleteResource = async (eventId: string, resourceId: string) => {
    try {
      await CalendarService.deleteEventResource(eventId, resourceId);
      toast.success('Recurso removido');
      await refetchCurrentRange();
      const refreshed = await CalendarService.getEvent(eventId);
      setSelected(refreshed);
    } catch {
      toast.error('Não foi possível remover o recurso');
    }
  };

  const publishEvent = async () => {
    if (!selected?.id) return;
    try {
      await CalendarService.publishEvent(String(selected.id));
      await refetchCurrentRange();
      toast.success('Evento publicado');
    } catch (_) { toast.error('Erro ao publicar evento'); }
  };

  const deleteEvent = async () => {
    if (!selected?.id) return;
    try {
      await CalendarService.deleteEvent(String(selected.id));
      setIsViewOpen(false);
      await refetchCurrentRange();
      toast.success('Evento excluído');
    } catch (_) { toast.error('Erro ao excluir evento'); }
  };

  return (
    <div className="p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 mb-2">
          <Calendar className="w-8 h-8 text-primary" />
          Agenda Administrativa
        </h1>
        <p className="text-muted-foreground">Gerencie eventos e atividades da instituição</p>
      </div>

      <div className="bg-card rounded-lg shadow-sm border border-border">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
          }}
          initialView="dayGridMonth"
          locale={ptBrLocale}
          weekends={true}
          events={currentEvents}
          editable={true}
          selectable={true}
          selectMirror={true}

          // --- CONFIGURAÇÃO DE TAMANHO E EVENTOS ---
          height="auto"
          dayMaxEvents={3}
          dayMaxEventRows={2}
          moreLinkClick="popover"
          moreLinkText="mais eventos"
          dayPopoverFormat={{ month: 'long', day: 'numeric', weekday: 'long' }}
          eventMaxStack={3}
          eventOverlap={false}

          select={handleDateSelect}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          eventClassNames={getEventClassNames}
          eventMinHeight={48}
          eventOrder="start,title"
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          slotDuration="01:00:00"
          slotLabelInterval="01:00:00"
          expandRows={true}
          nowIndicator={true}
          datesSet={(arg) => {
            fetchEvents(new Date(arg.start).toISOString(), new Date(arg.end).toISOString());
          }}
        />
      </div>

      {/* Criar evento */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => {
        setIsCreateOpen(open);

        if (!open) {
          resetTargetsForm();
          setCreateLinkResources([]);
          setPendingCreateFiles([]);
          setFormData({
            title: '',
            description: '',
            location: '',
            startTime: '',
            endTime: '',
            allDay: false,
            scope: 'SCHOOL',
            scopeId: '',
          });
        }
      }}>
        <DialogContent
          className="max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full !top-[50%] !left-[50%] !translate-x-[-50%] !translate-y-[-50%]"
          onInteractOutside={(e) => {
            // No mobile, prevenir fechamento acidental por toque fora
            const isMobile = window.innerWidth < 640;
            if (isMobile) {
              e.preventDefault();
            }
          }}
          onEscapeKeyDown={(e) => {
            // No mobile, prevenir fechamento por ESC
            const isMobile = window.innerWidth < 640;
            if (isMobile) {
              e.preventDefault();
            }
          }}
          onPointerDownOutside={(e) => {
            // No mobile, prevenir fechamento por pointer down
            const isMobile = window.innerWidth < 640;
            if (isMobile) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Criar Novo Evento</DialogTitle>
            <DialogDescription>Preencha os dados do evento que será exibido para alunos e professores</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Título do evento" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Descrição do evento" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start">Data/Hora Início</Label>
                <Input id="start" type="datetime-local" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end">Data/Hora Fim</Label>
                <Input id="end" type="datetime-local" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Local</Label>
              <Input id="location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="Local do evento" />
            </div>
            <div className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Links do evento
                </Label>
                <Button type="button" variant="outline" size="sm" onClick={() => addLinkResource(false)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar link
                </Button>
              </div>
              {createLinkResources.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum link adicionado.</p>
              )}
              {createLinkResources.map((resource, index) => (
                <div key={`create-link-${index}`} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
                  <Input
                    placeholder="Título do link"
                    value={resource.title}
                    onChange={(e) => updateLinkResource(index, 'title', e.target.value, false)}
                  />
                  <Input
                    placeholder="https://..."
                    value={resource.url}
                    onChange={(e) => updateLinkResource(index, 'url', e.target.value, false)}
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeLinkResource(index, false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="space-y-2 p-4 border rounded-lg">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Arquivos
              </Label>
              <Input
                type="file"
                multiple
                onChange={(e) => setPendingCreateFiles(Array.from(e.target.files || []))}
              />
              {pendingCreateFiles.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {pendingCreateFiles.length} arquivo(s) serão enviados após criar o evento.
                </p>
              )}
            </div>

            {/* Seção de Destinatários */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted">
              <Label className="text-base font-semibold">Destinatário</Label>

              {isLoadingTargets ? (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 animate-spin" />
                  Carregando opções...
                </div>
              ) : (
                <>
                  {(!targetsData.municipios && !targetsData.escolas && !targetsData.turmas) ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Nenhuma opção de destinatário disponível. Verifique suas permissões.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-4">
                      {/* Municípios - Apenas Admin pode selecionar múltiplos municípios */}
                      {targetsData.municipios && targetsData.municipios.length > 0 && user?.role === 'admin' && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Município(s)</label>
                          <FormMultiSelect
                            options={targetsData.municipios.map(m => ({ id: m.id, name: m.nome }))}
                            selected={selectedMunicipioIds}
                            onChange={(values) => {
                              setSelectedMunicipioIds(values);
                              // Limpar seleções de níveis inferiores quando selecionar municípios
                              setSelectedEscolaIds([]);
                              setSelectedTurmaIds([]);
                            }}
                            placeholder={selectedMunicipioIds.length === 0 ? "Selecione município(s)" : `${selectedMunicipioIds.length} selecionado(s)`}
                          />
                          {selectedMunicipioIds.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {selectedMunicipioIds.length} município{selectedMunicipioIds.length !== 1 ? 's' : ''} selecionado{selectedMunicipioIds.length !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Escolas - Admin e Tecadm podem selecionar múltiplas escolas */}
                      {targetsData.escolas && targetsData.escolas.length > 0 && (user?.role === 'admin' || user?.role === 'tecadm') && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Escola(s)
                            {user?.role === 'professor' && <span className="text-muted-foreground text-xs ml-2">(selecione para filtrar turmas)</span>}
                          </label>
                          <FormMultiSelect
                            options={filteredEscolas.map(e => ({
                              id: e.id,
                              name: e.municipio_nome ? `${e.nome} (${e.municipio_nome})` : e.nome
                            }))}
                            selected={selectedEscolaIds}
                            onChange={(values) => {
                              setSelectedEscolaIds(values);
                              // Limpar apenas seleção de turmas quando mudar escolas
                              setSelectedTurmaIds([]);
                              // NÃO limpar municípios - manter seleção
                            }}
                            placeholder={
                              filteredEscolas.length === 0
                                ? (selectedMunicipioIds.length > 0
                                  ? "Nenhuma escola disponível para os municípios selecionados"
                                  : "Nenhuma escola disponível")
                                : (selectedEscolaIds.length === 0
                                  ? "Selecione escola(s)"
                                  : `${selectedEscolaIds.length} selecionada(s)`)
                            }
                            className={filteredEscolas.length === 0 ? "opacity-50" : ""}
                          />
                          {selectedMunicipioIds.length > 0 && filteredEscolas.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {filteredEscolas.length} escola{filteredEscolas.length !== 1 ? 's' : ''} disponível{filteredEscolas.length !== 1 ? 'eis' : ''} para os municípios selecionados
                            </p>
                          )}
                          {selectedEscolaIds.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {selectedEscolaIds.length} escola{selectedEscolaIds.length !== 1 ? 's' : ''} selecionada{selectedEscolaIds.length !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Escolas - Professor: Select simples apenas para filtrar turmas */}
                      {targetsData.escolas && targetsData.escolas.length > 0 && user?.role === 'professor' && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Escola <span className="text-muted-foreground text-xs ml-2">(selecione para filtrar turmas)</span>
                          </label>
                          <Select
                            value={selectedEscolaIds[0] || ''}
                            onValueChange={(value) => {
                              setSelectedEscolaIds(value ? [value] : []);
                              // Limpar seleção de turmas quando mudar escola
                              setSelectedTurmaIds([]);
                            }}
                            disabled={isLoadingTargets || filteredEscolas.length === 0}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma escola para filtrar turmas" />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredEscolas.length > 0 ? (
                                filteredEscolas.map(escola => (
                                  <SelectItem key={escola.id} value={escola.id}>
                                    {escola.nome}
                                    {escola.municipio_nome && ` (${escola.municipio_nome})`}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no-schools" disabled>
                                  Nenhuma escola disponível
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Escolas - Diretor/Coordenador: não mostra (só vê turmas da sua escola) */}

                      {/* Turmas - Todos os roles podem selecionar múltiplas turmas */}
                      {targetsData.turmas && targetsData.turmas.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Turma(s)
                            {(user?.role === 'diretor' || user?.role === 'coordenador') && (
                              <span className="text-muted-foreground text-xs ml-2">
                                (deixe vazio para enviar para toda a escola)
                              </span>
                            )}
                          </label>
                          <FormMultiSelect
                            options={filteredTurmas.map(t => ({
                              id: t.id,
                              name: `${t.nome}${t.serie_nome ? ` - ${t.serie_nome}` : ''}${t.escola_nome ? ` (${t.escola_nome})` : ''}`
                            }))}
                            selected={selectedTurmaIds}
                            onChange={(values) => {
                              setSelectedTurmaIds(values);
                              // NÃO limpar seleções de níveis superiores - manter municípios e escolas
                            }}
                            placeholder={
                              filteredTurmas.length === 0
                                ? (user?.role === 'professor' && selectedEscolaIds.length === 0
                                  ? "Selecione uma escola primeiro"
                                  : selectedMunicipioIds.length > 0 && selectedEscolaIds.length === 0
                                    ? "Selecione uma escola primeiro"
                                    : "Nenhuma turma disponível")
                                : (selectedTurmaIds.length === 0
                                  ? (user?.role === 'diretor' || user?.role === 'coordenador'
                                    ? "Selecione turma(s) ou deixe vazio para toda a escola"
                                    : "Selecione turma(s)")
                                  : `${selectedTurmaIds.length} selecionada(s)`)
                            }
                            className={filteredTurmas.length === 0 ? "opacity-50" : ""}
                          />
                          {user?.role === 'professor' && selectedEscolaIds.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                              Selecione uma escola primeiro para filtrar as turmas
                            </p>
                          )}
                          {selectedMunicipioIds.length > 0 && selectedEscolaIds.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                              Selecione uma escola para ver as turmas disponíveis
                            </p>
                          )}
                          {filteredTurmas.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {filteredTurmas.length} turma{filteredTurmas.length !== 1 ? 's' : ''} disponível{filteredTurmas.length !== 1 ? 'eis' : ''}
                              {selectedTurmaIds.length > 0 && ` • ${selectedTurmaIds.length} selecionada(s)`}
                              {(user?.role === 'diretor' || user?.role === 'coordenador') && selectedTurmaIds.length === 0 && (
                                <span className="block mt-1">• Se nenhuma turma for selecionada, o evento será enviado para toda a escola</span>
                              )}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Mostrar targets selecionados */}
                      {(selectedTurmaIds.length > 0 || selectedEscolaIds.length > 0 || selectedMunicipioIds.length > 0) && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="space-y-1">
                              <div>
                                <strong>Destinatários selecionados:</strong>
                              </div>
                              {selectedTurmaIds.length > 0 && (
                                <div className="text-sm">
                                  <strong>Turmas ({selectedTurmaIds.length}):</strong>{' '}
                                  {targetsData.turmas
                                    ?.filter(t => selectedTurmaIds.includes(t.id))
                                    .map(t => t.nome)
                                    .join(', ') || 'Nenhuma'}
                                </div>
                              )}
                              {selectedEscolaIds.length > 0 && user?.role !== 'professor' && (
                                <div className="text-sm">
                                  <strong>Escolas ({selectedEscolaIds.length}):</strong>{' '}
                                  {targetsData.escolas
                                    ?.filter(e => selectedEscolaIds.includes(e.id))
                                    .map(e => e.nome)
                                    .join(', ') || 'Nenhuma'}
                                </div>
                              )}
                              {selectedMunicipioIds.length > 0 && (
                                <div className="text-sm">
                                  <strong>Municípios ({selectedMunicipioIds.length}):</strong>{' '}
                                  {targetsData.municipios
                                    ?.filter(m => selectedMunicipioIds.includes(m.id))
                                    .map(m => m.nome)
                                    .join(', ') || 'Nenhum'}
                                </div>
                              )}
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
            <Button onClick={createEvent}>Criar Evento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Visualizar evento */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-lg w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>{selected?.title || 'Evento'}</DialogTitle>
            <DialogDescription>{selected?.extendedProps?.description || 'Sem descrição'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            {selected?.extendedProps?.location && (
              <div>
                <strong>Local:</strong> {selected.extendedProps.location}
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
            {selectedLinkResources.length > 0 && (
              <div className="space-y-2 pt-2">
                <strong>Links:</strong>
                <div className="space-y-1">
                  {selectedLinkResources.map((resource: any) => (
                    <a
                      key={resource.id || resource.url}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline block"
                    >
                      {resource.title || resource.url}
                    </a>
                  ))}
                </div>
              </div>
            )}
            {selectedFileResources.length > 0 && (
              <div className="space-y-2 pt-2">
                <strong>Arquivos:</strong>
                <div className="space-y-2">
                  {selectedFileResources.map((resource) => (
                    <div key={resource.id} className="flex items-center justify-between gap-2">
                      <span className="truncate">{resource.title || resource.file_name || 'Arquivo'}</span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => selected?.id && handleDownloadFileResource(String(selected.id), resource.id)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => selected?.id && handleDeleteResource(String(selected.id), resource.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>Fechar</Button>
            <Button variant="secondary" onClick={openEditFromSelected}><Edit className="h-4 w-4 mr-2" />Editar</Button>
            <Button onClick={publishEvent}>Publicar</Button>
            <Button variant="destructive" onClick={deleteEvent}><Trash2 className="h-4 w-4 mr-2" />Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editar evento */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>Editar Evento</DialogTitle>
            <DialogDescription>Atualize os dados do evento</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Título</Label>
                <Input id="edit-title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea id="edit-description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-start">Início</Label>
                <Input id="edit-start" type="datetime-local" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-end">Fim</Label>
                <Input id="edit-end" type="datetime-local" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-location">Local</Label>
              <Input id="edit-location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
            </div>

            {/* Seção de Destinatários (edição) */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted">
              <Label className="text-base font-semibold">Destinatário</Label>

              {isLoadingTargets ? (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 animate-spin" />
                  Carregando opções...
                </div>
              ) : (
                <>
                  {(!targetsData.municipios && !targetsData.escolas && !targetsData.turmas) ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Nenhuma opção de destinatário disponível. Verifique suas permissões.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-4">
                      {targetsData.municipios && targetsData.municipios.length > 0 && user?.role === 'admin' && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Município(s)</label>
                          <FormMultiSelect
                            options={targetsData.municipios.map(m => ({ id: m.id, name: m.nome }))}
                            selected={selectedMunicipioIds}
                            onChange={(values) => {
                              setSelectedMunicipioIds(values);
                              setSelectedEscolaIds([]);
                              setSelectedTurmaIds([]);
                            }}
                            placeholder={selectedMunicipioIds.length === 0 ? "Selecione município(s)" : `${selectedMunicipioIds.length} selecionado(s)`}
                          />
                        </div>
                      )}

                      {targetsData.escolas && targetsData.escolas.length > 0 && (user?.role === 'admin' || user?.role === 'tecadm') && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Escola(s)</label>
                          <FormMultiSelect
                            options={filteredEscolas.map(e => ({
                              id: e.id,
                              name: e.municipio_nome ? `${e.nome} (${e.municipio_nome})` : e.nome
                            }))}
                            selected={selectedEscolaIds}
                            onChange={(values) => {
                              setSelectedEscolaIds(values);
                              setSelectedTurmaIds([]);
                            }}
                            placeholder={selectedEscolaIds.length === 0 ? "Selecione escola(s)" : `${selectedEscolaIds.length} selecionada(s)`}
                            className={filteredEscolas.length === 0 ? "opacity-50" : ""}
                          />
                        </div>
                      )}

                      {targetsData.escolas && targetsData.escolas.length > 0 && user?.role === 'professor' && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Escola</label>
                          <Select
                            value={selectedEscolaIds[0] || ''}
                            onValueChange={(value) => {
                              setSelectedEscolaIds(value ? [value] : []);
                              setSelectedTurmaIds([]);
                            }}
                            disabled={isLoadingTargets || filteredEscolas.length === 0}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma escola para filtrar turmas" />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredEscolas.map(escola => (
                                <SelectItem key={escola.id} value={escola.id}>
                                  {escola.nome}
                                  {escola.municipio_nome && ` (${escola.municipio_nome})`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {targetsData.turmas && targetsData.turmas.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Turma(s)
                            {(user?.role === 'diretor' || user?.role === 'coordenador') && (
                              <span className="text-muted-foreground text-xs ml-2">
                                (deixe vazio para enviar para toda a escola)
                              </span>
                            )}
                          </label>
                          <FormMultiSelect
                            options={filteredTurmas.map(t => ({
                              id: t.id,
                              name: `${t.nome}${t.serie_nome ? ` - ${t.serie_nome}` : ''}${t.escola_nome ? ` (${t.escola_nome})` : ''}`
                            }))}
                            selected={selectedTurmaIds}
                            onChange={setSelectedTurmaIds}
                            placeholder={selectedTurmaIds.length === 0 ? "Selecione turma(s)" : `${selectedTurmaIds.length} selecionada(s)`}
                            className={filteredTurmas.length === 0 ? "opacity-50" : ""}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Links do evento
                </Label>
                <Button type="button" variant="outline" size="sm" onClick={() => addLinkResource(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar link
                </Button>
              </div>
              {editLinkResources.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum link adicionado.</p>
              )}
              {editLinkResources.map((resource, index) => (
                <div key={`edit-link-${resource.id || index}`} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
                  <Input
                    placeholder="Título do link"
                    value={resource.title}
                    onChange={(e) => updateLinkResource(index, 'title', e.target.value, true)}
                  />
                  <Input
                    placeholder="https://..."
                    value={resource.url}
                    onChange={(e) => updateLinkResource(index, 'url', e.target.value, true)}
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeLinkResource(index, true)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="space-y-2 p-4 border rounded-lg">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Anexar novos arquivos
              </Label>
              <Input
                type="file"
                multiple
                onChange={(e) => setPendingEditFiles(Array.from(e.target.files || []))}
              />
              {pendingEditFiles.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {pendingEditFiles.length} arquivo(s) serão enviados ao salvar.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button onClick={updateEvent}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sucesso */}
      <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>Sucesso</DialogTitle>
            <DialogDescription>{createdTitle} foi criado com sucesso e publicado.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setIsSuccessOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
