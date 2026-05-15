import { jsPDF } from "jspdf";

type AtaOptions = {
  dateDay: string;
  dateMonth: string;
  dateYear: string;
  startHour: string;
  startMinute: string;
  endHour: string;
  endMinute: string;
  didNotOccurReason: string;
  occurrenceA: boolean;
  occurrenceB: boolean;
  occurrenceC: boolean;
  occurrenceD: boolean;
  occurrenceE: boolean;
  occurrenceDetail5: string;
  noOccurrences: boolean;
  occurrenceDetail6: string;
  q7Responded: string;
  q8NotResponded: string;
  q9Tablets: string;
  q10SpecialStayed: string;
  q11SpecialRegularRoom: string;
  q12SpecialSupportRoom: string;
  assinaturaAplicador: string;
  cpfAplicador: string;
  assinaturaApoioRegular: string;
  cpfApoioRegular: string;
  assinaturaApoioSuporte: string;
  cpfApoioSuporte: string;
};

export type AtaSalaPdfData = {
  nomeAvaliacao: string;
  cursoLabel: string;
  municipioUf: string;
  rede: string;
  escola: string;
  serieTurma: string;
  turno: string;
  disciplina: string;
  options: AtaOptions;
};

const C = {
  bg: [236, 236, 236] as [number, number, number],
  text: [28, 28, 28] as [number, number, number],
  pink: [223, 31, 166] as [number, number, number],
};

const M = 14;
const PINK_LW = 0.2;

function drawText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  size = 8,
  style: "normal" | "bold" | "italic" = "normal",
  align: "left" | "center" | "right" = "left"
): void {
  doc.setFont("helvetica", style);
  doc.setFontSize(size);
  doc.setTextColor(...C.text);
  doc.text(text, x, y, { align });
}

function drawPinkRect(doc: jsPDF, x: number, y: number, w: number, h: number): void {
  doc.setDrawColor(...C.pink);
  doc.setLineWidth(PINK_LW);
  doc.rect(x, y, w, h);
}

function drawLinedBox(doc: jsPDF, x: number, y: number, w: number, h: number, lineGap = 10): void {
  drawPinkRect(doc, x, y, w, h);
  doc.setDrawColor(...C.pink);
  for (let ly = y + lineGap; ly < y + h; ly += lineGap) {
    doc.line(x, ly, x + w, ly);
  }
}

function drawCodeBoxes(doc: jsPDF, x: number, y: number, values: string[], boxW = 6, boxH = 7): void {
  values.forEach((v, i) => {
    const bx = x + i * boxW;
    drawPinkRect(doc, bx, y, boxW, boxH);
    drawText(doc, v, bx + boxW / 2 - 1.5, y + 4.8, 8, "bold");
  });
}

function splitToLines(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text || "", maxWidth) as string[];
}

function fitSingleLine(
  doc: jsPDF,
  text: string,
  maxWidth: number,
  size = 8,
  style: "normal" | "bold" | "italic" = "normal"
): string {
  doc.setFont("helvetica", style);
  doc.setFontSize(size);
  const raw = String(text || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  if (doc.getTextWidth(raw) <= maxWidth) return raw;
  const ellipsis = "...";
  let end = raw.length;
  while (end > 0) {
    const candidate = raw.slice(0, end).trimEnd() + ellipsis;
    if (doc.getTextWidth(candidate) <= maxWidth) return candidate;
    end -= 1;
  }
  return ellipsis;
}

function drawWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineH = 4.2,
  size = 8,
  style: "normal" | "bold" | "italic" = "normal"
): number {
  drawText(doc, "", 0, 0, size, style);
  const lines = splitToLines(doc, text, maxWidth);
  lines.forEach((line, i) => drawText(doc, line, x, y + i * lineH, size, style));
  return y + lines.length * lineH;
}

