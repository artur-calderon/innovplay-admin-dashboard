export interface PlantaoOnline {
  id: string;
  link: string;
  title?: string;
  schools: Array<{ id: string; name: string }>;
  grade: { id: string; name: string };
  subject: { id: string; name: string };
  created_at: string;
  created_by?: { id: string; name: string };
}

export interface CreatePlantaoOnlineDTO {
  link: string;
  title: string;
  schools: string[]; // IDs das escolas
  grade: string; // ID da série
  subject: string; // ID da disciplina
}

export interface PlantaoFilters {
  school?: string;
  grade?: string;
  subject?: string;
}
