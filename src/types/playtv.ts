export interface PlayTvVideo {
  id: string;
  url: string;
  title?: string;
  schools: Array<{ id: string; name: string }>;
  grade: { id: string; name: string };
  subject: { id: string; name: string };
  created_at: string;
  created_by?: { id: string; name: string };
}

export interface CreatePlayTvVideoDTO {
  url: string;
  title?: string;
  schools: string[]; // IDs das escolas
  grade: string; // ID da série
  subject: string; // ID da disciplina
}

export interface PlayTvFilters {
  school?: string;
  grade?: string;
  subject?: string;
}

// Tipos auxiliares (não exportados para evitar conflitos)
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