function drawHeader(doc: jsPDF, data: AtaSalaPdfData): number {
  const pageW = doc.internal.pageSize.getWidth();
  const contentW = pageW - 2 * M;
  let y = M;
  drawText(
    doc,
    fitSingleLine(doc, data.nomeAvaliacao || "NOME DA AVALIAÇÃO", contentW - 4, 10, "bold"),
    pageW / 2,
    y,
    10,
    "bold",
    "center"
  );
  y += 7;
  drawText(
    doc,
    fitSingleLine(doc, `ATA DE SALA - ${data.cursoLabel || "CURSO (ANOS INICIAIS OU FINAIS)"}`, contentW - 4, 8.2),
    M,
    y,
    8.2,
    "normal"
  );
  y += 5;

  drawPinkRect(doc, M, y, contentW, 28);
  drawText(
    doc,
    fitSingleLine(doc, `MUNICÍPIO/UF: ${data.municipioUf || "—"}`, contentW - 58, 8),
    M + 2,
    y + 5,
    8
  );
  drawText(
    doc,
    fitSingleLine(doc, `REDE: ${data.rede || "MUNICIPAL"}`, 54, 8),
    M + contentW - 2,
    y + 5,
    8,
    "normal",
    "right"
  );
  drawText(doc, fitSingleLine(doc, data.escola || "ESCOLA MUNICIPAL", contentW - 4, 8), M + 2, y + 12, 8);
  drawText(
    doc,
    fitSingleLine(doc, `SÉRIE/TURMA: ${data.serieTurma || "—"}`, contentW - 58, 8),
    M + 2,
    y + 19,
    8
  );
  drawText(
    doc,
    fitSingleLine(doc, `TURNO: ${data.turno || "—"}`, 54, 8),
    M + contentW - 2,
    y + 19,
    8,
    "normal",
    "right"
  );
  drawText(doc, fitSingleLine(doc, `DISCIPLINA: ${data.disciplina || "—"}`, contentW - 4, 8), M + 2, y + 26, 8);
  return y + 34;
}

function drawOccurrenceOptions(doc: jsPDF, x: number, y: number, opts: AtaOptions): number {
  const rows = [
    { key: "occurrenceA", code: "A", label: "Turma indisciplinada, inquieta." },
    { key: "occurrenceB", code: "B", label: "Barulho externo." },
    { key: "occurrenceC", code: "C", label: "Estudantes desmotivados." },
    { key: "occurrenceD", code: "D", label: "Recusa à realização do(s) teste(s)." },
    { key: "occurrenceE", code: "E", label: "Outro." },
  ] as const;

  const col1X = x + 2;
  const col2X = x + 74;
  const col3X = x + 142;

  const drawOne = (baseX: number, baseY: number, code: string, label: string, checked: boolean, maxLabelW: number) => {
    drawPinkRect(doc, baseX, baseY - 3, 4, 4);
    if (checked) drawText(doc, "X", baseX + 1.1, baseY + 0.2, 8, "bold");
    drawText(doc, code, baseX + 1.1, baseY + 5.2, 7, "bold");
    drawText(doc, fitSingleLine(doc, label, maxLabelW, 7.1), baseX + 6, baseY + 1.1, 7.1);
  };

  drawOne(col1X, y, rows[0].code, rows[0].label, opts.occurrenceA, 62);
  drawOne(col1X, y + 8, rows[1].code, rows[1].label, opts.occurrenceB, 62);
  drawOne(col2X, y, rows[2].code, rows[2].label, opts.occurrenceC, 62);
  drawOne(col2X, y + 8, rows[3].code, rows[3].label, opts.occurrenceD, 62);
  drawOne(col3X, y + 4, rows[4].code, rows[4].label, opts.occurrenceE, 38);
  return y + 16;
}

function fillTextLines(doc: jsPDF, text: string, x: number, y: number, w: number, h: number): void {
  const lines = splitToLines(doc, text || "", w - 3);
  const maxLines = Math.floor((h - 2) / 4.5);
  lines.slice(0, maxLines).forEach((line, i) => drawText(doc, line, x + 1.5, y + 4 + i * 4.5, 7.2));
}

