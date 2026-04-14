import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { buildSlideSpec } from "@/utils/reports/presentation19/buildSlideSpec";
import type { ExportChart, Presentation19SlideSpec } from "@/types/presentation19-export-spec";
import type { Presentation19DeckData } from "@/types/presentation19-slides";
import {
  presentationSectionGrades,
  presentationSectionGradesTagline,
  presentationSectionLevels,
  presentationSectionLevelsTagline,
  presentationSectionProficiency,
  presentationSectionProficiencyTagline,
  presentationSectionQuestionsTagline,
  presentationSectionQuestionsTitle,
  presentationSectionStudentsTitle,
  presentationTitleChartGrades,
  presentationTitleChartLevels,
  presentationTitleChartPresence,
  presentationTitleProficiencyByDiscipline,
  presentationTitleProficiencyGeneralChart,
  presentationTitleTableGrades,
  presentationTitleTableLevels,
  presentationTitleTablePresence,
  presentationTitleTableStudents,
  presentationQuestionsTurmaCoverLine,
} from "@/utils/reports/presentation19/presentationScope";
import {
  P19_CHART_REF_H_PX,
  P19_CONTENT,
  P19_COVER_MAIN_LABEL_PX,
  P19_COVER_MAIN_TITLE_PX,
  P19_COVER_MAIN_VALUE_PX,
  P19_COVER_SCHOOL_SINGLE_PX,
  P19_DYNAMIC_COVER_PX,
  P19_HORIZONTAL_CHART_LABEL_WIDTH_PX,
  P19_LEVELS_GUIDE_DESC_PX,
  P19_LEVELS_GUIDE_TITLE_PX,
  P19_METRIC_HEADER_PX,
  P19_METRIC_NUMBER_PX,
  P19_PAGE,
  P19_PAGE_INDICATOR_FONT_PX,
  P19_SEGMENT_FIELD_LABEL_PX,
  P19_SEGMENT_FIELD_VALUE_PX,
  P19_TABLE_CELL_FONT_PX,
  P19_TABLE_CELL_PADDING_PX,
  P19_TITLE_ACCENT_H_PX,
  P19_TITLE_ACCENT_W_PX,
  P19_TITLE_FONT_PX,
  P19_TITLE_SUBTITLE_GAP_PX,
  P19_TITLE_TEXT_OFFSET_X_PX,
  P19_SUBTITLE_FONT_PX,
  P19_THANK_YOU_FONT_PX,
} from "@/utils/reports/presentation19/presentation19ExportTypography";

type Props = {
  deckData: Presentation19DeckData;
};

export type Presentation19NativePreviewDeckHandle = {
  openFullscreen: () => void;
};

/** Elemento em tela cheia (API padrão + prefixos WebKit legados). */
function getFullscreenElement(): Element | null {
  const d = document as Document & { webkitFullscreenElement?: Element | null };
  return document.fullscreenElement ?? d.webkitFullscreenElement ?? null;
}

/** Solicita tela cheia do documento (gesto do usuário no mesmo clique). */
function requestBrowserFullscreen(): void {
  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void>;
  };
  if (typeof el.requestFullscreen === "function") {
    void el.requestFullscreen().catch(() => {
      /* permissão negada, iOS, etc. */
    });
  } else if (typeof el.webkitRequestFullscreen === "function") {
    void el.webkitRequestFullscreen();
  }
}

function exitBrowserFullscreen(): void {
  if (!getFullscreenElement()) return;
  const d = document as Document & { webkitExitFullscreen?: () => Promise<void> };
  if (typeof document.exitFullscreen === "function") {
    void document.exitFullscreen().catch(() => {});
  } else if (typeof d.webkitExitFullscreen === "function") {
    void d.webkitExitFullscreen();
  }
}

const page = P19_PAGE;
const content = P19_CONTENT;

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

