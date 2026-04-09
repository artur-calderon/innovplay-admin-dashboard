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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Edit, Trash2, AlertCircle, Calendar, Link2, Plus, Paperclip, Download, X } from 'lucide-react';
import { EventDetailDialog } from "@/components/agenda/EventDetailDialog";
import {
  CalendarApi as CalendarService,
  isCalendarEventCreatedByUser,
  type CalendarTargetsResponse,
  type CalendarRoleGroupId,
} from "@/services/calendarApi";
import { EventAudiencePanel } from "@/components/agenda/EventAudiencePanel";
import {
  buildEventTargetsFromAudience,
  summarizeAudience,
  parseTargetsFromEvent,
  summarizeStoredTargets,
  type AudienceMode,
} from "@/lib/calendarAudience";
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

  const [audienceMode, setAudienceMode] = useState<AudienceMode>("entities");
  const [allMunicipality, setAllMunicipality] = useState(false);
  const [roleGroupId, setRoleGroupId] = useState<CalendarRoleGroupId | "">("");
  const [roleGroupSchoolIds, setRoleGroupSchoolIds] = useState<string[]>([]);
  const [roleGroupGradeIds, setRoleGroupGradeIds] = useState<string[]>([]);
  const [roleGroupClassIds, setRoleGroupClassIds] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    startTime: '',
    endTime: '',
    allDay: false,
  });
  const [createLinkResources, setCreateLinkResources] = useState<EventLinkResource[]>([]);
  const [editLinkResources, setEditLinkResources] = useState<EventLinkResource[]>([]);
  const [pendingCreateFiles, setPendingCreateFiles] = useState<File[]>([]);
  const [pendingEditFiles, setPendingEditFiles] = useState<File[]>([]);

  const fetchEvents = useCallback(async (startISO: string, endISO: string) => {
    try {
      const list = await CalendarService.listMyEvents(startISO, endISO);
      const uid = user?.id;
      const enriched = list.map((ev) => ({
        ...ev,
        editable: isCalendarEventCreatedByUser(uid, ev),
      }));
      setCurrentEvents(enriched as CustomEventInput[]);
    } catch (_) {
      toast.error('Não foi possível carregar os eventos');
    }
  }, [user?.id]);

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
    setAudienceMode("entities");
    setAllMunicipality(false);
    setRoleGroupId("");
    setRoleGroupSchoolIds([]);
    setRoleGroupGradeIds([]);
    setRoleGroupClassIds([]);
  };

  const resetAudienceForNewEvent = () => {
    setAudienceMode("entities");
    setAllMunicipality(false);
    setRoleGroupId("");
    setRoleGroupSchoolIds([]);
    setRoleGroupGradeIds([]);
    setRoleGroupClassIds([]);
    setSelectedMunicipioIds([]);
    setSelectedEscolaIds([]);
    setSelectedTurmaIds([]);
  };

  const handleAudienceModeChange = (mode: AudienceMode) => {
    setAudienceMode(mode);
    if (mode === "self") {
      setAllMunicipality(false);
      setRoleGroupId("");
      setRoleGroupSchoolIds([]);
      setRoleGroupGradeIds([]);
      setRoleGroupClassIds([]);
    }
    if (mode === "entities") {
      setRoleGroupId("");
      setRoleGroupSchoolIds([]);
      setRoleGroupGradeIds([]);
      setRoleGroupClassIds([]);
    }
    if (mode === "role_group") {
      setAllMunicipality(false);
      setSelectedMunicipioIds([]);
      setSelectedEscolaIds([]);
      setSelectedTurmaIds([]);
    }
  };

  const handleAllMunicipalityChange = (value: boolean) => {
    setAllMunicipality(value);
    if (value) {
      setSelectedMunicipioIds([]);
      setSelectedEscolaIds([]);
      setSelectedTurmaIds([]);
    }
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

  const roleGroupTurmasForGrades = useMemo(() => {
    let list = targetsData.turmas || [];
    if (roleGroupSchoolIds.length > 0) {
      list = list.filter((t) => t.escola_id && roleGroupSchoolIds.includes(t.escola_id));
    }
    return list;
  }, [targetsData.turmas, roleGroupSchoolIds]);

  const roleGroupGradeOptions = useMemo(() => {
    const map = new Map<string, string>();
    roleGroupTurmasForGrades.forEach((t) => {
      if (t.serie_id) map.set(t.serie_id, t.serie_nome || t.serie_id);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [roleGroupTurmasForGrades]);

  const roleGroupClassTurmas = useMemo(() => {
    let list = roleGroupTurmasForGrades;
    if (roleGroupGradeIds.length > 0) {
      list = list.filter((t) => t.serie_id && roleGroupGradeIds.includes(t.serie_id));
    }
    return list;
  }, [roleGroupTurmasForGrades, roleGroupGradeIds]);

  const audienceSummaryLines = useMemo(
    () =>
      summarizeAudience(audienceMode, {
        targetsData,
        userName: user?.name,
        userId: user?.id,
        neutralSelfWording: false,
        allMunicipality,
        roleGroupId,
        roleGroupSchoolIds,
        roleGroupGradeIds,
        roleGroupClassIds,
        selectedMunicipioIds,
        selectedEscolaIds,
        selectedTurmaIds,
      }),
    [
      audienceMode,
      targetsData,
      user?.name,
      user?.id,
      allMunicipality,
      roleGroupId,
      roleGroupSchoolIds,
      roleGroupGradeIds,
      roleGroupClassIds,
      selectedMunicipioIds,
      selectedEscolaIds,
      selectedTurmaIds,
    ]
  );

  const viewAudienceLines = useMemo(() => {
    const raw = selected?.extendedProps?.targets;
    if (!Array.isArray(raw) || raw.length === 0) return null;
    return summarizeStoredTargets(raw, targetsData, { neutralSelf: true });
  }, [selected?.extendedProps?.targets, targetsData]);

  const canManageSelected = useMemo(
    () => isCalendarEventCreatedByUser(user?.id, selected),
    [user?.id, selected]
  );

  // Construir targets para a API (entidades, perfil ou só eu)
  const buildEventTargets = () => {
    return buildEventTargetsFromAudience({
      mode: user?.role === "aluno" ? "self" : audienceMode,
      userId: user?.id,
      userRole: user?.role,
      allMunicipality,
      roleGroupId,
      roleGroupSchoolIds,
      roleGroupGradeIds,
      roleGroupClassIds,
      selectedMunicipioIds,
      selectedEscolaIds,
      selectedTurmaIds,
      targetsData,
    });
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

    if (user?.role === 'aluno' && !user?.id) {
      toast.error('Não foi possível identificar seu usuário.');
      return false;
    }

    const mode = user?.role === 'aluno' ? 'self' : audienceMode;

    if (mode === 'self' && !user?.id) {
      toast.error('Só é possível “apenas para mim” com usuário autenticado.');
      return false;
    }

    if (mode === 'role_group') {
      if (!roleGroupId) {
        toast.error('Selecione um perfil de destinatário (por perfil).');
        return false;
      }
      const narrowRole =
        user?.role === 'professor' ||
        user?.role === 'diretor' ||
        user?.role === 'coordenador';
      const hasRoleFilters =
        roleGroupSchoolIds.length > 0 ||
        roleGroupGradeIds.length > 0 ||
        roleGroupClassIds.length > 0;
      if (narrowRole && !hasRoleFilters) {
        toast.error(
          'Para este perfil, refine por escola, série ou turma ao enviar “por perfil”.'
        );
        return false;
      }
    }

    if (mode === 'entities' && !allMunicipality) {
      if (user?.role === 'professor') {
        if (selectedTurmaIds.length === 0) {
          toast.error('Selecione ao menos uma turma (ou use “Por perfil” / “Só eu”).');
          return false;
        }
      } else if (user?.role !== 'admin' && user?.role !== 'tecadm') {
        if (
          selectedTurmaIds.length === 0 &&
          selectedEscolaIds.length === 0 &&
          selectedMunicipioIds.length === 0
        ) {
          toast.error('Selecione destinatários ou marque “Todo o município”.');
          return false;
        }
      }
    }

    try {
      buildEventTargets();
    } catch {
      toast.error('Defina para quem o evento será enviado. Veja o resumo abaixo.');
      return false;
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
    if (!isCalendarEventCreatedByUser(user?.id, selected)) {
      toast.error('Apenas o criador pode editar este evento.');
      return;
    }
    const eventTargets = Array.isArray(selected.extendedProps?.targets)
      ? selected.extendedProps.targets
      : [];
    const eventResources = Array.isArray(selected.extendedProps?.resources)
      ? selected.extendedProps.resources
      : [];
    const linkResources = eventResources.filter((r: any) => r?.type === 'link');
    const parsed = parseTargetsFromEvent(eventTargets);
    setAudienceMode(parsed.mode);
    setAllMunicipality(parsed.allMunicipality);
    setRoleGroupId(parsed.roleGroupId);
    setRoleGroupSchoolIds(parsed.roleGroupSchoolIds);
    setRoleGroupGradeIds(parsed.roleGroupGradeIds);
    setRoleGroupClassIds(parsed.roleGroupClassIds);
    setSelectedMunicipioIds(parsed.selectedMunicipioIds);
    setSelectedEscolaIds(parsed.selectedEscolaIds);
    setSelectedTurmaIds(parsed.selectedTurmaIds);
    setFormData({
      title: String(selected.title || ''),
      description: selected.extendedProps?.description || '',
      location: selected.extendedProps?.location || '',
      startTime: (selected.start as string)?.slice(0, 16) || '',
      endTime: (selected.end as string)?.slice(0, 16) || '',
      allDay: !!selected.allDay,
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
    if (!isCalendarEventCreatedByUser(user?.id, selected)) {
      toast.error('Apenas o criador pode atualizar este evento.');
      return;
    }
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
    if (String(selected?.id) !== String(eventId) || !isCalendarEventCreatedByUser(user?.id, selected)) {
      toast.error('Apenas o criador pode remover anexos deste evento.');
      return;
    }
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
    if (!isCalendarEventCreatedByUser(user?.id, selected)) {
      toast.error('Apenas o criador pode publicar este evento.');
      return;
    }
    try {
      await CalendarService.publishEvent(String(selected.id));
      await refetchCurrentRange();
      toast.success('Evento publicado');
    } catch (_) { toast.error('Erro ao publicar evento'); }
  };

  const deleteEvent = async () => {
    if (!selected?.id) return;
    if (!isCalendarEventCreatedByUser(user?.id, selected)) {
      toast.error('Apenas o criador pode excluir este evento.');
      return;
    }
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
        if (open) {
          resetAudienceForNewEvent();
        } else {
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
          });
        }
      }}>
        <DialogContent
          className="max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full !top-[50%] !left-[50%] !translate-x-[-50%] !translate-y-[-50%]"
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
            <DialogDescription>
              Preencha os dados e escolha com clareza o público: só você, escolas/turmas ou um perfil (ex. professores)
              com filtros opcionais.
            </DialogDescription>
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

            <EventAudiencePanel
              user={{ id: user?.id, role: user?.role, name: user?.name }}
              targetsData={targetsData}
              isLoadingTargets={isLoadingTargets}
              filteredEscolas={filteredEscolas}
              entityFilteredTurmas={filteredTurmas}
              roleGroupGradeOptions={roleGroupGradeOptions}
              roleGroupClassTurmas={roleGroupClassTurmas}
              audienceMode={user?.role === "aluno" ? "self" : audienceMode}
              onAudienceModeChange={handleAudienceModeChange}
              allMunicipality={allMunicipality}
              onAllMunicipalityChange={handleAllMunicipalityChange}
              roleGroupId={roleGroupId}
              onRoleGroupIdChange={setRoleGroupId}
              roleGroupSchoolIds={roleGroupSchoolIds}
              onRoleGroupSchoolIdsChange={setRoleGroupSchoolIds}
              roleGroupGradeIds={roleGroupGradeIds}
              onRoleGroupGradeIdsChange={setRoleGroupGradeIds}
              roleGroupClassIds={roleGroupClassIds}
              onRoleGroupClassIdsChange={setRoleGroupClassIds}
              selectedMunicipioIds={selectedMunicipioIds}
              onSelectedMunicipioIdsChange={setSelectedMunicipioIds}
              selectedEscolaIds={selectedEscolaIds}
              onSelectedEscolaIdsChange={setSelectedEscolaIds}
              selectedTurmaIds={selectedTurmaIds}
              onSelectedTurmaIdsChange={setSelectedTurmaIds}
              summaryLines={audienceSummaryLines}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
            <Button onClick={createEvent}>Criar Evento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EventDetailDialog
        open={isViewOpen}
        onOpenChange={setIsViewOpen}
        selected={selected}
        audienceLines={viewAudienceLines}
        emptyDescriptionHint={
          canManageSelected
            ? 'Nenhuma descrição adicionada — você pode editar o evento para incluir mais detalhes.'
            : 'Nenhuma descrição adicionada para este evento.'
        }
        onDownloadFile={handleDownloadFileResource}
        onDeleteFile={canManageSelected ? handleDeleteResource : undefined}
        footer={
          canManageSelected ? (
            <>
              <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                <Button variant="outline" className="flex-1 sm:flex-initial" onClick={() => setIsViewOpen(false)}>
                  Fechar
                </Button>
                <Button variant="secondary" className="flex-1 sm:flex-initial gap-2" onClick={openEditFromSelected}>
                  <Edit className="h-4 w-4" />
                  Editar
                </Button>
              </div>
              <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                <Button className="flex-1 sm:flex-initial shadow-sm" onClick={publishEvent}>
                  Publicar
                </Button>
                <Button variant="destructive" className="flex-1 sm:flex-initial gap-2 shadow-sm" onClick={deleteEvent}>
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </Button>
              </div>
            </>
          ) : (
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsViewOpen(false)}>
              Fechar
            </Button>
          )
        }
      />

      {/* Editar evento */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
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

            <EventAudiencePanel
              user={{ id: user?.id, role: user?.role, name: user?.name }}
              targetsData={targetsData}
              isLoadingTargets={isLoadingTargets}
              filteredEscolas={filteredEscolas}
              entityFilteredTurmas={filteredTurmas}
              roleGroupGradeOptions={roleGroupGradeOptions}
              roleGroupClassTurmas={roleGroupClassTurmas}
              audienceMode={user?.role === "aluno" ? "self" : audienceMode}
              onAudienceModeChange={handleAudienceModeChange}
              allMunicipality={allMunicipality}
              onAllMunicipalityChange={handleAllMunicipalityChange}
              roleGroupId={roleGroupId}
              onRoleGroupIdChange={setRoleGroupId}
              roleGroupSchoolIds={roleGroupSchoolIds}
              onRoleGroupSchoolIdsChange={setRoleGroupSchoolIds}
              roleGroupGradeIds={roleGroupGradeIds}
              onRoleGroupGradeIdsChange={setRoleGroupGradeIds}
              roleGroupClassIds={roleGroupClassIds}
              onRoleGroupClassIdsChange={setRoleGroupClassIds}
              selectedMunicipioIds={selectedMunicipioIds}
              onSelectedMunicipioIdsChange={setSelectedMunicipioIds}
              selectedEscolaIds={selectedEscolaIds}
              onSelectedEscolaIdsChange={setSelectedEscolaIds}
              selectedTurmaIds={selectedTurmaIds}
              onSelectedTurmaIdsChange={setSelectedTurmaIds}
              summaryLines={audienceSummaryLines}
            />
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
