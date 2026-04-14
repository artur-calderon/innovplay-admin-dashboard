import type { RelatorioCompleto } from "@/types/evaluation-results";
import type { NovaRespostaAPI } from "@/services/evaluation/evaluationResultsApi";
import type {
  BuildDeckDataArgs,
  NotaPorDisciplinaDeck,
  NotaPorCategoriaDeck,
  NiveisBySeriesRow,
  PresenceBySeriesRow,
  ProficiencyByDisciplineByTurmaRow,
  ProficiencyGeneralByTurmaRow,
  Presentation19DeckData,
  PresentationComparisonAxis,
  AlunoPresentationRow,
  SlideQuestionRow,
  Presentation19Mode,
} from "@/types/presentation19-slides";
import { getProficiencyLevelDescription, type ProficiencyLevel } from "@/components/evaluations/results/utils/proficiency";
import { getProficiencyTableInfo } from "@/components/evaluations/results/utils/proficiency";

type AnyRecord = Record<string, unknown>;

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

function extractSerieFromTurma(turma?: string | null): string {
  const t = (turma ?? "").trim();
  if (!t) return "N/A";
  if (/^[A-Za-z]$/.test(t)) return "N/A";

  // ex.: "5º Ano A" => "5º Ano"
  const match = t.match(/(\d+º)\s*(?:ano)?/i);
  if (match?.[1]) return `${match[1]} Ano`;

  // fallback: até o primeiro espaço
  return t.split(/\s+/)[0] || "N/A";
}

function isTurmaOnlyLabel(value?: string | null): boolean {
  const v = String(value ?? "").trim();
  return /^[A-Za-z]$/.test(v);
}

function isValidSerieLabel(value?: string | null): boolean {
  const v = String(value ?? "").trim();
  if (!v) return false;
  if (v === "N/A") return false;
  if (isTurmaOnlyLabel(v)) return false;
  const normalized = normalizeText(v).toLowerCase();
  if (normalized.includes("escola")) return false;
  if (normalized.includes("municipal")) return false;
  if (normalized.includes("estadual")) return false;
  return true;
}

function findGeralKey(obj: unknown): string | null {
  if (!obj || typeof obj !== "object") return null;
  const entries = Object.entries(obj as AnyRecord);
  const geral = entries.find(([k]) => normalizeText(k).toLowerCase() === "geral");
  return geral?.[0] ?? null;
}

function clampToNumber(n: unknown, fallback = 0): number {
  const num = typeof n === "number" ? n : Number(n);
  return Number.isFinite(num) ? num : fallback;
}

function safeSum(nums: number[]): number {
  return nums.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0);
}

/** Primeiro número finito; se nenhum, retorna `fallback`. */
function firstFinite(...vals: Array<number | undefined | null>): number {
  for (const v of vals) {
    if (v != null && Number.isFinite(Number(v))) return Number(v);
  }
  return 0;
}

/**
 * Participantes que realizaram a prova: prioriza agregados (mesma base da distribuição),
 * com fallback ao relatório. Não usa `||` para não trocar 0 legítimo por outra fonte.
 */
function pickAlunosParticipantes(
  mode: Presentation19Mode,
  relatorio: Partial<RelatorioCompleto> | null,
  nova: NovaRespostaAPI | null
): number {
  const fromNovaRaw = nova?.estatisticas_gerais?.alunos_participantes;
  const fromRelRaw = relatorio?.total_alunos?.total_geral?.avaliados;

  const preferNovaFirst =
    mode === "answer_sheet" ||
    (fromNovaRaw != null && Number.isFinite(Number(fromNovaRaw)));

  if (preferNovaFirst && fromNovaRaw != null && Number.isFinite(Number(fromNovaRaw))) {
    return clampToNumber(fromNovaRaw, 0);
  }
  if (fromRelRaw != null && Number.isFinite(Number(fromRelRaw))) {
    return clampToNumber(fromRelRaw, 0);
  }
  if (fromNovaRaw != null && Number.isFinite(Number(fromNovaRaw))) {
    return clampToNumber(fromNovaRaw, 0);
  }
  return 0;
}

function buildNotasFromNova(nova: NovaRespostaAPI | null): { geral: number | null; porDisciplina: NotaPorDisciplinaDeck[] } {
  if (!nova?.estatisticas_gerais && !(nova?.resultados_por_disciplina && nova.resultados_por_disciplina.length > 0)) {
    return { geral: null, porDisciplina: [] };
  }
  const eg = nova.estatisticas_gerais;
  const geralRaw = eg?.media_nota_geral;
  const geral = geralRaw != null && Number.isFinite(Number(geralRaw)) ? clampToNumber(geralRaw, NaN) : null;

  const porDisciplina = (nova.resultados_por_disciplina ?? [])
    .map((d) => ({
      disciplina: String(d.disciplina ?? "").trim(),
      mediaNota: clampToNumber(d.media_nota, 0),
    }))
    .filter((d) => d.disciplina.length > 0);

  return { geral: Number.isFinite(geral as number) ? (geral as number) : null, porDisciplina };
}

function buildNotasFromRelatorio(relatorio: Partial<RelatorioCompleto> | null): { geral: number | null; porDisciplina: NotaPorDisciplinaDeck[] } {
  const pd = relatorio?.nota_geral?.por_disciplina;
  if (!pd || typeof pd !== "object") return { geral: null, porDisciplina: [] };

  const porDisciplina = Object.entries(pd as Record<string, { media_geral?: number }>)
    .map(([disciplina, v]) => ({
      disciplina,
      mediaNota: clampToNumber(v?.media_geral, 0),
    }))
    .filter((d) => d.disciplina.length > 0);

  const medias = porDisciplina.map((d) => d.mediaNota).filter((m) => Number.isFinite(m));
  const geral = medias.length > 0 ? medias.reduce((a, b) => a + b, 0) / medias.length : null;
  return { geral, porDisciplina };
}

function groupPresenceFromRelatorio(relatorio: Partial<RelatorioCompleto> | null): PresenceBySeriesRow[] {
  const total = relatorio?.total_alunos;
  const porTurma = total?.por_turma ?? [];
  const porEscola = total?.por_escola ?? [];

  type PresenceSourceRow = {
    serie?: string;
    turma?: string;
    escola?: string;
    matriculados?: number;
    avaliados?: number;
    percentual?: number;
  };

  const source = (porTurma.length > 0 ? porTurma : porEscola) as PresenceSourceRow[];

  if (!source || source.length === 0) return [];

  // agrupar por "serie": prioriza campo explícito `serie`, fallback para extração de `turma`
  const map = new Map<string, PresenceBySeriesRow>();
  for (const row of source) {
    const turmaLabel = String(row.turma ?? "").trim();
    const serieRaw = String(row.serie ?? "").trim();
    const serie = serieRaw || extractSerieFromTurma(turmaLabel);
    if (!isValidSerieLabel(serie)) continue;
    const matriculados = clampToNumber(row.matriculados, 0);
    const avaliados = clampToNumber(row.avaliados, 0);
    const presencaMediaPct = matriculados > 0 ? (avaliados / matriculados) * 100 : 0;

    const cur = map.get(serie);
    if (!cur) {
      map.set(serie, {
        label: serie,
        totalAlunos: matriculados,
        totalPresentes: avaliados,
        presencaMediaPct,
        alunosFaltosos: Math.max(0, matriculados - avaliados),
        turmaLabel,
      });
      continue;
    }

    const totalAlunos = cur.totalAlunos + matriculados;
    const totalPresentes = cur.totalPresentes + avaliados;
    const presencaMediaPctAtualizada = totalAlunos > 0 ? (totalPresentes / totalAlunos) * 100 : 0;
    const alunosFaltosos = Math.max(0, totalAlunos - totalPresentes);

    map.set(serie, { ...cur, totalAlunos, totalPresentes, presencaMediaPct: presencaMediaPctAtualizada, alunosFaltosos });
  }

  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }));
}

