// Tipos para dados de evolução do aluno
export interface EvolutionData {
  student: {
    id: string;
    user_id: string;
    name: string;
  };
  evaluations: Array<{
    order: number;
    id: string;
    title: string;
    created_at: string;
    application_date: string;
  }>;
  total_evaluations: number;
  comparisons: Array<{
    from_evaluation: {
      id: string;
      title: string;
      order: number;
    };
    to_evaluation: {
      id: string;
      title: string;
      order: number;
    };
    general_comparison: {
      student_grade: {
        evaluation_1: number;
        evaluation_2: number;
        evolution: {
          value: number;
          percentage: number;
          direction: 'increase' | 'decrease';
        };
      };
      student_proficiency: {
        evaluation_1: number;
        evaluation_2: number;
        evolution: {
          value: number;
          percentage: number;
          direction: 'increase' | 'decrease';
        };
      };
      student_classification: {
        evaluation_1: string;
        evaluation_2: string;
      };
      correct_answers: {
        evaluation_1: number;
        evaluation_2: number;
        evolution: {
          value: number;
          percentage: number;
          direction: 'increase' | 'decrease';
        };
      };
      total_questions: {
        evaluation_1: number;
        evaluation_2: number;
      };
      score_percentage: {
        evaluation_1: number;
        evaluation_2: number;
        evolution: {
          value: number;
          percentage: number;
          direction: 'increase' | 'decrease';
        };
      };
    };
    subject_comparison: Record<string, {
      subject_id: string;
      student_grade: {
        evaluation_1: number;
        evaluation_2: number;
        evolution: {
          value: number;
          percentage: number;
          direction: 'increase' | 'decrease';
        };
      };
      student_proficiency: {
        evaluation_1: number;
        evaluation_2: number;
        evolution: {
          value: number;
          percentage: number;
          direction: 'increase' | 'decrease';
        };
      };
      student_classification: {
        evaluation_1: string;
        evaluation_2: string;
      };
      correct_answers: {
        evaluation_1: number;
        evaluation_2: number;
        evolution: {
          value: number;
          percentage: number;
          direction: 'increase' | 'decrease';
        };
      };
      total_questions: {
        evaluation_1: number;
        evaluation_2: number;
      };
    }>;
    skills_comparison: Record<string, Record<string, {
      code: string;
      description: string;
      correct_answers: {
        evaluation_1: number;
        evaluation_2: number;
        evolution: {
          value: number;
          percentage: number;
          direction: 'increase' | 'decrease';
        };
      };
      total_questions: {
        evaluation_1: number;
        evaluation_2: number;
      };
      percentage: {
        evaluation_1: number;
        evaluation_2: number;
        evolution: {
          value: number;
          percentage: number;
          direction: 'increase' | 'decrease';
        };
      };
    }>>;
  }>;
  total_comparisons: number;
}

export interface ChartDataPoint {
  name: string; // Nome da avaliação
  value: number; // Valor (nota, proficiência, etc.)
  color: string; // Cor da barra
  order: number; // Ordem cronológica
}

export interface ChartVariation {
  from: number; // Índice da avaliação anterior
  to: number; // Índice da avaliação atual
  percentage: number; // Variação percentual
  direction: 'increase' | 'decrease';
}

export interface EvolutionChartData {
  discipline: string;
  evaluations: ChartDataPoint[];
  variations: ChartVariation[];
}

export type MetricType = 'grade' | 'proficiency' | 'classification';
export type DisciplineType = 'Geral' | 'Matemática' | 'Português' | string;
