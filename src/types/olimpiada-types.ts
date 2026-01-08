import { Evaluation, Subject, Grade, ClassInfo } from './evaluation-types';

/**
 * Interface para Olimpíada
 * Similar a Evaluation, mas com type: "OLIMPIADA"
 */
export interface Olimpiada extends Omit<Evaluation, 'type'> {
  type: "OLIMPIADA";
  // Por enquanto usa classes como avaliações normais
  // Futuro: adicionar selected_students quando backend suportar
  classes?: string[];
  selected_students?: string[]; // Para uso futuro
}

/**
 * Dados do formulário de criação/edição de Olimpíada
 */
export interface OlimpiadaFormData {
  title: string;
  description?: string;
  type: "OLIMPIADA";
  model: "PROVA"; // Modelo padrão para olimpíadas
  course: string;
  grade: string;
  subjects: Subject[];
  schools: string[];
  municipalities: string[];
  classes: string[]; // IDs das turmas selecionadas
  selectedClasses?: ClassInfo[]; // Informações completas das turmas
  questions: string[]; // IDs das questões
  startDateTime?: string;
  duration: string | number;
  evaluation_mode?: "virtual" | "physical";
  created_by?: string;
}

/**
 * Filtros para busca de alunos (uso futuro)
 */
export interface StudentFilter {
  estado?: string;
  municipio?: string;
  escola?: string;
  serie?: string;
  turma?: string;
  search?: string;
}

/**
 * Dados de resultado de Olimpíada
 */
export interface OlimpiadaResult {
  id: string;
  olimpiada_id: string;
  student_id: string;
  student_name: string;
  score: number;
  proficiency: number;
  classification: string;
  correct_answers: number;
  total_questions: number;
  position?: number; // Posição no ranking
  completed_at: string;
}

/**
 * Dados de ranking de Olimpíada
 */
export interface OlimpiadaRanking {
  position: number;
  student_id: string;
  student_name: string;
  student_avatar?: string;
  score: number;
  proficiency: number;
  classification: string;
  correct_answers: number;
  total_questions: number;
  school?: string;
  class?: string;
}

/**
 * Status da Olimpíada
 */
export type OlimpiadaStatus = 'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled';

/**
 * Card de Olimpíada para exibição
 */
export interface OlimpiadaCardData {
  id: string;
  title: string;
  description?: string;
  status: OlimpiadaStatus;
  startDateTime?: string;
  endDateTime?: string;
  totalStudents?: number;
  completedStudents?: number;
  subjects?: Subject[];
  created_at?: string;
}
