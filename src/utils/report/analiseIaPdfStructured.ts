/**
 * Renderização estruturada da análise IA em PDF (faixa roxa, subtítulos, tabelas autoTable),
 * alinhada ao padrão visual de `skillsHeatMapPdf` e relatório escolar.
 */

import type { jsPDF } from 'jspdf';
import {
  genericRecordToPdfParagraphs,
  getDisciplinaAnaliseFromIaRoot,
  readTrimPdf,
} from '@/utils/report/analiseIaPdfText';

export interface IaPdfPalette {
  primary: [number, number, number];
  textDark: [number, number, number];
  textGray: [number, number, number];
  borderLight: [number, number, number];
  bgLight: [number, number, number];
  white: [number, number, number];
}

export type IaStructuredBlock =
  | { kind: 'subheading'; text: string }
  | { kind: 'prose'; text: string }
  | {
      kind: 'table';
      head: string[];
      body: string[][];
      columnStyles?: Record<number, { cellWidth?: number; halign?: 'left' | 'center' | 'right'; overflow?: string }>;
    };

const HIDDEN_ROOT = new Set([
  'metadados_gerais',
  'metadados_entrada',
  'warning',
  'error',
  'document_title',
  'details',
]);

const PANORAMA_SKIP = new Set([
  'componente_curricular',
  'distribuicao_niveis',
  'distribuicao_classificacao_geral',
  'etapa_avaliada',
  'media_nota',
  'media_proficiencia',
  'niveis_proficiencia_alcancados',
]);

/** Rótulos amigáveis para chaves frequentes da API (mapa / relatório). */
const IA_FIELD_LABEL: Record<string, string> = {
  foco_analitico: 'Foco analítico',
  documento: 'Documento',
  dinamica_sala_recomposicao: 'Dinâmica de sala e recomposição',
  matriz_acao_por_habilidade: 'Matriz de ação por habilidade',
  agrupamentos_produtivos: 'Agrupamentos produtivos',
  monitoramento_e_avaliacao: 'Monitoramento e avaliação',
  rotina_pedagogica: 'Rotina pedagógica',
  estrategias_abaixo_do_basico: 'Estratégias (abaixo do básico)',
  estrategias_basico: 'Estratégias (básico)',
  codigo: 'Código',
  descricao: 'Descrição',
};

function formatKeyLabel(key: string): string {
  return key
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

function panoramaGeralProse(disc: Record<string, unknown>): string | null {
  const pg = disc.panorama_geral;
  if (typeof pg === 'string' && readTrimPdf(pg)) return readTrimPdf(pg);
  if (!pg || typeof pg !== 'object' || Array.isArray(pg)) return null;
  const o = pg as Record<string, unknown>;
  const ap = readTrimPdf(o.analise_panorama);
  if (ap) return ap;
  const parts: string[] = [];
  for (const [k, v] of Object.entries(o)) {
    if (PANORAMA_SKIP.has(k)) continue;
    if (typeof v === 'string' && readTrimPdf(v)) {
      parts.push(`${formatKeyLabel(k)}: ${readTrimPdf(v)}`);
    }
  }
  return parts.length ? parts.join('\n') : null;
}

function fieldSectionTitle(key: string): string {
  return IA_FIELD_LABEL[key] ?? formatKeyLabel(key);
}

function cellStringForPdf(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
    const s = String(v).trim();
    return s || '—';
  }
  if (Array.isArray(v)) {
    const parts = v.map((x) => cellStringForPdf(x)).filter((s) => s !== '—');
    return parts.length ? parts.join('\n') : '—';
  }
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v).slice(0, 3500);
    } catch {
      return '—';
    }
  }
  return '—';
}

/** Ordem de colunas preferida em tabelas dinâmicas (habilidades / estratégias). */
function preferredColumnOrder(keys: string[]): string[] {
  const priority = [
    'codigo',
    'habilidade_foco',
    'descricao',
    'nivel',
    'nivel_identificado',
    'quantidade_alunos',
    'analise',
    'estrategias_abaixo_do_basico',
    'estrategias_basico',
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of priority) {
    if (keys.includes(p)) {
      out.push(p);
      seen.add(p);
    }
  }
  for (const k of [...keys].sort((a, b) => a.localeCompare(b, 'pt-BR'))) {
    if (!seen.has(k)) out.push(k);
  }
  return out;
}

