import type { Presentation19DeckData } from "@/types/presentation19-slides";
import type { ExportChart, Presentation19ExportSpec, Presentation19SlideSpec } from "@/types/presentation19-export-spec";
import { getProficiencyTableInfo } from "@/components/evaluations/results/utils/proficiency";
import { getSubjectPaletteIndex } from "@/utils/competition/competitionSubjectColors";
import { chunkPresentation19QuestionTableRows } from "@/utils/reports/presentation19/questionsTablePagination";

const levelColors = {
  abaixo_do_basico: "#EF4444",
  basico: "#FACC15",
  adequado: "#22C55E",
  avancado: "#166534",
} as const;

const disciplinePalette = ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#f43f5e", "#06b6d4", "#84cc16", "#d946ef"];

function buildLinearTicks(min: number, max: number, segments: number): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min || segments <= 0) return [min, max];
  const step = (max - min) / segments;
  const ticks: number[] = [];
  for (let i = 0; i <= segments; i++) {
    ticks.push(Number((min + step * i).toFixed(1)));
  }
  return ticks;
}

function clampToRange(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function buildPresenceChart(deckData: Presentation19DeckData): ExportChart {
  const totals = deckData.presencaPorSerie.map((r) => Math.max(0, Number(r.totalPresentes ?? 0)));
  const rawMax = Math.max(1, ...totals);
  const axisMax = rawMax <= 10 ? 10 : Math.ceil(rawMax / 5) * 5;

  return {
    type: "bar",
    categoryKey: "serie",
    valueKeys: [{ key: "total_presentes", label: "Alunos presentes", color: deckData.primaryColor }],
    data: deckData.presencaPorSerie.map((r) => ({
      serie: r.serie,
      total_presentes: Math.round(Math.max(0, Number(r.totalPresentes ?? 0))),
    })),
    yAxis: {
      min: 0,
      max: axisMax,
      ticks: Array.from({ length: 5 }, (_, i) => Math.round((axisMax * i) / 4)),
      scaleLabel: "alunos",
    },
  };
}

function buildLevelsChart(deckData: Presentation19DeckData): ExportChart {
  const totals = deckData.niveisPorSerie.reduce(
    (acc, r) => {
      acc.abaixo_do_basico += Number(r.abaixoDoBasico || 0);
      acc.basico += Number(r.basico || 0);
      acc.adequado += Number(r.adequado || 0);
      acc.avancado += Number(r.avancado || 0);
      return acc;
    },
    { abaixo_do_basico: 0, basico: 0, adequado: 0, avancado: 0 }
  );
  const maxByLevel = Math.max(1, totals.abaixo_do_basico, totals.basico, totals.adequado, totals.avancado);
  const maxRounded = maxByLevel <= 10 ? 10 : Math.ceil(maxByLevel / 5) * 5;

  return {
    type: "bar",
    orientation: "horizontal",
    categoryKey: "nivel",
    valueKeys: [
      { key: "valor", label: "Alunos", color: levelColors.adequado },
    ],
    data: [
      { nivel: "Abaixo do Básico", valor: clampToRange(totals.abaixo_do_basico, 0, maxRounded), color: levelColors.abaixo_do_basico },
      { nivel: "Básico", valor: clampToRange(totals.basico, 0, maxRounded), color: levelColors.basico },
      { nivel: "Adequado", valor: clampToRange(totals.adequado, 0, maxRounded), color: levelColors.adequado },
      { nivel: "Avançado", valor: clampToRange(totals.avancado, 0, maxRounded), color: levelColors.avancado },
    ],
    yAxis: {
      min: 0,
      max: maxRounded,
      ticks: buildLinearTicks(0, maxRounded, 4),
      scaleLabel: "alunos",
    },
  };
}

function buildGeneralProficiencyChart(deckData: Presentation19DeckData): ExportChart {
  const maxMath = getProficiencyTableInfo(deckData.serie, "Matemática").maxProficiency;
  const maxOutras = getProficiencyTableInfo(deckData.serie, "Português").maxProficiency;
  const yMax = Math.max(maxMath, maxOutras);

  return {
    type: "bar",
    categoryKey: "turma",
    valueKeys: [{ key: "proficiencia", label: "Proficiência", color: deckData.primaryColor }],
    data: deckData.proficienciaGeralPorTurma.map((r) => ({
      turma: r.turma,
      proficiencia: Number(clampToRange(r.proficiencia, 0, yMax).toFixed(1)),
    })),
    yAxis: {
      min: 0,
      max: yMax,
      ticks: buildLinearTicks(0, yMax, 4),
    },
  };
}

export function buildSlideSpec(deckData: Presentation19DeckData): Presentation19ExportSpec {
  const slide13Charts = deckData.proficienciaPorDisciplinaPorTurma
    .map((disciplina) => {
      const paletteIdx = getSubjectPaletteIndex(disciplina.disciplina, disciplina.disciplina);
      const yMax = getProficiencyTableInfo(deckData.serie, disciplina.disciplina).maxProficiency;
      return {
      title: disciplina.disciplina,
      chart: {
        type: "bar" as const,
        categoryKey: "turma",
        valueKeys: [
          {
            key: "proficiencia",
            label: "Proficiência",
              color: disciplinePalette[paletteIdx % disciplinePalette.length],
          },
        ],
        data: disciplina.valuesByTurma.map((v) => ({
          turma: v.turma,
          proficiencia: Number(clampToRange(v.proficiencia, 0, yMax).toFixed(1)),
        })),
          yAxis: {
            min: 0,
            max: yMax,
            ticks: buildLinearTicks(0, yMax, 4),
          },
      },
      };
    })
    .slice(0, 4);

  const questaoRows = deckData.questoesTabela.map((q) => [
    q.questao,
    q.habilidade,
    `${q.percentualAcertos.toFixed(1).replace(".", ",")}%`,
  ]);
  const questionChunks = chunkPresentation19QuestionTableRows(questaoRows);
  const firstQuestionsSlideIndex = 18;
  const questionSlides: Presentation19SlideSpec[] = questionChunks.map((rows, pageIdx) => ({
    index: firstQuestionsSlideIndex + pageIdx,
    kind: "questions-table" as const,
    table: {
      columns: ["Questão", "Habilidade", "% Acertos"],
      rows,
    },
    ...(questionChunks.length > 1
      ? { questionsPage: { current: pageIdx + 1, total: questionChunks.length } }
      : {}),
  }));
  const thankYouIndex = firstQuestionsSlideIndex + questionSlides.length;

  const slides: Presentation19SlideSpec[] = [
    { index: 1, kind: "cover-main" },
    { index: 2, kind: "cover-school" },
    { index: 3, kind: "metric-total-students" },
    { index: 4, kind: "cover-segment" },
    {
      index: 5,
      kind: "presence-table",
      table: {
        columns: ["Série", "Total de Alunos", "Total de Presentes", "Presença Média (%)", "Alunos Faltosos"],
        rows: deckData.presencaPorSerie.map((r) => [
          r.serie,
          r.totalAlunos,
          r.totalPresentes,
          `${r.presencaMediaPct.toFixed(1).replace(".", ",")}%`,
          r.alunosFaltosos,
        ]),
      },
    },
    { index: 6, kind: "presence-chart", chart: buildPresenceChart(deckData) },
    { index: 7, kind: "section-levels" },
    { index: 8, kind: "levels-guide" },
    { index: 9, kind: "levels-chart", chart: buildLevelsChart(deckData) },
    {
      index: 10,
      kind: "levels-table",
      table: {
        columns: ["Série", "Abaixo do Básico", "Básico", "Adequado", "Avançado"],
        rows: deckData.niveisPorSerie.map((r) => [r.serie, r.abaixoDoBasico, r.basico, r.adequado, r.avancado]),
      },
    },
    { index: 11, kind: "section-proficiency" },
    { index: 12, kind: "proficiency-general-chart", chart: buildGeneralProficiencyChart(deckData) },
    { index: 13, kind: "proficiency-by-discipline-chart", charts: slide13Charts },
    {
      index: 14,
      kind: "projection-table",
      table: {
        columns: [
          "Proficiência da Disciplina",
          "Projeção +20% (teto)",
          "Proficiência Geral",
          "Projeção Geral +20% (teto)",
        ],
        rows: deckData.projeccaoTabela.map((r) => [
          `${r.disciplina}: ${r.proficienciaDisciplina.toFixed(1)}`,
          r.projPlus20Disciplina.toFixed(1),
          r.proficienciaGeral.toFixed(1),
          r.projPlus20Geral.toFixed(1),
        ]),
      },
    },
    { index: 15, kind: "section-questions" },
    { index: 16, kind: "dynamic-series-cover" },
    { index: 17, kind: "dynamic-class-cover" },
    ...questionSlides,
    { index: thankYouIndex, kind: "thank-you" },
  ];

  return { deckData, slides };
}
