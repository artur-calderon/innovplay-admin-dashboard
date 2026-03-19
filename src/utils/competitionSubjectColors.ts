/**
 * Cores por disciplina para gamificação das competições.
 * Cada disciplina tem uma cor estável (por id ou nome).
 */

const SUBJECT_COLOR_PALETTE = [
  {
    border: "border-l-amber-500",
    bg: "bg-amber-500/10",
    badge:
      "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/55 dark:text-amber-200 dark:hover:bg-amber-900/70",
    accent: "text-amber-600 dark:text-amber-400",
    gradient: "from-amber-500 to-orange-500",
  },
  {
    border: "border-l-emerald-500",
    bg: "bg-emerald-500/10",
    badge:
      "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/55 dark:text-emerald-200 dark:hover:bg-emerald-900/70",
    accent: "text-emerald-600 dark:text-emerald-400",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    border: "border-l-blue-500",
    bg: "bg-blue-500/10",
    badge:
      "bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/55 dark:text-blue-200 dark:hover:bg-blue-900/70",
    accent: "text-blue-600 dark:text-blue-400",
    gradient: "from-blue-500 to-indigo-500",
  },
  {
    border: "border-l-violet-500",
    bg: "bg-violet-500/10",
    badge:
      "bg-violet-100 text-violet-800 hover:bg-violet-200 dark:bg-violet-900/55 dark:text-violet-200 dark:hover:bg-violet-900/70",
    accent: "text-violet-600 dark:text-violet-400",
    gradient: "from-violet-500 to-purple-500",
  },
  {
    border: "border-l-rose-500",
    bg: "bg-rose-500/10",
    badge:
      "bg-rose-100 text-rose-800 hover:bg-rose-200 dark:bg-rose-900/55 dark:text-rose-200 dark:hover:bg-rose-900/70",
    accent: "text-rose-600 dark:text-rose-400",
    gradient: "from-rose-500 to-pink-500",
  },
  {
    border: "border-l-cyan-500",
    bg: "bg-cyan-500/10",
    badge:
      "bg-cyan-100 text-cyan-800 hover:bg-cyan-200 dark:bg-cyan-900/55 dark:text-cyan-200 dark:hover:bg-cyan-900/70",
    accent: "text-cyan-600 dark:text-cyan-400",
    gradient: "from-cyan-500 to-sky-500",
  },
  {
    border: "border-l-lime-500",
    bg: "bg-lime-500/10",
    badge:
      "bg-lime-100 text-lime-800 hover:bg-lime-200 dark:bg-lime-900/55 dark:text-lime-200 dark:hover:bg-lime-900/70",
    accent: "text-lime-600 dark:text-lime-400",
    gradient: "from-lime-500 to-green-500",
  },
  {
    border: "border-l-fuchsia-500",
    bg: "bg-fuchsia-500/10",
    badge:
      "bg-fuchsia-100 text-fuchsia-800 hover:bg-fuchsia-200 dark:bg-fuchsia-900/55 dark:text-fuchsia-200 dark:hover:bg-fuchsia-900/70",
    accent: "text-fuchsia-600 dark:text-fuchsia-400",
    gradient: "from-fuchsia-500 to-pink-500",
  },
] as const;

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** Normaliza para comparação (minúsculas, sem acentos). */
export function normalizeSubjectNameForColors(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim();
}

/**
 * Regras semânticas alinhadas às cores usadas em relatórios/evolução.
 * Frases mais específicas primeiro (ex.: educação física antes de "física").
 */
const SEMANTIC_SUBJECT_PALETTE_INDEX: Array<{ keywords: string[]; index: number }> = [
  /** Matemática antes de "portugues" para nomes compostos tipo "MAT e LP". */
  { keywords: ['matematica', 'math'], index: 2 }, // blue
  { keywords: ['lingua portuguesa', 'lingua port'], index: 4 }, // rose — LP
  { keywords: ['portugues', 'portuguese', 'l portuguesa'], index: 4 },
  { keywords: ['ciencias', 'ciencia'], index: 1 }, // emerald
  { keywords: ['historia', 'history'], index: 0 }, // amber
  { keywords: ['geografia', 'geography'], index: 6 }, // lime
  { keywords: ['ingles', 'english'], index: 3 }, // violet
  { keywords: ['educacao fisica', 'ed fisica', 'edfisica', 'ed.fisica'], index: 7 },
  { keywords: ['arte', ' artes', 'arts'], index: 5 }, // cyan
  { keywords: ['fisica'], index: 5 },
];

function matchSemanticPaletteIndex(normalizedName: string): number | null {
  for (const { keywords, index } of SEMANTIC_SUBJECT_PALETTE_INDEX) {
    for (const kw of keywords) {
      if (normalizedName.includes(kw)) {
        return index % SUBJECT_COLOR_PALETTE.length;
      }
    }
  }
  return null;
}

export function getSubjectPaletteIndex(subjectId: string, subjectName?: string): number {
  const name = subjectName?.trim() ?? '';
  if (name) {
    const semantic = matchSemanticPaletteIndex(normalizeSubjectNameForColors(name));
    if (semantic !== null) return semantic;
  }
  const key = subjectId || subjectName || 'default';
  return hashString(key) % SUBJECT_COLOR_PALETTE.length;
}

export type SubjectColorSet = typeof SUBJECT_COLOR_PALETTE[number];

export function getSubjectColors(subjectId: string, subjectName?: string): SubjectColorSet {
  const index = getSubjectPaletteIndex(subjectId, subjectName);
  return SUBJECT_COLOR_PALETTE[index];
}

/** Classes Tailwind do token `badge` para uso em componentes próprios. */
export function getSubjectBadgeClassName(subjectId?: string, subjectName?: string): string {
  return getSubjectColors(subjectId ?? '', subjectName).badge;
}
