/**
 * Types para a entidade Test
 * Corresponde à tabela: test
 * 
 * Esta tabela contém as informações principais das avaliações/testes
 */

export interface TestEntity {
  // Campos principais da tabela test
  id: string;
  title: string;
  description: string;
  instructions: string;
  type: string;
  max_score: number;
  time_limit: number;
  end_time: string;
  duration: number;
  evaluation_mode: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  subject: string;
  grade_id: string;
  municipalities: any[];
  schools: any[];
  course: string;
  model: string;
  subjects_info: Array<{
    id: string;
    name: string;
  }>;
  status: string;
}

// Tipos auxiliares para a entidade Test
export interface TestFilters {
  subject?: string;
  grade?: string;
  status?: string;
  course?: string;
}

export interface TestStats {
  totalStudents: number;
  completedSessions: number;
  averageScore: number;
  averageDuration: number;
}

export type TestStatus = 'draft' | 'active' | 'completed' | 'cancelled'; 