/**
 * Extrai texto legível da análise IA para inclusão em PDFs (relatório escolar, mapa de habilidades).
 * Respeita os mesmos recortes da UI: metadados ocultos, panorama sem campos numéricos redundantes.
 */

const HIDDEN_ROOT = new Set([
  'metadados_gerais',
  'metadados_entrada',
  'warning',
  'error',
  'document_title',
  'details',
]);

const PANORAMA_HIDE = new Set([
  'componente_curricular',
  'distribuicao_niveis',
  'distribuicao_classificacao_geral',
  'etapa_avaliada',
  'media_nota',
  'media_proficiencia',
  'niveis_proficiencia_alcancados',
]);

function norm(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function readTrimPdf(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function pushNonEmpty(out: string[], s: string): void {
  const t = s.trim();
  if (t) out.push(t);
}

function formatKeyLabel(key: string): string {
  return key
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

/**
 * Obtém o objeto de anália por disciplina (novo: analises_por_disciplina, legado: por_disciplina ou match por nome).
 */
export function getDisciplinaAnaliseFromIaRoot(
  aiRoot: Record<string, unknown> | null | undefined,
  disciplinaNome?: string | null
): Record<string, unknown> | null {
  if (!aiRoot || !disciplinaNome) return null;
  const alvo = norm(disciplinaNome.trim());
  if (!alvo) return null;

  const analisesPorDisciplina = aiRoot.analises_por_disciplina;
  if (analisesPorDisciplina && typeof analisesPorDisciplina === 'object' && !Array.isArray(analisesPorDisciplina)) {
    const entries = Object.entries(analisesPorDisciplina as Record<string, unknown>);
    const found = entries.find(([k]) => {
      const n = norm(k);
      return n.includes(alvo) || alvo.includes(n);
    });
    if (found && found[1] && typeof found[1] === 'object' && !Array.isArray(found[1])) {
      return found[1] as Record<string, unknown>;
    }
  }

  const porDisciplina = aiRoot.por_disciplina;
  if (porDisciplina && typeof porDisciplina === 'object' && !Array.isArray(porDisciplina)) {
    const entries = Object.entries(porDisciplina as Record<string, unknown>);
    const found = entries.find(([k]) => {
      const n = norm(k);
      return n.includes(alvo) || alvo.includes(n);
    });
    if (found && found[1] && typeof found[1] === 'object' && !Array.isArray(found[1])) {
      return found[1] as Record<string, unknown>;
    }
  }

  const entries = Object.entries(aiRoot).filter(([key]) => !HIDDEN_ROOT.has(key));
  const direct = entries.find(([key]) => {
    const n = norm(key);
    return n.includes(alvo) || alvo.includes(n);
  });
  if (direct && direct[1] && typeof direct[1] === 'object' && !Array.isArray(direct[1])) {
    return direct[1] as Record<string, unknown>;
  }

  for (const [, value] of entries) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const obj = value as Record<string, unknown>;
    const disc =
      readTrimPdf(obj.disciplina) ||
      readTrimPdf(obj.componente_curricular) ||
      readTrimPdf(obj.componenteCurricular) ||
      readTrimPdf(obj.subject);
    if (!disc) continue;
    const n = norm(disc);
    if (n.includes(alvo) || alvo.includes(n)) return obj;
  }

  return null;
}

/** Converte o payload de uma disciplina em parágrafos (strings) para o PDF. */
export function disciplineAnaliseToPdfParagraphs(disc: Record<string, unknown> | null): string[] {
  const out: string[] = [];
  if (!disc) return out;

  const pg = disc.panorama_geral;
  if (typeof pg === 'string' && readTrimPdf(pg)) {
    pushNonEmpty(out, 'Panorama geral');
    pushNonEmpty(out, readTrimPdf(pg));
  } else if (pg && typeof pg === 'object' && !Array.isArray(pg)) {
    const o = pg as Record<string, unknown>;
    const ap = readTrimPdf(o.analise_panorama);
    if (ap) {
      pushNonEmpty(out, 'Panorama geral');
      pushNonEmpty(out, ap);
    } else {
      for (const [k, v] of Object.entries(o)) {
        if (PANORAMA_HIDE.has(k)) continue;
        if (typeof v === 'string' && readTrimPdf(v)) {
          pushNonEmpty(out, formatKeyLabel(k));
          pushNonEmpty(out, readTrimPdf(v));
        }
      }
    }
  }

  const rxH = disc.reflexao_niveis_habilidades;
  if (Array.isArray(rxH) && rxH.length > 0) {
    pushNonEmpty(out, 'Reflexão por níveis e habilidades');
    for (const item of rxH) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      const it = item as Record<string, unknown>;
      const nivel = readTrimPdf(it.nivel ?? it.nivel_identificado);
      const q = it.quantidade_alunos;
      const qStr = typeof q === 'number' && Number.isFinite(q) ? ` (${q} alunos)` : '';
      if (nivel) pushNonEmpty(out, `${nivel}${qStr}`);
      else if (qStr) pushNonEmpty(out, `Nível${qStr}`);

      const a = readTrimPdf(it.analise ?? it.descricao_desempenho ?? it.significado_e_impacto);
      if (a) pushNonEmpty(out, a);

      const habs = it.habilidades_analisadas;
      if (Array.isArray(habs)) {
        for (const h of habs) {
          if (!h || typeof h !== 'object') continue;
          const hh = h as Record<string, unknown>;
          const c = readTrimPdf(hh.codigo ?? hh.habilidade_foco);
          const d = readTrimPdf(hh.descricao);
          const r = readTrimPdf(hh.reflexao ?? hh.reflexao_pedagogica);
          if (c) pushNonEmpty(out, `• ${c}`);
          if (d) pushNonEmpty(out, d);
          if (r) pushNonEmpty(out, r);
        }
      }

      const ah = it.analise_habilidades;
      if (Array.isArray(ah)) {
        for (const h of ah) {
          if (!h || typeof h !== 'object') continue;
          const hh = h as Record<string, unknown>;
          const foco = readTrimPdf(hh.habilidade_foco);
          const ref = readTrimPdf(hh.reflexao_pedagogica);
          if (foco) pushNonEmpty(out, `• ${foco}`);
          if (ref) pushNonEmpty(out, ref);
        }
      }
    }
  }

  const rx = disc.reflexao_niveis;
  if (Array.isArray(rx) && rx.length > 0) {
    pushNonEmpty(out, 'Reflexão por níveis');
    for (const item of rx) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      const it = item as Record<string, unknown>;
      const nivel = readTrimPdf(it.nivel_identificado ?? it.nivel);
      if (nivel) pushNonEmpty(out, nivel);
      const sig = readTrimPdf(it.significado_e_impacto ?? it.descricao_desempenho);
      if (sig) pushNonEmpty(out, sig);
      const habs = it.analise_habilidades;
      if (Array.isArray(habs)) {
        for (const h of habs) {
          if (!h || typeof h !== 'object') continue;
          const hh = h as Record<string, unknown>;
          const foco = readTrimPdf(hh.habilidade_foco);
          const ref = readTrimPdf(hh.reflexao_pedagogica);
          if (foco) pushNonEmpty(out, `• ${foco}`);
          if (ref) pushNonEmpty(out, ref);
        }
      }
    }
  }

  const enc = disc.encaminhamentos_cultura_digital;
  if (typeof enc === 'string' && readTrimPdf(enc)) {
    pushNonEmpty(out, 'Encaminhamentos (cultura digital)');
    pushNonEmpty(out, readTrimPdf(enc));
  } else if (enc && typeof enc === 'object' && !Array.isArray(enc)) {
    const e = enc as Record<string, unknown>;
    const intv = e.intervencoes_pedagogicas;
    const rec = e.recursos_digitais;
    if (
      (Array.isArray(intv) && intv.some((x) => typeof x === 'string' && readTrimPdf(x))) ||
      (Array.isArray(rec) && rec.some((x) => typeof x === 'string' && readTrimPdf(x)))
    ) {
      pushNonEmpty(out, 'Encaminhamentos (cultura digital)');
    }
    if (Array.isArray(intv)) {
      pushNonEmpty(out, 'Intervenções pedagógicas');
      for (const x of intv) {
        if (typeof x === 'string' && readTrimPdf(x)) pushNonEmpty(out, `• ${readTrimPdf(x)}`);
      }
    }
    if (Array.isArray(rec)) {
      pushNonEmpty(out, 'Recursos digitais');
      for (const x of rec) {
        if (typeof x === 'string' && readTrimPdf(x)) pushNonEmpty(out, `• ${readTrimPdf(x)}`);
      }
    }
  }

  return out;
}

