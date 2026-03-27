import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import PptxGenJS from "pptxgenjs";

type ExportPdfArgs = {
  rootElement: HTMLElement;
  slidesCount: number;
  fileName: string;
};

type ExportPptxArgs = {
  rootElement: HTMLElement;
  slidesCount: number;
  fileName: string;
};

function getSlideEl(rootElement: HTMLElement, slideIndex: number): HTMLElement | null {
  const container = rootElement.querySelector<HTMLElement>(`[data-slide-index="${slideIndex}"]`);
  if (!container) return null;
  return (
    container.querySelector<HTMLElement>("[data-slide-frame]") ??
    (container.firstElementChild as HTMLElement | null) ??
    container
  );
}

async function captureSlidePngDataUrl(
  slideEl: HTMLElement,
  scale: number
): Promise<{ dataUrl: string; widthPx: number; heightPx: number }> {
  // Pequena pausa para garantir render de charts/SVG.
  await new Promise((r) => setTimeout(r, 250));

  const canvas = await html2canvas(slideEl, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
  });

  return {
    dataUrl: canvas.toDataURL("image/png"),
    widthPx: canvas.width,
    heightPx: canvas.height,
  };
}

export async function exportPresentation19Pdf(args: ExportPdfArgs): Promise<void> {
  const { rootElement, slidesCount, fileName } = args;
  let doc: jsPDF | null = null;

  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  // Maior scale => PNG com mais pixels => menos "embaçado" ao rasterizar.
  const scale = Math.min(4, Math.max(2.5, dpr * 2.5));

  for (let i = 1; i <= slidesCount; i++) {
    const slideEl = getSlideEl(rootElement, i);
    if (!slideEl) continue;

    const { dataUrl: imgDataUrl, widthPx, heightPx } = await captureSlidePngDataUrl(slideEl, scale);
    if (!doc) {
      doc = new jsPDF({
        orientation: widthPx >= heightPx ? "landscape" : "portrait",
        unit: "px",
        format: [widthPx, heightPx],
      });
    } else {
      doc.addPage();
    }

    // Página em tamanho idêntico ao slide capturado: 1:1 com a pré-visualização.
    doc.addImage(imgDataUrl, "PNG", 0, 0, widthPx, heightPx);
  }

  if (!doc) {
    throw new Error("Nenhum slide foi encontrado para exportação.");
  }

  doc.save(fileName);
}

export async function exportPresentation19Pptx(args: ExportPptxArgs): Promise<void> {
  const { rootElement, slidesCount, fileName } = args;

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "InnovPlay";

  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const scale = Math.min(4, Math.max(2.0, dpr * 2.2));

  for (let i = 1; i <= slidesCount; i++) {
    const slideEl = getSlideEl(rootElement, i);
    if (!slideEl) continue;

    const { dataUrl: imgDataUrl, widthPx, heightPx } = await captureSlidePngDataUrl(slideEl, scale);
    const base64 = imgDataUrl.replace(/^data:image\/png;base64,/, "");

    const slide = pptx.addSlide();

    // Evita distorção mantendo aspect ratio
    const slideAspect = widthPx / Math.max(1, heightPx);
    let drawW = pptx.width;
    let drawH = drawW / slideAspect;
    // Cover: se não preencher totalmente, ajusta para preencher a altura/cortar excedente.
    if (drawH < pptx.height) {
      drawH = pptx.height;
      drawW = drawH * slideAspect;
    }

    slide.addImage({
      data: base64,
      x: (pptx.width - drawW) / 2,
      y: (pptx.height - drawH) / 2,
      w: drawW,
      h: drawH,
    });
  }

  await pptx.writeFile({ fileName });
}