function groupPresenceFromNova(novaRespostaAgregados: NovaRespostaAPI | null, serieFallback?: string): PresenceBySeriesRow[] {
  if (!novaRespostaAgregados?.estatisticas_gerais) return [];
  const eg = novaRespostaAgregados.estatisticas_gerais;
  const serie = String(eg.serie ?? "").trim();
  const serieResolved = isValidSerieLabel(serie) ? serie : (isValidSerieLabel(serieFallback) ? String(serieFallback).trim() : "GERAL");

  const totalAlunos = clampToNumber(eg.total_alunos, 0);
  const totalPresentes = clampToNumber(eg.alunos_participantes, 0);
  /** Cartão resposta: faltosos = total de alunos − presentes (não usar só alunos_ausentes da API). */
  const alunosFaltosos = Math.max(0, totalAlunos - totalPresentes);
  const presencaMediaPct = totalAlunos > 0 ? (totalPresentes / totalAlunos) * 100 : 0;

  return [
    {
      label: serieResolved,
      totalAlunos,
      totalPresentes,
      presencaMediaPct,
      alunosFaltosos,
    },
  ];
}

function buildPresenceFinalFallback(
  relatorio: Partial<RelatorioCompleto> | null,
  novaRespostaAgregados: NovaRespostaAPI | null,
  serieFallback?: string
): PresenceBySeriesRow[] {
  const totalAlunos = firstFinite(
    clampToNumber(relatorio?.total_alunos?.total_geral?.matriculados, NaN),
    clampToNumber(novaRespostaAgregados?.estatisticas_gerais?.total_alunos, NaN)
  );
  const totalPresentes = firstFinite(
    clampToNumber(relatorio?.total_alunos?.total_geral?.avaliados, NaN),
    clampToNumber(novaRespostaAgregados?.estatisticas_gerais?.alunos_participantes, NaN)
  );
  const serie = isValidSerieLabel(serieFallback) ? String(serieFallback).trim() : "GERAL";

  // Se não há nenhuma base numérica, não inventar linha.
  if (!Number.isFinite(totalAlunos) || totalAlunos <= 0) return [];

  const presentesOk = Number.isFinite(totalPresentes) ? totalPresentes : 0;
  const alunosFaltosos = Math.max(0, totalAlunos - presentesOk);

  return [
    {
      label: serie,
      totalAlunos,
      totalPresentes: presentesOk,
      presencaMediaPct: totalAlunos > 0 ? (presentesOk / totalAlunos) * 100 : 0,
      alunosFaltosos,
    },
  ];
}

function groupNiveisFromRelatorio(relatorio: Partial<RelatorioCompleto> | null, series: string[]): NiveisBySeriesRow[] {
  const niveis = relatorio?.niveis_aprendizagem;
  if (!niveis) return [];

  const geralKey = findGeralKey(niveis) ?? "GERAL";
  type NiveisDiscipline = {
    por_turma?: Array<{
      turma: string;
      abaixo_do_basico: number;
      basico: number;
      adequado: number;
      avancado: number;
      total: number;
    }>;
    total_geral?: {
      abaixo_do_basico: number;
      basico: number;
      adequado: number;
      avancado: number;
      total: number;
    };
  };

  const disciplinaGeral = (niveis as AnyRecord)[geralKey] as NiveisDiscipline | undefined;

  const porTurma = (disciplinaGeral?.por_turma ?? []) as Array<{
    serie?: string;
    turma: string;
    abaixo_do_basico: number;
    basico: number;
    adequado: number;
    avancado: number;
    total: number;
  }>;
  if (!porTurma || porTurma.length === 0) {
    // fallback: total_geral
    const totalGeral = disciplinaGeral?.total_geral;
    if (!totalGeral) return [];
    return [
      {
        label: series[0] ?? "N/A",
        abaixoDoBasico: clampToNumber(totalGeral.abaixo_do_basico),
        basico: clampToNumber(totalGeral.basico),
        adequado: clampToNumber(totalGeral.adequado),
        avancado: clampToNumber(totalGeral.avancado),
        total: clampToNumber(
          totalGeral.total,
          clampToNumber(totalGeral.abaixo_do_basico, 0) +
            clampToNumber(totalGeral.basico, 0) +
            clampToNumber(totalGeral.adequado, 0) +
            clampToNumber(totalGeral.avancado, 0)
        ),
      },
    ];
  }

  // agrupar por "serie"
  const map = new Map<string, NiveisBySeriesRow>();
  for (const row of porTurma) {
    const serieRaw = String(row.serie ?? "").trim();
    const serie = serieRaw || extractSerieFromTurma(row.turma);
    if (!isValidSerieLabel(serie)) continue;
    const cur = map.get(serie);
    const abaixoDoBasico = clampToNumber(row.abaixo_do_basico, 0);
    const basico = clampToNumber(row.basico, 0);
    const adequado = clampToNumber(row.adequado, 0);
    const avancado = clampToNumber(row.avancado, 0);
    const total = clampToNumber(row.total, abaixoDoBasico + basico + adequado + avancado);

    if (!cur) {
      map.set(serie, { label: serie, abaixoDoBasico, basico, adequado, avancado, total });
      continue;
    }

    const next: NiveisBySeriesRow = {
      label: serie,
      abaixoDoBasico: cur.abaixoDoBasico + abaixoDoBasico,
      basico: cur.basico + basico,
      adequado: cur.adequado + adequado,
      avancado: cur.avancado + avancado,
      total: cur.total + total,
    };
    map.set(serie, next);
  }

  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }));
}

function groupNiveisFromNova(novaRespostaAgregados: NovaRespostaAPI | null, serieFallback: string): NiveisBySeriesRow[] {
  if (!novaRespostaAgregados?.estatisticas_gerais) return [];
  const eg = novaRespostaAgregados.estatisticas_gerais;
  const dist = eg.distribuicao_classificacao_geral;
  if (!dist) return [];

  const serieRaw = String(eg.serie ?? "").trim();
  const serie = isValidSerieLabel(serieRaw) ? serieRaw : (isValidSerieLabel(serieFallback) ? serieFallback : "GERAL");

  const abaixoDoBasico = clampToNumber(dist.abaixo_do_basico, 0);
  const basico = clampToNumber(dist.basico, 0);
  const adequado = clampToNumber(dist.adequado, 0);
  const avancado = clampToNumber(dist.avancado, 0);
  const total = safeSum([abaixoDoBasico, basico, adequado, avancado]);

  return [{ label: serie, abaixoDoBasico, basico, adequado, avancado, total }];
}

function buildProficiencyGeneralByTurma(
  relatorio: Partial<RelatorioCompleto> | null
): ProficiencyGeneralByTurmaRow[] {
  const prof = relatorio?.proficiencia?.por_disciplina;
  if (!prof) return [];
  const geralKey = findGeralKey(prof) ?? "GERAL";
  type ProficienciaGeral = {
    por_turma?: Array<{ turma: string; proficiencia: number }>;
  };
  const geral = (prof as AnyRecord)[geralKey] as ProficienciaGeral | undefined;
  const porTurma = (geral?.por_turma ?? []) as Array<{ turma: string; proficiencia: number }>;
  if (porTurma.length === 0) {
    const mediaGeral = clampToNumber((geral as AnyRecord | undefined)?.media_geral, NaN);
    return Number.isFinite(mediaGeral) ? [{ turma: "GERAL", proficiencia: mediaGeral }] : [];
  }
  return porTurma
    .map((r) => ({
      label: String(r.turma ?? "").trim(),
      proficiencia: clampToNumber(r.proficiencia, 0),
    }))
    .filter((r) => r.label !== "")
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }));
}