function dynamicObjectArrayTable(items: Record<string, unknown>[]): IaStructuredBlock | null {
  if (!items.length) return null;
  const keySet = new Set<string>();
  for (const row of items) {
    for (const k of Object.keys(row)) {
      if (row[k] != null && row[k] !== '') keySet.add(k);
    }
  }
  const keys = preferredColumnOrder([...keySet]);
  if (!keys.length) return null;
  const head = keys.map((k) => fieldSectionTitle(k));
  const body = items.map((row) => keys.map((k) => cellStringForPdf(row[k])));
  const n = keys.length;
  const baseW = Math.max(24, Math.floor(165 / Math.max(n, 1)));
  const columnStyles: Record<
    number,
    { cellWidth: number; halign: 'left'; overflow: string }
  > = {};
  let sum = 0;
  keys.forEach((_, i) => {
    const w = i === n - 1 ? Math.max(28, 165 - sum) : baseW;
    columnStyles[i] = { cellWidth: w, halign: 'left', overflow: 'linebreak' };
    sum += w;
  });
  return { kind: 'table', head, body, columnStyles };
}

/**
 * Inclui qualquer valor JSON da IA: texto, objeto (tabela ou subsecções), array (tabela dinâmica ou itens).
 */
function pushFieldBlocks(
  key: string,
  v: unknown,
  blocks: IaStructuredBlock[],
  depth: number
): void {
  if (depth > 10 || v === undefined) return;
  const title = fieldSectionTitle(key);

  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
    const s = String(v).trim();
    if (!s) return;
    blocks.push({ kind: 'subheading', text: title });
    blocks.push({ kind: 'prose', text: s });
    return;
  }

  if (Array.isArray(v)) {
    if (v.length === 0) return;
    const allPrimitive = v.every(
      (x) =>
        x == null ||
        typeof x === 'string' ||
        typeof x === 'number' ||
        typeof x === 'boolean'
    );
    if (allPrimitive) {
      blocks.push({ kind: 'subheading', text: title });
      blocks.push({
        kind: 'table',
        head: ['Item'],
        body: v.map((x) => [cellStringForPdf(x)]),
        columnStyles: { 0: { cellWidth: 165, halign: 'left', overflow: 'linebreak' } },
      });
      return;
    }
    const allObj = v.every((x) => x && typeof x === 'object' && !Array.isArray(x));
    if (allObj) {
      const tbl = dynamicObjectArrayTable(v as Record<string, unknown>[]);
      if (tbl) {
        blocks.push({ kind: 'subheading', text: title });
        blocks.push(tbl);
      }
      return;
    }
    blocks.push({ kind: 'subheading', text: title });
    blocks.push({
      kind: 'prose',
      text: v.map((x) => cellStringForPdf(x)).join('\n\n').slice(0, 12000),
    });
    return;
  }

  if (v !== null && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    const entries = Object.entries(o).filter(([, x]) => x != null && x !== '');
    if (!entries.length) return;
    const allPrimitive = entries.every(
      ([, x]) =>
        typeof x === 'string' || typeof x === 'number' || typeof x === 'boolean'
    );
    if (allPrimitive) {
      blocks.push({ kind: 'subheading', text: title });
      blocks.push({
        kind: 'table',
        head: ['Campo', 'Valor'],
        body: entries
          .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
          .map(([sk, sv]) => [fieldSectionTitle(sk), cellStringForPdf(sv)]),
        columnStyles: {
          0: { cellWidth: 52, halign: 'left', overflow: 'linebreak' },
          1: { cellWidth: 113, halign: 'left', overflow: 'linebreak' },
        },
      });
      return;
    }
    blocks.push({ kind: 'subheading', text: title });
    for (const [sk, sv] of entries.sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))) {
      pushFieldBlocks(sk, sv, blocks, depth + 1);
    }
  }
}

