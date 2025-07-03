// Classificações de proficiência
export type ProficiencyLevel = 'abaixo_do_basico' | 'basico' | 'adequado' | 'avancado';

// Interface para proficiência individual
export interface StudentProficiency {
  studentId: string;
  studentName: string;
  studentClass: string;
  rawScore: number; // Nota bruta (0-10)
  proficiencyScore: number; // Proficiência calculada (0-1000)
  proficiencyLevel: ProficiencyLevel;
  classification: string; // Texto da classificação
  answeredQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  blankAnswers: number;
  timeSpent?: number; // Em minutos
  status: 'completed' | 'pending' | 'absent';
}

// Interface para dados de turma
export interface ClassPerformance {
  classId: string;
  className: string;
  averageProficiency: number;
  averageScore: number;
  totalStudents: number;
  completedStudents: number;
  distributionByLevel: {
    abaixo_do_basico: number;
    basico: number;
    adequado: number;
    avancado: number;
  };
}

// Interface para dados de avaliação completa
export interface EvaluationResultsData {
  id: string;
  evaluationId: string;
  evaluationTitle: string;
  subject: string;
  subjectId: string;
  course: string;
  courseId: string;
  grade: string;
  gradeId: string;
  school: string;
  schoolId: string;
  municipality: string;
  municipalityId: string;
  appliedAt: string;
  correctedAt?: string;
  status: 'completed' | 'pending' | 'in_progress';
  
  // Estatísticas gerais
  totalStudents: number;
  completedStudents: number;
  pendingStudents: number;
  absentStudents: number;
  
  // Médias gerais
  averageRawScore: number;
  averageProficiency: number;
  
  // Distribuição por classificação
  distributionByLevel: {
    abaixo_do_basico: number;
    basico: number;
    adequado: number;
    avancado: number;
  };
  
  // Dados por turma
  classesPerformance: ClassPerformance[];
  
  // Dados individuais dos alunos
  studentsData: StudentProficiency[];
}

// Filtros para a página de resultados
export interface ResultsFilters {
  course?: string;
  subject?: string;
  class?: string;
  school?: string;
  proficiencyRange?: [number, number]; // Range de 0 a 1000
  scoreRange?: [number, number]; // Range de 0 a 10
  proficiencyLevels?: ProficiencyLevel[];
  status?: ('completed' | 'pending' | 'in_progress')[];
  dateRange?: {
    start: string;
    end: string;
  };
}

// Interface para dados de exportação
export interface ExportData {
  type: 'pdf' | 'excel';
  filters: ResultsFilters;
  data: EvaluationResultsData[];
  includeCharts?: boolean;
  includeDetails?: boolean;
}

// Cores para classificações
export const proficiencyColors = {
  abaixo_do_basico: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200',
    dot: 'bg-red-500'
  },
  basico: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-200',
    dot: 'bg-yellow-500'
  },
  adequado: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-200',
    dot: 'bg-green-500'
  },
  avancado: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    dot: 'bg-emerald-600'
  }
};

// Textos das classificações
export const proficiencyLabels = {
  abaixo_do_basico: 'Abaixo do Básico',
  basico: 'Básico',
  adequado: 'Adequado',
  avancado: 'Avançado'
};

// Função para calcular proficiência (exemplo)
export function calculateProficiency(rawScore: number, totalQuestions: number): {
  proficiencyScore: number;
  proficiencyLevel: ProficiencyLevel;
  classification: string;
} {
  // Conversão da nota bruta para proficiência (escala 0-1000)
  const proficiencyScore = Math.round((rawScore / 10) * 1000);
  
  let proficiencyLevel: ProficiencyLevel;
  let classification: string;
  
  if (proficiencyScore < 200) {
    proficiencyLevel = 'abaixo_do_basico';
    classification = 'Abaixo do Básico';
  } else if (proficiencyScore < 500) {
    proficiencyLevel = 'basico';
    classification = 'Básico';
  } else if (proficiencyScore < 750) {
    proficiencyLevel = 'adequado';
    classification = 'Adequado';
  } else {
    proficiencyLevel = 'avancado';
    classification = 'Avançado';
  }
  
  return {
    proficiencyScore,
    proficiencyLevel,
    classification
  };
} 