function buildProficiencyGeneralByTurmaFromNova(novaRespostaAgregados: NovaRespostaAPI | null): ProficiencyGeneralByTurmaRow[] {
  if (!novaRespostaAgregados) return [];
  // Usar apenas métrica oficial do backend, sem recálculo por alunos.
  const mediaGeral = clampToNumber(novaRespostaAgregados.estatisticas_gerais?.media_proficiencia_geral, NaN);
  return Number.isFinite(mediaGeral) ? [{ label: "GERAL", proficiencia: mediaGeral }] : [];
}

function buildProficiencyByDisciplineByTurma(
  relatorio: Partial<RelatorioCompleto> | null
): ProficiencyByDisciplineByTurmaRow[] {
  const profDisc = relatorio?.proficiencia?.por_disciplina;
  if (!profDisc) return [];

  const geralKey = findGeralKey(profDisc) ?? "GERAL";

  const disciplines = Object.entries(profDisc as AnyRecord)
    .filter(([k]) => normalizeText(k).toLowerCase() !== normalizeText(geralKey).toLowerCase())
    .map(([disciplina, dadosDisc]) => {
      const porTurma = (dadosDisc as AnyRecord)?.por_turma as Array<{ turma: string; proficiencia: number }>;
      const valuesByTurma = (porTurma ?? []).map((r) => ({
        turma: String(r.turma ?? "").trim(),
        proficiencia: clampToNumber(r.proficiencia, 0),
      }));
      return { disciplina, valuesByTurma };
    })
    .filter((d) => d.valuesByTurma.length > 0);

  return disciplines;
}

function buildProficiencyByDisciplineByTurmaFromNova(novaRespostaAgregados: NovaRespostaAPI | null): ProficiencyByDisciplineByTurmaRow[] {
  if (!novaRespostaAgregados) return [];
  // Usar apenas métricas oficiais agregadas por disciplina do backend.
  const disciplinas = novaRespostaAgregados.resultados_por_disciplina ?? [];
  return disciplinas
    .map((d) => {
      const disciplina = String(d.disciplina ?? "").trim();
      const media = clampToNumber(d.media_proficiencia, NaN);
      if (!disciplina || !Number.isFinite(media)) return null;
      return {
        disciplina,
        valuesByTurma: [{ turma: "GERAL", proficiencia: media }],
      };
    })
    .filter((d): d is ProficiencyByDisciplineByTurmaRow => Boolean(d));
}

function warnIfProficiencyOutOfRange(
  serieHint: string,
  profGeral: ProficiencyGeneralByTurmaRow[],
  profPorDisciplina: ProficiencyByDisciplineByTurmaRow[]
): void {
  const maxGeral = getProficiencyTableInfo(serieHint, "Matemática").maxProficiency;

  for (const row of profGeral) {
    if (row.proficiencia > maxGeral) {
      console.warn("[presentation19] proficiência geral fora da faixa esperada", {
        serieHint,
        categoria: row.label,
        proficiencia: row.proficiencia,
        maxEsperado: maxGeral,
      });
    }
  }

  for (const disc of profPorDisciplina) {
    const maxDisc = getProficiencyTableInfo(serieHint, disc.disciplina).maxProficiency;
    for (const row of disc.valuesByTurma) {
      if (row.proficiencia > maxDisc) {
        console.warn("[presentation19] proficiência por disciplina fora da faixa esperada", {
          serieHint,
          disciplina: disc.disciplina,
          turma: row.turma,
          proficiencia: row.proficiencia,
          maxEsperado: maxDisc,
        });
      }
    }
  }
}

function flattenQuestions(relatorio: Partial<RelatorioCompleto> | null): SlideQuestionRow[] {
  const map = relatorio?.acertos_por_habilidade;
  if (!map) return [];

  const geralKey = findGeralKey(map) ?? "GERAL";
  const disciplina = (map as AnyRecord)[geralKey] ?? (map as AnyRecord)[Object.keys(map)[0] ?? ""];
  if (!disciplina) return [];

  // `habilidades` (tipagem do RelatorioCompleto) — mas a API pode vir com `questoes` dependendo do contexto
  type QuestaoLike = {
    numero?: number;
    numero_questao?: number;
    percentual?: number;
    acertos?: number;
    total?: number;
    codigo?: string;
    descricao?: string;
  };

  type HabilidadeLike = {
    questoes?: QuestaoLike[];
    codigo?: string;
    descricao?: string;
  };

  const habilidades = (disciplina as AnyRecord).habilidades as HabilidadeLike[] | undefined;

  const questoesFlat: SlideQuestionRow[] = [];

  if (Array.isArray((disciplina as AnyRecord).questoes)) {
    // fallback: alguns payloads já podem vir “chapados” em `questoes`
    const qs = (disciplina as AnyRecord).questoes as QuestaoLike[];
    for (const q of qs) {
      const questao = clampToNumber(q.numero_questao ?? q.numero, 0);
      const percentualAcertos = clampToNumber(q.percentual ?? 0, 0);
      const habilidade = String(q.codigo ?? q.descricao ?? "Habilidade");
      questoesFlat.push({ questao, habilidade, percentualAcertos });
    }
  } else if (habilidades && habilidades.length > 0) {
    for (const hab of habilidades) {
      const qs = hab.questoes ?? [];
      for (const q of qs) {
        const questao = clampToNumber(q.numero_questao ?? q.numero, 0);
        const percentualAcertos = clampToNumber(q.percentual ?? 0, 0);
        const habilidade = String(q.codigo ?? hab.descricao ?? "Habilidade");
        questoesFlat.push({ questao, habilidade, percentualAcertos });
      }
    }
  }

  return questoesFlat.map((r) => ({
    ...r,
    percentualAcertos: Math.round(r.percentualAcertos * 10) / 10,
  }));
}

/** Número da questão → código/descrição da habilidade (metadados em `tabela_detalhada.disciplinas[].questoes`). */
function buildQuestaoNumeroToHabilidadeMap(novaRespostaAgregados: NovaRespostaAPI | null): Map<number, string> {
  const map = new Map<number, string>();
  const disciplinas = novaRespostaAgregados?.tabela_detalhada?.disciplinas ?? [];
  for (const disc of disciplinas) {
    const qs = (disc as { questoes?: Array<{ numero?: number; habilidade?: string; codigo_habilidade?: string }> }).questoes ?? [];
    for (const q of qs) {
      const num = clampToNumber(q.numero, 0);
      if (num <= 0) continue;
      const hab = String(q.codigo_habilidade ?? q.habilidade ?? "").trim();
      if (!hab) continue;
      if (!map.has(num)) map.set(num, hab);
    }
  }
  return map;
}

/** Mapa questão → habilidade a partir da tabela geral já montada (ex.: `acertos_por_habilidade` do relatório). */
function buildQuestaoHabilidadeMapFromGeralRows(geral: SlideQuestionRow[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const r of geral) {
    const q = clampToNumber(r.questao, 0);
    if (q <= 0) continue;
    const hab = String(r.habilidade ?? "").trim();
    if (!hab || hab === "—") continue;
    map.set(q, hab);
  }
  return map;
}

/** União: metadados da nova resposta + habilidades da tabela geral (prioridade à geral quando ambas existem). */
function mergeHabilidadeMaps(novaMap: Map<number, string>, geralMap: Map<number, string>): Map<number, string> {
  const out = new Map(novaMap);
  for (const [q, hab] of geralMap) {
    out.set(q, hab);
  }
  return out;
}