/** Fallback quando o payload não segue o formato escolar estruturado. */
export function buildGenericIaFallbackBlocks(rec: Record<string, unknown>): IaStructuredBlock[] {
  const paras = genericRecordToPdfParagraphs(rec, 0, [], { n: 0 });
  if (!paras.length) return [];
  return [
    { kind: 'subheading', text: 'Conteúdo adicional' },
    { kind: 'prose', text: paras.join('\n\n') },
  ];
}

/** Blocos a partir do recorte de uma disciplina (ou objeto equivalente). */
export function buildDisciplineRecordToBlocks(disc: Record<string, unknown> | null): IaStructuredBlock[] {
  const blocks: IaStructuredBlock[] = [];
  if (!disc) return blocks;

  const handledKeys = new Set<string>();

  const pan = panoramaGeralProse(disc);
  if (pan) {
    blocks.push({ kind: 'subheading', text: 'Panorama geral' });
    blocks.push({ kind: 'prose', text: pan });
    handledKeys.add('panorama_geral');
  }

  const rxH = disc.reflexao_niveis_habilidades;
  if (Array.isArray(rxH) && rxH.length > 0) {
    blocks.push({ kind: 'subheading', text: 'Reflexão por níveis e habilidades' });
    const mainRows: string[][] = [];
    for (const item of rxH) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      const it = item as Record<string, unknown>;
      const nivel = readTrimPdf(it.nivel ?? it.nivel_identificado) || '—';
      const qRaw = it.quantidade_alunos;
      const qStr =
        typeof qRaw === 'number' && Number.isFinite(qRaw) ? String(qRaw) : '—';
      const analise = readTrimPdf(
        it.analise ?? it.descricao_desempenho ?? it.significado_e_impacto
      );
      mainRows.push([nivel, qStr, analise || '—']);
    }
    if (mainRows.length) {
      blocks.push({
        kind: 'table',
        head: ['Nível', 'Alunos', 'Análise'],
        body: mainRows,
        columnStyles: {
          0: { cellWidth: 36, halign: 'left' },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 109, halign: 'left', overflow: 'linebreak' },
        },
      });
    }

    for (const item of rxH) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      const it = item as Record<string, unknown>;
      const nivelLabel = readTrimPdf(it.nivel ?? it.nivel_identificado) || 'Nível';
      const habs = it.habilidades_analisadas;
      if (Array.isArray(habs) && habs.length > 0) {
        const rows: string[][] = [];
        for (const h of habs) {
          if (!h || typeof h !== 'object') continue;
          const hh = h as Record<string, unknown>;
          rows.push([
            readTrimPdf(hh.codigo ?? hh.habilidade_foco) || '—',
            readTrimPdf(hh.descricao) || '—',
            readTrimPdf(hh.reflexao ?? hh.reflexao_pedagogica) || '—',
          ]);
        }
        if (rows.length) {
          blocks.push({ kind: 'subheading', text: `Habilidades — ${nivelLabel}` });
          blocks.push({
            kind: 'table',
            head: ['Código', 'Descrição', 'Reflexão pedagógica'],
            body: rows,
            columnStyles: {
              0: { cellWidth: 28, halign: 'left' },
              1: { cellWidth: 52, halign: 'left', overflow: 'linebreak' },
              2: { cellWidth: 85, halign: 'left', overflow: 'linebreak' },
            },
          });
        }
      }

      const ah = it.analise_habilidades;
      if (Array.isArray(ah) && ah.length > 0) {
        const rows: string[][] = [];
        for (const h of ah) {
          if (!h || typeof h !== 'object') continue;
          const hh = h as Record<string, unknown>;
          rows.push([
            readTrimPdf(hh.habilidade_foco) || '—',
            readTrimPdf(hh.reflexao_pedagogica) || '—',
          ]);
        }
        if (rows.length) {
          blocks.push({ kind: 'subheading', text: `Análise de habilidades — ${nivelLabel}` });
          blocks.push({
            kind: 'table',
            head: ['Foco', 'Reflexão pedagógica'],
            body: rows,
            columnStyles: {
              0: { cellWidth: 45, halign: 'left', overflow: 'linebreak' },
              1: { cellWidth: 120, halign: 'left', overflow: 'linebreak' },
            },
          });
        }
      }
    }
    handledKeys.add('reflexao_niveis_habilidades');
  }

  const rx = disc.reflexao_niveis;
  if (Array.isArray(rx) && rx.length > 0) {
    blocks.push({ kind: 'subheading', text: 'Reflexão por níveis' });
    const rows: string[][] = [];
    for (const item of rx) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      const it = item as Record<string, unknown>;
      const nivel = readTrimPdf(it.nivel_identificado ?? it.nivel) || '—';
      const partes: string[] = [];
      const base = readTrimPdf(it.significado_e_impacto ?? it.descricao_desempenho);
      if (base) partes.push(base);
      const habs = it.analise_habilidades;
      if (Array.isArray(habs)) {
        for (const h of habs) {
          if (!h || typeof h !== 'object') continue;
          const hh = h as Record<string, unknown>;
          const foco = readTrimPdf(hh.habilidade_foco);
          const ref = readTrimPdf(hh.reflexao_pedagogica);
          if (foco) partes.push(`• ${foco}`);
          if (ref) partes.push(`  ${ref}`);
        }
      }
      rows.push([nivel, partes.length ? partes.join('\n') : '—']);
    }
    if (rows.length) {
      blocks.push({
        kind: 'table',
        head: ['Nível', 'Significado e impacto'],
        body: rows,
        columnStyles: {
          0: { cellWidth: 38, halign: 'left' },
          1: { cellWidth: 127, halign: 'left', overflow: 'linebreak' },
        },
      });
    }
    handledKeys.add('reflexao_niveis');
  }

  const enc = disc.encaminhamentos_cultura_digital;
  if (typeof enc === 'string' && readTrimPdf(enc)) {
    blocks.push({ kind: 'subheading', text: 'Encaminhamentos (cultura digital)' });
    blocks.push({ kind: 'prose', text: readTrimPdf(enc) });
    handledKeys.add('encaminhamentos_cultura_digital');
  } else if (enc && typeof enc === 'object' && !Array.isArray(enc)) {
    const e = enc as Record<string, unknown>;
    const intv = e.intervencoes_pedagogicas;
    const recDig = e.recursos_digitais;
    const hasIntv = Array.isArray(intv) && intv.some((x) => typeof x === 'string' && readTrimPdf(x));
    const hasRec = Array.isArray(recDig) && recDig.some((x) => typeof x === 'string' && readTrimPdf(x));
    if (hasIntv || hasRec) {
      blocks.push({ kind: 'subheading', text: 'Encaminhamentos (cultura digital)' });
    }
    if (hasIntv) {
      blocks.push({ kind: 'subheading', text: 'Intervenções pedagógicas' });
      const rows = (intv as unknown[])
        .filter((x): x is string => typeof x === 'string' && !!readTrimPdf(x))
        .map((x) => [readTrimPdf(x)]);
      if (rows.length) {
        blocks.push({
          kind: 'table',
          head: ['Sugestão'],
          body: rows,
          columnStyles: { 0: { cellWidth: 165, halign: 'left', overflow: 'linebreak' } },
        });
      }
    }
    if (hasRec) {
      blocks.push({ kind: 'subheading', text: 'Recursos digitais' });
      const rows = (recDig as unknown[])
        .filter((x): x is string => typeof x === 'string' && !!readTrimPdf(x))
        .map((x) => [readTrimPdf(x)]);
      if (rows.length) {
        blocks.push({
          kind: 'table',
          head: ['Recurso'],
          body: rows,
          columnStyles: { 0: { cellWidth: 165, halign: 'left', overflow: 'linebreak' } },
        });
      }
    }
    handledKeys.add('encaminhamentos_cultura_digital');
  }

  for (const key of Object.keys(disc).sort((a, b) => a.localeCompare(b, 'pt-BR'))) {
    if (handledKeys.has(key)) continue;
    if (HIDDEN_ROOT.has(key)) continue;
    const v = disc[key];
    if (v === undefined) continue;
    pushFieldBlocks(key, v, blocks, 0);
  }

  return blocks;
}

