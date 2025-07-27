/**
 * Types para a entidade Answers
 * Corresponde à tabela: student_answers
 * 
 * Esta tabela contém as respostas individuais dos alunos para cada questão
 */

export interface StudentAnswerEntity {
  // Campos principais da tabela student_answers
  id: string;
  student_id: string;
  test_id: string;
  question_id: string;
  answer: string;
  answered_at: string;
  is_correct: boolean;
  manual_score: number;
  feedback: string;
  corrected_by: string;
  corrected_at: string;
}

// Tipos auxiliares para Answers
export interface AnswerWithDetails extends StudentAnswerEntity {
  question_number: number;
  question_text: string;
  question_type: 'multipleChoice' | 'open' | 'trueFalse';
  question_value: number;
  correct_answer: string;
  student_name: string;
  time_spent: number; // tempo gasto na questão em segundos
}

export interface AnswerStats {
  totalAnswers: number;
  correctAnswers: number;
  incorrectAnswers: number;
  blankAnswers: number;
  accuracyRate: number; // porcentagem de acerto
  averageTimePerQuestion: number; // tempo médio por questão
}

export interface QuestionAnalysis {
  question_id: string;
  question_number: number;
  question_text: string;
  total_attempts: number;
  correct_attempts: number;
  incorrect_attempts: number;
  blank_attempts: number;
  accuracy_rate: number;
  common_wrong_answers: Array<{
    answer: string;
    count: number;
    percentage: number;
  }>;
}

export interface AnswerFilters {
  studentId?: string;
  questionId?: string;
  isCorrect?: boolean;
  hasManualScore?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface StudentAnswerSummary {
  student_id: string;
  student_name: string;
  total_answers: number;
  correct_answers: number;
  incorrect_answers: number;
  blank_answers: number;
  accuracy_rate: number;
  total_time_spent: number;
  average_time_per_question: number;
}

export type AnswerType = 'correct' | 'incorrect' | 'blank' | 'partial'; 