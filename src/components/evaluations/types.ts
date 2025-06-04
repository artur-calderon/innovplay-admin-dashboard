export interface Subject {
  id: string;
  name: string;
  questionCount: number;
}

export interface QuestionOption {
  id: string; // e.g., "a", "b", "c"
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  number: number; // Order in an evaluation
  text: string; // Main statement
  subjectId: string; // Link to the subject (if applicable/needed)
  type: 'multipleChoice' | 'essay'; // Question type
  subject: string; // Subject name (redundant if subjectId is used, but present in mock/form)
  grade: string; // Grade level (redundant if subjectId is used, but present in mock/form)
  difficulty: string; // Difficulty level
  value: number; // Point value of the question
  solution?: string; // Optional solution/explanation
  options?: QuestionOption[]; // Options for multiple choice questions
  title: string; // Add title field from form
  secondStatement?: string; // Add secondStatement field from form
  skills?: string; // Add skills field from form
  topics?: string[]; // Add topics field from form
}

export interface EvaluationFormData {
  title: string;
  municipalities: string[];
  schools: string[];
  course: string;
  grade: string;
  classId: string;
  model: 'SAEB' | 'AVALIE' | 'PROVA';
  type: 'SIMULADO' | 'AVALIACAO';
  subjects?: Subject[];
  questions?: Question[];
}

export interface TeacherSchool {
  id: string;
  name: string;
  classes: {
    id: string;
    name: string;
    grade: string;
  }[];
} 