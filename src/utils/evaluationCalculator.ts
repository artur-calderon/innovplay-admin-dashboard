/**
 * Utilitários para cálculo de proficiência, nota e classificação por disciplina
 * Baseado nas fórmulas oficiais do sistema de avaliação
 */

type CourseLevel = 'educacao_infantil' | 'anos_iniciais' | 'anos_finais' | 
                   'ensino_medio' | 'eja' | 'educacao_especial';

type SubjectType = 'matematica' | 'outras';

interface ProficiencyConfig {
  maxProficiency: number;
}

interface GradeConfig {
  base: number;
  divisor: number;
}

// Configurações de proficiência máxima
const MAX_PROFICIENCY_CONFIG: Record<string, Record<SubjectType, number>> = {
  'educacao_infantil': { matematica: 375, outras: 350 },
  'anos_iniciais': { matematica: 375, outras: 350 },
  'educacao_especial': { matematica: 375, outras: 350 },
  'eja': { matematica: 375, outras: 350 },
  'anos_finais': { matematica: 425, outras: 400 },
  'ensino_medio': { matematica: 425, outras: 400 }
};

// Configurações para cálculo de nota
const GRADE_CONFIG: Record<string, Record<SubjectType, GradeConfig>> = {
  'educacao_infantil': {
    matematica: { base: 60, divisor: 262 },
    outras: { base: 49, divisor: 275 }
  },
  'anos_iniciais': {
    matematica: { base: 60, divisor: 262 },
    outras: { base: 49, divisor: 275 }
  },
  'eja': {
    matematica: { base: 60, divisor: 262 },
    outras: { base: 49, divisor: 275 }
  },
  'anos_finais': {
    matematica: { base: 100, divisor: 300 },
    outras: { base: 100, divisor: 300 }
  },
  'ensino_medio': {
    matematica: { base: 100, divisor: 300 },
    outras: { base: 100, divisor: 300 }
  },
  'educacao_especial': {
    matematica: { base: 60, divisor: 262 },
    outras: { base: 49, divisor: 275 }
  }
};

/**
 * Determina o nível de curso baseado no nome do curso
 * Baseado na lógica do backend Python
 */
function determineCourseLevel(courseName: string): CourseLevel {
  if (!courseName) return 'anos_iniciais';
  
  const normalized = courseName.toLowerCase().trim();
  
  // Educação Infantil
  if (normalized.includes('infantil')) return 'educacao_infantil';
  
  // Educação Especial
  if (normalized.includes('especial')) return 'educacao_especial';
  
  // EJA
  if (normalized.includes('eja')) return 'eja';
  
  // Ensino Médio
  if (normalized.includes('médio') || normalized.includes('medio') || normalized.includes('em')) {
    return 'ensino_medio';
  }
  
  // Verificar "fundamental" com "i" ou "ii" (Anos Iniciais vs Finais)
  if (normalized.includes('fundamental')) {
    // Fundamental I ou Anos Iniciais
    if (normalized.includes(' i ') || normalized.includes(' i') || normalized.includes('i ')) {
      return 'anos_iniciais';
    }
    // Fundamental II ou Anos Finais
    if (normalized.includes(' ii ') || normalized.includes(' ii') || normalized.includes('ii ') || normalized.includes('ii')) {
      return 'anos_finais';
    }
    // Se só tem "fundamental" sem especificar, verificar contexto
    if (normalized.includes('inicial') || normalized.includes('iniciais')) {
      return 'anos_iniciais';
    }
    if (normalized.includes('final') || normalized.includes('finais')) {
      return 'anos_finais';
    }
  }
  
  // Anos Finais
  if (normalized.includes('finais') || normalized.includes('final')) return 'anos_finais';
  
  // Anos Iniciais
  if (normalized.includes('iniciais') || normalized.includes('inicial')) return 'anos_iniciais';
  
  return 'anos_iniciais'; // padrão
}

/**
 * Determina o tipo de disciplina (Matemática ou outras)
 */
function determineSubjectType(subjectName: string): SubjectType {
  if (!subjectName) return 'outras';
  
  const normalized = subjectName.toLowerCase().trim();
  return normalized.includes('matemática') || normalized.includes('matematica')
    ? 'matematica'
    : 'outras';
}

/**
 * Calcula a proficiência baseada no número de acertos
 */
export function calculateProficiency(
  correctAnswers: number,
  totalQuestions: number,
  courseName: string,
  subjectName: string
): number {
  if (totalQuestions === 0) return 0;
  
  const courseLevel = determineCourseLevel(courseName);
  const subjectType = determineSubjectType(subjectName);
  
  const maxProficiency = MAX_PROFICIENCY_CONFIG[courseLevel]?.[subjectType] ?? 350;
  
  const accuracyRate = correctAnswers / totalQuestions;
  let proficiency = accuracyRate * maxProficiency;
  
  // Garantir que não exceda o máximo
  proficiency = Math.min(proficiency, maxProficiency);
  
  return Math.round(proficiency * 100) / 100; // 2 casas decimais
}

/**
 * Calcula a nota baseada na proficiência ou acertos simples
 */
export function calculateGrade(
  proficiency: number,
  courseName: string,
  subjectName: string,
  useSimpleCalculation: boolean = false,
  correctAnswers?: number,
  totalQuestions?: number
): number {
  // Cálculo simples (percentual de acertos * 10)
  if (useSimpleCalculation && correctAnswers !== undefined && totalQuestions !== undefined) {
    if (totalQuestions === 0) return 0;
    const simpleGrade = (correctAnswers / totalQuestions) * 10;
    return Math.round(simpleGrade * 100) / 100;
  }
  
  // Cálculo complexo baseado na proficiência
  const courseLevel = determineCourseLevel(courseName);
  const subjectType = determineSubjectType(subjectName);
  
  const config = GRADE_CONFIG[courseLevel]?.[subjectType] ?? { base: 49, divisor: 275 };
  
  // Fórmula: (Proficiência - base) / divisor × 10
  let grade = ((proficiency - config.base) / config.divisor) * 10;
  
  // Limitar entre 0 e 10
  grade = Math.max(0, Math.min(10, grade));
  
  return Math.round(grade * 100) / 100;
}

/**
 * Determina a classificação baseada na proficiência
 */
export function determineClassification(
  proficiency: number,
  courseName: string,
  subjectName: string
): string {
  const courseLevel = determineCourseLevel(courseName);
  const subjectType = determineSubjectType(subjectName);
  
  // Faixas específicas por nível e disciplina
  if (courseLevel === 'anos_finais' || courseLevel === 'ensino_medio') {
    if (subjectType === 'matematica') {
      if (proficiency >= 350) return 'Avançado';
      if (proficiency >= 300) return 'Adequado';
      if (proficiency >= 225) return 'Básico';
      return 'Abaixo do Básico';
    } else {
      if (proficiency >= 325) return 'Avançado';
      if (proficiency >= 275) return 'Adequado';
      if (proficiency >= 200) return 'Básico';
      return 'Abaixo do Básico';
    }
  } else {
    // Anos Iniciais, Educação Infantil, EJA, Educação Especial
    if (subjectType === 'matematica') {
      if (proficiency >= 275) return 'Avançado';
      if (proficiency >= 225) return 'Adequado';
      if (proficiency >= 175) return 'Básico';
      return 'Abaixo do Básico';
    } else {
      if (proficiency >= 250) return 'Avançado';
      if (proficiency >= 200) return 'Adequado';
      if (proficiency >= 150) return 'Básico';
      return 'Abaixo do Básico';
    }
  }
}

