import type {
  RelatorioCompleto,
  NivelAprendizagemDisciplina,
  NivelAprendizagemGeral,
  NiveisAprendizagem,
  Proficiencia,
  NotaGeral,
  QuestaoHabilidade,
  AcertosPorHabilidade,
} from "@/types/evaluation-results";

type UnknownRecord = Record<string, unknown>;

function isAnswerSheetPayload(data: RelatorioCompleto & UnknownRecord): boolean {
  const r = data.report_entity_type;
  const av = data.avaliacao as UnknownRecord | undefined;
  const meta = data.metadados as UnknownRecord | undefined;
  return (
    r === "answer_sheet" ||
    av?.report_entity_type === "answer_sheet" ||
    meta?.report_entity_type === "answer_sheet"
  );
}

/** Converte contagens vindas com chaves em português (API cartão-resposta) ou snake_case. */
function nivelGeralFromRaw(raw: UnknownRecord | undefined): NivelAprendizagemGeral | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const a = Number(raw.abaixo_do_basico ?? raw["Abaixo do Básico"] ?? 0) || 0;
  const b = Number(raw.basico ?? raw["Básico"] ?? 0) || 0;
  const c = Number(raw.adequado ?? raw["Adequado"] ?? 0) || 0;
  const d = Number(raw.avancado ?? raw["Avançado"] ?? 0) || 0;
  const explicit = raw.total;
  const total =
    explicit !== undefined && explicit !== null && String(explicit) !== ""
      ? Number(explicit) || 0
      : a + b + c + d;
  return { abaixo_do_basico: a, basico: b, adequado: c, avancado: d, total };
}

function normalizeNivelDisciplina(disc: unknown): NivelAprendizagemDisciplina {
  const d = disc as UnknownRecord;
  const out: NivelAprendizagemDisciplina = { ...(d as NivelAprendizagemDisciplina) };

  if (d.geral && typeof d.geral === "object") {
    const g = nivelGeralFromRaw(d.geral as UnknownRecord);
    if (g) out.geral = g;
  }

  if (Array.isArray(d.por_turma)) {
    out.por_turma = d.por_turma.map((row) => {
      const t = row as UnknownRecord;
      if (t.niveis && typeof t.niveis === "object") {
        const g = nivelGeralFromRaw({
          ...(t.niveis as UnknownRecord),
          total: t.total,
        });
        if (g) {
          return {
            turma: String(t.turma ?? ""),
            abaixo_do_basico: g.abaixo_do_basico,
            basico: g.basico,
            adequado: g.adequado,
            avancado: g.avancado,
            total: g.total,
          };
        }
      }
      return row;
    }) as NivelAprendizagemDisciplina["por_turma"];
  }

  return out;
}

function normalizeNiveisAprendizagem(n: NiveisAprendizagem | undefined): NiveisAprendizagem {
  if (!n) return {};
  const out: NiveisAprendizagem = {};
  for (const [k, v] of Object.entries(n)) {
    out[k] = normalizeNivelDisciplina(v);
  }
  return out;
}

function consolidadoLabel(data: RelatorioCompleto & UnknownRecord): string {
  const meta = data.metadados as UnknownRecord | undefined;
  if (meta?.scope_type === "city") return "Município (consolidado)";
  return "Consolidado";
}

function normalizePorDisciplinaMetricas(
  porDisc: Record<string, unknown> | undefined,
  mode: "proficiencia" | "nota",
  label: string
): Proficiencia["por_disciplina"] | NotaGeral["por_disciplina"] {
  if (!porDisc) return {} as Proficiencia["por_disciplina"];
  const out: Record<string, unknown> = {};

  for (const [disc, val] of Object.entries(porDisc)) {
    const d = val as UnknownRecord;
    const rawMedia = d.media_geral ?? d.media;
    const numMedia = typeof rawMedia === "number" ? rawMedia : Number(rawMedia);
    const hasT = Array.isArray(d.por_turma) && d.por_turma.length > 0;
    const hasE = Array.isArray(d.por_escola) && d.por_escola.length > 0;

    if (hasT || hasE) {
      out[disc] = {
        ...d,
        media_geral: Number.isFinite(numMedia) ? numMedia : d.media_geral,
      };
      continue;
    }

    if (Number.isFinite(numMedia)) {
      if (mode === "proficiencia") {
        out[disc] = {
          ...d,
          media_geral: numMedia,
          por_turma: [{ turma: label, proficiencia: numMedia }],
          por_escola: [{ escola: label, proficiencia: numMedia, media: numMedia }],
        };
      } else {
        out[disc] = {
          ...d,
          media_geral: numMedia,
          por_turma: [{ turma: label, nota: numMedia }],
          por_escola: [{ escola: label, nota: numMedia, media: numMedia }],
        };
      }
    } else {
      out[disc] = { ...d };
    }
  }

  return out as Proficiencia["por_disciplina"];
}

