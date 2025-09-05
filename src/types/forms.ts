/**
 * Tipos para os formulários socioeconômicos
 */

export interface SubQuestion {
  id: string;
  text?: string;
  texto?: string; // Para compatibilidade com formsData.ts
}

export interface Question {
  id: string;
  text?: string;
  texto?: string; // Para compatibilidade com formsData.ts
  type?: 'selecao_unica' | 'multipla_escolha' | 'matriz_selecao' | 'matriz_selecao_complexa' | 'slider' | 'slider_com_opcao' | 'matriz_slider' | 'textarea';
  tipo?: 'selecao_unica' | 'multipla_escolha' | 'matriz_selecao' | 'matriz_selecao_complexa' | 'slider' | 'slider_com_opcao' | 'matriz_slider' | 'textarea'; // Para compatibilidade
  options?: string[];
  opcoes?: string[]; // Para compatibilidade
  subQuestions?: SubQuestion[];
  subPerguntas?: SubQuestion[]; // Para compatibilidade
  dependsOn?: {
    id: string | string[];
    value: string | string[];
  };
  min?: number;
  max?: number;
  optionId?: string;
  optionText?: string;
  required?: boolean;
  obrigatoria?: boolean; // Para compatibilidade
}

export interface FormSection {
  title: string;
  questions: Question[];
}

export interface FormType {
  id: string;
  name: string;
  description: string;
  targetAudience: string;
  educationLevel: string;
  questions: Question[] | FormSection[];
  icon: string;
  color: string;
  ageRange?: string;
  gradeRange?: string;
  specialBadge?: string;
}

export interface FormRegistration {
  id: string;
  formType: string;
  title: string;
  description: string;
  targetAudience: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}
