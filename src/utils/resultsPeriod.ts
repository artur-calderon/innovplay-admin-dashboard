/** Faixa de anos aceita no filtro de período (mês/ano) das telas de resultados. */
export const RESULTS_PERIOD_YEAR_MIN = 2018;

export function getResultsPeriodYearMax(): number {
  return new Date().getFullYear() + 2;
}

/** Valida AAAA-MM (rejeita anos fora da faixa). Retorna `'all'` se inválido. */
export function normalizeResultsPeriodYm(raw: string): 'all' | string {
  const t = raw.trim();
  const m = /^(\d{4})-(\d{2})$/.exec(t);
  if (!m) return 'all';
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const yMax = getResultsPeriodYearMax();
  if (y < RESULTS_PERIOD_YEAR_MIN || y > yMax || mo < 1 || mo > 12) return 'all';
  return `${String(y).padStart(4, '0')}-${String(mo).padStart(2, '0')}`;
}

export const RESULTS_MONTH_NAMES_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const;
