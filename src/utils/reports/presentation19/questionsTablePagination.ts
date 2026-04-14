import type { SlideQuestionRow } from "@/types/presentation19-slides";

/** Máximo de linhas de questão por slide da tabela (da 16ª questão em diante → nova página). */
export const PRESENTATION19_QUESTIONS_PER_TABLE_PAGE = 15;

/** Fatia `SlideQuestionRow[]` na mesma regra de paginação da tabela exportada. */
export function chunkPresentation19SlideQuestionRows(items: SlideQuestionRow[]): SlideQuestionRow[][] {
  if (items.length === 0) return [];
  const pages: SlideQuestionRow[][] = [];
  for (let i = 0; i < items.length; i += PRESENTATION19_QUESTIONS_PER_TABLE_PAGE) {
    pages.push(items.slice(i, i + PRESENTATION19_QUESTIONS_PER_TABLE_PAGE));
  }
  return pages;
}

export function chunkPresentation19QuestionTableRows<T>(rows: T[]): T[][] {
  if (rows.length === 0) return [[]];
  const pages: T[][] = [];
  for (let i = 0; i < rows.length; i += PRESENTATION19_QUESTIONS_PER_TABLE_PAGE) {
    pages.push(rows.slice(i, i + PRESENTATION19_QUESTIONS_PER_TABLE_PAGE));
  }
  return pages;
}
