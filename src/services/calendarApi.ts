import { api } from '@/lib/api';
import type { EventInput } from '@fullcalendar/core';

export interface CalendarEventDTO {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
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
  visibility_scope: 'CITY' | 'SCHOOL' | 'GRADE' | 'CLASS';
  targets: Array<{ target_type: 'CITY' | 'SCHOOL' | 'GRADE' | 'CLASS'; target_id: string }>;
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
  visibility_scope?: 'CITY' | 'SCHOOL' | 'GRADE' | 'CLASS';
  targets?: Array<{ target_type: 'CITY' | 'SCHOOL' | 'GRADE' | 'CLASS'; target_id: string }>;
  is_published?: boolean;
  recurrence_rule?: string | null;
}

export function mapDtoToFullCalendar(e: CalendarEventDTO): EventInput {
  return {
    id: e.id,
    title: e.title,
    start: e.start,
    end: e.end,
    allDay: e.allDay,
    extendedProps: e.extendedProps || {},
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
};


