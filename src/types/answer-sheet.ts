export interface Estado {
  id: string;
  name: string;
}

export interface Municipio {
  id: string;
  name: string;
  state: string;
}

export interface AnswerSheetConfig {
  estado: string;
  estado_sigla: string;
  municipio: string;
  municipio_id: string;
  escola_id: string;
  escola_nome: string;
  serie_id: string;
  serie_nome: string;
  turma_id: string;
  turma_nome: string;
  prova_titulo: string;
  total_questoes: number;
  gabarito: Record<number, 'A' | 'B' | 'C' | 'D'>;
  data_geracao: string;
  questoes_detalhes?: Array<{
    numero: number;
    id: string;
    disciplina: string;
  }>;
}

export interface StudentAnswerSheet {
  id: string;
  name: string;
  email?: string;
  class_name: string;
  presente: boolean;
}

export interface QRCodeData {
  aluno_id: string;
  escola_id: string;
  turma_id: string;
  prova_titulo: string;
  data_geracao: string;
  gabarito_hash?: string;
}

export interface School {
  id: string;
  name: string;
  city?: string;
  municipio?: string;
}

export interface Serie {
  id: string;
  name: string;
}

export interface Turma {
  id: string;
  name: string;
  serie_id?: string;
  escola_id?: string;
}

export interface Student {
  id: string;
  name: string;
  email?: string;
  class_name?: string;
  turma_id?: string;
  escola_id?: string;
}

/** Resumo de escola (apenas quando scope_type === 'city') */
export interface GabaritoSchoolSummary {
  school_id: string;
  school_name: string;
  classes_count: number;
  students_count: number;
}

export interface Gabarito {
  id: string;
  test_id: string | null;
  class_id?: string | null;
  class_name?: string | null;
  grade_id?: string | null;
  grade_name?: string;
  num_questions?: number;
  use_blocks?: boolean;
  title: string;
  school_id?: string | null;
  school_name?: string;
  municipality?: string;
  state?: string;
  institution?: string;
  created_at: string;
  created_by?: string;
  creator_name?: string;
  // Novos campos para batch
  is_batch?: boolean;
  batch_id?: string | null;
  // Formato lista (GET /gabaritos): escopo escola/série/city
  scope_type?: 'class' | 'grade' | 'school' | 'city';
  classes_count?: number;
  students_count?: number;
  generation_status?: string;
  can_download?: boolean;
  minio_url?: string;
  /** URL do backend para download (com ?redirect=1). Usar no link "Baixar"; não usar minio_url no navegador. */
  download_url?: string;
  /** Apenas quando scope_type === 'city' */
  schools_summary?: GabaritoSchoolSummary[];
}

export interface GabaritosResponse {
  gabaritos: Gabarito[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

// Novos tipos para batch
export interface BatchClass {
  gabarito_id: string;
  class_id: string;
  class_name: string;
  grade_name: string;
  filename?: string;
  total_students?: number;
  total_pages?: number;
  school_name?: string;
}

export interface GenerateResponseData {
  status: 'processing' | 'completed' | 'failed';
  message: string;
  task_id: string;
  scope: 'class' | 'grade' | 'school';
  scope_name: string;
  batch_id: string | null;
  gabarito_ids: string[];
  classes_count: number;
  classes: BatchClass[];
  num_questions: number;
  polling_url: string;
}

/** Turma pulada na geração (ex.: sem alunos cadastrados) */
export interface SkippedClass {
  class_name: string;
  grade_name: string;
}

export interface TaskStatusResult {
  success: boolean;
  scope: 'class' | 'grade' | 'school';
  batch_id?: string;
  gabarito_ids: string[];
  total_classes: number;
  total_students: number;
  total_pdfs: number;
  minio_url: string;
  download_size_bytes?: number;
  classes: BatchClass[];
  /** Turmas puladas (ex.: sem alunos) — mensagens legíveis em warnings */
  skipped_classes?: SkippedClass[];
  // Campos antigos (quando scope === 'class')
  sheets?: any[];
  generated_sheets?: number;
}

/** Resposta da rota GET /task/<task_id>/status */
export interface TaskStatusResponse {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message?: string;
  task_id: string;
  warnings?: string[];
  result?: TaskStatusResult;
  error?: string;
}

export interface BatchDownloadResponse {
  download_url: string;
  expires_in: string;
  batch_id: string;
  classes_count: number;
  classes: BatchClass[];
  title: string;
  num_questions: number;
  generated_at: string;
  created_at: string;
  minio_url: string;
}


