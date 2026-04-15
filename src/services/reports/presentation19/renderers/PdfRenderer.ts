import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ExportChart, Presentation19ExportSpec, Presentation19SlideSpec } from "@/types/presentation19-export-spec";
import {
  presentationSectionGrades,
  presentationSectionGradesTagline,
  presentationSectionLevels,
  presentationSectionLevelsTagline,
  presentationSectionProficiency,
  presentationSectionProficiencyTagline,
  presentationSectionQuestionsTagline,
  presentationSectionQuestionsTitle,
  presentationTitleChartGrades,
  presentationTitleChartLevels,
  presentationTitleChartPresence,
  presentationTitleProficiencyByDiscipline,
  presentationTitleProficiencyGeneralChart,
  presentationTitleTableGrades,
  presentationTitleTablePresence,
  niveisAprendizagemTituloPorEixo,
  P19_LEVELS_TABLE_LEVEL_HEADER_BG_HEX,
  presentationQuestionsTurmaCoverLine,
  presentationTitleQuestionsSerieGeral,
} from "@/utils/reports/presentation19/presentationScope";
import { P19_QUESTION_NUM_LEVEL_STYLE } from "@/utils/reports/presentation19/questionAcertoLevel";
import {
  P19_CHART_AXIS_TICK_PX,
  P19_CHART_BAR_VALUE_TOP_PX,
  P19_CHART_CATEGORY_LABEL_PX,
  P19_CHART_H_BAR_LABEL_PX,
  P19_CHART_H_BAR_VALUE_PX,
  P19_CONTENT,
  P19_COVER_MAIN_LABEL_PX,
  P19_COVER_MAIN_TITLE_PX,
  P19_COVER_MAIN_VALUE_PX,
  P19_COVER_SCHOOL_LIST_LARGE_PX,
  P19_COVER_SCHOOL_LIST_SMALL_PX,
  P19_COVER_SCHOOL_MULTI_HEADER_PX,
  P19_COVER_SCHOOL_SINGLE_PX,
  P19_DYNAMIC_COVER_PX,
  P19_HORIZONTAL_CHART_LABEL_WIDTH_PX,
  P19_LEVELS_GUIDE_DESC_PX,
  P19_LEVELS_GUIDE_TITLE_PX,
  P19_METRIC_HEADER_PX,
  P19_METRIC_NUMBER_PX,
  P19_PAGE,
  P19_PAGE_INDICATOR_FONT_PX,
  P19_SEGMENT_FIELD_LABEL_PX,
  P19_SEGMENT_FIELD_VALUE_PX,
  P19_SECTION_TAGLINE_PX,
  P19_SUBTITLE_FONT_PX,
  P19_TABLE_CELL_FONT_PX,
  P19_TABLE_CELL_PADDING_PX,
  P19_THANK_YOU_FONT_PX,
  P19_TITLE_ACCENT_H_PX,
  P19_TITLE_ACCENT_W_PX,
  P19_TITLE_FONT_PX,
  P19_TITLE_TEXT_OFFSET_X_PX,
  p19PdfLineHeightPx,
} from "@/utils/reports/presentation19/presentation19ExportTypography";

type RenderPdfArgs = {
  spec: Presentation19ExportSpec;
  fileName: string;
};

const page = P19_PAGE;
const content = P19_CONTENT;

function formatBarValueLabel(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const r = Math.round(value);
  if (Math.abs(value - r) < 1e-6) return String(r);
  return Number(value).toFixed(1);
}

function drawFrame(doc: jsPDF, primaryColor: string): void {
  doc.setFillColor(241, 245, 249);
  doc.rect(0, 0, page.width, page.height, "F");
  doc.setFillColor(primaryColor);
  doc.rect(0, 0, page.width, 10, "F");
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const safe = hex.replace("#", "");
  const normalized = safe.length === 3 ? safe.split("").map((c) => `${c}${c}`).join("") : safe;
  const n = Number.parseInt(normalized, 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  };
}

/**
 * Título de slide com barra lateral e quebra de linha. `firstLineBaselineY` é a baseline da primeira linha.
 * Retorna a baseline após a última linha do título.
 */
function drawWrappedSlideTitle(doc: jsPDF, title: string, primaryColor: string, firstLineBaselineY: number, maxWidthPx: number): number {
  const fs = P19_TITLE_FONT_PX;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(fs);
  const lines = doc.splitTextToSize(title, maxWidthPx);
  const lineH = p19PdfLineHeightPx(fs);
  const rgb = hexToRgb(primaryColor);
  const accentTop = firstLineBaselineY - fs * 0.72;
  const blockBottom = firstLineBaselineY + (lines.length - 1) * lineH;
  const accentH = Math.max(P19_TITLE_ACCENT_H_PX, blockBottom - accentTop + 10);
  doc.setFillColor(rgb.r, rgb.g, rgb.b);
  doc.roundedRect(content.x, accentTop, P19_TITLE_ACCENT_W_PX, accentH, 6, 6, "F");
  doc.setTextColor(24, 24, 27);
  let y = firstLineBaselineY;
  lines.forEach((ln) => {
    doc.text(ln, content.x + P19_TITLE_TEXT_OFFSET_X_PX, y);
    y += lineH;
  });
  return y;
}

