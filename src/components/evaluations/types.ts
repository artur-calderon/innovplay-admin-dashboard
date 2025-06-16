export interface Subject {
  id: string;
  name: string;
}

export interface Question {
  id: string;
  title: string;
  text: string;
  secondStatement?: string;
  type: "multipleChoice" | "open" | "trueFalse";
  subjectId: string;
  subject: string;
  grade: string;
  difficulty: string;
  value: string;
  solution: string;
  options: {
    id: string;
    text: string;
    isCorrect: boolean;
  }[];
  skills: string[];
  topics: string[];
  created_by: string;
}

export interface EvaluationFormData {
  title: string;
  municipalities: string[];
  schools: string[];
  course: string;
  grade: string;
  classId: string;
  type: "AVALIACAO" | "SIMULADO";
  model: "SAEB" | "PROVA" | "AVALIE";
  subjects: Subject[];
  subject: string;
  questions: Question[];
}

export interface TeacherSchool {
  id: string;
  name: string;
  city: string;
  state: string;
}

export interface SubjectModalProps {
  subjects: Subject[];
  onSubjectsChange: (subjects: Subject[]) => void;
  availableSubjects: Subject[];
  onClose: () => void;
} 