/**
 * Normaliza quebras de linha vindas de colagem de PDF:
 * - Junta parágrafos que foram quebrados só pela largura da linha no PDF.
 * - Converte <br> e quebras de linha no meio de frases em espaço.
 * - Preserva títulos (parágrafos curtos em negrito) como blocos separados.
 * Assim o texto colado do PDF é exibido em fluxo contínuo como no editor, sem separar demais.
 */

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

/** Indica se o texto termina como fim de frase (ponto, exclamação, etc.). */
const SENTENCE_END = /[.!?:]\s*$/;

/** Indica se o texto começa com letra minúscula (continuação de frase). */
const STARTS_WITH_LOWER = /^\s*[a-záéíóúàèìòùãõâêîôûç]/u;

/** Parágrafo vazio ou só com espaço/br. */
const EMPTY_P = /<p(?:\s[^>]*)?>\s*(?:<br\s*\/?>)?\s*<\/p>/gi;

/** Considerar "título" se o texto do parágrafo for curto e tiver negrito (não juntar com o próximo). */
function looksLikeTitle(htmlPart: string): boolean {
  const text = stripHtml(htmlPart);
  const hasBold = /<(strong|b)(?:\s[^>]*)?>[\s\S]*?<\/\1>/i.test(htmlPart);
  return text.length > 0 && text.length <= 80 && hasBold;
}

export function normalizePdfLineBreaks(html: string): string {
  if (!html || typeof html !== 'string') return html;

  let out = html;

  // 0) Remover parágrafos vazios para não criar separação visual extra
  out = out.replace(EMPTY_P, '');

  // 1) Juntar </p><p> quando for quebra de PDF (parágrafo não termina em .!?: e o próximo começa com minúscula),
  //    mas NUNCA juntar quando o anterior for um título (curto + negrito)
  const paragraphSplit = /<\/p>\s*<p(?:\s[^>]*)?>/gi;
  const parts = out.split(paragraphSplit);

  if (parts.length > 1) {
    out = parts.reduce((acc, part, i) => {
      if (i === 0) return part;
      const prevPart = parts[i - 1];
      const prevText = stripHtml(prevPart).slice(-80);
      const nextText = stripHtml(part).slice(0, 80);
      const prevIsTitle = looksLikeTitle(prevPart);
      const shouldMerge =
        !prevIsTitle &&
        !SENTENCE_END.test(prevText) &&
        STARTS_WITH_LOWER.test(nextText);
      return acc + (shouldMerge ? ' ' : '</p><p>') + part;
    });
  }

  // 2) <br> ou <br/> no meio de frase → espaço (quando o que vem depois é continuação)
  out = out.replace(
    /<br\s*\/?>\s*(?=[a-záéíóúàèìòùãõâêîôûç,])/gi,
    ' '
  );

  // 3) Quebra de linha (\n) no meio de frase → espaço (quando o próximo caractere é minúscula)
  out = out.replace(/\n\s*(?=[a-záéíóúàèìòùãõâêîôûç])/g, ' ');

  // 4) Múltiplos espaços seguidos → um só (evita espaços duplos onde juntamos)
  out = out.replace(/  +/g, ' ');

  return out;
}
