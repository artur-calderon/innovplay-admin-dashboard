import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  Cell,
  LabelList,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from "recharts";
import type { Presentation19DeckData, NiveisBySeriesRow } from "@/types/presentation19-slides";
import { getProficiencyTableInfo } from "@/components/evaluations/results/utils/proficiency";
import { getSubjectPaletteIndex } from "@/utils/competition/competitionSubjectColors";

type SlideFrameProps = {
  children: React.ReactNode;
  primaryColor: string;
  logoDataUrl?: string;
};

function formatPct(n: number): string {
  if (!Number.isFinite(n)) return "0%";
  const rounded = Math.round(n * 10) / 10;
  return `${rounded.toFixed(1).replace(".", ",")}%`;
}

function linearTicks(min: number, max: number, segments = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return [min, max];
  const step = (max - min) / segments;
  return Array.from({ length: segments + 1 }, (_, i) => Number((min + i * step).toFixed(1)));
}

function clampToRange(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function SlideFrame({ children, primaryColor, logoDataUrl }: SlideFrameProps) {
  return (
    <div
      data-slide-frame
      className="bg-zinc-200 text-zinc-900 relative overflow-hidden border border-zinc-300"
      style={{
        width: 1123,
        height: 793,
        borderRadius: 16,
        boxShadow: "0 18px 50px rgba(2,6,23,0.12)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          backgroundImage: `
            repeating-linear-gradient(90deg, rgba(15,23,42,0.06) 0 1px, transparent 1px 56px),
            repeating-linear-gradient(0deg, rgba(15,23,42,0.05) 0 1px, transparent 1px 56px)
          `,
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 10,
          backgroundColor: primaryColor,
        }}
      />

      {logoDataUrl && (
        <img
          src={logoDataUrl}
          alt="Logo"
          crossOrigin="anonymous"
          style={{
            position: "absolute",
            top: 18,
            right: 24,
            width: 86,
            height: "auto",
            objectFit: "contain",
          }}
        />
      )}

      <div className="absolute inset-0 px-10 py-14">{children}</div>
    </div>
  );
}

function SlideTitle({ title, primaryColor }: { title: string; primaryColor: string }) {
  return (
    <div className="flex items-center gap-4">
      <div
        style={{
          width: 12,
          height: 38,
          backgroundColor: primaryColor,
          borderRadius: 999,
        }}
      />
      <h2 className="text-3xl font-extrabold tracking-wide text-zinc-900">{title}</h2>
    </div>
  );
}

function SimpleTable({
  columns,
  rows,
  accentColor: _accentColor,
}: {
  columns: string[];
  rows: Array<Array<React.ReactNode>>;
  accentColor?: string;
}) {
  return (
    <div className="rounded-2xl overflow-hidden border border-zinc-300">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-zinc-100">
            {columns.map((c) => (
              <th
                key={c}
                className="border-b border-zinc-300 px-3 py-2 text-left text-sm font-semibold text-zinc-700"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-zinc-50/60"}>
              {r.map((cell, i) => (
                <td key={i} className="border-b border-zinc-300 px-3 py-2 text-sm text-zinc-800">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Presentation19SlidesDeck({ deckData }: { deckData: Presentation19DeckData }) {
  const QUESTIONS_PER_PAGE = 17;
  const fixedLevelColors = useMemo(
    () => ({
      abaixo: "#EF4444", // Vermelho
      basico: "#FACC15", // Amarelo
      adequado: "#22C55E", // Verde
      avancado: "#166534", // Verde escuro
    }),
    []
  );

  const presenceRows = deckData.presencaPorSerie;
  const niveisRows = deckData.niveisPorSerie;

  const levelsChartData = useMemo(() => {
    const totals = niveisRows.reduce(
      (acc, r: NiveisBySeriesRow) => {
        acc.abaixo += Number(r.abaixoDoBasico || 0);
        acc.basico += Number(r.basico || 0);
        acc.adequado += Number(r.adequado || 0);
        acc.avancado += Number(r.avancado || 0);
        return acc;
      },
      { abaixo: 0, basico: 0, adequado: 0, avancado: 0 }
    );

    return [
      { nivel: "Abaixo do Básico", valor: totals.abaixo, color: fixedLevelColors.abaixo },
      { nivel: "Básico", valor: totals.basico, color: fixedLevelColors.basico },
      { nivel: "Adequado", valor: totals.adequado, color: fixedLevelColors.adequado },
      { nivel: "Avançado", valor: totals.avancado, color: fixedLevelColors.avancado },
    ];
  }, [niveisRows, fixedLevelColors]);

  const levelsAxisMax = useMemo(() => {
    const maxByLevel = Math.max(
      1,
      ...levelsChartData.map((r) => Number(r.valor || 0))
    );
    return maxByLevel <= 10 ? 10 : Math.ceil(maxByLevel / 5) * 5;
  }, [levelsChartData]);

  const generalProfAxisMax = useMemo(() => {
    const maxMath = getProficiencyTableInfo(deckData.serie, "Matemática").maxProficiency;
    const maxOutras = getProficiencyTableInfo(deckData.serie, "Português").maxProficiency;
    return Math.max(maxMath, maxOutras);
  }, [deckData.serie]);

  const presenceChartData = useMemo(() => {
    return presenceRows.map((r) => ({
      serie: r.serie,
      presenca_media_pct: clampToRange(r.presencaMediaPct, 0, 100),
    }));
  }, [presenceRows]);

  const profGeneralData = useMemo(() => {
    const maxMath = getProficiencyTableInfo(deckData.serie, "Matemática").maxProficiency;
    const maxOutras = getProficiencyTableInfo(deckData.serie, "Português").maxProficiency;
    const axisMax = Math.max(maxMath, maxOutras);
    return deckData.proficienciaGeralPorTurma.map((r) => ({
      turma: r.turma,
      proficiencia: clampToRange(r.proficiencia, 0, axisMax),
    }));
  }, [deckData.proficienciaGeralPorTurma, deckData.serie]);

  const profByDiscSeparate = useMemo(() => {
    return deckData.proficienciaPorDisciplinaPorTurma
      .map((d) => ({
        disciplina: d.disciplina,
        data: d.valuesByTurma
          .map((v) => ({
            turma: v.turma,
            proficiencia: clampToRange(
              v.proficiencia,
              0,
              getProficiencyTableInfo(deckData.serie, d.disciplina).maxProficiency
            ),
          }))
          .sort((a, b) => a.turma.localeCompare(b.turma, "pt-BR", { sensitivity: "base" })),
      }))
      .filter((d) => d.data.length > 0);
  }, [deckData.proficienciaPorDisciplinaPorTurma, deckData.serie]);

  const disciplinePalette = useMemo(
    () => [
      "#f59e0b", // amber-500
      "#10b981", // emerald-500
      "#3b82f6", // blue-500
      "#8b5cf6", // violet-500
      "#f43f5e", // rose-500
      "#06b6d4", // cyan-500
      "#84cc16", // lime-500
      "#d946ef", // fuchsia-500
    ],
    []
  );

  const levelGuide = deckData.levelGuide ?? [
    { label: "AVANÇADO", description: "", color: fixedLevelColors.avancado },
    { label: "ADEQUADO", description: "", color: fixedLevelColors.adequado },
    { label: "BÁSICO", description: "", color: fixedLevelColors.basico },
    { label: "ABAIXO DO BÁSICO", description: "", color: fixedLevelColors.abaixo },
  ];

  const questoesChunks = useMemo(() => {
    const rows = deckData.questoesTabela ?? [];
    if (rows.length === 0) return [[]];
    const pages: Array<typeof rows> = [];
    for (let i = 0; i < rows.length; i += QUESTIONS_PER_PAGE) {
      pages.push(rows.slice(i, i + QUESTIONS_PER_PAGE));
    }
    return pages;
  }, [deckData.questoesTabela]);

  const firstQuestionsSlideIndex = 18;
  const thanksSlideIndex = firstQuestionsSlideIndex + questoesChunks.length;

  return (
    <div data-presentation19-root className="space-y-6">
      {/* Slide 1 */}
      <div data-slide-index={1}>
        <SlideFrame primaryColor={deckData.primaryColor} logoDataUrl={deckData.logoDataUrl}>
          <div className="flex flex-col h-full justify-between">
            <div className="pt-10">
              <h1
                className="text-6xl font-black tracking-tight leading-tight break-words"
                style={{ color: deckData.primaryColor }}
              >
                {deckData.avaliacaoNome}
              </h1>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6">
              <div className="text-sm text-zinc-500 font-semibold">MUNICÍPIO</div>
              <div className="text-2xl font-extrabold">{deckData.municipioNome}</div>
              <div className="h-2" />
              <div className="text-sm text-zinc-500 font-semibold">SÉRIE</div>
              <div className="text-2xl font-extrabold">{deckData.serie}</div>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span className="font-semibold">AFIRME EDUCACIONAL</span>
              <span>
                {deckData.mode === "answer_sheet" ? "Cartão-resposta" : "Avaliações"}
              </span>
            </div>
          </div>
        </SlideFrame>
      </div>

      {/* Slide 2 */}
      <div data-slide-index={2}>
        <SlideFrame primaryColor={deckData.primaryColor} logoDataUrl={deckData.logoDataUrl}>
          <div className="h-full flex flex-col">
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl font-black text-zinc-900">
                  {deckData.escolasParticipantes.length <= 1
                    ? deckData.escolasParticipantes[0] ?? "N/A"
                    : deckData.escolasParticipantes[0]}
                  {deckData.escolasParticipantes.length > 1 && (
                    <span className="text-zinc-600 font-bold"> +{deckData.escolasParticipantes.length - 1}</span>
                  )}
                </div>

                {deckData.escolasParticipantes.length > 1 && (
                  <div className="mt-6 text-sm text-zinc-600">
                    Participantes: {deckData.escolasParticipantes.slice(0, 6).join(", ")}
                    {deckData.escolasParticipantes.length > 6 ? "..." : ""}
                  </div>
                )}
              </div>
            </div>

            <div className="text-xs text-zinc-500">
              Seleção aplicada{" "}
              <span className="font-semibold" style={{ color: deckData.primaryColor }}>
                {deckData.mode === "answer_sheet" ? "Cartão resposta" : "Avaliações"}
              </span>
            </div>
          </div>
        </SlideFrame>
      </div>

      {/* Slide 3 */}
      <div data-slide-index={3}>
        <SlideFrame primaryColor={deckData.primaryColor} logoDataUrl={deckData.logoDataUrl}>
          <div className="h-full flex items-center justify-center flex-col">
            <div className="text-2xl font-extrabold text-zinc-700">MÉTRICA GERAL</div>
            <div className="mt-4 text-7xl font-black" style={{ color: deckData.primaryColor }}>
              {Math.round(deckData.totalAlunosParticiparam).toLocaleString("pt-BR")}
            </div>
            <div className="mt-4 text-2xl font-extrabold text-zinc-900">Alunos que realizaram a avaliação</div>
          </div>
        </SlideFrame>
      </div>

      {/* Slide 4 */}
      <div data-slide-index={4}>
        <SlideFrame primaryColor={deckData.primaryColor} logoDataUrl={deckData.logoDataUrl}>
          <div className="h-full flex flex-col justify-between">
            <div>
              <SlideTitle title="CAPA DE SEGMENTO" primaryColor={deckData.primaryColor} />
              <div className="mt-8 grid grid-cols-1 gap-4">
                <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6">
                  <div className="text-sm text-zinc-500 font-semibold">CURSO</div>
                  <div className="text-3xl font-black">{deckData.curso}</div>
                </div>
                <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6">
                  <div className="text-sm text-zinc-500 font-semibold">SÉRIE</div>
                  <div className="text-3xl font-black">{deckData.serie}</div>
                </div>
                <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6">
                  <div className="text-sm text-zinc-500 font-semibold">TURMA</div>
                  <div className="text-3xl font-black">{deckData.turma}</div>
                </div>
              </div>
            </div>

            <div className="text-xs text-zinc-500">
              Documento gerado em apresentação (landscape)
            </div>
          </div>
        </SlideFrame>
      </div>

      {/* Slide 5 */}
      <div data-slide-index={5}>
        <SlideFrame primaryColor={deckData.primaryColor} logoDataUrl={deckData.logoDataUrl}>
          <div className="h-full flex flex-col">
            <SlideTitle title="TABELA DE PRESENÇA" primaryColor={deckData.primaryColor} />
            <div className="mt-6 flex-1">
              <SimpleTable
                columns={[
                  "Série",
                  "Total de Alunos",
                  "Total de Presentes",
                  "Presença Média (%)",
                  "Alunos Faltosos",
                ]}
                rows={presenceRows.map((r) => [
                  <span key="s" className="font-semibold">
                    {r.serie}
                  </span>,
                  r.totalAlunos,
                  r.totalPresentes,
                  formatPct(r.presencaMediaPct),
                  r.alunosFaltosos,
                ])}
                accentColor={deckData.primaryColor}
              />
            </div>
          </div>
        </SlideFrame>
      </div>

      {/* Slide 6 */}
      <div data-slide-index={6}>
        <SlideFrame primaryColor={deckData.primaryColor} logoDataUrl={deckData.logoDataUrl}>
          <div className="h-full flex flex-col">
            <SlideTitle title="GRÁFICO DE PRESENÇA" primaryColor={deckData.primaryColor} />
            <div className="mt-6 flex-1">
              <BarChart width={980} height={520} data={presenceChartData}>
                <CartesianGrid stroke="#94a3b8" strokeOpacity={0.55} strokeDasharray="3 3" />
                <XAxis
                  dataKey="serie"
                  tick={{ fontSize: 12, fill: "#334155" }}
                  interval={0}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tick={{ fontSize: 12, fill: "#334155" }}
                  tickFormatter={(v) => `${Math.round(v)}%`}
                />
                <Tooltip
                  wrapperStyle={{ borderRadius: 10, overflow: "hidden" }}
                  contentStyle={{ borderColor: "#e4e4e7" }}
                />
                <Bar
                  dataKey="presenca_media_pct"
                  fill={deckData.primaryColor}
                  radius={[8, 8, 0, 0]}
                >
                  <LabelList
                    dataKey="presenca_media_pct"
                    position="top"
                    formatter={(v: number) => `${Math.round(v)}%`}
                    style={{ fontSize: 11, fill: "#0f172a", fontWeight: 700 }}
                  />
                </Bar>
              </BarChart>
            </div>
          </div>
        </SlideFrame>
      </div>

      {/* Slide 7 */}
      <div data-slide-index={7}>
        <SlideFrame primaryColor={deckData.primaryColor} logoDataUrl={deckData.logoDataUrl}>
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <SlideTitle title="NÍVEIS DE APRENDIZAGEM" primaryColor={deckData.primaryColor} />
              <div className="mt-6 text-zinc-600 text-xl font-semibold">
                Distribuição de alunos por nível e série
              </div>
            </div>
          </div>
        </SlideFrame>
      </div>

      {/* Slide 8 */}
      <div data-slide-index={8}>
        <SlideFrame primaryColor={deckData.primaryColor} logoDataUrl={deckData.logoDataUrl}>
          <div className="h-full flex flex-col">
            <SlideTitle title="GUIA DE NÍVEIS" primaryColor={deckData.primaryColor} />
            <div className="mt-6 flex-1 grid grid-cols-2 gap-5">
              {levelGuide.map((lvl, idx) => (
                <div key={idx} className="rounded-2xl border border-zinc-200 p-5">
                  <div className="flex items-center gap-3">
                    <div style={{ width: 12, height: 12, borderRadius: 999, background: lvl.color }} />
                    <div className="text-xl font-black" style={{ color: lvl.color }}>
                      {lvl.label}
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-zinc-700 leading-relaxed">{lvl.description}</div>
                </div>
              ))}
            </div>
          </div>
        </SlideFrame>
      </div>

      {/* Slide 9 */}
      <div data-slide-index={9}>
        <SlideFrame primaryColor={deckData.primaryColor} logoDataUrl={deckData.logoDataUrl}>
          <div className="h-full flex flex-col">
            <SlideTitle title="GRÁFICO DE NÍVEIS" primaryColor={deckData.primaryColor} />
            <div className="mt-6 flex-1">
              <BarChart width={980} height={520} data={levelsChartData}>
                <CartesianGrid stroke="#94a3b8" strokeOpacity={0.55} strokeDasharray="3 3" />
                <XAxis dataKey="nivel" interval={0} tick={{ fontSize: 12, fill: "#334155" }} />
                <YAxis domain={[0, levelsAxisMax]} ticks={linearTicks(0, levelsAxisMax, 4)} />
                <Tooltip />
                <Bar dataKey="valor" radius={[8, 8, 0, 0]}>
                  {levelsChartData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                  <LabelList
                    dataKey="valor"
                    position="top"
                    formatter={(v: number) => String(v)}
                    style={{ fontSize: 11, fill: "#0f172a", fontWeight: 700 }}
                  />
                </Bar>
              </BarChart>
            </div>
          </div>
        </SlideFrame>
      </div>

      {/* Slide 10 */}
      <div data-slide-index={10}>
        <SlideFrame primaryColor={deckData.primaryColor} logoDataUrl={deckData.logoDataUrl}>
          <div className="h-full flex flex-col">
            <SlideTitle title="TABELA DE NÍVEIS" primaryColor={deckData.primaryColor} />
            <div className="mt-6 flex-1">
              <SimpleTable
                columns={["Série", "Abaixo do Básico", "Básico", "Adequado", "Avançado"]}
                rows={niveisRows.map((r) => [
                  <span key="s" className="font-semibold">
                    {r.serie}
                  </span>,
                  r.abaixoDoBasico,
                  r.basico,
                  r.adequado,
                  r.avancado,
                ])}
                accentColor={deckData.primaryColor}
              />
            </div>
          </div>
        </SlideFrame>
      </div>

      {/* Slide 11 */}
      <div data-slide-index={11}>
        <SlideFrame primaryColor={deckData.primaryColor} logoDataUrl={deckData.logoDataUrl}>
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <SlideTitle title="PROFICIÊNCIAS" primaryColor={deckData.primaryColor} />
              <div className="mt-6 text-zinc-600 text-xl font-semibold">
                Proficiência geral e por disciplina
              </div>
            </div>
          </div>
        </SlideFrame>
      </div>

      {/* Slide 12 */}
      <div data-slide-index={12}>
        <SlideFrame primaryColor={deckData.primaryColor} logoDataUrl={deckData.logoDataUrl}>
          <div className="h-full flex flex-col">
            <SlideTitle title="PROFICIÊNCIA GERAL POR TURMA" primaryColor={deckData.primaryColor} />
            <div className="mt-6 flex-1">
              <BarChart width={980} height={520} data={profGeneralData}>
                <CartesianGrid stroke="#94a3b8" strokeOpacity={0.55} strokeDasharray="3 3" />
                <XAxis dataKey="turma" tick={{ fontSize: 12, fill: "#334155" }} interval={0} />
                <YAxis domain={[0, generalProfAxisMax]} ticks={linearTicks(0, generalProfAxisMax, 4)} tick={{ fontSize: 12, fill: "#334155" }} />
                <Tooltip wrapperStyle={{ borderRadius: 10, overflow: "hidden" }} />
                <Bar dataKey="proficiencia" fill={deckData.primaryColor} radius={[8, 8, 0, 0]}>
                  <LabelList
                    dataKey="proficiencia"
                    position="top"
                    formatter={(v: number) => Number(v).toFixed(1)}
                    style={{ fontSize: 11, fill: "#0f172a", fontWeight: 700 }}
                  />
                </Bar>
              </BarChart>
            </div>
          </div>
        </SlideFrame>
      </div>

      {/* Slide 13 */}
      <div data-slide-index={13}>
        <SlideFrame primaryColor={deckData.primaryColor} logoDataUrl={deckData.logoDataUrl}>
          <div className="h-full flex flex-col">
            <SlideTitle title="PROFICIÊNCIA POR DISCIPLINA POR TURMA" primaryColor={deckData.primaryColor} />
            <div className="mt-4 flex-1 grid grid-cols-2 gap-3">
              {profByDiscSeparate.map((disc) => {
                const paletteIndex = getSubjectPaletteIndex(disc.disciplina, disc.disciplina);
                const barColor = disciplinePalette[paletteIndex % disciplinePalette.length];
                const maxDisc = getProficiencyTableInfo(deckData.serie, disc.disciplina).maxProficiency;
                const maxAtual = Math.max(
                  0,
                  ...disc.data.map((d) => (Number.isFinite(d.proficiencia) ? Number(d.proficiencia) : 0))
                );
                const pctTeto = maxDisc > 0 ? (maxAtual / maxDisc) * 100 : 0;
                const step = maxDisc <= 350 ? 50 : 100;

                return (
                  <div key={disc.disciplina} className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-2">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="text-xs font-bold text-zinc-700 truncate">{disc.disciplina}</div>
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: barColor }} />
                    </div>
                    <div className="grid grid-cols-[1fr_132px] gap-2">
                      <BarChart width={308} height={176} data={disc.data}>
                        <XAxis dataKey="turma" tick={{ fontSize: 10, fill: "#334155" }} interval={0} />
                        <YAxis domain={[0, maxDisc]} ticks={linearTicks(0, maxDisc, 4)} tick={{ fontSize: 10, fill: "#334155" }} />
                        <Tooltip wrapperStyle={{ borderRadius: 10, overflow: "hidden" }} />
                        <ReferenceLine y={0} stroke="#64748b" strokeOpacity={0.25} />
                        <ReferenceLine y={step} stroke="#64748b" strokeOpacity={0.18} strokeDasharray="3 3" />
                        <ReferenceLine y={step * 2} stroke="#64748b" strokeOpacity={0.18} strokeDasharray="3 3" />
                        <ReferenceLine y={step * 3} stroke="#64748b" strokeOpacity={0.18} strokeDasharray="3 3" />
                        <ReferenceLine y={maxDisc} stroke="#0f172a" strokeOpacity={0.22} strokeDasharray="4 4" />
                        <Bar dataKey="proficiencia" fill={barColor} radius={[6, 6, 0, 0]}>
                          <LabelList
                            dataKey="proficiencia"
                            position="top"
                            formatter={(v: number) => (Number(v) > 0 ? Number(v).toFixed(1) : "")}
                            style={{ fontSize: 10, fill: "#0f172a", fontWeight: 600 }}
                          />
                        </Bar>
                      </BarChart>
                      <div className="rounded-lg border border-zinc-200 bg-white px-2 py-2">
                        <div className="text-[10px] uppercase tracking-wide text-zinc-500 font-semibold">Máx. Disc.</div>
                        <div className="text-lg font-black leading-tight" style={{ color: barColor }}>
                          {maxDisc.toFixed(1)}
                        </div>
                        <div className="mt-2 text-[10px] uppercase tracking-wide text-zinc-500 font-semibold">Atual</div>
                        <div className="text-base font-extrabold text-zinc-800 leading-tight">
                          {maxAtual.toFixed(1)}
                        </div>
                        <div className="mt-1 text-[11px] text-zinc-600">{pctTeto.toFixed(1)}% do teto</div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {profByDiscSeparate.length === 0 && (
                <div className="col-span-2 flex items-center justify-center text-sm text-zinc-500">
                  Sem dados de proficiência por disciplina para exibir.
                </div>
              )}
            </div>
          </div>
        </SlideFrame>
      </div>

      {/* Slide 14 */}
      <div data-slide-index={14}>
        <SlideFrame primaryColor={deckData.primaryColor} logoDataUrl={deckData.logoDataUrl}>
          <div className="h-full flex flex-col">
            <SlideTitle title="TABELA DE PROJEÇÃO" primaryColor={deckData.primaryColor} />
            <div className="mt-6 flex-1">
              <div className="rounded-2xl overflow-hidden border border-zinc-300">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-zinc-100">
                      <th
                        colSpan={2}
                        className="border-b border-zinc-300 px-3 py-2 text-left text-sm font-extrabold text-zinc-700"
                      >
                        Bloco Disciplina
                      </th>
                      <th
                        colSpan={2}
                        className="border-b border-l-2 border-zinc-400 px-3 py-2 text-left text-sm font-extrabold text-zinc-700"
                      >
                        Bloco Geral
                      </th>
                    </tr>
                    <tr className="bg-zinc-50">
                      <th className="border-b border-zinc-300 px-3 py-2 text-left text-sm font-semibold text-zinc-700">
                        Proficiência da Disciplina
                      </th>
                      <th className="border-b border-zinc-300 px-3 py-2 text-left text-sm font-semibold text-zinc-700">
                        Projeção +20% (teto)
                      </th>
                      <th className="border-b border-l-2 border-zinc-400 px-3 py-2 text-left text-sm font-semibold text-zinc-700">
                        Proficiência Geral
                      </th>
                      <th className="border-b border-zinc-300 px-3 py-2 text-left text-sm font-semibold text-zinc-700">
                        Projeção Geral +20% (teto)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {deckData.projeccaoTabela.map((r, idx) => (
                      <tr key={`${r.disciplina}-${idx}`} className={idx % 2 === 0 ? "bg-white" : "bg-zinc-50/60"}>
                        <td className="border-b border-zinc-300 px-3 py-2 text-sm text-zinc-800">
                          {r.disciplina}: {r.proficienciaDisciplina.toFixed(1)}
                        </td>
                        <td className="border-b border-zinc-300 px-3 py-2 text-sm text-zinc-800 font-semibold">
                          {r.projPlus20Disciplina.toFixed(1)}
                        </td>
                        <td className="border-b border-l-2 border-zinc-400 px-3 py-2 text-sm text-zinc-800">
                          {r.proficienciaGeral.toFixed(1)}
                        </td>
                        <td className="border-b border-zinc-300 px-3 py-2 text-sm text-zinc-800 font-semibold">
                          {r.projPlus20Geral.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </SlideFrame>
      </div>

      {/* Slide 15 */}
      <div data-slide-index={15}>
        <SlideFrame primaryColor={deckData.primaryColor} logoDataUrl={deckData.logoDataUrl}>
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <SlideTitle title="QUESTÕES" primaryColor={deckData.primaryColor} />
              <div className="mt-6 text-zinc-600 text-xl font-semibold">
                Análise por habilidade e percentual de acerto
              </div>
            </div>
          </div>
        </SlideFrame>
      </div>

      {/* Slide 16 */}
      <div data-slide-index={16}>
        <SlideFrame primaryColor={deckData.primaryColor} logoDataUrl={deckData.logoDataUrl}>
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl font-black" style={{ color: deckData.primaryColor }}>
                [{deckData.serieNomeCapas}]
              </div>
            </div>
          </div>
        </SlideFrame>
      </div>

      {/* Slide 17 */}
      <div data-slide-index={17}>
        <SlideFrame primaryColor={deckData.primaryColor} logoDataUrl={deckData.logoDataUrl}>
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl font-black" style={{ color: deckData.primaryColor }}>
                [{deckData.turmaNomeCapas}]
              </div>
            </div>
          </div>
        </SlideFrame>
      </div>

      {/* Slide 18+ (paginado com 17 questões por página) */}
      {questoesChunks.map((questoesPage, pageIdx) => (
        <div key={`questions-page-${pageIdx}`} data-slide-index={firstQuestionsSlideIndex + pageIdx}>
          <SlideFrame primaryColor={deckData.primaryColor} logoDataUrl={deckData.logoDataUrl}>
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between">
                <SlideTitle title="TABELA DE QUESTÕES" primaryColor={deckData.primaryColor} />
                {questoesChunks.length > 1 && (
                  <div className="text-sm font-semibold text-zinc-600">
                    Página {pageIdx + 1}/{questoesChunks.length}
                  </div>
                )}
              </div>
              <div className="mt-6 flex-1">
                <SimpleTable
                  columns={["Questão", "Habilidade", "% Acertos"]}
                  rows={questoesPage.map((q) => [
                    q.questao,
                    q.habilidade,
                    `${q.percentualAcertos.toFixed(1).replace(".", ",")}%`,
                  ])}
                  accentColor={deckData.primaryColor}
                />
              </div>
            </div>
          </SlideFrame>
        </div>
      ))}

      {/* Último slide */}
      <div data-slide-index={thanksSlideIndex}>
        <SlideFrame primaryColor={deckData.primaryColor} logoDataUrl={deckData.logoDataUrl}>
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl font-black" style={{ color: deckData.primaryColor }}>
                Obrigado!!
              </div>
            </div>
          </div>
        </SlideFrame>
      </div>
    </div>
  );
}