/** Cartão-resposta: `acertos_por_habilidade.GERAL` é mapa uuid → { acertos, habilidade_id, percentual, total }. */
function isAnswerSheetAcertosSkillMap(discVal: unknown): discVal is Record<string, UnknownRecord> {
  if (!discVal || typeof discVal !== "object" || Array.isArray(discVal)) return false;
  const o = discVal as UnknownRecord;
  if ("questoes" in o || "habilidades" in o) return false;
  const vals = Object.values(o);
  if (vals.length === 0) return false;
  return vals.every((v) => {
    if (!v || typeof v !== "object" || Array.isArray(v)) return false;
    const r = v as UnknownRecord;
    const hasMetrics =
      r.acertos !== undefined ||
      r.total !== undefined ||
      r.percentual !== undefined ||
      r.habilidade_id !== undefined;
    if (!hasMetrics) return false;
    if (typeof r.percentual === "number") return true;
    if (typeof r.percentual === "string" && !Number.isNaN(Number(r.percentual))) return true;
    return r.acertos !== undefined && r.total !== undefined;
  });
}

function mapAnswerSheetAcertosDisciplina(discVal: Record<string, UnknownRecord>): {
  habilidades: unknown[];
  questoes: QuestaoHabilidade[];
} {
  const rows = Object.entries(discVal).map(([key, row]) => {
    const r = row;
    const hid = String(r.habilidade_id ?? key);
    const pct = Number(r.percentual ?? 0);
    const acertos = Number(r.acertos ?? 0);
    const total = Number(r.total ?? 0);
    const apiCode = r.code ?? r.codigo;
    const codeStr = typeof apiCode === "string" && apiCode.trim() !== "" ? apiCode.trim() : "";
    const apiDesc = r.description ?? r.descricao;
    const descStr = typeof apiDesc === "string" ? apiDesc : "";
    return { hid, pct, acertos, total, codeStr, descStr };
  });
  rows.sort((a, b) => a.hid.localeCompare(b.hid, undefined, { sensitivity: "base" }));
  const questoes: QuestaoHabilidade[] = rows.map((row, i) => {
    const n = i + 1;
    const fallbackCode =
      row.hid.length > 10 ? `${row.hid.slice(0, 8)}…` : row.hid;
    return {
      numero: n,
      numero_questao: n,
      acertos: row.acertos,
      total: row.total,
      percentual: row.pct,
      codigo: row.codeStr || fallbackCode,
      descricao: row.descStr,
    };
  });
  return { habilidades: [], questoes };
}

function normalizeAcertosPorHabilidadeAnswerSheet(
  raw: AcertosPorHabilidade | UnknownRecord | undefined
): AcertosPorHabilidade {
  if (!raw || typeof raw !== "object") return {} as AcertosPorHabilidade;
  const out: UnknownRecord = {};
  for (const [disciplina, discVal] of Object.entries(raw)) {
    if (isAnswerSheetAcertosSkillMap(discVal)) {
      out[disciplina] = mapAnswerSheetAcertosDisciplina(discVal);
    } else {
      out[disciplina] = discVal;
    }
  }
  return out as AcertosPorHabilidade;
}

/**
 * Adequa o JSON de `reports/dados-json` quando `report_entity_type=answer_sheet`
 * ao formato esperado pelas tabelas de AnaliseAvaliacoes.
 *
 * Relatórios de avaliação “normais” são devolvidos sem alteração, para não
 * correr risco de regressão em shapes já estáveis da API.
 */
export function normalizeRelatorioCompletoForAnaliseUI(data: RelatorioCompleto): RelatorioCompleto {
  const ext = data as RelatorioCompleto & UnknownRecord;

  if (!isAnswerSheetPayload(ext)) {
    return data;
  }

  const niveis = normalizeNiveisAprendizagem(data.niveis_aprendizagem);
  const label = consolidadoLabel(ext);

  return {
    ...data,
    niveis_aprendizagem: niveis,
    acertos_por_habilidade: normalizeAcertosPorHabilidadeAnswerSheet(
      data.acertos_por_habilidade as UnknownRecord | undefined
    ),
    proficiencia: {
      ...data.proficiencia,
      por_disciplina: normalizePorDisciplinaMetricas(
        data.proficiencia?.por_disciplina as Record<string, unknown> | undefined,
        "proficiencia",
        label
      ),
    },
    nota_geral: {
      ...data.nota_geral,
      por_disciplina: normalizePorDisciplinaMetricas(
        data.nota_geral?.por_disciplina as Record<string, unknown> | undefined,
        "nota",
        label
      ),
    },
  };
}