function blocksFromMap(map: Record<string, unknown>): { disciplineBand: string | null; blocks: IaStructuredBlock[] }[] {
  const keys = Object.keys(map).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const out: { disciplineBand: string | null; blocks: IaStructuredBlock[] }[] = [];
  for (const k of keys) {
    const sub = map[k];
    if (!sub || typeof sub !== 'object' || Array.isArray(sub)) continue;
    const rec = sub as Record<string, unknown>;
    let blocks = buildDisciplineRecordToBlocks(rec);
    if (!blocks.length) blocks = buildGenericIaFallbackBlocks(rec);
    if (blocks.length) out.push({ disciplineBand: k, blocks });
  }
  return out;
}

/**
 * Segmentos com faixa de disciplina opcional (mapa geral) ou um único segmento (relatório / filtro por disciplina).
 */
export function buildStructuredIaSegmentsFromRoot(
  aiRoot: Record<string, unknown>,
  preferDisciplineNome?: string | null
): { disciplineBand: string | null; blocks: IaStructuredBlock[] }[] {
  if (preferDisciplineNome) {
    const rec = getDisciplinaAnaliseFromIaRoot(aiRoot, preferDisciplineNome);
    if (rec) {
      let blocks = buildDisciplineRecordToBlocks(rec);
      if (!blocks.length) blocks = buildGenericIaFallbackBlocks(rec);
      if (blocks.length) return [{ disciplineBand: preferDisciplineNome, blocks }];
    }
  }

  const apd = aiRoot.analises_por_disciplina;
  if (apd && typeof apd === 'object' && !Array.isArray(apd)) {
    const fromMap = blocksFromMap(apd as Record<string, unknown>);
    if (fromMap.length > 0) return fromMap;
  }

  const pd = aiRoot.por_disciplina;
  if (pd && typeof pd === 'object' && !Array.isArray(pd)) {
    const fromMap = blocksFromMap(pd as Record<string, unknown>);
    if (fromMap.length > 0) return fromMap;
  }

  let blocks = buildDisciplineRecordToBlocks(aiRoot);
  if (!blocks.length) {
    const lines: IaStructuredBlock[] = [];
    for (const [k, v] of Object.entries(aiRoot)) {
      if (HIDDEN_ROOT.has(k)) continue;
      if (typeof v === 'string' && readTrimPdf(v)) {
        lines.push({ kind: 'subheading', text: formatKeyLabel(k) });
        lines.push({ kind: 'prose', text: readTrimPdf(v) });
      }
    }
    blocks = lines.length ? lines : buildGenericIaFallbackBlocks(aiRoot);
  }
  if (!blocks.length) return [];
  return [{ disciplineBand: null, blocks }];
}

