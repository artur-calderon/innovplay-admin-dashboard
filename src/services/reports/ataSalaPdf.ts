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

/** Mesmo modelo visual da lista de frequência (marcador em círculo). */
const MARK_PINK: [number, number, number] = [236, 72, 153];
const MARK_GRAY: [number, number, number] = [180, 180, 180];
const MARK_RADIUS_MM = 2;

const M = 14;
const PINK_LW = 0.2;

function drawText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  size = 8,
  style: "normal" | "bold" | "italic" = "normal",
  align: "left" | "center" | "right" = "left",
  baseline: "alphabetic" | "middle" | "top" | "bottom" = "alphabetic"
): void {
  doc.setFont("helvetica", style);
  doc.setFontSize(size);
  doc.setTextColor(...C.text);
  doc.text(text, x, y, { align, baseline });
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

/** Dígito centralizado na caixa (eixo X/Y ao centro da célula). */
function drawCodeBoxes(doc: jsPDF, x: number, y: number, values: string[], boxW = 6, boxH = 7): void {
  values.forEach((v, i) => {
    const bx = x + i * boxW;
    drawPinkRect(doc, bx, y, boxW, boxH);
    const ch = (v || "").trim().slice(0, 1);
    if (!ch) return;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...C.text);
    doc.text(ch, bx + boxW / 2, y + boxH / 2, { align: "center", baseline: "middle" });
  });
}

/** Marcação tipo lista de frequência: círculo preenchido (marcado) ou só contorno (vazio). */
function drawMarkCircle(doc: jsPDF, cx: number, cy: number, checked: boolean): void {
  const r = MARK_RADIUS_MM;
  if (checked) {
    doc.setFillColor(...MARK_PINK);
    doc.circle(cx, cy, r, "F");
    doc.setDrawColor(...MARK_PINK);
    doc.setLineWidth(0.15);
    doc.circle(cx, cy, r, "S");
  } else {
    doc.setDrawColor(...MARK_GRAY);
    doc.setLineWidth(0.15);
    doc.circle(cx, cy, r, "S");
  }
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

/**
 * Opções do item 5: círculo como na lista de frequência + rótulo na mesma linha (A) texto…).
 * Retorna a coordenada Y imediatamente abaixo da área desenhada.
 */
function drawOccurrenceOptions(doc: jsPDF, x: number, y: number, contentInnerW: number, opts: AtaOptions): number {
  const rows = [
    { key: "occurrenceA" as const, code: "A", label: "Turma indisciplinada, inquieta." },
    { key: "occurrenceB" as const, code: "B", label: "Barulho externo." },
    { key: "occurrenceC" as const, code: "C", label: "Estudantes desmotivados." },
    { key: "occurrenceD" as const, code: "D", label: "Recusa à realização do(s) teste(s)." },
    { key: "occurrenceE" as const, code: "E", label: "Outro." },
  ];

  const pad = 2;
  const colGap = 4;
  const usableW = Math.max(40, contentInnerW - 2 * pad);
  const colW = (usableW - 2 * colGap) / 3;
  const rowH = 6.5;
  const circleInset = MARK_RADIUS_MM + 1.2;
  const textXOffset = circleInset + MARK_RADIUS_MM + 1.5;

  const drawOne = (col: number, row: number, code: string, label: string, checked: boolean) => {
    const colX = x + pad + col * (colW + colGap);
    const rowY = y + row * rowH;
    const cx = colX + circleInset;
    const cy = rowY + rowH / 2;
    drawMarkCircle(doc, cx, cy, checked);
    const labelText = fitSingleLine(doc, `${code}) ${label}`, colW - textXOffset - 1, 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...C.text);
    doc.text(labelText, colX + textXOffset, cy, { align: "left", baseline: "middle" });
  };

  // Colunas 0,1,2 — linhas 0 e 1; E ocupa coluna 2 linha 0 (como formulário em 3 colunas)
  drawOne(0, 0, rows[0].code, rows[0].label, opts.occurrenceA);
  drawOne(1, 0, rows[2].code, rows[2].label, opts.occurrenceC);
  drawOne(2, 0, rows[4].code, rows[4].label, opts.occurrenceE);
  drawOne(0, 1, rows[1].code, rows[1].label, opts.occurrenceB);
  drawOne(1, 1, rows[3].code, rows[3].label, opts.occurrenceD);

  return y + rowH * 2 + 1;
}

/**
 * Texto multilinha em área retangular **sem** linhas timbradas (espaço único para escrita).
 * `bodyStartY` é o baseline da primeira linha do conteúdo.
 */
function fillTextInOpenBox(
  doc: jsPDF,
  text: string,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  padX: number,
  bodyStartY: number,
  lineStep = 4.2,
  fontSize = 7.2
): void {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);
  doc.setTextColor(...C.text);
  const innerW = Math.max(8, boxW - 2 * padX);
  const lines = splitToLines(doc, text || "", innerW) as string[];
  let baseline = bodyStartY;
  const maxBaseline = boxY + boxH - padX;
  for (const line of lines) {
    if (baseline > maxBaseline) break;
    doc.text(line, boxX + padX, baseline, { align: "left", baseline: "alphabetic" });
    baseline += lineStep;
  }
}

