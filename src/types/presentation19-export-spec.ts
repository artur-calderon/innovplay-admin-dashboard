import type { Presentation19DeckData } from "@/types/presentation19-slides";

export type ExportChartType = "bar" | "stackedBar";

export type ExportChartSeries = {
  key: string;
  label: string;
  color: string;
};

export type ExportChartAxis = {
  min: number;
  max: number;
  ticks?: number[];
  scaleLabel?: string;
};

export type ExportChart = {
  type: ExportChartType;
  /** `vertical` = barras verticais (categoria no X). `horizontal` = barras horizontais (categoria no Y). */
  orientation?: "vertical" | "horizontal";
  categoryKey: string;
  valueKeys: ExportChartSeries[];
  data: Array<Record<string, string | number>>;
  yAxis?: ExportChartAxis;
};

export type ExportTable = {
  columns: string[];
  rows: Array<Array<string | number>>;
};

export type Presentation19SlideSpec =
  | { index: 1; kind: "cover-main" }
  | { index: 2; kind: "cover-school" }
  | { index: 3; kind: "metric-total-students" }
  | { index: 4; kind: "cover-segment" }
  | { index: 5; kind: "presence-table"; table: ExportTable }
  | { index: 6; kind: "presence-chart"; chart: ExportChart }
  | { index: 7; kind: "section-levels" }
  | { index: 8; kind: "levels-guide" }
  | { index: 9; kind: "levels-chart"; chart: ExportChart }
  | { index: 10; kind: "levels-table"; table: ExportTable }
  | { index: 11; kind: "section-proficiency" }
  | { index: 12; kind: "proficiency-general-chart"; chart: ExportChart }
  | {
      index: 13;
      kind: "proficiency-by-discipline-chart";
      charts: Array<{ title: string; chart: ExportChart }>;
    }
  | { index: 14; kind: "projection-table"; table: ExportTable }
  | { index: 15; kind: "section-questions" }
  | { index: 16; kind: "dynamic-series-cover" }
  | { index: 17; kind: "dynamic-class-cover" }
  | {
      index: number;
      kind: "questions-table";
      table: ExportTable;
      /** Só preenchido quando há mais de um slide de tabela de questões. */
      questionsPage?: { current: number; total: number };
    }
  | { index: number; kind: "thank-you" };

export type Presentation19ExportSpec = {
  deckData: Presentation19DeckData;
  slides: Presentation19SlideSpec[];
};
