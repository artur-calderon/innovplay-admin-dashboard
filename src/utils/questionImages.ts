/**
 * Resolve URLs relativas de imagens de questões no HTML.
 * A API devolve <img src="/questions/{id}/images/{id}">; em origens diferentes
 * do backend é preciso prefixar com a base da API.
 */
export function resolveQuestionImageSrc(html: string, apiBase: string): string {
  if (!html || typeof html !== 'string') return html
  const base = (apiBase || '').replace(/\/+$/, '')
  return html.replace(
    /src="(\/questions\/[^"]+)"/g,
    (_, path) => `src="${base}${path}"`
  )
}

/**
 * Converte URLs absolutas de imagens de questões de volta para relativas.
 * Usado ao enviar o formulário para a API (que espera src="/questions/...").
 */
export function toRelativeQuestionImageSrc(html: string, apiBase: string): string {
  if (!html || typeof html !== 'string') return html
  const base = (apiBase || '').replace(/\/+$/, '')
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return html.replace(
    new RegExp(`src="${escaped}(/questions/[^"]+)"`, 'g'),
    (_, path) => `src="${path}"`
  )
}
