import PptxGenJS from "pptxgenjs";
import type { ExportChart, Presentation19ExportSpec, Presentation19SlideSpec } from "@/types/presentation19-export-spec";

type RenderPptxArgs = {
  spec: Presentation19ExportSpec;
  fileName: string;
};

type PptxPresentation = InstanceType<typeof PptxGenJS>;

function hexNoHash(hex: string): string {
  return hex.replace("#", "").toUpperCase();
}

/** Mesmas proporções do `PdfRenderer.drawBarChart` (área ref. 1043×470 px no conteúdo do PDF). */
const PDF_CHART_REF_W = 1043;
const PDF_CHART_REF_H = 470;

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
    const leftLabelW = Math.max(xScale(122), 0.55);
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
        fontSize: 8,
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
        fontSize: 9,
        color: "334155",
        align: "left",
        valign: "middle",
        wrap: false,
      });
      const valW = Math.max(0.48, xScale(52));
      slide.addText(formatBarValueLabel(value), {
        x: baselineX + barW + Math.max(0.04, padX6 * 0.92),
        y: barY,
        w: valW,
        h: Math.max(barThickness, 0.16),
        fontSize: 10,
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
  const tickFont = chartAreaH < 0.85 ? 7 : 8;

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
          fontSize: 8,
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
        fontSize: 9,
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
        fontSize: 10,
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
      fontSize: 10,
      color: "334155",
      align: "center",
      valign: "top",
      wrap: false,
    });
  });
}

function drawFrame(slide: PptxGenJS.Slide, primaryColor: string, pptx: PptxPresentation): void {
  slide.background = { color: "F1F5F9" };
  for (let x = 0; x <= 13.333; x += 0.66) {
    slide.addShape(pptx.ShapeType.line, {
      x,
      y: 0,
      w: 0,
      h: 7.5,
      line: { color: "E2E8F0", pt: 0.35 },
    });
  }
  for (let y = 0; y <= 7.5; y += 0.66) {
    slide.addShape(pptx.ShapeType.line, {
      x: 0,
      y,
      w: 13.333,
      h: 0,
      line: { color: "E5EAF1", pt: 0.35 },
    });
  }
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.12, fill: { color: hexNoHash(primaryColor) }, line: { color: hexNoHash(primaryColor) } });
}

function drawTitle(slide: PptxGenJS.Slide, title: string, primaryColor: string, pptx: PptxPresentation): void {
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.46,
    y: 0.56,
    w: 0.12,
    h: 0.42,
    rx: 0.08,
    ry: 0.08,
    fill: { color: hexNoHash(primaryColor) },
    line: { color: hexNoHash(primaryColor) },
  });
  slide.addText(title, { x: 0.62, y: 0.58, w: 8.5, h: 0.48, bold: true, fontSize: 22, color: "0F172A" });
}

