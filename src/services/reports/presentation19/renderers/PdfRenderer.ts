import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ExportChart, Presentation19ExportSpec, Presentation19SlideSpec } from "@/types/presentation19-export-spec";

type RenderPdfArgs = {
  spec: Presentation19ExportSpec;
  fileName: string;
};

const page = { width: 1123, height: 793 };
const content = { x: 40, y: 60, w: 1043, h: 680 };

function drawFrame(doc: jsPDF, primaryColor: string): void {
  doc.setFillColor(241, 245, 249);
  doc.rect(0, 0, page.width, page.height, "F");
  doc.setDrawColor(221, 229, 237);
  doc.setLineWidth(0.2);
  for (let x = 0; x <= page.width; x += 56) {
    doc.line(x, 0, x, page.height);
  }
  doc.setDrawColor(226, 233, 240);
  for (let y = 0; y <= page.height; y += 56) {
    doc.line(0, y, page.width, y);
  }
  doc.setFillColor(primaryColor);
  doc.rect(0, 0, page.width, 10, "F");
}

function drawTitle(doc: jsPDF, title: string, y: number, primaryColor: string): void {
  const rgb = hexToRgb(primaryColor);
  doc.setFillColor(rgb.r, rgb.g, rgb.b);
  doc.roundedRect(content.x, y - 24, 12, 38, 8, 8, "F");
  doc.setTextColor(24, 24, 27);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(31);
  doc.text(title, content.x + 22, y);
}

/** Barras horizontais (categoria no eixo Y, valores crescendo para a direita). */
function drawHorizontalBarChart(doc: jsPDF, chart: ExportChart, area: { x: number; y: number; w: number; h: number }): void {
  const { x, y, w, h } = area;
  const topPad = 8;
  const bottomPad = 38;
  const leftLabelW = 122;
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
    doc.setFontSize(8);
    const text = Number.isInteger(tick) ? String(Math.round(tick)) : tick.toFixed(1);
    doc.text(text, gx, plotBottom + 14, { align: "center" });
  }

  const n = Math.max(1, chart.data.length);
  const rowH = plotH / n;
  const serie = chart.valueKeys[0];

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
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(9);
    const cat = String(row[chart.categoryKey] ?? "");
    doc.text(cat, x + 6, rowCenterY + 3, { align: "left", maxWidth: leftLabelW - 10 });
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.text(String(value), baselineX + barW + 6, rowCenterY + 4, { align: "left" });
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
  /** Linha do zero; rótulos das categorias abaixo deste nível. */
  const topPad = 6;
  const bottomPad = 34;
  const baselineY = y + h - bottomPad;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.rect(x, y, w, h, "FD");
  const categories = chart.data.map((d) => String(d[chart.categoryKey] ?? ""));
  const rawMax = Math.max(
    1,
    ...chart.data.flatMap((d) => chart.valueKeys.map((s) => Number(d[s.key] ?? 0)))
  );
  const axisMin = Number.isFinite(chart.yAxis?.min) ? Number(chart.yAxis?.min) : 0;
  const axisMax = Number.isFinite(chart.yAxis?.max) ? Number(chart.yAxis?.max) : Math.max(1, Math.ceil(rawMax * 1.15));
  const maxValue = Math.max(axisMin + 1, axisMax);
  const chartAreaH = baselineY - (y + topPad);
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
    doc.setFontSize(8);
    const text = Number.isInteger(tick) ? String(Math.round(tick)) : tick.toFixed(1);
    doc.text(text, axisLeftX - 4, gy - 2, { align: "right" });
  }
  const colWidth = barsW / Math.max(1, categories.length);
  const hasMultipleSeries = chart.valueKeys.length > 1;
  chart.data.forEach((row, idx) => {
    const baseX = barsStartX + idx * colWidth + 18;
    const innerW = Math.max(8, colWidth - 36);
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
        doc.setFontSize(8);
        doc.text(String(Math.round(value)), barX + seriesW / 2, barY - 3, { align: "center" });
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
      doc.setFontSize(9);
      doc.text(String(Math.round(total)), singleX + singleW / 2, currentTop - 3, { align: "center" });
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
      doc.setFontSize(10);
      doc.text(`${Number(value).toFixed(1)}`, singleX + singleW / 2, barY - 4, { align: "center" });
    }
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(10);
    doc.text(String(row[chart.categoryKey] ?? ""), baseX + innerW / 2, y + h - 6, { align: "center" });
  });
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

