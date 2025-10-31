// Interfaces para o sistema de avisos
// TODO: Integrar com API quando endpoints estiverem disponíveis

export interface AvisoDestinatarios {
  tipo: 'todos' | 'municipio' | 'escola';
  municipio_id?: string;
  municipio_nome?: string;
  escola_id?: string;
  escola_nome?: string;
}

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
}

export interface CreateAvisoDTO {
  titulo: string;
  mensagem: string;
  destinatarios: AvisoDestinatarios;
}

export interface AvisosFilters {
  role: string;
  user_id: string;
  municipio_id?: string;
  escola_id?: string;
}

export interface AvisosPermissions {
  canCreate: boolean;
  canSendToAll: boolean;
  canSelectMunicipality: boolean;
  canSelectSchool: boolean;
  scope: 'todos' | 'municipio' | 'escola';
}

