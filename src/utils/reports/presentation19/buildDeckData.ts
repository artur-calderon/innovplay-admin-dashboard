import type { RelatorioCompleto } from "@/types/evaluation-results";
import type { NovaRespostaAPI } from "@/services/evaluation/evaluationResultsApi";
import type {
  BuildDeckDataArgs,
  NiveisBySeriesRow,
  PresenceBySeriesRow,
  ProficiencyByDisciplineByTurmaRow,
  ProficiencyGeneralByTurmaRow,
  ProjectionTableRow,
  Presentation19DeckData,
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
    faltosos?: number;
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
    const faltosos = clampToNumber(row.faltosos, Math.max(0, matriculados - avaliados));
    const presencaMediaPct = matriculados > 0 ? (avaliados / matriculados) * 100 : 0;

    const cur = map.get(serie);
    if (!cur) {
      map.set(serie, {
        serie,
        totalAlunos: matriculados,
        totalPresentes: avaliados,
        presencaMediaPct,
        alunosFaltosos: faltosos,
        turmaLabel,
      });
      continue;
    }

    const totalAlunos = cur.totalAlunos + matriculados;
    const totalPresentes = cur.totalPresentes + avaliados;
    const alunosFaltosos = cur.alunosFaltosos + faltosos;
    const presencaMediaPctAtualizada = totalAlunos > 0 ? (totalPresentes / totalAlunos) * 100 : 0;

    map.set(serie, { ...cur, totalAlunos, totalPresentes, presencaMediaPct: presencaMediaPctAtualizada, alunosFaltosos });
  }

  return Array.from(map.values()).sort((a, b) => a.serie.localeCompare(b.serie, "pt-BR", { sensitivity: "base" }));
}

function groupPresenceFromNova(novaRespostaAgregados: NovaRespostaAPI | null, serieFallback?: string): PresenceBySeriesRow[] {
  if (!novaRespostaAgregados?.estatisticas_gerais) return [];
  const eg = novaRespostaAgregados.estatisticas_gerais;
  const serie = String(eg.serie ?? "").trim();
  const serieResolved = isValidSerieLabel(serie) ? serie : (isValidSerieLabel(serieFallback) ? String(serieFallback).trim() : "GERAL");

  const totalAlunos = clampToNumber(eg.total_alunos, 0);
  const totalPresentes = clampToNumber(eg.alunos_participantes, 0);
  const alunosFaltosos = clampToNumber(eg.alunos_ausentes, Math.max(0, totalAlunos - totalPresentes));
  const presencaMediaPct = totalAlunos > 0 ? (totalPresentes / totalAlunos) * 100 : 0;

  return [
    {
      serie: serieResolved,
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
  const totalAlunos =
    clampToNumber(relatorio?.total_alunos?.total_geral?.matriculados, NaN) ||
    clampToNumber(novaRespostaAgregados?.estatisticas_gerais?.total_alunos, 0);
  const totalPresentes =
    clampToNumber(relatorio?.total_alunos?.total_geral?.avaliados, NaN) ||
    clampToNumber(novaRespostaAgregados?.estatisticas_gerais?.alunos_participantes, 0);
  const alunosFaltosos =
    clampToNumber(novaRespostaAgregados?.estatisticas_gerais?.alunos_ausentes, Math.max(0, totalAlunos - totalPresentes));
  const serie = isValidSerieLabel(serieFallback) ? String(serieFallback).trim() : "GERAL";

  // Se não há nenhuma base numérica, não inventar linha.
  if (!Number.isFinite(totalAlunos) || totalAlunos <= 0) return [];

  return [
    {
      serie,
      totalAlunos,
      totalPresentes,
      presencaMediaPct: totalAlunos > 0 ? (totalPresentes / totalAlunos) * 100 : 0,
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
        serie: series[0] ?? "N/A",
        abaixoDoBasico: clampToNumber(totalGeral.abaixo_do_basico),
        basico: clampToNumber(totalGeral.basico),
        adequado: clampToNumber(totalGeral.adequado),
        avancado: clampToNumber(totalGeral.avancado),
        total: clampToNumber(totalGeral.total, 0),
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
      map.set(serie, { serie, abaixoDoBasico, basico, adequado, avancado, total });
      continue;
    }

    const next: NiveisBySeriesRow = {
      serie,
      abaixoDoBasico: cur.abaixoDoBasico + abaixoDoBasico,
      basico: cur.basico + basico,
      adequado: cur.adequado + adequado,
      avancado: cur.avancado + avancado,
      total: cur.total + total,
    };
    map.set(serie, next);
  }

  return Array.from(map.values()).sort((a, b) => a.serie.localeCompare(b.serie, "pt-BR", { sensitivity: "base" }));
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

  return [{ serie, abaixoDoBasico, basico, adequado, avancado, total }];
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
      turma: String(r.turma ?? "").trim(),
      proficiencia: clampToNumber(r.proficiencia, 0),
    }))
    .filter((r) => r.turma !== "")
    .sort((a, b) => a.turma.localeCompare(b.turma, "pt-BR", { sensitivity: "base" }));
}

