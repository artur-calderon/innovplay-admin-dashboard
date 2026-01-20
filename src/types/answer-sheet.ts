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

export interface Gabarito {
  id: string;
  test_id: string | null;
  class_id: string;
  class_name: string;
  num_questions: number;
  use_blocks: boolean;
  title: string;
  school_name: string;
  municipality: string;
  state: string;
  grade_name: string;
  institution: string;
  created_at: string;
  created_by: string;
  creator_name: string;
}

export interface GabaritosResponse {
  gabaritos: Gabarito[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}


