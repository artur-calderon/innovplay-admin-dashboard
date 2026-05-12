/**
 * PDF do ranking (avaliações ou cartão-resposta) — capa e identidade alinhadas
 * ao padrão dos relatórios institucionais; tabela com listras, medalhas no top 3
 * e tags coloridas de proficiência (cores coerentes com Relatório Escolar).
 */
import { jsPDF } from 'jspdf';
import type { UserOptions } from 'jspdf-autotable';
import { urlToPngAsset } from '@/utils/pdfCityBranding';
import {
  normalizeProficiencyLevelLabel,
  type ReportProficiencyLabel,
} from '@/utils/report/reportTagStyles';

const C = {
  primary: [124, 62, 237] as [number, number, number],
  textDark: [31, 41, 55] as [number, number, number],
  textGray: [107, 114, 128] as [number, number, number],
  borderLight: [229, 231, 235] as [number, number, number],
  bgLight: [250, 250, 250] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

function fmtNow(): string {
  return new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function scaledSize(iw: number, ih: number, desiredW: number): { w: number; h: number } {
  if (iw <= 0 || ih <= 0) return { w: desiredW, h: desiredW * 0.3 };
  return { w: desiredW, h: (ih * desiredW) / iw };
}

function addFootersAllPages(doc: jsPDF): void {
  const total = doc.getNumberOfPages();
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(...C.textGray);
    doc.setFont('helvetica', 'normal');
    doc.setDrawColor(...C.borderLight);
    doc.setLineWidth(0.3);
    doc.line(margin, pageH - 14, pageW - margin, pageH - 14);
    doc.text('Afirme Play Soluções Educativas', margin, pageH - 9);
    doc.text(`Página ${i} de ${total}`, pageW / 2, pageH - 9, { align: 'center' });
    doc.text(fmtNow(), pageW - margin, pageH - 9, { align: 'right' });
  }
}

/** Cores da “tag” de proficiência (equivalentes visuais ao Tailwind dos relatórios). */
function proficiencyTagStyles(level: ReportProficiencyLabel): {
  fill: [number, number, number];
  text: [number, number, number];
} {
  switch (level) {
    case 'Avançado':
      return { fill: [167, 243, 208], text: [6, 78, 59] };
    case 'Adequado':
      return { fill: [209, 250, 229], text: [22, 101, 52] };
    case 'Básico':
      return { fill: [254, 249, 195], text: [113, 63, 18] };
    case 'Abaixo do Básico':
    default:
      return { fill: [254, 226, 226], text: [153, 27, 27] };
  }
}

function positionHighlight(pos: number): {
  fill: [number, number, number];
  text: [number, number, number];
} | null {
  if (pos === 1) return { fill: [254, 243, 199], text: [120, 53, 15] };
  if (pos === 2) return { fill: [229, 231, 235], text: [55, 65, 81] };
  if (pos === 3) return { fill: [255, 237, 213], text: [154, 52, 18] };
  return null;
}

function drawFiltersCard(
  doc: jsPDF,
  margin: number,
  pageW: number,
  titleY: number,
  filterLines: string[]
): number {
  const cardPad = 5;
  const innerW = pageW - 2 * margin;
  const lineGap = 4.2;
  const titleLineH = 6;
  const bodyH = filterLines.reduce((acc, line) => {
    const wrapped = doc.splitTextToSize(line, innerW - 18 - cardPad * 2) as string[];
    return acc + wrapped.length * lineGap;
  }, 0);
  const cardH = titleLineH + bodyH + cardPad * 2 + 4;
  let yTop = titleY;

  doc.setFillColor(...C.white);
  doc.rect(margin, yTop, innerW, cardH, 'F');
  doc.setFillColor(...C.primary);
  doc.rect(margin, yTop, 3.5, cardH, 'F');
  doc.setDrawColor(...C.borderLight);
  doc.setLineWidth(0.35);
  doc.rect(margin, yTop, innerW, cardH, 'S');

  let cy = yTop + cardPad + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...C.primary);
  doc.text('Filtros aplicados', margin + 10, cy);
  cy += titleLineH + 2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...C.textDark);
  for (const line of filterLines) {
    const wrapped = doc.splitTextToSize(line, innerW - 18 - cardPad * 2) as string[];
    doc.text(wrapped, margin + 10, cy);
    cy += wrapped.length * lineGap;
  }

  return yTop + cardH + 10;
}

