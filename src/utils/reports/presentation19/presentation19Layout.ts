/**
 * Geometria do canvas Apresentação 19 (1123×793), alinhada ao `Presentation19NativePreviewDeck`.
 * PDF usa estes px diretamente; PPTX converte com `p19RectPxToSlideInches` / `p19PxToSlideIn*`.
 *
 * @module presentation19Layout
 *
 * ## Matriz de paridade (Preview = referência)
 * Ordem do deck: `buildSlideSpec`. Cada linha: kind → o que deve bater (tokens / mesma área útil).
 *
 * | kind | Conteúdo principal | Tokens chave |
 * |------|-------------------|----------------|
 * | cover-main | Título + card 2 colunas | P19_COVER_* |
 * | cover-school | Escola(s) centralizada(s) | P19_COVER_SCHOOL_* |
 * | metric-total-students | Métrica central | P19_METRIC_* |
 * | cover-segment | Título + card segmento | P19_SEGMENT_* |
 * | presence-table | Título + tabela | P19_TABLE_* |
 * | presence-chart | Título + subtítulo gráfico + barras | P19_CHART_* |
 * | section-levels | Título/tagline centro | P19_SECTION_* |
 * | levels-guide | Título + cards níveis | P19_LEVELS_GUIDE_* |
 * | levels-chart | Título (+ escola) + gráfico | P19_TITLE_* + gráfico |
 * | levels-table | Título (+ escola) + tabela níveis | P19_TABLE_* |
 * | section-proficiency | Centro | P19_SECTION_* |
 * | proficiency-general-chart | Título + subtítulo + gráfico | P19_CHART_SUBTITLE_PROFICIENCY |
 * | proficiency-by-discipline-chart | Título + mini-gráficos empilhados | cards P19_SURFACE_CARD |
 * | section-grades | Centro | P19_SECTION_* |
 * | grades-table | Título + tabela | P19_TABLE_* |
 * | grades-by-discipline-chart | Título + mini-gráficos por disciplina | cards P19_SURFACE_CARD |
 * | grades-chart | Título + subtítulo + gráfico | P19_CHART_SUBTITLE_GRADES |
 * | section-questions | Centro | P19_SECTION_* |
 * | dynamic-series-cover / dynamic-class-cover | Texto centro | P19_DYNAMIC_COVER_PX |
 * | questions-turma-cover | Linha capa turma | — |
 * | questions-table | Título (+ página) + tabela questões | P19_TABLE_QUESTIONS_DESC_* |
 * | questions-accuracy-chart | Título (+ página) + gráfico | P19_CHART_* |
 * | thank-you | Mensagem centro | P19_THANK_YOU_FONT_PX |
 */

import {
  P19_CONTENT,
  P19_PAGE,
  P19_SUBTITLE_FONT_PX,
  P19_TITLE_FONT_PX,
  P19_TITLE_TEXT_OFFSET_X_PX,
  p19PdfLineHeightPx,
  p19PxToSlideInX,
  p19PxToSlideInY,
} from "@/utils/reports/presentation19/presentation19ExportTypography";

/** Baseline da primeira linha do título com barra lateral (equiv. ao bloco Title no preview). */
export const P19_SLIDE_TITLE_FIRST_BASELINE_Y_PX = P19_CONTENT.y + 40;

/** Topo da caixa de título (PPTX) alinhado ao preview: baseline − ascender ~24 px para fonte 32. */
export const P19_SLIDE_TITLE_FIRST_LINE_TOP_PX = P19_SLIDE_TITLE_FIRST_BASELINE_Y_PX - 24;

/** Reserva inferior para rodapé/logo antes do fim do gráfico. */
export const P19_SLIDE_FOOTER_RESERVE_PX = 40;

/** Espaço entre fim do título (última baseline) e início da tabela / próximo bloco. */
export const P19_TITLE_TO_BODY_GAP_PX = 16;

/** Espaço entre fim do título e primeira linha do subtítulo (escola, legenda). */
export const P19_TITLE_TO_SUBTITLE_GAP_PX = 10;

/** Espaço entre fim do subtítulo e topo da área do gráfico. */
export const P19_SUBTITLE_TO_CHART_GAP_PX = 12;

