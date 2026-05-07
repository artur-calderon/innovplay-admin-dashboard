import { api } from '@/lib/api';
import type { EventInput } from '@fullcalendar/core';

export type CalendarRoleGroupId =
  | 'admin'
  | 'tecadm'
  | 'diretor'
  | 'coordenador'
  | 'professor'
  | 'aluno';

export type CalendarVisibilityScope =
  | 'MUNICIPALITY'
  | 'SCHOOL'
  | 'GRADE'
  | 'CLASS'
  | 'USER'
  | 'USERS';

export type CalendarTargetPayload =
  | { target_type: 'ALL'; target_id?: never }
  | { target_type: 'MUNICIPALITY'; target_id: string }
  | { target_type: 'SCHOOL'; target_id: string }
  | { target_type: 'GRADE'; target_id: string }
  | { target_type: 'CLASS'; target_id: string }
  | { target_type: 'USER'; target_id: string }
  | {
      target_type: 'ROLE_GROUP';
      target_id: CalendarRoleGroupId;
      filters?: {
        school_ids?: string[];
        grade_ids?: string[];
        class_ids?: string[];
      };
    };

/** Quem criou o evento (JWT `id` deve coincidir com `id` para mutação/anexos). */
export interface CalendarCreatedBy {
  id: string;
  role?: string;
  name?: string;
}

export interface CalendarEventDTO {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  timezone?: string;
  /** Raiz ou só em `extendedProps`, conforme a API — normalizado em `mapDtoToFullCalendar`. */
  created_by?: CalendarCreatedBy;
  extendedProps?: Record<string, any>;
}

export function getCalendarEventCreatedBy(event: EventInput | null | undefined): CalendarCreatedBy | undefined {
  const ep = event?.extendedProps as Record<string, unknown> | undefined;
  const raw = ep?.created_by as CalendarCreatedBy | undefined;
  if (raw && raw.id != null && raw.id !== '') {
    return { ...raw, id: String(raw.id) };
  }
  return undefined;
}

export function isCalendarEventCreatedByUser(
  userId: string | undefined | null,
  event: EventInput | null | undefined
): boolean {
  if (userId == null || userId === '' || !event) return false;
  const cb = getCalendarEventCreatedBy(event);
  if (!cb) return false;
  return String(cb.id) === String(userId);
}