function drawWrappedSubtitle(doc: jsPDF, text: string, firstLineBaselineY: number, maxWidthPx: number): number {
  const fs = P19_SUBTITLE_FONT_PX;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(fs);
  doc.setTextColor(82, 82, 91);
  const lines = doc.splitTextToSize(text, maxWidthPx);
  const lineH = p19PdfLineHeightPx(fs);
  let y = firstLineBaselineY;
  lines.forEach((ln) => {
    doc.text(ln, content.x + P19_TITLE_TEXT_OFFSET_X_PX, y);
    y += lineH;
  });
  return y;
}

/** Barras horizontais (categoria no eixo Y, valores crescendo para a direita). */
function drawHorizontalBarChart(doc: jsPDF, chart: ExportChart, area: { x: number; y: number; w: number; h: number }): void {
  const { x, y, w, h } = area;
  const topPad = 8;
  const bottomPad = 38;
  const leftLabelW = P19_HORIZONTAL_CHART_LABEL_WIDTH_PX;
  const plotTop = y + topPad;
  const plotBottom = y + h - bottomPad;
  const plotH = plotBottom - plotTop;
  const baselineX = x + leftLabelW;
  const plotRight = x + w - 10;
  const chartAreaW = Math.max(40, plotRight - baselineX);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.rect(x, y, w, h, "FD");

  const rawMax = Math.max(
    1,
    ...chart.data.flatMap((d) => chart.valueKeys.map((s) => Number(d[s.key] ?? 0)))
  );
  const axisMin = Number.isFinite(chart.yAxis?.min) ? Number(chart.yAxis?.min) : 0;
  const axisMax = Number.isFinite(chart.yAxis?.max) ? Number(chart.yAxis?.max) : Math.max(1, Math.ceil(rawMax * 1.15));
  const maxValue = Math.max(axisMin + 1, axisMax);
  const gridTicks = (chart.yAxis?.ticks?.length
    ? chart.yAxis.ticks
    : Array.from({ length: 5 }, (_, i) => axisMin + ((maxValue - axisMin) * i) / 4)
  )
    .filter((v, idx, arr) => Number.isFinite(v) && v >= axisMin && v <= maxValue && arr.indexOf(v) === idx)
    .sort((a, b) => a - b);

  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(1.2);
  doc.line(baselineX, plotTop, baselineX, plotBottom);

  doc.setDrawColor(203, 213, 225);
  for (const tick of gridTicks) {
    const gx = baselineX + (chartAreaW * Math.max(0, tick - axisMin)) / (maxValue - axisMin);
    doc.line(gx, plotTop, gx, plotBottom);
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(P19_CHART_AXIS_TICK_PX);
    const text = Number.isInteger(tick) ? String(Math.round(tick)) : tick.toFixed(1);
    doc.text(text, gx, plotBottom + 14, { align: "center" });
  }

  const n = Math.max(1, chart.data.length);
  const rowH = plotH / n;
  const serie = chart.valueKeys[0];
  const labelFont = P19_CHART_H_BAR_LABEL_PX;
  const labelMaxW = leftLabelW - 12;

  chart.data.forEach((row, idx) => {
    const value = Number(row[serie.key] ?? 0);
    const barW = (Math.max(0, value - axisMin) / (maxValue - axisMin)) * chartAreaW;
    const rowCenterY = plotTop + (idx + 0.5) * rowH;
    const barThickness = Math.min(34, rowH * 0.55);
    const barY = rowCenterY - barThickness / 2;
    const barColor = String(row.color ?? serie.color);
    const rgb = hexToRgb(barColor);
    doc.setFillColor(rgb.r, rgb.g, rgb.b);
    doc.rect(baselineX, barY, Math.max(0, barW), barThickness, "F");

    const cat = String(row[chart.categoryKey] ?? "");
    const maxTextH = Math.max(10, rowH * 0.88);
    let fs = labelFont;
    doc.setFont("helvetica", "normal");
    let catLines: string[] = [];
    let catLineH = p19PdfLineHeightPx(fs);
    while (fs >= 7) {
      doc.setFontSize(fs);
      catLines = doc.splitTextToSize(cat, labelMaxW);
      catLineH = p19PdfLineHeightPx(fs);
      if (catLines.length * catLineH <= maxTextH) break;
      fs -= 1;
    }
    if (catLines.length * catLineH > maxTextH) {
      const maxLines = Math.max(1, Math.floor(maxTextH / catLineH));
      catLines = catLines.slice(0, maxLines);
    }

    doc.setTextColor(51, 65, 85);
    doc.setFontSize(fs);
    const blockH = catLines.length * catLineH;
    const labelRightX = baselineX - 8;
    let catY = rowCenterY - blockH / 2 + catLineH * 0.72;
    catLines.forEach((ln) => {
      doc.text(ln, labelRightX, catY, { align: "right" });
      catY += catLineH;
    });

    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(P19_CHART_H_BAR_VALUE_PX);
    const valStr = formatBarValueLabel(value);
    doc.setFontSize(P19_CHART_H_BAR_VALUE_PX);
    const valW = doc.getTextWidth(valStr);
    let valX = baselineX + barW + 4;
    if (valX + valW > plotRight - 1) {
      valX = Math.max(baselineX + 2, plotRight - valW - 2);
    }
    doc.text(valStr, valX, rowCenterY + 4, { align: "left" });
  });
}

