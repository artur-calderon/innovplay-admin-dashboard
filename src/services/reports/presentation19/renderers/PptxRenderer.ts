import PptxGenJS from "pptxgenjs";
import type { ProficiencyLevel } from "@/components/evaluations/results/utils/proficiency";
import type { ExportChart, Presentation19ExportSpec, Presentation19SlideSpec } from "@/types/presentation19-export-spec";
import { P19_QUESTION_NUM_LEVEL_STYLE } from "@/utils/reports/presentation19/questionAcertoLevel";
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
import {
  P19_CHART_AXIS_TICK_PX,
  P19_CHART_BAR_VALUE_TOP_PX,
  P19_CHART_CATEGORY_LABEL_PX,
  P19_CHART_H_BAR_LABEL_PX,
  P19_CHART_H_BAR_VALUE_PX,
  P19_CHART_REF_H_PX,
  P19_CHART_REF_W_PX,
  P19_COVER_MAIN_LABEL_PX,
  P19_COVER_MAIN_TITLE_PX,
  P19_COVER_MAIN_VALUE_PX,
  P19_COVER_SCHOOL_LIST_LARGE_PX,
  P19_COVER_SCHOOL_LIST_SMALL_PX,
  P19_COVER_SCHOOL_MULTI_HEADER_PX,
  P19_COVER_SCHOOL_SINGLE_PX,
  P19_CONTENT,
  P19_DYNAMIC_COVER_PX,
  P19_HORIZONTAL_CHART_LABEL_WIDTH_PX,
  P19_LEVELS_GUIDE_DESC_PX,
  P19_LEVELS_GUIDE_TITLE_PX,
  P19_METRIC_HEADER_PX,
  P19_METRIC_NUMBER_PX,
  P19_PAGE_INDICATOR_FONT_PX,
  P19_SECTION_TAGLINE_PX,
  P19_SEGMENT_FIELD_LABEL_PX,
  P19_SEGMENT_FIELD_VALUE_PX,
  P19_SUBTITLE_FONT_PX,
  P19_TABLE_CELL_FONT_PX,
  P19_TABLE_CELL_PADDING_PX,
  P19_THANK_YOU_FONT_PX,
  P19_TITLE_ACCENT_H_PX,
  P19_TITLE_ACCENT_W_PX,
  P19_TITLE_FONT_PX,
  P19_TITLE_TEXT_OFFSET_X_PX,
  p19PxToPtForPptx,
  p19PxToSlideInX,
  p19PxToSlideInY,
} from "@/utils/reports/presentation19/presentation19ExportTypography";

type RenderPptxArgs = {
  spec: Presentation19ExportSpec;
  fileName: string;
};

type PptxPresentation = InstanceType<typeof PptxGenJS>;

function hexNoHash(hex: string): string {
  return hex.replace("#", "").toUpperCase();
}

/** Mesmas proporções do `PdfRenderer.drawBarChart`. */
const PDF_CHART_REF_W = P19_CHART_REF_W_PX;
const PDF_CHART_REF_H = P19_CHART_REF_H_PX;

function resolveGridTicks(chart: ExportChart, axisMin: number, maxValue: number): number[] {
  const fromSpec = chart.yAxis?.ticks?.length
    ? chart.yAxis.ticks
    : Array.from({ length: 5 }, (_, i) => axisMin + ((maxValue - axisMin) * i) / 4);
  return fromSpec
    .filter((v, idx, arr) => Number.isFinite(v) && v >= axisMin && v <= maxValue && arr.indexOf(v) === idx)
    .sort((a, b) => a - b);
}

function formatAxisTick(tick: number): string {
  const r = Math.round(tick);
  if (Math.abs(tick - r) < 1e-6) return String(r);
  return tick.toFixed(1);
}

function formatBarValueLabel(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const r = Math.round(value);
  if (Math.abs(value - r) < 1e-6) return String(r);
  return Number(value).toFixed(1);
}

/** Evita sobreposição de rótulos quando a área útil do gráfico é pequena (mini-gráficos PPTX). */
function selectTicksEvenly(ticks: number[], chartSpanIn: number, minPitchIn: number, hardCap: number): number[] {
  const maxLabels = Math.max(2, Math.min(hardCap, Math.floor(chartSpanIn / minPitchIn)));
  if (ticks.length <= maxLabels) return ticks;
  const picked: number[] = [];
  for (let i = 0; i < maxLabels; i++) {
    const idx = Math.round((i * (ticks.length - 1)) / Math.max(1, maxLabels - 1));
    picked.push(ticks[idx]);
  }
  return [...new Set(picked)].sort((a, b) => a - b);
}

/**
 * Espelha `PdfRenderer.drawBarChart` / `drawHorizontalBarChart` (fundo branco, grade, barras como shapes).
 */
