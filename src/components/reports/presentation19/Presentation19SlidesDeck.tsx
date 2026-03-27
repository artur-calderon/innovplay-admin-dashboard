import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  LabelList,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import type { Presentation19DeckData, NiveisBySeriesRow } from "@/types/presentation19-slides";

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

function SlideFrame({ children, primaryColor, logoDataUrl }: SlideFrameProps) {
  const primarySoft = `${primaryColor}22`;
  const primarySoft2 = `${primaryColor}14`;
  return (
    <div
      data-slide-frame
      className="bg-white text-zinc-900 relative overflow-hidden border border-zinc-300"
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
          inset: -40,
          pointerEvents: "none",
          backgroundImage: `
            radial-gradient(circle at 10% 0%, ${primarySoft} 0%, rgba(255,255,255,0) 40%),
            radial-gradient(circle at 90% 10%, ${primarySoft2} 0%, rgba(255,255,255,0) 45%),
            repeating-linear-gradient(90deg, rgba(15,23,42,0.09) 0 1px, transparent 1px 64px),
            repeating-linear-gradient(0deg, rgba(15,23,42,0.08) 0 1px, transparent 1px 64px)
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
          background: `linear-gradient(90deg, ${primaryColor} 0%, rgba(0,0,0,0) 95%)`,
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
          background: `linear-gradient(180deg, ${primaryColor} 0%, rgba(0,0,0,0) 140%)`,
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
    return niveisRows.map((r: NiveisBySeriesRow) => ({
      serie: r.serie,
      abaixo_do_basico: r.abaixoDoBasico,
      basico: r.basico,
      adequado: r.adequado,
      avancado: r.avancado,
      total: r.total,
    }));
  }, [niveisRows]);

  const presenceChartData = useMemo(() => {
    return presenceRows.map((r) => ({
      serie: r.serie,
      presenca_media_pct: r.presencaMediaPct,
    }));
  }, [presenceRows]);

  const profGeneralData = useMemo(() => {
    return deckData.proficienciaGeralPorTurma.map((r) => ({
      turma: r.turma,
      proficiencia: r.proficiciencia,
    }));
  }, [deckData.proficienciaGeralPorTurma]);

  const profByDiscChartData = useMemo(() => {
    const disciplinas = deckData.proficienciaPorDisciplinaPorTurma;
    if (disciplinas.length === 0) return [];

    const turmasSet = new Set<string>();
    for (const d of disciplinas) for (const v of d.valuesByTurma) if (v.turma) turmasSet.add(v.turma);
    const turmas = Array.from(turmasSet).sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));

    const keyByDisc = disciplinas.map((d, idx) => ({ disc: d.disciplina, key: `disc_${idx}` }));

    return turmas.map((turma) => {
      const row: Record<string, string | number> = { turma };
      keyByDisc.forEach(({ disc, key }) => {
        const found = disciplinas.find((d) => d.disciplina === disc)?.valuesByTurma.find((x) => x.turma === turma);
        row[key] = found ? found.proficiencia : 0;
      });
      return row;
    });
  }, [deckData.proficienciaPorDisciplinaPorTurma]);

  const profDiscChartKeys = useMemo(() => {
    return deckData.proficienciaPorDisciplinaPorTurma.map((d, idx) => ({
      disciplina: d.disciplina,
      key: `disc_${idx}`,
    }));
  }, [deckData.proficienciaPorDisciplinaPorTurma]);

  const disciplinePalette = useMemo(
    () => ["#1D4ED8", "#0F766E", "#7C3AED", "#0EA5E9", "#4338CA", "#0369A1"],
    []
  );

  const levelGuide = deckData.levelGuide ?? [
    { label: "AVANÇADO", description: "", color: fixedLevelColors.avancado },
    { label: "ADEQUADO", description: "", color: fixedLevelColors.adequado },
    { label: "BÁSICO", description: "", color: fixedLevelColors.basico },
    { label: "ABAIXO DO BÁSICO", description: "", color: fixedLevelColors.abaixo },
  ];

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
                <SlideTitle title="CAPA DE ESCOLA" primaryColor={deckData.primaryColor} />
                <div className="h-6" />
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
                <XAxis dataKey="serie" />
                <YAxis />
                <Tooltip />
                <Legend verticalAlign="top" align="right" />
                <Bar
                  dataKey="abaixo_do_basico"
                  name="Abaixo do Básico"
                  stackId="a"
                  fill={fixedLevelColors.abaixo}
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="basico"
                  name="Básico"
                  stackId="a"
                  fill={fixedLevelColors.basico}
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="adequado"
                  name="Adequado"
                  stackId="a"
                  fill={fixedLevelColors.adequado}
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="avancado"
                  name="Avançado"
                  stackId="a"
                  fill={fixedLevelColors.avancado}
                  radius={[8, 8, 0, 0]}
                >
                  <LabelList
                    dataKey="total"
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
                columns={["Série", "Abaixo do Básico", "Básico", "Adequado", "Avançado", "Total"]}
                rows={niveisRows.map((r) => [
                  <span key="s" className="font-semibold">
                    {r.serie}
                  </span>,
                  r.abaixoDoBasico,
                  r.basico,
                  r.adequado,
                  r.avancado,
                  r.total,
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
                <YAxis tick={{ fontSize: 12, fill: "#334155" }} />
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
            <div className="mt-6 flex-1">
              <BarChart width={980} height={520} data={profByDiscChartData}>
                <CartesianGrid stroke="#94a3b8" strokeOpacity={0.55} strokeDasharray="3 3" />
                <XAxis dataKey="turma" tick={{ fontSize: 12, fill: "#334155" }} interval={0} />
                <YAxis tick={{ fontSize: 12, fill: "#334155" }} />
                <Tooltip wrapperStyle={{ borderRadius: 10, overflow: "hidden" }} />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 12 }} />
                {profDiscChartKeys.map((k, idx) => (
                  <Bar
                    key={k.key}
                    dataKey={k.key}
                    name={k.disciplina}
                    fill={disciplinePalette[idx % disciplinePalette.length]}
                    radius={[8, 8, 0, 0]}
                  >
                    <LabelList
                      dataKey={k.key}
                      position="top"
                      formatter={(v: number) => (Number(v) > 0 ? Number(v).toFixed(1) : "")}
                      style={{ fontSize: 10, fill: "#0f172a", fontWeight: 600 }}
                    />
                  </Bar>
                ))}
              </BarChart>
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
              <SimpleTable
                columns={[
                  "Proficiência da Disciplina",
                  "Projeção +20% (teto)",
                  "Proficiência Geral",
                  "Projeção Geral +20% (teto)",
                ]}
                rows={deckData.projeccaoTabela.map((r) => [
                  `${r.disciplina}: ${r.proficienciaDisciplina.toFixed(1)}`,
                  r.projPlus20Disciplina.toFixed(1),
                  r.proficienciaGeral.toFixed(1),
                  r.projPlus20Geral.toFixed(1),
                ])}
                accentColor={deckData.primaryColor}
              />
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

      {/* Slide 18 */}
      <div data-slide-index={18}>
        <SlideFrame primaryColor={deckData.primaryColor} logoDataUrl={deckData.logoDataUrl}>
          <div className="h-full flex flex-col">
            <SlideTitle title="TABELA DE QUESTÕES" primaryColor={deckData.primaryColor} />
            <div className="mt-6 flex-1">
              <SimpleTable
                columns={["Questão", "Habilidade", "% Acertos"]}
                rows={deckData.questoesTabela.map((q) => [
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

      {/* Slide 19 */}
      <div data-slide-index={19}>
        <SlideFrame primaryColor={deckData.primaryColor} logoDataUrl={deckData.logoDataUrl}>
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl font-black" style={{ color: deckData.primaryColor }}>
                Obrigado!!
              </div>
              <div className="mt-6 text-zinc-600 text-xl font-semibold">
                Relatório gerado para apresentação
              </div>
            </div>
          </div>
        </SlideFrame>
      </div>
    </div>
  );
}

