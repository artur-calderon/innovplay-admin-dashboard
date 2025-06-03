export interface Subject {
  id: string;
  name: string;
  questionCount: number;
}

export interface Question {
  id: string;
  number: number;
  text: string;
  subjectId: string;
}

export interface EvaluationFormData {
  title: string;
  municipalities: string[];
  schools: string[];
  course: string;
  grade: string;
  classId: string;
  skill: string;
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