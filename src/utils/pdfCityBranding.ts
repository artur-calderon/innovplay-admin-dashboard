import { getCityBranding } from '@/services/cityBrandingApi';

export type PdfImageAsset = { dataUrl: string; iw: number; ih: number };

export async function urlToPngAsset(url: string): Promise<PdfImageAsset | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const bmp = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = bmp.width;
    canvas.height = bmp.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bmp.close();
      return null;
    }
    ctx.drawImage(bmp, 0, 0);
    bmp.close();
    return { dataUrl: canvas.toDataURL('image/png'), iw: canvas.width, ih: canvas.height };
  } catch {
    return null;
  }
}

export async function loadCityBrandingPdfAssets(
  cityId: string | null | undefined
): Promise<{ letterhead: PdfImageAsset | null; logo: PdfImageAsset | null }> {
  if (!cityId || cityId === 'all') return { letterhead: null, logo: null };
  try {
    const branding = await getCityBranding(cityId);
    const lhUrl = branding.presigned?.letterhead_image_url ?? null;
    const logoUrl = branding.presigned?.logo_url ?? null;
    const [letterhead, logo] = await Promise.all([
      lhUrl ? urlToPngAsset(lhUrl) : Promise.resolve(null),
      logoUrl ? urlToPngAsset(logoUrl) : Promise.resolve(null),
    ]);
    return { letterhead, logo };
  } catch {
    return { letterhead: null, logo: null };
  }
}

export function paintLetterheadBackground(
  doc: { addImage: (src: string, fmt: string, x: number, y: number, w: number, h: number) => void },
  letterhead: PdfImageAsset,
  pageWidthMm: number,
  pageHeightMm: number
): void {
  const imgRatio = letterhead.iw / letterhead.ih;
  const pageRatio = pageWidthMm / pageHeightMm;
  let drawW: number;
  let drawH: number;
  let drawX: number;
  let drawY: number;
  if (imgRatio > pageRatio) {
    drawH = pageHeightMm;
    drawW = pageHeightMm * imgRatio;
    drawX = (pageWidthMm - drawW) / 2;
    drawY = 0;
  } else {
    drawW = pageWidthMm;
    drawH = pageWidthMm / imgRatio;
    drawX = 0;
    drawY = (pageHeightMm - drawH) / 2;
  }
  doc.addImage(letterhead.dataUrl, 'PNG', drawX, drawY, drawW, drawH);
}

export function drawMunicipalLogoTopCenter(
  doc: { addImage: (src: string, fmt: string, x: number, y: number, w: number, h: number) => void },
  pageWidthMm: number,
  y: number,
  logo: PdfImageAsset,
  maxW = 50,
  maxH = 26
): number {
  let lw = maxW;
  let lh = (logo.ih / logo.iw) * lw;
  if (lh > maxH) {
    lh = maxH;
    lw = (logo.iw / logo.ih) * lh;
  }
  doc.addImage(logo.dataUrl, 'PNG', (pageWidthMm - lw) / 2, y, lw, lh);
  return y + lh + 10;
}

export async function resolveReportLogoForPdf(
  cityId: string | null | undefined
): Promise<PdfImageAsset | null> {
  if (!cityId || cityId === 'all') return null;
  try {
    const branding = await getCityBranding(cityId);
    const logoUrl = branding.presigned?.logo_url ?? null;
    if (!logoUrl) return null;
    return await urlToPngAsset(logoUrl);
  } catch {
    return null;
  }
}

export async function loadDefaultReportLogoAsset(): Promise<PdfImageAsset | null> {
  try {
    const logoPath = '/LOGO-1.png';
    const response = await fetch(logoPath);
    if (!response.ok) return null;
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const logoImg = new Image();
    await new Promise<void>((resolve, reject) => {
      logoImg.onload = () => resolve();
      logoImg.onerror = reject;
      logoImg.src = objectUrl;
    });
    URL.revokeObjectURL(objectUrl);
    const iw = logoImg.width;
    const ih = logoImg.height;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    if (iw <= 0 || ih <= 0) return null;
    return { dataUrl, iw, ih };
  } catch {
    return null;
  }
}

export async function loadLogoAssetForLandscapePdf(
  cityId: string | null | undefined
): Promise<PdfImageAsset | null> {
  const municipal = await resolveReportLogoForPdf(cityId);
  if (municipal) return municipal;
  return loadDefaultReportLogoAsset();
}

export async function drawReportHeaderLogoWithFallback(
  doc: { addImage: (src: string, fmt: string, x: number, y: number, w: number, h: number) => void },
  pageWidthMm: number,
  y: number,
  municipalLogo: PdfImageAsset | null
): Promise<number> {
  if (municipalLogo) {
    return drawMunicipalLogoTopCenter(doc, pageWidthMm, y, municipalLogo);
  }
  try {
    const def = await loadDefaultReportLogoAsset();
    if (def) {
      return drawMunicipalLogoTopCenter(doc, pageWidthMm, y, def, 50, 22);
    }
  } catch {
    /* ignore */
  }
  return y;
}