function flattenQuestionsFromNova(novaRespostaAgregados: NovaRespostaAPI | null): SlideQuestionRow[] {
  if (!novaRespostaAgregados) return [];

  const alunos = (novaRespostaAgregados.tabela_detalhada?.geral?.alunos ?? []) as Array<{
    respostas_por_questao?: Array<{ questao?: number; acertou?: boolean }>;
  }>;
  if (alunos.length === 0) return [];

  const habMap = buildQuestaoNumeroToHabilidadeMap(novaRespostaAgregados);

  const byQuestao = new Map<number, { total: number; acertos: number }>();
  for (const aluno of alunos) {
    for (const r of aluno.respostas_por_questao ?? []) {
      const q = clampToNumber(r.questao, 0);
      if (q <= 0) continue;
      const cur = byQuestao.get(q) ?? { total: 0, acertos: 0 };
      cur.total += 1;
      if (r.acertou) cur.acertos += 1;
      byQuestao.set(q, cur);
    }
  }

  return Array.from(byQuestao.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([questao, v]) => ({
      questao,
      habilidade: habMap.get(questao)?.trim() || "—",
      percentualAcertos: v.total > 0 ? Math.round((v.acertos / v.total) * 1000) / 10 : 0,
    }));
}

/** % de acerto por questão, uma entrada por turma (alunos da tabela detalhada). */
function buildQuestoesPorTurmaFromNova(
  novaRespostaAgregados: NovaRespostaAPI | null,
  habilidadePorQuestao: Map<number, string>
): Array<{ turma: string; serieTurma: string; questoes: SlideQuestionRow[] }> {
  if (!novaRespostaAgregados) return [];

  const habMap = habilidadePorQuestao;

  const alunos = (novaRespostaAgregados.tabela_detalhada?.geral?.alunos ?? []) as Array<{
    turma?: string;
    serie?: string;
    respostas_por_questao?: Array<{ questao?: number; acertou?: boolean }>;
  }>;
  if (alunos.length === 0) return [];

  const byTurma = new Map<string, typeof alunos>();
  for (const aluno of alunos) {
    const t = String(aluno.turma ?? "").trim() || "—";
    if (!byTurma.has(t)) byTurma.set(t, []);
    byTurma.get(t)!.push(aluno);
  }

  const out: Array<{ turma: string; serieTurma: string; questoes: SlideQuestionRow[] }> = [];
  for (const [turma, lista] of [...byTurma.entries()].sort((a, b) =>
    a[0].localeCompare(b[0], "pt-BR", { sensitivity: "base" })
  )) {
    const serieTurma =
      String(lista.find((a) => String(a.serie ?? "").trim())?.serie ?? "").trim() || extractSerieFromTurma(turma);

    const byQuestao = new Map<number, { total: number; acertos: number }>();
    for (const aluno of lista) {
      for (const r of aluno.respostas_por_questao ?? []) {
        const q = clampToNumber(r.questao, 0);
        if (q <= 0) continue;
        const cur = byQuestao.get(q) ?? { total: 0, acertos: 0 };
        cur.total += 1;
        if (r.acertou) cur.acertos += 1;
        byQuestao.set(q, cur);
      }
    }
    const questoes = Array.from(byQuestao.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([questao, v]) => ({
        questao,
        habilidade: habMap.get(questao)?.trim() || "—",
        percentualAcertos: v.total > 0 ? Math.round((v.acertos / v.total) * 1000) / 10 : 0,
      }));
    if (questoes.length > 0) out.push({ turma, serieTurma, questoes });
  }
  return out;
}

function buildCursoSerieTurma(
  relatorio: Partial<RelatorioCompleto> | null,
  deckPresence: PresenceBySeriesRow[],
  novaRespostaAgregados: NovaRespostaAPI | null
): { curso: string; serie: string; turma: string } {
  const serie = deckPresence[0]?.label ?? "N/A";
  const turmaFromNova = String(novaRespostaAgregados?.tabela_detalhada?.geral?.alunos?.[0]?.turma ?? "").trim();
  const turma = turmaFromNova || relatorio?.total_alunos?.por_turma?.[0]?.turma || deckPresence[0]?.turmaLabel || "N/A";

  // regra simples: se série tiver números "6-9" e "EM", tratamos como Anos Finais
  const serieLower = serie.toLowerCase();
  let curso = "Anos Iniciais";
  if (/\b(6|7|8|9)\b/.test(serieLower) || serieLower.includes("em") || serieLower.includes("medio") || serieLower.includes("médio") || serieLower.includes("ensino médio")) {
    curso = "Anos Finais";
  }
  if (serieLower.includes("grupo")) curso = "Anos Iniciais";

  return { curso, serie, turma };
}

/** Todas as turmas com participação no relatório agregado e/ou tabela detalhada da nova resposta. */
function collectTurmasParticipantes(
  relatorio: Partial<RelatorioCompleto> | null,
  novaRespostaAgregados: NovaRespostaAPI | null,
  presencaPorSerie: PresenceBySeriesRow[],
  proficienciaGeralPorTurma: ProficiencyGeneralByTurmaRow[],
  comparisonAxis: PresentationComparisonAxis
): string[] {
  const set = new Set<string>();

  for (const row of relatorio?.total_alunos?.por_turma ?? []) {
    const t = String((row as { turma?: string }).turma ?? "").trim();
    if (t) set.add(t);
  }

  const alunosGeral = novaRespostaAgregados?.tabela_detalhada?.geral?.alunos ?? [];
  for (const a of alunosGeral) {
    const t = String((a as { turma?: string }).turma ?? "").trim();
    if (t) set.add(t);
  }

  for (const d of novaRespostaAgregados?.tabela_detalhada?.disciplinas ?? []) {
    for (const a of d.alunos ?? []) {
      const t = String((a as { turma?: string }).turma ?? "").trim();
      if (t) set.add(t);
    }
  }

  if (set.size === 0) {
    for (const r of presencaPorSerie) {
      if (r.turmaLabel?.trim()) set.add(r.turmaLabel.trim());
      if (comparisonAxis === "turma" && r.label?.trim()) set.add(r.label.trim());
    }
    for (const r of proficienciaGeralPorTurma) {
      const lab = String(r.label ?? "").trim();
      if (lab && lab !== "GERAL") set.add(lab);
    }
  }

  return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
}

function buildLevelsBySeries(relatorio: Partial<RelatorioCompleto> | null, presenceSeries: PresenceBySeriesRow[]): NiveisBySeriesRow[] {
  if (!relatorio) return [];
  const series = presenceSeries.map((s) => s.label);
  return groupNiveisFromRelatorio(relatorio, series);
}

function normKey(s?: string | null): string {
  return normalizeText(String(s ?? "").trim())
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function groupPresencePorEscola(relatorio: Partial<RelatorioCompleto> | null): PresenceBySeriesRow[] {
  const rows = relatorio?.total_alunos?.por_escola ?? [];
  if (!rows.length) return [];
  return rows
    .map((row) => {
      const label = String(row.escola ?? "").trim();
      const matriculados = clampToNumber(row.matriculados, 0);
      const avaliados = clampToNumber(row.avaliados, 0);
      const presencaMediaPct = matriculados > 0 ? (avaliados / matriculados) * 100 : 0;
      return {
        label,
        totalAlunos: matriculados,
        totalPresentes: avaliados,
        presencaMediaPct,
        alunosFaltosos: Math.max(0, matriculados - avaliados),
      };
    })
    .filter((r) => r.label.length > 0)
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }));
}

