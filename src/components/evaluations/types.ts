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
  subject: { id: string, name: string };
  grade: { id: string, name: string };
  difficulty: string;
  value: string;
  solution: string;
  formattedText?: string;
  formattedSolution?: string;
  options: {
    id: string;
    text: string;
    isCorrect: boolean;
  }[];
  skills: string[];
  topics: string[];
  created_by: string;
  educationStage?: { id: string; name: string; } | null;
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