const MAX_GENERIC_LINES = 240;
const MAX_GENERIC_DEPTH = 10;

/**
 * Fallback para payloads do mapa de habilidades (e variantes da API) que não seguem
 * o formato escolar `panorama_geral` / `reflexao_niveis_habilidades`.
 */
export function genericRecordToPdfParagraphs(
  o: Record<string, unknown>,
  depth = 0,
  out: string[] = [],
  counter: { n: number } = { n: 0 }
): string[] {
  if (depth > MAX_GENERIC_DEPTH || counter.n >= MAX_GENERIC_LINES) return out;

  for (const [k, v] of Object.entries(o)) {
    if (counter.n >= MAX_GENERIC_LINES) break;
    if (HIDDEN_ROOT.has(k)) continue;
    const label = formatKeyLabel(k);
    const pad = '  '.repeat(Math.min(depth, 6));

    if (v == null) continue;

    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      const s = String(v).trim();
      if (!s) continue;
      out.push(`${pad}${label}`);
      out.push(`${pad}${s}`);
      counter.n += 2;
      continue;
    }

    if (Array.isArray(v)) {
      out.push(`${pad}${label}`);
      counter.n += 1;
      const allPrimitive = v.every(
        (x) => x == null || typeof x === 'string' || typeof x === 'number' || typeof x === 'boolean'
      );
      if (allPrimitive) {
        for (const x of v) {
          if (counter.n >= MAX_GENERIC_LINES) break;
          const s = x == null ? '' : String(x).trim();
          if (!s) continue;
          out.push(`${pad}• ${s}`);
          counter.n += 1;
        }
        continue;
      }
      for (let i = 0; i < v.length; i++) {
        if (counter.n >= MAX_GENERIC_LINES) break;
        const item = v[i];
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          out.push(`${pad}[${i + 1}]`);
          counter.n += 1;
          genericRecordToPdfParagraphs(item as Record<string, unknown>, depth + 1, out, counter);
        } else if (item != null) {
          const s = String(item).trim();
          if (s) {
            out.push(`${pad}• ${s}`);
            counter.n += 1;
          }
        }
      }
      continue;
    }

    if (typeof v === 'object') {
      out.push(`${pad}${label}`);
      counter.n += 1;
      genericRecordToPdfParagraphs(v as Record<string, unknown>, depth + 1, out, counter);
    }
  }
  return out;
}