/** Após título (sem subtítulo de legenda), gap até o gráfico “% acertos”. */
export const P19_TITLE_TO_ACCURACY_CHART_GAP_PX = 18;

/** Após subtítulo escola na tabela de níveis, até o topo da tabela. */
export const P19_ESCOLA_SUBTITLE_TO_TABLE_GAP_PX = 14;

/** Altura mínima da área do gráfico (barras). */
export const P19_CHART_AREA_MIN_HEIGHT_PX = 200;

/** Gap entre título de página (questões / acertos) e indicador "Página x/y" à direita (mesma baseline do título). */
export const P19_QUESTIONS_PAGE_INDICATOR_RIGHT_PAD_PX = 160;

/** Início vertical do guia de níveis (abaixo do título; reserva ~2 linhas de título no PPTX/PDF). */
export const P19_LEVELS_GUIDE_FIRST_ROW_TOP_PX = 192;

/** Altura de cada faixa do guia de níveis + gap. */
export const P19_LEVELS_GUIDE_ROW_STRIDE_PX = 128;

/** Raios e borda do card guia (preview: border + rounded). */
export const P19_LEVELS_GUIDE_CARD_RADIUS_PX = 10;
export const P19_LEVELS_GUIDE_CARD_BORDER_RGB = [226, 232, 240] as const;
export const P19_LEVELS_GUIDE_CARD_FILL_RGB = [248, 250, 252] as const;

/** Logo canto superior direito (PDF); PPTX espelha proporção. */
export const P19_DECK_LOGO_W_PX = 100;
export const P19_DECK_LOGO_H_PX = 36;
export const P19_DECK_LOGO_TOP_PX = 38;
export const P19_DECK_LOGO_RIGHT_MARGIN_PX = 40;

/** Padding interno gráfico de barras vertical. */
export const P19_CHART_V_BAR_TOP_PAD_PX = 6;
export const P19_CHART_V_BAR_BOTTOM_PAD_MIN_PX = 34;
export const P19_CHART_INNER_HORIZONTAL_PAD_PX = 8;

/** Deslocamento vertical do bloco centralizado (section-*). */
export const P19_SECTION_CENTER_VERTICAL_OFFSET_PX = 40;

/** Padding gráfico horizontal (presença etc.). */
export const P19_CHART_H_BAR_TOP_PAD_PX = 8;
export const P19_CHART_H_BAR_BOTTOM_PAD_PX = 18;
export const P19_CHART_H_BAR_BAR_THICKNESS_MAX_PX = 34;

/** Converte retângulo em px do canvas para caixa em polegadas no slide wide (13.333" × 7.5"). */
export function p19RectPxToSlideInches(box: { x: number; y: number; w: number; h: number }): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  return {
    x: p19PxToSlideInX(box.x),
    y: p19PxToSlideInY(box.y),
    w: (box.w / P19_PAGE.width) * 13.333,
    h: (box.h / P19_PAGE.height) * 7.5,
  };
}

/**
 * Estima o topo Y (px) da área do gráfico após título de 1 linha + subtítulo opcional (1 linha),
 * alinhado à heurística do `PdfRenderer` pós-`drawWrappedSlideTitle`.
 */
export function p19ChartAreaTopPxAfterTitle(subtitleLineCount: number): number {
  const titleLineH = p19PdfLineHeightPx(P19_TITLE_FONT_PX);
  const yAfterTitle = P19_SLIDE_TITLE_FIRST_BASELINE_Y_PX + titleLineH;
  if (subtitleLineCount <= 0) return yAfterTitle + P19_TITLE_TO_BODY_GAP_PX;
  const subLineH = p19PdfLineHeightPx(P19_SUBTITLE_FONT_PX);
  return yAfterTitle + P19_TITLE_TO_SUBTITLE_GAP_PX + subtitleLineCount * subLineH + P19_SUBTITLE_TO_CHART_GAP_PX;
}

/** Retângulo da área útil do gráfico de barras (vertical), espelhando o PDF. */
export function p19StandardBarChartRectPx(subtitleLineCount: number): { x: number; y: number; w: number; h: number } {
  const inset = P19_TITLE_TEXT_OFFSET_X_PX;
  const chartY = p19ChartAreaTopPxAfterTitle(subtitleLineCount);
  const h = Math.max(P19_CHART_AREA_MIN_HEIGHT_PX, P19_PAGE.height - chartY - P19_SLIDE_FOOTER_RESERVE_PX);
  return { x: P19_CONTENT.x + inset, y: chartY, w: P19_CONTENT.w - inset * 2, h };
}

