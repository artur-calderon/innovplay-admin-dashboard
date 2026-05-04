export interface PlayTvResourceLink {
  id?: string;
  type: 'link';
  title: string;
  sort_order?: number;
  url: string;
}

export interface PlayTvResourceFile {
  id?: string;
  type: 'file';
  title: string;
  sort_order?: number;
  file_name: string;
  mime_type?: string;
  size_bytes?: number;
}

export type PlayTvResource = PlayTvResourceLink | PlayTvResourceFile;

export interface PlayTvVideo {
  id: string;
  url: string;
  title?: string | null;
  entire_municipality?: boolean;
  schools: Array<{ id: string; name: string }>;
  classes?: Array<{ id: string; name: string }>;
  grade: { id: string; name: string };
  subject: { id: string; name: string };
  resources?: PlayTvResource[];
  created_at: string;
  created_by?: { id: string; name: string };
}

/** Corpo parcial para PUT /play-tv/videos/:id (envie só o que mudar). */
export interface UpdatePlayTvVideoDTO {
  title?: string | null;
  url?: string;
  grade?: string;
  subject?: string;
  entire_municipality?: boolean;
  schools?: string[];
  classes?: string[];
  resources?: Array<{
    id?: string;
    type: 'link';
    title: string;
    url: string;
    sort_order?: number;
  }>;
}

export interface CreatePlayTvVideoLinkResourceDTO {
  type: 'link';
  title: string;
  url: string;
  sort_order?: number;
}

export interface CreatePlayTvVideoDTO {
  url: string;
  title?: string;
  schools: string[];
  /** Lista opcional de IDs de turmas (UUID). */
  classes?: string[];
  grade: string;
  subject: string;
  resources?: CreatePlayTvVideoLinkResourceDTO[];
}

export interface PlayTvFilters {
  school?: string;
  grade?: string;
  subject?: string;
}

export interface PlayTvSchool {
  id: string;
  name: string;
  city_id?: string;
}

export interface PlayTvGrade {
  id: string;
  name: string;
}

export interface PlayTvSubject {
  id: string;
  name: string;
}

export function isPlayTvLinkResource(r: PlayTvResource): r is PlayTvResourceLink {
  return r.type === 'link';
}

export function isPlayTvFileResource(r: PlayTvResource): r is PlayTvResourceFile {
  return r.type === 'file';
}
