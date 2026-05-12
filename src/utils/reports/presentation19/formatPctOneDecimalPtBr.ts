/** Percentual pt-BR com uma casa decimal (vírgula), alinhado à tabela de presença da apresentação. */
export function formatPctOneDecimalPtBr(n: number): string {
  if (!Number.isFinite(n)) return "0,0%";
  const rounded = Math.round(n * 10) / 10;
  return `${rounded.toFixed(1).replace(".", ",")}%`;
}