/**
 * Proficiência geral: `PdfRenderer` usa `w: content.w - inset` (só margem esquerda), não `inset*2`.
 */
export function p19ProficiencyGeneralBarChartRectPx(subtitleLineCount: number): { x: number; y: number; w: number; h: number } {
  const inset = P19_TITLE_TEXT_OFFSET_X_PX;
  const chartY = p19ChartAreaTopPxAfterTitle(subtitleLineCount);
  const h = Math.max(P19_CHART_AREA_MIN_HEIGHT_PX, P19_PAGE.height - chartY - P19_SLIDE_FOOTER_RESERVE_PX);
  return { x: P19_CONTENT.x + inset, y: chartY, w: P19_CONTENT.w - inset, h };
}

/** Gráfico de presença/notas: largura total (sem inset duplo no PDF). */
export function p19FullWidthBarChartRectPx(subtitleLineCount: number): { x: number; y: number; w: number; h: number } {
  const chartY = p19ChartAreaTopPxAfterTitle(subtitleLineCount);
  const h = Math.max(P19_CHART_AREA_MIN_HEIGHT_PX, P19_PAGE.height - chartY - P19_SLIDE_FOOTER_RESERVE_PX);
  return { x: P19_CONTENT.x, y: chartY, w: P19_CONTENT.w, h };
}

/** Gráfico “% acertos” (gap 18 px após título, como no PDF). */
export function p19AccuracyChartRectPx(): { x: number; y: number; w: number; h: number } {
  const inset = P19_TITLE_TEXT_OFFSET_X_PX;
  const titleLineH = p19PdfLineHeightPx(P19_TITLE_FONT_PX);
  const yAfterTitle = P19_SLIDE_TITLE_FIRST_BASELINE_Y_PX + titleLineH;
  const chartY = yAfterTitle + P19_TITLE_TO_ACCURACY_CHART_GAP_PX;
  const h = Math.max(P19_CHART_AREA_MIN_HEIGHT_PX, P19_PAGE.height - chartY - P19_SLIDE_FOOTER_RESERVE_PX);
  return { x: P19_CONTENT.x + inset, y: chartY, w: P19_CONTENT.w - inset * 2, h };
}

/** Largura útil do conteúdo em polegadas (slide wide 13,333"). */
export function p19ContentWidthInches(): number {
  return (P19_CONTENT.w / P19_PAGE.width) * 13.333;
}

export function p19ContentBoxInches(): { x: number; w: number } {
  return {
    x: p19PxToSlideInX(P19_CONTENT.x),
    w: p19ContentWidthInches(),
  };
}

/** Topo da tabela após bloco `drawTitle` (título com 1+ linhas; subtítulo opcional tipo escola). */
export function p19TableStartYAfterTitleBlockPx(hasEscolaSubtitle: boolean, titleLineCount = 1): number {
  const titleTopPx = P19_SLIDE_TITLE_FIRST_LINE_TOP_PX;
  const titleH = p19PdfLineHeightPx(P19_TITLE_FONT_PX);
  const titleBlockH = Math.max(1, titleLineCount) * titleH;
  if (!hasEscolaSubtitle) {
    return titleTopPx + titleBlockH + P19_TITLE_TO_BODY_GAP_PX;
  }
  const subH = p19PdfLineHeightPx(P19_SUBTITLE_FONT_PX);
  return titleTopPx + titleBlockH + P19_TITLE_TO_SUBTITLE_GAP_PX + subH + P19_ESCOLA_SUBTITLE_TO_TABLE_GAP_PX;
}

function rgbToHex6(r: number, g: number, b: number): string {
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `${h(r)}${h(g)}${h(b)}`;
}

export function p19LevelsGuideCardBorderHex(): string {
  const [r, g, b] = P19_LEVELS_GUIDE_CARD_BORDER_RGB;
  return rgbToHex6(r, g, b);
}

export function p19LevelsGuideCardFillHex(): string {
  const [r, g, b] = P19_LEVELS_GUIDE_CARD_FILL_RGB;
  return rgbToHex6(r, g, b);
}