export function hasAnyStructuredIaContent(
  segments: { disciplineBand: string | null; blocks: IaStructuredBlock[] }[]
): boolean {
  return segments.some((s) => s.blocks.length > 0);
}

type DocAT = jsPDF & { lastAutoTable?: { finalY: number } };

export function drawIaDisciplineBandPdf(
  doc: jsPDF,
  y: number,
  margin: number,
  maxW: number,
  title: string,
  palette: IaPdfPalette
): number {
  doc.setFillColor(...palette.primary);
  doc.rect(margin, y - 1, maxW, 7, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...palette.white);
  const t = title.length > 75 ? `${title.slice(0, 72)}…` : title;
  doc.text(t.toUpperCase(), margin + 4, y + 4.5);
  return y + 10;
}

function drawProseMultipage(
  doc: jsPDF,
  margin: number,
  maxW: number,
  y: number,
  text: string,
  palette: IaPdfPalette,
  contentBottom: number,
  bumpPage: () => number
): number {
  const lines = doc.splitTextToSize(text.trim(), maxW - 10) as string[];
  const lh = 4.05;
  let idx = 0;
  let cy = y;

  while (idx < lines.length) {
    const room = contentBottom - cy - 10;
    let n = 0;
    let testY = cy + 5;
    while (idx + n < lines.length && testY + lh <= contentBottom - 4) {
      testY += lh;
      n++;
    }
    if (n === 0) {
      cy = bumpPage();
      continue;
    }
    const slice = lines.slice(idx, idx + n);
    const blockH = slice.length * lh + 8;
    doc.setFillColor(...palette.bgLight);
    doc.rect(margin, cy, maxW, blockH, 'F');
    doc.setDrawColor(...palette.borderLight);
    doc.setLineWidth(0.2);
    doc.rect(margin, cy, maxW, blockH, 'S');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...palette.textDark);
    let lineY = cy + 5;
    for (const ln of slice) {
      doc.text(ln, margin + 5, lineY);
      lineY += lh;
    }
    idx += n;
    cy = cy + blockH + 5;
    if (idx < lines.length) {
      cy = bumpPage();
    }
  }
  return cy;
}

