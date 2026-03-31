/** Máximo de linhas de questão por slide da tabela (da 16ª questão em diante → nova página). */
export const PRESENTATION19_QUESTIONS_PER_TABLE_PAGE = 15;

export function chunkPresentation19QuestionTableRows<T>(rows: T[]): T[][] {
  if (rows.length === 0) return [[]];
  const pages: T[][] = [];
  for (let i = 0; i < rows.length; i += PRESENTATION19_QUESTIONS_PER_TABLE_PAGE) {
    pages.push(rows.slice(i, i + PRESENTATION19_QUESTIONS_PER_TABLE_PAGE));
  }
  return pages;
}
