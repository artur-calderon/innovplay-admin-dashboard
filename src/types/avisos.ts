// Interfaces para o sistema de avisos (persistência: calendar_events + metadata.kind=aviso)

/** Uso apenas para leitura de avisos antigos já gravados com escopo global. */
export interface AvisoDestinatarios {
  tipo: 'municipio' | 'escola' | 'todos';
  municipio_id?: string;
  municipio_nome?: string;
  escola_id?: string;
  escola_nome?: string;
}

/** Payload de criação: apenas município ou escola (sem escopo global). */
export type CreateAvisoDestinatarios =
  | { tipo: 'municipio'; municipio_id: string; municipio_nome?: string }
  | { tipo: 'escola'; escola_id: string; escola_nome?: string; municipio_id?: string; municipio_nome?: string };

export interface Aviso {
  id: string;
  titulo: string;
  mensagem: string;
  data: string;
  autor: string;
  autor_id: string;
  autor_role: string;
  destinatarios: AvisoDestinatarios;
  created_at: string;
  updated_at?: string;
  /** Vindo de `extendedProps.read` no calendário (destinatário materializado). */
  readOnServer?: boolean;
}

export interface CreateAvisoDTO {
  titulo: string;
  mensagem: string;
  destinatarios: CreateAvisoDestinatarios;
}

export interface AvisosFilters {
  role: string;
  user_id: string;
  municipio_id?: string;
  escola_id?: string;
}

export interface AvisosPermissions {
  canCreate: boolean;
  canSelectMunicipality: boolean;
  canSelectSchool: boolean;
  scope: 'municipio' | 'escola';
}
