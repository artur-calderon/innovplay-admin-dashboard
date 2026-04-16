import type { SlideQuestionRow } from "@/types/presentation19-slides";

/**
 * Máximo de linhas de corpo por slide no PDF (área útil + título): acima disso o jsPDF-autotable
 * quebra para outra página dentro do mesmo slide e gera página “órfã” com 1 linha.
 */
export const PRESENTATION19_QUESTIONS_PER_TABLE_PAGE = 14;

/**
 * Divide em páginas com no máximo `maxPerPage` linhas e distribui o resto de forma equilibrada
 * (evita último bloco com 1 linha solta quando há mais de uma página).
 */
function chunkBalanced<T>(rows: T[], maxPerPage: number): T[][] {
  if (rows.length === 0) return [];
  const n = rows.length;
  if (n <= maxPerPage) return [rows];

  const k = Math.ceil(n / maxPerPage);
  const baseSize = Math.floor(n / k);
  const remainder = n % k;

  const out: T[][] = [];
  let start = 0;
  for (let i = 0; i < k; i++) {
    const sz = baseSize + (i < remainder ? 1 : 0);
    out.push(rows.slice(start, start + sz));
    start += sz;
  }
  return out;
}

/** Fatia `SlideQuestionRow[]` na mesma regra de paginação da tabela exportada. */
export function chunkPresentation19SlideQuestionRows(items: SlideQuestionRow[]): SlideQuestionRow[][] {
  return chunkBalanced(items, PRESENTATION19_QUESTIONS_PER_TABLE_PAGE);
}

export function chunkPresentation19QuestionTableRows<T>(rows: T[]): T[][] {
  return chunkBalanced(rows, PRESENTATION19_QUESTIONS_PER_TABLE_PAGE);
}
