import type { CompetitionLevel } from '@/types/competition-types';

/**
 * Helpers de nível de competição.
 *
 * Nível 1: Educação Infantil, Anos Iniciais, Educação Especial, EJA
 * Nível 2: Anos Finais, Ensino Médio
 */

export function mapGradeNameToCompetitionLevel(
  gradeName?: string | null,
): CompetitionLevel | null {
  if (!gradeName) return null;
  const name = gradeName.trim().toLowerCase();

  const level1Patterns = [
    'pré-escola',
    'pré escola',
    'pré i',
    'pré ii',
    '1º ano',
    '2º ano',
    '3º ano',
    '4º ano',
    '5º ano',
  ];

  const level2Patterns = [
    '6º ano',
    '7º ano',
    '8º ano',
    '9º ano',
    '1ª série',
    '2ª série',
    '3ª série',
  ];

  if (level1Patterns.some((pattern) => name.includes(pattern.toLowerCase()))) {
    return 1;
  }
  if (level2Patterns.some((pattern) => name.includes(pattern.toLowerCase()))) {
    return 2;
  }
  return null;
}

// Mapeamento estático opcional por grade_id (preencha conforme a rede).
const GRADE_TO_LEVEL: Record<string, CompetitionLevel> = {
  // Exemplo: 5º Ano
  // 'f5688bb2-9624-487f-ab1f-40b191c96b76': 1,
};

export function mapGradeIdToCompetitionLevel(
  gradeId?: string | null,
): CompetitionLevel | null {
  if (!gradeId) return null;
  return GRADE_TO_LEVEL[gradeId] ?? null;
}

export function formatCompetitionLevel(
  level?: CompetitionLevel | number | null,
): string {
  if (level === 1) return 'Educação Infantil / Anos Iniciais';
  if (level === 2) return 'Anos Finais / Ensino Médio';
  return 'Nível não definido';
}