function drawPage1(doc: jsPDF, data: AtaSalaPdfData): void {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - 2 * M;
  const rightX = M + contentW;
  doc.setFillColor(...C.bg);
  doc.rect(0, 0, pageW, pageH, "F");

  let y = drawHeader(doc, data);
  y = drawWrappedText(
    doc,
    "Prezado(a) Aplicador(a), registre nesta ata as ocorrências referentes à aplicação e preencha obrigatoriamente todos os campos com as informações solicitadas.",
    M,
    y,
    pageW - 2 * M,
    4.2,
    8,
    "italic"
  );
  y += 4;

  drawPinkRect(doc, M, y, contentW, 16);
  drawText(doc, "1. Data do 1º dia de aplicação.", M + 2, y + 5, 7.4);
  const dateBoxW = 4.6;
  const dateFieldW = dateBoxW * 8 + 2 * 3.6;
  const dateX = rightX - dateFieldW - 2;
  drawCodeBoxes(doc, dateX, y + 2, [data.options.dateDay[0] || "", data.options.dateDay[1] || ""], dateBoxW, 7);
  drawText(doc, "/", dateX + dateBoxW * 2 + 1.2, y + 7, 9, "bold");
  drawCodeBoxes(doc, dateX + dateBoxW * 2 + 3.2, y + 2, [data.options.dateMonth[0] || "", data.options.dateMonth[1] || ""], dateBoxW, 7);
  drawText(doc, "/", dateX + dateBoxW * 4 + 4.4, y + 7, 9, "bold");
  drawCodeBoxes(doc, dateX + dateBoxW * 4 + 6.4, y + 2, [
    data.options.dateYear[0] || "",
    data.options.dateYear[1] || "",
    data.options.dateYear[2] || "",
    data.options.dateYear[3] || "",
  ], dateBoxW, 7);
  y += 16;

  drawPinkRect(doc, M, y, contentW, 12);
  const timeBoxW = 4.6;
  const hmFieldW = timeBoxW * 4 + 2.2;
  const q3FieldX = rightX - hmFieldW - 2;
  const q3TextX = q3FieldX - 56;
  const q2FieldX = q3TextX - hmFieldW - 16;

  drawText(doc, "2. Início do 1º dia de aplicação.", M + 2, y + 5, 7.0);
  drawCodeBoxes(doc, q2FieldX, y + 2, [data.options.startHour[0] || "", data.options.startHour[1] || ""], timeBoxW, 7);
  drawText(doc, ":", q2FieldX + timeBoxW * 2 + 0.9, y + 7, 9, "bold");
  drawCodeBoxes(doc, q2FieldX + timeBoxW * 2 + 2.1, y + 2, [data.options.startMinute[0] || "", data.options.startMinute[1] || ""], timeBoxW, 7);

  drawText(doc, "3. Término do 1º dia de aplicação.", q3TextX, y + 5, 7.0);
  drawCodeBoxes(doc, q3FieldX, y + 2, [data.options.endHour[0] || "", data.options.endHour[1] || ""], timeBoxW, 7);
  drawText(doc, ":", q3FieldX + timeBoxW * 2 + 0.9, y + 7, 9, "bold");
  drawCodeBoxes(doc, q3FieldX + timeBoxW * 2 + 2.1, y + 2, [data.options.endMinute[0] || "", data.options.endMinute[1] || ""], timeBoxW, 7);
  y += 12;

  drawLinedBox(doc, M, y, contentW, 35, 9.4);
  drawText(doc, "4. Caso a aplicação do(s) teste(s) NÃO tenha ocorrido, informe o motivo no campo abaixo.", M + 2, y + 5, 7.2);
  fillTextLines(doc, data.options.didNotOccurReason, M, y + 6, contentW, 29);
  y += 39;

  drawPinkRect(doc, M, y, contentW, 22);
  drawText(
    doc,
    "5. Indique as ocorrências que incomodaram, mas não impediram a aplicação do(s) teste(s). Detalhe as ocorrências no campo 4.",
    M + 2,
    y + 5,
    7.2
  );
  drawOccurrenceOptions(doc, M, y + 10, data.options);
  if (data.options.occurrenceDetail5?.trim()) {
    drawText(doc, `Detalhes: ${data.options.occurrenceDetail5.trim()}`, M + 2, y + 20, 7.1, "italic");
  }
  y += 22;

  drawLinedBox(doc, M, y, contentW, 40, 9);
  drawText(
    doc,
    "6. Registre neste campo, de forma clara e objetiva, todas as ocorrências que interferiram, mas não impediram a realização da aplicação.",
    M + 2,
    y + 5,
    7.2
  );
  drawPinkRect(doc, M + 2, y + 9, 4, 4);
  if (data.options.noOccurrences) drawText(doc, "X", M + 3.1, y + 12.3, 8, "bold");
  drawText(doc, "Não houve ocorrências.", M + 8, y + 12.3, 7.2);
  fillTextLines(doc, data.options.occurrenceDetail6, M, y + 13, contentW, 25);
}

/** Itens 7–12: duas caixas no modelo oficial (valores 0–99). */
const Q712_MAX_BOXES = 2;
const Q712_BOX_W = 6;