function groupPresencePorTurmaDireto(
  relatorio: Partial<RelatorioCompleto> | null,
  serieFilterLabel?: string
): PresenceBySeriesRow[] {
  const rows = relatorio?.total_alunos?.por_turma ?? [];
  if (!rows.length) return [];
  const filtered = serieFilterLabel
    ? rows.filter((row) => {
        const s = String((row as { serie?: string }).serie ?? "").trim() || extractSerieFromTurma(row.turma);
        return normKey(s) === normKey(serieFilterLabel);
      })
    : rows;
  return filtered
    .map((row) => {
      const label = String(row.turma ?? "").trim();
      const matriculados = clampToNumber(row.matriculados, 0);
      const avaliados = clampToNumber(row.avaliados, 0);
      const presencaMediaPct = matriculados > 0 ? (avaliados / matriculados) * 100 : 0;
      return {
        label,
        totalAlunos: matriculados,
        totalPresentes: avaliados,
        presencaMediaPct,
        alunosFaltosos: Math.max(0, matriculados - avaliados),
        turmaLabel: label,
      };
    })
    .filter((r) => r.label.length > 0)
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }));
}

function groupNiveisPorEscola(relatorio: Partial<RelatorioCompleto> | null): NiveisBySeriesRow[] {
  const niveis = relatorio?.niveis_aprendizagem;
  if (!niveis) return [];
  const geralKey = findGeralKey(niveis) ?? "GERAL";
  const disciplinaGeral = (niveis as AnyRecord)[geralKey] as { por_escola?: Array<Record<string, number | string>> } | undefined;
  const porEscola = disciplinaGeral?.por_escola ?? [];
  if (!porEscola.length) return [];
  return porEscola
    .map((row) => {
      const label = String(row.escola ?? "").trim();
      const abaixoDoBasico = clampToNumber(row.abaixo_do_basico, 0);
      const basico = clampToNumber(row.basico, 0);
      const adequado = clampToNumber(row.adequado, 0);
      const avancado = clampToNumber(row.avancado, 0);
      const total = clampToNumber(row.total, abaixoDoBasico + basico + adequado + avancado);
      return { label, abaixoDoBasico, basico, adequado, avancado, total };
    })
    .filter((r) => r.label.length > 0)
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }));
}

function groupNiveisPorTurmaDireto(
  relatorio: Partial<RelatorioCompleto> | null,
  serieFilterLabel?: string
): NiveisBySeriesRow[] {
  const niveis = relatorio?.niveis_aprendizagem;
  if (!niveis) return [];
  const geralKey = findGeralKey(niveis) ?? "GERAL";
  const disciplinaGeral = (niveis as AnyRecord)[geralKey] as {
    por_turma?: Array<{
      serie?: string;
      turma: string;
      abaixo_do_basico: number;
      basico: number;
      adequado: number;
      avancado: number;
      total: number;
    }>;
  };
  const porTurma = disciplinaGeral?.por_turma ?? [];
  const filtered = serieFilterLabel
    ? porTurma.filter((row) => {
        const s = String(row.serie ?? "").trim() || extractSerieFromTurma(row.turma);
        return normKey(s) === normKey(serieFilterLabel);
      })
    : porTurma;
  return filtered
    .map((row) => {
      const label = String(row.turma ?? "").trim();
      const abaixoDoBasico = clampToNumber(row.abaixo_do_basico, 0);
      const basico = clampToNumber(row.basico, 0);
      const adequado = clampToNumber(row.adequado, 0);
      const avancado = clampToNumber(row.avancado, 0);
      const total = clampToNumber(row.total, abaixoDoBasico + basico + adequado + avancado);
      return { label, abaixoDoBasico, basico, adequado, avancado, total };
    })
    .filter((r) => r.label.length > 0)
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }));
}

function buildProficiencyGeneralPorEscola(relatorio: Partial<RelatorioCompleto> | null): ProficiencyGeneralByTurmaRow[] {
  const prof = relatorio?.proficiencia?.por_disciplina;
  if (!prof) return [];
  const geralKey = findGeralKey(prof) ?? "GERAL";
  const geral = (prof as AnyRecord)[geralKey] as { por_escola?: Array<{ escola?: string; proficiencia?: number; media?: number }> };
  const porEscola = geral?.por_escola ?? [];
  return porEscola
    .map((r) => ({
      label: String(r.escola ?? "").trim(),
      proficiencia: clampToNumber(r.proficiencia ?? r.media, 0),
    }))
    .filter((r) => r.label.length > 0)
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }));
}

function buildProficiencyGeneralPorSerieFromRelatorio(relatorio: Partial<RelatorioCompleto> | null): ProficiencyGeneralByTurmaRow[] {
  const prof = relatorio?.proficiencia?.por_disciplina;
  if (!prof) return [];
  const geralKey = findGeralKey(prof) ?? "GERAL";
  const geral = (prof as AnyRecord)[geralKey] as { por_turma?: Array<{ turma: string; proficiencia: number }> };
  const porTurma = geral?.por_turma ?? [];
  const map = new Map<string, { sum: number; n: number }>();
  for (const row of porTurma) {
    const serie = extractSerieFromTurma(row.turma);
    if (!isValidSerieLabel(serie)) continue;
    const p = clampToNumber(row.proficiencia, 0);
    const cur = map.get(serie) ?? { sum: 0, n: 0 };
    cur.sum += p;
    cur.n += 1;
    map.set(serie, cur);
  }
  return Array.from(map.entries())
    .map(([label, v]) => ({ label, proficiencia: v.n > 0 ? v.sum / v.n : 0 }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }));
}

function buildProficiencyByDisciplinePorCategoria(
  relatorio: Partial<RelatorioCompleto> | null,
  axis: "escola" | "serie" | "turma",
  serieFilterLabel?: string
): ProficiencyByDisciplineByTurmaRow[] {
  const profDisc = relatorio?.proficiencia?.por_disciplina;
  if (!profDisc) return [];
  const geralKey = findGeralKey(profDisc) ?? "GERAL";

  return Object.entries(profDisc as AnyRecord)
    .filter(([k]) => normalizeText(k).toLowerCase() !== normalizeText(geralKey).toLowerCase())
    .map(([disciplina, dadosDisc]) => {
      const porTurma = (dadosDisc as AnyRecord)?.por_turma as Array<{ turma: string; proficiencia: number; serie?: string }>;
      const porEscola = (dadosDisc as AnyRecord)?.por_escola as Array<{ escola: string; proficiencia?: number; media?: number }>;
      if (axis === "escola" && porEscola?.length) {
        return {
          disciplina,
          valuesByTurma: porEscola.map((r) => ({
            turma: String(r.escola ?? "").trim(),
            proficiencia: clampToNumber(r.proficiencia ?? r.media, 0),
          })),
        };
      }
      const rows = (porTurma ?? []).filter((r) => {
        if (axis === "turma" && serieFilterLabel) {
          const s = String(r.serie ?? "").trim() || extractSerieFromTurma(r.turma);
          return normKey(s) === normKey(serieFilterLabel);
        }
        return true;
      });
      const valuesByTurma =
        axis === "serie"
          ? (() => {
              const m = new Map<string, { sum: number; n: number }>();
              for (const r of rows) {
                const lab = extractSerieFromTurma(r.turma);
                if (!isValidSerieLabel(lab)) continue;
                const cur = m.get(lab) ?? { sum: 0, n: 0 };
                cur.sum += clampToNumber(r.proficiencia, 0);
                cur.n += 1;
                m.set(lab, cur);
              }
              return Array.from(m.entries()).map(([turma, v]) => ({
                turma,
                proficiencia: v.n > 0 ? v.sum / v.n : 0,
              }));
            })()
          : rows.map((r) => ({
              turma: String(r.turma ?? "").trim(),
              proficiencia: clampToNumber(r.proficiencia, 0),
            }));
      return { disciplina, valuesByTurma };
    })
    .filter((d) => d.valuesByTurma.length > 0);
}