function Title({ text, primaryColor, subtitle }: { text: string; primaryColor: string; subtitle?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: subtitle ? P19_TITLE_SUBTITLE_GAP_PX : 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: P19_TITLE_ACCENT_W_PX, height: P19_TITLE_ACCENT_H_PX, borderRadius: 999, background: primaryColor }} />
        <h2 style={{ margin: 0, fontSize: P19_TITLE_FONT_PX, fontWeight: 800, color: "#0F172A", letterSpacing: 0.2 }}>{text}</h2>
      </div>
      {subtitle ? (
        <div style={{ paddingLeft: P19_TITLE_TEXT_OFFSET_X_PX, fontSize: P19_SUBTITLE_FONT_PX, fontWeight: 700, color: "#52525B" }}>
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}

function HorizontalBarChartPreview({ chart, height = P19_CHART_REF_H_PX }: { chart: ExportChart; height?: number }) {
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
                  width: P19_HORIZONTAL_CHART_LABEL_WIDTH_PX,
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
                <span style={{ marginLeft: 2, fontSize: 11, fontWeight: 700, color: "#0F172A", whiteSpace: "nowrap" }}>
                  {Math.abs(value - Math.round(value)) < 1e-6 ? Math.round(value) : value.toFixed(1)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "relative", height: 22, marginLeft: P19_HORIZONTAL_CHART_LABEL_WIDTH_PX + 10, marginRight: 8 }}>
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

function BarChartPreview({ chart, height = P19_CHART_REF_H_PX }: { chart: ExportChart; height?: number }) {
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
  const AXIS_LAB_W = 24;

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
                top: -8,
                width: AXIS_LAB_W - 2,
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
            /* stretch: colunas precisam da altura total do plot; só `absolute` não gera altura no fluxo */
            alignItems: "stretch",
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
                minHeight: 0,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
              }}
            >
              {hasMultipleSeries ? (
                isStacked ? (
                  (() => {
                    const stackTotal = chart.valueKeys.reduce((s, serie) => s + Math.max(0, Number(row[serie.key] ?? 0)), 0);
                    const stackFrac = Math.min(1, ratioOf(stackTotal));
                    const growStack = stackTotal > 0 ? Math.max(1e-6, stackFrac) : 0;
                    const growTop = stackTotal > 0 ? Math.max(1e-6, 1 - stackFrac) : 1;
                    return (
                      <div
                        style={{
                          flex: 1,
                          minHeight: 0,
                          width: "100%",
                          position: "relative",
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        <div style={{ flex: growTop, flexBasis: 0, minHeight: 0 }} aria-hidden />
                        {stackTotal > 0 && (
                          <div
                            style={{
                              flex: growStack,
                              flexBasis: 0,
                              minHeight: 0,
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "flex-end",
                            }}
                          >
                            <div
                              style={{
                                width: "min(28px, 72%)",
                                height: "100%",
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
                        )}
                        {stackTotal > 0 && (
                          <div
                            style={{
                              position: "absolute",
                              left: "50%",
                              transform: "translateX(-50%)",
                              bottom: `calc(${stackFrac * 100}% + 3px)`,
                              fontSize: 9,
                              fontWeight: 700,
                              color: "#0F172A",
                              lineHeight: 1,
                              whiteSpace: "nowrap",
                              pointerEvents: "none",
                            }}
                          >
                            {Math.round(stackTotal)}
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <div
                    style={{
                      height: "100%",
                      width: "100%",
                      minHeight: 0,
                      display: "flex",
                      alignItems: "stretch",
                      gap: 6,
                      paddingInline: 4,
                    }}
                  >
                    {chart.valueKeys.map((serie) => {
                      const value = Number(row[serie.key] ?? 0);
                      const q = ratioOf(value);
                      const growBar = value > 0 ? Math.max(1e-6, q) : 0;
                      const growTop = value > 0 ? Math.max(1e-6, 1 - q) : 1;
                      return (
                        <div
                          key={serie.key}
                          style={{
                            flex: 1,
                            minWidth: 0,
                            maxWidth: 28,
                            minHeight: 0,
                            position: "relative",
                            display: "flex",
                            flexDirection: "column",
                          }}
                          title={`${serie.label}: ${value}`}
                        >
                          <div style={{ flex: growTop, flexBasis: 0, minHeight: 0 }} aria-hidden />
                          {value > 0 && (
                            <div
                              style={{
                                flex: growBar,
                                flexBasis: 0,
                                minHeight: 0,
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "flex-end",
                              }}
                            >
                              <div
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  minHeight: 2,
                                  background: serie.color,
                                  borderRadius: "6px 6px 0 0",
                                }}
                              />
                            </div>
                          )}
                          {value > 0 && (
                            <div
                              style={{
                                position: "absolute",
                                left: "50%",
                                transform: "translateX(-50%)",
                                bottom: `calc(${q * 100}% + 3px)`,
                                fontSize: 8,
                                fontWeight: 700,
                                color: "#0F172A",
                                whiteSpace: "nowrap",
                                lineHeight: 1,
                                pointerEvents: "none",
                              }}
                            >
                              {Math.round(value)}
                            </div>
                          )}
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
                  const labelText =
                    Math.abs(value - Math.round(value)) < 1e-6 ? String(Math.round(value)) : value.toFixed(1);
                  const growBar = value > 0 ? Math.max(1e-6, q) : 0;
                  const growTop = value > 0 ? Math.max(1e-6, 1 - q) : 1;
                  return (
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        minHeight: 0,
                        height: "100%",
                        position: "relative",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <div style={{ flex: growTop, flexBasis: 0, minHeight: 0 }} aria-hidden />
                      {value > 0 && (
                        <div
                          style={{
                            flex: growBar,
                            flexBasis: 0,
                            minHeight: 0,
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "flex-end",
                          }}
                        >
                          <div
                            style={{
                              width: "min(26px, 75%)",
                              height: "100%",
                              minHeight: 2,
                              background: rowColor,
                              borderRadius: "8px 8px 0 0",
                            }}
                          />
                        </div>
                      )}
                      {value > 0 && (
                        <div
                          style={{
                            position: "absolute",
                            left: "50%",
                            transform: "translateX(-50%)",
                            bottom: `calc(${q * 100}% + 4px)`,
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#0F172A",
                            whiteSpace: "nowrap",
                            lineHeight: 1,
                            pointerEvents: "none",
                          }}
                        >
                          {labelText}
                        </div>
                      )}
                    </div>
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

function NativeSlideFrame({ slide, deckData }: { slide: Presentation19SlideSpec; deckData: Presentation19DeckData }) {
  return (
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
            <div style={{ position: "absolute", left: content.x, top: content.y, width: content.w, height: content.h, color: "#0F172A" }}>
              {slide.kind === "cover-main" && (
                <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <h1 style={{ margin: "80px 0 0", color: rgbCss(deckData.primaryColor), fontSize: P19_COVER_MAIN_TITLE_PX, fontWeight: 900 }}>{deckData.avaliacaoNome}</h1>
                  <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 16, padding: 24 }}>
                    <div style={{ color: "#52525B", fontSize: P19_COVER_MAIN_LABEL_PX, fontWeight: 700 }}>MUNICÍPIO</div>
                    <div style={{ color: "#18181B", fontSize: P19_COVER_MAIN_VALUE_PX, fontWeight: 900 }}>{deckData.municipioNome}</div>
                    <div style={{ height: 14 }} />
                    <div style={{ color: "#52525B", fontSize: P19_COVER_MAIN_LABEL_PX, fontWeight: 700 }}>SÉRIE</div>
                    <div style={{ color: "#18181B", fontSize: P19_COVER_MAIN_VALUE_PX, fontWeight: 900 }}>{deckData.serie}</div>
                  </div>
                </div>
              )}
              {slide.kind === "cover-school" && (
                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 24,
                    overflow: "auto",
                  }}
                >
                  {deckData.escolasParticipantes.length <= 1 ? (
                    <div style={{ fontSize: P19_COVER_SCHOOL_SINGLE_PX, fontWeight: 900, textAlign: "center" }}>
                      {deckData.escolasParticipantes[0] ?? "N/A"}
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#52525B", marginBottom: 14 }}>
                        ESCOLAS PARTICIPANTES
                      </div>
                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: 22,
                          fontSize: deckData.escolasParticipantes.length > 14 ? 17 : 24,
                          fontWeight: 800,
                          lineHeight: 1.45,
                          maxHeight: 380,
                          overflow: "auto",
                          width: "100%",
                          maxWidth: 920,
                        }}
                      >
                        {deckData.escolasParticipantes.map((nome) => (
                          <li key={nome}>{nome}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
              {slide.kind === "metric-total-students" && (
                <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
                  <div style={{ fontSize: P19_METRIC_HEADER_PX, fontWeight: 900 }}>MÉTRICA GERAL</div>
                  <div style={{ fontSize: P19_METRIC_NUMBER_PX, fontWeight: 900, color: rgbCss(deckData.primaryColor) }}>
                    {Math.round(deckData.totalAlunosParticiparam).toLocaleString("pt-BR")}
                  </div>
                  <div style={{ fontSize: P19_METRIC_HEADER_PX, fontWeight: 900 }}>Alunos que realizaram a avaliação</div>
                </div>
              )}
              {slide.kind === "cover-segment" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
                  <Title text="CAPA DE SEGMENTO" primaryColor={deckData.primaryColor} />
                  <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 16, padding: 24 }}>
                    <div style={{ fontSize: P19_SEGMENT_FIELD_LABEL_PX, fontWeight: 700, color: "#52525B" }}>CURSO</div>
                    <div style={{ fontSize: P19_SEGMENT_FIELD_VALUE_PX, fontWeight: 900 }}>{deckData.curso}</div>
                    <div style={{ marginTop: 24, fontSize: P19_SEGMENT_FIELD_LABEL_PX, fontWeight: 700, color: "#52525B" }}>SÉRIE</div>
                    <div style={{ fontSize: P19_SEGMENT_FIELD_VALUE_PX, fontWeight: 900 }}>{deckData.serie}</div>
                    <div style={{ marginTop: 24, fontSize: P19_SEGMENT_FIELD_LABEL_PX, fontWeight: 700, color: "#52525B" }}>
                      {deckData.turmasParticipantesCapa.length > 1 ? "TURMAS" : "TURMA"}
                    </div>
                    {deckData.turmasParticipantesCapa.length > 8 ? (
                      <ul
                        style={{
                          margin: "8px 0 0",
                          paddingLeft: 22,
                          fontSize: 20,
                          fontWeight: 800,
                          lineHeight: 1.45,
                          maxHeight: 280,
                          overflow: "auto",
                        }}
                      >
                        {deckData.turmasParticipantesCapa.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                    ) : (
                      <div
                        style={{
                          fontSize: deckData.turma.length > 120 ? 22 : 34,
                          fontWeight: 900,
                          lineHeight: 1.25,
                          wordBreak: "break-word",
                        }}
                      >
                        {deckData.turma}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {(slide.kind === "presence-table" ||
                slide.kind === "levels-table" ||
                slide.kind === "grades-table" ||
                slide.kind === "students-table" ||
                slide.kind === "questions-table") && (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                    <Title
                      text={
                        slide.kind === "presence-table"
                          ? presentationTitleTablePresence(deckData.comparisonAxis)
                          : slide.kind === "levels-table"
                            ? presentationTitleTableLevels(deckData.comparisonAxis)
                            : slide.kind === "grades-table"
                              ? presentationTitleTableGrades(deckData.comparisonAxis)
                              : slide.kind === "students-table"
                                ? presentationTitleTableStudents()
                                : slide.kind === "questions-table"
                                  ? slide.questionsSubsection?.kind === "geral"
                                    ? "TABELA DE QUESTÕES — GERAL"
                                    : slide.questionsSubsection?.kind === "turma"
                                      ? `TABELA DE QUESTÕES — TURMA ${slide.questionsSubsection.turmaNome}`
                                      : "TABELA DE QUESTÕES"
                                  : "TABELA DE QUESTÕES"
                      }
                      subtitle={slide.kind === "levels-table" && slide.escolaNome ? slide.escolaNome : undefined}
                      primaryColor={deckData.primaryColor}
                    />
                    </div>
                    {slide.kind === "questions-table" &&
                      slide.questionsPage != null &&
                      slide.questionsPage.total > 1 && (
                        <div style={{ fontSize: P19_PAGE_INDICATOR_FONT_PX, fontWeight: 700, color: "#52525B", flexShrink: 0 }}>
                          Página {slide.questionsPage.current}/{slide.questionsPage.total}
                        </div>
                      )}
                    {slide.kind === "students-table" &&
                      slide.studentsPage != null &&
                      slide.studentsPage.total > 1 && (
                        <div style={{ fontSize: P19_PAGE_INDICATOR_FONT_PX, fontWeight: 700, color: "#52525B", flexShrink: 0 }}>
                          Página {slide.studentsPage.current}/{slide.studentsPage.total}
                        </div>
                      )}
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", background: "#FCFCFD", border: "1px solid #CBD5E1", borderRadius: 12, overflow: "hidden" }}>
                    <thead>
                      <tr style={{ background: "#E2E8F0" }}>
                        {slide.table.columns.map((c) => (
                          <th
                            key={c}
                            style={{
                              border: "1px solid #CBD5E1",
                              textAlign: "left",
                              padding: P19_TABLE_CELL_PADDING_PX,
                              fontSize: P19_TABLE_CELL_FONT_PX,
                              color: "#334155",
                            }}
                          >
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {slide.table.rows.map((r, idx) => (
                        <tr key={idx} style={{ background: idx % 2 === 0 ? "#FCFCFD" : "#F1F5F9" }}>
                          {r.map((cell, cIdx) => (
                            <td
                              key={cIdx}
                              style={{
                                border: "1px solid #CBD5E1",
                                padding: P19_TABLE_CELL_PADDING_PX,
                                fontSize: P19_TABLE_CELL_FONT_PX,
                                color: "#0F172A",
                              }}
                            >
                              {String(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {slide.kind === "presence-chart" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <Title text={presentationTitleChartPresence(deckData.comparisonAxis)} primaryColor={deckData.primaryColor} />
                  <BarChartPreview chart={slide.chart} />
                </div>
              )}
              {slide.kind === "levels-chart" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <Title
                    text={presentationTitleChartLevels(deckData.comparisonAxis)}
                    subtitle={slide.escolaNome}
                    primaryColor={deckData.primaryColor}
                  />
                  <BarChartPreview chart={slide.chart} />
                </div>
              )}
              {slide.kind === "section-levels" && (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Title
                    text={presentationSectionLevels(deckData.comparisonAxis)}
                    subtitle={presentationSectionLevelsTagline(deckData.comparisonAxis)}
                    primaryColor={deckData.primaryColor}
                  />
                </div>
              )}
              {slide.kind === "levels-guide" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <Title text="GUIA DE NÍVEIS DE APRENDIZAGEM" primaryColor={deckData.primaryColor} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {deckData.levelGuide.map((lvl, idx) => (
                      <div
                        key={idx}
                        style={{
                          border: "1px solid #E4E4E7",
                          borderRadius: 12,
                          padding: "16px 18px",
                          background: "#F8FAFC",
                          borderLeftWidth: 6,
                          borderLeftColor: lvl.color,
                        }}
                      >
                        <div style={{ fontSize: P19_LEVELS_GUIDE_TITLE_PX, fontWeight: 900, color: lvl.color, letterSpacing: 0.3 }}>{lvl.label}</div>
                        <div style={{ marginTop: 10, fontSize: P19_LEVELS_GUIDE_DESC_PX, color: "#3F3F46", lineHeight: 1.5, maxWidth: 980 }}>
                          {lvl.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {slide.kind === "section-students" && (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Title text={presentationSectionStudentsTitle()} primaryColor={deckData.primaryColor} />
                </div>
              )}
              {slide.kind === "section-grades" && (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Title
                    text={presentationSectionGrades(deckData.comparisonAxis)}
                    subtitle={presentationSectionGradesTagline(deckData.comparisonAxis)}
                    primaryColor={deckData.primaryColor}
                  />
                </div>
              )}
              {slide.kind === "grades-chart" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <Title
                    text={presentationTitleChartGrades(deckData.comparisonAxis)}
                    subtitle={slide.escolaNome}
                    primaryColor={deckData.primaryColor}
                  />
                  <BarChartPreview chart={slide.chart} />
                </div>
              )}
              {slide.kind === "section-proficiency" && (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Title
                    text={presentationSectionProficiency(deckData.comparisonAxis)}
                    subtitle={presentationSectionProficiencyTagline(deckData.comparisonAxis)}
                    primaryColor={deckData.primaryColor}
                  />
                </div>
              )}
              {slide.kind === "proficiency-general-chart" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <Title
                    text={presentationTitleProficiencyGeneralChart(deckData.comparisonAxis)}
                    subtitle={slide.escolaNome}
                    primaryColor={deckData.primaryColor}
                  />
                  <BarChartPreview chart={slide.chart} />
                </div>
              )}
              {slide.kind === "proficiency-by-discipline-chart" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <Title
                    text={presentationTitleProficiencyByDiscipline(deckData.comparisonAxis)}
                    subtitle={slide.escolaNome}
                    primaryColor={deckData.primaryColor}
                  />
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
                  <Title
                    text={presentationSectionQuestionsTitle()}
                    subtitle={presentationSectionQuestionsTagline()}
                    primaryColor={deckData.primaryColor}
                  />
                </div>
              )}
              {slide.kind === "dynamic-series-cover" && (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: P19_DYNAMIC_COVER_PX, fontWeight: 900, color: rgbCss(deckData.primaryColor) }}>
                  [{deckData.serieNomeCapas}]
                </div>
              )}
              {slide.kind === "dynamic-class-cover" && (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: P19_DYNAMIC_COVER_PX, fontWeight: 900, color: rgbCss(deckData.primaryColor) }}>
                  [{deckData.turmaNomeCapas}]
                </div>
              )}
              {slide.kind === "questions-turma-cover" && (
                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 48px",
                    textAlign: "center",
                    fontSize: slide.serieLabel.length + slide.turmaNome.length > 80 ? 26 : 34,
                    fontWeight: 900,
                    lineHeight: 1.35,
                    color: rgbCss(deckData.primaryColor),
                    wordBreak: "break-word",
                  }}
                >
                  {presentationQuestionsTurmaCoverLine(slide.serieLabel, slide.turmaNome)}
                </div>
              )}
              {slide.kind === "thank-you" && (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: P19_THANK_YOU_FONT_PX, fontWeight: 900, color: rgbCss(deckData.primaryColor) }}>
                  Obrigado!!
                </div>
              )}
            </div>
          </div>
  );
}

export const Presentation19NativePreviewDeck = forwardRef<Presentation19NativePreviewDeckHandle, Props>(
  function Presentation19NativePreviewDeck({ deckData }, ref) {
  const spec = buildSlideSpec(deckData);
  const total = spec.slides.length;
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [fsIndex, setFsIndex] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const exitPresentation = useCallback(() => {
    setFullscreenOpen(false);
    exitBrowserFullscreen();
  }, []);

  const openFullscreen = useCallback(() => {
    if (total === 0) return;
    setFsIndex(0);
    requestBrowserFullscreen();
    setFullscreenOpen(true);
  }, [total]);

  useImperativeHandle(
    ref,
    () => ({
      openFullscreen,
    }),
    [openFullscreen]
  );

  useLayoutEffect(() => {
    if (!fullscreenOpen || !stageRef.current) return;
    const run = () => {
      const el = stageRef.current;
      if (!el) return;
      const pw = el.clientWidth;
      const ph = el.clientHeight;
      // Sem teto em 1: em tela cheia o slide deve ampliar para caber no viewport (projeção).
      setScale(Math.min(pw / page.width, ph / page.height));
    };
    run();
    const ro = new ResizeObserver(run);
    ro.observe(stageRef.current);
    return () => ro.disconnect();
  }, [fullscreenOpen, fsIndex]);

  useEffect(() => {
    const onFsChange = () => {
      if (!getFullscreenElement()) {
        setFullscreenOpen(false);
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange as EventListener);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!fullscreenOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        exitPresentation();
        return;
      }
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        setFsIndex((i) => Math.min(total - 1, i + 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        setFsIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "Home") {
        e.preventDefault();
        setFsIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setFsIndex(Math.max(0, total - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [exitPresentation, fullscreenOpen, total]);

  useEffect(() => {
    setFsIndex((i) => Math.min(i, Math.max(0, total - 1)));
  }, [total]);

  const safeFsIndex = Math.min(fsIndex, Math.max(0, total - 1));
  const currentFsSlide = total > 0 ? spec.slides[safeFsIndex] : undefined;

  return (
    <>
      <div data-presentation19-native-root style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {spec.slides.map((slide) => (
          <div key={slide.index} data-slide-index={slide.index}>
            <NativeSlideFrame slide={slide} deckData={deckData} />
          </div>
        ))}
      </div>
      {fullscreenOpen && currentFsSlide
        ? createPortal(
            <div className="fixed inset-0 z-[200] flex h-[100dvh] w-screen items-center justify-center overflow-hidden bg-black">
              <div ref={stageRef} className="flex h-full w-full min-h-0 min-w-0 items-center justify-center overflow-hidden">
                <div
                  style={{
                    width: page.width,
                    height: page.height,
                    transform: `scale(${scale})`,
                    transformOrigin: "center center",
                  }}
                >
                  <NativeSlideFrame slide={currentFsSlide} deckData={deckData} />
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
});