function drawTable(slide: PptxGenJS.Slide, columns: string[], rows: Array<Array<string | number>>): void {
  const cellPad = 6 / 72;
  const rowHeadH = 0.36;
  const rowBodyH = 0.3;
  const rowHeights = [rowHeadH, ...rows.map(() => rowBodyH)];
  const tableH = rowHeights.reduce((sum, h) => sum + h, 0);
  const tableRows: PptxGenJS.TableRow[] = [
    columns.map((c) => ({
      text: c,
      options: {
        bold: true,
        fontSize: 12,
        color: "334155",
        fill: { color: "E2E8F0" },
        margin: cellPad,
      },
    })),
    ...rows.map((r, ri) =>
      r.map((c) => ({
        text: String(c),
        options: {
          fontSize: 12,
          color: "0F172A",
          fill: { color: ri % 2 === 0 ? "FCFCFD" : "F1F5F9" },
          margin: cellPad,
        },
      }))
    ),
  ];
  slide.addTable(tableRows, {
    x: 0.48,
    y: 1.4,
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
        fontSize: 42,
        bold: true,
        color: hexNoHash(deckData.primaryColor),
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
      slide.addText(`MUNICÍPIO\n${deckData.municipioNome}\n\nSÉRIE\n${deckData.serie}`, {
        x: 0.75,
        y: 5.15,
        w: 11.8,
        h: 1.35,
        fontSize: 18,
        bold: true,
        color: "18181B",
      });
      break;
    case "cover-school":
      slide.addText(deckData.escolasParticipantes[0] || "N/A", {
        x: 0.8,
        y: 3,
        w: 11.7,
        h: 1,
        fontSize: 38,
        bold: true,
        align: "center",
      });
      break;
    case "metric-total-students":
      slide.addText("MÉTRICA GERAL", { x: 0.8, y: 2.4, w: 11.7, h: 0.6, fontSize: 24, bold: true, align: "center" });
      slide.addText(Math.round(deckData.totalAlunosParticiparam).toLocaleString("pt-BR"), {
        x: 0.8,
        y: 3.1,
        w: 11.7,
        h: 1.2,
        fontSize: 58,
        bold: true,
        color: hexNoHash(deckData.primaryColor),
        align: "center",
      });
      slide.addText("Alunos que realizaram a avaliação", {
        x: 0.8,
        y: 4.5,
        w: 11.7,
        h: 0.6,
        fontSize: 24,
        bold: true,
        align: "center",
      });
      break;
    case "cover-segment":
      drawTitle(slide, "CAPA DE SEGMENTO", deckData.primaryColor, pptx);
      slide.addText(`CURSO\n${deckData.curso}\n\nSÉRIE\n${deckData.serie}\n\nTURMA\n${deckData.turma}`, {
        x: 0.76,
        y: 1.6,
        w: 11.8,
        h: 4.8,
        fontSize: 20,
        bold: true,
      });
      break;
    case "presence-table":
      drawTitle(slide, "TABELA DE PRESENÇA", deckData.primaryColor, pptx);
      drawTable(slide, slideSpec.table.columns, slideSpec.table.rows);
      break;
    case "presence-chart":
      drawTitle(slide, "GRÁFICO DE PRESENÇA", deckData.primaryColor, pptx);
      drawPdfAlignedBarChart(slide, slideSpec.chart, { x: 0.55, y: 1.45, w: 12.2, h: 5.8 }, pptx);
      break;
    case "section-levels":
      drawTitle(slide, "NÍVEIS DE APRENDIZAGEM", deckData.primaryColor, pptx);
      slide.addText("Distribuição de alunos por nível e série", { x: 0.8, y: 4.1, w: 11.7, h: 0.6, align: "center", fontSize: 18, color: "52525B" });
      break;
    case "levels-guide":
      drawTitle(slide, "GUIA DE NÍVEIS", deckData.primaryColor, pptx);
      spec.deckData.levelGuide.forEach((lvl, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const x = 0.55 + col * 6.15;
        const y = 1.5 + row * 2.8;
        slide.addShape(pptx.ShapeType.roundRect, {
          x,
          y,
          w: 5.8,
          h: 2.5,
          fill: { color: "F8FAFC" },
          line: { color: "E4E4E7" },
          rx: 0.1,
          ry: 0.1,
        });
        slide.addText(lvl.label, { x: x + 0.2, y: y + 0.2, w: 5.4, h: 0.35, fontSize: 16, bold: true, color: hexNoHash(lvl.color) });
        slide.addText(lvl.description, { x: x + 0.2, y: y + 0.65, w: 5.4, h: 1.7, fontSize: 11, color: "3F3F46" });
      });
      break;
    case "levels-chart":
      drawTitle(slide, "GRÁFICO DE NÍVEIS", deckData.primaryColor, pptx);
      drawPdfAlignedBarChart(slide, slideSpec.chart, { x: 0.55, y: 1.45, w: 12.2, h: 5.8 }, pptx);
      break;
    case "levels-table":
      drawTitle(slide, "TABELA DE NÍVEIS", deckData.primaryColor, pptx);
      drawTable(slide, slideSpec.table.columns, slideSpec.table.rows);
      break;
    case "section-proficiency":
      drawTitle(slide, "PROFICIÊNCIAS", deckData.primaryColor, pptx);
      slide.addText("Proficiência geral e por disciplina", { x: 0.8, y: 4.1, w: 11.7, h: 0.6, align: "center", fontSize: 18, color: "52525B" });
      break;
    case "proficiency-general-chart":
      drawTitle(slide, "PROFICIÊNCIA GERAL POR TURMA", deckData.primaryColor, pptx);
      drawPdfAlignedBarChart(slide, slideSpec.chart, { x: 0.55, y: 1.45, w: 12.2, h: 5.8 }, pptx);
      break;
    case "proficiency-by-discipline-chart":
      drawTitle(slide, "PROFICIÊNCIA POR DISCIPLINA POR TURMA", deckData.primaryColor, pptx);
      slideSpec.charts.forEach((entry, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const boxX = 0.55 + col * 6.15;
        const boxY = 1.4 + row * 2.95;
        slide.addShape(pptx.ShapeType.roundRect, {
          x: boxX,
          y: boxY,
          w: 5.85,
          h: 2.75,
          fill: { color: "F8FAFC" },
          line: { color: "D4D4D8" },
          rx: 0.08,
          ry: 0.08,
        });
        slide.addText(entry.title, { x: boxX + 0.15, y: boxY + 0.12, w: 5.6, h: 0.28, fontSize: 10, bold: true, color: "3F3F46" });
        drawPdfAlignedBarChart(slide, entry.chart, { x: boxX + 0.12, y: boxY + 0.35, w: 5.6, h: 2.25 }, pptx);
      });
      break;
    case "projection-table":
      drawTitle(slide, "TABELA DE PROJEÇÃO", deckData.primaryColor, pptx);
      drawTable(slide, slideSpec.table.columns, slideSpec.table.rows);
      break;
    case "section-questions":
      drawTitle(slide, "QUESTÕES", deckData.primaryColor, pptx);
      slide.addText("Análise por habilidade e percentual de acerto", { x: 0.8, y: 4.1, w: 11.7, h: 0.6, align: "center", fontSize: 18, color: "52525B" });
      break;
    case "dynamic-series-cover":
      slide.addText(`[${deckData.serieNomeCapas}]`, { x: 0.8, y: 3.3, w: 11.7, h: 0.8, fontSize: 42, bold: true, color: hexNoHash(deckData.primaryColor), align: "center" });
      break;
    case "dynamic-class-cover":
      slide.addText(`[${deckData.turmaNomeCapas}]`, { x: 0.8, y: 3.3, w: 11.7, h: 0.8, fontSize: 42, bold: true, color: hexNoHash(deckData.primaryColor), align: "center" });
      break;
    case "questions-table":
      drawTitle(slide, "TABELA DE QUESTÕES", deckData.primaryColor, pptx);
      if (slideSpec.questionsPage != null && slideSpec.questionsPage.total > 1) {
        slide.addText(`Página ${slideSpec.questionsPage.current}/${slideSpec.questionsPage.total}`, {
          x: 9.0,
          y: 0.58,
          w: 4.0,
          h: 0.35,
          fontSize: 12,
          color: "52525B",
          align: "right",
        });
      }
      drawTable(slide, slideSpec.table.columns, slideSpec.table.rows);
      break;
    case "thank-you":
      slide.addText("Obrigado!!", { x: 0.8, y: 3.2, w: 11.7, h: 0.9, fontSize: 56, bold: true, align: "center", color: hexNoHash(deckData.primaryColor) });
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
