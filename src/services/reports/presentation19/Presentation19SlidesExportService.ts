import type { Presentation19DeckData } from "@/types/presentation19-slides";
import type { Presentation19ExportSpec } from "@/types/presentation19-export-spec";
import { buildSlideSpec } from "@/utils/reports/presentation19/buildSlideSpec";
import { renderPdfFromSlideSpec } from "@/services/reports/presentation19/renderers/PdfRenderer";
import { renderPptxFromSlideSpec } from "@/services/reports/presentation19/renderers/PptxRenderer";

type ExportPdfArgs = {
  fileName: string;
  /** Quando já calculado na página (useMemo), evita `buildSlideSpec` duplicado. */
  spec?: Presentation19ExportSpec;
  deckData?: Presentation19DeckData;
};

type ExportPptxArgs = {
  fileName: string;
  spec?: Presentation19ExportSpec;
  deckData?: Presentation19DeckData;
};

function resolveExportSpec(args: { spec?: Presentation19ExportSpec; deckData?: Presentation19DeckData }): Presentation19ExportSpec {
  if (args.spec) return args.spec;
  if (args.deckData) return buildSlideSpec(args.deckData);
  throw new Error("exportPresentation19: informe `spec` ou `deckData`.");
}

export async function exportPresentation19Pdf(args: ExportPdfArgs): Promise<void> {
  const { fileName, ...rest } = args;
  await renderPdfFromSlideSpec({ spec: resolveExportSpec(rest), fileName });
}

export async function exportPresentation19Pptx(args: ExportPptxArgs): Promise<void> {
  const { fileName, ...rest } = args;
  await renderPptxFromSlideSpec({ spec: resolveExportSpec(rest), fileName });
}

