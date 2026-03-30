import React from "react";
import { buildSlideSpec } from "@/utils/reports/presentation19/buildSlideSpec";
import type { ExportChart } from "@/types/presentation19-export-spec";
import type { Presentation19DeckData } from "@/types/presentation19-slides";

type Props = {
  deckData: Presentation19DeckData;
};

const page = { width: 1123, height: 793 };
const content = { x: 40, y: 60, w: 1043, h: 680 };

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const safe = hex.replace("#", "");
  const normalized = safe.length === 3 ? safe.split("").map((c) => `${c}${c}`).join("") : safe;
  const n = Number.parseInt(normalized, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbCss(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${r}, ${g}, ${b})`;
}

function Title({ text, primaryColor }: { text: string; primaryColor: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 10, height: 34, borderRadius: 999, background: primaryColor }} />
      <h2 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: "#0F172A", letterSpacing: 0.2 }}>{text}</h2>
    </div>
  );
}

const H_PREVIEW_LABEL_W = 168;

function HorizontalBarChartPreview({ chart, height = 470 }: { chart: ExportChart; height?: number }) {
  const rawMax = Math.max(1, ...chart.data.flatMap((d) => chart.valueKeys.map((s) => Number(d[s.key] ?? 0))));
  const axisMin = Number.isFinite(chart.yAxis?.min) ? Number(chart.yAxis?.min) : 0;
  const axisMax = Number.isFinite(chart.yAxis?.max) ? Number(chart.yAxis?.max) : Math.max(1, Math.ceil(rawMax * 1.15));
  const maxValue = Math.max(axisMin + 1, axisMax);
  const ticks = (chart.yAxis?.ticks?.length
    ? chart.yAxis.ticks
    : [0, 0.25, 0.5, 0.75, 1].map((r) => axisMin + (maxValue - axisMin) * r)
  )
    .filter((v, idx, arr) => Number.isFinite(v) && v >= axisMin && v <= maxValue && arr.indexOf(v) === idx)
    .sort((a, b) => a - b);
  const ratioOf = (val: number) => (Math.max(0, val - axisMin) / (maxValue - axisMin));
  const serie = chart.valueKeys[0] ?? { key: "valor", label: "", color: "#22C55E" };

  return (
    <div
      style={{
        border: "1px solid #CBD5E1",
        borderRadius: 12,
        background: "#F8FAFC",
        height,
        padding: "12px 16px 10px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 4, paddingBottom: 4 }}>
        {chart.data.map((row, idx) => {
          const value = Number(row[serie.key] ?? 0);
          const q = ratioOf(value);
          const color = String(row.color ?? serie.color);
          return (
            <div key={idx} style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: H_PREVIEW_LABEL_W,
                  flexShrink: 0,
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#334155",
                  textAlign: "right",
                  lineHeight: 1.2,
                }}
              >
                {String(row[chart.categoryKey] ?? "")}
              </div>
              <div style={{ flex: 1, minWidth: 0, height: 30, position: "relative", display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 2,
                    bottom: 2,
                    width: 2,
                    background: "#64748B",
                    borderRadius: 1,
                  }}
                />
                <div
                  style={{
                    marginLeft: 2,
                    width: `${q * 100}%`,
                    height: "82%",
                    maxHeight: 26,
                    minHeight: value > 0 ? 6 : 0,
                    background: color,
                    borderRadius: "0 8px 8px 0",
                  }}
                />
                <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 700, color: "#0F172A", whiteSpace: "nowrap" }}>{value}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "relative", height: 22, marginLeft: H_PREVIEW_LABEL_W + 10, marginRight: 8 }}>
        {ticks.map((v) => (
          <div
            key={v}
            style={{
              position: "absolute",
              left: `${ratioOf(v) * 100}%`,
              transform: "translateX(-50%)",
              fontSize: 9,
              color: "#64748B",
            }}
          >
            {Number(v).toFixed(Number.isInteger(v) ? 0 : 1)}
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChartPreview({ chart, height = 470 }: { chart: ExportChart; height?: number }) {
  if (chart.orientation === "horizontal") {
    return <HorizontalBarChartPreview chart={chart} height={height} />;
  }

  const categories = chart.data.map((d) => String(d[chart.categoryKey] ?? ""));
  const rawMax = Math.max(1, ...chart.data.flatMap((d) => chart.valueKeys.map((s) => Number(d[s.key] ?? 0))));
  const axisMin = Number.isFinite(chart.yAxis?.min) ? Number(chart.yAxis?.min) : 0;
  const axisMax = Number.isFinite(chart.yAxis?.max) ? Number(chart.yAxis?.max) : Math.max(1, Math.ceil(rawMax * 1.15));
  const maxValue = Math.max(axisMin + 1, axisMax);
  const hasMultipleSeries = chart.valueKeys.length > 1;
  const isStacked = chart.type === "stackedBar";
  const gridValues = (chart.yAxis?.ticks?.length ? chart.yAxis.ticks : [0, 0.25, 0.5, 0.75, 1].map((r) => axisMin + (maxValue - axisMin) * r))
    .filter((v, idx, arr) => Number.isFinite(v) && v >= axisMin && v <= maxValue && arr.indexOf(v) === idx)
    .sort((a, b) => b - a);

  const LABEL_ROW_H = 30;
  const AXIS_LAB_W = 30;

  const ratioOf = (val: number) => (Math.max(0, val - axisMin) / (maxValue - axisMin));

  return (
    <div
      style={{
        border: "1px solid #CBD5E1",
        borderRadius: 12,
        background: "#F8FAFC",
        height,
        padding: "12px 14px 8px",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      <div style={{ flex: 1, minHeight: 0, position: "relative", marginLeft: AXIS_LAB_W }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 2,
            background: "#64748B",
            zIndex: 1,
            pointerEvents: "none",
          }}
        />
        {gridValues.map((v) => (
          <div
            key={`${v}`}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: `${ratioOf(v) * 100}%`,
              borderTop: "1px dashed #CBD5E1",
              pointerEvents: "none",
              zIndex: 0,
            }}
          >
            <span
              style={{
                position: "absolute",
                left: -AXIS_LAB_W,
                top: -9,
                width: AXIS_LAB_W - 4,
                textAlign: "right",
                fontSize: 9,
                color: "#64748B",
                background: "#F8FAFC",
                paddingInline: 2,
              }}
            >
              {Number(v).toFixed(Number.isInteger(v) ? 0 : 1)}
            </span>
          </div>
        ))}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            gap: 12,
            alignItems: "flex-end",
            paddingLeft: 6,
            zIndex: 2,
          }}
        >
          {chart.data.map((row, idx) => (
            <div
              key={idx}
              style={{
                flex: 1,
                minWidth: 0,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                alignItems: "center",
              }}
            >
              {hasMultipleSeries ? (
                isStacked ? (
                  (() => {
                    const stackTotal = chart.valueKeys.reduce((s, serie) => s + Math.max(0, Number(row[serie.key] ?? 0)), 0);
                    const stackFrac = Math.min(1, ratioOf(stackTotal));
                    return (
                      <>
                        <div
                          style={{
                            marginBottom: 4,
                            fontSize: 9,
                            fontWeight: 700,
                            color: "#0F172A",
                            lineHeight: 1,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {Math.round(stackTotal)}
                        </div>
                        <div
                          style={{
                            flex: 1,
                            minHeight: 0,
                            width: "100%",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "flex-end",
                          }}
                        >
                          <div
                            style={{
                              width: "min(28px, 72%)",
                              height: `${stackFrac * 100}%`,
                              minHeight: stackTotal > 0 ? 2 : 0,
                              display: "flex",
                              flexDirection: "column-reverse",
                              overflow: "hidden",
                              borderRadius: "8px 8px 0 0",
                            }}
                          >
                            {chart.valueKeys.map((serie) => {
                              const value = Number(row[serie.key] ?? 0);
                              const pct = stackTotal > 0 ? (value / stackTotal) * 100 : 0;
                              return (
                                <div
                                  key={serie.key}
                                  style={{ height: `${pct}%`, minHeight: value > 0 ? 1 : 0, background: serie.color }}
                                  title={`${serie.label}: ${value}`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </>
                    );
                  })()
                ) : (
                  <div style={{ height: "100%", width: "100%", display: "flex", alignItems: "flex-end", gap: 6, paddingInline: 4 }}>
                    {chart.valueKeys.map((serie) => {
                      const value = Number(row[serie.key] ?? 0);
                      const q = ratioOf(value);
                      return (
                        <div
                          key={serie.key}
                          style={{
                            flex: 1,
                            minWidth: 0,
                            maxWidth: 28,
                            height: "100%",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "flex-end",
                            alignItems: "center",
                          }}
                          title={`${serie.label}: ${value}`}
                        >
                          <div style={{ fontSize: 8, fontWeight: 700, color: "#0F172A", marginBottom: 3, whiteSpace: "nowrap" }}>
                            {Math.round(value)}
                          </div>
                          <div
                            style={{
                              flex: 1,
                              minHeight: 0,
                              width: "100%",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "flex-end",
                              alignItems: "center",
                            }}
                          >
                            <div
                              style={{
                                width: "100%",
                                height: `${q * 100}%`,
                                minHeight: value > 0 ? 2 : 0,
                                background: serie.color,
                                borderRadius: "6px 6px 0 0",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                (() => {
                  const serie = chart.valueKeys[0];
                  const value = Number(row[serie.key] ?? 0);
                  const q = ratioOf(value);
                  const rowColor = String(row.color ?? serie.color);
                  return (
                    <>
                      <div
                        style={{
                          marginBottom: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#0F172A",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {value.toFixed(1)}
                      </div>
                      <div
                        style={{
                          flex: 1,
                          minHeight: 0,
                          width: "100%",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "flex-end",
                          alignItems: "center",
                        }}
                      >
                        <div
                          style={{
                            width: "min(26px, 75%)",
                            height: `${q * 100}%`,
                            minHeight: value > 0 ? 2 : 0,
                            background: rowColor,
                            borderRadius: "8px 8px 0 0",
                          }}
                        />
                      </div>
                    </>
                  );
                })()
              )}
            </div>
          ))}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          marginLeft: AXIS_LAB_W,
          minHeight: LABEL_ROW_H,
          paddingTop: 6,
          gap: 12,
          paddingLeft: 6,
        }}
      >
        {chart.data.map((row, idx) => (
          <div
            key={`lab-${idx}`}
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 10,
              color: "#334155",
              textAlign: "center",
              fontWeight: 600,
              lineHeight: 1.2,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {String(row[chart.categoryKey] ?? categories[idx])}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Presentation19NativePreviewDeck({ deckData }: Props) {
  const spec = buildSlideSpec(deckData);
  return (
    <div data-presentation19-native-root style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {spec.slides.map((slide) => (
        <div key={slide.index} data-slide-index={slide.index}>
          <div
            data-slide-frame
            style={{
              width: page.width,
              height: page.height,
              borderRadius: 16,
              overflow: "hidden",
              border: "1px solid #CBD5E1",
              background: "#F1F5F9",
              color: "#0F172A",
              position: "relative",
            }}
          >
            <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 10, background: deckData.primaryColor }} />
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                backgroundImage:
                  "repeating-linear-gradient(90deg, rgba(51,65,85,0.06) 0 1px, transparent 1px 56px), repeating-linear-gradient(0deg, rgba(51,65,85,0.05) 0 1px, transparent 1px 56px)",
              }}
            />
            <div style={{ position: "absolute", left: content.x, top: content.y, width: content.w, height: content.h, color: "#0F172A" }}>
              {slide.kind === "cover-main" && (
                <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <h1 style={{ margin: "80px 0 0", color: rgbCss(deckData.primaryColor), fontSize: 62, fontWeight: 900 }}>{deckData.avaliacaoNome}</h1>
                  <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 16, padding: 24 }}>
                    <div style={{ color: "#52525B", fontSize: 14, fontWeight: 700 }}>MUNICÍPIO</div>
                    <div style={{ color: "#18181B", fontSize: 30, fontWeight: 900 }}>{deckData.municipioNome}</div>
                    <div style={{ height: 14 }} />
                    <div style={{ color: "#52525B", fontSize: 14, fontWeight: 700 }}>SÉRIE</div>
                    <div style={{ color: "#18181B", fontSize: 30, fontWeight: 900 }}>{deckData.serie}</div>
                  </div>
                </div>
              )}
              {slide.kind === "cover-school" && (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 46, fontWeight: 900 }}>
                  {deckData.escolasParticipantes[0] ?? "N/A"}
                </div>
              )}
              {slide.kind === "metric-total-students" && (
                <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
                  <div style={{ fontSize: 30, fontWeight: 900 }}>MÉTRICA GERAL</div>
                  <div style={{ fontSize: 82, fontWeight: 900, color: rgbCss(deckData.primaryColor) }}>
                    {Math.round(deckData.totalAlunosParticiparam).toLocaleString("pt-BR")}
                  </div>
                  <div style={{ fontSize: 30, fontWeight: 900 }}>Alunos que realizaram a avaliação</div>
                </div>
              )}
              {slide.kind === "cover-segment" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
                  <Title text="CAPA DE SEGMENTO" primaryColor={deckData.primaryColor} />
                  <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 16, padding: 24 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#52525B" }}>CURSO</div>
                    <div style={{ fontSize: 34, fontWeight: 900 }}>{deckData.curso}</div>
                    <div style={{ marginTop: 24, fontSize: 14, fontWeight: 700, color: "#52525B" }}>SÉRIE</div>
                    <div style={{ fontSize: 34, fontWeight: 900 }}>{deckData.serie}</div>
                    <div style={{ marginTop: 24, fontSize: 14, fontWeight: 700, color: "#52525B" }}>TURMA</div>
                    <div style={{ fontSize: 34, fontWeight: 900 }}>{deckData.turma}</div>
                  </div>
                </div>
              )}
              {(slide.kind === "presence-table" || slide.kind === "levels-table" || slide.kind === "projection-table" || slide.kind === "questions-table") && (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <Title
                    text={
                      slide.kind === "presence-table"
                        ? "TABELA DE PRESENÇA"
                        : slide.kind === "levels-table"
                          ? "TABELA DE NÍVEIS"
                          : slide.kind === "projection-table"
                            ? "TABELA DE PROJEÇÃO"
                            : "TABELA DE QUESTÕES"
                    }
                    primaryColor={deckData.primaryColor}
                  />
                  <table style={{ width: "100%", borderCollapse: "collapse", background: "#FCFCFD", border: "1px solid #CBD5E1", borderRadius: 12, overflow: "hidden" }}>
                    <thead>
                      <tr style={{ background: "#E2E8F0" }}>
                        {slide.table.columns.map((c) => (
                          <th key={c} style={{ border: "1px solid #CBD5E1", textAlign: "left", padding: 8, fontSize: 13, color: "#334155" }}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {slide.table.rows.map((r, idx) => (
                        <tr key={idx} style={{ background: idx % 2 === 0 ? "#FCFCFD" : "#F1F5F9" }}>
                          {r.map((cell, cIdx) => (
                            <td key={cIdx} style={{ border: "1px solid #CBD5E1", padding: 8, fontSize: 13, color: "#0F172A" }}>{String(cell)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {slide.kind === "presence-chart" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <Title text="GRÁFICO DE PRESENÇA" primaryColor={deckData.primaryColor} />
                  <BarChartPreview chart={slide.chart} />
                </div>
              )}
              {slide.kind === "levels-chart" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <Title text="GRÁFICO DE NÍVEIS" primaryColor={deckData.primaryColor} />
                  <BarChartPreview chart={slide.chart} />
                </div>
              )}
              {slide.kind === "section-levels" && (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Title text="NÍVEIS DE APRENDIZAGEM" primaryColor={deckData.primaryColor} />
                </div>
              )}
              {slide.kind === "levels-guide" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <Title text="GUIA DE NÍVEIS" primaryColor={deckData.primaryColor} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    {deckData.levelGuide.map((lvl, idx) => (
                      <div key={idx} style={{ border: "1px solid #E4E4E7", borderRadius: 12, padding: 12, background: "#F8FAFC" }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: lvl.color }}>{lvl.label}</div>
                        <div style={{ marginTop: 6, fontSize: 13, color: "#3F3F46", lineHeight: 1.35 }}>{lvl.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {slide.kind === "section-proficiency" && (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Title text="PROFICIÊNCIAS" primaryColor={deckData.primaryColor} />
                </div>
              )}
              {slide.kind === "proficiency-general-chart" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <Title text="PROFICIÊNCIA GERAL POR TURMA" primaryColor={deckData.primaryColor} />
                  <BarChartPreview chart={slide.chart} />
                </div>
              )}
              {slide.kind === "proficiency-by-discipline-chart" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <Title text="PROFICIÊNCIA POR DISCIPLINA POR TURMA" primaryColor={deckData.primaryColor} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {slide.charts.map((entry) => (
                      <div key={entry.title} style={{ border: "1px solid #D4D4D8", borderRadius: 12, padding: 8, background: "#F8FAFC" }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: "#3F3F46", marginBottom: 4 }}>{entry.title}</div>
                        <BarChartPreview chart={entry.chart} height={200} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {slide.kind === "section-questions" && (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Title text="QUESTÕES" primaryColor={deckData.primaryColor} />
                </div>
              )}
              {slide.kind === "dynamic-series-cover" && (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52, fontWeight: 900, color: rgbCss(deckData.primaryColor) }}>
                  [{deckData.serieNomeCapas}]
                </div>
              )}
              {slide.kind === "dynamic-class-cover" && (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52, fontWeight: 900, color: rgbCss(deckData.primaryColor) }}>
                  [{deckData.turmaNomeCapas}]
                </div>
              )}
              {slide.kind === "thank-you" && (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64, fontWeight: 900, color: rgbCss(deckData.primaryColor) }}>
                  Obrigado!!
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