function drawPdfAlignedBarChart(slide: PptxGenJS.Slide, chart: ExportChart, box: { x: number; y: number; w: number; h: number }, pptx: PptxPresentation): void {
  slide.addShape(pptx.ShapeType.rect, {
    x: box.x,
    y: box.y,
    w: box.w,
    h: box.h,
    fill: { color: "FFFFFF" },
    line: { color: "CBD5E1", pt: 0.75 },
  });

  if (!chart.valueKeys.length || !chart.data.length) return;

  const xScale = (px: number) => (px / PDF_CHART_REF_W) * box.w;
  const yScale = (py: number) => (py / PDF_CHART_REF_H) * box.h;

  if (chart.orientation === "horizontal") {
    const topPad = yScale(8);
    const bottomPad = yScale(38);
    const leftLabelW = Math.max(xScale(P19_HORIZONTAL_CHART_LABEL_WIDTH_PX), 0.7);
    const plotTop = box.y + topPad;
    const plotBottom = box.y + box.h - bottomPad;
    const plotH = plotBottom - plotTop;
    const baselineX = box.x + leftLabelW;
    const plotRight = box.x + box.w - xScale(10);
    const chartAreaW = Math.max(0.15, plotRight - baselineX);
    const padX6 = xScale(6);
    const padX10 = xScale(10);

    const rawMax = Math.max(1, ...chart.data.flatMap((d) => chart.valueKeys.map((s) => Number(d[s.key] ?? 0))));
    const axisMin = Number.isFinite(chart.yAxis?.min) ? Number(chart.yAxis?.min) : 0;
    const axisMax = Number.isFinite(chart.yAxis?.max) ? Number(chart.yAxis?.max) : Math.max(1, Math.ceil(rawMax * 1.15));
    const maxValue = Math.max(axisMin + 1, axisMax);
    const gridTicksRaw = resolveGridTicks(chart, axisMin, maxValue);
    const gridTicks = selectTicksEvenly(gridTicksRaw, chartAreaW, 0.2, 6);
    const serie = chart.valueKeys[0];
    const tickBoxW = Math.max(xScale(24), 0.36);

    slide.addShape(pptx.ShapeType.line, {
      x: baselineX,
      y: plotTop,
      w: 0,
      h: plotBottom - plotTop,
      line: { color: "64748B", pt: 1.25 },
    });

    const tickY = plotBottom + yScale(14);
    for (const tick of gridTicks) {
      const gx = baselineX + (chartAreaW * Math.max(0, tick - axisMin)) / (maxValue - axisMin);
      slide.addShape(pptx.ShapeType.line, {
        x: gx,
        y: plotTop,
        w: 0,
        h: plotBottom - plotTop,
        line: { color: "CBD5E1", pt: 0.75, dashType: "sysDash" },
      });
      slide.addText(formatAxisTick(tick), {
        x: gx - tickBoxW / 2,
        y: tickY,
        w: tickBoxW,
        h: Math.max(yScale(16), 0.14),
        fontSize: p19PxToPtForPptx(P19_CHART_AXIS_TICK_PX),
        color: "64748B",
        align: "center",
        wrap: false,
      });
    }

    const n = Math.max(1, chart.data.length);
    const rowH = plotH / n;
    chart.data.forEach((row, idx) => {
      const value = Number(row[serie.key] ?? 0);
      const barW = (Math.max(0, value - axisMin) / (maxValue - axisMin)) * chartAreaW;
      const rowCenterY = plotTop + (idx + 0.5) * rowH;
      const barThickness = Math.min(yScale(34), rowH * 0.55);
      const barY = rowCenterY - barThickness / 2;
      const barColor = String(row.color ?? serie.color);
      slide.addShape(pptx.ShapeType.rect, {
        x: baselineX,
        y: barY,
        w: Math.max(0.01, barW),
        h: barThickness,
        fill: { color: hexNoHash(barColor) },
        line: { color: hexNoHash(barColor), pt: 0 },
      });
      slide.addText(String(row[chart.categoryKey] ?? ""), {
        x: box.x + padX6,
        y: barY - yScale(2),
        w: Math.max(0.35, leftLabelW - padX10),
        h: barThickness + yScale(6),
        fontSize: p19PxToPtForPptx(P19_CHART_H_BAR_LABEL_PX),
        color: "334155",
        align: "left",
        valign: "middle",
        wrap: true,
      });
      const valW = Math.max(0.48, xScale(52));
      slide.addText(formatBarValueLabel(value), {
        x: baselineX + barW + Math.max(0.04, padX6 * 0.92),
        y: barY,
        w: valW,
        h: Math.max(barThickness, 0.16),
        fontSize: p19PxToPtForPptx(P19_CHART_H_BAR_VALUE_PX),
        bold: true,
        color: "0F172A",
        valign: "middle",
        wrap: false,
      });
    });
    return;
  }

  const tickLabelW = Math.max(0.4, xScale(26));
  const tickPadLeft = Math.max(0.05, xScale(4));
  const axisLeftX = box.x + tickLabelW + tickPadLeft + 0.02;
  const barsStartX = axisLeftX + xScale(8);
  const barsW = Math.max(0.35, box.x + box.w - barsStartX - xScale(10));
  const topPad = yScale(6);
  const bottomPad = yScale(34);
  const baselineY = box.y + box.h - bottomPad;
  const chartAreaH = baselineY - (box.y + topPad);
  const isStacked = chart.type === "stackedBar";
  const rawMax = Math.max(1, ...chart.data.flatMap((d) => chart.valueKeys.map((s) => Number(d[s.key] ?? 0))));
  const axisMin = Number.isFinite(chart.yAxis?.min) ? Number(chart.yAxis?.min) : 0;
  const axisMax = Number.isFinite(chart.yAxis?.max) ? Number(chart.yAxis?.max) : Math.max(1, Math.ceil(rawMax * 1.15));
  const maxValue = Math.max(axisMin + 1, axisMax);
  const gridTicksRaw = resolveGridTicks(chart, axisMin, maxValue);
  const gridTicks = selectTicksEvenly(gridTicksRaw, chartAreaH, 0.14, 5);
  const categories = chart.data.map((d) => String(d[chart.categoryKey] ?? ""));
  const colWidth = barsW / Math.max(1, categories.length);
  const hasMultipleSeries = chart.valueKeys.length > 1;
  const tickLabelH = Math.max(yScale(14), 0.13);
  const tickFont = Math.max(6, p19PxToPtForPptx(P19_CHART_AXIS_TICK_PX) - (chartAreaH < 0.85 ? 1 : 0));

  slide.addShape(pptx.ShapeType.line, {
    x: axisLeftX,
    y: box.y + topPad,
    w: 0,
    h: chartAreaH,
    line: { color: "64748B", pt: 1.25 },
  });

  for (const tick of gridTicks) {
    const gy = baselineY - (chartAreaH * Math.max(0, tick - axisMin)) / (maxValue - axisMin);
    slide.addShape(pptx.ShapeType.line, {
      x: axisLeftX,
      y: gy,
      w: box.x + box.w - axisLeftX,
      h: 0,
      line: { color: "CBD5E1", pt: 0.75, dashType: "sysDash" },
    });
    slide.addText(formatAxisTick(tick), {
      x: axisLeftX - tickLabelW - tickPadLeft,
      y: gy - tickLabelH / 2,
      w: tickLabelW,
      h: tickLabelH,
      fontSize: tickFont,
      color: "64748B",
      align: "right",
      wrap: false,
    });
  }

  const catY = box.y + box.h - yScale(6);
  const catH = Math.max(yScale(20), bottomPad - yScale(6));

  chart.data.forEach((row, idx) => {
    const baseXAligned = barsStartX + idx * colWidth + xScale(18);
    const innerW = Math.max(0.04, colWidth - xScale(36));

    if (hasMultipleSeries && !isStacked) {
      const gapIn = xScale(8);
      const seriesW = Math.max(0.02, Math.min(xScale(16), (innerW - gapIn * (chart.valueKeys.length - 1)) / chart.valueKeys.length));
      chart.valueKeys.forEach((s, sIdx) => {
        const value = Number(row[s.key] ?? 0);
        const barH = (Math.max(0, value - axisMin) / (maxValue - axisMin)) * chartAreaH;
        const barY = baselineY - barH;
        const barX = baseXAligned + sIdx * (seriesW + gapIn);
        slide.addShape(pptx.ShapeType.rect, {
          x: barX,
          y: barY,
          w: seriesW,
          h: barH,
          fill: { color: hexNoHash(s.color) },
          line: { color: hexNoHash(s.color), pt: 0 },
        });
        const valBoxW = Math.max(0.58, seriesW + 0.26);
        slide.addText(formatBarValueLabel(value), {
          x: barX + seriesW / 2 - valBoxW / 2,
          y: barY - yScale(13),
          w: valBoxW,
          h: yScale(14),
          fontSize: p19PxToPtForPptx(P19_CHART_BAR_VALUE_TOP_PX),
          bold: true,
          color: "0F172A",
          align: "center",
          wrap: false,
        });
      });
    } else if (hasMultipleSeries && isStacked) {
      const singleW = Math.max(0.04, Math.min(xScale(22), innerW * 0.45));
      const singleX = baseXAligned + (innerW - singleW) / 2;
      let currentTop = baselineY;
      let total = 0;
      chart.valueKeys.forEach((s) => {
        const value = Number(row[s.key] ?? 0);
        total += Math.max(0, value);
        const barH = (Math.max(0, value - axisMin) / (maxValue - axisMin)) * chartAreaH;
        const barY = currentTop - barH;
        slide.addShape(pptx.ShapeType.rect, {
          x: singleX,
          y: barY,
          w: singleW,
          h: barH,
          fill: { color: hexNoHash(s.color) },
          line: { color: hexNoHash(s.color), pt: 0 },
        });
        currentTop = barY;
      });
      const totW = Math.max(0.58, singleW + 0.28);
      slide.addText(formatBarValueLabel(total), {
        x: singleX + singleW / 2 - totW / 2,
        y: currentTop - yScale(14),
        w: totW,
        h: yScale(14),
        fontSize: p19PxToPtForPptx(P19_CHART_BAR_VALUE_TOP_PX + 1),
        bold: true,
        color: "0F172A",
        align: "center",
        wrap: false,
      });
    } else {
      const s = chart.valueKeys[0];
      const value = Number(row[s.key] ?? 0);
      const barH = (Math.max(0, value - axisMin) / (maxValue - axisMin)) * chartAreaH;
      const barY = baselineY - barH;
      const barColor = String(row.color ?? s.color);
      const singleW = Math.max(0.04, Math.min(xScale(22), innerW * 0.45));
      const singleX = baseXAligned + (innerW - singleW) / 2;
      slide.addShape(pptx.ShapeType.rect, {
        x: singleX,
        y: barY,
        w: singleW,
        h: barH,
        fill: { color: hexNoHash(barColor) },
        line: { color: hexNoHash(barColor), pt: 0 },
      });
      const oneSerW = Math.max(0.62, singleW + 0.32);
      slide.addText(formatBarValueLabel(value), {
        x: singleX + singleW / 2 - oneSerW / 2,
        y: barY - yScale(14),
        w: oneSerW,
        h: yScale(14),
        fontSize: p19PxToPtForPptx(P19_CHART_BAR_VALUE_TOP_PX),
        bold: true,
        color: "0F172A",
        align: "center",
        wrap: false,
      });
    }

    slide.addText(String(row[chart.categoryKey] ?? ""), {
      x: baseXAligned,
      y: catY,
      w: innerW,
      h: catH,
      fontSize: p19PxToPtForPptx(P19_CHART_CATEGORY_LABEL_PX),
      color: "334155",
      align: "center",
      valign: "top",
      wrap: true,
    });
  });
}

