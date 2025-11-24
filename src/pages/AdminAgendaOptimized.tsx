import React, { useCallback, useRef, useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import { DateSelectArg, EventApi, EventClickArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import '../styles/fullcalendar.css';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Edit, Trash2, AlertCircle } from 'lucide-react';
import { CalendarApi as CalendarService, type CalendarTargetsResponse, type CalendarTarget } from "@/services/calendarApi";
import { toLocalOffsetISO } from "@/utils/date";
import { toast } from 'react-toastify';
import { useAuth } from "@/context/authContext";

interface CustomEventInput extends EventInput {
  extendedProps: {
    description?: string;
    location?: string;
    [key: string]: any;
  };
}

function getEventClassNames(eventInfo: { event: EventApi }) {
  const type = eventInfo.event.extendedProps.type as string | undefined;
  return type ? [`fc-event-type-${type}`] : [];
}

export default function AdminAgendaOptimized() {
  const { user } = useAuth();
  const [currentEvents, setCurrentEvents] = useState<CustomEventInput[]>([]);
  const calendarRef = useRef<FullCalendar>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [createdTitle, setCreatedTitle] = useState('');
  const [selected, setSelected] = useState<EventInput | null>(null);

  // Estados para targets da API
  const [targetsData, setTargetsData] = useState<CalendarTargetsResponse>({});
  const [isLoadingTargets, setIsLoadingTargets] = useState(false);
  
  // Estado para target selecionado
  const [selectedTarget, setSelectedTarget] = useState<CalendarTarget | null>(null);
  // Estado para escola selecionada (para filtrar turmas)
  const [selectedEscolaId, setSelectedEscolaId] = useState<string>('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    startTime: '',
    endTime: '',
    allDay: false,
    scope: 'SCHOOL' as 'CITY' | 'SCHOOL' | 'GRADE' | 'CLASS',
    scopeId: '',
  });

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
      if (!isCreateOpen) {
        resetTargetsForm();
        return;
      }
      
      setIsLoadingTargets(true);
      try {
        const data = await CalendarService.getTargets();
        console.log('Targets carregados:', data);
        setTargetsData(data);
      } catch (error) {
        console.error('Erro ao carregar targets:', error);
        toast.error('Erro ao carregar opções de destinatário');
      } finally {
        setIsLoadingTargets(false);
      }
    };
    
    loadTargets();
  }, [isCreateOpen]);

  // Resetar formulário de targets
  const resetTargetsForm = () => {
    setSelectedTarget(null);
    setSelectedEscolaId('');
    setTargetsData({});
  };


  // Construir targets para a API baseado no target selecionado
  const buildEventTargets = (): {
    visibility_scope: 'CITY' | 'SCHOOL' | 'GRADE' | 'CLASS';
    targets: Array<{ target_type: 'MUNICIPALITY' | 'SCHOOL' | 'GRADE' | 'CLASS'; target_id: string }>;
  } => {
    if (!selectedTarget) {
      throw new Error('Nenhum target selecionado');
    }

    // Mapear target_type para visibility_scope
    const scopeMap: Record<string, 'CITY' | 'SCHOOL' | 'GRADE' | 'CLASS'> = {
      'MUNICIPALITY': 'CITY',
      'SCHOOL': 'SCHOOL',
      'GRADE': 'GRADE',
      'CLASS': 'CLASS'
    };

    return {
      visibility_scope: scopeMap[selectedTarget.target_type] || 'SCHOOL',
      targets: [{ 
        target_type: selectedTarget.target_type, 
        target_id: selectedTarget.id 
      }]
    };
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
    
    if (!selectedTarget) {
      toast.error('Selecione um destinatário');
      return false;
    }
    
    // Validar que professor só pode selecionar turmas (CLASS), nunca escola (SCHOOL) ou município (MUNICIPALITY)
    if (user?.role === 'professor') {
      if (selectedTarget.target_type !== 'CLASS') {
        toast.error('Professores só podem criar eventos para turmas específicas. Selecione uma turma.');
        return false;
      }
    }
    
    return true;
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
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
      const created = await CalendarService.createEvent({
        title: formData.title,
        description: formData.description,
        location: formData.location,
        start_at: startISO,
        end_at: endISO,
        all_day: !!formData.allDay,
        timezone: 'America/Sao_Paulo',
        visibility_scope,
        targets,
        is_published: true,
        recurrence_rule: null,
      });
      setIsCreateOpen(false);
      resetTargetsForm();
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
    setIsEditOpen(true);
  };

  const updateEvent = async () => {
    if (!selected?.id) return;
    try {
      const startISO = toLocalOffsetISO(new Date(formData.startTime));
      const endISO = toLocalOffsetISO(new Date(formData.endTime));
      await CalendarService.updateEvent(String(selected.id), {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        start_at: startISO,
        end_at: endISO,
        all_day: !!formData.allDay,
        timezone: 'America/Sao_Paulo',
        visibility_scope: formData.scope,
        targets: formData.scopeId ? [{ target_type: formData.scope, target_id: formData.scopeId }] : [],
      });
      setIsEditOpen(false);
      setIsViewOpen(false);
      await refetchCurrentRange();
      toast.success('Evento atualizado');
    } catch (_) { toast.error('Erro ao atualizar evento'); }
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
        <h1 className="text-2xl font-bold text-foreground mb-2">Agenda Administrativa</h1>
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
          dayMaxEventRows={false}
          moreLinkClick="popover"
          eventMaxStack={3}
          eventOverlap={false}

          select={handleDateSelect}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Criar Novo Evento</DialogTitle>
            <DialogDescription>Preencha os dados do evento que será exibido para alunos e professores</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Título do evento" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Descrição do evento" />
            </div>
            <div className="grid grid-cols-2 gap-4">
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
                      {/* Municípios */}
                      {targetsData.municipios && targetsData.municipios.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Município</label>
                          <Select
                            value={selectedTarget?.id || ''}
                            onValueChange={(value) => {
                              const target = targetsData.municipios?.find(m => m.id === value);
                              setSelectedTarget(target || null);
                            }}
                            disabled={isLoadingTargets}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um município" />
                            </SelectTrigger>
                            <SelectContent>
                              {targetsData.municipios.map(municipio => (
                                <SelectItem key={municipio.id} value={municipio.id}>
                                  {municipio.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Escolas */}
                      {targetsData.escolas && targetsData.escolas.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Escola
                            {user?.role === 'professor' && <span className="text-muted-foreground text-xs ml-2">(selecione para filtrar turmas)</span>}
                          </label>
                          <Select
                            value={user?.role === 'professor' ? selectedEscolaId : (selectedTarget?.target_type === 'SCHOOL' ? selectedTarget.id : '')}
                            onValueChange={(value) => {
                              if (user?.role === 'professor') {
                                // Para professor, apenas filtrar turmas, não selecionar escola como target
                                setSelectedEscolaId(value);
                                setSelectedTarget(null); // Limpar target quando mudar escola
                              } else {
                                // Para outros roles, pode selecionar escola como target
                                const target = targetsData.escolas?.find(e => e.id === value);
                                setSelectedTarget(target || null);
                              }
                            }}
                            disabled={isLoadingTargets}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma escola" />
                            </SelectTrigger>
                            <SelectContent>
                              {targetsData.escolas.map(escola => (
                                <SelectItem key={escola.id} value={escola.id}>
                                  {escola.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Turmas */}
                      {targetsData.turmas && targetsData.turmas.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Turma</label>
                          <Select
                            value={selectedTarget?.id || ''}
                            onValueChange={(value) => {
                              const target = targetsData.turmas?.find(t => t.id === value);
                              setSelectedTarget(target || null);
                            }}
                            disabled={isLoadingTargets || (user?.role === 'professor' && !selectedEscolaId)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma turma" />
                            </SelectTrigger>
                            <SelectContent>
                              {(user?.role === 'professor' && selectedEscolaId
                                ? targetsData.turmas.filter(t => t.escola_id === selectedEscolaId)
                                : targetsData.turmas
                              ).map(turma => (
                                <SelectItem key={turma.id} value={turma.id}>
                                  {turma.nome}
                                  {turma.serie_nome && ` - ${turma.serie_nome}`}
                                  {turma.escola_nome && ` (${turma.escola_nome})`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {user?.role === 'professor' && !selectedEscolaId && (
                            <p className="text-xs text-muted-foreground">
                              Selecione uma escola primeiro para filtrar as turmas
                            </p>
                          )}
                        </div>
                      )}

                      {/* Mostrar target selecionado */}
                      {selectedTarget && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Destinatário selecionado: <strong>{selectedTarget.nome}</strong>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.title || 'Evento'}</DialogTitle>
            <DialogDescription>{selected?.extendedProps?.description || 'Sem descrição'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            {selected?.extendedProps?.location && (<div>Local: {selected.extendedProps.location}</div>)}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Evento</DialogTitle>
            <DialogDescription>Atualize os dados do evento</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Título</Label>
                <Input id="edit-title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-scope">Alvo</Label>
                <Select value={formData.scope} onValueChange={(v: 'CITY' | 'SCHOOL' | 'GRADE' | 'CLASS') => setFormData({ ...formData, scope: v, scopeId: '' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CITY">Município</SelectItem>
                    <SelectItem value="SCHOOL">Escola</SelectItem>
                    <SelectItem value="GRADE">Série</SelectItem>
                    <SelectItem value="CLASS">Turma</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea id="edit-description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-start">Início</Label>
                <Input id="edit-start" type="datetime-local" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-end">Fim</Label>
                <Input id="edit-end" type="datetime-local" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-location">Local</Label>
                <Input id="edit-location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-scopeId">ID do alvo</Label>
                <Input id="edit-scopeId" value={formData.scopeId} onChange={(e) => setFormData({ ...formData, scopeId: e.target.value })} />
              </div>
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
        <DialogContent className="max-w-md">
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