function drawClassificationLegend(doc: jsPDF, margin: number, pageW: number, startY: number): number {
  const levels: ReportProficiencyLabel[] = ['Avançado', 'Adequado', 'Básico', 'Abaixo do Básico'];
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.textGray);
  doc.text('Classificação (níveis de aprendizagem):', margin, startY);

  let x = margin;
  const yChip = startY + 5;
  const chipH = 4.8;
  const gap = 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);

  for (const level of levels) {
    const { fill, text } = proficiencyTagStyles(level);
    const labelShort =
      level === 'Abaixo do Básico' ? 'Abaixo bás.' : level;
    const wText = doc.getTextWidth(labelShort) + 5;
    const chipW = 3 + wText;

    doc.setFillColor(...fill);
    doc.setDrawColor(...borderFromFill(fill));
    doc.setLineWidth(0.2);
    doc.rect(x, yChip, chipW, chipH, 'FD');

    doc.setTextColor(...text);
    doc.text(labelShort, x + 2.2, yChip + chipH / 2 + 1.35);

    x += chipW + gap + 4;
  }

  return yChip + chipH + 8;
}

function borderFromFill(fill: [number, number, number]): [number, number, number] {
  const [r, g, b] = fill;
  return [Math.max(0, r - 35), Math.max(0, g - 35), Math.max(0, b - 35)] as [
    number,
    number,
    number,
  ];
}

async function addRankingCoverPage(
  doc: jsPDF,
  titleBand: string,
  subtitleBand: string,
  mainTitle: string,
  mainSubtitle: string,
  cardLines: Array<{ label: string; value: string }>
): Promise<void> {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const centerX = pageW / 2;
  const BAND_H = 62;

  doc.setFillColor(...C.white);
  doc.rect(0, 0, pageW, pageH, 'F');

  doc.setFillColor(...C.primary);
  doc.rect(0, 0, pageW, BAND_H, 'F');
  doc.setFillColor(...C.white);
  doc.setLineWidth(0.15);
  doc.setDrawColor(255, 255, 255);
  doc.line(18, BAND_H - 1, pageW - 18, BAND_H - 1);

  let logoBottomInBand = 0;
  const logoAsset = await urlToPngAsset('/LOGO-1.png');
  if (logoAsset?.dataUrl && logoAsset.iw > 0 && logoAsset.ih > 0) {
    const { w, h } = scaledSize(logoAsset.iw, logoAsset.ih, 40);
    doc.addImage(logoAsset.dataUrl, 'PNG', centerX - w / 2, 8, w, h);
    logoBottomInBand = 8 + h;
  } else {
    doc.setFontSize(18);
    doc.setTextColor(...C.white);
    doc.setFont('helvetica', 'bold');
    doc.text('AFIRME PLAY', centerX, 24, { align: 'center' });
    logoBottomInBand = 30;
  }

  const titleY = Math.max(logoBottomInBand + 6, BAND_H - 16);
  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(titleBand, centerX, titleY, { align: 'center' });
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'normal');
  const subLinesBand = doc.splitTextToSize(subtitleBand, pageW - 50) as string[];
  doc.text(subLinesBand, centerX, titleY + 7, { align: 'center' });

  let y = BAND_H + 14;
  const locLine = cardLines
    .filter((l) => l.label === 'ESTADO' || l.label === 'MUNICÍPIO')
    .map((l) => l.value)
    .filter((v) => v && v.trim() && v !== 'Todos');
  if (locLine.length) {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.primary);
    doc.text(locLine.join(' — ').toUpperCase(), centerX, y, { align: 'center' });
    y += 8;
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.textGray);
  doc.text('SECRETARIA MUNICIPAL DE EDUCAÇÃO', centerX, y, { align: 'center' });
  y += 16;

  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.textDark);
  doc.text(mainTitle, centerX, y, { align: 'center' });
  y += 14;

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.textDark);
  const subMain = doc.splitTextToSize(mainSubtitle, pageW - 50) as string[];
  doc.text(subMain, centerX, y, { align: 'center' });
  y += subMain.length * 7.5 + 20;

  const cardW = pageW - 72;
  const cardX = (pageW - cardW) / 2;
  const rowH = 7;
  let cardEstimateH = 28;
  for (const { value } of cardLines) {
    const wrapped = doc.splitTextToSize(value, cardW - 74) as string[];
    cardEstimateH += Math.max(rowH, wrapped.length * 4.8);
  }
  const cardH = Math.max(cardEstimateH, 72);

  doc.setFillColor(...C.bgLight);
  doc.rect(cardX, y, cardW, cardH, 'F');
  const ACCENT_W = 5;
  doc.setFillColor(...C.primary);
  doc.rect(cardX, y, ACCENT_W, cardH, 'F');
  doc.setDrawColor(...C.borderLight);
  doc.setLineWidth(0.45);
  doc.rect(cardX, y, cardW, cardH, 'S');

  let cy = y + 14;
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.primary);
  const cardContentCenterX = cardX + ACCENT_W + (cardW - ACCENT_W) / 2;
  doc.text('INFORMAÇÕES DO RELATÓRIO', cardContentCenterX, cy, { align: 'center' });
  cy += 7;
  doc.setDrawColor(...C.borderLight);
  doc.setLineWidth(0.25);
  doc.line(cardX + ACCENT_W + 6, cy, cardX + cardW - 6, cy);
  cy += 11;

  const labelX = cardX + ACCENT_W + 14;
  const valueX = cardX + 72;
  const maxValueW = cardW - 78;
  doc.setFontSize(8.8);
  for (const { label, value } of cardLines) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.primary);
    doc.text(`${label}:`, labelX, cy);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.textDark);
    const vLines = doc.splitTextToSize(value, maxValueW) as string[];
    doc.text(vLines, valueX, cy);
    cy += Math.max(rowH, vLines.length * 4.9);
  }
}