function buildNotasPorCategoriaFromRelatorio(
  relatorio: Partial<RelatorioCompleto> | null,
  axis: "escola" | "serie" | "turma",
  serieFilterLabel?: string
): NotaPorCategoriaDeck[] {
  const ng = relatorio?.nota_geral?.por_disciplina;
  if (!ng || typeof ng !== "object") return [];

  if (axis === "escola") {
    const geralKey = findGeralKey(ng) ?? Object.keys(ng)[0];
    const disc = (ng as AnyRecord)[geralKey] as { por_escola?: Array<{ escola: string; nota?: number; media?: number }> };
    const porEscola = disc?.por_escola ?? [];
    return porEscola
      .map((e) => ({
        label: String(e.escola ?? "").trim(),
        mediaNota: clampToNumber(e.nota ?? e.media, 0),
      }))
      .filter((r) => r.label.length > 0);
  }

  const outMap = new Map<string, { sum: number; n: number }>();
  for (const [, dadosDisc] of Object.entries(ng as AnyRecord)) {
    const porTurma = (dadosDisc as AnyRecord)?.por_turma as Array<{ turma: string; nota: number; serie?: string }>;
    for (const r of porTurma ?? []) {
      if (axis === "turma" && serieFilterLabel) {
        const s = String(r.serie ?? "").trim() || extractSerieFromTurma(r.turma);
        if (normKey(s) !== normKey(serieFilterLabel)) continue;
      }
      const lab =
        axis === "serie" ? extractSerieFromTurma(r.turma) : String(r.turma ?? "").trim();
      if (axis === "serie" && !isValidSerieLabel(lab)) continue;
      if (!lab) continue;
      const cur = outMap.get(lab) ?? { sum: 0, n: 0 };
      cur.sum += clampToNumber(r.nota, 0);
      cur.n += 1;
      outMap.set(lab, cur);
    }
  }
  return Array.from(outMap.entries())
    .map(([label, v]) => ({ label, mediaNota: v.n > 0 ? v.sum / v.n : 0 }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }));
}

function presenceFromNovaAvaliacoesMunicipio(nova: NovaRespostaAPI | null): PresenceBySeriesRow[] {
  const g = nova?.nivel_granularidade;
  const av = nova?.resultados_detalhados?.avaliacoes;
  if (g !== "municipio" || !av?.length) return [];
  return av
    .map((a) => {
      const label = String(a.escola ?? "").trim();
      const totalAlunos = clampToNumber(a.total_alunos, 0);
      const totalPresentes = clampToNumber(a.alunos_participantes, 0);
      const presencaMediaPct = totalAlunos > 0 ? (totalPresentes / totalAlunos) * 100 : 0;
      return {
        label: label || "—",
        totalAlunos,
        totalPresentes,
        presencaMediaPct,
        alunosFaltosos: Math.max(0, totalAlunos - totalPresentes),
      };
    })
    .filter((r) => r.label.length > 0);
}

function niveisFromNovaAvaliacoesEscola(nova: NovaRespostaAPI | null): NiveisBySeriesRow[] {
  const g = nova?.nivel_granularidade;
  const av = nova?.resultados_detalhados?.avaliacoes;
  if (g !== "municipio" || !av?.length) return [];
  return av
    .map((a) => {
      const label = String(a.escola ?? "").trim();
      const d = a.distribuicao_classificacao;
      const abaixoDoBasico = clampToNumber(d?.abaixo_do_basico, 0);
      const basico = clampToNumber(d?.basico, 0);
      const adequado = clampToNumber(d?.adequado, 0);
      const avancado = clampToNumber(d?.avancado, 0);
      const total = safeSum([abaixoDoBasico, basico, adequado, avancado]);
      return { label: label || "—", abaixoDoBasico, basico, adequado, avancado, total };
    })
    .filter((r) => r.label.length > 0);
}