function drawSlide(doc: jsPDF, slide: Presentation19SlideSpec, spec: Presentation19ExportSpec): void {
  const { deckData } = spec;
  drawFrame(doc, deckData.primaryColor);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(24, 24, 27);
  switch (slide.kind) {
    case "cover-main":
      doc.setFont("helvetica", "bold");
      doc.setFontSize(52);
      doc.setTextColor(...Object.values(hexToRgb(deckData.primaryColor)));
      doc.text(deckData.avaliacaoNome || "N/A", content.x, 180, { maxWidth: content.w - 20 });
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(content.x, 470, content.w, 150, 14, 14, "F");
      doc.setTextColor(82, 82, 91);
      doc.setFontSize(14);
      doc.text("MUNICÍPIO", content.x + 24, 510);
      doc.setTextColor(24, 24, 27);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(30);
      doc.text(deckData.municipioNome || "N/A", content.x + 24, 545);
      doc.setTextColor(82, 82, 91);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(14);
      doc.text("SÉRIE", content.x + 24, 580);
      doc.setTextColor(24, 24, 27);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(30);
      doc.text(deckData.serie || "N/A", content.x + 24, 615);
      break;
    case "cover-school":
      doc.setFont("helvetica", "bold");
      doc.setFontSize(44);
      doc.text(deckData.escolasParticipantes[0] || "N/A", page.width / 2, page.height / 2, { align: "center" });
      break;
    case "metric-total-students":
      doc.setFont("helvetica", "bold");
      doc.setFontSize(30);
      doc.text("MÉTRICA GERAL", page.width / 2, 280, { align: "center" });
      doc.setTextColor(...Object.values(hexToRgb(deckData.primaryColor)));
      doc.setFontSize(78);
      doc.text(Math.round(deckData.totalAlunosParticiparam).toLocaleString("pt-BR"), page.width / 2, 380, { align: "center" });
      doc.setTextColor(24, 24, 27);
      doc.setFontSize(30);
      doc.text("Alunos que realizaram a avaliação", page.width / 2, 440, { align: "center" });
      break;
    case "cover-segment":
      drawTitle(doc, "CAPA DE SEGMENTO", 100, deckData.primaryColor);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(content.x, 160, content.w, 440, 14, 14, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(82, 82, 91);
      doc.text("CURSO", content.x + 24, 210);
      doc.setFontSize(34);
      doc.setTextColor(24, 24, 27);
      doc.text(deckData.curso, content.x + 24, 255);
      doc.setTextColor(82, 82, 91);
      doc.setFontSize(14);
      doc.text("SÉRIE", content.x + 24, 340);
      doc.setTextColor(24, 24, 27);
      doc.setFontSize(34);
      doc.text(deckData.serie, content.x + 24, 385);
      doc.setTextColor(82, 82, 91);
      doc.setFontSize(14);
      doc.text("TURMA", content.x + 24, 470);
      doc.setTextColor(24, 24, 27);
      doc.setFontSize(34);
      doc.text(deckData.turma, content.x + 24, 515);
      break;
    case "presence-table":
    case "levels-table":
    case "projection-table":
    case "questions-table":
      drawTitle(
        doc,
        slide.kind === "presence-table"
          ? "TABELA DE PRESENÇA"
          : slide.kind === "levels-table"
            ? "TABELA DE NÍVEIS"
            : slide.kind === "projection-table"
              ? "TABELA DE PROJEÇÃO"
              : "TABELA DE QUESTÕES",
        100,
        deckData.primaryColor
      );
      autoTable(doc, {
        startY: 140,
        margin: { left: content.x, right: content.x },
        head: [slide.table.columns],
        body: slide.table.rows,
        styles: { fontSize: 12, lineColor: [203, 213, 225], lineWidth: 1, cellPadding: 6, fillColor: [252, 252, 253], textColor: [15, 23, 42] },
        headStyles: { fillColor: [226, 232, 240], textColor: [51, 65, 85], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [241, 245, 249] },
      });
      break;
    case "presence-chart":
      drawTitle(doc, "GRÁFICO DE PRESENÇA", 100, deckData.primaryColor);
      drawBarChart(doc, slide.chart, { x: content.x, y: 150, w: content.w, h: 470 });
      break;
    case "section-levels":
      drawTitle(doc, "NÍVEIS DE APRENDIZAGEM", page.height / 2, deckData.primaryColor);
      break;
    case "levels-guide":
      drawTitle(doc, "GUIA DE NÍVEIS", 100, deckData.primaryColor);
      slide14Guide(doc, spec);
      break;
    case "levels-chart":
      drawTitle(doc, "GRÁFICO DE NÍVEIS", 100, deckData.primaryColor);
      drawBarChart(doc, slide.chart, { x: content.x, y: 150, w: content.w, h: 470 });
      break;
    case "section-proficiency":
      drawTitle(doc, "PROFICIÊNCIAS", page.height / 2, deckData.primaryColor);
      break;
    case "proficiency-general-chart":
      drawTitle(doc, "PROFICIÊNCIA GERAL POR TURMA", 100, deckData.primaryColor);
      drawBarChart(doc, slide.chart, { x: content.x, y: 150, w: content.w, h: 470 });
      break;
    case "proficiency-by-discipline-chart":
      drawTitle(doc, "PROFICIÊNCIA POR DISCIPLINA POR TURMA", 100, deckData.primaryColor);
      slide.charts.forEach((entry, idx) => {
        const row = Math.floor(idx / 2);
        const col = idx % 2;
        const boxX = content.x + col * (content.w / 2) + 8;
        const boxY = 140 + row * 250;
        const boxW = content.w / 2 - 16;
        const boxH = 220;
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(212, 212, 216);
        doc.roundedRect(boxX, boxY, boxW, boxH, 10, 10, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(entry.title, boxX + 8, boxY + 16);
        drawBarChart(doc, entry.chart, { x: boxX + 8, y: boxY + 22, w: boxW - 16, h: boxH - 36 });
      });
      break;
    case "section-questions":
      drawTitle(doc, "QUESTÕES", page.height / 2, deckData.primaryColor);
      break;
    case "dynamic-series-cover":
      doc.setFont("helvetica", "bold");
      doc.setFontSize(50);
      doc.setTextColor(...Object.values(hexToRgb(deckData.primaryColor)));
      doc.text(`[${deckData.serieNomeCapas}]`, page.width / 2, page.height / 2, { align: "center" });
      break;
    case "dynamic-class-cover":
      doc.setFont("helvetica", "bold");
      doc.setFontSize(50);
      doc.setTextColor(...Object.values(hexToRgb(deckData.primaryColor)));
      doc.text(`[${deckData.turmaNomeCapas}]`, page.width / 2, page.height / 2, { align: "center" });
      break;
    case "thank-you":
      doc.setFont("helvetica", "bold");
      doc.setFontSize(64);
      doc.setTextColor(...Object.values(hexToRgb(deckData.primaryColor)));
      doc.text("Obrigado!!", page.width / 2, page.height / 2, { align: "center" });
      break;
  }
}

function slide14Guide(doc: jsPDF, spec: Presentation19ExportSpec): void {
  const guide = spec.deckData.levelGuide;
  guide.forEach((lvl, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = content.x + col * (content.w / 2) + 8;
    const y = 150 + row * 250;
    const w = content.w / 2 - 16;
    const h = 220;
    doc.setDrawColor(228, 228, 231);
    doc.roundedRect(x, y, w, h, 10, 10);
    const rgb = hexToRgb(lvl.color);
    doc.setFillColor(rgb.r, rgb.g, rgb.b);
    doc.circle(x + 14, y + 18, 5, "F");
    doc.setTextColor(rgb.r, rgb.g, rgb.b);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(lvl.label, x + 26, y + 23);
    doc.setTextColor(63, 63, 70);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(lvl.description || "", x + 10, y + 44, { maxWidth: w - 20 });
  });
}

export async function renderPdfFromSlideSpec(args: RenderPdfArgs): Promise<void> {
  const { spec, fileName } = args;
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "px",
    format: [page.width, page.height],
    compress: true,
  });
  spec.slides.forEach((slide, idx) => {
    if (idx > 0) doc.addPage([page.width, page.height], "landscape");
    drawSlide(doc, slide, spec);
  });
  doc.save(fileName);
}