function drawValueLineItem(doc: jsPDF, number: string, text: string, y: number, value: string): number {
  const pageW = doc.internal.pageSize.getWidth();
  const contentW = pageW - 2 * M;
  drawPinkRect(doc, M, y, contentW, 12);
  const digits = String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, Q712_MAX_BOXES);
  const padded = digits.padStart(Q712_MAX_BOXES, " ");
  const boxes = padded.split("").map((ch) => (ch === " " ? "" : ch));
  const boxesTotalW = Q712_MAX_BOXES * Q712_BOX_W;
  const labelMaxW = Math.max(40, contentW - boxesTotalW - 6);
  const labelText = fitSingleLine(doc, `${number}. ${text}`, labelMaxW, 7.2);
  drawText(doc, labelText, M + 2, y + 5, 7.2);
  drawCodeBoxes(doc, M + contentW - 2 - boxesTotalW, y + 2.2, boxes, Q712_BOX_W, 7);
  return y + 12;
}

function drawSignatureBlock(
  doc: jsPDF,
  y: number,
  leftLabel: string,
  leftValue: string,
  rightLabel: string,
  rightValue: string
): number {
  const pageW = doc.internal.pageSize.getWidth();
  const contentW = pageW - 2 * M;
  const gap = 12;
  const leftW = 80;
  const rightW = contentW - leftW - gap;
  const rightX = M + leftW + gap;
  drawText(doc, leftLabel, M, y, 7.8);
  drawText(doc, rightLabel, rightX, y, 7.8);
  drawLinedBox(doc, M, y + 2, leftW, 18, 6);
  fillTextLines(doc, leftValue, M, y + 2, leftW, 18);
  drawLinedBox(doc, rightX, y + 2, rightW, 18, 6);
  const cpf = rightValue.replace(/\D/g, "").slice(0, 11).padEnd(11, " ");
  drawCodeBoxes(doc, rightX + 2, y + 4, cpf.split(""), 6.7, 7);
  return y + 27;
}

function drawPage2(doc: jsPDF, data: AtaSalaPdfData): void {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  doc.addPage();
  doc.setFillColor(...C.bg);
  doc.rect(0, 0, pageW, pageH, "F");

  let y = M + 6;
  y = drawValueLineItem(doc, "7", "Quantidade de estudantes presentes que responderam ao teste.", y, data.options.q7Responded);
  y = drawValueLineItem(doc, "8", "Quantidade de estudantes presentes que NÃO responderam ao teste.", y, data.options.q8NotResponded);
  y = drawValueLineItem(doc, "9", "Quantidade de tabletes que foram utilizados nesta sala.", y, data.options.q9Tablets);
  y = drawValueLineItem(
    doc,
    "10",
    "Quantidade de estudantes com necessidades específicas que permaneceram na sala.",
    y,
    data.options.q10SpecialStayed
  );
  y = drawValueLineItem(
    doc,
    "11",
    "Quantidade de estudantes com necessidades específicas direcionados para sala extra com Prova Regular.",
    y,
    data.options.q11SpecialRegularRoom
  );
  y = drawValueLineItem(
    doc,
    "12",
    "Quantidade de estudantes com necessidades específicas direcionados para sala extra com Prova de Suporte.",
    y,
    data.options.q12SpecialSupportRoom
  );
  y += 12;

  y = drawSignatureBlock(
    doc,
    y,
    "ASSINATURA DO(A) APLICADOR(A)",
    data.options.assinaturaAplicador,
    "CPF DO(A) APLICADOR(A)",
    data.options.cpfAplicador
  );
  y += 5;

  y = drawSignatureBlock(
    doc,
    y,
    "ASSINATURA DO(A) APOIO PROVA REGULAR",
    data.options.assinaturaApoioRegular,
    "CPF DO(A) APOIO REGULAR",
    data.options.cpfApoioRegular
  );
  y += 5;

  drawSignatureBlock(
    doc,
    y,
    "ASSINATURA DO(A) APOIO PROVA SUPORTE",
    data.options.assinaturaApoioSuporte,
    "CPF DO(A) APOIO SUPORTE",
    data.options.cpfApoioSuporte
  );
}

export function createAtaSalaPdfDoc(data: AtaSalaPdfData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  drawPage1(doc, data);
  drawPage2(doc, data);
  return doc;
}

export function downloadAtaSalaPdf(data: AtaSalaPdfData, fileName = "ata-de-sala.pdf"): void {
  const doc = createAtaSalaPdfDoc(data);
  doc.save(fileName);
}

export function printAtaSalaPdf(data: AtaSalaPdfData): void {
  const doc = createAtaSalaPdfDoc(data);
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (!win) return;
  win.addEventListener("load", () => {
    win.focus();
    win.print();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  });
}

export function previewAtaSalaPdf(data: AtaSalaPdfData): void {
  const doc = createAtaSalaPdfDoc(data);
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (!win) return;
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