/**
 * Texto em área pautada (assinaturas): linhas internas + alinhamento ao `lineGap`.
 * @param contentStartOffset soma ao primeiro baseline quando há cabeçalho acima do texto.
 */
function fillTextLines(
  doc: jsPDF,
  text: string,
  x: number,
  yBoxTop: number,
  w: number,
  h: number,
  lineGap: number,
  padX = 2,
  contentStartOffset = 0
): void {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  const innerW = Math.max(10, w - 2 * padX);
  const lines = splitToLines(doc, text || "", innerW) as string[];
  const firstLineY = yBoxTop + lineGap + 3.2 + contentStartOffset;
  const maxBottom = yBoxTop + h - 2;
  let baseline = firstLineY;
  for (let i = 0; i < lines.length; i += 1) {
    if (baseline > maxBottom) break;
    drawText(doc, lines[i], x + padX, baseline, 7.2, "normal", "left", "alphabetic");
    baseline += lineGap;
  }
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
  drawText(doc, "/", dateX + dateBoxW * 2 + 1.2, y + 5.5, 9, "bold", "center", "middle");
  drawCodeBoxes(doc, dateX + dateBoxW * 2 + 3.2, y + 2, [data.options.dateMonth[0] || "", data.options.dateMonth[1] || ""], dateBoxW, 7);
  drawText(doc, "/", dateX + dateBoxW * 4 + 4.4, y + 5.5, 9, "bold", "center", "middle");
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
  drawText(doc, ":", q2FieldX + timeBoxW * 2 + 0.9, y + 5.5, 9, "bold", "center", "middle");
  drawCodeBoxes(doc, q2FieldX + timeBoxW * 2 + 2.1, y + 2, [data.options.startMinute[0] || "", data.options.startMinute[1] || ""], timeBoxW, 7);

  drawText(doc, "3. Término do 1º dia de aplicação.", q3TextX, y + 5, 7.0);
  drawCodeBoxes(doc, q3FieldX, y + 2, [data.options.endHour[0] || "", data.options.endHour[1] || ""], timeBoxW, 7);
  drawText(doc, ":", q3FieldX + timeBoxW * 2 + 0.9, y + 5.5, 9, "bold", "center", "middle");
  drawCodeBoxes(doc, q3FieldX + timeBoxW * 2 + 2.1, y + 2, [data.options.endMinute[0] || "", data.options.endMinute[1] || ""], timeBoxW, 7);
  y += 12;

  const Q4_BOX_H = 42;
  drawPinkRect(doc, M, y, contentW, Q4_BOX_H);
  drawText(doc, "4. Caso a aplicação do(s) teste(s) NÃO tenha ocorrido, informe o motivo no campo abaixo.", M + 2, y + 5, 7.2);
  fillTextInOpenBox(doc, data.options.didNotOccurReason, M, y, contentW, Q4_BOX_H, 2.5, y + 10, 4.2);
  y += Q4_BOX_H + 4;

  const Q5_H = 36;
  drawPinkRect(doc, M, y, contentW, Q5_H);
  drawText(
    doc,
    "5. Indique as ocorrências que incomodaram, mas não impediram a aplicação do(s) teste(s). Detalhe as ocorrências no campo 4.",
    M + 2,
    y + 5,
    7.2
  );
  drawOccurrenceOptions(doc, M, y + 10, contentW, data.options);
  if (data.options.occurrenceDetail5?.trim()) {
    const det = fitSingleLine(doc, `Detalhes: ${data.options.occurrenceDetail5.trim()}`, contentW - 4, 7.1);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.1);
    doc.setTextColor(...C.text);
    doc.text(det, M + 2, y + 29, { align: "left", baseline: "alphabetic" });
  }
  y += Q5_H;

  const Q6_BOX_H = 50;
  drawPinkRect(doc, M, y, contentW, Q6_BOX_H);
  drawText(
    doc,
    "6. Registre neste campo, de forma clara e objetiva, todas as ocorrências que interferiram, mas não impediram a realização da aplicação.",
    M + 2,
    y + 5,
    7.2
  );
  const checkCx = M + 2 + MARK_RADIUS_MM + 0.5;
  const checkCy = y + 11;
  drawMarkCircle(doc, checkCx, checkCy, data.options.noOccurrences);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(...C.text);
  doc.text("Não houve ocorrências.", M + 8, checkCy, { align: "left", baseline: "middle" });
  fillTextInOpenBox(doc, data.options.occurrenceDetail6, M, y, contentW, Q6_BOX_H, 2.5, y + 16, 4.2);
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
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(...C.text);
  doc.text(labelText, M + 2, y + 6, { align: "left", baseline: "middle" });
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
  fillTextLines(doc, leftValue, M, y + 2, leftW, 18, 6);
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