export interface CreateEventBody {
  title: string;
  description?: string;
  location?: string;
  start_at: string; // ISO com timezone
  end_at: string;   // ISO com timezone
  all_day: boolean;
  timezone?: string;
  visibility_scope: CalendarVisibilityScope;
  targets: CalendarTargetPayload[];
  resources?: Array<{
    id?: string;
    type: 'link';
    title: string;
    url: string;
    sort_order?: number;
  }>;
  is_published?: boolean;
  recurrence_rule?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UpdateEventBody {
  title?: string;
  description?: string;
  location?: string;
  start_at?: string;
  end_at?: string;
  all_day?: boolean;
  timezone?: string;
  visibility_scope?: CalendarVisibilityScope;
  targets?: CalendarTargetPayload[];
  resources?: Array<{
    id?: string;
    type: 'link';
    title: string;
    url: string;
    sort_order?: number;
  }>;
  is_published?: boolean;
  recurrence_rule?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CalendarTarget {
  id: string;
  nome: string;
  target_type: 'ALL' | 'MUNICIPALITY' | 'SCHOOL' | 'GRADE' | 'CLASS' | 'USER';
  serie_id?: string;
  serie_nome?: string;
  escola_id?: string;
  escola_nome?: string;
  city_id?: string;        // ID do município (para escolas)
  municipio_nome?: string; // Nome do município (para escolas)
}

export interface CalendarTargetsResponse {
  municipios?: Array<CalendarTarget>;
  escolas?: Array<CalendarTarget>;
  turmas?: Array<CalendarTarget>;
}

export function mapDtoToFullCalendar(e: CalendarEventDTO): EventInput {
  const fromExt = e.extendedProps?.created_by as CalendarCreatedBy | undefined;
  const createdBy = e.created_by ?? fromExt;

  return {
    id: e.id,
    title: e.title,
    start: e.start,
    end: e.end,
    allDay: e.allDay,
    extendedProps: {
      ...(e.extendedProps || {}),
      // Preservar timezone em extendedProps para uso no frontend
      ...(e.timezone && { timezone: e.timezone }),
      ...(createdBy && createdBy.id != null && createdBy.id !== '' && { created_by: { ...createdBy, id: String(createdBy.id) } }),
    },
  } as EventInput;
}

async function listMyEventsFromApi(
  startISO: string,
  endISO: string,
  filters?: { kind?: string; exclude_kind?: string }
): Promise<EventInput[]> {
  const params: Record<string, string> = { start: startISO, end: endISO };
  if (filters?.kind) params.kind = filters.kind;
  /* A Agenda não deve exibir avisos (`metadata.kind=aviso`). */
  if (filters?.exclude_kind) params.exclude_kind = filters.exclude_kind;
  const { data } = await api.get('/calendar/my-events', { params });
  const items: CalendarEventDTO[] = Array.isArray(data) ? data : (data?.events || []);
  return items.map(mapDtoToFullCalendar);
}

export const CalendarApi = {
  listMyEvents(startISO: string, endISO: string): Promise<EventInput[]> {
    return listMyEventsFromApi(startISO, endISO, { exclude_kind: 'aviso' });
  },

  /** @deprecated Use `listMyEvents`. `GET /calendar/events` foi descontinuado. */
  listEvents(startISO: string, endISO: string): Promise<EventInput[]> {
    return listMyEventsFromApi(startISO, endISO, { exclude_kind: 'aviso' });
  },

  /** Listagem sem filtro `exclude_kind` (ex.: tela dedicada). */
  listMyEventsRaw(
    startISO: string,
    endISO: string,
    filters?: { kind?: string; exclude_kind?: string }
  ): Promise<EventInput[]> {
    return listMyEventsFromApi(startISO, endISO, filters);
  },

  async getEvent(eventId: string): Promise<EventInput> {
    const { data } = await api.get(`/calendar/events/${eventId}`);
    return mapDtoToFullCalendar(data.event);
  },

  async createEvent(body: CreateEventBody): Promise<EventInput> {
    const { data } = await api.post('/calendar/events', body);
    return mapDtoToFullCalendar(data.event);
  },

  async updateEvent(eventId: string, body: UpdateEventBody): Promise<EventInput> {
    const { data } = await api.put(`/calendar/events/${eventId}`, body);
    return mapDtoToFullCalendar(data.event);
  },

  async deleteEvent(eventId: string): Promise<boolean> {
    const { data } = await api.delete(`/calendar/events/${eventId}`);
    return !!data?.success;
  },

  async publishEvent(eventId: string): Promise<EventInput> {
    const { data } = await api.post(`/calendar/events/${eventId}/publish`);
    return mapDtoToFullCalendar(data.event);
  },

  async listRecipients(eventId: string, page = 1, perPage = 50): Promise<{ items: any[]; page: number; per_page: number; total: number; }> {
    const { data } = await api.get(`/calendar/events/${eventId}/recipients`, { params: { page, per_page: perPage } });
    return data;
  },

  async markRead(eventId: string): Promise<boolean> {
    const { data } = await api.post(`/calendar/events/${eventId}/read`);
    return !!data?.success;
  },

  async getTargets(): Promise<CalendarTargetsResponse> {
    const { data } = await api.get('/calendar/targets/me');
    return data;
  },

  async uploadEventFileResource(
    eventId: string,
    payload: { file: File; title: string; sort_order?: number }
  ): Promise<any> {
    const formData = new FormData();
    formData.append('file', payload.file);
    formData.append('title', payload.title);
    if (typeof payload.sort_order === 'number') {
      formData.append('sort_order', String(payload.sort_order));
    }
    const { data } = await api.post(`/calendar/events/${eventId}/resources/file`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data?.resource;
  },

  async deleteEventResource(eventId: string, resourceId: string): Promise<boolean> {
    const { data } = await api.delete(`/calendar/events/${eventId}/resources/${resourceId}`);
    return !!data?.success;
  },
};


