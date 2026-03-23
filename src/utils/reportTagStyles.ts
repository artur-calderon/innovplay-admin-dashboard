export const REPORT_TAG_BASE =
  // Menor e mais minimalista (cabe melhor em cards/tabelas).
  "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-none uppercase tracking-wide";

export type ReportProficiencyLabel =
  | "Abaixo do Básico"
  | "Básico"
  | "Adequado"
  | "Avançado";

/**
 * Converte qualquer texto vindo da API (variações, acentos, colagem sem espaço)
 * para um dos quatro níveis canônicos — mesma cor/tag em toda a UI e PDF.
 */
export function normalizeProficiencyLevelLabel(
  raw: string | null | undefined
): ReportProficiencyLabel {
  let s = (raw ?? "").trim();
  if (!s || s === "—" || s === "-" || s.toLowerCase() === "n/a") {
    return "Abaixo do Básico";
  }
  // "apenasAbaixo" / "doBasico" → insere espaço entre palavras coladas
  s = s.replace(/([a-záàâãéêíóôõú])([A-ZÁÀÂÃÉÊÍÓÔÕÚ])/g, "$1 $2");
  s = s.replace(/^apenas\s*/i, "").trim();

  const n = s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  if (n.includes("abaixo")) return "Abaixo do Básico";
  if (n.includes("avanc")) return "Avançado";
  if (n.includes("adequad")) return "Adequado";
  if (n.includes("basico")) {
    return n.includes("abaixo") ? "Abaixo do Básico" : "Básico";
  }

  return "Abaixo do Básico";
}

/**
 * Padroniza o visual das tags de proficiência para ficar igual ao estilo
 * usado no `RelatorioEscolar` (mesma tipografia/paddings e mesmas cores).
 */
export function getReportProficiencyTagClass(label?: string | null): string {
  const normalized = normalizeProficiencyLevelLabel(label);

  switch (normalized) {
    case "Avançado":
      return `${REPORT_TAG_BASE} bg-green-200 text-green-900 border-green-400 dark:bg-green-950/50 dark:text-green-200 dark:border-green-700`;
    case "Adequado":
      return `${REPORT_TAG_BASE} bg-green-100 text-green-800 border-green-300 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800`;
    case "Básico":
      return `${REPORT_TAG_BASE} bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950/30 dark:text-yellow-300 dark:border-yellow-800`;
    case "Abaixo do Básico":
      return `${REPORT_TAG_BASE} bg-red-100 text-red-800 border-red-300 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800`;
  }
}

