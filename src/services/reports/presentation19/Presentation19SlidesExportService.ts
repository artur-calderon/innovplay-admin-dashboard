import type { Presentation19DeckData } from "@/types/presentation19-slides";
import { buildSlideSpec } from "@/utils/reports/presentation19/buildSlideSpec";
import { renderPdfFromSlideSpec } from "@/services/reports/presentation19/renderers/PdfRenderer";
import { renderPptxFromSlideSpec } from "@/services/reports/presentation19/renderers/PptxRenderer";

type ExportPdfArgs = {
  deckData: Presentation19DeckData;
  fileName: string;
};

type ExportPptxArgs = {
  deckData: Presentation19DeckData;
  fileName: string;
};

export async function exportPresentation19Pdf(args: ExportPdfArgs): Promise<void> {
  const { deckData, fileName } = args;
  const spec = buildSlideSpec(deckData);
  await renderPdfFromSlideSpec({ spec, fileName });
}

export async function exportPresentation19Pptx(args: ExportPptxArgs): Promise<void> {
  const { deckData, fileName } = args;
  const spec = buildSlideSpec(deckData);
  await renderPptxFromSlideSpec({ spec, fileName });
}

