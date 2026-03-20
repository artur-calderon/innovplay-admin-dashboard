/**
 * Converte `download_url` retornada pelo backend em caminho relativo ao `baseURL` do axios.
 *
 * - Produção (Nginx): só `/api/*` vai ao backend; URLs absolutas no domínio do site sem `/api/`
 *   caem no SPA — aqui viram `answer-sheets/...` para o axios juntar com `BASE_URL` (`/api`).
 * - Localhost (Vite): `baseURL` é `/api` e o proxy repassa; mesmo esquema.
 * - URL absoluta para outro host (ex. presigned) permanece intacta para o axios usar a URL completa.
 */
export function normalizeDownloadUrlForApi(raw: string): string {
  const s = raw.trim();
  if (!s) return s;

  // Caminho relativo (já adequado ao baseURL ou path cru)
  if (!/^https?:\/\//i.test(s)) {
    let path = s.startsWith('/') ? s : `/${s}`;
    if (path.startsWith('/api/')) {
      path = path.slice(5);
    } else if (path === '/api') {
      path = '/';
    }
    if (path === '/' || path === '') return '';
    return path.startsWith('/') ? path.slice(1) : path;
  }

  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return s;
  }

  if (!isApiDownloadUrl(u)) {
    return s;
  }

  let pathname = u.pathname;
  if (pathname.startsWith('/api/')) {
    pathname = pathname.slice(5);
  } else if (pathname.startsWith('/')) {
    pathname = pathname.slice(1);
  }
  return pathname + u.search;
}

function isApiDownloadUrl(u: URL): boolean {
  if (u.pathname.startsWith('/answer-sheets') || u.pathname.startsWith('/api/answer-sheets')) {
    return true;
  }
  if (typeof window !== 'undefined') {
    try {
      return u.origin === window.location.origin;
    } catch {
      return false;
    }
  }
  return false;
}