function drawFrame(slide: PptxGenJS.Slide, primaryColor: string, pptx: PptxPresentation): void {
  slide.background = { color: "F1F5F9" };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.12, fill: { color: hexNoHash(primaryColor) }, line: { color: hexNoHash(primaryColor) } });
}

function drawTitle(slide: PptxGenJS.Slide, title: string, primaryColor: string, pptx: PptxPresentation): void {
  slide.addShape(pptx.ShapeType.roundRect, {
    x: p19PxToSlideInX(40),
    y: p19PxToSlideInY(76),
    w: p19PxToSlideInX(P19_TITLE_ACCENT_W_PX),
    h: p19PxToSlideInY(P19_TITLE_ACCENT_H_PX),
    rx: 0.06,
    ry: 0.06,
    fill: { color: hexNoHash(primaryColor) },
    line: { color: hexNoHash(primaryColor) },
  });
  slide.addText(title, {
    x: p19PxToSlideInX(62),
    y: p19PxToSlideInY(76),
    w: 10.2,
    h: 1.15,
    bold: true,
    fontSize: 30,
    color: "0F172A",
    wrap: true,
  });
}

function drawTable(
  slide: PptxGenJS.Slide,
  columns: string[],
  rows: Array<Array<string | number>>,
  startY = 1.4
): void {
  const cellPad = P19_TABLE_CELL_PADDING_PX / 72;
  const rowHeadH = 0.42;
  const rowBodyH = 0.38;
  const rowHeights = [rowHeadH, ...rows.map(() => rowBodyH)];
  const tableH = rowHeights.reduce((sum, h) => sum + h, 0);
  const cellFs = p19PxToPtForPptx(P19_TABLE_CELL_FONT_PX);
  const classificationIdx = columns.findIndex((c) => String(c).toLowerCase().includes("classifica"));
  const classificationColor = (raw: string): string | null => {
    const n = String(raw ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (n.includes("abaixo")) return "EF4444";
    if (n.includes("basico")) return "FACC15";
    if (n.includes("adequado")) return "22C55E";
    if (n.includes("avan")) return "166534";
    return null;
  };
  const tableRows: PptxGenJS.TableRow[] = [
    columns.map((c) => ({
      text: c,
      options: {
        bold: true,
        fontSize: cellFs,
        color: "334155",
        fill: { color: "E2E8F0" },
        margin: cellPad,
      },
    })),
    ...rows.map((r, ri) =>
      r.map((c, ci) => {
        const baseColor = "0F172A";
        const maybe = classificationIdx === ci ? classificationColor(String(c)) : null;
        return {
          text: String(c),
          options: {
            fontSize: cellFs,
            color: maybe ?? baseColor,
            bold: Boolean(maybe),
            fill: { color: ri % 2 === 0 ? "FCFCFD" : "F1F5F9" },
            margin: cellPad,
          },
        };
      })
    ),
  ];
  slide.addTable(tableRows, {
    x: 0.48,
    y: startY,
    w: 12.35,
    h: tableH,
    rowH: rowHeights,
    border: { type: "solid", pt: 1, color: "CBD5E1" },
    colW: 12.35 / columns.length,
  });
}

function drawQuestionsTable(
  slide: PptxGenJS.Slide,
  columns: string[],
  rows: Array<Array<string | number>>,
  questionRowLevels: ProficiencyLevel[] | undefined,
  startY = 1.4
): void {
  const cellPad = P19_TABLE_CELL_PADDING_PX / 72;
  const rowHeadH = 0.42;
  const rowBodyH = 0.38;
  const rowHeights = [rowHeadH, ...rows.map(() => rowBodyH)];
  const tableH = rowHeights.reduce((sum, h) => sum + h, 0);
  const cellFs = p19PxToPtForPptx(P19_TABLE_CELL_FONT_PX);
  const tableRows: PptxGenJS.TableRow[] = [
    columns.map((c) => ({
      text: c,
      options: {
        bold: true,
        fontSize: cellFs,
        color: "334155",
        fill: { color: "E2E8F0" },
        margin: cellPad,
      },
    })),
    ...rows.map((r, ri) =>
      r.map((c, ci) => {
        const baseColor = "0F172A";
        const zebra = ri % 2 === 0 ? "FCFCFD" : "F1F5F9";
        if (questionRowLevels?.[ri]) {
          const st = P19_QUESTION_NUM_LEVEL_STYLE[questionRowLevels[ri]];
          return {
            text: String(c),
            options: {
              fontSize: cellFs,
              color: hexNoHash(st.color),
              bold: true,
              fill: { color: hexNoHash(st.bg) },
              margin: cellPad,
            },
          };
        }
        return {
          text: String(c),
          options: {
            fontSize: cellFs,
            color: baseColor,
            fill: { color: zebra },
            margin: cellPad,
          },
        };
      })
    ),
  ];
  slide.addTable(tableRows, {
    x: 0.48,
    y: startY,
    w: 12.35,
    h: tableH,
    rowH: rowHeights,
    border: { type: "solid", pt: 1, color: "CBD5E1" },
    colW: 12.35 / columns.length,
  });
}

function drawLevelsTable(
  slide: PptxGenJS.Slide,
  columns: string[],
  rows: Array<Array<string | number>>,
  startY = 1.4
): void {
  const cellPad = P19_TABLE_CELL_PADDING_PX / 72;
  const rowHeadH = 0.42;
  const rowBodyH = 0.38;
  const rowHeights = [rowHeadH, ...rows.map(() => rowBodyH)];
  const tableH = rowHeights.reduce((sum, h) => sum + h, 0);
  const cellFs = p19PxToPtForPptx(P19_TABLE_CELL_FONT_PX);
  const tableRows: PptxGenJS.TableRow[] = [
    columns.map((c, ci) => {
      if (ci >= 1 && ci <= 4) {
        const idx = ci - 1;
        return {
          text: c,
          options: {
            bold: true,
            fontSize: cellFs,
            color: "F8FAFC",
            fill: { color: P19_LEVELS_TABLE_LEVEL_HEADER_BG_HEX[idx] },
            margin: cellPad,
          },
        };
      }
      return {
        text: c,
        options: {
          bold: true,
          fontSize: cellFs,
          color: "334155",
          fill: { color: "E2E8F0" },
          margin: cellPad,
        },
      };
    }),
    ...rows.map((r, ri) => {
      const totalRow = String(r[0] ?? "") === "TOTAL GERAL";
      const bodyBg = totalRow ? "E2E8F0" : ri % 2 === 0 ? "FCFCFD" : "F1F5F9";
      return r.map((c) => ({
        text: String(c),
        options: {
          fontSize: cellFs,
          color: "0F172A",
          bold: totalRow,
          fill: { color: bodyBg },
          margin: cellPad,
        },
      }));
    }),
  ];
  slide.addTable(tableRows, {
    x: 0.48,
    y: startY,
    w: 12.35,
    h: tableH,
    rowH: rowHeights,
    border: { type: "solid", pt: 1, color: "CBD5E1" },
    colW: 12.35 / columns.length,
  });
}

function renderSlide(slide: PptxGenJS.Slide, slideSpec: Presentation19SlideSpec, spec: Presentation19ExportSpec, pptx: PptxPresentation): void {
  const { deckData } = spec;
  drawFrame(slide, deckData.primaryColor, pptx);
  switch (slideSpec.kind) {
    case "cover-main":
      slide.addText(deckData.avaliacaoNome || "N/A", {
        x: 0.48,
        y: 1.4,
        w: 10.8,
        h: 1.8,
        fontSize: p19PxToPtForPptx(P19_COVER_MAIN_TITLE_PX),
        bold: true,
        color: hexNoHash(deckData.primaryColor),
        wrap: true,
      });
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.48,
        y: 4.9,
        w: 12.35,
        h: 1.85,
        fill: { color: "F4F4F5" },
        line: { color: "E4E4E7" },
        rx: 0.12,
        ry: 0.12,
      });
      slide.addText(
        [
          { text: "MUNICÍPIO\n", options: { fontSize: p19PxToPtForPptx(P19_COVER_MAIN_LABEL_PX), color: "52525B", bold: true } },
          { text: `${deckData.municipioNome}\n\n`, options: { fontSize: p19PxToPtForPptx(P19_COVER_MAIN_VALUE_PX), color: "18181B", bold: true } },
          { text: "SÉRIE\n", options: { fontSize: p19PxToPtForPptx(P19_COVER_MAIN_LABEL_PX), color: "52525B", bold: true } },
          { text: deckData.serie, options: { fontSize: p19PxToPtForPptx(P19_COVER_MAIN_VALUE_PX), color: "18181B", bold: true } },
        ],
        {
          x: 0.75,
          y: 5.15,
          w: 11.8,
          h: 1.35,
        }
      );
      break;
    case "cover-school": {
      const escolas = deckData.escolasParticipantes;
      if (escolas.length <= 1) {
        slide.addText(escolas[0] || "N/A", {
          x: 0.8,
          y: 3,
          w: 11.7,
          h: 1,
          fontSize: p19PxToPtForPptx(P19_COVER_SCHOOL_SINGLE_PX),
          bold: true,
          align: "center",
          wrap: true,
        });
      } else {
        const listFsPx = escolas.length > 14 ? P19_COVER_SCHOOL_LIST_SMALL_PX : P19_COVER_SCHOOL_LIST_LARGE_PX;
        slide.addText(
          [
            { text: "ESCOLAS PARTICIPANTES\n", options: { fontSize: p19PxToPtForPptx(P19_COVER_SCHOOL_MULTI_HEADER_PX), color: "52525B", bold: true } },
            { text: escolas.map((s) => `• ${s}`).join("\n"), options: { fontSize: p19PxToPtForPptx(listFsPx), color: "18181B", bold: true } },
          ],
          {
            x: 0.65,
            y: 1.85,
            w: 12.1,
            h: 5.4,
            align: "center",
            valign: "top",
          }
        );
      }
      break;
    }
    case "metric-total-students":
      slide.addText("MÉTRICA GERAL", {
        x: 0.8,
        y: 2.4,
        w: 11.7,
        h: 0.6,
        fontSize: p19PxToPtForPptx(P19_METRIC_HEADER_PX),
        bold: true,
        align: "center",
      });
      slide.addText(Math.round(deckData.totalAlunosParticiparam).toLocaleString("pt-BR"), {
        x: 0.8,
        y: 3.1,
        w: 11.7,
        h: 1.2,
        fontSize: p19PxToPtForPptx(P19_METRIC_NUMBER_PX),
        bold: true,
        color: hexNoHash(deckData.primaryColor),
        align: "center",
      });
      slide.addText("Alunos que realizaram a avaliação", {
        x: 0.8,
        y: 4.5,
        w: 11.7,
        h: 0.6,
        fontSize: p19PxToPtForPptx(P19_METRIC_HEADER_PX),
        bold: true,
        align: "center",
      });
      break;
    case "cover-segment": {
      drawTitle(slide, "CAPA DE SEGMENTO", deckData.primaryColor, pptx);
      const labPt = p19PxToPtForPptx(P19_SEGMENT_FIELD_LABEL_PX);
      const valPt = p19PxToPtForPptx(P19_SEGMENT_FIELD_VALUE_PX);
      const turmaList = deckData.turmasParticipantesCapa.length > 8;
      const turmaBodyPt = turmaList
        ? p19PxToPtForPptx(20)
        : p19PxToPtForPptx(deckData.turma.length > 120 ? 22 : 34);
      slide.addText(
        [
          { text: "CURSO\n", options: { fontSize: labPt, color: "52525B", bold: true } },
          { text: `${deckData.curso}\n\n`, options: { fontSize: valPt, color: "18181B", bold: true } },
          { text: "SÉRIE\n", options: { fontSize: labPt, color: "52525B", bold: true } },
          { text: `${deckData.serie}\n\n`, options: { fontSize: valPt, color: "18181B", bold: true } },
          {
            text: `${deckData.turmasParticipantesCapa.length > 1 ? "TURMAS" : "TURMA"}\n`,
            options: { fontSize: labPt, color: "52525B", bold: true },
          },
          {
            text: turmaList ? deckData.turmasParticipantesCapa.map((t) => `• ${t}`).join("\n") : deckData.turma,
            options: { fontSize: turmaBodyPt, color: "18181B", bold: true },
          },
        ],
        { x: 0.76, y: 1.55, w: 11.8, h: 4.9, valign: "top" }
      );
      break;
    }
    case "presence-table":
      drawTitle(slide, presentationTitleTablePresence(deckData.comparisonAxis), deckData.primaryColor, pptx);
      drawTable(slide, slideSpec.table.columns, slideSpec.table.rows);
      break;
    case "presence-chart":
      drawTitle(slide, presentationTitleChartPresence(deckData.comparisonAxis), deckData.primaryColor, pptx);
      drawPdfAlignedBarChart(slide, slideSpec.chart, { x: 0.55, y: 1.45, w: 12.2, h: 5.8 }, pptx);
      break;
    case "section-levels":
      drawTitle(slide, presentationSectionLevels(deckData.comparisonAxis), deckData.primaryColor, pptx);
      slide.addText(presentationSectionLevelsTagline(deckData.comparisonAxis), {
        x: 0.8,
        y: 4.1,
        w: 11.7,
        h: 0.6,
        align: "center",
        fontSize: p19PxToPtForPptx(P19_SECTION_TAGLINE_PX),
        color: "52525B",
      });
      break;
    case "levels-guide":
      drawTitle(slide, "GUIA DE NÍVEIS DE APRENDIZAGEM", deckData.primaryColor, pptx);
      spec.deckData.levelGuide.forEach((lvl, idx) => {
        const y = 1.35 + idx * 1.42;
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 0.55,
          y,
          w: 12.25,
          h: 1.28,
          fill: { color: "F8FAFC" },
          line: { color: "E4E4E7" },
          rx: 0.1,
          ry: 0.1,
        });
        slide.addShape(pptx.ShapeType.rect, {
          x: 0.55,
          y,
          w: 0.14,
          h: 1.28,
          fill: { color: hexNoHash(lvl.color) },
          line: { color: hexNoHash(lvl.color) },
        });
        slide.addText(lvl.label, {
          x: 0.78,
          y: y + 0.12,
          w: 11.9,
          h: 0.32,
          fontSize: p19PxToPtForPptx(P19_LEVELS_GUIDE_TITLE_PX),
          bold: true,
          color: hexNoHash(lvl.color),
        });
        slide.addText(lvl.description, {
          x: 0.78,
          y: y + 0.48,
          w: 11.9,
          h: 0.72,
          fontSize: p19PxToPtForPptx(P19_LEVELS_GUIDE_DESC_PX),
          color: "3F3F46",
          wrap: true,
        });
      });
      break;
    case "levels-chart": {
      drawTitle(slide, presentationTitleChartLevels(deckData.comparisonAxis), deckData.primaryColor, pptx);
      if (slideSpec.escolaNome) {
        slide.addText(slideSpec.escolaNome, {
          x: 0.62,
          y: 1.05,
          w: 11.5,
          h: 0.35,
          fontSize: p19PxToPtForPptx(P19_SUBTITLE_FONT_PX),
          color: "52525B",
          wrap: true,
        });
      }
      const chartX = p19PxToSlideInX(P19_CONTENT.x + P19_TITLE_TEXT_OFFSET_X_PX);
      const chartW = p19PxToSlideInX(P19_CONTENT.x + P19_CONTENT.w) - chartX;
      drawPdfAlignedBarChart(
        slide,
        slideSpec.chart,
        { x: chartX, y: slideSpec.escolaNome ? 1.55 : 1.45, w: chartW, h: slideSpec.escolaNome ? 5.65 : 5.8 },
        pptx
      );
      break;
    }
    case "levels-table":
      drawTitle(slide, niveisAprendizagemTituloPorEixo(deckData.comparisonAxis), deckData.primaryColor, pptx);
      if (slideSpec.escolaNome) {
        slide.addText(slideSpec.escolaNome, {
          x: 0.62,
          y: 1.05,
          w: 11.5,
          h: 0.35,
          fontSize: p19PxToPtForPptx(P19_SUBTITLE_FONT_PX),
          color: "52525B",
          wrap: true,
        });
      }
      drawLevelsTable(slide, slideSpec.table.columns, slideSpec.table.rows, slideSpec.escolaNome ? 1.52 : 1.4);
      break;
    case "section-proficiency":
      drawTitle(slide, presentationSectionProficiency(deckData.comparisonAxis), deckData.primaryColor, pptx);
      slide.addText(presentationSectionProficiencyTagline(deckData.comparisonAxis), {
        x: 0.8,
        y: 4.1,
        w: 11.7,
        h: 0.6,
        align: "center",
        fontSize: p19PxToPtForPptx(P19_SECTION_TAGLINE_PX),
        color: "52525B",
      });
      break;
    case "proficiency-general-chart": {
      drawTitle(slide, presentationTitleProficiencyGeneralChart(deckData.comparisonAxis), deckData.primaryColor, pptx);
      if (slideSpec.escolaNome) {
        slide.addText(slideSpec.escolaNome, {
          x: 0.62,
          y: 1.05,
          w: 11.5,
          h: 0.35,
          fontSize: p19PxToPtForPptx(P19_SUBTITLE_FONT_PX),
          color: "52525B",
          wrap: true,
        });
      }
      const profChartX = p19PxToSlideInX(P19_CONTENT.x + P19_TITLE_TEXT_OFFSET_X_PX);
      const profChartW = p19PxToSlideInX(P19_CONTENT.x + P19_CONTENT.w) - profChartX;
      drawPdfAlignedBarChart(
        slide,
        slideSpec.chart,
        {
          x: profChartX,
          y: slideSpec.escolaNome ? 1.55 : 1.45,
          w: profChartW,
          h: slideSpec.escolaNome ? 5.65 : 5.8,
        },
        pptx
      );
      break;
    }
    case "proficiency-by-discipline-chart":
      drawTitle(slide, presentationTitleProficiencyByDiscipline(deckData.comparisonAxis), deckData.primaryColor, pptx);
      if (slideSpec.escolaNome) {
        slide.addText(slideSpec.escolaNome, {
          x: 0.62,
          y: 1.05,
          w: 11.5,
          h: 0.35,
          fontSize: p19PxToPtForPptx(P19_SUBTITLE_FONT_PX),
          color: "52525B",
          wrap: true,
        });
      }
      slideSpec.charts.forEach((entry, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const gridLeft = P19_CONTENT.x + P19_TITLE_TEXT_OFFSET_X_PX;
        const gridW = P19_CONTENT.w - P19_TITLE_TEXT_OFFSET_X_PX;
        const gridPad = 8;
        const boxWpx = (gridW - gridPad * 3) / 2;
        const boxXpx = gridLeft + gridPad + col * (boxWpx + gridPad);
        const boxX = p19PxToSlideInX(boxXpx);
        const boxWIn = p19PxToSlideInX(boxWpx);
        const innerPadPx = 8;
        const innerWpx = boxWpx - innerPadPx * 2;
        const boxY = (slideSpec.escolaNome ? 1.52 : 1.4) + row * 2.95;
        slide.addShape(pptx.ShapeType.roundRect, {
          x: boxX,
          y: boxY,
          w: boxWIn,
          h: 2.75,
          fill: { color: "F8FAFC" },
          line: { color: "D4D4D8" },
          rx: 0.08,
          ry: 0.08,
        });
        slide.addText(entry.title, {
          x: p19PxToSlideInX(boxXpx + innerPadPx),
          y: boxY + 0.12,
          w: p19PxToSlideInX(innerWpx),
          h: 0.28,
          fontSize: p19PxToPtForPptx(P19_CHART_H_BAR_LABEL_PX),
          bold: true,
          color: "3F3F46",
          wrap: true,
        });
        drawPdfAlignedBarChart(slide, entry.chart, {
          x: p19PxToSlideInX(boxXpx + innerPadPx),
          y: boxY + 0.35,
          w: p19PxToSlideInX(innerWpx),
          h: 2.25,
        }, pptx);
      });
      break;
    case "section-grades":
      drawTitle(slide, presentationSectionGrades(deckData.comparisonAxis), deckData.primaryColor, pptx);
      slide.addText(presentationSectionGradesTagline(deckData.comparisonAxis), {
        x: 0.8,
        y: 4.1,
        w: 11.7,
        h: 0.6,
        align: "center",
        fontSize: p19PxToPtForPptx(P19_SECTION_TAGLINE_PX),
        color: "52525B",
      });
      break;
    case "grades-table":
      drawTitle(slide, presentationTitleTableGrades(deckData.comparisonAxis), deckData.primaryColor, pptx);
      drawTable(slide, slideSpec.table.columns, slideSpec.table.rows);
      break;
    case "grades-chart":
      drawTitle(slide, presentationTitleChartGrades(deckData.comparisonAxis), deckData.primaryColor, pptx);
      if (slideSpec.escolaNome) {
        slide.addText(slideSpec.escolaNome, {
          x: 0.62,
          y: 1.05,
          w: 11.5,
          h: 0.35,
          fontSize: p19PxToPtForPptx(P19_SUBTITLE_FONT_PX),
          color: "52525B",
          wrap: true,
        });
      }
      drawPdfAlignedBarChart(
        slide,
        slideSpec.chart,
        { x: 0.55, y: slideSpec.escolaNome ? 1.55 : 1.45, w: 12.2, h: slideSpec.escolaNome ? 5.65 : 5.8 },
        pptx
      );
      break;
    case "section-questions":
      drawTitle(slide, presentationSectionQuestionsTitle(), deckData.primaryColor, pptx);
      slide.addText(presentationSectionQuestionsTagline(), {
        x: 0.8,
        y: 4.1,
        w: 11.7,
        h: 0.6,
        align: "center",
        fontSize: p19PxToPtForPptx(P19_SECTION_TAGLINE_PX),
        color: "52525B",
      });
      break;
    case "dynamic-series-cover":
      slide.addText(`[${deckData.serieNomeCapas}]`, {
        x: 0.8,
        y: 3.3,
        w: 11.7,
        h: 0.8,
        fontSize: p19PxToPtForPptx(P19_DYNAMIC_COVER_PX),
        bold: true,
        color: hexNoHash(deckData.primaryColor),
        align: "center",
        wrap: true,
      });
      break;
    case "dynamic-class-cover":
      slide.addText(`[${deckData.turmaNomeCapas}]`, {
        x: 0.8,
        y: 3.3,
        w: 11.7,
        h: 0.8,
        fontSize: p19PxToPtForPptx(P19_DYNAMIC_COVER_PX),
        bold: true,
        color: hexNoHash(deckData.primaryColor),
        align: "center",
        wrap: true,
      });
      break;
    case "questions-turma-cover": {
      const coverLine = presentationQuestionsTurmaCoverLine(slideSpec.serieLabel, slideSpec.turmaNome);
      slide.addText(coverLine, {
        x: 0.7,
        y: 2.6,
        w: 12.1,
        h: 2.4,
        fontSize: p19PxToPtForPptx(
          slideSpec.serieLabel.length + slideSpec.turmaNome.length > 80 ? 26 : 34
        ),
        bold: true,
        color: hexNoHash(deckData.primaryColor),
        align: "center",
        valign: "middle",
        wrap: true,
      });
      break;
    }
    case "questions-table": {
      const qt =
        slideSpec.questionsSubsection?.kind === "geral"
          ? "TABELA DE QUESTÕES — GERAL"
          : slideSpec.questionsSubsection?.kind === "serie-geral"
            ? presentationTitleQuestionsSerieGeral(slideSpec.questionsSubsection.serieLabel)
            : slideSpec.questionsSubsection?.kind === "turma"
              ? `TABELA DE QUESTÕES — TURMA ${slideSpec.questionsSubsection.turmaNome}`
              : "TABELA DE QUESTÕES";
      drawTitle(slide, qt, deckData.primaryColor, pptx);
      if (slideSpec.questionsPage != null && slideSpec.questionsPage.total > 1) {
        slide.addText(`Página ${slideSpec.questionsPage.current}/${slideSpec.questionsPage.total}`, {
          x: 9.0,
          y: 0.58,
          w: 4.0,
          h: 0.35,
          fontSize: p19PxToPtForPptx(P19_PAGE_INDICATOR_FONT_PX),
          color: "52525B",
          align: "right",
        });
      }
      drawQuestionsTable(slide, slideSpec.table.columns, slideSpec.table.rows, slideSpec.questionRowLevels);
      break;
    }
    case "thank-you":
      slide.addText("Obrigado!!", {
        x: 0.8,
        y: 3.2,
        w: 11.7,
        h: 0.9,
        fontSize: p19PxToPtForPptx(P19_THANK_YOU_FONT_PX),
        bold: true,
        align: "center",
        color: hexNoHash(deckData.primaryColor),
      });
      break;
  }
}

export async function renderPptxFromSlideSpec(args: RenderPptxArgs): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "InnovPlay";
  args.spec.slides.forEach((specSlide) => {
    const slide = pptx.addSlide();
    renderSlide(slide, specSlide, args.spec, pptx);
  });
  await pptx.writeFile({ fileName: args.fileName });
}
