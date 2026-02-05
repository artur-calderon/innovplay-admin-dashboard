/**
 * Cores por disciplina para gamificação das competições.
 * Cada disciplina tem uma cor estável (por id ou nome).
 */

const SUBJECT_COLOR_PALETTE = [
  { border: 'border-l-amber-500', bg: 'bg-amber-500/10', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200', accent: 'text-amber-600 dark:text-amber-400', gradient: 'from-amber-500 to-orange-500' },
  { border: 'border-l-emerald-500', bg: 'bg-emerald-500/10', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200', accent: 'text-emerald-600 dark:text-emerald-400', gradient: 'from-emerald-500 to-teal-500' },
  { border: 'border-l-blue-500', bg: 'bg-blue-500/10', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200', accent: 'text-blue-600 dark:text-blue-400', gradient: 'from-blue-500 to-indigo-500' },
  { border: 'border-l-violet-500', bg: 'bg-violet-500/10', badge: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200', accent: 'text-violet-600 dark:text-violet-400', gradient: 'from-violet-500 to-purple-500' },
  { border: 'border-l-rose-500', bg: 'bg-rose-500/10', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200', accent: 'text-rose-600 dark:text-rose-400', gradient: 'from-rose-500 to-pink-500' },
  { border: 'border-l-cyan-500', bg: 'bg-cyan-500/10', badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200', accent: 'text-cyan-600 dark:text-cyan-400', gradient: 'from-cyan-500 to-sky-500' },
  { border: 'border-l-lime-500', bg: 'bg-lime-500/10', badge: 'bg-lime-100 text-lime-800 dark:bg-lime-900/40 dark:text-lime-200', accent: 'text-lime-600 dark:text-lime-400', gradient: 'from-lime-500 to-green-500' },
  { border: 'border-l-fuchsia-500', bg: 'bg-fuchsia-500/10', badge: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-200', accent: 'text-fuchsia-600 dark:text-fuchsia-400', gradient: 'from-fuchsia-500 to-pink-500' },
] as const;

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export type SubjectColorSet = typeof SUBJECT_COLOR_PALETTE[number];

export function getSubjectColors(subjectId: string, subjectName?: string): SubjectColorSet {
  const key = subjectId || subjectName || 'default';
  const index = hashString(key) % SUBJECT_COLOR_PALETTE.length;
  return SUBJECT_COLOR_PALETTE[index];
}
