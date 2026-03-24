import { api } from '@/lib/api';
import { normalizeDownloadUrlForApi } from '@/lib/normalize-api-download-url';

/**
 * Baixa um arquivo usando o cliente axios (Bearer + headers), necessário quando a URL
 * é da própria API e não pode ser aberta em nova aba sem token.
 */
export async function fetchAuthenticatedDownload(
  url: string,
  fallbackFilename = 'cartoes.zip'
): Promise<void> {
  const pathOrUrl = normalizeDownloadUrlForApi(url);
  if (!pathOrUrl) {
    throw new Error('URL de download inválida.');
  }
  const res = await api.get(pathOrUrl, { responseType: 'blob' });
  const blob = res.data as Blob;

  if (blob.type?.includes('application/json')) {
    const text = await blob.text();
    try {
      const j = JSON.parse(text) as { error?: string; message?: string };
      throw new Error(j.error || j.message || 'Erro ao baixar o arquivo.');
    } catch (e) {
      if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
        throw e;
      }
      throw new Error('Resposta inválida do servidor.');
    }
  }

  let filename = fallbackFilename;
  const cd = res.headers['content-disposition'];
  if (cd && typeof cd === 'string') {
    const m = /filename\*?=(?:UTF-8'')?["']?([^";\n]+)["']?/i.exec(cd);
    if (m) {
      try {
        filename = decodeURIComponent(m[1].replace(/['"]/g, ''));
      } catch {
        filename = m[1].replace(/['"]/g, '');
      }
    }
  }

  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 60_000);
}
