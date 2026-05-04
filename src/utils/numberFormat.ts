export function formatDecimal1PtBr(
  value?: number | null,
  fallback: string = "0,0"
): string {
  if (value === null || value === undefined) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;

  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function formatPercent1PtBr(
  value?: number | null,
  fallback: string = "0,0%"
): string {
  if (value === null || value === undefined) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return `${formatDecimal1PtBr(n)}%`;
}

