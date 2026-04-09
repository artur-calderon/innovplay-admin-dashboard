import { api } from '@/lib/api';
import type { EventInput } from '@fullcalendar/core';

export interface CalendarEventDTO {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  timezone?: string;
  extendedProps?: Record<string, any>;
}

export interface CreateEventBody {
  title: string;
  description?: string;
  location?: string;
  start_at: string; // ISO com timezone
  end_at: string;   // ISO com timezone
  all_day: boolean;
  timezone?: string;
  visibility_scope: 'MUNICIPALITY' | 'SCHOOL' | 'GRADE' | 'CLASS' | 'USER';
  targets: Array<{ target_type: 'ALL' | 'MUNICIPALITY' | 'SCHOOL' | 'GRADE' | 'CLASS' | 'USER'; target_id?: string }>;
  resources?: Array<{
    id?: string;
    type: 'link';
    title: string;
    url: string;
    sort_order?: number;
  }>;
  is_published?: boolean;
  recurrence_rule?: string | null;
}

export interface UpdateEventBody {
  title?: string;
  description?: string;
  location?: string;
  start_at?: string;
  end_at?: string;
  all_day?: boolean;
  timezone?: string;
  visibility_scope?: 'MUNICIPALITY' | 'SCHOOL' | 'GRADE' | 'CLASS' | 'USER';
  targets?: Array<{ target_type: 'ALL' | 'MUNICIPALITY' | 'SCHOOL' | 'GRADE' | 'CLASS' | 'USER'; target_id?: string }>;
  resources?: Array<{
    id?: string;
    type: 'link';
    title: string;
    url: string;
    sort_order?: number;
  }>;
  is_published?: boolean;
  recurrence_rule?: string | null;
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
    },
  } as EventInput;
}

export const CalendarApi = {
  async listMyEvents(startISO: string, endISO: string): Promise<EventInput[]> {
    const { data } = await api.get('/calendar/my-events', { params: { start: startISO, end: endISO } });
    const items: CalendarEventDTO[] = Array.isArray(data) ? data : (data?.events || []);
    return items.map(mapDtoToFullCalendar);
  },

  async listEvents(startISO: string, endISO: string): Promise<EventInput[]> {
    const { data } = await api.get('/calendar/events', { params: { start: startISO, end: endISO } });
    const items: CalendarEventDTO[] = data?.events || [];
    return items.map(mapDtoToFullCalendar);
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

  async getEventResourceDownloadUrl(eventId: string, resourceId: string): Promise<{
    download_url: string;
    expires_in_seconds: number;
    file_name?: string;
  }> {
    const { data } = await api.get(`/calendar/events/${eventId}/resources/${resourceId}/download`);
    return data;
  },

  async deleteEventResource(eventId: string, resourceId: string): Promise<boolean> {
    const { data } = await api.delete(`/calendar/events/${eventId}/resources/${resourceId}`);
    return !!data?.success;
  },
};


