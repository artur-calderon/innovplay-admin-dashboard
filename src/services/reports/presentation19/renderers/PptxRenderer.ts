import PptxGenJS from "pptxgenjs";
import type { ExportChart, Presentation19ExportSpec, Presentation19SlideSpec } from "@/types/presentation19-export-spec";

type RenderPptxArgs = {
  spec: Presentation19ExportSpec;
  fileName: string;
};

function hexNoHash(hex: string): string {
  return hex.replace("#", "").toUpperCase();
}

function drawFrame(slide: PptxGenJS.Slide, primaryColor: string): void {
  slide.background = { color: "F1F5F9" };
  for (let x = 0; x <= 13.333; x += 0.66) {
    slide.addShape(PptxGenJS.ShapeType.line, {
      x,
      y: 0,
      w: 0,
      h: 7.5,
      line: { color: "E2E8F0", pt: 0.35 },
    });
  }
  for (let y = 0; y <= 7.5; y += 0.66) {
    slide.addShape(PptxGenJS.ShapeType.line, {
      x: 0,
      y,
      w: 13.333,
      h: 0,
      line: { color: "E5EAF1", pt: 0.35 },
    });
  }
  slide.addShape(PptxGenJS.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.12, fill: { color: hexNoHash(primaryColor) }, line: { color: hexNoHash(primaryColor) } });
}

