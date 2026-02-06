// Tipos para a resposta de atualização de questões (PUT /questions/<question_id>)

export interface UpdateQuestionResponse {
  message: string;
  question_id: string;
  version: number;
  
  // Campos opcionais retornados quando há mudança de gabarito
  gabarito_changed?: boolean;
  old_answer?: string;
  new_answer?: string;
  recalculation?: {
    status: 'completed' | 'processing' | 'skipped' | 'error';
    mode: 'sync' | 'async';
    tests_affected: number;
    students_recalculated: number;
    errors: number;
  };
}