function paragraphsFromDisciplinaMap(map: Record<string, unknown>): string[] {
  const keys = Object.keys(map).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const chunks: string[] = [];
  for (const k of keys) {
    const sub = map[k];
    if (!sub || typeof sub !== 'object' || Array.isArray(sub)) continue;
    const rec = sub as Record<string, unknown>;
    let paras = disciplineAnaliseToPdfParagraphs(rec);
    if (paras.length === 0) {
      paras = genericRecordToPdfParagraphs(rec, 0, [], { n: 0 });
    }
    if (paras.length === 0) continue;
    chunks.push(`— ${k} —`);
    chunks.push(...paras);
  }
  return chunks;
}

/** Todo o payload `analise_ia` (ex.: mapa de habilidades) em parágrafos, ou vazio se não houver conteúdo. */
export function iaRootToPdfParagraphs(aiRoot: Record<string, unknown> | null | undefined): string[] {
  if (!aiRoot) return [];

  const apd = aiRoot.analises_por_disciplina;
  if (apd && typeof apd === 'object' && !Array.isArray(apd)) {
    const fromMap = paragraphsFromDisciplinaMap(apd as Record<string, unknown>);
    if (fromMap.length > 0) return fromMap;
  }

  const pd = aiRoot.por_disciplina;
  if (pd && typeof pd === 'object' && !Array.isArray(pd)) {
    const fromMap = paragraphsFromDisciplinaMap(pd as Record<string, unknown>);
    if (fromMap.length > 0) return fromMap;
  }

  const direct = disciplineAnaliseToPdfParagraphs(aiRoot);
  if (direct.length > 0) return direct;

  const lines: string[] = [];
  for (const [k, v] of Object.entries(aiRoot)) {
    if (HIDDEN_ROOT.has(k)) continue;
    if (typeof v === 'string' && readTrimPdf(v)) {
      pushNonEmpty(lines, formatKeyLabel(k));
      pushNonEmpty(lines, readTrimPdf(v));
    }
  }
  if (lines.length > 0) return lines;

  return genericRecordToPdfParagraphs(aiRoot, 0, [], { n: 0 });
}