function drawTitle(slide: PptxGenJS.Slide, title: string, primaryColor: string): void {
  slide.addShape(PptxGenJS.ShapeType.roundRect, {
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

function addSimpleChart(slide: PptxGenJS.Slide, chart: ExportChart, box: { x: number; y: number; w: number; h: number }): void {
  const categories = chart.data.map((item) => String(item[chart.categoryKey] ?? ""));
  const rawMax = Math.max(1, ...chart.data.flatMap((item) => chart.valueKeys.map((serie) => Number(item[serie.key] ?? 0))));
  const axisMin = Number.isFinite(chart.yAxis?.min) ? Number(chart.yAxis?.min) : 0;
  const axisMax = Number.isFinite(chart.yAxis?.max) ? Number(chart.yAxis?.max) : Math.max(1, Math.ceil(rawMax * 1.15));
  const maxValue = Math.max(axisMin + 1, axisMax);
  const ticks = chart.yAxis?.ticks?.length ? chart.yAxis.ticks : undefined;
  const majorUnit = ticks && ticks.length > 1 ? Math.abs(Number(ticks[1]) - Number(ticks[0])) : Math.max(1, Math.ceil((maxValue - axisMin) / 4));
  const series = chart.valueKeys.map((serie) => ({
    name: serie.label,
    labels: categories,
    values: chart.data.map((item) => Number(item[serie.key] ?? 0)),
  }));
  slide.addChart(PptxGenJS.ChartType.bar, series, {
    x: box.x,
    y: box.y,
    w: box.w,
    h: box.h,
    barDir: "col",
    barGrouping: chart.type === "stackedBar" ? "stacked" : "clustered",
    showLegend: chart.valueKeys.length > 1,
    catAxisLabelRotate: 0,
    showValue: true,
    chartColors: chart.valueKeys.map((serie) => hexNoHash(serie.color)),
    valAxisMinVal: axisMin,
    valAxisMaxVal: maxValue,
    valAxisMajorUnit: majorUnit,
    valGridLine: { color: "CBD5E1", pt: 0.6 },
    valAxisLineColor: "64748B",
    valAxisLinePt: 1.25,
    dataLabelColor: "0F172A",
    catAxisLabelColor: "334155",
    valAxisLabelColor: "334155",
    gapWidthPct: 260,
    overlapPct: 0,
  });
}

function addSingleSeriesColoredBars(slide: PptxGenJS.Slide, chart: ExportChart, box: { x: number; y: number; w: number; h: number }): void {
  const axisMin = Number.isFinite(chart.yAxis?.min) ? Number(chart.yAxis?.min) : 0;
  const axisMax = Number.isFinite(chart.yAxis?.max) ? Number(chart.yAxis?.max) : 100;
  const maxValue = Math.max(axisMin + 1, axisMax);
  const ticks = chart.yAxis?.ticks?.length ? chart.yAxis.ticks : [axisMin, (axisMin + maxValue) / 2, maxValue];
  const singleKey = chart.valueKeys[0]?.key ?? "valor";
  const fallbackColor = chart.valueKeys[0]?.color ?? "#22C55E";

  if (chart.orientation === "horizontal") {
    const plotX = box.x + 0.35;
    const plotY = box.y + 0.22;
    const plotW = box.w - 0.45;
    const plotH = box.h - 0.65;
    const labelW = 1.35;
    const baselineX = plotX + labelW;
    const chartW = Math.max(0.5, plotW - labelW - 0.08);
    const baselineYTop = plotY;
    const baselineYBot = plotY + plotH - 0.35;

    slide.addShape(PptxGenJS.ShapeType.line, {
      x: baselineX,
      y: baselineYTop,
      w: 0,
      h: baselineYBot - baselineYTop,
      line: { color: "64748B", pt: 1 },
    });

    ticks.forEach((tick) => {
      const ratio = (Number(tick) - axisMin) / (maxValue - axisMin);
      const gx = baselineX + Math.max(0, Math.min(1, ratio)) * chartW;
      slide.addShape(PptxGenJS.ShapeType.line, {
        x: gx,
        y: baselineYTop,
        w: 0,
        h: baselineYBot - baselineYTop,
        line: { color: "CBD5E1", pt: 0.6, dash: "dash" },
      });
      slide.addText(Number.isInteger(tick) ? String(Math.round(tick)) : Number(tick).toFixed(1), {
        x: gx - 0.14,
        y: baselineYBot + 0.04,
        w: 0.28,
        h: 0.14,
        fontSize: 8,
        color: "64748B",
        align: "center",
      });
    });

    const n = Math.max(1, chart.data.length);
    const rowH = (baselineYBot - baselineYTop) / n;
    chart.data.forEach((row, idx) => {
      const value = Number(row[singleKey] ?? 0);
      const ratio = (Math.max(axisMin, value) - axisMin) / (maxValue - axisMin);
      const barW = Math.max(0, Math.min(1, ratio)) * chartW;
      const cy = baselineYTop + idx * rowH + rowH / 2;
      const bh = Math.min(0.22, rowH * 0.55);
      const by = cy - bh / 2;
      const fillColor = hexNoHash(String(row.color ?? fallbackColor));
      slide.addShape(PptxGenJS.ShapeType.rect, {
        x: baselineX,
        y: by,
        w: Math.max(0.02, barW),
        h: bh,
        fill: { color: fillColor },
        line: { color: fillColor, pt: 0 },
      });
      slide.addText(String(row[chart.categoryKey] ?? ""), {
        x: plotX,
        y: by - 0.02,
        w: labelW - 0.05,
        h: bh + 0.06,
        fontSize: 8,
        color: "334155",
        align: "right",
        valign: "middle",
      });
      slide.addText(String(Math.round(value)), {
        x: baselineX + barW + 0.05,
        y: by,
        w: 0.5,
        h: bh,
        fontSize: 8,
        bold: true,
        color: "0F172A",
        valign: "middle",
      });
    });
    return;
  }

  const plotX = box.x + 0.4;
  const plotY = box.y + 0.2;
  const plotW = box.w - 0.55;
  const plotH = box.h - 0.55;
  const baselineY = plotY + plotH;

  slide.addShape(PptxGenJS.ShapeType.line, {
    x: plotX,
    y: plotY,
    w: 0,
    h: plotH,
    line: { color: "64748B", pt: 1 },
  });

  ticks.forEach((tick) => {
    const ratio = (Number(tick) - axisMin) / (maxValue - axisMin);
    const gy = baselineY - Math.max(0, Math.min(1, ratio)) * plotH;
    slide.addShape(PptxGenJS.ShapeType.line, {
      x: plotX,
      y: gy,
      w: plotW,
      h: 0,
      line: { color: "CBD5E1", pt: 0.6, dash: "dash" },
    });
    slide.addText(Number.isInteger(tick) ? String(Math.round(tick)) : Number(tick).toFixed(1), {
      x: plotX - 0.28,
      y: gy - 0.08,
      w: 0.22,
      h: 0.16,
      fontSize: 8,
      color: "64748B",
      align: "right",
    });
  });

  const barAreaW = plotW - 0.05;
  const count = Math.max(1, chart.data.length);
  const colW = barAreaW / count;

  chart.data.forEach((row, idx) => {
    const value = Number(row[singleKey] ?? 0);
    const ratio = (Math.max(axisMin, value) - axisMin) / (maxValue - axisMin);
    const barH = Math.max(0, Math.min(1, ratio)) * plotH;
    const bx = plotX + idx * colW + colW * 0.22;
    const bw = colW * 0.56;
    const by = baselineY - barH;
    const fillColor = hexNoHash(String(row.color ?? fallbackColor));
    slide.addShape(PptxGenJS.ShapeType.rect, {
      x: bx,
      y: by,
      w: bw,
      h: barH,
      fill: { color: fillColor },
      line: { color: fillColor, pt: 0 },
    });
    slide.addText(String(Math.round(value)), {
      x: bx - 0.1,
      y: by - 0.16,
      w: bw + 0.2,
      h: 0.12,
      align: "center",
      fontSize: 8,
      bold: true,
      color: "0F172A",
    });
    slide.addText(String(row[chart.categoryKey] ?? ""), {
      x: bx - 0.2,
      y: baselineY + 0.05,
      w: bw + 0.4,
      h: 0.28,
      align: "center",
      fontSize: 8,
      color: "334155",
    });
  });
}

function drawTable(slide: PptxGenJS.Slide, columns: string[], rows: Array<Array<string | number>>): void {
  const tableRows: Array<Array<string | { text: string; options: { bold?: boolean } }>> = [
    columns.map((c) => ({ text: c, options: { bold: true } })),
    ...rows.map((r) => r.map((c) => String(c))),
  ];
  slide.addTable(tableRows, {
    x: 0.48,
    y: 1.4,
    w: 12.35,
    h: 5.7,
    fontSize: 11,
    border: { type: "solid", pt: 1, color: "CBD5E1" },
    fill: "FCFCFC",
    color: "0F172A",
    margin: 4,
  });
}

function renderSlide(slide: PptxGenJS.Slide, slideSpec: Presentation19SlideSpec, spec: Presentation19ExportSpec): void {
  const { deckData } = spec;
  drawFrame(slide, deckData.primaryColor);
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
      slide.addShape(PptxGenJS.ShapeType.roundRect, {
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
      drawTitle(slide, "CAPA DE SEGMENTO", deckData.primaryColor);
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
      drawTitle(slide, "TABELA DE PRESENÇA", deckData.primaryColor);
      drawTable(slide, slideSpec.table.columns, slideSpec.table.rows);
      break;
    case "presence-chart":
      drawTitle(slide, "GRÁFICO DE PRESENÇA", deckData.primaryColor);
      addSimpleChart(slide, slideSpec.chart, { x: 0.55, y: 1.45, w: 12.2, h: 5.8 });
      break;
    case "section-levels":
      drawTitle(slide, "NÍVEIS DE APRENDIZAGEM", deckData.primaryColor);
      slide.addText("Distribuição de alunos por nível e série", { x: 0.8, y: 4.1, w: 11.7, h: 0.6, align: "center", fontSize: 18, color: "52525B" });
      break;
    case "levels-guide":
      drawTitle(slide, "GUIA DE NÍVEIS", deckData.primaryColor);
      spec.deckData.levelGuide.forEach((lvl, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const x = 0.55 + col * 6.15;
        const y = 1.5 + row * 2.8;
        slide.addShape(PptxGenJS.ShapeType.roundRect, {
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
      drawTitle(slide, "GRÁFICO DE NÍVEIS", deckData.primaryColor);
      addSingleSeriesColoredBars(slide, slideSpec.chart, { x: 0.55, y: 1.45, w: 12.2, h: 5.8 });
      break;
    case "levels-table":
      drawTitle(slide, "TABELA DE NÍVEIS", deckData.primaryColor);
      drawTable(slide, slideSpec.table.columns, slideSpec.table.rows);
      break;
    case "section-proficiency":
      drawTitle(slide, "PROFICIÊNCIAS", deckData.primaryColor);
      slide.addText("Proficiência geral e por disciplina", { x: 0.8, y: 4.1, w: 11.7, h: 0.6, align: "center", fontSize: 18, color: "52525B" });
      break;
    case "proficiency-general-chart":
      drawTitle(slide, "PROFICIÊNCIA GERAL POR TURMA", deckData.primaryColor);
      addSimpleChart(slide, slideSpec.chart, { x: 0.55, y: 1.45, w: 12.2, h: 5.8 });
      break;
    case "proficiency-by-discipline-chart":
      drawTitle(slide, "PROFICIÊNCIA POR DISCIPLINA POR TURMA", deckData.primaryColor);
      slideSpec.charts.forEach((entry, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const boxX = 0.55 + col * 6.15;
        const boxY = 1.4 + row * 2.95;
        slide.addShape(PptxGenJS.ShapeType.roundRect, {
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
        addSimpleChart(slide, entry.chart, { x: boxX + 0.12, y: boxY + 0.35, w: 5.6, h: 2.25 });
      });
      break;
    case "projection-table":
      drawTitle(slide, "TABELA DE PROJEÇÃO", deckData.primaryColor);
      drawTable(slide, slideSpec.table.columns, slideSpec.table.rows);
      break;
    case "section-questions":
      drawTitle(slide, "QUESTÕES", deckData.primaryColor);
      slide.addText("Análise por habilidade e percentual de acerto", { x: 0.8, y: 4.1, w: 11.7, h: 0.6, align: "center", fontSize: 18, color: "52525B" });
      break;
    case "dynamic-series-cover":
      slide.addText(`[${deckData.serieNomeCapas}]`, { x: 0.8, y: 3.3, w: 11.7, h: 0.8, fontSize: 42, bold: true, color: hexNoHash(deckData.primaryColor), align: "center" });
      break;
    case "dynamic-class-cover":
      slide.addText(`[${deckData.turmaNomeCapas}]`, { x: 0.8, y: 3.3, w: 11.7, h: 0.8, fontSize: 42, bold: true, color: hexNoHash(deckData.primaryColor), align: "center" });
      break;
    case "questions-table":
      drawTitle(slide, "TABELA DE QUESTÕES", deckData.primaryColor);
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
    renderSlide(slide, specSlide, args.spec);
  });
  await pptx.writeFile({ fileName: args.fileName });
}