function buildMetricsForAxis(
  axis: PresentationComparisonAxis,
  relatorio: Partial<RelatorioCompleto> | null,
  nova: NovaRespostaAPI | null,
  serieFilterLabel: string | undefined,
  turmaFilterLabel: string | undefined,
  alunosRanking: AlunoPresentationRow[] | null | undefined
): {
  presencaPorSerie: PresenceBySeriesRow[];
  niveisPorSerie: NiveisBySeriesRow[];
  proficienciaGeralPorTurma: ProficiencyGeneralByTurmaRow[];
  proficienciaPorDisciplinaPorTurma: ProficiencyByDisciplineByTurmaRow[];
  notasPorCategoria: NotaPorCategoriaDeck[];
} {
  if (axis === "escola") {
    let presenca = groupPresencePorEscola(relatorio);
    if (presenca.length === 0) presenca = presenceFromNovaAvaliacoesMunicipio(nova);
    if (presenca.length === 0) presenca = groupPresenceFromRelatorio(relatorio);

    let niveis = groupNiveisPorEscola(relatorio);
    if (niveis.length === 0) niveis = niveisFromNovaAvaliacoesEscola(nova);
    if (niveis.length === 0) {
      niveis = groupNiveisFromNova(nova, presenca[0]?.label ?? "GERAL");
    }
    if (niveis.length === 0) {
      const fakePresence = groupPresenceFromRelatorio(relatorio);
      const series = fakePresence.map((p) => p.label);
      niveis = groupNiveisFromRelatorio(relatorio, series.length ? series : ["GERAL"]);
    }

    let profGeral = buildProficiencyGeneralPorEscola(relatorio);
    if (profGeral.length === 0) {
      const fromNova = buildProficiencyGeneralByTurmaFromNova(nova);
      profGeral = fromNova.length > 0 ? fromNova : buildProficiencyGeneralPorSerieFromRelatorio(relatorio);
    }
    if (profGeral.length === 0) profGeral = buildProficiencyGeneralByTurma(relatorio);

    let profDisc = buildProficiencyByDisciplinePorCategoria(relatorio, "escola");
    if (profDisc.length === 0) profDisc = buildProficiencyByDisciplineByTurmaFromNova(nova);
    if (profDisc.length === 0) profDisc = buildProficiencyByDisciplineByTurma(relatorio);

    const notasCat = buildNotasPorCategoriaFromRelatorio(relatorio, "escola");

    return { presencaPorSerie: presenca, niveisPorSerie: niveis, proficienciaGeralPorTurma: profGeral, proficienciaPorDisciplinaPorTurma: profDisc, notasPorCategoria: notasCat };
  }

  if (axis === "serie") {
    let presenca = groupPresenceFromRelatorio(relatorio);
    if (presenca.length === 0) presenca = groupPresenceFromNova(nova, nova?.estatisticas_gerais?.serie ?? "GERAL");

    let niveis = buildLevelsBySeries(relatorio, presenca);
    if (niveis.length === 0) niveis = groupNiveisFromNova(nova, presenca[0]?.label ?? "GERAL");

    let profGeral = buildProficiencyGeneralPorSerieFromRelatorio(relatorio);
    if (profGeral.length === 0) profGeral = buildProficiencyGeneralByTurmaFromNova(nova);
    if (profGeral.length === 0) profGeral = buildProficiencyGeneralByTurma(relatorio);

    let profDisc = buildProficiencyByDisciplinePorCategoria(relatorio, "serie");
    if (profDisc.length === 0) profDisc = buildProficiencyByDisciplineByTurmaFromNova(nova);
    if (profDisc.length === 0) profDisc = buildProficiencyByDisciplineByTurma(relatorio);

    const notasCat = buildNotasPorCategoriaFromRelatorio(relatorio, "serie");

    return {
      presencaPorSerie: presenca,
      niveisPorSerie: niveis,
      proficienciaGeralPorTurma: profGeral,
      proficienciaPorDisciplinaPorTurma: profDisc,
      notasPorCategoria: notasCat,
    };
  }

  if (axis === "turma") {
    const presenca = groupPresencePorTurmaDireto(relatorio, serieFilterLabel);
    const niveis = groupNiveisPorTurmaDireto(relatorio, serieFilterLabel);
    let profGeral = (() => {
      const prof = relatorio?.proficiencia?.por_disciplina;
      if (!prof) return [] as ProficiencyGeneralByTurmaRow[];
      const geralKey = findGeralKey(prof) ?? "GERAL";
      const geral = (prof as AnyRecord)[geralKey] as { por_turma?: Array<{ turma: string; proficiencia: number; serie?: string }> };
      const rows = (geral?.por_turma ?? []).filter((r) => {
        if (!serieFilterLabel) return true;
        const s = String(r.serie ?? "").trim() || extractSerieFromTurma(r.turma);
        return normKey(s) === normKey(serieFilterLabel);
      });
      return rows
        .map((r) => ({ label: String(r.turma ?? "").trim(), proficiencia: clampToNumber(r.proficiencia, 0) }))
        .filter((r) => r.label.length > 0)
        .sort((a, b) => a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }));
    })();
    if (profGeral.length === 0) profGeral = buildProficiencyGeneralByTurmaFromNova(nova);
    if (profGeral.length === 0) profGeral = buildProficiencyGeneralByTurma(relatorio);

    let profDisc = buildProficiencyByDisciplinePorCategoria(relatorio, "turma", serieFilterLabel);
    if (profDisc.length === 0) profDisc = buildProficiencyByDisciplineByTurmaFromNova(nova);
    if (profDisc.length === 0) profDisc = buildProficiencyByDisciplineByTurma(relatorio);

    const notasCat = buildNotasPorCategoriaFromRelatorio(relatorio, "turma", serieFilterLabel);

    return {
      presencaPorSerie: presenca,
      niveisPorSerie: niveis,
      proficienciaGeralPorTurma: profGeral,
      proficienciaPorDisciplinaPorTurma: profDisc,
      notasPorCategoria: notasCat,
    };
  }

  // aluno
  const alunos = alunosRanking ?? [];
  const presencaSingle: PresenceBySeriesRow[] =
    alunos.length > 0
      ? [
          {
            label: turmaFilterLabel
              ? `${turmaFilterLabel} (${alunos.length} alunos)`
              : serieFilterLabel
                ? `${serieFilterLabel} (${alunos.length} alunos)`
                : `Turma (${alunos.length} alunos)`,
            totalAlunos: alunos.length,
            totalPresentes: alunos.length,
            presencaMediaPct: 100,
            alunosFaltosos: 0,
          },
        ]
      : groupPresenceFromNova(nova, nova?.estatisticas_gerais?.serie ?? "GERAL");

  const clsCount = { abaixo: 0, basico: 0, adequado: 0, avancado: 0 };
  for (const a of alunos) {
    const c = normalizeText(a.classificacao).toLowerCase();
    if (c.includes("abaixo")) clsCount.abaixo += 1;
    else if (c.includes("adequado")) clsCount.adequado += 1;
    else if (c.includes("avan")) clsCount.avancado += 1;
    else if (c.includes("basico") || c.includes("básico")) clsCount.basico += 1;
  }
  const niveis: NiveisBySeriesRow[] =
    alunos.length > 0
      ? [
          {
            label: "Distribuição (alunos)",
            abaixoDoBasico: clsCount.abaixo,
            basico: clsCount.basico,
            adequado: clsCount.adequado,
            avancado: clsCount.avancado,
            total: alunos.length,
          },
        ]
      : groupNiveisFromNova(nova, "GERAL");

  const profGeral: ProficiencyGeneralByTurmaRow[] = alunos.map((a) => ({
    label: a.nome,
    proficiencia: clampToNumber(a.proficiencia, 0),
  }));

  const profDisc = buildProficiencyByDisciplineByTurmaFromNova(nova);
  const notasCat: NotaPorCategoriaDeck[] = alunos.map((a) => ({
    label: a.nome,
    mediaNota: clampToNumber(a.nota, 0),
  }));

  return {
    presencaPorSerie: presencaSingle,
    niveisPorSerie: niveis,
    proficienciaGeralPorTurma: profGeral.length ? profGeral : buildProficiencyGeneralByTurmaFromNova(nova),
    proficienciaPorDisciplinaPorTurma: profDisc,
    notasPorCategoria: notasCat,
  };
}

function buildLevelGuideDescriptions(_serieNome?: string): Array<{ label: string; description: string; color: string }> {
  // Slide 8 exige textos do sistema (mesmas descrições padrão).
  // Aqui usamos as descrições curtas da camada de proficiência (já padronizadas no sistema).
  const colors = {
    avancado: "#166534",
    adequado: "#22C55E",
    basico: "#FACC15",
    abaixo_do_basico: "#EF4444",
  };

  const map: Array<{ level: ProficiencyLevel; label: string; color: string }> = [
    { level: "abaixo_do_basico", label: "ABAIXO DO BÁSICO", color: colors.abaixo_do_basico },
    { level: "basico", label: "BÁSICO", color: colors.basico },
    { level: "adequado", label: "ADEQUADO", color: colors.adequado },
    { level: "avancado", label: "AVANÇADO", color: colors.avancado },
  ];

  return map.map((m) => ({
    label: m.label,
    color: m.color,
    description: getProficiencyLevelDescription(m.level),
  }));
}

