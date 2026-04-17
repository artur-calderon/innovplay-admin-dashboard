/**
 * Tokens de layout/tipografia alinhados à pré-visualização (`Presentation19NativePreviewDeck`).
 * PDF usa as mesmas unidades (px) do canvas jsPDF; PPTX converte px → pt / polegadas.
 */

/** Paleta texto/UI (slides com fundo branco; primária do cliente não entra aqui). */
export const P19_TEXT_STRONG = "#0F172A";
export const P19_TEXT_BASE = "#334155";
export const P19_TEXT_MUTED = "#52525B";
export const P19_BORDER_SOFT = "#E2E8F0";
export const P19_BORDER_NEUTRAL = "#D4D4D8";
/** Superfície apenas dentro de cards (não no fundo do slide). */
export const P19_SURFACE_CARD = "#F8FAFC";
/** Micro-legenda curta para leitura guiada em gráficos (Preview/PDF/PPTX). */
export const P19_CHART_SUBTITLE_PRESENCE = "Quantidade de alunos presentes (inteiro)";
export const P19_CHART_SUBTITLE_GRADES = "Valores de nota (escala da avaliação)";
export const P19_CHART_SUBTITLE_PROFICIENCY = "Escala de proficiência";

export const P19_PAGE = { width: 1123, height: 793 } as const;

/** Área útil do conteúdo (mesma base que PdfRenderer). */
export const P19_CONTENT = { x: 40, y: 60, w: 1043, h: 680 } as const;

/** Título de slide (componente `Title`): h2 */
export const P19_TITLE_FONT_PX = 32;
export const P19_TITLE_FONT_WEIGHT = 800 as const;
export const P19_TITLE_ACCENT_W_PX = 10;
export const P19_TITLE_ACCENT_H_PX = 34;
export const P19_TITLE_TEXT_OFFSET_X_PX = 22;

/** Subtítulo abaixo do título (escola, taglines de seção em alguns contextos) */
export const P19_SUBTITLE_FONT_PX = 17;

/** Espaço entre a linha do título e o bloco de subtítulo no componente `Title` */
export const P19_TITLE_SUBTITLE_GAP_PX = 8;

/** Capa de segmento: rótulos CURSO/SÉRIE/TURMA e valores */
export const P19_SEGMENT_FIELD_LABEL_PX = 14;
export const P19_SEGMENT_FIELD_VALUE_PX = 34;

/** Tabelas (th/td) */
export const P19_TABLE_CELL_FONT_PX = 13;
/** Padding um pouco mais enxuto; mantém legibilidade em trio Preview/PDF/PPTX. */
export const P19_TABLE_CELL_PADDING_PX = 6;
/** Coluna “Descrição” na tabela de questões (texto longo). */
export const P19_TABLE_QUESTIONS_DESC_FONT_PX = 13;

/** Indicador "Página x/y" */
export const P19_PAGE_INDICATOR_FONT_PX = 13;

/** Gráfico de barras horizontais: largura reservada para rótulo da categoria.
 * Aumentado para evitar que as barras “entrem” na área do texto em labels longos.
 */
export const P19_HORIZONTAL_CHART_LABEL_WIDTH_PX = 230;

/** Referência de tamanho do gráfico no conteúdo (largura × altura em px) — alinhada ao PDF */
export const P19_CHART_REF_W_PX = 1043;
export const P19_CHART_REF_H_PX = 470;

/** Capa principal: título da avaliação (preview `cover-main`) */
export const P19_COVER_MAIN_TITLE_PX = 62;
export const P19_COVER_MAIN_LABEL_PX = 14;
export const P19_COVER_MAIN_VALUE_PX = 30;
/** Subtítulo opcional abaixo do título na capa (PDF/PPTX alinhados ao preview). */
export const P19_COVER_SUBTITLE_FONT_PX = 15;

/** Capa escola (uma escola) */
export const P19_COVER_SCHOOL_SINGLE_PX = 46;
export const P19_COVER_SCHOOL_MULTI_HEADER_PX = 26;
/** Lista de escolas (quanto mais escolas, menor a fonte). */
export const P19_COVER_SCHOOL_LIST_SMALL_PX = 22;
export const P19_COVER_SCHOOL_LIST_LARGE_PX = 30;

/** Métrica alunos */
export const P19_METRIC_HEADER_PX = 30;
export const P19_METRIC_NUMBER_PX = 82;

/** Seções centrais: título + tagline */
export const P19_SECTION_TAGLINE_PX = 18;
/** Espaço título → tagline nas seções (Preview/PDF/PPTX alinhados). */
export const P19_SECTION_TITLE_TAGLINE_GAP_PX = 16;

/** Guias de níveis (cards) — alinhado ao preview (`levels-guide`) */
export const P19_LEVELS_GUIDE_TITLE_PX = 20;
export const P19_LEVELS_GUIDE_DESC_PX = 16;

/** Capas dinâmicas série/turma (preview) */
export const P19_DYNAMIC_COVER_PX = 52;

/** Obrigado */
export const P19_THANK_YOU_FONT_PX = 64;

/** Eixo / rótulos de gráfico (preview `BarChartPreview`) */
export const P19_CHART_AXIS_TICK_PX = 9;
/** Rótulos categoria (eixo X) — preview `BarChartPreview` usa 10px/600; PPTX usa negrito para legibilidade. */
export const P19_CHART_CATEGORY_LABEL_PX = 11;
/** Valor acima da barra — preview usa 16px / 900 (`BarChartPreview`). */
export const P19_CHART_BAR_VALUE_TOP_PX = 16;
/** Título dentro do card “proficiência por disciplina” — preview usa 12px/900; export ligeiramente maior para PPTX. */
export const P19_PROFICIENCY_DISC_CARD_TITLE_PX = 14;
export const P19_CHART_H_BAR_LABEL_PX = 11;
export const P19_CHART_H_BAR_VALUE_PX = 15;

/** Altura de linha relativa ao tamanho da fonte (jsPDF) */
export function p19PdfLineHeightPx(fontSizePx: number): number {
  return fontSizePx * 1.2;
}

/** CSS px → pontos tipográficos (96 CSS px = 72 pt).
 * Mantém decimais para aproximar melhor a pré-visualização (evita “pulos” por arredondamento).
 */
export function p19PxToPtForPptx(px: number): number {
  const pt = (px * 72) / 96;
  // PPTX aceita decimais; preservamos 2 casas para estabilidade.
  return Number(pt.toFixed(2));
}

/** Converte coordenada horizontal em px do canvas para polegadas no slide wide (13.333"). */
export function p19PxToSlideInX(px: number): number {
  return (px / P19_PAGE.width) * (13.333 as number);
}

/** Converte coordenada vertical em px do canvas para polegadas no slide (7.5"). */
export function p19PxToSlideInY(px: number): number {
  return (px / P19_PAGE.height) * 7.5;
}