function drawBarChart(doc: jsPDF, chart: ExportChart, area: { x: number; y: number; w: number; h: number }): void {
  if (chart.orientation === "horizontal") {
    drawHorizontalBarChart(doc, chart, area);
    return;
  }

  const { x, y, w, h } = area;
  const axisLeftX = x + 26;
  const barsStartX = axisLeftX + 8;
  const barsW = w - 34;
  const topPad = 6;
  const colWidth = barsW / Math.max(1, chart.data.length);
  const innerW = Math.max(8, colWidth - 36);

  const rawMax = Math.max(
    1,
    ...chart.data.flatMap((d) => chart.valueKeys.map((s) => Number(d[s.key] ?? 0)))
  );
  const axisMin = Number.isFinite(chart.yAxis?.min) ? Number(chart.yAxis?.min) : 0;
  const axisMax = Number.isFinite(chart.yAxis?.max) ? Number(chart.yAxis?.max) : Math.max(1, Math.ceil(rawMax * 1.15));
  const maxValue = Math.max(axisMin + 1, axisMax);

  let catFs = P19_CHART_CATEGORY_LABEL_PX;
  let bottomPad = 34;
  const minChartPx = 72;
  doc.setFont("helvetica", "normal");
  for (;;) {
    doc.setFontSize(catFs);
    const lineH = p19PdfLineHeightPx(catFs);
    let maxCatLines = 1;
    chart.data.forEach((row) => {
      const catStr = String(row[chart.categoryKey] ?? "");
      const lines = doc.splitTextToSize(catStr, innerW);
      maxCatLines = Math.max(maxCatLines, lines.length);
    });
    const neededBottom = 8 + maxCatLines * lineH + 10;
    const maxBottom = Math.max(34, h - topPad - minChartPx);
    if (neededBottom <= maxBottom || catFs <= 7) {
      bottomPad = Math.min(Math.max(34, neededBottom), maxBottom);
      break;
    }
    catFs -= 1;
  }

  const baselineY = y + h - bottomPad;
  const chartAreaH = baselineY - (y + topPad);
  const catLineH = p19PdfLineHeightPx(catFs);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.rect(x, y, w, h, "FD");
  const isStacked = chart.type === "stackedBar";
  const gridTicks = (chart.yAxis?.ticks?.length
    ? chart.yAxis.ticks
    : Array.from({ length: 5 }, (_, i) => axisMin + ((maxValue - axisMin) * i) / 4)
  )
    .filter((v, idx, arr) => Number.isFinite(v) && v >= axisMin && v <= maxValue && arr.indexOf(v) === idx)
    .sort((a, b) => a - b);
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(1.2);
  doc.line(axisLeftX, y + topPad, axisLeftX, baselineY);
  doc.setDrawColor(203, 213, 225);
  for (const tick of gridTicks) {
    const gy = baselineY - (chartAreaH * Math.max(0, tick - axisMin)) / (maxValue - axisMin);
    doc.line(axisLeftX, gy, x + w, gy);
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(P19_CHART_AXIS_TICK_PX);
    const text = Number.isInteger(tick) ? String(Math.round(tick)) : tick.toFixed(1);
    doc.text(text, axisLeftX - 2, gy - 2, { align: "right" });
  }
  const hasMultipleSeries = chart.valueKeys.length > 1;

  chart.data.forEach((row, idx) => {
    const baseX = barsStartX + idx * colWidth + 18;
    if (hasMultipleSeries && !isStacked) {
      const gap = 8;
      const seriesW = Math.max(4, Math.min(16, (innerW - gap * (chart.valueKeys.length - 1)) / chart.valueKeys.length));
      chart.valueKeys.forEach((serie, sIdx) => {
        const value = Number(row[serie.key] ?? 0);
        const barH = (Math.max(0, value - axisMin) / (maxValue - axisMin)) * chartAreaH;
        const barY = baselineY - barH;
        const barX = baseX + sIdx * (seriesW + gap);
        const rgb = hexToRgb(serie.color);
        doc.setFillColor(rgb.r, rgb.g, rgb.b);
        doc.rect(barX, barY, seriesW, barH, "F");
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(P19_CHART_BAR_VALUE_TOP_PX);
        doc.text(formatBarValueLabel(value), barX + seriesW / 2, barY - 2, { align: "center" });
      });
    } else if (hasMultipleSeries && isStacked) {
      const singleW = Math.max(8, Math.min(22, innerW * 0.45));
      const singleX = baseX + (innerW - singleW) / 2;
      let currentTop = baselineY;
      let total = 0;
      chart.valueKeys.forEach((serie) => {
        const value = Number(row[serie.key] ?? 0);
        total += Math.max(0, value);
        const barH = (Math.max(0, value - axisMin) / (maxValue - axisMin)) * chartAreaH;
        const barY = currentTop - barH;
        const rgb = hexToRgb(serie.color);
        doc.setFillColor(rgb.r, rgb.g, rgb.b);
        doc.rect(singleX, barY, singleW, barH, "F");
        currentTop = barY;
      });
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(P19_CHART_BAR_VALUE_TOP_PX + 1);
      doc.text(formatBarValueLabel(total), singleX + singleW / 2, currentTop - 2, { align: "center" });
    } else {
      const serie = chart.valueKeys[0];
      const value = Number(row[serie.key] ?? 0);
      const barH = (Math.max(0, value - axisMin) / (maxValue - axisMin)) * chartAreaH;
      const barY = baselineY - barH;
      const barColor = String(row.color ?? serie.color);
      const rgb = hexToRgb(barColor);
      doc.setFillColor(rgb.r, rgb.g, rgb.b);
      const singleW = Math.max(8, Math.min(22, innerW * 0.45));
      const singleX = baseX + (innerW - singleW) / 2;
      doc.rect(singleX, barY, singleW, barH, "F");
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(P19_CHART_BAR_VALUE_TOP_PX);
      doc.text(formatBarValueLabel(value), singleX + singleW / 2, barY - 2, { align: "center" });
    }
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(catFs);
  doc.setTextColor(51, 65, 85);
  chart.data.forEach((row, idx) => {
    const baseX = barsStartX + idx * colWidth + 18;
    const catStr = String(row[chart.categoryKey] ?? "");
    const catLines = doc.splitTextToSize(catStr, innerW);
    const cx = baseX + innerW / 2;
    let labY = baselineY + 6 + catLineH * 0.72;
    catLines.forEach((ln) => {
      doc.text(ln, cx, labY, { align: "center" });
      labY += catLineH;
    });
  });
}

function drawCenteredSectionBlock(
  doc: jsPDF,
  title: string,
  tagline: string | undefined,
  primaryColor: string
): void {
  const maxW = content.w - 80;
  const titleFs = P19_TITLE_FONT_PX;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(titleFs);
  doc.setTextColor(...Object.values(hexToRgb(primaryColor)));
  const titleLines = doc.splitTextToSize(title, maxW);
  const titleLineH = p19PdfLineHeightPx(titleFs);
  let y = page.height / 2 - 40 - (titleLines.length * titleLineH) / 2;
  titleLines.forEach((ln) => {
    doc.text(ln, page.width / 2, y, { align: "center" });
    y += titleLineH;
  });
  if (tagline && tagline.trim()) {
    y += 12;
    const tagFs = P19_SECTION_TAGLINE_PX;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(tagFs);
    doc.setTextColor(82, 82, 91);
    const tagLines = doc.splitTextToSize(tagline, maxW);
    const tagLineH = p19PdfLineHeightPx(tagFs);
    tagLines.forEach((ln) => {
      doc.text(ln, page.width / 2, y, { align: "center" });
      y += tagLineH;
    });
  }
}

function slideLevelsGuidePdf(doc: jsPDF, spec: Presentation19ExportSpec): void {
  const guide = spec.deckData.levelGuide;
  const rowH = 128;
  guide.forEach((lvl, idx) => {
    const bx = content.x;
    const y = 138 + idx * rowH;
    const w = content.w;
    const h = rowH - 10;
    doc.setDrawColor(228, 228, 231);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(bx, y, w, h, 10, 10, "FD");
    const rgb = hexToRgb(lvl.color);
    doc.setFillColor(rgb.r, rgb.g, rgb.b);
    doc.rect(bx, y, 8, h, "F");
    doc.setTextColor(rgb.r, rgb.g, rgb.b);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(P19_LEVELS_GUIDE_TITLE_PX);
    doc.text(lvl.label, bx + 18, y + 28);
    doc.setTextColor(63, 63, 70);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(P19_LEVELS_GUIDE_DESC_PX);
    const descLines = doc.splitTextToSize(lvl.description || "", w - 28);
    const lh = p19PdfLineHeightPx(P19_LEVELS_GUIDE_DESC_PX);
    let dy = y + 48;
    descLines.forEach((ln) => {
      doc.text(ln, bx + 18, dy);
      dy += lh;
    });
  });
}

function drawSlide(doc: jsPDF, slide: Presentation19SlideSpec, spec: Presentation19ExportSpec): void {
  const { deckData } = spec;
  drawFrame(doc, deckData.primaryColor);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(24, 24, 27);
  switch (slide.kind) {
    case "cover-main": {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(P19_COVER_MAIN_TITLE_PX);
      doc.setTextColor(...Object.values(hexToRgb(deckData.primaryColor)));
      const titleLines = doc.splitTextToSize(deckData.avaliacaoNome || "N/A", content.w - 20);
      const titleLh = p19PdfLineHeightPx(P19_COVER_MAIN_TITLE_PX);
      let ty = 180;
      titleLines.forEach((ln) => {
        doc.text(ln, content.x, ty);
        ty += titleLh;
      });
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(content.x, 470, content.w, 150, 14, 14, "F");
      doc.setTextColor(82, 82, 91);
      doc.setFontSize(P19_COVER_MAIN_LABEL_PX);
      doc.text("MUNICÍPIO", content.x + 24, 510);
      doc.setTextColor(24, 24, 27);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(P19_COVER_MAIN_VALUE_PX);
      doc.text(deckData.municipioNome || "N/A", content.x + 24, 545);
      doc.setTextColor(82, 82, 91);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(P19_COVER_MAIN_LABEL_PX);
      doc.text("SÉRIE", content.x + 24, 580);
      doc.setTextColor(24, 24, 27);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(P19_COVER_MAIN_VALUE_PX);
      doc.text(deckData.serie || "N/A", content.x + 24, 615);
      break;
    }
    case "cover-school": {
      doc.setFont("helvetica", "bold");
      const escolas = deckData.escolasParticipantes;
      if (escolas.length <= 1) {
        doc.setFontSize(P19_COVER_SCHOOL_SINGLE_PX);
        const lines = doc.splitTextToSize(escolas[0] || "N/A", content.w - 40);
        const lh = p19PdfLineHeightPx(P19_COVER_SCHOOL_SINGLE_PX);
        const startY = page.height / 2 - (lines.length * lh) / 2;
        let yy = startY;
        lines.forEach((ln) => {
          doc.text(ln, page.width / 2, yy, { align: "center" });
          yy += lh;
        });
      } else {
        doc.setFontSize(P19_COVER_SCHOOL_MULTI_HEADER_PX);
        doc.text("ESCOLAS PARTICIPANTES", page.width / 2, 180, { align: "center" });
        const maxW = content.w - 32;
        const fs = escolas.length > 14 ? P19_COVER_SCHOOL_LIST_SMALL_PX : P19_COVER_SCHOOL_LIST_LARGE_PX;
        doc.setFontSize(fs);
        const body = escolas.map((s) => `• ${s}`).join("\n");
        const lines = doc.splitTextToSize(body, maxW);
        doc.text(lines, content.x + 16, 220);
      }
      break;
    }
    case "metric-total-students":
      doc.setFont("helvetica", "bold");
      doc.setFontSize(P19_METRIC_HEADER_PX);
      doc.text("MÉTRICA GERAL", page.width / 2, 280, { align: "center" });
      doc.setTextColor(...Object.values(hexToRgb(deckData.primaryColor)));
      doc.setFontSize(P19_METRIC_NUMBER_PX);
      doc.text(Math.round(deckData.totalAlunosParticiparam).toLocaleString("pt-BR"), page.width / 2, 380, { align: "center" });
      doc.setTextColor(24, 24, 27);
      doc.setFontSize(P19_METRIC_HEADER_PX);
      doc.text("Alunos que realizaram a avaliação", page.width / 2, 440, { align: "center" });
      break;
    case "cover-segment": {
      drawWrappedSlideTitle(doc, "CAPA DE SEGMENTO", deckData.primaryColor, 100, content.w - P19_TITLE_TEXT_OFFSET_X_PX);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(content.x, 160, content.w, 440, 14, 14, "F");
      doc.setFont("helvetica", "bold");
      const x = content.x + 24;
      const maxW = content.w - 48;

      // Em jsPDF o Y é baseline; controlamos tudo em "top" para evitar sobreposição.
      const drawLabelValueBlock = (args: { yTop: number; label: string; value: string; valueFontSize: number; valueBold?: boolean }) => {
        const labelFs = P19_SEGMENT_FIELD_LABEL_PX;
        const labelGap = 8; // espaço real entre rótulo e valor
        const blockGap = 18; // espaço real entre blocos

        doc.setFont("helvetica", "bold");
        doc.setFontSize(labelFs);
        doc.setTextColor(82, 82, 91);
        doc.text(args.label, x, args.yTop + labelFs);

        doc.setFont("helvetica", args.valueBold === false ? "normal" : "bold");
        doc.setFontSize(args.valueFontSize);
        doc.setTextColor(24, 24, 27);
        const valueLines = doc.splitTextToSize(args.value, maxW);
        const valueLh = p19PdfLineHeightPx(args.valueFontSize);
        let y = args.yTop + labelFs + labelGap + args.valueFontSize;
        valueLines.forEach((ln) => {
          doc.text(ln, x, y);
          y += valueLh;
        });
        return { yTop: y + blockGap };
      };

      let yTop = 190;
      ({ yTop } = drawLabelValueBlock({ yTop, label: "CURSO", value: deckData.curso, valueFontSize: P19_SEGMENT_FIELD_VALUE_PX }));
      ({ yTop } = drawLabelValueBlock({ yTop, label: "SÉRIE", value: deckData.serie, valueFontSize: P19_SEGMENT_FIELD_VALUE_PX }));

      const turmaBody =
        deckData.turmasParticipantesCapa.length > 8
          ? deckData.turmasParticipantesCapa.map((t) => `• ${t}`).join("\n")
          : deckData.turma;
      const fsTurma = turmaBody.length > 200 ? 16 : turmaBody.length > 100 ? 20 : 28;
      ({ yTop } = drawLabelValueBlock({
        yTop,
        label: deckData.turmasParticipantesCapa.length > 1 ? "TURMAS" : "TURMA",
        value: turmaBody,
        valueFontSize: fsTurma,
      }));
      break;
    }
    case "presence-table":
    case "grades-table": {
      const titleText =
        slide.kind === "presence-table"
          ? presentationTitleTablePresence(deckData.comparisonAxis)
          : presentationTitleTableGrades(deckData.comparisonAxis);
      const titleMaxW = content.w - P19_TITLE_TEXT_OFFSET_X_PX;
      let yAfter = drawWrappedSlideTitle(doc, titleText, deckData.primaryColor, 100, titleMaxW);
      const tableStartY = yAfter + 16;
      autoTable(doc, {
        startY: tableStartY,
        margin: { left: content.x, right: content.x },
        head: [slide.table.columns],
        body: slide.table.rows,
        styles: {
          fontSize: P19_TABLE_CELL_FONT_PX,
          lineColor: [203, 213, 225],
          lineWidth: 1,
          cellPadding: P19_TABLE_CELL_PADDING_PX,
          fillColor: [252, 252, 253],
          textColor: [15, 23, 42],
        },
        headStyles: { fillColor: [226, 232, 240], textColor: [51, 65, 85], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [241, 245, 249] },
      });
      break;
    }
    case "questions-table": {
      const titleText =
        slide.questionsSubsection?.kind === "geral"
          ? "TABELA DE QUESTÕES — GERAL"
          : slide.questionsSubsection?.kind === "serie-geral"
            ? presentationTitleQuestionsSerieGeral(slide.questionsSubsection.serieLabel)
            : slide.questionsSubsection?.kind === "turma"
              ? `TABELA DE QUESTÕES — TURMA ${slide.questionsSubsection.turmaNome}`
              : "TABELA DE QUESTÕES";
      const pageInfo = slide.questionsPage;
      const titleMaxW = pageInfo != null && pageInfo.total > 1 ? content.w - 160 : content.w - P19_TITLE_TEXT_OFFSET_X_PX;
      let yAfter = drawWrappedSlideTitle(doc, titleText, deckData.primaryColor, 100, titleMaxW);
      if (pageInfo != null && pageInfo.total > 1) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(P19_PAGE_INDICATOR_FONT_PX);
        doc.setTextColor(82, 82, 91);
        doc.text(`Página ${pageInfo.current}/${pageInfo.total}`, content.x + content.w, 100, { align: "right" });
      }
      const tableStartY = yAfter + 16;
      const levels = slide.questionRowLevels;
      autoTable(doc, {
        startY: tableStartY,
        margin: { left: content.x, right: content.x },
        head: [slide.table.columns],
        body: slide.table.rows,
        styles: {
          fontSize: P19_TABLE_CELL_FONT_PX,
          lineColor: [203, 213, 225],
          lineWidth: 1,
          cellPadding: P19_TABLE_CELL_PADDING_PX,
          fillColor: [252, 252, 253],
          textColor: [15, 23, 42],
        },
        headStyles: { fillColor: [226, 232, 240], textColor: [51, 65, 85], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [241, 245, 249] },
        didParseCell: (data) => {
          if (!levels?.length || data.section !== "body") return;
          const lvl = levels[data.row.index];
          if (!lvl) return;
          const st = P19_QUESTION_NUM_LEVEL_STYLE[lvl];
          data.cell.styles.fillColor = st.pdfFill;
          data.cell.styles.textColor = st.pdfText;
          data.cell.styles.fontStyle = "bold";
        },
      });
      break;
    }
    case "levels-table": {
      const titleText = niveisAprendizagemTituloPorEixo(deckData.comparisonAxis);
      const titleMaxW = content.w - P19_TITLE_TEXT_OFFSET_X_PX;
      let yAfter = drawWrappedSlideTitle(doc, titleText, deckData.primaryColor, 100, titleMaxW);
      let tableStartY = yAfter + 16;
      if (slide.escolaNome) {
        tableStartY = drawWrappedSubtitle(doc, slide.escolaNome, yAfter + 10, content.w - P19_TITLE_TEXT_OFFSET_X_PX) + 14;
      }
      autoTable(doc, {
        startY: tableStartY,
        margin: { left: content.x, right: content.x },
        head: [slide.table.columns],
        body: slide.table.rows,
        styles: {
          fontSize: P19_TABLE_CELL_FONT_PX,
          lineColor: [203, 213, 225],
          lineWidth: 1,
          cellPadding: P19_TABLE_CELL_PADDING_PX,
          fillColor: [252, 252, 253],
          textColor: [15, 23, 42],
        },
        headStyles: { fillColor: [226, 232, 240], textColor: [51, 65, 85], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [241, 245, 249] },
        didParseCell: (data) => {
          if (data.section === "head" && data.column.index >= 1 && data.column.index <= 4) {
            const hx = P19_LEVELS_TABLE_LEVEL_HEADER_BG_HEX[data.column.index - 1];
            const rgb = hexToRgb(`#${hx}`);
            data.cell.styles.fillColor = [rgb.r, rgb.g, rgb.b];
            data.cell.styles.textColor = [248, 250, 252];
          }
          if (data.section === "body") {
            const row = data.row.raw as unknown[] | undefined;
            if (row && String(row[0]) === "TOTAL GERAL") {
              data.cell.styles.fontStyle = "bold";
              data.cell.styles.fillColor = [226, 232, 240];
            }
          }
        },
      });
      break;
    }
    case "presence-chart": {
      drawWrappedSlideTitle(doc, presentationTitleChartPresence(deckData.comparisonAxis), deckData.primaryColor, 100, content.w - P19_TITLE_TEXT_OFFSET_X_PX);
      drawBarChart(doc, slide.chart, { x: content.x, y: 150, w: content.w, h: 470 });
      break;
    }
    case "section-levels":
      drawCenteredSectionBlock(doc, presentationSectionLevels(deckData.comparisonAxis), presentationSectionLevelsTagline(deckData.comparisonAxis), deckData.primaryColor);
      break;
    case "levels-guide":
      drawWrappedSlideTitle(doc, "GUIA DE NÍVEIS DE APRENDIZAGEM", deckData.primaryColor, 100, content.w - P19_TITLE_TEXT_OFFSET_X_PX);
      slideLevelsGuidePdf(doc, spec);
      break;
    case "levels-chart": {
      let yb = drawWrappedSlideTitle(
        doc,
        presentationTitleChartLevels(deckData.comparisonAxis),
        deckData.primaryColor,
        100,
        content.w - P19_TITLE_TEXT_OFFSET_X_PX
      );
      let chartY = 150;
      if (slide.escolaNome) {
        chartY = drawWrappedSubtitle(doc, slide.escolaNome, yb + 10, content.w - P19_TITLE_TEXT_OFFSET_X_PX) + 12;
      }
      const chartH = page.height - chartY - 40;
      const inset = P19_TITLE_TEXT_OFFSET_X_PX;
      drawBarChart(doc, slide.chart, { x: content.x + inset, y: chartY, w: content.w - inset, h: Math.max(200, chartH) });
      break;
    }
    case "section-proficiency":
      drawCenteredSectionBlock(
        doc,
        presentationSectionProficiency(deckData.comparisonAxis),
        presentationSectionProficiencyTagline(deckData.comparisonAxis),
        deckData.primaryColor
      );
      break;
    case "proficiency-general-chart": {
      let yb = drawWrappedSlideTitle(
        doc,
        presentationTitleProficiencyGeneralChart(deckData.comparisonAxis),
        deckData.primaryColor,
        100,
        content.w - P19_TITLE_TEXT_OFFSET_X_PX
      );
      let chartY = 150;
      if (slide.escolaNome) {
        chartY = drawWrappedSubtitle(doc, slide.escolaNome, yb + 10, content.w - P19_TITLE_TEXT_OFFSET_X_PX) + 12;
      }
      const chartH = page.height - chartY - 40;
      const profInset = P19_TITLE_TEXT_OFFSET_X_PX;
      drawBarChart(doc, slide.chart, {
        x: content.x + profInset,
        y: chartY,
        w: content.w - profInset,
        h: Math.max(200, chartH),
      });
      break;
    }
    case "proficiency-by-discipline-chart": {
      let yb = drawWrappedSlideTitle(
        doc,
        presentationTitleProficiencyByDiscipline(deckData.comparisonAxis),
        deckData.primaryColor,
        100,
        content.w - P19_TITLE_TEXT_OFFSET_X_PX
      );
      let gridTop = 150;
      if (slide.escolaNome) {
        gridTop = drawWrappedSubtitle(doc, slide.escolaNome, yb + 10, content.w - P19_TITLE_TEXT_OFFSET_X_PX) + 12;
      }
      const profInset = P19_TITLE_TEXT_OFFSET_X_PX;
      const gridLeft = content.x + profInset;
      const gridW = content.w - profInset;
      const gridPad = 8;
      const boxW = (gridW - gridPad * 3) / 2;
      slide.charts.forEach((entry, idx) => {
        const row = Math.floor(idx / 2);
        const col = idx % 2;
        const boxX = gridLeft + gridPad + col * (boxW + gridPad);
        const boxY = gridTop + row * 250;
        const boxH = 220;
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(212, 212, 216);
        doc.roundedRect(boxX, boxY, boxW, boxH, 10, 10, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(P19_CHART_H_BAR_LABEL_PX);
        const tlines = doc.splitTextToSize(entry.title, boxW - 16);
        const tlh = p19PdfLineHeightPx(P19_CHART_H_BAR_LABEL_PX);
        let tty = boxY + 16;
        tlines.forEach((ln) => {
          doc.text(ln, boxX + 8, tty);
          tty += tlh;
        });
        const chartInnerTop = tty + 4;
        const innerH = Math.max(80, boxY + boxH - chartInnerTop - 8);
        drawBarChart(doc, entry.chart, { x: boxX + 8, y: chartInnerTop, w: boxW - 16, h: innerH });
      });
      break;
    }
    case "section-grades":
      drawCenteredSectionBlock(
        doc,
        presentationSectionGrades(deckData.comparisonAxis),
        presentationSectionGradesTagline(deckData.comparisonAxis),
        deckData.primaryColor
      );
      break;
    case "grades-chart": {
      let yb = drawWrappedSlideTitle(
        doc,
        presentationTitleChartGrades(deckData.comparisonAxis),
        deckData.primaryColor,
        100,
        content.w - P19_TITLE_TEXT_OFFSET_X_PX
      );
      let chartY = 150;
      if (slide.escolaNome) {
        chartY = drawWrappedSubtitle(doc, slide.escolaNome, yb + 10, content.w - P19_TITLE_TEXT_OFFSET_X_PX) + 12;
      }
      const chartH = page.height - chartY - 40;
      drawBarChart(doc, slide.chart, { x: content.x, y: chartY, w: content.w, h: Math.max(200, chartH) });
      break;
    }
    case "section-questions":
      drawCenteredSectionBlock(doc, presentationSectionQuestionsTitle(), presentationSectionQuestionsTagline(), deckData.primaryColor);
      break;
    case "dynamic-series-cover": {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(P19_DYNAMIC_COVER_PX);
      doc.setTextColor(...Object.values(hexToRgb(deckData.primaryColor)));
      const lines = doc.splitTextToSize(`[${deckData.serieNomeCapas}]`, content.w - 80);
      const lh = p19PdfLineHeightPx(P19_DYNAMIC_COVER_PX);
      let yy = page.height / 2 - (lines.length * lh) / 2;
      lines.forEach((ln) => {
        doc.text(ln, page.width / 2, yy, { align: "center" });
        yy += lh;
      });
      break;
    }
    case "dynamic-class-cover": {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(P19_DYNAMIC_COVER_PX);
      doc.setTextColor(...Object.values(hexToRgb(deckData.primaryColor)));
      const lines = doc.splitTextToSize(`[${deckData.turmaNomeCapas}]`, content.w - 80);
      const lh = p19PdfLineHeightPx(P19_DYNAMIC_COVER_PX);
      let yy = page.height / 2 - (lines.length * lh) / 2;
      lines.forEach((ln) => {
        doc.text(ln, page.width / 2, yy, { align: "center" });
        yy += lh;
      });
      break;
    }
    case "questions-turma-cover": {
      const line = presentationQuestionsTurmaCoverLine(slide.serieLabel, slide.turmaNome);
      doc.setFont("helvetica", "bold");
      const fs = line.length > 120 ? 22 : line.length > 80 ? 26 : 32;
      doc.setFontSize(fs);
      doc.setTextColor(...Object.values(hexToRgb(deckData.primaryColor)));
      const lines = doc.splitTextToSize(line, content.w - 80);
      const lineHeight = fs * 1.25;
      const totalH = lines.length * lineHeight;
      let y = page.height / 2 - totalH / 2 + lineHeight * 0.35;
      lines.forEach((ln) => {
        doc.text(ln, page.width / 2, y, { align: "center" });
        y += lineHeight;
      });
      break;
    }
    case "thank-you":
      doc.setFont("helvetica", "bold");
      doc.setFontSize(P19_THANK_YOU_FONT_PX);
      doc.setTextColor(...Object.values(hexToRgb(deckData.primaryColor)));
      doc.text("Obrigado!!", page.width / 2, page.height / 2, { align: "center" });
      break;
  }
}

export async function renderPdfFromSlideSpec(args: RenderPdfArgs): Promise<void> {
  const { spec, fileName } = args;
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "px",
    format: [page.width, page.height],
    compress: true,
    // Mantém a escala coerente ao usar unidade "px" (evita divergência vs CSS px do preview).
    hotfixes: ["px_scaling"],
  });
  spec.slides.forEach((slide, idx) => {
    if (idx > 0) doc.addPage([page.width, page.height], "landscape");
    drawSlide(doc, slide, spec);
  });
  doc.save(fileName);
}