function buildProficiencyGeneralByTurmaFromNova(novaRespostaAgregados: NovaRespostaAPI | null): ProficiencyGeneralByTurmaRow[] {
  if (!novaRespostaAgregados) return [];
  // Usar apenas métrica oficial do backend, sem recálculo por alunos.
  const mediaGeral = clampToNumber(novaRespostaAgregados.estatisticas_gerais?.media_proficiencia_geral, NaN);
  return Number.isFinite(mediaGeral) ? [{ turma: "GERAL", proficiencia: mediaGeral }] : [];
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
        turma: row.turma,
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

function buildProjectionTable(relatorio: Partial<RelatorioCompleto> | null, serieHint: string): ProjectionTableRow[] {
  const profDisc = relatorio?.proficiencia?.por_disciplina;
  if (!profDisc) return [];

  const geralKey = findGeralKey(profDisc) ?? "GERAL";
  type GeralProficiencia = { media_geral?: number };
  const geral = (profDisc as AnyRecord)[geralKey] as GeralProficiencia | undefined;
  const proficienciaGeral = clampToNumber(geral?.media_geral, 0);

  const entries = Object.entries(profDisc as AnyRecord).filter(([k]) => normalizeText(k).toLowerCase() !== normalizeText(geralKey).toLowerCase());

  return entries
    .map(([disciplina, dadosDisc]) => {
      const profDisciplina = clampToNumber((dadosDisc as AnyRecord)?.media_geral, 0);
      const tableInfoDisc = getProficiencyTableInfo(serieHint, disciplina);
      const maxDisc = tableInfoDisc.maxProficiency;

      const tableInfoGeral = getProficiencyTableInfo(serieHint, disciplina);
      const maxGeral = tableInfoGeral.maxProficiency;

      const projPlus20Disciplina = Math.min(proDisciplinaSafe(profDisciplina * 1.2), maxDisc);
      const projPlus20Geral = Math.min(proDisciplinaSafe(proficienciaGeral * 1.2), maxGeral);

      return {
        disciplina,
        proficienciaDisciplina: profDisciplina,
        projPlus20Disciplina,
        proficienciaGeral,
        projPlus20Geral,
      };
    })
    .filter((r) => Number.isFinite(r.projPlus20Disciplina) || Number.isFinite(r.projPlus20Geral));
}

function buildProjectionTableFromNova(novaRespostaAgregados: NovaRespostaAPI | null, serieHint: string): ProjectionTableRow[] {
  if (!novaRespostaAgregados?.resultados_por_disciplina?.length) return [];
  const proficienciaGeral = clampToNumber(novaRespostaAgregados.estatisticas_gerais?.media_proficiencia_geral, 0);

  return novaRespostaAgregados.resultados_por_disciplina
    .map((d) => {
      const disciplina = String(d.disciplina ?? "").trim();
      if (!disciplina) return null;
      const proficienciaDisciplina = clampToNumber(d.media_proficiencia, 0);
      const maxDisc = getProficiencyTableInfo(serieHint, disciplina).maxProficiency;
      const maxGeral = getProficiencyTableInfo(serieHint, disciplina).maxProficiency;
      return {
        disciplina,
        proficienciaDisciplina,
        projPlus20Disciplina: Math.min(proDisciplinaSafe(proficienciaDisciplina * 1.2), maxDisc),
        proficienciaGeral,
        projPlus20Geral: Math.min(proDisciplinaSafe(proficienciaGeral * 1.2), maxGeral),
      };
    })
    .filter((r): r is ProjectionTableRow => Boolean(r));
}

function proDisciplinaSafe(n: number): number {
  return Number.isFinite(n) ? n : 0;
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

  // reduzir para manter slide 18 legível
  const maxRows = 18;
  return questoesFlat.slice(0, maxRows).map((r) => ({
    ...r,
    percentualAcertos: Math.round(r.percentualAcertos * 10) / 10,
  }));
}

function flattenQuestionsFromNova(novaRespostaAgregados: NovaRespostaAPI | null): SlideQuestionRow[] {
  if (!novaRespostaAgregados) return [];

  const alunos = (novaRespostaAgregados.tabela_detalhada?.geral?.alunos ?? []) as Array<{
    respostas_por_questao?: Array<{ questao?: number; acertou?: boolean }>;
  }>;
  if (alunos.length === 0) return [];

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
    .slice(0, 18)
    .map(([questao, v]) => ({
      questao,
      habilidade: "Questão",
      percentualAcertos: v.total > 0 ? Math.round((v.acertos / v.total) * 1000) / 10 : 0,
    }));
}

function buildCursoSerieTurma(
  relatorio: Partial<RelatorioCompleto> | null,
  deckPresence: PresenceBySeriesRow[],
  novaRespostaAgregados: NovaRespostaAPI | null
): { curso: string; serie: string; turma: string } {
  const serie = deckPresence[0]?.serie ?? "N/A";
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

function buildLevelsBySeries(relatorio: Partial<RelatorioCompleto> | null, presenceSeries: PresenceBySeriesRow[]): NiveisBySeriesRow[] {
  if (!relatorio) return [];
  const series = presenceSeries.map((s) => s.serie);
  return groupNiveisFromRelatorio(relatorio, series);
}

function buildLevelGuideDescriptions(serieNome?: string): Array<{ label: string; description: string; color: string }> {
  // Slide 8 exige textos do sistema (mesmas descrições padrão).
  // Aqui usamos as descrições curtas da camada de proficiência (já padronizadas no sistema).
  const colors = {
    avancado: "#166534",
    adequado: "#22C55E",
    basico: "#FACC15",
    abaixo_do_basico: "#EF4444",
  };

  const map: Array<{ level: ProficiencyLevel; label: string; color: string }> = [
    { level: "avancado", label: "AVANÇADO", color: colors.avancado },
    { level: "adequado", label: "ADEQUADO", color: colors.adequado },
    { level: "basico", label: "BÁSICO", color: colors.basico },
    { level: "abaixo_do_basico", label: "ABAIXO DO BÁSICO", color: colors.abaixo_do_basico },
  ];

  return map.map((m) => ({
    label: m.label,
    color: m.color,
    description: getProficiencyLevelDescription(m.level),
  }));
}

export function buildDeckDataForPresentation19Slides(args: BuildDeckDataArgs): Presentation19DeckData {
  const { mode, relatorioDetalhado, novaRespostaAgregados, primaryColor, logoDataUrl } = args;

  const municipioNome =
    novaRespostaAgregados?.estatisticas_gerais?.municipio ??
    novaRespostaAgregados?.estatisticas_gerais?.estado ??
    "MUNICÍPIO";

  const avaliacaoNome =
    relatorioDetalhado?.avaliacao?.titulo ??
    novaRespostaAgregados?.estatisticas_gerais?.nome ??
    "AVALIAÇÃO";

  const escolasParticipantes = (() => {
    const fromNova = novaRespostaAgregados?.tabela_detalhada?.disciplinas ?? [];
    const names = new Set<string>();
    for (const disc of fromNova) {
      for (const a of disc.alunos ?? []) {
        const e = String(a.escola ?? "").trim();
        if (e) names.add(e);
      }
    }
    // fallback via ranking da avaliação
    for (const r of novaRespostaAgregados?.ranking ?? []) {
      const e = String(r.escola ?? "").trim();
      if (e) names.add(e);
    }
    // fallback via linha de detalhe
    for (const a of novaRespostaAgregados?.resultados_detalhados?.avaliacoes ?? []) {
      const e = String(a.escola ?? "").trim();
      if (e) names.add(e);
    }
    // fallback mínimo
    if (names.size === 0) {
      const row = relatorioDetalhado?.total_alunos?.por_escola?.[0];
      if (row?.escola) names.add(String(row.escola));
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
  })();

  const totalAlunosParticiparam =
    clampToNumber(relatorioDetalhado?.total_alunos?.total_geral?.avaliados, 0) ||
    clampToNumber(novaRespostaAgregados?.estatisticas_gerais?.alunos_participantes, 0);

  const serieFromEstatisticas = String(novaRespostaAgregados?.estatisticas_gerais?.serie ?? "").trim();
  const serieFromAlunoGeral = String(novaRespostaAgregados?.tabela_detalhada?.geral?.alunos?.[0]?.serie ?? "").trim();
  const serieFromDisciplinaAluno = String(novaRespostaAgregados?.tabela_detalhada?.disciplinas?.[0]?.alunos?.[0]?.serie ?? "").trim();
  const serieHintBase = serieFromEstatisticas || serieFromAlunoGeral || serieFromDisciplinaAluno || "GERAL";

  const presencaPorSerieRelatorio = groupPresenceFromRelatorio(relatorioDetalhado);
  const presencaPorSerieNova = groupPresenceFromNova(novaRespostaAgregados, serieHintBase);
  const presencaPorSerieFallbackFinal = buildPresenceFinalFallback(relatorioDetalhado, novaRespostaAgregados, serieHintBase);
  const presencaPorSerie =
    presencaPorSerieRelatorio.length > 0
      ? presencaPorSerieRelatorio
      : presencaPorSerieNova.length > 0
        ? presencaPorSerieNova
        : presencaPorSerieFallbackFinal;
  const levelsPorSerieRelatorio = buildLevelsBySeries(relatorioDetalhado, presencaPorSerie);
  const serieHint = serieFromEstatisticas || serieFromAlunoGeral || presencaPorSerie[0]?.serie || levelsPorSerieRelatorio[0]?.serie || "GERAL";
  const levelsPorSerieNova = groupNiveisFromNova(novaRespostaAgregados, serieHint);
  const levelsPorSerie = levelsPorSerieRelatorio.length > 0 ? levelsPorSerieRelatorio : levelsPorSerieNova;

  const { curso, serie, turma } = buildCursoSerieTurma(relatorioDetalhado, presencaPorSerie, novaRespostaAgregados);

  // Ajuste para o Slide 1:
  // Em alguns payloads, `total_alunos.por_turma.turma` vem apenas com a letra (ex.: "A"),
  // enquanto `niveis_aprendizagem.por_turma.turma` traz a série/ano (ex.: "4º Ano A").
  // Para a "SÉRIE" do deck, preferimos `levelsPorSerie[0].serie`.
  let serieFinal = serieHint || serie;
  let cursoFinal = curso;
  const serieFromLevels = levelsPorSerie[0]?.serie;
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

  const proficienciaGeralPorTurmaBase = buildProficiencyGeneralByTurma(relatorioDetalhado);
  const proficienciaGeralPorTurmaFromNova = buildProficiencyGeneralByTurmaFromNova(novaRespostaAgregados);
  const proficienciaGeralPorTurma =
    proficienciaGeralPorTurmaFromNova.length > 0 ? proficienciaGeralPorTurmaFromNova : proficienciaGeralPorTurmaBase;
  const proficienciaPorDisciplinaPorTurmaBase = buildProficiencyByDisciplineByTurma(relatorioDetalhado);
  const proficienciaPorDisciplinaPorTurmaFromNova = buildProficiencyByDisciplineByTurmaFromNova(novaRespostaAgregados);
  const proficienciaPorDisciplinaPorTurma =
    proficienciaPorDisciplinaPorTurmaFromNova.length > 0
      ? proficienciaPorDisciplinaPorTurmaFromNova
      : proficienciaPorDisciplinaPorTurmaBase;
  const projeccaoTabelaRelatorio = buildProjectionTable(relatorioDetalhado, serieHint);
  const projeccaoTabela =
    projeccaoTabelaRelatorio.length > 0 ? projeccaoTabelaRelatorio : buildProjectionTableFromNova(novaRespostaAgregados, serieHint);

  const questoesTabelaBase = flattenQuestions(relatorioDetalhado);
  const questoesTabela = questoesTabelaBase.length > 0 ? questoesTabelaBase : flattenQuestionsFromNova(novaRespostaAgregados);

  const serieNomeCapas = serieFinal;
  const turmaNomeCapas = turma;

  warnIfProficiencyOutOfRange(serieFinal, proficienciaGeralPorTurma, proficienciaPorDisciplinaPorTurma);

  return {
    mode,
    municipioNome,
    avaliacaoNome,
    escolasParticipantes,

    totalAlunosParticiparam,

    curso: cursoFinal,
    serie: serieFinal,
    turma,

    presencaPorSerie,
    niveisPorSerie: levelsPorSerie,

    proficienciaGeralPorTurma,
    proficienciaPorDisciplinaPorTurma,
    projeccaoTabela,

    questoesTabela,

    levelGuide: buildLevelGuideDescriptions(serieFinal),

    primaryColor,
    logoDataUrl,
    serieNomeCapas,
    turmaNomeCapas,
  };
}

export default buildDeckDataForPresentation19Slides;