export function buildDeckDataForPresentation19Slides(args: BuildDeckDataArgs): Presentation19DeckData {
  const {
    mode,
    comparisonAxis,
    selectedSerieLabel,
    selectedTurmaLabel,
    relatorioDetalhado,
    novaRespostaAgregados,
    primaryColor,
    logoDataUrl,
    alunosRanking,
  } = args;

  const municipioNome =
    novaRespostaAgregados?.estatisticas_gerais?.municipio ??
    novaRespostaAgregados?.estatisticas_gerais?.estado ??
    "MUNICÍPIO";

  const avaliacaoNome =
    relatorioDetalhado?.avaliacao?.titulo ??
    novaRespostaAgregados?.estatisticas_gerais?.nome ??
    "AVALIAÇÃO";

  const escolasParticipantes = (() => {
    const names = new Set<string>();

    for (const row of relatorioDetalhado?.total_alunos?.por_escola ?? []) {
      const e = String(row.escola ?? "").trim();
      if (e) names.add(e);
    }

    const niveis = relatorioDetalhado?.niveis_aprendizagem;
    if (niveis && typeof niveis === "object") {
      for (const disc of Object.values(niveis)) {
        for (const row of disc?.por_escola ?? []) {
          const e = String(row.escola ?? "").trim();
          if (e) names.add(e);
        }
      }
    }

    const profPorDisc = relatorioDetalhado?.proficiencia?.por_disciplina;
    if (profPorDisc && typeof profPorDisc === "object") {
      for (const disc of Object.values(profPorDisc)) {
        for (const row of disc?.por_escola ?? []) {
          const e = String(row.escola ?? "").trim();
          if (e) names.add(e);
        }
      }
    }

    const notasPorDisc = relatorioDetalhado?.nota_geral?.por_disciplina;
    if (notasPorDisc && typeof notasPorDisc === "object") {
      for (const disc of Object.values(notasPorDisc)) {
        for (const row of disc?.por_escola ?? []) {
          const e = String(row.escola ?? "").trim();
          if (e) names.add(e);
        }
      }
    }

    for (const a of novaRespostaAgregados?.tabela_detalhada?.geral?.alunos ?? []) {
      const e = String((a as { escola?: string }).escola ?? "").trim();
      if (e) names.add(e);
    }

    for (const disc of novaRespostaAgregados?.tabela_detalhada?.disciplinas ?? []) {
      for (const a of disc.alunos ?? []) {
        const e = String((a as { escola?: string }).escola ?? "").trim();
        if (e) names.add(e);
      }
    }
    for (const r of novaRespostaAgregados?.ranking ?? []) {
      const e = String((r as { escola?: string }).escola ?? "").trim();
      if (e) names.add(e);
    }
    for (const a of novaRespostaAgregados?.resultados_detalhados?.avaliacoes ?? []) {
      const e = String(a.escola ?? "").trim();
      if (e) names.add(e);
    }

    return Array.from(names).sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
  })();

  const serieFromEstatisticas = String(novaRespostaAgregados?.estatisticas_gerais?.serie ?? "").trim();
  const serieFromAlunoGeral = String(novaRespostaAgregados?.tabela_detalhada?.geral?.alunos?.[0]?.serie ?? "").trim();
  const serieFromDisciplinaAluno = String(novaRespostaAgregados?.tabela_detalhada?.disciplinas?.[0]?.alunos?.[0]?.serie ?? "").trim();
  const serieHintBase = selectedSerieLabel || serieFromEstatisticas || serieFromAlunoGeral || serieFromDisciplinaAluno || "GERAL";

  const metrics = buildMetricsForAxis(
    comparisonAxis,
    relatorioDetalhado,
    novaRespostaAgregados,
    selectedSerieLabel,
    selectedTurmaLabel,
    alunosRanking
  );

  let presencaPorSerie = metrics.presencaPorSerie;
  if (presencaPorSerie.length === 0) {
    const a = groupPresenceFromRelatorio(relatorioDetalhado);
    const b = groupPresenceFromNova(novaRespostaAgregados, serieHintBase);
    const c = buildPresenceFinalFallback(relatorioDetalhado, novaRespostaAgregados, serieHintBase);
    presencaPorSerie = a.length > 0 ? a : b.length > 0 ? b : c;
  }

  let levelsPorSerie = metrics.niveisPorSerie;
  if (levelsPorSerie.length === 0) {
    levelsPorSerie = buildLevelsBySeries(relatorioDetalhado, presencaPorSerie);
  }
  if (levelsPorSerie.length === 0) {
    const serieHint =
      serieFromEstatisticas || serieFromAlunoGeral || presencaPorSerie[0]?.label || levelsPorSerie[0]?.label || "GERAL";
    levelsPorSerie = groupNiveisFromNova(novaRespostaAgregados, serieHint);
  }

  const totalAlunosParticiparam = pickAlunosParticipantes(mode, relatorioDetalhado, novaRespostaAgregados);

  const { curso, serie, turma } = buildCursoSerieTurma(relatorioDetalhado, presencaPorSerie, novaRespostaAgregados);

  let serieFinal = serieHintBase || serie;
  let cursoFinal = curso;
  const serieFromLevels = levelsPorSerie[0]?.label;
  if (isValidSerieLabel(serieFromLevels)) {
    serieFinal = serieFromLevels;
    const serieLower = serieFinal.toLowerCase();
    let inferredCurso = "Anos Iniciais";
    if (
      /\b(6|7|8|9)\b/.test(serieLower) ||
      serieLower.includes("em") ||
      serieLower.includes("medio") ||
      serieLower.includes("médio") ||
      serieLower.includes("ensino médio")
    ) {
      inferredCurso = "Anos Finais";
    }
    if (serieLower.includes("grupo")) inferredCurso = "Anos Iniciais";
    cursoFinal = inferredCurso;
  }

  let proficienciaGeralPorTurma = metrics.proficienciaGeralPorTurma;
  let proficienciaPorDisciplinaPorTurma = metrics.proficienciaPorDisciplinaPorTurma;
  if (proficienciaGeralPorTurma.length === 0) {
    const fromNova = buildProficiencyGeneralByTurmaFromNova(novaRespostaAgregados);
    proficienciaGeralPorTurma = fromNova.length > 0 ? fromNova : buildProficiencyGeneralByTurma(relatorioDetalhado);
  }
  if (proficienciaPorDisciplinaPorTurma.length === 0) {
    const fromNova = buildProficiencyByDisciplineByTurmaFromNova(novaRespostaAgregados);
    proficienciaPorDisciplinaPorTurma =
      fromNova.length > 0 ? fromNova : buildProficiencyByDisciplineByTurma(relatorioDetalhado);
  }

  const notasNova = buildNotasFromNova(novaRespostaAgregados);
  const notasRel = buildNotasFromRelatorio(relatorioDetalhado);
  const notasPorDisciplina = notasNova.porDisciplina.length > 0 ? notasNova.porDisciplina : notasRel.porDisciplina;
  const mediaNotaGeral = notasNova.geral ?? notasRel.geral;

  let notasPorCategoria = metrics.notasPorCategoria;
  if (notasPorCategoria.length === 0 && comparisonAxis !== "aluno") {
    notasPorCategoria = [];
  }

  const questoesTabelaGeralBase = flattenQuestions(relatorioDetalhado);
  const questoesTabelaGeral =
    questoesTabelaGeralBase.length > 0 ? questoesTabelaGeralBase : flattenQuestionsFromNova(novaRespostaAgregados);
  const habilidadePorQuestaoTurma = mergeHabilidadeMaps(
    buildQuestaoNumeroToHabilidadeMap(novaRespostaAgregados),
    buildQuestaoHabilidadeMapFromGeralRows(questoesTabelaGeral)
  );
  const questoesPorTurma = buildQuestoesPorTurmaFromNova(novaRespostaAgregados, habilidadePorQuestaoTurma);

  let turmasParticipantesCapa = collectTurmasParticipantes(
    relatorioDetalhado,
    novaRespostaAgregados,
    presencaPorSerie,
    proficienciaGeralPorTurma,
    comparisonAxis
  );
  if (turmasParticipantesCapa.length === 0 && alunosRanking?.length) {
    const s = new Set<string>();
    for (const a of alunosRanking) {
      const t = a.turma?.trim();
      if (t) s.add(t);
    }
    turmasParticipantesCapa = Array.from(s).sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
  }

  const turmaCapa =
    turmasParticipantesCapa.length > 0
      ? turmasParticipantesCapa.join(", ")
      : selectedTurmaLabel ||
        String(novaRespostaAgregados?.tabela_detalhada?.geral?.alunos?.[0]?.turma ?? "").trim() ||
        turma ||
        "N/A";
  const serieNomeCapas = serieFinal;
  const turmaNomeCapas = turmaCapa;

  const alunosDetalhados: AlunoPresentationRow[] = alunosRanking ?? [];

  warnIfProficiencyOutOfRange(serieFinal, proficienciaGeralPorTurma, proficienciaPorDisciplinaPorTurma);

  return {
    mode,
    comparisonAxis,
    municipioNome,
    avaliacaoNome,
    escolasParticipantes,

    totalAlunosParticiparam,

    curso: cursoFinal,
    serie: serieFinal,
    turma: turmaCapa,
    turmasParticipantesCapa,

    presencaPorSerie,
    niveisPorSerie: levelsPorSerie,

    proficienciaGeralPorTurma,
    proficienciaPorDisciplinaPorTurma,

    mediaNotaGeral,
    notasPorDisciplina,
    notasPorCategoria,

    alunosDetalhados,

    questoesTabelaGeral,
    questoesPorTurma,

    levelGuide: buildLevelGuideDescriptions(serieFinal),

    primaryColor,
    logoDataUrl,
    serieNomeCapas,
    turmaNomeCapas,
  };
}

export default buildDeckDataForPresentation19Slides;

