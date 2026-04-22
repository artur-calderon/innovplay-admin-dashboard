import type { SlideQuestionRow } from "@/types/presentation19-slides";
import {
  P19_CONTENT,
  P19_TABLE_CELL_FONT_PX,
  P19_TABLE_CELL_PADDING_PX,
  P19_TABLE_QUESTIONS_DESC_FONT_PX,
  p19PdfLineHeightPx,
} from "@/utils/reports/presentation19/presentation19ExportTypography";

/**
 * Referência histórica: ~14 linhas curtas cabiam por slide antes da paginação por altura.
 * A divisão efetiva é feita por `estimatePresentation19QuestionRowHeightPx` + orçamento abaixo.
 */
export const PRESENTATION19_QUESTIONS_PER_TABLE_PAGE = 14;

/** Larguras relativas iguais ao `PdfRenderer` / preview (colunas 0–3). */
const Q_COL_FR = [0.09, 0.16, 0.58, 0.12] as const;

/**
 * Altura aproximada do cabeçalho da tabela (uma linha + padding) no jsPDF-autotable,
 * alinhada a P19_TABLE_CELL_FONT_PX + P19_TABLE_CELL_PADDING_PX.
 */
const P19_QUESTIONS_TABLE_HEADER_HEIGHT_PX = 38;

/**
 * Altura máxima estimada (cabeçalho + linhas) para caber numa página A4 landscape
 * após título + “Página x/y”, sem o autotable abrir página extra no meio do slide.
 * Conservador para títulos em 2 linhas e rodapé.
 */
const P19_QUESTIONS_TABLE_MAX_TOTAL_HEIGHT_PX = 400;

function innerColWidthPx(colIndex: number): number {
  const frac = Q_COL_FR[colIndex] ?? 0.25;
  return Math.max(40, P19_CONTENT.w * frac - P19_TABLE_CELL_PADDING_PX * 2);
}

/** Caracteres por linha aproximados (Helvetica no jsPDF) para `splitTextToSize`. */
function approxCharsPerLine(fontSizePx: number, innerWidthPx: number): number {
  const avgCharPx = fontSizePx * 0.52;
  return Math.max(6, Math.floor(innerWidthPx / avgCharPx));
}

/**
 * Estima a altura em px de uma linha da tabela de questões (a maior célula manda).
 * Usa as mesmas proporções de coluna do PDF para não subestimar a coluna Descrição.
 */
export function estimatePresentation19QuestionRowHeightPx(row: SlideQuestionRow): number {
  const pad = P19_TABLE_CELL_PADDING_PX * 2;
  const lhDesc = p19PdfLineHeightPx(P19_TABLE_QUESTIONS_DESC_FONT_PX);
  const lhCell = p19PdfLineHeightPx(P19_TABLE_CELL_FONT_PX);

  const desc = String(row.habilidadeDescricao ?? "—");
  const hab = String(row.habilidade ?? "");
  const quest = String(row.questao);
  const pct = `${Number(row.percentualAcertos).toFixed(1).replace(".", ",")}%`;

  const wDesc = innerColWidthPx(2);
  const wHab = innerColWidthPx(1);
  const wQuest = innerColWidthPx(0);
  const wPct = innerColWidthPx(3);

  const linesDesc = Math.max(1, Math.ceil(desc.length / approxCharsPerLine(P19_TABLE_QUESTIONS_DESC_FONT_PX, wDesc)));
  const linesHab = Math.max(1, Math.ceil(hab.length / approxCharsPerLine(P19_TABLE_CELL_FONT_PX, wHab)));
  const linesQuest = Math.max(1, Math.ceil(quest.length / approxCharsPerLine(P19_TABLE_CELL_FONT_PX, wQuest)));
  const linesPct = Math.max(1, Math.ceil(pct.length / approxCharsPerLine(P19_TABLE_CELL_FONT_PX, wPct)));

  const hDesc = linesDesc * lhDesc + pad;
  const hHab = linesHab * lhCell + pad;
  const hQuest = linesQuest * lhCell + pad;
  const hPct = linesPct * lhCell + pad;

  return Math.max(hDesc, hHab, hQuest, hPct);
}

function rebalanceLastOrphanChunk(chunks: SlideQuestionRow[][]): void {
  if (chunks.length < 2) return;
  const last = chunks[chunks.length - 1];
  const prev = chunks[chunks.length - 2];
  if (!last || !prev || last.length !== 1) return;

  const lone = last[0];
  if (lone == null) return;

  const prevBody = prev.reduce((s, r) => s + estimatePresentation19QuestionRowHeightPx(r), 0);
  const loneH = estimatePresentation19QuestionRowHeightPx(lone);
  const mergedTotal = P19_QUESTIONS_TABLE_HEADER_HEIGHT_PX + prevBody + loneH;

  if (mergedTotal <= P19_QUESTIONS_TABLE_MAX_TOTAL_HEIGHT_PX) {
    prev.push(lone);
    chunks.pop();
  }
}

/**
 * Divide as questões em blocos por slide conforme altura estimada do texto
 * (principalmente a coluna Descrição), evitando cortes / linhas “sumidas” entre páginas.
 */
export function chunkPresentation19SlideQuestionRows(items: SlideQuestionRow[]): SlideQuestionRow[][] {
  if (items.length === 0) return [];

  const chunks: SlideQuestionRow[][] = [];
  let current: SlideQuestionRow[] = [];
  let bodyHeightPx = 0;

  for (const row of items) {
    const rowH = estimatePresentation19QuestionRowHeightPx(row);
    const totalIfAdd = P19_QUESTIONS_TABLE_HEADER_HEIGHT_PX + bodyHeightPx + rowH;

    if (current.length > 0 && totalIfAdd > P19_QUESTIONS_TABLE_MAX_TOTAL_HEIGHT_PX) {
      chunks.push(current);
      current = [];
      bodyHeightPx = 0;
    }

    current.push(row);
    bodyHeightPx += rowH;
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  rebalanceLastOrphanChunk(chunks);
  return chunks;
}
