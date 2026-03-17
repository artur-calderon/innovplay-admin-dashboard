/**
 * Limpeza de texto legado (PDF / sistemas antigos) para exibição de enunciados.
 * Remove hard-breaks no meio da frase e normaliza quebras múltiplas, sem tocar no banco.
 */

const LOWER_OR_COMMA = '[a-záéíóúàèìòùãõâêîôûç,]';
const HARD_BREAK_REGEX = new RegExp(
  `(${LOWER_OR_COMMA})\\n\\s*([a-záéíóúàèìòùãõâêîôûç])`,
  'gu'
);

/**
 * Corrige "hard breaks" de PDF (quebras no meio da frase) e normaliza quebras múltiplas.
 * Preserva quebras intencionais (ex.: estrofes de poema).
 */
export function cleanLegacyText(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') return '';

  let processed = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // 1) Junta linhas quebradas no meio da frase (minúscula ou vírgula + \n + minúscula → espaço)
  processed = processed.replace(HARD_BREAK_REGEX, '$1 $2');

  // 2) No máximo duas quebras seguidas (parágrafos)
  processed = processed.replace(/\n{3,}/g, '\n\n');

  return processed.trim();
}

/** Tags típicas de enunciado em HTML; se presentes, tratar como HTML. */
const HTML_TAG_PATTERNS = ['<p', '<div', '<img', '<br'];

/**
 * Indica se o conteúdo parece texto puro (legado) em vez de HTML.
 * Usado para escolher entre QuestionRenderer (plain) e dangerouslySetInnerHTML (HTML).
 */
export function isLikelyPlainText(content: string): boolean {
  if (!content || typeof content !== 'string') return true;
  const trimmed = content.trim();
  if (!trimmed) return true;
  return !HTML_TAG_PATTERNS.some((tag) => trimmed.includes(tag));
}