export type RankingPdfContext = 'avaliacoes' | 'cartao-resposta';

export type RankingPdfFilterLabels = {
  estado: string;
  municipio: string;
  escola: string;
  serie: string;
  turma: string;
};

export type RankingPdfStudentInput = {
  nome: string;
  turma?: string;
  escola?: string;
  serie?: string;
  nota: number;
  proficiencia: number;
  classificacao: string;
  status: 'concluida' | 'pendente';
  /** Posição no ranking quando a ordem vem do backend (`respectBackendRankingOrder`). */
  posicao?: number;
  questoes_respondidas?: number;
  acertos?: number;
  erros?: number;
  em_branco?: number;
};

function studentMatchesRankingList(s: RankingPdfStudentInput): boolean {
  const isCompleted = String(s.status || '').toLowerCase() === 'concluida';
  const hasAny =
    Number(s.questoes_respondidas ?? 0) > 0 ||
    Number(s.acertos ?? 0) > 0 ||
    Number(s.erros ?? 0) > 0 ||
    Number(s.em_branco ?? 0) > 0;
  return isCompleted && hasAny;
}

export type RankingPdfRowBuilt = {
  pos: number;
  nome: string;
  turma: string;
  escola: string;
  serie: string;
  nota: string;
  prof: string;
  classif: string;
  level: ReportProficiencyLabel;
};

function buildSortedRankingRows(
  students: RankingPdfStudentInput[],
  maxRows: number,
  respectBackendOrder: boolean
): RankingPdfRowBuilt[] {
  if (respectBackendOrder) {
    const list = [...students].sort((a, b) => (a.posicao ?? 999999) - (b.posicao ?? 999999));
    return list.slice(0, maxRows).map((s) => ({
      pos: s.posicao ?? 0,
      nome: (s.nome || '—').trim() || '—',
      turma: (s.turma || '—').trim() || '—',
      escola: (s.escola || '').trim() || '—',
      serie: (s.serie || '').trim() || '—',
      nota: Number(s.nota ?? 0).toFixed(1),
      prof: Number(s.proficiencia ?? 0).toFixed(1),
      classif: (s.classificacao || '—').trim() || '—',
      level: normalizeProficiencyLevelLabel(s.classificacao),
    }));
  }

  const list = students.filter(studentMatchesRankingList);
  list.sort((a, b) => (b.proficiencia || 0) - (a.proficiencia || 0));
  return list.slice(0, maxRows).map((s, i) => ({
    pos: i + 1,
    nome: (s.nome || '—').trim() || '—',
    turma: (s.turma || '—').trim() || '—',
    escola: (s.escola || '').trim() || '—',
    serie: (s.serie || '').trim() || '—',
    nota: Number(s.nota ?? 0).toFixed(1),
    prof: Number(s.proficiencia ?? 0).toFixed(1),
    classif: (s.classificacao || '—').trim() || '—',
    level: normalizeProficiencyLevelLabel(s.classificacao),
  }));
}