const TABLE_ALT_ROW: [number, number, number] = [248, 250, 252];

export interface RenderIaStructuredPdfContext {
  doc: jsPDF;
  margin: number;
  maxW: number;
  contentBottom: number;
  palette: IaPdfPalette;
  /** Nova página + cabeçalho; devolve Y inicial do conteúdo abaixo do cabeçalho. */
  bumpPage: () => number;
}

/**
 * Desenha título da secção, faixas por disciplina (se houver) e blocos; devolve Y final.
 */
export async function renderStructuredIaPdfContent(
  ctx: RenderIaStructuredPdfContext,
  startY: number,
  opts: {
    sectionTitle: string;
    /** Quando o cabeçalho da página já mostra o título (ex.: anexo do mapa). */
    showSectionHeading?: boolean;
    footnote?: string;
    segments: { disciplineBand: string | null; blocks: IaStructuredBlock[] }[];
  }
): Promise<number> {
  const { doc, margin, maxW, contentBottom, palette, bumpPage } = ctx;
  const autoTable = (await import('jspdf-autotable')).default;
  let y = startY;
  const showHeading = opts.showSectionHeading !== false;

  const ensure = (minBelow: number) => {
    if (y + minBelow > contentBottom) y = bumpPage();
  };

  if (showHeading) {
    ensure(18);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...palette.primary);
    doc.text(opts.sectionTitle, margin, y);
    y += 7;
  }

  if (opts.footnote) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...palette.textGray);
    const fnLines = doc.splitTextToSize(opts.footnote, maxW) as string[];
    for (const ln of fnLines) {
      ensure(5);
      doc.text(ln, margin, y);
      y += 4;
    }
    y += 3;
  }

  const commonTable = {
    theme: 'grid' as const,
    margin: { left: margin, right: margin },
    tableLineColor: palette.borderLight,
    tableLineWidth: 0.2,
    headStyles: {
      fillColor: palette.primary,
      textColor: palette.white,
      fontStyle: 'bold' as const,
      fontSize: 8.5,
      halign: 'center' as const,
      valign: 'middle' as const,
      cellPadding: { top: 2, right: 2, bottom: 2, left: 2 },
    },
    bodyStyles: {
      fontSize: 8,
      textColor: palette.textDark,
      valign: 'middle' as const,
      overflow: 'linebreak' as const,
      lineColor: palette.borderLight,
      lineWidth: 0.1,
      cellPadding: { top: 1.6, right: 2, bottom: 1.6, left: 2 },
    },
    alternateRowStyles: { fillColor: TABLE_ALT_ROW },
  };

  for (const seg of opts.segments) {
    if (seg.disciplineBand) {
      ensure(14);
      y = drawIaDisciplineBandPdf(doc, y, margin, maxW, seg.disciplineBand, palette);
    }

    for (const b of seg.blocks) {
      if (b.kind === 'subheading') {
        ensure(10);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...palette.primary);
        doc.text(b.text, margin, y);
        y += 5.5;
      } else if (b.kind === 'prose') {
        ensure(20);
        y = drawProseMultipage(doc, margin, maxW, y, b.text, palette, contentBottom, bumpPage);
      } else if (b.kind === 'table') {
        ensure(28);
        autoTable(doc, {
          ...commonTable,
          startY: y,
          head: [b.head],
          body: b.body,
          columnStyles: b.columnStyles ?? {},
          pageBreak: 'auto',
        });
        y = ((doc as DocAT).lastAutoTable?.finalY ?? y) + 6;
      }
    }
  }

  return y;
}