export async function generateRankingPdf(opts: {
  context: RankingPdfContext;
  /** Título da avaliação ou do gabarito, se houver */
  escopoTitulo?: string;
  filterLabels: RankingPdfFilterLabels;
  students: RankingPdfStudentInput[];
  maxRows?: number;
  fileNameBase?: string;
  /** Avaliação online: manter ordem e posição exatamente como o backend enviou no `ranking`. */
  respectBackendRankingOrder?: boolean;
}): Promise<void> {
  const { default: autoTable } = await import('jspdf-autotable');
  const maxRows = opts.maxRows ?? 100;
  const filters = opts.filterLabels;
  const rowModels = buildSortedRankingRows(
    opts.students,
    maxRows,
    opts.respectBackendRankingOrder === true
  );

  const contextSubtitle =
    opts.context === 'avaliacoes'
      ? 'Resultados de avaliações online'
      : 'Resultados de cartão-resposta';

  const escopo = (opts.escopoTitulo ?? '').trim();

  const cardLines: Array<{ label: string; value: string }> = [];
  if (opts.context === 'avaliacoes') {
    cardLines.push({ label: 'AVALIAÇÃO', value: escopo || '—' });
  } else {
    cardLines.push({ label: 'GABARITO', value: escopo || '—' });
  }
  cardLines.push(
    { label: 'ESTADO', value: filters.estado },
    { label: 'MUNICÍPIO', value: filters.municipio },
    { label: 'ESCOLA', value: filters.escola },
    { label: 'SÉRIE', value: filters.serie },
    { label: 'TURMA', value: filters.turma }
  );

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  await addRankingCoverPage(
    pdf,
    'RANKING DE DESEMPENHO',
    'Classificação por proficiência',
    'RANKING',
    contextSubtitle,
    cardLines
  );

  pdf.addPage();
  const pageW = pdf.internal.pageSize.getWidth();
  const margin = 15;
  let y = 16;

  const filterLinesDetailed = [
    `Estado: ${filters.estado}`,
    `Município: ${filters.municipio}`,
    `Escola: ${filters.escola}`,
    `Série: ${filters.serie}`,
    `Turma: ${filters.turma}`,
  ];
  y = drawFiltersCard(pdf, margin, pageW, y, filterLinesDetailed);

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...C.primary);
  pdf.text('Ranking dos melhores', margin, y);
  y += 5;
  pdf.setFontSize(8.8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...C.textGray);
  pdf.text(`Ordenação por proficiência decrescente — até ${maxRows} posições`, margin, y);
  y += 10;

  y = drawClassificationLegend(pdf, margin, pageW, y);

  const emptyPlaceholder = rowModels.length === 0;

  const head = [['Pos.', 'Nome', 'Turma', 'Escola', 'Série', 'Nota', 'Prof.', 'Classificação']];
  const body = emptyPlaceholder
    ? [['—', 'Nenhum participante no recorte atual', '', '', '', '', '', '']]
    : rowModels.map((r) => [
        ` ${r.pos}º `,
        r.nome,
        r.turma,
        r.escola,
        r.serie,
        r.nota,
        r.prof,
        r.level,
      ]);

  const tableOptions: UserOptions = {
    head,
    body,
    startY: y,
    theme: 'striped',
    showHead: 'everyPage',
    tableWidth: pageW - 2 * margin,
    margin: { left: margin, right: margin, bottom: 18 },
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: { top: 3.5, bottom: 3.5, left: 2.5, right: 2.5 },
      lineColor: C.borderLight,
      lineWidth: 0.12,
      valign: 'middle',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: C.primary,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8.8,
      cellPadding: { top: 5, bottom: 5, left: 2.5, right: 2.5 },
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [253, 252, 254],
    },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 38, halign: 'left' },
      2: { cellWidth: 18, halign: 'left' },
      3: { cellWidth: 34, halign: 'left' },
      4: { cellWidth: 16, halign: 'left' },
      5: { cellWidth: 13, halign: 'right', fontStyle: 'bold', textColor: C.primary },
      6: { cellWidth: 14, halign: 'right', fontStyle: 'bold', textColor: C.primary },
      7: { cellWidth: 30, halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (hookData) => {
      if (emptyPlaceholder && hookData.section === 'body') {
        hookData.cell.styles.fillColor = C.bgLight;
        hookData.cell.styles.textColor = C.textGray;
        hookData.cell.styles.fontStyle = 'italic';
        return;
      }
      if (hookData.section !== 'body' || emptyPlaceholder) return;

      const i = hookData.row.index;
      if (i < 0 || i >= rowModels.length) return;
      const model = rowModels[i];
      const col = hookData.column.index;

      if (col === 0) {
        const hi = positionHighlight(model.pos);
        if (hi) {
          hookData.cell.styles.fillColor = hi.fill;
          hookData.cell.styles.textColor = hi.text;
          hookData.cell.styles.fontStyle = 'bold';
        }
      }

      if (col === 7) {
        const { fill, text } = proficiencyTagStyles(model.level);
        hookData.cell.styles.fillColor = fill;
        hookData.cell.styles.textColor = text;
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fontSize = 7.9;
      }
    },
  };

  autoTable(pdf, tableOptions);

  addFootersAllPages(pdf);

  const rawBase = (opts.fileNameBase ?? `ranking-${opts.context}`).trim();
  const safeNameBase =
    rawBase
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s\-_]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .toLowerCase() || `ranking-${opts.context}`;

  pdf.save(`${safeNameBase}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
